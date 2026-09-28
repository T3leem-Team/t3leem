'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarCheck,
  ClipboardCheck,
  Clock3,
  RefreshCw,
  Search,
  UserCheck,
  UserX,
  Users,
  BookOpen,
  X,
  Download,
  SlidersHorizontal,
  FileSpreadsheet,
} from 'lucide-react'

import * as XLSX from 'xlsx'

import { supabase } from '@/lib/supabase'

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

type CourseTeacher = {
  id: string
  courseId: string
  teacherId: string
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

type DashboardStats = {
  studentsCount: number
  assignedCount: number
  unassignedCount: number
  presentCount: number
  absentCount: number
  lateCount: number
  excusedCount: number
  recordedCount: number
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

type DashboardCache = {
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

type ExportDateRange = {
  from: string
  to: string
}

let dashboardCache: DashboardCache | null = null

let dashboardDataLoading = false
let dashboardAccessChecked = false

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

function normalizeDay(value: string) {
  return normalizeText(value).toLowerCase()
}

function getDayIndex(value: string) {
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

function getAttendanceStatusLabel(
  name: string,
) {
  if (isPresentStatus(name)) {
    return 'حاضر'
  }

  if (isAbsentStatus(name)) {
    return 'غائب'
  }

  if (isLateStatus(name)) {
    return 'متأخر'
  }

  if (isExcusedStatus(name)) {
    return 'مستأذن'
  }

  return normalizeText(name) || null
}

function getCourseDays(
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

function getLessonDateStatus(
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

function getArabicDayName(
  dateString: string,
) {
  const parts = dateString.split('-')

  if (parts.length !== 3) {
    return ''
  }

  const date = new Date(
    Date.UTC(
      Number(parts[0]),
      Number(parts[1]) - 1,
      Number(parts[2]),
    ),
  )

  const names = [
    'الأحد',
    'الاثنين',
    'الثلاثاء',
    'الأربعاء',
    'الخميس',
    'الجمعة',
    'السبت',
  ]

  return names[date.getUTCDay()] ?? ''
}

function getDateRange(
  from: string,
  to: string,
) {
  const dates: string[] = []

  if (!from || !to || from > to) {
    return dates
  }

  const startParts = from.split('-')
  const endParts = to.split('-')

  if (
    startParts.length !== 3 ||
    endParts.length !== 3
  ) {
    return dates
  }

  const current = new Date(
    Date.UTC(
      Number(startParts[0]),
      Number(startParts[1]) - 1,
      Number(startParts[2]),
    ),
  )

  const end = new Date(
    Date.UTC(
      Number(endParts[0]),
      Number(endParts[1]) - 1,
      Number(endParts[2]),
    ),
  )

  if (
    Number.isNaN(current.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    return dates
  }

  while (current <= end) {
    const year = current.getUTCFullYear()

    const month = String(
      current.getUTCMonth() + 1,
    ).padStart(2, '0')

    const day = String(
      current.getUTCDate(),
    ).padStart(2, '0')

    dates.push(
      `${year}-${month}-${day}`,
    )

    current.setUTCDate(
      current.getUTCDate() + 1,
    )
  }

  return dates
}

function isCourseLessonDate(
  course: Course,
  date: string,
) {
  if (
    course.startDate &&
    date < course.startDate
  ) {
    return false
  }

  if (
    course.endDate &&
    date > course.endDate
  ) {
    return false
  }

  if (course.days.length === 0) {
    return true
  }

  const parts = date.split('-')

  if (parts.length !== 3) {
    return false
  }

  const dateObject = new Date(
    Date.UTC(
      Number(parts[0]),
      Number(parts[1]) - 1,
      Number(parts[2]),
    ),
  )

  if (
    Number.isNaN(
      dateObject.getTime(),
    )
  ) {
    return false
  }

  const dayIndex =
    dateObject.getUTCDay()

  return course.days.some(
    (courseDay) =>
      getDayIndex(courseDay) ===
      dayIndex,
  )
}

function getTeacherNameForStudent(
  assignments: Assignment[],
  teachers: Teacher[],
  courseId: string,
  studentId: string,
) {
  const teacherIds =
    Array.from(
      new Set(
        assignments
          .filter(
            (assignment) =>
              normalizeId(
                assignment.courseId,
              ) ===
                normalizeId(courseId) &&
              normalizeId(
                assignment.studentId,
              ) ===
                normalizeId(studentId),
          )
          .map(
            (assignment) =>
              normalizeId(
                assignment.teacherId,
              ),
          )
          .filter(Boolean),
      ),
    )

  const names = teacherIds
    .map(
      (teacherId) =>
        teachers.find(
          (teacher) =>
            normalizeId(
              teacher.id,
            ) === teacherId,
        )?.name,
    )
    .filter(
      (
        name,
      ): name is string =>
        Boolean(name),
    )

  return names.length > 0
    ? names.join('، ')
    : 'غير محدد'
}

export function DashboardView() {
  const router = useRouter()

  const [
    checkingAccess,
    setCheckingAccess,
  ] = useState(!dashboardAccessChecked)

  const [loading, setLoading] =
    useState(dashboardCache === null)

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

  const [
    attendanceDetailsOpen,
    setAttendanceDetailsOpen,
  ] = useState(false)

  const [
    studentSearch,
    setStudentSearch,
  ] = useState('')

  const [
    selectedStudent,
    setSelectedStudent,
  ] =
    useState<StudentSearchResult | null>(
      null,
    )

  const [
    exportModalOpen,
    setExportModalOpen,
  ] = useState(false)

  const [
    exportFromDate,
    setExportFromDate,
  ] = useState('')

  const [
    exportToDate,
    setExportToDate,
  ] = useState('')

  const [
    exporting,
    setExporting,
  ] = useState(false)

  const [
    exportError,
    setExportError,
  ] = useState('')

  const selectedCourse = useMemo(
    () =>
      courses.find(
        (course) =>
          normalizeId(course.id) ===
          normalizeId(selectedCourseId),
      ) ?? null,
    [
      courses,
      selectedCourseId,
    ],
  )

  const lessonDateStatus =
    useMemo(
      () =>
        getLessonDateStatus(
          selectedCourse,
          selectedDate,
        ),
      [
        selectedCourse,
        selectedDate,
      ],
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

  useEffect(() => {
    let cancelled = false

    async function checkDashboardAccess() {
      try {
        const response = await fetch(
          '/api/auth/dashboard-sections',
          {
            method: 'GET',
            cache: 'no-store',
          },
        )

        if (!response.ok) {
          router.replace('/login')
          return
        }

        const data =
          await response.json()

        const sections =
          Array.isArray(data.sections)
            ? data.sections
            : []

        const hasDashboard =
          sections.some(
            (section: {
              section_key?: string
            }) =>
              section.section_key ===
              'dashboard',
          )

        if (hasDashboard) {
          dashboardAccessChecked = true

          if (!cancelled) {
            setCheckingAccess(false)
          }

          return
        }

        const firstAllowedSection =
          sections[0]

        if (
          firstAllowedSection?.href
        ) {
          router.replace(
            firstAllowedSection.href,
          )
          return
        }

        router.replace('/login')
      } catch (error) {
        console.error(
          'Dashboard access check error:',
          error,
        )

        router.replace('/login')
      }
    }

    if (dashboardAccessChecked) {
      setCheckingAccess(false)
    }

    void checkDashboardAccess()

    return () => {
      cancelled = true
    }
  }, [router])

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
          attendanceResult.error
        ) {
          console.error(
            'Attendance load error:',
            attendanceResult.error,
          )

          return
        }

        if (
          statusesResult.error
        ) {
          console.error(
            'Attendance statuses load error:',
            statusesResult.error,
          )
        }

        const records =
          (
            attendanceResult.data ??
            []
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

        if (
          !statusesResult.error
        ) {
          const mappedStatuses =
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

          setAttendanceStatuses(
            mappedStatuses,
          )

          updateDashboardCache({
            attendanceStatuses:
              mappedStatuses,
          })
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
          const {
            data: yearData,
            error: yearError,
          } =
            await supabase
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
              .maybeSingle()

          if (yearError) {
            throw yearError
          }

          if (!yearData) {
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
            })

            return
          }

          const currentYear: AcademicYear = {
            id: String(
              yearData.id,
            ),
            name:
              yearData.name,
            annualFee:
              Number(
                yearData.annual_fee,
              ) || 0,
            startDate:
              yearData.start_date ??
              null,
            endDate:
              yearData.end_date ??
              null,
          }

          setAcademicYear(
            currentYear,
          )

          updateDashboardCache({
            academicYear:
              currentYear,
          })

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
                'academic_year_id',
                currentYear.id,
              )
              .eq(
                'status',
                'نشط',
              ),

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
          ])

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

          if (
            registrationsResult.error
          ) {
            throw registrationsResult.error
          }

          const mappedCourses: Course[] =
            (
              coursesResult.data ??
              []
            ).map(
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
            ).map(
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

          const courseIds =
            mappedCourses.map(
              (course) =>
                course.id,
            )

          let mappedAssignments: Assignment[] =
            []

          let mappedCourseTeachers: CourseTeacher[] =
            []

          let mappedTeachers: Teacher[] =
            []

          if (
            courseIds.length > 0
          ) {
            const [
              assignmentsResult,
              courseTeachersResult,
            ] = await Promise.all([
              supabase
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
                ),

              supabase
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
                ),
            ])

            if (
              assignmentsResult.error
            ) {
              throw assignmentsResult.error
            }

            if (
              courseTeachersResult.error
            ) {
              throw courseTeachersResult.error
            }

            mappedAssignments =
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

            mappedCourseTeachers =
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

            const teacherIds =
              Array.from(
                new Set(
                  mappedCourseTeachers.map(
                    (item) =>
                      item.teacherId,
                  ),
                ),
              )

            if (
              teacherIds.length > 0
            ) {
              const {
                data: teachersData,
                error: teachersError,
              } = await supabase
                .from('teachers')
                .select(
                  'id, name',
                )
                .in(
                  'id',
                  teacherIds,
                )

              if (
                teachersError
              ) {
                throw teachersError
              }

              mappedTeachers =
                (
                  teachersData ??
                  []
                ).map(
                  (teacher) => ({
                    id: normalizeId(
                      teacher.id,
                    ),
                    name:
                      teacher.name,
                  }),
                )
            }
          }

          const enrolledStudentIds =
            Array.from(
              new Set(
                mappedEnrollments.map(
                  (item) =>
                    item.studentId,
                ),
              ),
            )

          let mappedStudents: Student[] =
            []

          if (
            enrolledStudentIds.length >
            0
          ) {
            const {
              data: studentsData,
              error: studentsError,
            } = await supabase
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

            if (studentsError) {
              throw studentsError
            }

            mappedStudents =
              (
                studentsData ??
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
          }

          setCourses(
            mappedCourses,
          )

          setEnrollments(
            mappedEnrollments,
          )

          setAssignments(
            mappedAssignments,
          )

          setCourseTeachers(
            mappedCourseTeachers,
          )

          setTeachers(
            mappedTeachers,
          )

          setStudents(
            mappedStudents,
          )

          setPendingRegistrationCount(
            (
              registrationsResult.data ??
              []
            ).length,
          )

          updateDashboardCache({
            courses:
              mappedCourses,
            enrollments:
              mappedEnrollments,
            assignments:
              mappedAssignments,
            courseTeachers:
              mappedCourseTeachers,
            teachers:
              mappedTeachers,
            students:
              mappedStudents,
            pendingRegistrationCount:
              (
                registrationsResult.data ??
                []
              ).length,
          })

          setSelectedCourseId(
            (current) => {
              if (
                current &&
                mappedCourses.some(
                  (course) =>
                    course.id ===
                    current,
                )
              ) {
                updateDashboardCache({
                  selectedCourseId:
                    current,
                })

                return current
              }

              if (
                mappedCourses.length ===
                0
              ) {
                updateDashboardCache({
                  selectedCourseId:
                    '',
                })

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

                    return (
                      starts &&
                      ends
                    )
                  },
                )

              const nextCourseId =
                currentCourse?.id ??
                mappedCourses[
                  mappedCourses.length -
                    1
                ]?.id ??
                ''

              updateDashboardCache({
                selectedCourseId:
                  nextCourseId,
              })

              return nextCourseId
            },
          )

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
      [
        loadAttendance,
        updateDashboardCache,
      ],
    )

  useEffect(() => {
    if (checkingAccess) {
      return
    }

    if (dashboardDataLoading) {
      return
    }

    dashboardDataLoading = true

    void loadData().finally(() => {
      dashboardDataLoading = false
    })
  }, [
    checkingAccess,
    loadData,
  ])

  useEffect(() => {
    if (!selectedCourseId) {
      return
    }

    updateDashboardCache({
      selectedCourseId,
      selectedDate,
    })

    void loadAttendance([
      selectedCourseId,
    ])
  }, [
    selectedCourseId,
    selectedDate,
    loadAttendance,
    updateDashboardCache,
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

  const selectedCourseAssignments =
    useMemo(
      () =>
        assignments.filter(
          (assignment) =>
            normalizeId(
              assignment.courseId,
            ) ===
            normalizeId(
              selectedCourseId,
            ),
        ),
      [
        assignments,
        selectedCourseId,
      ],
    )

  const assignedStudentIds =
    useMemo(
      () =>
        new Set(
          selectedCourseAssignments.map(
            (assignment) =>
              normalizeId(
                assignment.studentId,
              ),
          ),
        ),
      [selectedCourseAssignments],
    )

  const selectedDateRecords =
    useMemo(() => {
      const selectedCourse =
        normalizeId(
          selectedCourseId,
        )

      const selectedDay =
        normalizeAttendanceDate(
          selectedDate,
        )

      const seenStudents =
        new Set<string>()

      return attendanceRecords.filter(
        (record) => {
          const recordCourse =
            normalizeId(
              record.courseId,
            )

          const recordStudent =
            normalizeId(
              record.studentId,
            )

          const recordDate =
            normalizeAttendanceDate(
              record.attendanceDate,
            )

          if (
            recordCourse !==
              selectedCourse ||
            recordDate !==
              selectedDay ||
            !recordStudent ||
            seenStudents.has(
              recordStudent,
            )
          ) {
            return false
          }

          seenStudents.add(
            recordStudent,
          )

          return true
        },
      )
    }, [
      attendanceRecords,
      selectedCourseId,
      selectedDate,
    ])

  const stats = useMemo<DashboardStats>(
    () => {
      const studentIds =
        new Set(
          enrollments
            .filter(
              (enrollment) =>
                enrollment.status ===
                'نشط',
            )
            .map(
              (enrollment) =>
                normalizeId(
                  enrollment.studentId,
                ),
            )
            .filter(Boolean),
        )

      const studentsCount =
        studentIds.size

      const assignedCount =
        assignedStudentIds.size

      const unassignedCount =
        Array.from(
          studentIds,
        ).filter(
          (studentId) =>
            !assignedStudentIds.has(
              studentId,
            ),
        ).length

      let presentCount = 0
      let absentCount = 0
      let lateCount = 0
      let excusedCount = 0

      for (const record of selectedDateRecords) {
        const statusName =
          statusMap.get(
            normalizeId(
              record.statusId,
            ),
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

      const recordedCount =
        presentCount +
        absentCount +
        lateCount +
        excusedCount

      return {
        studentsCount,
        assignedCount,
        unassignedCount,
        presentCount,
        absentCount,
        lateCount,
        excusedCount,
        recordedCount,
      }
    },
    [
      enrollments,
      assignedStudentIds,
      selectedDateRecords,
      statusMap,
    ],
  )

  const attendancePercentage =
    stats.assignedCount > 0
      ? Math.round(
          (stats.presentCount /
            stats.assignedCount) *
            100,
        )
      : 0

  const teacherAttendanceDetails =
    useMemo<TeacherAttendanceDetail[]>(
      () => {
        if (
          !selectedCourseId ||
          lessonDateStatus !== 'lesson'
        ) {
          return []
        }

        const normalizedCourseId =
          normalizeId(selectedCourseId)

        const courseTeacherRows =
          courseTeachers.filter(
            (item) =>
              normalizeId(
                item.courseId,
              ) === normalizedCourseId,
          )

        const assignmentRows =
          assignments.filter(
            (item) =>
              normalizeId(
                item.courseId,
              ) === normalizedCourseId,
          )

        const teacherIds =
          Array.from(
            new Set([
              ...courseTeacherRows.map(
                (item) =>
                  normalizeId(
                    item.teacherId,
                  ),
              ),
              ...assignmentRows.map(
                (item) =>
                  normalizeId(
                    item.teacherId,
                  ),
              ),
            ]),
          ).filter(Boolean)

        return teacherIds.map(
          (teacherId) => {
            const teacher =
              teachers.find(
                (item) =>
                  normalizeId(
                    item.id,
                  ) === teacherId,
              )

            const teacherStudentIds =
              new Set(
                assignmentRows
                  .filter(
                    (item) =>
                      normalizeId(
                        item.teacherId,
                      ) === teacherId,
                  )
                  .map(
                    (item) =>
                      normalizeId(
                        item.studentId,
                      ),
                  )
                  .filter(Boolean),
              )

            const studentCount =
              teacherStudentIds.size

            const teacherRecords =
              selectedDateRecords.filter(
                (record) =>
                  teacherStudentIds.has(
                    normalizeId(
                      record.studentId,
                    ),
                  ),
              )

            const seenStudents =
              new Set<string>()

            let presentCount = 0

            for (const record of teacherRecords) {
              const studentId =
                normalizeId(
                  record.studentId,
                )

              if (
                !studentId ||
                seenStudents.has(
                  studentId,
                )
              ) {
                continue
              }

              seenStudents.add(
                studentId,
              )

              const statusName =
                statusMap.get(
                  normalizeId(
                    record.statusId,
                  ),
                ) ?? ''

              if (
                isPresentStatus(
                  statusName,
                )
              ) {
                presentCount += 1
              }
            }

            const recordedCount =
              seenStudents.size

            const percentage =
              recordedCount === 0
                ? null
                : Math.round(
                    (presentCount /
                      studentCount) *
                      100,
                  )

            return {
              teacherId,
              teacherName:
                teacher?.name ??
                'معلم غير معروف',
              studentCount,
              presentCount,
              percentage,
              recordedCount,
            } as TeacherAttendanceDetail
          },
        )
      },
      [
        courseTeachers,
        assignments,
        teachers,
        selectedCourseId,
        selectedDateRecords,
        statusMap,
        lessonDateStatus,
      ],
    )

  const attendanceItems =
    useMemo(
      () => {
        const items = [
          {
            label: 'حاضرون',
            count:
              stats.presentCount,
            icon: UserCheck,
          },
          {
            label: 'غائبون',
            count:
              stats.absentCount,
            icon: UserX,
          },
          {
            label: 'متأخرون',
            count:
              stats.lateCount,
            icon: Clock3,
          },
          {
            label: 'مستأذنون',
            count:
              stats.excusedCount,
            icon: ClipboardCheck,
          },
        ]

        return items.filter(
          (item) =>
            item.count > 0,
        )
      },
      [stats],
    )

  const searchResults =
    useMemo<StudentSearchResult[]>(
      () => {
        const query =
          normalizeText(
            studentSearch,
          ).toLowerCase()

        if (
          query.length < 2
        ) {
          return []
        }

        const enrolledStudents =
          students.filter(
            (student) => {
              const values = [
                student.name,
                student.studentId ??
                  '',
                student.personalId ??
                  '',
                student.phone ??
                  '',
                student.whatsapp ??
                  '',
              ].map((value) =>
                normalizeText(
                  value,
                ).toLowerCase(),
              )

              return values.some(
                (value) =>
                  value.includes(
                    query,
                  ),
              )
            },
          )

        return enrolledStudents
          .slice(0, 8)
          .map((student) => {
            const studentCourseIds =
              Array.from(
                new Set(
                  assignments
                    .filter(
                      (assignment) =>
                        normalizeId(
                          assignment.studentId,
                        ) ===
                        normalizeId(
                          student.id,
                        ),
                    )
                    .map(
                      (assignment) =>
                        normalizeId(
                          assignment.courseId,
                        ),
                    ),
                ),
              )

            const courseNames =
              studentCourseIds
                .map(
                  (courseId) =>
                    courses.find(
                      (course) =>
                        normalizeId(
                          course.id,
                        ) ===
                        courseId,
                    )?.name,
                )
                .filter(
                  (
                    name,
                  ): name is string =>
                    Boolean(name),
                )

            const teacherNames =
              Array.from(
                new Set(
                  assignments
                    .filter(
                      (assignment) =>
                        normalizeId(
                          assignment.studentId,
                        ) ===
                        normalizeId(
                          student.id,
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

            let attendanceStatus:
              | string
              | null = null

            if (
              selectedCourseId &&
              selectedDate &&
              lessonDateStatus ===
                'lesson'
            ) {
              const record =
                attendanceRecords.find(
                  (item) =>
                    normalizeId(
                      item.studentId,
                    ) ===
                      normalizeId(
                        student.id,
                      ) &&
                    normalizeId(
                      item.courseId,
                    ) ===
                      normalizeId(
                        selectedCourseId,
                      ) &&
                    normalizeAttendanceDate(
                      item.attendanceDate,
                    ) ===
                      normalizeAttendanceDate(
                        selectedDate,
                      ),
                )

              if (record) {
                const rawStatus =
                  statusMap.get(
                    normalizeId(
                      record.statusId,
                    ),
                  ) ?? ''

                attendanceStatus =
                  getAttendanceStatusLabel(
                    rawStatus,
                  )
              }
            }

            return {
              student,
              courseNames,
              teacherNames,
              attendanceStatus,
            }
          })
      },
      [
        studentSearch,
        students,
        assignments,
        courses,
        teachers,
        attendanceRecords,
        selectedCourseId,
        selectedDate,
        statusMap,
        lessonDateStatus,
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

  /*
   * ---------------------------------------------------------
   * تصدير الحضور إلى Excel
   * ---------------------------------------------------------
   */

  const exportAttendanceExcel =
    useCallback(
      async (
        range: ExportDateRange,
      ) => {
        if (!selectedCourse) {
          setExportError(
            'يرجى اختيار دورة أولاً.',
          )

          return
        }

        if (
          !range.from ||
          !range.to
        ) {
          setExportError(
            'يرجى تحديد تاريخ البداية والنهاية.',
          )

          return
        }

        if (range.from > range.to) {
          setExportError(
            'تاريخ البداية يجب أن يكون قبل تاريخ النهاية.',
          )

          return
        }

        setExporting(true)
        setExportError('')

        try {
          const today =
            getLocalDateString()

          let fromDate =
            range.from

          let toDate =
            range.to

          /*
           * لا نسمح بالتصدير بعد اليوم.
           */
          if (toDate > today) {
            toDate = today
          }

          /*
           * نلتزم بفترة الدورة.
           */
          if (
            selectedCourse.startDate &&
            fromDate <
              selectedCourse.startDate
          ) {
            fromDate =
              selectedCourse.startDate
          }

          if (
            selectedCourse.endDate &&
            toDate >
              selectedCourse.endDate
          ) {
            toDate =
              selectedCourse.endDate
          }

          if (fromDate > toDate) {
            setExportError(
              'الفترة المختارة لا تحتوي على أيام ضمن فترة الدورة.',
            )

            return
          }

          const allDates =
            getDateRange(
              fromDate,
              toDate,
            )

          const lessonDates =
            allDates.filter(
              (date) =>
                isCourseLessonDate(
                  selectedCourse,
                  date,
                ),
            )

          if (
            lessonDates.length ===
            0
          ) {
            setExportError(
              'لا توجد أيام دراسية للدورة ضمن الفترة المختارة.',
            )

            return
          }

          const courseAssignments =
            assignments.filter(
              (assignment) =>
                normalizeId(
                  assignment.courseId,
                ) ===
                normalizeId(
                  selectedCourse.id,
                ),
            )

          /*
           * نربط كل طالب بالمعلم/المعلمين
           * الموزعين عليه في هذه الدورة.
           */
          const studentIds =
            Array.from(
              new Set(
                courseAssignments
                  .map(
                    (assignment) =>
                      normalizeId(
                        assignment.studentId,
                      ),
                  )
                  .filter(Boolean),
              ),
            )

          const studentMap =
            new Map(
              students.map(
                (student) => [
                  normalizeId(
                    student.id,
                  ),
                  student,
                ],
              ),
            )

          /*
           * إذا كان هناك طالب في القيد لكن
           * لا يوجد له assignment، لا ندخله
           * في تفاصيل الدورة لأنه غير موزع.
           */
          const exportStudents =
            studentIds
              .map(
                (studentId) =>
                  studentMap.get(
                    studentId,
                  ),
              )
              .filter(
                (
                  student,
                ): student is Student =>
                  Boolean(student),
              )

          /*
           * لتجنب تكرار السجل في حالة وجود
           * أكثر من assignment لنفس الطالب
           * في نفس التاريخ.
           */
          const recordMap =
            new Map<
              string,
              AttendanceRecord
            >()

          for (const record of attendanceRecords) {
            const courseId =
              normalizeId(
                record.courseId,
              )

            if (
              courseId !==
              normalizeId(
                selectedCourse.id,
              )
            ) {
              continue
            }

            const date =
              normalizeAttendanceDate(
                record.attendanceDate,
              )

            if (
              date < fromDate ||
              date > toDate
            ) {
              continue
            }

            const key =
              `${normalizeId(record.studentId)}__${date}`

            if (
              !recordMap.has(key)
            ) {
              recordMap.set(
                key,
                record,
              )
            }
          }

          /*
           * -------------------------------------------------
           * ورقة 1: تفاصيل الحضور
           * -------------------------------------------------
           *
           * كل طالب + كل يوم دراسي.
           * عدم وجود سجل = لم يسجل.
           */

          const detailRows: Record<
            string,
            unknown
          >[] = []

          for (const date of lessonDates) {
            for (const student of exportStudents) {
              const studentId =
                normalizeId(
                  student.id,
                )

              const record =
                recordMap.get(
                  `${studentId}__${date}`,
                )

              const rawStatus =
                record
                  ? statusMap.get(
                      normalizeId(
                        record.statusId,
                      ),
                    ) ?? ''
                  : ''

              const status =
                record
                  ? getAttendanceStatusLabel(
                      rawStatus,
                    ) ??
                    normalizeText(
                      rawStatus,
                    )
                  : 'لم يسجل'

              const teacherName =
                getTeacherNameForStudent(
                  assignments,
                  teachers,
                  selectedCourse.id,
                  studentId,
                )

              detailRows.push({
                'المعلم':
                  teacherName,
                'الدورة':
                  selectedCourse.name,
                'اسم الطالب':
                  student.name,
                'رقم الطالب':
                  student.studentId ??
                  '',
                'الرقم الشخصي':
                  student.personalId ??
                  '',
                'التاريخ':
                  formatDate(date),
                'اليوم':
                  getArabicDayName(
                    date,
                  ),
                'الحالة':
                  status,
                'ملاحظة':
                  record?.note ??
                  '',
              })
            }
          }

          /*
           * -------------------------------------------------
           * ورقة 2: ملخص الطلاب
           * -------------------------------------------------
           */

          const summaryRows: Record<
            string,
            unknown
          >[] = []

          for (const student of exportStudents) {
            const studentId =
              normalizeId(
                student.id,
              )

            let presentCount = 0
            let absentCount = 0
            let lateCount = 0
            let excusedCount = 0
            let notRecordedCount = 0

            for (const date of lessonDates) {
              const record =
                recordMap.get(
                  `${studentId}__${date}`,
                )

              if (!record) {
                notRecordedCount += 1
                continue
              }

              const statusName =
                statusMap.get(
                  normalizeId(
                    record.statusId,
                  ),
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
              } else {
                /*
                 * أي حالة غير معروفة نعتبرها
                 * غير مسجلة حتى لا تدخل
                 * خطأً في نسبة الحضور.
                 */
                notRecordedCount += 1
              }
            }

            const recordedCount =
              presentCount +
              absentCount +
              lateCount +
              excusedCount

            const attendedCount =
              presentCount +
              lateCount +
              excusedCount

            const percentage =
              recordedCount > 0
                ? Number(
                    (
                      (attendedCount /
                        recordedCount) *
                      100
                    ).toFixed(1),
                  )
                : 0

            const teacherName =
              getTeacherNameForStudent(
                assignments,
                teachers,
                selectedCourse.id,
                studentId,
              )

            summaryRows.push({
              'المعلم':
                teacherName,
              'الدورة':
                selectedCourse.name,
              'اسم الطالب':
                student.name,
              'رقم الطالب':
                student.studentId ??
                '',
              'الرقم الشخصي':
                student.personalId ??
                '',
              'من تاريخ':
                formatDate(
                  fromDate,
                ),
              'إلى تاريخ':
                formatDate(
                  toDate,
                ),
              'عدد أيام الدراسة':
                lessonDates.length,
              'حاضر':
                presentCount,
              'غائب':
                absentCount,
              'متأخر':
                lateCount,
              'مستأذن':
                excusedCount,
              'لم يسجل':
                notRecordedCount,
              'الأيام المسجلة':
                recordedCount,
              'أيام الحضور':
                attendedCount,
              'نسبة الحضور':
                `${percentage}%`,
            })
          }

          /*
           * إنشاء ملف Excel.
           */

          const workbook =
            XLSX.utils.book_new()

          const detailsSheet =
            XLSX.utils.json_to_sheet(
              detailRows,
            )

          const summarySheet =
            XLSX.utils.json_to_sheet(
              summaryRows,
            )

          /*
           * عرض الأعمدة بشكل مرتب.
           */

          detailsSheet['!cols'] = [
            { wch: 24 },
            { wch: 24 },
            { wch: 28 },
            { wch: 14 },
            { wch: 16 },
            { wch: 14 },
            { wch: 14 },
            { wch: 16 },
            { wch: 30 },
          ]

          summarySheet['!cols'] = [
            { wch: 24 },
            { wch: 24 },
            { wch: 28 },
            { wch: 14 },
            { wch: 16 },
            { wch: 14 },
            { wch: 14 },
            { wch: 18 },
            { wch: 12 },
            { wch: 12 },
            { wch: 12 },
            { wch: 12 },
            { wch: 14 },
            { wch: 16 },
            { wch: 16 },
            { wch: 16 },
          ]

          XLSX.utils.book_append_sheet(
            workbook,
            detailsSheet,
            'تفاصيل الحضور',
          )

          XLSX.utils.book_append_sheet(
            workbook,
            summarySheet,
            'ملخص الطلاب',
          )

          const fileName =
            `تقرير حضور ${selectedCourse.name} ${fromDate} إلى ${toDate}.xlsx`

          XLSX.writeFile(
            workbook,
            fileName,
          )

          setExportModalOpen(false)
          setExportError('')
        } catch (error) {
          console.error(
            'Attendance Excel export error:',
            error,
          )

          setExportError(
            error instanceof Error
              ? error.message
              : 'تعذر إنشاء ملف Excel.',
          )
        } finally {
          setExporting(false)
        }
      },
      [
        selectedCourse,
        assignments,
        students,
        teachers,
        attendanceRecords,
        statusMap,
      ],
    )

  const handleDownloadCourseToToday =
    useCallback(() => {
      if (!selectedCourse) {
        return
      }

      const today =
        getLocalDateString()

      let from =
        selectedCourse.startDate ??
        academicYear?.startDate ??
        today

      let to = today

      if (
        selectedCourse.endDate &&
        selectedCourse.endDate <
          to
      ) {
        to =
          selectedCourse.endDate
      }

      setExportError('')

      void exportAttendanceExcel({
        from,
        to,
      })
    }, [
      selectedCourse,
      academicYear,
      exportAttendanceExcel,
    ])

  const openCustomExport =
    useCallback(() => {
      if (!selectedCourse) {
        return
      }

      const today =
        getLocalDateString()

      let from =
        selectedCourse.startDate ??
        academicYear?.startDate ??
        today

      let to = today

      if (
        selectedCourse.endDate &&
        selectedCourse.endDate <
          to
      ) {
        to =
          selectedCourse.endDate
      }

      setExportFromDate(from)
      setExportToDate(to)
      setExportError('')
      setExportModalOpen(true)
    }, [
      selectedCourse,
      academicYear,
    ])

  if (checkingAccess || loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <RefreshCw className="size-4 animate-spin" />
          جاري تحميل لوحة المعلومات...
        </div>
      </div>
    )
  }

  return (
    <>
      <div
        dir="rtl"
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              لوحة المعلومات
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              نظرة سريعة على الطلاب والدورات والحضور
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
              className={
                refreshing
                  ? 'size-4 animate-spin'
                  : 'size-4'
              }
            />
            تحديث
          </Button>
        </div>

        {/* Quick student search */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="size-5 text-primary" />
              البحث السريع عن طالب
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="relative">
              <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <input
                value={studentSearch}
                onChange={(event) =>
                  setStudentSearch(
                    event.target.value,
                  )
                }
                placeholder="ابحث بالاسم أو الرقم الشخصي أو رقم الطالب..."
                className="h-11 w-full rounded-lg border bg-background px-10 text-sm outline-none transition-colors focus:ring-2 focus:ring-primary/30"
              />

              {studentSearch && (
                <button
                  type="button"
                  onClick={() =>
                    setStudentSearch('')
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {studentSearch.trim().length >=
              2 && (
              <div className="mt-3 overflow-hidden rounded-lg border">
                {searchResults.length ===
                0 ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    لا يوجد طالب مطابق للبحث
                  </div>
                ) : (
                  <div className="divide-y">
                    {searchResults.map(
                      (result) => (
                        <button
                          key={
                            result.student
                              .id
                          }
                          type="button"
                          onClick={() =>
                            setSelectedStudent(
                              result,
                            )
                          }
                          className="w-full px-4 py-3 text-right transition-colors hover:bg-muted/40"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {
                                  result
                                    .student
                                    .name
                                }
                              </p>

                              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                {result
                                  .student
                                  .studentId && (
                                  <span>
                                    رقم الطالب:{' '}
                                    {
                                      result
                                        .student
                                        .studentId
                                    }
                                  </span>
                                )}

                                {result
                                  .student
                                  .personalId && (
                                  <span>
                                    الرقم الشخصي:{' '}
                                    {
                                      result
                                        .student
                                        .personalId
                                    }
                                  </span>
                                )}
                              </div>
                            </div>

                            {result.attendanceStatus && (
                              <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                                {
                                  result.attendanceStatus
                                }
                              </span>
                            )}
                          </div>
                        </button>
                      ),
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Course / date */}
        <Card>
          <CardContent className="p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <BookOpen className="size-4 text-primary" />
                  الدورة
                </label>

                <select
                  value={
                    selectedCourseId
                  }
                  onChange={(
                    event,
                  ) => {
                    setSelectedCourseId(
                      event.target
                        .value,
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
                        key={
                          course.id
                        }
                        value={
                          course.id
                        }
                      >
                        {
                          course.name
                        }
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <CalendarCheck className="size-4 text-primary" />
                  التاريخ
                </label>

                <input
                  type="date"
                  value={
                    selectedDate
                  }
                  onChange={(
                    event,
                  ) => {
                    setSelectedDate(
                      event.target
                        .value,
                    )
                  }}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Year / course membership */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    المسجلون لهذه السنة
                  </p>

                  <p className="mt-2 text-3xl font-bold">
                    {
                      stats.studentsCount
                    }
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
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    المنضمون لهذه الدورة
                  </p>

                  <p className="mt-2 text-3xl font-bold">
                    {
                      stats.assignedCount
                    }
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
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    غير منضمين لهذه الدورة
                  </p>

                  <p className="mt-2 text-3xl font-bold">
                    {
                      stats.unassignedCount
                    }
                  </p>
                </div>

                <div className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <UserX className="size-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Daily attendance */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2">
                <CalendarCheck className="size-5 text-primary" />
                ملخص الحضور
              </CardTitle>

              <div className="flex flex-wrap items-center gap-2">
                {/* الزر الحالي - لم تتغير وظيفته */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setAttendanceDetailsOpen(
                      true,
                    )
                  }
                  disabled={
                    !selectedCourseId ||
                    !selectedDate ||
                    lessonDateStatus !==
                      'lesson'
                  }
                  className="gap-2"
                >
                  <Users className="size-4" />
                  تفاصيل الحضور
                </Button>

                {/* تنزيل من بداية الدورة حتى اليوم */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={
                    handleDownloadCourseToToday
                  }
                  disabled={
                    !selectedCourse ||
                    exporting
                  }
                  className="gap-2"
                >
                  <Download className="size-4" />
                  تنزيل من بداية الدورة
                </Button>

                {/* تنزيل مخصص */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={
                    openCustomExport
                  }
                  disabled={
                    !selectedCourse ||
                    exporting
                  }
                  className="gap-2"
                >
                  <SlidersHorizontal className="size-4" />
                  تنزيل مخصص
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="rounded-xl border bg-muted/20 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {lessonDateStatus ===
                  'lesson' ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        نسبة الحضور
                      </p>

                      <p className="mt-1 text-3xl font-bold">
                        {
                          attendancePercentage
                        }
                        %
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {
                          stats.presentCount
                        }{' '}
                        حاضر من أصل{' '}
                        {
                          stats.assignedCount
                        }{' '}
                        موزعين في الدورة
                      </p>

                      {stats.recordedCount >
                        0 &&
                        stats.recordedCount <
                          stats.assignedCount && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            تم تسجيل الحضور لـ{' '}
                            {
                              stats.recordedCount
                            }{' '}
                            من أصل{' '}
                            {
                              stats.assignedCount
                            }
                          </p>
                        )}
                    </>
                  ) : (
                    <p className="text-sm font-medium text-muted-foreground">
                      {lessonDateStatus ===
                      'not-started'
                        ? 'لم تبدأ الدورة بعد'
                        : lessonDateStatus ===
                            'ended'
                          ? 'انتهت الدورة'
                          : lessonDateStatus ===
                              'no-lesson'
                            ? 'لا يوجد درس هذا اليوم'
                            : 'اختر دورة لعرض ملخص الحضور'}
                    </p>
                  )}
                </div>

                <div className="text-sm text-muted-foreground">
                  {selectedCourse && (
                    <p>
                      الدورة:{' '}
                      <span className="font-medium text-foreground">
                        {
                          selectedCourse.name
                        }
                      </span>
                    </p>
                  )}

                  {selectedDate && (
                    <p className="mt-1">
                      التاريخ:{' '}
                      <span className="font-medium text-foreground">
                        {formatDate(
                          selectedDate,
                        )}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {lessonDateStatus ===
              'not-started' && (
              <div className="mt-4 rounded-xl border border-dashed bg-muted/10 px-6 py-8 text-center">
                <CalendarCheck className="mx-auto size-7 text-muted-foreground/50" />

                <p className="mt-3 text-sm font-medium text-muted-foreground">
                  لم تبدأ الدورة بعد
                </p>

                {selectedCourse?.startDate && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    تبدأ الدورة في{' '}
                    {formatDate(
                      selectedCourse.startDate,
                    )}
                  </p>
                )}
              </div>
            )}

            {lessonDateStatus ===
              'ended' && (
              <div className="mt-4 rounded-xl border border-dashed bg-muted/10 px-6 py-8 text-center">
                <CalendarCheck className="mx-auto size-7 text-muted-foreground/50" />

                <p className="mt-3 text-sm font-medium text-muted-foreground">
                  انتهت الدورة
                </p>

                {selectedCourse?.endDate && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    انتهت الدورة في{' '}
                    {formatDate(
                      selectedCourse.endDate,
                    )}
                  </p>
                )}
              </div>
            )}

            {lessonDateStatus ===
              'no-lesson' && (
              <div className="mt-4 rounded-xl border border-dashed bg-muted/10 px-6 py-8 text-center">
                <CalendarCheck className="mx-auto size-7 text-muted-foreground/50" />

                <p className="mt-3 text-sm font-medium text-muted-foreground">
                  لا يوجد درس هذا اليوم
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  هذا التاريخ داخل فترة الدورة، لكنه ليس من أيام الدراسة المحددة للدورة.
                </p>
              </div>
            )}

            {lessonDateStatus ===
              'no-course' && (
              <div className="mt-4 rounded-xl border border-dashed bg-muted/10 px-6 py-8 text-center">
                <CalendarCheck className="mx-auto size-7 text-muted-foreground/50" />

                <p className="mt-3 text-sm font-medium text-muted-foreground">
                  لا توجد دورة محددة
                </p>
              </div>
            )}

            {lessonDateStatus ===
              'lesson' &&
              attendanceItems.length >
                0 && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {attendanceItems.map(
                    (item) => {
                      const Icon =
                        item.icon

                      return (
                        <div
                          key={
                            item.label
                          }
                          className="rounded-xl border p-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <Icon className="size-5" />
                            </div>

                            <div>
                              <p className="text-xs text-muted-foreground">
                                {
                                  item.label
                                }
                              </p>

                              <p className="mt-1 text-2xl font-bold">
                                {
                                  item.count
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    },
                  )}
                </div>
              )}

            {lessonDateStatus ===
              'lesson' &&
              attendanceItems.length ===
                0 && (
                <div className="mt-4 rounded-xl border border-dashed bg-muted/10 px-6 py-8 text-center">
                  <CalendarCheck className="mx-auto size-7 text-muted-foreground/50" />

                  <p className="mt-3 text-sm font-medium text-muted-foreground">
                    لا توجد سجلات حضور لهذا اليوم
                  </p>

                  {stats.assignedCount >
                    0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      عدد الطلاب الموزعين:{' '}
                      {
                        stats.assignedCount
                      }
                    </p>
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
                    {
                      pendingRegistrationCount
                    }{' '}
                    طلب تسجيل معلّق
                  </p>
                </div>
              </div>

              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
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
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="size-5 text-primary" />
              تعليقات المعلمين على الطلبة
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="flex min-h-[110px] items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 text-center">
              <div>
                <ClipboardCheck className="mx-auto size-7 text-muted-foreground/50" />

                <p className="mt-3 text-sm font-medium text-muted-foreground">
                  تعليقات المعلمين ستظهر هنا
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  سيتم تفعيل هذه الخاصية لاحقًا.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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

      {/* Custom export modal */}
      {exportModalOpen && (
        <div
          dir="rtl"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onMouseDown={() =>
            !exporting &&
            setExportModalOpen(
              false,
            )
          }
        >
          <div
            className="w-full max-w-md rounded-2xl border bg-background shadow-xl"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="flex items-center gap-2 font-semibold">
                  <FileSpreadsheet className="size-5 text-primary" />
                  تنزيل حضور مخصص
                </h2>

                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedCourse?.name ??
                    'الدورة'}
                </p>
              </div>

              <button
                type="button"
                disabled={exporting}
                onClick={() =>
                  setExportModalOpen(
                    false,
                  )
                }
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    من تاريخ
                  </label>

                  <input
                    type="date"
                    value={
                      exportFromDate
                    }
                    min={
                      selectedCourse?.startDate ??
                      academicYear?.startDate ??
                      undefined
                    }
                    max={
                      selectedCourse?.endDate &&
                      selectedCourse.endDate <
                        getLocalDateString()
                        ? selectedCourse.endDate
                        : getLocalDateString()
                    }
                    onChange={(
                      event,
                    ) =>
                      setExportFromDate(
                        event.target
                          .value,
                      )
                    }
                    disabled={
                      exporting
                    }
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    إلى تاريخ
                  </label>

                  <input
                    type="date"
                    value={
                      exportToDate
                    }
                    min={
                      selectedCourse?.startDate ??
                      academicYear?.startDate ??
                      undefined
                    }
                    max={
                      selectedCourse?.endDate &&
                      selectedCourse.endDate <
                        getLocalDateString()
                        ? selectedCourse.endDate
                        : getLocalDateString()
                    }
                    onChange={(
                      event,
                    ) =>
                      setExportToDate(
                        event.target
                          .value,
                      )
                    }
                    disabled={
                      exporting
                    }
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="text-xs leading-6 text-muted-foreground">
                  سيتم إنشاء ملف Excel يحتوي على ورقتين:
                  <br />
                  <span className="font-medium text-foreground">
                    تفاصيل الحضور
                  </span>{' '}
                  لكل طالب ولكل يوم دراسي.
                  <br />
                  <span className="font-medium text-foreground">
                    ملخص الطلاب
                  </span>{' '}
                  مع إجمالي الحالات ونسبة الحضور للفترة.
                </p>
              </div>

              {exportError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {exportError}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setExportModalOpen(
                      false,
                    )
                  }
                  disabled={
                    exporting
                  }
                >
                  إلغاء
                </Button>

                <Button
                  type="button"
                  onClick={() =>
                    void exportAttendanceExcel({
                      from:
                        exportFromDate,
                      to:
                        exportToDate,
                    })
                  }
                  disabled={
                    exporting ||
                    !exportFromDate ||
                    !exportToDate
                  }
                  className="gap-2"
                >
                  {exporting ? (
                    <>
                      <RefreshCw className="size-4 animate-spin" />
                      جاري إنشاء الملف...
                    </>
                  ) : (
                    <>
                      <Download className="size-4" />
                      تنزيل Excel
                    </>
                  )}
                </Button>
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