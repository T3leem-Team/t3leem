import { supabase } from '@/lib/supabase'

// تحميل إعدادات التسجيل
export async function loadPublicRegistrationSettings() {
  return supabase
    .from('registration_settings')
    .select('*')
    .limit(1)
    .maybeSingle()
}

// تحميل السنة الدراسية الحالية
export async function loadPublicRegistrationAcademicYear() {
  return supabase
    .from('academic_years')
    .select('id, name')
    .eq('is_current', true)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()
}

// تحميل دورة التسجيل
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

// تحميل المستويات المتاحة للتسجيل
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

// تحميل الحقول الإضافية
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

// تحميل إعدادات ظهور الحقول
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

// تحميل خيارات الحقول
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

// حفظ قيم الحقول الإضافية
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

// التحقق من الرقم الشخصي
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

// إنشاء طلب التسجيل
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

// حفظ رابط إثبات الدفع
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
