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
