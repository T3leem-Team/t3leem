
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
  username?: string
  sessionId?: string
  deviceId?: string
  profileId?: string
  role?: string
  reason?: string
}

export async function validateCurrentAccess(): Promise<GuardResult> {
  const totalStart = performance.now()

  const logTiming = (step: string, start: number) => {
    console.log(
      `[auth-guard] ${step}: ${Math.round(performance.now() - start)}ms`,
    )
  }

  try {
    const clientStart = performance.now()
    const supabase = await createSupabaseServerClient()
    logTiming('createSupabaseServerClient', clientStart)

    const authStart = performance.now()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    logTiming('getUser', authStart)

    if (authError || !user) {
      logTiming('TOTAL', totalStart)
      return {
        allowed: false,
        reason: 'not_authenticated',
      }
    }

    const cookiesStart = performance.now()
    const cookieStore = await cookies()

    const sessionId = cookieStore.get(SESSION_COOKIE)?.value
    const deviceToken = cookieStore.get(DEVICE_COOKIE)?.value
    logTiming('cookies', cookiesStart)

    if (!sessionId || !deviceToken) {
      logTiming('TOTAL', totalStart)
      return {
        allowed: false,
        reason: 'missing_credentials',
      }
    }

    const sessionStart = performance.now()
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
    logTiming('active_sessions', sessionStart)

    if (sessionError) {
      console.error(
        'Auth guard session lookup error:',
        sessionError,
      )
      logTiming('TOTAL', totalStart)
      return {
        allowed: false,
        reason: 'guard_error',
      }
    }

    if (!session || !session.is_active) {
      logTiming('TOTAL', totalStart)
      return {
        allowed: false,
        reason: 'session_inactive',
      }
    }

    const now = Date.now()
    const expiresAt = new Date(session.expires_at).getTime()

    if (!Number.isFinite(expiresAt) || now >= expiresAt) {
      const closeStart = performance.now()
      await closeSession(session.id, user.id)
      logTiming('closeSession (expired)', closeStart)
      logTiming('TOTAL', totalStart)

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
      const closeStart = performance.now()
      await closeSession(session.id, user.id)
      logTiming('closeSession (idle)', closeStart)
      logTiming('TOTAL', totalStart)

      return {
        allowed: false,
        reason: 'idle_timeout',
      }
    }

    const profileStart = performance.now()
    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from('user_profiles')
      .select('id, username, role, is_active')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    logTiming('user_profiles', profileStart)

    if (profileError) {
      console.error(
        'Auth guard profile lookup error:',
        profileError,
      )
      logTiming('TOTAL', totalStart)

      return {
        allowed: false,
        reason: 'guard_error',
      }
    }

    if (!profile || !profile.is_active) {
      const closeStart = performance.now()
      await closeSession(session.id, user.id)
      logTiming('closeSession (inactive user)', closeStart)
      logTiming('TOTAL', totalStart)

      return {
        allowed: false,
        reason: 'user_inactive',
      }
    }

    const hashStart = performance.now()
    const deviceTokenHash = await sha256(deviceToken)
    logTiming('sha256', hashStart)

    const deviceStart = performance.now()
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
    logTiming('trusted_devices', deviceStart)

    if (deviceError) {
      console.error(
        'Auth guard device lookup error:',
        deviceError,
      )
      logTiming('TOTAL', totalStart)

      return {
        allowed: false,
        reason: 'guard_error',
      }
    }

    if (!device) {
      const closeStart = performance.now()
      await closeSession(session.id, user.id)
      logTiming('closeSession (device not approved)', closeStart)
      logTiming('TOTAL', totalStart)

      return {
        allowed: false,
        reason: 'device_not_approved',
      }
    }

    logTiming('TOTAL', totalStart)

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
    logTiming('TOTAL', totalStart)

    return {
      allowed: false,
      reason: 'guard_error',
    }
  }
}

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

async function sha256(value: string) {
  const data = new TextEncoder().encode(value)

  const hash = await crypto.subtle.digest(
    'SHA-256',
    data,
  )

  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
