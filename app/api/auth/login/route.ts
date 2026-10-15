
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { createHash, randomBytes } from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const DEVICE_COOKIE = 't3leem_device_token'
const SESSION_COOKIE = 't3leem_session_id'

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

type DeviceType =
  | 'iphone'
  | 'ipad'
  | 'samsung'
  | 'android'
  | 'windows_pc'
  | 'mac'
  | 'linux_pc'
  | 'unknown'

type TrustedDevice = {
  id: string
  status: string
  device_name: string | null
  approved_device_type: string | null
  pending_device_type: string | null
  grace_period_days: number | null
  grace_expires_at: string | null
}

function hashDeviceToken(token: string) {
  return createHash('sha256')
    .update(token)
    .digest('hex')
}

function getCookie(
  request: NextRequest,
  cookieName: string,
) {
  return request.cookies.get(cookieName)?.value ?? null
}

function getIpAddress(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for')

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  return request.headers.get('x-real-ip')
}

function getUserAgent(request: NextRequest) {
  return request.headers.get('user-agent') ?? ''
}

/**
 * اكتشاف تقريبي لنوع الجهاز اعتمادًا على User-Agent.
 */
function detectDeviceType(userAgent: string): DeviceType {
  const ua = userAgent.toLowerCase()

  if (!ua) return 'unknown'

  if (
    ua.includes('ipad') ||
    (ua.includes('macintosh') && ua.includes('mobile'))
  ) {
    return 'ipad'
  }

  if (ua.includes('iphone') || ua.includes('ipod')) {
    return 'iphone'
  }

  if (
    ua.includes('samsungbrowser') ||
    /\bsm-[a-z0-9]+/i.test(userAgent) ||
    /\bgt-[a-z0-9]+/i.test(userAgent)
  ) {
    return 'samsung'
  }

  if (ua.includes('android')) {
    return 'android'
  }

  if (ua.includes('windows nt')) {
    return 'windows_pc'
  }

  if (
    ua.includes('macintosh') ||
    ua.includes('mac os x')
  ) {
    return 'mac'
  }

  if (ua.includes('linux')) {
    return 'linux_pc'
  }

  return 'unknown'
}

function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })

  return response
}

function deviceApprovalRequiredResponse(
  message: string,
  deviceId: string,
) {
  const response = NextResponse.json(
    {
      error: message,
      deviceStatus: 'pending',
      deviceId,
      approvalRequired: true,
    },
    { status: 403 },
  )

  return clearSessionCookie(response)
}

async function writeAudit(
  authUserId: string,
  eventType: string,
  success: boolean,
  details: {
    deviceId?: string
    ipAddress: string | null
    userAgent: string
    metadata?: Record<string, unknown>
  },
) {
  const { error } = await supabaseAdmin
    .from('auth_audit_logs')
    .insert({
      auth_user_id: authUserId,
      trusted_device_id: details.deviceId ?? null,
      event_type: eventType,
      success,
      ip_address: details.ipAddress,
      user_agent: details.userAgent || null,
      metadata: details.metadata ?? {},
    })

  if (error) {
    console.error(`Auth audit error (${eventType}):`, error)
  }
}

async function closeDeviceSessions(
  authUserId: string,
  deviceId: string,
) {
  const now = new Date().toISOString()

  const { error } = await supabaseAdmin
    .from('active_sessions')
    .update({
      is_active: false,
      logout_at: now,
      last_activity_at: now,
    })
    .eq('auth_user_id', authUserId)
    .eq('trusted_device_id', deviceId)
    .eq('is_active', true)

  if (error) {
    console.error('Close device sessions error:', error)
    throw new Error('تعذر إغلاق جلسات الجهاز.')
  }
}

async function requireDeviceReapproval(
  device: TrustedDevice,
  authUserId: string,
  detectedType: DeviceType,
  reason: 'grace_expired' | 'device_type_changed',
  ipAddress: string | null,
  userAgent: string,
) {
  const now = new Date().toISOString()

  const { data: updatedDevice, error } =
    await supabaseAdmin
      .from('trusted_devices')
      .update({
        status: 'pending',
        pending_device_type: detectedType,
        device_type_detected_at: now,
      })
      .eq('id', device.id)
      .eq('auth_user_id', authUserId)
      .eq('status', 'approved')
      .select('id')
      .maybeSingle()

  if (error) {
    console.error('Device reapproval update error:', error)
    throw new Error('تعذر تحديث حالة الجهاز.')
  }

  if (!updatedDevice) {
    return deviceApprovalRequiredResponse(
      'تغيرت حالة الجهاز. حدّث الصفحة وحاول تسجيل الدخول مجددًا.',
      device.id,
    )
  }

  await closeDeviceSessions(authUserId, device.id)

  await writeAudit(
    authUserId,
    'device_reapproval_required',
    false,
    {
      deviceId: device.id,
      ipAddress,
      userAgent,
      metadata: {
        reason,
        detected_device_type: detectedType,
        previous_approved_device_type:
          device.approved_device_type,
        grace_expires_at: device.grace_expires_at,
      },
    },
  )

  const message =
    reason === 'grace_expired'
      ? 'انتهت مدة الثقة لهذا الجهاز. يحتاج الجهاز إلى موافقة جديدة من مدير النظام.'
      : 'تم اكتشاف اختلاف في نوع الجهاز. يحتاج الجهاز إلى موافقة جديدة من مدير النظام.'

  return deviceApprovalRequiredResponse(
    message,
    device.id,
  )
}

