import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import {
  createHash,
  randomBytes,
} from 'crypto'

// T3LEEM authentication route

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL!

const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY!

const DEVICE_COOKIE =
  't3leem_device_token'

const SESSION_COOKIE =
  't3leem_session_id'

const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
)

function hashDeviceToken(token: string) {
  return createHash('sha256')
    .update(token)
    .digest('hex')
}

function getCookie(
  request: Request,
  cookieName: string,
) {
  const cookieHeader =
    request.headers.get('cookie')

  if (!cookieHeader) {
    return null
  }

  const cookies = cookieHeader
    .split(';')
    .map((cookie) => {
      const index =
        cookie.indexOf('=')

      if (index === -1) {
        return {
          name: cookie.trim(),
          value: '',
        }
      }

      return {
        name: cookie
          .slice(0, index)
          .trim(),
        value: cookie
          .slice(index + 1)
          .trim(),
      }
    })

  return (
    cookies.find(
      (cookie) =>
        cookie.name === cookieName,
    )?.value ?? null
  )
}

function getUserAgent(request: Request) {
  return (
    request.headers.get(
      'user-agent',
    ) ?? null
  )
}

function getIpAddress(request: Request) {
  const forwardedFor =
    request.headers.get(
      'x-forwarded-for',
    )

  if (forwardedFor) {
    return forwardedFor
      .split(',')[0]
      .trim()
  }

  return (
    request.headers.get(
      'x-real-ip',
    ) ?? null
  )
}

