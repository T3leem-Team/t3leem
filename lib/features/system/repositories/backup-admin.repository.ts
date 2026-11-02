
import 'server-only'

import {
  createClient,
  type SupabaseClient,
} from '@supabase/supabase-js'

type Row = Record<string, unknown>

const PAGE_SIZE = 1000

const EMPTY_UUID =
  '00000000-0000-0000-0000-000000000000'

function getAdminClient(): SupabaseClient {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL

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

  return createClient(
    url,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  )
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

    if (batch.length < PAGE_SIZE) {
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
        .map((row) => row[key])
        .filter(
          (
            value,
          ): value is string =>
            typeof value === 'string' &&
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
        EMPTY_UUID,
      )
    }

    return query.in(
      'id',
      ids,
    )
  }
}

export type BackupData = {
  academicYear: Row

  students: Row[]
  enrollments: Row[]
  classes: Row[]
  courses: Row[]
  courseSubjects: Row[]
  subjects: Row[]
  courseSubjectTeachers: Row[]

  payments: Row[]
  registrationRequests: Row[]
  registrations: Row[]

  financialSettings: Row[]
  financialTransactions: Row[]

  supervisionRecords: Row[]
  teacherAttendanceRecords: Row[]

  trips: Row[]
  tripLevels: Row[]
  tripStudents: Row[]

  attendance: Row[]
  courseTeachers: Row[]
  teacherStudentAssignments: Row[]
  teachers: Row[]
  levels: Row[]

  studentDynamicValues: Row[]
  customFields: Row[]
  customFieldOptions: Row[]
  customFieldVisibility: Row[]
  customFieldValues: Row[]
  dynamicFields: Row[]
  attendanceStatuses: Row[]
}

