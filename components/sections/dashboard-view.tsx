'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarCheck,
  ClipboardCheck,
  Clock3,
  RefreshCw,
  UserCheck,
  UserX,
  Users,
  BookOpen,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import { Button } from '@/components/ui/button'

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

type Enrollment = {
  id: string
  studentId: string
  academicYearId: string
  levelId: string | null
  status: string
}

type Assignment = {
  id: string
  courseId: string
  teacherId: string
  studentId: string
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

type DashboardStats = {
  studentsCount: number
  assignedCount: number
  unassignedCount: number
  presentCount: number
  absentCount: number
  lateCount: number
  excusedCount: number
}

type RegistrationRequest = {
  id: string
  status: string
}

function getLocalDateString() {
  const now = new Date()

  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

function normalizeDay(value: string) {
  return normalizeText(value).toLowerCase()
}

function getDayIndex(value: string) {
  const day = normalizeDay(value)

  const map: Record<string, number> = {
    sunday: 0,
    sun: 0,
    الأحد: 0,

    monday: 1,
    mon: 1,
    الاثنين: 1,
    الإثنين: 1,

    tuesday: 2,
    tue: 2,
    tues: 2,
    الثلاثاء: 2,

    wednesday: 3,
    wed: 3,
    الأربعاء: 3,

    thursday: 4,
    thu: 4,
    thurs: 4,
    الخميس: 4,

    friday: 5,
    fri: 5,
    الجمعة: 5,

    saturday: 6,
    sat: 6,
    السبت: 6,
  }

  return map[day]
}

function formatDate(date: string) {
  if (!date) return ''

  const parts = date.split('-')

  if (parts.length !== 3) {
    return date
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

function getDateRange(
  startDate: string | null,
  endDate: string | null,
  days: string[],
) {
  if (!startDate || !endDate) {
    return []
  }

  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start > end
  ) {
    return []
  }

  const allowedDays = days
    .map(getDayIndex)
    .filter(
      (day): day is number =>
        typeof day === 'number',
    )

  const result: string[] = []

  const current = new Date(start)

  while (current <= end) {
    const dayIndex = current.getDay()

    if (
      allowedDays.length === 0 ||
      allowedDays.includes(dayIndex)
    ) {
      const year = current.getFullYear()
      const month = String(
        current.getMonth() + 1,
      ).padStart(2, '0')
      const day = String(
        current.getDate(),
      ).padStart(2, '0')

      result.push(
        `${year}-${month}-${day}`,
      )
    }

    current.setDate(
      current.getDate() + 1,
    )
  }

  return result
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

function isLateStatus(name: string) {
  const value = normalizeText(name)

  return (
    value === 'متأخر' ||
    value === 'متأخر عن الحضور'
  )
}

function isExcusedStatus(name: string) {
  const value = normalizeText(name)

  return (
    value === 'مستأذن' ||
    value === 'مستأذن بعذر'
  )
}

export function DashboardView() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] =
    useState(false)

  const [academicYear, setAcademicYear] =
    useState<AcademicYear | null>(null)

  const [courses, setCourses] = useState<Course[]>(
    [],
  )

  const [enrollments, setEnrollments] =
    useState<Enrollment[]>([])

  const [assignments, setAssignments] =
    useState<Assignment[]>([])

  const [attendanceStatuses, setAttendanceStatuses] =
    useState<AttendanceStatus[]>([])

  const [attendanceRecords, setAttendanceRecords] =
    useState<AttendanceRecord[]>([])

  const [selectedCourseId, setSelectedCourseId] =
    useState('')

  const [selectedDate, setSelectedDate] =
    useState('')

  const [dateNeedsDefault, setDateNeedsDefault] =
    useState(true)

  const [
    pendingRegistrationCount,
    setPendingRegistrationCount,
  ] = useState(0)

  const selectedCourse = useMemo(() => {
    return (
      courses.find(
        (course) =>
          course.id === selectedCourseId,
      ) ?? null
    )
  }, [courses, selectedCourseId])

  const availableDates = useMemo(() => {
    if (!selectedCourse) {
      return []
    }

    return getDateRange(
      selectedCourse.startDate,
      selectedCourse.endDate,
      selectedCourse.days,
    )
  }, [selectedCourse])

  const loadAttendance = useCallback(
    async (courseIds: string[]) => {
      if (courseIds.length === 0) {
        setAttendanceRecords([])
        return
      }

      const [
        attendanceResult,
        statusesResult,
      ] = await Promise.all([
        supabase
          .from('attendance')
          .select(
            `
              id,
              student_id,
              enrollment_id,
              attendance_date,
              status_id,
              note,
              course_id
            `,
          )
          .in('course_id', courseIds),

        supabase
          .from('attendance_statuses')
          .select(
            'id, name',
          )
          .eq('is_active', true)
          .order(
            'sort_order',
            {
              ascending: true,
            },
          ),
      ])

      if (attendanceResult.error) {
        console.error(
          'Attendance load error:',
          attendanceResult.error,
        )
        setAttendanceRecords([])
      } else {
        setAttendanceRecords(
          (attendanceResult.data ??
            []) as AttendanceRecord[],
        )
      }

      if (statusesResult.error) {
        console.error(
          'Attendance statuses load error:',
          statusesResult.error,
        )

        setAttendanceStatuses([])
      } else {
        setAttendanceStatuses(
          (statusesResult.data ??
            []) as AttendanceStatus[],
        )
      }
    },
    [],
  )

  const loadData = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      try {
        const { data: yearData, error: yearError } =
          await supabase
            .from('academic_years')
            .select(
              `
                id,
                name,
                annual_fee,
                start_date,
                end_date
              `,
            )
            .eq('is_current', true)
            .eq('is_active', true)
            .maybeSingle()

        if (yearError) {
          throw yearError
        }

        if (!yearData) {
          setAcademicYear(null)
          setCourses([])
          setEnrollments([])
          setAssignments([])
          setAttendanceRecords([])
          setPendingRegistrationCount(0)
          return
        }

        const currentYear: AcademicYear = {
          id: yearData.id,
          name: yearData.name,
          annualFee:
            Number(yearData.annual_fee) || 0,
          startDate:
            yearData.start_date ?? null,
          endDate:
            yearData.end_date ?? null,
        }

        setAcademicYear(currentYear)

        const [
          coursesResult,
          enrollmentsResult,
          registrationsResult,
        ] = await Promise.all([
          supabase
            .from('courses')
            .select(
              `
                id,
                name,
                start_date,
                end_date,
                days,
                created_at
              `,
            )
            .eq(
              'academic_year_id',
              currentYear.id,
            )
            .order(
              'created_at',
              {
                ascending: true,
              },
            ),

          supabase
            .from('enrollments')
            .select(
              `
                id,
                student_id,
                academic_year_id,
                level_id,
                status
              `,
            )
            .eq(
              'academic_year_id',
              currentYear.id,
            )
            .eq(
              'status',
              'نشط',
            ),

          supabase
            .from('registration_requests')
            .select(
              'id, status',
            )
            .eq(
              'status',
              'pending',
            ),
        ])

        if (coursesResult.error) {
          throw coursesResult.error
        }

        if (enrollmentsResult.error) {
          throw enrollmentsResult.error
        }

        if (registrationsResult.error) {
          throw registrationsResult.error
        }

        const mappedCourses: Course[] = (
          coursesResult.data ?? []
        ).map((course) => ({
          id: course.id,
          name: course.name,
          startDate:
            course.start_date ?? null,
          endDate:
            course.end_date ?? null,
          days: Array.isArray(course.days)
            ? course.days
            : [],
          createdAt:
            course.created_at ?? null,
        }))

        const mappedEnrollments: Enrollment[] =
          (
            enrollmentsResult.data ?? []
          ).map((enrollment) => ({
            id: enrollment.id,
            studentId:
              enrollment.student_id,
            academicYearId:
              enrollment.academic_year_id,
            levelId:
              enrollment.level_id ?? null,
            status:
              enrollment.status,
          }))

        const courseIds =
          mappedCourses.map(
            (course) => course.id,
          )

        let mappedAssignments: Assignment[] =
          []

        if (courseIds.length > 0) {
          const {
            data: assignmentsData,
            error: assignmentsError,
          } = await supabase
            .from(
              'teacher_student_assignments',
            )
            .select(
              `
                id,
                course_id,
                teacher_id,
                student_id
              `,
            )
            .in(
              'course_id',
              courseIds,
            )

          if (assignmentsError) {
            throw assignmentsError
          }

          mappedAssignments = (
            assignmentsData ?? []
          ).map((assignment) => ({
            id: assignment.id,
            courseId:
              assignment.course_id,
            teacherId:
              assignment.teacher_id,
            studentId:
              assignment.student_id,
          }))
        }

        setCourses(mappedCourses)
        setEnrollments(
          mappedEnrollments,
        )
        setAssignments(
          mappedAssignments,
        )

        setPendingRegistrationCount(
          (
            registrationsResult.data ??
            []
          ).filter(
            (
              request: RegistrationRequest,
            ) =>
              request.status ===
              'pending',
          ).length,
        )

        setSelectedCourseId((current) => {
          if (
            current &&
            mappedCourses.some(
              (course) =>
                course.id === current,
            )
          ) {
            return current
          }

          if (
            mappedCourses.length ===
            0
          ) {
            return ''
          }

          const today =
            getLocalDateString()

          const currentCourse =
            mappedCourses.find(
              (course) => {
                const starts =
                  !course.startDate ||
                  course.startDate <=
                    today

                const ends =
                  !course.endDate ||
                  course.endDate >=
                    today

                return starts && ends
              },
            )

          return (
            currentCourse?.id ??
            mappedCourses[
              mappedCourses.length - 1
            ]?.id ??
            ''
          )
        })

        setDateNeedsDefault(true)

        await loadAttendance(
          courseIds,
        )
      } catch (error) {
        console.error(
          'Dashboard load error:',
          error,
        )
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [loadAttendance],
  )

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    if (
      !selectedCourse ||
      availableDates.length ===
        0 ||
      !dateNeedsDefault
    ) {
      return
    }

    const today =
      getLocalDateString()

    if (
      availableDates.includes(today)
    ) {
      setSelectedDate(today)
      setDateNeedsDefault(false)
      return
    }

    const previousDates =
      availableDates.filter(
        (date) => date < today,
      )

    if (
      previousDates.length > 0
    ) {
      setSelectedDate(
        previousDates[
          previousDates.length - 1
        ],
      )
      setDateNeedsDefault(false)
      return
    }

    setSelectedDate(
      availableDates[0] ?? '',
    )

    setDateNeedsDefault(false)
  }, [
    selectedCourse,
    availableDates,
    dateNeedsDefault,
  ])

  useEffect(() => {
    const refreshAttendance = async () => {
      if (
        courses.length === 0
      ) {
        return
      }

      await loadAttendance(
        courses.map(
          (course) => course.id,
        ),
      )
    }

    const handleFocus = () => {
      void refreshAttendance()
    }

    const handleVisibilityChange =
      () => {
        if (
          document.visibilityState ===
          'visible'
        ) {
          void refreshAttendance()
        }
      }

    window.addEventListener(
      'focus',
      handleFocus,
    )

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange,
    )

    return () => {
      window.removeEventListener(
        'focus',
        handleFocus,
      )

      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      )
    }
  }, [
    courses,
    loadAttendance,
  ])

  const stats = useMemo<DashboardStats>(
    () => {
      const studentIds = new Set(
        enrollments
          .filter(
            (enrollment) =>
              enrollment.status ===
              'نشط',
          )
          .map(
            (enrollment) =>
              enrollment.studentId,
          ),
      )

      const assignedStudentIds =
        new Set(
          assignments
            .filter(
              (assignment) =>
                assignment.courseId ===
                selectedCourseId,
            )
            .map(
              (assignment) =>
                assignment.studentId,
            ),
        )

      const studentsCount =
        studentIds.size

      const assignedCount =
        assignedStudentIds.size

      const unassignedCount =
        Array.from(studentIds).filter(
          (studentId) =>
            !assignedStudentIds.has(
              studentId,
            ),
        ).length

      let presentCount = 0
      let absentCount = 0
      let lateCount = 0
      let excusedCount = 0

      const selectedDateRecords =
        attendanceRecords.filter(
          (record) =>
            record.courseId ===
              selectedCourseId &&
            record.attendanceDate ===
              selectedDate &&
            assignedStudentIds.has(
              record.studentId,
            ),
        )

      const statusMap = new Map(
        attendanceStatuses.map(
          (status) => [
            status.id,
            status.name,
          ],
        ),
      )

      const seenStudents =
        new Set<string>()

      for (const record of selectedDateRecords) {
        if (
          seenStudents.has(
            record.studentId,
          )
        ) {
          continue
        }

        seenStudents.add(
          record.studentId,
        )

        const statusName =
          statusMap.get(
            record.statusId,
          ) ?? ''

        if (
          isPresentStatus(
            statusName,
          )
        ) {
          presentCount += 1
        } else if (
          isAbsentStatus(
            statusName,
          )
        ) {
          absentCount += 1
        } else if (
          isLateStatus(
            statusName,
          )
        ) {
          lateCount += 1
        } else if (
          isExcusedStatus(
            statusName,
          )
        ) {
          excusedCount += 1
        }
      }

      return {
        studentsCount,
        assignedCount,
        unassignedCount,
        presentCount,
        absentCount,
        lateCount,
        excusedCount,
      }
    },
    [
      enrollments,
      assignments,
      attendanceRecords,
      attendanceStatuses,
      selectedCourseId,
      selectedDate,
    ],
  )

  const attendanceRecordedCount =
    stats.presentCount +
    stats.absentCount +
    stats.lateCount +
    stats.excusedCount

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <RefreshCw className="size-4 animate-spin" />
          جاري تحميل لوحة التحكم...
        </div>
      </div>
    )
  }

  return (
    <div
      dir="rtl"
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            لوحة التحكم
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            نظرة سريعة على وضع الطلاب والدورات والحضور
          </p>

          {academicYear && (
            <p className="mt-1 text-xs text-muted-foreground">
              السنة الدراسية:{' '}
              <span className="font-medium text-foreground">
                {academicYear.name}
              </span>
            </p>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() =>
            void loadData(true)
          }
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw
            className={`size-4 ${
              refreshing
                ? 'animate-spin'
                : ''
            }`}
          />
          تحديث
        </Button>
      </div>

      {/* Course / Day selectors */}
      <Card>
        <CardContent className="p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <BookOpen className="size-4 text-primary" />
                الدورة
              </label>

              <select
                value={selectedCourseId}
                onChange={(event) => {
                  setSelectedCourseId(
                    event.target.value,
                  )
                  setSelectedDate('')
                  setDateNeedsDefault(
                    true,
                  )
                }}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-primary/30"
              >
                {courses.length ===
                  0 && (
                  <option value="">
                    لا توجد دورات
                  </option>
                )}

                {courses.map(
                  (course) => (
                    <option
                      key={course.id}
                      value={course.id}
                    >
                      {course.name}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <CalendarCheck className="size-4 text-primary" />
                اليوم
              </label>

              <select
                value={selectedDate}
                onChange={(event) => {
                  setSelectedDate(
                    event.target.value,
                  )
                  setDateNeedsDefault(
                    false,
                  )
                }}
                disabled={
                  availableDates.length ===
                  0
                }
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {availableDates.length ===
                  0 && (
                  <option value="">
                    لا توجد أيام متاحة
                  </option>
                )}

                {availableDates.map(
                  (date) => (
                    <option
                      key={date}
                      value={date}
                    >
                      {formatDate(date)}
                      {date ===
                        getLocalDateString()
                        ? ' — اليوم'
                        : ''}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main statistics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  طلاب السنة
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {stats.studentsCount}
                </p>
              </div>

              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Users className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  الموزعون في الدورة
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {stats.assignedCount}
                </p>
              </div>

              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <UserCheck className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  غير الموزعين في الدورة
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {stats.unassignedCount}
                </p>
              </div>

              <div className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <UserX className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  سجلات اليوم
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {attendanceRecordedCount}
                </p>
              </div>

              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CalendarCheck className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck className="size-5 text-primary" />
            حضور اليوم
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <UserCheck className="size-5" />
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    حضروا اليوم
                  </p>

                  <p className="mt-1 text-2xl font-bold">
                    {stats.presentCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <UserX className="size-5" />
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    غابوا اليوم
                  </p>

                  <p className="mt-1 text-2xl font-bold">
                    {stats.absentCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Clock3 className="size-5" />
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    متأخرون
                  </p>

                  <p className="mt-1 text-2xl font-bold">
                    {stats.lateCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <ClipboardCheck className="size-5" />
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    مستأذنون
                  </p>

                  <p className="mt-1 text-2xl font-bold">
                    {stats.excusedCount}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {selectedCourse && (
            <div className="mt-4 rounded-lg bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
              الدورة:{' '}
              <span className="font-medium text-foreground">
                {selectedCourse.name}
              </span>

              {selectedDate && (
                <>
                  {' '}
                  · التاريخ:{' '}
                  <span className="font-medium text-foreground">
                    {formatDate(
                      selectedDate,
                    )}
                  </span>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending registrations */}
      {pendingRegistrationCount >
        0 && (
        <button
          type="button"
          onClick={() =>
            router.push(
              '/enrollment',
            )
          }
          className="w-full rounded-xl border bg-card p-4 text-right shadow-sm transition-colors hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ClipboardCheck className="size-5" />
              </div>

              <div>
                <p className="font-medium">
                  طلبات تسجيل جديدة
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  لديك{' '}
                  {pendingRegistrationCount}{' '}
                  {pendingRegistrationCount ===
                  1
                    ? 'طلب تسجيل معلّق'
                    : 'طلبات تسجيل معلّقة'}
                </p>
              </div>
            </div>

            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {pendingRegistrationCount}
            </span>
          </div>
        </button>
      )}

      {/* Teacher comments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="size-5 text-primary" />
            تعليقات المعلمين على الطلبة
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 text-center">
            <div>
              <ClipboardCheck className="mx-auto size-7 text-muted-foreground/50" />

              <p className="mt-3 text-sm font-medium text-muted-foreground">
                تعليقات المعلمين ستظهر هنا
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                سيتم تفعيل عرض التفاصيل عند إضافة خاصية تعليقات المعلمين.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}