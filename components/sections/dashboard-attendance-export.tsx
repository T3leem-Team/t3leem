'use client'

import { useCallback, useState } from 'react'
import {
  CalendarRange,
  Download,
  FileSpreadsheet,
  X,
} from 'lucide-react'
import * as XLSX from 'xlsx'

import { Button } from '@/components/ui/button'

type AcademicYear = {
  id: string
  name: string
  annualFee: number
  startDate: string | null
  endDate: string | null
}

type Course = {
  id: string
  name: string
  startDate: string | null
  endDate: string | null
  days: string[]
  createdAt: string | null
}

type Assignment = {
  id: string
  courseId: string
  teacherId: string
  studentId: string
}

type Teacher = {
  id: string
  name: string
}

type Student = {
  id: string
  studentId: string | null
  name: string
  personalId: string | null
  phone: string | null
  whatsapp: string | null
  status: string | null
}

type AttendanceStatus = {
  id: string
  name: string
}

type AttendanceRecord = {
  id: string
  studentId: string
  enrollmentId: string | null
  attendanceDate: string
  statusId: string
  note: string | null
  courseId: string
}

type Props = {
  course: Course | null
  academicYear: AcademicYear | null
  assignments: Assignment[]
  teachers: Teacher[]
  students: Student[]
  attendanceRecords: AttendanceRecord[]
  attendanceStatuses: AttendanceStatus[]
}

function getLocalDateString() {
  const now = new Date()

  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function normalizeId(value: string | null | undefined) {
  return String(value ?? '').trim()
}

function normalizeAttendanceDate(value: string) {
  return value.slice(0, 10)
}

function normalizeDay(value: string) {
  return normalizeText(value)
    .replace('الأحد', 'الاحد')
    .replace('الإثنين', 'الاثنين')
    .replace('الثلاثاء', 'الثلاثاء')
    .replace('الأربعاء', 'الاربعاء')
    .replace('الخميس', 'الخميس')
    .replace('الجمعة', 'الجمعة')
    .replace('السبت', 'السبت')
}

function getArabicDayName(dateString: string) {
  const date = new Date(`${dateString}T12:00:00`)
  const day = date.getDay()

  const names = [
    'الأحد',
    'الإثنين',
    'الثلاثاء',
    'الأربعاء',
    'الخميس',
    'الجمعة',
    'السبت',
  ]

  return names[day]
}

function getDayIndex(value: string) {
  const day = normalizeDay(value)

  const aliases: Record<string, number> = {
    الاحد: 0,
    الأحد: 0,

    الاثنين: 1,
    الإثنين: 1,

    الثلاثاء: 2,

    الاربعاء: 3,
    الأربعاء: 3,

    الخميس: 4,
    الجمعة: 5,
    السبت: 6,

    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  }

  return aliases[day]
}

function getCourseLessonDates(
  fromDate: string,
  toDate: string,
  course: Course,
) {
  const result: string[] = []

  if (!fromDate || !toDate) {
    return result
  }

  const start = new Date(`${fromDate}T12:00:00`)
  const end = new Date(`${toDate}T12:00:00`)

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start > end
  ) {
    return result
  }

  const configuredDays = (course.days ?? [])
    .map(getDayIndex)
    .filter(
      (day): day is number =>
        typeof day === 'number' && !Number.isNaN(day),
    )

  const hasConfiguredDays = configuredDays.length > 0

  const cursor = new Date(start)

  while (cursor <= end) {
    const dateString = [
      cursor.getFullYear(),
      String(cursor.getMonth() + 1).padStart(2, '0'),
      String(cursor.getDate()).padStart(2, '0'),
    ].join('-')

    if (
      !hasConfiguredDays ||
      configuredDays.includes(cursor.getDay())
    ) {
      result.push(dateString)
    }

    cursor.setDate(cursor.getDate() + 1)
  }

  return result
}

function getTeacherNamesForStudent(
  studentId: string,
  courseId: string,
  assignments: Assignment[],
  teachers: Teacher[],
) {
  const teacherIds = Array.from(
    new Set(
      assignments
        .filter(
          (assignment) =>
            normalizeId(assignment.courseId) ===
              normalizeId(courseId) &&
            normalizeId(assignment.studentId) ===
              normalizeId(studentId),
        )
        .map((assignment) => normalizeId(assignment.teacherId))
        .filter(Boolean),
    ),
  )

  const names = teacherIds
    .map(
      (teacherId) =>
        teachers.find(
          (teacher) => normalizeId(teacher.id) === teacherId,
        )?.name ?? '',
    )
    .filter(Boolean)

  return names
}

