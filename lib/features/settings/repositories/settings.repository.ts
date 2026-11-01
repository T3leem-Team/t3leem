
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

export async function loadStudentTrackingAnalytics(
  from: string,
  to: string,
) {
  return await supabase
    .from('student_tracking_analytics')
    .select(
      'tracking_date, visits, real_tracking_opens',
    )
    .gte('tracking_date', from)
    .lte('tracking_date', to)
    .order('tracking_date', {
      ascending: true,
    })
}


export async function checkSettingsPermission(
  permission: string
) {
  return await supabase.rpc('has_permission', {
    required_permission: permission,
  })
}
