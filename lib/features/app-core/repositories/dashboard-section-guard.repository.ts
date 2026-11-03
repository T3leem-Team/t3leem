
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

export async function loadDashboardSectionByKey(
  sectionKey: string,
) {
  return await supabaseAdmin
    .from('dashboard_sections')
    .select('id, is_active')
    .eq('section_key', sectionKey)
    .maybeSingle()
}

export async function loadUserDashboardSectionPermission(
  profileId: string,
  sectionId: string,
) {
  return await supabaseAdmin
    .from('user_dashboard_sections')
    .select('id')
    .eq('user_profile_id', profileId)
    .eq('section_id', sectionId)
    .maybeSingle()
}
