'use client'

import { useMemo } from 'react'
import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'

export type StudentAttendanceCourse = {
  id: string
  name: string
  startDate: string | null
  endDate: string | null
  days: string[]
}

export type StudentAttendanceRecord = {
  id: string
  studentId: string
  courseId: string
  attendanceDate: string
  status: 'حاضر' | 'غائب' | 'متأخر' | 'مستأذن'
  note: string
}

type StudentAttendanceDetailsProps = {
  studentId: string
  studentName: string
  course: StudentAttendanceCourse | null
  records: StudentAttendanceRecord[]
  onClose: () => void
}

type AttendanceDay = {
  date: string
  dayName: string
  status:
    | 'حاضر'
    | 'غائب'
    | 'متأخر'
    | 'مستأذن'
    | 'لم يسجل'
  note: string
}

function getTodayString() {
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

function normalizeCourseDay(value: string): number | null {
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

function isCourseStudyDay(
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
    (day) =>
      normalizeCourseDay(day) === dayOfWeek,
  )
}

function formatDate(date: string | null) {
  if (!date) {
    return '—'
  }

  const parsed = new Date(`${date}T00:00:00`)

  if (Number.isNaN(parsed.getTime())) {
    return date
  }

  return parsed.toLocaleDateString('ar-BH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatShortDate(date: string) {
  const [year, month, day] = date.split('-')

  if (!year || !month || !day) {
    return date
  }

  return `${day}/${month}/${year}`
}

function getDayName(date: string) {
  const parsed = new Date(`${date}T00:00:00`)

  if (Number.isNaN(parsed.getTime())) {
    return ''
  }

  return parsed.toLocaleDateString('ar-BH', {
    weekday: 'long',
  })
}

function getStatusClasses(
  status: AttendanceDay['status'],
) {
  switch (status) {
    case 'حاضر':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'

    case 'غائب':
      return 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'

    case 'متأخر':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'

    case 'مستأذن':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'

    case 'لم يسجل':
      return 'bg-muted text-muted-foreground'
  }
}

function getStatusLabel(
  status: AttendanceDay['status'],
) {
  return status
}

function buildDateRange(
  startDate: string,
  endDate: string,
) {
  const dates: string[] = []

  const [startYear, startMonth, startDay] =
    startDate.split('-').map(Number)

  const [endYear, endMonth, endDay] =
    endDate.split('-').map(Number)

  if (
    !startYear ||
    !startMonth ||
    !startDay ||
    !endYear ||
    !endMonth ||
    !endDay
  ) {
    return dates
  }

  const current = new Date(
    Date.UTC(
      startYear,
      startMonth - 1,
      startDay,
    ),
  )

  const end = new Date(
    Date.UTC(
      endYear,
      endMonth - 1,
      endDay,
    ),
  )

  while (current <= end) {
    const year = current.getUTCFullYear()
    const month = String(
      current.getUTCMonth() + 1,
    ).padStart(2, '0')
    const day = String(
      current.getUTCDate(),
    ).padStart(2, '0')

    dates.push(`${year}-${month}-${day}`)

    current.setUTCDate(
      current.getUTCDate() + 1,
    )
  }

  return dates
}

export function StudentAttendanceDetails({
  studentId,
  studentName,
  course,
  records,
  onClose,
}: StudentAttendanceDetailsProps) {
  const today = getTodayString()

  const attendanceDays = useMemo<AttendanceDay[]>(() => {
    if (!course) {
      return []
    }

    if (
      !course.startDate ||
      !course.endDate
    ) {
      return []
    }

    const dates = buildDateRange(
      course.startDate,
      course.endDate,
    )

    return dates
      .filter((date) => {
        /*
         * نعرض فقط أيام الدراسة الفعلية
         * المحددة للدورة.
         */
        if (
          !isCourseStudyDay(
            date,
            course.days,
          )
        ) {
          return false
        }

        /*
         * لا نعرض أيام المستقبل
         * كتفاصيل حضور فعلية.
         */
        if (date > today) {
          return false
        }

        return true
      })
      .map((date) => {
        const record = records.find(
          (item) =>
            item.studentId === studentId &&
            item.courseId === course.id &&
            item.attendanceDate === date,
        )

        return {
          date,
          dayName: getDayName(date),
          status:
            record?.status ??
            'لم يسجل',
          note: record?.note ?? '',
        }
      })
  }, [
    course,
    records,
    studentId,
    today,
  ])

  const summary = useMemo(() => {
    let present = 0
    let absent = 0
    let late = 0
    let excused = 0
    let notRecorded = 0

    for (const day of attendanceDays) {
      switch (day.status) {
        case 'حاضر':
          present += 1
          break

        case 'غائب':
          absent += 1
          break

        case 'متأخر':
          late += 1
          break

        case 'مستأذن':
          excused += 1
          break

        case 'لم يسجل':
          notRecorded += 1
          break
      }
    }

    /*
     * نفس قاعدة صفحة الحضور:
     *
     * حاضر + متأخر = حضور
     * غائب = محسوب
     * مستأذن = لا يدخل في النسبة
     * لم يسجل = لا يدخل في النسبة
     */
    const counted =
      present +
      late +
      absent

    const attended =
      present +
      late

    const percentage =
      counted === 0
        ? 0
        : Math.round(
            (attended / counted) * 100,
          )

    return {
      totalDays: attendanceDays.length,
      present,
      absent,
      late,
      excused,
      notRecorded,
      counted,
      percentage,
    }
  }, [attendanceDays])

  if (!course) {
    return null
  }

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="إغلاق"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">
              تفاصيل حضور الطالب
            </h2>

            <p className="mt-1 truncate text-sm text-muted-foreground">
              {studentName}
            </p>

            <p className="mt-0.5 text-xs text-muted-foreground">
              {course.name}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 hover:bg-muted"
            aria-label="إغلاق"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Course information */}
        <div className="border-b bg-muted/20 px-6 py-4">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <span className="text-muted-foreground">
                بداية الدورة:
              </span>{' '}
              <span className="font-medium">
                {formatDate(course.startDate)}
              </span>
            </div>

            <div>
              <span className="text-muted-foreground">
                نهاية الدورة:
              </span>{' '}
              <span className="font-medium">
                {formatDate(course.endDate)}
              </span>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="border-b px-6 py-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <SummaryCard
              label="أيام الدراسة"
              value={summary.totalDays}
            />

            <SummaryCard
              label="حاضر"
              value={summary.present}
              valueClassName="text-emerald-600 dark:text-emerald-400"
            />

            <SummaryCard
              label="غائب"
              value={summary.absent}
              valueClassName="text-red-600 dark:text-red-400"
            />

            <SummaryCard
              label="متأخر"
              value={summary.late}
              valueClassName="text-amber-600 dark:text-amber-400"
            />

            <SummaryCard
              label="مستأذن"
              value={summary.excused}
              valueClassName="text-blue-600 dark:text-blue-400"
            />

            <SummaryCard
              label="لم يسجل"
              value={summary.notRecorded}
            />
          </div>

          <div className="mt-4 rounded-xl border bg-muted/30 p-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">
                نسبة الحضور
              </span>

              <span className="text-xl font-bold">
                {summary.percentage}%
              </span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${summary.percentage}%`,
                }}
              />
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              النسبة محسوبة من الحاضر والمتأخر والغائب فقط،
              والمستأذن ولم يسجل لا يدخلان في الحساب.
            </p>
          </div>
        </div>

        {/* Daily details */}
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {attendanceDays.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/20 p-10 text-center">
              <p className="text-sm text-muted-foreground">
                لا توجد أيام دراسة منتهية أو حالية لعرض حضورها.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {attendanceDays.map((day) => (
                <div
                  key={day.date}
                  className="rounded-xl border bg-card p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                          {formatShortDate(day.date)}
                        </span>

                        <span className="text-sm text-muted-foreground">
                          {day.dayName}
                        </span>
                      </div>

                      {day.note && (
                        <div className="mt-2 rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">
                            الملاحظة:
                          </span>{' '}
                          {day.note}
                        </div>
                      )}
                    </div>

                    <span
                      className={`inline-flex w-fit shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${getStatusClasses(
                        day.status,
                      )}`}
                    >
                      {getStatusLabel(
                        day.status,
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onClose}
          >
            إغلاق
          </Button>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  valueClassName = '',
}: {
  label: string
  value: number
  valueClassName?: string
}) {
  return (
    <div className="rounded-xl border bg-background p-3 text-center">
      <div className="text-xs text-muted-foreground">
        {label}
      </div>

      <div
        className={`mt-1 text-lg font-bold ${valueClassName}`}
      >
        {value}
      </div>
    </div>
  )
}
