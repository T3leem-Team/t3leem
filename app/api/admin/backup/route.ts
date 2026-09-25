import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import {
  createClient,
  type SupabaseClient,
} from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PAGE_SIZE = 1000

type Row = Record<string, unknown>

type AdminClient = SupabaseClient

function getAdminClient(): AdminClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL غير موجود في Environment Variables.'
    )
  }

  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY غير موجود في Environment Variables.'
    )
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

async function checkAdmin(): Promise<AdminClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL غير موجود.'
    )
  }

  if (!anonKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY غير موجود.'
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
                cookieStore.set(
                  name,
                  value,
                  options
                )
              }
            )
          } catch {
            // لا نحتاج لتعديل الكوكيز هنا.
          }
        },
      },
    }
  )

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    throw new Error(
      `خطأ في التحقق من تسجيل الدخول: ${authError.message}`
    )
  }

  if (!user) {
    throw new Error(
      'لم يتم العثور على جلسة تسجيل دخول.'
    )
  }

  const admin = getAdminClient()

  const {
    data: profile,
    error: profileError,
  } = await admin
    .from('user_profiles')
    .select(
      'id, auth_user_id, username, full_name, role, is_active'
    )
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (profileError) {
    throw new Error(
      `تعذر قراءة صلاحيات المستخدم: ${profileError.message}`
    )
  }

  if (!profile) {
    throw new Error(
      'لم يتم العثور على ملف المستخدم في user_profiles.'
    )
  }

  if (!profile.is_active) {
    throw new Error(
      'حساب المستخدم غير مفعل.'
    )
  }

  if (profile.role !== 'Admin') {
    throw new Error(
      `هذا الإجراء متاح لمدير النظام فقط. الدور الحالي: ${profile.role}`
    )
  }

  return admin
}

async function getAll(
  admin: AdminClient,
  table: string
): Promise<Row[]> {
  const result: Row[] = []

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
        `خطأ في جدول ${table}: ${error.message}`
      )
    }

    const rows = (data ?? []) as Row[]

    result.push(...rows)

    if (rows.length < PAGE_SIZE) {
      break
    }

    from += PAGE_SIZE
  }

  return result
}

async function getByAcademicYear(
  admin: AdminClient,
  table: string,
  academicYearId: string
): Promise<Row[]> {
  const result: Row[] = []

  let from = 0

  while (true) {
    const to = from + PAGE_SIZE - 1

    const {
      data,
      error,
    } = await admin
      .from(table)
      .select('*')
      .eq(
        'academic_year_id',
        academicYearId
      )
      .range(from, to)

    if (error) {
      throw new Error(
        `خطأ في جدول ${table}: ${error.message}`
      )
    }

    const rows = (data ?? []) as Row[]

    result.push(...rows)

    if (rows.length < PAGE_SIZE) {
      break
    }

    from += PAGE_SIZE
  }

  return result
}

async function getByIds(
  admin: AdminClient,
  table: string,
  column: string,
  ids: string[]
): Promise<Row[]> {
  if (ids.length === 0) {
    return []
  }

  const result: Row[] = []

  const chunkSize = 500

  for (
    let i = 0;
    i < ids.length;
    i += chunkSize
  ) {
    const chunk = ids.slice(
      i,
      i + chunkSize
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
          `خطأ في جدول ${table}: ${error.message}`
        )
      }

      const rows = (data ?? []) as Row[]

      result.push(...rows)

      if (rows.length < PAGE_SIZE) {
        break
      }

      from += PAGE_SIZE
    }
  }

  return result
}

function cleanRows(
  rows: Row[]
): Row[] {
  return rows.map((row) => {
    const output: Row = {}

    for (const [key, value] of Object.entries(
      row
    )) {
      if (Array.isArray(value)) {
        output[key] = value.join(', ')
      } else if (
        value !== null &&
        typeof value === 'object'
      ) {
        output[key] = JSON.stringify(value)
      } else {
        output[key] = value
      }
    }

    return output
  })
}

function addSheet(
  workbook: XLSX.WorkBook,
  name: string,
  rows: Row[]
) {
  const sheetName = name.slice(0, 31)

  if (rows.length === 0) {
    const sheet =
      XLSX.utils.aoa_to_sheet([
        ['لا توجد بيانات'],
      ])

    XLSX.utils.book_append_sheet(
      workbook,
      sheet,
      sheetName
    )

    return
  }

  const sheet =
    XLSX.utils.json_to_sheet(
      cleanRows(rows)
    )

  XLSX.utils.book_append_sheet(
    workbook,
    sheet,
    sheetName
  )
}

