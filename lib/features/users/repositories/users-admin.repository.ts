
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
