
import { cookies, headers } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase-server'

import {
  loadCurrentAccessRecords,
  updateApprovedDeviceType,
  requireTrustedDeviceReapproval,
  closeActiveSessionsForDevice,
  closeActiveSession,
} from '@/lib/features/app-core/repositories/auth-guard.repository'

const SESSION_COOKIE = 't3leem_session_id'
const DEVICE_COOKIE = 't3leem_device_token'

const IDLE_TIMEOUT_MINUTES = 20

type DeviceType =
  | 'iphone'
  | 'ipad'
  | 'samsung'
  | 'android'
  | 'windows_pc'
  | 'mac'
  | 'linux_pc'
  | 'unknown'

type AccessRecord = {
  session_id: string
  session_auth_user_id: string
  trusted_device_id: string | null
  session_is_active: boolean
  last_activity_at: string | null
  session_expires_at: string | null
  profile_id: string | null
  username: string | null
  user_role: string | null
  profile_is_active: boolean | null
  device_id: string | null
  device_status: string | null
  approved_device_type: string | null
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
    // 1. إنشاء عميل Supabase والتحقق من المستخدم الحقيقي.
    // لا نحذف هذا التحقق حفاظًا على أمان الجلسة.
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

    // 2. قراءة ملفات تعريف الارتباط ورؤوس الطلب.
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

    // 3. حساب بصمة رمز الجهاز.
    const hashStartedAt = performance.now()
    const deviceTokenHash = await sha256(deviceToken)

    console.info(
      '[AUTH GUARD TIMING] device token hash duration:',
      `${Math.round(performance.now() - hashStartedAt)}ms`,
    )

    markTiming('hash device token')

    // 4. جلب الجلسة والمستخدم والجهاز باستعلام واحد.
    // الدالة تعمل بصلاحية service_role فقط.
    // تبقى مطابقة الجلسة للمستخدم وبصمة الجهاز إلزامية.
    const rpcStartedAt = performance.now()

    const {
      data: records,
      error: accessError,
    } = await loadCurrentAccessRecords(
      sessionId,
      user.id,
      deviceTokenHash,
    )

    console.info(
      '[AUTH GUARD TIMING] get_current_access_records duration:',
      `${Math.round(performance.now() - rpcStartedAt)}ms`,
    )

    markTiming('get_current_access_records')

    if (accessError) {
      console.error(
        'Auth guard access records RPC error:',
        accessError,
      )

      markTiming('exit: access records RPC error')

      return {
        allowed: false,
        reason: 'guard_error',
      }
    }

    const record = (records?.[0] ?? null) as AccessRecord | null

    if (!record || !record.session_is_active) {
      markTiming('exit: session inactive')

      return {
        allowed: false,
        reason: 'session_inactive',
      }
    }

    // 5. التحقق من انتهاء صلاحية الجلسة.
    const now = Date.now()
    const expiresAt = record.session_expires_at
      ? new Date(record.session_expires_at).getTime()
      : Number.NaN

    if (!Number.isFinite(expiresAt) || now >= expiresAt) {
      await closeSession(record.session_id, user.id)

      markTiming('close expired session')

      return {
        allowed: false,
        reason: 'session_expired',
      }
    }

    // 6. التحقق من مهلة الخمول.
    const lastActivity = record.last_activity_at
      ? new Date(record.last_activity_at).getTime()
      : Number.NaN

    const idleTimeout = IDLE_TIMEOUT_MINUTES * 60 * 1000

    if (
      !Number.isFinite(lastActivity) ||
      now - lastActivity >= idleTimeout
    ) {
      await closeSession(record.session_id, user.id)

      markTiming('close idle session')

      return {
        allowed: false,
        reason: 'idle_timeout',
      }
    }

    // 7. التحقق من ملف المستخدم.
    if (!record.profile_id || !record.profile_is_active) {
      await closeSession(record.session_id, user.id)

      markTiming('close session for inactive user')

      return {
        allowed: false,
        reason: 'user_inactive',
      }
    }

    // 8. التحقق من الجهاز الموثوق وبصمة الرمز.
    // عدم وجود device_id يعني أن الجهاز لم يطابق البصمة المسجلة.
    if (!record.device_id) {
      await closeSession(record.session_id, user.id)

      markTiming('close session for unapproved device')

      return {
        allowed: false,
        reason: 'device_not_approved',
      }
    }

    // الجهاز مرفوض أو ملغي أو بانتظار الموافقة.
    if (record.device_status !== 'approved') {
      await closeDeviceSessions(record.device_id, user.id)

      markTiming('close sessions for device status')

      return {
        allowed: false,
        reason:
          record.device_status === 'pending'
            ? 'device_approval_required'
            : 'device_not_approved',
      }
    }

    // 9. التحقق من انتهاء فترة الثقة.
    const graceExpiresAt = record.grace_expires_at
      ? new Date(record.grace_expires_at).getTime()
      : Number.NaN

    if (
      !Number.isFinite(graceExpiresAt) ||
      now >= graceExpiresAt
    ) {
      await requireDeviceReapproval({
        deviceId: record.device_id,
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

    // 10. التحقق من نوع الجهاز المعتمد.
    const approvedDeviceType = normalizeDeviceType(
      record.approved_device_type,
    )

    // للأجهزة القديمة التي لا يوجد لها نوع مسجل:
    // نحفظ النوع الحالي مرة واحدة لتجنب تعطيلها بلا داعٍ.
    if (
      !record.approved_device_type ||
      approvedDeviceType === 'unknown'
    ) {
      if (detectedDeviceType !== 'unknown') {
        const backfillStartedAt = performance.now()

        const { error: backfillError } =
          await updateApprovedDeviceType(
            record.device_id,
            user.id,
            detectedDeviceType,
            new Date().toISOString(),
          )

        console.info(
          '[AUTH GUARD TIMING] device type backfill duration:',
          `${Math.round(performance.now() - backfillStartedAt)}ms`,
        )

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
      // تغيّر نوع الجهاز: نعيده إلى انتظار الموافقة.
      await requireDeviceReapproval({
        deviceId: record.device_id,
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

    // 11. منح الوصول بعد اجتياز جميع الفحوص.
    markTiming('access granted')

    return {
      allowed: true,
      userId: user.id,
      username: record.username ?? undefined,
      sessionId: record.session_id,
      deviceId: record.device_id,
      profileId: record.profile_id,
      role: record.user_role ?? undefined,
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

  const { error: updateError } =
    await requireTrustedDeviceReapproval(
      deviceId,
      authUserId,
      detectedDeviceType,
      now,
    )

  if (updateError) {
    console.error(
      'Device reapproval update error:',
      updateError,
    )
  }

  // أغلق الجلسات حتى لو فشل تحديث حالة الجهاز.
  // الحارس سيرفض الوصول في الطلب الحالي على أي حال.
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

  const { error } = await closeActiveSessionsForDevice(
    deviceId,
    authUserId,
    now,
  )

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

  const { error } = await closeActiveSession(
    sessionId,
    authUserId,
    now,
  )

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
