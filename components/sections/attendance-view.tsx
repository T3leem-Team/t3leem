'use client'

import { Dispatch, SetStateAction } from 'react'
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

export const attendanceStatusNames: AttendanceStatusName[] = [
  'حاضر',
  'غائب',
  'متأخر',
  'مستأذن',
]

export const normalizeStatusName = (
  value: string | null | undefined,
) =>
  (value ?? '')
    .trim()
    .replace(/\s+/g, ' ')

const isAttendanceStatusName = (
  value: string | null | undefined,
): value is AttendanceStatusName =>
  attendanceStatusNames.includes(
    normalizeStatusName(value) as AttendanceStatusName,
  )

const formatDateForDisplay = (date: string) => {
  const parsed = new Date(`${date}T00:00:00`)

  if (Number.isNaN(parsed.getTime())) {
    return date
  }

  return new Intl.DateTimeFormat('ar-BH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsed)
}

const todayString = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const isDateWithinCourse = (
  date: string,
  course: Course,
) => {
  if (!course.startDate || !course.endDate) {
    return true
  }

  return date >= course.startDate && date <= course.endDate
}

const getStatusIdByName = (
  statuses: AttendanceStatus[],
  name: AttendanceStatusName,
) => {
  const target = normalizeStatusName(name)

  return (
    statuses.find(
      (status) =>
        normalizeStatusName(status.name) === target,
    )?.id ?? null
  )
}

const getStatusName = (
  statuses: AttendanceStatus[],
  statusId: string | null,
): AttendanceStatusName | 'لم يسجل' => {
  if (!statusId) {
    return 'لم يسجل'
  }

  const status = statuses.find(
    (item) => item.id === statusId,
  )

  const normalized = normalizeStatusName(status?.name)

  return isAttendanceStatusName(normalized)
    ? normalized
    : 'لم يسجل'
}

const getAttendanceClass = (
  currentStatus: AttendanceStatusName | 'لم يسجل',
  buttonStatus: AttendanceStatusName,
) => {
  const selected = currentStatus === buttonStatus

  if (buttonStatus === 'حاضر') {
    return selected
      ? 'border-green-500 bg-green-50 text-green-700 shadow-sm'
      : 'border-green-200 bg-white text-green-700 hover:border-green-400 hover:bg-green-50'
  }

  if (buttonStatus === 'غائب') {
    return selected
      ? 'border-red-500 bg-red-50 text-red-700 shadow-sm'
      : 'border-red-200 bg-white text-red-700 hover:border-red-400 hover:bg-red-50'
  }

  if (buttonStatus === 'متأخر') {
    return selected
      ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm'
      : 'border-amber-200 bg-white text-amber-700 hover:border-amber-400 hover:bg-amber-50'
  }

  return selected
    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
    : 'border-blue-200 bg-white text-blue-700 hover:border-blue-400 hover:bg-blue-50'
}

type AttendanceStatusButtonsProps = {
  currentStatus: AttendanceStatusName | 'لم يسجل'
  saving: boolean
  onSelect: (status: AttendanceStatusName) => void
}

function AttendanceStatusButtons({
  currentStatus,
  saving,
  onSelect,
}: AttendanceStatusButtonsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {attendanceStatusNames.map((status) => {
        const selected = currentStatus === status

        return (
          <button
            key={status}
            type="button"
            disabled={false}
            onClick={() => onSelect(status)}
            className={`inline-flex min-h-9 cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 ${getAttendanceClass(
              currentStatus,
              status,
            )}`}
          >
            {selected && (
              <Check className="ml-1 size-3.5" />
            )}
            {status}
          </button>
        )
      })}
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
  saving: boolean
  setSaving: Dispatch<SetStateAction<boolean>>
  setStatusMessage: Dispatch<SetStateAction<string>>
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
  saving,
  setSaving,
  setStatusMessage,
  selectedAttendanceDate,
  setSelectedAttendanceDate,
}: AttendanceViewProps) {
  const currentAttendanceDate =
    currentCourse &&
    isDateWithinCourse(todayString(), currentCourse)
      ? todayString()
      : null

  const getStudentAttendanceRecord = (
    studentId: string,
    date: string | null,
  ) => {
    if (!date || !currentCourse) {
      return null
    }

    return (
      attendanceRecords.find(
        (record) =>
          record.courseId === currentCourse.id &&
          record.studentId === studentId &&
          record.attendanceDate === date,
      ) ?? null
    )
  }

  const getSessionStatus = (
    studentId: string,
    date: string | null,
  ) => {
    const record = getStudentAttendanceRecord(
      studentId,
      date,
    )

    return getStatusName(
      attendanceStatuses,
      record?.statusId ?? null,
    )
  }

  const getPendingNote = (
    studentId: string,
    date: string | null,
  ) => {
    if (!date) {
      return ''
    }

    return (
      attendanceNotes[`${date}:${studentId}`] ?? ''
    )
  }

  const mapAttendanceRecord = (
    record: {
      id: string
      student_id: string
      enrollment_id: string | null
      attendance_date: string
      status_id: string
      note: string | null
      course_id: string
    },
  ): AttendanceRecord => ({
    id: record.id,
    studentId: record.student_id,
    enrollmentId: record.enrollment_id,
    courseId: record.course_id,
    attendanceDate: record.attendance_date,
    statusId: record.status_id,
    note: record.note ?? '',
  })

  const updateAttendance = async (
    studentId: string,
    statusName: AttendanceStatusName,
    date?: string,
  ) => {
    if (!currentCourse || !date) {
      return false
    }

    const statusId = getStatusIdByName(
      attendanceStatuses,
      statusName,
    )

    if (!statusId) {
      setStatusMessage(
        `حالة الحضور "${statusName}" غير موجودة في قاعدة البيانات. الحالات المحملة: ${
          attendanceStatuses
            .map((status) => status.name)
            .join('، ') || 'لا توجد'
        }`,
      )

      return false
    }

    const student = assignedStudents.find(
      (item) => item.id === studentId,
    )

    if (!student) {
      setStatusMessage('تعذر العثور على الطالب.')
      return false
    }

    const pendingNote = getPendingNote(
      studentId,
      date,
    )

    const existing = getStudentAttendanceRecord(
      studentId,
      date,
    )

    const previousRecords = attendanceRecords

    const optimisticRecord: AttendanceRecord = existing
      ? {
          ...existing,
          enrollmentId: student.enrollmentId,
          statusId,
          note:
            existing.note ||
            pendingNote ||
            '',
        }
      : {
          id: `temp-${studentId}-${date}`,
          studentId,
          enrollmentId: student.enrollmentId,
          courseId: currentCourse.id,
          attendanceDate: date,
          statusId,
          note: pendingNote || '',
        }

    setAttendanceRecords((current) =>
      existing
        ? current.map((record) =>
            record.id === existing.id
              ? optimisticRecord
              : record,
          )
        : [...current, optimisticRecord],
    )

    setSaving(true)
    setStatusMessage('جاري حفظ الحضور...')

    if (existing) {
      const { data, error } = await supabase
        .from('attendance')
        .update({
          status_id: statusId,
          enrollment_id: student.enrollmentId,
          note:
            existing.note ||
            pendingNote ||
            null,
        })
        .eq('id', existing.id)
        .select(
          'id, student_id, enrollment_id, attendance_date, status_id, note, course_id',
        )
        .single()

      if (error) {
        setAttendanceRecords(previousRecords)
        setStatusMessage(
          `تعذر حفظ الحضور: ${error.message}`,
        )
        setSaving(false)
        return false
      }

      const mapped = mapAttendanceRecord(data)

      setAttendanceRecords((current) =>
        current.map((record) =>
          record.id === existing.id
            ? mapped
            : record,
        ),
      )
    } else {
      const { data, error } = await supabase
        .from('attendance')
        .insert({
          student_id: studentId,
          enrollment_id: student.enrollmentId,
          attendance_date: date,
          status_id: statusId,
          note: pendingNote || null,
          course_id: currentCourse.id,
        })
        .select(
          'id, student_id, enrollment_id, attendance_date, status_id, note, course_id',
        )
        .single()

      if (error) {
        setAttendanceRecords(previousRecords)
        setStatusMessage(
          `تعذر حفظ الحضور: ${error.message}`,
        )
        setSaving(false)
        return false
      }

      const mapped = mapAttendanceRecord(data)

      setAttendanceRecords((current) =>
        current.map((record) =>
          record.id === optimisticRecord.id
            ? mapped
            : record,
        ),
      )
    }

    if (pendingNote) {
      setAttendanceNotes((current) => {
        const next = { ...current }
        delete next[`${date}:${studentId}`]
        return next
      })
    }

    setStatusMessage('تم حفظ الحضور ✅')
    setSaving(false)

    return true
  }

  const updateAttendanceNote = async (
    studentId: string,
    value: string,
    date?: string,
  ) => {
    if (!currentCourse || !date) {
      return
    }

    const existing = getStudentAttendanceRecord(
      studentId,
      date,
    )

    if (!existing) {
      const key = `${date}:${studentId}`

      setAttendanceNotes((current) => ({
        ...current,
        [key]: value,
      }))

      return
    }

    const { data, error } = await supabase
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
      setStatusMessage(
        `تعذر حفظ الملاحظة: ${error.message}`,
      )
      return
    }

    const mapped = mapAttendanceRecord(data)

    setAttendanceRecords((current) =>
      current.map((record) =>
        record.id === existing.id
          ? mapped
          : record,
      ),
    )
  }

  const getAttendanceStats = (
    studentId: string,
    courseId: string,
  ) => {
    const courseDates = new Set(
      attendanceRecords
        .filter(
          (record) =>
            record.courseId === courseId,
        )
        .map(
          (record) =>
            record.attendanceDate,
        ),
    )

    const attendedDates = new Set(
      attendanceRecords
        .filter(
          (record) =>
            record.courseId === courseId &&
            record.studentId === studentId &&
            ['حاضر', 'متأخر', 'مستأذن'].includes(
              getStatusName(
                attendanceStatuses,
                record.statusId,
              ),
            ),
        )
        .map(
          (record) =>
            record.attendanceDate,
        ),
    )

    const total = courseDates.size
    const present = attendedDates.size

    return {
      present,
      total,
      percentage:
        total > 0
          ? (present / total) * 100
          : 0,
    }
  }

  const attendanceArchive = currentCourse
    ? Array.from(
        new Set(
          attendanceRecords
            .filter(
              (record) =>
                record.courseId === currentCourse.id,
            )
            .map(
              (record) =>
                record.attendanceDate,
            ),
        ),
      )
        .filter(
          (date) =>
            date !== currentAttendanceDate,
        )
        .sort((a, b) => b.localeCompare(a))
    : []

  const openAttendanceArchive = (
    date: string,
  ) => {
    if (
      !currentCourse ||
      !isDateWithinCourse(
        date,
        currentCourse,
      )
    ) {
      return
    }

    setSelectedAttendanceDate(date)
  }

  const closeAttendanceArchive = () => {
    setSelectedAttendanceDate(null)
  }

  const formatPercentage = (value: number) =>
    `${value.toFixed(1)}%`

  const handleAttendanceClick = async (
    studentId: string,
    statusName: AttendanceStatusName,
    date: string,
  ) => {
    if (saving) {
      return
    }

    await updateAttendance(
      studentId,
      statusName,
      date,
    )
  }

  if (!currentCourse) {
    return null
  }

  return (
    <div className="space-y-6">
      {selectedAttendanceDate ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">
                تعديل حضور
              </p>

              <h3 className="text-lg font-semibold">
                {formatDateForDisplay(
                  selectedAttendanceDate,
                )}
              </h3>

              <p className="mt-1 text-sm text-muted-foreground">
                {currentCourse.name}
              </p>
            </div>

            <Button
              variant="outline"
              onClick={closeAttendanceArchive}
            >
              العودة للأرشيف
            </Button>
          </div>

          {assignedStudents.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              لا يوجد طلاب لتعديل الحضور.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-right font-medium">
                      اسم الطالب
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      الوضع
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      ملاحظات
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      نسبة الحضور —{' '}
                      {currentCourse.name}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {assignedStudents.map(
                    (student) => {
                      const currentStatus =
                        getSessionStatus(
                          student.id,
                          selectedAttendanceDate,
                        )

                      const stats =
                        getAttendanceStats(
                          student.id,
                          currentCourse.id,
                        )

                      const existing =
                        getStudentAttendanceRecord(
                          student.id,
                          selectedAttendanceDate,
                        )

                      const noteKey = `${selectedAttendanceDate}:${student.id}`

                      const noteValue =
                        existing?.note ??
                        attendanceNotes[
                          noteKey
                        ] ??
                        ''

                      return (
                        <tr
                          key={student.id}
                          className="border-t"
                        >
                          <td className="px-4 py-4">
                            <p className="font-medium">
                              {student.name}
                            </p>

                            <p className="mt-1 text-xs text-muted-foreground">
                              {student.levelName}
                            </p>
                          </td>

                          <td className="px-4 py-4">
                            <AttendanceStatusButtons
                              currentStatus={
                                currentStatus
                              }
                              saving={saving}
                              onSelect={(status) =>
                                handleAttendanceClick(
                                  student.id,
                                  status,
                                  selectedAttendanceDate,
                                )
                              }
                            />
                          </td>

                          <td className="px-4 py-4">
                            <input
                              value={noteValue}
                              onChange={(event) =>
                                updateAttendanceNote(
                                  student.id,
                                  event.target.value,
                                  selectedAttendanceDate,
                                )
                              }
                              placeholder="ملاحظة..."
                              className="h-9 min-w-[180px] rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                            />
                          </td>

                          <td className="px-4 py-4">
                            <div className="font-semibold tabular-nums">
                              {stats.present} /{' '}
                              {stats.total} —{' '}
                              {formatPercentage(
                                stats.percentage,
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    },
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end border-t pt-4">
            <Button
              onClick={
                closeAttendanceArchive
              }
            >
              حفظ التعديلات
            </Button>
          </div>
        </>
      ) : (
        <>
          <div>
            <h3 className="text-lg font-semibold">
              الحضور والغياب
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              {currentCourse.name}
              {currentAttendanceDate
                ? ` · ${formatDateForDisplay(
                    currentAttendanceDate,
                  )}`
                : ''}
            </p>
          </div>

          {assignedStudents.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              لا يوجد طلاب لتسجيل الحضور.
            </div>
          ) : currentAttendanceDate ? (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-right font-medium">
                      اسم الطالب
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      الوضع
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      ملاحظات
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      نسبة الحضور —{' '}
                      {currentCourse.name}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {assignedStudents.map(
                    (student) => {
                      const currentStatus =
                        getSessionStatus(
                          student.id,
                          currentAttendanceDate,
                        )

                      const stats =
                        getAttendanceStats(
                          student.id,
                          currentCourse.id,
                        )

                      const existing =
                        getStudentAttendanceRecord(
                          student.id,
                          currentAttendanceDate,
                        )

                      const noteKey = `${currentAttendanceDate}:${student.id}`

                      const noteValue =
                        existing?.note ??
                        attendanceNotes[
                          noteKey
                        ] ??
                        ''

                      return (
                        <tr
                          key={student.id}
                          className="border-t"
                        >
                          <td className="px-4 py-4">
                            <p className="font-medium">
                              {student.name}
                            </p>

                            <p className="mt-1 text-xs text-muted-foreground">
                              {student.levelName}
                            </p>
                          </td>

                          <td className="px-4 py-4">
                            <AttendanceStatusButtons
                              currentStatus={
                                currentStatus
                              }
                              saving={saving}
                              onSelect={(status) =>
                                handleAttendanceClick(
                                  student.id,
                                  status,
                                  currentAttendanceDate,
                                )
                              }
                            />
                          </td>

                          <td className="px-4 py-4">
                            <input
                              value={noteValue}
                              onChange={(event) =>
                                updateAttendanceNote(
                                  student.id,
                                  event.target.value,
                                  currentAttendanceDate,
                                )
                              }
                              placeholder="ملاحظة..."
                              className="h-9 min-w-[180px] rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                            />
                          </td>

                          <td className="px-4 py-4">
                            <div className="font-semibold tabular-nums">
                              {stats.present} /{' '}
                              {stats.total} —{' '}
                              {formatPercentage(
                                stats.percentage,
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    },
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              لا توجد جلسة حضور حالية لهذا التاريخ.
            </div>
          )}

          <div className="space-y-3 border-t pt-6">
            <div>
              <h3 className="font-semibold">
                أرشيف الحضور
              </h3>

              <p className="mt-1 text-sm text-muted-foreground">
                أيام الحضور السابقة في{' '}
                {currentCourse.name}.
              </p>
            </div>

            {attendanceArchive.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                لا يوجد أرشيف حضور حتى الآن.
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-right font-medium">
                        التاريخ
                      </th>

                      <th className="px-4 py-3 text-right font-medium">
                        الحالة
                      </th>

                      <th className="px-4 py-3 text-right font-medium">
                        الإجراء
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {attendanceArchive.map(
                      (date) => (
                        <tr
                          key={date}
                          className="border-t"
                        >
                          <td className="px-4 py-4 font-medium">
                            {formatDateForDisplay(
                              date,
                            )}
                          </td>

                          <td className="px-4 py-4">
                            <span className="inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                              محفوظ
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openAttendanceArchive(
                                  date,
                                )
                              }
                            >
                              تعديل
                            </Button>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
