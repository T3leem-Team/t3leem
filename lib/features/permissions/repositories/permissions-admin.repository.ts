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

export async function loadAdminPermissionProfile(
  userId: string,
) {
  return await supabaseAdmin
    .from('user_profiles')
    .select(
      'id, auth_user_id, role, is_active',
    )
    .eq('auth_user_id', userId)
    .maybeSingle()
}

export async function loadAllPermissions() {
  return await supabaseAdmin
    .from('permissions')
    .select(`
      id,
      permission_key,
      permission_name,
      description,
      created_at
    `)
    .order('permission_name', {
      ascending: true,
    })
}

export async function loadUserPermissionIds(
  userProfileId: string,
) {
  return await supabaseAdmin
    .from('user_permissions')
    .select('permission_id')
    .eq('user_profile_id', userProfileId)
}

export async function loadRolePermissionIds(
  role: string,
) {
  return await supabaseAdmin
    .from('role_permissions')
    .select('permission_id')
    .eq('role', role)
}

export async function loadActiveSystemElementKeys() {
  return await supabaseAdmin
    .from('system_elements')
    .select('element_key')
    .eq('is_active', true)
}

export async function loadUserSystemElementAssignments(
  userProfileId: string,
) {
  return await supabaseAdmin
    .from('system_element_users')
    .select(`
      element_id,
      system_elements!inner (
        element_key,
        is_active
      )
    `)
    .eq('user_profile_id', userProfileId)
}

export async function loadSupervisionSettings() {
  return await supabaseAdmin
    .from('supervision_settings')
    .select(
      'allow_teacher_transfer, allow_teacher_remove',
    )
    .eq('id', 'default')
    .maybeSingle()
}

export async function createDefaultSupervisionSettings(
  settings?: {
    allow_teacher_transfer?: boolean
    allow_teacher_remove?: boolean
  },
) {
  return await supabaseAdmin
    .from('supervision_settings')
    .insert({
      id: 'default',
      allow_teacher_transfer:
        settings?.allow_teacher_transfer ?? true,
      allow_teacher_remove:
        settings?.allow_teacher_remove ?? true,
    })
    .select(
      'allow_teacher_transfer, allow_teacher_remove',
    )
    .single()
}

export async function updateSupervisionSettings(
  updates: {
    allow_teacher_transfer?: boolean
    allow_teacher_remove?: boolean
  },
) {
  return await supabaseAdmin
    .from('supervision_settings')
    .update(updates)
    .eq('id', 'default')
    .select(
      'allow_teacher_transfer, allow_teacher_remove',
    )
    .single()
}


export async function loadPermissionProfileById(
  profileId: string,
) {
  return await supabaseAdmin
    .from('user_profiles')
    .select('id, username, role, is_active')
    .eq('id', profileId)
    .maybeSingle()
}
