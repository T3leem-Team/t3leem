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

type Row = Record<string, unknown>

const PAGE_SIZE = 1000

function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL غير موجود.',
    )
  }

  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY غير موجود.',
    )
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

async function checkAdmin(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL غير موجود.',
    )
  }

  if (!anonKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY غير موجود.',
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
              ({
                name,
                value,
                options,
              }) => {
                cookieStore.set(
                  name,
                  value,
                  options,
                )
              },
            )
          } catch {
            // تجاهل خطأ تحديث الكوكيز
            // أثناء طلب GET.
          }
        },
      },
    },
  )

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error(
      'يجب تسجيل الدخول لإنشاء النسخة الاحتياطية.',
    )
  }

  const admin = getAdminClient()

  const {
    data: profile,
    error: profileError,
  } = await admin
    .from('user_profiles')
    .select(
      'id, auth_user_id, username, full_name, role, is_active',
    )
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (profileError) {
    throw new Error(
      `تعذر التحقق من صلاحيات المستخدم: ${profileError.message}`,
    )
  }

  if (!profile) {
    throw new Error(
      'لم يتم العثور على ملف المستخدم.',
    )
  }

  if (!profile.is_active) {
    throw new Error(
      'حساب المستخدم غير نشط.',
    )
  }

  if (profile.role !== 'Admin') {
    throw new Error(
      'ليس لديك صلاحية إنشاء نسخة احتياطية.',
    )
  }

  return admin
}

async function getAll(
  client: SupabaseClient,
  table: string,
  queryBuilder?: (
    query: any,
  ) => any,
): Promise<Row[]> {
  const rows: Row[] = []

  let from = 0

  while (true) {
    let query = client
      .from(table)
      .select('*')
      .range(
        from,
        from + PAGE_SIZE - 1,
      )

    if (queryBuilder) {
      query = queryBuilder(query)
    }

    const {
      data,
      error,
    } = await query

    if (error) {
      throw new Error(
        `خطأ في قراءة جدول ${table}: ${error.message}`,
      )
    }

    const batch =
      (data || []) as Row[]

    rows.push(...batch)

    if (
      batch.length <
      PAGE_SIZE
    ) {
      break
    }

    from += PAGE_SIZE
  }

  return rows
}

function idsFrom(
  rows: Row[],
  key: string,
): string[] {
  return Array.from(
    new Set(
      rows
        .map(
          (row) =>
            row[key],
        )
        .filter(
          (
            value,
          ): value is string =>
            typeof value ===
              'string' &&
            value.length > 0,
        ),
    ),
  )
}

function filterByIds(
  ids: string[],
) {
  return (query: any) => {
    if (ids.length === 0) {
      return query.eq(
        'id',
        '00000000-0000-0000-0000-000000000000',
      )
    }

    return query.in(
      'id',
      ids,
    )
  }
}

function appendSheet(
  workbook: XLSX.WorkBook,
  name: string,
  rows: Row[],
) {
  const safeRows =
    rows.length > 0
      ? rows
      : [
          {
            'لا توجد بيانات':
              '',
          },
        ]

  const sheet =
    XLSX.utils.json_to_sheet(
      safeRows,
    )

  XLSX.utils.book_append_sheet(
    workbook,
    sheet,
    name.slice(0, 31),
  )
}

