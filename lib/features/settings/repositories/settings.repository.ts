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

// ==========================================
// Academic Year Course Management
// ==========================================

export async function closeSettingsAcademicYearCourse(
  courseId: string,
  closedAt: string,
) {
  return await supabase
    .from('courses')
    .update({
      is_closed: true,
      closed_at: closedAt,
    })
    .eq('id', courseId)
    .eq('is_closed', false)
    .select('id, is_closed, closed_at')
    .single()
}

export async function loadSettingsCourseSummaryAssignments(
  courseId: string,
) {
  return await supabase
    .from('teacher_student_assignments')
    .select('student_id')
    .eq('course_id', courseId)
}

export async function loadSettingsCourseSummaryAttendance(
  courseId: string,
) {
  return await supabase
    .from('attendance')
    .select('student_id, attendance_date, status_id')
    .eq('course_id', courseId)
}

export async function loadSettingsAttendanceStatusesByIds(
  statusIds: string[],
) {
  return await supabase
    .from('attendance_statuses')
    .select('id, name')
    .in('id', statusIds)
}

export async function loadSettingsCourseExportAssignments(
  courseId: string,
) {
  return await supabase
    .from('teacher_student_assignments')
    .select('student_id, teacher_id, subject_id')
    .eq('course_id', courseId)
}

export async function loadSettingsCourseExportStudents(
  studentIds: string[],
) {
  return await supabase
    .from('students')
    .select(
      'id, name, personal_id, gender, age, phone, whatsapp, notes, health_notes',
    )
    .in('id', studentIds)
}

export async function loadSettingsCourseAcademicYear(
  courseId: string,
) {
  return await supabase
    .from('courses')
    .select('academic_year_id')
    .eq('id', courseId)
    .single()
}

export async function loadSettingsCourseEnrollments(
  academicYearId: string,
  studentIds: string[],
) {
  return await supabase
    .from('enrollments')
    .select('student_id, level_id, class_id')
    .eq('academic_year_id', academicYearId)
    .in('student_id', studentIds)
}

export async function loadSettingsLevelsByIds(
  levelIds: string[],
) {
  return await supabase
    .from('levels')
    .select('id, name')
    .in('id', levelIds)
}

export async function loadSettingsClassesByIds(
  classIds: string[],
) {
  return await supabase
    .from('classes')
    .select('id, name')
    .in('id', classIds)
}

export async function loadSettingsTeachersByIds(
  teacherIds: string[],
) {
  return await supabase
    .from('teachers')
    .select('id, name')
    .in('id', teacherIds)
}

export async function loadSettingsSubjectsByIds(
  subjectIds: string[],
) {
  return await supabase
    .from('subjects')
    .select('id, name')
    .in('id', subjectIds)
}

export async function loadSettingsCourseExportAttendance(
  courseId: string,
) {
  return await supabase
    .from('attendance')
    .select(
      'student_id, attendance_date, status_id, note',
    )
    .eq('course_id', courseId)
}

// ==========================================
// Academic Years Management
// ==========================================

export async function loadSettingsAcademicYearTeachers() {
  return await supabase
    .from('teachers')
    .select('id, name, is_active')
    .order('name', { ascending: true })
}

export async function loadSettingsAcademicYearSubjects() {
  return await supabase
    .from('subjects')
    .select('id, name, is_active')
    .order('name', { ascending: true })
}

export async function loadSettingsAcademicYears() {
  return await supabase
    .from('academic_years')
    .select(
      'id, name, start_date, end_date, annual_fee, created_at',
    )
    .order('created_at', { ascending: false })
}

export async function loadSettingsCoursesByAcademicYearIds(
  yearIds: string[],
) {
  return await supabase
    .from('courses')
    .select(
      'id, academic_year_id, name, start_date, end_date, days, is_closed, closed_at, created_at',
    )
    .in('academic_year_id', yearIds)
    .order('created_at', { ascending: true })
}

export async function loadSettingsCourseTeachers(
  courseIds: string[],
) {
  return await supabase
    .from('course_teachers')
    .select('course_id, teacher_id')
    .in('course_id', courseIds)
}

export async function loadSettingsCourseSubjects(
  courseIds: string[],
) {
  return await supabase
    .from('course_subjects')
    .select('id, course_id, subject_id')
    .in('course_id', courseIds)
}

