import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
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
    const supabase =
      await createSupabaseServerClient()

    /*
     * 1. Supabase Auth
     */
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        allowed: false,
        reason: 'not_authenticated',
      }
    }

    /*
     * 2. Cookies
     */
    const cookieStore = await cookies()

    const sessionId =
      cookieStore.get(SESSION_COOKIE)?.value

    const deviceToken =
      cookieStore.get(DEVICE_COOKIE)?.value

    if (!sessionId || !deviceToken) {
      return {
        allowed: false,
        reason: 'missing_credentials',
      }
    }

    /*
     * 3. Active Session
     */
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

    if (sessionError) {
      console.error(
        'Auth guard session lookup error:',
        sessionError,
      )

      return {
        allowed: false,
        reason: 'guard_error',
      }
    }

    if (!session || !session.is_active) {
      return {
        allowed: false,
        reason: 'session_inactive',
      }
    }

    /*
     * 4. Session expiry
     */
    const now = Date.now()

    const expiresAt =
      new Date(session.expires_at).getTime()

    if (
      Number.isNaN(expiresAt) ||
      now >= expiresAt
    ) {
      await closeSession(session.id)

      return {
        allowed: false,
        reason: 'session_expired',
      }
    }

    /*
     * 5. Idle timeout
     */
    const lastActivity =
      new Date(
        session.last_activity_at,
      ).getTime()

    const idleTimeout =
      IDLE_TIMEOUT_MINUTES * 60 * 1000

    if (
      Number.isNaN(lastActivity) ||
      now - lastActivity >= idleTimeout
    ) {
      await closeSession(session.id)

      return {
        allowed: false,
        reason: 'idle_timeout',
      }
    }

    /*
     * 6. User profile
     */
    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from('user_profiles')
      .select('id, is_active')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error(
        'Auth guard profile lookup error:',
        profileError,
      )

      return {
        allowed: false,
        reason: 'guard_error',
      }
    }

    if (!profile || !profile.is_active) {
      await closeSession(session.id)

      return {
        allowed: false,
        reason: 'user_inactive',
      }
    }

    /*
     * 7. Trusted device
     */
    const deviceTokenHash =
      await sha256(deviceToken)

    const {
      data: device,
      error: deviceError,
    } = await supabaseAdmin
      .from('trusted_devices')
      .select('id')
      .eq('id', session.trusted_device_id)
      .eq('auth_user_id', user.id)
      .eq('device_token_hash', deviceTokenHash)
      .eq('status', 'approved')
      .maybeSingle()

    if (deviceError) {
      console.error(
        'Auth guard device lookup error:',
        deviceError,
      )

      return {
        allowed: false,
        reason: 'guard_error',
      }
    }

    if (!device) {
      await closeSession(session.id)

      return {
        allowed: false,
        reason: 'device_not_approved',
      }
    }

    /*
     * 8. Access granted
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

async function closeSession(
  sessionId: string,
) {
  const now =
    new Date().toISOString()

  const { error } =
    await supabaseAdmin
      .from('active_sessions')
      .update({
        is_active: false,
        logout_at: now,
        last_activity_at: now,
      })
      .eq('id', sessionId)
      .eq('is_active', true)

  if (error) {
    console.error(
      'Close session error:',
      error,
    )
  }
}

async function sha256(
  value: string,
) {
  const data =
    new TextEncoder().encode(value)

  const hash =
    await crypto.subtle.digest(
      'SHA-256',
      data,
    )

  return Array.from(
    new Uint8Array(hash),
  )
    .map((byte) =>
      byte.toString(16).padStart(2, '0'),
    )
    .join('')
}