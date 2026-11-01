
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


export type SubjectRepositoryRow = {
  id: string
  name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export async function loadSettingsSubjects() {
  return await supabase
    .from('subjects')
    .select('id, name, is_active, created_at, updated_at')
    .eq('is_active', true)
    .order('name', { ascending: true })
}

export async function insertSettingsSubject(name: string) {
  return await supabase
    .from('subjects')
    .insert({
      name,
      is_active: true,
    })
    .select('id, name, is_active, created_at, updated_at')
    .single()
}

export async function updateSettingsSubject(
  id: string,
  name: string,
) {
  return await supabase
    .from('subjects')
    .update({
      name,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, name, is_active, created_at, updated_at')
    .single()
}

export async function countSettingsSubjectCourses(
  subjectId: string,
) {
  return await supabase
    .from('course_subjects')
    .select('id', {
      count: 'exact',
      head: true,
    })
    .eq('subject_id', subjectId)
}

export async function countSettingsSubjectAssignments(
  subjectId: string,
) {
  return await supabase
    .from('teacher_student_assignments')
    .select('id', {
      count: 'exact',
      head: true,
    })
    .eq('subject_id', subjectId)
}

export async function deactivateSettingsSubject(
  subjectId: string,
) {
  return await supabase
    .from('subjects')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subjectId)
}

export async function deleteSettingsSubject(
  subjectId: string,
) {
  return await supabase
    .from('subjects')
    .delete()
    .eq('id', subjectId)
}
