'use client'

import {
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { Check } from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

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

function isAttendanceStatusName(
  name: string,
): name is AttendanceStatusName {
  return attendanceStatusNames.includes(
    name as AttendanceStatusName,
  )
}

function formatDateForDisplay(
  dateString: string,
) {
  if (!dateString) {
    return ''
  }

  const [year, month, day] =
    dateString.split('-')

  if (!year || !month || !day) {
    return dateString
  }

  return `${day}/${month}/${year}`
}

function todayString() {
  const date = new Date()

  const year = date.getFullYear()

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0')

  const day = String(
    date.getDate(),
  ).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function isDateWithinCourse(
  dateString: string,
  course: Course | null,
) {
  if (!course || !dateString) {
    return false
  }

  return (
    dateString >= course.startDate &&
    dateString <= course.endDate
  )
}

function getStatusIdByName(
  statuses: AttendanceStatus[],
  statusName: AttendanceStatusName,
) {
  const target = statuses.find(
    (status) =>
      normalizeStatusName(status.name) ===
      statusName,
  )

  return target?.id ?? null
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

  return normalizeStatusName(
    status.name,
  )
}

function getAttendanceClass(
  currentStatus: AttendanceStatusName | null,
  buttonStatus: AttendanceStatusName,
) {
  const selected =
    currentStatus === buttonStatus

  if (!selected) {
    return 'border-border bg-background text-muted-foreground hover:border-primary hover:bg-primary/5 hover:text-primary'
  }

  if (buttonStatus === 'حاضر') {
    return 'border-green-500 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400'
  }

  if (buttonStatus === 'غائب') {
    return 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
  }

  if (buttonStatus === 'متأخر') {
    return 'border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400'
  }

  return 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
}

type AttendanceStatusButtonsProps = {
  currentStatus: AttendanceStatusName | null
  saving: boolean
  onSelect: (
    status: AttendanceStatusName,
  ) => void
}

function AttendanceStatusButtons({
  currentStatus,
  saving,
  onSelect,
}: AttendanceStatusButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {attendanceStatusNames.map(
        (status) => {
          const selected =
            currentStatus === status

          return (
            <button
              key={status}
              type="button"
              disabled={saving}
              onClick={() => {
                console.log(
                  '[Attendance] button clicked:',
                  status,
                )

                onSelect(status)
              }}
              className={`inline-flex min-h-10 items-center justify-center rounded-md border px-3 py-2 text-sm font-medium transition-all ${
                selected
                  ? getAttendanceClass(
                      currentStatus,
                      status,
                    )
                  : 'border-border bg-background text-muted-foreground hover:border-primary hover:bg-primary/5 hover:text-primary'
              } ${
                saving
                  ? 'cursor-not-allowed opacity-50'
                  : 'cursor-pointer'
              }`}
            >
              {selected && (
                <Check className="ml-1 size-4" />
              )}

              {status}
            </button>
          )
        },
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
    attendanceSavingKey,
    setAttendanceSavingKey,
  ] = useState<string | null>(null)

  const [
    localSelectedStatuses,
    setLocalSelectedStatuses,
  ] = useState<
    Record<string, AttendanceStatusName>
  >({})

  const currentDate = todayString()

  const currentAttendanceDate =
    currentCourse &&
    isDateWithinCourse(
      currentDate,
      currentCourse,
    )
      ? currentDate
      : null

  const archiveAttendanceDate =
    selectedAttendanceDate &&
    isDateWithinCourse(
      selectedAttendanceDate,
      currentCourse,
    )
      ? selectedAttendanceDate
      : null

  const getRecordForStudent = (
    studentId: string,
    date: string,
  ) => {
    return attendanceRecords.find(
      (record) =>
        record.studentId === studentId &&
        record.courseId ===
          currentCourse?.id &&
        record.attendanceDate === date,
    )
  }

  const getStudentStatus = (
    studentId: string,
    date: string,
  ): AttendanceStatusName | null => {
    const localKey = `${date}:${studentId}`

    const localStatus =
      localSelectedStatuses[localKey]

    if (localStatus) {
      return localStatus
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

  const updateAttendance = async (
    student: Student,
    date: string,
    statusName: AttendanceStatusName,
  ) => {
    if (!currentCourse) {
      setStatusMessage(
        'لا توجد دورة حالية.',
      )
      return
    }

    if (
      !isDateWithinCourse(
        date,
        currentCourse,
      )
    ) {
      setStatusMessage(
        'تاريخ الحضور خارج فترة الدورة.',
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
        `لم يتم العثور على حالة "${statusName}" في قاعدة البيانات. الحالات المحملة: ${
          attendanceStatuses
            .map((item) => item.name)
            .join('، ') || 'لا توجد حالات'
        }`,
      )
      return
    }

    const saveKey = `${date}:${student.id}`

    const existing =
      getRecordForStudent(
        student.id,
        date,
      )

    const previousLocalStatus =
      localSelectedStatuses[saveKey]

    const previousRecords =
      attendanceRecords

    /*
     * تحديث الواجهة فورًا.
     */
    setLocalSelectedStatuses(
      (current) => ({
        ...current,
        [saveKey]: statusName,
      }),
    )

    setStatusMessage(
      `جاري حفظ "${statusName}" للطالب ${student.name}...`,
    )

    setAttendanceSavingKey(saveKey)

    const optimisticRecord: AttendanceRecord = {
      id:
        existing?.id ??
        `temp-${Date.now()}`,

      studentId: student.id,

      enrollmentId:
        student.enrollmentId || null,

      courseId: currentCourse.id,

      attendanceDate: date,

      statusId,

      note:
        existing?.note ??
        attendanceNotes[saveKey] ??
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
              attendanceNotes[saveKey] ||
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
              attendanceNotes[
                saveKey
              ] || null,
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
        `تم حفظ حضور ${student.name}: ${statusName} ✅`,
      )
    } catch (error: any) {
      setAttendanceRecords(
        previousRecords,
      )

      setLocalSelectedStatuses(
        (current) => {
          const next = {
            ...current,
          }

          if (previousLocalStatus) {
            next[saveKey] =
              previousLocalStatus
          } else {
            delete next[saveKey]
          }

          return next
        },
      )

      const message =
        error?.message ||
        error?.details ||
        'خطأ غير معروف'

      setStatusMessage(
        `تعذر حفظ الحضور: ${message}`,
      )
    } finally {
      setAttendanceSavingKey(null)
    }
  }

  const handleAttendanceClick = async (
    student: Student,
    date: string,
    statusName: AttendanceStatusName,
  ) => {
    const saveKey = `${date}:${student.id}`

    if (
      attendanceSavingKey === saveKey
    ) {
      return
    }

    console.log(
      '[Attendance] selecting:',
      {
        studentId: student.id,
        studentName: student.name,
        date,
        statusName,
      },
    )

    setStatusMessage(
      `تم الضغط على "${statusName}" للطالب ${student.name}`,
    )

    await updateAttendance(
      student,
      date,
      statusName,
    )
  }

  const updateAttendanceNote = async (
    student: Student,
    date: string,
    value: string,
  ) => {
    const key = `${date}:${student.id}`

    const existing =
      getRecordForStudent(
        student.id,
        date,
      )

    if (!existing) {
      setAttendanceNotes(
        (current) => ({
          ...current,
          [key]: value,
        }),
      )

      return
    }

    setAttendanceNotes(
      (current) => ({
        ...current,
        [key]: value,
      }),
    )

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

      setStatusMessage(
        'تم حفظ الملاحظة.',
      )
    } catch (error: any) {
      setStatusMessage(
        `تعذر حفظ الملاحظة: ${
          error?.message ||
          'خطأ غير معروف'
        }`,
      )
    }
  }

  const getAttendanceSummary = (
    date: string,
  ) => {
    const summary = {
      حاضر: 0,
      غائب: 0,
      متأخر: 0,
      مستأذن: 0,
    }

    assignedStudents.forEach(
      (student) => {
        const status =
          getStudentStatus(
            student.id,
            date,
          )

        if (
          status &&
          isAttendanceStatusName(status)
        ) {
          summary[status] += 1
        }
      },
    )

    return summary
  }

  const renderAttendanceTable = (
    date: string,
    title: string,
  ) => {
    const dateRecords =
      attendanceRecords.filter(
        (record) =>
          record.courseId ===
            currentCourse?.id &&
          record.attendanceDate === date,
      )

    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold">
              {title}
            </h3>

            <p className="text-sm text-muted-foreground">
              التاريخ:{' '}
              {formatDateForDisplay(date)}
            </p>
          </div>

          <div className="text-sm text-muted-foreground">
            عدد الطلبة:{' '}
            {assignedStudents.length}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-right font-semibold">
                  الطالب
                </th>

                <th className="px-4 py-3 text-right font-semibold">
                  المستوى
                </th>

                <th className="px-4 py-3 text-right font-semibold">
                  الحالة
                </th>

                <th className="px-4 py-3 text-right font-semibold">
                  الملاحظات
                </th>
              </tr>
            </thead>

            <tbody>
              {assignedStudents.length ===
              0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    لا يوجد طلبة مسجلون لدى هذا المعلم.
                  </td>
                </tr>
              ) : (
                assignedStudents.map(
                  (student) => {
                    const record =
                      dateRecords.find(
                        (item) =>
                          item.studentId ===
                          student.id,
                      )

                    const status =
                      getStudentStatus(
                        student.id,
                        date,
                      )

                    const saveKey = `${date}:${student.id}`

                    const note =
                      record?.note ??
                      attendanceNotes[
                        saveKey
                      ] ??
                      ''

                    const studentSaving =
                      attendanceSavingKey ===
                      saveKey

                    return (
                      <tr
                        key={`${date}-${student.id}`}
                        className="border-b last:border-b-0"
                      >
                        <td className="px-4 py-4 align-top">
                          <div>
                            <p className="font-medium">
                              {student.name}
                            </p>

                            <p className="mt-1 text-xs text-muted-foreground">
                              {student.personalId ||
                                student.studentId}
                            </p>
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          {student.levelName ||
                            '-'}
                        </td>

                        <td className="px-4 py-4 align-top">
                          <AttendanceStatusButtons
                            currentStatus={status}
                            saving={studentSaving}
                            onSelect={(
                              statusName,
                            ) =>
                              handleAttendanceClick(
                                student,
                                date,
                                statusName,
                              )
                            }
                          />
                        </td>

                        <td className="px-4 py-4 align-top">
                          <input
                            type="text"
                            value={note}
                            onChange={(
                              event,
                            ) =>
                              setAttendanceNotes(
                                (current) => ({
                                  ...current,
                                  [saveKey]:
                                    event
                                      .target
                                      .value,
                                }),
                              )
                            }
                            onBlur={(event) =>
                              updateAttendanceNote(
                                student,
                                date,
                                event.target
                                  .value,
                              )
                            }
                            placeholder="إضافة ملاحظة..."
                            className="w-full min-w-[220px] rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                          />
                        </td>
                      </tr>
                    )
                  },
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (!currentCourse) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-dashed p-10 text-center">
          <h3 className="text-lg font-semibold">
            لا توجد دورة حالية
          </h3>

          <p className="mt-2 text-sm text-muted-foreground">
            لم يتم العثور على دورة مرتبطة بالسنة الأكاديمية الحالية.
          </p>
        </div>
      </div>
    )
  }

  const activeDate =
    archiveAttendanceDate ||
    currentAttendanceDate

  const activeSummary = activeDate
    ? getAttendanceSummary(activeDate)
    : null

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              الدورة الحالية
            </p>

            <h2 className="mt-1 text-xl font-bold">
              {currentCourse.name}
            </h2>
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            <div className="rounded-lg bg-muted px-3 py-2">
              <span className="text-muted-foreground">
                البداية:
              </span>{' '}
              <span className="font-medium">
                {formatDateForDisplay(
                  currentCourse.startDate,
                )}
              </span>
            </div>

            <div className="rounded-lg bg-muted px-3 py-2">
              <span className="text-muted-foreground">
                النهاية:
              </span>{' '}
              <span className="font-medium">
                {formatDateForDisplay(
                  currentCourse.endDate,
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
          {statusMessage}
        </div>
      )}

      {activeSummary && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">
              حاضر
            </p>

            <p className="mt-1 text-2xl font-bold text-green-600">
              {activeSummary.حاضر}
            </p>
          </div>

          <div className="rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">
              غائب
            </p>

            <p className="mt-1 text-2xl font-bold text-red-600">
              {activeSummary.غائب}
            </p>
          </div>

          <div className="rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">
              متأخر
            </p>

            <p className="mt-1 text-2xl font-bold text-yellow-600">
              {activeSummary.متأخر}
            </p>
          </div>

          <div className="rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">
              مستأذن
            </p>

            <p className="mt-1 text-2xl font-bold text-blue-600">
              {activeSummary.مستأذن}
            </p>
          </div>
        </div>
      )}

      {currentAttendanceDate ? (
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          {renderAttendanceTable(
            currentAttendanceDate,
            'حضور اليوم',
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <h3 className="font-semibold">
            اليوم خارج فترة الدورة
          </h3>

          <p className="mt-2 text-sm text-muted-foreground">
            فترة الدورة من{' '}
            {formatDateForDisplay(
              currentCourse.startDate,
            )}{' '}
            إلى{' '}
            {formatDateForDisplay(
              currentCourse.endDate,
            )}
          </p>
        </div>
      )}

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              أرشيف الحضور
            </h3>

            <p className="text-sm text-muted-foreground">
              اختر تاريخًا داخل فترة الدورة لعرض الحضور.
            </p>
          </div>

          <input
            type="date"
            value={
              selectedAttendanceDate ??
              ''
            }
            min={currentCourse.startDate}
            max={currentCourse.endDate}
            onChange={(event) => {
              setSelectedAttendanceDate(
                event.target.value ||
                  null,
              )
            }}
            className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {archiveAttendanceDate ? (
          renderAttendanceTable(
            archiveAttendanceDate,
            'سجل الحضور',
          )
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            اختر تاريخًا لعرض سجل الحضور.
          </div>
        )}
      </div>

      {attendanceStatuses.length > 0 && (
        <div className="rounded-xl border bg-muted/20 p-4">
          <p className="mb-3 text-sm font-semibold">
            حالات الحضور المتاحة
          </p>

          <div className="flex flex-wrap gap-2">
            {attendanceStatuses.map(
              (status) => {
                const normalized =
                  normalizeStatusName(
                    status.name,
                  )

                if (!normalized) {
                  return null
                }

                return (
                  <span
                    key={status.id}
                    className={`rounded-md border px-3 py-1.5 text-xs font-medium ${getAttendanceClass(
                      normalized,
                      normalized,
                    )}`}
                  >
                    {status.name}
                  </span>
                )
              },
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setSelectedAttendanceDate(null)
          }
        >
          إلغاء تحديد التاريخ
        </Button>
      </div>
    </div>
  )
}