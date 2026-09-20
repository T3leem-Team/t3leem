'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Search,
  UserPlus,
  Filter,
  X,
  Pencil,
  Download,
} from 'lucide-react'

import { useRouter } from 'next/navigation'

import * as XLSX from 'xlsx'

import { supabase } from '@/lib/supabase'

import { PageHeader } from '@/components/dashboard/page-header'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import {
  StudentDetails,
  type StudentCourseStatus,
} from './student-details'

import { StudentForm } from './student-form'

type Filters = {
  name: string
  personalId: string
  grade: string
  phone: string
  whatsapp: string
  paymentStatus: string
  notes: string
  attendance: string
}

type AcademicLevel = {
  id: string
  name: string
  sort_order: number
}

type Course = {
  id: string
  academic_year_id: string
  name: string
  start_date: string | null
  end_date: string | null
  days: string[]
}

type TeacherStudentAssignment = {
  id: string
  course_id: string
  teacher_id: string
  student_id: string
}

type AttendanceStatus = {
  id: string
  name: string
  isActive: boolean
  sortOrder: number
}

type AttendanceRecord = {
  id: string
  studentId: string
  enrollmentId: string | null
  courseId: string
  attendanceDate: string
  statusId: string
  note: string
}

type StudentAttendanceSummary = {
  courseId: string
  courseName: string
  startDate: string | null
  endDate: string | null
  days: string[]
  teacherName: string
  totalDays: number
  present: number
  absent: number
  late: number
  excused: number
  notRecorded: number
  percentage: number
}

type BaseColumnKey =
  | 'name'
  | 'personalId'
  | 'grade'
  | 'contact'
  | 'paymentStatus'
  | 'notes'
  | 'attendance'

const baseColumns: {
  key: BaseColumnKey
  label: string
}[] = [
  {
    key: 'name',
    label: 'اسم الطالب',
  },
  {
    key: 'personalId',
    label: 'الرقم الشخصي',
  },
  {
    key: 'grade',
    label: 'الصف الأكاديمي',
  },
  {
    key: 'contact',
    label: 'التواصل',
  },
  {
    key: 'paymentStatus',
    label: 'الدفع',
  },
  {
    key: 'notes',
    label: 'ملاحظات',
  },
  {
    key: 'attendance',
    label: 'الحضور',
  },
]

const emptyFilters: Filters = {
  name: '',
  personalId: '',
  grade: '',
  phone: '',
  whatsapp: '',
  paymentStatus: '',
  notes: '',
  attendance: '',
}

