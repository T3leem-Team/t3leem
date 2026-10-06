import {
  useMemo,
  useState,
} from 'react'

import {
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  Download,
  UserCheck,
  UserX,
  Users,
  X,
} from 'lucide-react'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import { Button } from '@/components/ui/button'

import {
  AttendanceDetails,
  type TeacherAttendanceDetail,
} from '@/components/sections/teacher-attendance-details'

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

type StudentSearchResult = {
  student: Student
  courseNames: string[]
  teacherNames: string[]
  attendanceStatus: string | null
}

type LessonDateStatus =
  | 'no-course'
  | 'not-started'
  | 'ended'
  | 'no-lesson'
  | 'lesson'

type AttendanceNote = {
  id: string
  studentId: string
  attendanceDate: string
  statusName: string
  note: string
  teacherName: string
}

type DashboardViewPanelsProps = {
  selectedCourse: Course | null
  academicYear: AcademicYear | null
  pendingRegistrationCount: number
  assignments: Assignment[]
  courses: Course[]
  teachers: Teacher[]
  students: Student[]
  attendanceRecords: AttendanceRecord[]
  attendanceStatuses: AttendanceStatus[]
  selectedCourseId: string
  selectedDate: string
  lessonDateStatus: LessonDateStatus
  teacherAttendanceDetails: TeacherAttendanceDetail[]
  attendancePercentage: number
  attendanceDetailsOpen: boolean
  setAttendanceDetailsOpen: (
    value: boolean,
  ) => void
  selectedStudent: StudentSearchResult | null
  setSelectedStudent: (
    value: StudentSearchResult | null,
  ) => void
  router: {
    push: (
      href: string,
    ) => void
  }
}

function normalizeText(
  value: string | null | undefined,
) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

function normalizeId(
  value: string | null | undefined,
) {
  return String(value ?? '').trim()
}

function normalizeAttendanceDate(
  value: string | null | undefined,
) {
  return String(value ?? '').slice(0, 10)
}

