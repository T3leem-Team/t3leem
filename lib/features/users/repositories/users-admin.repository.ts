
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

export async function loadAllUsers() {
  return await supabaseAdmin
    .from('user_profiles')
    .select(`
      id, auth_user_id, username, email, full_name,
      role, department, is_active, created_at, updated_at
    `)
    .order('created_at', { ascending: false })
}

export async function loadAllPermissions() {
  return await supabaseAdmin
    .from('permissions')
    .select('id, permission_key, permission_name, description, created_at')
    .order('permission_name', { ascending: true })
}



export async function loadUserById(userId: string) {
  return await supabaseAdmin
    .from('user_profiles')
    .select(`
      id, auth_user_id, username, email, full_name,
      role, department, is_active
    `)
    .eq('id', userId)
    .maybeSingle()
}

export async function loadExistingUserEmail(
  email: string,
  userId: string,
) {
  return await supabaseAdmin
    .from('user_profiles')
    .select('id')
    .eq('email', email)
    .neq('id', userId)
    .maybeSingle()
}

export async function loadPermissionIdsByIds(
  permissionIds: string[],
) {
  return await supabaseAdmin
    .from('permissions')
    .select('id')
    .in('id', permissionIds)
}

export async function updateUserProfile(
  userId: string,
  profileUpdate: Record<string, unknown>,
) {
  return await supabaseAdmin
    .from('user_profiles')
    .update(profileUpdate)
    .eq('id', userId)
    .select(`
      id, auth_user_id, username, email, full_name,
      role, department, is_active, created_at, updated_at
    `)
    .single()
}

export async function deleteUserPermissions(userId: string) {
  return await supabaseAdmin
    .from('user_permissions')
    .delete()
    .eq('user_profile_id', userId)
}

export async function insertUserPermissions(
  userId: string,
  permissionIds: string[],
) {
  return await supabaseAdmin
    .from('user_permissions')
    .insert(
      permissionIds.map((permissionId) => ({
        user_profile_id: userId,
        permission_id: permissionId,
      })),
    )
}

export async function loadDashboardSectionIdsByIds(
  sectionIds: string[],
) {
  return await supabaseAdmin
    .from('dashboard_sections')
    .select('id')
    .in('id', sectionIds)
}

export async function deleteUserDashboardSections(userId: string) {
  return await supabaseAdmin
    .from('user_dashboard_sections')
    .delete()
    .eq('user_profile_id', userId)
}

export async function insertUserDashboardSections(
  userId: string,
  sectionIds: string[],
) {
  return await supabaseAdmin
    .from('user_dashboard_sections')
    .insert(
      sectionIds.map((sectionId) => ({
        user_profile_id: userId,
        section_id: sectionId,
      })),
    )
}

export async function loadRolePermissionIds(role: string) {
  return await supabaseAdmin
    .from('role_permissions')
    .select('permission_id')
    .eq('role', role)
}

export async function loadAllUserPermissions() {
  return await supabaseAdmin
    .from('user_permissions')
    .select('id, user_profile_id, permission_id, created_at')
}

export async function loadAllRolePermissions() {
  return await supabaseAdmin
    .from('role_permissions')
    .select('role, permission_id')
}

export async function loadAllDashboardSections() {
  return await supabaseAdmin
    .from('dashboard_sections')
    .select(`
      id, section_key, section_name, description, icon,
      href, sort_order, is_active, created_at, updated_at
    `)
    .order('sort_order', { ascending: true })
}

export async function loadAllUserDashboardSections() {
  return await supabaseAdmin
    .from('user_dashboard_sections')
    .select('id, user_profile_id, section_id, created_at')
}



export async function loadUserForDeletion(userId: string) {
  return await supabaseAdmin
    .from('user_profiles')
    .select('id, auth_user_id, username, role')
    .eq('id', userId)
    .maybeSingle()
}

export async function deleteUserPermissionsByUserId(userId: string) {
  return await supabaseAdmin
    .from('user_permissions')
    .delete()
    .eq('user_profile_id', userId)
}

export async function deleteUserSectionsByUserId(userId: string) {
  return await supabaseAdmin
    .from('user_dashboard_sections')
    .delete()
    .eq('user_profile_id', userId)
}

export async function deleteUserProfile(userId: string) {
  return await supabaseAdmin
    .from('user_profiles')
    .delete()
    .eq('id', userId)
}

