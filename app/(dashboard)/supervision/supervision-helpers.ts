import {
  CalendarDays,
  Clock3,
  MessageSquareText,
  UserX,
  type LucideIcon,
} from 'lucide-react'

export type SupervisionType =
  | 'day_cancelled'
  | 'lesson_cancelled'
  | 'teacher_absent'
  | 'teacher_late'
  | 'note'

export type AcademicYear = {
  id: string
  name: string
  start_date: string | null
  end_date: string | null
}

export type Course = {
  id: string
  academic_year_id: string
  name: string
  start_date: string | null
  end_date: string | null
  days: string[]
}

export type Teacher = {
  id: string
  name: string
}

export type SupervisionRecord = {
  id: string
  teacherId: string | null
  type: SupervisionType
  date: string
  course: string
  teacher: string
  reason: string
  note: string
  createdBy: string
  createdAt: string
}

export type SupervisionSettings = {
  allowTeacherTransfer: boolean
  allowTeacherRemove: boolean
}

export type SupervisionCache = {
  academicYear: AcademicYear | null
  courses: Course[]
  selectedCourseId: string
  teachers: Teacher[]
  records: SupervisionRecord[]
  supervisionSettings: SupervisionSettings
}

export const defaultSupervisionSettings: SupervisionSettings = {
  allowTeacherTransfer: true,
  allowTeacherRemove: true,
}

export const supervisionTypes: {
  value: SupervisionType
  label: string
}[] = [
  {
    value: 'day_cancelled',
    label: 'إلغاء يوم دراسي',
  },
  {
    value: 'lesson_cancelled',
    label: 'إلغاء درس',
  },
  {
    value: 'teacher_absent',
    label: 'غياب معلم',
  },
  {
    value: 'teacher_late',
    label: 'تأخر معلم',
  },
  {
    value: 'note',
    label: 'ملاحظة إشرافية',
  },
]

export function getTypeLabel(
  type: SupervisionType,
) {
  return (
    supervisionTypes.find(
      (item) => item.value === type,
    )?.label ?? type
  )
}

export function getTypeIcon(
  type: SupervisionType,
): LucideIcon {
  switch (type) {
    case 'day_cancelled':
    case 'lesson_cancelled':
      return CalendarDays

    case 'teacher_absent':
      return UserX

    case 'teacher_late':
      return Clock3

    case 'note':
      return MessageSquareText
  }
}


export function getTypeBadgeVariant(
  type: SupervisionType,
) {
  switch (type) {
    case 'teacher_absent':
      return 'danger' as const

    case 'day_cancelled':
    case 'lesson_cancelled':
      return 'warning' as const

    default:
      return 'neutral' as const
  }
}


export function getLocalDateString() {
  const now = new Date()

  const year = now.getFullYear()

  const month = String(
    now.getMonth() + 1,
  ).padStart(2, '0')

  const day = String(
    now.getDate(),
  ).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function formatDateTime(
  value: string,
) {
  try {
    return new Intl.DateTimeFormat('ar-BH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return value
  }
}

export function formatDate(
  value: string,
) {
  try {
    return new Intl.DateTimeFormat('ar-BH', {
      dateStyle: 'medium',
    }).format(
      new Date(`${value}T00:00:00`),
    )
  } catch {
    return value
  }
}

export const dayLabels: Record<
  string,
  string
> = {
  sunday: 'الأحد',
  monday: 'الاثنين',
  tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء',
  thursday: 'الخميس',
  friday: 'الجمعة',
  saturday: 'السبت',

  Sun: 'الأحد',
  Mon: 'الاثنين',
  Tue: 'الثلاثاء',
  Wed: 'الأربعاء',
  Thu: 'الخميس',
  Fri: 'الجمعة',
  Sat: 'السبت',

  الأحد: 'الأحد',
  الاثنين: 'الاثنين',
  الثلاثاء: 'الثلاثاء',
  الأربعاء: 'الأربعاء',
  الخميس: 'الخميس',
  الجمعة: 'الجمعة',
  السبت: 'السبت',
}

export function getDayLabel(
  day: string,
) {
  return (
    dayLabels[day] ??
    dayLabels[day.trim()] ??
    day
  )
}