export async function GET() {
  try {
    /*
     * 1. التحقق من المستخدم
     */

    const admin =
      await checkAdmin()

    /*
     * 2. السنة الدراسية الحالية
     */

    const {
      data: currentYear,
      error: yearError,
    } = await admin
      .from('academic_years')
      .select('*')
      .eq('is_current', true)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (yearError) {
      throw new Error(
        `خطأ في academic_years: ${yearError.message}`
      )
    }

    if (!currentYear) {
      throw new Error(
        'لا توجد سنة دراسية حالية مفعلة.'
      )
    }

    const academicYearId =
      String(currentYear.id)

    /*
     * 3. بيانات السنة الحالية
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
      getByAcademicYear(
        admin,
        'classes',
        academicYearId
      ),

      getByAcademicYear(
        admin,
        'courses',
        academicYearId
      ),

      getByAcademicYear(
        admin,
        'enrollments',
        academicYearId
      ),

      getByAcademicYear(
        admin,
        'students',
        academicYearId
      ),

      getByAcademicYear(
        admin,
        'payments',
        academicYearId
      ),

      getByAcademicYear(
        admin,
        'registrations',
        academicYearId
      ),

      getByAcademicYear(
        admin,
        'registration_requests',
        academicYearId
      ),

      getByAcademicYear(
        admin,
        'financial_settings',
        academicYearId
      ),

      getByAcademicYear(
        admin,
        'financial_transactions',
        academicYearId
      ),

      getByAcademicYear(
        admin,
        'supervision_records',
        academicYearId
      ),

      getByAcademicYear(
        admin,
        'trips',
        academicYearId
      ),
    ])

    /*
     * 4. استخراج المعرفات
     */

    const studentIds =
      students
        .map((row) => row.id)
        .filter(
          (id): id is string =>
            typeof id === 'string'
        )

    const enrollmentIds =
      enrollments
        .map((row) => row.id)
        .filter(
          (id): id is string =>
            typeof id === 'string'
        )

    const courseIds =
      courses
        .map((row) => row.id)
        .filter(
          (id): id is string =>
            typeof id === 'string'
        )

    const levelIds =
      Array.from(
        new Set(
          [
            ...enrollments.map(
              (row) =>
                row.level_id
            ),

            ...classes.map(
              (row) =>
                row.level_id
            ),

            ...registrations.map(
              (row) =>
                row.level_id
            ),

            ...registrationRequests.map(
              (row) =>
                row.level_id
            ),
          ].filter(
            (id): id is string =>
              typeof id === 'string'
          )
        )
      )

    const tripIds =
      trips
        .map((row) => row.id)
        .filter(
          (id): id is string =>
            typeof id === 'string'
        )

    /*
     * 5. البيانات المرتبطة
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
      teachers,
      tripLevels,
      tripStudents,
    ] = await Promise.all([
      getByIds(
        admin,
        'levels',
        'id',
        levelIds
      ),

      getByIds(
        admin,
        'attendance',
        'student_id',
        studentIds
      ),

      getByIds(
        admin,
        'course_teachers',
        'course_id',
        courseIds
      ),

      getByIds(
        admin,
        'teacher_student_assignments',
        'student_id',
        studentIds
      ),

      getByIds(
        admin,
        'student_dynamic_values',
        'student_id',
        studentIds
      ),

      getByIds(
        admin,
        'custom_field_values',
        'record_id',
        studentIds
      ),

      getAll(
        admin,
        'custom_fields'
      ),

      getAll(
        admin,
        'custom_field_options'
      ),

      getAll(
        admin,
        'custom_field_visibility'
      ),

      getAll(
        admin,
        'attendance_statuses'
      ),

      getByIds(
        admin,
        'teachers',
        'id',
        Array.from(
          new Set(
            courseTeachers
              .map(
                (row) =>
                  row.teacher_id
              )
              .concat(
                teacherAssignments.map(
                  (row) =>
                    row.teacher_id
                )
              )
              .filter(
                (id): id is string =>
                  typeof id ===
                  'string'
              )
          )
        )
      ),

      getByIds(
        admin,
        'trip_levels',
        'trip_id',
        tripIds
      ),

      getByIds(
        admin,
        'trip_students',
        'trip_id',
        tripIds
      ),
    ])

    /*
     * 6. فلترة الحضور للسنة الحالية
     */

    const currentStudentIds =
      new Set(studentIds)

    const currentCourseIds =
      new Set(courseIds)

    const currentEnrollmentIds =
      new Set(enrollmentIds)

    const currentAttendance =
      attendance.filter(
        (row) => {
          const studentId =
            typeof row.student_id ===
            'string'
              ? row.student_id
              : null

          const courseId =
            typeof row.course_id ===
            'string'
              ? row.course_id
              : null

          const enrollmentId =
            typeof row.enrollment_id ===
            'string'
              ? row.enrollment_id
              : null

          return (
            (studentId &&
              currentStudentIds.has(
                studentId
              )) ||
            (courseId &&
              currentCourseIds.has(
                courseId
              )) ||
            (enrollmentId &&
              currentEnrollmentIds.has(
                enrollmentId
              ))
          )
        }
      )

    /*
     * 7. المعلمون المرتبطون بالدورات الحالية
     */

    const currentCourseTeachers =
      courseTeachers.filter(
        (row) => {
          const courseId =
            typeof row.course_id ===
            'string'
              ? row.course_id
              : null

          return (
            courseId !== null &&
            currentCourseIds.has(
              courseId
            )
          )
        }
      )

    /*
     * 8. إسنادات الطلاب الحالية
     */

    const currentTeacherAssignments =
      teacherAssignments.filter(
        (row) => {
          const studentId =
            typeof row.student_id ===
            'string'
              ? row.student_id
              : null

          const courseId =
            typeof row.course_id ===
            'string'
              ? row.course_id
              : null

          return (
            (studentId &&
              currentStudentIds.has(
                studentId
              )) ||
            (courseId &&
              currentCourseIds.has(
                courseId
              ))
          )
        }
      )

    /*
     * 9. إنشاء ملف Excel
     */

    const workbook =
      XLSX.utils.book_new()

    addSheet(
      workbook,
      'Academic Year',
      [currentYear]
    )

    addSheet(
      workbook,
      'Levels',
      levels
    )

    addSheet(
      workbook,
      'Classes',
      classes
    )

    addSheet(
      workbook,
      'Students',
      students
    )

    addSheet(
      workbook,
      'Enrollments',
      enrollments
    )

    addSheet(
      workbook,
      'Courses',
      courses
    )

    addSheet(
      workbook,
      'Teachers',
      teachers
    )

    addSheet(
      workbook,
      'Course Teachers',
      currentCourseTeachers
    )

    addSheet(
      workbook,
      'Teacher Assignments',
      currentTeacherAssignments
    )

    addSheet(
      workbook,
      'Attendance',
      currentAttendance
    )

    addSheet(
      workbook,
      'Attendance Statuses',
      attendanceStatuses
    )

    addSheet(
      workbook,
      'Payments',
      payments
    )

    addSheet(
      workbook,
      'Registrations',
      registrations
    )

    addSheet(
      workbook,
      'Registration Requests',
      registrationRequests
    )

    addSheet(
      workbook,
      'Custom Fields',
      customFields
    )

    addSheet(
      workbook,
      'Custom Field Options',
      customFieldOptions
    )

    addSheet(
      workbook,
      'Custom Field Visibility',
      customFieldVisibility
    )

    addSheet(
      workbook,
      'Custom Field Values',
      customFieldValues
    )

    addSheet(
      workbook,
      'Student Dynamic Values',
      studentDynamicValues
    )

    addSheet(
      workbook,
      'Financial Settings',
      financialSettings
    )

    addSheet(
      workbook,
      'Financial Transactions',
      financialTransactions
    )

    addSheet(
      workbook,
      'Supervision Records',
      supervisionRecords
    )

    addSheet(
      workbook,
      'Trips',
      trips
    )

    addSheet(
      workbook,
      'Trip Levels',
      tripLevels
    )

    addSheet(
      workbook,
      'Trip Students',
      tripStudents
    )

    /*
     * 10. تحويل Excel إلى Buffer
     */

    const buffer =
      XLSX.write(
        workbook,
        {
          bookType: 'xlsx',
          type: 'buffer',
          compression: true,
        }
      )

    const fileName =
      `T3LEEM-Backup-${String(
        currentYear.name ??
          'Current-Year'
      )}.xlsx`

    return new NextResponse(
      buffer,
      {
        status: 200,

        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

          'Content-Disposition':
            `attachment; filename="${encodeURIComponent(
              fileName
            )}"`,

          'Cache-Control':
            'no-store, no-cache, must-revalidate',

          Pragma: 'no-cache',
        },
      }
    )
  } catch (error) {
    console.error(
      'T3LEEM BACKUP ERROR:',
      error
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'خطأ غير معروف في إنشاء النسخة الاحتياطية.',
      },
      {
        status: 500,
      }
    )
  }
}