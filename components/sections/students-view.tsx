'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Search,
  UserPlus,
  Pencil,
  Download,
  X,
} from 'lucide-react'

import * as XLSX from 'xlsx'

import { supabase } from '@/lib/supabase'

import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

import {
  StudentDetails,
  type StudentAttendanceRecord,
  type StudentAttendanceSummary,
  type StudentCourseStatus,
} from './student-details'

import { StudentForm } from './student-form'

import {
  StudentsTable,
  type StudentDynamicField,
  type StudentTableFilters,
  type StudentTableStudent,
  type StudentTableCourse,
} from './students-table'

type Filters = StudentTableFilters

type AcademicLevel = {
  id: string
  name: string
  sort_order: number
}

type Course = StudentTableCourse & {
  academic_year_id: string
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

/*
 * ============================================================
 * كاش صفحة الطلاب
 * ============================================================
 *
 * الكاش يبقى موجوداً أثناء بقاء التطبيق مفتوحاً.
 *
 * عند الرجوع للصفحة:
 * 1. نعرض البيانات من الكاش فوراً.
 * 2. نطلب آخر البيانات من Supabase في الخلفية.
 * 3. إذا تغيرت البيانات يتم تحديث الصفحة.
 *
 * لا يوجد LocalStorage ولا تغيير في قاعدة البيانات.
 */

type StudentsViewCache = {
  academicLevels: AcademicLevel[]
  currentAcademicYearId: string | null
  currentAcademicYearName: string
  currentAnnualFee: number
  courses: Course[]
  currentCourseId: string | null
  currentCourseName: string
  dynamicFields: StudentDynamicField[]
  studentList: StudentTableStudent[]
  attendanceStatuses: AttendanceStatus[]
  supabaseStatus: string
}

let studentsViewCache: StudentsViewCache | null =
  null

let studentsViewLoading = false

function getTodayString() {
  const now = new Date()

  const year = now.getFullYear()

  const month = String(
    now.getMonth() + 1
  ).padStart(2, '0')

  const day = String(
    now.getDate()
  ).padStart(2, '0')

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
  const [year, month, day] =
    date.split('-').map(Number)

  const value = new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
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
  if (!courseDays.length) {
    return false
  }

  const currentDay =
    getDayOfWeek(date)

  return courseDays.some(
    (day) =>
      normalizeArabicDay(day) ===
      currentDay
  )
}

function getDateRange(
  startDate: string,
  endDate: string
) {
  const result: string[] = []

  const [sy, sm, sd] =
    startDate.split('-').map(Number)

  const [ey, em, ed] =
    endDate.split('-').map(Number)

  const current = new Date(
    Date.UTC(
      sy,
      sm - 1,
      sd
    )
  )

  const end = new Date(
    Date.UTC(
      ey,
      em - 1,
      ed
    )
  )

  while (current <= end) {
    const year =
      current.getUTCFullYear()

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
  const hasAssignment =
    assignments.some(
      (assignment) =>
        assignment.student_id ===
          studentId &&
        assignment.course_id ===
          course.id
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
): StudentAttendanceRecord['status'] | '' {
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
      /*
       * لا نحسب الأيام المستقبلية
       */
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

      const record =
        records.find(
          (item) =>
            item.studentId ===
              studentId &&
            item.courseId ===
              course.id &&
            item.attendanceDate ===
              date
        )

      /*
       * لا يوجد سجل حضور لهذا اليوم
       * => لم يسجل، ولا يدخل في النسبة
       */
      if (!record) {
        notRecorded += 1
        return
      }

      const status =
        normalizeAttendanceStatus(
          getStatusName(
            statuses,
            record.statusId
          )
        )

      if (status === 'حاضر') {
        present += 1
      } else if (
        status === 'غائب'
      ) {
        absent += 1
      } else if (
        status === 'متأخر'
      ) {
        late += 1
      } else if (
        status === 'مستأذن'
      ) {
        excused += 1
      } else {
        /*
         * أي حالة غير معروفة تعامل كـ لم يسجل
         */
        notRecorded += 1
      }
    })
  }

  /*
   * النسبة:
   *
   * حاضر      = حضور
   * متأخر     = حضور
   * مستأذن    = حضور
   * غائب      = يدخل في الحساب كغياب
   * لم يسجل   = لا يدخل في الحساب
   */
  const counted =
    present +
    late +
    excused +
    absent

  const attended =
    present +
    late +
    excused

  const percentage =
    counted === 0
      ? 0
      : Math.round(
          (attended /
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
    totalDays:
      studyDates.length,
    present,
    absent,
    late,
    excused,
    notRecorded,
    percentage,
  }
}

export function StudentsView() {
  const [
    supabaseStatus,
    setSupabaseStatus,
  ] = useState(
    studentsViewCache?.supabaseStatus ??
      'جاري الاختبار...'
  )

  const [
    academicLevels,
    setAcademicLevels,
  ] = useState<
    AcademicLevel[]
  >(
    studentsViewCache?.academicLevels ??
      []
  )

  const [
    currentAcademicYearId,
    setCurrentAcademicYearId,
  ] = useState<string | null>(
    studentsViewCache?.currentAcademicYearId ??
      null
  )

  const [
    currentAcademicYearName,
    setCurrentAcademicYearName,
  ] = useState(
    studentsViewCache?.currentAcademicYearName ??
      ''
  )

  const [
    currentAnnualFee,
    setCurrentAnnualFee,
  ] = useState(
    studentsViewCache?.currentAnnualFee ??
      0
  )

  const [courses, setCourses] =
    useState<Course[]>(
      studentsViewCache?.courses ??
        []
    )

  const [
    currentCourseId,
    setCurrentCourseId,
  ] = useState<string | null>(
    studentsViewCache?.currentCourseId ??
      null
  )

  const [
    currentCourseName,
    setCurrentCourseName,
  ] = useState(
    studentsViewCache?.currentCourseName ??
      ''
  )

  const [search, setSearch] =
    useState('')

  const [
    filters,
    setFilters,
  ] = useState<Filters>(
    emptyFilters
  )

  const [
    visibleColumns,
    setVisibleColumns,
  ] = useState<
    Record<string, boolean>
  >({
    name: true,
    personalId: true,
    grade: true,
    contact: true,
    paymentStatus: true,
    notes: true,
    attendance: true,
  })

  const [
    dynamicFields,
    setDynamicFields,
  ] = useState<
    StudentDynamicField[]
  >(
    studentsViewCache?.dynamicFields ??
      []
  )

  const [
    studentList,
    setStudentList,
  ] = useState<
    StudentTableStudent[]
  >(
    studentsViewCache?.studentList ??
      []
  )

  const [
    attendanceStatuses,
    setAttendanceStatuses,
  ] = useState<
    AttendanceStatus[]
  >(
    studentsViewCache?.attendanceStatuses ??
      []
  )

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
  ] = useState<string | null>(
    null
  )

  const [
    detailsStudent,
    setDetailsStudent,
  ] = useState<any | null>(
    null
  )

  const [
    detailsMode,
    setDetailsMode,
  ] = useState<
    'overview' | 'attendance' | 'notes' | null
  >(null)

  useEffect(() => {
    /*
     * إذا كان هناك كاش، فالبيانات ظهرت مباشرة
     * من useState أعلاه.
     *
     * الآن نحدثها في الخلفية بدون إظهار Loading.
     */

    const loadData = async () => {
      /*
       * لا نسمح بتشغيل أكثر من تحديث
       * في نفس الوقت.
       */
      if (studentsViewLoading) {
        return
      }

      studentsViewLoading = true

      const hasCache =
        studentsViewCache !== null

      /*
       * في أول دخول فقط نظهر حالة التحميل.
       *
       * عند الرجوع للصفحة مع وجود الكاش:
       * لا نغير الحالة حتى تبقى البيانات
       * ظاهرة بشكل طبيعي.
       */
      if (!hasCache) {
        setSupabaseStatus(
          'جاري تحميل بيانات النظام...'
        )
      }

      try {
        const {
          data: currentYear,
          error: yearError,
        } =
          await supabase
            .from('academic_years')
            .select(
              'id, name, annual_fee'
            )
            .eq(
              'is_current',
              true
            )
            .eq(
              'is_active',
              true
            )
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

        const annualFee =
          Number(
            currentYear.annual_fee ??
              0
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
        } =
          await supabase
            .from('levels')
            .select(
              'id, name, sort_order'
            )
            .eq(
              'is_active',
              true
            )
            .order(
              'sort_order',
              {
                ascending: true,
              }
            )

        if (levelsError) {
          setSupabaseStatus(
            `خطأ في تحميل الصفوف الأكاديمية: ${levelsError.message}`
          )
          return
        }

        const loadedAcademicLevels =
          levels ?? []

        setAcademicLevels(
          loadedAcademicLevels
        )

        const {
          data: coursesData,
          error: coursesError,
        } =
          await supabase
            .from('courses')
            .select(
              'id, academic_year_id, name, start_date, end_date, days'
            )
            .eq(
              'academic_year_id',
              currentYear.id
            )
            .order(
              'start_date',
              {
                ascending: true,
                nullsFirst: false,
              }
            )

        if (coursesError) {
          setSupabaseStatus(
            `خطأ في تحميل الدورات: ${coursesError.message}`
          )
          return
        }

        const loadedCourses: Course[] =
          (
            coursesData ?? []
          ).map(
            (course) => ({
              id: course.id,
              academic_year_id:
                course.academic_year_id,
              name:
                course.name,
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
          currentCourse?.id ??
            null
        )

        setCurrentCourseName(
          currentCourse?.name ??
            ''
        )

        /*
         * التسجيلات الديناميكية
         */
        const {
          data: dynamicFieldsData,
          error:
            dynamicFieldsError,
        } = await supabase
          .from('dynamic_fields')
          .select(
            'id, name, field_key, field_type, is_required, show_in_registration, is_active, sort_order'
          )
          .eq(
            'is_active',
            true
          )
          .order(
            'sort_order',
            {
              ascending: true,
            }
          )

        if (dynamicFieldsError) {
          setSupabaseStatus(
            `خطأ في تحميل حقول التسجيل: ${dynamicFieldsError.message}`
          )
          return
        }

        const loadedDynamicFields: StudentDynamicField[] =
          (
            dynamicFieldsData ??
            []
          ).map(
            (field) => ({
              id: field.id,
              name:
                field.name,
              field_key:
                field.field_key,
              field_type:
                field.field_type,
              is_required:
                Boolean(
                  field.is_required
                ),
              show_in_registration:
                Boolean(
                  field.show_in_registration
                ),
              is_active:
                Boolean(
                  field.is_active
                ),
              sort_order:
                Number(
                  field.sort_order ??
                    0
                ),
            })
          )

        setDynamicFields(
          loadedDynamicFields
        )

        /*
         * قيم الحقول الديناميكية
         */
        const {
          data: dynamicValuesData,
          error:
            dynamicValuesError,
        } = await supabase
          .from(
            'student_dynamic_values'
          )
          .select(
            'id, student_id, field_id, value'
          )

        if (dynamicValuesError) {
          setSupabaseStatus(
            `خطأ في تحميل بيانات حقول الطلاب: ${dynamicValuesError.message}`
          )
          return
        }

        const dynamicValuesMap =
          new Map<
            string,
            Record<string, string>
          >()

        ;(
          dynamicValuesData ?? []
        ).forEach(
          (item) => {
            const current =
              dynamicValuesMap.get(
                item.student_id
              ) ?? {}

            current[item.field_id] =
              item.value ?? ''

            dynamicValuesMap.set(
              item.student_id,
              current
            )
          }
        )

        /*
         * enrollments
         */
        const {
          data: enrollmentRows,
          error:
            enrollmentsError,
        } =
          await supabase
            .from(
              'enrollments'
            )
            .select(
              'student_id, level_id, class_id, academic_year_id, status'
            )
            .eq(
              'academic_year_id',
              currentYear.id
            )

        if (enrollmentsError) {
          setSupabaseStatus(
            `خطأ في تحميل ربط الطلاب بالصفوف: ${enrollmentsError.message}`
          )
          return
        }

        const {
          data: classesData,
          error: classesError,
        } =
          await supabase
            .from('classes')
            .select(
              'id, name, level_id, academic_year_id'
            )
            .eq(
              'academic_year_id',
              currentYear.id
            )

        if (classesError) {
          setSupabaseStatus(
            `خطأ في تحميل الفصول: ${classesError.message}`
          )
          return
        }

        const levelMap =
          new Map<string, string>()

        ;(
          levels ?? []
        ).forEach((level) => {
          levelMap.set(
            level.id,
            level.name
          )
        })

        const classMap =
          new Map<string, string>()

        ;(
          classesData ?? []
        ).forEach((item) => {
          classMap.set(
            item.id,
            item.name
          )
        })

        const enrollmentMap =
          new Map<
            string,
            {
              levelName: string
              className: string
            }
          >()

        ;(
          enrollmentRows ?? []
        ).forEach(
          (enrollment) => {
            enrollmentMap.set(
              enrollment.student_id,
              {
                levelName:
                  levelMap.get(
                    enrollment.level_id
                  ) ?? '',
                className:
                  enrollment.class_id
                    ? classMap.get(
                        enrollment.class_id
                      ) ?? ''
                    : '',
              }
            )
          }
        )

        /*
         * الطلاب
         */
        let studentsData:
          | any[]
          | null = null

        const {
          data: loadedStudents,
          error: studentsError,
        } =
          await supabase
            .from('students')
            .select(
              'id, student_id, name, personal_id, gender, phone, whatsapp, age, notes, health_notes, status, fee_exempt, created_at, updated_at, source, academic_year_id'
            )
            .order(
              'created_at',
              {
                ascending: false,
              }
            )

        studentsData =
          loadedStudents

        if (studentsError) {
          const {
            data: fallbackStudents,
            error:
              fallbackError,
          } =
            await supabase
              .from('students')
              .select(
                'id, student_id, name, personal_id, phone, whatsapp, notes, health_notes, status, fee_exempt, created_at'
              )
              .order(
                'created_at',
                {
                  ascending: false,
                }
              )

          if (fallbackError) {
            setSupabaseStatus(
              `خطأ في تحميل الطلاب: ${fallbackError.message}`
            )
            return
          }

          studentsData =
            fallbackStudents
        }

        /*
         * المدفوعات
         */
        const {
          data: paymentsData,
          error: paymentsError,
        } =
          await supabase
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

        /*
         * توزيع الطلاب على المعلمين
         */
        let assignments: TeacherStudentAssignment[] =
          []

        if (
          loadedCourses.length >
          0
        ) {
          const {
            data:
              assignmentsData,
            error:
              assignmentsError,
          } =
            await supabase
              .from(
                'teacher_student_assignments'
              )
              .select(
                'id, course_id, teacher_id, student_id'
              )
              .in(
                'course_id',
                loadedCourses.map(
                  (course) =>
                    course.id
                )
              )

          if (
            assignmentsError
          ) {
            setSupabaseStatus(
              `خطأ في تحميل توزيع الطلاب على المعلمين: ${assignmentsError.message}`
            )
            return
          }

          assignments =
            (
              assignmentsData ??
              []
            ).map(
              (assignment) => ({
                id:
                  assignment.id,
                course_id:
                  assignment.course_id,
                teacher_id:
                  assignment.teacher_id,
                student_id:
                  assignment.student_id,
              })
            )
        }

        const teacherNames =
          new Map<string, string>()

        if (
          assignments.length >
          0
        ) {
          const teacherIds =
            Array.from(
              new Set(
                assignments.map(
                  (item) =>
                    item.teacher_id
                )
              )
            )

          const {
            data: teachersData,
          } =
            await supabase
              .from('teachers')
              .select(
                'id, name'
              )
              .in(
                'id',
                teacherIds
              )

          ;(
            teachersData ?? []
          ).forEach(
            (teacher) => {
              teacherNames.set(
                teacher.id,
                teacher.name ?? ''
              )
            }
          )
        }

        /*
         * حالات الحضور
         */
        let loadedAttendanceStatuses: AttendanceStatus[] =
          []

        const {
          data: statusesData,
          error:
            statusesError,
        } =
          await supabase
            .from(
              'attendance_statuses'
            )
            .select(
              'id, name, is_active, sort_order'
            )
            .order(
              'sort_order',
              {
                ascending: true,
              }
            )

        if (
          !statusesError &&
          statusesData
        ) {
          loadedAttendanceStatuses =
            statusesData.map(
              (status) => ({
                id:
                  status.id,
                name:
                  status.name,
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

        /*
         * الحضور
         */
        let attendanceRows: AttendanceRecord[] =
          []

        if (
          loadedCourses.length >
          0
        ) {
          const {
            data: attendanceData,
            error:
              attendanceError,
          } =
            await supabase
              .from(
                'attendance'
              )
              .select(
                'id, student_id, enrollment_id, attendance_date, status_id, note, course_id'
              )
              .in(
                'course_id',
                loadedCourses.map(
                  (course) =>
                    course.id
                )
              )

          if (attendanceError) {
            setSupabaseStatus(
              `تنبيه: تعذر تحميل سجلات الحضور: ${attendanceError.message}`
            )
          } else {
            attendanceRows =
              (
                attendanceData ??
                []
              ).map(
                (record) => ({
                  id:
                    record.id,
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
                    record.note ??
                    '',
                })
              )
          }
        }

        /*
         * المدفوع لكل طالب
         */
        const paidMap =
          new Map<
            string,
            number
          >()

        ;(
          paymentsData ?? []
        ).forEach(
          (payment) => {
            const current =
              paidMap.get(
                payment.student_id
              ) ?? 0

            paidMap.set(
              payment.student_id,
              current +
                Number(
                  payment.amount ??
                    0
                )
            )
          }
        )

        /*
         * بناء بيانات الطلاب النهائية
         */
        const mappedStudents =
          (
            studentsData ?? []
          ).map(
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

              const enrollment =
                enrollmentMap.get(
                  student.id
                )

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

              /*
               * ملخص الحضور لكل دورة
               */
              const attendanceSummaries =
                loadedCourses.map(
                  (course) => {
                    const assignment =
                      assignments.find(
                        (item) =>
                          item.student_id ===
                            student.id &&
                          item.course_id ===
                            course.id
                      )

                    const teacherName =
                      assignment
                        ? teacherNames.get(
                            assignment.teacher_id
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

              /*
               * سجلات الحضور الفعلية للطالب
               */
              const attendanceRecords: StudentAttendanceRecord[] =
                attendanceRows
                  .filter(
                    (record) =>
                      record.studentId ===
                      student.id
                  )
                  .map(
                    (record) => {
                      const status =
                        normalizeAttendanceStatus(
                          getStatusName(
                            loadedAttendanceStatuses,
                            record.statusId
                          )
                        )

                      if (!status) {
                        return null
                      }

                      return {
                        id:
                          record.id,
                        studentId:
                          record.studentId,
                        courseId:
                          record.courseId,
                        attendanceDate:
                          record.attendanceDate,
                        status,
                        note:
                          record.note,
                      }
                    }
                  )
                  .filter(
                    (
                      record
                    ): record is StudentAttendanceRecord =>
                      Boolean(
                        record
                      )
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
                id:
                  student.id,

                studentId:
                  student.student_id ??
                  '',

                name:
                  student.name ??
                  '',

                personalId:
                  student.personal_id ??
                  '',

                gender:
                  student.gender ??
                  '',

                age:
                  student.age ??
                  null,

                grade:
                  enrollment?.levelName ??
                  '',

                className:
                  enrollment?.className ??
                  '',

                phone:
                  student.phone ??
                  '',

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
                  student.notes ??
                  '',

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

                academicYearName:
                  currentYear.name ??
                  '',

                attendance:
                  currentStatus,

                courseStatuses,

                attendanceSummaries,

                attendanceRecords,

                dynamicValues:
                  dynamicValuesMap.get(
                    student.id
                  ) ?? {},
              }
            }
          )

        const finalStatus =
          currentCourse
            ? `متصل بـ Supabase ✅ | السنة الحالية: ${currentYear.name} | الدورة الحالية: ${currentCourse.name} | الرسوم السنوية: ${annualFee.toFixed(3)} د.ب`
            : `متصل بـ Supabase ✅ | السنة الحالية: ${currentYear.name} | لا توجد دورة حالية الآن | الرسوم السنوية: ${annualFee.toFixed(3)} د.ب`

        /*
         * تحديث الواجهة
         */
        setStudentList(
          mappedStudents as StudentTableStudent[]
        )

        setSupabaseStatus(
          finalStatus
        )

        /*
         * حفظ آخر نسخة في الكاش.
         *
         * نستخدم البيانات المحلية التي تم
         * بناؤها للتو، وليس state، لأن setState
         * لا يحدث بشكل فوري.
         */
        studentsViewCache = {
          academicLevels:
            loadedAcademicLevels,

          currentAcademicYearId:
            currentYear.id,

          currentAcademicYearName:
            currentYear.name ?? '',

          currentAnnualFee:
            annualFee,

          courses:
            loadedCourses,

          currentCourseId:
            currentCourse?.id ??
            null,

          currentCourseName:
            currentCourse?.name ??
            '',

          dynamicFields:
            loadedDynamicFields,

          studentList:
            mappedStudents as StudentTableStudent[],

          attendanceStatuses:
            loadedAttendanceStatuses,

          supabaseStatus:
            finalStatus,
        }
      } catch (error) {
        console.error(
          'StudentsView load error:',
          error
        )

        /*
         * إذا كان هناك كاش، لا نمسح البيانات
         * الموجودة بسبب خطأ مؤقت في التحديث.
         */
        if (!studentsViewCache) {
          setSupabaseStatus(
            'حدث خطأ أثناء تحميل بيانات الطلاب'
          )
        }
      } finally {
        studentsViewLoading = false
      }
    }

    loadData()
  }, [])

  /*
   * ============================================================
   * الحذف الجماعي
   * ============================================================
   *
   * هذه الدالة تستقبل IDs الطلاب المحددين من StudentsTable
   * وتحذفهم من جدول students في Supabase.
   */
  const deleteSelectedStudents = async (
    studentIds: string[]
  ) => {
    const ids = Array.from(
      new Set(
        studentIds.filter(Boolean)
      )
    )

    if (ids.length === 0) {
      return
    }

    const {
      error,
    } = await supabase
      .from('students')
      .delete()
      .in('id', ids)

    if (error) {
      throw new Error(
        `خطأ في حذف الطلاب: ${error.message}`
      )
    }

    setStudentList(
      (current) => {
        const next =
          current.filter(
            (student) =>
              !ids.includes(student.id)
          )

        /*
         * تحديث الكاش أيضاً.
         */
        if (studentsViewCache) {
          studentsViewCache = {
            ...studentsViewCache,
            studentList: next,
          }
        }

        return next
      }
    )

    /*
     * إذا كان الطالب المحدد حالياً
     * ضمن الطلاب المحذوفين، نلغي التحديد.
     */
    if (
      selectedStudentId &&
      ids.includes(selectedStudentId)
    ) {
      setSelectedStudentId('')
    }

    setSupabaseStatus(
      `تم حذف ${ids.length} طالب من Supabase ✅`
    )
  }

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
                    student.amountDue
                  ) -
                    Number(
                      student.amountPaid
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

          const dynamicText =
            Object.values(
              student.dynamicValues ??
                {}
            ).join(' ')

          const courseStatusText =
            student.courseStatuses
              .map(
                (course) =>
                  `${course.courseName} ${course.status}`
              )
              .join(' ')

          const matchesSearch =
            !query ||
            [
              student.name,
              student.studentId,
              student.personalId,
              student.gender,
              student.age,
              student.grade,
              student.className,
              contactText,
              student.status,
              student.source,
              student.paymentStatus,
              notesText,
              student.attendance,
              dynamicText,
              courseStatusText,
              remaining,
            ].some(
              (value) =>
                String(
                  value ?? ''
                )
                  .toLowerCase()
                  .includes(query)
            )

          const matches = {
            name:
              !filters.name ||
              student.name
                .toLowerCase()
                .includes(
                  filters.name.toLowerCase()
                ),

            personalId:
              !filters.personalId ||
              student.personalId.includes(
                filters.personalId
              ),

            grade:
              !filters.grade ||
              student.grade ===
                filters.grade,

            phone:
              !filters.phone ||
              student.phone.includes(
                filters.phone
              ),

            whatsapp:
              !filters.whatsapp ||
              student.whatsapp.includes(
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
    if (!selectedStudentId) {
      return
    }

    setEditingStudentId(
      selectedStudentId
    )

    setIsAddStudentOpen(true)
  }

  const closeStudentDrawer = () => {
    setIsAddStudentOpen(false)
    setEditingStudentId(null)
  }

  const openNotesDetails = (
    student: StudentTableStudent
  ) => {
    setDetailsStudent(student)
    setDetailsMode('notes')
  }

  const openAttendanceDetails = (
    student: StudentTableStudent
  ) => {
    setDetailsStudent(student)
    setDetailsMode(
      'attendance'
    )
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
                      student.amountDue
                    ) -
                      Number(
                        student.amountPaid
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
                student.studentId,

              'اسم الطالب':
                student.name,

              'الرقم الشخصي':
                student.personalId,

              'الجنس':
                student.gender,

              'العمر':
                student.age ?? '',

              'الصف الأكاديمي':
                student.grade,

              'الفصل':
                student.className,

              'رقم الهاتف':
                student.phone,

              'رقم واتساب':
                student.whatsapp,

              'الحالة':
                student.status,

              'مصدر التسجيل':
                student.source,

              'حالة الدفع':
                student.paymentStatus,

              'الرسوم السنوية':
                student.amountDue,

              'المدفوع':
                student.amountPaid,

              'المتبقي':
                remaining,

              'الإعفاء':
                student.feeExempt
                  ? 'نعم'
                  : 'لا',

              'الملاحظات':
                student.notes,

              'المعلومات الصحية':
                student.chronicDiseases,

              'الحضور الحالي':
                student.attendance,

              'تاريخ الإضافة':
                student.createdAt,

              'آخر تحديث':
                student.updatedAt,

              'السنة الدراسية':
                student.academicYearName,
            }

            /*
             * كل حقول التسجيل الديناميكية
             */
            dynamicFields.forEach(
              (field) => {
                row[field.name] =
                  student
                    .dynamicValues?.[
                    field.id
                  ] ?? ''
              }
            )

            /*
             * تفاصيل الدورات
             */
            student.courseStatuses.forEach(
              (course) => {
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

      worksheet['!cols'] =
        Object.keys(
          exportData[0] ?? {}
        ).map(
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
        `تم تنزيل ${filteredStudents.length} طالب كملف Excel مع جميع بيانات الطلاب وحقول التسجيل ✅`
      )
    }

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
              onChange={(event) =>
                setSearch(
                  event.target.value
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
                  ) {
                    return
                  }

                  const selected =
                    studentList.find(
                      (student) =>
                        student.id ===
                        selectedStudentId
                    )

                  if (!selected) {
                    return
                  }

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
                    (current) => {
                      const next =
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

                      /*
                       * تحديث الكاش أيضاً حتى إذا
                       * خرج المستخدم من الصفحة ورجع
                       * قبل التحديث الخلفي.
                       */
                      if (
                        studentsViewCache
                      ) {
                        studentsViewCache = {
                          ...studentsViewCache,
                          studentList:
                            next,
                        }
                      }

                      return next
                    }
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

                  if (!confirmed) {
                    return
                  }

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
                    (current) => {
                      const next =
                        current.filter(
                          (
                            student
                          ) =>
                            student.id !==
                            selectedStudentId
                        )

                      /*
                       * تحديث الكاش أيضاً.
                       */
                      if (
                        studentsViewCache
                      ) {
                        studentsViewCache = {
                          ...studentsViewCache,
                          studentList:
                            next,
                        }
                      }

                      return next
                    }
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
            </div>
          </div>

          <StudentsTable
            students={
              filteredStudents
            }
            courses={
              courses
            }
            dynamicFields={
              dynamicFields
            }
            academicLevels={
              academicLevels
            }
            filters={
              filters
            }
            visibleColumns={
              visibleColumns
            }
            selectedStudentId={
              selectedStudentId
            }
            currentCourseName={
              currentCourseName
            }
            onSelectStudent={(
              id
            ) => {
              setSelectedStudentId(
                (current) =>
                  current === id
                    ? ''
                    : id
              )
            }}
            onUpdateFilter={
              updateFilter
            }
            onToggleColumn={
              toggleColumn
            }
            onOpenNotes={
              openNotesDetails
            }
            onOpenAttendance={
              openAttendanceDetails
            }
            onOpenColumns={() => {}}
            onDeleteSelected={
              deleteSelectedStudents
            }
          />
        </CardContent>
      </Card>

      <StudentDetails
        student={
          detailsStudent
        }
        mode={
          detailsMode
        }
        onClose={
          closeDetails
        }
      />

      {isAddStudentOpen && (
        <StudentForm
          editingStudent={
            editingStudent ??
            null
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
          courses={
            courses
          }
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
            setStudentList as any
          }
        />
      )}
    </div>
  )
}