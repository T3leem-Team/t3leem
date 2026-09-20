import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const SESSION_COOKIE = 't3leem_session_id'
const DEVICE_COOKIE = 't3leem_device_token'

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
  reason?: string
}

export async function validateCurrentAccess(): Promise<GuardResult> {
  try {
    const cookieStore = await cookies()

    const sessionId = cookieStore.get(SESSION_COOKIE)?.value
    const deviceToken = cookieStore.get(DEVICE_COOKIE)?.value

    if (!sessionId || !deviceToken) {
      return {
        allowed: false,
        reason: 'missing_credentials',
      }
    }

    const deviceTokenHash = await sha256(deviceToken)

    const { data: session } = await supabaseAdmin
      .from('active_sessions')
      .select(
        'id, auth_user_id, trusted_device_id, is_active, expires_at',
      )
      .eq('id', sessionId)
      .maybeSingle()

    if (!session || !session.is_active) {
      return {
        allowed: false,
        reason: 'session_inactive',
      }
    }

    if (
      session.expires_at &&
      new Date(session.expires_at).getTime() <= Date.now()
    ) {
      await supabaseAdmin
        .from('active_sessions')
        .update({
          is_active: false,
          logout_at: new Date().toISOString(),
        })
        .eq('id', session.id)

      return {
        allowed: false,
        reason: 'session_expired',
      }
    }

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('id, auth_user_id, is_active')
      .eq('auth_user_id', session.auth_user_id)
      .maybeSingle()

    if (!profile || !profile.is_active) {
      await supabaseAdmin
        .from('active_sessions')
        .update({
          is_active: false,
          logout_at: new Date().toISOString(),
        })
        .eq('id', session.id)

      return {
        allowed: false,
        reason: 'user_inactive',
      }
    }

    const { data: device } = await supabaseAdmin
      .from('trusted_devices')
      .select('id, auth_user_id, status')
      .eq('id', session.trusted_device_id)
      .eq('auth_user_id', session.auth_user_id)
      .eq('device_token_hash', deviceTokenHash)
      .maybeSingle()

    if (!device || device.status !== 'approved') {
      await supabaseAdmin
        .from('active_sessions')
        .update({
          is_active: false,
          logout_at: new Date().toISOString(),
        })
        .eq('id', session.id)

      return {
        allowed: false,
        reason: 'device_not_approved',
      }
    }

    await supabaseAdmin
      .from('active_sessions')
      .update({
        last_activity_at: new Date().toISOString(),
      })
      .eq('id', session.id)
      .eq('is_active', true)

    return {
      allowed: true,
      userId: session.auth_user_id,
      sessionId: session.id,
      deviceId: device.id,
    }
  } catch (error) {
    console.error('Auth guard error:', error)

    return {
      allowed: false,
      reason: 'guard_error',
    }
  }
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value)
  const hash = await crypto.subtle.digest('SHA-256', data)

  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
