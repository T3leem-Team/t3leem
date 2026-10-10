'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Download,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Wallet,
  X,
  RotateCcw,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'

type FinancialMode = 'student_payments' | 'manual'
type TransactionType = 'in' | 'out' | 'adjustment'
type AdjustmentDirection = 'plus' | 'minus'

type FinancialSettings = {
  id: string
  academic_year_id: string
  financial_mode: FinancialMode
  opening_balance: number
  opening_source: string | null
  opening_note: string | null
  created_at: string
  updated_at: string
}

type Transaction = {
  id: string
  academic_year_id: string
  transaction_type: TransactionType
  amount: number
  adjustment_direction: AdjustmentDirection | null
  source_type:
    | 'student_payment'
    | 'manual'
    | 'adjustment'
    | 'opening'
  source: string | null
  payment_id: string | null
  student_id: string | null
  student_request_number: string | null
  payment_method: string | null
  reference_number: string | null
  confirmation_status: 'pending' | 'confirmed' | 'not_required'
  confirmed_by: string | null
  confirmed_at: string | null
  created_by: string | null
  created_at: string
  note: string | null
  balance_before?: number
  balance_after?: number
}

type Summary = {
  openingBalance: number
  balance: number
  totalIn: number
  totalOut: number
  totalAdjustmentsPlus: number
  totalAdjustmentsMinus: number
  operations: number
}

type ModalType =
  | 'none'
  | 'initialize'
  | 'transaction'
  | 'details'
  | 'delete'
  | 'reset'

type AcademicYear = {
  id: string
  name: string
  start_date: string
  end_date: string
  is_current: boolean
  is_active: boolean
  annual_fee: number
}

type StudentPaymentRow = {
  studentId: string
  name: string
  personalId: string | null
  feeExempt: boolean
  annualFee: number
  paidAmount: number
  remaining: number
  status:
    | 'paid'
    | 'partial'
    | 'exempt'
    | 'unpaid'
  latestPaymentMethod: string | null
  latestPaymentDate: string | null
  latestPaymentId: string | null
  latestTransaction: Transaction | null
  pendingCount: number
}

type StudentRecord = {
  id: string
  name: string | null
  personal_id: string | null
  fee_exempt: boolean | null
}

type PaymentRecord = {
  id: string
  student_id: string
  amount: number
  payment_method: string | null
  payment_date: string | null
  reference_number: string | null
  notes: string | null
}

/*
 * =========================================================
 * Cache
 * =========================================================
 */

type PaymentFinancialCache = {
  academicYear: AcademicYear | null
  settings: FinancialSettings | null
  transactions: Transaction[]
  studentPayments: StudentPaymentRow[]
  summary: Summary
}

let paymentFinancialCache:
  | PaymentFinancialCache
  | null = null

let paymentFinancialLoading = false

const emptySummary: Summary = {
  openingBalance: 0,
  balance: 0,
  totalIn: 0,
  totalOut: 0,
  totalAdjustmentsPlus: 0,
  totalAdjustmentsMinus: 0,
  operations: 0,
}

