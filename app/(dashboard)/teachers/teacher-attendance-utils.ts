export type Course = {
  id: string
  name: string
  startDate: string
  endDate: string
  days: string[]
}

export type Student = {
  id: string
  studentId: string
  name: string
  personalId: string
  phone: string
  whatsapp: string
  levelId: string
  levelName: string
  enrollmentId: string
  joinDate: string | null
}

export type AttendanceStatus = {
  id: string
  name: string
  isActive: boolean
  sortOrder: number
}

export type AttendanceRecord = {
  id: string
  studentId: string
  enrollmentId: string | null
  courseId: string
  attendanceDate: string
  statusId: string
  note: string
}

export type AttendanceNotes = Record<string, string>

export type AttendanceStatusName =
  | 'حاضر'
  | 'غائب'
  | 'متأخر'
  | 'مستأذن'
  | 'غير منضم'

export type TeacherAttendanceStatus =
  | 'حاضر'
  | 'غائب'
  | 'متأخر'
  | 'مستأذن'

export const attendanceStatusNames: TeacherAttendanceStatus[] = [
  'حاضر',
  'غائب',
  'متأخر',
  'مستأذن',
]

export function normalizeStatusName(
  name: string,
): AttendanceStatusName | null {
  const normalized = name
    .trim()
    .replace(/\s+/g, ' ')

  if (normalized === 'حاضر') return 'حاضر'
  if (normalized === 'غائب') return 'غائب'

  if (
    normalized === 'متأخر' ||
    normalized === 'متاخر'
  ) {
    return 'متأخر'
  }

  if (
    normalized === 'مستأذن' ||
    normalized === 'مستاذن'
  ) {
    return 'مستأذن'
  }

  if (normalized === 'غير منضم') {
    return 'غير منضم'
  }

  return null
}

export function getStatusIdByName(
  statuses: AttendanceStatus[],
  statusName: TeacherAttendanceStatus,
) {
  const status = statuses.find(
    (item) =>
      normalizeStatusName(item.name) === statusName,
  )

  return status?.id ?? null
}

export function getStatusName(
  statuses: AttendanceStatus[],
  statusId: string | null | undefined,
): AttendanceStatusName | null {
  if (!statusId) {
    return null
  }

  const status = statuses.find(
    (item) => item.id === statusId,
  )

  if (!status) {
    return null
  }

  return normalizeStatusName(status.name)
}

export function getStatusClasses(
  status: AttendanceStatusName,
) {
  switch (status) {
    case 'حاضر':
      return {
        normal:
          'border-green-500 bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950/30 dark:text-green-400',
        selected:
          'border-green-600 bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300',
      }

    case 'غائب':
      return {
        normal:
          'border-red-500 bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400',
        selected:
          'border-red-600 bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300',
      }

    case 'متأخر':
      return {
        normal:
          'border-yellow-500 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-950/30 dark:text-yellow-400',
        selected:
          'border-yellow-600 bg-yellow-100 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-300',
      }

    case 'مستأذن':
      return {
        normal:
          'border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-400',
        selected:
          'border-blue-600 bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
      }

    case 'غير منضم':
      return {
        normal:
          'border-gray-400 bg-gray-50 text-gray-600 dark:bg-gray-950/30 dark:text-gray-400',
        selected:
          'border-gray-500 bg-gray-100 text-gray-700 dark:bg-gray-950/50 dark:text-gray-300',
      }
  }
}

export function getAttendancePercentage(
  studentId: string,
  courseId: string,
  attendanceRecords: AttendanceRecord[],
  attendanceStatuses: AttendanceStatus[],
  cancelledDates: Set<string>,
) {
  const studentRecords = attendanceRecords.filter(
    (record) =>
      record.studentId === studentId &&
      record.courseId === courseId &&
      !cancelledDates.has(record.attendanceDate),
  )

  let attended = 0
  let counted = 0

  studentRecords.forEach((record) => {
    const status = getStatusName(
      attendanceStatuses,
      record.statusId,
    )

    if (
      status === 'حاضر' ||
      status === 'متأخر' ||
      status === 'مستأذن'
    ) {
      attended += 1
      counted += 1
    }

    if (status === 'غائب') {
      counted += 1
    }
  })

  if (counted === 0) {
    return 0
  }

  return Math.round((attended / counted) * 100)
}

export function getPercentageClass(
  percentage: number,
) {
  if (percentage >= 90) {
    return 'text-green-600 dark:text-green-400'
  }

  if (percentage >= 75) {
    return 'text-yellow-600 dark:text-yellow-400'
  }

  return 'text-red-600 dark:text-red-400'
}

export function formatDateForDisplay(date: string) {
  if (!date) {
    return ''
  }

  const [year, month, day] = date.split('-')

  if (!year || !month || !day) {
    return date
  }

  return `${day}/${month}/${year}`
}

export function getTodayString() {
  const today = new Date()

  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-')
}

function getDayOfWeek(date: string) {
  if (!date) {
    return null
  }

  const [year, month, day] = date.split('-').map(Number)

  if (!year || !month || !day) {
    return null
  }

  return new Date(
    Date.UTC(year, month - 1, day),
  ).getUTCDay()
}

function normalizeCourseDay(
  value: string,
): number | null {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')

  if (!normalized) {
    return null
  }

  if (/^[0-6]$/.test(normalized)) {
    return Number(normalized)
  }

  const dayMap: Record<string, number> = {
    الأحد: 0,
    الاحد: 0,
    الاثنين: 1,
    الإثنين: 1,
    الاثنينِ: 1,
    الثلاثاء: 2,
    الأربعاء: 3,
    الاربعاء: 3,
    الخميس: 4,
    الجمعة: 5,
    السبت: 6,
    sunday: 0,
    sun: 0,
    monday: 1,
    mon: 1,
    tuesday: 2,
    tue: 2,
    wednesday: 3,
    wed: 3,
    thursday: 4,
    thu: 4,
    friday: 5,
    fri: 5,
    saturday: 6,
    sat: 6,
  }

  return dayMap[normalized] ?? null
}

export function isCourseStudyDay(
  date: string,
  courseDays: string[],
) {
  const dayOfWeek = getDayOfWeek(date)

  if (dayOfWeek === null) {
    return false
  }

  if (
    !Array.isArray(courseDays) ||
    courseDays.length === 0
  ) {
    return false
  }

  return courseDays.some(
    (day) => normalizeCourseDay(day) === dayOfWeek,
  )
}
