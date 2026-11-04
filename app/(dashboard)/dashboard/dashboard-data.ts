'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  loadActiveEnrollments,
  loadAssignments,
  loadAttendancePage,
  loadStudentAttendanceHistoryPage,
  loadAttendanceStatuses as loadAttendanceStatusesFromRepository,
  loadCourses as loadCoursesFromRepository,
  loadCourseTeachers,
  loadCurrentAcademicYear,
  loadPendingRegistrations,
  loadStudents,
  loadTeachers,
} from '@/lib/features/dashboard/repositories/dashboard.repository'

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

const ATTENDANCE_PAGE_SIZE = 500

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

// كاش مستقل لكل دورة وتاريخ.
const attendanceDateCache = new Map<
  string,
  AttendanceRecord[]
>()

// كاش مستقل لسجل حضور كل طالب في كل دورة وفترة.
const studentAttendanceCache = new Map<
  string,
  AttendanceRecord[]
>()

function getAttendanceCacheKey(
  courseId: string,
  date: string,
) {
  return `${normalizeId(courseId)}|${normalizeAttendanceDate(date)}`
}

export function getLocalDateString() {
  const now = new Date()

  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

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

  return value === 'حاضر' || value === 'حضور'
}

export function isAbsentStatus(name: string) {
  const value = normalizeText(name)

  return value === 'غائب' || value === 'غياب'
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
    Date.UTC(year, month - 1, day),
  )

  if (Number.isNaN(date.getTime())) {
    return 'no-lesson'
  }

  const dayIndex = date.getUTCDay()

  const isCourseDay = course.days.some(
    (courseDay) =>
      getDayIndex(courseDay) === dayIndex,
  )

  return isCourseDay ? 'lesson' : 'no-lesson'
}

