
import { NextRequest, NextResponse, after } from 'next/server'
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
const DEVICE_GRACE_PERIOD_DAYS = 30
const RECOVERY_TIME_ZONE = 'Asia/Bahrain'

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

type AuditDetails = {
  deviceId?: string
  ipAddress: string | null
  userAgent: string
  metadata?: Record<string, unknown>
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

/**
 * تحديد عائلة المتصفح بصورة تقريبية.
 * لا نحتفظ بإصدار المتصفح حتى لا تتغير البصمة مع كل تحديث بسيط.
 */
function detectBrowserFamily(userAgent: string): string {
  const ua = userAgent.toLowerCase()

  if (ua.includes('edg/')) return 'edge'
  if (ua.includes('opr/') || ua.includes('opera')) return 'opera'
  if (ua.includes('samsungbrowser')) return 'samsung-browser'
  if (ua.includes('crios/') || ua.includes('chrome/')) return 'chrome'
  if (ua.includes('fxios/') || ua.includes('firefox/')) return 'firefox'
  if (ua.includes('safari/')) return 'safari'

  return 'unknown'
}

/**
 * بصمة تقريبية من إشارات يرسلها المتصفح إلى الخادم.
 *
 * ليست معرفًا فريدًا للجهاز، ويمكن أن تتطابق بين أجهزة مختلفة.
 */
function createDeviceFingerprintHash(
  request: NextRequest,
): string {
  const userAgent = getUserAgent(request)
  const deviceType = detectDeviceType(userAgent)

  const browserFamily =
    detectBrowserFamily(userAgent)

  const platform =
    request.headers.get('sec-ch-ua-platform') ?? ''

  const mobile =
    request.headers.get('sec-ch-ua-mobile') ?? ''

  const acceptLanguage =
    request.headers.get('accept-language') ?? ''

  const fingerprintData = [
    `device:${deviceType}`,
    `browser:${browserFamily}`,
    `platform:${platform.toLowerCase().trim()}`,
    `mobile:${mobile.trim()}`,
    `language:${acceptLanguage
      .toLowerCase()
      .trim()
      .split(',')
      .map((value) => value.split(';')[0].trim())
      .filter(Boolean)
      .join(',')}`,
  ].join('|')

  return createHash('sha256')
    .update(fingerprintData)
    .digest('hex')
}

/**
 * الاسترجاع التلقائي مسموح من 08:00 حتى 23:59
 * حسب توقيت البحرين، وليس توقيت جهاز المستخدم.
 */
function isAutomaticRecoveryAllowed(): boolean {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: RECOVERY_TIME_ZONE,
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())

  const hour = Number(
    parts.find((part) => part.type === 'hour')?.value,
  )

  return Number.isInteger(hour) && hour >= 8 && hour < 24
}

function isGracePeriodValid(device: TrustedDevice): boolean {
  if (!device.grace_expires_at) {
    return false
  }

  const expiry = new Date(
    device.grace_expires_at,
  ).getTime()

  return Number.isFinite(expiry) && expiry > Date.now()
}

