
import type {
  Student,
  Teacher,
  Course,
  TeacherAssignment,
  AttendanceRecord,
  AttendanceStatus,
  Payment,
  AcademicYear,
} from '@/app/(dashboard)/communication/communication-data'

export function normalizeWhatsAppNumber(
  value: string | null | undefined,
): string {
  let number = (value ?? '').replace(/\D/g, '')

  if (number.startsWith('00')) {
    number = number.slice(2)
  }

  if (number.startsWith('973')) {
    return number
  }

  if (number.length === 8) {
    return `973${number}`
  }

  return number
}

export function getStudentCourses(
  studentId: string,
  assignments: TeacherAssignment[],
  courses: Course[],
): Course[] {
  const courseIds = new Set(
    assignments
      .filter((assignment) => assignment.studentId === studentId)
      .map((assignment) => assignment.courseId),
  )

  return courses.filter((course) => courseIds.has(course.id))
}

export function getStudentTeachers(
  studentId: string,
  assignments: TeacherAssignment[],
  teachers: Teacher[],
): Teacher[] {
  const teacherIds = new Set(
    assignments
      .filter((assignment) => assignment.studentId === studentId)
      .map((assignment) => assignment.teacherId),
  )

  return teachers.filter((teacher) => teacherIds.has(teacher.id))
}

export function getStudentAttendance(
  studentId: string,
  attendance: AttendanceRecord[],
  attendanceStatuses: AttendanceStatus[],
): string {
  const records = attendance.filter(
    (record) => record.studentId === studentId,
  )

  if (records.length === 0) {
    return 'غير مسجل'
  }

  return records
    .map((record) => {
      const status = attendanceStatuses.find(
        (item) => item.id === record.statusId,
      )

      return status?.name ?? 'غير محدد'
    })
    .join('، ')
}

export function getStudentPaidTotal(
  studentId: string,
  payments: Payment[],
): number {
  return payments
    .filter((payment) => payment.studentId === studentId)
    .reduce((total, payment) => total + (Number(payment.amount) || 0), 0)
}

type TemplateVariables = {
  student: Student
  courses: Course[]
  teachers: Teacher[]
  attendance: string
  paid: number
  annualFee: number
  phone?: string
  whatsapp?: string
}

export function replaceTemplateVariables(
  template: string,
  variables: TemplateVariables,
): string {
  const {
    student,
    courses,
    teachers,
    attendance,
    paid,
    annualFee,
    phone,
    whatsapp,
  } = variables

  const remaining = Math.max(annualFee - paid, 0)

  const paymentStatus =
    remaining <= 0
      ? 'مسدد'
      : paid > 0
        ? 'مسدد جزئياً'
        : 'غير مسدد'

  const replacements: Record<string, string> = {
    '{{name}}': student.name ?? '',
    '{{phone}}': phone ?? student.phone ?? '',
    '{{whatsapp}}': whatsapp ?? student.whatsapp ?? '',
    '{{course}}': courses.map((course) => course.name).join('، ') || 'غير محدد',
    '{{teacher}}': teachers.map((teacher) => teacher.name).join('، ') || 'غير محدد',
    '{{attendance}}': attendance || 'غير مسجل',
    '{{paid}}': String(paid),
    '{{remaining}}': String(remaining),
    '{{payment_status}}': paymentStatus,
    '{{date}}': new Date().toLocaleDateString('en-GB'),
  }

  return template.replace(
    /\{\{name\}\}|\{\{phone\}\}|\{\{whatsapp\}\}|\{\{course\}\}|\{\{teacher\}\}|\{\{attendance\}\}|\{\{paid\}\}|\{\{remaining\}\}|\{\{payment_status\}\}|\{\{date\}\}/g,
    (match) => replacements[match] ?? match,
  )
}
