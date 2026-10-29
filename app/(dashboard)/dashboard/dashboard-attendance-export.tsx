'use client'

import { useCallback, useState } from 'react'
import {
  CalendarRange,
  Download,
  FileSpreadsheet,
  X,
} from 'lucide-react'
import ExcelJS from 'exceljs'

import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

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

type Enrollment = {
  id: string
  studentId: string
  academicYearId: string
  levelId: string | null
  status: string
  joinDate: string | null
}

type AssignmentCreatedAt = {
  id: string
  studentId: string
  courseId: string
  createdAt: string | null
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
  return String(value ?? '').slice(0, 10)
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
        .map((assignment) =>
          normalizeId(assignment.teacherId),
        )
        .filter(Boolean),
    ),
  )

  const names = teacherIds
    .map(
      (teacherId) =>
        teachers.find(
          (teacher) =>
            normalizeId(teacher.id) === teacherId,
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

  if (
    normalized.includes('لم ينضم للدورة') ||
    normalized.includes('لم ينضم للدوره')
  ) {
    return 'notJoinedCourse'
  }

  if (normalized.includes('غير منضم')) {
    return 'unjoined'
  }

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

function isUnjoinedStatus(status: string) {
  const key = getStatusKey(status)

  return (
    key === 'unjoined' ||
    key === 'notJoinedCourse'
  )
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

function getBahrainDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bahrain',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  if (!year || !month || !day) {
    return null
  }

  return `${year}-${month}-${day}`
}

export function DashboardAttendanceExport({
  course,
  academicYear,
  assignments,
  teachers,
  students,
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

        /*
         * 1. جلب تاريخ انضمام الطالب للدورة.
         * المصدر: enrollments.join_date.
         */
        let enrollments: Enrollment[] = []

        if (
          academicYear?.id &&
          studentIds.length > 0
        ) {
          const {
            data: enrollmentData,
            error: enrollmentError,
          } = await supabase
            .from('enrollments')
            .select(
              `
                id,
                student_id,
                academic_year_id,
                level_id,
                status,
                join_date
              `,
            )
            .eq('academic_year_id', academicYear.id)
            .in('student_id', studentIds)
            .order('join_date', {
              ascending: true,
            })

          if (enrollmentError) {
            console.error(
              'Attendance export enrollment query error:',
              enrollmentError,
            )

            throw enrollmentError
          }

          enrollments = (enrollmentData ?? []).map(
            (item) => ({
              id: String(item.id),
              studentId: String(item.student_id),
              academicYearId: String(
                item.academic_year_id,
              ),
              levelId: item.level_id
                ? String(item.level_id)
                : null,
              status: String(item.status ?? ''),
              joinDate: item.join_date
                ? String(item.join_date).slice(0, 10)
                : null,
            }),
          )
        }

        /*
         * اختيار أقدم تاريخ انضمام غير فارغ
         * لكل طالب في السنة الأكاديمية المحددة.
         */
        const enrollmentMap =
          new Map<string, Enrollment>()

        for (const enrollment of enrollments) {
          const studentId = normalizeId(
            enrollment.studentId,
          )

          if (
            !studentId ||
            !enrollment.joinDate
          ) {
            continue
          }

          const current =
            enrollmentMap.get(studentId)

          if (
            !current?.joinDate ||
            enrollment.joinDate < current.joinDate
          ) {
            enrollmentMap.set(studentId, enrollment)
          }
        }

        /*
         * 2. جلب تاريخ تعيين المعلم من created_at.
         * نستخدم تاريخ إنشاء سجل التعيين بتوقيت البحرين،
         * ولا نعتمد على teacher_student_assignments.join_date.
         */
        const assignmentCreatedAtMap =
          new Map<string, string>()

        const assignmentIds = Array.from(
          new Set(
            courseAssignments
              .map((assignment) =>
                normalizeId(assignment.id),
              )
              .filter(Boolean),
          ),
        )

        if (assignmentIds.length > 0) {
          const {
            data: assignmentData,
            error: assignmentError,
          } = await supabase
            .from('teacher_student_assignments')
            .select(
              `
                id,
                student_id,
                course_id,
                created_at
              `,
            )
            .in('id', assignmentIds)
            .eq('course_id', course.id)

          if (assignmentError) {
            console.error(
              'Attendance export assignment query error:',
              assignmentError,
            )

            throw assignmentError
          }

          const assignmentRecords: AssignmentCreatedAt[] =
            (assignmentData ?? []).map((item) => ({
              id: String(item.id),
              studentId: String(item.student_id),
              courseId: String(item.course_id),
              createdAt: item.created_at
                ? String(item.created_at)
                : null,
            }))

          /*
           * إذا كان للطالب أكثر من تعيين في الدورة،
           * نعتمد أقدم تاريخ إنشاء صالح؛ لأن مسؤولية
           * تسجيل الحضور تبدأ من أول تعيين.
           */
          for (const assignment of assignmentRecords) {
            if (!assignment.createdAt) {
              continue
            }

            const studentId = normalizeId(
              assignment.studentId,
            )

            if (!studentId) {
              continue
            }

            const bahrainDate = getBahrainDate(
              assignment.createdAt,
            )

            if (!bahrainDate) {
              continue
            }

            const currentDate =
              assignmentCreatedAtMap.get(studentId)

            if (
              !currentDate ||
              bahrainDate < currentDate
            ) {
              assignmentCreatedAtMap.set(
                studentId,
                bahrainDate,
              )
            }
          }
        }

        /*
         * 3. سحب سجلات الحضور مباشرة من Supabase.
         * يتم جلبها على دفعات لتجنب حدود الاستعلام.
         */
        const exportedAttendanceRecords:
          AttendanceRecord[] = []

        const pageSize = 1000
        let page = 0

        if (studentIds.length > 0) {
          while (true) {
            const from = page * pageSize
            const to = from + pageSize - 1

            const {
              data: attendanceData,
              error: attendanceError,
            } = await supabase
              .from('attendance')
              .select(
                `
                  id,
                  student_id,
                  enrollment_id,
                  attendance_date,
                  status_id,
                  note,
                  course_id
                `,
              )
              .eq('course_id', course.id)
              .in('student_id', studentIds)
              .gte('attendance_date', safeFromDate)
              .lte('attendance_date', safeToDate)
              .range(from, to)
              .order('attendance_date', {
                ascending: true,
              })

            if (attendanceError) {
              console.error(
                'Attendance export attendance query error:',
                attendanceError,
              )

              throw attendanceError
            }

            const rows = attendanceData ?? []

            for (const item of rows) {
              const recordDate =
                normalizeAttendanceDate(
                  String(item.attendance_date ?? ''),
                )

              if (!lessonDates.includes(recordDate)) {
                continue
              }

              exportedAttendanceRecords.push({
                id: String(item.id),
                studentId: String(item.student_id),
                enrollmentId: item.enrollment_id
                  ? String(item.enrollment_id)
                  : null,
                attendanceDate: recordDate,
                statusId: String(item.status_id),
                note: item.note
                  ? String(item.note)
                  : null,
                courseId: String(item.course_id),
              })
            }

            if (rows.length < pageSize) {
              break
            }

            page += 1
          }
        }

        /*
         * 4. إنشاء خريطة سجلات الحضور.
         * عند وجود أكثر من سجل للطالب في اليوم نفسه،
         * نفضّل السجل الذي لا يحمل حالة "غير منضم"
         * حتى لا يخفي سجل قديم حالة حضور فعلية.
         */
        const recordMap = new Map<
          string,
          AttendanceRecord
        >()

        for (const record of exportedAttendanceRecords) {
          const key = [
            normalizeId(record.studentId),
            normalizeId(record.courseId),
            normalizeAttendanceDate(
              record.attendanceDate,
            ),
          ].join('|')

          const existing = recordMap.get(key)

          if (!existing) {
            recordMap.set(key, record)
            continue
          }

          const existingStatus = getStatusLabel(
            existing.statusId,
            attendanceStatuses,
          )

          const newStatus = getStatusLabel(
            record.statusId,
            attendanceStatuses,
          )

          if (
            isUnjoinedStatus(existingStatus) &&
            !isUnjoinedStatus(newStatus)
          ) {
            recordMap.set(key, record)
          }
        }

        const detailsRows:
          Record<string, unknown>[] = []

        const summaryRows:
          Record<string, unknown>[] = []

        /*
         * 5. إنشاء التفاصيل والملخص.
         */
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
            teacherNames.join('، ') ||
            'غير محدد'

          const enrollment =
            enrollmentMap.get(studentId)

          const enrollmentDate =
            enrollment?.joinDate
              ? normalizeAttendanceDate(
                  enrollment.joinDate,
                )
              : null

          const assignmentCreatedAtDate =
            assignmentCreatedAtMap.get(studentId) ??
            null

          const counts = {
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            notRecorded: 0,
            notJoinedCourse: 0,
            unjoined: 0,
          }

          for (const lessonDate of lessonDates) {
            const key = [
              studentId,
              normalizeId(course.id),
              lessonDate,
            ].join('|')

            const record = recordMap.get(key)

            const isBeforeEnrollment =
              enrollmentDate !== null &&
              lessonDate < enrollmentDate

            const isBeforeAssignment =
              assignmentCreatedAtDate !== null &&
              lessonDate < assignmentCreatedAtDate

            let statusLabel: string

            /*
             * الأولوية الأولى:
             * الطالب لم ينضم للدورة بعد.
             */
            if (isBeforeEnrollment) {
              statusLabel = 'لم ينضم للدورة'
            } else if (
              /*
               * الأولوية الثانية:
               * انضم للدورة لكنه لم يصل بعد
               * إلى تاريخ إنشاء سجل تعيينه عند المعلم.
               */
              assignmentCreatedAtDate !== null &&
              isBeforeAssignment
            ) {
              statusLabel = 'غير منضم'
            } else if (record) {
              const recordedStatus = getStatusLabel(
                record.statusId,
                attendanceStatuses,
              )

              /*
               * بعد تاريخ التعيين، السجل القديم
               * "غير منضم" لا يُعتبر تسجيل حضور.
               * نعرض "لم يسجل" دون تعديل السجل الأصلي.
               */
              if (
                assignmentCreatedAtDate !== null &&
                lessonDate >= assignmentCreatedAtDate &&
                isUnjoinedStatus(recordedStatus)
              ) {
                statusLabel = 'لم يسجل'
              } else {
                statusLabel = recordedStatus
              }
            } else {
              /*
               * لا يوجد سجل حضور في يوم الدراسة.
               */
              statusLabel = 'لم يسجل'
            }

            const statusKey = getStatusKey(statusLabel)

            if (statusKey === 'present') {
              counts.present += 1
            } else if (statusKey === 'absent') {
              counts.absent += 1
            } else if (statusKey === 'late') {
              counts.late += 1
            } else if (statusKey === 'excused') {
              counts.excused += 1
            } else if (statusKey === 'notRecorded') {
              counts.notRecorded += 1
            } else if (
              statusKey === 'notJoinedCourse'
            ) {
              counts.notJoinedCourse += 1
            } else if (statusKey === 'unjoined') {
              counts.unjoined += 1
            }

            const isNonAttendanceStatus =
              statusKey === 'notJoinedCourse' ||
              statusKey === 'unjoined' ||
              statusKey === 'notRecorded'

            detailsRows.push({
              المعلم: teacherName,
              الدورة: course.name,
              'اسم الطالب': student.name,
              'رقم الطالب': student.studentId ?? '',
              'الرقم الشخصي': student.personalId ?? '',
              التاريخ: lessonDate,
              اليوم: getArabicDayName(lessonDate),
              الحالة: statusLabel,
              ملاحظة: isNonAttendanceStatus
                ? ''
                : record?.note ?? '',
            })
          }

          /*
           * الأيام المسجلة هي الأيام التي تحمل
           * حالة حضور فعلية، بما فيها الغياب.
           */
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
              ? (attendanceDays / recordedDays) * 100
              : 0

          summaryRows.push({
            المعلم: teacherName,
            الدورة: course.name,
            'اسم الطالب': student.name,
            'رقم الطالب': student.studentId ?? '',
            'الرقم الشخصي': student.personalId ?? '',
            'من تاريخ': safeFromDate,
            'إلى تاريخ': safeToDate,
            'عدد أيام الدراسة': lessonDates.length,
            حاضر: counts.present,
            غائب: counts.absent,
            متأخر: counts.late,
            مستأذن: counts.excused,
            'لم يسجل': counts.notRecorded,
            'لم ينضم للدورة': counts.notJoinedCourse,
            'الأيام غير المنضمة': counts.unjoined,
            'الأيام المسجلة': recordedDays,
            'أيام الحضور': attendanceDays,
            'نسبة الحضور': formatPercentage(
              attendancePercentage,
            ),
          })
        }

        /*
         * 6. إنشاء ملف Excel بالورقتين الأصليتين.
         * اتجاه الورقتين من اليمين إلى اليسار.
         */
        const workbook = new ExcelJS.Workbook()

        const detailsSheet = workbook.addWorksheet(
          'تفاصيل الحضور',
          {
            views: [{ rightToLeft: true, showGridLines: true }],
          },
        )

        const summarySheet = workbook.addWorksheet(
          'ملخص الطلاب',
          {
            views: [{ rightToLeft: true, showGridLines: true }],
          },
        )

        detailsSheet.columns = [
          { header: 'المعلم', key: 'المعلم', width: 24 },
          { header: 'الدورة', key: 'الدورة', width: 24 },
          { header: 'اسم الطالب', key: 'اسم الطالب', width: 28 },
          { header: 'رقم الطالب', key: 'رقم الطالب', width: 16 },
          { header: 'الرقم الشخصي', key: 'الرقم الشخصي', width: 18 },
          { header: 'التاريخ', key: 'التاريخ', width: 14 },
          { header: 'اليوم', key: 'اليوم', width: 14 },
          { header: 'الحالة', key: 'الحالة', width: 22 },
          { header: 'ملاحظة', key: 'ملاحظة', width: 30 },
        ]

        summarySheet.columns = [
          { header: 'المعلم', key: 'المعلم', width: 24 },
          { header: 'الدورة', key: 'الدورة', width: 24 },
          { header: 'اسم الطالب', key: 'اسم الطالب', width: 28 },
          { header: 'رقم الطالب', key: 'رقم الطالب', width: 16 },
          { header: 'الرقم الشخصي', key: 'الرقم الشخصي', width: 18 },
          { header: 'من تاريخ', key: 'من تاريخ', width: 14 },
          { header: 'إلى تاريخ', key: 'إلى تاريخ', width: 14 },
          { header: 'عدد أيام الدراسة', key: 'عدد أيام الدراسة', width: 18 },
          { header: 'حاضر', key: 'حاضر', width: 10 },
          { header: 'غائب', key: 'غائب', width: 10 },
          { header: 'متأخر', key: 'متأخر', width: 10 },
          { header: 'مستأذن', key: 'مستأذن', width: 10 },
          { header: 'لم يسجل', key: 'لم يسجل', width: 12 },
          { header: 'لم ينضم للدورة', key: 'لم ينضم للدورة', width: 20 },
          { header: 'الأيام غير المنضمة', key: 'الأيام غير المنضمة', width: 18 },
          { header: 'الأيام المسجلة', key: 'الأيام المسجلة', width: 16 },
          { header: 'أيام الحضور', key: 'أيام الحضور', width: 16 },
          { header: 'نسبة الحضور', key: 'نسبة الحضور', width: 18 },
        ]

        detailsSheet.addRows(detailsRows)
        summarySheet.addRows(summaryRows)

        // تنسيق صف العناوين ومحاذاة النصوص العربية.
        for (const sheet of [detailsSheet, summarySheet]) {
          const headerRow = sheet.getRow(1)
          headerRow.font = { bold: true }
          headerRow.alignment = {
            horizontal: 'right',
            vertical: 'middle',
            wrapText: true,
          }
          headerRow.height = 28

          sheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
              row.alignment = {
                horizontal: 'right',
                vertical: 'middle',
                wrapText: true,
              }
            }
          })
        }

        const safeCourseName =
          course.name
            .replace(/[\\/:*?"<>|]/g, '-')
            .trim() || 'الدورة'

        const fileName =
          `تقرير حضور ${safeCourseName} ${safeFromDate} إلى ${safeToDate}.xlsx`

        const buffer = await workbook.xlsx.writeBuffer()
        const blob = new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')

        link.href = url
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(url)

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
      academicYear?.id,
      academicYear?.startDate,
      assignments,
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
      await buildAndDownloadExcel(fromDate, toDate)

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
                onClick={() => setCustomModalOpen(false)}
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
                    سيتم إنشاء ملف Excel يحتوي
                    على ورقتين:
                    <br />
                    <strong>تفاصيل الحضور</strong>
                    {' '}و{' '}
                    <strong>ملخص الطلاب</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCustomModalOpen(false)}
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
