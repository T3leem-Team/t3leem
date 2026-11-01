
import { supabase } from '@/lib/supabase'

import type {
  AcademicYear,
  Course,
  SupervisionSettings,
  Teacher,
  SupervisionType,
} from '@/app/(dashboard)/supervision/supervision-helpers'

// ==========================================
// Types
// ==========================================

type SupervisionSettingsPayload = Partial<
  Pick<
    SupervisionSettings,
    'allowTeacherTransfer' | 'allowTeacherRemove'
  >
>

type SupervisionRecordInsertPayload = {
  academic_year_id: string
  course_id: string
  teacher_id: string | null
  type: SupervisionType
  record_date: string
  reason: string
  note: string | null
  created_by: string | null
}

type SupervisionRecordUpdatePayload = {
  teacher_id: string | null
  record_date: string
  reason: string
  note: string | null
}

type TeacherRelation = {
  id: string
  name: string
}

type CourseTeacherRow = {
  teacher_id: string
  teachers: TeacherRelation | TeacherRelation[] | null
}

type SupervisionRecordRelation = {
  name: string
}

type CreatedByRelation = {
  full_name: string
}

export type SupervisionRecordRow = {
  id: string
  teacher_id: string | null
  type: SupervisionType
  record_date: string
  reason: string | null
  note: string | null
  created_at: string
  course:
    | SupervisionRecordRelation
    | SupervisionRecordRelation[]
    | null
  teacher:
    | SupervisionRecordRelation
    | SupervisionRecordRelation[]
    | null
  created_by_profile:
    | CreatedByRelation
    | CreatedByRelation[]
    | null
}

// ==========================================
// Helpers
// ==========================================

function throwIfError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message)
  }
}

// ==========================================
// Academic Year
// ==========================================

export async function loadAcademicYear(): Promise<AcademicYear | null> {
  const { data, error } = await supabase
    .from('academic_years')
    .select('id, name, start_date, end_date')
    .eq('is_current', true)
    .eq('is_active', true)
    .maybeSingle()

  throwIfError(error)

  return data as AcademicYear | null
}

// ==========================================
// Courses
// ==========================================

export async function loadCourses(
  academicYearId: string,
): Promise<Course[]> {
  const { data, error } = await supabase
    .from('courses')
    .select(
      'id, academic_year_id, name, start_date, end_date, days',
    )
    .eq('academic_year_id', academicYearId)
    .order('start_date', {
      ascending: true,
      nullsFirst: false,
    })
    .order('name', {
      ascending: true,
    })

  throwIfError(error)

  return (data ?? []) as Course[]
}

// ==========================================
// Teachers
// ==========================================

export async function loadTeachers(
  courseId: string,
): Promise<Teacher[]> {
  const { data, error } = await supabase
    .from('course_teachers')
    .select(`
      teacher_id,
      teachers (
        id,
        name
      )
    `)
    .eq('course_id', courseId)

  throwIfError(error)

  const rows = (data ?? []) as unknown as CourseTeacherRow[]

  const teachers = rows
    .flatMap((row) => {
      if (!row.teachers) return []

      return Array.isArray(row.teachers)
        ? row.teachers
        : [row.teachers]
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'))

  return teachers as Teacher[]
}

// ==========================================
// Supervision Records
// ==========================================

export async function loadRecords(
  courseId: string,
): Promise<SupervisionRecordRow[]> {
  const { data, error } = await supabase
    .from('supervision_records')
    .select(`
      id,
      teacher_id,
      type,
      record_date,
      reason,
      note,
      created_at,
      course:courses (
        name
      ),
      teacher:teachers (
        name
      ),
      created_by_profile:user_profiles (
        full_name
      )
    `)
    .eq('course_id', courseId)
    .order('record_date', {
      ascending: false,
    })
    .order('created_at', {
      ascending: false,
    })

  throwIfError(error)

  return (data ?? []) as unknown as SupervisionRecordRow[]
}

// ==========================================
// Supervision Settings
// ==========================================

export async function loadSupervisionSettings(): Promise<SupervisionSettings> {
  const response = await fetch('/api/auth/permissions', {
    method: 'GET',
    cache: 'no-store',
  })

  const result = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(
      result?.error || 'Failed to load supervision settings',
    )
  }

  return {
    allowTeacherTransfer:
      typeof result?.allowTeacherTransfer === 'boolean'
        ? result.allowTeacherTransfer
        : true,

    allowTeacherRemove:
      typeof result?.allowTeacherRemove === 'boolean'
        ? result.allowTeacherRemove
        : true,
  }
}

export async function updateSupervisionSettings(
  payload: SupervisionSettingsPayload,
): Promise<SupervisionSettings> {
  const response = await fetch('/api/auth/permissions', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const result = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(
      result?.error || 'Failed to update supervision settings',
    )
  }

  return {
    allowTeacherTransfer:
      typeof result?.allowTeacherTransfer === 'boolean'
        ? result.allowTeacherTransfer
        : true,

    allowTeacherRemove:
      typeof result?.allowTeacherRemove === 'boolean'
        ? result.allowTeacherRemove
        : true,
  }
}

// ==========================================
// Current User Profile
// ==========================================

export async function getCurrentUserProfile(): Promise<string | null> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  throwIfError(authError)

  if (!user) {
    return null
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  throwIfError(error)

  return data?.id ?? null
}

// ==========================================
// Attendance
// ==========================================

export async function deleteDayAttendance(
  courseId: string,
  date: string,
): Promise<void> {
  const { error } = await supabase
    .from('attendance')
    .delete()
    .eq('course_id', courseId)
    .eq('attendance_date', date)

  throwIfError(error)
}

// ==========================================
// Create Supervision Record
// ==========================================

export async function createSupervisionRecord(
  payload: SupervisionRecordInsertPayload,
): Promise<void> {
  const { error } = await supabase
    .from('supervision_records')
    .insert(payload)

  throwIfError(error)
}

// ==========================================
// Update Supervision Note
// ==========================================

export async function updateSupervisionNote(
  id: string,
  courseId: string,
  payload: SupervisionRecordUpdatePayload,
): Promise<void> {
  const { data, error } = await supabase
    .from('supervision_records')
    .update(payload)
    .eq('id', id)
    .eq('course_id', courseId)
    .eq('type', 'note')
    .select('id')

  throwIfError(error)

  if (!data || data.length === 0) {
    throw new Error(
      'Supervision note was not found or could not be updated',
    )
  }
}