export async function loadBackupData(): Promise<BackupData> {
  const admin = getAdminClient()

  /* -----------------------------------------------------
     السنة الحالية
     ----------------------------------------------------- */

  const {
    data: academicYearData,
    error: academicYearError,
  } = await admin
    .from('academic_years')
    .select('*')
    .eq('is_current', true)
    .eq('is_active', true)
    .maybeSingle()

  if (academicYearError) {
    throw new Error(
      `تعذر قراءة السنة الدراسية الحالية: ${academicYearError.message}`,
    )
  }

  if (!academicYearData) {
    throw new Error(
      'لا توجد سنة دراسية حالية ومفعلة.',
    )
  }

  const academicYear =
    academicYearData as Row

  const academicYearId =
    academicYear.id as string

  /* -----------------------------------------------------
     الطلاب
     ----------------------------------------------------- */

  const students = await getAll(
    admin,
    'students',
    (query) =>
      query.eq(
        'academic_year_id',
        academicYearId,
      ),
  )

  const studentIds = idsFrom(
    students,
    'id',
  )

  /* -----------------------------------------------------
     الانتسابات
     ----------------------------------------------------- */

  const enrollments = await getAll(
    admin,
    'enrollments',
    (query) =>
      query.eq(
        'academic_year_id',
        academicYearId,
      ),
  )

  const enrollmentIds = idsFrom(
    enrollments,
    'id',
  )

  const enrollmentLevelIds = idsFrom(
    enrollments,
    'level_id',
  )

  /* -----------------------------------------------------
     الفصول
     ----------------------------------------------------- */

  const classes = await getAll(
    admin,
    'classes',
    (query) =>
      query.eq(
        'academic_year_id',
        academicYearId,
      ),
  )

  const classIds = idsFrom(
    classes,
    'id',
  )

  const classLevelIds = idsFrom(
    classes,
    'level_id',
  )

  const levelIds = Array.from(
    new Set([
      ...enrollmentLevelIds,
      ...classLevelIds,
    ]),
  )

  /* -----------------------------------------------------
     المواد والدورات
     ----------------------------------------------------- */

  const courses = await getAll(
    admin,
    'courses',
    (query) =>
      query.eq(
        'academic_year_id',
        academicYearId,
      ),
  )

  const courseIds = idsFrom(
    courses,
    'id',
  )

  /* -----------------------------------------------------
     المواد الدراسية
     ----------------------------------------------------- */

  const courseSubjects =
    courseIds.length > 0
      ? await getAll(
          admin,
          'course_subjects',
          (query) =>
            query.in(
              'course_id',
              courseIds,
            ),
        )
      : []

  const courseSubjectIds = idsFrom(
    courseSubjects,
    'id',
  )

  const subjectIds = idsFrom(
    courseSubjects,
    'subject_id',
  )

  const subjects =
    subjectIds.length > 0
      ? await getAll(
          admin,
          'subjects',
          (query) =>
            query.in(
              'id',
              subjectIds,
            ),
        )
      : []

  /* -----------------------------------------------------
     معلمو المواد الدراسية
     ----------------------------------------------------- */

  const courseSubjectTeachers =
    courseSubjectIds.length > 0
      ? await getAll(
          admin,
          'course_subject_teachers',
          (query) =>
            query.in(
              'course_subject_id',
              courseSubjectIds,
            ),
        )
      : []

  /* -----------------------------------------------------
     المدفوعات
     ----------------------------------------------------- */

  const payments = await getAll(
    admin,
    'payments',
    (query) =>
      query.eq(
        'academic_year_id',
        academicYearId,
      ),
  )

  /* -----------------------------------------------------
     طلبات التسجيل
     ----------------------------------------------------- */

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

  /* -----------------------------------------------------
     التسجيلات
     ----------------------------------------------------- */

  const registrations = await getAll(
    admin,
    'registrations',
    (query) =>
      query.eq(
        'academic_year_id',
        academicYearId,
      ),
  )

  /* -----------------------------------------------------
     الإعدادات المالية
     ----------------------------------------------------- */

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

  /* -----------------------------------------------------
     الحركات المالية
     ----------------------------------------------------- */

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

  /* -----------------------------------------------------
     سجلات الإشراف
     ----------------------------------------------------- */

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

  /* -----------------------------------------------------
     سجل حضور المعلمين
     غياب + تأخر فقط
     ----------------------------------------------------- */

  const teacherAttendanceRecords =
    supervisionRecords.filter(
      (row) =>
        row.type === 'teacher_absent' ||
        row.type === 'teacher_late',
    )

  /* -----------------------------------------------------
     الرحلات
     ----------------------------------------------------- */

  const trips = await getAll(
    admin,
    'trips',
    (query) =>
      query.eq(
        'academic_year_id',
        academicYearId,
      ),
  )

  const tripIds = idsFrom(
    trips,
    'id',
  )

  /* -----------------------------------------------------
     مستويات الرحلات
     ----------------------------------------------------- */

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

  /* -----------------------------------------------------
     طلاب الرحلات
     ----------------------------------------------------- */

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

  /* -----------------------------------------------------
     الحضور
     ----------------------------------------------------- */

  const attendance = await getAll(
    admin,
    'attendance',
    (query) => {
      if (studentIds.length === 0) {
        return query.eq(
          'student_id',
          EMPTY_UUID,
        )
      }

      return query.in(
        'student_id',
        studentIds,
      )
    },
  )

  /* -----------------------------------------------------
     معلمو الدورات
     ----------------------------------------------------- */

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

  /* -----------------------------------------------------
     تعيين الطلاب للمعلمين
     ----------------------------------------------------- */

  const teacherStudentAssignments =
    courseIds.length > 0 ||
    studentIds.length > 0
      ? await getAll(
          admin,
          'teacher_student_assignments',
          (query) => {
            if (
              courseIds.length > 0 &&
              studentIds.length > 0
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

            if (courseIds.length > 0) {
              return query.in(
                'course_id',
                courseIds,
              )
            }

            if (studentIds.length > 0) {
              return query.in(
                'student_id',
                studentIds,
              )
            }

            return query.eq(
              'id',
              EMPTY_UUID,
            )
          },
        )
      : []

  /* -----------------------------------------------------
     المعلمون المرتبطون بالسنة
     ----------------------------------------------------- */

  const courseTeacherIds = Array.from(
    new Set(
      courseTeachers
        .map((row) => row.teacher_id)
        .filter(
          (
            value,
          ): value is string =>
            typeof value === 'string' &&
            value.length > 0,
        ),
    ),
  )

  const assignmentTeacherIds =
    Array.from(
      new Set(
        teacherStudentAssignments
          .map((row) => row.teacher_id)
          .filter(
            (
              value,
            ): value is string =>
              typeof value === 'string' &&
              value.length > 0,
          ),
      ),
    )

  const courseSubjectTeacherIds =
    Array.from(
      new Set(
        courseSubjectTeachers
          .map((row) => row.teacher_id)
          .filter(
            (
              value,
            ): value is string =>
              typeof value === 'string' &&
              value.length > 0,
          ),
      ),
    )

  const supervisionTeacherIds =
    Array.from(
      new Set(
        supervisionRecords
          .map((row) => row.teacher_id)
          .filter(
            (
              value,
            ): value is string =>
              typeof value === 'string' &&
              value.length > 0,
          ),
      ),
    )

  const teacherIds = Array.from(
    new Set([
      ...courseTeacherIds,
      ...assignmentTeacherIds,
      ...courseSubjectTeacherIds,
      ...supervisionTeacherIds,
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

  /* -----------------------------------------------------
     المستويات
     ----------------------------------------------------- */

  const levels =
    levelIds.length > 0
      ? await getAll(
          admin,
          'levels',
          filterByIds(levelIds),
        )
      : []

  /* -----------------------------------------------------
     القيم الديناميكية للطلاب
     ----------------------------------------------------- */

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

  /* -----------------------------------------------------
     الحقول المخصصة
     ----------------------------------------------------- */

  const customFields = await getAll(
    admin,
    'custom_fields',
  )

  const customFieldIds = idsFrom(
    customFields,
    'id',
  )

  /* -----------------------------------------------------
     خيارات الحقول المخصصة
     ----------------------------------------------------- */

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

  /* -----------------------------------------------------
     ظهور الحقول المخصصة
     ----------------------------------------------------- */

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

  /* -----------------------------------------------------
     قيم الحقول المخصصة
     ----------------------------------------------------- */

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

  /* -----------------------------------------------------
     الحقول الديناميكية
     ----------------------------------------------------- */

  const dynamicFields = await getAll(
    admin,
    'dynamic_fields',
  )

  /* -----------------------------------------------------
     حالات الحضور
     ----------------------------------------------------- */

  const attendanceStatuses =
    await getAll(
      admin,
      'attendance_statuses',
    )

  return {
    academicYear,

    students,
    enrollments,
    classes,
    courses,
    courseSubjects,
    subjects,
    courseSubjectTeachers,

    payments,
    registrationRequests,
    registrations,

    financialSettings,
    financialTransactions,

    supervisionRecords,
    teacherAttendanceRecords,

    trips,
    tripLevels,
    tripStudents,

    attendance,
    courseTeachers,
    teacherStudentAssignments,
    teachers,
    levels,

    studentDynamicValues,
    customFields,
    customFieldOptions,
    customFieldVisibility,
    customFieldValues,
    dynamicFields,
    attendanceStatuses,
  }
}
