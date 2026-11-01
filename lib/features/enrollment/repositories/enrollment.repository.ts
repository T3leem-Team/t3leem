
import { supabase } from '@/lib/supabase'

const CURRENT_YEAR_KEY = 'allow_add_to_current_year'
const ARCHIVE_KEY = 'allow_add_to_archive'

export async function loadEnrollmentImportPermissions() {
  return supabase
    .from('system_keys')
    .select('key_name, enabled')
    .in('key_name', [
      CURRENT_YEAR_KEY,
      ARCHIVE_KEY,
    ])
}

export async function loadEnrollmentCustomFields() {
  return supabase
    .from('custom_fields')
    .select(`
      id,
      name,
      field_type,
      available_in_registration,
      available_in_students,
      available_in_payments,
      sort_order,
      is_active
    `)
    .eq('available_in_registration', true)
    .eq('is_active', true)
    .order('sort_order', {
      ascending: true,
    })
    .order('created_at', {
      ascending: true,
    })
}

export async function loadEnrollmentLevels() {
  return supabase
    .from('levels')
    .select('id, name')
    .order('name', {
      ascending: true,
    })
}

export async function loadEnrollmentCourses() {
  return supabase
    .from('courses')
    .select('id, name')
    .order('name', {
      ascending: true,
    })
}

export async function loadCurrentEnrollmentAcademicYear() {
  return supabase
    .from('academic_years')
    .select('id, name')
    .eq('is_current', true)
    .eq('is_active', true)
    .maybeSingle()
}

export async function loadCurrentEnrollmentAcademicYearId() {
  return supabase
    .from('academic_years')
    .select('id')
    .eq('is_current', true)
    .eq('is_active', true)
    .maybeSingle()
}

export async function loadEnrollmentRequests(
  academicYearId: string,
) {
  return supabase
    .from('registration_requests')
    .select(`
      id,
      request_number,
      tracking_token,
      name,
      personal_id,
      gender,
      age,
      phone,
      whatsapp,
      guardian_relation,
      student_phone,
      course_id,
      level_id,
      class_id,
      notes,
      health_notes,
      status,
      processing_mode,
      student_id,
      rejection_reason,
      payment_method,
      payment_amount,
      payment_reference,
      payment_proof_url,
      payment_status,
      verified_payment_amount,
      payment_rejection_reason,
      created_at,
      source,
      academic_year_id
    `)
    .eq('academic_year_id', academicYearId)
    .order('created_at', {
      ascending: false,
    })
}

export async function loadEnrollmentCustomFieldValues(
  requestIds: string[],
) {
  return supabase
    .from('custom_field_values')
    .select(`
      custom_field_id,
      record_type,
      record_id,
      value
    `)
    .eq('record_type', 'registration_request')
    .in('record_id', requestIds)
}

export async function approveEnrollmentRequest(
  requestId: string,
) {
  return supabase.rpc(
    'approve_registration_request',
    {
      p_request_id: requestId,
    },
  )
}

export async function updateEnrollmentStudentSource(
  studentId: string,
) {
  return supabase
    .from('students')
    .update({
      source: 'registration',
    })
    .eq('id', studentId)
}

export async function deleteApprovedEnrollmentRequest(
  requestId: string,
) {
  return supabase
    .from('registration_requests')
    .delete()
    .eq('id', requestId)
    .select('id')
}

export async function rejectEnrollmentRequest(
  requestId: string,
  updatedAt: string,
) {
  return supabase
    .from('registration_requests')
    .update({
      status: 'rejected',
      updated_at: updatedAt,
    })
    .eq('id', requestId)
}

export async function loadCurrentYearEnrollmentRequestIds(
  academicYearId: string,
) {
  return supabase
    .from('registration_requests')
    .select('id')
    .eq('academic_year_id', academicYearId)
}

export async function deleteEnrollmentCustomFieldValues(
  requestIds: string[],
) {
  return supabase
    .from('custom_field_values')
    .delete()
    .eq('record_type', 'registration_request')
    .in('record_id', requestIds)
}

export async function deleteCurrentYearEnrollmentRequests(
  academicYearId: string,
) {
  return supabase
    .from('registration_requests')
    .delete()
    .eq('academic_year_id', academicYearId)
}
