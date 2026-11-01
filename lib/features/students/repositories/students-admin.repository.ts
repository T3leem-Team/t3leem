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

export type StudentDateChangeLog = {
  student_id: string
  entity_type: 'enrollment' | 'teacher_assignment'
  entity_id: string
  date_field: 'join_date' | 'created_at'
  old_date: string
  new_date: string
}

/*
 * بيانات الطالب
 */
export async function loadAdminStudent(studentId: string) {
  return await supabaseAdmin
    .from('students')
    .select('id, student_id, name, personal_id')
    .eq('id', studentId)
    .maybeSingle()
}

/*
 * البحث عن الطلاب بالاسم أو الرقم الشخصي أو رقم الطالب
 */
export async function searchAdminStudents(search: string) {
  const [byName, byPersonalId, byStudentId] =
    await Promise.all([
      supabaseAdmin
        .from('students')
        .select('id, student_id, name, personal_id')
        .ilike('name', `%${search}%`)
        .limit(20),

      supabaseAdmin
        .from('students')
        .select('id, student_id, name, personal_id')
        .ilike('personal_id', `%${search}%`)
        .limit(20),

      supabaseAdmin
        .from('students')
        .select('id, student_id, name, personal_id')
        .ilike('student_id', `%${search}%`)
        .limit(20),
    ])

  return {
    byName,
    byPersonalId,
    byStudentId,
  }
}

/*
 * تسجيلات الطالب
 */
export async function loadAdminStudentEnrollments(
  studentId: string,
) {
  return await supabaseAdmin
    .from('enrollments')
    .select(
      'id, join_date, course_id, academic_year_id, level_id, status',
    )
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
}

/*
 * تعيينات الطالب عند المعلمين
 */
export async function loadAdminStudentAssignments(
  studentId: string,
) {
  return await supabaseAdmin
    .from('teacher_student_assignments')
    .select(
      'id, created_at, course_id, teacher_id, subject_id',
    )
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
}

/*
 * إعداد حذف الطلاب
 */
export async function loadStudentDeletionSetting() {
  return await supabaseAdmin
    .from('student_deletion_settings')
    .select('deletion_enabled, updated_at')
    .eq('id', 1)
    .maybeSingle()
}

export async function updateStudentDeletionSetting(
  deletionEnabled: boolean,
  updatedAt: string,
) {
  return await supabaseAdmin
    .from('student_deletion_settings')
    .update({
      deletion_enabled: deletionEnabled,
      updated_at: updatedAt,
    })
    .eq('id', 1)
    .select('deletion_enabled, updated_at')
    .maybeSingle()
}

/*
 * بيانات الدورة للتحقق من التواريخ
 */
export async function loadCourseForDateValidation(
  courseId: string,
) {
  return await supabaseAdmin
    .from('courses')
    .select('id, start_date, end_date, academic_year_id')
    .eq('id', courseId)
    .maybeSingle()
}

/*
 * بيانات السنة الدراسية للتحقق من التواريخ
 */
export async function loadAcademicYearForDateValidation(
  academicYearId: string,
) {
  return await supabaseAdmin
    .from('academic_years')
    .select('id, start_date, end_date')
    .eq('id', academicYearId)
    .maybeSingle()
}

/*
 * قراءة التسجيل للتحقق من تاريخ الانضمام
 */
export async function loadEnrollmentForDateValidation(
  enrollmentId: string,
) {
  return await supabaseAdmin
    .from('enrollments')
    .select(
      'id, student_id, course_id, academic_year_id, join_date',
    )
    .eq('id', enrollmentId)
    .maybeSingle()
}

/*
 * تواريخ تعيينات الطالب عند المعلمين
 */
export async function loadStudentAssignmentDates(
  studentId: string,
  courseId: string,
) {
  return await supabaseAdmin
    .from('teacher_student_assignments')
    .select('created_at')
    .eq('student_id', studentId)
    .eq('course_id', courseId)
    .not('created_at', 'is', null)
}

/*
 * تعديل تاريخ انضمام الطالب للدورة
 */
export async function updateEnrollmentJoinDate(
  enrollmentId: string,
  joinDate: string,
) {
  return await supabaseAdmin
    .from('enrollments')
    .update({ join_date: joinDate })
    .eq('id', enrollmentId)
    .select('id, student_id, course_id, join_date')
    .maybeSingle()
}

/*
 * استرجاع تاريخ انضمام الطالب عند فشل تسجيل التدقيق
 */
export async function rollbackEnrollmentJoinDate(
  enrollmentId: string,
  oldDate: string,
) {
  return await supabaseAdmin
    .from('enrollments')
    .update({ join_date: oldDate })
    .eq('id', enrollmentId)
}

/*
 * قراءة سجل تعيين الطالب قبل تعديل التاريخ
 */
export async function loadAssignmentForDateUpdate(
  assignmentId: string,
) {
  return await supabaseAdmin
    .from('teacher_student_assignments')
    .select('id, student_id, course_id, created_at')
    .eq('id', assignmentId)
    .maybeSingle()
}

/*
 * تسجيلات الطالب المرتبطة بالدورة للتحقق من التاريخ
 */
export async function loadStudentEnrollmentsForAssignmentDate(
  studentId: string,
  courseId: string,
) {
  return await supabaseAdmin
    .from('enrollments')
    .select('id, join_date')
    .eq('student_id', studentId)
    .eq('course_id', courseId)
}

/*
 * تعديل تاريخ إنشاء التعيين
 */
export async function updateAssignmentCreatedAt(
  assignmentId: string,
  createdAt: string,
) {
  return await supabaseAdmin
    .from('teacher_student_assignments')
    .update({ created_at: createdAt })
    .eq('id', assignmentId)
    .select('id, student_id, course_id, created_at')
    .maybeSingle()
}

/*
 * استرجاع timestamp الأصلي للتعيين عند فشل تسجيل التدقيق
 */
export async function rollbackAssignmentCreatedAt(
  assignmentId: string,
  previousCreatedAt: string,
) {
  return await supabaseAdmin
    .from('teacher_student_assignments')
    .update({ created_at: previousCreatedAt })
    .eq('id', assignmentId)
}

/*
 * تسجيل تعديلات تواريخ الطلاب
 */
export async function insertStudentDateChangeLog(
  log: StudentDateChangeLog,
) {
  return await supabaseAdmin
    .from('student_date_change_logs')
    .insert(log)
}

/*
 * معالجة سجلات غير منضم
 */
export async function processUnjoinedAttendance(
  enrollmentId: string,
) {
  return await supabaseAdmin.rpc(
    'create_unjoined_attendance_for_enrollment',
    {
      p_enrollment_id: enrollmentId,
    },
  )
}

/*
 * حذف الطالب بالكامل
 */
export async function deleteStudentCompletely(
  studentId: string,
) {
  return await supabaseAdmin.rpc(
    'delete_student_completely',
    {
      p_student_id: studentId,
    },
  )
}