function getTodayString() {
  const now = new Date()

  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function normalizeArabicDay(value: unknown) {
  const text = String(value ?? '')
    .trim()
    .toLowerCase()

  const map: Record<string, string> = {
    'الأحد': 'sunday',
    'الاحد': 'sunday',
    sunday: 'sunday',
    sun: 'sunday',
    '0': 'sunday',

    'الإثنين': 'monday',
    'الاثنين': 'monday',
    monday: 'monday',
    mon: 'monday',
    '1': 'monday',

    'الثلاثاء': 'tuesday',
    tuesday: 'tuesday',
    tue: 'tuesday',
    '2': 'tuesday',

    'الأربعاء': 'wednesday',
    'الاربعاء': 'wednesday',
    wednesday: 'wednesday',
    wed: 'wednesday',
    '3': 'wednesday',

    'الخميس': 'thursday',
    thursday: 'thursday',
    thu: 'thursday',
    '4': 'thursday',

    'الجمعة': 'friday',
    friday: 'friday',
    fri: 'friday',
    '5': 'friday',

    'السبت': 'saturday',
    saturday: 'saturday',
    sat: 'saturday',
    '6': 'saturday',
  }

  return map[text] ?? text
}

function getDayOfWeek(date: string) {
  const [year, month, day] = date
    .split('-')
    .map(Number)

  const value = new Date(
    Date.UTC(year, month - 1, day)
  )

  return [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ][value.getUTCDay()]
}

function isCourseStudyDay(
  date: string,
  courseDays: string[]
) {
  if (!courseDays.length) return false

  const currentDay = getDayOfWeek(date)

  return courseDays.some(
    (day) =>
      normalizeArabicDay(day) === currentDay
  )
}

function getDateRange(
  startDate: string,
  endDate: string
) {
  const result: string[] = []

  const [sy, sm, sd] = startDate
    .split('-')
    .map(Number)

  const [ey, em, ed] = endDate
    .split('-')
    .map(Number)

  const current = new Date(
    Date.UTC(sy, sm - 1, sd)
  )

  const end = new Date(
    Date.UTC(ey, em - 1, ed)
  )

  while (current <= end) {
    const year = current.getUTCFullYear()
    const month = String(
      current.getUTCMonth() + 1
    ).padStart(2, '0')
    const day = String(
      current.getUTCDate()
    ).padStart(2, '0')

    result.push(
      `${year}-${month}-${day}`
    )

    current.setUTCDate(
      current.getUTCDate() + 1
    )
  }

  return result
}

function getCourseStatus(
  course: Course,
  studentId: string,
  assignments: TeacherStudentAssignment[],
  today: string
): StudentCourseStatus['status'] {
  const hasAssignment = assignments.some(
    (assignment) =>
      assignment.student_id === studentId &&
      assignment.course_id === course.id
  )

  if (
    course.start_date &&
    today < course.start_date
  ) {
    return 'لم تقم الدورة حتى الآن'
  }

  return hasAssignment
    ? 'حاضر'
    : 'لم يحضر'
}

function getCurrentCourse(
  courses: Course[],
  today: string
) {
  return (
    courses.find((course) => {
      if (
        !course.start_date ||
        !course.end_date
      ) {
        return false
      }

      return (
        today >= course.start_date &&
        today <= course.end_date
      )
    }) ?? null
  )
}

function getStatusName(
  statuses: AttendanceStatus[],
  statusId: string
) {
  return (
    statuses.find(
      (status) =>
        status.id === statusId
    )?.name ?? ''
  )
}

function normalizeAttendanceStatus(
  value: string
) {
  const text = value
    .trim()
    .toLowerCase()

  if (
    text === 'حاضر' ||
    text === 'present'
  ) {
    return 'حاضر'
  }

  if (
    text === 'غائب' ||
    text === 'absent'
  ) {
    return 'غائب'
  }

  if (
    text === 'متأخر' ||
    text === 'متاخر' ||
    text === 'late'
  ) {
    return 'متأخر'
  }

  if (
    text === 'مستأذن' ||
    text === 'مستاذن' ||
    text === 'excused'
  ) {
    return 'مستأذن'
  }

  return ''
}

function calculateAttendanceSummary(
  studentId: string,
  course: Course,
  records: AttendanceRecord[],
  statuses: AttendanceStatus[],
  teacherName: string,
  today: string
): StudentAttendanceSummary {
  let present = 0
  let absent = 0
  let late = 0
  let excused = 0
  let notRecorded = 0

  const studyDates: string[] = []

  if (
    course.start_date &&
    course.end_date
  ) {
    const dates = getDateRange(
      course.start_date,
      course.end_date
    )

    dates.forEach((date) => {
      if (
        date > today ||
        !isCourseStudyDay(
          date,
          course.days
        )
      ) {
        return
      }

      studyDates.push(date)

      const record = records.find(
        (item) =>
          item.studentId === studentId &&
          item.courseId === course.id &&
          item.attendanceDate === date
      )

      if (!record) {
        notRecorded += 1
        return
      }

      const status = normalizeAttendanceStatus(
        getStatusName(
          statuses,
          record.statusId
        )
      )

      if (status === 'حاضر') {
        present += 1
      } else if (status === 'غائب') {
        absent += 1
      } else if (status === 'متأخر') {
        late += 1
      } else if (status === 'مستأذن') {
        excused += 1
      } else {
        notRecorded += 1
      }
    })
  }

  const counted =
    present +
    late +
    absent

  const percentage =
    counted === 0
      ? 0
      : Math.round(
          ((present + late) /
            counted) *
            100
        )

  return {
    courseId: course.id,
    courseName: course.name,
    startDate: course.start_date,
    endDate: course.end_date,
    days: course.days,
    teacherName,
    totalDays: studyDates.length,
    present,
    absent,
    late,
    excused,
    notRecorded,
    percentage,
  }
}

export function StudentsView() {
  const router = useRouter()

  const [
    supabaseStatus,
    setSupabaseStatus,
  ] = useState('جاري الاختبار...')

  const [
    academicLevels,
    setAcademicLevels,
  ] = useState<AcademicLevel[]>([])

  const [
    currentAcademicYearId,
    setCurrentAcademicYearId,
  ] = useState<string | null>(null)

  const [
    currentAcademicYearName,
    setCurrentAcademicYearName,
  ] = useState('')

  const [
    currentAnnualFee,
    setCurrentAnnualFee,
  ] = useState(0)

  const [courses, setCourses] =
    useState<Course[]>([])

  const [
    currentCourseId,
    setCurrentCourseId,
  ] = useState<string | null>(null)

  const [
    currentCourseName,
    setCurrentCourseName,
  ] = useState('')

  const [
    search,
    setSearch,
  ] = useState('')

  const [
    filters,
    setFilters,
  ] = useState<Filters>(emptyFilters)

  const [
    visibleColumns,
    setVisibleColumns,
  ] = useState<Record<string, boolean>>({
    name: true,
    personalId: true,
    grade: true,
    contact: true,
    paymentStatus: true,
    notes: true,
    attendance: true,
  })

  const [
    studentList,
    setStudentList,
  ] = useState<any[]>([])

  const [
    attendanceStatuses,
    setAttendanceStatuses,
  ] = useState<AttendanceStatus[]>([])

  const [
    isAddStudentOpen,
    setIsAddStudentOpen,
  ] = useState(false)

  const [
    selectedStudentId,
    setSelectedStudentId,
  ] = useState('')

  const [
    editingStudentId,
    setEditingStudentId,
  ] = useState<string | null>(null)

  const [
    detailsStudent,
    setDetailsStudent,
  ] = useState<any | null>(null)

  const [
    detailsMode,
    setDetailsMode,
  ] = useState<
    'overview' | 'attendance' | 'notes' | null
  >(null)

  useEffect(() => {
    const loadData = async () => {
      setSupabaseStatus(
        'جاري تحميل بيانات النظام...'
      )

      const {
        data: currentYear,
        error: yearError,
      } = await supabase
        .from('academic_years')
        .select(
          'id, name, annual_fee'
        )
        .eq('is_current', true)
        .eq('is_active', true)
        .maybeSingle()

      if (yearError) {
        setSupabaseStatus(
          `خطأ في تحميل السنة الدراسية: ${yearError.message}`
        )
        return
      }

      if (!currentYear) {
        setSupabaseStatus(
          'لا توجد سنة دراسية حالية مفعلة'
        )
        return
      }

      const annualFee = Number(
        currentYear.annual_fee ?? 0
      )

      setCurrentAcademicYearId(
        currentYear.id
      )

      setCurrentAcademicYearName(
        currentYear.name ?? ''
      )

      setCurrentAnnualFee(
        annualFee
      )

      const {
        data: levels,
        error: levelsError,
      } = await supabase
        .from('levels')
        .select(
          'id, name, sort_order'
        )
        .eq('is_active', true)
        .order('sort_order', {
          ascending: true,
        })

      if (levelsError) {
        setSupabaseStatus(
          `خطأ في تحميل الصفوف الأكاديمية: ${levelsError.message}`
        )
        return
      }

      setAcademicLevels(
        levels ?? []
      )

      const {
        data: coursesData,
        error: coursesError,
      } = await supabase
        .from('courses')
        .select(
          'id, academic_year_id, name, start_date, end_date, days'
        )
        .eq(
          'academic_year_id',
          currentYear.id
        )
        .order('start_date', {
          ascending: true,
          nullsFirst: false,
        })

      if (coursesError) {
        setSupabaseStatus(
          `خطأ في تحميل الدورات: ${coursesError.message}`
        )
        return
      }

      const loadedCourses: Course[] =
        (coursesData ?? []).map(
          (course) => ({
            id: course.id,
            academic_year_id:
              course.academic_year_id,
            name: course.name,
            start_date:
              course.start_date ??
              null,
            end_date:
              course.end_date ??
              null,
            days:
              Array.isArray(
                course.days
              )
                ? course.days
                : [],
          })
        )

      setCourses(
        loadedCourses
      )

      const today =
        getTodayString()

      const currentCourse =
        getCurrentCourse(
          loadedCourses,
          today
        )

      setCurrentCourseId(
        currentCourse?.id ?? null
      )

      setCurrentCourseName(
        currentCourse?.name ?? ''
      )

      const {
        data: enrollmentRows,
        error:
          enrollmentsError,
      } = await supabase
        .from('enrollments')
        .select(
          'student_id, level_id, academic_year_id, status'
        )
        .eq(
          'academic_year_id',
          currentYear.id
        )

      if (enrollmentsError) {
        setSupabaseStatus(
          `خطأ في تحميل ربط الصفوف: ${enrollmentsError.message}`
        )
        return
      }

      let studentsData: any[] | null =
        null

      const {
        data: loadedStudents,
        error: studentsError,
      } = await supabase
        .from('students')
        .select(
          'id, student_id, name, personal_id, gender, phone, whatsapp, age, notes, health_notes, status, fee_exempt, created_at, updated_at, source, academic_year_id'
        )
        .order('created_at', {
          ascending: false,
        })

      studentsData =
        loadedStudents

      if (studentsError) {
        /*
         * بعض قواعد البيانات القديمة قد لا تحتوي
         * على جميع الحقول الإضافية.
         *
         * نعيد الاستعلام بالحقول الأساسية.
         */
        const {
          data: fallbackStudents,
          error:
            fallbackStudentsError,
        } = await supabase
          .from('students')
          .select(
            'id, student_id, name, personal_id, phone, whatsapp, notes, health_notes, status, fee_exempt, created_at'
          )
          .order('created_at', {
            ascending: false,
          })

        if (fallbackStudentsError) {
          setSupabaseStatus(
            `خطأ في تحميل الطلاب: ${fallbackStudentsError.message}`
          )
          return
        }

        studentsData =
          fallbackStudents
      }

      const {
        data: paymentsData,
        error: paymentsError,
      } = await supabase
        .from('payments')
        .select(
          'student_id, academic_year_id, amount'
        )
        .eq(
          'academic_year_id',
          currentYear.id
        )

      if (paymentsError) {
        setSupabaseStatus(
          `خطأ في تحميل الدفعات: ${paymentsError.message}`
        )
        return
      }

      const {
        data: assignmentsData,
        error:
          assignmentsError,
      } = await supabase
        .from(
          'teacher_student_assignments'
        )
        .select(
          'id, course_id, teacher_id, student_id'
        )
        .in(
          'course_id',
          loadedCourses.map(
            (course) => course.id
          )
        )

      if (assignmentsError) {
        setSupabaseStatus(
          `خطأ في تحميل توزيع الطلاب على المعلمين: ${assignmentsError.message}`
        )
        return
      }

      const assignments: TeacherStudentAssignment[] =
        (
          assignmentsData ?? []
        ).map(
          (assignment) => ({
            id: assignment.id,
            course_id:
              assignment.course_id,
            teacher_id:
              assignment.teacher_id,
            student_id:
              assignment.student_id,
          })
        )

      const teacherNames =
        new Map<string, string>()

      if (
        assignments.length > 0
      ) {
        const teacherIds = Array.from(
          new Set(
            assignments.map(
              (item) =>
                item.teacher_id
            )
          )
        )

        const {
          data: teachersData,
          error: teachersError,
        } = await supabase
          .from('teachers')
          .select('id, name')
          .in(
            'id',
            teacherIds
          )

        if (
          !teachersError &&
          teachersData
        ) {
          teachersData.forEach(
            (teacher) => {
              teacherNames.set(
                teacher.id,
                teacher.name ?? ''
              )
            }
          )
        }
      }

      let loadedAttendanceStatuses: AttendanceStatus[] =
        []

      const {
        data: statusesData,
        error: statusesError,
      } = await supabase
        .from('attendance_statuses')
        .select(
          'id, name, is_active, sort_order'
        )
        .order('sort_order', {
          ascending: true,
        })

      if (
        !statusesError &&
        statusesData
      ) {
        loadedAttendanceStatuses =
          statusesData.map(
            (status) => ({
              id: status.id,
              name: status.name,
              isActive:
                Boolean(
                  status.is_active
                ),
              sortOrder:
                Number(
                  status.sort_order ??
                    0
                ),
            })
          )
      }

      setAttendanceStatuses(
        loadedAttendanceStatuses
      )

      let attendanceRows: AttendanceRecord[] =
        []

      if (
        loadedCourses.length > 0
      ) {
        const {
          data: attendanceData,
          error: attendanceError,
        } = await supabase
          .from('attendance')
          .select(
            'id, student_id, enrollment_id, attendance_date, status_id, note, course_id'
          )
          .in(
            'course_id',
            loadedCourses.map(
              (course) => course.id
            )
          )

        if (attendanceError) {
          setSupabaseStatus(
            `تنبيه: تعذر تحميل سجلات الحضور: ${attendanceError.message}`
          )
        } else {
          attendanceRows =
            (
              attendanceData ?? []
            ).map(
              (record) => ({
                id: record.id,
                studentId:
                  record.student_id,
                enrollmentId:
                  record.enrollment_id ??
                  null,
                courseId:
                  record.course_id,
                attendanceDate:
                  record.attendance_date,
                statusId:
                  record.status_id,
                note:
                  record.note ?? '',
              })
            )
        }
      }

      const levelMap = new Map(
        (levels ?? []).map(
          (level) => [
            level.id,
            level.name,
          ]
        )
      )

      const enrollmentMap =
        new Map<
          string,
          string
        >()

      ;(enrollmentRows ?? []).forEach(
        (enrollment) => {
          enrollmentMap.set(
            enrollment.student_id,
            levelMap.get(
              enrollment.level_id
            ) ?? ''
          )
        }
      )

      const paidMap =
        new Map<string, number>()

      ;(paymentsData ?? []).forEach(
        (payment) => {
          const currentPaid =
            paidMap.get(
              payment.student_id
            ) ?? 0

          paidMap.set(
            payment.student_id,
            currentPaid +
              Number(
                payment.amount ?? 0
              )
          )
        }
      )

      const rawStudents =
        studentsData ?? []

      const mappedStudents =
        rawStudents.map(
          (student: any) => {
            const amountPaid =
              paidMap.get(
                student.id
              ) ?? 0

            const feeExempt =
              Boolean(
                student.fee_exempt
              )

            const paymentStatus =
              feeExempt
                ? 'معفي'
                : amountPaid >=
                      annualFee &&
                    annualFee > 0
                  ? 'مدفوع بالكامل'
                  : amountPaid >
                      0
                    ? 'مدفوع جزئيًا'
                    : 'غير مدفوع'

            const courseStatuses =
              loadedCourses.map(
                (course) => ({
                  courseId:
                    course.id,
                  courseName:
                    course.name,
                  startDate:
                    course.start_date,
                  endDate:
                    course.end_date,
                  status:
                    getCourseStatus(
                      course,
                      student.id,
                      assignments,
                      today
                    ),
                })
              )

            const attendanceSummaries =
              loadedCourses.map(
                (course) => {
                  const courseAssignment =
                    assignments.find(
                      (assignment) =>
                        assignment.student_id ===
                          student.id &&
                        assignment.course_id ===
                          course.id
                    )

                  const teacherName =
                    courseAssignment
                      ? teacherNames.get(
                          courseAssignment.teacher_id
                        ) ?? ''
                      : ''

                  return calculateAttendanceSummary(
                    student.id,
                    course,
                    attendanceRows,
                    loadedAttendanceStatuses,
                    teacherName,
                    today
                  )
                }
              )

            const studentAttendanceRecords =
              attendanceRows
                .filter(
                  (record) =>
                    record.studentId ===
                    student.id
                )
                .map(
                  (record) => {
                    const statusName =
                      normalizeAttendanceStatus(
                        getStatusName(
                          loadedAttendanceStatuses,
                          record.statusId
                        )
                      )

                    return {
                      id: record.id,
                      studentId:
                        record.studentId,
                      courseId:
                        record.courseId,
                      attendanceDate:
                        record.attendanceDate,
                      status:
                        statusName ||
                        'غائب',
                      note:
                        record.note ?? '',
                    }
                  }
                )

            const currentStatus =
              currentCourse
                ? getCourseStatus(
                    currentCourse,
                    student.id,
                    assignments,
                    today
                  )
                : 'لم يحضر'

            return {
              id: student.id,

              studentId:
                student.student_id ??
                '',

              name:
                student.name ?? '',

              personalId:
                student.personal_id ??
                '',

              gender:
                student.gender ?? '',

              age:
                student.age ?? null,

              grade:
                enrollmentMap.get(
                  student.id
                ) ?? '',

              phone:
                student.phone ?? '',

              whatsapp:
                student.whatsapp ??
                '',

              status:
                student.status ??
                '',

              paymentStatus,

              amountDue:
                annualFee,

              amountPaid,

              feeExempt,

              chronicDiseases:
                student.health_notes ??
                '',

              notes:
                student.notes ?? '',

              source:
                student.source ??
                '',

              createdAt:
                student.created_at ??
                '',

              updatedAt:
                student.updated_at ??
                '',

              academicYearId:
                student.academic_year_id ??
                currentYear.id,

              attendance:
                currentStatus,

              courseStatuses,

              attendanceSummaries,

              attendanceRecords:
                studentAttendanceRecords,
            }
          }
        )

      setStudentList(
        mappedStudents
      )

      if (currentCourse) {
        setSupabaseStatus(
          `متصل بـ Supabase ✅ | السنة الحالية: ${currentYear.name} | الدورة الحالية: ${currentCourse.name} | الرسوم السنوية: ${annualFee.toFixed(3)} د.ب`
        )
      } else {
        setSupabaseStatus(
          `متصل بـ Supabase ✅ | السنة الحالية: ${currentYear.name} | لا توجد دورة حالية الآن | الرسوم السنوية: ${annualFee.toFixed(3)} د.ب`
        )
      }
    }

    loadData()
  }, [])

  const updateFilter = (
    key: keyof Filters,
    value: string
  ) => {
    setFilters(
      (current) => ({
        ...current,
        [key]: value,
      })
    )
  }

  const filteredStudents =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase()

      return studentList.filter(
        (student) => {
          const remaining =
            student.feeExempt
              ? 0
              : Math.max(
                  Number(
                    student.amountDue ??
                      0
                  ) -
                    Number(
                      student.amountPaid ??
                        0
                    ),
                  0
                )

          const contactText =
            [
              student.phone,
              student.whatsapp,
            ]
              .filter(Boolean)
              .join(' ')

          const notesText =
            [
              student.notes,
              student.chronicDiseases,
            ]
              .filter(Boolean)
              .join(' ')

          const courseStatusText =
            (
              student.courseStatuses ??
              []
            )
              .map(
                (
                  course: StudentCourseStatus
                ) =>
                  `${course.courseName} ${course.status}`
              )
              .join(' ')

          const attendanceText =
            (
              student.attendanceSummaries ??
              []
            )
              .map(
                (
                  summary: StudentAttendanceSummary
                ) =>
                  `${summary.courseName} ${summary.percentage}% ${summary.present} ${summary.absent} ${summary.late}`
              )
              .join(' ')

          const matchesSearch =
            !query ||
            [
              student.name,
              student.personalId,
              student.grade,
              contactText,
              student.paymentStatus,
              notesText,
              student.attendance,
              courseStatusText,
              attendanceText,
              remaining,
            ].some(
              (value) =>
                String(value)
                  .toLowerCase()
                  .includes(query)
            )

          const matches = {
            name:
              !filters.name ||
              String(
                student.name ?? ''
              )
                .toLowerCase()
                .includes(
                  filters.name.toLowerCase()
                ),

            personalId:
              !filters.personalId ||
              String(
                student.personalId ??
                  ''
              ).includes(
                filters.personalId
              ),

            grade:
              !filters.grade ||
              student.grade ===
                filters.grade,

            phone:
              !filters.phone ||
              String(
                student.phone ?? ''
              ).includes(
                filters.phone
              ),

            whatsapp:
              !filters.whatsapp ||
              String(
                student.whatsapp ??
                  ''
              ).includes(
                filters.whatsapp
              ),

            paymentStatus:
              !filters.paymentStatus ||
              student.paymentStatus ===
                filters.paymentStatus,

            notes:
              !filters.notes ||
              notesText
                .toLowerCase()
                .includes(
                  filters.notes.toLowerCase()
                ),

            attendance:
              !filters.attendance ||
              student.attendance ===
                filters.attendance,
          }

          return (
            matchesSearch &&
            Object.values(
              matches
            ).every(Boolean)
          )
        }
      )
    }, [
      search,
      filters,
      studentList,
    ])

  const editingStudent =
    studentList.find(
      (student) =>
        student.id ===
        editingStudentId
    )

  const selectedStudent =
    studentList.find(
      (student) =>
        student.id ===
        selectedStudentId
    )

  const openAddStudent = () => {
    setEditingStudentId(null)
    setIsAddStudentOpen(true)
  }

  const openEditStudent = () => {
    if (!selectedStudentId)
      return

    setEditingStudentId(
      selectedStudentId
    )

    setIsAddStudentOpen(true)
  }

  const closeStudentDrawer = () => {
    setIsAddStudentOpen(false)
    setEditingStudentId(null)
  }

  const openStudentDetails = (
    student: any
  ) => {
    setDetailsStudent(student)
    setDetailsMode('overview')
  }

  const openAttendanceDetails = (
    student: any
  ) => {
    setDetailsStudent(student)
    setDetailsMode(
      'attendance'
    )
  }

  const openNotesDetails = (
    student: any
  ) => {
    setDetailsStudent(student)
    setDetailsMode('notes')
  }

  const closeDetails = () => {
    setDetailsStudent(null)
    setDetailsMode(null)
  }

  const toggleColumn = (
    key: string
  ) => {
    setVisibleColumns(
      (current) => {
        const visibleCount =
          Object.values(
            current
          ).filter(Boolean)
            .length

        if (
          current[key] &&
          visibleCount === 1
        ) {
          return current
        }

        return {
          ...current,
          [key]: !current[key],
        }
      }
    )
  }

  const exportStudentsToExcel =
    () => {
      if (
        filteredStudents.length ===
        0
      ) {
        setSupabaseStatus(
          'لا توجد بيانات لتصديرها إلى Excel'
        )
        return
      }

      const exportData =
        filteredStudents.map(
          (
            student,
            index
          ) => {
            const remaining =
              student.feeExempt
                ? 0
                : Math.max(
                    Number(
                      student.amountDue ??
                        0
                    ) -
                      Number(
                        student.amountPaid ??
                          0
                      ),
                    0
                  )

            const row: Record<
              string,
              any
            > = {
              '#':
                index + 1,

              'معرف الطالب':
                student.studentId ??
                '',

              'اسم الطالب':
                student.name ??
                '',

              'الرقم الشخصي':
                student.personalId ??
                '',

              'الجنس':
                student.gender ??
                '',

              'العمر':
                student.age ??
                '',

              'الصف الأكاديمي':
                student.grade ??
                '',

              'رقم الهاتف':
                student.phone ??
                '',

              'رقم واتساب':
                student.whatsapp ??
                '',

              'الحالة':
                student.status ??
                '',

              'المصدر':
                student.source ??
                '',

              'حالة الدفع':
                student.paymentStatus ??
                '',

              'الرسوم السنوية':
                Number(
                  student.amountDue ??
                    0
                ),

              'المدفوع':
                Number(
                  student.amountPaid ??
                    0
                ),

              'المتبقي':
                remaining,

              'الإعفاء':
                student.feeExempt
                  ? 'نعم'
                  : 'لا',

              'الملاحظات':
                student.notes ??
                '',

              'المعلومات الصحية':
                student.chronicDiseases ??
                '',

              'الحضور الحالي':
                student.attendance ??
                '',

              'تاريخ الإضافة':
                student.createdAt ??
                '',

              'آخر تحديث':
                student.updatedAt ??
                '',

              'السنة الدراسية':
                currentAcademicYearName,
            }

            ;(
              student.attendanceSummaries ??
              []
            ).forEach(
              (
                summary: StudentAttendanceSummary
              ) => {
                row[
                  `${summary.courseName} - المعلم`
                ] =
                  summary.teacherName ||
                  ''

                row[
                  `${summary.courseName} - أيام الدراسة`
                ] =
                  summary.totalDays

                row[
                  `${summary.courseName} - حاضر`
                ] =
                  summary.present

                row[
                  `${summary.courseName} - غائب`
                ] =
                  summary.absent

                row[
                  `${summary.courseName} - متأخر`
                ] =
                  summary.late

                row[
                  `${summary.courseName} - مستأذن`
                ] =
                  summary.excused

                row[
                  `${summary.courseName} - لم يسجل`
                ] =
                  summary.notRecorded

                row[
                  `${summary.courseName} - النسبة`
                ] =
                  `${summary.percentage}%`
              }
            )

            ;(
              student.courseStatuses ??
              []
            ).forEach(
              (
                course: StudentCourseStatus
              ) => {
                row[
                  `${course.courseName} - الحالة`
                ] =
                  course.status
              }
            )

            return row
          }
        )

      const worksheet =
        XLSX.utils.json_to_sheet(
          exportData
        )

      const workbook =
        XLSX.utils.book_new()

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        'الطلاب'
      )

      const columnCount =
        Object.keys(
          exportData[0] ?? {}
        ).length

      worksheet['!cols'] =
        Array.from(
          {
            length:
              columnCount,
          },
          (_, index) => ({
            wch:
              index === 0
                ? 6
                : 24,
          })
        )

      const safeYearName =
        currentAcademicYearName
          .replace(
            /[\\/:*?"<>|]/g,
            '-'
          )
          .trim()

      const fileName =
        safeYearName
          ? `الطلاب-${safeYearName}.xlsx`
          : 'الطلاب.xlsx'

      XLSX.writeFile(
        workbook,
        fileName
      )

      setSupabaseStatus(
        `تم تنزيل ${filteredStudents.length} طالب كملف Excel مع جميع بيانات الطلاب وتفاصيل الحضور والدورات ✅`
      )
    }

  const textFilter = (
    key: keyof Filters,
    placeholder: string
  ) => (
    <div className="relative mt-2">
      <Filter className="absolute right-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />

      <input
        value={filters[key]}
        onChange={(e) =>
          updateFilter(
            key,
            e.target.value
          )
        }
        placeholder={
          placeholder
        }
        className="h-8 w-full min-w-[90px] rounded border bg-background px-2 pr-7 text-xs outline-none"
      />
    </div>
  )

  const visibleColumnCount =
    Object.values(
      visibleColumns
    ).filter(Boolean).length +
    1

  return (
    <div className="space-y-6">
      <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm">
        {supabaseStatus}
      </div>

      <PageHeader
        title="الطلاب"
        description={`إجمالي ${studentList.length} طالب مسجّل في النظام`}
        action={
          <Button
            onClick={
              openAddStudent
            }
          >
            <UserPlus className="size-4" />
            إضافة طالب
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <input
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="بحث عام في جميع بيانات الطلاب..."
              className="h-10 w-full rounded-md border bg-background px-3 pr-9 text-sm outline-none"
            />
          </div>

          <div className="flex flex-col gap-3 rounded-md border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">
                  إجمالي الطلاب:
                </span>{' '}
                <span className="font-semibold">
                  {
                    studentList.length
                  }
                </span>
              </div>

              <div>
                <span className="text-muted-foreground">
                  النتائج الحالية:
                </span>{' '}
                <span className="font-semibold">
                  {
                    filteredStudents.length
                  }
                </span>
              </div>

              <div>
                <span className="text-muted-foreground">
                  الرسوم السنوية:
                </span>{' '}
                <span className="font-semibold">
                  {currentAnnualFee.toLocaleString(
                    'ar-BH',
                    {
                      minimumFractionDigits: 3,
                      maximumFractionDigits: 3,
                    }
                  )}{' '}
                  د.ب
                </span>
              </div>

              {currentCourseName && (
                <div>
                  <span className="text-muted-foreground">
                    الدورة الحالية:
                  </span>{' '}
                  <span className="font-semibold">
                    {
                      currentCourseName
                    }
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={
                  exportStudentsToExcel
                }
                disabled={
                  filteredStudents.length ===
                  0
                }
              >
                <Download className="size-4" />
                تنزيل Excel
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled={
                  !selectedStudentId
                }
                onClick={
                  openEditStudent
                }
              >
                <Pencil className="size-4" />
                تعديل
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled={
                  !selectedStudentId
                }
                onClick={async () => {
                  if (
                    !selectedStudentId
                  )
                    return

                  const selected =
                    studentList.find(
                      (student) =>
                        student.id ===
                        selectedStudentId
                    )

                  if (!selected)
                    return

                  const nextFeeExempt =
                    !selected.feeExempt

                  const {
                    error,
                  } =
                    await supabase
                      .from(
                        'students'
                      )
                      .update({
                        fee_exempt:
                          nextFeeExempt,
                      })
                      .eq(
                        'id',
                        selectedStudentId
                      )

                  if (error) {
                    setSupabaseStatus(
                      `خطأ في تحديث حالة الإعفاء: ${error.message}`
                    )
                    return
                  }

                  setStudentList(
                    (current) =>
                      current.map(
                        (
                          student
                        ) =>
                          student.id ===
                          selectedStudentId
                            ? {
                                ...student,
                                feeExempt:
                                  nextFeeExempt,
                                paymentStatus:
                                  nextFeeExempt
                                    ? 'معفي'
                                    : student.amountPaid >=
                                          student.amountDue &&
                                        student.amountDue >
                                          0
                                      ? 'مدفوع بالكامل'
                                      : student.amountPaid >
                                          0
                                        ? 'مدفوع جزئيًا'
                                        : 'غير مدفوع',
                              }
                            : student
                      )
                  )

                  setSupabaseStatus(
                    nextFeeExempt
                      ? 'تم إعفاء الطالب من الرسوم ✅'
                      : 'تم إلغاء إعفاء الطالب ✅'
                  )
                }}
              >
                {selectedStudent?.feeExempt
                  ? 'إلغاء الإعفاء'
                  : 'إعفاء'}
              </Button>

              <Button
                type="button"
                variant="destructive"
                disabled={
                  !selectedStudentId
                }
                onClick={async () => {
                  const confirmed =
                    window.confirm(
                      '⚠️ هل أنت متأكد من حذف الطالب؟\n\nسيتم حذف بيانات الطالب، ولا يمكن التراجع عن هذه العملية.'
                    )

                  if (!confirmed)
                    return

                  const {
                    error,
                  } =
                    await supabase
                      .from(
                        'students'
                      )
                      .delete()
                      .eq(
                        'id',
                        selectedStudentId
                      )

                  if (error) {
                    setSupabaseStatus(
                      `خطأ في حذف الطالب: ${error.message}`
                    )
                    return
                  }

                  setStudentList(
                    (current) =>
                      current.filter(
                        (
                          student
                        ) =>
                          student.id !==
                          selectedStudentId
                      )
                  )

                  setSelectedStudentId(
                    ''
                  )

                  setSupabaseStatus(
                    'تم حذف الطالب من Supabase ✅'
                  )
                }}
              >
                <X className="size-4" />
                مسح
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  document
                    .getElementById(
                      'student-columns-menu'
                    )
                    ?.classList.toggle(
                      'hidden'
                    )
                }}
              >
                تخصيص الأعمدة
              </Button>
            </div>
          </div>

          <div
            id="student-columns-menu"
            className="hidden rounded-md border bg-background p-3 shadow-sm"
          >
            <div className="mb-2 text-sm font-semibold">
              تخصيص الأعمدة
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {baseColumns.map(
                (column) => (
                  <label
                    key={column.key}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      checked={
                        Boolean(
                          visibleColumns[
                            column.key
                          ]
                        )
                      }
                      onChange={() =>
                        toggleColumn(
                          column.key
                        )
                      }
                    />

                    {
                      column.label
                    }
                  </label>
                )
              )}

              {courses.length >
                0 && (
                <div className="col-span-full mt-2 border-t pt-3">
                  <div className="mb-2 text-xs font-semibold text-muted-foreground">
                    دورات السنة الحالية
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {courses.map(
                      (course) => {
                        const key = `course-${course.id}`

                        return (
                          <label
                            key={
                              course.id
                            }
                            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(
                                visibleColumns[
                                  key
                                ]
                              )}
                              onChange={() =>
                                toggleColumn(
                                  key
                                )
                              }
                            />

                            {
                              course.name
                            }
                          </label>
                        )
                      }
                    )}
                  </div>
                </div>
              )}
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              أعمدة الدورات مخفية افتراضيًا، ويمكن إظهار أي دورة من هنا.
              ملف Excel يحتوي جميع الدورات دائمًا.
            </p>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">
                    #
                  </TableHead>

                  {visibleColumns.name && (
                    <TableHead>
                      اسم الطالب
                      {textFilter(
                        'name',
                        'بحث'
                      )}
                    </TableHead>
                  )}

                  {visibleColumns.personalId && (
                    <TableHead>
                      الرقم الشخصي
                      {textFilter(
                        'personalId',
                        'بحث'
                      )}
                    </TableHead>
                  )}

                  {visibleColumns.grade && (
                    <TableHead>
                      الصف الأكاديمي

                      <select
                        value={
                          filters.grade
                        }
                        onChange={(e) =>
                          updateFilter(
                            'grade',
                            e.target.value
                          )
                        }
                        className="mt-2 h-8 w-full min-w-[120px] rounded border bg-background px-2 text-xs"
                      >
                        <option value="">
                          الكل
                        </option>

                        {academicLevels.map(
                          (level) => (
                            <option
                              key={
                                level.id
                              }
                              value={
                                level.name
                              }
                            >
                              {
                                level.name
                              }
                            </option>
                          )
                        )}
                      </select>
                    </TableHead>
                  )}

                  {visibleColumns.contact && (
                    <TableHead>
                      التواصل
                      {textFilter(
                        'phone',
                        'بحث'
                      )}
                    </TableHead>
                  )}

                  {visibleColumns.paymentStatus && (
                    <TableHead>
                      الدفع

                      <select
                        value={
                          filters.paymentStatus
                        }
                        onChange={(e) =>
                          updateFilter(
                            'paymentStatus',
                            e.target.value
                          )
                        }
                        className="mt-2 h-8 w-full min-w-[120px] rounded border bg-background px-2 text-xs"
                      >
                        <option value="">
                          الكل
                        </option>

                        <option value="مدفوع بالكامل">
                          مدفوع بالكامل
                        </option>

                        <option value="مدفوع جزئيًا">
                          مدفوع جزئيًا
                        </option>

                        <option value="غير مدفوع">
                          غير مدفوع
                        </option>

                        <option value="معفي">
                          معفي
                        </option>
                      </select>
                    </TableHead>
                  )}

                  {visibleColumns.notes && (
                    <TableHead>
                      ملاحظات
                      {textFilter(
                        'notes',
                        'بحث'
                      )}
                    </TableHead>
                  )}

                  {visibleColumns.attendance && (
                    <TableHead>
                      <div>
                        الحضور
                      </div>

                      {currentCourseName && (
                        <div className="mt-1 text-[11px] font-normal text-muted-foreground">
                          {
                            currentCourseName
                          }
                        </div>
                      )}

                      {textFilter(
                        'attendance',
                        'بحث'
                      )}
                    </TableHead>
                  )}

                  {courses.map(
                    (course) => {
                      const key = `course-${course.id}`

                      if (
                        !visibleColumns[
                          key
                        ]
                      ) {
                        return null
                      }

                      return (
                        <TableHead
                          key={
                            course.id
                          }
                        >
                          {
                            course.name
                          }
                        </TableHead>
                      )
                    }
                  )}
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredStudents.map(
                  (
                    student,
                    index
                  ) => (
                    <TableRow
                      key={
                        student.id
                      }
                      onClick={() =>
                        openStudentDetails(
                          student
                        )
                      }
                      className="cursor-pointer"
                    >
                      <TableCell className="text-center text-muted-foreground">
                        {index + 1}
                      </TableCell>

                      {visibleColumns.name && (
                        <TableCell className="font-medium">
                          {
                            student.name
                          }
                        </TableCell>
                      )}

                      {visibleColumns.personalId && (
                        <TableCell>
                          {
                            student.personalId
                          }
                        </TableCell>
                      )}

                      {visibleColumns.grade && (
                        <TableCell>
                          {student.grade ||
                            '—'}
                        </TableCell>
                      )}

                      {visibleColumns.contact && (
                        <TableCell
                          dir="ltr"
                          className="text-right"
                        >
                          <div className="space-y-1">
                            <div>
                              {student.phone ||
                                '—'}
                            </div>

                            <div className="text-muted-foreground">
                              {student.whatsapp
                                ? `واتساب: ${student.whatsapp}`
                                : 'واتساب: —'}
                            </div>
                          </div>
                        </TableCell>
                      )}

                      {visibleColumns.paymentStatus && (
                        <TableCell>
                          <button
                            type="button"
                            className="rounded-md px-2 py-1 transition hover:bg-muted"
                            onClick={(
                              event
                            ) => {
                              event.stopPropagation()

                              router.push(
                                `/payments?student=${encodeURIComponent(
                                  student.id
                                )}&return=/students`
                              )
                            }}
                          >
                            {student.paymentStatus ===
                            'مدفوع بالكامل' ? (
                              <span className="inline-flex flex-col items-center gap-1">
                                <span className="text-xs font-medium">
                                  تفاصيل
                                </span>

                                <StatusBadge status="مدفوع بالكامل" />
                              </span>
                            ) : student.paymentStatus ===
                              'مدفوع جزئيًا' ? (
                              <span className="inline-flex flex-col items-center gap-1">
                                <span className="text-xs font-medium">
                                  متبقي
                                </span>

                                <StatusBadge status="مدفوع جزئيًا" />
                              </span>
                            ) : student.paymentStatus ===
                              'غير مدفوع' ? (
                              <span className="inline-flex flex-col items-center gap-1">
                                <span className="text-xs font-medium">
                                  غير مدفوع
                                </span>

                                <StatusBadge status="غير مدفوع" />
                              </span>
                            ) : (
                              <span className="inline-flex flex-col items-center gap-1">
                                <span className="text-xs font-medium">
                                  معفي
                                </span>

                                <StatusBadge status="معفي" />
                              </span>
                            )}
                          </button>
                        </TableCell>
                      )}

                      {visibleColumns.notes && (
                        <TableCell>
                          <button
                            type="button"
                            className="max-w-[220px] truncate text-right text-sm hover:underline"
                            onClick={(
                              event
                            ) => {
                              event.stopPropagation()

                              openNotesDetails(
                                student
                              )
                            }}
                          >
                            {student.notes ||
                            student.chronicDiseases
                              ? [
                                  student.notes,
                                  student.chronicDiseases,
                                ]
                                  .filter(
                                    Boolean
                                  )
                                  .join(
                                    ' • '
                                  )
                              : '—'}
                          </button>
                        </TableCell>
                      )}

                      {visibleColumns.attendance && (
                        <TableCell>
                          <button
                            type="button"
                            className="rounded-md px-2 py-1 transition hover:bg-muted"
                            onClick={(
                              event
                            ) => {
                              event.stopPropagation()

                              openAttendanceDetails(
                                student
                              )
                            }}
                          >
                            {student.attendance ===
                            'حاضر' ? (
                              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                حاضر
                              </span>
                            ) : student.attendance ===
                              'لم تقم الدورة حتى الآن' ? (
                              <span className="text-amber-600 dark:text-amber-400">
                                لم تقم الدورة حتى الآن
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                غير حاضر
                              </span>
                            )}
                          </button>
                        </TableCell>
                      )}

                      {courses.map(
                        (course) => {
                          const key = `course-${course.id}`

                          if (
                            !visibleColumns[
                              key
                            ]
                          ) {
                            return null
                          }

                          const courseStatus =
                            (
                              student.courseStatuses ??
                              []
                            ).find(
                              (
                                item: StudentCourseStatus
                              ) =>
                                item.courseId ===
                                course.id
                            )

                          return (
                            <TableCell
                              key={
                                course.id
                              }
                            >
                              {courseStatus?.status ===
                              'حاضر' ? (
                                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                  حاضر
                                </span>
                              ) : courseStatus?.status ===
                                'لم تقم الدورة حتى الآن' ? (
                                <span className="text-amber-600 dark:text-amber-400">
                                  لم تقم
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  لم يحضر
                                </span>
                              )}
                            </TableCell>
                          )
                        }
                      )}
                    </TableRow>
                  )
                )}

                {filteredStudents.length ===
                  0 && (
                  <TableRow>
                    <TableCell
                      colSpan={
                        visibleColumnCount
                      }
                      className="h-24 text-center text-muted-foreground"
                    >
                      لا توجد نتائج مطابقة
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <StudentDetails
        student={detailsStudent}
        mode={detailsMode}
        onClose={
          closeDetails
        }
      />

      {isAddStudentOpen && (
        <StudentForm
          editingStudent={
            editingStudent ?? null
          }
          academicLevels={
            academicLevels
          }
          currentAcademicYearId={
            currentAcademicYearId
          }
          currentAcademicYearName={
            currentAcademicYearName
          }
          currentAnnualFee={
            currentAnnualFee
          }
          currentCourse={
            courses.find(
              (course) =>
                course.id ===
                currentCourseId
            ) ?? null
          }
          courses={courses}
          attendanceStatuses={
            attendanceStatuses
          }
          closeStudentDrawer={
            closeStudentDrawer
          }
          setSupabaseStatus={
            setSupabaseStatus
          }
          setStudentList={
            setStudentList
          }
        />
      )}
    </div>
  )
}