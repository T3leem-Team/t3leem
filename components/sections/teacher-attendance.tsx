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

import {
  TeacherAttendanceView,
} from '@/components/sections/teacher-attendance-view'

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

export type AttendanceNotes =
  Record<string, string>

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
      normalizeStatusName(item.name) ===
      statusName,
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

export function formatDateForDisplay(
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

export function getTodayString() {
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

  if (!year || !month || !day) {
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

  return dayMap[normalized] ?? null
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
  teacherId: string | null
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

export function AttendanceView(
  props: AttendanceViewProps,
) {
  const {
    currentCourse,
    teacherId,
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
  } = props

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
            'record_date, type, teacher_id',
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
          setCancelledDates(new Set())
          return
        }

        const dates = new Set<string>()

        for (const record of
          data ?? []) {
          if (!record.record_date) {
            continue
          }

          if (
            record.type ===
            'day_cancelled'
          ) {
            dates.add(record.record_date)
            continue
          }

          if (
            record.type ===
              'lesson_cancelled' &&
            record.teacher_id === teacherId
          ) {
            dates.add(record.record_date)
          }
        }

        setCancelledDates(dates)
      }

    void loadCancelledDates()

    return () => {
      cancelled = true
    }
  }, [
    currentCourse?.id,
    teacherId,
  ])

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
        setIsCheckingCancellation(true)

        const {
          data,
          error,
        } = await supabase
          .from('supervision_records')
          .select(
            'id, type, teacher_id',
          )
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
          const records = data ?? []

          setIsDayCancelled(
            records.some(
              (record) =>
                record.type ===
                'day_cancelled',
            ),
          )

          setIsLessonCancelled(
            records.some(
              (record) =>
                record.type ===
                  'lesson_cancelled' &&
                record.teacher_id ===
                  teacherId,
            ),
          )
        }

        setIsCheckingCancellation(false)
      }

    void checkCancellation()

    return () => {
      cancelled = true
    }
  }, [
    currentCourse?.id,
    activeDate,
    teacherId,
  ])

  const dateState = useMemo(() => {
    if (!currentCourse) {
      return 'no-course' as const
    }

    if (
      currentCourse.startDate &&
      activeDate < currentCourse.startDate
    ) {
      return 'before-course' as const
    }

    if (
      currentCourse.endDate &&
      activeDate > currentCourse.endDate
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
        record.studentId === studentId &&
        record.courseId === currentCourse.id &&
        record.attendanceDate === date,
    )
  }

  const getStudentStatus = (
    studentId: string,
    date: string,
  ): AttendanceStatusName | null => {
    const key = `${date}:${studentId}`

    const student = assignedStudents.find(
      (item) => item.id === studentId,
    )

    if (
      student?.joinDate &&
      date < student.joinDate
    ) {
      return 'غير منضم'
    }

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
        Math.max(total - recorded, 0)

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
        .select(
          'id, type, teacher_id',
        )
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

      if (error) {
        throw error
      }

      return (data ?? []).some(
        (record) =>
          record.type ===
            'day_cancelled' ||
          (
            record.type ===
              'lesson_cancelled' &&
            record.teacher_id ===
              teacherId
          ),
      )
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
            student_id: student.id,
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
              .eq('id', existing.id)
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
                student_id: student.id,
                enrollment_id:
                  student.enrollmentId ||
                  null,
                attendance_date:
                  activeDate,
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
            record.id !== existing.id,
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

    if (savingNoteKey === key) {
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
    <TeacherAttendanceView
      currentCourse={currentCourse}
      activeDate={activeDate}
      dateState={dateState}
      isAttendanceAvailable={
        isAttendanceAvailable
      }
      isCheckingCancellation={
        isCheckingCancellation
      }
      attendanceSummary={
        attendanceSummary
      }
      assignedStudents={
        assignedStudents
      }
      displayedStudents={
        displayedStudents
      }
      attendanceStatuses={
        attendanceStatuses
      }
      attendanceNotes={
        attendanceNotes
      }
      attendancePercentages={
        attendancePercentages
      }
      statusMessage={statusMessage}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      showUnrecordedOnly={
        showUnrecordedOnly
      }
      setShowUnrecordedOnly={
        setShowUnrecordedOnly
      }
      showBulkStatusMenu={
        showBulkStatusMenu
      }
      setShowBulkStatusMenu={
        setShowBulkStatusMenu
      }
      isBulkSaving={isBulkSaving}
      savingKey={savingKey}
      savingNoteKey={savingNoteKey}
      editingStatusKey={
        editingStatusKey
      }
      setEditingStatusKey={
        setEditingStatusKey
      }
      setAttendanceNotes={
        setAttendanceNotes
      }
      setSelectedAttendanceDate={
        setSelectedAttendanceDate
      }
      setStatusMessage={
        setStatusMessage
      }
      saveAttendance={
        saveAttendance
      }
      saveAllAttendance={
        saveAllAttendance
      }
      clearAttendance={
        clearAttendance
      }
      saveNote={saveNote}
      getRecordForStudent={
        getRecordForStudent
      }
      getStudentStatus={
        getStudentStatus
      }
      studentCardRefs={
        studentCardRefs
      }
    />
  )
}
