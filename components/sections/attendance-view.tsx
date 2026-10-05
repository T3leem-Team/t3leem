'use client'

import {
  useEffect,
  useMemo,
  useRef,
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

const attendanceStatusNames: TeacherAttendanceStatus[] = [
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

export { normalizeStatusName }

function getStatusIdByName(
  statuses: AttendanceStatus[],
  statusName: TeacherAttendanceStatus,
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

    case 'غير منضم':
      return {
        normal:
          'border-gray-400 bg-gray-50 text-gray-600 dark:bg-gray-950/30 dark:text-gray-400',
        selected:
          'border-gray-500 bg-gray-100 text-gray-700 dark:bg-gray-950/50 dark:text-gray-300',
      }
  }
}

function getAttendancePercentage(
  studentId: string,
  courseId: string,
  attendanceRecords: AttendanceRecord[],
  attendanceStatuses: AttendanceStatus[],
  cancelledDates: Set<string>,
) {
  const studentRecords =
    attendanceRecords.filter(
      (record) =>
        record.studentId === studentId &&
        record.courseId === courseId &&
        !cancelledDates.has(
          record.attendanceDate,
        ),
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

  const [
    isDayCancelled,
    setIsDayCancelled,
  ] = useState(false)

  const [
    isLessonCancelled,
    setIsLessonCancelled,
  ] = useState(false)

  const [
    isCheckingCancellation,
    setIsCheckingCancellation,
  ] = useState(false)

  const [
    cancelledDates,
    setCancelledDates,
  ] = useState<Set<string>>(
    () => new Set(),
  )

  const [
    showUnrecordedOnly,
    setShowUnrecordedOnly,
  ] = useState(false)

  const [
    showBulkStatusMenu,
    setShowBulkStatusMenu,
  ] = useState(false)

  const [
    isBulkSaving,
    setIsBulkSaving,
  ] = useState(false)

  const studentCardRefs =
    useRef<
      Record<
        string,
        HTMLDivElement | null
      >
    >({})

  const todayString =
    getTodayString()

  const activeDate =
    selectedAttendanceDate ||
    todayString

  const isCancelled =
    isDayCancelled ||
    isLessonCancelled

  useEffect(() => {
    if (!currentCourse) {
      setCancelledDates(new Set())
      return
    }

    let cancelled = false

    const loadCancelledDates =
      async () => {
        const {
          data,
          error,
        } = await supabase
          .from('supervision_records')
          .select(
            'record_date, type',
          )
          .eq(
            'course_id',
            currentCourse.id,
          )
          .in('type', [
            'day_cancelled',
            'lesson_cancelled',
          ])

        if (cancelled) {
          return
        }

        if (error) {
          setCancelledDates(
            new Set(),
          )
          return
        }

        const dates = new Set<string>()

        for (const record of
          data ?? []) {
          if (
            record.record_date
          ) {
            dates.add(
              record.record_date,
            )
          }
        }

        setCancelledDates(dates)
      }

    void loadCancelledDates()

    return () => {
      cancelled = true
    }
  }, [currentCourse?.id])

  useEffect(() => {
    if (!currentCourse || !activeDate) {
      setIsDayCancelled(false)
      setIsLessonCancelled(false)
      setIsCheckingCancellation(false)
      return
    }

    let cancelled = false

    const checkCancellation =
      async () => {
        setIsCheckingCancellation(
          true,
        )

        const {
          data,
          error,
        } = await supabase
          .from('supervision_records')
          .select('id, type')
          .eq(
            'course_id',
            currentCourse.id,
          )
          .eq(
            'record_date',
            activeDate,
          )
          .in('type', [
            'day_cancelled',
            'lesson_cancelled',
          ])

        if (cancelled) {
          return
        }

        if (error) {
          setIsDayCancelled(false)
          setIsLessonCancelled(false)
        } else {
          setIsDayCancelled(
            (data ?? []).some(
              (record) =>
                record.type ===
                'day_cancelled',
            ),
          )

          setIsLessonCancelled(
            (data ?? []).some(
              (record) =>
                record.type ===
                'lesson_cancelled',
            ),
          )
        }

        setIsCheckingCancellation(
          false,
        )
      }

    void checkCancellation()

    return () => {
      cancelled = true
    }
  }, [
    currentCourse?.id,
    activeDate,
  ])

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

    if (isCancelled) {
      return 'cancelled' as const
    }

    if (activeDate > todayString) {
      return 'future-lesson' as const
    }

    return 'valid' as const
  }, [
    activeDate,
    currentCourse,
    todayString,
    isCancelled,
  ])

  const isAttendanceAvailable =
    dateState === 'valid' &&
    !isCheckingCancellation

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

  const isStudentEligibleForAttendance = (
    student: Student,
    date: string,
  ) => {
    if (!student.joinDate) {
      return true
    }

    return date >= student.joinDate
  }

  const attendanceSummary =
    useMemo(() => {
      let recorded = 0
      let total = 0

      for (const student of assignedStudents) {
        if (
          !isStudentEligibleForAttendance(
            student,
            activeDate,
          )
        ) {
          continue
        }

        const status =
          getStudentStatus(
            student.id,
            activeDate,
          )

        if (status === 'غير منضم') {
          continue
        }

        total += 1

        if (status) {
          recorded += 1
        }
      }

      const unrecorded =
        Math.max(
          total - recorded,
          0,
        )

      return {
        total,
        recorded,
        unrecorded,
        allRecorded:
          total > 0 &&
          unrecorded === 0,
      }
    }, [
      assignedStudents,
      activeDate,
      attendanceRecords,
      attendanceStatuses,
      localStatuses,
    ])

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
            cancelledDates,
          )
      }

      return result
    }, [
      assignedStudents,
      attendanceRecords,
      attendanceStatuses,
      currentCourse,
      cancelledDates,
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

  const displayedStudents =
    showUnrecordedOnly
      ? filteredStudents.filter(
          (student) =>
            isStudentEligibleForAttendance(
              student,
              activeDate,
            ) &&
            !getStudentStatus(
              student.id,
              activeDate,
            ),
        )
      : filteredStudents

  const moveToNextStudent =
    (
      currentStudentId: string,
      savedStudentName: string,
      savedStatus: TeacherAttendanceStatus,
    ) => {
      const currentIndex =
        displayedStudents.findIndex(
          (student) =>
            student.id ===
            currentStudentId,
        )

      const nextStudent =
        currentIndex >= 0
          ? displayedStudents[
              currentIndex + 1
            ]
          : undefined

      const eligibleStudents =
        assignedStudents.filter(
          (student) =>
            isStudentEligibleForAttendance(
              student,
              activeDate,
            ),
        )

      const allStudentsRecorded =
        eligibleStudents.every(
          (student) => {
            if (
              student.id ===
              currentStudentId
            ) {
              return true
            }

            const status =
              getStudentStatus(
                student.id,
                activeDate,
              )

            return (
              !!status &&
              status !== 'غير منضم'
            )
          },
        )

      if (!nextStudent) {
        if (allStudentsRecorded) {
          setStatusMessage(
            `✓ اكتمل تسجيل الحضور — ${eligibleStudents.length} من ${eligibleStudents.length} طالب`,
          )
        } else {
          setStatusMessage(
            `✓ تم تسجيل ${savedStatus} للطالب ${savedStudentName}`,
          )
        }

        return
      }

      setStatusMessage(
        `✓ تم تسجيل ${savedStatus} — التالي: ${nextStudent.name}`,
      )

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const element =
            studentCardRefs.current[
              nextStudent.id
            ]

          if (element) {
            element.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            })
          }
        })
      })
    }

  const checkCancellationBeforeSave =
    async (
      date: string,
    ) => {
      if (!currentCourse) {
        return false
      }

      const {
        data,
        error,
      } = await supabase
        .from('supervision_records')
        .select('id, type')
        .eq(
          'course_id',
          currentCourse.id,
        )
        .eq(
          'record_date',
          date,
        )
        .in('type', [
          'day_cancelled',
          'lesson_cancelled',
        ])
        .limit(1)
        .maybeSingle()

      if (error) {
        throw error
      }

      return !!data
    }

  const saveAttendance = async (
    student: Student,
    date: string,
    statusName: TeacherAttendanceStatus,
  ) => {
    if (!currentCourse) {
      return
    }

    if (
      isCancelled ||
      !isAttendanceAvailable ||
      date !== activeDate
    ) {
      setStatusMessage(
        isCancelled
          ? 'هذا اليوم أو الدرس ملغي ولا يمكن تسجيل الحضور فيه.'
          : 'لا يمكن تسجيل الحضور في هذا اليوم.',
      )
      return
    }

    if (
      !isStudentEligibleForAttendance(
        student,
        date,
      )
    ) {
      setStatusMessage(
        'هذا الطالب لم يكن منضمًا في تاريخ الحضور المحدد.',
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

    if (
      savingKey === key ||
      isBulkSaving
    ) {
      return
    }

    const existing =
      getRecordForStudent(
        student.id,
        date,
      )

    const existingStatus = existing
      ? getStatusName(
          attendanceStatuses,
          existing.statusId,
        )
      : null

    if (
      existingStatus ===
      'غير منضم'
    ) {
      setStatusMessage(
        'لا يمكن تغيير حالة "غير منضم" من شاشة المعلم.',
      )
      return
    }

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
      const isCancelledNow =
        await checkCancellationBeforeSave(
          date,
        )

      if (isCancelledNow) {
        throw new Error(
          'هذا اليوم أو الدرس ملغي ولا يمكن تسجيل الحضور فيه.',
        )
      }

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

      moveToNextStudent(
        student.id,
        student.name,
        statusName,
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

  const saveAllAttendance =
    async (
      statusName: TeacherAttendanceStatus,
    ) => {
      if (!currentCourse) {
        return
      }

      if (
        isCancelled ||
        !isAttendanceAvailable ||
        (
          activeDate !==
            selectedAttendanceDate &&
          selectedAttendanceDate !==
            null
        )
      ) {
        setStatusMessage(
          isCancelled
            ? 'هذا اليوم أو الدرس ملغي ولا يمكن تسجيل الحضور فيه.'
            : 'لا يمكن تسجيل الحضور في هذا اليوم.',
        )
        return
      }

      const eligibleStudents =
        assignedStudents.filter(
          (student) =>
            isStudentEligibleForAttendance(
              student,
              activeDate,
            ),
        )

      if (
        eligibleStudents.length ===
        0
      ) {
        setStatusMessage(
          'لا يوجد طلاب مستحقون لتسجيل الحضور في هذا التاريخ.',
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

      if (isBulkSaving) {
        return
      }

      setIsBulkSaving(true)
      setShowBulkStatusMenu(false)
      setEditingStatusKey(null)

      try {
        const isCancelledNow =
          await checkCancellationBeforeSave(
            activeDate,
          )

        if (isCancelledNow) {
          throw new Error(
            'هذا اليوم أو الدرس ملغي ولا يمكن تسجيل الحضور فيه.',
          )
        }

        const {
          data: existingData,
          error: existingError,
        } = await supabase
          .from('attendance')
          .select(
            'id, student_id, enrollment_id, attendance_date, status_id, note, course_id',
          )
          .eq(
            'course_id',
            currentCourse.id,
          )
          .eq(
            'attendance_date',
            activeDate,
          )

        if (existingError) {
          throw existingError
        }

        const existingByStudent =
          new Map<
            string,
            AttendanceRecord
          >()

        for (const row of
          existingData ?? []) {
          existingByStudent.set(
            row.student_id,
            {
              id: row.id,
              studentId:
                row.student_id,
              enrollmentId:
                row.enrollment_id ??
                null,
              courseId:
                row.course_id,
              attendanceDate:
                row.attendance_date,
              statusId:
                row.status_id,
              note:
                row.note ?? '',
            },
          )
        }

        const savedRecords: AttendanceRecord[] =
          []

        const modifiedStudentIds =
          new Set<string>()

        for (const student of
          eligibleStudents) {
          const existing =
            existingByStudent.get(
              student.id,
            )

          if (existing) {
            const existingStatus =
              getStatusName(
                attendanceStatuses,
                existing.statusId,
              )

            if (
              existingStatus ===
              'غير منضم'
            ) {
              continue
            }
          }

          const key = `${activeDate}:${student.id}`

          modifiedStudentIds.add(
            student.id,
          )

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
              .eq(
                'id',
                existing.id,
              )
              .select(
                'id, student_id, enrollment_id, attendance_date, status_id, note, course_id',
              )
              .single()

            if (error) {
              throw new Error(
                `تعذر حفظ ${student.name}: ${error.message}`,
              )
            }

            if (data) {
              savedRecords.push({
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
              })
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
                attendance_date:
                  activeDate,
                status_id:
                  statusId,
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
              throw new Error(
                `تعذر حفظ ${student.name}: ${error.message}`,
              )
            }

            if (data) {
              savedRecords.push({
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
              })
            }
          }
        }

        setLocalStatuses(
          (current) => {
            const next = {
              ...current,
            }

            for (const student of
              eligibleStudents) {
              if (
                !modifiedStudentIds.has(
                  student.id,
                )
              ) {
                continue
              }

              next[
                `${activeDate}:${student.id}`
              ] = statusName
            }

            return next
          },
        )

        setAttendanceRecords(
          (records) => {
            const untouched =
              records.filter(
                (record) =>
                  !(
                    record.courseId ===
                      currentCourse.id &&
                    record.attendanceDate ===
                      activeDate &&
                    modifiedStudentIds.has(
                      record.studentId,
                    )
                  ),
              )

            return [
              ...untouched,
              ...savedRecords,
            ]
          },
        )

        const {
          data: verificationData,
          error: verificationError,
        } = await supabase
          .from('attendance')
          .select(
            'student_id, status_id',
          )
          .eq(
            'course_id',
            currentCourse.id,
          )
          .eq(
            'attendance_date',
            activeDate,
          )

        if (verificationError) {
          throw verificationError
        }

        const verifiedStudentIds =
          new Set(
            (verificationData ?? []).map(
              (row) =>
                row.student_id,
            ),
          )

        const verifiedCount =
          eligibleStudents.filter(
            (student) =>
              verifiedStudentIds.has(
                student.id,
              ),
          ).length

        if (
          verifiedCount !==
          eligibleStudents.length
        ) {
          const remaining =
            eligibleStudents.length -
            verifiedCount

          setStatusMessage(
            `لم يكتمل التسجيل — باقي ${remaining} من ${eligibleStudents.length} طالب.`,
          )

          return
        }

        setStatusMessage(
          `✓ اكتمل تسجيل الحضور — ${eligibleStudents.length} من ${eligibleStudents.length} طالب`,
        )
      } catch (error: any) {
        const {
          data: refreshedData,
        } = await supabase
          .from('attendance')
          .select(
            'id, student_id, enrollment_id, attendance_date, status_id, note, course_id',
          )
          .eq(
            'course_id',
            currentCourse.id,
          )
          .eq(
            'attendance_date',
            activeDate,
          )

        const refreshedRecords: AttendanceRecord[] =
          (refreshedData ?? []).map(
            (row) => ({
              id: row.id,
              studentId:
                row.student_id,
              enrollmentId:
                row.enrollment_id ??
                null,
              courseId:
                row.course_id,
              attendanceDate:
                row.attendance_date,
              statusId:
                row.status_id,
              note:
                row.note ?? '',
            }),
          )

        setAttendanceRecords(
          (records) => [
            ...records.filter(
              (record) =>
                !(
                  record.courseId ===
                    currentCourse.id &&
                  record.attendanceDate ===
                    activeDate
                ),
            ),
            ...refreshedRecords,
          ],
        )

        setLocalStatuses(
          (current) => {
            const next = {
              ...current,
            }

            for (const student of
              assignedStudents) {
              const record =
                refreshedRecords.find(
                  (item) =>
                    item.studentId ===
                    student.id,
                )

              const status =
                getStatusName(
                  attendanceStatuses,
                  record?.statusId,
                )

              const key = `${activeDate}:${student.id}`

              if (status) {
                next[key] = status
              } else {
                delete next[key]
              }
            }

            return next
          },
        )

        setStatusMessage(
          error?.message ||
            'تعذر إكمال تسجيل جميع الطلاب.',
        )
      } finally {
        setIsBulkSaving(false)
      }
    }

  const clearAttendance = async (
    student: Student,
    date: string,
  ) => {
    if (!currentCourse) {
      return
    }

    if (
      isCancelled ||
      !isAttendanceAvailable ||
      date !== activeDate
    ) {
      setStatusMessage(
        isCancelled
          ? 'هذا اليوم أو الدرس ملغي ولا يمكن تعديل الحضور فيه.'
          : 'لا يمكن تعديل الحضور في هذا اليوم.',
      )
      return
    }

    const existing =
      getRecordForStudent(
        student.id,
        date,
      )

    if (!existing) {
      return
    }

    const existingStatus =
      getStatusName(
        attendanceStatuses,
        existing.statusId,
      )

    if (
      existingStatus ===
      'غير منضم'
    ) {
      setStatusMessage(
        'لا يمكن حذف حالة "غير منضم" لأنها حالة نظامية تلقائية.',
      )
      return
    }

    const key = `${date}:${student.id}`

    if (
      savingKey === key ||
      isBulkSaving
    ) {
      return
    }

    const previousRecords =
      attendanceRecords

    const previousLocalStatus =
      localStatuses[key]

    setSavingKey(key)

    setAttendanceRecords(
      (records) =>
        records.filter(
          (record) =>
            record.id !==
            existing.id,
        ),
    )

    setLocalStatuses(
      (current) => {
        const next = {
          ...current,
        }

        delete next[key]

        return next
      },
    )

    setEditingStatusKey(null)

    try {
      const isCancelledNow =
        await checkCancellationBeforeSave(
          date,
        )

      if (isCancelledNow) {
        throw new Error(
          'هذا اليوم أو الدرس ملغي ولا يمكن تعديل الحضور فيه.',
        )
      }

      const {
        error,
      } = await supabase
        .from('attendance')
        .delete()
        .eq('id', existing.id)

      if (error) {
        throw error
      }

      setStatusMessage(
        `تم إلغاء تسجيل حضور ${student.name}`,
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
          }

          return next
        },
      )

      setStatusMessage(
        `تعذر إلغاء الحضور: ${
          error?.message ||
          'خطأ غير معروف'
        }`,
      )
    } finally {
      setSavingKey(null)
    }
  }

  const saveNote = async (
    student: Student,
    date: string,
    value: string,
  ) => {
    const key = `${date}:${student.id}`

    setAttendanceNotes(
      (current) => ({
        ...current,
        [key]: value,
      }),
    )

    if (isCancelled) {
      return
    }

    const existing =
      getRecordForStudent(
        student.id,
        date,
      )

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

    if (
      (existing.note ?? '') ===
      value
    ) {
      return
    }

    if (
      savingNoteKey === key
    ) {
      return
    }

    setSavingNoteKey(key)

    try {
      const isCancelledNow =
        await checkCancellationBeforeSave(
          date,
        )

      if (isCancelledNow) {
        throw new Error(
          'هذا اليوم أو الدرس ملغي ولا يمكن تعديل ملاحظاته.',
        )
      }

      const {
        data,
        error,
      } = await supabase
        .from('attendance')
        .update({
          note:
            value.trim() || null,
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
            setShowUnrecordedOnly(false)
            setShowBulkStatusMenu(false)
            setStatusMessage('')
          }}
          className="h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {isCheckingCancellation && (
        <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center">
          <h3 className="text-lg font-semibold">
            جارٍ التحقق من حالة اليوم
          </h3>

          <p className="mt-2 text-sm text-muted-foreground">
            يتم التحقق مما إذا كان اليوم أو الحصة ملغاة.
          </p>
        </div>
      )}

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
        'cancelled' && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/50 dark:bg-red-950/20">
          <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">
            اليوم أو الحصة ملغاة
          </h3>

          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            التاريخ المحدد:{' '}
            {formatDateForDisplay(
              activeDate,
            )}
          </p>

          <p className="mt-1 text-xs text-red-600/80 dark:text-red-400/80">
            تم إلغاء هذا اليوم أو الحصة من الإشراف، لذلك لا يمكن تسجيل أو تعديل الحضور فيه.
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

      {isAttendanceAvailable && (
        <>
          <div
            className={`rounded-xl border px-4 py-3 ${
              attendanceSummary.allRecorded
                ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-900/50 dark:bg-green-950/20 dark:text-green-300'
                : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-lg">
                  {attendanceSummary.allRecorded
                    ? '✓'
                    : '!'}
                </span>

                <div className="min-w-0">
                  <div className="text-sm font-semibold">
                    {attendanceSummary.allRecorded
                      ? `تم تسجيل حالة جميع الطلاب (${attendanceSummary.recorded}/${attendanceSummary.total})`
                      : `لم يكتمل التسجيل — باقي ${attendanceSummary.unrecorded} من ${attendanceSummary.total}`}
                  </div>

                  {!attendanceSummary.allRecorded && (
                    <div className="mt-0.5 text-xs opacity-80">
                      المسجل: {attendanceSummary.recorded} من{' '}
                      {attendanceSummary.total}
                    </div>
                  )}
                </div>
              </div>

              {!attendanceSummary.allRecorded && (
                <button
                  type="button"
                  onClick={() => {
                    setShowUnrecordedOnly(
                      true,
                    )
                    setShowBulkStatusMenu(
                      false,
                    )
                  }}
                  className="shrink-0 rounded-lg border border-red-300 bg-background px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
                >
                  إكمال غير المسجلين
                </button>
              )}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-3">
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value,
                  )
                }
                placeholder="بحث عن طالب..."
                className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      disabled={
                        isBulkSaving ||
                        assignedStudents.length ===
                          0
                      }
                      onClick={() =>
                        setShowBulkStatusMenu(
                          (current) =>
                            !current,
                        )
                      }
                      className="h-10 rounded-lg border bg-background px-4 text-sm font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isBulkSaving
                        ? 'جارٍ تسجيل الكل...'
                        : 'تحديد الكل'}
                    </button>

                    {showBulkStatusMenu && (
                      <div className="absolute right-0 top-12 z-20 min-w-[180px] rounded-xl border bg-background p-2 shadow-lg">
                        <div className="px-2 pb-2 text-xs font-medium text-muted-foreground">
                          اختر الحالة للجميع
                        </div>

                        <div className="space-y-1">
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
                                    isBulkSaving
                                  }
                                  onClick={() =>
                                    saveAllAttendance(
                                      statusName,
                                    )
                                  }
                                  className={`w-full rounded-lg border px-3 py-2 text-sm font-medium transition ${styles.normal}`}
                                >
                                  {statusName}
                                </button>
                              )
                            },
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {!attendanceSummary.allRecorded &&
                    !showUnrecordedOnly && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowUnrecordedOnly(
                            true,
                          )
                          setShowBulkStatusMenu(
                            false,
                          )
                        }}
                        className="h-10 rounded-lg border border-red-300 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-800 dark:bg-red-950/20 dark:text-red-300"
                      >
                        إكمال غير المسجلين (
                        {
                          attendanceSummary.unrecorded
                        }
                        )
                      </button>
                    )}

                  {showUnrecordedOnly && (
                    <button
                      type="button"
                      onClick={() =>
                        setShowUnrecordedOnly(
                          false,
                        )
                      }
                      className="h-10 rounded-lg border bg-background px-4 py-2 text-sm font-semibold transition hover:bg-muted"
                    >
                      عرض جميع الطلاب
                    </button>
                  )}
                </div>

                <div className="text-xs text-muted-foreground">
                  {showUnrecordedOnly
                    ? `عرض غير المسجلين فقط: ${displayedStudents.length}`
                    : `إجمالي الطلاب: ${assignedStudents.length}`}
                </div>
              </div>
            </div>
          </div>

          {statusMessage && (
            <div
              className={`rounded-lg border px-4 py-3 text-sm ${
                statusMessage.startsWith('✓')
                  ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-900/50 dark:bg-green-950/20 dark:text-green-300'
                  : statusMessage.includes(
                      'تعذر',
                    ) ||
                    statusMessage.includes(
                      'ملغي',
                    ) ||
                    statusMessage.includes(
                      'لا يمكن',
                    )
                  ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300'
                  : 'border-border bg-muted/40'
              }`}
            >
              {statusMessage}
            </div>
          )}

          <div className="space-y-4">
            {displayedStudents.length ===
            0 ? (
              <div
                className={`rounded-xl border border-dashed p-10 text-center text-sm ${
                  showUnrecordedOnly
                    ? 'border-green-300 bg-green-50 text-green-700 dark:border-green-900/50 dark:bg-green-950/20 dark:text-green-300'
                    : 'text-muted-foreground'
                }`}
              >
                {showUnrecordedOnly
                  ? '✓ تم تسجيل حالة جميع الطلاب.'
                  : 'لا يوجد طلبة.'}
              </div>
            ) : (
              displayedStudents.map(
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
                    attendanceNotes[key] ??
                    record?.note ??
                    ''

                  const percentage =
                    attendancePercentages[
                      student.id
                    ] ?? 0

                  const saving =
                    savingKey === key ||
                    isBulkSaving

                  const savingNote =
                    savingNoteKey === key

                  const editing =
                    editingStatusKey === key

                  /*
                   * إذا كانت الحالة غير منضم:
                   * لا نفتح وضع الاختيار إطلاقًا.
                   */
                  if (
                    status ===
                    'غير منضم'
                  ) {
                    const selectedStyles =
                      getStatusClasses(
                        status,
                      )

                    return (
                      <div
                        key={student.id}
                        ref={(element) => {
                          studentCardRefs.current[
                            student.id
                          ] = element
                        }}
                        className={`rounded-xl border bg-card px-4 py-4 transition-all ${
                          saving
                            ? 'opacity-70'
                            : ''
                        }`}
                      >
                        <div className="space-y-4">
                          <div className="flex w-full flex-col gap-3 xl:flex-row xl:items-center">
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

                            <button
                              type="button"
                              disabled
                              className={`h-10 shrink-0 cursor-not-allowed rounded-lg border px-5 text-sm font-medium opacity-90 ${selectedStyles.selected}`}
                            >
                              غير منضم
                            </button>

                            <div className="flex h-10 shrink-0 items-center justify-center rounded-lg bg-muted/50 px-5">
                              <span className="text-sm font-bold text-muted-foreground">
                                —
                              </span>
                            </div>
                          </div>

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
                              className="w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
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
                  }

                  /*
                   * لم يتم اختيار حالة بعد.
                   */
                  if (
                    !status ||
                    editing
                  ) {
                    return (
                      <div
                        key={student.id}
                        ref={(element) => {
                          studentCardRefs.current[
                            student.id
                          ] = element
                        }}
                        className={`rounded-xl border bg-card p-4 transition-all ${
                          saving
                            ? 'opacity-70'
                            : ''
                        }`}
                      >
                        <div className="space-y-4">
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

                          <div>
                            <div className="mb-2 text-xs font-medium text-muted-foreground">
                              حالة الحضور
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              {attendanceStatusNames.map(
                                (
                                  statusName,
                                ) => {
                                  const styles =
                                    getStatusClasses(
                                      statusName,
                                    )

                                  const isSelected =
                                    status ===
                                    statusName

                                  return (
                                    <button
                                      key={
                                        statusName
                                      }
                                      type="button"
                                      disabled={
                                        saving
                                      }
                                      onClick={() => {
                                        if (
                                          isSelected &&
                                          status
                                        ) {
                                          void clearAttendance(
                                            student,
                                            activeDate,
                                          )
                                          return
                                        }

                                        void saveAttendance(
                                          student,
                                          activeDate,
                                          statusName,
                                        )
                                      }}
                                      className={`min-h-12 rounded-xl border px-3 py-3 text-sm font-semibold transition active:scale-[0.98] ${
                                        isSelected
                                          ? styles.selected
                                          : styles.normal
                                      } ${
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

                  const selectedStyles =
                    getStatusClasses(
                      status,
                    )

                  return (
                    <div
                      key={student.id}
                      ref={(element) => {
                        studentCardRefs.current[
                          student.id
                        ] = element
                      }}
                      className={`rounded-xl border bg-card px-4 py-4 transition-all ${
                        saving
                          ? 'opacity-70'
                          : ''
                      }`}
                    >
                      <div className="space-y-4">
                        <div className="flex w-full flex-col gap-3 xl:flex-row xl:items-center">
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

                          <button
                            type="button"
                            disabled={
                              saving ||
                              status ===
                                'غير منضم'
                            }
                            onClick={() => {
                              if (
                                status ===
                                'غير منضم'
                              ) {
                                return
                              }

                              setEditingStatusKey(
                                key,
                              )
                            }}
                            className={`h-10 shrink-0 rounded-lg border px-5 text-sm font-medium transition ${selectedStyles.selected} ${
                              saving ||
                              status ===
                                'غير منضم'
                                ? 'cursor-not-allowed opacity-50'
                                : 'cursor-pointer'
                            }`}
                          >
                            {status}
                          </button>

                          <div className="flex h-10 shrink-0 items-center justify-center rounded-lg bg-muted/50 px-5">
                            <span
                              className={`text-sm font-bold ${getPercentageClass(
                                percentage,
                              )}`}
                            >
                              {status ===
                              'غير منضم'
                                ? '—'
                                : `${percentage}%`}
                            </span>
                          </div>
                        </div>

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
                            className="w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
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
