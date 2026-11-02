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

export async function loadAcademicYearForArchive(
  yearId: string,
) {
  return await supabaseAdmin
    .from('academic_years')
    .select('id, is_current, is_active')
    .eq('id', yearId)
    .maybeSingle()
}

export async function archiveAcademicYear(
  yearId: string,
) {
  return await supabaseAdmin
    .from('academic_years')
    .update({
      is_active: false,
      is_current: false,
    })
    .eq('id', yearId)
    .eq('is_active', true)
    .eq('is_current', false)
    .select('id')
    .maybeSingle()
}