function formatDate(date: string) {
  if (!date) return ''

  const parts = date.split('-')

  if (parts.length !== 3) {
    return date
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

function isPresentStatus(name: string) {
  const value = normalizeText(name)

  return (
    value === 'حاضر' ||
    value === 'حضور'
  )
}

function isAbsentStatus(name: string) {
  const value = normalizeText(name)

  return (
    value === 'غائب' ||
    value === 'غياب'
  )
}

function getAttendanceStatusLabel(
  name: string,
) {
  if (isPresentStatus(name)) {
    return 'حاضر'
  }

  if (isAbsentStatus(name)) {
    return 'غائب'
  }

  const value = normalizeText(name)

  if (
    value === 'متأخر' ||
    value === 'متأخر عن الحضور'
  ) {
    return 'متأخر'
  }

  if (
    value === 'مستأذن' ||
    value === 'مستأذن بعذر'
  ) {
    return 'مستأذن'
  }

  return value || 'غير محدد'
}

function getLocalDateString() {
  const now = new Date()

  const year = now.getFullYear()

  const month = String(
    now.getMonth() + 1,
  ).padStart(2, '0')

  const day = String(
    now.getDate(),
  ).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function DashboardViewPanels({
  selectedCourse,
  academicYear,
  pendingRegistrationCount,
  assignments,
  courses,
  teachers,
  students,
  attendanceRecords,
  attendanceStatuses,
  selectedCourseId,
  selectedDate,
  lessonDateStatus,
  teacherAttendanceDetails,
  attendancePercentage,
  attendanceDetailsOpen,
  setAttendanceDetailsOpen,
  selectedStudent,
  setSelectedStudent,
  router,
}: DashboardViewPanelsProps) {
  const [notesDownloadOpen, setNotesDownloadOpen] =
    useState(false)

  const [customDownloadOpen, setCustomDownloadOpen] =
    useState(false)

  const [notesFromDate, setNotesFromDate] =
    useState(
      selectedCourse?.startDate ??
        selectedDate,
    )

  const [notesToDate, setNotesToDate] =
    useState(selectedDate)

  const statusMap = useMemo(
    () =>
      new Map(
        attendanceStatuses.map(
          (status) => [
            normalizeId(
              status.id,
            ),
            status.name,
          ],
        ),
      ),
    [attendanceStatuses],
  )

  const attendanceNotes =
    useMemo<AttendanceNote[]>(
      () => {
        const courseId =
          normalizeId(
            selectedCourseId,
          )

        const date =
          normalizeAttendanceDate(
            selectedDate,
          )

        if (
          !courseId ||
          !date
        ) {
          return []
        }

        return attendanceRecords
          .filter((record) => {
            if (
              normalizeId(
                record.courseId,
              ) !== courseId
            ) {
              return false
            }

            if (
              normalizeAttendanceDate(
                record.attendanceDate,
              ) !== date
            ) {
              return false
            }

            return Boolean(
              normalizeText(
                record.note,
              ),
            )
          })
          .map((record) => {
            const rawStatus =
              statusMap.get(
                normalizeId(
                  record.statusId,
                ),
              ) ?? ''

            const studentAssignments =
              assignments.filter(
                (assignment) =>
                  normalizeId(
                    assignment.courseId,
                  ) ===
                    courseId &&
                  normalizeId(
                    assignment.studentId,
                  ) ===
                    normalizeId(
                      record.studentId,
                    ),
              )

            const teacherNames =
              Array.from(
                new Set(
                  studentAssignments
                    .map(
                      (
                        assignment,
                      ) =>
                        teachers.find(
                          (
                            teacher,
                          ) =>
                            normalizeId(
                              teacher.id,
                            ) ===
                            normalizeId(
                              assignment.teacherId,
                            ),
                        )?.name,
                    )
                    .filter(
                      (
                        name,
                      ): name is string =>
                        Boolean(
                          normalizeText(
                            name,
                          ),
                        ),
                    ),
                ),
              )

            return {
              id: record.id,
              studentId:
                record.studentId,
              attendanceDate:
                normalizeAttendanceDate(
                  record.attendanceDate,
                ),
              statusName:
                getAttendanceStatusLabel(
                  rawStatus,
                ),
              note:
                normalizeText(
                  record.note,
                ),
              teacherName:
                teacherNames.length > 0
                  ? teacherNames.join(
                      '، ',
                    )
                  : 'غير محدد',
            }
          })
          .sort((a, b) =>
            a.id.localeCompare(
              b.id,
            ),
          )
      },
      [
        attendanceRecords,
        assignments,
        selectedCourseId,
        selectedDate,
        statusMap,
        teachers,
      ],
    )

  const allCourseNotes =
    useMemo<AttendanceNote[]>(
      () => {
        const courseId =
          normalizeId(
            selectedCourseId,
          )

        if (!courseId) {
          return []
        }

        return attendanceRecords
          .filter((record) => {
            if (
              normalizeId(
                record.courseId,
              ) !== courseId
            ) {
              return false
            }

            return Boolean(
              normalizeText(
                record.note,
              ),
            )
          })
          .map((record) => {
            const rawStatus =
              statusMap.get(
                normalizeId(
                  record.statusId,
                ),
              ) ?? ''

            const studentAssignments =
              assignments.filter(
                (assignment) =>
                  normalizeId(
                    assignment.courseId,
                  ) ===
                    courseId &&
                  normalizeId(
                    assignment.studentId,
                  ) ===
                    normalizeId(
                      record.studentId,
                    ),
              )

            const teacherNames =
              Array.from(
                new Set(
                  studentAssignments
                    .map(
                      (
                        assignment,
                      ) =>
                        teachers.find(
                          (
                            teacher,
                          ) =>
                            normalizeId(
                              teacher.id,
                            ) ===
                            normalizeId(
                              assignment.teacherId,
                            ),
                        )?.name,
                    )
                    .filter(
                      (
                        name,
                      ): name is string =>
                        Boolean(
                          normalizeText(
                            name,
                          ),
                        ),
                    ),
                ),
              )

            return {
              id: record.id,
              studentId:
                record.studentId,
              attendanceDate:
                normalizeAttendanceDate(
                  record.attendanceDate,
                ),
              statusName:
                getAttendanceStatusLabel(
                  rawStatus,
                ),
              note:
                normalizeText(
                  record.note,
                ),
              teacherName:
                teacherNames.length > 0
                  ? teacherNames.join(
                      '، ',
                    )
                  : 'غير محدد',
            }
          })
          .sort((a, b) => {
            const dateCompare =
              b.attendanceDate.localeCompare(
                a.attendanceDate,
              )

            if (
              dateCompare !== 0
            ) {
              return dateCompare
            }

            return a.id.localeCompare(
              b.id,
            )
          })
      },
      [
        attendanceRecords,
        assignments,
        selectedCourseId,
        statusMap,
        teachers,
      ],
    )

  const selectedStudentCourses =
    useMemo(() => {
      if (!selectedStudent) {
        return []
      }

      return assignments
        .filter(
          (assignment) =>
            normalizeId(
              assignment.studentId,
            ) ===
            normalizeId(
              selectedStudent.student.id,
            ),
        )
        .map(
          (assignment) =>
            courses.find(
              (course) =>
                normalizeId(
                  course.id,
                ) ===
                normalizeId(
                  assignment.courseId,
                ),
            ),
        )
        .filter(
          (
            course,
          ): course is Course =>
            Boolean(course),
        )
    }, [
      selectedStudent,
      assignments,
      courses,
    ])

  const selectedStudentTeachers =
    useMemo(() => {
      if (!selectedStudent) {
        return []
      }

      return Array.from(
        new Set(
          assignments
            .filter(
              (assignment) =>
                normalizeId(
                  assignment.studentId,
                ) ===
                normalizeId(
                  selectedStudent.student.id,
                ),
            )
            .map(
              (assignment) =>
                teachers.find(
                  (teacher) =>
                    normalizeId(
                      teacher.id,
                    ) ===
                    normalizeId(
                      assignment.teacherId,
                    ),
                )?.name,
            )
            .filter(
              (
                name,
              ): name is string =>
                Boolean(name),
            ),
        ),
      )
    }, [
      selectedStudent,
      assignments,
      teachers,
    ])

  const downloadNotes = (
    notes: AttendanceNote[],
    fromDate: string,
    toDate: string,
  ) => {
    if (
      !selectedCourse ||
      notes.length === 0
    ) {
      return
    }

    const filteredNotes =
      notes.filter((item) => {
        const date =
          normalizeAttendanceDate(
            item.attendanceDate,
          )

        return (
          date >= fromDate &&
          date <= toDate
        )
      })

    if (
      filteredNotes.length === 0
    ) {
      return
    }

    const escapeCsv = (
      value: string,
    ) =>
      `"${String(value)
        .replace(/"/g, '""')
        .replace(
          /\r?\n/g,
          ' ',
        )}"`

    const rows = [
      [
        'التاريخ',
        'الطالب',
        'رقم الطالب',
        'الرقم الشخصي',
        'المعلم',
        'الحالة',
        'الملاحظة',
      ],
      ...filteredNotes.map(
        (item) => {
          const student =
            students.find(
              (student) =>
                normalizeId(
                  student.id,
                ) ===
                normalizeId(
                  item.studentId,
                ),
            )

          return [
            formatDate(
              item.attendanceDate,
            ),
            student?.name ??
              'طالب غير معروف',
            student?.studentId ??
              '',
            student?.personalId ??
              '',
            item.teacherName,
            item.statusName,
            item.note,
          ]
        },
      ),
    ]

    const csv =
      '\uFEFF' +
      rows
        .map((row) =>
          row
            .map(escapeCsv)
            .join(','),
        )
        .join('\r\n')

    const blob = new Blob(
      [csv],
      {
        type: 'text/csv;charset=utf-8;',
      },
    )

    const url =
      URL.createObjectURL(
        blob,
      )

    const link =
      document.createElement('a')

    link.href = url

    const safeCourseName =
      selectedCourse.name.replace(
        /[\\/:*?"<>|]/g,
        '-',
      )

    link.download =
      `ملاحظات-${safeCourseName}-${fromDate}-إلى-${toDate}.csv`

    document.body.appendChild(
      link,
    )

    link.click()

    document.body.removeChild(
      link,
    )

    URL.revokeObjectURL(url)

    setNotesDownloadOpen(false)
    setCustomDownloadOpen(false)
  }

  const downloadFromCourseStart = () => {
    if (!selectedCourse) {
      return
    }

    const selectedPageDate =
      normalizeAttendanceDate(
        selectedDate,
      )

    const fromDate =
      normalizeAttendanceDate(
        selectedCourse.startDate,
      ) ||
      normalizeAttendanceDate(
        allCourseNotes[
          allCourseNotes.length - 1
        ]?.attendanceDate,
      ) ||
      selectedPageDate

    downloadNotes(
      allCourseNotes,
      fromDate,
      selectedPageDate,
    )
  }

  const downloadCustomNotes = () => {
    if (
      !notesFromDate ||
      !notesToDate ||
      notesFromDate > notesToDate
    ) {
      return
    }

    downloadNotes(
      allCourseNotes,
      notesFromDate,
      notesToDate,
    )
  }

  return (
    <>
      {pendingRegistrationCount >
        0 && (
        <button
          type="button"
          onClick={() =>
            router.push(
              '/enrollment',
            )
          }
          className="w-full rounded-xl border border-amber-200 bg-amber-50 p-4 text-right shadow-sm transition-colors hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-200"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <ClipboardCheck className="size-5" />
              </div>

              <div>
                <p className="font-medium text-amber-900">
                  طلبات تسجيل جديدة
                </p>

                <p className="mt-1 text-xs text-amber-700/80">
                  لديك{' '}
                  {
                    pendingRegistrationCount
                  }{' '}
                  طلب تسجيل معلّق
                </p>
              </div>
            </div>

            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-200 text-sm font-semibold text-amber-800">
              {
                pendingRegistrationCount
              }
            </span>
          </div>
        </button>
      )}

      {/* Teacher comments */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="size-5 text-slate-500" />
                ملاحظات المعلمين على الطلبة
              </CardTitle>

              <p className="mt-1 text-xs text-muted-foreground">
                ملاحظات المعلمين المسجلة في التاريخ المحدد
              </p>
            </div>

            <div className="relative">
              <Button
                type="button"
                onClick={() =>
                  setNotesDownloadOpen(
                    (value) => !value,
                  )
                }
                disabled={
                  allCourseNotes.length ===
                  0
                }
                className="h-10 gap-2 border border-sky-200 bg-sky-50 px-4 text-sky-700 shadow-sm hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="size-4" />

                تنزيل الملاحظات

                <ChevronDown
                  className={`size-4 transition-transform ${
                    notesDownloadOpen
                      ? 'rotate-180'
                      : ''
                  }`}
                />
              </Button>

              {notesDownloadOpen && (
                <div
                  dir="rtl"
                  className="absolute left-0 top-full z-30 mt-2 w-[300px] rounded-xl border bg-background p-2 shadow-lg"
                >
                  {!customDownloadOpen ? (
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={
                          downloadFromCourseStart
                        }
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-right text-sm transition-colors hover:bg-muted"
                      >
                        <Download className="size-4 shrink-0 text-sky-600" />

                        <span>
                          من بداية الدورة حتى التاريخ المحدد
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setNotesFromDate(
                            selectedCourse?.startDate ??
                              selectedDate,
                          )

                          setNotesToDate(
                            selectedDate,
                          )

                          setCustomDownloadOpen(
                            true,
                          )
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-right text-sm transition-colors hover:bg-muted"
                      >
                        <CalendarDays className="size-4 shrink-0 text-sky-600" />

                        <span>
                          مخصص
                        </span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 p-2">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold">
                          تحديد الفترة
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            setCustomDownloadOpen(
                              false,
                            )
                          }
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label="رجوع"
                          title="رجوع"
                        >
                          <X className="size-4" />
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                            من تاريخ
                          </label>

                          <input
                            type="date"
                            value={
                              notesFromDate
                            }
                            max={
                              notesToDate ||
                              selectedDate
                            }
                            onChange={(
                              event,
                            ) =>
                              setNotesFromDate(
                                event
                                  .target
                                  .value,
                              )
                            }
                            className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                            إلى تاريخ
                          </label>

                          <input
                            type="date"
                            value={
                              notesToDate
                            }
                            min={
                              notesFromDate
                            }
                            max={
                              selectedDate
                            }
                            onChange={(
                              event,
                            ) =>
                              setNotesToDate(
                                event
                                  .target
                                  .value,
                              )
                            }
                            className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                          />
                        </div>
                      </div>

                      <Button
                        type="button"
                        onClick={
                          downloadCustomNotes
                        }
                        disabled={
                          !notesFromDate ||
                          !notesToDate ||
                          notesFromDate >
                            notesToDate
                        }
                        className="h-10 w-full gap-2 bg-sky-600 text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Download className="size-4" />
                        تنزيل الفترة
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              التاريخ
            </p>

            <p className="text-sm font-medium">
              {formatDate(
                selectedDate,
              )}
            </p>
          </div>

          {attendanceNotes.length ===
          0 ? (
            <div className="flex min-h-[140px] items-center justify-center rounded-xl border border-dashed px-6 text-center">
              <div>
                <ClipboardCheck className="mx-auto size-7 text-slate-300" />

                <p className="mt-3 text-sm font-medium text-muted-foreground">
                  لا توجد ملاحظات في هذا التاريخ
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  ستظهر هنا أي ملاحظة يكتبها المعلم أثناء تسجيل حضور الطالب.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border">
              <div className="hidden grid-cols-[120px_minmax(180px,1fr)_180px_120px_1fr] gap-4 border-b bg-muted/40 px-4 py-3 text-xs font-medium text-muted-foreground md:grid">
                <div>
                  التاريخ
                </div>

                <div>
                  الطالب
                </div>

                <div>
                  المعلم
                </div>

                <div>
                  الحالة
                </div>

                <div>
                  الملاحظة
                </div>
              </div>

              <div className="divide-y">
                {attendanceNotes.map(
                  (item) => {
                    const student =
                      students.find(
                        (student) =>
                          normalizeId(
                            student.id,
                          ) ===
                          normalizeId(
                            item.studentId,
                          ),
                      )

                    return (
                      <div
                        key={
                          item.id
                        }
                        className="grid gap-3 px-4 py-4 transition-colors hover:bg-muted/20 md:grid-cols-[120px_minmax(180px,1fr)_180px_120px_1fr] md:items-start md:gap-4"
                      >
                        <div>
                          <p className="text-xs text-muted-foreground md:hidden">
                            التاريخ
                          </p>

                          <p className="mt-1 text-sm font-medium md:mt-0">
                            {formatDate(
                              item.attendanceDate,
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground md:hidden">
                            الطالب
                          </p>

                          <p className="mt-1 font-medium md:mt-0">
                            {student?.name ??
                              'طالب غير معروف'}
                          </p>

                          {student?.studentId && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              رقم الطالب:{' '}
                              {
                                student.studentId
                              }
                            </p>
                          )}
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground md:hidden">
                            المعلم
                          </p>

                          <p className="mt-1 text-sm font-medium md:mt-0">
                            {
                              item.teacherName
                            }
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground md:hidden">
                            الحالة
                          </p>

                          <span
                            className={`mt-1 inline-flex rounded-full border px-3 py-1 text-xs font-medium md:mt-0 ${
                              isPresentStatus(
                                item.statusName,
                              )
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : isAbsentStatus(
                                      item.statusName,
                                    )
                                  ? 'border-red-200 bg-red-50 text-red-700'
                                  : 'border-slate-200 bg-slate-50 text-slate-700'
                            }`}
                          >
                            {
                              item.statusName
                            }
                          </span>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground md:hidden">
                            الملاحظة
                          </p>

                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 md:mt-0">
                            {
                              item.note
                            }
                          </p>
                        </div>
                      </div>
                    )
                  },
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student details modal */}
      {selectedStudent && (
        <div
          dir="rtl"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={() =>
            setSelectedStudent(null)
          }
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border bg-background shadow-xl"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="font-semibold">
                  تفاصيل الطالب
                </h2>

                <p className="mt-1 text-xs text-muted-foreground">
                  من البحث السريع
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedStudent(
                    null,
                  )
                }
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-xl border p-4">
                <p className="text-lg font-semibold">
                  {
                    selectedStudent
                      .student
                      .name
                  }
                </p>

                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  {selectedStudent
                    .student
                    .studentId && (
                    <p>
                      <span className="text-muted-foreground">
                        رقم الطالب:
                      </span>{' '}
                      {
                        selectedStudent
                          .student
                          .studentId
                      }
                    </p>
                  )}

                  {selectedStudent
                    .student
                    .personalId && (
                    <p>
                      <span className="text-muted-foreground">
                        الرقم الشخصي:
                      </span>{' '}
                      {
                        selectedStudent
                          .student
                          .personalId
                      }
                    </p>
                  )}

                  {selectedStudent
                    .student
                    .phone && (
                    <p>
                      <span className="text-muted-foreground">
                        الهاتف:
                      </span>{' '}
                      {
                        selectedStudent
                          .student
                          .phone
                      }
                    </p>
                  )}

                  <p>
                    <span className="text-muted-foreground">
                      الحالة:
                    </span>{' '}
                    {
                      selectedStudent
                        .student
                        .status ??
                      'غير محدد'
                    }
                  </p>
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <p className="text-sm font-medium">
                  الدورات
                </p>

                {selectedStudentCourses.length >
                0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedStudentCourses.map(
                      (course) => (
                        <span
                          key={
                            course.id
                          }
                          className="rounded-full bg-muted px-3 py-1 text-xs"
                        >
                          {
                            course.name
                          }
                        </span>
                      ),
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    غير منضم لأي دورة
                  </p>
                )}
              </div>

              <div className="rounded-xl border p-4">
                <p className="text-sm font-medium">
                  المعلمون
                </p>

                {selectedStudentTeachers.length >
                0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedStudentTeachers.map(
                      (teacher) => (
                        <span
                          key={
                            teacher
                          }
                          className="rounded-full bg-muted px-3 py-1 text-xs"
                        >
                          {
                            teacher
                          }
                        </span>
                      ),
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    لا يوجد معلم موزع عليه
                  </p>
                )}
              </div>

              <div className="rounded-xl border p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">
                    حضور اليوم
                  </p>

                  {selectedDate && (
                    <span className="text-xs text-muted-foreground">
                      {formatDate(
                        selectedDate,
                      )}
                    </span>
                  )}
                </div>

                <p className="mt-2 text-sm">
                  {selectedStudent.attendanceStatus ??
                    'لا يوجد سجل حضور'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Teacher attendance details */}
      {attendanceDetailsOpen &&
        lessonDateStatus ===
          'lesson' && (
          <AttendanceDetails
            courseName={
              selectedCourse?.name ??
              'الدورة'
            }
            date={selectedDate}
            details={
              teacherAttendanceDetails
            }
            overallPercentage={
              attendancePercentage
            }
            onClose={() =>
              setAttendanceDetailsOpen(
                false,
              )
            }
          />
        )}
    </>
  )
}
