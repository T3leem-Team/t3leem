import { NextResponse } from 'next/server'
import {
  createClient,
  type SupabaseClient,
} from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import { requirePermission } from '@/lib/auth/authorization'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
      query =
        queryBuilder(query)
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

    rows.push(
      ...batch,
    )

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
    if (
      ids.length ===
      0
    ) {
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

/* =========================================================
   أسماء الأعمدة بالعربي
   ========================================================= */

const commonColumnNames: Record<
  string,
  string
> = {
  id: 'المعرف الداخلي',
  created_at: 'تاريخ الإنشاء',
  updated_at: 'تاريخ آخر تحديث',

  name: 'الاسم',
  description: 'الوصف',
  status: 'الحالة',
  note: 'ملاحظة',
  notes: 'ملاحظات',

  academic_year_id:
    'معرف السنة الدراسية',

  student_id:
    'معرف الطالب',

  enrollment_id:
    'معرف الانتساب',

  level_id:
    'معرف المستوى',

  class_id:
    'معرف الفصل',

  course_id:
    'معرف المادة',

  teacher_id:
    'معرف المعلم',

  subject_id:
    'معرف المادة الدراسية',

  course_subject_id:
    'معرف مادة الدورة',

  trip_id:
    'معرف الرحلة',

  custom_field_id:
    'معرف الحقل المخصص',

  field_id:
    'معرف الحقل',

  record_id:
    'معرف السجل',

  payment_id:
    'معرف الدفعة',

  created_by:
    'معرف منشئ السجل',

  reviewed_by:
    'معرف مراجع الطلب',

  approved_by:
    'معرف المعتمد',

  rejected_by:
    'معرف الرافض',

  closed_by:
    'معرف من أغلق السجل',

  confirmed_by:
    'معرف من أكد العملية',

  reviewed_at:
    'تاريخ المراجعة',

  approved_at:
    'تاريخ الاعتماد',

  rejected_at:
    'تاريخ الرفض',

  closed_at:
    'تاريخ الإغلاق',

  confirmed_at:
    'تاريخ التأكيد',

  start_date:
    'تاريخ البداية',

  end_date:
    'تاريخ النهاية',

  payment_date:
    'تاريخ الدفع',

  record_date:
    'تاريخ السجل',

  attendance_date:
    'تاريخ الحضور',

  trip_date:
    'تاريخ الرحلة',

  meeting_time:
    'وقت التجمع',

  return_time:
    'وقت العودة',

  amount:
    'المبلغ',

  annual_fee:
    'الرسوم السنوية',

  fee:
    'الرسوم',

  payment_amount:
    'مبلغ الدفع',

  verified_payment_amount:
    'المبلغ المؤكد',

  payment_method:
    'طريقة الدفع',

  payment_status:
    'حالة الدفع',

  payment_reference:
    'مرجع الدفع',

  reference_number:
    'الرقم المرجعي',

  rejection_reason:
    'سبب الرفض',

  payment_rejection_reason:
    'سبب رفض الدفع',

  payment_proof_url:
    'رابط إثبات الدفع',

  payment_proof_required:
    'إثبات الدفع مطلوب',

  source:
    'المصدر',

  source_type:
    'نوع المصدر',

  processing_mode:
    'طريقة المعالجة',

  confirmation_status:
    'حالة التأكيد',

  transaction_type:
    'نوع العملية',

  adjustment_direction:
    'اتجاه التسوية',

  adjustment_sign:
    'إشارة التسوية',

  opening_balance:
    'الرصيد الافتتاحي',

  opening_source:
    'مصدر الرصيد الافتتاحي',

  opening_note:
    'ملاحظة الرصيد الافتتاحي',

  initial_balance:
    'الرصيد الابتدائي',

  initial_source:
    'مصدر الرصيد الابتدائي',

  initial_note:
    'ملاحظة الرصيد الابتدائي',

  balance_after:
    'الرصيد بعد العملية',

  payment_link:
    'رابط الدفع',

  payment_link_enabled:
    'الدفع عبر الرابط مفعل',

  payment_enabled:
    'الدفع الإلكتروني مفعل',

  bank_transfer_enabled:
    'التحويل البنكي مفعل',

  cash_enabled:
    'الدفع النقدي مفعل',

  show_payment_qr:
    'إظهار رمز الدفع',

  payment_qr_url:
    'رابط رمز الدفع',

  is_current:
    'السنة الحالية',

  is_active:
    'مفعل',

  is_enabled:
    'مفعل',

  enabled:
    'مفعل',

  is_required:
    'مطلوب',

  required_name:
    'الاسم مطلوب',

  required_personal_id:
    'الرقم الشخصي مطلوب',

  required_phone:
    'رقم الهاتف مطلوب',

  required_whatsapp:
    'رقم الواتساب مطلوب',

  required_level:
    'المستوى مطلوب',

  required_notes:
    'الملاحظات مطلوبة',

  required_health_notes:
    'الملاحظات الصحية مطلوبة',

  required_gender:
    'الجنس مطلوب',

  required_age:
    'العمر مطلوب',

  show_name:
    'إظهار الاسم',

  show_personal_id:
    'إظهار الرقم الشخصي',

  show_phone:
    'إظهار الهاتف',

  show_whatsapp:
    'إظهار الواتساب',

  show_level:
    'إظهار المستوى',

  show_notes:
    'إظهار الملاحظات',

  show_health_notes:
    'إظهار الملاحظات الصحية',

  show_gender:
    'إظهار الجنس',

  show_age:
    'إظهار العمر',

  personal_id:
    'الرقم الشخصي',

  gender:
    'الجنس',

  phone:
    'رقم الهاتف',

  whatsapp:
    'رقم الواتساب',

  age:
    'العمر',

  health_notes:
    'الملاحظات الصحية',

  fee_exempt:
    'معفي من الرسوم',

  subject:
    'المادة / التخصص',

  department:
    'القسم',

  username:
    'اسم المستخدم',

  full_name:
    'الاسم الكامل',

  email:
    'البريد الإلكتروني',

  role:
    'الدور',

  sort_order:
    'الترتيب',

  field_key:
    'مفتاح الحقل',

  field_type:
    'نوع الحقل',

  label:
    'الاسم الظاهر',

  value:
    'القيمة',

  section:
    'القسم',

  is_visible:
    'ظاهر',

  available_in_registration:
    'متاح في التسجيل',

  available_in_students:
    'متاح في الطلاب',

  available_in_payments:
    'متاح في المدفوعات',

  show_in_registration:
    'يظهر في التسجيل',

  registration_enabled:
    'التسجيل مفعل',

  registration_open:
    'التسجيل مفتوح',

  registration_mode:
    'وضع التسجيل',

  request_number:
    'رقم الطلب',

  tracking_token:
    'رمز التتبع',

  registration_number:
    'رقم التسجيل',

  reason:
    'السبب',

  type:
    'النوع',

  attendance_percentage:
    'نسبة الحضور',

  attendance_present:
    'عدد الحضور',

  attendance_absent:
    'عدد الغياب',

  attendance_late:
    'عدد التأخير',

  attendance_excused:
    'عدد الاستئذان',

  attendance_not_recorded:
    'عدد الأيام غير المسجلة',

  eligibility_note:
    'ملاحظة الأهلية',

  selected:
    'تم الاختيار',

  response:
    'الرد',

  response_note:
    'ملاحظة الرد',

  responded_at:
    'تاريخ الرد',

  response_source:
    'مصدر الرد',

  attendance_min:
    'الحد الأدنى للحضور',

  attendance_max:
    'الحد الأعلى للحضور',

  notes_requirement:
    'متطلب الملاحظات',

  approved:
    'معتمد',

  closed:
    'مغلق',

  close_note:
    'ملاحظة الإغلاق',

  rejection_note:
    'ملاحظة الرفض',

  approval_note:
    'ملاحظة الاعتماد',

  academic_year:
    'السنة الدراسية',

  course_name:
    'اسم المادة',

  level_name:
    'اسم المستوى',

  class_name:
    'اسم الفصل',

  student_name:
    'اسم الطالب',

  teacher_name:
    'اسم المعلم',

  trip_name:
    'اسم الرحلة',

  attendance_status:
    'حالة الحضور',

  custom_field_name:
    'اسم الحقل المخصص',

  field_name:
    'اسم الحقل',

  enrollment_status:
    'حالة الانتساب',

  class_is_active:
    'الفصل مفعل',

  course_days:
    'أيام المادة',

  course_start_date:
    'بداية المادة',

  course_end_date:
    'نهاية المادة',
}

/* =========================================================
   تحويل القيم إلى نص مفهوم
   ========================================================= */

function readableBoolean(
  value: unknown,
): unknown {
  if (
    value === true
  ) {
    return 'نعم'
  }

  if (
    value === false
  ) {
    return 'لا'
  }

  return value
}

function readableValue(
  value: unknown,
): unknown {
  if (
    value === null ||
    value === undefined
  ) {
    return ''
  }

  if (
    typeof value ===
    'boolean'
  ) {
    return readableBoolean(
      value,
    )
  }

  if (
    Array.isArray(value)
  ) {
    return value.join(
      '، ',
    )
  }

  if (
    typeof value ===
      'object'
  ) {
    try {
      return JSON.stringify(
        value,
      )
    } catch {
      return String(value)
    }
  }

  return value
}

/* =========================================================
   تحويل الصفوف مع تعريف العلاقات
   ========================================================= */

type RowContext = {
  academicYears?: Map<
    string,
    string
  >

  students?: Map<
    string,
    string
  >

  enrollments?: Map<
    string,
    string
  >

  levels?: Map<
    string,
    string
  >

  classes?: Map<
    string,
    string
  >

  courses?: Map<
    string,
    string
  >

  teachers?: Map<
    string,
    string
  >

  subjects?: Map<
    string,
    string
  >

  courseSubjects?: Map<
    string,
    string
  >

  trips?: Map<
    string,
    string
  >

  attendanceStatuses?: Map<
    string,
    string
  >

  customFields?: Map<
    string,
    string
  >

  dynamicFields?: Map<
    string,
    string
  >
}

type ForeignConfig = {
  column: string
  label: string
  lookup?: Map<
    string,
    string
  >
}

function makeReadableRows(
  rows: Row[],
  context: RowContext = {},
  foreignKeys: ForeignConfig[] = [],
): Row[] {
  return rows.map(
    (row) => {
      const result: Row = {}

      for (
        const [
          key,
          value,
        ] of Object.entries(
          row,
        )
      ) {
        const foreign =
          foreignKeys.find(
            (item) =>
              item.column ===
              key,
          )

        if (
          foreign &&
          typeof value ===
            'string'
        ) {
          result[
            foreign.label
          ] =
            foreign.lookup?.get(
              value,
            ) ||
            value

          result[
            `${foreign.label} - المعرف الداخلي`
          ] = value

          continue
        }

        const columnName =
          commonColumnNames[
            key
          ] || key

        result[
          columnName
        ] =
          readableValue(
            value,
          )
      }

      return result
    },
  )
}

function makeMap(
  rows: Row[],
  idKey: string,
  nameKey: string = 'name',
): Map<string, string> {
  const map =
    new Map<
      string,
      string
    >()

  for (
    const row of rows
  ) {
    const id =
      row[idKey]

    if (
      typeof id !==
      'string'
    ) {
      continue
    }

    const name =
      row[nameKey]

    if (
      name ===
      null ||
      name ===
      undefined ||
      String(name)
        .trim()
        .length ===
        0
    ) {
      map.set(
        id,
        id,
      )
    } else {
      map.set(
        id,
        String(name),
      )
    }
  }

  return map
}

/* =========================================================
   إضافة Sheet
   ========================================================= */

function appendSheet(
  workbook: XLSX.WorkBook,
  name: string,
  rows: Row[],
  context?: RowContext,
  foreignKeys?: ForeignConfig[],
) {
  const readableRows =
    makeReadableRows(
      rows,
      context,
      foreignKeys,
    )

  const safeRows =
    readableRows.length >
    0
      ? readableRows
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

/* =========================================================
   GET
   ========================================================= */

export async function GET() {
  try {
    const authorization =
      await requirePermission('backup.manage')

    if (authorization.error) {
      return authorization.error
    }

    if (!authorization.access) {
      return NextResponse.json(
        {
          error:
            'تعذر التحقق من صلاحيات النسخة الاحتياطية حالياً.',
        },
        { status: 503 },
      )
    }

    const admin = getAdminClient()

    /* -----------------------------------------------------
       السنة الحالية
       ----------------------------------------------------- */

    const {
      data: academicYear,
      error:
        academicYearError,
    } =
      await admin
        .from(
          'academic_years',
        )
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

    if (
      academicYearError
    ) {
      throw new Error(
        `تعذر قراءة السنة الدراسية الحالية: ${academicYearError.message}`,
      )
    }

    if (
      !academicYear
    ) {
      throw new Error(
        'لا توجد سنة دراسية حالية ومفعلة.',
      )
    }

    const academicYearId =
      academicYear.id as string

    /* -----------------------------------------------------
       الطلاب
       ----------------------------------------------------- */

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

    /* -----------------------------------------------------
       الانتسابات
       ----------------------------------------------------- */

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

    const enrollmentLevelIds =
      idsFrom(
        enrollments,
        'level_id',
      )

    /* -----------------------------------------------------
       الفصول
       ----------------------------------------------------- */

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

    /* -----------------------------------------------------
       المواد والدورات
       ----------------------------------------------------- */

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

    const courseSubjectIds =
      idsFrom(
        courseSubjects,
        'id',
      )

    const subjectIds =
      idsFrom(
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
       غياب + تأخر فقط من supervision_records
       ----------------------------------------------------- */

    const teacherAttendanceRecords =
      supervisionRecords.filter(
        (row) =>
          row.type ===
            'teacher_absent' ||
          row.type ===
            'teacher_late',
      )

    /* -----------------------------------------------------
       الرحلات
       ----------------------------------------------------- */

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
                EMPTY_UUID,
              )
            },
          )
        : []

    /* -----------------------------------------------------
       المعلمون المرتبطون بالسنة
       ----------------------------------------------------- */

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

    const courseSubjectTeacherIds =
      Array.from(
        new Set(
          courseSubjectTeachers
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

    const supervisionTeacherIds =
      Array.from(
        new Set(
          supervisionRecords
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
            filterByIds(
              levelIds,
            ),
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

    const dynamicFields =
      await getAll(
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

    /* =====================================================
       خرائط الأسماء
       ===================================================== */

    const academicYearMap =
      makeMap(
        [academicYear],
        'id',
        'name',
      )

    const studentMap =
      makeMap(
        students,
        'id',
        'name',
      )

    const levelMap =
      makeMap(
        levels,
        'id',
        'name',
      )

    const classMap =
      makeMap(
        classes,
        'id',
        'name',
      )

    const courseMap =
      makeMap(
        courses,
        'id',
        'name',
      )

    const teacherMap =
      makeMap(
        teachers,
        'id',
        'name',
      )

    const subjectMap =
      makeMap(
        subjects,
        'id',
        'name',
      )

    const courseSubjectMap =
      new Map<
        string,
        string
      >()

    for (
      const row of courseSubjects
    ) {
      if (
        typeof row.id !==
        'string'
      ) {
        continue
      }

      const courseName =
        typeof row.course_id ===
          'string'
          ? courseMap.get(
              row.course_id,
            )
          : undefined

      const subjectName =
        typeof row.subject_id ===
          'string'
          ? subjectMap.get(
              row.subject_id,
            )
          : undefined

      const parts =
        [
          courseName,
          subjectName,
        ].filter(
          Boolean,
        )

      courseSubjectMap.set(
        row.id,
        parts.length > 0
          ? parts.join(
              ' - ',
            )
          : row.id,
      )
    }

    const enrollmentMap =
      new Map<
        string,
        string
      >()

    for (
      const row of enrollments
    ) {
      if (
        typeof row.id !==
        'string'
      ) {
        continue
      }

      const studentName =
        typeof row.student_id ===
          'string'
          ? studentMap.get(
              row.student_id,
            )
          : undefined

      const levelName =
        typeof row.level_id ===
          'string'
          ? levelMap.get(
              row.level_id,
            )
          : undefined

      const className =
        typeof row.class_id ===
          'string'
          ? classMap.get(
              row.class_id,
            )
          : undefined

      const parts =
        [
          studentName,
          levelName,
          className,
        ].filter(
          Boolean,
        )

      enrollmentMap.set(
        row.id,
        parts.length > 0
          ? parts.join(
              ' - ',
            )
          : row.id,
      )
    }

    const tripMap =
      makeMap(
        trips,
        'id',
        'name',
      )

    const attendanceStatusMap =
      makeMap(
        attendanceStatuses,
        'id',
        'name',
      )

    const customFieldMap =
      makeMap(
        customFields,
        'id',
        'name',
      )

    const dynamicFieldMap =
      makeMap(
        dynamicFields,
        'id',
        'name',
      )

    const context: RowContext =
      {
        academicYears:
          academicYearMap,

        students:
          studentMap,

        enrollments:
          enrollmentMap,

        levels:
          levelMap,

        classes:
          classMap,

        courses:
          courseMap,

        teachers:
          teacherMap,

        subjects:
          subjectMap,

        courseSubjects:
          courseSubjectMap,

        trips:
          tripMap,

        attendanceStatuses:
          attendanceStatusMap,

        customFields:
          customFieldMap,

        dynamicFields:
          dynamicFieldMap,
      }

    /* =====================================================
       إنشاء Excel
       ===================================================== */

    const workbook =
      XLSX.utils.book_new()

    /* -----------------------------------------------------
       معلومات النسخة
       ----------------------------------------------------- */

    appendSheet(
      workbook,
      'معلومات النسخة',
      [
        {
          'السنة الدراسية':
            academicYear.name,

          'معرف السنة الدراسية':
            academicYear.id,

          'تاريخ البداية':
            academicYear.start_date,

          'تاريخ النهاية':
            academicYear.end_date,

          'السنة الحالية':
            readableBoolean(
              academicYear.is_current,
            ),

          'السنة مفعلة':
            readableBoolean(
              academicYear.is_active,
            ),

          'الرسوم السنوية':
            academicYear.annual_fee,

          'تاريخ إنشاء النسخة':
            new Date().toISOString(),
        },
      ],
    )

    /* -----------------------------------------------------
       السنوات الدراسية
       ----------------------------------------------------- */

    appendSheet(
      workbook,
      'السنوات الدراسية',
      [academicYear],
      context,
    )

    /* -----------------------------------------------------
       الطلاب
       ----------------------------------------------------- */

    appendSheet(
      workbook,
      'الطلاب',
      students,
      context,
      [
        {
          column:
            'academic_year_id',

          label:
            'السنة الدراسية',

          lookup:
            academicYearMap,
        },
      ],
    )

    /* -----------------------------------------------------
       الانتسابات
       ----------------------------------------------------- */

    appendSheet(
      workbook,
      'انتساب الطلاب',
      enrollments,
      context,
      [
        {
          column:
            'student_id',

          label:
            'الطالب',

          lookup:
            studentMap,
        },
        {
          column:
            'academic_year_id',

          label:
            'السنة الدراسية',

          lookup:
            academicYearMap,
        },
        {
          column:
            'level_id',

          label:
            'المستوى',

          lookup:
            levelMap,
        },
        {
          column:
            'class_id',

          label:
            'الفصل',

          lookup:
            classMap,
        },
      ],
    )

    /* -----------------------------------------------------
       المستويات
       ----------------------------------------------------- */

    appendSheet(
      workbook,
      'المستويات',
      levels,
      context,
    )

    /* -----------------------------------------------------
       الفصول
       ----------------------------------------------------- */

    appendSheet(
      workbook,
      'الفصول',
      classes,
      context,
      [
        {
          column:
            'level_id',

          label:
            'المستوى',

          lookup:
            levelMap,
        },
        {
          column:
            'academic_year_id',

          label:
            'السنة الدراسية',

          lookup:
            academicYearMap,
        },
      ],
    )

    /* -----------------------------------------------------
       المواد والدورات
       ----------------------------------------------------- */

    appendSheet(
      workbook,
      'المواد والدورات',
      courses,
      context,
      [
        {
          column:
            'academic_year_id',

          label:
            'السنة الدراسية',

          lookup:
            academicYearMap,
        },
      ],
    )

    /* -----------------------------------------------------
       المواد
       ----------------------------------------------------- */

    appendSheet(
      workbook,
      'المواد',
      subjects,
      context,
    )

    /* -----------------------------------------------------
       مواد الدورات
       ----------------------------------------------------- */

    appendSheet(
      workbook,
      'مواد الدورات',
      courseSubjects,
      context,
      [
        {
          column:
            'course_id',

          label:
            'الدورة',

          lookup:
            courseMap,
        },
        {
          column:
            'subject_id',

          label:
            'المادة',

          lookup:
            subjectMap,
        },
      ],
    )
    /* -----------------------------------------------------
       المدفوعات
       ----------------------------------------------------- */

    appendSheet(
      workbook,
      'المدفوعات',
      payments,
      context,
      [
        {
          column:
            'student_id',

          label:
            'الطالب',

          lookup:
            studentMap,
        },
        {
          column:
            'academic_year_id',

          label:
            'السنة الدراسية',

          lookup:
            academicYearMap,
        },
      ],
    )

    /* -----------------------------------------------------
       طلبات التسجيل
       ----------------------------------------------------- */

    appendSheet(
      workbook,
      'طلبات التسجيل',
      registrationRequests,
      context,
      [
        {
          column:
            'academic_year_id',

          label:
            'السنة الدراسية',

          lookup:
            academicYearMap,
        },
        {
          column:
            'level_id',

          label:
            'المستوى',

          lookup:
            levelMap,
        },
        {
          column:
            'class_id',

          label:
            'الفصل',

          lookup:
            classMap,
        },
        {
          column:
            'student_id',

          label:
            'الطالب',

          lookup:
            studentMap,
        },
        {
          column:
            'reviewed_by',

          label:
            'مراجع الطلب - المعرف الداخلي',
        },
      ],
    )

    /* -----------------------------------------------------
       التسجيلات
       ----------------------------------------------------- */

    appendSheet(
      workbook,
      'التسجيلات',
      registrations,
      context,
      [
        {
          column:
            'academic_year_id',

          label:
            'السنة الدراسية',

          lookup:
            academicYearMap,
        },
        {
          column:
            'level_id',

          label:
            'المستوى',

          lookup:
            levelMap,
        },
        {
          column:
            'class_id',

          label:
            'الفصل',

          lookup:
            classMap,
        },
      ],
    )

    /* -----------------------------------------------------
       الإعدادات المالية
       ----------------------------------------------------- */

    appendSheet(
      workbook,
      'إعدادات المالية',
      financialSettings,
      context,
      [
        {
          column:
            'academic_year_id',

          label:
            'السنة الدراسية',

          lookup:
            academicYearMap,
        },
      ],
    )

    /* -----------------------------------------------------
       الحركات المالية
       ----------------------------------------------------- */

    appendSheet(
      workbook,
      'الحركات المالية',
      financialTransactions,
      context,
      [
        {
          column:
            'academic_year_id',

          label:
            'السنة الدراسية',

          lookup:
            academicYearMap,
        },
        {
          column:
            'student_id',

          label:
            'الطالب',

          lookup:
            studentMap,
        },
        {
          column:
            'payment_id',

          label:
            'معرف الدفعة',
        },
      ],
    )

    /* -----------------------------------------------------
       الحضور
       ----------------------------------------------------- */

    appendSheet(
      workbook,
      'الحضور',
      attendance,
      context,
      [
        {
          column:
            'student_id',

          label:
            'الطالب',

          lookup:
            studentMap,
        },
        {
          column:
            'enrollment_id',

          label:
            'انتساب الطالب',

          lookup:
            enrollmentMap,
        },
        {
          column:
            'course_id',

          label:
            'المادة',

          lookup:
            courseMap,
        },
        {
          column:
            'status_id',

          label:
            'حالة الحضور',

          lookup:
            attendanceStatusMap,
        },
      ],
    )

    /* -----------------------------------------------------
       حالات الحضور
       ----------------------------------------------------- */

    appendSheet(
      workbook,
      'حالات الحضور',
      attendanceStatuses,
      context,
    )

    /* -----------------------------------------------------
       المعلمون
       ----------------------------------------------------- */

    appendSheet(
      workbook,
      'المعلمون',
      teachers,
      context,
    )

    /* -----------------------------------------------------
       معلمو الدورات
       ----------------------------------------------------- */

    appendSheet(
      workbook,
      'معلمو الدورات',
      courseTeachers,
      context,
      [
        {
          column:
            'course_id',

          label:
            'الدورة',

          lookup:
            courseMap,
        },
        {
          column:
            'teacher_id',

          label:
            'المعلم',

          lookup:
            teacherMap,
        },
      ],
    )

    /* -----------------------------------------------------
       معلمو المواد
       ----------------------------------------------------- */

    appendSheet(
      workbook,
      'معلمو المواد',
      courseSubjectTeachers,
      context,
      [
        {
          column:
            'course_subject_id',

          label:
            'مادة الدورة',

          lookup:
            courseSubjectMap,
        },
        {
          column:
            'teacher_id',

          label:
            'المعلم',

          lookup:
            teacherMap,
        },
      ],
    )

    /* -----------------------------------------------------
       تعيين الطلاب للمعلمين
       ----------------------------------------------------- */

    appendSheet(
      workbook,
      'تعيين الطلاب للمعلمين',
      teacherStudentAssignments,
      context,
      [
        {
          column:
            'course_id',

          label:
            'المادة',

          lookup:
            courseMap,
        },
        {
          column:
            'teacher_id',

          label:
            'المعلم',

          lookup:
            teacherMap,
        },
        {
          column:
            'student_id',

          label:
            'الطالب',

          lookup:
            studentMap,
        },
      ],
    )

    /* -----------------------------------------------------
       سجل حضور المعلمين
       غياب + تأخر
       ----------------------------------------------------- */

    appendSheet(
      workbook,
      'سجل حضور المعلمين',
      teacherAttendanceRecords,
      context,
      [
        {
          column:
            'academic_year_id',

          label:
            'السنة الدراسية',

          lookup:
            academicYearMap,
        },
        {
          column:
            'course_id',

          label:
            'الدورة',

          lookup:
            courseMap,
        },
        {
          column:
            'teacher_id',

          label:
            'المعلم',

          lookup:
            teacherMap,
        },
      ],
    )

    /* -----------------------------------------------------
       القيم الديناميكية للطلاب
       ----------------------------------------------------- */

    appendSheet(
      workbook,
      'القيم الديناميكية للطلاب',
      studentDynamicValues,
      context,
      [
        {
          column:
            'student_id',

          label:
            'الطالب',

          lookup:
            studentMap,
        },
        {
          column:
            'field_id',

          label:
            'الحقل',

          lookup:
            dynamicFieldMap,
        },
      ],
    )

    /* -----------------------------------------------------
       الحقول الديناميكية
       ----------------------------------------------------- */

    appendSheet(
      workbook,
      'الحقول الديناميكية',
      dynamicFields,
      context,
    )

    /* -----------------------------------------------------
       الحقول المخصصة
       ----------------------------------------------------- */

    appendSheet(
      workbook,
      'الحقول المخصصة',
      customFields,
      context,
    )

    /* -----------------------------------------------------
       خيارات الحقول المخصصة
       ----------------------------------------------------- */

    appendSheet(
      workbook,
      'خيارات الحقول المخصصة',
      customFieldOptions,
      context,
      [
        {
          column:
            'custom_field_id',

          label:
            'الحقل المخصص',

          lookup:
            customFieldMap,
        },
      ],
    )

    /* -----------------------------------------------------
       ظهور الحقول المخصصة
       ----------------------------------------------------- */

    appendSheet(
      workbook,
      'ظهور الحقول المخصصة',
      customFieldVisibility,
      context,
      [
        {
          column:
            'custom_field_id',

          label:
            'الحقل المخصص',

          lookup:
            customFieldMap,
        },
      ],
    )

    /* -----------------------------------------------------
       قيم الحقول المخصصة
       ----------------------------------------------------- */

    appendSheet(
      workbook,
      'قيم الحقول المخصصة',
      customFieldValues,
      context,
      [
        {
          column:
            'custom_field_id',

          label:
            'الحقل المخصص',

          lookup:
            customFieldMap,
        },
        {
          column:
            'record_id',

          label:
            'السجل المرتبط',
        },
      ],
    )

    /* -----------------------------------------------------
       سجلات الإشراف
       ----------------------------------------------------- */

    appendSheet(
      workbook,
      'سجلات الإشراف',
      supervisionRecords,
      context,
      [
        {
          column:
            'academic_year_id',

          label:
            'السنة الدراسية',

          lookup:
            academicYearMap,
        },
        {
          column:
            'course_id',

          label:
            'الدورة',

          lookup:
            courseMap,
        },
        {
          column:
            'teacher_id',

          label:
            'المعلم',

          lookup:
            teacherMap,
        },
      ],
    )

    /* -----------------------------------------------------
       الرحلات
       ----------------------------------------------------- */

    appendSheet(
      workbook,
      'الرحلات',
      trips,
      context,
      [
        {
          column:
            'academic_year_id',

          label:
            'السنة الدراسية',

          lookup:
            academicYearMap,
        },
        {
          column:
            'course_id',

          label:
            'المادة',

          lookup:
            courseMap,
        },
      ],
    )

    /* -----------------------------------------------------
       مستويات الرحلات
       ----------------------------------------------------- */

    appendSheet(
      workbook,
      'مستويات الرحلات',
      tripLevels,
      context,
      [
        {
          column:
            'trip_id',

          label:
            'الرحلة',

          lookup:
            tripMap,
        },
        {
          column:
            'level_id',

          label:
            'المستوى',

          lookup:
            levelMap,
        },
      ],
    )

    /* -----------------------------------------------------
       طلاب الرحلات
       ----------------------------------------------------- */

    appendSheet(
      workbook,
      'طلاب الرحلات',
      tripStudents,
      context,
      [
        {
          column:
            'trip_id',

          label:
            'الرحلة',

          lookup:
            tripMap,
        },
        {
          column:
            'student_id',

          label:
            'الطالب',

          lookup:
            studentMap,
        },
        {
          column:
            'enrollment_id',

          label:
            'انتساب الطالب',

          lookup:
            enrollmentMap,
        },
      ],
    )

    /* =====================================================
       إنشاء الملف
       ===================================================== */

    const buffer =
      XLSX.write(
        workbook,
        {
          bookType:
            'xlsx',

          type:
            'buffer',
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
