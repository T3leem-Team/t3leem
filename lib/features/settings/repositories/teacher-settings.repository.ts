import { supabase } from '@/lib/supabase'

// تحميل قائمة المعلمين
export async function loadSettingsTeachers() {
  return await supabase
    .from('teachers')
    .select(
      'id, name, personal_id, phone, age, status, is_active',
    )
    .order('name', { ascending: true })
}

// إضافة معلم
export async function insertSettingsTeacher(payload: {
  id: string
  name: string
  personal_id: string | null
  phone: string | null
  age: number | null
  status: 'دوام كامل' | 'دوام جزئي'
  is_active: boolean
}) {
  return await supabase
    .from('teachers')
    .insert(payload)
    .select(
      'id, name, personal_id, phone, age, status, is_active',
    )
    .single()
}

// تعديل بيانات معلم
export async function updateSettingsTeacher(
  id: string,
  payload: {
    name: string
    personal_id: string | null
    phone: string | null
    age: number | null
    status: 'دوام كامل' | 'دوام جزئي'
    updated_at: string
  },
) {
  return await supabase
    .from('teachers')
    .update(payload)
    .eq('id', id)
    .select(
      'id, name, personal_id, phone, age, status, is_active',
    )
    .single()
}

// تفعيل أو تعطيل معلم
export async function updateSettingsTeacherStatus(
  id: string,
  isActive: boolean,
) {
  return await supabase
    .from('teachers')
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
}

// حذف معلم
export async function deleteSettingsTeacher(id: string) {
  return await supabase
    .from('teachers')
    .delete()
    .eq('id', id)
}


export type TeacherDisplayMode =
  | 'original'
  | 'short'
  | 'teacher'

export type TeacherLevelAlias = {
  id: string
  name: string
  levels: string[]
}

export type TeacherCustomAlias = {
  id: string
  teacherId: string
  displayName: string
}

// تحميل إعدادات عرض المعلمين
export async function loadTeacherDisplaySettings() {
  return await supabase
    .from('teacher_display_settings')
    .select(
      'display_mode, level_aliases, teacher_aliases',
    )
    .eq('id', 1)
    .single()
}

// حفظ إعدادات عرض المعلمين
export async function saveTeacherDisplaySettings(payload: {
  display_mode: TeacherDisplayMode
  level_aliases: TeacherLevelAlias[]
  teacher_aliases: TeacherCustomAlias[]
}) {
  return await supabase
    .from('teacher_display_settings')
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)
    .select()
    .single()
}

