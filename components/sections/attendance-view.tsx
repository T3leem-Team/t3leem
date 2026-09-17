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
        button:
          'border-green-500 bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950/30 dark:text-green-400',
        selected:
          'border-green-600 bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300',
      }

    case 'غائب':
      return {
        button:
          'border-red-500 bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400',
        selected:
          'border-red-600 bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300',
      }

    case 'متأخر':
      return {
        button:
          'border-yellow-500 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-950/30 dark:text-yellow-400',
        selected:
          'border-yellow-600 bg-yellow-100 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-300',
      }

    case 'مستأذن':
      return {
        button:
          'border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-400',
        selected:
          'border-blue-600 bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
      }
  }
}

function getAttendancePercentage(
  studentId: string,
  courseId: string,
  records: AttendanceRecord[],
  statuses: AttendanceStatus[],
) {
  const studentRecords =
    records.filter(
      (record) =>
        record.studentId ===
          studentId &&
        record.courseId === courseId,
    )

  let attended = 0
  let counted = 0

  for (const record of studentRecords) {
    const status = getStatusName(
      statuses,
      record.statusId,
    )

    if (!status) {
      continue
    }

    if (
      status === 'حاضر' ||
      status === 'متأخر'
    ) {
      attended += 1
      counted += 1
    } else if (
      status === 'غائب'
    ) {
      counted += 1
    }
  }

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
    localStatuses,
    setLocalStatuses,
  ] = useState<
    Record<string, AttendanceStatusName>
  >({})

  const [
    searchTerm,
    setSearchTerm,
  ] = useState('')

  const today = new Date()

  const todayString = [
    today.getFullYear(),
    String(
      today.getMonth() + 1,
    ).padStart(2, '0'),
    String(
      today.getDate(),
    ).padStart(2, '0'),
  ].join('-')

  const isTodayInsideCourse =
    currentCourse
      ? todayString >=
          currentCourse.startDate &&
        todayString <=
          currentCourse.endDate
      : false

  const activeDate =
    selectedAttendanceDate ||
    (isTodayInsideCourse
      ? todayString
      : currentCourse?.startDate || '')

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

  const saveAttendance = async (
    student: Student,
    date: string,
    statusName: AttendanceStatusName,
  ) => {
    if (!currentCourse) {
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

    setSavingKey(key)

    setLocalStatuses(
      (current) => ({
        ...current,
        [key]: statusName,
      }),
    )

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
              existing.note ||
              attendanceNotes[key] ||
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

    const existing =
      getRecordForStudent(
        student.id,
        date,
      )

    if (!existing) {
      return
    }

    try {
      const {
        data,
        error,
      } = await supabase
        .from('attendance')
        .update({
          note: value || null,
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
    } catch (error: any) {
      setStatusMessage(
        `تعذر حفظ الملاحظة: ${
          error?.message ||
          'خطأ غير معروف'
        }`,
      )
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
      {/* Header */}
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
          min={currentCourse.startDate}
          max={currentCourse.endDate}
          onChange={(event) => {
            const date =
              event.target.value

            setSelectedAttendanceDate(
              date || null,
            )
          }}
          className="h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {statusMessage && (
        <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
          {statusMessage}
        </div>
      )}

      {/* Search */}
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

      {/* Students */}
      <div className="space-y-3">
        {filteredStudents.length ===
        0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            لا يوجد طلبة.
          </div>
        ) : (
          filteredStudents.map(
            (student) => {
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

              const key = `${activeDate}:${student.id}`

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

              /*
               * قبل اختيار الحالة:
               * الاسم في سطر
               * الحالات في سطر ثاني
               */
              if (!status) {
                return (
                  <div
                    key={student.id}
                    className="rounded-xl border bg-card p-4"
                  >
                    <div className="font-semibold">
                      {student.name}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {attendanceStatusNames.map(
                        (statusName) => {
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
                              className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${styles.button} ${
                                saving
                                  ? 'cursor-not-allowed opacity-50'
                                  : ''
                              }`}
                            >
                              {statusName}
                            </button>
                          )
                        },
                      )}
                    </div>
                  </div>
                )
              }

              /*
               * بعد اختيار الحالة:
               * كل تفاصيل الطالب في سطر واحد
               */
              const selectedStyles =
                getStatusClasses(
                  status,
                )

              return (
                <div
                  key={student.id}
                  className="rounded-xl border bg-card px-4 py-3"
                >
                  <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center">
                    {/* Student name */}
                    <div className="min-w-[190px] lg:flex-1">
                      <div className="font-semibold">
                        {student.name}
                      </div>

                      {student.levelName && (
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {student.levelName}
                        </div>
                      )}
                    </div>

                    {/* Selected status */}
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        setLocalStatuses(
                          (current) => {
                            const next = {
                              ...current,
                            }

                            delete next[key]

                            return next
                          },
                        )
                      }}
                      className={`h-10 min-w-[115px] rounded-lg border px-4 text-sm font-medium ${selectedStyles.selected} ${
                        saving
                          ? 'cursor-not-allowed opacity-50'
                          : ''
                      }`}
                    >
                      {status}
                    </button>

                    {/* Note */}
                    <input
                      type="text"
                      value={note}
                      onChange={(event) =>
                        setAttendanceNotes(
                          (current) => ({
                            ...current,
                            [key]:
                              event.target
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
                      placeholder="الملاحظات"
                      className="h-10 min-w-0 rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 lg:w-[280px]"
                    />

                    {/* Attendance percentage */}
                    <div className="flex h-10 min-w-[90px] items-center justify-center rounded-lg bg-muted/50 px-4">
                      <span
                        className={`text-sm font-bold ${getPercentageClass(
                          percentage,
                        )}`}
                      >
                        {percentage}%
                      </span>
                    </div>
                  </div>
                </div>
              )
            },
          )
        )}
      </div>

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