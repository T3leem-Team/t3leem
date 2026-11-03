
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

export async function loadSystemSettings() {
  return await supabaseAdmin
    .from('system_settings')
    .select('system_enabled')
    .eq('id', 1)
    .maybeSingle()
}

export async function updateSystemSettings(
  systemEnabled: boolean,
  updatedAt: string,
) {
  return await supabaseAdmin
    .from('system_settings')
    .update({
      system_enabled: systemEnabled,
      updated_at: updatedAt,
    })
    .eq('id', 1)
}
