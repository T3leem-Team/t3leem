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
} from 'lucide-react'

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

import { DashboardAttendanceExport } from '@/components/sections/dashboard-attendance-export'

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

export function DashboardView() {
  const router = useRouter()

  const hasDashboardCache =
    dashboardCache !== null

  const [
    checkingAccess,
    setCheckingAccess,
  ] = useState(
    !dashboardAccessChecked &&
      !hasDashboardCache,
  )

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

  /*
   * صلاحية Dashboard.
   *
   * إذا كانت الصلاحية مفحوصة سابقًا لا نعيد الطلب.
   */
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
      return
    }

    void checkDashboardAccess()

    return () => {
      cancelled = true
    }
  }, [router])

  /*
   * تحميل حالات الحضور مرة واحدة فقط.
   */
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

  /*
   * تحميل حضور الدورة المحددة فقط.
   */
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

  /*
   * تحميل البيانات الثقيلة في الخلفية.
   *
   * هذه الدالة لا تمنع ظهور Dashboard.
   *
   * تشمل:
   * - الإسنادات
   * - معلمي الدورات
   * - المعلمين
   * - الطلاب
   * - حالات الحضور
   * - التسجيلات
   */
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

          /*
           * المعلمين يعتمدون فقط على course_teachers،
           * لذلك نطلب IDs بعد وصول البيانات.
           */
          const teacherIds =
            Array.from(
              new Set(
                mappedCourseTeachers.map(
                  (item) =>
                    item.teacherId,
                ),
              ),
            ).filter(Boolean)

          let mappedTeachers: Teacher[] =
            []

          if (
            teacherIds.length > 0
          ) {
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
            } else {
              mappedTeachers =
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
            }
          }

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

          setTeachers(
            mappedTeachers,
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
            teachers:
              mappedTeachers,
            students:
              mappedStudents,
            attendanceStatuses:
              mappedStatuses,
            pendingRegistrationCount:
              pendingCount,
          })

          /*
           * currentYearId مستخدم هنا حتى يبقى
           * واضح أن البيانات تخص السنة الحالية.
           */
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

  /*
   * التحميل الخفيف أولًا:
   *
   * السنة + الدورات + التسجيلات النشطة.
   *
   * هذه هي البيانات المطلوبة لعرض:
   * - اسم السنة
   * - الدورة
   * - تاريخ الدورة
   * - عدد المسجلين
   *
   * بعدها يبدأ التحميل الثقيل بالخلفية.
   */
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
          /*
           * ============================
           * المرحلة الأولى: خفيفة وسريعة
           * ============================
           */
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

            /*
             * الدورات نحتاجها مباشرة حتى
             * تظهر أسماء الدورات والتواريخ.
             *
             * نحدد السنة من النتيجة بعد ذلك،
             * لذلك هذا الطلب يستخدم السنة الحالية
             * من قاعدة البيانات بشكل مستقل.
             */
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

            /*
             * هذا هو مصدر عدد المسجلين.
             * لا نحتاج بقية بيانات الطالب الآن.
             */
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
                  ) ===
                  normalizeId(
                    currentYear.id,
                  ),
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

          /*
           * نحدد الدورة قبل إظهار الواجهة.
           */
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

          /*
           * نضع البيانات الخفيفة في الواجهة فورًا.
           */
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

          /*
           * انتهى الجزء الذي يمنع ظهور اللوحة.
           */
          setLoading(false)

          /*
           * ============================
           * المرحلة الثانية: الخلفية
           * ============================
           */
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

          /*
           * لا ننتظر هذه العملية.
           *
           * الواجهة ظهرت بالفعل.
           */
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

  /*
   * أول فتح:
   * لا نعيد التحميل إذا كان عندنا cache.
   */
  useEffect(() => {
    if (checkingAccess) {
      return
    }

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
  }, [
    checkingAccess,
    loadData,
  ])

  /*
   * حفظ الاختيارات في الكاش.
   *
   * تغيير التاريخ لا يسبب أي طلب إلى Supabase.
   */
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

  /*
   * عند تغيير الدورة فقط:
   * نحمل حضور الدورة الجديدة.
   */
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

  /*
   * إذا حالات الحضور غير موجودة،
   * نحملها مرة واحدة في الخلفية.
   */
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

  /*
   * تحديث الحضور للدورة المحددة فقط.
   */
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
            color:
              'border-emerald-200 bg-emerald-50 text-emerald-700',
            iconColor:
              'bg-emerald-100 text-emerald-700',
          },
          {
            label: 'غائبون',
            count:
              stats.absentCount,
            icon: UserX,
            color:
              'border-red-200 bg-red-50 text-red-700',
            iconColor:
              'bg-red-100 text-red-700',
          },
          {
            label: 'متأخرون',
            count:
              stats.lateCount,
            icon: Clock3,
            color:
              'border-amber-200 bg-amber-50 text-amber-700',
            iconColor:
              'bg-amber-100 text-amber-700',
          },
          {
            label: 'مستأذنون',
            count:
              stats.excusedCount,
            icon: ClipboardCheck,
            color:
              'border-sky-200 bg-sky-50 text-sky-700',
            iconColor:
              'bg-sky-100 text-sky-700',
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
            onClick={() =>
              void loadData(true)
            }
            disabled={refreshing}
            className="h-10 min-w-[120px] gap-2 border border-sky-200 bg-sky-50 px-4 text-sky-700 shadow-sm hover:bg-sky-100"
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
              <Search className="size-5 text-slate-500" />
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
                className="h-11 w-full rounded-lg border bg-background px-10 text-sm outline-none transition-colors focus:ring-2 focus:ring-sky-200"
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
                              <span className="shrink-0 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
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
                  <BookOpen className="size-4 text-slate-500" />
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
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-sky-200"
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
                  <CalendarCheck className="size-4 text-slate-500" />
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
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-sky-200"
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

                <div className="flex size-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600">
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

                <div className="flex size-11 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700">
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

                <div className="flex size-11 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600">
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
                <CalendarCheck className="size-5 text-slate-500" />
                ملخص الحضور
              </CardTitle>

              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                <Button
                  type="button"
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
                  className="h-10 min-w-[150px] flex-1 gap-2 border border-violet-200 bg-violet-50 px-4 text-violet-700 shadow-sm hover:bg-violet-100 sm:flex-none"
                >
                  <Users className="size-4" />
                  تفاصيل الحضور
                </Button>

                <DashboardAttendanceExport
                  course={selectedCourse}
                  academicYear={
                    academicYear
                  }
                  assignments={
                    assignments
                  }
                  teachers={teachers}
                  students={students}
                  attendanceRecords={
                    attendanceRecords
                  }
                  attendanceStatuses={
                    attendanceStatuses
                  }
                />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="rounded-xl border bg-background p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {lessonDateStatus ===
                  'lesson' ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        نسبة الحضور
                      </p>

                      <p
                        className={`mt-1 text-3xl font-bold ${
                          attendancePercentage >=
                          60
                            ? 'text-emerald-600'
                            : 'text-red-600'
                        }`}
                      >
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
              <div className="mt-4 rounded-xl border border-dashed px-6 py-8 text-center">
                <CalendarCheck className="mx-auto size-7 text-slate-300" />

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
              <div className="mt-4 rounded-xl border border-dashed px-6 py-8 text-center">
                <CalendarCheck className="mx-auto size-7 text-slate-300" />

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
              <div className="mt-4 rounded-xl border border-dashed px-6 py-8 text-center">
                <CalendarCheck className="mx-auto size-7 text-slate-300" />

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
              <div className="mt-4 rounded-xl border border-dashed px-6 py-8 text-center">
                <CalendarCheck className="mx-auto size-7 text-slate-300" />

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
                          className={`rounded-xl border p-4 ${item.color}`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex size-10 items-center justify-center rounded-lg ${item.iconColor}`}
                            >
                              <Icon className="size-5" />
                            </div>

                            <div>
                              <p className="text-xs opacity-80">
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
                <div className="mt-4 rounded-xl border border-dashed px-6 py-8 text-center">
                  <CalendarCheck className="mx-auto size-7 text-slate-300" />

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
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="size-5 text-slate-500" />
              تعليقات المعلمين على الطلبة
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="flex min-h-[110px] items-center justify-center rounded-xl border border-dashed px-6 text-center">
              <div>
                <ClipboardCheck className="mx-auto size-7 text-slate-300" />

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