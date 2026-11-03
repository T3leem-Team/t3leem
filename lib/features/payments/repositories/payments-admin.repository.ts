import 'server-only'

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
)

/**
 * تحميل سجل دفعات طالب في سنة دراسية محددة.
 */
export async function loadStudentPaymentHistory(
  studentId: string,
  academicYearId: string,
) {
  return await supabaseAdmin
    .from('payments')
    .select(`
      id,
      student_id,
      academic_year_id,
      amount,
      payment_method,
      payment_date,
      reference_number,
      notes,
      created_at
    `)
    .eq('student_id', studentId)
    .eq('academic_year_id', academicYearId)
    .order('payment_date', {
      ascending: false,
    })
    .order('created_at', {
      ascending: false,
    })
}

/**
 * تحميل السنة الدراسية الحالية.
 */
export async function loadCurrentPaymentsAcademicYear() {
  return await supabaseAdmin
    .from('academic_years')
    .select('id, name, annual_fee')
    .eq('is_current', true)
    .eq('is_active', true)
    .maybeSingle()
}

/**
 * تحميل سنة دراسية محددة بشرط أن تكون الحالية والنشطة.
 */
export async function loadActivePaymentsAcademicYear(
  academicYearId: string,
) {
  return await supabaseAdmin
    .from('academic_years')
    .select('id, name, annual_fee')
    .eq('id', academicYearId)
    .eq('is_current', true)
    .eq('is_active', true)
    .maybeSingle()
}

/**
 * تحميل الطلاب.
 */
export async function loadPaymentsStudents() {
  return await supabaseAdmin
    .from('students')
    .select(
      'id, name, personal_id, fee_exempt, created_at',
    )
    .order('created_at', {
      ascending: false,
    })
}

/**
 * تحميل صفحة من الطلاب مع البحث في جميع السجلات.
 */
export async function loadPaymentsStudentsPage(
  page: number = 0,
  pageSize: number = 50,
  search: string = '',
) {
  const safePage = Math.max(0, page)
  const safePageSize = Math.min(
    100,
    Math.max(1, pageSize),
  )

  const from = safePage * safePageSize
  const to = from + safePageSize - 1

  let query = supabaseAdmin
    .from('students')
    .select(
      'id, name, personal_id, fee_exempt, created_at',
      { count: 'exact' },
    )
    .order('created_at', {
      ascending: false,
    })
    .range(from, to)

  const searchTerm = search.trim()

  if (searchTerm) {
    const safeSearch = searchTerm
      .replace(/[,%()\\]/g, '')
      .replace(/\./g, '')

    if (safeSearch) {
      query = query.or(
        `name.ilike.%${safeSearch}%,personal_id.ilike.%${safeSearch}%`,
      )
    }
  }

  return await query
}

/**
 * تحميل تسجيلات الطلاب للسنة الدراسية.
 */
export async function loadPaymentsEnrollments(
  academicYearId: string,
) {
  return await supabaseAdmin
    .from('enrollments')
    .select('student_id, level_id, course_id')
    .eq('academic_year_id', academicYearId)
    .eq('status', 'نشط')
}

/**
 * تحميل تسجيلات مجموعة محددة من الطلاب.
 */
export async function loadPaymentsEnrollmentsForStudents(
  academicYearId: string,
  studentIds: string[],
) {
  if (studentIds.length === 0) {
    return {
      data: [],
      error: null,
    }
  }

  return await supabaseAdmin
    .from('enrollments')
    .select('student_id, level_id, course_id')
    .eq('academic_year_id', academicYearId)
    .eq('status', 'نشط')
    .in('student_id', studentIds)
}

/**
 * تحميل دفعات السنة الدراسية.
 */
export async function loadPaymentsByAcademicYear(
  academicYearId: string,
) {
  return await supabaseAdmin
    .from('payments')
    .select(`
      id,
      student_id,
      academic_year_id,
      course_id,
      amount,
      payment_method,
      payment_date,
      reference_number,
      notes,
      created_at
    `)
    .eq('academic_year_id', academicYearId)
    .order('payment_date', {
      ascending: false,
    })
    .order('created_at', {
      ascending: false,
    })
}

