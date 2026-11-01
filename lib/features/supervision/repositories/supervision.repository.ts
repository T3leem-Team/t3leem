
import { supabase } from '@/lib/supabase'

import type {
  AcademicYear,
  Course,
  SupervisionRecord,
  SupervisionSettings,
  Teacher,
} from '@/app/(dashboard)/supervision/supervision-helpers'

// ==========================================
// Types
// ==========================================

type SupervisionRecordPayload = Record<string, unknown>

type SupervisionSettingsPayload = Partial<
  Pick<
    SupervisionSettings,
    'allowTeacherTransfer' | 'allowTeacherRemove'
  >
>

type TeacherRelation = {
  id: string
  name: string
}

type CourseTeacherRow = {
  teacher_id: string
  teachers: TeacherRelation | TeacherRelation[] | null
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
    .select('*')
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
    .select('*')
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
): Promise<SupervisionRecord[]> {
  const { data, error } = await supabase
    .from('supervision_records')
    .select(`
      *,
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

  return (data ?? []) as unknown as SupervisionRecord[]
}

// ==========================================
// Supervision Settings
// ==========================================

export async function loadSupervisionSettings(): Promise<SupervisionSettings> {
  const response = await fetch('/api/auth/permissions', {
    method: 'GET',
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error('Failed to load supervision settings')
  }

  const result = await response.json()

  return {
    allowTeacherTransfer:
      typeof result.allowTeacherTransfer === 'boolean'
        ? result.allowTeacherTransfer
        : true,

    allowTeacherRemove:
      typeof result.allowTeacherRemove === 'boolean'
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
      typeof result.allowTeacherTransfer === 'boolean'
        ? result.allowTeacherTransfer
        : true,

    allowTeacherRemove:
      typeof result.allowTeacherRemove === 'boolean'
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

  if (!user) return null

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
  payload: SupervisionRecordPayload,
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
  payload: SupervisionRecordPayload,
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
    throw new Error('Supervision note was not found or could not be updated')
  }
}
