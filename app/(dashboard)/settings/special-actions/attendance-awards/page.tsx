'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Award,
  Calculator,
  Settings2,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'

import { PageHeader } from '@/components/dashboard/page-header'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import AttendanceAwardsResults, {
  type AcademicYear,
  type Course,
  type Enrollment,
  type Level,
  type Student,
  type StudentResult,
  type Teacher,
  type TeacherAssignment,
  type AttendanceStatus,
  type AttendanceRow,
} from './attendance-awards-results'

/* =========================================================
   HELPERS
========================================================= */

const inputClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm'

const selectClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm'

function getLocalDateString() {
  const now = new Date()

  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function normalizeText(value: string) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/أ|إ|آ/g, 'ا')
}

function isPresentStatus(name: string) {
  const value = normalizeText(name)

  return value === 'حاضر' || value === 'حضور'
}

function isAbsentStatus(name: string) {
  const value = normalizeText(name)

  return value === 'غائب' || value === 'غياب'
}

function isLateStatus(name: string) {
  const value = normalizeText(name)

  return (
    value === 'متأخر' ||
    value === 'متاخر' ||
    value === 'متأخر عن الحضور' ||
    value === 'متاخر عن الحضور'
  )
}

function isExcusedStatus(name: string) {
  const value = normalizeText(name)

  return (
    value === 'مستأذن' ||
    value === 'مستاذن' ||
    value === 'مستأذن بعذر' ||
    value === 'مستاذن بعذر'
  )
}

function isStatusCounted(
  statusName: string,
  presentCounts: {
    present: boolean
    late: boolean
    excused: boolean
    absent: boolean
  },
) {
  if (isPresentStatus(statusName)) {
    return presentCounts.present
  }

  if (isLateStatus(statusName)) {
    return presentCounts.late
  }

  if (isExcusedStatus(statusName)) {
    return presentCounts.excused
  }

  if (isAbsentStatus(statusName)) {
    return presentCounts.absent
  }

  return false
}

/* =========================================================
   LEVEL ORDER

   أسماء المستويات نفسها تأتي من Supabase.
   هذا الجزء فقط يحدد ترتيب العرض الدراسي.
========================================================= */

function getArabicNumberOrder(value: string) {
  const text = normalizeText(value)

  if (
    text.includes('الاول') ||
    text.includes('اول') ||
    text === '1' ||
    text.startsWith('1 ')
  ) {
    return 1
  }

  if (
    text.includes('الثاني') ||
    text.includes('ثاني') ||
    text === '2' ||
    text.startsWith('2 ')
  ) {
    return 2
  }

  if (
    text.includes('الثالث') ||
    text.includes('ثالث') ||
    text === '3' ||
    text.startsWith('3 ')
  ) {
    return 3
  }

  if (
    text.includes('الرابع') ||
    text.includes('رابع') ||
    text === '4' ||
    text.startsWith('4 ')
  ) {
    return 4
  }

  if (
    text.includes('الخامس') ||
    text.includes('خامس') ||
    text === '5' ||
    text.startsWith('5 ')
  ) {
    return 5
  }

  if (
    text.includes('السادس') ||
    text.includes('سادس') ||
    text === '6' ||
    text.startsWith('6 ')
  ) {
    return 6
  }

  return 99
}

function getLevelCategoryOrder(value: string) {
  const text = normalizeText(value)

  if (
    text.includes('ابتدائي') ||
    text.includes('ابتداي')
  ) {
    return 1
  }

  if (
    text.includes('اعدادي') ||
    text.includes('إعدادي') ||
    text.includes('متوسط')
  ) {
    return 2
  }

  if (
    text.includes('ثانوي')
  ) {
    return 3
  }

  return 99
}

