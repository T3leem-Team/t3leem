
import 'server-only'

import { createClient } from '@supabase/supabase-js'

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

/**
 * Load the current session, user and trusted device access record.
 */
export async function loadCurrentAccessRecords(
  sessionId: string,
  authUserId: string,
  deviceTokenHash: string,
) {
  return await supabaseAdmin.rpc('get_current_access_records', {
    p_session_id: sessionId,
    p_auth_user_id: authUserId,
    p_device_token_hash: deviceTokenHash,
  })
}

/**
 * Backfill the approved device type for older trusted devices.
 */
export async function updateApprovedDeviceType(
  deviceId: string,
  authUserId: string,
  detectedDeviceType: string,
  now: string,
) {
  return await supabaseAdmin
    .from('trusted_devices')
    .update({
      approved_device_type: detectedDeviceType,
      device_type_detected_at: now,
    })
    .eq('id', deviceId)
    .eq('auth_user_id', authUserId)
    .eq('status', 'approved')
}

/**
 * Close one active session only.
 */
export async function closeActiveSession(
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
}
