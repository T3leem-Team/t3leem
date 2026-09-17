'use client'

import {
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import {
  Check,
  ChevronDown,
  ClipboardCheck,
} from 'lucide-react'

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

export type AttendanceNotes = Record<string, string>

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

function getStatusStyles(
  status: AttendanceStatusName,
) {
  switch (status) {
    case 'حاضر':
      return {
        wrapper:
          'border-green-500 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400',
        dot: 'bg-green-500',
      }

    case 'غائب':
      return {
        wrapper:
          'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400',
        dot: 'bg-red-500',
      }

    case 'متأخر':
      return {
        wrapper:
          'border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400',
        dot: 'bg-yellow-500',
      }

    case 'مستأذن':
      return {
        wrapper:
          'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
        dot: 'bg-blue-500',
      }
  }
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

/*
 * نسبة حضور الطالب في الدورة كاملة.
 *
 * حاضر + متأخر = حضور
 * غائب = غياب
 * مستأذن = لا يدخل في الحساب
 */
function getStudentAttendancePercentage(
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
      continue
    }

    if (status === 'غائب') {
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

type AttendanceStatusSelectorProps = {
  value: AttendanceStatusName | null
  disabled?: boolean
  onChange: (
    status: AttendanceStatusName,
  ) => void
}

function AttendanceStatusSelector({
  value,
  disabled,
  onChange,
}: AttendanceStatusSelectorProps) {
  const [open, setOpen] =
    useState(false)

  const styles = value
    ? getStatusStyles(value)
    : null

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          setOpen((current) => !current)
        }
        className={`flex h-10 min-w-[145px] items-center justify-between gap-3 rounded-lg border px-3 text-sm font-medium transition ${
          value
            ? styles?.wrapper
            : 'border-input bg-background text-muted-foreground hover:border-primary'
        } ${
          disabled
            ? 'cursor-not-allowed opacity-50'
            : ''
        }`}
      >
        <span className="flex items-center gap-2">
          {value ? (
            <>
              <span
                className={`size-2 rounded-full ${styles?.dot}`}
              />
              {value}
            </>
          ) : (
            'تحديد الحالة'
          )}
        </span>

        <ChevronDown
          className={`size-4 transition-transform ${
            open
              ? 'rotate-180'
              : ''
          }`}
        />
      </button>

      {open && !disabled && (
        <>
          <button
            type="button"
            aria-label="إغلاق القائمة"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() =>
              setOpen(false)
            }
          />

          <div className="absolute right-0 top-11 z-50 w-[170px] rounded-xl border bg-popover p-1.5 shadow-xl">
            {attendanceStatusNames.map(
              (status) => {
                const selected =
                  value === status

                const statusStyles =
                  getStatusStyles(
                    status,
                  )

                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      onChange(status)
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition ${
                      selected
                        ? statusStyles.wrapper
                        : 'hover:bg-muted'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`size-2 rounded-full ${statusStyles.dot}`}
                      />

                      {status}
                    </span>

                    {selected && (
                      <Check className="size-4" />
                    )}
                  </button>
                )
              },
            )}
          </div>
        </>
      )}
    </div>
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
    selectedStatuses,
    setSelectedStatuses,
  ] = useState<
    Record<string, AttendanceStatusName>
  >({})

  const [
    search,
    setSearch,
  ] = useState('')

  const [
    selectedDate,
    setSelectedDate,
  ] = useState(
    selectedAttendanceDate || '',
  )

  const activeDate =
    selectedDate ||
    selectedAttendanceDate ||
    currentCourse?.startDate ||
    ''

  const getRecord = (
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

    if (selectedStatuses[key]) {
      return selectedStatuses[key]
    }

    const record = getRecord(
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
          getStudentAttendancePercentage(
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
        if (!search.trim()) {
          return true
        }

        const value =
          search
            .trim()
            .toLowerCase()

        return (
          student.name
            .toLowerCase()
            .includes(value) ||
          student.studentId
            .toLowerCase()
            .includes(value) ||
          student.personalId
            .toLowerCase()
            .includes(value)
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

    const existing = getRecord(
      student.id,
      date,
    )

    const previousRecords =
      attendanceRecords

    const previousStatus =
      selectedStatuses[key]

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

    setSelectedStatuses(
      (current) => ({
        ...current,
        [key]: statusName,
      }),
    )

    setAttendanceRecords(
      (records) => {
        const index =
          records.findIndex(
            (record) =>
              record.studentId ===
                student.id &&
              record.courseId ===
                currentCourse.id &&
              record.attendanceDate ===
                date,
          )

        if (index === -1) {
          return [
            ...records,
            optimisticRecord,
          ]
        }

        return records.map(
          (record, recordIndex) =>
            recordIndex === index
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
          const saved: AttendanceRecord =
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
                    ? saved
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
          const saved: AttendanceRecord =
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
                    ? saved
                    : record,
              ),
          )
        }
      }

      setStatusMessage(
        `تم حفظ حالة ${student.name}: ${statusName} ✅`,
      )
    } catch (error: any) {
      setAttendanceRecords(
        previousRecords,
      )

      setSelectedStatuses(
        (current) => {
          const next = {
            ...current,
          }

          if (previousStatus) {
            next[key] =
              previousStatus
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
    note: string,
  ) => {
    const key = `${date}:${student.id}`

    setAttendanceNotes(
      (current) => ({
        ...current,
        [key]: note,
      }),
    )

    const existing = getRecord(
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
          note: note || null,
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
        const updated: AttendanceRecord =
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
                  ? updated
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
      <div className="rounded-xl border border-dashed p-10 text-center">
        <ClipboardCheck className="mx-auto size-10 text-muted-foreground" />

        <h3 className="mt-4 text-lg font-semibold">
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

            setSelectedDate(date)
            setSelectedAttendanceDate(
              date || null,
            )
          }}
          className="h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Status message */}
      {statusMessage && (
        <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
          {statusMessage}
        </div>
      )}

      {/* Search */}
      <div>
        <input
          type="text"
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value,
            )
          }
          placeholder="بحث عن طالب..."
          className="h-10 w-full max-w-md rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Attendance table */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[850px]">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-5 py-4 text-right text-sm font-semibold">
                الطالب
              </th>

              <th className="px-5 py-4 text-right text-sm font-semibold">
                الحالة
              </th>

              <th className="px-5 py-4 text-right text-sm font-semibold">
                الملاحظات
              </th>

              <th className="px-5 py-4 text-right text-sm font-semibold">
                نسبة حضور الدورة
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredStudents.length ===
            0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-5 py-12 text-center text-sm text-muted-foreground"
                >
                  لا يوجد طلبة.
                </td>
              </tr>
            ) : (
              filteredStudents.map(
                (student) => {
                  const record =
                    getRecord(
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

                  return (
                    <tr
                      key={student.id}
                      className="border-b last:border-0 hover:bg-muted/20"
                    >
                      {/* Student */}
                      <td className="px-5 py-4">
                        <div>
                          <div className="font-medium">
                            {student.name}
                          </div>

                          <div className="mt-1 text-xs text-muted-foreground">
                            {student.levelName ||
                              student.studentId}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <AttendanceStatusSelector
                          value={status}
                          disabled={saving}
                          onChange={(
                            statusName,
                          ) =>
                            saveAttendance(
                              student,
                              activeDate,
                              statusName,
                            )
                          }
                        />
                      </td>

                      {/* Note */}
                      <td className="px-5 py-4">
                        <input
                          type="text"
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
                              event
                                .target
                                .value,
                            )
                          }
                          placeholder="ملاحظة..."
                          className="h-10 w-full min-w-[220px] rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                      </td>

                      {/* Percentage */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-lg font-bold ${getPercentageClass(
                              percentage,
                            )}`}
                          >
                            {percentage}%
                          </span>

                          <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full ${
                                percentage >=
                                90
                                  ? 'bg-green-500'
                                  : percentage >=
                                      75
                                    ? 'bg-yellow-500'
                                    : 'bg-red-500'
                              }`}
                              style={{
                                width: `${percentage}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                },
              )
            )}
          </tbody>
        </table>
      </div>

      {/* Course period */}
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