function getStatusLabel(
  statusId: string,
  attendanceStatuses: AttendanceStatus[],
) {
  const status = attendanceStatuses.find(
    (item) =>
      normalizeId(item.id) === normalizeId(statusId),
  )

  return status?.name ?? 'غير معروف'
}

function getStatusKey(status: string) {
  const normalized = normalizeText(status)

  if (normalized.includes('حاضر')) {
    return 'present'
  }

  if (normalized.includes('غائب')) {
    return 'absent'
  }

  if (
    normalized.includes('متأخر') ||
    normalized.includes('متاخر')
  ) {
    return 'late'
  }

  if (
    normalized.includes('مستأذن') ||
    normalized.includes('مستاذن')
  ) {
    return 'excused'
  }

  if (
    normalized.includes('لم يسجل') ||
    normalized.includes('لم يسجّل')
  ) {
    return 'notRecorded'
  }

  return 'unknown'
}

function formatPercentage(value: number) {
  if (!Number.isFinite(value)) {
    return '0%'
  }

  return `${value.toFixed(2)}%`
}

function clampDate(
  date: string,
  minDate: string,
  maxDate: string,
) {
  if (date < minDate) {
    return minDate
  }

  if (date > maxDate) {
    return maxDate
  }

  return date
}

export function DashboardAttendanceExport({
  course,
  academicYear,
  assignments,
  teachers,
  students,
  attendanceRecords,
  attendanceStatuses,
}: Props) {
  const today = getLocalDateString()

  const courseStartDate =
    course?.startDate ??
    academicYear?.startDate ??
    today

  const courseEndDate = course?.endDate
    ? course.endDate < today
      ? course.endDate
      : today
    : today

  const defaultFromDate = clampDate(
    courseStartDate,
    courseStartDate,
    courseEndDate,
  )

  const defaultToDate = clampDate(
    today,
    courseStartDate,
    courseEndDate,
  )

  const [customModalOpen, setCustomModalOpen] =
    useState(false)

  const [fromDate, setFromDate] =
    useState(defaultFromDate)

  const [toDate, setToDate] =
    useState(defaultToDate)

  const [exporting, setExporting] =
    useState(false)

  const [error, setError] = useState('')

  const buildAndDownloadExcel = useCallback(
    async (
      requestedFromDate: string,
      requestedToDate: string,
    ) => {
      if (!course) {
        setError('لم يتم اختيار دورة.')
        return false
      }

      const minDate =
        course.startDate ??
        academicYear?.startDate ??
        today

      const maxDate = course.endDate
        ? course.endDate < today
          ? course.endDate
          : today
        : today

      const safeFromDate = clampDate(
        requestedFromDate || minDate,
        minDate,
        maxDate,
      )

      const safeToDate = clampDate(
        requestedToDate || maxDate,
        minDate,
        maxDate,
      )

      if (safeFromDate > safeToDate) {
        setError(
          'تاريخ البداية يجب أن يكون قبل أو يساوي تاريخ النهاية.',
        )
        return false
      }

      const lessonDates = getCourseLessonDates(
        safeFromDate,
        safeToDate,
        course,
      )

      if (lessonDates.length === 0) {
        setError(
          'لا توجد أيام دراسة ضمن الفترة المحددة.',
        )
        return false
      }

      setExporting(true)
      setError('')

      try {
        const courseAssignments = assignments.filter(
          (assignment) =>
            normalizeId(assignment.courseId) ===
            normalizeId(course.id),
        )

        const assignedStudentIds = Array.from(
          new Set(
            courseAssignments
              .map((assignment) =>
                normalizeId(assignment.studentId),
              )
              .filter(Boolean),
          ),
        )

        const assignedStudents = assignedStudentIds
          .map((studentId) =>
            students.find(
              (student) =>
                normalizeId(student.id) === studentId,
            ),
          )
          .filter(
            (student): student is Student =>
              Boolean(student),
          )

        const studentIds = assignedStudents.map(
          (student) => normalizeId(student.id),
        )

        const relevantRecords =
          attendanceRecords.filter((record) => {
            const recordStudentId = normalizeId(
              record.studentId,
            )

            const recordCourseId = normalizeId(
              record.courseId,
            )

            const recordDate =
              normalizeAttendanceDate(
                record.attendanceDate,
              )

            return (
              recordCourseId ===
                normalizeId(course.id) &&
              studentIds.includes(recordStudentId) &&
              recordDate >= safeFromDate &&
              recordDate <= safeToDate &&
              lessonDates.includes(recordDate)
            )
          })

        const recordMap = new Map<
          string,
          AttendanceRecord
        >()

        for (const record of relevantRecords) {
          const key = [
            normalizeId(record.studentId),
            normalizeAttendanceDate(
              record.attendanceDate,
            ),
          ].join('|')

          if (!recordMap.has(key)) {
            recordMap.set(key, record)
          }
        }

        const detailsRows: Record<string, unknown>[] = []
        const summaryRows: Record<string, unknown>[] = []

        for (const student of assignedStudents) {
          const studentId = normalizeId(student.id)

          const teacherNames =
            getTeacherNamesForStudent(
              studentId,
              course.id,
              assignments,
              teachers,
            )

          const teacherName =
            teacherNames.join('، ') || 'غير محدد'

          const counts = {
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            notRecorded: 0,
          }

          for (const lessonDate of lessonDates) {
            const key = [
              studentId,
              lessonDate,
            ].join('|')

            const record = recordMap.get(key)

            const statusLabel = record
              ? getStatusLabel(
                  record.statusId,
                  attendanceStatuses,
                )
              : 'لم يسجل'

            const statusKey =
              getStatusKey(statusLabel)

            if (
              statusKey === 'present' ||
              statusKey === 'absent' ||
              statusKey === 'late' ||
              statusKey === 'excused' ||
              statusKey === 'notRecorded'
            ) {
              counts[statusKey] += 1
            } else {
              counts.notRecorded += 1
            }

            detailsRows.push({
              المعلم: teacherName,
              الدورة: course.name,
              'اسم الطالب': student.name,
              'رقم الطالب': student.studentId ?? '',
              'الرقم الشخصي':
                student.personalId ?? '',
              التاريخ: lessonDate,
              اليوم:
                getArabicDayName(lessonDate),
              الحالة: statusLabel,
              ملاحظة: record?.note ?? '',
            })
          }

          const recordedDays =
            counts.present +
            counts.absent +
            counts.late +
            counts.excused

          const attendanceDays =
            counts.present +
            counts.late +
            counts.excused

          const attendancePercentage =
            recordedDays > 0
              ? (attendanceDays / recordedDays) *
                100
              : 0

          summaryRows.push({
            المعلم: teacherName,
            الدورة: course.name,
            'اسم الطالب': student.name,
            'رقم الطالب': student.studentId ?? '',
            'الرقم الشخصي':
              student.personalId ?? '',
            'من تاريخ': safeFromDate,
            'إلى تاريخ': safeToDate,
            'عدد أيام الدراسة':
              lessonDates.length,
            حاضر: counts.present,
            غائب: counts.absent,
            متأخر: counts.late,
            مستأذن: counts.excused,
            'لم يسجل': counts.notRecorded,
            'الأيام المسجلة': recordedDays,
            'أيام الحضور': attendanceDays,
            'نسبة الحضور':
              formatPercentage(
                attendancePercentage,
              ),
          })
        }

        const workbook =
          XLSX.utils.book_new()

        const detailsSheet =
          XLSX.utils.json_to_sheet(
            detailsRows,
          )

        const summarySheet =
          XLSX.utils.json_to_sheet(
            summaryRows,
          )

        detailsSheet['!cols'] = [
          { wch: 24 },
          { wch: 24 },
          { wch: 28 },
          { wch: 16 },
          { wch: 18 },
          { wch: 14 },
          { wch: 14 },
          { wch: 18 },
          { wch: 30 },
        ]

        summarySheet['!cols'] = [
          { wch: 24 },
          { wch: 24 },
          { wch: 28 },
          { wch: 16 },
          { wch: 18 },
          { wch: 14 },
          { wch: 14 },
          { wch: 18 },
          { wch: 10 },
          { wch: 10 },
          { wch: 10 },
          { wch: 10 },
          { wch: 12 },
          { wch: 16 },
          { wch: 16 },
          { wch: 18 },
        ]

        XLSX.utils.book_append_sheet(
          workbook,
          detailsSheet,
          'تفاصيل الحضور',
        )

        XLSX.utils.book_append_sheet(
          workbook,
          summarySheet,
          'ملخص الطلاب',
        )

        const safeCourseName =
          course.name
            .replace(/[\\/:*?"<>|]/g, '-')
            .trim() || 'الدورة'

        const fileName =
          `تقرير حضور ${safeCourseName} ${safeFromDate} إلى ${safeToDate}.xlsx`

        XLSX.writeFile(
          workbook,
          fileName,
        )

        return true
      } catch (exportError) {
        console.error(
          'Attendance Excel export error:',
          exportError,
        )

        setError(
          'تعذر إنشاء ملف Excel. حاول مرة أخرى.',
        )

        return false
      } finally {
        setExporting(false)
      }
    },
    [
      academicYear?.startDate,
      assignments,
      attendanceRecords,
      attendanceStatuses,
      course,
      students,
      teachers,
      today,
    ],
  )

  const handleCourseToToday = async () => {
    if (!course) {
      return
    }

    await buildAndDownloadExcel(
      defaultFromDate,
      defaultToDate,
    )
  }

  const openCustomModal = () => {
    setError('')

    setFromDate(defaultFromDate)
    setToDate(defaultToDate)

    setCustomModalOpen(true)
  }

  const handleCustomExport = async () => {
    const success =
      await buildAndDownloadExcel(
        fromDate,
        toDate,
      )

    if (success) {
      setCustomModalOpen(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={handleCourseToToday}
          disabled={!course || exporting}
          className="h-10 w-[190px] justify-center gap-2 border border-emerald-200 bg-emerald-50 px-4 text-emerald-700 shadow-sm hover:bg-emerald-100 hover:text-emerald-800"
        >
          <FileSpreadsheet className="size-4" />

          {exporting
            ? 'جاري التجهيز...'
            : 'تنزيل من بداية الدورة'}
        </Button>

        <Button
          type="button"
          onClick={openCustomModal}
          disabled={!course || exporting}
          className="h-10 w-[190px] justify-center gap-2 border border-indigo-200 bg-indigo-50 px-4 text-indigo-700 shadow-sm hover:bg-indigo-100 hover:text-indigo-800"
        >
          <CalendarRange className="size-4" />

          تنزيل مخصص
        </Button>
      </div>

      {customModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-background p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">
                  تنزيل حضور مخصص
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  اختر الفترة المطلوبة لتقرير الحضور.
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() =>
                  setCustomModalOpen(false)
                }
                disabled={exporting}
              >
                <X className="size-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  من تاريخ
                </label>

                <input
                  type="date"
                  value={fromDate}
                  min={courseStartDate}
                  max={courseEndDate}
                  onChange={(event) =>
                    setFromDate(event.target.value)
                  }
                  className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                  disabled={exporting}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  إلى تاريخ
                </label>

                <input
                  type="date"
                  value={toDate}
                  min={courseStartDate}
                  max={courseEndDate}
                  onChange={(event) =>
                    setToDate(event.target.value)
                  }
                  className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                  disabled={exporting}
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="rounded-lg border bg-background p-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <Download className="mt-0.5 size-4 shrink-0" />

                  <span>
                    سيتم إنشاء ملف Excel يحتوي على
                    ورقتين:
                    <br />
                    <strong>
                      تفاصيل الحضور
                    </strong>
                    {' '}و{' '}
                    <strong>
                      ملخص الطلاب
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setCustomModalOpen(false)
                }
                disabled={exporting}
              >
                إلغاء
              </Button>

              <Button
                type="button"
                onClick={handleCustomExport}
                disabled={
                  exporting ||
                  !fromDate ||
                  !toDate
                }
                className="h-10 gap-2 border border-indigo-200 bg-indigo-50 px-4 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800"
              >
                <Download className="size-4" />

                {exporting
                  ? 'جاري إنشاء الملف...'
                  : 'تنزيل Excel'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}