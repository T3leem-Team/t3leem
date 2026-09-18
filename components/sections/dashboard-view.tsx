'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CalendarCheck,
  CreditCard,
  ClipboardCheck,
  Users,
  UserCheck,
  UserX,
  Clock3,
  RefreshCw,
  BookOpen,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'

import { PageHeader } from '@/components/dashboard/page-header'
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

type Student = {
  id: string
  name: string
  personalId: string | null
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

type Payment = {
  id: string
  studentId: string
  academicYearId: string
  amount: number
  paymentMethod: string
  paymentDate: string
  referenceNumber: string | null
}

type RegistrationRequest = {
  id: string
  requestNumber: string
  name: string
  status: string
  paymentStatus: string
  createdAt: string
}

type DashboardStats = {
  studentsCount: number
  assignedCount: number
  unassignedCount: number
  presentCount: number
  absentCount: number
  lateCount: number
  excusedCount: number
  paymentTotal: number
  paymentCount: number
  pendingRegistrations: number
  underReviewRegistrations: number
  approvedRegistrations: number
  rejectedRegistrations: number
}

const EMPTY_STATS: DashboardStats = {
  studentsCount: 0,
  assignedCount: 0,
  unassignedCount: 0,
  presentCount: 0,
  absentCount: 0,
  lateCount: 0,
  excusedCount: 0,
  paymentTotal: 0,
  paymentCount: 0,
  pendingRegistrations: 0,
  underReviewRegistrations: 0,
  approvedRegistrations: 0,
  rejectedRegistrations: 0,
}

function formatDate(date: string | null) {
  if (!date) {
    return '—'
  }

  const parsed = new Date(`${date}T00:00:00`)

  if (Number.isNaN(parsed.getTime())) {
    return date
  }

  return new Intl.DateTimeFormat('ar-BH', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(parsed)
}

function formatShortDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`)

  if (Number.isNaN(parsed.getTime())) {
    return date
  }

  return new Intl.DateTimeFormat('ar-BH', {
    day: '2-digit',
    month: '2-digit',
  }).format(parsed)
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('ar-BH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value)
}

function getDateRange(
  startDate: string | null,
  endDate: string | null,
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

  const dates: string[] = []
  const current = new Date(start)

  while (current <= end) {
    const year = current.getFullYear()
    const month = String(
      current.getMonth() + 1,
    ).padStart(2, '0')
    const day = String(
      current.getDate(),
    ).padStart(2, '0')

    dates.push(`${year}-${month}-${day}`)

    current.setDate(
      current.getDate() + 1,
    )
  }

  return dates
}

function weekdayNamesForDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`)

  if (Number.isNaN(parsed.getTime())) {
    return []
  }

  const arabic = new Intl.DateTimeFormat(
    'ar-BH',
    {
      weekday: 'long',
    },
  ).format(parsed)

  const english = new Intl.DateTimeFormat(
    'en-US',
    {
      weekday: 'long',
    },
  ).format(parsed)

  return [
    arabic,
    arabic.replace('يوم ', ''),
    english,
    english.slice(0, 3),
  ]
}

function courseIncludesDate(
  course: Course,
  date: string,
) {
  if (course.days.length === 0) {
    return true
  }

  const normalizedDays = course.days.map(
    (day) =>
      String(day)
        .trim()
        .toLowerCase(),
  )

  const possibleNames =
    weekdayNamesForDate(date).map(
      (name) =>
        name
          .trim()
          .toLowerCase(),
    )

  return normalizedDays.some(
    (day) =>
      possibleNames.includes(day),
  )
}

