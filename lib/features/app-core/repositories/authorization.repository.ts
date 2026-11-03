
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

export async function checkUserPermission(
  profileId: string,
  role: string,
  permissionKey: string,
) {
  return await supabaseAdmin.rpc('check_user_permission', {
    p_profile_id: profileId,
    p_role: role,
    p_permission_key: permissionKey,
  })
}

export async function loadPermissionByKey(
  permissionKey: string,
) {
  return await supabaseAdmin
    .from('permissions')
    .select('id')
    .eq('permission_key', permissionKey)
    .limit(1)
    .maybeSingle()
}

export async function loadUserDashboardSection(
  profileId: string,
  sectionKey: string,
) {
  return await supabaseAdmin
    .from('user_dashboard_sections')
    .select(`
      section_id,
      dashboard_sections!inner (
        section_key,
        is_active
      )
    `)
    .eq('user_profile_id', profileId)
    .eq('dashboard_sections.section_key', sectionKey)
    .eq('dashboard_sections.is_active', true)
    .limit(1)
    .maybeSingle()
}
