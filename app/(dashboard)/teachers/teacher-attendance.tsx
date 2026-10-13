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
} from '@/app/(dashboard)/teachers/teacher-attendance-view'

import type {
  AttendanceNotes,
  AttendanceRecord,
  AttendanceStatus,
  AttendanceStatusName,
  Course,
  Student,
  TeacherAttendanceStatus,
} from '@/app/(dashboard)/teachers/teacher-attendance-utils'

import {
  getAttendancePercentage,
  getStatusIdByName,
  getStatusName,
  getTodayString,
  isCourseStudyDay,
} from '@/app/(dashboard)/teachers/teacher-attendance-utils'

export type {
  AttendanceNotes,
  AttendanceRecord,
  AttendanceStatus,
  AttendanceStatusName,
  Course,
  Student,
  TeacherAttendanceStatus,
} from '@/app/(dashboard)/teachers/teacher-attendance-utils'

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

  console.log('[Attendance Debug]', {
    studentId,
    currentCourseId: currentCourse.id,
    date,
    matchingRecords: attendanceRecords
      .filter(
        (record) =>
          record.studentId === studentId &&
          record.courseId === currentCourse.id &&
          record.attendanceDate === date,
      )
      .map((record) => ({
        studentId: record.studentId,
        courseId: record.courseId,
        attendanceDate: record.attendanceDate,
        statusId: record.statusId,
      })),
  })

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

  const record = getRecordForStudent(
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

const attendanceSummary = useMemo(() => {
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

    const status = getStudentStatus(
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

  const unrecorded = Math.max(
    total - recorded,
    0,
  )

  return {
    total,
    recorded,
    unrecorded,
    allRecorded:
      total > 0 && unrecorded === 0,
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

  if (!isStudentEligibleForAttendance(student, date)) {
    setStatusMessage(
      'هذا الطالب لم يكن منضمًا في تاريخ الحضور المحدد.',
    )
    return
  }

  const statusId = getStatusIdByName(
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

  if (savingKey === key || isBulkSaving) {
    return
  }

  const existing = getRecordForStudent(
    student.id,
    date,
  )

  const existingStatus = existing
    ? getStatusName(
        attendanceStatuses,
        existing.statusId,
      )
    : null

  if (existingStatus === 'غير منضم') {
    setStatusMessage(
      'لا يمكن تغيير حالة "غير منضم" من شاشة المعلم.',
    )
    return
  }

  const previousRecords = attendanceRecords
  const previousLocalStatus = localStatuses[key]

  setSavingKey(key)
  setEditingStatusKey(null)

  try {
    const isCancelledNow =
      await checkCancellationBeforeSave(date)

    if (isCancelledNow) {
      throw new Error(
        'هذا اليوم أو الدرس ملغي ولا يمكن تسجيل الحضور فيه.',
      )
    }

    // التحقق من السجل مباشرة من قاعدة البيانات،
    // لأن السجل قد لا يكون موجودًا في الذاكرة المحلية.
    const {
      data: databaseRecord,
      error: lookupError,
    } = await supabase
      .from('attendance')
      .select(
        'id, student_id, enrollment_id, attendance_date, status_id, note, course_id',
      )
      .eq('student_id', student.id)
      .eq('attendance_date', date)
      .eq('course_id', currentCourse.id)
      .maybeSingle()

    if (lookupError) {
      throw lookupError
    }

    if (
      databaseRecord &&
      getStatusName(
        attendanceStatuses,
        databaseRecord.status_id,
      ) === 'غير منضم'
    ) {
      throw new Error(
        'لا يمكن تغيير حالة "غير منضم" من شاشة المعلم.',
      )
    }

    const noteValue =
      attendanceNotes[key] ??
      databaseRecord?.note ??
      existing?.note ??
      null

    let savedData
    let saveError

    if (databaseRecord) {
      // السجل موجود: تحديثه بدل إنشاء سجل مكرر.
      const result = await supabase
        .from('attendance')
        .update({
          status_id: statusId,
          enrollment_id:
            student.enrollmentId || null,
          note: noteValue,
        })
        .eq('id', databaseRecord.id)
        .select(
          'id, student_id, enrollment_id, attendance_date, status_id, note, course_id',
        )
        .single()

      savedData = result.data
      saveError = result.error
    } else {
      // لا يوجد سجل: إنشاء سجل جديد.
      const result = await supabase
        .from('attendance')
        .insert({
          student_id: student.id,
          enrollment_id:
            student.enrollmentId || null,
          attendance_date: date,
          status_id: statusId,
          note: noteValue,
          course_id: currentCourse.id,
        })
        .select(
          'id, student_id, enrollment_id, attendance_date, status_id, note, course_id',
        )
        .single()

      savedData = result.data
      saveError = result.error
    }

    if (saveError) {
      throw saveError
    }

    if (!savedData) {
      throw new Error(
        'لم تُرجع قاعدة البيانات سجل الحضور بعد الحفظ.',
      )
    }

    const savedRecord: AttendanceRecord = {
      id: savedData.id,
      studentId: savedData.student_id,
      enrollmentId:
        savedData.enrollment_id ?? null,
      courseId: savedData.course_id,
      attendanceDate: savedData.attendance_date,
      statusId: savedData.status_id,
      note: savedData.note ?? '',
    }

    // استبدال السجل في الذاكرة المحلية،
    // ومنع بقاء نسخة مؤقتة أو سجل مكرر.
    setAttendanceRecords((records) => {
      const withoutDuplicate = records.filter(
        (record) =>
          record.id !== savedRecord.id &&
          !(
            record.studentId === student.id &&
            record.attendanceDate === date
          ),
      )

      return [...withoutDuplicate, savedRecord]
    })

    setLocalStatuses((current) => ({
      ...current,
      [key]: statusName,
    }))

    moveToNextStudent(
      student.id,
      student.name,
      statusName,
    )
  } catch (error: any) {
    setAttendanceRecords(previousRecords)

    setLocalStatuses((current) => {
      const next = { ...current }

      if (previousLocalStatus) {
        next[key] = previousLocalStatus
      } else {
        delete next[key]
      }

      return next
    })

    setStatusMessage(
      `تعذر حفظ الحضور: ${
        error?.message || 'خطأ غير معروف'
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
