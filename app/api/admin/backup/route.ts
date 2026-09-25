import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

export const runtime = 'nodejs'

const PAGE_SIZE = 1000

type Row = Record<string, unknown>

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Supabase server environment variables are missing.',
    )
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

async function getAuthenticatedAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Supabase public environment variables are missing.',
    )
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },

        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(
              ({ name, value, options }) => {
                cookieStore.set(name, value, options)
              },
            )
          } catch {
            // لا نحتاج لتعديل الكوكيز أثناء إنشاء النسخة.
          }
        },
      },
    },
  )

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return null
  }

  const admin = getSupabaseAdmin()

  const { data: profile, error: profileError } =
    await admin
      .from('user_profiles')
      .select('id, auth_user_id, role, is_active')
      .eq('auth_user_id', user.id)
      .maybeSingle()

  if (profileError || !profile) {
    return null
  }

  if (!profile.is_active) {
    return null
  }

  if (profile.role !== 'Admin') {
    return null
  }

  return {
    user,
    profile,
    admin,
  }
}

async function fetchAll(
  admin: ReturnType<typeof getSupabaseAdmin>,
  table: string,
) {
  const rows: Row[] = []

  let from = 0

  while (true) {
    const to = from + PAGE_SIZE - 1

    const {
      data,
      error,
    } = await admin
      .from(table)
      .select('*')
      .range(from, to)

    if (error) {
      throw new Error(
        `Failed to read ${table}: ${error.message}`,
      )
    }

    const page = (data ?? []) as Row[]

    rows.push(...page)

    if (page.length < PAGE_SIZE) {
      break
    }

    from += PAGE_SIZE
  }

  return rows
}

async function fetchByAcademicYear(
  admin: ReturnType<typeof getSupabaseAdmin>,
  table: string,
  academicYearId: string,
) {
  const rows: Row[] = []

  let from = 0

  while (true) {
    const to = from + PAGE_SIZE - 1

    const {
      data,
      error,
    } = await admin
      .from(table)
      .select('*')
      .eq('academic_year_id', academicYearId)
      .range(from, to)

    if (error) {
      throw new Error(
        `Failed to read ${table}: ${error.message}`,
      )
    }

    const page = (data ?? []) as Row[]

    rows.push(...page)

    if (page.length < PAGE_SIZE) {
      break
    }

    from += PAGE_SIZE
  }

  return rows
}

async function fetchByIds(
  admin: ReturnType<typeof getSupabaseAdmin>,
  table: string,
  column: string,
  ids: string[],
) {
  if (ids.length === 0) {
    return []
  }

  const rows: Row[] = []

  const chunkSize = 500

  for (
    let index = 0;
    index < ids.length;
    index += chunkSize
  ) {
    const chunk = ids.slice(
      index,
      index + chunkSize,
    )

    let from = 0

    while (true) {
      const to = from + PAGE_SIZE - 1

      const {
        data,
        error,
      } = await admin
        .from(table)
        .select('*')
        .in(column, chunk)
        .range(from, to)

      if (error) {
        throw new Error(
          `Failed to read ${table}: ${error.message}`,
        )
      }

      const page = (data ?? []) as Row[]

      rows.push(...page)

      if (page.length < PAGE_SIZE) {
        break
      }

      from += PAGE_SIZE
    }
  }

  return rows
}

function addSheet(
  workbook: XLSX.WorkBook,
  name: string,
  rows: Row[],
) {
  const safeName = name.slice(0, 31)

  if (rows.length === 0) {
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['لا توجد بيانات'],
    ])

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      safeName,
    )

    return
  }

  const worksheet = XLSX.utils.json_to_sheet(rows)

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    safeName,
  )
}

function sanitizeRows(rows: Row[]) {
  return rows.map((row) => {
    const result: Row = {}

    for (const [key, value] of Object.entries(row)) {
      if (Array.isArray(value)) {
        result[key] = value.join(', ')
      } else if (
        value !== null &&
        typeof value === 'object'
      ) {
        result[key] = JSON.stringify(value)
      } else {
        result[key] = value
      }
    }

    return result
  })
}

