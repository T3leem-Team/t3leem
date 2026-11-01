'use client'

import { supabase } from '@/lib/supabase'

import type {
  AcademicYear,
  FinancialSettings,
  PaymentRecord,
  StudentPaymentRow,
  StudentRecord,
  Summary,
  Transaction,
} from '@/app/(dashboard)/payments/financial/payment-financial.types'

import { emptySummary } from '@/app/(dashboard)/payments/financial/payment-financial.utils'

type FinancialData = {
  settings: FinancialSettings | null
  transactions: Transaction[]
  summary: Summary
}

type FinancialManagementResponse = {
  settings?: FinancialSettings | null
  transactions?: Transaction[]
  summary?: Summary
  error?: string
}

type FinancialTransactionPayload = {
  action:
    | 'initialize'
    | 'reset'
    | 'create'
    | 'confirm'
    | 'delete'
  [key: string]: unknown
}

async function postFinancialTransaction(
  payload: FinancialTransactionPayload
): Promise<FinancialManagementResponse> {
  const response = await fetch(
    '/api/financial-management/transactions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  )

  const result = await response.json()

  if (!response.ok) {
    throw new Error(
      result?.error || 'تعذر تنفيذ العملية المالية'
    )
  }

  return result
}

/*
 * جلب السنة الدراسية الحالية
 */
export async function loadFinancialAcademicYear(): Promise<AcademicYear> {
  const { data, error } = await supabase
    .from('academic_years')
    .select(
      'id, name, start_date, end_date, is_current, is_active, annual_fee'
    )
    .eq('is_current', true)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error(
      'لا توجد سنة دراسية حالية في النظام'
    )
  }

  return data as AcademicYear
}

/*
 * تحميل بيانات الإدارة المالية
 */
export async function loadFinancialManagementData(
  yearId: string
): Promise<FinancialData> {
  const response = await fetch(
    `/api/financial-management?academic_year_id=${encodeURIComponent(
      yearId
    )}`,
    {
      cache: 'no-store',
    }
  )

  const result =
    (await response.json()) as FinancialManagementResponse

  if (!response.ok) {
    throw new Error(
      result?.error ||
        'تعذر تحميل الإدارة المالية'
    )
  }

  return {
    settings: result.settings || null,
    transactions: result.transactions || [],
    summary: result.summary || emptySummary,
  }
}

/*
 * تحميل الطلاب والمدفوعات المرتبطة بالإدارة المالية
 */
