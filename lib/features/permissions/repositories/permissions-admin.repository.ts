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