/**
 * تحميل دفعات مجموعة محددة من الطلاب فقط.
 */
export async function loadPaymentsForStudents(
  academicYearId: string,
  studentIds: string[],
) {
  if (studentIds.length === 0) {
    return {
      data: [],
      error: null,
    }
  }

  return await supabaseAdmin
    .from('payments')
    .select(`
      id,
      student_id,
      academic_year_id,
      course_id,
      amount,
      payment_method,
      payment_date,
      reference_number,
      notes,
      created_at
    `)
    .eq('academic_year_id', academicYearId)
    .in('student_id', studentIds)
    .order('payment_date', {
      ascending: false,
    })
    .order('created_at', {
      ascending: false,
    })
}

/**
 * تحميل المستويات النشطة.
 */
export async function loadActivePaymentLevels() {
  return await supabaseAdmin
    .from('levels')
    .select('id, name, sort_order')
    .eq('is_active', true)
    .order('sort_order', {
      ascending: true,
      nullsFirst: false,
    })
}

/**
 * تحميل طالب محدد لإضافة أو تعديل دفعة.
 */
export async function loadPaymentStudent(
  studentId: string,
) {
  return await supabaseAdmin
    .from('students')
    .select('id, name, personal_id, fee_exempt')
    .eq('id', studentId)
    .maybeSingle()
}

/**
 * تحميل تسجيل الطالب النشط.
 */
export async function loadActivePaymentEnrollment(
  studentId: string,
  academicYearId: string,
) {
  return await supabaseAdmin
    .from('enrollments')
    .select('id, course_id')
    .eq('student_id', studentId)
    .eq('academic_year_id', academicYearId)
    .eq('status', 'نشط')
    .maybeSingle()
}

/**
 * تحميل تسجيل الطالب النشط مع course_id.
 * يستخدم عند الحاجة لتحديد كورس دفعة قديمة.
 */
export async function loadPaymentEnrollmentCourse(
  studentId: string,
  academicYearId: string,
) {
  return await supabaseAdmin
    .from('enrollments')
    .select('course_id')
    .eq('student_id', studentId)
    .eq('academic_year_id', academicYearId)
    .eq('status', 'نشط')
    .maybeSingle()
}

/**
 * تحميل الكورسات للسنة الدراسية.
 * نطلب سجلين كحد أقصى حتى نعرف هل يوجد كورس وحيد.
 */
export async function loadPaymentCourses(
  academicYearId: string,
) {
  return await supabaseAdmin
    .from('courses')
    .select('id')
    .eq('academic_year_id', academicYearId)
    .limit(2)
}

/**
 * تحميل مبالغ دفعات الطالب في السنة الدراسية.
 */
export async function loadStudentPaymentsForYear(
  studentId: string,
  academicYearId: string,
) {
  return await supabaseAdmin
    .from('payments')
    .select('amount')
    .eq('student_id', studentId)
    .eq('academic_year_id', academicYearId)
}

/**
 * تحميل مبالغ دفعات الطالب باستثناء دفعة محددة.
 */
export async function loadOtherStudentPaymentsForYear(
  studentId: string,
  academicYearId: string,
  excludedPaymentId: string,
) {
  return await supabaseAdmin
    .from('payments')
    .select('amount')
    .eq('student_id', studentId)
    .eq('academic_year_id', academicYearId)
    .neq('id', excludedPaymentId)
}

/**
 * تحميل دفعة محددة للتعديل.
 */
export async function loadPaymentForUpdate(
  paymentId: string,
) {
  return await supabaseAdmin
    .from('payments')
    .select(`
      id,
      student_id,
      academic_year_id,
      course_id,
      amount
    `)
    .eq('id', paymentId)
    .maybeSingle()
}

const PAYMENT_RETURN_FIELDS = `
  id,
  student_id,
  academic_year_id,
  course_id,
  amount,
  payment_method,
  payment_date,
  reference_number,
  notes,
  created_at
`