export async function loadSettingsCourseSubjectTeachers(
  courseSubjectIds: string[],
) {
  return await supabase
    .from('course_subject_teachers')
    .select('course_subject_id, teacher_id')
    .in('course_subject_id', courseSubjectIds)
}

// ==========================================
// Academic Year Course Relations
// ==========================================

export async function loadSettingsExistingCourseSubjects(
  courseId: string,
) {
  return await supabase
    .from('course_subjects')
    .select('id, subject_id')
    .eq('course_id', courseId)
}

export async function deleteSettingsCourseSubjectTeachers(
  courseSubjectIds: string[],
) {
  return await supabase
    .from('course_subject_teachers')
    .delete()
    .in('course_subject_id', courseSubjectIds)
}

export async function deleteSettingsCourseSubjectsByIds(
  courseSubjectIds: string[],
) {
  return await supabase
    .from('course_subjects')
    .delete()
    .in('id', courseSubjectIds)
}

export async function insertSettingsCourseSubjects(
  rows: {
    course_id: string
    subject_id: string
  }[],
) {
  return await supabase
    .from('course_subjects')
    .insert(rows)
}

export async function insertSettingsCourseSubjectTeachers(
  rows: {
    course_subject_id: string
    teacher_id: string
  }[],
) {
  return await supabase
    .from('course_subject_teachers')
    .insert(rows)
}

export async function deleteSettingsCourseTeachers(
  courseId: string,
) {
  return await supabase
    .from('course_teachers')
    .delete()
    .eq('course_id', courseId)
}

export async function insertSettingsCourseTeachers(
  rows: {
    course_id: string
    teacher_id: string
  }[],
) {
  return await supabase
    .from('course_teachers')
    .insert(rows)
}

// ==========================================
// Academic Year Save / Update / Delete
// ==========================================

export async function updateSettingsAcademicYear(
  id: string,
  data: {
    name: string
    start_date: string | null
    end_date: string | null
    annual_fee: number
  },
) {
  return await supabase
    .from('academic_years')
    .update(data)
    .eq('id', id)
    .select('id, name, start_date, end_date, annual_fee')
    .single()
}

export async function clearSettingsCurrentAcademicYear() {
  return await supabase
    .from('academic_years')
    .update({ is_current: false })
    .eq('is_current', true)
}

export async function insertSettingsAcademicYear(
  data: {
    name: string
    start_date: string | null
    end_date: string | null
    annual_fee: number
    is_current: true
    is_active: true
  },
) {
  return await supabase
    .from('academic_years')
    .insert(data)
    .select('id, name, start_date, end_date, annual_fee')
    .single()
}

export async function updateSettingsAcademicYearCourse(
  courseId: string,
  academicYearId: string,
  data: {
    name: string
    start_date: string | null
    end_date: string | null
    days: string[]
  },
) {
  return await supabase
    .from('courses')
    .update(data)
    .eq('id', courseId)
    .eq('academic_year_id', academicYearId)
    .eq('is_closed', false)
    .select(
      'id, name, start_date, end_date, days, is_closed, closed_at',
    )
    .single()
}

export async function insertSettingsAcademicYearCourse(
  academicYearId: string,
  data: {
    name: string
    start_date: string | null
    end_date: string | null
    days: string[]
  },
) {
  return await supabase
    .from('courses')
    .insert({
      academic_year_id: academicYearId,
      ...data,
    })
    .select(
      'id, name, start_date, end_date, days, is_closed, closed_at',
    )
    .single()
}

export async function deleteSettingsAcademicYear(
  id: string,
) {
  return await supabase
    .from('academic_years')
    .delete()
    .eq('id', id)
}

export async function loadSettingsSystemKeys() {
  return await supabase
    .from('system_keys')
    .select('key_name, enabled')
    .in('key_name', [
      'allow_add_to_current_year',
      'allow_add_to_archive',
    ])
}

export async function updateSettingsSystemKey(
  keyName:
    | 'allow_add_to_current_year'
    | 'allow_add_to_archive',
  value: boolean,
) {
  return await supabase
    .from('system_keys')
    .update({
      enabled: value,
      updated_at: new Date().toISOString(),
    })
    .eq('key_name', keyName)
    .select('key_name, enabled, updated_at')
}
