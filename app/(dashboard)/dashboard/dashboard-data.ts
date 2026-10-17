'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type AcademicYear = {
  id: string
  name: string
  annualFee: number
  startDate: string | null
  endDate: string | null
}

export type Course = {
  id: string
  name: string
  startDate: string | null
  endDate: string | null
  days: string[]
  createdAt: string | null
}

export type Enrollment = {
  id: string
  studentId: string
  academicYearId: string
  levelId: string | null
  status: string
}

export type Assignment = {
  id: string
  courseId: string
  teacherId: string
  studentId: string
}

export type CourseTeacher = {
  id: string
  courseId: string
  teacherId: string
}

export type Teacher = {
  id: string
  name: string
}

export type Student = {
  id: string
  studentId: string | null
  name: string
  personalId: string | null
  phone: string | null
  whatsapp: string | null
  status: string | null
}

export type AttendanceStatus = {
  id: string
  name: string
}

export type AttendanceRecord = {
  id: string
  studentId: string
  enrollmentId: string | null
  attendanceDate: string
  statusId: string
  note: string | null
  courseId: string
}

export type DashboardStats = {
  studentsCount: number
  assignedCount: number
  unassignedCount: number
  presentCount: number
  absentCount: number
  lateCount: number
  excusedCount: number
  recordedCount: number
}

export type LessonDateStatus =
  | 'no-course'
  | 'not-started'
  | 'ended'
  | 'no-lesson'
  | 'lesson'

export type DashboardCache = {
  academicYear: AcademicYear | null
  courses: Course[]
  enrollments: Enrollment[]
  assignments: Assignment[]
  courseTeachers: CourseTeacher[]
  teachers: Teacher[]
  attendanceStatuses: AttendanceStatus[]
  attendanceRecords: AttendanceRecord[]
  students: Student[]
  pendingRegistrationCount: number
  selectedCourseId: string
  selectedDate: string
}

let dashboardCache: DashboardCache | null = null

let dashboardDataLoading = false

export function getLocalDateString() {
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

export function normalizeText(
  value: string | null | undefined,
) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

export function normalizeId(
  value: string | null | undefined,
) {
  return String(value ?? '').trim()
}

export function normalizeAttendanceDate(
  value: string | null | undefined,
) {
  return String(value ?? '').slice(0, 10)
}

export function normalizeDay(value: string) {
  return normalizeText(value).toLowerCase()
}

export function getDayIndex(value: string) {
  const day = normalizeDay(value)

  const map: Record<string, number> = {
    sunday: 0,
    sun: 0,
    الأحد: 0,
    الاحد: 0,

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
    الاربعاء: 3,

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

  if (
    /^\d$/.test(day) &&
    Number(day) >= 0 &&
    Number(day) <= 6
  ) {
    return Number(day)
  }

  return map[day]
}

export function formatDate(date: string) {
  if (!date) return ''

  const parts = date.split('-')

  if (parts.length !== 3) {
    return date
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

export function isPresentStatus(name: string) {
  const value = normalizeText(name)

  return (
    value === 'حاضر' ||
    value === 'حضور'
  )
}

export function isAbsentStatus(name: string) {
  const value = normalizeText(name)

  return (
    value === 'غائب' ||
    value === 'غياب'
  )
}

export function isLateStatus(name: string) {
  const value = normalizeText(name)

  return (
    value === 'متأخر' ||
    value === 'متأخر عن الحضور'
  )
}

export function isExcusedStatus(name: string) {
  const value = normalizeText(name)

  return (
    value === 'مستأذن' ||
    value === 'مستأذن بعذر'
  )
}

export function getCourseDays(
  value: unknown,
): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item))
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)

      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item))
          .filter(Boolean)
      }
    } catch {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    }
  }

  return []
}

export function getLessonDateStatus(
  course: Course | null,
  selectedDate: string,
): LessonDateStatus {
  if (!course || !selectedDate) {
    return 'no-course'
  }

  if (
    course.startDate &&
    selectedDate < course.startDate
  ) {
    return 'not-started'
  }

  if (
    course.endDate &&
    selectedDate > course.endDate
  ) {
    return 'ended'
  }

  if (course.days.length === 0) {
    return 'lesson'
  }

  const parts = selectedDate.split('-')

  if (parts.length !== 3) {
    return 'no-lesson'
  }

  const year = Number(parts[0])
  const month = Number(parts[1])
  const day = Number(parts[2])

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
    ),
  )

  if (Number.isNaN(date.getTime())) {
    return 'no-lesson'
  }

  const dayIndex = date.getUTCDay()

  const isCourseDay =
    course.days.some(
      (courseDay) =>
        getDayIndex(courseDay) ===
        dayIndex,
    )

  return isCourseDay
    ? 'lesson'
    : 'no-lesson'
}


