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
  Clock3,
  Search,
  UserCheck,
  UserX,
} from 'lucide-react'

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

function getStatusStyles(
  status: AttendanceStatusName,
) {
  if (status === 'حاضر') {
    return {
      button:
        'border-green-500 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400',
      dot: 'bg-green-500',
    }
  }

  if (status === 'غائب') {
    return {
      button:
        'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400',
      dot: 'bg-red-500',
    }
  }

  if (status === 'متأخر') {
    return {
      button:
        'border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400',
      dot: 'bg-yellow-500',
    }
  }

  return {
    button:
      'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
    dot: 'bg-blue-500',
  }
}

function getStatusLabel(
  status: AttendanceStatusName,
) {
  if (status === 'حاضر') {
    return 'حاضر'
  }

  if (status === 'غائب') {
    return 'غائب'
  }

  if (status === 'متأخر') {
    return 'متأخر'
  }

  return 'مستأذن'
}

function getAttendancePercentage(
  studentId: string,
  records: AttendanceRecord[],
  statuses: AttendanceStatus[],
  courseId: string,
) {
  const studentRecords = records.filter(
    (record) =>
      record.studentId === studentId &&
      record.courseId === courseId,
  )

  if (studentRecords.length === 0) {
    return 0
  }

  let attended = 0
  let counted = 0

  studentRecords.forEach((record) => {
    const status = getStatusName(
      statuses,
      record.statusId,
    )

    if (!status) {
      return
    }

    /*
     * الحضور والمتأخر يعتبران حضورًا.
     * الغياب يدخل في النسبة.
     * المستأذن لا يدخل في المقام.
     */
    if (
      status === 'حاضر' ||
      status === 'متأخر'
    ) {
      attended += 1
      counted += 1
      return
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
  const [
    open,
    setOpen,
  ] = useState(false)

  const currentStyles =
    currentStatus
      ? getStatusStyles(
          currentStatus,
        )
      : null

  return (
    <div className="relative">
      <button
        type="button"
        disabled={saving}
        onClick={() =>
          setOpen((value) => !value)
        }
        className={`flex min-h-10 min-w-[125px] items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
          currentStatus
            ? currentStyles?.button
            : 'border-border bg-background text-muted-foreground hover:border-primary hover:bg-primary/5 hover:text-primary'
        } ${
          saving
            ? 'cursor-not-allowed opacity-50'
            : 'cursor-pointer'
        }`}
      >
        <span className="flex items-center gap-2">
          {currentStatus ? (
            <>
              <span
                className={`size-2 rounded-full ${currentStyles?.dot}`}
              />

              <span>
                {getStatusLabel(
                  currentStatus,
                )}
              </span>
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

      {open && !saving && (
        <>
          <button
            type="button"
            aria-label="إغلاق"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() =>
              setOpen(false)
            }
          />

          <div className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[170px] overflow-hidden rounded-xl border bg-popover p-1.5 shadow-lg">
            {attendanceStatusNames.map(
              (status) => {
                const selected =
                  currentStatus ===
                  status

                const styles =
                  getStatusStyles(
                    status,
                  )

                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      onSelect(status)
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors ${
                      selected
                        ? styles.button
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`size-2 rounded-full ${styles.dot}`}
                      />

                      {getStatusLabel(
                        status,
                      )}
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
    attendanceSavingKey,
    setAttendanceSavingKey,
  ] = useState<string | null>(null)

  const [
    localSelectedStatuses,
    setLocalSelectedStatuses,
  ] = useState<
    Record<string, AttendanceStatusName>
  >({})

  const [
    searchTerm,
    setSearchTerm,
  ] = useState('')

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<
    AttendanceStatusName | 'الكل'
  >('الكل')

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

  const studentPercentages = useMemo(() => {
    if (!currentCourse) {
      return {}
    }

    return Object.fromEntries(
      assignedStudents.map(
        (student) => [
          student.id,
          getAttendancePercentage(
            student.id,
            attendanceRecords,
            attendanceStatuses,
            currentCourse.id,
          ),
        ],
      ),
    ) as Record<string, number>
  }, [
    assignedStudents,
    attendanceRecords,
    attendanceStatuses,
    currentCourse,
  ])

  const groupAttendancePercentage =
    useMemo(() => {
      if (
        assignedStudents.length === 0
      ) {
        return 0
      }

      const percentages =
        assignedStudents.map(
          (student) =>
            studentPercentages[
              student.id
            ] ?? 0,
        )

      return Math.round(
        percentages.reduce(
          (sum, value) =>
            sum + value,
          0,
        ) / percentages.length,
      )
    }, [
      assignedStudents,
      studentPercentages,
    ])

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
            .join('، ') ||
          'لا توجد حالات'
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

    setLocalSelectedStatuses(
      (current) => ({
        ...current,
        [saveKey]: statusName,
      }),
    )

    setStatusMessage(
      `جاري حفظ "${statusName}" للطالب ${student.name}...`,
    )

    setAttendanceSavingKey(
      saveKey,
    )

    const optimisticRecord: AttendanceRecord =
      {
        id:
          existing?.id ??
          `temp-${Date.now()}`,

        studentId: student.id,

        enrollmentId:
          student.enrollmentId ||
          null,

        courseId:
          currentCourse.id,

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
      setAttendanceSavingKey(
        null,
      )
    }
  }

  const handleAttendanceClick = async (
    student: Student,
    date: string,
    statusName: AttendanceStatusName,
  ) => {
    const saveKey = `${date}:${student.id}`

    if (
      attendanceSavingKey ===
      saveKey
    ) {
      return
    }

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

    const summary =
      getAttendanceSummary(date)

    const filteredStudents =
      assignedStudents.filter(
        (student) => {
          const matchesSearch =
            !searchTerm.trim() ||
            student.name
              .toLowerCase()
              .includes(
                searchTerm
                  .trim()
                  .toLowerCase(),
              ) ||
            student.studentId
              .toLowerCase()
              .includes(
                searchTerm
                  .trim()
                  .toLowerCase(),
              ) ||
            student.personalId
              .toLowerCase()
              .includes(
                searchTerm
                  .trim()
                  .toLowerCase(),
              )

          const studentStatus =
            getStudentStatus(
              student.id,
              date,
            )

          const matchesStatus =
            statusFilter === 'الكل' ||
            studentStatus ===
              statusFilter

          return (
            matchesSearch &&
            matchesStatus
          )
        },
      )

    return (
      <div className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              {title}
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              {formatDateForDisplay(
                date,
              )}{' '}
              · {assignedStudents.length}{' '}
              طالب
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-green-50 px-3 py-1.5 font-medium text-green-700 dark:bg-green-950/30 dark:text-green-400">
              حاضر {summary.حاضر}
            </span>

            <span className="rounded-full bg-red-50 px-3 py-1.5 font-medium text-red-700 dark:bg-red-950/30 dark:text-red-400">
              غائب {summary.غائب}
            </span>

            <span className="rounded-full bg-yellow-50 px-3 py-1.5 font-medium text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400">
              متأخر {summary.متأخر}
            </span>

            <span className="rounded-full bg-blue-50 px-3 py-1.5 font-medium text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
              مستأذن {summary.مستأذن}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <input
              type="text"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value,
                )
              }
              placeholder="البحث عن طالب..."
              className="h-10 w-full rounded-lg border bg-background pr-9 pl-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target
                  .value as
                  | AttendanceStatusName
                  | 'الكل',
              )
            }
            className="h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="الكل">
              كل الحالات
            </option>

            {attendanceStatusNames.map(
              (status) => (
                <option
                  key={status}
                  value={status}
                >
                  {status}
                </option>
              ),
            )}
          </select>
        </div>

        <div className="overflow-visible rounded-xl border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-3 text-right font-semibold">
                    الطالب
                  </th>

                  <th className="px-4 py-3 text-right font-semibold">
                    المستوى
                  </th>

                  <th className="px-4 py-3 text-right font-semibold">
                    نسبة الحضور
                  </th>

                  <th className="px-4 py-3 text-right font-semibold">
                    حالة اليوم
                  </th>

                  <th className="px-4 py-3 text-right font-semibold">
                    الملاحظات
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredStudents.length ===
                0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-12 text-center text-muted-foreground"
                    >
                      لا يوجد طلبة مطابقون للبحث أو الفلتر.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map(
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

                      const percentage =
                        studentPercentages[
                          student.id
                        ] ?? 0

                      return (
                        <tr
                          key={`${date}-${student.id}`}
                          className="border-b last:border-b-0 hover:bg-muted/20"
                        >
                          <td className="px-4 py-4 align-middle">
                            <div className="flex items-center gap-3">
                              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted font-semibold">
                                {student.name
                                  .trim()
                                  .charAt(0)}
                              </div>

                              <div>
                                <p className="font-medium">
                                  {student.name}
                                </p>

                                <p className="mt-1 text-xs text-muted-foreground">
                                  {student.personalId ||
                                    student.studentId}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4 align-middle">
                            <span className="text-sm text-muted-foreground">
                              {student.levelName ||
                                '-'}
                            </span>
                          </td>

                          <td className="px-4 py-4 align-middle">
                            <div className="w-[145px]">
                              <div className="mb-1.5 flex items-center justify-between">
                                <span
                                  className={`text-sm font-bold ${getPercentageClass(
                                    percentage,
                                  )}`}
                                >
                                  {percentage}%
                                </span>

                                <span className="text-[11px] text-muted-foreground">
                                  حضور
                                </span>
                              </div>

                              <div className="h-2 overflow-hidden rounded-full bg-muted">
                                <div
                                  className={`h-full rounded-full transition-all ${
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

                          <td className="relative px-4 py-4 align-middle">
                            <AttendanceStatusButtons
                              currentStatus={
                                status
                              }
                              saving={
                                studentSaving
                              }
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

                          <td className="px-4 py-4 align-middle">
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
                                  event
                                    .target
                                    .value,
                                )
                              }
                              placeholder="ملاحظة..."
                              className="w-full min-w-[180px] rounded-lg border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
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
      {/* Course header */}
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              الحضور والغياب
            </p>

            <h2 className="mt-1 text-xl font-bold">
              {currentCourse.name}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {formatDateForDisplay(
                currentCourse.startDate,
              )}{' '}
              —{' '}
              {formatDateForDisplay(
                currentCourse.endDate,
              )}
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ClipboardCheck className="size-5" />
            </div>

            <div>
              <p className="text-xs text-muted-foreground">
                متوسط حضور المجموعة
              </p>

              <p
                className={`text-xl font-bold ${getPercentageClass(
                  groupAttendancePercentage,
                )}`}
              >
                {groupAttendancePercentage}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className="rounded-xl border bg-muted/40 px-4 py-3 text-sm">
          {statusMessage}
        </div>
      )}

      {/* Statistics */}
      {activeSummary && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">
                  حاضر
                </p>

                <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
                  {activeSummary.حاضر}
                </p>
              </div>

              <div className="flex size-10 items-center justify-center rounded-full bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400">
                <UserCheck className="size-5" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">
                  غائب
                </p>

                <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
                  {activeSummary.غائب}
                </p>
              </div>

              <div className="flex size-10 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400">
                <UserX className="size-5" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">
                  متأخر
                </p>

                <p className="mt-1 text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {activeSummary.متأخر}
                </p>
              </div>

              <div className="flex size-10 items-center justify-center rounded-full bg-yellow-50 text-yellow-600 dark:bg-yellow-950/30 dark:text-yellow-400">
                <Clock3 className="size-5" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">
                  مستأذن
                </p>

                <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {activeSummary.مستأذن}
                </p>
              </div>

              <div className="flex size-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
                <ClipboardCheck className="size-5" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Today's attendance */}
      {currentAttendanceDate ? (
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
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

      {/* Archive */}
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              أرشيف الحضور
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              اختر تاريخًا داخل فترة الدورة لعرض السجل.
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="date"
              value={
                selectedAttendanceDate ??
                ''
              }
              min={
                currentCourse.startDate
              }
              max={
                currentCourse.endDate
              }
              onChange={(event) => {
                setSelectedAttendanceDate(
                  event.target.value ||
                    null,
                )
              }}
              className="rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />

            {selectedAttendanceDate && (
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setSelectedAttendanceDate(
                    null,
                  )
                }
              >
                مسح
              </Button>
            )}
          </div>
        </div>

        {archiveAttendanceDate ? (
          renderAttendanceTable(
            archiveAttendanceDate,
            'سجل الحضور',
          )
        ) : (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            اختر تاريخًا لعرض سجل الحضور.
          </div>
        )}
      </div>
    </div>
  )
}