export async function POST(
  request: Request,
) {
  try {
    const body = await request.json()

    const username =
      typeof body.username === 'string'
        ? body.username.trim()
        : ''

    const password =
      typeof body.password === 'string'
        ? body.password
        : ''

    if (!username || !password) {
      return NextResponse.json(
        {
          error:
            'اسم المستخدم وكلمة المرور مطلوبان.',
        },
        { status: 400 },
      )
    }

    /*
     * معلومات الاتصال المستخدمة في سجل التدقيق.
     */
    const ipAddress =
      getIpAddress(request)

    const userAgent =
      getUserAgent(request)

    /*
     * البحث عن المستخدم باستخدام Service Role.
     */
    const {
      data: profile,
      error: profileError,
    } =
      await supabaseAdmin
        .from('user_profiles')
        .select(
          'auth_user_id, username, full_name, role, is_active',
        )
        .eq('username', username)
        .maybeSingle()

    if (profileError) {
      console.error(
        'Profile lookup error:',
        profileError,
      )

      return NextResponse.json(
        {
          error:
            'حدث خطأ أثناء تسجيل الدخول.',
        },
        { status: 500 },
      )
    }

    if (!profile || !profile.is_active) {
      return NextResponse.json(
        {
          error:
            'اسم المستخدم أو كلمة المرور غير صحيحة.',
        },
        { status: 401 },
      )
    }

    /*
     * الحصول على الإيميل الداخلي لحساب Supabase Auth.
     */
    const {
      data: authUser,
      error: authUserError,
    } =
      await supabaseAdmin.auth.admin.getUserById(
        profile.auth_user_id,
      )

    if (
      authUserError ||
      !authUser.user?.email
    ) {
      console.error(
        'Auth user lookup error:',
        authUserError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر التحقق من حساب المستخدم.',
        },
        { status: 500 },
      )
    }

    const email =
      authUser.user.email

    /*
     * --------------------------------------------------
     * 1. التحقق من كلمة المرور بدون حفظ Session
     * --------------------------------------------------
     *
     * مهم:
     * هنا نستخدم Supabase client مستقل مع
     * persistSession: false حتى لا ننشئ Cookie
     * دخول في المتصفح قبل فحص الجهاز.
     */
    const passwordClient =
      createClient(
        supabaseUrl,
        publishableKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        },
      )

    const {
      data: passwordAuthData,
      error: passwordError,
    } =
      await passwordClient.auth.signInWithPassword(
        {
          email,
          password,
        },
      )

    if (
      passwordError ||
      !passwordAuthData.user
    ) {
      console.error(
        'Password verification failed:',
        passwordError,
      )

      /*
       * تسجيل محاولة الدخول الفاشلة.
       */
      const { error: auditError } =
        await supabaseAdmin
          .from('auth_audit_logs')
          .insert({
            auth_user_id:
              profile.auth_user_id,
            event_type:
              'login_failed',
            success: false,
            ip_address:
              ipAddress,
            user_agent:
              userAgent,
            metadata: {
              reason:
                'invalid_password',
              username:
                profile.username,
            },
          })

      if (auditError) {
        console.error(
          'Login failed audit error:',
          auditError,
        )
      }

      return NextResponse.json(
        {
          error:
            'اسم المستخدم أو كلمة المرور غير صحيحة.',
        },
        { status: 401 },
      )
    }

    /*
     * --------------------------------------------------
     * 2. فحص الجهاز
     * --------------------------------------------------
     */
    const existingDeviceToken =
      getCookie(
        request,
        DEVICE_COOKIE,
      )

    let device:
      | {
          id: string
          status: string
          device_name: string | null
        }
      | null = null

    /*
     * إذا كان الجهاز لديه Token سابق،
     * نبحث عنه.
     */
    if (existingDeviceToken) {
      const tokenHash =
        hashDeviceToken(
          existingDeviceToken,
        )

      const {
        data: existingDevice,
        error: deviceLookupError,
      } =
        await supabaseAdmin
          .from('trusted_devices')
          .select(
            'id, status, device_name',
          )
          .eq(
            'device_token_hash',
            tokenHash,
          )
          .eq(
            'auth_user_id',
            profile.auth_user_id,
          )
          .maybeSingle()

      if (deviceLookupError) {
        console.error(
          'Trusted device lookup error:',
          deviceLookupError,
        )

        return NextResponse.json(
          {
            error:
              'تعذر فحص الجهاز.',
          },
          { status: 500 },
        )
      }

      if (existingDevice) {
        device = existingDevice
      }
    }

    /*
     * --------------------------------------------------
     * 3. الجهاز مرفوض أو مسحوب
     * --------------------------------------------------
     */
    if (
      device &&
      (
        device.status === 'rejected' ||
        device.status === 'revoked'
      )
    ) {
      const { error: auditError } =
        await supabaseAdmin
          .from('auth_audit_logs')
          .insert({
            auth_user_id:
              profile.auth_user_id,
            trusted_device_id:
              device.id,
            event_type:
              'login_failed',
            success: false,
            ip_address:
              ipAddress,
            user_agent:
              userAgent,
            metadata: {
              reason:
                device.status ===
                'rejected'
                  ? 'device_rejected'
                  : 'device_revoked',
              username:
                profile.username,
            },
          })

      if (auditError) {
        console.error(
          'Rejected device audit error:',
          auditError,
        )
      }

      return NextResponse.json(
        {
          error:
            'هذا الجهاز غير مصرح له بالدخول إلى النظام.',
          deviceStatus:
            device.status,
        },
        { status: 403 },
      )
    }

    /*
     * --------------------------------------------------
     * 4. الجهاز Pending
     * --------------------------------------------------
     */
    if (
      device &&
      device.status === 'pending'
    ) {
      return NextResponse.json(
        {
          error:
            'هذا الجهاز بانتظار موافقة مدير النظام.',
          deviceStatus: 'pending',
          deviceId: device.id,
        },
        { status: 403 },
      )
    }

    /*
     * --------------------------------------------------
     * 5. جهاز جديد
     * --------------------------------------------------
     *
     * لا يوجد Token أو الجهاز غير موجود
     * في قاعدة البيانات.
     */
    if (!device) {
      const deviceToken =
        randomBytes(32).toString(
          'hex',
        )

      const tokenHash =
        hashDeviceToken(
          deviceToken,
        )

      const {
        data: newDevice,
        error: insertError,
      } =
        await supabaseAdmin
          .from('trusted_devices')
          .insert({
            auth_user_id:
              profile.auth_user_id,
            device_name:
              'جهاز جديد',
            device_token_hash:
              tokenHash,
            status: 'pending',
          })
          .select(
            'id, status, device_name',
          )
          .single()

      if (
        insertError ||
        !newDevice
      ) {
        console.error(
          'Trusted device insert error:',
          insertError,
        )

        return NextResponse.json(
          {
            error:
              'تعذر تسجيل الجهاز الجديد.',
          },
          { status: 500 },
        )
      }

      /*
       * تسجيل طلب الجهاز.
       */
      const { error: auditError } =
        await supabaseAdmin
          .from('auth_audit_logs')
          .insert({
            auth_user_id:
              profile.auth_user_id,
            trusted_device_id:
              newDevice.id,
            event_type:
              'device_pending',
            success: true,
            ip_address:
              ipAddress,
            user_agent:
              userAgent,
            metadata: {
              source:
                'login',
              username:
                profile.username,
            },
          })

      if (auditError) {
        console.error(
          'Device pending audit error:',
          auditError,
        )
      }

      /*
       * مهم:
       * لا ننشئ Auth Session هنا.
       *
       * فقط نحفظ Device Token حتى يعرف
       * النظام هذا الجهاز عند المحاولة القادمة.
       */
      const response =
        NextResponse.json(
          {
            error:
              'تم تسجيل جهازك الجديد، وهو بانتظار موافقة مدير النظام.',
            deviceStatus:
              'pending',
            deviceId:
              newDevice.id,
          },
          { status: 403 },
        )

      response.cookies.set(
        DEVICE_COOKIE,
        deviceToken,
        {
          httpOnly: true,
          secure:
            process.env.NODE_ENV ===
            'production',
          sameSite: 'lax',
          path: '/',
          maxAge:
            60 * 60 * 24 * 365,
        },
      )

      return response
    }

    /*
     * --------------------------------------------------
     * 6. الجهاز Approved
     * --------------------------------------------------
     *
     * الآن فقط ننشئ Session حقيقية
     * في Cookies المتصفح.
     */

    if (device.status === 'approved') {
      /*
       * تحديث آخر استخدام للجهاز.
       */
      await supabaseAdmin
        .from('trusted_devices')
        .update({
          last_used_at:
            new Date().toISOString(),
        })
        .eq('id', device.id)

      /*
       * Response واحد لحفظ Supabase Auth cookies.
       */
      const response =
        NextResponse.json({
          user: {
            id: profile.auth_user_id,
            username:
              profile.username,
            full_name:
              profile.full_name,
            role: profile.role,
          },
          deviceStatus:
            'approved',
        })

      /*
       * Supabase SSR client.
       */
      const supabase =
        createServerClient(
          supabaseUrl,
          publishableKey,
          {
            cookies: {
              getAll() {
                const cookieHeader =
                  request.headers.get(
                    'cookie',
                  )

                if (!cookieHeader) {
                  return []
                }

                return cookieHeader
                  .split(';')
                  .map(
                    (cookie) => {
                      const index =
                        cookie.indexOf(
                          '=',
                        )

                      if (
                        index === -1
                      ) {
                        return {
                          name:
                            cookie.trim(),
                          value: '',
                        }
                      }

                      return {
                        name: cookie
                          .slice(
                            0,
                            index,
                          )
                          .trim(),

                        value: cookie
                          .slice(
                            index + 1,
                          )
                          .trim(),
                      }
                    },
                  )
                  .filter(
                    (cookie) =>
                      cookie.name
                        .length >
                      0,
                  )
              },

              setAll(
                cookiesToSet,
              ) {
                cookiesToSet.forEach(
                  ({
                    name,
                    value,
                    options,
                  }) => {
                    response.cookies.set(
                      name,
                      value,
                      {
                        ...options,
                        path:
                          options?.path ??
                          '/',
                      },
                    )
                  },
                )
              },
            },
          },
        )

      /*
       * إنشاء Session حقيقية.
       *
       * لن تحدث هذه الخطوة إلا بعد
       * التأكد أن الجهاز Approved.
       */
      const {
        data: authData,
        error: signInError,
      } =
        await supabase.auth.signInWithPassword(
          {
            email,
            password,
          },
        )

      if (
        signInError ||
        !authData.session
      ) {
        console.error(
          'Supabase session creation error:',
          signInError,
        )

        return NextResponse.json(
          {
            error:
              'تعذر إنشاء جلسة تسجيل الدخول.',
          },
          { status: 500 },
        )
      }

      /*
       * التأكد من أن الجلسة موجودة.
       */
      const {
        data: {
          user: loggedInUser,
        },
        error: getUserError,
      } =
        await supabase.auth.getUser()

      if (
        getUserError ||
        !loggedInUser
      ) {
        console.error(
          'Session verification error:',
          getUserError,
        )

        return NextResponse.json(
          {
            error:
              'تعذر إنشاء جلسة تسجيل الدخول.',
          },
          { status: 500 },
        )
      }

      /*
       * تسجيل الجلسة النشطة.
       */
      const {
        data: activeSession,
        error: sessionError,
      } =
        await supabaseAdmin
          .from('active_sessions')
          .insert({
            auth_user_id:
              profile.auth_user_id,
            trusted_device_id:
              device.id,
            login_at:
              new Date().toISOString(),
            last_activity_at:
              new Date().toISOString(),
            logout_at: null,
            expires_at: null,
            is_active: true,
          })
          .select('id')
          .single()

      if (sessionError) {
        console.error(
          'Active session insert error:',
          sessionError,
        )
      }

      /*
       * حفظ معرف الجلسة في Cookie.
       *
       * نحتاج هذا المعرف لاحقًا عند تسجيل الخروج
       * حتى نغلق نفس السجل في active_sessions.
       */
      if (activeSession?.id) {
        response.cookies.set(
          SESSION_COOKIE,
          activeSession.id,
          {
            httpOnly: true,
            secure:
              process.env.NODE_ENV ===
              'production',
            sameSite: 'lax',
            path: '/',
            maxAge:
              60 * 60 * 24,
          },
        )
      }

      /*
       * تسجيل نجاح الدخول.
       */
      const { error: auditError } =
        await supabaseAdmin
          .from('auth_audit_logs')
          .insert({
            auth_user_id:
              profile.auth_user_id,
            trusted_device_id:
              device.id,
            event_type:
              'login_success',
            success: true,
            ip_address:
              ipAddress,
            user_agent:
              userAgent,
            metadata: {
              username:
                profile.username,
              active_session_id:
                activeSession?.id ??
                null,
            },
          })

      if (auditError) {
        console.error(
          'Login success audit error:',
          auditError,
        )
      }

      return response
    }

    /*
     * أي حالة غير متوقعة.
     */
    return NextResponse.json(
      {
        error:
          'لا يمكن تسجيل الدخول من هذا الجهاز.',
      },
      { status: 403 },
    )
  } catch (error) {
    console.error(
      'Login error:',
      error,
    )

    return NextResponse.json(
      {
        error:
          'حدث خطأ غير متوقع أثناء تسجيل الدخول.',
      },
      { status: 500 },
    )
  }
}