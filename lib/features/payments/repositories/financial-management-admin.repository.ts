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
 * التحقق من السنة الدراسية
 */
export async function checkFinancialAcademicYear(
  academicYearId: string,
) {
  const { data, error } = await supabaseAdmin
    .from('academic_years')
    .select('id, name, is_current, is_active')
    .eq('id', academicYearId)
    .maybeSingle()

  if (error) throw error

  return data
}

/**
 * جلب معاملة مالية محددة
 */
export async function loadFinancialTransaction(
  transactionId: string,
  academicYearId: string,
) {
  const { data, error } = await supabaseAdmin
    .from('financial_transactions')
    .select('*')
    .eq('id', transactionId)
    .eq('academic_year_id', academicYearId)
    .maybeSingle()

  if (error) throw error

  return data
}

/**
 * مزامنة الدفعات المسجلة مسبقًا مع الإدارة المالية.
 *
 * لا تنشئ معاملة مكررة للدفعة المرتبطة مسبقًا.
 * وتعتمد على course_id الموجود في سجل payments.
 */
export async function syncExistingFinancialPayments(
  academicYearId: string,
) {
  const {
    data: payments,
    error: paymentsError,
  } = await supabaseAdmin
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
      notes
    `)
    .eq('academic_year_id', academicYearId)

  if (paymentsError) throw paymentsError

  if (!payments?.length) {
    return { synced: 0 }
  }

  // لا نبدأ المزامنة إذا كانت أي دفعة تفتقد الكورس.
  const paymentsWithoutCourse = payments.filter(
    (payment) => !payment.course_id,
  )

  if (paymentsWithoutCourse.length > 0) {
    throw new Error(
      `توجد ${paymentsWithoutCourse.length} دفعة بدون course_id. تعذرت المزامنة.`,
    )
  }

  const paymentIds = payments.map(
    (payment) => payment.id,
  )

  const {
    data: existingTransactions,
    error: existingTransactionsError,
  } = await supabaseAdmin
    .from('financial_transactions')
    .select('payment_id')
    .in('payment_id', paymentIds)

  if (existingTransactionsError) {
    throw existingTransactionsError
  }

  const existingPaymentIds = new Set(
    (existingTransactions ?? [])
      .map((transaction) => transaction.payment_id)
      .filter(Boolean),
  )

  const paymentsToSync = payments.filter(
    (payment) => !existingPaymentIds.has(payment.id),
  )

  if (!paymentsToSync.length) {
    return { synced: 0 }
  }

  const studentIds = Array.from(
    new Set(
      paymentsToSync
        .map((payment) => payment.student_id)
        .filter(Boolean),
    ),
  )

  const studentsMap = new Map<
    string,
    {
      name: string | null
      personal_id: string | null
    }
  >()

  if (studentIds.length > 0) {
    const {
      data: students,
      error: studentsError,
    } = await supabaseAdmin
      .from('students')
      .select('id, name, personal_id')
      .in('id', studentIds)

    if (studentsError) throw studentsError

    for (const student of students ?? []) {
      studentsMap.set(student.id, {
        name: student.name ?? null,
        personal_id: student.personal_id ?? null,
      })
    }
  }

  const financialRows = paymentsToSync.map((payment) => {
    const student = studentsMap.get(payment.student_id)

    return {
      academic_year_id: payment.academic_year_id,
      transaction_type: 'in',
      amount: Number(Number(payment.amount).toFixed(3)),
      adjustment_direction: null,
      source_type: 'student_payment',
      source: student?.name
        ? `دفعة طالب - ${student.name}`
        : 'دفعة طالب',
      payment_id: payment.id,
      student_id: payment.student_id,
      course_id: payment.course_id,
      student_request_number: student?.personal_id ?? null,
      payment_method: payment.payment_method ?? null,
      reference_number: payment.reference_number ?? null,
      confirmation_status: 'pending',
      confirmed_by: null,
      confirmed_at: null,
      note: payment.notes ?? null,
    }
  })

  const { error: insertError } = await supabaseAdmin
    .from('financial_transactions')
    .insert(financialRows)

  if (insertError) throw insertError

  return { synced: financialRows.length }
}

/**
 * حذف معاملات السنة الدراسية فقط
 */
export async function deleteFinancialTransactionsByYear(
  academicYearId: string,
) {
  return await supabaseAdmin
    .from('financial_transactions')
    .delete()
    .eq('academic_year_id', academicYearId)
}

/**
 * حذف إعدادات السنة الدراسية فقط
 */
export async function deleteFinancialSettingsByYear(
  academicYearId: string,
) {
  return await supabaseAdmin
    .from('financial_settings')
    .delete()
    .eq('academic_year_id', academicYearId)
}

/**
 * التحقق من وجود إعداد مالي للسنة
 */
export async function loadFinancialSettingsId(
  academicYearId: string,
) {
  return await supabaseAdmin
    .from('financial_settings')
    .select('id')
    .eq('academic_year_id', academicYearId)
    .maybeSingle()
}

/**
 * إنشاء إعداد الإدارة المالية
 */
export async function insertFinancialSettings(input: {
  academic_year_id: string
  financial_mode: 'student_payments' | 'manual'
  opening_balance: number
  opening_source: string | null
  opening_note: string | null
}) {
  return await supabaseAdmin
    .from('financial_settings')
    .insert(input)
    .select()
    .single()
}

/**
 * حذف إعداد مالي عند التراجع عن تهيئة فاشلة
 */
export async function deleteFinancialSettingsById(
  settingsId: string,
) {
  return await supabaseAdmin
    .from('financial_settings')
    .delete()
    .eq('id', settingsId)
}

/**
 * تحميل إعدادات الإدارة المالية
 */
export async function loadFinancialSettings(
  academicYearId: string,
) {
  return await supabaseAdmin
    .from('financial_settings')
    .select('*')
    .eq('academic_year_id', academicYearId)
    .maybeSingle()
}

/**
 * تحميل الدفعة الأصلية
 */
export async function loadOriginalStudentPayment(
  paymentId: string,
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
      reference_number,
      notes
    `)
    .eq('id', paymentId)
    .eq('academic_year_id', academicYearId)
    .maybeSingle()
}

