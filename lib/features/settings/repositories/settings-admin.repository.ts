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

const SCHOOL_SETTINGS_COLUMNS =
  'id, school_name, school_subtitle, updated_at'

export async function loadSchoolSettings() {
  return await supabaseAdmin
    .from('school_settings')
    .select(SCHOOL_SETTINGS_COLUMNS)
    .eq('id', 1)
    .maybeSingle()
}

export async function createSchoolSettings() {
  return await supabaseAdmin
    .from('school_settings')
    .insert({
      id: 1,
      school_name: 'تعليم',
      school_subtitle: 'نظام إدارة المدارس',
    })
    .select(SCHOOL_SETTINGS_COLUMNS)
    .single()
}

export async function updateSchoolSettings(
  schoolName: string,
  schoolSubtitle: string,
  updatedAt: string,
) {
  return await supabaseAdmin
    .from('school_settings')
    .update({
      school_name: schoolName,
      school_subtitle: schoolSubtitle,
      updated_at: updatedAt,
    })
    .eq('id', 1)
    .select(SCHOOL_SETTINGS_COLUMNS)
    .single()
}
