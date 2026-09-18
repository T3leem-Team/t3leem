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
} from '@/components/sections/dashboard-attendance-details'

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

type RegistrationRequest = {
  id: string
  status: string
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

type StudentSearchResult = {
  student: Student
  courseNames: string[]
  teacherNames: string[]
  attendanceStatus: string | null
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

function normalizeText(
  value: string | null | undefined,
) {
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

  const start = new Date(
    `${startDate}T00:00:00`,
  )

  const end = new Date(
    `${endDate}T00:00:00`,
  )

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
      const year =
        current.getFullYear()

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

function isPresentStatus(
  name: string,
) {
  const value = normalizeText(name)

  return (
    value === 'حاضر' ||
    value === 'حضور'
  )
}

function isAbsentStatus(
  name: string,
) {
  const value = normalizeText(name)

  return (
    value === 'غائب' ||
    value === 'غياب'
  )
}

function isLateStatus(
  name: string,
) {
  const value = normalizeText(name)

  return (
    value === 'متأخر' ||
    value === 'متأخر عن الحضور'
  )
}

function isExcusedStatus(
  name: string,
) {
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
      .map((item) =>
        String(item),
      )
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    try {
      const parsed =
        JSON.parse(value)

      if (Array.isArray(parsed)) {
        return parsed
          .map((item) =>
            String(item),
          )
          .filter(Boolean)
      }
    } catch {
      return value
        .split(',')
        .map((item) =>
          item.trim(),
        )
        .filter(Boolean)
    }
  }

  return []
}

export function DashboardView() {
  const router = useRouter()

  const [loading, setLoading] =
    useState(true)

  const [refreshing, setRefreshing] =
    useState(false)

  const [academicYear, setAcademicYear] =
    useState<AcademicYear | null>(null)

  const [courses, setCourses] =
    useState<Course[]>([])

  const [enrollments, setEnrollments] =
    useState<Enrollment[]>([])

  const [assignments, setAssignments] =
    useState<Assignment[]>([])

  const [
    courseTeachers,
    setCourseTeachers,
  ] = useState<CourseTeacher[]>([])

  const [teachers, setTeachers] =
    useState<Teacher[]>([])

  const [
    attendanceStatuses,
    setAttendanceStatuses,
  ] = useState<AttendanceStatus[]>(
    [],
  )

  const [
    attendanceRecords,
    setAttendanceRecords,
  ] = useState<AttendanceRecord[]>(
    [],
  )

  const [students, setStudents] =
    useState<Student[]>([])

  const [
    selectedCourseId,
    setSelectedCourseId,
  ] = useState('')

  const [
    selectedDate,
    setSelectedDate,
  ] = useState('')

  const [
    dateNeedsDefault,
    setDateNeedsDefault,
  ] = useState(true)

  const [
    pendingRegistrationCount,
    setPendingRegistrationCount,
  ] = useState(0)

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
          course.id ===
          selectedCourseId,
      ) ?? null,
    [
      courses,
      selectedCourseId,
    ],
  )

  const availableDates = useMemo(
    () => {
      if (!selectedCourse) {
        return []
      }

      return getDateRange(
        selectedCourse.startDate,
        selectedCourse.endDate,
        selectedCourse.days,
      )
    },
    [selectedCourse],
  )

  const loadAttendance =
    useCallback(
      async (courseIds: string[]) => {
        if (
          courseIds.length === 0
        ) {
          setAttendanceRecords([])
          setAttendanceStatuses([])
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
              courseIds,
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

          setAttendanceRecords([])
        } else {
          setAttendanceRecords(
            (attendanceResult.data ??
              []) as AttendanceRecord[],
          )
        }

        if (
          statusesResult.error
        ) {
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

  const loadData =
    useCallback(
      async (
        showRefresh = false,
      ) => {
        if (showRefresh) {
          setRefreshing(true)
        } else {
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
            setPendingRegistrationCount(
              0,
            )
            return
          }

          const currentYear: AcademicYear =
            {
              id: yearData.id,
              name: yearData.name,
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
            ).map((course) => ({
              id: course.id,
              name: course.name,
              startDate:
                course.start_date ??
                null,
              endDate:
                course.end_date ??
                null,
              days: getCourseDays(
                course.days,
              ),
              createdAt:
                course.created_at ??
                null,
            }))

          const mappedEnrollments: Enrollment[] =
            (
              enrollmentsResult.data ??
              []
            ).map(
              (enrollment) => ({
                id: enrollment.id,
                studentId:
                  enrollment.student_id,
                academicYearId:
                  enrollment.academic_year_id,
                levelId:
                  enrollment.level_id ??
                  null,
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
                  id: assignment.id,
                  courseId:
                    assignment.course_id,
                  teacherId:
                    assignment.teacher_id,
                  studentId:
                    assignment.student_id,
                }),
              )

            mappedCourseTeachers =
              (
                courseTeachersResult.data ??
                []
              ).map(
                (item) => ({
                  id: item.id,
                  courseId:
                    item.course_id,
                  teacherId:
                    item.teacher_id,
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
                    id: teacher.id,
                    name: teacher.name,
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

            if (
              studentsError
            ) {
              throw studentsError
            }

            mappedStudents =
              (
                studentsData ??
                []
              ).map(
                (student) => ({
                  id: student.id,
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

                    return (
                      starts &&
                      ends
                    )
                  },
                )

              return (
                currentCourse?.id ??
                mappedCourses[
                  mappedCourses.length -
                    1
                ]?.id ??
                ''
              )
            },
          )

          setDateNeedsDefault(
            true,
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
      availableDates.includes(
        today,
      )
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
    const refreshAttendance =
      async () => {
        if (
          courses.length === 0
        ) {
          return
        }

        await loadAttendance(
          courses.map(
            (course) =>
              course.id,
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

  const statusMap = useMemo(
    () =>
      new Map(
        attendanceStatuses.map(
          (status) => [
            status.id,
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
            assignment.courseId ===
            selectedCourseId,
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
              assignment.studentId,
          ),
        ),
      [selectedCourseAssignments],
    )

  const selectedDateRecords =
    useMemo(() => {
      const seenStudents =
        new Set<string>()

      return attendanceRecords.filter(
        (record) => {
          if (
            record.courseId !==
              selectedCourseId ||
            record.attendanceDate !==
              selectedDate ||
            !assignedStudentIds.has(
              record.studentId,
            ) ||
            seenStudents.has(
              record.studentId,
            )
          ) {
            return false
          }

          seenStudents.add(
            record.studentId,
          )

          return true
        },
      )
    }, [
      attendanceRecords,
      selectedCourseId,
      selectedDate,
      assignedStudentIds,
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
                enrollment.studentId,
            ),
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

  const attendanceRecordedCount =
    stats.presentCount +
    stats.absentCount +
    stats.lateCount +
    stats.excusedCount

  const teacherAttendanceDetails =
    useMemo<TeacherAttendanceDetail[]>(
      () => {
        if (
          !selectedCourseId
        ) {
          return []
        }

        const courseTeacherRows =
          courseTeachers.filter(
            (item) =>
              item.courseId ===
              selectedCourseId,
          )

        const assignmentTeacherIds =
          assignments
            .filter(
              (item) =>
                item.courseId ===
                selectedCourseId,
            )
            .map(
              (item) =>
                item.teacherId,
            )

        const teacherIds =
          Array.from(
            new Set([
              ...courseTeacherRows.map(
                (item) =>
                  item.teacherId,
              ),
              ...assignmentTeacherIds,
            ]),
          )

        return teacherIds.map(
          (teacherId) => {
            const teacher =
              teachers.find(
                (item) =>
                  item.id ===
                  teacherId,
              )

            const studentIds =
              new Set(
                assignments
                  .filter(
                    (item) =>
                      item.courseId ===
                        selectedCourseId &&
                      item.teacherId ===
                        teacherId,
                  )
                  .map(
                    (item) =>
                      item.studentId,
                  ),
              )

            let presentCount = 0

            const seen =
              new Set<string>()

            for (const record of selectedDateRecords) {
              if (
                !studentIds.has(
                  record.studentId,
                ) ||
                seen.has(
                  record.studentId,
                )
              ) {
                continue
              }

              seen.add(
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
              }
            }

            const studentCount =
              studentIds.size

            const percentage =
              studentCount > 0
                ? Math.round(
                    (presentCount /
                      studentCount) *
                      100,
                  )
                : null

            return {
              teacherId,
              teacherName:
                teacher?.name ??
                'معلم غير معروف',
              studentCount,
              presentCount,
              percentage,
            }
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
                        assignment.studentId ===
                        student.id,
                    )
                    .map(
                      (assignment) =>
                        assignment.courseId,
                    ),
                ),
              )

            const courseNames =
              studentCourseIds
                .map(
                  (courseId) =>
                    courses.find(
                      (course) =>
                        course.id ===
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
                        assignment.studentId ===
                        student.id,
                    )
                    .map(
                      (assignment) =>
                        teachers.find(
                          (teacher) =>
                            teacher.id ===
                            assignment.teacherId,
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
              selectedDate
            ) {
              const record =
                attendanceRecords.find(
                  (item) =>
                    item.studentId ===
                      student.id &&
                    item.courseId ===
                      selectedCourseId &&
                    item.attendanceDate ===
                      selectedDate,
                )

              if (record) {
                const rawStatus =
                  statusMap.get(
                    record.statusId,
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
            assignment.studentId ===
            selectedStudent.student.id,
        )
        .map(
          (assignment) =>
            courses.find(
              (course) =>
                course.id ===
                assignment.courseId,
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
                assignment.studentId ===
                selectedStudent.student.id,
            )
            .map(
              (assignment) =>
                teachers.find(
                  (teacher) =>
                    teacher.id ===
                    assignment.teacherId,
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
    <>
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

                <select
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
                        {formatDate(
                          date,
                        )}
                        {date ===
                          getLocalDateString() &&
                          ' — اليوم'}
                      </option>
                    ),
                  )}
                </select>
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
                حضور اليوم
              </CardTitle>

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
                  !selectedDate
                }
                className="gap-2"
              >
                <Users className="size-4" />
                تفاصيل الحضور
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <div className="rounded-xl border bg-muted/20 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    نسبة الحضور اليوم
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

            {attendanceItems.length >
            0 ? (
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
            ) : (
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

        {/* Teacher comments placeholder */}
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

      {/* Teacher attendance details */}
      {attendanceDetailsOpen && (
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