
import { supabase } from '@/lib/supabase'

export type AcademicYear = {
  id: string
  name: string
  start_date: string | null
  end_date: string | null
  is_current: boolean
  is_active: boolean
}

export async function loadArchiveAcademicYears() {
  return await supabase
    .from('academic_years')
    .select('id, name, start_date, end_date, is_current, is_active')
    .eq('is_active', true)
    .order('start_date', { ascending: false })
}

export async function checkSettingsPermission(
  permission: string
) {
  return await supabase.rpc('has_permission', {
    required_permission: permission,
  })
}