export async function loadFinancialStudentPayments(
  yearId: string,
  annualFee: number,
  currentTransactions: Transaction[]
): Promise<StudentPaymentRow[]> {
  const studentPaymentTransactions =
    currentTransactions.filter(
      (transaction) =>
        transaction.source_type === 'student_payment' &&
        Boolean(transaction.payment_id) &&
        Boolean(transaction.student_id)
    )

  if (studentPaymentTransactions.length === 0) {
    return []
  }

  const studentIds = Array.from(
    new Set(
      studentPaymentTransactions
        .map((transaction) => transaction.student_id)
        .filter(Boolean) as string[]
    )
  )

  const paymentIds = Array.from(
    new Set(
      studentPaymentTransactions
        .map((transaction) => transaction.payment_id)
        .filter(Boolean) as string[]
    )
  )

  if (
    studentIds.length === 0 ||
    paymentIds.length === 0
  ) {
    return []
  }

  const [
    { data: students, error: studentsError },
    { data: payments, error: paymentsError },
  ] = await Promise.all([
    supabase
      .from('students')
      .select(
        'id, name, personal_id, fee_exempt'
      )
      .in('id', studentIds),

    supabase
      .from('payments')
      .select(
        'id, student_id, amount, payment_method, payment_date, reference_number, notes'
      )
      .eq('academic_year_id', yearId)
      .in('student_id', studentIds)
      .order('payment_date', {
        ascending: false,
      }),
  ])

  if (studentsError) {
    throw new Error(studentsError.message)
  }

  if (paymentsError) {
    throw new Error(paymentsError.message)
  }

  const studentRecords =
    (students || []) as StudentRecord[]

  const paymentRecords =
    (payments || []) as PaymentRecord[]

  const paymentsByStudent = new Map<
    string,
    PaymentRecord[]
  >()

  for (const payment of paymentRecords) {
    const current =
      paymentsByStudent.get(payment.student_id) || []

    current.push(payment)

    paymentsByStudent.set(
      payment.student_id,
      current
    )
  }

  const transactionsByPaymentId =
    new Map<string, Transaction>()

  for (const transaction of currentTransactions) {
    if (
      transaction.source_type === 'student_payment' &&
      transaction.payment_id
    ) {
      transactionsByPaymentId.set(
        transaction.payment_id,
        transaction
      )
    }
  }

  const rows: StudentPaymentRow[] =
    studentRecords
      .map((student) => {
        const studentPaymentRows =
          paymentsByStudent.get(student.id) || []

        const linkedPayments =
          studentPaymentRows.filter((payment) =>
            transactionsByPaymentId.has(payment.id)
          )

        if (linkedPayments.length === 0) {
          return null
        }

        const paidAmount =
          studentPaymentRows.reduce(
            (total, payment) =>
              total + Number(payment.amount || 0),
            0
          )

        const feeExempt =
          Boolean(student.fee_exempt)

        let status:
          | 'paid'
          | 'partial'
          | 'exempt'
          | 'unpaid'

        if (feeExempt) {
          status = 'exempt'
        } else if (
          annualFee > 0 &&
          paidAmount >= annualFee
        ) {
          status = 'paid'
        } else if (paidAmount > 0) {
          status = 'partial'
        } else {
          status = 'unpaid'
        }

        const latestLinkedPayment =
          linkedPayments[0] || null

        const pendingCount =
          linkedPayments.filter(
            (payment) =>
              transactionsByPaymentId.get(payment.id)
                ?.confirmation_status === 'pending'
          ).length

        const latestTransaction =
          latestLinkedPayment
            ? transactionsByPaymentId.get(
                latestLinkedPayment.id
              ) || null
            : null

        return {
          studentId: student.id,
          name: student.name || 'بدون اسم',
          personalId: student.personal_id || null,
          feeExempt,
          annualFee,
          paidAmount,
          remaining: feeExempt
            ? 0
            : Math.max(annualFee - paidAmount, 0),
          status,
          latestPaymentMethod:
            latestLinkedPayment?.payment_method || null,
          latestPaymentDate:
            latestLinkedPayment?.payment_date || null,
          latestPaymentId:
            latestLinkedPayment?.id || null,
          latestTransaction,
          pendingCount,
        }
      })
      .filter(
        (row): row is StudentPaymentRow =>
          row !== null
      )

  return rows.filter(
    (row) =>
      row.status === 'partial' ||
      row.status === 'paid' ||
      row.status === 'exempt'
  )
}

/*
 * تهيئة الإدارة المالية
 */
export async function initializeFinancialManagement(
  payload: Omit<FinancialTransactionPayload, 'action'>
) {
  return postFinancialTransaction({
    ...payload,
    action: 'initialize',
  })
}

/*
 * إعادة تهيئة الإدارة المالية
 */
export async function resetFinancialManagement(
  payload: Omit<FinancialTransactionPayload, 'action'>
) {
  return postFinancialTransaction({
    ...payload,
    action: 'reset',
  })
}

/*
 * إضافة عملية مالية
 */
export async function createFinancialTransaction(
  payload: Omit<FinancialTransactionPayload, 'action'>
) {
  return postFinancialTransaction({
    ...payload,
    action: 'create',
  })
}

/*
 * تأكيد عملية مالية
 */
export async function confirmFinancialTransaction(
  payload: Omit<FinancialTransactionPayload, 'action'>
) {
  return postFinancialTransaction({
    ...payload,
    action: 'confirm',
  })
}

/*
 * حذف عملية مالية
 */
export async function deleteFinancialTransaction(
  payload: Omit<FinancialTransactionPayload, 'action'>
) {
  return postFinancialTransaction({
    ...payload,
    action: 'delete',
  })
}
