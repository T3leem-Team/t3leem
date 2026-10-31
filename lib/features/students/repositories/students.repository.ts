
'use client'

import { supabase } from '@/lib/supabase'

import type { StudentDynamicField } from '@/app/(dashboard)/students/students-table'

export type RepositoryCourse = {
  id: string
  academic_year_id: string
  name: string
  start_date: string | null
  end_date: string | null
  days: string[]
}

export type RepositoryAcademicLevel = {
  id: string
  name: string
  sort_order: number
}

export type RepositoryAttendanceStatus = {
  id: string
  name: string
  isActive: boolean
  sortOrder: number
}

export type RepositoryTeacherStudentAssignment = {
  id: string
  course_id: string
  teacher_id: string
  student_id: string
}

export type RepositoryAttendanceRecord = {
  id: string
  studentId: string
  enrollmentId: string | null
  courseId: string
  attendanceDate: string
  statusId: string
  note: string
}

export type StudentsRepositoryData = {
  currentYear: {
    id: string
    name: string
    annual_fee: number | null
  }
  annualFee: number
  loadedAcademicLevels: RepositoryAcademicLevel[]
  loadedCourses: RepositoryCourse[]
  today: string
  currentCourse: RepositoryCourse | null
  loadedDynamicFields: StudentDynamicField[]
  dynamicValuesMap: Map<string, Record<string, string>>
  enrollmentMap: Map<
    string,
    {
      levelName: string
      className: string
      courseId: string
      courseName: string
    }
  >
  studentsData: any[]
  paymentsData: any[]
  assignments: RepositoryTeacherStudentAssignment[]
  teacherNames: Map<string, string>
  loadedAttendanceStatuses: RepositoryAttendanceStatus[]
  attendanceRows: RepositoryAttendanceRecord[]
}

const ATTENDANCE_PAGE_SIZE = 100

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

function getCurrentCourse(
  courses: RepositoryCourse[],
  today: string
) {
  return (
    courses.find((course) => {
      if (!course.start_date || !course.end_date) {
        return false
      }

      return (
        today >= course.start_date &&
        today <= course.end_date
      )
    }) ?? null
  )
}