function isDeviceTypeCompatible(
  device: TrustedDevice,
  detectedType: DeviceType,
): boolean {
  const approvedType = device.approved_device_type

  return (
    !approvedType ||
    approvedType === 'unknown' ||
    detectedType === 'unknown' ||
    approvedType === detectedType
  )
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
  details: AuditDetails,
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

/**
 * جدولة سجل التدقيق بعد إرسال الاستجابة.
 */
function scheduleAudit(
  authUserId: string,
  eventType: string,
  success: boolean,
  details: AuditDetails,
) {
  after(async () => {
    await writeAudit(
      authUserId,
      eventType,
      success,
      details,
    )
  })
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

  scheduleAudit(
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
      `[LOGIN TIMING] ${step}: ${
        now - lastTimingAt
      }ms | total: ${
        now - loginStartedAt
      }ms`,
    )

    lastTimingAt = now
  }

  try {
    /*
     * 1. قراءة الطلب والتحقق من المدخلات.
     */
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
    const fingerprintHash =
      createDeviceFingerprintHash(request)

    /*
     * 2. البحث عن المستخدم.
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
          is_active,
          email
        `)
        .eq('username', username)
        .maybeSingle()

    markLoginTiming('profile lookup')

    if (profileError) {
      console.error(
        'Login profile lookup error:',
        profileError,
      )

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
     * 3. استخدام البريد المحفوظ في الملف الشخصي.
     */
    const email =
      typeof profile.email === 'string'
        ? profile.email.trim()
        : ''

    markLoginTiming('auth email from profile')

    if (!email) {
      console.error(
        'Login profile email missing:',
        profile.auth_user_id,
      )

      return NextResponse.json(
        { error: 'تعذر التحقق من حساب المستخدم.' },
        { status: 500 },
      )
    }

    /*
     * 4. التحقق من كلمة المرور والبحث عن الجهاز بالتوازي.
     */
    const existingDeviceToken = getCookie(
      request,
      DEVICE_COOKIE,
    )

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

    const passwordStartedAt = Date.now()
    const parallelStartedAt = Date.now()

    const passwordPromise = (
      async () => {
        const result =
          await passwordClient.auth.signInWithPassword({
            email,
            password,
          })

        console.info(
          `[LOGIN TIMING] password verification: ${
            Date.now() - passwordStartedAt
          }ms | total: ${
            Date.now() - loginStartedAt
          }ms`,
        )

        return result
      }
    )()

    const deviceLookupPromise = (
      async () => {
        const lookupStartedAt = Date.now()

        if (existingDeviceToken) {
          const tokenHash = hashDeviceToken(
            existingDeviceToken,
          )

          const { data, error } = await supabaseAdmin
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

          const duration = Date.now() - lookupStartedAt

          console.info(
            `[LOGIN TIMING] trusted device lookup: ${duration}ms`,
          )

          return {
            device: data as TrustedDevice | null,
            recoveryCandidate: null as TrustedDevice | null,
            error,
            skipped: false,
          }
        }

        /*
         * لا نحاول الاسترجاع التلقائي خارج الوقت المحدد.
         * لا نستخدم البصمة للاسترجاع من 00:00 إلى 07:59.
         */
        if (!isAutomaticRecoveryAllowed()) {
          console.info(
            '[DEVICE RECOVERY] disabled by Bahrain time policy',
          )

          return {
            device: null as TrustedDevice | null,
            recoveryCandidate: null as TrustedDevice | null,
            error: null,
            skipped: true,
          }
        }

        /*
         * نبحث عن جهاز معتمد له بصمة مطابقة.
         * إذا وجدنا أكثر من سجل مطابق، لا نختار سجلًا عشوائيًا.
         */
        const { data, error } = await supabaseAdmin
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
          .eq('auth_user_id', profile.auth_user_id)
          .eq('device_fingerprint_hash', fingerprintHash)
          .eq('status', 'approved')
          .limit(2)

        if (error) {
          return {
            device: null as TrustedDevice | null,
            recoveryCandidate: null as TrustedDevice | null,
            error,
            skipped: false,
          }
        }

        const candidates = (data ?? []) as TrustedDevice[]

        const candidate =
          candidates.length === 1
            ? candidates[0]
            : null

        console.info(
          `[DEVICE RECOVERY] matching candidates: ${candidates.length}`,
        )

        return {
          device: null as TrustedDevice | null,
          recoveryCandidate: candidate,
          error: null,
          skipped: false,
        }
      }
    )()

    const [
      passwordResult,
      deviceLookupResult,
    ] = await Promise.all([
      passwordPromise,
      deviceLookupPromise,
    ])

    console.info(
      `[LOGIN TIMING] parallel checks complete: ${
        Date.now() - parallelStartedAt
      }ms | total: ${
        Date.now() - loginStartedAt
      }ms`,
    )

    lastTimingAt = Date.now()

    const {
      data: passwordAuthData,
      error: passwordError,
    } = passwordResult

    /*
     * 5. معالجة فشل المصادقة أولاً.
     */
    if (
      passwordError ||
      !passwordAuthData.user ||
      !passwordAuthData.session
    ) {
      scheduleAudit(
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

      markLoginTiming('failed login audit scheduled')

      return NextResponse.json(
        {
          error: 'اسم المستخدم أو كلمة المرور غير صحيحة.',
        },
        { status: 401 },
      )
    }

    if (deviceLookupResult.error) {
      console.error(
        'Trusted device lookup error:',
        deviceLookupResult.error,
      )

      return NextResponse.json(
        { error: 'تعذر فحص الجهاز.' },
        { status: 500 },
      )
    }

    let device = deviceLookupResult.device
    let recoveredDeviceToken: string | null = null

    /*
     * 6. محاولة استرجاع الجهاز إذا كانت الكوكي مفقودة.
     */
    if (
      !existingDeviceToken &&
      deviceLookupResult.recoveryCandidate &&
      isAutomaticRecoveryAllowed()
    ) {
      const candidate =
        deviceLookupResult.recoveryCandidate

      const candidateIsEligible =
        candidate.status === 'approved' &&
        isGracePeriodValid(candidate) &&
        isDeviceTypeCompatible(candidate, detectedType)

      if (candidateIsEligible) {
        const newDeviceToken =
          randomBytes(32).toString('hex')

        const now = new Date().toISOString()

        /*
         * تدوير رمز الجهاز بعد التحقق من كلمة المرور.
         * الرمز القديم لا يمكن استعادته من قاعدة البيانات،
         * لأنها تخزن تجزئته فقط.
         */
        const { data: recovered, error: recoveryError } =
          await supabaseAdmin
            .from('trusted_devices')
            .update({
              device_token_hash:
                hashDeviceToken(newDeviceToken),
              device_fingerprint_hash: fingerprintHash,
              last_used_at: now,
              device_type_detected_at: now,
            })
            .eq('id', candidate.id)
            .eq('auth_user_id', profile.auth_user_id)
            .eq('status', 'approved')
            .eq(
              'device_fingerprint_hash',
              fingerprintHash,
            )
            .select('id')
            .maybeSingle()

        if (recoveryError) {
          console.error(
            'Device recovery update error:',
            recoveryError,
          )

          return NextResponse.json(
            { error: 'تعذر استرجاع الجهاز.' },
            { status: 500 },
          )
        }

        if (recovered) {
          device = candidate
          recoveredDeviceToken = newDeviceToken

          scheduleAudit(
            profile.auth_user_id,
            'device_cookie_recovered',
            true,
            {
              deviceId: candidate.id,
              ipAddress,
              userAgent,
              metadata: {
                recovery_method: 'browser_signal_fingerprint',
                detected_device_type: detectedType,
                timezone: RECOVERY_TIME_ZONE,
              },
            },
          )

          console.info(
            '[DEVICE RECOVERY] approved device recovered',
          )
        }
      }
    }

    /*
     * 7. الجهاز مرفوض أو مسحوب الاعتماد.
     */
    if (
      device &&
      (
        device.status === 'rejected' ||
        device.status === 'revoked'
      )
    ) {
      scheduleAudit(
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

      markLoginTiming('rejected device audit scheduled')

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
     * 8. الجهاز معلق بالفعل.
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
        console.error(
          'Pending device update error:',
          error,
        )
      }

      return deviceApprovalRequiredResponse(
        'هذا الجهاز بانتظار موافقة مدير النظام.',
        device.id,
      )
    }

    /*
     * 9. إنشاء سجل لجهاز جديد عند عدم العثور على جهاز
     * يمكن استرجاعه، أو عندما تكون البصمة غير مطابقة.
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
            device_fingerprint_hash: fingerprintHash,
            status: 'pending',
            pending_device_type: detectedType,
            device_type_detected_at: now,
            grace_period_days: DEVICE_GRACE_PERIOD_DAYS,
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

      scheduleAudit(
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
            fingerprint_saved: true,
          },
        },
      )

      const response = deviceApprovalRequiredResponse(
        isAutomaticRecoveryAllowed()
          ? 'لم يتم العثور على جهاز معتمد ببصمة مطابقة. الجهاز بانتظار موافقة مدير النظام.'
          : 'الاسترجاع التلقائي متوقف من منتصف الليل إلى الساعة 8 صباحًا. الجهاز بانتظار موافقة مدير النظام.',
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
     * 10. لا نسمح إلا للأجهزة المعتمدة.
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
     * 11. التحقق من انتهاء مدة الثقة.
     */
    if (!isGracePeriodValid(device)) {
      const result = await requireDeviceReapproval(
        device,
        profile.auth_user_id,
        detectedType,
        'grace_expired',
        ipAddress,
        userAgent,
      )

      markLoginTiming(
        'device reapproval: grace expired',
      )

      return result
    }

    /*
     * 12. التحقق من نوع الجهاز.
     */
    if (!isDeviceTypeCompatible(device, detectedType)) {
      const result = await requireDeviceReapproval(
        device,
        profile.auth_user_id,
        detectedType,
        'device_type_changed',
        ipAddress,
        userAgent,
      )

      markLoginTiming(
        'device reapproval: type changed',
      )

      return result
    }

    /*
     * 13. تحديث بيانات الجهاز المعتمد والبصمة الحالية.
     */
    const now = new Date().toISOString()
    const approvedType = device.approved_device_type

    const deviceUpdate: {
      last_used_at: string
      device_type_detected_at: string
      device_fingerprint_hash: string
      approved_device_type?: DeviceType
    } = {
      last_used_at: now,
      device_type_detected_at: now,
      device_fingerprint_hash: fingerprintHash,
    }

    if (!approvedType || approvedType === 'unknown') {
      deviceUpdate.approved_device_type = detectedType
    }

    const {
      data: updatedDevice,
      error: deviceUpdateError,
    } = await supabaseAdmin
      .from('trusted_devices')
      .update(deviceUpdate)
      .eq('id', device.id)
      .eq('auth_user_id', profile.auth_user_id)
      .eq('status', 'approved')
      .select('id')
      .maybeSingle()

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

    if (!updatedDevice) {
      return deviceApprovalRequiredResponse(
        'تغيرت حالة الجهاز. حدّث الصفحة وحاول تسجيل الدخول مجددًا.',
        device.id,
      )
    }

    /*
     * 14. تجهيز استجابة تسجيل الدخول وعميل الجلسة.
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
     * 15. إنشاء جلسة النظام النشطة الواحدة.
     */
    const loginAt = new Date()

    const expiresAt = new Date(
      loginAt.getTime() +
        SESSION_COOKIE_MAX_DAYS * 24 * 60 * 60 * 1000,
    )

    const {
      data: activeSessionId,
      error: sessionError,
    } = await supabaseAdmin.rpc(
      'create_single_active_session',
      {
        p_auth_user_id: profile.auth_user_id,
        p_trusted_device_id: device.id,
        p_expires_at: expiresAt.toISOString(),
      },
    )

    markLoginTiming('create single active session')

    if (sessionError || !activeSessionId) {
      console.error(
        'Create single active session error:',
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
     * 16. حفظ كوكي جلسة النظام.
     */
    response.cookies.set(SESSION_COOKIE, activeSessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_COOKIE_MAX_DAYS * 24 * 60 * 60,
    })

    /*
     * إذا استُرجع الجهاز، نحفظ كوكي الجهاز الجديدة.
     */
    if (recoveredDeviceToken) {
      response.cookies.set(
        DEVICE_COOKIE,
        recoveredDeviceToken,
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: DEVICE_COOKIE_MAX_DAYS * 24 * 60 * 60,
        },
      )
    }

    /*
     * 17. جدولة سجل نجاح الدخول دون انتظار إدخاله.
     */
    scheduleAudit(
      profile.auth_user_id,
      'login_success',
      true,
      {
        deviceId: device.id,
        ipAddress,
        userAgent,
        metadata: {
          username: profile.username,
          active_session_id: activeSessionId,
          session_expires_at: expiresAt.toISOString(),
          detected_device_type: detectedType,
          single_session: true,
          device_recovered: Boolean(recoveredDeviceToken),
        },
      },
    )

    markLoginTiming('success audit scheduled')
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
