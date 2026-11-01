
import { supabase } from '@/lib/supabase'
import type { PostgrestError } from '@supabase/supabase-js'

export type AcademicYearRow = {
  id: string
  name: string
  annual_fee: number | string | null
  start_date: string | null
  end_date: string | null
}

export type CourseRow = {
  id: string
  name: string
  start_date: string | null
  end_date: string | null
  days: unknown
  created_at: string | null
  academic_year_id: string | null
}

export type EnrollmentRow = {
  id: string
  student_id: string
  academic_year_id: string
  level_id: string | null
  status: string
}

export type AssignmentRow = {
  id: string
  course_id: string
  teacher_id: string
  student_id: string
}

export type CourseTeacherRow = {
  id: string
  course_id: string
  teacher_id: string
}

export type StudentRow = {
  id: string
  student_id: string | null
  name: string
  personal_id: string | null
  phone: string | null
  whatsapp: string | null
  status: string | null
}

export type TeacherRow = {
  id: string
  name: string
}

export type AttendanceStatusRow = {
  id: string
  name: string
}

export type AttendanceRow = {
  id: string
  student_id: string
  enrollment_id: string | null
  attendance_date: string
  status_id: string
  note: string | null
  course_id: string
}

export type PendingRegistrationRow = {
  id: string
  status: string
}

type RepositoryResult<T> = {
  data: T | null
  error: PostgrestError | null
}

const EMPTY_RESULT_ERROR = null

export async function loadCurrentAcademicYear(): Promise<
  RepositoryResult<AcademicYearRow>
> {
  const { data, error } = await supabase
    .from('academic_years')
    .select(`
      id,
      name,
      annual_fee,
      start_date,
      end_date
    `)
    .eq('is_current', true)
    .eq('is_active', true)
    .maybeSingle()

  return {
    data: data as AcademicYearRow | null,
    error,
  }
}

export async function loadCourses(): Promise<
  RepositoryResult<CourseRow[]>
> {
  const { data, error } = await supabase
    .from('courses')
    .select(`
      id,
      name,
      start_date,
      end_date,
      days,
      created_at,
      academic_year_id
    `)
    .order('created_at', {
      ascending: true,
    })

  return {
    data: data as CourseRow[] | null,
    error,
  }
}

export async function loadActiveEnrollments(): Promise<
  RepositoryResult<EnrollmentRow[]>
> {
  const { data, error } = await supabase
    .from('enrollments')
    .select(`
      id,
      student_id,
      academic_year_id,
      level_id,
      status
    `)
    .eq('status', 'نشط')

  return {
    data: data as EnrollmentRow[] | null,
    error,
  }
}

export async function loadAssignments(
  courseIds: string[],
): Promise<RepositoryResult<AssignmentRow[]>> {
  if (courseIds.length === 0) {
    return {
      data: [],
      error: EMPTY_RESULT_ERROR,
    }
  }

  const { data, error } = await supabase
    .from('teacher_student_assignments')
    .select(`
      id,
      course_id,
      teacher_id,
      student_id
    `)
    .in('course_id', courseIds)

  return {
    data: data as AssignmentRow[] | null,
    error,
  }
}

export async function loadCourseTeachers(
  courseIds: string[],
): Promise<RepositoryResult<CourseTeacherRow[]>> {
  if (courseIds.length === 0) {
    return {
      data: [],
      error: EMPTY_RESULT_ERROR,
    }
  }

  const { data, error } = await supabase
    .from('course_teachers')
    .select(`
      id,
      course_id,
      teacher_id
    `)
    .in('course_id', courseIds)

  return {
    data: data as CourseTeacherRow[] | null,
    error,
  }
}