export async function loadStudentsRepositoryData(): Promise<StudentsRepositoryData> {
  /*
   * السنة الدراسية الحالية
   */
  const {
    data: currentYear,
    error: yearError,
  } = await supabase
    .from('academic_years')
    .select('id, name, annual_fee')
    .eq('is_current', true)
    .eq('is_active', true)
    .maybeSingle()

  if (yearError) {
    throw new Error(
      `خطأ في تحميل السنة الدراسية: ${yearError.message}`
    )
  }

  if (!currentYear) {
    throw new Error('لا توجد سنة دراسية حالية مفعلة')
  }

  const annualFee = Number(currentYear.annual_fee ?? 0)

  /*
   * الصفوف الأكاديمية
   */
  const {
    data: levels,
    error: levelsError,
  } = await supabase
    .from('levels')
    .select('id, name, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (levelsError) {
    throw new Error(
      `خطأ في تحميل الصفوف الأكاديمية: ${levelsError.message}`
    )
  }

  const loadedAcademicLevels = levels ?? []

  /*
   * الدورات
   */
  const {
    data: coursesData,
    error: coursesError,
  } = await supabase
    .from('courses')
    .select(
      'id, academic_year_id, name, start_date, end_date, days'
    )
    .eq('academic_year_id', currentYear.id)
    .order('start_date', {
      ascending: true,
      nullsFirst: false,
    })

  if (coursesError) {
    throw new Error(
      `خطأ في تحميل الدورات: ${coursesError.message}`
    )
  }

  const loadedCourses: RepositoryCourse[] = (
    coursesData ?? []
  ).map((course) => ({
    id: course.id,
    academic_year_id: course.academic_year_id,
    name: course.name,
    start_date: course.start_date ?? null,
    end_date: course.end_date ?? null,
    days: Array.isArray(course.days) ? course.days : [],
  }))

  const courseNameMap = new Map<string, string>()

  loadedCourses.forEach((course) => {
    courseNameMap.set(course.id, course.name)
  })

  const today = getTodayString()

  const currentCourse = getCurrentCourse(
    loadedCourses,
    today
  )

  /*
   * الحقول الديناميكية
   */
  const {
    data: dynamicFieldsData,
    error: dynamicFieldsError,
  } = await supabase
    .from('dynamic_fields')
    .select(
      'id, name, field_key, field_type, is_required, show_in_registration, is_active, sort_order'
    )
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (dynamicFieldsError) {
    throw new Error(
      `خطأ في تحميل حقول التسجيل: ${dynamicFieldsError.message}`
    )
  }

  const loadedDynamicFields: StudentDynamicField[] = (
    dynamicFieldsData ?? []
  ).map((field) => ({
    id: field.id,
    name: field.name,
    field_key: field.field_key,
    field_type: field.field_type,
    is_required: Boolean(field.is_required),
    show_in_registration: Boolean(
      field.show_in_registration
    ),
    is_active: Boolean(field.is_active),
    sort_order: Number(field.sort_order ?? 0),
  }))

  /*
   * قيم الحقول الديناميكية
   */
  const {
    data: dynamicValuesData,
    error: dynamicValuesError,
  } = await supabase
    .from('student_dynamic_values')
    .select('id, student_id, field_id, value')

  if (dynamicValuesError) {
    throw new Error(
      `خطأ في تحميل بيانات حقول الطلاب: ${dynamicValuesError.message}`
    )
  }

  const dynamicValuesMap = new Map<
    string,
    Record<string, string>
  >()

  ;(dynamicValuesData ?? []).forEach((item) => {
    const current =
      dynamicValuesMap.get(item.student_id) ?? {}

    current[item.field_id] = item.value ?? ''

    dynamicValuesMap.set(item.student_id, current)
  })

  /*
   * ربط الطلاب بالصفوف والدورات
   */
  const {
    data: enrollmentRows,
    error: enrollmentsError,
  } = await supabase
    .from('enrollments')
    .select(
      'student_id, level_id, class_id, academic_year_id, status, course_id'
    )
    .eq('academic_year_id', currentYear.id)

  if (enrollmentsError) {
    throw new Error(
      `خطأ في تحميل ربط الطلاب بالصفوف والدورات: ${enrollmentsError.message}`
    )
  }

  /*
   * الفصول
   */
  const {
    data: classesData,
    error: classesError,
  } = await supabase
    .from('classes')
    .select('id, name, level_id, academic_year_id')
    .eq('academic_year_id', currentYear.id)

  if (classesError) {
    throw new Error(
      `خطأ في تحميل الفصول: ${classesError.message}`
    )
  }

  const levelMap = new Map<string, string>()

  ;(levels ?? []).forEach((level) => {
    levelMap.set(level.id, level.name)
  })

  const classMap = new Map<string, string>()

  ;(classesData ?? []).forEach((item) => {
    classMap.set(item.id, item.name)
  })

  const enrollmentMap = new Map<
    string,
    {
      levelName: string
      className: string
      courseId: string
      courseName: string
    }
  >()

  ;(enrollmentRows ?? []).forEach((enrollment) => {
    const courseId = enrollment.course_id ?? ''

    enrollmentMap.set(enrollment.student_id, {
      levelName:
        levelMap.get(enrollment.level_id) ?? '',

      className: enrollment.class_id
        ? classMap.get(enrollment.class_id) ?? ''
        : '',

      courseId,

      courseName: courseId
        ? courseNameMap.get(courseId) ?? ''
        : '',
    })
  })

  /*
   * الطلاب
   */
  let studentsData: any[] | null = null

  const {
    data: loadedStudents,
    error: studentsError,
  } = await supabase
    .from('students')
    .select(
      'id, student_id, name, personal_id, gender, phone, whatsapp, age, notes, health_notes, guardian_relation, student_phone, status, fee_exempt, created_at, updated_at, source, academic_year_id'
    )
    .order('created_at', { ascending: false })

  studentsData = loadedStudents

  if (studentsError) {
    const {
      data: fallbackStudents,
      error: fallbackError,
    } = await supabase
      .from('students')
      .select(
        'id, student_id, name, personal_id, phone, whatsapp, age, notes, health_notes, guardian_relation, student_phone, status, fee_exempt, created_at, updated_at, source, academic_year_id'
      )
      .order('created_at', { ascending: false })

    if (fallbackError) {
      throw new Error(
        `خطأ في تحميل الطلاب: ${fallbackError.message}`
      )
    }

    studentsData = fallbackStudents
  }

  /*
   * المدفوعات
   */
  const {
    data: paymentsData,
    error: paymentsError,
  } = await supabase
    .from('payments')
    .select('student_id, academic_year_id, amount')
    .eq('academic_year_id', currentYear.id)

  if (paymentsError) {
    throw new Error(
      `خطأ في تحميل الدفعات: ${paymentsError.message}`
    )
  }

  /*
   * توزيع الطلاب على المعلمين
   */
  let assignments: RepositoryTeacherStudentAssignment[] = []

  if (loadedCourses.length > 0) {
    const {
      data: assignmentsData,
      error: assignmentsError,
    } = await supabase
      .from('teacher_student_assignments')
      .select('id, course_id, teacher_id, student_id')
      .in(
        'course_id',
        loadedCourses.map((course) => course.id)
      )

    if (assignmentsError) {
      throw new Error(
        `خطأ في تحميل توزيع الطلاب على المعلمين: ${assignmentsError.message}`
      )
    }

    assignments = (assignmentsData ?? []).map(
      (assignment) => ({
        id: assignment.id,
        course_id: assignment.course_id,
        teacher_id: assignment.teacher_id,
        student_id: assignment.student_id,
      })
    )
  }

  /*
   * أسماء المعلمين
   */
  const teacherNames = new Map<string, string>()

  if (assignments.length > 0) {
    const teacherIds = Array.from(
      new Set(
        assignments.map((item) => item.teacher_id)
      )
    )

    const {
      data: teachersData,
      error: teachersError,
    } = await supabase
      .from('teachers')
      .select('id, name')
      .in('id', teacherIds)

    if (teachersError) {
      throw new Error(
        `خطأ في تحميل أسماء المعلمين: ${teachersError.message}`
      )
    }

    ;(teachersData ?? []).forEach((teacher) => {
      teacherNames.set(teacher.id, teacher.name ?? '')
    })
  }

  /*
   * حالات الحضور
   */
  const {
    data: statusesData,
    error: statusesError,
  } = await supabase
    .from('attendance_statuses')
    .select('id, name, is_active, sort_order')
    .order('sort_order', { ascending: true })

  if (statusesError) {
    throw new Error(
      `خطأ في تحميل حالات الحضور: ${statusesError.message}`
    )
  }

  const loadedAttendanceStatuses: RepositoryAttendanceStatus[] = (
    statusesData ?? []
  ).map((status) => ({
    id: status.id,
    name: status.name,
    isActive: Boolean(status.is_active),
    sortOrder: Number(status.sort_order ?? 0),
  }))

  /*
   * الحضور
   * تحميل السجلات على دفعات من 100 سجل.
   */
  const attendanceRows: RepositoryAttendanceRecord[] = []

  if (loadedCourses.length > 0) {
    const courseIds = loadedCourses.map(
      (course) => course.id
    )

    let from = 0

    while (true) {
      const {
        data: attendanceData,
        error: attendanceError,
      } = await supabase
        .from('attendance')
        .select(
          'id, student_id, enrollment_id, attendance_date, status_id, note, course_id'
        )
        .in('course_id', courseIds)
        .order('id', { ascending: true })
        .range(
          from,
          from + ATTENDANCE_PAGE_SIZE - 1
        )

      if (attendanceError) {
        throw new Error(
          `خطأ في تحميل سجلات الحضور: ${attendanceError.message}`
        )
      }

      const page = attendanceData ?? []

      attendanceRows.push(
        ...page.map((record) => ({
          id: record.id,
          studentId: record.student_id,
          enrollmentId: record.enrollment_id ?? null,
          courseId: record.course_id,
          attendanceDate: record.attendance_date,
          statusId: record.status_id,
          note: record.note ?? '',
        }))
      )

      if (page.length < ATTENDANCE_PAGE_SIZE) {
        break
      }

      from += ATTENDANCE_PAGE_SIZE
    }
  }

  return {
    currentYear,
    annualFee,
    loadedAcademicLevels,
    loadedCourses,
    today,
    currentCourse,
    loadedDynamicFields,
    dynamicValuesMap,
    enrollmentMap,
    studentsData: studentsData ?? [],
    paymentsData: paymentsData ?? [],
    assignments,
    teacherNames,
    loadedAttendanceStatuses,
    attendanceRows,
  }
}
