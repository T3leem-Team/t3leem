
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

export type RepositoryStudentFilters = {
  name?: string
  personalId?: string
  grade?: string[]
  phone?: string
  whatsapp?: string
  paymentStatus?: string
  notes?: string
  attendance?: string
  guardianRelation?: string
  studentPhone?: string
  enrollmentCourse?: string
}

export type StudentsRepositoryOptions = {
  offset?: number
  limit?: number
  search?: string
  filters?: RepositoryStudentFilters
  includeAttendance?: boolean
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
  totalStudents: number
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

export async function loadStudentsRepositoryData(
  options: StudentsRepositoryOptions = {},
): Promise<StudentsRepositoryData> {
  const offset = Math.max(0, options.offset ?? 0)
  const limit = Math.min(5000, Math.max(1, options.limit ?? 50))
  const search = (options.search ?? '').trim()
  const filters = options.filters ?? {}
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

  const currentYearId = currentYear.id
  const escapeFilter = (value: string) =>
    value.replace(/[,%()]/g, ' ').replace(/\s+/g, ' ').trim()

  async function fetchAllRows<T>(
    makeQuery: (from: number, to: number) => any,
  ): Promise<T[]> {
    const rows: T[] = []
    let from = 0

    while (true) {
      const { data, error } = await makeQuery(
        from,
        from + ATTENDANCE_PAGE_SIZE - 1,
      )

      if (error) {
        throw new Error(
          typeof error.message === 'string'
            ? error.message
            : 'تعذر تحميل بيانات الطلاب المرتبطة.',
        )
      }
      const page = (data ?? []) as T[]
      rows.push(...page)
      if (page.length < ATTENDANCE_PAGE_SIZE) break
      from += ATTENDANCE_PAGE_SIZE
    }

    return rows
  }

  // تجهيز قوائم المعرّفات للفلاتر المرتبطة بجداول أخرى.
  let matchingIds: Set<string> | null = null
  const intersectIds = (ids: Iterable<string>) => {
    const next = new Set(ids)
    if (matchingIds === null) matchingIds = next
    else matchingIds = new Set(
      Array.from(matchingIds).filter((id) => next.has(id)),
    )
  }

  const hasGradeFilter = (filters.grade?.length ?? 0) > 0
  if (hasGradeFilter) {
    const selectedLevels = loadedAcademicLevels
      .filter((level) => filters.grade?.includes(level.name))
      .map((level) => level.id)

    const rows = selectedLevels.length
      ? await fetchAllRows<{ student_id: string }>((from, to) =>
          supabase
            .from('enrollments')
            .select('student_id')
            .eq('academic_year_id', currentYearId)
            .in('level_id', selectedLevels)
            .order('id', { ascending: true }).range(from, to),
        )
      : []
    intersectIds(rows.map((row) => row.student_id))
  }

  if (filters.enrollmentCourse) {
    const selectedCourseIds = loadedCourses
      .filter((course) => course.name === filters.enrollmentCourse)
      .map((course) => course.id)

    const rows = selectedCourseIds.length
      ? await fetchAllRows<{ student_id: string }>((from, to) =>
          supabase
            .from('enrollments')
            .select('student_id')
            .eq('academic_year_id', currentYearId)
            .in('course_id', selectedCourseIds)
            .order('id', { ascending: true }).range(from, to),
        )
      : []
    intersectIds(rows.map((row) => row.student_id))
  }

  if (filters.paymentStatus) {
    const allStudents = await fetchAllRows<{
      id: string
      fee_exempt: boolean | null
    }>((from, to) =>
      supabase.from('students').select('id, fee_exempt').order('id', { ascending: true }).range(from, to),
    )

    const allPayments = await fetchAllRows<{
      student_id: string
      amount: number | string | null
    }>((from, to) =>
      supabase
        .from('payments')
        .select('student_id, amount')
        .eq('academic_year_id', currentYearId)
        .order('id', { ascending: true }).range(from, to),
    )

    const paidByStudent = new Map<string, number>()
    allPayments.forEach((payment) => {
      paidByStudent.set(
        payment.student_id,
        (paidByStudent.get(payment.student_id) ?? 0) +
          Number(payment.amount ?? 0),
      )
    })

    const ids = allStudents
      .filter((student) => {
        const paid = paidByStudent.get(student.id) ?? 0
        const status = student.fee_exempt
          ? 'معفي'
          : paid >= annualFee && annualFee > 0
            ? 'مدفوع بالكامل'
            : paid > 0
              ? 'مدفوع جزئيًا'
              : 'غير مدفوع'
        return status === filters.paymentStatus
      })
      .map((student) => student.id)
    intersectIds(ids)
  }

  if (filters.attendance) {
    let ids: string[] = []
    if (currentCourse?.start_date && today < currentCourse.start_date) {
      if (filters.attendance === 'لم تقم الدورة حتى الآن') {
        ids = await fetchAllRows<{ id: string }>((from, to) =>
          supabase.from('students').select('id').order('id', { ascending: true }).range(from, to),
        ).then((rows) => rows.map((row) => row.id))
      }
    } else if (currentCourse) {
      const assigned = await fetchAllRows<{ student_id: string }>((from, to) =>
        supabase
          .from('teacher_student_assignments')
          .select('student_id')
          .eq('course_id', currentCourse.id)
          .order('id', { ascending: true }).range(from, to),
      )
      const assignedIds = new Set(assigned.map((row) => row.student_id))
      if (filters.attendance === 'حاضر') {
        ids = Array.from(assignedIds)
      } else if (filters.attendance === 'لم يحضر') {
        const all = await fetchAllRows<{ id: string }>((from, to) =>
          supabase.from('students').select('id').order('id', { ascending: true }).range(from, to),
        )
        ids = all.map((row) => row.id).filter((id) => !assignedIds.has(id))
      }
    } else if (filters.attendance === 'لم يحضر') {
      ids = await fetchAllRows<{ id: string }>((from, to) =>
        supabase.from('students').select('id').order('id', { ascending: true }).range(from, to),
      ).then((rows) => rows.map((row) => row.id))
    }
    intersectIds(ids)
  }

  // البحث العام يشمل حقول الطالب وقيم التسجيل الديناميكية.
  const searchMatchesCourseName = Boolean(search) && loadedCourses.some((course) =>
    course.name.toLowerCase().includes(search.toLowerCase()),
  )

  if (search && !searchMatchesCourseName) {
    const term = escapeFilter(search)
    const pattern = `%${term}%`
    const searchParts = [
      `name.ilike.${pattern}`,
      `student_id.ilike.${pattern}`,
      `personal_id.ilike.${pattern}`,
      `phone.ilike.${pattern}`,
      `whatsapp.ilike.${pattern}`,
      `guardian_relation.ilike.${pattern}`,
      `student_phone.ilike.${pattern}`,
      `status.ilike.${pattern}`,
      `source.ilike.${pattern}`,
      `notes.ilike.${pattern}`,
      `health_notes.ilike.${pattern}`,
    ]
    let directRows: { id: string }[] = []
    try {
      directRows = await fetchAllRows<{ id: string }>((from, to) =>
        supabase
          .from('students')
          .select('id')
          .or([...searchParts, `gender.ilike.${pattern}`].join(','))
          .order('id', { ascending: true }).range(from, to),
      )
    } catch {
      // بعض قواعد البيانات القديمة لا تحتوي على عمود gender.
      directRows = await fetchAllRows<{ id: string }>((from, to) =>
        supabase
          .from('students')
          .select('id')
          .or(searchParts.join(','))
          .order('id', { ascending: true }).range(from, to),
      )
    }
    const dynamicRows = await fetchAllRows<{ student_id: string }>((from, to) =>
      supabase
        .from('student_dynamic_values')
        .select('student_id')
        .ilike('value', pattern)
        .order('id', { ascending: true }).range(from, to),
    )
    const ids = new Set([
      ...directRows.map((row) => row.id),
      ...dynamicRows.map((row) => row.student_id),
    ])

    // البحث في اسم الصف الأكاديمي.
    const levelMatches = loadedAcademicLevels
      .filter((level) => level.name.toLowerCase().includes(search.toLowerCase()))
      .map((level) => level.id)

    if (levelMatches.length > 0) {
      const levelEnrollmentRows = await fetchAllRows<{ student_id: string }>((from, to) =>
        supabase
          .from('enrollments')
          .select('student_id')
          .eq('academic_year_id', currentYearId)
          .in('level_id', levelMatches)
          .order('id', { ascending: true }).range(from, to),
      )
      levelEnrollmentRows.forEach((row) => ids.add(row.student_id))
    }

    // البحث في اسم الفصل دون تحميل جميع سجلات التسجيل.
    const matchingClassRows = await fetchAllRows<{ id: string }>((from, to) =>
      supabase
        .from('classes')
        .select('id')
        .eq('academic_year_id', currentYearId)
        .ilike('name', pattern)
        .order('id', { ascending: true }).range(from, to),
    )
    const matchingClassIds = matchingClassRows.map((row) => row.id)

    if (matchingClassIds.length > 0) {
      const classEnrollmentRows = await fetchAllRows<{ student_id: string }>((from, to) =>
        supabase
          .from('enrollments')
          .select('student_id')
          .eq('academic_year_id', currentYearId)
          .in('class_id', matchingClassIds)
          .order('id', { ascending: true }).range(from, to),
      )
      classEnrollmentRows.forEach((row) => ids.add(row.student_id))
    }

    // البحث في حالة الدفع والمبلغ المتبقي المحسوب.
    const paymentLabels = ['معفي', 'مدفوع بالكامل', 'مدفوع جزئيًا', 'غير مدفوع']
    const searchMatchesPayment = paymentLabels.some((label) =>
      label.includes(search),
    )
    const numericSearch = /^\d+(?:\.\d+)?$/.test(search)
    if (searchMatchesPayment || numericSearch) {
      const allStudentsForPayment = await fetchAllRows<{
        id: string
        fee_exempt: boolean | null
        age: number | null
      }>((from, to) =>
        supabase.from('students').select('id, fee_exempt, age').order('id', { ascending: true }).range(from, to),
      )
      const allPaymentsForSearch = await fetchAllRows<{
        student_id: string
        amount: number | string | null
      }>((from, to) =>
        supabase
          .from('payments')
          .select('student_id, amount')
          .eq('academic_year_id', currentYearId)
          .order('id', { ascending: true }).range(from, to),
      )
      const paidForSearch = new Map<string, number>()
      allPaymentsForSearch.forEach((payment) => {
        paidForSearch.set(
          payment.student_id,
          (paidForSearch.get(payment.student_id) ?? 0) + Number(payment.amount ?? 0),
        )
      })
      allStudentsForPayment.forEach((student) => {
        const paid = paidForSearch.get(student.id) ?? 0
        const remaining = student.fee_exempt
          ? 0
          : Math.max(annualFee - paid, 0)
        const paymentStatus = student.fee_exempt
          ? 'معفي'
          : paid >= annualFee && annualFee > 0
            ? 'مدفوع بالكامل'
            : paid > 0
              ? 'مدفوع جزئيًا'
              : 'غير مدفوع'
        if (
          paymentStatus.includes(search) ||
          String(remaining).includes(search) ||
          String(student.age ?? '').includes(search)
        ) {
          ids.add(student.id)
        }
      })
    }

    // البحث في حالات الالتحاق بالدورات (حاضر / لم يحضر / لم تبدأ).
    const courseStatusLabels = ['حاضر', 'لم يحضر', 'لم تقم الدورة حتى الآن']
    if (courseStatusLabels.some((label) => label.includes(search))) {
      const allStudentIds = await fetchAllRows<{ id: string }>((from, to) =>
        supabase.from('students').select('id').order('id', { ascending: true }).range(from, to),
      )
      if (!currentCourse && 'لم يحضر'.includes(search)) {
        allStudentIds.forEach(({ id }) => ids.add(id))
      }
      const allAssignments = loadedCourses.length
        ? await fetchAllRows<{ student_id: string; course_id: string }>((from, to) =>
            supabase
              .from('teacher_student_assignments')
              .select('student_id, course_id')
              .in('course_id', loadedCourses.map((course) => course.id))
              .order('id', { ascending: true }).range(from, to),
          )
        : []
      const assignedKeys = new Set(
        allAssignments.map((item) => JSON.stringify([item.student_id, item.course_id])),
      )
      allStudentIds.forEach(({ id }) => {
        const hasMatchingCourseStatus = loadedCourses.some((course) => {
          const status = course.start_date && today < course.start_date
            ? 'لم تقم الدورة حتى الآن'
            : assignedKeys.has(JSON.stringify([id, course.id]))
              ? 'حاضر'
              : 'لم يحضر'
          return `${course.name} ${status}`.includes(search)
        })
        if (hasMatchingCourseStatus) ids.add(id)
      })
    }

    intersectIds(ids)
  }

  let studentsData: any[] = []
  let resolvedTotalStudents = 0

  let studentsQuery = supabase
    .from('students')
    .select(
      'id, student_id, name, personal_id, gender, phone, whatsapp, age, notes, health_notes, guardian_relation, student_phone, status, fee_exempt, created_at, updated_at, source, academic_year_id',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })

  if (filters.name) studentsQuery = studentsQuery.ilike('name', `%${escapeFilter(filters.name)}%`)
  if (filters.personalId) studentsQuery = studentsQuery.ilike('personal_id', `%${escapeFilter(filters.personalId)}%`)
  if (filters.phone) studentsQuery = studentsQuery.ilike('phone', `%${escapeFilter(filters.phone)}%`)
  if (filters.whatsapp) studentsQuery = studentsQuery.ilike('whatsapp', `%${escapeFilter(filters.whatsapp)}%`)
  if (filters.notes) {
    const noteTerm = `%${escapeFilter(filters.notes)}%`
    studentsQuery = studentsQuery.or(`notes.ilike.${noteTerm},health_notes.ilike.${noteTerm}`)
  }
  if (filters.guardianRelation) studentsQuery = studentsQuery.ilike('guardian_relation', `%${escapeFilter(filters.guardianRelation)}%`)
  if (filters.studentPhone) studentsQuery = studentsQuery.ilike('student_phone', `%${escapeFilter(filters.studentPhone)}%`)
  if (matchingIds !== null) {
    const ids = Array.from(matchingIds)
    if (ids.length === 0) {
      studentsQuery = studentsQuery.eq('id', '__no_matching_student__')
    } else {
      studentsQuery = studentsQuery.in('id', ids)
    }
  }

  const {
    data: loadedStudents,
    error: studentsError,
    count: totalStudents,
  } = await studentsQuery.range(offset, offset + limit - 1)

  if (studentsError) {
    // التوافق مع قواعد البيانات التي لا تحتوي على عمود gender.
    let fallbackQuery = supabase
      .from('students')
      .select(
        'id, student_id, name, personal_id, phone, whatsapp, age, notes, health_notes, guardian_relation, student_phone, status, fee_exempt, created_at, updated_at, source, academic_year_id',
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
    if (filters.name) fallbackQuery = fallbackQuery.ilike('name', `%${escapeFilter(filters.name)}%`)
    if (filters.personalId) fallbackQuery = fallbackQuery.ilike('personal_id', `%${escapeFilter(filters.personalId)}%`)
    if (filters.phone) fallbackQuery = fallbackQuery.ilike('phone', `%${escapeFilter(filters.phone)}%`)
    if (filters.whatsapp) fallbackQuery = fallbackQuery.ilike('whatsapp', `%${escapeFilter(filters.whatsapp)}%`)
    if (filters.notes) fallbackQuery = fallbackQuery.or(`notes.ilike.%${escapeFilter(filters.notes)}%,health_notes.ilike.%${escapeFilter(filters.notes)}%`)
    if (filters.guardianRelation) fallbackQuery = fallbackQuery.ilike('guardian_relation', `%${escapeFilter(filters.guardianRelation)}%`)
    if (filters.studentPhone) fallbackQuery = fallbackQuery.ilike('student_phone', `%${escapeFilter(filters.studentPhone)}%`)
    if (matchingIds !== null) {
      const ids = Array.from(matchingIds)
      fallbackQuery = ids.length ? fallbackQuery.in('id', ids) : fallbackQuery.eq('id', '__no_matching_student__')
    }
    const fallback = await fallbackQuery.range(offset, offset + limit - 1)
    if (fallback.error) throw new Error(`خطأ في تحميل الطلاب: ${fallback.error.message}`)
    studentsData = fallback.data ?? []
    ;(studentsData as any[]).forEach((student) => { student.gender = null })
    resolvedTotalStudents = fallback.count ?? 0
  } else {
    studentsData = loadedStudents ?? []
    resolvedTotalStudents = totalStudents ?? 0
  }

  const studentIds = studentsData.map((student: any) => student.id)
  const studentIdFilter = studentIds.length ? studentIds : ['__no_matching_student__']

  /* قيم الحقول الديناميكية الخاصة بالدفعة الحالية */
  const dynamicValuesData = await fetchAllRows<{
    student_id: string
    field_id: string
    value: string | null
  }>((from, to) =>
    supabase
      .from('student_dynamic_values')
      .select('student_id, field_id, value')
      .in('student_id', studentIdFilter)
      .order('id', { ascending: true }).range(from, to),
  )
  const dynamicValuesMap = new Map<string, Record<string, string>>()
  dynamicValuesData.forEach((item) => {
    const current = dynamicValuesMap.get(item.student_id) ?? {}
    current[item.field_id] = item.value ?? ''
    dynamicValuesMap.set(item.student_id, current)
  })

  /* ربط الطلاب بالصفوف والدورات */
  const enrollmentRows = await fetchAllRows<{
    student_id: string
    level_id: string | null
    class_id: string | null
    course_id: string | null
  }>((from, to) =>
    supabase
      .from('enrollments')
      .select('student_id, level_id, class_id, course_id')
      .eq('academic_year_id', currentYearId)
      .in('student_id', studentIdFilter)
      .order('id', { ascending: true }).range(from, to),
  )

  const { data: classesData, error: classesError } = await supabase
    .from('classes')
    .select('id, name, level_id, academic_year_id')
    .eq('academic_year_id', currentYearId)
  if (classesError) throw new Error(`خطأ في تحميل الفصول: ${classesError.message}`)

  const levelMap = new Map<string, string>(
    loadedAcademicLevels.map((level) => [level.id, level.name] as const),
  )
  const classMap = new Map<string, string>(
    (classesData ?? []).map((item) => [item.id, item.name] as const),
  )
  const enrollmentMap = new Map<string, { levelName: string; className: string; courseId: string; courseName: string }>()
  enrollmentRows.forEach((enrollment) => {
    const courseId = enrollment.course_id ?? ''
    enrollmentMap.set(enrollment.student_id, {
      levelName: enrollment.level_id ? levelMap.get(enrollment.level_id) ?? '' : '',
      className: enrollment.class_id ? classMap.get(enrollment.class_id) ?? '' : '',
      courseId,
      courseName: courseId ? courseNameMap.get(courseId) ?? '' : '',
    })
  })

  /* المدفوعات الخاصة بالطلاب المحمّلين */
  const paymentsData = await fetchAllRows<{
    student_id: string
    academic_year_id: string
    amount: number | string | null
  }>((from, to) =>
    supabase
      .from('payments')
      .select('student_id, academic_year_id, amount')
      .eq('academic_year_id', currentYearId)
      .in('student_id', studentIdFilter)
      .order('id', { ascending: true }).range(from, to),
  )

  /* توزيع الطلاب على المعلمين */
  let assignments: RepositoryTeacherStudentAssignment[] = []
  if (loadedCourses.length > 0 && studentIds.length > 0) {
    const assignmentsData = await fetchAllRows<RepositoryTeacherStudentAssignment>((from, to) =>
      supabase
        .from('teacher_student_assignments')
        .select('id, course_id, teacher_id, student_id')
        .in('course_id', loadedCourses.map((course) => course.id))
        .in('student_id', studentIds)
        .order('id', { ascending: true }).range(from, to),
    )
    assignments = assignmentsData
  }

  const teacherNames = new Map<string, string>()
  if (assignments.length > 0) {
    const teacherIds = Array.from(new Set(assignments.map((item) => item.teacher_id)))
    const { data: teachersData, error: teachersError } = await supabase
      .from('teachers')
      .select('id, name')
      .in('id', teacherIds)
    if (teachersError) throw new Error(`خطأ في تحميل أسماء المعلمين: ${teachersError.message}`)
    ;(teachersData ?? []).forEach((teacher) => teacherNames.set(teacher.id, teacher.name ?? ''))
  }

    /*
   * حالات الحضور وسجلاته
   * يمكن تعطيل تحميلها عند تحميل قائمة الطلاب.
   */
  let loadedAttendanceStatuses: RepositoryAttendanceStatus[] = []
  let attendanceRows: RepositoryAttendanceRecord[] = []

  if (options.includeAttendance !== false) {
    const { data: statusesData, error: statusesError } = await supabase
      .from('attendance_statuses')
      .select('id, name, is_active, sort_order')
      .order('sort_order', { ascending: true })

    if (statusesError) {
      throw new Error(
        `خطأ في تحميل حالات الحضور: ${statusesError.message}`
      )
    }

    loadedAttendanceStatuses = (statusesData ?? []).map((status) => ({
      id: status.id,
      name: status.name,
      isActive: Boolean(status.is_active),
      sortOrder: Number(status.sort_order ?? 0),
    }))

    /* سجلات الحضور الخاصة بالطلاب المحمّلين فقط */
    if (loadedCourses.length > 0 && studentIds.length > 0) {
      let from = 0

      while (true) {
        const { data: attendanceData, error: attendanceError } =
          await supabase
            .from('attendance')
            .select(
              'id, student_id, enrollment_id, attendance_date, status_id, note, course_id'
            )
            .in('course_id', loadedCourses.map((course) => course.id))
            .in('student_id', studentIds)
            .order('id', { ascending: true })
            .range(from, from + ATTENDANCE_PAGE_SIZE - 1)

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

        if (page.length < ATTENDANCE_PAGE_SIZE) break

        from += ATTENDANCE_PAGE_SIZE
      }
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
    totalStudents: resolvedTotalStudents,
    paymentsData: paymentsData ?? [],
    assignments,
    teacherNames,
    loadedAttendanceStatuses,
    attendanceRows,
  }
}

export async function checkStudentStatusPageEnabled() {
  return await supabase.rpc('is_student_status_enabled')
}

export async function recordStudentTrackingAnalytics(
  type: 'visit' | 'real_tracking_open',
) {
  return await supabase.rpc(
    'record_student_tracking_analytics',
    {
      p_type: type,
    },
  )
}

export async function loadStudentStatusByPersonalId(
  personalId: string,
) {
  return await supabase.rpc(
    'get_student_status_by_personal_id',
    {
      p_personal_id: personalId,
    },
  )
}

export async function loadStudentTripsByPersonalId(
  personalId: string,
) {
  return await supabase.rpc(
    'get_student_trips_by_personal_id',
    {
      p_personal_id: personalId,
    },
  )
}

export async function respondToStudentTrip(
  personalId: string,
  tripId: string,
  response: 'pending' | 'accepted' | 'rejected',
) {
  return await supabase.rpc('respond_to_trip', {
    p_personal_id: personalId,
    p_trip_id: tripId,
    p_response: response,
    p_response_note: null,
  })
}
