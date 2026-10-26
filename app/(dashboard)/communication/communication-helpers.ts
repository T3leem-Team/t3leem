
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

export function getWhatsAppNumber(student: Student): string {
  const value = student.whatsapp || student.phone || ''
  const digits = value.replace(/\D/g, '')

  if (digits.startsWith('973')) {
    return digits
  }

  if (digits.length === 8) {
    return `973${digits}`
  }

  return digits
}

type ReplaceTemplateVariablesContext = {
  assignments: TeacherAssignment[]
  courses: Course[]
  teachers: Teacher[]
  attendance: AttendanceRecord[]
  attendanceStatuses: AttendanceStatus[]
  payments: Payment[]
  academicYear: AcademicYear | null
}

export function replaceTemplateVariables(
  template: string,
  student: Student,
  context: ReplaceTemplateVariablesContext,
): string {
  const {
    assignments,
    courses,
    teachers,
    attendance,
    attendanceStatuses,
    payments,
    academicYear,
  } = context

  const studentAssignments = assignments.filter(
    (item) => item.studentId === student.id,
  )

  const courseIds = Array.from(
    new Set(studentAssignments.map((item) => item.courseId)),
  )

  const teacherIds = Array.from(
    new Set(studentAssignments.map((item) => item.teacherId)),
  )

  const studentCourses = courseIds
    .map((courseId) =>
      courses.find((course) => course.id === courseId)?.name,
    )
    .filter((value): value is string => Boolean(value))

  const studentTeachers = teacherIds
    .map((teacherId) =>
      teachers.find((teacher) => teacher.id === teacherId)?.name,
    )
    .filter((value): value is string => Boolean(value))

  const studentAttendance = Array.from(
    new Set(
      attendance
        .filter((record) => record.studentId === student.id)
        .map(
          (record) =>
            attendanceStatuses.find(
              (status) => status.id === record.statusId,
            )?.name,
        ),
    ),
  ).filter((value): value is string => Boolean(value))

  const paid = payments
    .filter((payment) => payment.studentId === student.id)
    .reduce((total, payment) => total + payment.amount, 0)

  const annualFee = academicYear?.annualFee ?? 0

  const remaining = student.feeExempt
    ? 0
    : Math.max(annualFee - paid, 0)

  const attendanceText =
    studentAttendance.length > 0
      ? studentAttendance.join('، ')
      : 'لم يسجل'

  const values: Record<string, string> = {
    name: student.name || '',
    phone: student.phone || student.whatsapp || '',
    whatsapp: student.whatsapp || student.phone || '',
    course: studentCourses.join('، '),
    teacher: studentTeachers.join('، '),
    attendance: attendanceText,
    paid: paid.toFixed(3),
    remaining: remaining.toFixed(3),
    payment_status: student.feeExempt
      ? 'معفي'
      : paid >= annualFee && annualFee > 0
        ? 'مدفوع بالكامل'
        : paid > 0
          ? 'مدفوع جزئياً'
          : 'غير مدفوع',
    date: new Intl.DateTimeFormat('ar-BH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date()),
  }

  return template.replace(
    /\{\{\s*([a-zA-Z_]+)\s*\}\}/g,
    (_match, key: string) => values[key] ?? `{{${key}}}`,
  )
}
