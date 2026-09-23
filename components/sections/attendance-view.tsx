'use client'

import {
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'

import { supabase } from '@/lib/supabase'

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
  levelId: string
  levelName: string
  enrollmentId: string
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

export type AttendanceStatusName =
  | 'حاضر'
  | 'غائب'
  | 'متأخر'
  | 'مستأذن'

export type AttendanceNotes = Record<
  string,
  string
>

const attendanceStatusNames: AttendanceStatusName[] = [
  'حاضر',
  'غائب',
  'متأخر',
  'مستأذن',
]

function normalizeStatusName(
  name: string,
): AttendanceStatusName | null {
  const normalized = name
    .trim()
    .replace(/\s+/g, ' ')

  if (normalized === 'حاضر') {
    return 'حاضر'
  }

  if (normalized === 'غائب') {
    return 'غائب'
  }

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

  return null
}

export { normalizeStatusName }

function getStatusIdByName(
  statuses: AttendanceStatus[],
  statusName: AttendanceStatusName,
) {
  const status = statuses.find(
    (item) =>
      normalizeStatusName(item.name) ===
      statusName,
  )

  return status?.id ?? null
}

function getStatusName(
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

function getStatusClasses(
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
  }
}

function getAttendancePercentage(
  studentId: string,
  courseId: string,
  attendanceRecords: AttendanceRecord[],
  attendanceStatuses: AttendanceStatus[],
) {
  const studentRecords =
    attendanceRecords.filter(
      (record) =>
        record.studentId === studentId &&
        record.courseId === courseId,
    )

  let attended = 0
  let counted = 0

  studentRecords.forEach((record) => {
    /*
     * مهم:
     * ترتيب الوسائط الصحيح هو:
     *
     * getStatusName(statuses, statusId)
     */
    const status = getStatusName(
      attendanceStatuses,
      record.statusId,
    )

    /*
     * حاضر + متأخر + مستأذن = حضور
     */
    if (
      status === 'حاضر' ||
      status === 'متأخر' ||
      status === 'مستأذن'
    ) {
      attended += 1
      counted += 1
    }

    /*
     * غائب يدخل في الحساب ويخفض النسبة
     */
    if (status === 'غائب') {
      counted += 1
    }

    /*
     * لم يسجل لا يدخل في الحساب
     */
  })

  if (counted === 0) {
    return 0
  }

  return Math.round(
    (attended / counted) * 100,
  )
}

function getPercentageClass(
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

function formatDateForDisplay(
  date: string,
) {
  if (!date) {
    return ''
  }

  const [year, month, day] =
    date.split('-')

  if (!year || !month || !day) {
    return date
  }

  return `${day}/${month}/${year}`
}

/**
 * الحصول على تاريخ اليوم بصيغة YYYY-MM-DD
 * بدون استخدام toISOString حتى لا تحصل مشكلة
 * اختلاف المنطقة الزمنية.
 */
function getTodayString() {
  const today = new Date()

  return [
    today.getFullYear(),
    String(
      today.getMonth() + 1,
    ).padStart(2, '0'),
    String(
      today.getDate(),
    ).padStart(2, '0'),
  ].join('-')
}

/**
 * يرجع رقم يوم الأسبوع:
 *
 * 0 = الأحد
 * 1 = الاثنين
 * 2 = الثلاثاء
 * 3 = الأربعاء
 * 4 = الخميس
 * 5 = الجمعة
 * 6 = السبت
 */
function getDayOfWeek(
  date: string,
) {
  if (!date) {
    return null
  }

  const [year, month, day] =
    date.split('-').map(Number)

  if (
    !year ||
    !month ||
    !day
  ) {
    return null
  }

  return new Date(
    Date.UTC(
      year,
      month - 1,
      day,
    ),
  ).getUTCDay()
}

/**
 * تحويل قيمة اليوم الموجودة في courses.days
 * إلى رقم يوم الأسبوع.
 */
function normalizeCourseDay(
  value: string,
): number | null {
  const normalized = String(
    value ?? '',
  )
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')

  if (!normalized) {
    return null
  }

  if (/^[0-6]$/.test(normalized)) {
    return Number(normalized)
  }

  const dayMap: Record<
    string,
    number
  > = {
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

  return (
    dayMap[normalized] ??
    null
  )
}

/**
 * هل التاريخ المحدد هو أحد أيام الدراسة للدورة؟
 */
function isCourseStudyDay(
  date: string,
  courseDays: string[],
) {
  const dayOfWeek =
    getDayOfWeek(date)

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
      normalizeCourseDay(day) ===
      dayOfWeek,
  )
}

type AttendanceViewProps = {
  currentCourse: Course | null

  assignedStudents: Student[]

  attendanceStatuses: AttendanceStatus[]

  attendanceRecords: AttendanceRecord[]

  setAttendanceRecords: Dispatch<
    SetStateAction<AttendanceRecord[]>
  >

  attendanceNotes: AttendanceNotes

  setAttendanceNotes: Dispatch<
    SetStateAction<AttendanceNotes>
  >

  statusMessage: string

  setStatusMessage: Dispatch<
    SetStateAction<string>
  >

  selectedAttendanceDate: string | null

  setSelectedAttendanceDate: Dispatch<
    SetStateAction<string | null>
  >
}

export function AttendanceView({
  currentCourse,
  assignedStudents,
  attendanceStatuses,
  attendanceRecords,
  setAttendanceRecords,
  attendanceNotes,
  setAttendanceNotes,
  statusMessage,
  setStatusMessage,
  selectedAttendanceDate,
  setSelectedAttendanceDate,
}: AttendanceViewProps) {
  const [
    savingKey,
    setSavingKey,
  ] = useState<string | null>(null)

  const [
    savingNoteKey,
    setSavingNoteKey,
  ] = useState<string | null>(null)

  const [
    editingStatusKey,
    setEditingStatusKey,
  ] = useState<string | null>(null)

  const [
    localStatuses,
    setLocalStatuses,
  ] = useState<
    Record<string, AttendanceStatusName>
  >({})

  const [
    searchTerm,
    setSearchTerm,
  ] = useState('')

  /*
   * التاريخ الافتراضي هو تاريخ اليوم.
   */
  const todayString =
    getTodayString()

  const activeDate =
    selectedAttendanceDate ||
    todayString

  /*
   * تحديد حالة التاريخ.
   */
  const dateState = useMemo(() => {
    if (!currentCourse) {
      return 'no-course' as const
    }

    const startDate =
      currentCourse.startDate

    const endDate =
      currentCourse.endDate

    if (
      startDate &&
      activeDate < startDate
    ) {
      return 'before-course' as const
    }

    if (
      endDate &&
      activeDate > endDate
    ) {
      return 'after-course' as const
    }

    if (
      !isCourseStudyDay(
        activeDate,
        currentCourse.days,
      )
    ) {
      return 'no-lesson' as const
    }

    if (activeDate > todayString) {
      return 'future-lesson' as const
    }

    return 'valid' as const
  }, [
    activeDate,
    currentCourse,
    todayString,
  ])

  const isAttendanceAvailable =
    dateState === 'valid'

  const getRecordForStudent = (
    studentId: string,
    date: string,
  ) => {
    if (!currentCourse) {
      return undefined
    }

    return attendanceRecords.find(
      (record) =>
        record.studentId ===
          studentId &&
        record.courseId ===
          currentCourse.id &&
        record.attendanceDate ===
          date,
    )
  }

  const getStudentStatus = (
    studentId: string,
    date: string,
  ) => {
    const key = `${date}:${studentId}`

    if (localStatuses[key]) {
      return localStatuses[key]
    }

    const record =
      getRecordForStudent(
        studentId,
        date,
      )

    return getStatusName(
      attendanceStatuses,
      record?.statusId,
    )
  }

  const attendancePercentages =
    useMemo(() => {
      if (!currentCourse) {
        return {}
      }

      const result: Record<
        string,
        number
      > = {}

      for (const student of assignedStudents) {
        result[student.id] =
          getAttendancePercentage(
            student.id,
            currentCourse.id,
            attendanceRecords,
            attendanceStatuses,
          )
      }

      return result
    }, [
      assignedStudents,
      attendanceRecords,
      attendanceStatuses,
      currentCourse,
    ])

  const filteredStudents =
    assignedStudents.filter(
      (student) => {
        if (!searchTerm.trim()) {
          return true
        }

        const search =
          searchTerm
            .trim()
            .toLowerCase()

        return (
          student.name
            .toLowerCase()
            .includes(search) ||
          student.studentId
            .toLowerCase()
            .includes(search) ||
          student.personalId
            .toLowerCase()
            .includes(search)
        )
      },
    )

  /**
   * حفظ حالة الحضور.
   */
  const saveAttendance = async (
    student: Student,
    date: string,
    statusName: AttendanceStatusName,
  ) => {
    if (!currentCourse) {
      return
    }

    if (
      !isAttendanceAvailable ||
      date !== activeDate
    ) {
      setStatusMessage(
        'لا يمكن تسجيل الحضور في هذا اليوم.',
      )
      return
    }

    const statusId =
      getStatusIdByName(
        attendanceStatuses,
        statusName,
      )

    if (!statusId) {
      setStatusMessage(
        `لم يتم العثور على حالة "${statusName}" في قاعدة البيانات.`,
      )
      return
    }

    const key = `${date}:${student.id}`

    if (savingKey === key) {
      return
    }

    const existing =
      getRecordForStudent(
        student.id,
        date,
      )

    const previousRecords =
      attendanceRecords

    const previousLocalStatus =
      localStatuses[key]

    setSavingKey(key)

    setLocalStatuses(
      (current) => ({
        ...current,
        [key]: statusName,
      }),
    )

    setEditingStatusKey(null)

    const optimisticRecord: AttendanceRecord =
      {
        id:
          existing?.id ??
          `temp-${Date.now()}`,
        studentId: student.id,
        enrollmentId:
          student.enrollmentId ||
          null,
        courseId: currentCourse.id,
        attendanceDate: date,
        statusId,
        note:
          existing?.note ??
          attendanceNotes[key] ??
          '',
      }

    setAttendanceRecords(
      (records) => {
        const existingIndex =
          records.findIndex(
            (record) =>
              record.studentId ===
                student.id &&
              record.courseId ===
                currentCourse.id &&
              record.attendanceDate ===
                date,
          )

        if (existingIndex === -1) {
          return [
            ...records,
            optimisticRecord,
          ]
        }

        return records.map(
          (record, index) =>
            index === existingIndex
              ? {
                  ...record,
                  statusId,
                  enrollmentId:
                    student.enrollmentId ||
                    record.enrollmentId ||
                    null,
                  note:
                    attendanceNotes[key] ??
                    record.note ??
                    '',
                }
              : record,
        )
      },
    )

    try {
      if (existing) {
        const {
          data,
          error,
        } = await supabase
          .from('attendance')
          .update({
            status_id: statusId,
            enrollment_id:
              student.enrollmentId ||
              null,
            note:
              attendanceNotes[key] ??
              existing.note ??
              null,
          })
          .eq('id', existing.id)
          .select(
            'id, student_id, enrollment_id, attendance_date, status_id, note, course_id',
          )
          .single()

        if (error) {
          throw error
        }

        if (data) {
          const savedRecord: AttendanceRecord =
            {
              id: data.id,
              studentId:
                data.student_id,
              enrollmentId:
                data.enrollment_id ??
                null,
              courseId:
                data.course_id,
              attendanceDate:
                data.attendance_date,
              statusId:
                data.status_id,
              note:
                data.note ?? '',
            }

          setAttendanceRecords(
            (records) =>
              records.map(
                (record) =>
                  record.id ===
                  existing.id
                    ? savedRecord
                    : record,
              ),
          )
        }
      } else {
        const {
          data,
          error,
        } = await supabase
          .from('attendance')
          .insert({
            student_id:
              student.id,
            enrollment_id:
              student.enrollmentId ||
              null,
            attendance_date: date,
            status_id: statusId,
            note:
              attendanceNotes[key] ||
              null,
            course_id:
              currentCourse.id,
          })
          .select(
            'id, student_id, enrollment_id, attendance_date, status_id, note, course_id',
          )
          .single()

        if (error) {
          throw error
        }

        if (data) {
          const savedRecord: AttendanceRecord =
            {
              id: data.id,
              studentId:
                data.student_id,
              enrollmentId:
                data.enrollment_id ??
                null,
              courseId:
                data.course_id,
              attendanceDate:
                data.attendance_date,
              statusId:
                data.status_id,
              note:
                data.note ?? '',
            }

          setAttendanceRecords(
            (records) =>
              records.map(
                (record) =>
                  record.id ===
                  optimisticRecord.id
                    ? savedRecord
                    : record,
              ),
          )
        }
      }

      setStatusMessage(
        `تم حفظ حالة ${student.name}: ${statusName}`,
      )
    } catch (error: any) {
      setAttendanceRecords(
        previousRecords,
      )

      setLocalStatuses(
        (current) => {
          const next = {
            ...current,
          }

          if (previousLocalStatus) {
            next[key] =
              previousLocalStatus
          } else {
            delete next[key]
          }

          return next
        },
      )

      setStatusMessage(
        `تعذر حفظ الحضور: ${
          error?.message ||
          'خطأ غير معروف'
        }`,
      )
    } finally {
      setSavingKey(null)
    }
  }

  /**
   * حفظ ملاحظة المعلم.
   *
   * إذا كان هناك سجل حضور:
   * يتم حفظها مباشرة في Supabase.
   *
   * إذا لم يوجد سجل حضور:
   * تبقى محليًا حتى يختار المعلم حالة
   * الحضور، ثم تحفظ مع سجل الحضور.
   */
  const saveNote = async (
    student: Student,
    date: string,
    value: string,
  ) => {
    const key = `${date}:${student.id}`

    const cleanValue =
      value.trim()

    setAttendanceNotes(
      (current) => ({
        ...current,
        [key]: value,
      }),
    )

    const existing =
      getRecordForStudent(
        student.id,
        date,
      )

    /*
     * إذا لم يوجد سجل حضور،
     * نخزن الملاحظة محليًا فقط.
     */
    if (!existing) {
      return
    }

    if (
      !isCourseStudyDay(
        date,
        currentCourse?.days ?? [],
      )
    ) {
      return
    }

    if (savingNoteKey === key) {
      return
    }

    setSavingNoteKey(key)

    try {
      const {
        data,
        error,
      } = await supabase
        .from('attendance')
        .update({
          note:
            cleanValue || null,
        })
        .eq('id', existing.id)
        .select(
          'id, student_id, enrollment_id, attendance_date, status_id, note, course_id',
        )
        .single()

      if (error) {
        throw error
      }

      if (data) {
        const updatedRecord: AttendanceRecord =
          {
            id: data.id,
            studentId:
              data.student_id,
            enrollmentId:
              data.enrollment_id ??
              null,
            courseId:
              data.course_id,
            attendanceDate:
              data.attendance_date,
            statusId:
              data.status_id,
            note:
              data.note ?? '',
          }

        setAttendanceRecords(
          (records) =>
            records.map(
              (record) =>
                record.id ===
                existing.id
                  ? updatedRecord
                  : record,
            ),
        )
      }

      setStatusMessage(
        `تم حفظ ملاحظة ${student.name}`,
      )
    } catch (error: any) {
      setStatusMessage(
        `تعذر حفظ الملاحظة: ${
          error?.message ||
          'خطأ غير معروف'
        }`,
      )
    } finally {
      setSavingNoteKey(null)
    }
  }

  if (!currentCourse) {
    return (
      <div
        dir="rtl"
        className="rounded-xl border border-dashed p-10 text-center"
      >
        <h3 className="text-lg font-semibold">
          لا توجد دورة حالية
        </h3>

        <p className="mt-2 text-sm text-muted-foreground">
          لم يتم اختيار دورة للحضور.
        </p>
      </div>
    )
  }

  return (
    <div
      dir="rtl"
      className="space-y-5"
    >
      {/* العنوان والتاريخ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">
            الحضور والغياب
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            {currentCourse.name}
          </p>
        </div>

        <input
          type="date"
          value={activeDate}
          onChange={(event) => {
            const nextDate =
              event.target.value

            setSelectedAttendanceDate(
              nextDate || null,
            )

            setEditingStatusKey(null)
          }}
          className="h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* حالة التاريخ */}
      {dateState ===
        'before-course' && (
        <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center">
          <h3 className="text-lg font-semibold">
            الدورة لم تبدأ بعد
          </h3>

          <p className="mt-2 text-sm text-muted-foreground">
            التاريخ المحدد:{' '}
            {formatDateForDisplay(
              activeDate,
            )}
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            تبدأ الدورة في{' '}
            {formatDateForDisplay(
              currentCourse.startDate,
            )}
          </p>
        </div>
      )}

      {dateState ===
        'after-course' && (
        <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center">
          <h3 className="text-lg font-semibold">
            انتهت الدورة
          </h3>

          <p className="mt-2 text-sm text-muted-foreground">
            التاريخ المحدد:{' '}
            {formatDateForDisplay(
              activeDate,
            )}
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            انتهت الدورة في{' '}
            {formatDateForDisplay(
              currentCourse.endDate,
            )}
          </p>
        </div>
      )}

      {dateState ===
        'no-lesson' && (
        <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center">
          <h3 className="text-lg font-semibold">
            لا يوجد درس في هذا اليوم
          </h3>

          <p className="mt-2 text-sm text-muted-foreground">
            التاريخ المحدد:{' '}
            {formatDateForDisplay(
              activeDate,
            )}
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            هذا اليوم ليس من أيام الدراسة المحددة للدورة.
          </p>
        </div>
      )}

      {dateState ===
        'future-lesson' && (
        <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center">
          <h3 className="text-lg font-semibold">
            الدرس لم يبدأ بعد
          </h3>

          <p className="mt-2 text-sm text-muted-foreground">
            التاريخ المحدد:{' '}
            {formatDateForDisplay(
              activeDate,
            )}
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            يمكنك الرجوع إلى الأيام السابقة لمشاهدة أرشيف الحضور.
          </p>
        </div>
      )}

      {/* رسالة الحفظ */}
      {statusMessage &&
        isAttendanceAvailable && (
        <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
          {statusMessage}
        </div>
      )}

      {/* محتوى الحضور */}
      {isAttendanceAvailable && (
        <>
          {/* البحث */}
          <input
            type="text"
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(
                event.target.value,
              )
            }
            placeholder="بحث عن طالب..."
            className="h-10 w-full max-w-md rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />

          {/* قائمة الطلبة */}
          <div className="space-y-4">
            {filteredStudents.length ===
            0 ? (
              <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                لا يوجد طلبة.
              </div>
            ) : (
              filteredStudents.map(
                (student) => {
                  const key = `${activeDate}:${student.id}`

                  const record =
                    getRecordForStudent(
                      student.id,
                      activeDate,
                    )

                  const status =
                    getStudentStatus(
                      student.id,
                      activeDate,
                    )

                  const note =
                    record?.note ??
                    attendanceNotes[key] ??
                    ''

                  const percentage =
                    attendancePercentages[
                      student.id
                    ] ?? 0

                  const saving =
                    savingKey === key

                  const savingNote =
                    savingNoteKey === key

                  const editing =
                    editingStatusKey === key

                  /*
                   * لم يتم اختيار حالة بعد
                   */
                  if (
                    !status ||
                    editing
                  ) {
                    return (
                      <div
                        key={student.id}
                        className="rounded-xl border bg-card p-4"
                      >
                        <div className="space-y-4">
                          {/* اسم الطالب */}
                          <div>
                            <div className="font-semibold">
                              {
                                student.name
                              }
                            </div>

                            {student.levelName && (
                              <div className="mt-0.5 text-xs text-muted-foreground">
                                {
                                  student.levelName
                                }
                              </div>
                            )}
                          </div>

                          {/* حالات الحضور */}
                          <div>
                            <div className="mb-2 text-xs font-medium text-muted-foreground">
                              حالة الحضور
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {attendanceStatusNames.map(
                                (
                                  statusName,
                                ) => {
                                  const styles =
                                    getStatusClasses(
                                      statusName,
                                    )

                                  return (
                                    <button
                                      key={
                                        statusName
                                      }
                                      type="button"
                                      disabled={
                                        saving
                                      }
                                      onClick={() =>
                                        saveAttendance(
                                          student,
                                          activeDate,
                                          statusName,
                                        )
                                      }
                                      className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${styles.normal} ${
                                        saving
                                          ? 'cursor-not-allowed opacity-50'
                                          : ''
                                      }`}
                                    >
                                      {
                                        statusName
                                      }
                                    </button>
                                  )
                                },
                              )}
                            </div>
                          </div>

                          {/* ملاحظات المعلم */}
                          <div>
                            <label className="mb-2 block text-xs font-medium text-muted-foreground">
                              ملاحظات المعلم
                            </label>

                            <textarea
                              value={note}
                              onChange={(
                                event,
                              ) =>
                                setAttendanceNotes(
                                  (current) => ({
                                    ...current,
                                    [key]:
                                      event
                                        .target
                                        .value,
                                  }),
                                )
                              }
                              placeholder="اكتب ملاحظة عن الطالب..."
                              rows={3}
                              className="w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                            />

                            <p className="mt-1 text-xs text-muted-foreground">
                              سيتم حفظ الملاحظة عند اختيار حالة الحضور.
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  }

                  /*
                   * تم اختيار الحالة
                   */
                  const selectedStyles =
                    getStatusClasses(
                      status,
                    )

                  return (
                    <div
                      key={student.id}
                      className="rounded-xl border bg-card px-4 py-4"
                    >
                      <div className="space-y-4">
                        {/* الصف العلوي */}
                        <div className="flex w-full flex-col gap-3 xl:flex-row xl:items-center">
                          {/* اسم الطالب */}
                          <div className="min-w-0 xl:flex-1">
                            <div className="font-semibold">
                              {
                                student.name
                              }
                            </div>

                            {student.levelName && (
                              <div className="mt-0.5 text-xs text-muted-foreground">
                                {
                                  student.levelName
                                }
                              </div>
                            )}
                          </div>

                          {/* الحالة */}
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                              setEditingStatusKey(
                                key,
                              )
                            }
                            className={`h-10 shrink-0 rounded-lg border px-5 text-sm font-medium transition ${selectedStyles.selected} ${
                              saving
                                ? 'cursor-not-allowed opacity-50'
                                : 'cursor-pointer'
                            }`}
                          >
                            {status}
                          </button>

                          {/* نسبة الحضور */}
                          <div className="flex h-10 shrink-0 items-center justify-center rounded-lg bg-muted/50 px-5">
                            <span
                              className={`text-sm font-bold ${getPercentageClass(
                                percentage,
                              )}`}
                            >
                              {percentage}%
                            </span>
                          </div>
                        </div>

                        {/* ملاحظات المعلم */}
                        <div>
                          <label className="mb-2 block text-xs font-medium text-muted-foreground">
                            ملاحظات المعلم
                          </label>

                          <textarea
                            value={note}
                            onChange={(
                              event,
                            ) =>
                              setAttendanceNotes(
                                (current) => ({
                                  ...current,
                                  [key]:
                                    event
                                      .target
                                      .value,
                                }),
                              )
                            }
                            onBlur={(event) =>
                              saveNote(
                                student,
                                activeDate,
                                event.target
                                  .value,
                              )
                            }
                            placeholder="اكتب ملاحظة أو تعليق عن الطالب..."
                            rows={3}
                            disabled={
                              savingNote
                            }
                            className="w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-wait disabled:opacity-60"
                          />

                          <div className="mt-1 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              اضغط خارج الخانة لحفظ الملاحظة
                            </span>

                            {savingNote && (
                              <span className="text-xs text-muted-foreground">
                                جارٍ الحفظ...
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                },
              )
            )}
          </div>
        </>
      )}

      {/* فترة الدورة */}
      <p className="text-xs text-muted-foreground">
        فترة الدورة:{' '}
        {formatDateForDisplay(
          currentCourse.startDate,
        )}{' '}
        —{' '}
        {formatDateForDisplay(
          currentCourse.endDate,
        )}
      </p>
    </div>
  )
}