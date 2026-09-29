import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import {
  createHash,
  randomBytes,
} from 'crypto'

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

const SESSION_COOKIE_MAX_DAYS = 30
const DEVICE_COOKIE_MAX_DAYS = 365

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

  return (
    cookieHeader
      .split(';')
      .map((cookie) => {
        const index =
          cookie.indexOf('=')

        return {
          name:
            index === -1
              ? cookie.trim()
              : cookie
                  .slice(0, index)
                  .trim(),
          value:
            index === -1
              ? ''
              : cookie
                  .slice(index + 1)
                  .trim(),
        }
      })
      .find(
        (cookie) =>
          cookie.name === cookieName,
      )?.value ?? null
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

function getUserAgent(request: Request) {
  return (
    request.headers.get(
      'user-agent',
    ) ?? null
  )
}

function clearSessionCookie(
  response: NextResponse,
) {
  response.cookies.set(
    SESSION_COOKIE,
    '',
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    },
  )

  return response
}

export async function POST(
  request: Request,
) {
  try {
    const body =
      await request.json()

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

    const ipAddress =
      getIpAddress(request)

    const userAgent =
      getUserAgent(request)

    /*
     * 1. البحث عن Profile
     */
    const {
      data: profile,
      error: profileError,
    } =
      await supabaseAdmin
        .from('user_profiles')
        .select(`
          id,
          auth_user_id,
          username,
          full_name,
          role,
          is_active
        `)
        .eq(
          'username',
          username,
        )
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

    if (
      !profile ||
      !profile.is_active
    ) {
      return NextResponse.json(
        {
          error:
            'اسم المستخدم أو كلمة المرور غير صحيحة.',
        },
        { status: 401 },
      )
    }

    /*
     * 2. التحقق من وجود حساب Auth
     *
     * نحتاجه فقط للحصول على البريد.
     */
    const {
      data: authUser,
      error: authUserError,
    } =
      await supabaseAdmin.auth.admin
        .getUserById(
          profile.auth_user_id,
        )

    if (
      authUserError ||
      !authUser.user
    ) {
      console.error(
        'Auth user lookup error:',
        authUserError,
        {
          authUserId:
            profile.auth_user_id,
          username:
            profile.username,
        },
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

    if (!email) {
      console.error(
        'Auth user has no email:',
        profile.auth_user_id,
      )

      return NextResponse.json(
        {
          error:
            'حساب المستخدم غير مكتمل.',
        },
        { status: 500 },
      )
    }

    /*
     * 3. التحقق من كلمة المرور
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
      await passwordClient.auth
        .signInWithPassword({
          email,
          password,
        })

    if (
      passwordError ||
      !passwordAuthData.user ||
      !passwordAuthData.session
    ) {
      console.error(
        'Password verification failed:',
        passwordError,
      )

      void supabaseAdmin
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

      return NextResponse.json(
        {
          error:
            'اسم المستخدم أو كلمة المرور غير صحيحة.',
        },
        { status: 401 },
      )
    }

    /*
     * 4. فحص الجهاز الحالي
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
          device_name:
            | string
            | null
        }
      | null = null

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
          .select(`
            id,
            status,
            device_name
          `)
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
     * 5. الجهاز مرفوض / مسحوب
     */
    if (
      device &&
      (
        device.status ===
          'rejected' ||
        device.status ===
          'revoked'
      )
    ) {
      void supabaseAdmin
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
     * 6. الجهاز بانتظار الموافقة
     */
    if (
      device &&
      device.status ===
        'pending'
    ) {
      return NextResponse.json(
        {
          error:
            'هذا الجهاز بانتظار موافقة مدير النظام.',
          deviceStatus:
            'pending',
          deviceId:
            device.id,
        },
        { status: 403 },
      )
    }

    /*
     * 7. جهاز جديد
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
            status:
              'pending',
          })
          .select(`
            id,
            status,
            device_name
          `)
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

      void supabaseAdmin
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
            DEVICE_COOKIE_MAX_DAYS *
            24 *
            60 *
            60,
        },
      )

      return response
    }

    /*
     * 8. يجب أن يكون الجهاز Approved
     */
    if (
      device.status !==
      'approved'
    ) {
      return NextResponse.json(
        {
          error:
            'لا يمكن تسجيل الدخول من هذا الجهاز.',
        },
        { status: 403 },
      )
    }

    /*
     * 9. تحديث آخر استخدام
     */
    const {
      error: deviceUpdateError,
    } =
      await supabaseAdmin
        .from('trusted_devices')
        .update({
          last_used_at:
            new Date().toISOString(),
        })
        .eq(
          'id',
          device.id,
        )
        .eq(
          'auth_user_id',
          profile.auth_user_id,
        )

    if (deviceUpdateError) {
      console.error(
        'Trusted device update error:',
        deviceUpdateError,
      )
    }

    /*
     * 10. Response واحد لكل Cookies
     */
    const response =
      NextResponse.json({
        user: {
          id:
            profile.auth_user_id,
          username:
            profile.username,
          full_name:
            profile.full_name,
          role:
            profile.role,
        },
        deviceStatus:
          'approved',
      })

    /*
     * 11. Supabase SSR Client
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
                .filter(Boolean)
                .map((cookie) => {
                  const index =
                    cookie.indexOf('=')

                  return {
                    name:
                      index === -1
                        ? cookie.trim()
                        : cookie
                            .slice(
                              0,
                              index,
                            )
                            .trim(),
                    value:
                      index === -1
                        ? ''
                        : cookie
                            .slice(
                              index + 1,
                            )
                            .trim(),
                  }
                })
                .filter(
                  (cookie) =>
                    cookie.name.length >
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
     * 12. تثبيت Supabase Auth Session
     */
    const session =
      passwordAuthData.session

    const {
      error: setSessionError,
    } =
      await supabase.auth.setSession({
        access_token:
          session.access_token,
        refresh_token:
          session.refresh_token,
      })

    if (setSessionError) {
      console.error(
        'Supabase session setup error:',
        setSessionError,
      )

      try {
        await passwordClient.auth
          .signOut()
      } catch (error) {
        console.error(
          'Password client cleanup error:',
          error,
        )
      }

      return clearSessionCookie(
        NextResponse.json(
          {
            error:
              'تعذر إنشاء جلسة تسجيل الدخول.',
          },
          { status: 500 },
        ),
      )
    }

    /*
     * 13. إنشاء Active Session
     */
    const loginAt =
      new Date()

    const expiresAt =
      new Date(
        loginAt.getTime() +
          SESSION_COOKIE_MAX_DAYS *
            24 *
            60 *
            60 *
            1000,
      )

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
            loginAt.toISOString(),
          last_activity_at:
            loginAt.toISOString(),
          logout_at:
            null,
          expires_at:
            expiresAt.toISOString(),
          is_active:
            true,
        })
        .select('id')
        .single()

    if (
      sessionError ||
      !activeSession?.id
    ) {
      console.error(
        'Active session insert error:',
        sessionError,
      )

      try {
        await supabase.auth.signOut()
      } catch (error) {
        console.error(
          'Supabase cleanup error:',
          error,
        )
      }

      return clearSessionCookie(
        NextResponse.json(
          {
            error:
              'تعذر إنشاء جلسة تسجيل الدخول.',
          },
          { status: 500 },
        ),
      )
    }

    /*
     * 14. إغلاق أي جلسات قديمة
     */
    const previousLogoutAt =
      new Date().toISOString()

    const {
      error:
        previousSessionsUpdateError,
    } =
      await supabaseAdmin
        .from('active_sessions')
        .update({
          is_active: false,
          logout_at:
            previousLogoutAt,
        })
        .eq(
          'auth_user_id',
          profile.auth_user_id,
        )
        .eq(
          'is_active',
          true,
        )
        .neq(
          'id',
          activeSession.id,
        )

    if (
      previousSessionsUpdateError
    ) {
      console.error(
        'Previous sessions update error:',
        previousSessionsUpdateError,
      )
    }

    /*
     * 15. T3LEEM Session Cookie
     */
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
          SESSION_COOKIE_MAX_DAYS *
          24 *
          60 *
          60,
      },
    )

    /*
     * 16. Audit
     */
    void supabaseAdmin
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
            activeSession.id,
          session_expires_at:
            expiresAt.toISOString(),
          single_session:
            true,
        },
      })
      .then(({ error }) => {
        if (error) {
          console.error(
            'Login success audit error:',
            error,
          )
        }
      })

    return response
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