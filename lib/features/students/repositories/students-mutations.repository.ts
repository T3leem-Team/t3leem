
import { supabase } from '@/lib/supabase'

/**
 * عمليات الكتابة الخاصة بالطلاب.
 * تعمل باستخدام Supabase Browser Client،
 * وبالتالي تحافظ على جلسة المستخدم الحالية وRLS.
 */

export type StudentMutationPayload = {
  name: string
  personal_id: string
  guardian_relation: string
  phone: string
  whatsapp: string
  notes: string
  health_notes: string
}

export type CreateStudentPayload = StudentMutationPayload & {
  academic_year_id: string
  status: string
  fee_exempt: boolean
  source: string
}

export type EnrollmentMutationPayload = {
  student_id: string
  academic_year_id: string
  level_id: string
  class_id: string | null
  course_id: string | null
  status: string
  join_date: string
}

export type CreatePaymentPayload = {
  student_id: string
  academic_year_id: string
  amount: number
  payment_method: string
  payment_date: string
}

/**
 * التحقق من الرقم الشخصي المكرر.
 */
export async function findDuplicateStudent(
  personalId: string
) {
  return await supabase
    .from('students')
    .select('id, name, personal_id')
    .eq('personal_id', personalId)
}

/**
 * تعديل بيانات الطالب.
 */
export async function updateStudentRecord(
  studentId: string,
  payload: StudentMutationPayload
) {
  return await supabase
    .from('students')
    .update({
      name: payload.name,
      personal_id: payload.personal_id,
      guardian_relation: payload.guardian_relation,
      phone: payload.phone,
      whatsapp: payload.whatsapp,
      notes: payload.notes,
      health_notes: payload.health_notes,
    })
    .eq('id', studentId)
    .select(
      'id, student_id, name, personal_id, guardian_relation, phone, whatsapp, notes, health_notes, status, fee_exempt, source'
    )
    .single()
}

/**
 * البحث عن تسجيل الطالب في السنة الدراسية.
 */
export async function findStudentEnrollment(
  studentId: string,
  academicYearId: string
) {
  return await supabase
    .from('enrollments')
    .select('id')
    .eq('student_id', studentId)
    .eq('academic_year_id', academicYearId)
    .maybeSingle()
}

/**
 * تعديل التسجيل الأكاديمي الموجود.
 */
export async function updateStudentEnrollment(
  enrollmentId: string,
  levelId: string
) {
  return await supabase
    .from('enrollments')
    .update({
      level_id: levelId,
      status: 'نشط',
    })
    .eq('id', enrollmentId)
}

/**
 * إنشاء تسجيل أكاديمي.
 */
export async function createStudentEnrollment(
  payload: EnrollmentMutationPayload
) {
  return await supabase
    .from('enrollments')
    .insert({
      student_id: payload.student_id,
      academic_year_id: payload.academic_year_id,
      level_id: payload.level_id,
      class_id: payload.class_id,
      course_id: payload.course_id,
      status: payload.status,
      join_date: payload.join_date,
    })
}

/**
 * إنشاء طالب جديد.
 */
export async function createStudentRecord(
  payload: CreateStudentPayload
) {
  return await supabase
    .from('students')
    .insert({
      academic_year_id: payload.academic_year_id,
      name: payload.name,
      personal_id: payload.personal_id,
      guardian_relation: payload.guardian_relation,
      phone: payload.phone,
      whatsapp: payload.whatsapp,
      notes: payload.notes,
      health_notes: payload.health_notes,
      status: payload.status,
      fee_exempt: payload.fee_exempt,
      source: payload.source,
    })
    .select(
      'id, student_id, name, personal_id, guardian_relation, phone, whatsapp, notes, health_notes, status, fee_exempt, source'
    )
    .single()
}

/**
 * تسجيل دفعة الطالب.
 */
export async function createStudentPayment(
  payload: CreatePaymentPayload
) {
  return await supabase
    .from('payments')
    .insert({
      student_id: payload.student_id,
      academic_year_id: payload.academic_year_id,
      amount: payload.amount,
      payment_method: payload.payment_method,
      payment_date: payload.payment_date,
    })
}

/**
 * التراجع عن التسجيل الأكاديمي عند فشل إنشاء الطالب.
 */
export async function deleteStudentEnrollment(
  studentId: string,
  academicYearId: string
) {
  return await supabase
    .from('enrollments')
    .delete()
    .eq('student_id', studentId)
    .eq('academic_year_id', academicYearId)
}

/**
 * التراجع عن إنشاء الطالب.
 */
export async function deleteStudentRecord(
  studentId: string
) {
  return await supabase
    .from('students')
    .delete()
    .eq('id', studentId)
}