export async function GET() {
  try {
    const admin =
      await checkAdmin()

    /*
     * 1. السنة الدراسية الحالية
     */
    const {
      data: academicYear,
      error:
        academicYearError,
    } = await admin
      .from('academic_years')
      .select('*')
      .eq(
        'is_current',
        true,
      )
      .eq(
        'is_active',
        true,
      )
      .maybeSingle()

    if (academicYearError) {
      throw new Error(
        `تعذر قراءة السنة الدراسية الحالية: ${academicYearError.message}`,
      )
    }

    if (!academicYear) {
      throw new Error(
        'لا توجد سنة دراسية حالية ومفعلة.',
      )
    }

    const academicYearId =
      academicYear.id as string

    /*
     * 2. الطلاب
     */
    const students =
      await getAll(
        admin,
        'students',
        (query) =>
          query.eq(
            'academic_year_id',
            academicYearId,
          ),
      )

    const studentIds =
      idsFrom(
        students,
        'id',
      )

    /*
     * 3. الانتسابات
     */
    const enrollments =
      await getAll(
        admin,
        'enrollments',
        (query) =>
          query.eq(
            'academic_year_id',
            academicYearId,
          ),
      )

    const enrollmentIds =
      idsFrom(
        enrollments,
        'id',
      )

    /*
     * 4. المستويات المستخدمة
     */
    const enrollmentLevelIds =
      idsFrom(
        enrollments,
        'level_id',
      )

    /*
     * 5. الفصول
     */
    const classes =
      await getAll(
        admin,
        'classes',
        (query) =>
          query.eq(
            'academic_year_id',
            academicYearId,
          ),
      )

    const classIds =
      idsFrom(
        classes,
        'id',
      )

    const classLevelIds =
      idsFrom(
        classes,
        'level_id',
      )

    const levelIds =
      Array.from(
        new Set([
          ...enrollmentLevelIds,
          ...classLevelIds,
        ]),
      )

    /*
     * 6. المواد والدورات
     *
     * تشمل جميع دورات السنة الحالية
     * حتى لو انتهت.
     */
    const courses =
      await getAll(
        admin,
        'courses',
        (query) =>
          query.eq(
            'academic_year_id',
            academicYearId,
          ),
      )

    const courseIds =
      idsFrom(
        courses,
        'id',
      )

    /*
     * 7. المدفوعات
     */
    const payments =
      await getAll(
        admin,
        'payments',
        (query) =>
          query.eq(
            'academic_year_id',
            academicYearId,
          ),
      )

    /*
     * 8. طلبات التسجيل
     */
    const registrationRequests =
      await getAll(
        admin,
        'registration_requests',
        (query) =>
          query.eq(
            'academic_year_id',
            academicYearId,
          ),
      )

    /*
     * 9. التسجيلات
     */
    const registrations =
      await getAll(
        admin,
        'registrations',
        (query) =>
          query.eq(
            'academic_year_id',
            academicYearId,
          ),
      )

    /*
     * 10. الإعدادات المالية
     */
    const financialSettings =
      await getAll(
        admin,
        'financial_settings',
        (query) =>
          query.eq(
            'academic_year_id',
            academicYearId,
          ),
      )

    /*
     * 11. الحركات المالية
     */
    const financialTransactions =
      await getAll(
        admin,
        'financial_transactions',
        (query) =>
          query.eq(
            'academic_year_id',
            academicYearId,
          ),
      )

    /*
     * 12. سجلات الإشراف
     */
    const supervisionRecords =
      await getAll(
        admin,
        'supervision_records',
        (query) =>
          query.eq(
            'academic_year_id',
            academicYearId,
          ),
      )

    /*
     * 13. الرحلات
     */
    const trips =
      await getAll(
        admin,
        'trips',
        (query) =>
          query.eq(
            'academic_year_id',
            academicYearId,
          ),
      )

    const tripIds =
      idsFrom(
        trips,
        'id',
      )

    /*
     * 14. مستويات الرحلات
     */
    const tripLevels =
      tripIds.length > 0
        ? await getAll(
            admin,
            'trip_levels',
            (query) =>
              query.in(
                'trip_id',
                tripIds,
              ),
          )
        : []

    /*
     * 15. طلاب الرحلات
     */
    const tripStudents =
      tripIds.length > 0
        ? await getAll(
            admin,
            'trip_students',
            (query) =>
              query.in(
                'trip_id',
                tripIds,
              ),
          )
        : []

    /*
     * 16. الحضور
     *
     * لا يحتوي جدول attendance
     * على academic_year_id،
     * لذلك نستخدم طلاب السنة الحالية.
     */
    const attendance =
      await getAll(
        admin,
        'attendance',
        (query) => {
          if (
            studentIds.length ===
            0
          ) {
            return query.eq(
              'student_id',
              '00000000-0000-0000-0000-000000000000',
            )
          }

          return query.in(
            'student_id',
            studentIds,
          )
        },
      )

    /*
     * 17. معلمو المواد
     */
    const courseTeachers =
      courseIds.length > 0
        ? await getAll(
            admin,
            'course_teachers',
            (query) =>
              query.in(
                'course_id',
                courseIds,
              ),
          )
        : []

    /*
     * 18. تعيين الطلاب للمعلمين
     */
    const teacherStudentAssignments =
      courseIds.length > 0 ||
      studentIds.length > 0
        ? await getAll(
            admin,
            'teacher_student_assignments',
            (query) => {
              if (
                courseIds.length >
                  0 &&
                studentIds.length >
                  0
              ) {
                return query
                  .in(
                    'course_id',
                    courseIds,
                  )
                  .in(
                    'student_id',
                    studentIds,
                  )
              }

              if (
                courseIds.length >
                0
              ) {
                return query.in(
                  'course_id',
                  courseIds,
                )
              }

              if (
                studentIds.length >
                0
              ) {
                return query.in(
                  'student_id',
                  studentIds,
                )
              }

              return query.eq(
                'id',
                '00000000-0000-0000-0000-000000000000',
              )
            },
          )
        : []

    /*
     * 19. المعلمون المرتبطون بالسنة
     */
    const courseTeacherIds =
      Array.from(
        new Set(
          courseTeachers
            .map(
              (row) =>
                row.teacher_id,
            )
            .filter(
              (
                value,
              ): value is string =>
                typeof value ===
                  'string' &&
                value.length > 0,
            ),
        ),
      )

    const assignmentTeacherIds =
      Array.from(
        new Set(
          teacherStudentAssignments
            .map(
              (row) =>
                row.teacher_id,
            )
            .filter(
              (
                value,
              ): value is string =>
                typeof value ===
                  'string' &&
                value.length > 0,
            ),
        ),
      )

    const teacherIds =
      Array.from(
        new Set([
          ...courseTeacherIds,
          ...assignmentTeacherIds,
        ]),
      )

    const teachers =
      teacherIds.length > 0
        ? await getAll(
            admin,
            'teachers',
            (query) =>
              query.in(
                'id',
                teacherIds,
              ),
          )
        : []

    /*
     * 20. المستويات
     */
    const levels =
      levelIds.length > 0
        ? await getAll(
            admin,
            'levels',
            filterByIds(
              levelIds,
            ),
          )
        : []

    /*
     * 21. القيم الديناميكية للطلاب
     */
    const studentDynamicValues =
      studentIds.length > 0
        ? await getAll(
            admin,
            'student_dynamic_values',
            (query) =>
              query.in(
                'student_id',
                studentIds,
              ),
          )
        : []

    /*
     * 22. الحقول المخصصة
     */
    const customFields =
      await getAll(
        admin,
        'custom_fields',
      )

    const customFieldIds =
      idsFrom(
        customFields,
        'id',
      )

    /*
     * 23. خيارات الحقول المخصصة
     */
    const customFieldOptions =
      customFieldIds.length > 0
        ? await getAll(
            admin,
            'custom_field_options',
            (query) =>
              query.in(
                'custom_field_id',
                customFieldIds,
              ),
          )
        : []

    /*
     * 24. ظهور الحقول المخصصة
     */
    const customFieldVisibility =
      customFieldIds.length > 0
        ? await getAll(
            admin,
            'custom_field_visibility',
            (query) =>
              query.in(
                'custom_field_id',
                customFieldIds,
              ),
          )
        : []

    /*
     * 25. قيم الحقول المخصصة للطلاب الحاليين
     */
    const customFieldValues =
      studentIds.length > 0
        ? await getAll(
            admin,
            'custom_field_values',
            (query) =>
              query
                .in(
                  'record_id',
                  studentIds,
                )
                .eq(
                  'record_type',
                  'student',
                ),
          )
        : []

    /*
     * 26. الحقول الديناميكية
     */
    const dynamicFields =
      await getAll(
        admin,
        'dynamic_fields',
      )

    /*
     * 27. حالات الحضور
     */
    const attendanceStatuses =
      await getAll(
        admin,
        'attendance_statuses',
      )

    /*
     * إنشاء ملف Excel
     */
    const workbook =
      XLSX.utils.book_new()

    /*
     * معلومات النسخة
     */
    appendSheet(
      workbook,
      'معلومات النسخة',
      [
        {
          'السنة الدراسية':
            academicYear.name,
          'معرف السنة':
            academicYear.id,
          'تاريخ البداية':
            academicYear.start_date,
          'تاريخ النهاية':
            academicYear.end_date,
          'السنة الحالية':
            academicYear.is_current,
          'السنة مفعلة':
            academicYear.is_active,
          'الرسوم السنوية':
            academicYear.annual_fee,
          'تاريخ إنشاء النسخة':
            new Date().toISOString(),
        },
      ],
    )

    /*
     * السنة الدراسية
     */
    appendSheet(
      workbook,
      'السنوات الدراسية',
      [academicYear],
    )

    /*
     * الطلاب
     */
    appendSheet(
      workbook,
      'الطلاب',
      students,
    )

    /*
     * الانتسابات
     *
     * تم تغيير اسم الـ Sheet حتى لا يتكرر
     * مع Sheet التسجيلات.
     */
    appendSheet(
      workbook,
      'انتساب الطلاب',
      enrollments,
    )

    /*
     * المستويات
     */
    appendSheet(
      workbook,
      'المستويات',
      levels,
    )

    /*
     * الفصول
     */
    appendSheet(
      workbook,
      'الفصول',
      classes,
    )

    /*
     * المواد والدورات
     */
    appendSheet(
      workbook,
      'المواد والدورات',
      courses,
    )

    /*
     * المدفوعات
     */
    appendSheet(
      workbook,
      'المدفوعات',
      payments,
    )

    /*
     * طلبات التسجيل
     */
    appendSheet(
      workbook,
      'طلبات التسجيل',
      registrationRequests,
    )

    /*
     * التسجيلات
     */
    appendSheet(
      workbook,
      'التسجيلات',
      registrations,
    )

    /*
     * الإعدادات المالية
     */
    appendSheet(
      workbook,
      'إعدادات المالية',
      financialSettings,
    )

    /*
     * الحركات المالية
     */
    appendSheet(
      workbook,
      'الحركات المالية',
      financialTransactions,
    )

    /*
     * الحضور
     */
    appendSheet(
      workbook,
      'الحضور',
      attendance,
    )

    /*
     * حالات الحضور
     */
    appendSheet(
      workbook,
      'حالات الحضور',
      attendanceStatuses,
    )

    /*
     * المعلمون
     */
    appendSheet(
      workbook,
      'المعلمون',
      teachers,
    )

    /*
     * معلمو المواد
     */
    appendSheet(
      workbook,
      'معلمو المواد',
      courseTeachers,
    )

    /*
     * تعيين الطلاب للمعلمين
     */
    appendSheet(
      workbook,
      'تعيين الطلاب للمعلمين',
      teacherStudentAssignments,
    )

    /*
     * القيم الديناميكية للطلاب
     */
    appendSheet(
      workbook,
      'القيم الديناميكية للطلاب',
      studentDynamicValues,
    )

    /*
     * الحقول الديناميكية
     */
    appendSheet(
      workbook,
      'الحقول الديناميكية',
      dynamicFields,
    )

    /*
     * الحقول المخصصة
     */
    appendSheet(
      workbook,
      'الحقول المخصصة',
      customFields,
    )

    /*
     * خيارات الحقول المخصصة
     */
    appendSheet(
      workbook,
      'خيارات الحقول المخصصة',
      customFieldOptions,
    )

    /*
     * ظهور الحقول المخصصة
     */
    appendSheet(
      workbook,
      'ظهور الحقول المخصصة',
      customFieldVisibility,
    )

    /*
     * قيم الحقول المخصصة
     */
    appendSheet(
      workbook,
      'قيم الحقول المخصصة',
      customFieldValues,
    )

    /*
     * سجلات الإشراف
     */
    appendSheet(
      workbook,
      'سجلات الإشراف',
      supervisionRecords,
    )

    /*
     * الرحلات
     */
    appendSheet(
      workbook,
      'الرحلات',
      trips,
    )

    /*
     * مستويات الرحلات
     */
    appendSheet(
      workbook,
      'مستويات الرحلات',
      tripLevels,
    )

    /*
     * طلاب الرحلات
     */
    appendSheet(
      workbook,
      'طلاب الرحلات',
      tripStudents,
    )

    /*
     * إنشاء ملف XLSX
     */
    const buffer =
      XLSX.write(
        workbook,
        {
          bookType: 'xlsx',
          type: 'buffer',
        },
      )

    const filename =
      `T3LEEM-Backup-${String(
        academicYear.name ||
          'Current-Year',
      ).replace(
        /[\\/:*?"<>|]/g,
        '-',
      )}.xlsx`

    return new NextResponse(
      buffer as BodyInit,
      {
        status: 200,
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

          'Content-Disposition':
            `attachment; filename="${filename}"`,

          'Cache-Control':
            'no-store, no-cache, must-revalidate',
        },
      },
    )
  } catch (error) {
    console.error(
      'BACKUP API ERROR:',
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 500,
      },
    )
  }
}