export async function POST(request: NextRequest) {
  const loginStartedAt = Date.now()
  let lastTimingAt = loginStartedAt

  const markLoginTiming = (step: string) => {
    const now = Date.now()

    console.info(
      `[LOGIN TIMING] ${step}: ${now - lastTimingAt}ms | total: ${now - loginStartedAt}ms`,
    )

    lastTimingAt = now
  }

  try {
    const body = await request.json()
    markLoginTiming('parse request body')

    const username =
      typeof body.username === 'string'
        ? body.username.trim()
        : ''

    const password =
      typeof body.password === 'string'
        ? body.password
        : ''

    if (!username || !password) {
      markLoginTiming('validate credentials')

      return NextResponse.json(
        { error: 'اسم المستخدم وكلمة المرور مطلوبان.' },
        { status: 400 },
      )
    }

    const ipAddress = getIpAddress(request)
    const userAgent = getUserAgent(request)
    const detectedType = detectDeviceType(userAgent)

    /*
     * 1. البحث عن المستخدم.
     */
    const { data: profile, error: profileError } =
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
        .eq('username', username)
        .maybeSingle()

    markLoginTiming('profile lookup')

    if (profileError) {
      console.error('Login profile lookup error:', profileError)

      return NextResponse.json(
        { error: 'حدث خطأ أثناء تسجيل الدخول.' },
        { status: 500 },
      )
    }

    if (!profile || !profile.is_active) {
      return NextResponse.json(
        { error: 'اسم المستخدم أو كلمة المرور غير صحيحة.' },
        { status: 401 },
      )
    }

    /*
     * 2. التحقق من حساب Supabase Auth.
     */
    const { data: authUser, error: authUserError } =
      await supabaseAdmin.auth.admin.getUserById(
        profile.auth_user_id,
      )

    markLoginTiming('auth user lookup')

    if (authUserError || !authUser.user?.email) {
      console.error(
        'Login Auth user lookup error:',
        authUserError,
      )

      return NextResponse.json(
        { error: 'تعذر التحقق من حساب المستخدم.' },
        { status: 500 },
      )
    }

    const email = authUser.user.email

    /*
     * 3. التحقق من كلمة المرور.
     */
    const passwordClient = createClient(
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
    } = await passwordClient.auth.signInWithPassword({
      email,
      password,
    })

    markLoginTiming('password verification')

    if (
      passwordError ||
      !passwordAuthData.user ||
      !passwordAuthData.session
    ) {
      await writeAudit(
        profile.auth_user_id,
        'login_failed',
        false,
        {
          ipAddress,
          userAgent,
          metadata: {
            reason: 'invalid_password',
            username: profile.username,
          },
        },
      )

      markLoginTiming('failed login audit')

      return NextResponse.json(
        { error: 'اسم المستخدم أو كلمة المرور غير صحيحة.' },
        { status: 401 },
      )
    }

    /*
     * 4. البحث عن الجهاز باستخدام كوكي الجهاز.
     */
    const existingDeviceToken = getCookie(
      request,
      DEVICE_COOKIE,
    )

    let device: TrustedDevice | null = null

    if (existingDeviceToken) {
      const tokenHash = hashDeviceToken(existingDeviceToken)

      const { data: existingDevice, error } =
        await supabaseAdmin
          .from('trusted_devices')
          .select(`
            id,
            status,
            device_name,
            approved_device_type,
            pending_device_type,
            grace_period_days,
            grace_expires_at
          `)
          .eq('device_token_hash', tokenHash)
          .eq('auth_user_id', profile.auth_user_id)
          .maybeSingle()

      markLoginTiming('trusted device lookup')

      if (error) {
        console.error('Trusted device lookup error:', error)

        return NextResponse.json(
          { error: 'تعذر فحص الجهاز.' },
          { status: 500 },
        )
      }

      device = existingDevice as TrustedDevice | null
    } else {
      markLoginTiming('trusted device lookup skipped: no cookie')
    }

    /*
     * 5. الجهاز مرفوض أو مسحوب الاعتماد.
     */
    if (
      device &&
      (device.status === 'rejected' ||
        device.status === 'revoked')
    ) {
      await writeAudit(
        profile.auth_user_id,
        'login_failed',
        false,
        {
          deviceId: device.id,
          ipAddress,
          userAgent,
          metadata: {
            reason:
              device.status === 'rejected'
                ? 'device_rejected'
                : 'device_revoked',
          },
        },
      )

      markLoginTiming('rejected device audit')

      const response = NextResponse.json(
        {
          error: 'هذا الجهاز غير مصرح له بالدخول إلى النظام.',
          deviceStatus: device.status,
        },
        { status: 403 },
      )

      return clearSessionCookie(response)
    }

    /*
     * 6. الجهاز معلق بالفعل.
     */
    if (device && device.status === 'pending') {
      const { error } = await supabaseAdmin
        .from('trusted_devices')
        .update({
          pending_device_type: detectedType,
          device_type_detected_at: new Date().toISOString(),
        })
        .eq('id', device.id)
        .eq('auth_user_id', profile.auth_user_id)
        .eq('status', 'pending')

      markLoginTiming('pending device update')

      if (error) {
        console.error('Pending device update error:', error)
      }

      return deviceApprovalRequiredResponse(
        'هذا الجهاز بانتظار موافقة مدير النظام.',
        device.id,
      )
    }

    /*
     * 7. إنشاء سجل لجهاز جديد.
     */
    if (!device) {
      const deviceToken = randomBytes(32).toString('hex')
      const tokenHash = hashDeviceToken(deviceToken)
      const now = new Date().toISOString()

      const { data: newDevice, error: insertError } =
        await supabaseAdmin
          .from('trusted_devices')
          .insert({
            auth_user_id: profile.auth_user_id,
            device_name: 'جهاز جديد',
            device_token_hash: tokenHash,
            status: 'pending',
            pending_device_type: detectedType,
            device_type_detected_at: now,
            grace_period_days: 30,
          })
          .select('id, status')
          .single()

      markLoginTiming('create pending device')

      if (insertError || !newDevice) {
        console.error(
          'Trusted device insert error:',
          insertError,
        )

        return NextResponse.json(
          { error: 'تعذر تسجيل الجهاز الجديد.' },
          { status: 500 },
        )
      }

      await writeAudit(
        profile.auth_user_id,
        'device_pending',
        true,
        {
          deviceId: newDevice.id,
          ipAddress,
          userAgent,
          metadata: {
            source: 'login',
            detected_device_type: detectedType,
          },
        },
      )

      markLoginTiming('new device audit')

      const response = deviceApprovalRequiredResponse(
        'تم تسجيل جهازك الجديد، وهو بانتظار موافقة مدير النظام.',
        newDevice.id,
      )

      response.cookies.set(DEVICE_COOKIE, deviceToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: DEVICE_COOKIE_MAX_DAYS * 24 * 60 * 60,
      })

      return response
    }

    /*
     * 8. لا نسمح إلا للأجهزة المعتمدة.
     */
    if (device.status !== 'approved') {
      const response = NextResponse.json(
        {
          error: 'لا يمكن تسجيل الدخول من هذا الجهاز.',
          deviceStatus: device.status,
        },
        { status: 403 },
      )

      return clearSessionCookie(response)
    }

    /*
     * 9. التحقق من انتهاء مدة الثقة.
     */
    const graceExpiry = device.grace_expires_at
      ? new Date(device.grace_expires_at).getTime()
      : Number.NaN

    const graceExpired =
      !Number.isFinite(graceExpiry) ||
      graceExpiry <= Date.now()

    if (graceExpired) {
      const result = await requireDeviceReapproval(
        device,
        profile.auth_user_id,
        detectedType,
        'grace_expired',
        ipAddress,
        userAgent,
      )

      markLoginTiming('device reapproval: grace expired')

      return result
    }

    /*
     * 10. التحقق من نوع الجهاز.
     */
    const approvedType = device.approved_device_type

    if (
      approvedType &&
      approvedType !== 'unknown' &&
      detectedType !== 'unknown' &&
      detectedType !== approvedType
    ) {
      const result = await requireDeviceReapproval(
        device,
        profile.auth_user_id,
        detectedType,
        'device_type_changed',
        ipAddress,
        userAgent,
      )

      markLoginTiming('device reapproval: type changed')

      return result
    }

    /*
     * 11. تهيئة نوع الأجهزة القديمة عند الحاجة.
     */
    if (
      !approvedType ||
      approvedType === 'unknown'
    ) {
      const { error } = await supabaseAdmin
        .from('trusted_devices')
        .update({
          approved_device_type: detectedType,
          device_type_detected_at: new Date().toISOString(),
        })
        .eq('id', device.id)
        .eq('auth_user_id', profile.auth_user_id)
        .eq('status', 'approved')

      markLoginTiming('initialize approved device type')

      if (error) {
        console.error(
          'Device type initialization error:',
          error,
        )

        return NextResponse.json(
          { error: 'تعذر التحقق من بيانات الجهاز.' },
          { status: 500 },
        )
      }
    }

    /*
     * 12. تحديث آخر استخدام للجهاز.
     */
    const { error: deviceUpdateError } =
      await supabaseAdmin
        .from('trusted_devices')
        .update({
          last_used_at: new Date().toISOString(),
          device_type_detected_at: new Date().toISOString(),
        })
        .eq('id', device.id)
        .eq('auth_user_id', profile.auth_user_id)
        .eq('status', 'approved')

    markLoginTiming('trusted device update')

    if (deviceUpdateError) {
      console.error(
        'Trusted device update error:',
        deviceUpdateError,
      )

      return NextResponse.json(
        { error: 'تعذر تحديث بيانات الجهاز.' },
        { status: 500 },
      )
    }

    /*
     * 13. تجهيز جلسة Supabase.
     */
    const response = NextResponse.json({
      user: {
        id: profile.auth_user_id,
        username: profile.username,
        full_name: profile.full_name,
        role: profile.role,
      },
      deviceStatus: 'approved',
    })

    const supabase = createServerClient(
      supabaseUrl,
      publishableKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },

          setAll(cookiesToSet) {
            cookiesToSet.forEach(
              ({ name, value, options }) => {
                response.cookies.set(name, value, {
                  ...options,
                  path: options?.path ?? '/',
                })
              },
            )
          },
        },
      },
    )

    const session = passwordAuthData.session

    const { error: setSessionError } =
      await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      })

    markLoginTiming('set Supabase session')

    if (setSessionError) {
      console.error(
        'Supabase session setup error:',
        setSessionError,
      )

      return clearSessionCookie(
        NextResponse.json(
          { error: 'تعذر إنشاء جلسة تسجيل الدخول.' },
          { status: 500 },
        ),
      )
    }

    /*
     * 14. إنشاء جلسة النظام.
     */
    const loginAt = new Date()

    const expiresAt = new Date(
      loginAt.getTime() +
        SESSION_COOKIE_MAX_DAYS * 24 * 60 * 60 * 1000,
    )

    const { data: activeSession, error: sessionError } =
      await supabaseAdmin
        .from('active_sessions')
        .insert({
          auth_user_id: profile.auth_user_id,
          trusted_device_id: device.id,
          login_at: loginAt.toISOString(),
          last_activity_at: loginAt.toISOString(),
          logout_at: null,
          expires_at: expiresAt.toISOString(),
          is_active: true,
        })
        .select('id')
        .single()

    markLoginTiming('create active session')

    if (sessionError || !activeSession?.id) {
      console.error(
        'Active session insert error:',
        sessionError,
      )

      return clearSessionCookie(
        NextResponse.json(
          { error: 'تعذر إنشاء جلسة تسجيل الدخول.' },
          { status: 500 },
        ),
      )
    }

    /*
     * 15. إغلاق الجلسات السابقة للمستخدم.
     */
    const previousLogoutAt = new Date().toISOString()

    const { error: previousSessionsError } =
      await supabaseAdmin
        .from('active_sessions')
        .update({
          is_active: false,
          logout_at: previousLogoutAt,
        })
        .eq('auth_user_id', profile.auth_user_id)
        .eq('is_active', true)
        .neq('id', activeSession.id)

    markLoginTiming('close previous sessions')

    if (previousSessionsError) {
      console.error(
        'Previous sessions update error:',
        previousSessionsError,
      )
    }

    /*
     * 16. حفظ كوكي جلسة النظام.
     */
    response.cookies.set(SESSION_COOKIE, activeSession.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_COOKIE_MAX_DAYS * 24 * 60 * 60,
    })

    /*
     * 17. سجل نجاح الدخول.
     */
    await writeAudit(
      profile.auth_user_id,
      'login_success',
      true,
      {
        deviceId: device.id,
        ipAddress,
        userAgent,
        metadata: {
          username: profile.username,
          active_session_id: activeSession.id,
          session_expires_at: expiresAt.toISOString(),
          detected_device_type: detectedType,
          single_session: true,
        },
      },
    )

    markLoginTiming('success audit')
    markLoginTiming('login complete')

    return response
  } catch (error) {
    console.error('Login error:', error)
    markLoginTiming('login failed with exception')

    return NextResponse.json(
      { error: 'حدث خطأ غير متوقع أثناء تسجيل الدخول.' },
      { status: 500 },
    )
  }
}