export function useDashboardData() {
  // تكون قيم أول عرض متطابقة بين السيرفر والمتصفح.
  // نسترجع الكاش بعد اكتمال Hydration داخل useEffect.
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const initializedRef = useRef(false)

  const [academicYear, setAcademicYear] =
    useState<AcademicYear | null>(null)

  const [courses, setCourses] = useState<Course[]>([])

  const [enrollments, setEnrollments] =
    useState<Enrollment[]>([])

  const [assignments, setAssignments] =
    useState<Assignment[]>([])

  const [courseTeachers, setCourseTeachers] =
    useState<CourseTeacher[]>([])

  const [teachers, setTeachers] = useState<Teacher[]>([])

  const [attendanceStatuses, setAttendanceStatuses] =
    useState<AttendanceStatus[]>([])

  const [attendanceRecords, setAttendanceRecords] =
    useState<AttendanceRecord[]>([])

  const [students, setStudents] = useState<Student[]>([])

  // سجل حضور الطالب المختار فقط.
  const [
    studentAttendanceRecords,
    setStudentAttendanceRecords,
  ] = useState<AttendanceRecord[]>([])

  const [studentAttendanceLoading, setStudentAttendanceLoading] =
    useState(false)

  const [selectedCourseId, setSelectedCourseId] =
    useState('')

  const [selectedDate, setSelectedDate] = useState('')

  const [
    pendingRegistrationCount,
    setPendingRegistrationCount,
  ] = useState(0)

  // يمنع استجابة طلب قديم من استبدال بيانات الاختيار الجديد.
  const attendanceRequestId = useRef(0)

  // يمنع استجابة سجل طالب قديم من استبدال سجل الطالب الجديد.
  const studentAttendanceRequestId = useRef(0)

  // إذا كانت هناك بيانات محفوظة من تحميل سابق،
  // نربطها بمفتاح الدورة والتاريخ الصحيح.
  useEffect(() => {
    if (
      dashboardCache?.selectedCourseId &&
      dashboardCache?.selectedDate &&
      dashboardCache.attendanceRecords.length > 0
    ) {
      const key = getAttendanceCacheKey(
        dashboardCache.selectedCourseId,
        dashboardCache.selectedDate,
      )

      if (!attendanceDateCache.has(key)) {
        attendanceDateCache.set(
          key,
          dashboardCache.attendanceRecords,
        )
      }
    }
  }, [])

  const updateDashboardCache = useCallback(
    (patch: Partial<DashboardCache>) => {
      const current = dashboardCache

      dashboardCache = {
        academicYear: current?.academicYear ?? null,
        courses: current?.courses ?? [],
        enrollments: current?.enrollments ?? [],
        assignments: current?.assignments ?? [],
        courseTeachers: current?.courseTeachers ?? [],
        teachers: current?.teachers ?? [],
        attendanceStatuses:
          current?.attendanceStatuses ?? [],
        attendanceRecords:
          current?.attendanceRecords ?? [],
        students: current?.students ?? [],
        pendingRegistrationCount:
          current?.pendingRegistrationCount ?? 0,
        selectedCourseId:
          current?.selectedCourseId ?? '',
        selectedDate:
          current?.selectedDate ?? getLocalDateString(),
        ...patch,
      }
    },
    [],
  )

  const loadAttendanceStatuses = useCallback(
    async () => {
      if (attendanceStatuses.length > 0) {
        return
      }

      const { data, error } =
        await loadAttendanceStatusesFromRepository()

      if (error) {
        console.error(
          'Attendance statuses load error:',
          error,
        )
        return
      }

      const mappedStatuses: AttendanceStatus[] =
        (data ?? []).map((status) => ({
          id: normalizeId(status.id),
          name: String(status.name ?? ''),
        }))

      setAttendanceStatuses(mappedStatuses)

      updateDashboardCache({
        attendanceStatuses: mappedStatuses,
      })
    },
    [
      attendanceStatuses.length,
      updateDashboardCache,
    ],
  )

  // تحميل حضور يوم واحد لدورة واحدة فقط.
  const loadAttendance = useCallback(
    async (
      courseId: string,
      date: string,
      forceRefresh = false,
    ) => {
      const normalizedCourseId = normalizeId(courseId)
      const normalizedDate = normalizeAttendanceDate(date)

      if (!normalizedCourseId || !normalizedDate) {
        return
      }

      const requestId = ++attendanceRequestId.current

      const cacheKey = getAttendanceCacheKey(
        normalizedCourseId,
        normalizedDate,
      )

      // استخدام الكاش إذا كانت بيانات اليوم موجودة.
      if (
        !forceRefresh &&
        attendanceDateCache.has(cacheKey)
      ) {
        const cachedRecords =
          attendanceDateCache.get(cacheKey) ?? []

        setAttendanceRecords(cachedRecords)

        updateDashboardCache({
          attendanceRecords: cachedRecords,
        })

        return
      }

      const allAttendanceData: {
        id: string
        student_id: string
        enrollment_id: string | null
        attendance_date: string
        status_id: string
        note: string | null
        course_id: string
      }[] = []

      let from = 0

      while (true) {
        const { data, error } =
          await loadAttendancePage(
            [normalizedCourseId],
            from,
            from + ATTENDANCE_PAGE_SIZE - 1,
            normalizedDate,
          )

        if (error) {
          console.error(
            'Attendance load error:',
            error,
          )

          return
        }

        const page = data ?? []

        allAttendanceData.push(...page)

        if (page.length < ATTENDANCE_PAGE_SIZE) {
          break
        }

        from += ATTENDANCE_PAGE_SIZE
      }

      const records: AttendanceRecord[] =
        allAttendanceData.map((record) => ({
          id: String(record.id),
          studentId: normalizeId(record.student_id),
          enrollmentId: record.enrollment_id
            ? String(record.enrollment_id)
            : null,
          attendanceDate: normalizeAttendanceDate(
            record.attendance_date,
          ),
          statusId: normalizeId(record.status_id),
          note: record.note ?? null,
          courseId: normalizeId(record.course_id),
        }))

      // حفظ نتيجة اليوم في الكاش حتى عند الانتقال والعودة إليه.
      attendanceDateCache.set(cacheKey, records)

      // لا نسمح لطلب قديم بتغيير بيانات اليوم الحالي.
      if (requestId !== attendanceRequestId.current) {
        return
      }

      setAttendanceRecords(records)

      updateDashboardCache({
        attendanceRecords: records,
      })
    },
    [updateDashboardCache],
  )

  // تحميل سجل حضور طالب واحد عند اختياره فقط.
  const loadStudentAttendanceHistory = useCallback(
    async (
      studentId: string,
      courseId: string,
      fromDate: string,
      toDate: string,
      forceRefresh = false,
    ) => {
      const normalizedStudentId = normalizeId(studentId)
      const normalizedCourseId = normalizeId(courseId)
      const normalizedFromDate = normalizeAttendanceDate(fromDate)
      const normalizedToDate = normalizeAttendanceDate(toDate)

      const requestId = ++studentAttendanceRequestId.current

      if (
        !normalizedStudentId ||
        !normalizedCourseId ||
        !normalizedFromDate ||
        !normalizedToDate
      ) {
        setStudentAttendanceRecords([])
        setStudentAttendanceLoading(false)
        return []
      }

      const cacheKey = [
        normalizedCourseId,
        normalizedStudentId,
        normalizedFromDate,
        normalizedToDate,
      ].join('|')

      // استخدام الكاش إذا كان سجل الطالب محملاً مسبقاً.
      if (
        !forceRefresh &&
        studentAttendanceCache.has(cacheKey)
      ) {
        const cachedRecords =
          studentAttendanceCache.get(cacheKey) ?? []

        if (requestId === studentAttendanceRequestId.current) {
          setStudentAttendanceRecords(cachedRecords)
          setStudentAttendanceLoading(false)
        }

        return cachedRecords
      }

      setStudentAttendanceRecords([])
      setStudentAttendanceLoading(true)

      try {
        const allRows: AttendanceRecord[] = []
        let from = 0

        while (true) {
          const { data, error } =
            await loadStudentAttendanceHistoryPage(
              normalizedStudentId,
              normalizedCourseId,
              normalizedFromDate,
              normalizedToDate,
              from,
              from + ATTENDANCE_PAGE_SIZE - 1,
            )

          if (error) {
            throw error
          }

          const rows = data ?? []

          allRows.push(
            ...rows.map((row) => ({
              id: String(row.id),
              studentId: normalizeId(row.student_id),
              enrollmentId: row.enrollment_id
                ? normalizeId(row.enrollment_id)
                : null,
              attendanceDate: normalizeAttendanceDate(
                row.attendance_date,
              ),
              statusId: normalizeId(row.status_id),
              note: row.note ?? null,
              courseId: normalizeId(row.course_id),
            })),
          )

          if (rows.length < ATTENDANCE_PAGE_SIZE) {
            break
          }

          from += ATTENDANCE_PAGE_SIZE
        }

        // نحفظ النتيجة حتى لو كانت فارغة.
        studentAttendanceCache.set(cacheKey, allRows)

        if (requestId === studentAttendanceRequestId.current) {
          setStudentAttendanceRecords(allRows)
        }

        return allRows
      } catch (error) {
        console.error(
          'Student attendance history load error:',
          error,
        )

        if (requestId === studentAttendanceRequestId.current) {
          setStudentAttendanceRecords([])
        }

        return []
      } finally {
        if (requestId === studentAttendanceRequestId.current) {
          setStudentAttendanceLoading(false)
        }
      }
    },
    [],
  )

  const loadBackgroundData = useCallback(
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
          loadAssignments(courseIds),
          loadCourseTeachers(courseIds),
          loadStudents(enrolledStudentIds),
          loadPendingRegistrations(),
          loadAttendanceStatusesFromRepository(),
        ])

        if (assignmentsResult.error) {
          console.error(
            'Assignments background load error:',
            assignmentsResult.error,
          )
        }

        if (courseTeachersResult.error) {
          console.error(
            'Course teachers background load error:',
            courseTeachersResult.error,
          )
        }

        if (studentsResult.error) {
          console.error(
            'Students background load error:',
            studentsResult.error,
          )
        }

        if (registrationsResult.error) {
          console.error(
            'Registration background load error:',
            registrationsResult.error,
          )
        }

        if (statusesResult.error) {
          console.error(
            'Attendance statuses background load error:',
            statusesResult.error,
          )
        }

        const mappedAssignments: Assignment[] =
          (assignmentsResult.data ?? []).map(
            (assignment) => ({
              id: normalizeId(assignment.id),
              courseId: normalizeId(
                assignment.course_id,
              ),
              teacherId: normalizeId(
                assignment.teacher_id,
              ),
              studentId: normalizeId(
                assignment.student_id,
              ),
            }),
          )

        const mappedCourseTeachers: CourseTeacher[] =
          (courseTeachersResult.data ?? []).map(
            (item) => ({
              id: normalizeId(item.id),
              courseId: normalizeId(item.course_id),
              teacherId: normalizeId(item.teacher_id),
            }),
          )

        const mappedStudents: Student[] =
          (studentsResult.data ?? []).map(
            (student) => ({
              id: normalizeId(student.id),
              studentId: student.student_id ?? null,
              name: student.name,
              personalId: student.personal_id ?? null,
              phone: student.phone ?? null,
              whatsapp: student.whatsapp ?? null,
              status: student.status ?? null,
            }),
          )

        const mappedStatuses: AttendanceStatus[] =
          (statusesResult.data ?? []).map(
            (status) => ({
              id: normalizeId(status.id),
              name: String(status.name ?? ''),
            }),
          )

        const pendingCount =
          (registrationsResult.data ?? []).length

        setAssignments(mappedAssignments)
        setCourseTeachers(mappedCourseTeachers)
        setStudents(mappedStudents)
        setAttendanceStatuses(mappedStatuses)
        setPendingRegistrationCount(pendingCount)

        updateDashboardCache({
          assignments: mappedAssignments,
          courseTeachers: mappedCourseTeachers,
          students: mappedStudents,
          attendanceStatuses: mappedStatuses,
          pendingRegistrationCount: pendingCount,
        })

        const teacherIds = Array.from(
          new Set(
            mappedCourseTeachers.map(
              (item) => item.teacherId,
            ),
          ),
        ).filter(Boolean)

        if (teacherIds.length === 0) {
          setTeachers([])

          updateDashboardCache({
            teachers: [],
          })

          return
        }

        const { data, error } =
          await loadTeachers(teacherIds)

        if (error) {
          console.error(
            'Teachers background load error:',
            error,
          )
          return
        }

        const mappedTeachers: Teacher[] =
          (data ?? []).map((teacher) => ({
            id: normalizeId(teacher.id),
            name: teacher.name,
          }))

        setTeachers(mappedTeachers)

        updateDashboardCache({
          teachers: mappedTeachers,
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

  const loadData = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) {
        setRefreshing(true)
      } else if (dashboardCache === null) {
        setLoading(true)
      }

      try {
        const [
          yearResult,
          coursesResult,
          enrollmentsResult,
        ] = await Promise.all([
          loadCurrentAcademicYear(),
          loadCoursesFromRepository(),
          loadActiveEnrollments(),
        ])

        if (yearResult.error) {
          throw yearResult.error
        }

        if (coursesResult.error) {
          throw coursesResult.error
        }

        if (enrollmentsResult.error) {
          throw enrollmentsResult.error
        }

        if (!yearResult.data) {
          attendanceRequestId.current += 1
          studentAttendanceRequestId.current += 1

          setAcademicYear(null)
          setCourses([])
          setEnrollments([])
          setAssignments([])
          setCourseTeachers([])
          setTeachers([])
          setStudents([])
          setAttendanceRecords([])
          setStudentAttendanceRecords([])
          setStudentAttendanceLoading(false)
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
          id: String(yearResult.data.id),
          name: yearResult.data.name,
          annualFee:
            Number(yearResult.data.annual_fee) || 0,
          startDate:
            yearResult.data.start_date ?? null,
          endDate:
            yearResult.data.end_date ?? null,
        }

        const mappedCourses: Course[] =
          (coursesResult.data ?? [])
            .filter(
              (course) =>
                normalizeId(course.academic_year_id) ===
                normalizeId(currentYear.id),
            )
            .map((course) => ({
              id: normalizeId(course.id),
              name: course.name,
              startDate: course.start_date ?? null,
              endDate: course.end_date ?? null,
              days: getCourseDays(course.days),
              createdAt: course.created_at ?? null,
            }))

        const mappedEnrollments: Enrollment[] =
          (enrollmentsResult.data ?? [])
            .filter(
              (enrollment) =>
                normalizeId(enrollment.academic_year_id) ===
                normalizeId(currentYear.id),
            )
            .map((enrollment) => ({
              id: normalizeId(enrollment.id),
              studentId: normalizeId(
                enrollment.student_id,
              ),
              academicYearId: normalizeId(
                enrollment.academic_year_id,
              ),
              levelId: enrollment.level_id
                ? normalizeId(enrollment.level_id)
                : null,
              status: enrollment.status,
            }))

        let nextSelectedCourseId = selectedCourseId

        if (
          !nextSelectedCourseId ||
          !mappedCourses.some(
            (course) =>
              course.id === nextSelectedCourseId,
          )
        ) {
          const today = getLocalDateString()

          const currentCourse = mappedCourses.find(
            (course) => {
              const starts =
                !course.startDate ||
                course.startDate <= today

              const ends =
                !course.endDate ||
                course.endDate >= today

              return starts && ends
            },
          )

          nextSelectedCourseId =
            currentCourse?.id ??
            mappedCourses[mappedCourses.length - 1]?.id ??
            ''
        }

        setAcademicYear(currentYear)
        setCourses(mappedCourses)
        setEnrollments(mappedEnrollments)
        setSelectedCourseId(nextSelectedCourseId)

        updateDashboardCache({
          academicYear: currentYear,
          courses: mappedCourses,
          enrollments: mappedEnrollments,
          selectedCourseId: nextSelectedCourseId,
        })

        setLoading(false)

        const courseIds = mappedCourses.map(
          (course) => course.id,
        )

        const enrolledStudentIds = Array.from(
          new Set(
            mappedEnrollments
              .map((item) => item.studentId)
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

  // استرجاع الكاش أو بدء التحميل بعد أول عرض متطابق للسيرفر والمتصفح.
  useEffect(() => {
    if (initializedRef.current) {
      return
    }

    initializedRef.current = true

    const cache = dashboardCache

    if (cache !== null) {
      setAcademicYear(cache.academicYear)
      setCourses(cache.courses)
      setEnrollments(cache.enrollments)
      setAssignments(cache.assignments)
      setCourseTeachers(cache.courseTeachers)
      setTeachers(cache.teachers)
      setAttendanceStatuses(cache.attendanceStatuses)
      setAttendanceRecords(cache.attendanceRecords)
      setStudents(cache.students)
      setPendingRegistrationCount(
        cache.pendingRegistrationCount,
      )
      setSelectedCourseId(cache.selectedCourseId)
      setSelectedDate(
        cache.selectedDate || getLocalDateString(),
      )

      setLoading(false)
      setHydrated(true)
      return
    }

    setSelectedDate(getLocalDateString())
    setHydrated(true)

    if (dashboardDataLoading) {
      return
    }

    dashboardDataLoading = true

    void loadData().finally(() => {
      dashboardDataLoading = false
    })
  }, [loadData])

  useEffect(() => {
    if (!hydrated) return

    updateDashboardCache({
      selectedCourseId,
      selectedDate,
    })
  }, [
    hydrated,
    selectedCourseId,
    selectedDate,
    updateDashboardCache,
  ])

  // تحميل بيانات الدورة والتاريخ المختارين فقط.
  useEffect(() => {
    if (!hydrated) return

    if (!selectedCourseId || !selectedDate) {
      attendanceRequestId.current += 1
      setAttendanceRecords([])

      updateDashboardCache({
        attendanceRecords: [],
      })

      return
    }

    void loadAttendance(
      selectedCourseId,
      selectedDate,
    )
  }, [
    hydrated,
    selectedCourseId,
    selectedDate,
    loadAttendance,
    updateDashboardCache,
  ])

  useEffect(() => {
    if (!hydrated) return

    if (attendanceStatuses.length > 0) {
      return
    }

    void loadAttendanceStatuses()
  }, [
    hydrated,
    attendanceStatuses.length,
    loadAttendanceStatuses,
  ])

  // عند الرجوع للنافذة نحدّث اليوم الحالي فقط.
  // لا يوجد تحديث دوري كل 5 ثوانٍ.
  useEffect(() => {
    if (!hydrated) return

    if (!selectedCourseId || !selectedDate) {
      return
    }

    const refresh = () => {
      if (document.visibilityState === 'visible') {
        void loadAttendance(
          selectedCourseId,
          selectedDate,
          true,
        )
      }
    }

    window.addEventListener('focus', refresh)

    document.addEventListener(
      'visibilitychange',
      refresh,
    )

    return () => {
      window.removeEventListener('focus', refresh)

      document.removeEventListener(
        'visibilitychange',
        refresh,
      )
    }
  }, [
    hydrated,
    selectedCourseId,
    selectedDate,
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
    studentAttendanceRecords,
    studentAttendanceLoading,
    loadStudentAttendanceHistory,
    students,
    selectedCourseId,
    setSelectedCourseId,
    selectedDate,
    setSelectedDate,
    pendingRegistrationCount,
    loadData,
  }
}
