
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

/**
 * User profile
 */
export async function loadLoginProfile(username: string) {
  return await supabaseAdmin
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
}

/**
 * Authentication audit logs
 */
export async function insertLoginAuditLog(
  authUserId: string,
  eventType: string,
  success: boolean,
  details: {
    deviceId?: string
    ipAddress: string | null
    userAgent: string
    metadata?: Record<string, unknown>
  },
) {
  return await supabaseAdmin
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
}

/**
 * Close active sessions for a trusted device
 */
export async function closeActiveSessionsForDevice(
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

/**
 * Find trusted device using its token hash
 */
export async function loadTrustedDeviceByToken(
  tokenHash: string,
  authUserId: string,
) {
  return await supabaseAdmin
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
    .eq('auth_user_id', authUserId)
    .maybeSingle()
}

/**
 * Check whether a matching fingerprint has a revoked/rejected record
 */
export async function loadBlockedFingerprintRecords(
  authUserId: string,
  fingerprintHash: string,
) {
  return await supabaseAdmin
    .from('trusted_devices')
    .select('id, status')
    .eq('auth_user_id', authUserId)
    .eq('device_fingerprint_hash', fingerprintHash)
    .in('status', ['revoked', 'rejected'])
    .limit(1)
}

/**
 * Find approved devices matching a fingerprint
 */
export async function loadApprovedDevicesByFingerprint(
  authUserId: string,
  fingerprintHash: string,
) {
  return await supabaseAdmin
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
    .eq('auth_user_id', authUserId)
    .eq('device_fingerprint_hash', fingerprintHash)
    .eq('status', 'approved')
    .limit(2)
}

/**
 * Require a trusted device to be approved again
 */
export async function updateTrustedDeviceForReapproval(
  deviceId: string,
  authUserId: string,
  detectedType: string,
  now: string,
) {
  return await supabaseAdmin
    .from('trusted_devices')
    .update({
      status: 'pending',
      pending_device_type: detectedType,
      device_type_detected_at: now,
    })
    .eq('id', deviceId)
    .eq('auth_user_id', authUserId)
    .eq('status', 'approved')
    .select('id')
    .maybeSingle()
}

/**
 * Rotate the device token during fingerprint recovery
 */
export async function recoverTrustedDevice(
  deviceId: string,
  authUserId: string,
  fingerprintHash: string,
  newTokenHash: string,
  now: string,
) {
  return await supabaseAdmin
    .from('trusted_devices')
    .update({
      device_token_hash: newTokenHash,
      last_used_at: now,
      device_type_detected_at: now,
    })
    .eq('id', deviceId)
    .eq('auth_user_id', authUserId)
    .eq('status', 'approved')
    .eq('device_fingerprint_hash', fingerprintHash)
    .select('id')
    .maybeSingle()
}

/**
 * Update a pending trusted device
 */
export async function updatePendingTrustedDevice(
  deviceId: string,
  authUserId: string,
  detectedType: string,
  now: string,
) {
  return await supabaseAdmin
    .from('trusted_devices')
    .update({
      pending_device_type: detectedType,
      device_type_detected_at: now,
    })
    .eq('id', deviceId)
    .eq('auth_user_id', authUserId)
    .eq('status', 'pending')
}

/**
 * Register a new trusted device
 */
export async function insertPendingTrustedDevice(
  device: {
    auth_user_id: string
    device_name: string
    device_token_hash: string
    device_fingerprint_hash: string
    status: string
    pending_device_type: string
    device_type_detected_at: string
    grace_period_days: number
  },
) {
  return await supabaseAdmin
    .from('trusted_devices')
    .insert(device)
    .select('id, status')
    .single()
}

/**
 * Update an approved trusted device
 */
export async function updateApprovedTrustedDevice(
  deviceId: string,
  authUserId: string,
  deviceUpdate: {
    last_used_at: string
    device_type_detected_at: string
    device_fingerprint_hash: string
    approved_device_type?: string
  },
) {
  return await supabaseAdmin
    .from('trusted_devices')
    .update(deviceUpdate)
    .eq('id', deviceId)
    .eq('auth_user_id', authUserId)
    .eq('status', 'approved')
    .select('id')
    .maybeSingle()
}

/**
 * Create a single active system session
 */
export async function createSingleActiveSession(
  authUserId: string,
  deviceId: string,
  expiresAt: string,
) {
  return await supabaseAdmin.rpc(
    'create_single_active_session',
    {
      p_auth_user_id: authUserId,
      p_trusted_device_id: deviceId,
      p_expires_at: expiresAt,
    },
  )
}
