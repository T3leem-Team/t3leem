import 'server-only'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

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

export async function loadActiveSessionForLogout(
  sessionId: string,
) {
  return await supabaseAdmin
    .from('active_sessions')
    .select(`
      id,
      auth_user_id,
      trusted_device_id,
      is_active
    `)
    .eq('id', sessionId)
    .maybeSingle()
}

export async function closeActiveSessionForLogout(
  sessionId: string,
  authUserId: string,
  now: string,
) {
  return await supabaseAdmin
    .from('active_sessions')
    .update({
      is_active: false,
      logout_at: now,
      last_activity_at: now,
    })
    .eq('id', sessionId)
    .eq('auth_user_id', authUserId)
    .eq('is_active', true)
    .select('id')
    .maybeSingle()
}

export async function insertLogoutAuditLog(
  authUserId: string,
  deviceId: string | null,
  ipAddress: string | null,
  userAgent: string | null,
  sessionId: string,
) {
  return await supabaseAdmin
    .from('auth_audit_logs')
    .insert({
      auth_user_id: authUserId,
      trusted_device_id: deviceId,
      event_type: 'logout',
      success: true,
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata: {
        active_session_id: sessionId,
      },
    })
}