export async function GET() {
  try {
    /*
     * ---------------------------------------------------------
     * 1. التحقق من المستخدم
     * ---------------------------------------------------------
     */

    const auth = await getAuthenticatedAdmin()

    if (!auth) {
      return NextResponse.json(
        {
          error:
            'غير مصرح لك بإنشاء النسخة الاحتياطية.',
        },
        {
          status: 403,
        },
      )
    }

    const { admin } = auth

    /*
     * ---------------------------------------------------------
     * 2. جلب السنة الدراسية الحالية
     * ---------------------------------------------------------
     */

    const {
      data: currentYear,
      error: currentYearError,
    } = await admin
      .from('academic_years')
      .select('*')
      .eq('is_current', true)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (currentYearError) {
      throw new Error(
        `تعذر قراءة السنة الدراسية الحالية: ${currentYearError.message}`,
      )
    }

    if (!currentYear) {
      return NextResponse.json(
        {
          error:
            'لا توجد سنة دراسية حالية مفعلة.',
        },
        {
          status: 400,
        },
      )
    }

    const academicYearId = currentYear.id as string

    /*
     * ---------------------------------------------------------
     * 3. البيانات الأساسية للسنة الحالية
     * ---------------------------------------------------------
     */

    const [
      classes,
      courses,
      enrollments,
      students,
      payments,
      registrations,
      registrationRequests,
      financialSettings,
      financialTransactions,
      supervisionRecords,
      trips,
    ] = await Promise.all([
      fetchByAcademicYear(
        admin,
        'classes',
        academicYearId,
      ),

      fetchByAcademicYear(
        admin,
        'courses',
        academicYearId,
      ),

      fetchByAcademicYear(
        admin,
        'enrollments',
        academicYearId,
      ),

      fetchByAcademicYear(
        admin,
        'students',
        academicYearId,
      ),

      fetchByAcademicYear(
        admin,
        'payments',
        academicYearId,
      ),

      fetchByAcademicYear(
        admin,
        'registrations',
        academicYearId,
      ),

      fetchByAcademicYear(
        admin,
        'registration_requests',
        academicYearId,
      ),

      fetchByAcademicYear(
        admin,
        'financial_settings',
        academicYearId,
      ),

      fetchByAcademicYear(
        admin,
        'financial_transactions',
        academicYearId,
      ),

      fetchByAcademicYear(
        admin,
        'supervision_records',
        academicYearId,
      ),

      fetchByAcademicYear(
        admin,
        'trips',
        academicYearId,
      ),
    ])

    /*
     * ---------------------------------------------------------
     * 4. استخراج المعرفات المرتبطة بالسنة الحالية
     * ---------------------------------------------------------
     */

    const studentIds = students
      .map((row) => row.id)
      .filter(
        (id): id is string =>
          typeof id === 'string',
      )

    const enrollmentIds = enrollments
      .map((row) => row.id)
      .filter(
        (id): id is string =>
          typeof id === 'string',
      )

    const courseIds = courses
      .map((row) => row.id)
      .filter(
        (id): id is string =>
          typeof id === 'string',
      )

    const classIds = classes
      .map((row) => row.id)
      .filter(
        (id): id is string =>
          typeof id === 'string',
      )

    const levelIds = Array.from(
      new Set(
        [
          ...enrollments.map(
            (row) => row.level_id,
          ),
          ...classes.map(
            (row) => row.level_id,
          ),
          ...registrations.map(
            (row) => row.level_id,
          ),
          ...registrationRequests.map(
            (row) => row.level_id,
          ),
        ].filter(
          (id): id is string =>
            typeof id === 'string',
        ),
      ),
    )

    /*
     * ---------------------------------------------------------
     * 5. البيانات المرتبطة
     * ---------------------------------------------------------
     */

    const [
      levels,
      attendance,
      courseTeachers,
      teacherAssignments,
      studentDynamicValues,
      customFieldValues,
      customFields,
      customFieldOptions,
      customFieldVisibility,
      attendanceStatuses,
      tripLevels,
      tripStudents,
    ] = await Promise.all([
      fetchByIds(
        admin,
        'levels',
        'id',
        levelIds,
      ),

      fetchByIds(
        admin,
        'attendance',
        'student_id',
        studentIds,
      ),

      fetchByIds(
        admin,
        'course_teachers',
        'course_id',
        courseIds,
      ),

      fetchByIds(
        admin,
        'teacher_student_assignments',
        'student_id',
        studentIds,
      ),

      fetchByIds(
        admin,
        'student_dynamic_values',
        'student_id',
        studentIds,
      ),

      fetchByIds(
        admin,
        'custom_field_values',
        'record_id',
        studentIds,
      ),

      fetchAll(
        admin,
        'custom_fields',
      ),

      fetchAll(
        admin,
        'custom_field_options',
      ),

      fetchAll(
        admin,
        'custom_field_visibility',
      ),

      fetchAll(
        admin,
        'attendance_statuses',
      ),

      fetchByIds(
        admin,
        'trip_levels',
        'trip_id',
        trips
          .map((row) => row.id)
          .filter(
            (id): id is string =>
              typeof id === 'string',
          ),
      ),

      fetchByIds(
        admin,
        'trip_students',
        'student_id',
        studentIds,
      ),
    ])

    /*
     * ---------------------------------------------------------
     * 6. تصفية الحضور للدورة/الطلاب الحالية
     * ---------------------------------------------------------
     */

    const currentCourseIdSet =
      new Set(courseIds)

    const currentEnrollmentIdSet =
      new Set(enrollmentIds)

    const currentStudentIdSet =
      new Set(studentIds)

    const currentAttendance = attendance.filter(
      (row) => {
        const courseId =
          typeof row.course_id === 'string'
            ? row.course_id
            : null

        const enrollmentId =
          typeof row.enrollment_id === 'string'
            ? row.enrollment_id
            : null

        const studentId =
          typeof row.student_id === 'string'
            ? row.student_id
            : null

        return (
          (courseId &&
            currentCourseIdSet.has(courseId)) ||
          (enrollmentId &&
            currentEnrollmentIdSet.has(
              enrollmentId,
            )) ||
          (studentId &&
            currentStudentIdSet.has(studentId))
        )
      },
    )

    /*
     * ---------------------------------------------------------
     * 7. تصفية course_teachers
     * ---------------------------------------------------------
     */

    const currentCourseTeachers =
      courseTeachers.filter((row) => {
        const courseId =
          typeof row.course_id === 'string'
            ? row.course_id
            : null

        return (
          courseId !== null &&
          currentCourseIdSet.has(courseId)
        )
      })

    /*
     * ---------------------------------------------------------
     * 8. المعلمون المرتبطون بالسنة الحالية
     * ---------------------------------------------------------
     */

    const teacherIds = Array.from(
      new Set(
        currentCourseTeachers
          .map((row) => row.teacher_id)
          .concat(
            teacherAssignments.map(
              (row) => row.teacher_id,
            ),
          )
          .filter(
            (id): id is string =>
              typeof id === 'string',
          ),
      ),
    )

    const teachers = await fetchByIds(
      admin,
      'teachers',
      'id',
      teacherIds,
    )

    /*
     * ---------------------------------------------------------
     * 9. تصفية teacher_student_assignments
     * ---------------------------------------------------------
     */

    const currentTeacherAssignments =
      teacherAssignments.filter((row) => {
        const studentId =
          typeof row.student_id === 'string'
            ? row.student_id
            : null

        const courseId =
          typeof row.course_id === 'string'
            ? row.course_id
            : null

        return (
          (studentId &&
            currentStudentIdSet.has(studentId)) ||
          (courseId &&
            currentCourseIdSet.has(courseId))
        )
      })

    /*
     * ---------------------------------------------------------
     * 10. تصفية trip_students
     * ---------------------------------------------------------
     */

    const tripIds = new Set(
      trips
        .map((row) => row.id)
        .filter(
          (id): id is string =>
            typeof id === 'string',
        ),
    )

    const currentTripStudents =
      tripStudents.filter((row) => {
        const tripId =
          typeof row.trip_id === 'string'
            ? row.trip_id
            : null

        return (
          tripId !== null &&
          tripIds.has(tripId)
        )
      })

    /*
     * ---------------------------------------------------------
     * 11. تصفية trip_levels
     * ---------------------------------------------------------
     */

    const currentTripLevels =
      tripLevels.filter((row) => {
        const tripId =
          typeof row.trip_id === 'string'
            ? row.trip_id
            : null

        return (
          tripId !== null &&
          tripIds.has(tripId)
        )
      })

    /*
     * ---------------------------------------------------------
     * 12. Excel
     * ---------------------------------------------------------
     */

    const workbook = XLSX.utils.book_new()

    /*
     * السنة الحالية
     */
    addSheet(
      workbook,
      'Academic Year',
      sanitizeRows([currentYear]),
    )

    /*
     * المستويات
     */
    addSheet(
      workbook,
      'Levels',
      sanitizeRows(levels),
    )

    /*
     * الفصول
     */
    addSheet(
      workbook,
      'Classes',
      sanitizeRows(classes),
    )

    /*
     * الطلاب
     */
    addSheet(
      workbook,
      'Students',
      sanitizeRows(students),
    )

    /*
     * التسجيلات الأكاديمية
     */
    addSheet(
      workbook,
      'Enrollments',
      sanitizeRows(enrollments),
    )

    /*
     * الدورات
     */
    addSheet(
      workbook,
      'Courses',
      sanitizeRows(courses),
    )

    /*
     * المعلمون
     */
    addSheet(
      workbook,
      'Teachers',
      sanitizeRows(teachers),
    )

    /*
     * ربط المعلمين بالدورات
     */
    addSheet(
      workbook,
      'Course Teachers',
      sanitizeRows(currentCourseTeachers),
    )

    /*
     * إسناد الطلاب للمعلمين
     */
    addSheet(
      workbook,
      'Teacher Assignments',
      sanitizeRows(currentTeacherAssignments),
    )

    /*
     * الحضور
     */
    addSheet(
      workbook,
      'Attendance',
      sanitizeRows(currentAttendance),
    )

    /*
     * حالات الحضور
     */
    addSheet(
      workbook,
      'Attendance Statuses',
      sanitizeRows(attendanceStatuses),
    )

    /*
     * المدفوعات
     */
    addSheet(
      workbook,
      'Payments',
      sanitizeRows(payments),
    )

    /*
     * التسجيلات
     */
    addSheet(
      workbook,
      'Registrations',
      sanitizeRows(registrations),
    )

    /*
     * طلبات التسجيل
     */
    addSheet(
      workbook,
      'Registration Requests',
      sanitizeRows(registrationRequests),
    )

    /*
     * الحقول المخصصة
     */
    addSheet(
      workbook,
      'Custom Fields',
      sanitizeRows(customFields),
    )

    /*
     * خيارات الحقول المخصصة
     */
    addSheet(
      workbook,
      'Custom Field Options',
      sanitizeRows(customFieldOptions),
    )

    /*
     * ظهور الحقول المخصصة
     */
    addSheet(
      workbook,
      'Custom Field Visibility',
      sanitizeRows(customFieldVisibility),
    )

    /*
     * قيم الحقول المخصصة
     */
    addSheet(
      workbook,
      'Custom Field Values',
      sanitizeRows(customFieldValues),
    )

    /*
     * القيم الديناميكية القديمة/الحالية
     */
    addSheet(
      workbook,
      'Student Dynamic Values',
      sanitizeRows(studentDynamicValues),
    )

    /*
     * الإعداد المالي للسنة
     */
    addSheet(
      workbook,
      'Financial Settings',
      sanitizeRows(financialSettings),
    )

    /*
     * العمليات المالية
     */
    addSheet(
      workbook,
      'Financial Transactions',
      sanitizeRows(financialTransactions),
    )

    /*
     * سجلات الإشراف
     */
    addSheet(
      workbook,
      'Supervision Records',
      sanitizeRows(supervisionRecords),
    )

    /*
     * الرحلات
     */
    addSheet(
      workbook,
      'Trips',
      sanitizeRows(trips),
    )

    /*
     * مستويات الرحلات
     */
    addSheet(
      workbook,
      'Trip Levels',
      sanitizeRows(currentTripLevels),
    )

    /*
     * طلاب الرحلات
     */
    addSheet(
      workbook,
      'Trip Students',
      sanitizeRows(currentTripStudents),
    )

    /*
     * ---------------------------------------------------------
     * 13. إنشاء الملف
     * ---------------------------------------------------------
     */

    const buffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'buffer',
      compression: true,
    })

    const fileName =
      `T3LEEM-Backup-${String(currentYear.name ?? 'Current-Year')}.xlsx`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

        'Content-Disposition':
          `attachment; filename="${encodeURIComponent(fileName)}"`,

        'Cache-Control':
          'no-store, no-cache, must-revalidate',

        Pragma: 'no-cache',
      },
    })
  } catch (error) {
    console.error(
      'T3LEEM backup error:',
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'تعذر إنشاء النسخة الاحتياطية.',
      },
      {
        status: 500,
      },
    )
  }
}
