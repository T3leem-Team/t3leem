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
