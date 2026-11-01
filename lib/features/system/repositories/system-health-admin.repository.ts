import 'server-only'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseAdmin =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null

export async function checkSupabaseConnection() {
  if (!supabaseAdmin) {
    return {
      data: null,
      error: new Error(
        'Supabase server environment variables are missing'
      ),
    }
  }

  return await supabaseAdmin
    .from('system_health_check')
    .select('id')
    .eq('id', 1)
    .maybeSingle()
}
