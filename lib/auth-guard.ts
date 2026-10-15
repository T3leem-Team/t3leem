import { createClient } from '@supabase/supabase-js'
import { cookies, headers } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const SESSION_COOKIE = 't3leem_session_id'
const DEVICE_COOKIE = 't3leem_device_token'

const IDLE_TIMEOUT_MINUTES = 20

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
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
  approved_device_type: string | null
  grace_period_days: number | null
  grace_expires_at: string | null
}

export type GuardResult = {
  allowed: boolean
  userId?: string
  username?: string
  sessionId?: string
  deviceId?: string
  profileId?: string
  role?: string
  reason?: string
}

/**
 * قياس زمن كل خطوة والزمن الإجمالي منذ بداية التحقق.
 */
function createGuardTimer() {
  const startedAt = performance.now()
  let lastAt = startedAt

  return (step: string) => {
    const now = performance.now()
    const stepDuration = Math.round(now - lastAt)
    const totalDuration = Math.round(now - startedAt)

    console.info(
      `[AUTH GUARD TIMING] ${step}: ${stepDuration}ms | total: ${totalDuration}ms`,
    )

    lastAt = now
  }
}

export async function validateCurrentAccess(): Promise<GuardResult> {
  const markTiming = createGuardTimer()

  console.info('[AUTH GUARD TIMING] entered validateCurrentAccess')

  try {
    const supabase = await createSupabaseServerClient()

    markTiming('createSupabaseServerClient')

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    markTiming('supabase.auth.getUser')

    if (authError || !user) {
      markTiming('exit: not_authenticated')

      return {
        allowed: false,
        reason: 'not_authenticated',
      }
    }

    const cookieStore = await cookies()
    const requestHeaders = await headers()

    markTiming('cookies and headers')

    const sessionId = cookieStore.get(SESSION_COOKIE)?.value
    const deviceToken = cookieStore.get(DEVICE_COOKIE)?.value

    if (!sessionId || !deviceToken) {
      markTiming('exit: missing_credentials')

      return {
        allowed: false,
        reason: 'missing_credentials',
      }
    }

    const userAgent = requestHeaders.get('user-agent') ?? ''
    const detectedDeviceType = detectDeviceType(userAgent)

    markTiming('detect device type')

    const {
      data: session,
      error: sessionError,
    } = await supabaseAdmin
      .from('active_sessions')
      .select(`
        id,
        auth_user_id,
        trusted_device_id,
        is_active,
        last_activity_at,
        expires_at
      `)
      .eq('id', sessionId)
      .eq('auth_user_id', user.id)
      .maybeSingle()

    markTiming('query active_sessions')

    if (sessionError) {
      console.error('Auth guard session lookup error:', sessionError)

      markTiming('exit: session lookup error')

      return {
        allowed: false,
        reason: 'guard_error',
      }
    }

    if (!session || !session.is_active) {
      markTiming('exit: session inactive')

      return {
        allowed: false,
        reason: 'session_inactive',
      }
    }

    const now = Date.now()

    const expiresAt = new Date(session.expires_at).getTime()

    if (!Number.isFinite(expiresAt) || now >= expiresAt) {
      await closeSession(session.id, user.id)

      markTiming('close expired session')

      return {
        allowed: false,
        reason: 'session_expired',
      }
    }

    const lastActivity = new Date(session.last_activity_at).getTime()

    const idleTimeout = IDLE_TIMEOUT_MINUTES * 60 * 1000

    if (
      !Number.isFinite(lastActivity) ||
      now - lastActivity >= idleTimeout
    ) {
      await closeSession(session.id, user.id)

      markTiming('close idle session')

      return {
        allowed: false,
        reason: 'idle_timeout',
      }
    }

    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from('user_profiles')
      .select('id, username, role, is_active')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    markTiming('query user_profiles')

    if (profileError) {
      console.error('Auth guard profile lookup error:', profileError)

      markTiming('exit: profile lookup error')

      return {
        allowed: false,
        reason: 'guard_error',
      }
    }

    if (!profile || !profile.is_active) {
      await closeSession(session.id, user.id)

      markTiming('close session for inactive user')

      return {
        allowed: false,
        reason: 'user_inactive',
      }
    }

    // التحقق من رمز الجهاز وربطه بالمستخدم والجلسة الحالية.
    const deviceTokenHash = await sha256(deviceToken)

    markTiming('hash device token')

    const {
      data: device,
      error: deviceError,
    } = await supabaseAdmin
      .from('trusted_devices')
      .select(`
        id,
        status,
        approved_device_type,
        grace_period_days,
        grace_expires_at
      `)
      .eq('id', session.trusted_device_id)
      .eq('auth_user_id', user.id)
      .eq('device_token_hash', deviceTokenHash)
      .maybeSingle<TrustedDevice>()

    markTiming('query trusted_devices')

    if (deviceError) {
      console.error('Auth guard device lookup error:', deviceError)

      markTiming('exit: device lookup error')

      return {
        allowed: false,
        reason: 'guard_error',
      }
    }

    if (!device) {
      await closeSession(session.id, user.id)

      markTiming('close session for unapproved device')

      return {
        allowed: false,
        reason: 'device_not_approved',
      }
    }

    // الجهاز مرفوض أو ملغي أو بانتظار الموافقة.
    if (device.status !== 'approved') {
      await closeDeviceSessions(device.id, user.id)

      markTiming('close sessions for device status')

      return {
        allowed: false,
        reason:
          device.status === 'pending'
            ? 'device_approval_required'
            : 'device_not_approved',
      }
    }

    // انتهاء مدة الثقة: أعد الجهاز إلى انتظار الموافقة.
    const graceExpiresAt = device.grace_expires_at
      ? new Date(device.grace_expires_at).getTime()
      : Number.NaN

    if (
      !Number.isFinite(graceExpiresAt) ||
      now >= graceExpiresAt
    ) {
      await requireDeviceReapproval({
        deviceId: device.id,
        authUserId: user.id,
        detectedDeviceType,
        reason: 'grace_period_expired',
      })

      markTiming('require device reapproval: grace period expired')

      return {
        allowed: false,
        reason: 'device_approval_required',
      }
    }

    const approvedDeviceType = normalizeDeviceType(
      device.approved_device_type,
    )

    // للأجهزة القديمة التي لا يوجد لها نوع مسجل:
    // احفظ النوع الحالي مرة واحدة لتجنب تعطيلها بلا داعٍ.
    if (
      !device.approved_device_type ||
      approvedDeviceType === 'unknown'
    ) {
      if (detectedDeviceType !== 'unknown') {
        const { error: backfillError } = await supabaseAdmin
          .from('trusted_devices')
          .update({
            approved_device_type: detectedDeviceType,
            device_type_detected_at: new Date().toISOString(),
          })
          .eq('id', device.id)
          .eq('auth_user_id', user.id)
          .eq('status', 'approved')

        markTiming('update missing approved device type')

        if (backfillError) {
          console.error(
            'Auth guard device type backfill error:',
            backfillError,
          )

          markTiming('exit: device type update error')

          return {
            allowed: false,
            reason: 'guard_error',
          }
        }
      }
    } else if (
      detectedDeviceType !== 'unknown' &&
      approvedDeviceType !== detectedDeviceType
    ) {
      // تغيّر نوع الجهاز: أعده إلى انتظار الموافقة.
      await requireDeviceReapproval({
        deviceId: device.id,
        authUserId: user.id,
        detectedDeviceType,
        reason: 'device_type_changed',
      })

      markTiming('require device reapproval: device type changed')

      return {
        allowed: false,
        reason: 'device_approval_required',
      }
    }

    markTiming('access granted')

    return {
      allowed: true,
      userId: user.id,
      username: profile.username,
      sessionId: session.id,
      deviceId: device.id,
      profileId: profile.id,
      role: profile.role,
    }
  } catch (error) {
    console.error('Auth guard error:', error)

    markTiming('caught error')

    return {
      allowed: false,
      reason: 'guard_error',
    }
  }
}