export type StudentPaymentInput = {
  student_id: string
  academic_year_id: string
  course_id: string
  amount: number
  payment_method: string
  payment_date: string
  reference_number: string | null
  notes: string | null
}

export type UpdateStudentPaymentInput = {
  course_id: string
  amount: number
  payment_method: string
  payment_date: string
  reference_number: string | null
  notes: string | null
}

/**
 * إنشاء دفعة طالب.
 */
export async function insertStudentPayment(
  input: StudentPaymentInput,
) {
  return await supabaseAdmin
    .from('payments')
    .insert(input)
    .select(PAYMENT_RETURN_FIELDS)
    .single()
}

/**
 * تحديث دفعة طالب.
 */
export async function updateStudentPayment(
  paymentId: string,
  input: UpdateStudentPaymentInput,
) {
  return await supabaseAdmin
    .from('payments')
    .update(input)
    .eq('id', paymentId)
    .select(PAYMENT_RETURN_FIELDS)
    .single()
}

/**
 * حساب إحصائيات المدفوعات لجميع الطلاب
 * المسجلين في السنة الدراسية الحالية.
 *
 * تتم قراءة البيانات على دفعات داخل السيرفر.
 * لا يتم إرسال جميع سجلات الطلاب أو الدفعات للواجهة.
 */
export async function loadPaymentsSummary(
  academicYearId: string,
  annualFee: number,
) {
  try {
    const batchSize = 1000

    const studentIds = new Set<string>()

    // تحميل جميع التسجيلات النشطة على دفعات.
    let enrollmentFrom = 0

    while (true) {
      const {
        data: enrollments,
        error: enrollmentsError,
      } = await supabaseAdmin
        .from('enrollments')
        .select('student_id')
        .eq('academic_year_id', academicYearId)
        .eq('status', 'نشط')
        .range(
          enrollmentFrom,
          enrollmentFrom + batchSize - 1,
        )

      if (enrollmentsError) {
        throw enrollmentsError
      }

      const rows = enrollments ?? []

      for (const enrollment of rows) {
        if (enrollment.student_id) {
          studentIds.add(enrollment.student_id)
        }
      }

      if (rows.length < batchSize) {
        break
      }

      enrollmentFrom += batchSize
    }

    const uniqueStudentIds = Array.from(studentIds)

    let totalExempt = 0

    // تحميل حالة الإعفاء للطلاب المسجلين فقط.
    for (
      let i = 0;
      i < uniqueStudentIds.length;
      i += 500
    ) {
      const batch = uniqueStudentIds.slice(
        i,
        i + 500,
      )

      if (batch.length === 0) continue

      const {
        data: students,
        error: studentsError,
      } = await supabaseAdmin
        .from('students')
        .select('id, fee_exempt')
        .in('id', batch)

      if (studentsError) {
        throw studentsError
      }

      totalExempt += (students ?? []).filter(
        (student) => student.fee_exempt === true,
      ).length
    }

    // حساب مجموع الدفعات على دفعات.
    let totalPaid = 0
    let paymentFrom = 0

    while (true) {
      const {
        data: payments,
        error: paymentsError,
      } = await supabaseAdmin
        .from('payments')
        .select('amount')
        .eq('academic_year_id', academicYearId)
        .range(
          paymentFrom,
          paymentFrom + batchSize - 1,
        )

      if (paymentsError) {
        throw paymentsError
      }

      const rows = payments ?? []

      totalPaid += rows.reduce(
        (total, payment) =>
          total + Number(payment.amount ?? 0),
        0,
      )

      if (rows.length < batchSize) {
        break
      }

      paymentFrom += batchSize
    }

    const totalStudents = uniqueStudentIds.length

    const totalDue =
      Math.max(totalStudents - totalExempt, 0) *
      Number(annualFee ?? 0)

    return {
      data: {
        totalStudents,
        totalExempt,
        totalDue: Number(totalDue.toFixed(3)),
        totalPaid: Number(totalPaid.toFixed(3)),
      },
      error: null,
    }
  } catch (error) {
    return {
      data: null,
      error,
    }
  }
}