export async function loadStudents(
  studentIds: string[],
): Promise<RepositoryResult<StudentRow[]>> {
  if (studentIds.length === 0) {
    return {
      data: [],
      error: EMPTY_RESULT_ERROR,
    }
  }

  const { data, error } = await supabase
    .from('students')
    .select(`
      id,
      student_id,
      name,
      personal_id,
      phone,
      whatsapp,
      status
    `)
    .in('id', studentIds)

  return {
    data: data as StudentRow[] | null,
    error,
  }
}

export async function loadPendingRegistrations(): Promise<
  RepositoryResult<PendingRegistrationRow[]>
> {
  const { data, error } = await supabase
    .from('registration_requests')
    .select('id, status')
    .eq('status', 'pending')

  return {
    data: data as PendingRegistrationRow[] | null,
    error,
  }
}

export async function loadAttendanceStatuses(): Promise<
  RepositoryResult<AttendanceStatusRow[]>
> {
  const { data, error } = await supabase
    .from('attendance_statuses')
    .select('id, name')
    .eq('is_active', true)
    .order('sort_order', {
      ascending: true,
    })

  return {
    data: data as AttendanceStatusRow[] | null,
    error,
  }
}

export async function loadTeachers(
  teacherIds: string[],
): Promise<RepositoryResult<TeacherRow[]>> {
  if (teacherIds.length === 0) {
    return {
      data: [],
      error: EMPTY_RESULT_ERROR,
    }
  }

  const { data, error } = await supabase
    .from('teachers')
    .select('id, name')
    .in('id', teacherIds)

  return {
    data: data as TeacherRow[] | null,
    error,
  }
}

export async function loadAttendancePage(
  courseIds: string[],
  from: number,
  to: number,
): Promise<RepositoryResult<AttendanceRow[]>> {
  const { data, error } = await supabase
    .from('attendance')
    .select(`
      id,
      student_id,
      enrollment_id,
      attendance_date,
      status_id,
      note,
      course_id
    `)
    .in('course_id', courseIds)
    .order('attendance_date', {
      ascending: false,
    })
    .order('created_at', {
      ascending: false,
    })
    .order('id', {
      ascending: false,
    })
    .range(from, to)

  return {
    data: data as AttendanceRow[] | null,
    error,
  }
}


export async function loadAttendanceExportEnrollments(
  academicYearId: string,
  studentIds: string[],
) {
  if (studentIds.length === 0) {
    return {
      data: [],
      error: EMPTY_RESULT_ERROR,
    }
  }

  const { data, error } = await supabase
    .from('enrollments')
    .select(`
      id,
      student_id,
      academic_year_id,
      level_id,
      status,
      join_date
    `)
    .eq('academic_year_id', academicYearId)
    .in('student_id', studentIds)
    .order('join_date', {
      ascending: true,
    })

  return {
    data,
    error,
  }
}

export async function loadAttendanceExportAssignments(
  assignmentIds: string[],
  courseId: string,
) {
  if (assignmentIds.length === 0) {
    return {
      data: [],
      error: EMPTY_RESULT_ERROR,
    }
  }

  const { data, error } = await supabase
    .from('teacher_student_assignments')
    .select(`
      id,
      student_id,
      course_id,
      created_at
    `)
    .in('id', assignmentIds)
    .eq('course_id', courseId)

  return {
    data,
    error,
  }
}

export async function loadAttendanceExportAttendancePage(
  courseId: string,
  studentIds: string[],
  fromDate: string,
  toDate: string,
  from: number,
  to: number,
) {
  if (studentIds.length === 0) {
    return {
      data: [],
      error: EMPTY_RESULT_ERROR,
    }
  }

  const { data, error } = await supabase
    .from('attendance')
    .select(`
      id,
      student_id,
      enrollment_id,
      attendance_date,
      status_id,
      note,
      course_id
    `)
    .eq('course_id', courseId)
    .in('student_id', studentIds)
    .gte('attendance_date', fromDate)
    .lte('attendance_date', toDate)
    .range(from, to)
    .order('attendance_date', {
      ascending: true,
    })

  return {
    data,
    error,
  }
}