/**
 * يرجع الجهاز إلى انتظار الموافقة، ويحافظ على السجل في قاعدة البيانات.
 * يغلق كل الجلسات النشطة المرتبطة بهذا الجهاز.
 */
async function requireDeviceReapproval({
  deviceId,
  authUserId,
  detectedDeviceType,
  reason,
}: {
  deviceId: string
  authUserId: string
  detectedDeviceType: DeviceType
  reason: string
}) {
  const now = new Date().toISOString()

  const { error: updateError } = await supabaseAdmin
    .from('trusted_devices')
    .update({
      status: 'pending',
      pending_device_type: detectedDeviceType,
      device_type_detected_at: now,
    })
    .eq('id', deviceId)
    .eq('auth_user_id', authUserId)
    .eq('status', 'approved')

  if (updateError) {
    console.error(
      'Device reapproval update error:',
      updateError,
    )
  }

  // أغلق الجلسات حتى لو فشل تحديث حالة الجهاز.
  // الحارس سيرفض السماح بالوصول في الطلب الحالي على أي حال.
  await closeDeviceSessions(deviceId, authUserId)

  console.warn('Device requires new approval:', {
    deviceId,
    authUserId,
    reason,
  })
}

/**
 * يغلق جميع الجلسات النشطة لهذا الجهاز دون حذف سجلاتها.
 */
