import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const SESSION_COOKIE = 't3leem_session_id'
const DEVICE_COOKIE = 't3leem_device_token'

const IDLE_TIMEOUT_MINUTES = 1

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

export type GuardResult = {
  allowed: boolean
  userId?: string
  sessionId?: string
  deviceId?: string
  profileId?: string
  reason?: string
}

export async function validateCurrentAccess(): Promise<GuardResult> {
  try {
    /*
     * --------------------------------------------------
     * 1. Supabase Auth
     * --------------------------------------------------
     */
    const supabase =
      await createSupabaseServerClient()

    const {
      data: { user },
      error: authError,
    } =
      await supabase.auth.getUser()

    if (authError || !user) {
      return {
        allowed: false,
        reason: 'not_authenticated',
      }
    }

    /*
     * --------------------------------------------------
     * 2. Cookies
     * --------------------------------------------------
     */
    const cookieStore = await cookies()

    const sessionId =
      cookieStore.get(
        SESSION_COOKIE,
      )?.value

    const deviceToken =
      cookieStore.get(
        DEVICE_COOKIE,
      )?.value

    if (!sessionId || !deviceToken) {
      return {
        allowed: false,
        reason: 'missing_credentials',
      }
    }

    /*
     * --------------------------------------------------
     * 3. Active Session
     * --------------------------------------------------
     */
    const {
      data: session,
      error: sessionError,
    } =
      await supabaseAdmin
        .from('active_sessions')
        .select(
          `
          id,
          auth_user_id,
          trusted_device_id,
          is_active,
          last_activity_at
          `,
        )
        .eq(
          'id',
          sessionId,
        )
        .eq(
          'auth_user_id',
          user.id,
        )
        .maybeSingle()

    if (
      sessionError ||
      !session ||
      !session.is_active
    ) {
      return {
        allowed: false,
        reason: 'session_inactive',
      }
    }

    /*
     * --------------------------------------------------
     * 4. انتهاء الخمول: 20 دقيقة
     *
     * لا يوجد حد أقصى للجلسة.
     * النشاط الحقيقي يتم تحديثه من ActivityTracker.
     * --------------------------------------------------
     */
    const now = Date.now()

    const lastActivity =
      new Date(
        session.last_activity_at,
      ).getTime()

    const idleTimeout =
      IDLE_TIMEOUT_MINUTES *
      60 *
      1000

    if (
      Number.isNaN(lastActivity) ||
      now - lastActivity >=
        idleTimeout
    ) {
      await closeSession(
        session.id,
      )

      return {
        allowed: false,
        reason: 'idle_timeout',
      }
    }

    /*
     * --------------------------------------------------
     * 5. المستخدم
     * --------------------------------------------------
     */
    const {
      data: profile,
      error: profileError,
    } =
      await supabaseAdmin
        .from('user_profiles')
        .select(
          'id, auth_user_id, is_active',
        )
        .eq(
          'auth_user_id',
          user.id,
        )
        .maybeSingle()

    if (
      profileError ||
      !profile ||
      !profile.is_active
    ) {
      await closeSession(
        session.id,
      )

      return {
        allowed: false,
        reason: 'user_inactive',
      }
    }

    /*
     * --------------------------------------------------
     * 6. الجهاز الموثوق
     * --------------------------------------------------
     */
    const deviceTokenHash =
      await sha256(
        deviceToken,
      )

    const {
      data: device,
      error: deviceError,
    } =
      await supabaseAdmin
        .from('trusted_devices')
        .select(
          'id, auth_user_id, status',
        )
        .eq(
          'id',
          session.trusted_device_id,
        )
        .eq(
          'auth_user_id',
          user.id,
        )
        .eq(
          'device_token_hash',
          deviceTokenHash,
        )
        .eq(
          'status',
          'approved',
        )
        .maybeSingle()

    if (
      deviceError ||
      !device
    ) {
      await closeSession(
        session.id,
      )

      return {
        allowed: false,
        reason: 'device_not_approved',
      }
    }

    /*
     * --------------------------------------------------
     * 7. السماح
     *
     * مهم:
     * لا نحدث last_activity_at هنا.
     *
     * طلبات API / polling ليست نشاطًا للمستخدم.
     * --------------------------------------------------
     */
    return {
      allowed: true,
      userId: user.id,
      sessionId: session.id,
      deviceId: device.id,
      profileId: profile.id,
    }
  } catch (error) {
    console.error(
      'Auth guard error:',
      error,
    )

    return {
      allowed: false,
      reason: 'guard_error',
    }
  }
}

/*
 * --------------------------------------------------
 * إغلاق الجلسة
 * --------------------------------------------------
 */
async function closeSession(
  sessionId: string,
) {
  const now =
    new Date().toISOString()

  await supabaseAdmin
    .from('active_sessions')
    .update({
      is_active: false,
      logout_at: now,
      last_activity_at: now,
    })
    .eq(
      'id',
      sessionId,
    )
    .eq(
      'is_active',
      true,
    )
}

/*
 * --------------------------------------------------
 * SHA-256
 * --------------------------------------------------
 */
async function sha256(
  value: string,
) {
  const data =
    new TextEncoder().encode(
      value,
    )

  const hash =
    await crypto.subtle.digest(
      'SHA-256',
      data,
    )

  return Array.from(
    new Uint8Array(hash),
  )
    .map((byte) =>
      byte
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')
}