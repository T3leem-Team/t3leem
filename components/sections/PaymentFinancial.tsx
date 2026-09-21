'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  ChevronDown,
  Download,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Wallet,
  X,
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

type AcademicYear = {
  id: string
  name: string
  start_date: string
  end_date: string
  is_current: boolean
  is_active: boolean
  annual_fee: number
}

const money = (value: number) =>
  new Intl.NumberFormat('ar-BH', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value)

const formatDate = (value: string | null | undefined) => {
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

const formatDateOnly = (value: string | null | undefined) => {
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
    useState<AcademicYear | null>(null)

  const [settings, setSettings] =
    useState<FinancialSettings | null>(null)

  const [transactions, setTransactions] =
    useState<Transaction[]>([])

  const [summary, setSummary] = useState<Summary>({
    openingBalance: 0,
    balance: 0,
    totalIn: 0,
    totalOut: 0,
    totalAdjustmentsPlus: 0,
    totalAdjustmentsMinus: 0,
    operations: 0,
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [modal, setModal] =
    useState<ModalType>('none')

  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null)

  const [selectedDeleteId, setSelectedDeleteId] =
    useState<string | null>(null)

  const [initializeMode, setInitializeMode] =
    useState<FinancialMode>('manual')

  const [openingBalance, setOpeningBalance] =
    useState('')

  const [openingSource, setOpeningSource] =
    useState('')

  const [openingNote, setOpeningNote] =
    useState('')

  const [transactionType, setTransactionType] =
    useState<TransactionType>('in')

  const [transactionAmount, setTransactionAmount] =
    useState('')

  const [transactionSource, setTransactionSource] =
    useState('')

  const [transactionNote, setTransactionNote] =
    useState('')

  const [adjustmentDirection, setAdjustmentDirection] =
    useState<AdjustmentDirection>('plus')

  const [refreshing, setRefreshing] =
    useState(false)

  /*
   * ---------------------------------------------------------
   * جلب السنة الدراسية الحالية من Supabase مباشرة
   * ---------------------------------------------------------
   */

  const loadAcademicYear = async () => {
    const { data, error: yearError } = await supabase
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
      throw new Error('لا توجد سنة دراسية حالية في النظام')
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
    const id = yearId || academicYear?.id

    if (!id) return

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
        result?.error || 'تعذر تحميل الإدارة المالية'
      )
    }

    setSettings(result.settings || null)
    setTransactions(result.transactions || [])

    setSummary(
      result.summary || {
        openingBalance: 0,
        balance: 0,
        totalIn: 0,
        totalOut: 0,
        totalAdjustmentsPlus: 0,
        totalAdjustmentsMinus: 0,
        operations: 0,
      }
    )
  }

  /*
   * ---------------------------------------------------------
   * التحميل الأول
   * ---------------------------------------------------------
   */

  const loadAll = async () => {
    try {
      setLoading(true)
      setError('')

      const year = await loadAcademicYear()

      await loadFinancialData(year.id)
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
    loadAll()
  }, [])

  /*
   * ---------------------------------------------------------
   * تحديث
   * ---------------------------------------------------------
   */

  const handleRefresh = async () => {
    try {
      setRefreshing(true)
      setError('')

      const year = await loadAcademicYear()

      await loadFinancialData(year.id)
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
      setError('لم يتم العثور على السنة الدراسية الحالية')
      return
    }

    const amount = Number(openingBalance || 0)

    if (amount < 0) {
      setError('الرصيد الافتتاحي لا يمكن أن يكون سالباً')
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
            academic_year_id: academicYear.id,
            financial_mode: initializeMode,
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
          result?.error || 'تعذر تهيئة الإدارة المالية'
        )
      }

      setModal('none')
      setOpeningBalance('')
      setOpeningSource('')
      setOpeningNote('')

      await loadFinancialData(academicYear.id)
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
   * إضافة عملية
   * ---------------------------------------------------------
   */

  const createTransaction = async () => {
    if (!academicYear) {
      setError('لم يتم العثور على السنة الدراسية الحالية')
      return
    }

    const amount = Number(transactionAmount)

    if (!amount || amount <= 0) {
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
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'create',
            academic_year_id: academicYear.id,
            transaction_type: transactionType,
            amount,
            adjustment_direction:
              transactionType === 'adjustment'
                ? adjustmentDirection
                : null,
            source_type:
              transactionType === 'adjustment'
                ? 'adjustment'
                : 'manual',
            source:
              transactionSource.trim() || null,
            note:
              transactionNote.trim() || null,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result?.error || 'تعذر إضافة العملية'
        )
      }

      setModal('none')
      setTransactionAmount('')
      setTransactionSource('')
      setTransactionNote('')
      setTransactionType('in')
      setAdjustmentDirection('plus')

      await loadFinancialData(academicYear.id)
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
            action: 'confirm',
            academic_year_id: academicYear.id,
            transaction_id: transaction.id,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result?.error || 'تعذر تأكيد العملية'
        )
      }

      await loadFinancialData(academicYear.id)
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
   * حذف عملية
   * ---------------------------------------------------------
   */

  const deleteTransaction = async () => {
    if (!academicYear || !selectedDeleteId) return

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
            action: 'delete',
            academic_year_id: academicYear.id,
            transaction_id: selectedDeleteId,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result?.error || 'تعذر حذف العملية'
        )
      }

      setModal('none')
      setSelectedDeleteId(null)

      await loadFinancialData(academicYear.id)
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
          item.source_type === 'student_payment' &&
          item.confirmation_status === 'pending'
      ),
    [transactions]
  )

  /*
   * ---------------------------------------------------------
   * تصدير Excel-compatible CSV
   * ---------------------------------------------------------
   */

  const exportExcel = () => {
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

    const rows = transactions.map((transaction) => [
      formatDate(transaction.created_at),
      getTransactionLabel(transaction),
      transaction.amount,
      transaction.balance_before ?? '',
      transaction.balance_after ?? '',
      transaction.source ?? '',
      '',
      transaction.student_id ?? '',
      transaction.student_request_number ?? '',
      transaction.payment_method ?? '',
      transaction.reference_number ?? '',
      getConfirmationLabel(
        transaction.confirmation_status
      ),
      transaction.confirmed_by ?? '',
      transaction.confirmed_at
        ? formatDate(transaction.confirmed_at)
        : '',
      transaction.created_by ?? '',
      transaction.note ?? '',
    ])

    const csv = [
      headers,
      ...rows,
    ]
      .map((row) =>
        row
          .map((cell) => {
            const value = String(cell ?? '')
            return `"${value.replace(/"/g, '""')}"`
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

    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = `financial-management-${academicYear?.name || 'year'}.csv`

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
    if (transaction.transaction_type === 'in') {
      return 'إيراد'
    }

    if (transaction.transaction_type === 'out') {
      return 'مصروف'
    }

    if (
      transaction.adjustment_direction === 'plus'
    ) {
      return 'تسوية +'
    }

    return 'تسوية -'
  }

  const getConfirmationLabel = (
    status: Transaction['confirmation_status']
  ) => {
    if (status === 'pending') return 'بانتظار التأكيد'
    if (status === 'confirmed') return 'تم التأكيد'
    return 'غير مطلوب'
  }

  const getTypeClass = (
    transaction: Transaction
  ) => {
    if (transaction.transaction_type === 'in') {
      return 'text-emerald-600'
    }

    if (transaction.transaction_type === 'out') {
      return 'text-red-600'
    }

    if (
      transaction.adjustment_direction === 'plus'
    ) {
      return 'text-blue-600'
    }

    return 'text-orange-600'
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
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          جاري تحميل الإدارة المالية...
        </div>
      </div>
    )
  }

  return (
    <div
      dir="rtl"
      className="space-y-6"
    >
      {/* العنوان */}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            إدارة المالية
          </h2>

          {academicYear && (
            <div className="mt-1 text-sm text-gray-500">
              السنة الدراسية:{' '}
              <span className="font-medium text-gray-700">
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
            className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing ? 'animate-spin' : ''
              }`}
            />
            تحديث
          </button>

          <button
            type="button"
            onClick={exportExcel}
            disabled={!transactions.length}
            className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            تحميل Excel
          </button>
        </div>
      </div>

      {/* الخطأ */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* السنة */}

      {academicYear && (
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm text-gray-500">
                السنة الحالية
              </div>

              <div className="mt-1 text-lg font-semibold">
                {academicYear.name}
              </div>

              <div className="mt-1 text-xs text-gray-500">
                من {formatDateOnly(academicYear.start_date)}
                {' '}إلى{' '}
                {formatDateOnly(academicYear.end_date)}
              </div>
            </div>

            <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm">
              <div className="text-gray-500">
                معرف السنة
              </div>

              <div className="mt-1 break-all font-mono text-xs">
                {academicYear.id}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* لم تتم التهيئة */}

      {!settings && (
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mx-auto max-w-2xl text-center">
            <Wallet className="mx-auto h-10 w-10 text-gray-400" />

            <h3 className="mt-4 text-xl font-bold">
              تهيئة الإدارة المالية
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              اختر طريقة تأسيس الرصيد لهذه السنة الدراسية.
              بعد التهيئة تصبح الطريقة جزءاً من إعدادات السنة.
            </p>

            <button
              type="button"
              onClick={() => setModal('initialize')}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-medium text-white hover:opacity-90"
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

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm text-gray-500">
                  طريقة تأسيس الرصيد
                </div>

                <div className="mt-1 text-lg font-semibold">
                  {settings.financial_mode ===
                  'student_payments'
                    ? 'مرتبط بمدفوعات الطلاب'
                    : 'إدخال يدوي'}
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm">
                الرصيد الافتتاحي:{' '}
                <span className="font-bold">
                  {money(settings.opening_balance)}
                </span>
              </div>
            </div>
          </div>

          {/* البطاقات */}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryCard
              title="الرصيد الحالي"
              value={money(summary.balance)}
              icon={<Wallet className="h-5 w-5" />}
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
              value={String(summary.operations)}
              icon={<span>#</span>}
            />
          </div>

          {/* العمليات المعلقة */}

          {pendingTransactions.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="font-bold text-amber-900">
                    دفعات بانتظار تأكيد الاستلام
                  </h3>

                  <p className="mt-1 text-sm text-amber-800">
                    هذه الدفعات لا تدخل في الرصيد المالي حتى يتم تأكيد استلامها.
                  </p>
                </div>

                <div className="rounded-full bg-amber-100 px-4 py-2 text-sm font-bold text-amber-900">
                  {pendingTransactions.length} معلقة
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
                setTransactionType('adjustment')
                setModal('transaction')
              }}
              className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              <Plus className="h-4 w-4" />
              إضافة تسوية
            </button>
          </div>

          {/* جدول العمليات */}

          <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            <div className="border-b px-5 py-4">
              <h3 className="font-bold">
                العمليات المالية
              </h3>
            </div>

            {transactions.length === 0 ? (
              <div className="px-5 py-16 text-center text-sm text-gray-500">
                لا توجد عمليات مالية حتى الآن.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-right">
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
                      (transaction) => (
                        <tr
                          key={transaction.id}
                          className="border-b last:border-b-0 hover:bg-gray-50"
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
                            {money(transaction.amount)}
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
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedTransaction(
                                    transaction
                                  )
                                  setModal('details')
                                }}
                                className="rounded-lg border px-3 py-2 text-xs hover:bg-gray-50"
                              >
                                تفاصيل
                              </button>

                              {transaction.confirmation_status ===
                                'pending' && (
                                <button
                                  type="button"
                                  disabled={saving}
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
                                    setModal('delete')
                                  }}
                                  className="rounded-lg border border-red-200 px-3 py-2 text-xs text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
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
        </>
      )}

      {/* --------------------------------------------------
          Modal: التهيئة
      -------------------------------------------------- */}

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
                  className={`rounded-xl border p-4 text-right ${
                    initializeMode ===
                    'student_payments'
                      ? 'border-black bg-gray-50'
                      : ''
                  }`}
                >
                  <div className="font-semibold">
                    مرتبط بمدفوعات الطلاب
                  </div>

                  <div className="mt-1 text-xs leading-5 text-gray-500">
                    دفعات الطلاب تحتاج تأكيد الاستلام قبل دخولها في الرصيد.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setInitializeMode('manual')
                  }
                  className={`rounded-xl border p-4 text-right ${
                    initializeMode === 'manual'
                      ? 'border-black bg-gray-50'
                      : ''
                  }`}
                >
                  <div className="font-semibold">
                    إدخال يدوي
                  </div>

                  <div className="mt-1 text-xs leading-5 text-gray-500">
                    إدخال الرصيد الأولي يدوياً من أي مصدر.
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
                  setOpeningBalance(e.target.value)
                }
                className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2"
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
                  setOpeningSource(e.target.value)
                }
                className="w-full rounded-lg border bg-white px-3 py-2"
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
                  setOpeningNote(e.target.value)
                }
                rows={3}
                className="w-full rounded-lg border px-3 py-2"
                placeholder="ملاحظات الرصيد الافتتاحي..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModal('none')}
                className="rounded-lg border px-4 py-2"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={initializeFinancial}
                disabled={saving}
                className="rounded-lg bg-black px-5 py-2 text-white disabled:opacity-50"
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

      {/* --------------------------------------------------
          Modal: إضافة عملية
      -------------------------------------------------- */}

      {modal === 'transaction' && (
        <Modal
          title={
            transactionType === 'in'
              ? 'إضافة إيراد'
              : transactionType === 'out'
              ? 'إضافة مصروف'
              : 'إضافة تسوية'
          }
          onClose={() => setModal('none')}
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
                    className={`rounded-lg border px-4 py-3 ${
                      adjustmentDirection ===
                      'plus'
                        ? 'border-black bg-gray-50'
                        : ''
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
                    className={`rounded-lg border px-4 py-3 ${
                      adjustmentDirection ===
                      'minus'
                        ? 'border-black bg-gray-50'
                        : ''
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
                className="w-full rounded-lg border px-3 py-2"
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
                className="w-full rounded-lg border px-3 py-2"
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
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setModal('none')
                }
                className="rounded-lg border px-4 py-2"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={createTransaction}
                disabled={saving}
                className="rounded-lg bg-black px-5 py-2 text-white disabled:opacity-50"
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

      {/* --------------------------------------------------
          Modal: التفاصيل
      -------------------------------------------------- */}

      {modal === 'details' &&
        selectedTransaction && (
          <Modal
            title="تفاصيل العملية"
            onClose={() => {
              setModal('none')
              setSelectedTransaction(null)
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
                value={`${money(
                  selectedTransaction.amount
                )}`}
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
            </div>
          </Modal>
        )}

      {/* --------------------------------------------------
          Modal: حذف
      -------------------------------------------------- */}

      {modal === 'delete' && (
        <Modal
          title="حذف العملية"
          onClose={() => {
            setModal('none')
            setSelectedDeleteId(null)
          }}
        >
          <div className="space-y-5">
            <p className="text-sm leading-6 text-gray-600">
              هل أنت متأكد من حذف هذه العملية؟
              سيتم إعادة احتساب الرصيد بعد الحذف.
            </p>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setModal('none')
                  setSelectedDeleteId(null)
                }}
                className="rounded-lg border px-4 py-2"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={deleteTransaction}
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
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {title}
        </div>

        <div className="text-gray-400">
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
      <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
        بانتظار التأكيد
      </span>
    )
  }

  if (status === 'confirmed') {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
        تم التأكيد
      </span>
    )
  }

  return (
    <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
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
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="font-bold">
            {title}
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-gray-100"
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
    <div className="rounded-xl bg-gray-50 p-4">
      <div className="text-xs text-gray-500">
        {label}
      </div>

      <div className="mt-1 break-all text-sm font-medium">
        {value || '-'}
      </div>
    </div>
  )
}