function compareLevels(a: string, b: string) {
  if (a === b) {
    return 0
  }

  const categoryA = getLevelCategoryOrder(a)
  const categoryB = getLevelCategoryOrder(b)

  if (categoryA !== categoryB) {
    return categoryA - categoryB
  }

  const numberA = getArabicNumberOrder(a)
  const numberB = getArabicNumberOrder(b)

  if (numberA !== numberB) {
    return numberA - numberB
  }

  return a.localeCompare(b, 'ar')
}

/* =========================================================
   COMPONENT
========================================================= */

export default function AttendanceAwardsCalculator() {
  /* -------------------------------------------------------
     Academic years
  ------------------------------------------------------- */

  const [academicYears, setAcademicYears] = useState<
    AcademicYear[]
  >([])

  const [selectedYearId, setSelectedYearId] = useState('')

  /* -------------------------------------------------------
     Courses
  ------------------------------------------------------- */

  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseIds, setSelectedCourseIds] =
    useState<string[]>([])

  /* -------------------------------------------------------
     Dates
  ------------------------------------------------------- */

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  /* -------------------------------------------------------
     Policies
  ------------------------------------------------------- */

  const [unregisteredCourse, setUnregisteredCourse] =
    useState<'exclude' | 'absence'>('exclude')

  const [presentCounts, setPresentCounts] = useState({
    present: true,
    late: true,
    excused: true,
    absent: false,
  })

  const [cancelledCounts, setCancelledCounts] =
    useState<'exclude' | 'include'>('exclude')

  const [minimumPercentage, setMinimumPercentage] =
    useState('90')

  const [requireAllCourses, setRequireAllCourses] =
    useState(false)

  /* -------------------------------------------------------
     Results
  ------------------------------------------------------- */

  const [results, setResults] = useState<StudentResult[]>(
    [],
  )

  const [hasCalculated, setHasCalculated] =
    useState(false)

  /* -------------------------------------------------------
     Loading / errors
  ------------------------------------------------------- */

  const [loadingYears, setLoadingYears] = useState(true)
  const [loadingCourses, setLoadingCourses] =
    useState(false)

  const [calculating, setCalculating] = useState(false)
  const [error, setError] = useState('')

  /* =========================================================
     LOAD ACADEMIC YEARS
  ========================================================= */

  useEffect(() => {
    let cancelled = false

    async function loadAcademicYears() {
      setLoadingYears(true)
      setError('')

      const { data, error: queryError } =
        await supabase
          .from('academic_years')
          .select(
            'id, name, start_date, end_date, annual_fee, is_current, is_active',
          )
          .eq('is_active', true)
          .order('start_date', {
            ascending: false,
          })

      if (cancelled) {
        return
      }

      if (queryError) {
        setError(
          `تعذر تحميل السنوات الدراسية: ${queryError.message}`,
        )
        setLoadingYears(false)
        return
      }

      const years = (data ?? []) as AcademicYear[]

      setAcademicYears(years)

      const currentYear =
        years.find((year) => year.is_current) ??
        years[0]

      if (currentYear) {
        setSelectedYearId(currentYear.id)

        setFromDate(
          currentYear.start_date ??
            getLocalDateString(),
        )

        setToDate(
          currentYear.end_date ??
            getLocalDateString(),
        )
      }

      setLoadingYears(false)
    }

    loadAcademicYears()

    return () => {
      cancelled = true
    }
  }, [])

  /* =========================================================
     LOAD COURSES FOR SELECTED YEAR
  ========================================================= */

  useEffect(() => {
    if (!selectedYearId) {
      setCourses([])
      setSelectedCourseIds([])
      return
    }

    let cancelled = false

    async function loadCourses() {
      setLoadingCourses(true)
      setError('')

      const { data, error: queryError } =
        await supabase
          .from('courses')
          .select(
            'id, academic_year_id, name, start_date, end_date, days',
          )
          .eq(
            'academic_year_id',
            selectedYearId,
          )
          .order('start_date', {
            ascending: true,
          })
          .order('name', {
            ascending: true,
          })

      if (cancelled) {
        return
      }

      if (queryError) {
        setError(
          `تعذر تحميل الدورات: ${queryError.message}`,
        )
        setCourses([])
        setSelectedCourseIds([])
        setLoadingCourses(false)
        return
      }

      const loadedCourses =
        (data ?? []) as Course[]

      setCourses(loadedCourses)
      setSelectedCourseIds([])

      const selectedYear =
        academicYears.find(
          (year) =>
            year.id === selectedYearId,
        )

      if (selectedYear) {
        setFromDate(
          selectedYear.start_date ??
            getLocalDateString(),
        )

        setToDate(
          selectedYear.end_date ??
            getLocalDateString(),
        )
      }

      setLoadingCourses(false)
    }

    loadCourses()

    return () => {
      cancelled = true
    }
  }, [selectedYearId, academicYears])

  /* =========================================================
     SELECTED COURSES
  ========================================================= */

  const selectedCourses = useMemo(() => {
    return courses.filter((course) =>
      selectedCourseIds.includes(course.id),
    )
  }, [courses, selectedCourseIds])

  /* =========================================================
     COURSE SELECTION
  ========================================================= */

  const toggleCourse = (courseId: string) => {
    setSelectedCourseIds((current) => {
      if (current.includes(courseId)) {
        return current.filter(
          (id) => id !== courseId,
        )
      }

      return [...current, courseId]
    })

    setHasCalculated(false)
  }

  const selectAllCourses = () => {
    setSelectedCourseIds(
      courses.map((course) => course.id),
    )

    setHasCalculated(false)
  }

  const clearCourseSelection = () => {
    setSelectedCourseIds([])
    setHasCalculated(false)
  }

  /* =========================================================
     CALCULATE
  ========================================================= */

  const calculateResults = async () => {
    setError('')

    if (!selectedYearId) {
      setError('يرجى اختيار السنة الدراسية.')
      return
    }

    if (selectedCourseIds.length === 0) {
      setError(
        'يرجى اختيار دورة واحدة على الأقل.',
      )
      return
    }

    if (!fromDate || !toDate) {
      setError(
        'يرجى تحديد فترة الاحتساب.',
      )
      return
    }

    if (fromDate > toDate) {
      setError(
        'تاريخ البداية يجب أن يكون قبل أو يساوي تاريخ النهاية.',
      )
      return
    }

    const minimum = Number(
      minimumPercentage,
    )

    if (
      !Number.isFinite(minimum) ||
      minimum < 0 ||
      minimum > 100
    ) {
      setError(
        'الحد الأدنى لنسبة الحضور يجب أن يكون بين 0 و100.',
      )
      return
    }

    setCalculating(true)
    setHasCalculated(false)

    try {
      /* =====================================================
         1. STUDENTS / ENROLLMENTS
      ===================================================== */

      const {
        data: enrollmentData,
        error: enrollmentError,
      } = await supabase
        .from('enrollments')
        .select(
          'id, student_id, academic_year_id, level_id, class_id, status',
        )
        .eq(
          'academic_year_id',
          selectedYearId,
        )

      if (enrollmentError) {
        throw new Error(
          `تعذر تحميل تسجيلات الطلاب: ${enrollmentError.message}`,
        )
      }

      const enrollments =
        (enrollmentData ??
          []) as Enrollment[]

      if (enrollments.length === 0) {
        setResults([])
        setHasCalculated(true)
        return
      }

      const studentIds = Array.from(
        new Set(
          enrollments.map(
            (enrollment) =>
              enrollment.student_id,
          ),
        ),
      )

      /* =====================================================
         2. STUDENTS
      ===================================================== */

      const {
        data: studentData,
        error: studentError,
      } = await supabase
        .from('students')
        .select(
          'id, student_id, name, personal_id, phone, whatsapp',
        )
        .in('id', studentIds)
        .order('name', {
          ascending: true,
        })

      if (studentError) {
        throw new Error(
          `تعذر تحميل الطلاب: ${studentError.message}`,
        )
      }

      const students =
        (studentData ?? []) as Student[]

      /* =====================================================
         3. LEVELS
      ===================================================== */

      const levelIds = Array.from(
        new Set(
          enrollments
            .map(
              (enrollment) =>
                enrollment.level_id,
            )
            .filter(
              (id): id is string =>
                Boolean(id),
            ),
        ),
      )

      let levels: Level[] = []

      if (levelIds.length > 0) {
        const {
          data: levelData,
          error: levelError,
        } = await supabase
          .from('levels')
          .select('id, name')
          .in('id', levelIds)

        if (levelError) {
          throw new Error(
            `تعذر تحميل المستويات: ${levelError.message}`,
          )
        }

        levels =
          (levelData ?? []) as Level[]
      }

      const levelMap = new Map(
        levels.map((level) => [
          level.id,
          level.name,
        ]),
      )

      /* =====================================================
         4. TEACHER / STUDENT ASSIGNMENTS
      ===================================================== */

      const {
        data: assignmentData,
        error: assignmentError,
      } = await supabase
        .from(
          'teacher_student_assignments',
        )
        .select(
          'id, course_id, teacher_id, student_id',
        )
        .in(
          'course_id',
          selectedCourseIds,
        )
        .in(
          'student_id',
          studentIds,
        )

      if (assignmentError) {
        throw new Error(
          `تعذر تحميل توزيع الطلاب على المعلمين: ${assignmentError.message}`,
        )
      }

      const assignments =
        (assignmentData ??
          []) as TeacherAssignment[]

      /* =====================================================
         5. TEACHERS
      ===================================================== */

      const teacherIds = Array.from(
        new Set(
          assignments.map(
            (assignment) =>
              assignment.teacher_id,
          ),
        ),
      )

      let teachers: Teacher[] = []

      if (teacherIds.length > 0) {
        const {
          data: teacherData,
          error: teacherError,
        } = await supabase
          .from('teachers')
          .select('id, name')
          .in('id', teacherIds)
          .order('name', {
            ascending: true,
          })

        if (teacherError) {
          throw new Error(
            `تعذر تحميل المعلمين: ${teacherError.message}`,
          )
        }

        teachers =
          (teacherData ?? []) as Teacher[]
      }

      const teacherMap = new Map(
        teachers.map((teacher) => [
          teacher.id,
          teacher.name,
        ]),
      )

      /* =====================================================
         6. ATTENDANCE STATUSES
      ===================================================== */

      const {
        data: statusData,
        error: statusError,
      } = await supabase
        .from('attendance_statuses')
        .select(
          'id, name, is_active, sort_order',
        )
        .order('sort_order', {
          ascending: true,
        })

      if (statusError) {
        throw new Error(
          `تعذر تحميل حالات الحضور: ${statusError.message}`,
        )
      }

      const statuses =
        (statusData ??
          []) as AttendanceStatus[]

      const statusMap = new Map(
        statuses.map((status) => [
          status.id,
          status,
        ]),
      )

      /* =====================================================
         7. ATTENDANCE
      ===================================================== */

      const {
        data: attendanceData,
        error: attendanceError,
      } = await supabase
        .from('attendance')
        .select(
          'id, student_id, enrollment_id, attendance_date, status_id, note, course_id',
        )
        .in(
          'course_id',
          selectedCourseIds,
        )
        .in(
          'student_id',
          studentIds,
        )
        .gte(
          'attendance_date',
          fromDate,
        )
        .lte(
          'attendance_date',
          toDate,
        )

      if (attendanceError) {
        throw new Error(
          `تعذر تحميل سجلات الحضور: ${attendanceError.message}`,
        )
      }

      const attendance =
        (attendanceData ??
          []) as AttendanceRow[]

      /* =====================================================
         8. DEDUPLICATE ATTENDANCE
      ===================================================== */

      const attendanceMap =
        new Map<
          string,
          AttendanceRow
        >()

      for (const row of attendance) {
        const key =
          `${row.student_id}__` +
          `${row.course_id}__` +
          `${row.attendance_date}`

        const existing =
          attendanceMap.get(key)

        if (
          !existing ||
          row.id > existing.id
        ) {
          attendanceMap.set(
            key,
            row,
          )
        }
      }

      const uniqueAttendance =
        Array.from(
          attendanceMap.values(),
        )

      /* =====================================================
         9. COURSE ATTENDANCE DAYS
      ===================================================== */

      const courseAttendanceDays =
        new Map<
          string,
          Set<string>
        >()

      for (const courseId of selectedCourseIds) {
        courseAttendanceDays.set(
          courseId,
          new Set(),
        )
      }

      for (const row of uniqueAttendance) {
        courseAttendanceDays
          .get(row.course_id)
          ?.add(
            row.attendance_date,
          )
      }

      /* =====================================================
         10. QUICK LOOKUPS
      ===================================================== */

      const enrollmentByStudent =
        new Map<
          string,
          Enrollment
        >()

      for (const enrollment of enrollments) {
        if (
          !enrollmentByStudent.has(
            enrollment.student_id,
          )
        ) {
          enrollmentByStudent.set(
            enrollment.student_id,
            enrollment,
          )
        }
      }

      const assignmentKey = (
        studentId: string,
        courseId: string,
      ) =>
        `${studentId}__${courseId}`

      const assignmentMap =
        new Map<
          string,
          TeacherAssignment[]
        >()

      for (const assignment of assignments) {
        const key =
          assignmentKey(
            assignment.student_id,
            assignment.course_id,
          )

        const existing =
          assignmentMap.get(key) ??
          []

        existing.push(assignment)

        assignmentMap.set(
          key,
          existing,
        )
      }

      const attendanceByStudentCourse =
        new Map<
          string,
          AttendanceRow[]
        >()

      for (const row of uniqueAttendance) {
        const key =
          assignmentKey(
            row.student_id,
            row.course_id,
          )

        const existing =
          attendanceByStudentCourse.get(
            key,
          ) ?? []

        existing.push(row)

        attendanceByStudentCourse.set(
          key,
          existing,
        )
      }

      /* =====================================================
         11. CALCULATE EACH STUDENT
         
         مهم:
         لا نغير قوانين نسبة الحضور الحالية.
         courseCount للعرض/الفلترة/التلوين فقط.
      ===================================================== */

      const calculated: StudentResult[] =
        students.map((student) => {
          const enrollment =
            enrollmentByStudent.get(
              student.id,
            )

          const courseResults: Record<
            string,
            {
              courseId: string
              percentage: number | null
              numerator: number
              denominator: number
              registered: boolean
            }
          > = {}

          let totalNumerator = 0
          let totalDenominator = 0

          for (const course of selectedCourses) {
            const key =
              assignmentKey(
                student.id,
                course.id,
              )

            const registered =
              (assignmentMap.get(key)
                ?.length ?? 0) > 0

            /* -----------------------------------------------
               الطالب غير المسجل
            ------------------------------------------------ */

            if (!registered) {
              if (
                unregisteredCourse ===
                'exclude'
              ) {
                courseResults[
                  course.id
                ] = {
                  courseId:
                    course.id,
                  percentage: null,
                  numerator: 0,
                  denominator: 0,
                  registered: false,
                }

                continue
              }

              const opportunityCount =
                courseAttendanceDays.get(
                  course.id,
                )?.size ?? 0

              courseResults[
                course.id
              ] = {
                courseId:
                  course.id,
                percentage:
                  opportunityCount >
                  0
                    ? 0
                    : null,
                numerator: 0,
                denominator:
                  opportunityCount,
                registered: false,
              }

              totalDenominator +=
                opportunityCount

              continue
            }

            /* -----------------------------------------------
               الطالب مسجل
            ------------------------------------------------ */

            const rows =
              attendanceByStudentCourse.get(
                key,
              ) ?? []

            let numerator = 0
            let denominator = 0

            for (const row of rows) {
              const status =
                statusMap.get(
                  row.status_id,
                )

              if (!status) {
                continue
              }

              denominator += 1

              if (
                isStatusCounted(
                  status.name,
                  presentCounts,
                )
              ) {
                numerator += 1
              }
            }

            const percentage =
              denominator > 0
                ? (numerator /
                    denominator) *
                  100
                : null

            courseResults[
              course.id
            ] = {
              courseId:
                course.id,
              percentage,
              numerator,
              denominator,
              registered: true,
            }

            totalNumerator +=
              numerator

            totalDenominator +=
              denominator
          }

          /* -----------------------------------------------
             عدد الدورات المسجل فيها الطالب

             هذا لا يدخل إطلاقاً في معادلة النسبة.
          ------------------------------------------------ */

          const courseCount =
            selectedCourses.reduce(
              (count, course) => {
                return (
                  count +
                  (courseResults[
                    course.id
                  ]?.registered
                    ? 1
                    : 0)
                )
              },
              0,
            )

          /* -----------------------------------------------
             النسبة الإجمالية
             نفس القانون السابق بدون تغيير
          ------------------------------------------------ */

          const annualPercentage =
            totalDenominator > 0
              ? (totalNumerator /
                  totalDenominator) *
                100
              : null

          const allSelectedCoursesHaveData =
            selectedCourses.every(
              (course) => {
                const result =
                  courseResults[
                    course.id
                  ]

                return (
                  result &&
                  result.percentage !==
                    null
                )
              },
            )

          const eligible =
            annualPercentage !==
              null &&
            annualPercentage >=
              minimum &&
            (!requireAllCourses ||
              allSelectedCoursesHaveData)

          /* -----------------------------------------------
             المعلمون
          ------------------------------------------------ */

          const teacherNames =
            new Set<string>()

          for (const course of selectedCourses) {
            const courseAssignments =
              assignmentMap.get(
                assignmentKey(
                  student.id,
                  course.id,
                ),
              ) ?? []

            for (const assignment of courseAssignments) {
              const teacherName =
                teacherMap.get(
                  assignment.teacher_id,
                )

              if (teacherName) {
                teacherNames.add(
                  teacherName,
                )
              }
            }
          }

          return {
            id: student.id,
            studentNumber:
              student.student_id ?? '',
            personalId:
              student.personal_id ?? '',
            name: student.name,
            grade:
              enrollment?.level_id
                ? levelMap.get(
                    enrollment.level_id,
                  ) ?? '—'
                : '—',
            teacher:
              Array.from(
                teacherNames,
              ).join('، ') || '—',
            courses:
              courseResults,
            courseCount,
            annualPercentage,
            eligible,
          }
        })

      /* =====================================================
         ترتيب الطلاب حسب المستوى الدراسي
         ثم الاسم داخل نفس المستوى
      ===================================================== */

      calculated.sort((a, b) => {
        const levelCompare =
          compareLevels(
            a.grade,
            b.grade,
          )

        if (levelCompare !== 0) {
          return levelCompare
        }

        return a.name.localeCompare(
          b.name,
          'ar',
        )
      })

      setResults(calculated)
      setHasCalculated(true)
    } catch (calculationError) {
      const message =
        calculationError instanceof Error
          ? calculationError.message
          : 'حدث خطأ غير متوقع أثناء احتساب النتائج.'

      setError(message)
      setResults([])
      setHasCalculated(true)
    } finally {
      setCalculating(false)
    }
  }

  /* =========================================================
     SELECTED YEAR
  ========================================================= */

  const selectedYear =
    academicYears.find(
      (year) =>
        year.id === selectedYearId,
    )

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="space-y-6">
      <PageHeader
        title="احتساب نسب الحضور والتكريم"
        description="تحديد فترة الاحتساب وسياسة النسب وشروط التكريم ثم تجهيز قائمة الطلاب المستحقين."
      />

      {/* =====================================================
          فترة الاحتساب
      ===================================================== */}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="size-5 text-primary" />
            تحديد فترة الاحتساب
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                السنة الدراسية
              </label>

              <select
                className={selectClass}
                value={selectedYearId}
                onChange={(event) => {
                  setSelectedYearId(
                    event.target.value,
                  )
                  setHasCalculated(false)
                  setResults([])
                }}
                disabled={
                  loadingYears ||
                  calculating
                }
              >
                <option value="">
                  اختر السنة الدراسية
                </option>

                {academicYears.map(
                  (year) => (
                    <option
                      key={year.id}
                      value={year.id}
                    >
                      {year.name}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="from-date"
                className="text-sm font-medium"
              >
                من تاريخ
              </label>

              <input
                id="from-date"
                type="date"
                value={fromDate}
                onChange={(event) => {
                  setFromDate(
                    event.target.value,
                  )
                  setHasCalculated(false)
                }}
                className={inputClass}
                disabled={calculating}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="to-date"
                className="text-sm font-medium"
              >
                إلى تاريخ
              </label>

              <input
                id="to-date"
                type="date"
                value={toDate}
                onChange={(event) => {
                  setToDate(
                    event.target.value,
                  )
                  setHasCalculated(false)
                }}
                className={inputClass}
                disabled={calculating}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">
                  الدورات المراد احتسابها
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  اختر دورة واحدة أو أكثر من الدورات
                  التابعة للسنة الدراسية المحددة.
                </p>
              </div>

              {courses.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={
                      selectAllCourses
                    }
                    disabled={
                      calculating
                    }
                  >
                    تحديد الكل
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={
                      clearCourseSelection
                    }
                    disabled={
                      calculating
                    }
                  >
                    إلغاء الكل
                  </Button>
                </div>
              )}
            </div>

            {loadingCourses ? (
              <div className="rounded-lg border p-5 text-center text-sm text-muted-foreground">
                جاري تحميل الدورات...
              </div>
            ) : courses.length === 0 ? (
              <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                لا توجد دورات مرتبطة بالسنة الدراسية
                المحددة.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {courses.map(
                  (course) => {
                    const checked =
                      selectedCourseIds.includes(
                        course.id,
                      )

                    return (
                      <label
                        key={course.id}
                        className={[
                          'flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition',
                          checked
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted/40',
                        ].join(' ')}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            toggleCourse(
                              course.id,
                            )
                          }
                          className="mt-1 size-4"
                          disabled={
                            calculating
                          }
                        />

                        <div className="min-w-0">
                          <p className="font-medium">
                            {course.name}
                          </p>

                          {(course.start_date ||
                            course.end_date) && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {course.start_date ??
                                '—'}{' '}
                              →{' '}
                              {course.end_date ??
                                '—'}
                            </p>
                          )}
                        </div>
                      </label>
                    )
                  },
                )}
              </div>
            )}

            {selectedCourseIds.length >
              0 && (
              <div className="text-sm text-muted-foreground">
                تم اختيار{' '}
                <span className="font-semibold text-foreground">
                  {selectedCourseIds.length}
                </span>{' '}
                دورة.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* =====================================================
          سياسة الحضور
      ===================================================== */}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="size-5 text-primary" />
            سياسة احتساب النسبة
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              الطالب غير المسجل في دورة
            </label>

            <select
              className={`${selectClass} max-w-md`}
              value={
                unregisteredCourse
              }
              onChange={(event) => {
                setUnregisteredCourse(
                  event.target.value as
                    | 'exclude'
                    | 'absence',
                )
                setHasCalculated(false)
              }}
            >
              <option value="exclude">
                استبعاد الدورة من الحساب
              </option>

              <option value="absence">
                احتسابها كغياب
              </option>
            </select>
          </div>

          <div>
            <p className="text-sm font-medium">
              حالات الحضور المحتسبة
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['present', 'حاضر'],
                ['late', 'متأخر'],
                ['excused', 'مستأذن'],
                ['absent', 'غائب'],
              ].map(
                ([key, label]) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border p-3"
                  >
                    <input
                      type="checkbox"
                      checked={
                        presentCounts[
                          key as keyof typeof presentCounts
                        ]
                      }
                      onChange={(event) => {
                        setPresentCounts(
                          (
                            current,
                          ) => ({
                            ...current,
                            [key]:
                              event
                                .target
                                .checked,
                          }),
                        )

                        setHasCalculated(
                          false,
                        )
                      }}
                      className="size-4"
                    />

                    <span className="text-sm">
                      {label}
                    </span>
                  </label>
                ),
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              الدروس أو الأيام الملغاة
            </label>

            <select
              className={`${selectClass} max-w-md`}
              value={
                cancelledCounts
              }
              onChange={(event) => {
                setCancelledCounts(
                  event.target
                    .value as
                    | 'exclude'
                    | 'include',
                )
                setHasCalculated(false)
              }}
            >
              <option value="exclude">
                تستبعد من الحساب
              </option>

              <option value="include">
                تدخل في الحساب
              </option>
            </select>

            <p className="text-xs text-muted-foreground">
              ملاحظة: لا يوجد حالياً في قاعدة البيانات
              مصدر مستقل مؤكد للأيام الملغاة، لذلك هذا
              الخيار محفوظ في الواجهة ولن يغيّر الحساب
              إلى أن يتم ربط مصدر الإلغاء الفعلي.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* =====================================================
          شروط التكريم
      ===================================================== */}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="size-5 text-primary" />
            شروط التكريم
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="minimum-percentage"
                className="text-sm font-medium"
              >
                الحد الأدنى لنسبة الحضور
              </label>

              <div className="relative max-w-md">
                <input
                  id="minimum-percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={
                    minimumPercentage
                  }
                  onChange={(event) => {
                    setMinimumPercentage(
                      event.target
                        .value,
                    )
                    setHasCalculated(
                      false,
                    )
                  }}
                  className={`${inputClass} pl-10`}
                />

                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  %
                </span>
              </div>
            </div>

            <div className="flex items-end">
              <label className="flex w-full max-w-md cursor-pointer items-center gap-3 rounded-lg border p-3">
                <input
                  type="checkbox"
                  checked={
                    requireAllCourses
                  }
                  onChange={(event) => {
                    setRequireAllCourses(
                      event.target
                        .checked,
                    )
                    setHasCalculated(
                      false,
                    )
                  }}
                  className="size-4"
                />

                <span className="text-sm">
                  يشترط تسجيل الطالب في جميع الدورات
                  المختارة
                </span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="p-4">
            <p className="text-sm text-destructive">
              {error}
            </p>
          </CardContent>
        </Card>
      )}

      {/* =====================================================
          CALCULATE BUTTON
      ===================================================== */}

      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">
              جاهز لاحتساب النتائج
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              {selectedCourseIds.length ===
              0
                ? 'اختر الدورات أولاً ثم ابدأ الاحتساب.'
                : `سيتم احتساب ${selectedCourseIds.length} دورة حسب الفترة والسياسات المحددة.`}
            </p>
          </div>

          <Button
            onClick={
              calculateResults
            }
            className="gap-2"
            disabled={
              calculating ||
              loadingYears ||
              loadingCourses
            }
          >
            <Calculator className="size-4" />

            {calculating
              ? 'جاري الاحتساب...'
              : 'احتساب النتائج'}
          </Button>
        </CardContent>
      </Card>

      {/* =====================================================
          RESULTS
      ===================================================== */}

      {hasCalculated && (
        <AttendanceAwardsResults
          results={results}
          selectedCourses={selectedCourses}
          academicYears={academicYears}
          selectedYearId={selectedYearId}
          fromDate={fromDate}
          toDate={toDate}
          onError={setError}
        />
      )}
    </div>
  )
}
