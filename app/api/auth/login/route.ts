
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
 * بصمة تقريبية من ترويسات المتصفح.
 * ليست معرفًا فريدًا ولا تُستخدم دون نجاح كلمة المرور.
 */
function createDeviceFingerprintHash(
  request: NextRequest,
): string {
  const userAgent = getUserAgent(request)
  const deviceType = detectDeviceType(userAgent)
  const browserFamily = detectBrowserFamily(userAgent)

  const platform =
    request.headers.get('sec-ch-ua-platform') ?? ''

  const mobile =
    request.headers.get('sec-ch-ua-mobile') ?? ''

  const acceptLanguage =
    request.headers.get('accept-language') ?? ''

  const normalizedLanguage = acceptLanguage
    .toLowerCase()
    .trim()
    .split(',')
    .map((value) => value.split(';')[0].trim())
    .filter(Boolean)
    .join(',')

  const fingerprintData = [
    `device:${deviceType}`,
    `browser:${browserFamily}`,
    `platform:${platform.toLowerCase().trim()}`,
    `mobile:${mobile.trim()}`,
    `language:${normalizedLanguage}`,
  ].join('|')

  return createHash('sha256')
    .update(fingerprintData)
    .digest('hex')
}

/**
 * الاسترجاع من الساعة 08:00 حتى 23:59 بتوقيت البحرين.
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

  const expiry = new Date(device.grace_expires_at).getTime()

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

  const markLoginTiming = (step: string) => {
    console.info(
      `[LOGIN TIMING] ${step}: ${
        Date.now() - loginStartedAt
      }ms total`,
    )
  }

  try {
    /*
     * 1. قراءة بيانات تسجيل الدخول.
     */
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
        { error: 'اسم المستخدم وكلمة المرور مطلوبان.' },
        { status: 400 },
      )
    }

    const ipAddress = getIpAddress(request)
    const userAgent = getUserAgent(request)
    const detectedType = detectDeviceType(userAgent)

    /*
     * 2. البحث عن حساب المستخدم.
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

    const email =
      typeof profile.email === 'string'
        ? profile.email.trim()
        : ''

    if (!email) {
      return NextResponse.json(
        { error: 'تعذر التحقق من حساب المستخدم.' },
        { status: 500 },
      )
    }

    /*
     * 3. التحقق من كلمة المرور أولًا.
     *
     * لا نبحث عن الجهاز أو البصمة قبل نجاح المصادقة.
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

      return NextResponse.json(
        {
          error: 'اسم المستخدم أو كلمة المرور غير صحيحة.',
        },
        { status: 401 },
      )
    }

    /*
     * 4. بعد نجاح كلمة المرور فقط:
     * قراءة الكوكي وتوليد البصمة التقريبية.
     */
    const existingDeviceToken = getCookie(
      request,
      DEVICE_COOKIE,
    )

    const fingerprintHash =
      createDeviceFingerprintHash(request)

    let device: TrustedDevice | null = null
    let recoveryCandidate: TrustedDevice | null = null

    /*
     * 5. محاولة مطابقة الكوكي الموجودة.
     *
     * إذا كانت الكوكي غير موجودة أو لا تطابق سجلًا
     * لهذا المستخدم، ننتقل إلى مسار البصمة أدناه.
     *
     * إذا طابقت جهازًا مرفوضًا أو مسحوب الاعتماد،
     * فسيُرفض الجهاز ولا نتجاوز الرفض بالبصمة.
     */
    if (existingDeviceToken) {
      const tokenHash = hashDeviceToken(existingDeviceToken)

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

      if (error) {
        console.error(
          'Trusted device lookup error:',
          error,
        )

        return NextResponse.json(
          { error: 'تعذر فحص الجهاز.' },
          { status: 500 },
        )
      }

      device = data as TrustedDevice | null
    }

    /*
     * 6. الاسترجاع بالبصمة عند غياب الكوكي أو عدم صلاحيتها.
     *
     * المقصود بعدم صلاحيتها هنا أن رمزها لا يطابق
     * سجل جهاز لهذا المستخدم.
     */
    const cookieMissingOrInvalid = !device

    if (
      cookieMissingOrInvalid &&
      isAutomaticRecoveryAllowed()
    ) {
      /*
       * أولًا: نتحقق من عدم وجود أي سجل سابق مطابق
       * للبصمة حالته revoked أو rejected.
       *
       * إذا وجدنا سجلًا مانعًا، لا نجرب استرجاع
       * أي سجل approved بهذه البصمة.
       */
      const {
        data: blockedFingerprintRecords,
        error: blockedFingerprintError,
      } = await supabaseAdmin
        .from('trusted_devices')
        .select('id, status')
        .eq('auth_user_id', profile.auth_user_id)
        .eq('device_fingerprint_hash', fingerprintHash)
        .in('status', ['revoked', 'rejected'])
        .limit(1)

      if (blockedFingerprintError) {
        console.error(
          'Blocked fingerprint lookup error:',
          blockedFingerprintError,
        )

        return NextResponse.json(
          { error: 'تعذر التحقق من سجل اعتماد الجهاز.' },
          { status: 500 },
        )
      }

      const hasBlockedFingerprintRecord =
        (blockedFingerprintRecords ?? []).length > 0

      if (hasBlockedFingerprintRecord) {
        console.info(
          '[DEVICE RECOVERY] blocked: matching revoked/rejected record exists',
        )

        /*
         * لا نعيّن recoveryCandidate.
         * سيواصل الكود مساره المعتاد لطلب موافقة جديدة
         * بدل استرجاع الجهاز تلقائيًا.
         */
      } else {
        /*
         * لا نبحث عن جهاز معتمد للاسترجاع إلا إذا
         * لم يوجد أي سجل مانع مطابق للبصمة.
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
          console.error(
            'Fingerprint recovery lookup error:',
            error,
          )

          return NextResponse.json(
            { error: 'تعذر فحص بصمة الجهاز.' },
            { status: 500 },
          )
        }

        const candidates = (data ?? []) as TrustedDevice[]

        /*
         * لا نسترجع الجهاز إذا وُجد أكثر من تطابق.
         */
        if (candidates.length === 1) {
          recoveryCandidate = candidates[0]
        }

        console.info(
          `[DEVICE RECOVERY] candidates: ${candidates.length}`,
        )
      }
    } else if (cookieMissingOrInvalid) {
      console.info(
        '[DEVICE RECOVERY] blocked by Bahrain time policy',
      )
    }

    let recoveredDeviceToken: string | null = null

    /*
     * 7. التعامل مع الجهاز المطابق للبصمة.
     */
    if (recoveryCandidate) {
      /*
       * إذا انتهت فترة السماح أو اختلف نوع الجهاز،
       * لا نسمح بالاسترجاع التلقائي.
       * نطلب موافقة جديدة على سجل الجهاز نفسه.
       */
      if (!isGracePeriodValid(recoveryCandidate)) {
        return await requireDeviceReapproval(
          recoveryCandidate,
          profile.auth_user_id,
          detectedType,
          'grace_expired',
          ipAddress,
          userAgent,
        )
      }

      if (
        !isDeviceTypeCompatible(
          recoveryCandidate,
          detectedType,
        )
      ) {
        return await requireDeviceReapproval(
          recoveryCandidate,
          profile.auth_user_id,
          detectedType,
          'device_type_changed',
          ipAddress,
          userAgent,
        )
      }

      /*
       * توليد كوكي جديدة وتدوير رمز الجهاز.
       * التحديث مشروط ببقاء الجهاز معتمدًا
       * وبقاء البصمة المطابقة في قاعدة البيانات.
       */
      const newDeviceToken = randomBytes(32).toString('hex')
      const now = new Date().toISOString()

      const { data: recovered, error: recoveryError } =
        await supabaseAdmin
          .from('trusted_devices')
          .update({
            device_token_hash:
              hashDeviceToken(newDeviceToken),
            last_used_at: now,
            device_type_detected_at: now,
          })
          .eq('id', recoveryCandidate.id)
          .eq('auth_user_id', profile.auth_user_id)
          .eq('status', 'approved')
          .eq('device_fingerprint_hash', fingerprintHash)
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

      if (!recovered) {
        return deviceApprovalRequiredResponse(
          'تعذر تأكيد حالة الجهاز. يحتاج الجهاز إلى مراجعة المدير.',
          recoveryCandidate.id,
        )
      }

      device = recoveryCandidate
      recoveredDeviceToken = newDeviceToken

      scheduleAudit(
        profile.auth_user_id,
        'device_cookie_recovered',
        true,
        {
          deviceId: recoveryCandidate.id,
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

    /*
     * 8. إذا كانت الكوكي تطابق جهازًا مرفوضًا
     * أو مسحوب الاعتماد، نرفض الدخول.
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
     * 9. إذا كان الجهاز معلقًا، نطلب الموافقة.
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
     * 10. لم نجد جهازًا صالحًا للاسترجاع.
     * نسجل جهازًا جديدًا بحالة pending.
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

      const recoveryAllowed = isAutomaticRecoveryAllowed()

      const response = deviceApprovalRequiredResponse(
        recoveryAllowed
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
     * 11. لا يُسمح بالدخول إلا لجهاز معتمد.
     */
    if (device.status !== 'approved') {
      return clearSessionCookie(
        NextResponse.json(
          {
            error: 'لا يمكن تسجيل الدخول من هذا الجهاز.',
            deviceStatus: device.status,
          },
          { status: 403 },
        ),
      )
    }

    /*
     * 12. التحقق من مدة الثقة.
     */
    if (!isGracePeriodValid(device)) {
      return await requireDeviceReapproval(
        device,
        profile.auth_user_id,
        detectedType,
        'grace_expired',
        ipAddress,
        userAgent,
      )
    }

    /*
     * 13. التحقق من نوع الجهاز.
     */
    if (!isDeviceTypeCompatible(device, detectedType)) {
      return await requireDeviceReapproval(
        device,
        profile.auth_user_id,
        detectedType,
        'device_type_changed',
        ipAddress,
        userAgent,
      )
    }

    /*
     * 14. تحديث آخر استخدام والبصمة الحالية.
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
     * 15. تجهيز جلسة Supabase.
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
     * 16. إنشاء جلسة النظام النشطة الواحدة.
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
     * 17. حفظ كوكي الجلسة.
     */
    response.cookies.set(SESSION_COOKIE, activeSessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_COOKIE_MAX_DAYS * 24 * 60 * 60,
    })

    /*
     * إذا استُرجع الجهاز، نحفظ الكوكي الجديدة.
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
     * 18. تسجيل نجاح الدخول.
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

    markLoginTiming('login complete')

    return response
  } catch (error) {
    console.error('Login error:', error)

    return NextResponse.json(
      { error: 'حدث خطأ غير متوقع أثناء تسجيل الدخول.' },
      { status: 500 },
    )
  }
}