const money = (value: number) =>
  new Intl.NumberFormat('ar-BH', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(Number(value || 0))

const formatDate = (
  value: string | null | undefined
) => {
  if (!value) return '-'

  return new Intl.DateTimeFormat('ar-BH', {
    calendar: 'gregory',
    numberingSystem: 'latn',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

const formatDateOnly = (
  value: string | null | undefined
) => {
  if (!value) return '-'

  return new Intl.DateTimeFormat('ar-BH', {
    calendar: 'gregory',
    numberingSystem: 'latn',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
}

export function PaymentFinancial() {
  const [academicYear, setAcademicYear] =
    useState<AcademicYear | null>(
      paymentFinancialCache?.academicYear ?? null
    )

  const [settings, setSettings] =
    useState<FinancialSettings | null>(
      paymentFinancialCache?.settings ?? null
    )

  const [transactions, setTransactions] =
    useState<Transaction[]>(
      paymentFinancialCache?.transactions ?? []
    )

  const [studentPayments, setStudentPayments] =
    useState<StudentPaymentRow[]>(
      paymentFinancialCache?.studentPayments ?? []
    )

  const [summary, setSummary] =
    useState<Summary>(
      paymentFinancialCache?.summary ??
        emptySummary
    )

  const [loading, setLoading] = useState(
    paymentFinancialCache === null
  )

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [modal, setModal] =
    useState<ModalType>('none')

  const [
    selectedTransaction,
    setSelectedTransaction,
  ] = useState<Transaction | null>(null)

  const [selectedDeleteId, setSelectedDeleteId] =
    useState<string | null>(null)

  const [
    initializeMode,
    setInitializeMode,
  ] = useState<FinancialMode>('manual')

  const [openingBalance, setOpeningBalance] =
    useState('')

  const [openingSource, setOpeningSource] =
    useState('')

  const [openingNote, setOpeningNote] =
    useState('')

  const [
    transactionType,
    setTransactionType,
  ] = useState<TransactionType>('in')

  const [
    transactionAmount,
    setTransactionAmount,
  ] = useState('')

  const [
    transactionSource,
    setTransactionSource,
  ] = useState('')

  const [transactionNote, setTransactionNote] =
    useState('')

  const [
    adjustmentDirection,
    setAdjustmentDirection,
  ] = useState<AdjustmentDirection>('plus')

  const [refreshing, setRefreshing] =
    useState(false)

  /*
   * ---------------------------------------------------------
   * جلب السنة الدراسية الحالية
   * ---------------------------------------------------------
   */

  const loadAcademicYear = async () => {
    const { data, error: yearError } =
      await supabase
        .from('academic_years')
        .select(
          'id, name, start_date, end_date, is_current, is_active, annual_fee'
        )
        .eq('is_current', true)
        .eq('is_active', true)
        .maybeSingle()

    if (yearError) {
      throw new Error(yearError.message)
    }

    if (!data) {
      throw new Error(
        'لا توجد سنة دراسية حالية في النظام'
      )
    }

    setAcademicYear(data)

    return data
  }

  /*
   * ---------------------------------------------------------
   * تحميل الإدارة المالية
   * ---------------------------------------------------------
   */

  const loadFinancialData = async (
    yearId?: string
  ) => {
    const id =
      yearId || academicYear?.id

    if (!id) {
      return {
        settings: null,
        transactions: [] as Transaction[],
        summary: emptySummary,
      }
    }

    setError('')

    const response = await fetch(
      `/api/financial-management?academic_year_id=${encodeURIComponent(
        id
      )}`,
      {
        cache: 'no-store',
      }
    )

    const result = await response.json()

    if (!response.ok) {
      throw new Error(
        result?.error ||
          'تعذر تحميل الإدارة المالية'
      )
    }

    const nextSettings =
      result.settings || null

    const nextTransactions =
      (result.transactions || []) as Transaction[]

    const nextSummary =
      result.summary || emptySummary

    setSettings(nextSettings)
    setTransactions(nextTransactions)
    setSummary(nextSummary)

    return {
      settings:
        nextSettings as FinancialSettings | null,
      transactions: nextTransactions,
      summary: nextSummary as Summary,
    }
  }

  /*
   * ---------------------------------------------------------
   * تحميل طلاب السنة ودفعاتهم
   * ---------------------------------------------------------
   */

  const loadStudentPayments = async (
    yearId?: string,
    transactionsOverride?: Transaction[]
  ) => {
    const id =
      yearId || academicYear?.id

    if (!id) {
      return []
    }

    const currentTransactions =
      transactionsOverride ?? transactions

    const studentPaymentTransactions =
      currentTransactions.filter(
        (transaction) =>
          transaction.source_type ===
            'student_payment' &&
          Boolean(transaction.payment_id) &&
          Boolean(transaction.student_id)
      )

    if (
      studentPaymentTransactions.length ===
      0
    ) {
      setStudentPayments([])
      return []
    }

    const studentIds = Array.from(
      new Set(
        studentPaymentTransactions
          .map(
            (transaction) =>
              transaction.student_id
          )
          .filter(Boolean) as string[]
      )
    )

    const paymentIds = Array.from(
      new Set(
        studentPaymentTransactions
          .map(
            (transaction) =>
              transaction.payment_id
          )
          .filter(Boolean) as string[]
      )
    )

    if (
      studentIds.length === 0 ||
      paymentIds.length === 0
    ) {
      setStudentPayments([])
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
        .eq('academic_year_id', id)
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
        paymentsByStudent.get(
          payment.student_id
        ) || []

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
        transaction.source_type ===
          'student_payment' &&
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
            paymentsByStudent.get(student.id) ||
            []

          const linkedPayments =
            studentPaymentRows.filter(
              (payment) =>
                transactionsByPaymentId.has(
                  payment.id
                )
            )

          if (linkedPayments.length === 0) {
            return null
          }

          const paidAmount =
            studentPaymentRows.reduce(
              (total, payment) =>
                total +
                Number(payment.amount || 0),
              0
            )

          const feeExempt =
            Boolean(student.fee_exempt)

          const annualFee = Number(
            academicYear?.annual_fee || 0
          )

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
                transactionsByPaymentId.get(
                  payment.id
                )?.confirmation_status ===
                'pending'
            ).length

          const latestTransaction =
            latestLinkedPayment
              ? transactionsByPaymentId.get(
                  latestLinkedPayment.id
                ) || null
              : null

          return {
            studentId: student.id,
            name:
              student.name ||
              'بدون اسم',
            personalId:
              student.personal_id || null,
            feeExempt,
            annualFee,
            paidAmount,
            remaining: feeExempt
              ? 0
              : Math.max(
                  annualFee - paidAmount,
                  0
                ),
            status,
            latestPaymentMethod:
              latestLinkedPayment?.payment_method ||
              null,
            latestPaymentDate:
              latestLinkedPayment?.payment_date ||
              null,
            latestPaymentId:
              latestLinkedPayment?.id || null,
            latestTransaction,
            pendingCount,
          }
        })
        .filter(
          (
            row
          ): row is StudentPaymentRow =>
            row !== null
        )

    const filteredRows =
      rows.filter(
        (row) =>
          row.status === 'partial' ||
          row.status === 'paid' ||
          row.status === 'exempt'
      )

    setStudentPayments(filteredRows)

    return filteredRows
  }

  /*
   * ---------------------------------------------------------
   * تحديث الكاش
   * ---------------------------------------------------------
   */

  const updateFinancialCache = ({
    academicYear: nextAcademicYear,
    settings: nextSettings,
    transactions: nextTransactions,
    studentPayments: nextStudentPayments,
    summary: nextSummary,
  }: {
    academicYear?: AcademicYear | null
    settings?: FinancialSettings | null
    transactions?: Transaction[]
    studentPayments?: StudentPaymentRow[]
    summary?: Summary
  }) => {
    const current =
      paymentFinancialCache

    paymentFinancialCache = {
      academicYear:
        nextAcademicYear ??
        current?.academicYear ??
        null,

      settings:
        nextSettings !== undefined
          ? nextSettings
          : current?.settings ?? null,

      transactions:
        nextTransactions ??
        current?.transactions ??
        [],

      studentPayments:
        nextStudentPayments ??
        current?.studentPayments ??
        [],

      summary:
        nextSummary ??
        current?.summary ??
        emptySummary,
    }
  }

  /*
   * ---------------------------------------------------------
   * التحميل الكامل
   * ---------------------------------------------------------
   */

  const loadAll = async () => {
    const hasCache =
      paymentFinancialCache !== null

    try {
      if (!hasCache) {
        setLoading(true)
      }

      setError('')

      const year =
        await loadAcademicYear()

      const financial =
        await loadFinancialData(
          year.id
        )

      const loadedStudents =
        await loadStudentPayments(
          year.id,
          financial.transactions
        )

      paymentFinancialCache = {
        academicYear: year,
        settings:
          financial.settings,
        transactions:
          financial.transactions,
        studentPayments:
          loadedStudents,
        summary:
          financial.summary,
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'حدث خطأ أثناء تحميل البيانات'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (paymentFinancialLoading) {
      return
    }

    paymentFinancialLoading = true

    void loadAll().finally(() => {
      paymentFinancialLoading = false
    })

    return () => {}
  }, [])

  /*
   * ---------------------------------------------------------
   * تحديث يدوي
   * ---------------------------------------------------------
   */

  const handleRefresh = async () => {
    try {
      setRefreshing(true)
      setError('')

      const year =
        await loadAcademicYear()

      const financial =
        await loadFinancialData(
          year.id
        )

      const loadedStudents =
        await loadStudentPayments(
          year.id,
          financial.transactions
        )

      paymentFinancialCache = {
        academicYear: year,
        settings:
          financial.settings,
        transactions:
          financial.transactions,
        studentPayments:
          loadedStudents,
        summary:
          financial.summary,
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'تعذر تحديث البيانات'
      )
    } finally {
      setRefreshing(false)
    }
  }

  /*
   * ---------------------------------------------------------
   * تهيئة الإدارة المالية للسنة
   * ---------------------------------------------------------
   */

  const initializeFinancial = async () => {
    if (!academicYear) {
      setError(
        'لم يتم العثور على السنة الدراسية الحالية'
      )
      return
    }

    const amount = Number(
      openingBalance || 0
    )

    if (
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      setError(
        'الرصيد الافتتاحي لا يمكن أن يكون سالباً'
      )
      return
    }

    try {
      setSaving(true)
      setError('')

      const response = await fetch(
        '/api/financial-management/transactions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'initialize',
            academic_year_id:
              academicYear.id,
            financial_mode:
              initializeMode,
            opening_balance: amount,
            opening_source:
              openingSource.trim() || null,
            opening_note:
              openingNote.trim() || null,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result?.error ||
            'تعذر تهيئة الإدارة المالية'
        )
      }

      setModal('none')
      setOpeningBalance('')
      setOpeningSource('')
      setOpeningNote('')

      const financial =
        await loadFinancialData(
          academicYear.id
        )

      const loadedStudents =
        await loadStudentPayments(
          academicYear.id,
          financial.transactions
        )

      paymentFinancialCache = {
        academicYear,
        settings:
          financial.settings ??
          result.settings ??
          null,
        transactions:
          financial.transactions,
        studentPayments:
          loadedStudents,
        summary:
          financial.summary,
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'حدث خطأ أثناء التهيئة'
      )
    } finally {
      setSaving(false)
    }
  }

  /*
   * ---------------------------------------------------------
   * إعادة تهيئة الإدارة المالية فقط
   * ---------------------------------------------------------
   */

  const resetFinancialManagement = async () => {
    if (!academicYear) return

    try {
      setSaving(true)
      setError('')

      const response = await fetch(
        '/api/financial-management/transactions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'reset',
            academic_year_id:
              academicYear.id,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result?.error ||
            'تعذر إعادة تهيئة الإدارة المالية'
        )
      }

      setModal('none')
      setSettings(null)
      setTransactions([])
      setStudentPayments([])

      setSummary({
        ...emptySummary,
      })

      setInitializeMode('manual')
      setOpeningBalance('')
      setOpeningSource('')
      setOpeningNote('')

      paymentFinancialCache = {
        academicYear,
        settings: null,
        transactions: [],
        studentPayments: [],
        summary: {
          ...emptySummary,
        },
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'تعذر إعادة التهيئة'
      )
    } finally {
      setSaving(false)
    }
  }

  /*
   * ---------------------------------------------------------
   * إضافة عملية
   * ---------------------------------------------------------
   */

  const createTransaction = async () => {
    if (!academicYear) {
      setError(
        'لم يتم العثور على السنة الدراسية الحالية'
      )
      return
    }

    const amount = Number(
      transactionAmount
    )

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setError('أدخل مبلغاً صحيحاً')
      return
    }

    if (
      transactionType === 'adjustment' &&
      !adjustmentDirection
    ) {
      setError('حدد اتجاه التسوية')
      return
    }

    try {
      setSaving(true)
      setError('')

      const response = await fetch(
        '/api/financial-management/transactions',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            action: 'create',
            academic_year_id:
              academicYear.id,
            transaction_type:
              transactionType,
            amount,
            adjustment_direction:
              transactionType ===
              'adjustment'
                ? adjustmentDirection
                : null,
            source_type:
              transactionType ===
              'adjustment'
                ? 'adjustment'
                : 'manual',
            source:
              transactionSource.trim() ||
              null,
            note:
              transactionNote.trim() ||
              null,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result?.error ||
            'تعذر إضافة العملية'
        )
      }

      setModal('none')
      setTransactionAmount('')
      setTransactionSource('')
      setTransactionNote('')
      setTransactionType('in')
      setAdjustmentDirection('plus')

      const financial =
        await loadFinancialData(
          academicYear.id
        )

      const loadedStudents =
        await loadStudentPayments(
          academicYear.id,
          financial.transactions
        )

      paymentFinancialCache = {
        academicYear,
        settings:
          financial.settings,
        transactions:
          financial.transactions,
        studentPayments:
          loadedStudents,
        summary:
          financial.summary,
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'حدث خطأ أثناء إضافة العملية'
      )
    } finally {
      setSaving(false)
    }
  }

  /*
   * ---------------------------------------------------------
   * تأكيد دفعة طالب
   * ---------------------------------------------------------
   */

  const confirmTransaction = async (
    transaction: Transaction
  ) => {
    if (!academicYear) return

    if (
      transaction.confirmation_status !==
      'pending'
    ) {
      return
    }

    try {
      setSaving(true)
      setError('')

      const response = await fetch(
        '/api/financial-management/transactions',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            action: 'confirm',
            academic_year_id:
              academicYear.id,
            transaction_id:
              transaction.id,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result?.error ||
            'تعذر تأكيد العملية'
        )
      }

      const financial =
        await loadFinancialData(
          academicYear.id
        )

      const loadedStudents =
        await loadStudentPayments(
          academicYear.id,
          financial.transactions
        )

      paymentFinancialCache = {
        academicYear,
        settings:
          financial.settings,
        transactions:
          financial.transactions,
        studentPayments:
          loadedStudents,
        summary:
          financial.summary,
      }

      if (modal === 'details') {
        setModal('none')
        setSelectedTransaction(null)
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'تعذر تأكيد العملية'
      )
    } finally {
      setSaving(false)
    }
  }

  /*
   * ---------------------------------------------------------
   * قبول / تأكيد كل العمليات المعلقة
   * ---------------------------------------------------------
   */

  const confirmAllTransactions = async () => {
    if (!academicYear || pendingTransactions.length === 0) return

    try {
      setSaving(true)
      setError('')

      for (const transaction of pendingTransactions) {
        const response = await fetch(
          '/api/financial-management/transactions',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'confirm',
              academic_year_id: academicYear.id,
              transaction_id: transaction.id,
            }),
          }
        )

        const result = await response.json()

        if (!response.ok) {
          throw new Error(
            result?.error ||
              'تعذر تأكيد إحدى العمليات المعلقة'
          )
        }
      }

      const financial =
        await loadFinancialData(
          academicYear.id
        )

      const loadedStudents =
        await loadStudentPayments(
          academicYear.id,
          financial.transactions
        )

      paymentFinancialCache = {
        academicYear,
        settings:
          financial.settings,
        transactions:
          financial.transactions,
        studentPayments:
          loadedStudents,
        summary:
          financial.summary,
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'تعذر تأكيد جميع العمليات المعلقة'
      )
    } finally {
      setSaving(false)
    }
  }

  /*
   * ---------------------------------------------------------
   * حذف عملية
   * ---------------------------------------------------------
   */

  const deleteTransaction = async () => {
    if (
      !academicYear ||
      !selectedDeleteId
    ) {
      return
    }

    try {
      setSaving(true)
      setError('')

      const response = await fetch(
        '/api/financial-management/transactions',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            action: 'delete',
            academic_year_id:
              academicYear.id,
            transaction_id:
              selectedDeleteId,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result?.error ||
            'تعذر حذف العملية'
        )
      }

      setModal('none')
      setSelectedDeleteId(null)

      const financial =
        await loadFinancialData(
          academicYear.id
        )

      const loadedStudents =
        await loadStudentPayments(
          academicYear.id,
          financial.transactions
        )

      paymentFinancialCache = {
        academicYear,
        settings:
          financial.settings,
        transactions:
          financial.transactions,
        studentPayments:
          loadedStudents,
        summary:
          financial.summary,
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'تعذر حذف العملية'
      )
    } finally {
      setSaving(false)
    }
  }

  /*
   * ---------------------------------------------------------
   * العمليات المعلقة
   * ---------------------------------------------------------
   */

  const pendingTransactions = useMemo(
    () =>
      transactions.filter(
        (item) =>
          item.source_type ===
            'student_payment' &&
          item.confirmation_status ===
            'pending'
      ),
    [transactions]
  )

  /*
   * ---------------------------------------------------------
   * تصدير Excel-compatible CSV
   * ---------------------------------------------------------
   */

  const exportExcel = () => {
    if (!academicYear) return

    const studentNameById = new Map(
      studentPayments.map((student) => [
        student.studentId,
        student.name,
      ])
    )

    const headers = [
      'التاريخ',
      'نوع العملية',
      'المبلغ',
      'الرصيد قبل',
      'الرصيد بعد',
      'المصدر',
      'اسم الطالب',
      'معرف الطالب',
      'رقم الطلب',
      'طريقة الدفع',
      'رقم المرجع',
      'حالة التأكيد',
      'تم التأكيد بواسطة',
      'وقت التأكيد',
      'أنشأ العملية',
      'الملاحظات',
    ]

    const rows = transactions.map(
      (transaction) => [
        formatDate(
          transaction.created_at
        ),
        getTransactionLabel(transaction),
        transaction.amount,
        transaction.balance_before ??
          '',
        transaction.balance_after ??
          '',
        transaction.source ?? '',
        transaction.student_id
          ? studentNameById.get(
              transaction.student_id
            ) || ''
          : '',
        transaction.student_id ?? '',
        transaction.student_request_number ??
          '',
        transaction.payment_method ?? '',
        transaction.reference_number ?? '',
        getConfirmationLabel(
          transaction.confirmation_status
        ),
        transaction.confirmed_by ?? '',
        transaction.confirmed_at
          ? formatDate(
              transaction.confirmed_at
            )
          : '',
        transaction.created_by ?? '',
        transaction.note ?? '',
      ]
    )

    const csv = [
      headers,
      ...rows,
    ]
      .map((row) =>
        row
          .map((cell) => {
            const value = String(
              cell ?? ''
            )

            return `"${value.replace(
              /"/g,
              '""'
            )}"`
          })
          .join(',')
      )
      .join('\n')

    const blob = new Blob(
      ['\ufeff' + csv],
      {
        type: 'text/csv;charset=utf-8;',
      }
    )

    const url =
      URL.createObjectURL(blob)

    const link =
      document.createElement('a')

    link.href = url

    link.download = `financial-management-${academicYear.name}.csv`

    document.body.appendChild(link)
    link.click()
    link.remove()

    URL.revokeObjectURL(url)
  }

  /*
   * ---------------------------------------------------------
   * مساعدات العرض
   * ---------------------------------------------------------
   */

  const getTransactionLabel = (
    transaction: Transaction
  ) => {
    if (
      transaction.transaction_type ===
      'in'
    ) {
      return 'إيراد'
    }

    if (
      transaction.transaction_type ===
      'out'
    ) {
      return 'مصروف'
    }

    if (
      transaction.adjustment_direction ===
      'plus'
    ) {
      return 'تسوية +'
    }

    return 'تسوية -'
  }

  const getConfirmationLabel = (
    status: Transaction['confirmation_status']
  ) => {
    if (status === 'pending') {
      return 'بانتظار التأكيد'
    }

    if (status === 'confirmed') {
      return 'تم التأكيد'
    }

    return 'غير مطلوب'
  }

  const getTypeClass = (
    transaction: Transaction
  ) => {
    if (
      transaction.transaction_type ===
      'in'
    ) {
      return 'text-emerald-600 dark:text-emerald-400'
    }

    if (
      transaction.transaction_type ===
      'out'
    ) {
      return 'text-red-600 dark:text-red-400'
    }

    if (
      transaction.adjustment_direction ===
      'plus'
    ) {
      return 'text-blue-600 dark:text-blue-400'
    }

    return 'text-orange-600 dark:text-orange-400'
  }

  /*
   * ---------------------------------------------------------
   * شاشة التحميل
   * ---------------------------------------------------------
   */

  if (loading) {
    return (
      <div
        dir="rtl"
        className="flex min-h-[300px] items-center justify-center"
      >
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          جاري تحميل الإدارة المالية...
        </div>
      </div>
    )
  }

  return (
    <div
      dir="rtl"
      className="space-y-6 text-foreground"
    >
      {/* العنوان */}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            إدارة المالية
          </h2>

          {academicYear && (
            <div className="mt-1 text-sm text-muted-foreground">
              السنة الدراسية:{' '}
              <span className="font-medium text-foreground">
                {academicYear.name}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing
                  ? 'animate-spin'
                  : ''
              }`}
            />
            تحديث
          </button>

          <button
            type="button"
            onClick={exportExcel}
            disabled={!transactions.length}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            تحميل Excel
          </button>
        </div>
      </div>

      {/* الخطأ */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      {/* السنة */}

      {academicYear && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm text-muted-foreground">
                السنة الحالية
              </div>

              <div className="mt-1 text-lg font-semibold">
                {academicYear.name}
              </div>

              <div className="mt-1 text-xs text-muted-foreground">
                من{' '}
                {formatDateOnly(
                  academicYear.start_date
                )}{' '}
                إلى{' '}
                {formatDateOnly(
                  academicYear.end_date
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* لم تتم التهيئة */}

      {!settings && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mx-auto max-w-2xl text-center">
            <Wallet className="mx-auto h-10 w-10 text-muted-foreground" />

            <h3 className="mt-4 text-xl font-bold">
              تهيئة الإدارة المالية
            </h3>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              اختر طريقة تأسيس الرصيد لهذه
              السنة الدراسية. يمكن إعادة
              تهيئة هذا القسم أثناء التطوير
              دون حذف مدفوعات الطلاب أو
              بياناتهم.
            </p>

            <button
              type="button"
              onClick={() =>
                setModal('initialize')
              }
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              بدء الإدارة المالية
            </button>
          </div>
        </div>
      )}

      {/* بعد التهيئة */}

      {settings && (
        <>
          {/* وضع الإدارة */}

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm text-muted-foreground">
                  طريقة تأسيس الرصيد
                </div>

                <div className="mt-1 text-lg font-semibold">
                  {settings.financial_mode ===
                  'student_payments'
                    ? 'مرتبط بمدفوعات الطلاب'
                    : 'إدخال يدوي'}
                </div>

                <div className="mt-1 text-xs text-muted-foreground">
                  {settings.financial_mode ===
                  'student_payments'
                    ? 'دفعات الطلاب تدخل الرصيد بعد تأكيد الاستلام.'
                    : 'الإيرادات والمصروفات والتسويات تدار يدويًا.'}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="rounded-lg bg-muted px-4 py-3 text-sm">
                  الرصيد الافتتاحي:{' '}
                  <span className="font-bold">
                    {money(
                      settings.opening_balance
                    )}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setModal('reset')
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  <RotateCcw className="h-4 w-4" />
                  إعادة تهيئة
                </button>
              </div>
            </div>
          </div>

          {/* البطاقات */}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryCard
              title="الرصيد الحالي"
              value={money(summary.balance)}
              icon={
                <Wallet className="h-5 w-5" />
              }
            />

            <SummaryCard
              title="إجمالي الإيرادات"
              value={money(summary.totalIn)}
              icon={<span>+</span>}
            />

            <SummaryCard
              title="إجمالي المصروفات"
              value={money(summary.totalOut)}
              icon={<span>-</span>}
            />

            <SummaryCard
              title="التسويات"
              value={money(
                summary.totalAdjustmentsPlus -
                  summary.totalAdjustmentsMinus
              )}
              icon={<span>±</span>}
            />

            <SummaryCard
              title="عدد العمليات"
              value={String(
                summary.operations
              )}
              icon={<span>#</span>}
            />
          </div>

          {/* جدول واحد فقط */}

          {settings.financial_mode ===
          'student_payments' ? (
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-5 py-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="font-bold">
                      الطلاب والدفع
                    </h3>

                    <p className="mt-1 text-xs text-muted-foreground">
                      هذه القائمة تمثل الإدارة
                      المالية الحالية فقط.
                    </p>
                  </div>

                  <div className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                    {studentPayments.length}{' '}
                    طالب
                  </div>
                </div>
              </div>

              {studentPayments.length ===
              0 ? (
                <div className="px-5 py-12 text-center text-sm text-muted-foreground">
                  لا توجد دفعات مرتبطة
                  بالإدارة المالية الحالية.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1100px] text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted text-right">
                        <th className="px-4 py-3">
                          الطالب
                        </th>

                        <th className="px-4 py-3">
                          الحالة المالية
                        </th>

                        <th className="px-4 py-3">
                          المدفوع
                        </th>

                        <th className="px-4 py-3">
                          المتبقي
                        </th>

                        <th className="px-4 py-3">
                          طريقة الدفع
                        </th>

                        <th className="px-4 py-3">
                          تاريخ الدفعة
                        </th>

                        <th className="px-4 py-3">
                          الاستلام
                        </th>

                        <th className="px-4 py-3">
                          الإجراء
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {studentPayments.map(
                        (student) => (
                          <tr
                            key={
                              student.studentId
                            }
                            className="border-b border-border last:border-b-0 hover:bg-muted/60"
                          >
                            <td className="px-4 py-4">
                              <div className="font-semibold">
                                {student.name}
                              </div>

                              {student.personalId && (
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {
                                    student.personalId
                                  }
                                </div>
                              )}
                            </td>

                            <td className="px-4 py-4">
                              <StudentPaymentStatus
                                status={
                                  student.status
                                }
                              />
                            </td>

                            <td className="px-4 py-4 font-semibold">
                              {student.feeExempt
                                ? '-'
                                : money(
                                    student.paidAmount
                                  )}
                            </td>

                            <td className="px-4 py-4">
                              {student.feeExempt
                                ? '-'
                                : money(
                                    student.remaining
                                  )}
                            </td>

                            <td className="px-4 py-4">
                              {student.feeExempt
                                ? '-'
                                : student.latestPaymentMethod ||
                                  '-'}
                            </td>

                            <td className="px-4 py-4 whitespace-nowrap">
                              {student.feeExempt
                                ? '-'
                                : formatDate(
                                    student.latestPaymentDate
                                  )}
                            </td>

                            <td className="px-4 py-4">
                              {student.feeExempt ? (
                                <span className="text-xs text-muted-foreground">
                                  لا ينطبق
                                </span>
                              ) : student.pendingCount >
                                0 ? (
                                <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                                  بانتظار التأكيد
                                </span>
                              ) : student.latestTransaction
                                  ?.confirmation_status ===
                                'confirmed' ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  تم التأكيد
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  غير مرتبط
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-4">
                              <div className="flex flex-wrap gap-2">
                                {student.pendingCount >
                                  0 &&
                                  student.latestTransaction
                                    ?.confirmation_status ===
                                    'pending' && (
                                    <button
                                      type="button"
                                      disabled={
                                        saving
                                      }
                                      onClick={() =>
                                        confirmTransaction(
                                          student.latestTransaction!
                                        )
                                      }
                                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      تأكيد الاستلام
                                    </button>
                                  )}

                                {student.latestTransaction && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedTransaction(
                                        student.latestTransaction!
                                      )
                                      setModal(
                                        'details'
                                      )
                                    }}
                                    className="rounded-lg border border-border bg-background px-3 py-2 text-xs hover:bg-muted"
                                  >
                                    تفاصيل
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-5 py-4">
                <h3 className="font-bold">
                  العمليات المالية
                </h3>
              </div>

              {transactions.length === 0 ? (
                <div className="px-5 py-16 text-center text-sm text-muted-foreground">
                  لا توجد عمليات مالية حتى الآن.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1100px] text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted text-right">
                        <th className="px-4 py-3">
                          التاريخ
                        </th>

                        <th className="px-4 py-3">
                          النوع
                        </th>

                        <th className="px-4 py-3">
                          المبلغ
                        </th>

                        <th className="px-4 py-3">
                          المصدر
                        </th>

                        <th className="px-4 py-3">
                          الطالب
                        </th>

                        <th className="px-4 py-3">
                          الحالة
                        </th>

                        <th className="px-4 py-3">
                          الرصيد
                        </th>

                        <th className="px-4 py-3">
                          التفاصيل
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {transactions.map(
                        (transaction) => {
                          const student =
                            studentPayments.find(
                              (item) =>
                                item.studentId ===
                                transaction.student_id
                            )

                          return (
                            <tr
                              key={
                                transaction.id
                              }
                              className="border-b border-border last:border-b-0 hover:bg-muted/60"
                            >
                              <td className="px-4 py-4 whitespace-nowrap">
                                {formatDate(
                                  transaction.created_at
                                )}
                              </td>

                              <td
                                className={`px-4 py-4 font-semibold ${getTypeClass(
                                  transaction
                                )}`}
                              >
                                {getTransactionLabel(
                                  transaction
                                )}
                              </td>

                              <td className="px-4 py-4 font-semibold">
                                {money(
                                  transaction.amount
                                )}
                              </td>

                              <td className="px-4 py-4">
                                {transaction.source ||
                                  (transaction.source_type ===
                                  'student_payment'
                                    ? 'دفعة طالب'
                                    : transaction.source_type ===
                                      'opening'
                                    ? 'الرصيد الافتتاحي'
                                    : '-')}
                              </td>

                              <td className="px-4 py-4">
                                {student?.name ||
                                  '-'}
                              </td>

                              <td className="px-4 py-4">
                                <StatusBadge
                                  status={
                                    transaction.confirmation_status
                                  }
                                />
                              </td>

                              <td className="px-4 py-4 font-semibold">
                                {transaction.balance_after !==
                                undefined
                                  ? money(
                                      transaction.balance_after
                                    )
                                  : '-'}
                              </td>

                              <td className="px-4 py-4">
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedTransaction(
                                        transaction
                                      )
                                      setModal(
                                        'details'
                                      )
                                    }}
                                    className="rounded-lg border border-border bg-background px-3 py-2 text-xs hover:bg-muted"
                                  >
                                    تفاصيل
                                  </button>

                                  {transaction.confirmation_status ===
                                    'pending' && (
                                    <button
                                      type="button"
                                      disabled={
                                        saving
                                      }
                                      onClick={() =>
                                        confirmTransaction(
                                          transaction
                                        )
                                      }
                                      className="rounded-lg bg-emerald-600 px-3 py-2 text-xs text-white hover:opacity-90 disabled:opacity-50"
                                    >
                                      تأكيد
                                    </button>
                                  )}

                                  {transaction.source_type !==
                                    'opening' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedDeleteId(
                                          transaction.id
                                        )
                                        setModal(
                                          'delete'
                                        )
                                      }}
                                      className="rounded-lg border border-red-200 px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/30"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        }
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* العمليات المعلقة */}

          {settings.financial_mode ===
            'student_payments' &&
            pendingTransactions.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/60 dark:bg-amber-950/30">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="font-bold text-amber-900 dark:text-amber-300">
                      دفعات بانتظار تأكيد الاستلام
                    </h3>

                    <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                      هذه الدفعات لا تدخل في
                      الرصيد المالي حتى يتم
                      تأكيد استلامها.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="rounded-full bg-amber-100 px-4 py-2 text-sm font-bold text-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
                      {pendingTransactions.length}{' '}
                      معلقة
                    </div>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={confirmAllTransactions}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      قبول الكل
                    </button>
                  </div>
                </div>
              </div>
            )}

          {/* شريط الإجراءات */}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setTransactionType('in')
                setModal('transaction')
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              إضافة إيراد
            </button>

            <button
              type="button"
              onClick={() => {
                setTransactionType('out')
                setModal('transaction')
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              إضافة مصروف
            </button>

            <button
              type="button"
              onClick={() => {
                setTransactionType(
                  'adjustment'
                )
                setModal('transaction')
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
              إضافة تسوية
            </button>
          </div>
        </>
      )}

      {/* Modal: التهيئة */}

      {modal === 'initialize' && (
        <Modal
          title="تهيئة الإدارة المالية"
          onClose={() => setModal('none')}
        >
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium">
                طريقة الإدارة
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() =>
                    setInitializeMode(
                      'student_payments'
                    )
                  }
                  className={`rounded-xl border border-border p-4 text-right ${
                    initializeMode ===
                    'student_payments'
                      ? 'border-foreground bg-muted'
                      : 'bg-background hover:bg-muted'
                  }`}
                >
                  <div className="font-semibold">
                    مرتبط بمدفوعات الطلاب
                  </div>

                  <div className="mt-1 text-xs leading-5 text-muted-foreground">
                    دفعات الطلاب تحتاج تأكيد
                    الاستلام قبل دخولها في
                    الرصيد.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setInitializeMode(
                      'manual'
                    )
                  }
                  className={`rounded-xl border border-border p-4 text-right ${
                    initializeMode ===
                    'manual'
                      ? 'border-foreground bg-muted'
                      : 'bg-background hover:bg-muted'
                  }`}
                >
                  <div className="font-semibold">
                    إدخال يدوي
                  </div>

                  <div className="mt-1 text-xs leading-5 text-muted-foreground">
                    إدخال الرصيد الأولي يدوياً
                    من أي مصدر.
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                الرصيد الافتتاحي
              </label>

              <input
                type="number"
                min="0"
                step="0.001"
                value={openingBalance}
                onChange={(e) =>
                  setOpeningBalance(
                    e.target.value
                  )
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                placeholder="0.000"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                مصدر الرصيد
              </label>

              <select
                value={openingSource}
                onChange={(e) =>
                  setOpeningSource(
                    e.target.value
                  )
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
              >
                <option value="">
                  اختر المصدر
                </option>

                <option value="previous_balance">
                  رصيد سابق
                </option>

                <option value="cash">
                  نقدي
                </option>

                <option value="transfer">
                  تحويل
                </option>

                <option value="support">
                  دعم
                </option>

                <option value="deposit">
                  إيداع
                </option>

                <option value="other">
                  أخرى
                </option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                ملاحظات
              </label>

              <textarea
                value={openingNote}
                onChange={(e) =>
                  setOpeningNote(
                    e.target.value
                  )
                }
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                placeholder="ملاحظات الرصيد الافتتاحي..."
              />
            </div>

            {initializeMode ===
              'student_payments' && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                سيتم جلب الدفعات الموجودة
                مسبقًا لهذه السنة وربطها
                بالإدارة المالية كدفعات
                بانتظار تأكيد الاستلام.
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setModal('none')
                }
                className="rounded-lg border border-border bg-background px-4 py-2 hover:bg-muted"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={initializeFinancial}
                disabled={saving}
                className="rounded-lg bg-primary px-5 py-2 text-primary-foreground disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'حفظ وبدء'
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: إعادة التهيئة */}

      {modal === 'reset' && (
        <Modal
          title="إعادة تهيئة الإدارة المالية"
          onClose={() => setModal('none')}
        >
          <div className="space-y-5">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
              <div className="font-semibold text-red-800 dark:text-red-300">
                تنبيه
              </div>

              <p className="mt-2 text-sm leading-6 text-red-700 dark:text-red-300">
                سيتم حذف إعداد الإدارة
                المالية وعملياتها لهذه السنة
                فقط.
              </p>

              <p className="mt-2 text-sm leading-6 text-red-700 dark:text-red-300">
                لن يتم حذف مدفوعات الطلاب،
                الطلاب، التسجيلات أو
                الاشتراكات.
              </p>

              <p className="mt-2 text-sm leading-6 text-red-700 dark:text-red-300">
                بعد ذلك يمكنك اختيار طريقة
                الإدارة المالية من جديد.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setModal('none')
                }
                className="rounded-lg border border-border bg-background px-4 py-2 hover:bg-muted"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={
                  resetFinancialManagement
                }
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-white disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}

                إعادة التهيئة
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: إضافة عملية */}

      {modal === 'transaction' && (
        <Modal
          title={
            transactionType === 'in'
              ? 'إضافة إيراد'
              : transactionType === 'out'
              ? 'إضافة مصروف'
              : 'إضافة تسوية'
          }
          onClose={() =>
            setModal('none')
          }
        >
          <div className="space-y-5">
            {transactionType ===
              'adjustment' && (
              <div>
                <label className="mb-2 block text-sm font-medium">
                  اتجاه التسوية
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setAdjustmentDirection(
                        'plus'
                      )
                    }
                    className={`rounded-lg border border-border px-4 py-3 ${
                      adjustmentDirection ===
                      'plus'
                        ? 'border-foreground bg-muted'
                        : 'bg-background hover:bg-muted'
                    }`}
                  >
                    تسوية +
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setAdjustmentDirection(
                        'minus'
                      )
                    }
                    className={`rounded-lg border border-border px-4 py-3 ${
                      adjustmentDirection ===
                      'minus'
                        ? 'border-foreground bg-muted'
                        : 'bg-background hover:bg-muted'
                    }`}
                  >
                    تسوية -
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium">
                المبلغ
              </label>

              <input
                type="number"
                min="0.001"
                step="0.001"
                value={transactionAmount}
                onChange={(e) =>
                  setTransactionAmount(
                    e.target.value
                  )
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                placeholder="0.000"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                المصدر / البيان
              </label>

              <input
                type="text"
                value={transactionSource}
                onChange={(e) =>
                  setTransactionSource(
                    e.target.value
                  )
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                placeholder={
                  transactionType === 'out'
                    ? 'مثال: صيانة، مشتريات...'
                    : transactionType ===
                      'adjustment'
                    ? 'سبب التسوية'
                    : 'مصدر الإيراد'
                }
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                ملاحظات
              </label>

              <textarea
                value={transactionNote}
                onChange={(e) =>
                  setTransactionNote(
                    e.target.value
                  )
                }
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setModal('none')
                }
                className="rounded-lg border border-border bg-background px-4 py-2 hover:bg-muted"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={
                  createTransaction
                }
                disabled={saving}
                className="rounded-lg bg-primary px-5 py-2 text-primary-foreground disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'حفظ العملية'
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: التفاصيل */}

      {modal === 'details' &&
        selectedTransaction && (
          <Modal
            title="تفاصيل العملية"
            onClose={() => {
              setModal('none')
              setSelectedTransaction(
                null
              )
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Detail
                label="نوع العملية"
                value={getTransactionLabel(
                  selectedTransaction
                )}
              />

              <Detail
                label="المبلغ"
                value={money(
                  selectedTransaction.amount
                )}
              />

              <Detail
                label="التاريخ"
                value={formatDate(
                  selectedTransaction.created_at
                )}
              />

              <Detail
                label="الرصيد قبل"
                value={
                  selectedTransaction.balance_before !==
                  undefined
                    ? money(
                        selectedTransaction.balance_before
                      )
                    : '-'
                }
              />

              <Detail
                label="الرصيد بعد"
                value={
                  selectedTransaction.balance_after !==
                  undefined
                    ? money(
                        selectedTransaction.balance_after
                      )
                    : '-'
                }
              />

              <Detail
                label="المصدر"
                value={
                  selectedTransaction.source ||
                  '-'
                }
              />

              <Detail
                label="نوع المصدر"
                value={
                  selectedTransaction.source_type
                }
              />

              <Detail
                label="معرف الدفعة"
                value={
                  selectedTransaction.payment_id
                }
              />

              <Detail
                label="معرف الطالب"
                value={
                  selectedTransaction.student_id
                }
              />

              <Detail
                label="رقم طلب التسجيل"
                value={
                  selectedTransaction.student_request_number
                }
              />

              <Detail
                label="طريقة الدفع"
                value={
                  selectedTransaction.payment_method
                }
              />

              <Detail
                label="رقم المرجع"
                value={
                  selectedTransaction.reference_number
                }
              />

              <Detail
                label="حالة التأكيد"
                value={getConfirmationLabel(
                  selectedTransaction.confirmation_status
                )}
              />

              <Detail
                label="تم التأكيد بواسطة"
                value={
                  selectedTransaction.confirmed_by
                }
              />

              <Detail
                label="وقت التأكيد"
                value={
                  selectedTransaction.confirmed_at
                    ? formatDate(
                        selectedTransaction.confirmed_at
                      )
                    : null
                }
              />

              <Detail
                label="أنشأ العملية"
                value={
                  selectedTransaction.created_by
                }
              />

              {selectedTransaction
                .adjustment_direction && (
                <Detail
                  label="اتجاه التسوية"
                  value={
                    selectedTransaction.adjustment_direction ===
                    'plus'
                      ? 'تسوية +'
                      : 'تسوية -'
                  }
                />
              )}

              <div className="md:col-span-2">
                <Detail
                  label="الملاحظات"
                  value={
                    selectedTransaction.note
                  }
                />
              </div>

              {selectedTransaction.confirmation_status ===
                'pending' && (
                <div className="md:col-span-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      confirmTransaction(
                        selectedTransaction
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    تأكيد استلام الدفعة
                  </button>
                </div>
              )}
            </div>
          </Modal>
        )}

      {/* Modal: حذف */}

      {modal === 'delete' && (
        <Modal
          title="حذف العملية"
          onClose={() => {
            setModal('none')
            setSelectedDeleteId(null)
          }}
        >
          <div className="space-y-5">
            <p className="text-sm leading-6 text-muted-foreground">
              هل أنت متأكد من حذف هذه العملية؟
              سيتم إعادة احتساب الرصيد بعد
              الحذف.
            </p>

            <p className="rounded-lg bg-muted p-3 text-xs leading-5 text-muted-foreground">
              حذف العملية المالية لا يحذف
              دفعة الطالب الأصلية من جدول
              المدفوعات.
            </p>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setModal('none')
                  setSelectedDeleteId(
                    null
                  )
                }}
                className="rounded-lg border border-border bg-background px-4 py-2 hover:bg-muted"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={
                  deleteTransaction
                }
                disabled={saving}
                className="rounded-lg bg-red-600 px-5 py-2 text-white disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'حذف العملية'
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

/*
 * =========================================================
 * Summary Card
 * =========================================================
 */

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {title}
        </div>

        <div className="text-muted-foreground">
          {icon}
        </div>
      </div>

      <div className="mt-3 text-xl font-bold">
        {value}
      </div>
    </div>
  )
}

/*
 * =========================================================
 * حالة دفع الطالب
 * =========================================================
 */

function StudentPaymentStatus({
  status,
}: {
  status:
    | 'paid'
    | 'partial'
    | 'exempt'
    | 'unpaid'
}) {
  if (status === 'paid') {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
        مدفوع بالكامل
      </span>
    )
  }

  if (status === 'partial') {
    return (
      <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
        مدفوع جزئيًا
      </span>
    )
  }

  if (status === 'exempt') {
    return (
      <span className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
        معفي
      </span>
    )
  }

  return (
    <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800 dark:bg-red-950/50 dark:text-red-300">
      غير مدفوع
    </span>
  )
}

/*
 * =========================================================
 * Status Badge
 * =========================================================
 */

function StatusBadge({
  status,
}: {
  status: Transaction['confirmation_status']
}) {
  if (status === 'pending') {
    return (
      <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
        بانتظار التأكيد
      </span>
    )
  }

  if (status === 'confirmed') {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
        تم التأكيد
      </span>
    )
  }

  return (
    <span className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
      غير مطلوب
    </span>
  )
}

/*
 * =========================================================
 * Modal
 * =========================================================
 */

function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card text-foreground shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="font-bold">
            {title}
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          {children}
        </div>
      </div>
    </div>
  )
}

/*
 * =========================================================
 * Detail
 * =========================================================
 */

function Detail({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  return (
    <div className="rounded-xl bg-muted p-4">
      <div className="text-xs text-muted-foreground">
        {label}
      </div>

      <div className="mt-1 break-all text-sm font-medium">
        {value || '-'}
      </div>
    </div>
  )
}
ع