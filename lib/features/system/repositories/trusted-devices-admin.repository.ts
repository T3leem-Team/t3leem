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

type DeviceStatus = 'pending' | 'approved'
type DeviceOrderColumn = 'created_at' | 'approved_at'

export async function loadTrustedDevicesAdminProfile(
  userId: string,
) {
  return await supabaseAdmin
    .from('user_profiles')
    .select('auth_user_id, username, full_name, role, is_active')
    .eq('auth_user_id', userId)
    .maybeSingle()
}

export async function loadTrustedDeviceOwnerProfiles(
  userIds: string[],
) {
  return await supabaseAdmin
    .from('user_profiles')
    .select('auth_user_id, username, full_name, role')
    .in('auth_user_id', userIds)
}

export async function insertTrustedDeviceAuditLog(
  authUserId: string,
  deviceId: string,
  eventType: string,
  metadata: Record<string, unknown>,
) {
  return await supabaseAdmin
    .from('auth_audit_logs')
    .insert({
      auth_user_id: authUserId,
      trusted_device_id: deviceId,
      event_type: eventType,
      success: true,
      metadata,
    })
}

export async function closeTrustedDeviceSessions(
  authUserId: string,
  deviceId: string,
  now: string,
) {
  return await supabaseAdmin
    .from('active_sessions')
    .update({
      is_active: false,
      logout_at: now,
      last_activity_at: now,
    })
    .eq('auth_user_id', authUserId)
    .eq('trusted_device_id', deviceId)
    .eq('is_active', true)
}

export async function loadTrustedDevicesByStatus(
  status: DeviceStatus,
  orderColumn: DeviceOrderColumn,
  columns: string,
) {
  return await supabaseAdmin
    .from('trusted_devices')
    .select(columns)
    .eq('status', status)
    .order(orderColumn, { ascending: false })
}

export async function loadTrustedDeviceById(
  deviceId: string,
) {
  return await supabaseAdmin
    .from('trusted_devices')
    .select(`
      id,
      auth_user_id,
      status,
      device_name,
      approved_device_type,
      pending_device_type,
      grace_period_days,
      grace_expires_at
    `)
    .eq('id', deviceId)
    .maybeSingle()
}

export async function approveTrustedDevice(
  deviceId: string,
  adminUserId: string,
  approvedDeviceType: string,
  approvedAt: string,
  gracePeriodDays: number,
  graceExpiresAt: string,
) {
  return await supabaseAdmin
    .from('trusted_devices')
    .update({
      status: 'approved',
      approved_at: approvedAt,
      approved_by: adminUserId,
      approved_device_type: approvedDeviceType,
      pending_device_type: null,
      grace_period_days: gracePeriodDays,
      grace_expires_at: graceExpiresAt,
      rejected_at: null,
      rejected_by: null,
      revoked_at: null,
      revoked_by: null,
    })
    .eq('id', deviceId)
    .eq('status', 'pending')
    .select(`
      id,
      auth_user_id,
      device_name,
      status,
      approved_at,
      approved_by,
      approved_device_type,
      grace_period_days,
      grace_expires_at
    `)
    .maybeSingle()
}

export async function rejectTrustedDevice(
  deviceId: string,
  adminUserId: string,
  rejectedAt: string,
) {
  return await supabaseAdmin
    .from('trusted_devices')
    .update({
      status: 'rejected',
      rejected_at: rejectedAt,
      rejected_by: adminUserId,
      approved_at: null,
      approved_by: null,
      pending_device_type: null,
      revoked_at: null,
      revoked_by: null,
    })
    .eq('id', deviceId)
    .eq('status', 'pending')
    .select(
      'id, auth_user_id, device_name, status, rejected_at, rejected_by',
    )
    .maybeSingle()
}

export async function revokeTrustedDevice(
  deviceId: string,
  adminUserId: string,
  revokedAt: string,
) {
  return await supabaseAdmin
    .from('trusted_devices')
    .update({
      status: 'revoked',
      revoked_at: revokedAt,
      revoked_by: adminUserId,
    })
    .eq('id', deviceId)
    .eq('status', 'approved')
    .select(
      'id, auth_user_id, device_name, status, revoked_at, revoked_by',
    )
    .maybeSingle()
}

export async function updateTrustedDeviceGracePeriod(
  deviceId: string,
  gracePeriodDays: number,
  graceExpiresAt: string,
) {
  return await supabaseAdmin
    .from('trusted_devices')
    .update({
      grace_period_days: gracePeriodDays,
      grace_expires_at: graceExpiresAt,
    })
    .eq('id', deviceId)
    .eq('status', 'approved')
    .select(`
      id,
      auth_user_id,
      device_name,
      status,
      approved_device_type,
      grace_period_days,
      grace_expires_at
    `)
    .maybeSingle()
}