export function useDashboardData() {
  const hasDashboardCache = dashboardCache !== null

  const [loading, setLoading] =
    useState(!hasDashboardCache)

  const [refreshing, setRefreshing] =
    useState(false)

  const [academicYear, setAcademicYear] =
    useState<AcademicYear | null>(
      dashboardCache?.academicYear ?? null,
    )

  const [courses, setCourses] =
    useState<Course[]>(
      dashboardCache?.courses ?? [],
    )

  const [enrollments, setEnrollments] =
    useState<Enrollment[]>(
      dashboardCache?.enrollments ?? [],
    )

  const [assignments, setAssignments] =
    useState<Assignment[]>(
      dashboardCache?.assignments ?? [],
    )

  const [
    courseTeachers,
    setCourseTeachers,
  ] = useState<CourseTeacher[]>(
    dashboardCache?.courseTeachers ?? [],
  )

  const [teachers, setTeachers] =
    useState<Teacher[]>(
      dashboardCache?.teachers ?? [],
    )

  const [
    attendanceStatuses,
    setAttendanceStatuses,
  ] = useState<AttendanceStatus[]>(
    dashboardCache?.attendanceStatuses ?? [],
  )

  const [
    attendanceRecords,
    setAttendanceRecords,
  ] = useState<AttendanceRecord[]>(
    dashboardCache?.attendanceRecords ?? [],
  )

  const [students, setStudents] =
    useState<Student[]>(
      dashboardCache?.students ?? [],
    )

  const [
    selectedCourseId,
    setSelectedCourseId,
  ] = useState(
    dashboardCache?.selectedCourseId ?? '',
  )

  const [
    selectedDate,
    setSelectedDate,
  ] = useState(
    dashboardCache?.selectedDate ??
      getLocalDateString(),
  )

  const [
    pendingRegistrationCount,
    setPendingRegistrationCount,
  ] = useState(
    dashboardCache?.pendingRegistrationCount ??
      0,
  )
  const updateDashboardCache = useCallback(
    (
      patch: Partial<DashboardCache>,
    ) => {
      const current =
        dashboardCache

      dashboardCache = {
        academicYear:
          current?.academicYear ??
          null,
        courses:
          current?.courses ?? [],
        enrollments:
          current?.enrollments ?? [],
        assignments:
          current?.assignments ?? [],
        courseTeachers:
          current?.courseTeachers ?? [],
        teachers:
          current?.teachers ?? [],
        attendanceStatuses:
          current?.attendanceStatuses ??
          [],
        attendanceRecords:
          current?.attendanceRecords ??
          [],
        students:
          current?.students ?? [],
        pendingRegistrationCount:
          current?.pendingRegistrationCount ??
          0,
        selectedCourseId:
          current?.selectedCourseId ??
          '',
        selectedDate:
          current?.selectedDate ??
          getLocalDateString(),
        ...patch,
      }
    },
    [],
  )
  const loadAttendanceStatuses =
    useCallback(
      async () => {
        if (
          attendanceStatuses.length > 0
        ) {
          return
        }

        const {
          data,
          error,
        } = await supabase
          .from(
            'attendance_statuses',
          )
          .select(
            'id, name',
          )
          .eq(
            'is_active',
            true,
          )
          .order(
            'sort_order',
            {
              ascending: true,
            },
          )

        if (error) {
          console.error(
            'Attendance statuses load error:',
            error,
          )

          return
        }

        const mappedStatuses =
          (
            data ?? []
          ).map(
            (status) => ({
              id: normalizeId(
                status.id,
              ),
              name: String(
                status.name ??
                  '',
              ),
            }),
          )

        setAttendanceStatuses(
          mappedStatuses,
        )

        updateDashboardCache({
          attendanceStatuses:
            mappedStatuses,
        })
      },
      [
        attendanceStatuses.length,
        updateDashboardCache,
      ],
    )

  const loadAttendance =
    useCallback(
      async (courseIds: string[]) => {
        const normalizedCourseIds =
          Array.from(
            new Set(
              courseIds
                .map(normalizeId)
                .filter(Boolean),
            ),
          )

        if (
          normalizedCourseIds.length ===
          0
        ) {
          setAttendanceRecords([])

          updateDashboardCache({
            attendanceRecords: [],
          })

          return
        }

        const {
          data,
          error,
        } = await supabase
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
          .in(
            'course_id',
            normalizedCourseIds,
          )
          .order(
            'attendance_date',
            {
              ascending: false,
            },
          )
          .order(
            'created_at',
            {
              ascending: false,
            },
          )

        if (error) {
          console.error(
            'Attendance load error:',
            error,
          )

          return
        }

        const records =
          (
            data ?? []
          ).map(
            (record) => ({
              id: String(
                record.id,
              ),
              studentId: normalizeId(
                record.student_id,
              ),
              enrollmentId:
                record.enrollment_id
                  ? String(
                      record.enrollment_id,
                    )
                  : null,
              attendanceDate:
                normalizeAttendanceDate(
                  record.attendance_date,
                ),
              statusId: normalizeId(
                record.status_id,
              ),
              note:
                record.note ??
                null,
              courseId: normalizeId(
                record.course_id,
              ),
            }),
          )

        setAttendanceRecords(
          records,
        )

        updateDashboardCache({
          attendanceRecords:
            records,
        })
      },
      [updateDashboardCache],
    )

  const loadBackgroundData =
    useCallback(
      async (
        currentYearId: string,
        courseIds: string[],
        enrolledStudentIds: string[],
      ) => {
        try {
          const [
            assignmentsResult,
            courseTeachersResult,
            studentsResult,
            registrationsResult,
            statusesResult,
          ] = await Promise.all([
            courseIds.length > 0
              ? supabase
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
              : Promise.resolve({
                  data: [],
                  error: null,
                }),

            courseIds.length > 0
              ? supabase
                  .from(
                    'course_teachers',
                  )
                  .select(
                    `
                      id,
                      course_id,
                      teacher_id
                    `,
                  )
                  .in(
                    'course_id',
                    courseIds,
                  )
              : Promise.resolve({
                  data: [],
                  error: null,
                }),

            enrolledStudentIds.length > 0
              ? supabase
                  .from('students')
                  .select(
                    `
                      id,
                      student_id,
                      name,
                      personal_id,
                      phone,
                      whatsapp,
                      status
                    `,
                  )
                  .in(
                    'id',
                    enrolledStudentIds,
                  )
              : Promise.resolve({
                  data: [],
                  error: null,
                }),

            supabase
              .from(
                'registration_requests',
              )
              .select(
                'id, status',
              )
              .eq(
                'status',
                'pending',
              ),

            supabase
              .from(
                'attendance_statuses',
              )
              .select(
                'id, name',
              )
              .eq(
                'is_active',
                true,
              )
              .order(
                'sort_order',
                {
                  ascending: true,
                },
              ),
          ])

          if (
            assignmentsResult.error
          ) {
            console.error(
              'Assignments background load error:',
              assignmentsResult.error,
            )
          }

          if (
            courseTeachersResult.error
          ) {
            console.error(
              'Course teachers background load error:',
              courseTeachersResult.error,
            )
          }

          if (
            studentsResult.error
          ) {
            console.error(
              'Students background load error:',
              studentsResult.error,
            )
          }

          if (
            registrationsResult.error
          ) {
            console.error(
              'Registration background load error:',
              registrationsResult.error,
            )
          }

          if (
            statusesResult.error
          ) {
            console.error(
              'Attendance statuses background load error:',
              statusesResult.error,
            )
          }

          const mappedAssignments: Assignment[] =
            (
              assignmentsResult.data ??
              []
            ).map(
              (assignment) => ({
                id: normalizeId(
                  assignment.id,
                ),
                courseId:
                  normalizeId(
                    assignment.course_id,
                  ),
                teacherId:
                  normalizeId(
                    assignment.teacher_id,
                  ),
                studentId:
                  normalizeId(
                    assignment.student_id,
                  ),
              }),
            )

          const mappedCourseTeachers: CourseTeacher[] =
            (
              courseTeachersResult.data ??
              []
            ).map(
              (item) => ({
                id: normalizeId(
                  item.id,
                ),
                courseId:
                  normalizeId(
                    item.course_id,
                  ),
                teacherId:
                  normalizeId(
                    item.teacher_id,
                  ),
              }),
            )

          const mappedStudents: Student[] =
            (
              studentsResult.data ??
              []
            ).map(
              (student) => ({
                id: normalizeId(
                  student.id,
                ),
                studentId:
                  student.student_id ??
                  null,
                name:
                  student.name,
                personalId:
                  student.personal_id ??
                  null,
                phone:
                  student.phone ??
                  null,
                whatsapp:
                  student.whatsapp ??
                  null,
                status:
                  student.status ??
                  null,
              }),
            )

          const mappedStatuses: AttendanceStatus[] =
            (
              statusesResult.data ??
              []
            ).map(
              (status) => ({
                id: normalizeId(
                  status.id,
                ),
                name: String(
                  status.name ??
                    '',
                ),
              }),
            )

          const pendingCount =
            (
              registrationsResult.data ??
              []
            ).length

          setAssignments(
            mappedAssignments,
          )

          setCourseTeachers(
            mappedCourseTeachers,
          )

          setStudents(
            mappedStudents,
          )

          setAttendanceStatuses(
            mappedStatuses,
          )

          setPendingRegistrationCount(
            pendingCount,
          )

          updateDashboardCache({
            assignments:
              mappedAssignments,
            courseTeachers:
              mappedCourseTeachers,
            students:
              mappedStudents,
            attendanceStatuses:
              mappedStatuses,
            pendingRegistrationCount:
              pendingCount,
          })

          const teacherIds =
            Array.from(
              new Set(
                mappedCourseTeachers.map(
                  (item) =>
                    item.teacherId,
                ),
              ),
            ).filter(Boolean)

          if (
            teacherIds.length === 0
          ) {
            setTeachers([])

            updateDashboardCache({
              teachers: [],
            })

            return
          }

          const {
            data,
            error,
          } = await supabase
            .from('teachers')
            .select(
              'id, name',
            )
            .in(
              'id',
              teacherIds,
            )

          if (error) {
            console.error(
              'Teachers background load error:',
              error,
            )

            return
          }

          const mappedTeachers: Teacher[] =
            (
              data ?? []
            ).map(
              (teacher) => ({
                id: normalizeId(
                  teacher.id,
                ),
                name:
                  teacher.name,
              }),
            )

          setTeachers(
            mappedTeachers,
          )

          updateDashboardCache({
            teachers:
              mappedTeachers,
          })

          void currentYearId
        } catch (error) {
          console.error(
            'Dashboard background load error:',
            error,
          )
        }
      },
      [updateDashboardCache],
    )

  const loadData =
    useCallback(
      async (
        showRefresh = false,
      ) => {
        if (showRefresh) {
          setRefreshing(true)
        } else if (
          dashboardCache === null
        ) {
          setLoading(true)
        }

        try {
          const [
            yearResult,
            coursesResult,
            enrollmentsResult,
          ] = await Promise.all([
            supabase
              .from(
                'academic_years',
              )
              .select(
                `
                  id,
                  name,
                  annual_fee,
                  start_date,
                  end_date
                `,
              )
              .eq(
                'is_current',
                true,
              )
              .eq(
                'is_active',
                true,
              )
              .maybeSingle(),

            supabase
              .from('courses')
              .select(
                `
                  id,
                  name,
                  start_date,
                  end_date,
                  days,
                  created_at,
                  academic_year_id
                `,
              )
              .order(
                'created_at',
                {
                  ascending: true,
                },
              ),

            supabase
              .from(
                'enrollments',
              )
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
                'status',
                'نشط',
              ),
          ])

          if (
            yearResult.error
          ) {
            throw yearResult.error
          }

          if (
            coursesResult.error
          ) {
            throw coursesResult.error
          }

          if (
            enrollmentsResult.error
          ) {
            throw enrollmentsResult.error
          }

          if (!yearResult.data) {
            setAcademicYear(null)
            setCourses([])
            setEnrollments([])
            setAssignments([])
            setCourseTeachers([])
            setTeachers([])
            setStudents([])
            setAttendanceRecords([])
            setAttendanceStatuses([])
            setPendingRegistrationCount(0)
            setSelectedCourseId('')

            updateDashboardCache({
              academicYear: null,
              courses: [],
              enrollments: [],
              assignments: [],
              courseTeachers: [],
              teachers: [],
              students: [],
              attendanceRecords: [],
              attendanceStatuses: [],
              pendingRegistrationCount: 0,
              selectedCourseId: '',
            })

            return
          }

          const currentYear: AcademicYear = {
            id: String(
              yearResult.data.id,
            ),
            name:
              yearResult.data.name,
            annualFee:
              Number(
                yearResult.data.annual_fee,
              ) || 0,
            startDate:
              yearResult.data.start_date ??
              null,
            endDate:
              yearResult.data.end_date ??
              null,
          }

          const mappedCourses: Course[] =
            (
              coursesResult.data ??
              []
            )
              .filter(
                (course) =>
                  normalizeId(
                    course.academic_year_id,
                  ) ===
                  normalizeId(
                    currentYear.id,
                  ),
              )
              .map(
                (course) => ({
                  id: normalizeId(
                    course.id,
                  ),
                  name:
                    course.name,
                  startDate:
                    course.start_date ??
                    null,
                  endDate:
                    course.end_date ??
                    null,
                  days:
                    getCourseDays(
                      course.days,
                    ),
                  createdAt:
                    course.created_at ??
                    null,
                }),
              )

          const mappedEnrollments: Enrollment[] =
            (
              enrollmentsResult.data ??
              []
            )
               .filter(
                (enrollment) =>
                  normalizeId(
                    enrollment.academic_year_id,
                  ) === normalizeId(currentYear.id),
              )
              .map(
                (enrollment) => ({
                  id: normalizeId(
                    enrollment.id,
                  ),
                  studentId:
                    normalizeId(
                      enrollment.student_id,
                    ),
                  academicYearId:
                    normalizeId(
                      enrollment.academic_year_id,
                    ),
                  levelId:
                    enrollment.level_id
                      ? normalizeId(
                          enrollment.level_id,
                        )
                      : null,
                  status:
                    enrollment.status,
                }),
              )

          let nextSelectedCourseId =
            selectedCourseId

          if (
            !nextSelectedCourseId ||
            !mappedCourses.some(
              (course) =>
                course.id ===
                nextSelectedCourseId,
            )
          ) {
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

                  return (
                    starts &&
                    ends
                  )
                },
              )

            nextSelectedCourseId =
              currentCourse?.id ??
              mappedCourses[
                mappedCourses.length -
                  1
              ]?.id ??
              ''
          }

          setAcademicYear(
            currentYear,
          )

          setCourses(
            mappedCourses,
          )

          setEnrollments(
            mappedEnrollments,
          )

          setSelectedCourseId(
            nextSelectedCourseId,
          )

          updateDashboardCache({
            academicYear:
              currentYear,
            courses:
              mappedCourses,
            enrollments:
              mappedEnrollments,
            selectedCourseId:
              nextSelectedCourseId,
          })

          setLoading(false)

          const courseIds =
            mappedCourses.map(
              (course) =>
                course.id,
            )

          const enrolledStudentIds =
            Array.from(
              new Set(
                mappedEnrollments
                  .map(
                    (item) =>
                      item.studentId,
                  )
                  .filter(Boolean),
              ),
            )

          void loadBackgroundData(
            currentYear.id,
            courseIds,
            enrolledStudentIds,
          )
        } catch (error) {
          console.error(
            'Dashboard light load error:',
            error,
          )

          setLoading(false)
        } finally {
          if (showRefresh) {
            setRefreshing(false)
          }
        }
      },
      [
        selectedCourseId,
        updateDashboardCache,
        loadBackgroundData,
      ],
    )

  useEffect(() => {
    if (dashboardCache !== null) {
      return
    }

    if (dashboardDataLoading) {
      return
    }

    dashboardDataLoading = true

    void loadData().finally(() => {
      dashboardDataLoading = false
    })
  }, [loadData])

  useEffect(() => {
    updateDashboardCache({
      selectedCourseId,
      selectedDate,
    })
  }, [
    selectedCourseId,
    selectedDate,
    updateDashboardCache,
  ])

  useEffect(() => {
    if (!selectedCourseId) {
      return
    }

    void loadAttendance([
      selectedCourseId,
    ])
  }, [
    selectedCourseId,
    loadAttendance,
  ])

  useEffect(() => {
    if (
      attendanceStatuses.length > 0
    ) {
      return
    }

    void loadAttendanceStatuses()
  }, [
    attendanceStatuses.length,
    loadAttendanceStatuses,
  ])

  useEffect(() => {
    if (!selectedCourseId) {
      return
    }

    const refresh = () => {
      if (
        document.visibilityState ===
        'visible'
      ) {
        void loadAttendance([
          selectedCourseId,
        ])
      }
    }

    window.addEventListener(
      'focus',
      refresh,
    )

    document.addEventListener(
      'visibilitychange',
      refresh,
    )

    const interval =
      window.setInterval(() => {
        if (
          document.visibilityState ===
          'visible'
        ) {
          void loadAttendance([
            selectedCourseId,
          ])
        }
      }, 5000)

    return () => {
      window.removeEventListener(
        'focus',
        refresh,
      )

      document.removeEventListener(
        'visibilitychange',
        refresh,
      )

      window.clearInterval(
        interval,
      )
    }
  }, [
    selectedCourseId,
    loadAttendance,
  ])

  return {
    loading,
    refreshing,
    academicYear,
    courses,
    enrollments,
    assignments,
    courseTeachers,
    teachers,
    attendanceStatuses,
    attendanceRecords,
    students,
    selectedCourseId,
    setSelectedCourseId,
    selectedDate,
    setSelectedDate,
    pendingRegistrationCount,
    loadData,
  }
}