function normalizeStatusName(name: string) {
  return String(name ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

function getStatusName(
  statusId: string,
  statuses: AttendanceStatus[],
) {
  return normalizeStatusName(
    statuses.find(
      (status) =>
        status.id === statusId,
    )?.name ?? '',
  )
}

function MetricCard({
  title,
  value,
  icon,
  description,
  loading,
}: {
  title: string
  value: string | number
  icon: React.ReactNode
  description?: string
  loading?: boolean
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              {title}
            </p>

            {loading ? (
              <div className="mt-2 h-9 w-20 animate-pulse rounded bg-muted" />
            ) : (
              <p className="mt-2 text-3xl font-bold tabular-nums">
                {value}
              </p>
            )}

            {description && (
              <p className="mt-2 text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>

          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardView() {
  const [academicYear, setAcademicYear] =
    useState<AcademicYear | null>(null)

  const [courses, setCourses] =
    useState<Course[]>([])

  const [students, setStudents] =
    useState<Student[]>([])

  const [enrollments, setEnrollments] =
    useState<Enrollment[]>([])

  const [assignments, setAssignments] =
    useState<Assignment[]>([])

  const [
    attendanceStatuses,
    setAttendanceStatuses,
  ] = useState<AttendanceStatus[]>([])

  const [
    attendanceRecords,
    setAttendanceRecords,
  ] = useState<AttendanceRecord[]>([])

  const [payments, setPayments] =
    useState<Payment[]>([])

  const [
    registrationRequests,
    setRegistrationRequests,
  ] = useState<
    RegistrationRequest[]
  >([])

  const [selectedCourseId, setSelectedCourseId] =
    useState('')

  const [selectedDate, setSelectedDate] =
    useState('')

  const [loading, setLoading] =
    useState(true)

  const [refreshing, setRefreshing] =
    useState(false)

  const [attendanceRefreshing, setAttendanceRefreshing] =
    useState(false)

  const [statusMessage, setStatusMessage] =
    useState('')

  /*
   * مهم:
   * الحضور له Loader مستقل.
   * هذا يمنع أن يعتمد تحديث الحضور على بقية بيانات الداشبورد.
   */
  const loadAttendance = async (
    courseIds: string[],
  ) => {
    if (courseIds.length === 0) {
      setAttendanceRecords([])
      return
    }

    setAttendanceRefreshing(true)

    try {
      const {
        data,
        error,
      } = await supabase
        .from('attendance')
        .select(
          'id, student_id, enrollment_id, attendance_date, status_id, note, course_id',
        )
        .in('course_id', courseIds)

      if (error) {
        throw new Error(
          `خطأ في تحميل الحضور: ${error.message}`,
        )
      }

      const mappedAttendance: AttendanceRecord[] =
        (data ?? []).map((row) => ({
          id: row.id,
          studentId:
            row.student_id,
          enrollmentId:
            row.enrollment_id,
          attendanceDate:
            String(row.attendance_date).slice(
              0,
              10,
            ),
          statusId:
            row.status_id,
          note: row.note,
          courseId:
            row.course_id,
        }))

      setAttendanceRecords(
        mappedAttendance,
      )
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : 'حدث خطأ أثناء تحديث الحضور.',
      )
    } finally {
      setAttendanceRefreshing(false)
    }
  }

  const loadData = async () => {
    setLoading(true)
    setStatusMessage('')

    try {
      const {
        data: year,
        error: yearError,
      } = await supabase
        .from('academic_years')
        .select(
          'id, name, annual_fee, start_date, end_date',
        )
        .eq('is_current', true)
        .eq('is_active', true)
        .maybeSingle()

      if (yearError) {
        throw new Error(
          `خطأ في تحميل السنة الدراسية: ${yearError.message}`,
        )
      }

      if (!year) {
        setAcademicYear(null)
        setCourses([])
        setStudents([])
        setEnrollments([])
        setAssignments([])
        setAttendanceRecords([])
        setPayments([])
        setRegistrationRequests([])
        return
      }

      const mappedYear: AcademicYear = {
        id: year.id,
        name: year.name,
        annualFee:
          Number(year.annual_fee ?? 0),
        startDate:
          year.start_date ?? null,
        endDate:
          year.end_date ?? null,
      }

      setAcademicYear(mappedYear)

      const [
        coursesResult,
        enrollmentsResult,
        paymentsResult,
        registrationsResult,
        statusesResult,
      ] = await Promise.all([
        supabase
          .from('courses')
          .select(
            'id, name, start_date, end_date, days, created_at',
          )
          .eq(
            'academic_year_id',
            year.id,
          )
          .order('created_at', {
            ascending: true,
          }),

        supabase
          .from('enrollments')
          .select(
            'id, student_id, academic_year_id, level_id, status',
          )
          .eq(
            'academic_year_id',
            year.id,
          ),

        supabase
          .from('payments')
          .select(
            'id, student_id, academic_year_id, amount, payment_method, payment_date, reference_number',
          )
          .eq(
            'academic_year_id',
            year.id,
          )
          .order('payment_date', {
            ascending: false,
          }),

        supabase
          .from('registration_requests')
          .select(
            'id, request_number, name, status, payment_status, created_at',
          )
          .order('created_at', {
            ascending: false,
          }),

        supabase
          .from('attendance_statuses')
          .select(
            'id, name, is_active, sort_order',
          )
          .order('sort_order', {
            ascending: true,
          }),
      ])

      if (coursesResult.error) {
        throw new Error(
          `خطأ في تحميل الدورات: ${coursesResult.error.message}`,
        )
      }

      if (enrollmentsResult.error) {
        throw new Error(
          `خطأ في تحميل تسجيلات الطلاب: ${enrollmentsResult.error.message}`,
        )
      }

      if (paymentsResult.error) {
        throw new Error(
          `خطأ في تحميل المدفوعات: ${paymentsResult.error.message}`,
        )
      }

      if (registrationsResult.error) {
        throw new Error(
          `خطأ في تحميل طلبات التسجيل: ${registrationsResult.error.message}`,
        )
      }

      if (statusesResult.error) {
        throw new Error(
          `خطأ في تحميل حالات الحضور: ${statusesResult.error.message}`,
        )
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
          ? course.days.map((day) =>
              String(day),
            )
          : [],
        createdAt:
          course.created_at ?? null,
      }))

      const mappedEnrollments: Enrollment[] =
        (
          enrollmentsResult.data ?? []
        ).map((row) => ({
          id: row.id,
          studentId: row.student_id,
          academicYearId:
            row.academic_year_id,
          levelId: row.level_id,
          status: row.status,
        }))

      const enrollmentStudentIds =
        Array.from(
          new Set(
            mappedEnrollments.map(
              (row) => row.studentId,
            ),
          ),
        )

      let studentRows: {
        id: string
        name: string
        personal_id: string | null
      }[] = []

      if (
        enrollmentStudentIds.length > 0
      ) {
        const {
          data,
          error,
        } = await supabase
          .from('students')
          .select(
            'id, name, personal_id',
          )
          .in(
            'id',
            enrollmentStudentIds,
          )

        if (error) {
          throw new Error(
            `خطأ في تحميل الطلاب: ${error.message}`,
          )
        }

        studentRows = data ?? []
      }

      const mappedStudents: Student[] =
        studentRows.map((student) => ({
          id: student.id,
          name: student.name,
          personalId:
            student.personal_id,
        }))

      const courseIds =
        mappedCourses.map(
          (course) => course.id,
        )

      let mappedAssignments: Assignment[] =
        []

      if (courseIds.length > 0) {
        const {
          data,
          error,
        } = await supabase
          .from(
            'teacher_student_assignments',
          )
          .select(
            'id, course_id, teacher_id, student_id',
          )
          .in(
            'course_id',
            courseIds,
          )

        if (error) {
          throw new Error(
            `خطأ في تحميل توزيع الطلاب: ${error.message}`,
          )
        }

        mappedAssignments = (
          data ?? []
        ).map((row) => ({
          id: row.id,
          courseId:
            row.course_id,
          teacherId:
            row.teacher_id,
          studentId:
            row.student_id,
        }))
      }

      const mappedStatuses: AttendanceStatus[] =
        (
          statusesResult.data ?? []
        )
          .filter(
            (status) =>
              status.is_active !== false,
          )
          .map((status) => ({
            id: status.id,
            name: normalizeStatusName(
              String(
                status.name ?? '',
              ),
            ),
          }))

      const mappedPayments: Payment[] =
        (
          paymentsResult.data ?? []
        ).map((payment) => ({
          id: payment.id,
          studentId:
            payment.student_id,
          academicYearId:
            payment.academic_year_id,
          amount:
            Number(payment.amount ?? 0),
          paymentMethod:
            payment.payment_method,
          paymentDate:
            payment.payment_date,
          referenceNumber:
            payment.reference_number,
        }))

      const mappedRegistrations: RegistrationRequest[] =
        (
          registrationsResult.data ?? []
        ).map((request) => ({
          id: request.id,
          requestNumber:
            request.request_number,
          name: request.name,
          status: request.status,
          paymentStatus:
            request.payment_status,
          createdAt:
            request.created_at,
        }))

      setCourses(mappedCourses)
      setEnrollments(
        mappedEnrollments,
      )
      setStudents(mappedStudents)
      setAssignments(
        mappedAssignments,
      )
      setAttendanceStatuses(
        mappedStatuses,
      )
      setPayments(mappedPayments)
      setRegistrationRequests(
        mappedRegistrations,
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

        return (
          mappedCourses[0]?.id ?? ''
        )
      })

      /*
       * الحضور يتم تحميله بشكل مستقل
       * بعد معرفة الدورات.
       */
      await loadAttendance(courseIds)
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : 'حدث خطأ أثناء تحميل لوحة التحكم.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /*
   * عند الرجوع للصفحة / التبويب:
   * نعيد جلب الحضور فقط.
   *
   * هذا مهم لأن المستخدم قد يسجل الحضور
   * من قسم المعلمين ثم يرجع للداشبورد.
   */
  useEffect(() => {
    const refreshAttendance = () => {
      if (courses.length === 0) {
        return
      }

      void loadAttendance(
        courses.map(
          (course) => course.id,
        ),
      )
    }

    const handleFocus = () => {
      refreshAttendance()
    }

    const handleVisibilityChange = () => {
      if (
        document.visibilityState ===
        'visible'
      ) {
        refreshAttendance()
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
  }, [courses])

  const selectedCourse =
    courses.find(
      (course) =>
        course.id ===
        selectedCourseId,
    ) ?? null

  const availableDates = useMemo(() => {
    if (!selectedCourse) {
      return []
    }

    const dates = getDateRange(
      selectedCourse.startDate,
      selectedCourse.endDate,
    )

    const courseDates =
      dates.filter((date) =>
        courseIncludesDate(
          selectedCourse,
          date,
        ),
      )

    const attendanceDates =
      Array.from(
        new Set(
          attendanceRecords
            .filter(
              (record) =>
                record.courseId ===
                selectedCourse.id,
            )
            .map(
              (record) =>
                record.attendanceDate,
            ),
        ),
      )

    /*
     * نضمن أن أي يوم يوجد فيه حضور فعلي
     * يظهر في القائمة حتى لو كان خارج
     * نطاق الأيام المحسوبة من الدورة.
     */
    return Array.from(
      new Set([
        ...courseDates,
        ...attendanceDates,
      ]),
    ).sort()
  }, [
    selectedCourse,
    attendanceRecords,
  ])

  /*
   * عند تغيير الدورة:
   * إذا كان اليوم الحالي غير موجود فيها،
   * نختار آخر يوم فيه حضور أولاً،
   * ثم اليوم الحالي إن كان ضمن الدورة،
   * ثم أول يوم متاح.
   */
  useEffect(() => {
    if (!selectedCourse) {
      setSelectedDate('')
      return
    }

    setSelectedDate((current) => {
      if (
        current &&
        availableDates.includes(current)
      ) {
        return current
      }

      const today =
        new Date()
          .toISOString()
          .slice(0, 10)

      if (
        availableDates.includes(
          today,
        )
      ) {
        return today
      }

      const courseAttendanceDates =
        attendanceRecords
          .filter(
            (record) =>
              record.courseId ===
              selectedCourse.id,
          )
          .map(
            (record) =>
              record.attendanceDate,
          )

      const latestAttendanceDate =
        [...new Set(
          courseAttendanceDates,
        )].sort().at(-1)

      if (
        latestAttendanceDate &&
        availableDates.includes(
          latestAttendanceDate,
        )
      ) {
        return latestAttendanceDate
      }

      return (
        availableDates.at(-1) ??
        ''
      )
    })
  }, [
    selectedCourse,
    availableDates,
    attendanceRecords,
  ])

  const currentYearStudentIds =
    useMemo(() => {
      return new Set(
        enrollments
          .filter(
            (enrollment) =>
              enrollment.status ===
                'نشط' ||
              enrollment.status ===
                'active',
          )
          .map(
            (enrollment) =>
              enrollment.studentId,
          ),
      )
    }, [enrollments])

  const courseAssignmentStudentIds =
    useMemo(() => {
      if (!selectedCourse) {
        return new Set<string>()
      }

      return new Set(
        assignments
          .filter(
            (assignment) =>
              assignment.courseId ===
              selectedCourse.id,
          )
          .map(
            (assignment) =>
              assignment.studentId,
          ),
      )
    }, [
      assignments,
      selectedCourse,
    ])

  const selectedCourseStudents =
    useMemo(() => {
      return Array.from(
        courseAssignmentStudentIds,
      )
    }, [
      courseAssignmentStudentIds,
    ])

  /*
   * الحضور لليوم المحدد.
   *
   * مهم:
   * لا نعتبر كل طلاب السنة حاضرين/غائبين.
   * فقط الطلاب الموزعون في الدورة.
   */
  const attendanceForSelectedDay =
    useMemo(() => {
      if (
        !selectedCourse ||
        !selectedDate
      ) {
        return []
      }

      return attendanceRecords.filter(
        (record) =>
          record.courseId ===
            selectedCourse.id &&
          record.attendanceDate ===
            selectedDate &&
          courseAssignmentStudentIds.has(
            record.studentId,
          ),
      )
    }, [
      attendanceRecords,
      selectedCourse,
      selectedDate,
      courseAssignmentStudentIds,
    ])

  /*
   * الإحصائيات محسوبة مباشرة من الـ state.
   * ما عاد عندنا stats state منفصل ممكن يتأخر
   * عن attendanceRecords.
   */
  const stats = useMemo<DashboardStats>(() => {
    const studentsCount =
      currentYearStudentIds.size

    const assignedCount =
      selectedCourseStudents.filter(
        (studentId) =>
          currentYearStudentIds.has(
            studentId,
          ),
      ).length

    const unassignedCount = Math.max(
      studentsCount -
        assignedCount,
      0,
    )

    let presentCount = 0
    let absentCount = 0
    let lateCount = 0
    let excusedCount = 0

    /*
     * نمنع تكرار نفس الطالب في حالة
     * وجود أكثر من سجل لنفس اليوم.
     */
    const processedStudents =
      new Set<string>()

    for (const record of attendanceForSelectedDay) {
      if (
        processedStudents.has(
          record.studentId,
        )
      ) {
        continue
      }

      processedStudents.add(
        record.studentId,
      )

      const status =
        getStatusName(
          record.statusId,
          attendanceStatuses,
        )

      if (
        status === 'حاضر' ||
        status === 'حضور'
      ) {
        presentCount += 1
      } else if (
        status === 'غائب' ||
        status === 'غياب'
      ) {
        absentCount += 1
      } else if (
        status === 'متأخر' ||
        status === 'متأخر عن الحضور'
      ) {
        lateCount += 1
      } else if (
        status === 'مستأذن' ||
        status === 'مستأذن بعذر'
      ) {
        excusedCount += 1
      }
    }

    const paymentTotal =
      payments.reduce(
        (total, payment) =>
          total +
          Number(
            payment.amount ?? 0,
          ),
        0,
      )

    const pendingRegistrations =
      registrationRequests.filter(
        (request) =>
          request.status ===
          'pending',
      ).length

    const underReviewRegistrations =
      registrationRequests.filter(
        (request) =>
          request.status ===
          'under_review',
      ).length

    const approvedRegistrations =
      registrationRequests.filter(
        (request) =>
          request.status ===
          'approved',
      ).length

    const rejectedRegistrations =
      registrationRequests.filter(
        (request) =>
          request.status ===
          'rejected',
      ).length

    return {
      studentsCount,
      assignedCount,
      unassignedCount,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      paymentTotal,
      paymentCount:
        payments.length,
      pendingRegistrations,
      underReviewRegistrations,
      approvedRegistrations,
      rejectedRegistrations,
    }
  }, [
    currentYearStudentIds,
    selectedCourseStudents,
    attendanceForSelectedDay,
    attendanceStatuses,
    payments,
    registrationRequests,
  ])

  const assignedPercentage =
    stats.studentsCount > 0
      ? Math.round(
          (stats.assignedCount /
            stats.studentsCount) *
            100,
        )
      : 0

  const attendanceTotal =
    stats.presentCount +
    stats.absentCount +
    stats.lateCount +
    stats.excusedCount

  const attendancePercentage =
    attendanceTotal > 0
      ? Math.round(
          ((stats.presentCount +
            stats.lateCount +
            stats.excusedCount) /
            attendanceTotal) *
            100,
        )
      : 0

  /*
   * نسبة تحصيل الرسوم فقط.
   */
  const paymentCollectionPercentage =
    academicYear &&
    academicYear.annualFee > 0 &&
    stats.studentsCount > 0
      ? Math.min(
          100,
          Math.round(
            (stats.paymentTotal /
              (stats.studentsCount *
                academicYear.annualFee)) *
              100,
          ),
        )
      : 0

  const latestRegistrations =
    useMemo(
      () =>
        [...registrationRequests]
          .sort((a, b) =>
            b.createdAt.localeCompare(
              a.createdAt,
            ),
          )
          .slice(0, 5),
      [registrationRequests],
    )

  const refresh = async () => {
    setRefreshing(true)

    try {
      await loadData()
    } finally {
      setRefreshing(false)
    }
  }

  if (
    !loading &&
    !academicYear
  ) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="لوحة التحكم"
          description="نظرة عامة على بيانات النظام"
        />

        <Card>
          <CardContent className="p-10 text-center">
            <CalendarCheck className="mx-auto size-10 text-muted-foreground" />

            <p className="mt-4 font-medium">
              لا توجد سنة دراسية حالية
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              أضف سنة دراسية واجعلها الحالية من قسم الإدارة والتحكم.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="لوحة التحكم"
        description={
          academicYear
            ? `نظرة عامة على السنة الدراسية ${academicYear.name}`
            : 'نظرة عامة على بيانات النظام'
        }
      />

      {statusMessage && (
        <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
          <span>{statusMessage}</span>

          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={refreshing}
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
      )}

      <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border bg-card p-5">
        <div className="min-w-[220px] flex-1">
          <label className="mb-2 block text-sm font-medium">
            الدورة
          </label>

          <select
            value={selectedCourseId}
            onChange={(event) => {
              setSelectedCourseId(
                event.target.value,
              )
              setSelectedDate('')
            }}
            className="h-11 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">
              اختر الدورة
            </option>

            {courses.map((course) => (
              <option
                key={course.id}
                value={course.id}
              >
                {course.name}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[220px] flex-1">
          <label className="mb-2 block text-sm font-medium">
            اليوم
          </label>

          <select
            value={selectedDate}
            onChange={(event) =>
              setSelectedDate(
                event.target.value,
              )
            }
            disabled={
              !selectedCourse ||
              availableDates.length ===
                0
            }
            className="h-11 w-full rounded-md border bg-background px-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">
              {!selectedCourse
                ? 'اختر الدورة أولاً'
                : availableDates.length ===
                    0
                  ? 'لا توجد أيام متاحة'
                  : 'اختر اليوم'}
            </option>

            {availableDates.map(
              (date) => (
                <option
                  key={date}
                  value={date}
                >
                  {formatDate(date)}
                </option>
              ),
            )}
          </select>
        </div>

        <Button
          variant="outline"
          onClick={refresh}
          disabled={refreshing}
        >
          <RefreshCw
            className={`size-4 ${
              refreshing
                ? 'animate-spin'
                : ''
            }`}
          />
          تحديث البيانات
        </Button>
      </div>

      {selectedCourse && (
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <BookOpen className="size-5 text-muted-foreground" />

                  <h2 className="font-semibold">
                    {selectedCourse.name}
                  </h2>
                </div>

                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-muted px-3 py-1.5">
                    {formatDate(
                      selectedCourse.startDate,
                    )}{' '}
                    —{' '}
                    {formatDate(
                      selectedCourse.endDate,
                    )}
                  </span>

                  {selectedCourse
                    .days
                    .length > 0 && (
                    <span className="rounded-full bg-muted px-3 py-1.5">
                      {selectedCourse.days.join(
                        ' • ',
                      )}
                    </span>
                  )}
                </div>
              </div>

              {selectedDate && (
                <div className="text-sm text-muted-foreground">
                  اليوم المحدد:{' '}
                  <span className="font-medium text-foreground">
                    {formatDate(
                      selectedDate,
                    )}
                  </span>

                  {attendanceRefreshing && (
                    <span className="mr-2 inline-flex items-center gap-1 text-xs">
                      <RefreshCw className="size-3 animate-spin" />
                      تحديث الحضور...
                    </span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title="طلاب السنة"
          value={stats.studentsCount}
          icon={
            <Users className="size-5" />
          }
          description={
            academicYear
              ? academicYear.name
              : undefined
          }
          loading={loading}
        />

        <MetricCard
          title="الموزعون في الدورة"
          value={stats.assignedCount}
          icon={
            <UserCheck className="size-5" />
          }
          description={`${assignedPercentage}% من طلاب السنة`}
          loading={loading}
        />

        <MetricCard
          title="غير الموزعين في الدورة"
          value={stats.unassignedCount}
          icon={
            <UserX className="size-5" />
          }
          description="طلاب السنة غير المسندين لهذه الدورة"
          loading={loading}
        />

        <MetricCard
          title="حضروا اليوم"
          value={stats.presentCount}
          icon={
            <CalendarCheck className="size-5" />
          }
          description={
            selectedDate
              ? formatShortDate(
                  selectedDate,
                )
              : 'اختر يومًا'
          }
          loading={loading}
        />

        <MetricCard
          title="غابوا اليوم"
          value={stats.absentCount}
          icon={
            <Clock3 className="size-5" />
          }
          description={
            selectedDate
              ? formatShortDate(
                  selectedDate,
                )
              : 'اختر يومًا'
          }
          loading={loading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="size-5" />
              ملخص الحضور
            </CardTitle>
          </CardHeader>

          <CardContent>
            {!selectedCourse ||
            !selectedDate ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                اختر الدورة واليوم لعرض الحضور.
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      نسبة الحضور
                    </p>

                    <p className="mt-1 text-3xl font-bold">
                      {attendancePercentage}%
                    </p>
                  </div>

                  <div className="text-left text-sm text-muted-foreground">
                    إجمالي المسجلين للحضور:{' '}
                    <span className="font-medium text-foreground">
                      {attendanceTotal}
                    </span>
                  </div>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground transition-all"
                    style={{
                      width: `${Math.min(
                        attendancePercentage,
                        100,
                      )}%`,
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">
                      حاضر
                    </p>

                    <p className="mt-1 text-xl font-semibold">
                      {
                        stats.presentCount
                      }
                    </p>
                  </div>

                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">
                      غائب
                    </p>

                    <p className="mt-1 text-xl font-semibold">
                      {
                        stats.absentCount
                      }
                    </p>
                  </div>

                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">
                      متأخر
                    </p>

                    <p className="mt-1 text-xl font-semibold">
                      {
                        stats.lateCount
                      }
                    </p>
                  </div>

                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">
                      مستأذن
                    </p>

                    <p className="mt-1 text-xl font-semibold">
                      {
                        stats.excusedCount
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-5" />
              توزيع الطلاب
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    الموزعون في الدورة
                  </p>

                  <p className="mt-1 text-3xl font-bold">
                    {stats.assignedCount}
                  </p>
                </div>

                <div className="text-left text-sm text-muted-foreground">
                  من أصل{' '}
                  <span className="font-medium text-foreground">
                    {stats.studentsCount}
                  </span>
                </div>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-foreground transition-all"
                  style={{
                    width: `${Math.min(
                      assignedPercentage,
                      100,
                    )}%`,
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">
                    موزعون
                  </p>

                  <p className="mt-1 text-2xl font-semibold">
                    {
                      stats.assignedCount
                    }
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">
                    غير موزعين
                  </p>

                  <p className="mt-1 text-2xl font-semibold">
                    {
                      stats.unassignedCount
                    }
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                التوزيع يعني أن الطالب مسجل عند معلم في الدورة، وليس أنه حضر فعليًا.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* نسبة المدفوعات فقط */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <CreditCard className="size-5" />
              </div>

              <div>
                <p className="font-medium">
                  نسبة تحصيل الرسوم
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  مقارنة بإجمالي الرسوم السنوية للطلاب
                </p>
              </div>
            </div>

            <p className="text-3xl font-bold tabular-nums">
              {paymentCollectionPercentage}%
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="size-5" />
            طلبات التسجيل
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">
                قيد الانتظار
              </p>

              <p className="mt-1 text-xl font-semibold">
                {
                  stats.pendingRegistrations
                }
              </p>
            </div>

            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">
                قيد المراجعة
              </p>

              <p className="mt-1 text-xl font-semibold">
                {
                  stats.underReviewRegistrations
                }
              </p>
            </div>

            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">
                مقبولة
              </p>

              <p className="mt-1 text-xl font-semibold">
                {
                  stats.approvedRegistrations
                }
              </p>
            </div>

            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">
                مرفوضة
              </p>

              <p className="mt-1 text-xl font-semibold">
                {
                  stats.rejectedRegistrations
                }
              </p>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-lg border">
            {latestRegistrations.length ===
            0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                لا توجد طلبات تسجيل.
              </div>
            ) : (
              <div className="divide-y">
                {latestRegistrations.map(
                  (request) => {
                    let statusLabel =
                      '—'

                    if (
                      request.status ===
                      'pending'
                    ) {
                      statusLabel =
                        'قيد الانتظار'
                    } else if (
                      request.status ===
                      'under_review'
                    ) {
                      statusLabel =
                        'قيد المراجعة'
                    } else if (
                      request.status ===
                      'approved'
                    ) {
                      statusLabel =
                        'مقبول'
                    } else if (
                      request.status ===
                      'rejected'
                    ) {
                      statusLabel =
                        'مرفوض'
                    } else if (
                      request.status ===
                      'cancelled'
                    ) {
                      statusLabel =
                        'ملغي'
                    }

                    return (
                      <div
                        key={
                          request.id
                        }
                        className="flex items-center justify-between gap-4 p-4"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {request.name}
                          </p>

                          <p className="mt-1 text-xs text-muted-foreground">
                            {
                              request.requestNumber
                            }{' '}
                            •{' '}
                            {formatDate(
                              request.createdAt.slice(
                                0,
                                10,
                              ),
                            )}
                          </p>
                        </div>

                        <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs">
                          {
                            statusLabel
                          }
                        </span>
                      </div>
                    )
                  },
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            معلومات السنة الحالية
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                السنة الدراسية
              </p>

              <p className="mt-1 font-semibold">
                {academicYear?.name ??
                  '—'}
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                الرسوم السنوية
              </p>

              <p className="mt-1 font-semibold">
                {formatCurrency(
                  academicYear?.annualFee ??
                    0,
                )}
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                عدد الدورات
              </p>

              <p className="mt-1 font-semibold">
                {courses.length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}