async function closeDeviceSessions(
  deviceId: string,
  authUserId: string,
) {
  const now = new Date().toISOString()

  const { error } = await supabaseAdmin
    .from('active_sessions')
    .update({
      is_active: false,
      logout_at: now,
      last_activity_at: now,
    })
    .eq('trusted_device_id', deviceId)
    .eq('auth_user_id', authUserId)
    .eq('is_active', true)

  if (error) {
    console.error('Close device sessions error:', error)
  }
}

/**
 * يغلق جلسة محددة فقط.
 */
async function closeSession(
  sessionId: string,
  authUserId: string,
) {
  const now = new Date().toISOString()

  const { error } = await supabaseAdmin
    .from('active_sessions')
    .update({
      is_active: false,
      logout_at: now,
      last_activity_at: now,
    })
    .eq('id', sessionId)
    .eq('auth_user_id', authUserId)
    .eq('is_active', true)

  if (error) {
    console.error('Close session error:', error)
  }
}

/**
 * تقدير نوع الجهاز من User-Agent.
 * هذا تقدير تقريبي وليس بصمة مضمونة للجهاز.
 */
function detectDeviceType(userAgent: string): DeviceType {
  const ua = userAgent.toLowerCase()

  if (!ua) {
    return 'unknown'
  }

  if (
    /ipad/.test(ua) ||
    (/macintosh/.test(ua) && /mobile/.test(ua))
  ) {
    return 'ipad'
  }

  if (/iphone|ipod/.test(ua)) {
    return 'iphone'
  }

  if (
    /samsung/.test(ua) ||
    /\bsm-[a-z0-9]+/.test(ua) ||
    /\bgt-[a-z0-9]+/.test(ua)
  ) {
    return 'samsung'
  }

  if (/android/.test(ua)) {
    return 'android'
  }

  if (/windows nt/.test(ua)) {
    return 'windows_pc'
  }

  if (/macintosh|mac os x/.test(ua)) {
    return 'mac'
  }

  if (/linux/.test(ua)) {
    return 'linux_pc'
  }

  return 'unknown'
}

function normalizeDeviceType(
  value: string | null | undefined,
): DeviceType {
  const allowedTypes: DeviceType[] = [
    'iphone',
    'ipad',
    'samsung',
    'android',
    'windows_pc',
    'mac',
    'linux_pc',
    'unknown',
  ]

  if (value && allowedTypes.includes(value as DeviceType)) {
    return value as DeviceType
  }

  return 'unknown'
}

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value)

  const hash = await crypto.subtle.digest('SHA-256', data)

  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
