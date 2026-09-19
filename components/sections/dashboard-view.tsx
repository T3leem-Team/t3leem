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

function getAttendanceStatusLabel(name: string) {
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

function getCourseDays(value: unknown): string[] {
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
  ] = useState<AttendanceStatus[]>([])

  const [
    attendanceRecords,
    setAttendanceRecords,
  ] = useState<AttendanceRecord[]>([])

  const [students, setStudents] =
    useState<Student[]>([])

  const [
    selectedCourseId,
    setSelectedCourseId,
  ] = useState('')

  const [
    selectedDate,
    setSelectedDate,
  ] = useState(getLocalDateString())

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
  ] = useState<StudentSearchResult | null>(
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

  /*
   * حالة التاريخ بالنسبة للدورة:
   *
   * not-started = قبل بداية الدورة
   * ended        = بعد نهاية الدورة
   * no-lesson    = داخل الدورة ولكن ليس من أيامها
   * lesson       = يوجد درس في هذا التاريخ
   */
  const lessonDateStatus = useMemo(() => {
    if (!selectedCourse || !selectedDate) {
      return 'no-course'
    }

    if (
      selectedCourse.startDate &&
      selectedDate <
        selectedCourse.startDate
    ) {
      return 'not-started'
    }

    if (
      selectedCourse.endDate &&
      selectedDate >
        selectedCourse.endDate
    ) {
      return 'ended'
    }

    const date = new Date(
      `${selectedDate}T00:00:00`,
    )

    if (Number.isNaN(date.getTime())) {
      return 'no-lesson'
    }

    if (
      selectedCourse.days.length > 0
    ) {
      const dayIndex = date.getDay()

      const hasCourseDay =
        selectedCourse.days.some(
          (day) =>
            getDayIndex(day) ===
            dayIndex,
        )

      if (!hasCourseDay) {
        return 'no-lesson'
      }
    }

    return 'lesson'
  }, [
    selectedCourse,
    selectedDate,
  ])

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

  const loadData = useCallback(
    async () => {
      try {
        setRefreshing(true)

        const academicYearResult =
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
            .eq(
              'is_active',
              true,
            )
            .order(
              'created_at',
              {
                ascending: false,
              },
            )
            .limit(1)
            .maybeSingle()

        if (
          academicYearResult.error
        ) {
          console.error(
            'Academic year load error:',
            academicYearResult.error,
          )
        }

        const currentYear =
          academicYearResult.data

        if (!currentYear) {
          setAcademicYear(null)
          setCourses([])
          setEnrollments([])
          setAssignments([])
          setCourseTeachers([])
          setTeachers([])
          setStudents([])
          setPendingRegistrationCount(0)
          return
        }

        setAcademicYear({
          id: currentYear.id,
          name: currentYear.name,
          annualFee:
            Number(
              currentYear.annual_fee,
            ) || 0,
          startDate:
            currentYear.start_date ??
            null,
          endDate:
            currentYear.end_date ??
            null,
        })

        const [
          coursesResult,
          enrollmentsResult,
          requestsResult,
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
            .from(
              'registration_requests',
            )
            .select(
              'id, status',
            )
            .eq(
              'status',
              'قيد المراجعة',
            ),
        ])

        if (
          coursesResult.error
        ) {
          console.error(
            'Courses load error:',
            coursesResult.error,
          )
        }

        if (
          enrollmentsResult.error
        ) {
          console.error(
            'Enrollments load error:',
            enrollmentsResult.error,
          )
        }

        const mappedCourses =
          (coursesResult.data ??
            []).map(
              (course) => ({
                id: course.id,
                name: course.name,
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

        const mappedEnrollments =
          (enrollmentsResult.data ??
            []).map(
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

        setCourses(mappedCourses)
        setEnrollments(
          mappedEnrollments,
        )

        setPendingRegistrationCount(
          requestsResult.error
            ? 0
            : (
                requestsResult.data ??
                []
              ).length,
        )

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
              mappedCourses.map(
                (course) =>
                  course.id,
              ),
            ),

          supabase
            .from('course_teachers')
            .select(
              `
                id,
                course_id,
                teacher_id
              `,
            )
            .in(
              'course_id',
              mappedCourses.map(
                (course) =>
                  course.id,
              ),
            ),
        ])

        if (
          assignmentsResult.error
        ) {
          console.error(
            'Assignments load error:',
            assignmentsResult.error,
          )
        }

        if (
          courseTeachersResult.error
        ) {
          console.error(
            'Course teachers load error:',
            courseTeachersResult.error,
          )
        }

        setAssignments(
          (assignmentsResult.data ??
            []).map(
              (assignment) => ({
                id: assignment.id,
                courseId:
                  assignment.course_id,
                teacherId:
                  assignment.teacher_id,
                studentId:
                  assignment.student_id,
              }),
            ),
        )

        setCourseTeachers(
          (courseTeachersResult.data ??
            []).map(
              (item) => ({
                id: item.id,
                courseId:
                  item.course_id,
                teacherId:
                  item.teacher_id,
              }),
            ),
        )

        const teacherIds = Array.from(
          new Set(
            (
              assignmentsResult.data ??
              []
            )
              .map(
                (item) =>
                  item.teacher_id,
              )
              .filter(Boolean),
          ),
        )

        if (
          teacherIds.length > 0
        ) {
          const teachersResult =
            await supabase
              .from('teachers')
              .select(
                'id, name',
              )
              .in(
                'id',
                teacherIds,
              )

          if (
            teachersResult.error
          ) {
            console.error(
              'Teachers load error:',
              teachersResult.error,
            )
            setTeachers([])
          } else {
            setTeachers(
              (teachersResult.data ??
                []) as Teacher[],
            )
          }
        } else {
          setTeachers([])
        }

        const studentIds =
          mappedEnrollments.map(
            (enrollment) =>
              enrollment.studentId,
          )

        if (
          studentIds.length > 0
        ) {
          const studentsResult =
            await supabase
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
                studentIds,
              )

          if (
            studentsResult.error
          ) {
            console.error(
              'Students load error:',
              studentsResult.error,
            )
            setStudents([])
          } else {
            setStudents(
              (studentsResult.data ??
                []) as Student[],
            )
          }
        } else {
          setStudents([])
        }

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

        await loadAttendance(
          mappedCourses.map(
            (course) =>
              course.id,
          ),
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
    useMemo(() => {
      const query =
        normalizeText(
          studentSearch,
        ).toLowerCase()

      if (!query) {
        return []
      }

      return students
        .filter((student) => {
          const values = [
            student.name,
            student.studentId,
            student.personalId,
            student.phone,
            student.whatsapp,
          ]

          return values.some(
            (value) =>
              normalizeText(
                value,
              )
                .toLowerCase()
                .includes(query),
          )
        })
        .slice(0, 10)
        .map(
          (student) => {
            const studentAssignments =
              assignments.filter(
                (assignment) =>
                  assignment.studentId ===
                  student.id,
              )

            const courseIds =
              new Set(
                studentAssignments.map(
                  (assignment) =>
                    assignment.courseId,
                ),
              )

            const courseNames =
              courses
                .filter(
                  (course) =>
                    courseIds.has(
                      course.id,
                    ),
                )
                .map(
                  (course) =>
                    course.name,
                )

            const teacherIds =
              new Set(
                studentAssignments.map(
                  (assignment) =>
                    assignment.teacherId,
                ),
              )

            const teacherNames =
              teachers
                .filter(
                  (teacher) =>
                    teacherIds.has(
                      teacher.id,
                    ),
                )
                .map(
                  (teacher) =>
                    teacher.name,
                )

            const studentAttendance =
              attendanceRecords.find(
                (record) =>
                  record.studentId ===
                    student.id &&
                  record.courseId ===
                    selectedCourseId &&
                  record.attendanceDate ===
                    selectedDate,
              )

            const attendanceStatus =
              studentAttendance
                ? getAttendanceStatusLabel(
                    statusMap.get(
                      studentAttendance.statusId,
                    ) ?? '',
                  )
                : null

            return {
              student,
              courseNames,
              teacherNames,
              attendanceStatus,
            }
          },
        )
    }, [
      studentSearch,
      students,
      assignments,
      courses,
      teachers,
      attendanceRecords,
      selectedCourseId,
      selectedDate,
      statusMap,
    ])

  const selectedStudentCourses =
    useMemo(() => {
      if (!selectedStudent) {
        return []
      }

      const courseIds =
        new Set(
          assignments
            .filter(
              (assignment) =>
                assignment.studentId ===
                selectedStudent.student
                  .id,
            )
            .map(
              (assignment) =>
                assignment.courseId,
            ),
        )

      return courses.filter(
        (course) =>
          courseIds.has(course.id),
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

      const teacherIds =
        new Set(
          assignments
            .filter(
              (assignment) =>
                assignment.studentId ===
                selectedStudent.student
                  .id,
            )
            .map(
              (assignment) =>
                assignment.teacherId,
            ),
        )

      return teachers.filter(
        (teacher) =>
          teacherIds.has(teacher.id),
      )
    }, [
      selectedStudent,
      assignments,
      teachers,
    ])

  const teacherAttendanceDetails =
    useMemo<
      TeacherAttendanceDetail[]
    >(() => {
      return teachers.map(
        (teacher) => {
          const teacherCourseIds =
            new Set(
              courseTeachers
                .filter(
                  (item) =>
                    item.teacherId ===
                    teacher.id,
                )
                .map(
                  (item) =>
                    item.courseId,
                ),
            )

          const teacherAssignments =
            assignments.filter(
              (assignment) =>
                assignment.teacherId ===
                teacher.id,
            )

          const studentIds =
            new Set(
              teacherAssignments.map(
                (assignment) =>
                  assignment.studentId,
              ),
            )

          const records =
            attendanceRecords.filter(
              (record) =>
                record.attendanceDate ===
                  selectedDate &&
                teacherCourseIds.has(
                  record.courseId,
                ) &&
                studentIds.has(
                  record.studentId,
                ),
            )

          let present = 0
          let absent = 0
          let late = 0
          let excused = 0

          for (const record of records) {
            const name =
              statusMap.get(
                record.statusId,
              ) ?? ''

            if (
              isPresentStatus(name)
            ) {
              present += 1
            } else if (
              isAbsentStatus(name)
            ) {
              absent += 1
            } else if (
              isLateStatus(name)
            ) {
              late += 1
            } else if (
              isExcusedStatus(name)
            ) {
              excused += 1
            }
          }

          return {
            teacherId: teacher.id,
            teacherName:
              teacher.name,
            studentsCount:
              studentIds.size,
            present,
            absent,
            late,
            excused,
          }
        },
      )
    }, [
      teachers,
      courseTeachers,
      assignments,
      attendanceRecords,
      selectedDate,
      statusMap,
    ])

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <RefreshCw className="size-5 animate-spin" />
          جاري تحميل لوحة المعلومات...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            لوحة المعلومات
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            ملخص سريع للطلاب والدورات والحضور
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void loadData()
          }}
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

      {academicYear && (
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  السنة الدراسية
                </p>

                <p className="mt-1 text-lg font-semibold">
                  {academicYear.name}
                </p>
              </div>

              <div className="text-sm text-muted-foreground">
                الرسوم السنوية:{' '}
                <span className="font-semibold text-foreground">
                  {academicYear.annualFee}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  الطلاب
                </p>

                <p className="mt-1 text-3xl font-bold">
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
                  موزعون
                </p>

                <p className="mt-1 text-3xl font-bold">
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
                  غير موزعين
                </p>

                <p className="mt-1 text-3xl font-bold">
                  {stats.unassignedCount}
                </p>
              </div>

              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
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
                  طلبات التسجيل
                </p>

                <p className="mt-1 text-3xl font-bold">
                  {pendingRegistrationCount}
                </p>
              </div>

              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ClipboardCheck className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
                }}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-primary/30"
              >
                {courses.length === 0 && (
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
                value={selectedDate}
                onChange={(event) => {
                  setSelectedDate(
                    event.target.value,
                  )
                }}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        </CardContent>
      </Card>

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
                !selectedDate ||
                lessonDateStatus !==
                  'lesson'
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
                          ? 'لا يوجد درس في هذا التاريخ'
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
          'not-started' ? (
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
          ) : lessonDateStatus ===
            'ended' ? (
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
          ) : lessonDateStatus ===
            'no-lesson' ? (
            <div className="mt-4 rounded-xl border border-dashed bg-muted/10 px-6 py-8 text-center">
              <CalendarCheck className="mx-auto size-7 text-muted-foreground/50" />

              <p className="mt-3 text-sm font-medium text-muted-foreground">
                لا يوجد درس في هذا التاريخ
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                هذا اليوم ليس من أيام الدورة
              </p>
            </div>
          ) : lessonDateStatus ===
            'no-course' ? (
            <div className="mt-4 rounded-xl border border-dashed bg-muted/10 px-6 py-8 text-center">
              <CalendarCheck className="mx-auto size-7 text-muted-foreground/50" />

              <p className="mt-3 text-sm font-medium text-muted-foreground">
                لا توجد دورة محددة
              </p>
            </div>
          ) : attendanceItems.length >
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

      {studentSearch && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="size-5 text-primary" />
              بحث عن طالب
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <input
                value={studentSearch}
                onChange={(event) =>
                  setStudentSearch(
                    event.target.value,
                  )
                }
                placeholder="ابحث بالاسم أو رقم الطالب أو الهوية أو الهاتف"
                className="h-10 w-full rounded-md border bg-background pr-10 pl-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {searchResults.length >
            0 ? (
              <div className="mt-4 space-y-2">
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
                      className="w-full rounded-xl border p-4 text-right transition-colors hover:bg-muted/50"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium">
                            {
                              result
                                .student
                                .name
                            }
                          </p>

                          <p className="mt-1 text-xs text-muted-foreground">
                            {result
                              .student
                              .studentId ??
                              'بدون رقم طالب'}
                          </p>
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {result
                            .attendanceStatus ??
                            'لا يوجد حضور'}
                        </div>
                      </div>
                    </button>
                  ),
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                لا توجد نتائج
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {selectedStudent && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>
                بيانات الطالب
              </CardTitle>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() =>
                  setSelectedStudent(
                    null,
                  )
                }
              >
                <X className="size-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">
                  الاسم
                </p>

                <p className="mt-1 font-medium">
                  {
                    selectedStudent
                      .student.name
                  }
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  رقم الطالب
                </p>

                <p className="mt-1 font-medium">
                  {
                    selectedStudent
                      .student
                      .studentId ??
                    '—'
                  }
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  الهوية
                </p>

                <p className="mt-1 font-medium">
                  {
                    selectedStudent
                      .student
                      .personalId ??
                    '—'
                  }
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  الهاتف
                </p>

                <p className="mt-1 font-medium">
                  {
                    selectedStudent
                      .student
                      .phone ??
                    '—'
                  }
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">
                  الدورات
                </p>

                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedStudentCourses.length >
                  0 ? (
                    selectedStudentCourses.map(
                      (course) => (
                        <span
                          key={
                            course.id
                          }
                          className="rounded-full border px-3 py-1 text-xs"
                        >
                          {
                            course.name
                          }
                        </span>
                      ),
                    )
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      لا توجد دورات
                    </span>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  المعلمون
                </p>

                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedStudentTeachers.length >
                  0 ? (
                    selectedStudentTeachers.map(
                      (teacher) => (
                        <span
                          key={
                            teacher.id
                          }
                          className="rounded-full border px-3 py-1 text-xs"
                        >
                          {
                            teacher.name
                          }
                        </span>
                      ),
                    )
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      لا يوجد معلم
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <AttendanceDetails
        open={attendanceDetailsOpen}
        onOpenChange={
          setAttendanceDetailsOpen
        }
        courseId={selectedCourseId}
        attendanceDate={selectedDate}
        teacherDetails={
          teacherAttendanceDetails
        }
      />
    </div>
  )
}