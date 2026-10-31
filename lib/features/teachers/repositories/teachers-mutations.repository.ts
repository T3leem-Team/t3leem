'use client'

import { supabase } from '@/lib/supabase'

export type TeacherStudentAssignmentInput = {
  course_id: string
  teacher_id: string
  student_id: string
  subject_id: string
}

export type TeacherStudentAssignmentRecord = {
  id: string
  course_id: string
  teacher_id: string
  student_id: string
  subject_id: string | null
}

/**
 * التحقق من تعيينات الطلاب الحالية في دورة محددة.
 */
export async function findTeacherStudentAssignments(
  courseId: string,
  studentIds: string[]
) {
  if (studentIds.length === 0) {
    return {
      data: [] as TeacherStudentAssignmentRecord[],
      error: null,
    }
  }

  return await supabase
    .from('teacher_student_assignments')
    .select('id, course_id, teacher_id, student_id, subject_id')
    .eq('course_id', courseId)
    .in('student_id', studentIds)
}

/**
 * إضافة تعيينات الطلاب للمعلم.
 */
export async function createTeacherStudentAssignments(
  rows: TeacherStudentAssignmentInput[]
) {
  if (rows.length === 0) {
    return {
      data: [] as TeacherStudentAssignmentRecord[],
      error: null,
    }
  }

  return await supabase
    .from('teacher_student_assignments')
    .insert(rows)
    .select('id, course_id, teacher_id, student_id, subject_id')
}

/**
 * نقل تعيين طالب إلى معلم آخر وتحديث المادة.
 */
export async function transferTeacherStudentAssignment(
  assignmentId: string,
  teacherId: string,
  subjectId: string
) {
  return await supabase
    .from('teacher_student_assignments')
    .update({
      teacher_id: teacherId,
      subject_id: subjectId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', assignmentId)
    .select('id, course_id, teacher_id, student_id, subject_id')
    .single()
}

/**
 * حذف تعيين الطالب من الدورة.
 */
export async function deleteTeacherStudentAssignment(
  assignmentId: string
) {
  return await supabase
    .from('teacher_student_assignments')
    .delete()
    .eq('id', assignmentId)
}

/**
 * حذف سجلات حضور الطالب في دورة محددة.
 */
export async function deleteStudentCourseAttendance(
  studentId: string,
  courseId: string
) {
  return await supabase
    .from('attendance')
    .delete()
    .eq('student_id', studentId)
    .eq('course_id', courseId)
}
