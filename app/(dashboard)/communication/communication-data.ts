
export type AcademicYear = {
  id: string
  name: string
  annualFee: number
}

export type Student = {
  id: string
  studentId: string | null
  name: string
  personalId: string | null
  phone: string | null
  whatsapp: string | null
  status: string | null
}

export type Teacher = {
  id: string
  name: string
}

export type Course = {
  id: string
  name: string
}

export type TeacherAssignment = {
  id: string
  courseId: string
  teacherId: string
  studentId: string
}

export type AttendanceRecord = {
  id: string
  studentId: string
  attendanceDate: string
  statusId: string
  note: string | null
  courseId: string
}

export type AttendanceStatus = {
  id: string
  name: string
}

export type Payment = {
  id: string
  studentId: string
  amount: number
  paymentDate: string | null
  paymentMethod: string | null
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

export let communicationCache: CommunicationCache | null = null

export let communicationCacheLoading = false

export function setCommunicationCache(
  cache: CommunicationCache | null,
) {
  communicationCache = cache
}

export function setCommunicationCacheLoading(
  loading: boolean,
) {
  communicationCacheLoading = loading
}

export const TODAY = new Date().toISOString().split('T')[0]
