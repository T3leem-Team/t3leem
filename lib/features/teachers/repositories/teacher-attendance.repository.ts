'use client'

import { supabase } from '@/lib/supabase'

const ATTENDANCE_SELECT =
  'id, student_id, enrollment_id, attendance_date, status_id, note, course_id'

export type AttendanceWritePayload = {
  student_id: string
  enrollment_id: string | null
  attendance_date: string
  status_id: string
  note: string | null
  course_id: string
}

export type AttendanceUpdatePayload = {
  enrollment_id: string | null
  status_id: string
  note: string | null
}

// قراءة أيام وحصص الإلغاء للدورة
export async function loadCourseCancellationRecords(
  courseId: string,
) {
  return await supabase
    .from('supervision_records')
    .select('record_date, type, teacher_id')
    .eq('course_id', courseId)
    .in('type', [
      'day_cancelled',
      'lesson_cancelled',
    ])
}

// التحقق من إلغاء يوم محدد
export async function loadDateCancellationRecords(
  courseId: string,
  date: string,
) {
  return await supabase
    .from('supervision_records')
    .select('id, type, teacher_id')
    .eq('course_id', courseId)
    .eq('record_date', date)
    .in('type', [
      'day_cancelled',
      'lesson_cancelled',
    ])
}

// البحث عن سجل حضور طالب في تاريخ ودورة محددين
export async function findStudentAttendanceRecord(
  studentId: string,
  date: string,
  courseId: string,
) {
  return await supabase
    .from('attendance')
    .select(ATTENDANCE_SELECT)
    .eq('student_id', studentId)
    .eq('attendance_date', date)
    .eq('course_id', courseId)
    .maybeSingle()
}

// إضافة سجل حضور
export async function createAttendanceRecord(
  payload: AttendanceWritePayload,
) {
  return await supabase
    .from('attendance')
    .insert(payload)
    .select(ATTENDANCE_SELECT)
    .single()
}

// تحديث سجل حضور
export async function updateAttendanceRecord(
  recordId: string,
  payload: AttendanceUpdatePayload,
) {
  return await supabase
    .from('attendance')
    .update(payload)
    .eq('id', recordId)
    .select(ATTENDANCE_SELECT)
    .single()
}

// قراءة جميع سجلات الحضور لدورة وتاريخ
export async function loadAttendanceForCourseDate(
  courseId: string,
  date: string,
) {
  return await supabase
    .from('attendance')
    .select(ATTENDANCE_SELECT)
    .eq('course_id', courseId)
    .eq('attendance_date', date)
}

// التحقق من الطلاب المسجلين بعد الحفظ الجماعي
export async function verifyAttendanceForCourseDate(
  courseId: string,
  date: string,
) {
  return await supabase
    .from('attendance')
    .select('student_id, status_id')
    .eq('course_id', courseId)
    .eq('attendance_date', date)
}

// حذف سجل حضور
export async function deleteAttendanceRecord(
  recordId: string,
) {
  return await supabase
    .from('attendance')
    .delete()
    .eq('id', recordId)
}

// تحديث ملاحظة الحضور
export async function updateAttendanceNote(
  recordId: string,
  note: string | null,
) {
  return await supabase
    .from('attendance')
    .update({ note })
    .eq('id', recordId)
    .select(ATTENDANCE_SELECT)
    .single()
}



export async function loadAttendanceForCourseDateRange(
  courseId: string,
  startDate: string,
  endDate: string,
  studentIds: string[],
) {
  if (
    !courseId ||
    !startDate ||
    !endDate ||
    studentIds.length === 0
  ) {
    return []
  }

  const rows: {
    id: string
    student_id: string
    enrollment_id: string | null
    attendance_date: string
    status_id: string
    note: string | null
    course_id: string
  }[] = []

  const pageSize = 1000
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('attendance')
      .select(ATTENDANCE_SELECT)
      .eq('course_id', courseId)
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate)
      .in('student_id', studentIds)
      .order('attendance_date', {
        ascending: true,
      })
      .order('id', {
        ascending: true,
      })
      .range(from, from + pageSize - 1)

    if (error) {
      throw new Error(
        `خطأ في تحميل سجلات الحضور: ${error.message}`,
      )
    }

    const batch = data ?? []

    rows.push(...batch)

    if (batch.length < pageSize) {
      break
    }

    from += pageSize
  }

  return rows
}

