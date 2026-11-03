
import { supabase } from '@/lib/supabase'

// ==========================================
// Admin Lesson Reminder Template
// ==========================================

export const ADMIN_LESSON_REMINDER_TEMPLATE_NAME =
  '__ADMIN_DAILY_LESSON_REMINDER__'

export async function loadAdminLessonReminderTemplate() {
  return supabase
    .from('communication_message_templates')
    .select('id, name, content, created_at, updated_at')
    .eq('name', ADMIN_LESSON_REMINDER_TEMPLATE_NAME)
    .maybeSingle()
}

export async function saveAdminLessonReminderTemplate(
  content: string,
) {
  const { data: existing, error: loadError } =
    await loadAdminLessonReminderTemplate()

  if (loadError) {
    return { data: null, error: loadError }
  }

  if (existing) {
    return supabase
      .from('communication_message_templates')
      .update({
        content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('id, name, content, created_at, updated_at')
      .single()
  }

  return supabase
    .from('communication_message_templates')
    .insert({
      name: ADMIN_LESSON_REMINDER_TEMPLATE_NAME,
      content,
    })
    .select('id, name, content, created_at, updated_at')
    .single()
}

// ==========================================
// Admin Lesson Reminder Messages
// ==========================================

export const ADMIN_LESSON_REMINDER_MESSAGE_PREFIX =
  '__ADMIN_DAILY_LESSON_REMINDER_MESSAGE__:'

export const ADMIN_LESSON_REMINDER_GROUP_URL_NAME =
  '__ADMIN_DAILY_LESSON_REMINDER_GROUP_URL__'

export async function loadAdminLessonReminderMessages() {
  return supabase
    .from('communication_message_templates')
    .select('id, name, content, created_at, updated_at')
    .like('name', `${ADMIN_LESSON_REMINDER_MESSAGE_PREFIX}%`)
    .order('created_at', { ascending: false })
}

export async function createAdminLessonReminderMessage(input: {
  title: string
  content: string
}) {
  return supabase
    .from('communication_message_templates')
    .insert({
      name: `${ADMIN_LESSON_REMINDER_MESSAGE_PREFIX}${input.title.trim()}`,
      content: input.content.trim(),
    })
    .select('id, name, content, created_at, updated_at')
    .single()
}

export async function updateAdminLessonReminderMessage(
  id: string,
  input: {
    title: string
    content: string
  },
) {
  return supabase
    .from('communication_message_templates')
    .update({
      name: `${ADMIN_LESSON_REMINDER_MESSAGE_PREFIX}${input.title.trim()}`,
      content: input.content.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, name, content, created_at, updated_at')
    .single()
}

export async function deleteAdminLessonReminderMessage(id: string) {
  return supabase
    .from('communication_message_templates')
    .delete()
    .eq('id', id)
}

// ==========================================
// Admin Lesson Reminder WhatsApp Group
// ==========================================

export async function loadAdminLessonReminderGroupUrl() {
  return supabase
    .from('communication_message_templates')
    .select('id, content')
    .eq('name', ADMIN_LESSON_REMINDER_GROUP_URL_NAME)
    .maybeSingle()
}

export async function saveAdminLessonReminderGroupUrl(url: string) {
  const { data: existing, error } =
    await loadAdminLessonReminderGroupUrl()

  if (error) {
    return { data: null, error }
  }

  if (existing) {
    return supabase
      .from('communication_message_templates')
      .update({
        content: url.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('id, content')
      .single()
  }

  return supabase
    .from('communication_message_templates')
    .insert({
      name: ADMIN_LESSON_REMINDER_GROUP_URL_NAME,
      content: url.trim(),
    })
    .select('id, content')
    .single()
}

// ==========================================
// Create Communication Message Template
// ==========================================

export async function createCommunicationMessageTemplate(input: {
  name: string
  content: string
}) {
  return supabase
    .from('communication_message_templates')
    .insert(input)
    .select('id, name, content, created_at, updated_at')
    .single()
}

// ==========================================
// Load Current Academic Year
// ==========================================

export async function loadCurrentCommunicationAcademicYear() {
  return supabase
    .from('academic_years')
    .select('id, annual_fee')
    .eq('is_current', true)
    .eq('is_active', true)
    .maybeSingle()
}

// ==========================================
// Load Communication Data
// ==========================================

export async function loadCommunicationRecords(
  academicYearId: string,
  today: string,
) {
  const [
    studentsResult,
    teachersResult,
    coursesResult,
    assignmentsResult,
    attendanceResult,
    statusesResult,
    paymentsResult,
    templatesResult,
    attendanceAwardResult,
  ] = await Promise.all([
    supabase
      .from('students')
      .select(
        'id, name, phone, whatsapp, personal_id, academic_year_id, fee_exempt',
      )
      .eq('academic_year_id', academicYearId)
      .order('name', { ascending: true }),

    supabase
      .from('teachers')
      .select('id, name')
      .eq('is_active', true)
      .order('name', { ascending: true }),

    supabase
      .from('courses')
      .select(
        'id, name, academic_year_id, days, start_date, end_date',
      )
      .eq('academic_year_id', academicYearId)
      .order('name', { ascending: true }),

    supabase
      .from('teacher_student_assignments')
      .select('teacher_id, course_id, student_id'),

    supabase
      .from('attendance')
      .select(
        'student_id, course_id, enrollment_id, attendance_date, status_id',
      )
      .eq('attendance_date', today),

    supabase
      .from('attendance_statuses')
      .select('id, name')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),

    supabase
      .from('payments')
      .select('student_id, amount')
      .eq('academic_year_id', academicYearId),

    supabase
      .from('communication_message_templates')
      .select('id, name, content, created_at, updated_at')
      .order('created_at', { ascending: false })
      .not('name', 'eq', ADMIN_LESSON_REMINDER_TEMPLATE_NAME)
      .not(
        'name',
        'like',
        `${ADMIN_LESSON_REMINDER_MESSAGE_PREFIX}%`,
      )
      .not('name', 'eq', ADMIN_LESSON_REMINDER_GROUP_URL_NAME),

    supabase
      .from('attendance_award_results')
      .select('student_id')
      .eq('academic_year_id', academicYearId)
      .eq('status', 'eligible'),
  ])

  return {
    studentsResult,
    teachersResult,
    coursesResult,
    assignmentsResult,
    attendanceResult,
    statusesResult,
    paymentsResult,
    templatesResult,
    attendanceAwardResult,
  }
}

// ==========================================
// Communication WhatsApp Group
// ==========================================

export async function loadCommunicationGroup() {
  return supabase
    .from('communication_group')
    .select('whatsapp_url')
    .limit(1)
    .maybeSingle()
}

export async function findCommunicationGroup() {
  return supabase
    .from('communication_group')
    .select('id')
    .limit(1)
    .maybeSingle()
}

export async function updateCommunicationGroup(
  id: string,
  whatsappUrl: string | null,
  updatedAt: string,
) {
  return supabase
    .from('communication_group')
    .update({
      whatsapp_url: whatsappUrl,
      updated_at: updatedAt,
    })
    .eq('id', id)
}

export async function insertCommunicationGroup(
  whatsappUrl: string,
  updatedAt: string,
) {
  return supabase
    .from('communication_group')
    .insert({
      whatsapp_url: whatsappUrl,
      updated_at: updatedAt,
    })
}

// ==========================================
// Update / Delete Communication Message Template
// ==========================================

export async function updateCommunicationMessageTemplate(
  id: string,
  input: {
    name: string
    content: string
  },
) {
  return supabase
    .from('communication_message_templates')
    .update({
      name: input.name,
      content: input.content,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, name, content, created_at, updated_at')
    .single()
}

export async function deleteCommunicationMessageTemplate(
  id: string,
) {
  return supabase
    .from('communication_message_templates')
    .delete()
    .eq('id', id)
}

// ==========================================
// Admin Lesson Cancellation Alerts
// ==========================================

export async function loadTodayLessonCancellations(
  academicYearId: string,
  today: string,
) {
  return supabase
    .from('supervision_records')
    .select('id, course_id, type, record_date, reason, note')
    .eq('academic_year_id', academicYearId)
    .eq('record_date', today)
    .eq('type', 'day_cancelled')
    .order('created_at', { ascending: false })
}
