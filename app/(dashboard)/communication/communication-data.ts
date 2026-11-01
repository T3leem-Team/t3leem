
import {
  loadCurrentCommunicationAcademicYear,
  loadCommunicationRecords,
} from '@/lib/features/communication/repositories/communication-mutations.repository'

export type Student = {
  id: string
  name: string
  phone: string
  whatsapp: string
  personalId: string
  academicYearId: string
  enrollmentId: string | null
  feeExempt: boolean
}

export type Teacher = {
  id: string
  name: string
}

export type Course = {
  id: string
  name: string
  academicYearId: string
}

export type TeacherAssignment = {
  teacherId: string
  courseId: string
  studentId: string
}

export type AttendanceRecord = {
  studentId: string
  courseId: string | null
  enrollmentId: string | null
  attendanceDate: string
  statusId: string
}

export type AttendanceStatus = {
  id: string
  name: string
}

export type Payment = {
  studentId: string
  amount: number
}

export type AcademicYear = {
  id: string
  annualFee: number
}

export type MessageTemplate = {
  id: string
  name: string
  content: string
  createdAt: string
  updatedAt: string
}

export type CommunicationCache = {
  academicYear: AcademicYear | null
  students: Student[]
  teachers: Teacher[]
  courses: Course[]
  assignments: TeacherAssignment[]
  attendance: AttendanceRecord[]
  attendanceStatuses: AttendanceStatus[]
  payments: Payment[]
  messageTemplates: MessageTemplate[]
  attendanceAwardEligibleStudentIds: string[]
}

let communicationCache: CommunicationCache | null = null
let communicationCacheLoading = false

export function getCommunicationCache() {
  return communicationCache
}

export function setCommunicationCache(
  cache: CommunicationCache | null,
) {
  communicationCache = cache
}

export function isCommunicationCacheLoading() {
  return communicationCacheLoading
}

export function setCommunicationCacheLoading(
  loading: boolean,
) {
  communicationCacheLoading = loading
}

export const TODAY = new Date().toISOString().split('T')[0]

function emptyCommunicationCache(): CommunicationCache {
  return {
    academicYear: null,
    students: [],
    teachers: [],
    courses: [],
    assignments: [],
    attendance: [],
    attendanceStatuses: [],
    payments: [],
    messageTemplates: [],
    attendanceAwardEligibleStudentIds: [],
  }
}

export async function loadCommunicationData(): Promise<CommunicationCache> {
  const { data: yearData, error: yearError } =
    await loadCurrentCommunicationAcademicYear()

  if (yearError) {
    throw yearError
  }

  if (!yearData) {
    return emptyCommunicationCache()
  }

  const currentAcademicYear: AcademicYear = {
    id: yearData.id,
    annualFee: Number(yearData.annual_fee) || 0,
  }

  const {
    studentsResult,
    teachersResult,
    coursesResult,
    assignmentsResult,
    attendanceResult,
    statusesResult,
    paymentsResult,
    templatesResult,
    attendanceAwardResult,
  } = await loadCommunicationRecords(yearData.id, TODAY)

  if (templatesResult.error) {
    console.error(
      'Message templates load error:',
      templatesResult.error,
    )
  }

  if (attendanceAwardResult.error) {
    console.error(
      'Attendance award results load error:',
      attendanceAwardResult.error,
    )
  }

  const currentCourseIds = new Set(
    (coursesResult.data ?? []).map((course) => course.id),
  )

  const students: Student[] = (studentsResult.data ?? []).map(
    (student) => ({
      id: student.id,
      name: student.name ?? '',
      phone: student.phone ?? '',
      whatsapp: student.whatsapp ?? '',
      personalId: student.personal_id ?? '',
      academicYearId: student.academic_year_id,
      enrollmentId: null,
      feeExempt: Boolean(student.fee_exempt),
    }),
  )

  const teachers: Teacher[] = (teachersResult.data ?? []).map(
    (teacher) => ({
      id: teacher.id,
      name: teacher.name ?? '',
    }),
  )

  const courses: Course[] = (coursesResult.data ?? []).map(
    (course) => ({
      id: course.id,
      name: course.name ?? '',
      academicYearId: course.academic_year_id,
    }),
  )

  const assignments: TeacherAssignment[] = (
    assignmentsResult.data ?? []
  )
    .filter((item) => currentCourseIds.has(item.course_id))
    .map((item) => ({
      teacherId: item.teacher_id,
      courseId: item.course_id,
      studentId: item.student_id,
    }))

  const attendance: AttendanceRecord[] = (
    attendanceResult.data ?? []
  ).map((item) => ({
    studentId: item.student_id,
    courseId: item.course_id,
    enrollmentId: item.enrollment_id,
    attendanceDate: item.attendance_date,
    statusId: item.status_id,
  }))

  const attendanceStatuses: AttendanceStatus[] = (
    statusesResult.data ?? []
  ).map((status) => ({
    id: status.id,
    name: status.name ?? '',
  }))

  const payments: Payment[] = (paymentsResult.data ?? []).map(
    (payment) => ({
      studentId: payment.student_id,
      amount: Number(payment.amount) || 0,
    }),
  )

  const messageTemplates: MessageTemplate[] = (
    templatesResult.data ?? []
  ).map((template) => ({
    id: template.id,
    name: template.name ?? '',
    content: template.content ?? '',
    createdAt: template.created_at ?? '',
    updatedAt: template.updated_at ?? '',
  }))

  const attendanceAwardEligibleStudentIds = Array.from(
    new Set(
      (attendanceAwardResult.data ?? [])
        .map((item) => item.student_id)
        .filter((id): id is string => Boolean(id)),
    ),
  )

  return {
    academicYear: currentAcademicYear,
    students,
    teachers,
    courses,
    assignments,
    attendance,
    attendanceStatuses,
    payments,
    messageTemplates,
    attendanceAwardEligibleStudentIds,
  }
}
