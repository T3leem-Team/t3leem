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

// استيراد طلبات التسجيل من ملف Excel
export async function insertEnrollmentImportRequests(
  payload: any[],
) {
  return supabase
    .from('registration_requests')
    .insert(payload)
    .select('id')
}

// =====================================================
// Public Registration Page
// =====================================================

export async function loadPublicRegistrationSettings() {
  return supabase
    .from('registration_settings')
    .select('*')
    .limit(1)
    .maybeSingle()
}

export async function loadPublicRegistrationAcademicYear() {
  return supabase
    .from('academic_years')
    .select('id, name')
    .eq('is_current', true)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()
}

export async function loadPublicRegistrationCourse(
  courseId: string,
  academicYearId: string,
) {
  return supabase
    .from('courses')
    .select(
      'id, name, academic_year_id, start_date, end_date, is_closed',
    )
    .eq('id', courseId)
    .eq('academic_year_id', academicYearId)
    .maybeSingle()
}

export async function loadPublicRegistrationLevels() {
  return supabase
    .from('levels')
    .select('id, name, sort_order')
    .eq('is_active', true)
    .eq('registration_enabled', true)
    .order('sort_order', {
      ascending: true,
    })
}

export async function loadPublicRegistrationCustomFields() {
  return supabase
    .from('custom_fields')
    .select(
      'id, name, field_type, sort_order, is_active',
    )
    .eq('available_in_registration', true)
    .eq('is_active', true)
    .order('sort_order', {
      ascending: true,
    })
}

export async function loadPublicRegistrationCustomFieldVisibility(
  customFieldIds: string[],
) {
  return supabase
    .from('custom_field_visibility')
    .select(
      'custom_field_id, section, is_visible, is_required, sort_order',
    )
    .eq('section', 'registration')
    .in('custom_field_id', customFieldIds)
}

export async function loadPublicRegistrationCustomFieldOptions(
  customFieldIds: string[],
) {
  return supabase
    .from('custom_field_options')
    .select(
      'id, custom_field_id, label, value, sort_order',
    )
    .in('custom_field_id', customFieldIds)
    .order('sort_order', {
      ascending: true,
    })
}

export async function savePublicRegistrationCustomFieldValues(
  requestId: string,
  trackingToken: string,
  fields: {
    custom_field_id: string
    value: string | null
  }[],
) {
  return supabase.rpc(
    'save_registration_custom_fields',
    {
      p_request_id: requestId,
      p_tracking_token: trackingToken,
      p_fields: fields,
    },
  )
}

export async function checkPublicRegistrationPersonalId(
  personalId: string,
) {
  return supabase.rpc(
    'check_registration_personal_id',
    {
      p_personal_id: personalId,
    },
  )
}

export async function createPublicRegistrationRequest(
  input: {
    p_request_number: string
    p_tracking_token: string
    p_name: string
    p_personal_id: string | null
    p_gender: string | null
    p_age: number | null
    p_phone: string | null
    p_guardian_relation: string | null
    p_whatsapp: string | null
    p_student_phone: string | null
    p_level_id: string | null
    p_notes: string | null
    p_health_notes: string | null
    p_payment_method: string | null
    p_payment_amount: number | null
    p_payment_reference: string | null
    p_payment_status: string
  },
) {
  return supabase.rpc(
    'create_registration_request',
    input,
  )
}

export async function setPublicRegistrationPaymentProof(
  requestId: string,
  paymentProofUrl: string,
) {
  return supabase.rpc(
    'set_registration_payment_proof',
    {
      p_request_id: requestId,
      p_payment_proof_url: paymentProofUrl,
    },
  )
}