/**
 * التحقق من ارتباط الدفعة بمعاملة مالية سابقة
 */
export async function loadTransactionByPaymentId(
  paymentId: string,
) {
  return await supabaseAdmin
    .from('financial_transactions')
    .select('id')
    .eq('payment_id', paymentId)
    .maybeSingle()
}

/**
 * تحميل بيانات الطالب المرتبط بالدفعة
 */
export async function loadFinancialStudentIdentity(
  studentId: string,
) {
  return await supabaseAdmin
    .from('students')
    .select('name, personal_id')
    .eq('id', studentId)
    .maybeSingle()
}

/**
 * إنشاء معاملة مالية مرتبطة بدفعة طالب
 */
export async function insertStudentPaymentTransaction(input: {
  academic_year_id: string
  amount: number
  source: string
  payment_id: string
  student_id: string
  course_id: string
  student_request_number: string | null
  payment_method: string | null
  reference_number: string | null
  note: string | null
}) {
  return await supabaseAdmin
    .from('financial_transactions')
    .insert({
      academic_year_id: input.academic_year_id,
      transaction_type: 'in',
      amount: input.amount,
      adjustment_direction: null,
      source_type: 'student_payment',
      source: input.source,
      payment_id: input.payment_id,
      student_id: input.student_id,
      course_id: input.course_id,
      student_request_number: input.student_request_number,
      payment_method: input.payment_method,
      reference_number: input.reference_number,
      confirmation_status: 'pending',
      confirmed_by: null,
      confirmed_at: null,
      note: input.note,
    })
    .select()
    .single()
}

/**
 * إنشاء معاملة مالية يدوية أو تسوية
 */
export async function insertManualFinancialTransaction(input: {
  academic_year_id: string
  transaction_type: 'in' | 'out' | 'adjustment'
  amount: number
  adjustment_direction: string | null
  source_type: string
  source: string | null
  payment_id: string | null
  student_id: string | null
  course_id: string | null
  student_request_number: string | null
  payment_method: string | null
  reference_number: string | null
  confirmation_status: string
  note: string | null
}) {
  return await supabaseAdmin
    .from('financial_transactions')
    .insert({
      academic_year_id: input.academic_year_id,
      transaction_type: input.transaction_type,
      amount: input.amount,
      adjustment_direction: input.adjustment_direction,
      source_type: input.source_type,
      source: input.source,
      payment_id: input.payment_id,
      student_id: input.student_id,
      course_id: input.course_id,
      student_request_number: input.student_request_number,
      payment_method: input.payment_method,
      reference_number: input.reference_number,
      confirmation_status: input.confirmation_status,
      confirmed_by: null,
      confirmed_at: null,
      note: input.note,
    })
    .select()
    .single()
}

/**
 * تأكيد معاملة مالية
 */
export async function confirmFinancialTransactionAdmin(
  transactionId: string,
  academicYearId: string,
  confirmedAt: string,
) {
  return await supabaseAdmin
    .from('financial_transactions')
    .update({
      confirmation_status: 'confirmed',
      confirmed_at: confirmedAt,
    })
    .eq('id', transactionId)
    .eq('academic_year_id', academicYearId)
    .select()
    .single()
}

/**
 * حذف معاملة مالية فقط
 * لا يحذف سجل payments الأصلي.
 */
export async function deleteFinancialTransactionAdmin(
  transactionId: string,
  academicYearId: string,
) {
  return await supabaseAdmin
    .from('financial_transactions')
    .delete()
    .eq('id', transactionId)
    .eq('academic_year_id', academicYearId)
}

/**
 * تحديث بيانات المعاملة المرتبطة بدفعة طالب.
 *
 * لا نغيّر حالة التأكيد أو بيانات الشخص الذي أكد المعاملة.
 */
export async function updateStudentPaymentTransaction(
  transactionId: string,
  input: {
    academic_year_id: string
    amount: number
    source: string
    payment_id: string
    student_id: string
    course_id: string
    student_request_number: string | null
    payment_method: string | null
    reference_number: string | null
    note: string | null
  },
) {
  return await supabaseAdmin
    .from('financial_transactions')
    .update({
      academic_year_id: input.academic_year_id,
      transaction_type: 'in',
      amount: input.amount,
      adjustment_direction: null,
      source_type: 'student_payment',
      source: input.source,
      payment_id: input.payment_id,
      student_id: input.student_id,
      course_id: input.course_id,
      student_request_number: input.student_request_number,
      payment_method: input.payment_method,
      reference_number: input.reference_number,
      note: input.note,
    })
    .eq('id', transactionId)
}
