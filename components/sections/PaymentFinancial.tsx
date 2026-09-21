'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Check,
  ChevronDown,
  Download,
  Loader2,
  Plus,
  RefreshCw,
  Settings2,
  Trash2,
  X,
} from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'

type FinancialMode =
  | 'student_payments'
  | 'manual'

type TransactionType =
  | 'in'
  | 'out'
  | 'adjustment'

type AdjustmentDirection =
  | 'plus'
  | 'minus'

type Transaction = {
  id: string
  academic_year_id: string
  transaction_type: TransactionType
  amount: number
  adjustment_direction:
    | AdjustmentDirection
    | null
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
  confirmation_status:
    | 'pending'
    | 'confirmed'
    | 'not_required'
  confirmed_by: string | null
  confirmed_at: string | null
  created_by: string | null
  created_at: string
  note: string | null
  balance_before: number
  balance_after: number
}

type FinancialSettings = {
  id: string
  academic_year_id: string
  financial_mode: FinancialMode
  opening_balance: number
  opening_source: string | null
  opening_note: string | null
}

type Summary = {
  openingBalance: number
  balance: number
  totalIn: number
  totalOut: number
  operations: number
}

type ModalType =
  | 'none'
  | 'initialize'
  | 'add'
  | 'details'

function formatMoney(value: number) {
  return new Intl.NumberFormat('ar-SA', {
    numberingSystem: 'latn',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatDate(value: string | null) {
  if (!value) return '—'

  return new Date(value).toLocaleDateString('ar-SA', {
    calendar: 'gregory',
    numberingSystem: 'latn',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function formatDateTime(value: string | null) {
  if (!value) return '—'

  return new Date(value).toLocaleString('ar-SA', {
    calendar: 'gregory',
    numberingSystem: 'latn',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function transactionLabel(transaction: Transaction) {
  if (transaction.transaction_type === 'in') {
    return 'دخل'
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

function transactionIsPositive(
  transaction: Transaction,
) {
  if (transaction.transaction_type === 'in') {
    return true
  }

  if (
    transaction.transaction_type === 'adjustment' &&
    transaction.adjustment_direction === 'plus'
  ) {
    return true
  }

  return false
}

function sourceLabel(transaction: Transaction) {
  if (
    transaction.source_type ===
    'student_payment'
  ) {
    return (
      transaction.source ||
      'مدفوعات الطلاب'
    )
  }

  if (transaction.source_type === 'opening') {
    return (
      transaction.source ||
      'الرصيد الافتتاحي'
    )
  }

  if (transaction.source_type === 'adjustment') {
    return (
      transaction.source ||
      'تسوية'
    )
  }

  return (
    transaction.source ||
    'إدخال يدوي'
  )
}

export function PaymentFinancial() {
  const [academicYearId, setAcademicYearId] =
    useState<string | null>(null)

  const [settings, setSettings] =
    useState<FinancialSettings | null>(null)

  const [transactions, setTransactions] =
    useState<Transaction[]>([])

  const [summary, setSummary] =
    useState<Summary>({
      openingBalance: 0,
      balance: 0,
      totalIn: 0,
      totalOut: 0,
      operations: 0,
    })

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [error, setError] =
    useState('')

  const [modal, setModal] =
    useState<ModalType>('none')

  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null)

  const [transactionType, setTransactionType] =
    useState<TransactionType>('in')

  const [adjustmentDirection, setAdjustmentDirection] =
    useState<AdjustmentDirection>('plus')

  const [amount, setAmount] =
    useState('')

  const [source, setSource] =
    useState('')

  const [paymentMethod, setPaymentMethod] =
    useState('')

  const [referenceNumber, setReferenceNumber] =
    useState('')

  const [note, setNote] =
    useState('')

  const [openingBalance, setOpeningBalance] =
    useState('')

  const [openingSource, setOpeningSource] =
    useState('')

  const [openingNote, setOpeningNote] =
    useState('')

  const [confirmingId, setConfirmingId] =
    useState<string | null>(null)

  const [deletingId, setDeletingId] =
    useState<string | null>(null)

  /*
   * نحاول الحصول على السنة الدراسية الحالية
   * من endpoint الموجود في النظام.
   */
  async function getAcademicYear() {
    const candidates = [
      '/api/academic-years/current',
      '/api/academic-year/current',
      '/api/settings/academic-year',
    ]

    for (const url of candidates) {
      try {
        const response = await fetch(url)

        if (!response.ok) continue

        const data = await response.json()

        const id =
          data?.id ??
          data?.academic_year?.id ??
          data?.academicYear?.id ??
          data?.currentYear?.id

        if (id) {
          return id as string
        }
      } catch {
        // تجربة endpoint التالي
      }
    }

    return null
  }

  async function loadFinancialData(
    yearId: string,
  ) {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        `/api/financial-management?academic_year_id=${encodeURIComponent(
          yearId,
        )}`,
        {
          cache: 'no-store',
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ||
            'تعذر تحميل الإدارة المالية',
        )
      }

      setSettings(data.settings ?? null)
      setTransactions(data.transactions ?? [])
      setSummary(
        data.summary ?? {
          openingBalance: 0,
          balance: 0,
          totalIn: 0,
          totalOut: 0,
          operations: 0,
        },
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'تعذر تحميل الإدارة المالية',
      )
    } finally {
      setLoading(false)
    }
  }

  async function initializeYear() {
    if (!academicYearId) return

    const balance = Number(openingBalance)

    if (
      !Number.isFinite(balance) ||
      balance < 0
    ) {
      setError(
        'أدخل رصيدًا افتتاحيًا صحيحًا',
      )
      return
    }

    setSaving(true)
    setError('')

    try {
      const response = await fetch(
        '/api/financial-management/transactions',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            action: 'initialize',
            academic_year_id:
              academicYearId,
            financial_mode:
              initializeMode,
            opening_balance: balance,
            opening_source:
              openingSource || null,
            opening_note:
              openingNote || null,
          }),
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ||
            'تعذر إعداد النظام المالي',
        )
      }

      closeModal()

      setOpeningBalance('')
      setOpeningSource('')
      setOpeningNote('')

      await loadFinancialData(
        academicYearId,
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'تعذر إعداد النظام المالي',
      )
    } finally {
      setSaving(false)
    }
  }

  async function createTransaction() {
    if (!academicYearId) return

    const numericAmount = Number(amount)

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setError('أدخل مبلغًا صحيحًا')
      return
    }

    if (
      transactionType === 'adjustment' &&
      !adjustmentDirection
    ) {
      setError('حدد اتجاه التسوية')
      return
    }

    setSaving(true)
    setError('')

    try {
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
              academicYearId,
            transaction_type:
              transactionType,
            amount: numericAmount,
            adjustment_direction:
              transactionType === 'adjustment'
                ? adjustmentDirection
                : null,
            source_type:
              transactionType === 'adjustment'
                ? 'adjustment'
                : 'manual',
            source: source || null,
            payment_method:
              paymentMethod || null,
            reference_number:
              referenceNumber || null,
            note: note || null,
          }),
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ||
            'تعذر إضافة العملية',
        )
      }

      closeModal()
      resetTransactionForm()

      await loadFinancialData(
        academicYearId,
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'تعذر إضافة العملية',
      )
    } finally {
      setSaving(false)
    }
  }

  async function confirmTransaction(
    transactionId: string,
  ) {
    setConfirmingId(transactionId)
    setError('')

    try {
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
            transaction_id:
              transactionId,
          }),
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ||
            'تعذر تأكيد العملية',
        )
      }

      if (academicYearId) {
        await loadFinancialData(
          academicYearId,
        )
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'تعذر تأكيد العملية',
      )
    } finally {
      setConfirmingId(null)
    }
  }

  async function deleteTransaction(
    transactionId: string,
  ) {
    const confirmed = window.confirm(
      'هل أنت متأكد من حذف هذه العملية؟\nسيتم إعادة احتساب الرصيد بعد الحذف.',
    )

    if (!confirmed) return

    setDeletingId(transactionId)
    setError('')

    try {
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
            transaction_id:
              transactionId,
          }),
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ||
            'تعذر حذف العملية',
        )
      }

      if (
        selectedTransaction?.id ===
        transactionId
      ) {
        closeModal()
      }

      if (academicYearId) {
        await loadFinancialData(
          academicYearId,
        )
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'تعذر حذف العملية',
      )
    } finally {
      setDeletingId(null)
    }
  }

  function resetTransactionForm() {
    setTransactionType('in')
    setAdjustmentDirection('plus')
    setAmount('')
    setSource('')
    setPaymentMethod('')
    setReferenceNumber('')
    setNote('')
  }

  function closeModal() {
    setModal('none')
    setSelectedTransaction(null)
  }

  function openDetails(
    transaction: Transaction,
  ) {
    setSelectedTransaction(transaction)
    setModal('details')
  }

  function exportExcel() {
    if (!transactions.length) {
      window.alert(
        'لا توجد عمليات لتصديرها',
      )
      return
    }

    /*
     * CSV بصيغة UTF-8 مع BOM.
     * يفتح مباشرة في Excel ويحافظ على العربية.
     */
    const headers = [
      'معرف العملية',
      'معرف السنة الدراسية',
      'نوع العملية',
      'المبلغ',
      'الرصيد قبل',
      'الرصيد بعد',
      'مصدر العملية',
      'المصدر',
      'معرف الدفعة',
      'معرف الطالب',
      'رقم طلب الطالب',
      'طريقة الدفع',
      'رقم المرجع',
      'حالة التأكيد',
      'المؤكد بواسطة',
      'وقت التأكيد',
      'أنشأ بواسطة',
      'تاريخ الإنشاء',
      'ملاحظة',
    ]

    const escape = (value: unknown) => {
      const text =
        value === null ||
        value === undefined
          ? ''
          : String(value)

      return `"${text.replace(
        /"/g,
        '""',
      )}"`
    }

    const rows = transactions.map(
      (transaction) => [
        transaction.id,
        transaction.academic_year_id,
        transactionLabel(transaction),
        transaction.amount,
        transaction.balance_before,
        transaction.balance_after,
        transaction.source_type,
        sourceLabel(transaction),
        transaction.payment_id,
        transaction.student_id,
        transaction.student_request_number,
        transaction.payment_method,
        transaction.reference_number,
        transaction.confirmation_status,
        transaction.confirmed_by,
        formatDateTime(
          transaction.confirmed_at,
        ),
        transaction.created_by,
        formatDateTime(
          transaction.created_at,
        ),
        transaction.note,
      ],
    )

    const csv = [
      headers.map(escape).join(','),
      ...rows.map((row) =>
        row.map(escape).join(','),
      ),
    ].join('\r\n')

    const blob = new Blob(
      [
        '\uFEFF' + csv,
      ],
      {
        type: 'text/csv;charset=utf-8;',
      },
    )

    const url =
      URL.createObjectURL(blob)

    const link =
      document.createElement('a')

    link.href = url

    link.download =
      `إدارة-مالية-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`

    document.body.appendChild(link)
    link.click()
    link.remove()

    URL.revokeObjectURL(url)
  }

  const [initializeMode, setInitializeMode] =
    useState<FinancialMode>(
      'student_payments',
    )

  const pendingCount = useMemo(
    () =>
      transactions.filter(
        (item) =>
          item.confirmation_status ===
          'pending',
      ).length,
    [transactions],
  )

  useEffect(() => {
    let cancelled = false

    async function initialize() {
      setLoading(true)

      const id =
        await getAcademicYear()

      if (cancelled) return

      if (!id) {
        setError(
          'تعذر معرفة السنة الدراسية الحالية',
        )
        setLoading(false)
        return
      }

      setAcademicYearId(id)

      await loadFinancialData(id)
    }

    initialize()

    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex min-h-[320px] items-center justify-center">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>
              جاري تحميل الإدارة المالية...
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error && !settings) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
            <p className="font-medium text-destructive">
              {error}
            </p>

            {academicYearId && (
              <button
                type="button"
                onClick={() =>
                  loadFinancialData(
                    academicYearId,
                  )
                }
                className="mt-4 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-muted"
              >
                <RefreshCw className="h-4 w-4" />
                إعادة المحاولة
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  /*
   * --------------------------------------------------
   * لم يتم اختيار النظام المالي بعد
   * --------------------------------------------------
   */
  if (!settings) {
    return (
      <>
        <Card>
          <CardContent className="p-6">
            <div className="mb-8">
              <h2 className="text-2xl font-bold">
                إدارة المالية
              </h2>

              <p className="mt-2 text-sm text-muted-foreground">
                اختر طريقة إدارة أموال المدرسة
                لهذه السنة الدراسية.
              </p>
            </div>

            {error && (
              <div className="mb-5 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setInitializeMode(
                    'student_payments',
                  )
                  setModal('initialize')
                }}
                className="rounded-2xl border p-5 text-right transition hover:border-primary hover:bg-muted/40"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  <ArrowDownCircle className="h-6 w-6 text-primary" />
                </div>

                <h3 className="text-lg font-semibold">
                  مرتبط بمدفوعات الطلاب
                </h3>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  مدفوعات الطلاب تظهر كعمليات
                  دخل وتحتاج إلى تأكيد استلام
                  من مدير المدرسة قبل دخولها
                  في الرصيد.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setInitializeMode(
                    'manual',
                  )
                  setModal('initialize')
                }}
                className="rounded-2xl border p-5 text-right transition hover:border-primary hover:bg-muted/40"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  <Plus className="h-6 w-6 text-primary" />
                </div>

                <h3 className="text-lg font-semibold">
                  إدخال يدوي
                </h3>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  مناسب للمصادر المختلفة مثل
                  الرصيد السابق أو النقد أو
                  التحويل أو الدعم أو أي مصدر
                  آخر.
                </p>
              </button>
            </div>
          </CardContent>
        </Card>

        {modal === 'initialize' && (
          <InitializeModal
            mode={initializeMode}
            openingBalance={
              openingBalance
            }
            setOpeningBalance={
              setOpeningBalance
            }
            openingSource={
              openingSource
            }
            setOpeningSource={
              setOpeningSource
            }
            openingNote={
              openingNote
            }
            setOpeningNote={
              setOpeningNote
            }
            saving={saving}
            onClose={closeModal}
            onSave={initializeYear}
          />
        )}
      </>
    )
  }

  return (
    <div className="space-y-5">
      {/* العنوان */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            إدارة المالية
          </h2>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>
              {settings.financial_mode ===
              'student_payments'
                ? 'مرتبط بمدفوعات الطلاب'
                : 'إدخال يدوي'}
            </span>

            <span>•</span>

            <span>
              {settings.opening_source ||
                'بدون مصدر محدد'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportExcel}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            <Download className="h-4 w-4" />
            تحميل Excel
          </button>

          <button
            type="button"
            onClick={() => {
              resetTransactionForm()
              setModal('add')
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            إضافة عملية
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError('')}
            className="shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* الملخص */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          title="الرصيد الحالي"
          value={summary.balance}
          highlight
        />

        <SummaryCard
          title="إجمالي الدخل"
          value={summary.totalIn}
          positive
        />

        <SummaryCard
          title="إجمالي المصروف"
          value={summary.totalOut}
          negative
        />

        <SummaryCard
          title="الرصيد الافتتاحي"
          value={summary.openingBalance}
        />

        <SummaryCard
          title="عدد العمليات"
          value={summary.operations}
          count
        />
      </div>

      {/* التنبيه بالعمليات المعلقة */}
      {pendingCount > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-300/60 bg-amber-50 p-4 dark:bg-amber-950/20 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">
              توجد عمليات بانتظار التأكيد
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              عدد العمليات التي تحتاج إلى
              تأكيد استلام: {pendingCount}
            </p>
          </div>
        </div>
      )}

      {/* الجدول */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b p-5">
            <div>
              <h3 className="font-semibold">
                العمليات المالية
              </h3>

              <p className="mt-1 text-xs text-muted-foreground">
                جميع عمليات السنة الدراسية الحالية
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                academicYearId &&
                loadFinancialData(
                  academicYearId,
                )
              }
              className="rounded-lg border p-2 hover:bg-muted"
              title="تحديث"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {transactions.length === 0 ? (
            <div className="flex min-h-[240px] items-center justify-center p-8 text-center text-sm text-muted-foreground">
              لا توجد عمليات مالية حتى الآن.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-right">
                    <th className="px-4 py-3 font-medium">
                      التاريخ
                    </th>

                    <th className="px-4 py-3 font-medium">
                      النوع
                    </th>

                    <th className="px-4 py-3 font-medium">
                      المبلغ
                    </th>

                    <th className="px-4 py-3 font-medium">
                      المصدر
                    </th>

                    <th className="px-4 py-3 font-medium">
                      الحالة
                    </th>

                    <th className="px-4 py-3 font-medium">
                      الرصيد
                    </th>

                    <th className="px-4 py-3 font-medium">
                      التفاصيل
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {transactions.map(
                    (transaction) => {
                      const positive =
                        transactionIsPositive(
                          transaction,
                        )

                      return (
                        <tr
                          key={
                            transaction.id
                          }
                          className="border-b last:border-0 hover:bg-muted/20"
                        >
                          <td className="px-4 py-4 whitespace-nowrap">
                            {formatDate(
                              transaction.created_at,
                            )}
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              {positive ? (
                                <ArrowUpCircle className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <ArrowDownCircle className="h-4 w-4 text-red-600" />
                              )}

                              <span>
                                {transactionLabel(
                                  transaction,
                                )}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-4 font-medium">
                            {positive
                              ? '+'
                              : '-'}{' '}
                            {formatMoney(
                              Number(
                                transaction.amount,
                              ),
                            )}
                          </td>

                          <td className="max-w-[220px] px-4 py-4">
                            <div className="truncate">
                              {transaction.student_id
                                ? 'طالب'
                                : sourceLabel(
                                    transaction,
                                  )}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <StatusBadge
                              transaction={
                                transaction
                              }
                            />
                          </td>

                          <td className="px-4 py-4 font-medium whitespace-nowrap">
                            {formatMoney(
                              Number(
                                transaction.balance_after,
                              ),
                            )}
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              {transaction.confirmation_status ===
                                'pending' && (
                                <button
                                  type="button"
                                  disabled={
                                    confirmingId ===
                                    transaction.id
                                  }
                                  onClick={() =>
                                    confirmTransaction(
                                      transaction.id,
                                    )
                                  }
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                                >
                                  {confirmingId ===
                                  transaction.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Check className="h-3.5 w-3.5" />
                                  )}
                                  تأكيد
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  openDetails(
                                    transaction,
                                  )
                                }
                                className="rounded-lg border px-3 py-1.5 text-xs hover:bg-muted"
                              >
                                تفاصيل
                              </button>

                              <button
                                type="button"
                                disabled={
                                  deletingId ===
                                  transaction.id
                                }
                                onClick={() =>
                                  deleteTransaction(
                                    transaction.id,
                                  )
                                }
                                className="rounded-lg border p-1.5 text-destructive hover:bg-destructive/5 disabled:opacity-50"
                                title="حذف"
                              >
                                {deletingId ===
                                transaction.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    },
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* إعدادات السنة */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <Settings2 className="mt-0.5 h-5 w-5 text-muted-foreground" />

            <div>
              <p className="font-medium">
                إعداد النظام المالي
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                النظام الحالي:{' '}
                {settings.financial_mode ===
                'student_payments'
                  ? 'مرتبط بمدفوعات الطلاب'
                  : 'إدخال يدوي'}
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                المصدر الافتتاحي:{' '}
                {settings.opening_source ||
                  'غير محدد'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* إضافة عملية */}
      {modal === 'add' && (
        <AddTransactionModal
          transactionType={
            transactionType
          }
          setTransactionType={
            setTransactionType
          }
          adjustmentDirection={
            adjustmentDirection
          }
          setAdjustmentDirection={
            setAdjustmentDirection
          }
          amount={amount}
          setAmount={setAmount}
          source={source}
          setSource={setSource}
          paymentMethod={paymentMethod}
          setPaymentMethod={
            setPaymentMethod
          }
          referenceNumber={
            referenceNumber
          }
          setReferenceNumber={
            setReferenceNumber
          }
          note={note}
          setNote={setNote}
          saving={saving}
          onClose={closeModal}
          onSave={createTransaction}
        />
      )}

      {/* التفاصيل */}
      {modal === 'details' &&
        selectedTransaction && (
          <DetailsModal
            transaction={
              selectedTransaction
            }
            onClose={closeModal}
            onDelete={() =>
              deleteTransaction(
                selectedTransaction.id,
              )
            }
            deleting={
              deletingId ===
              selectedTransaction.id
            }
          />
        )}
    </div>
  )
}

/* ======================================================
   Summary Card
====================================================== */

function SummaryCard({
  title,
  value,
  positive,
  negative,
  highlight,
  count,
}: {
  title: string
  value: number
  positive?: boolean
  negative?: boolean
  highlight?: boolean
  count?: boolean
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">
          {title}
        </p>

        <p
          className={[
            'mt-2 text-2xl font-bold',
            highlight
              ? 'text-primary'
              : '',
            positive
              ? 'text-emerald-600'
              : '',
            negative
              ? 'text-red-600'
              : '',
          ].join(' ')}
        >
          {count
            ? value
            : formatMoney(value)}
          {!count && (
            <span className="mr-1 text-xs font-normal text-muted-foreground">
              د.ب
            </span>
          )}
        </p>
      </CardContent>
    </Card>
  )
}

/* ======================================================
   Status Badge
====================================================== */

function StatusBadge({
  transaction,
}: {
  transaction: Transaction
}) {
  if (
    transaction.confirmation_status ===
    'pending'
  ) {
    return (
      <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
        بانتظار التأكيد
      </span>
    )
  }

  if (
    transaction.confirmation_status ===
    'confirmed'
  ) {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
        مؤكد
      </span>
    )
  }

  return (
    <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
      لا يحتاج تأكيد
    </span>
  )
}

/* ======================================================
   Initialize Modal
====================================================== */

function InitializeModal({
  mode,
  openingBalance,
  setOpeningBalance,
  openingSource,
  setOpeningSource,
  openingNote,
  setOpeningNote,
  saving,
  onClose,
  onSave,
}: {
  mode: FinancialMode
  openingBalance: string
  setOpeningBalance: (
    value: string,
  ) => void
  openingSource: string
  setOpeningSource: (
    value: string,
  ) => void
  openingNote: string
  setOpeningNote: (
    value: string,
  ) => void
  saving: boolean
  onClose: () => void
  onSave: () => void
}) {
  return (
    <Modal
      title="إعداد الإدارة المالية"
      onClose={onClose}
    >
      <div className="space-y-5">
        <div className="rounded-xl bg-muted/50 p-4">
          <p className="text-sm font-medium">
            النظام المختار
          </p>

          <p className="mt-1 font-semibold">
            {mode === 'student_payments'
              ? 'مرتبط بمدفوعات الطلاب'
              : 'إدخال يدوي'}
          </p>

          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            هذا الاختيار تأسيسي للسنة
            الدراسية، ويحدد طريقة دخول
            الأموال إلى الإدارة المالية.
          </p>
        </div>

        <Field
          label="الرصيد الافتتاحي"
          required
        >
          <input
            type="number"
            min="0"
            step="0.01"
            value={openingBalance}
            onChange={(event) =>
              setOpeningBalance(
                event.target.value,
              )
            }
            placeholder="0.00"
            className={inputClass}
          />
        </Field>

        <Field label="مصدر الرصيد">
          <input
            value={openingSource}
            onChange={(event) =>
              setOpeningSource(
                event.target.value,
              )
            }
            placeholder={
              mode === 'manual'
                ? 'مثال: رصيد سابق، نقد، تحويل، دعم...'
                : 'مثال: رصيد سابق'
            }
            className={inputClass}
          />
        </Field>

        <Field label="ملاحظة">
          <textarea
            value={openingNote}
            onChange={(event) =>
              setOpeningNote(
                event.target.value,
              )
            }
            rows={3}
            className={textareaClass}
            placeholder="أي ملاحظات على الرصيد الافتتاحي..."
          />
        </Field>

        <div className="flex justify-end gap-2 border-t pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-muted"
          >
            إلغاء
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {saving && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            حفظ الإعداد
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ======================================================
   Add Transaction Modal
====================================================== */

function AddTransactionModal({
  transactionType,
  setTransactionType,
  adjustmentDirection,
  setAdjustmentDirection,
  amount,
  setAmount,
  source,
  setSource,
  paymentMethod,
  setPaymentMethod,
  referenceNumber,
  setReferenceNumber,
  note,
  setNote,
  saving,
  onClose,
  onSave,
}: {
  transactionType: TransactionType
  setTransactionType: (
    value: TransactionType,
  ) => void
  adjustmentDirection: AdjustmentDirection
  setAdjustmentDirection: (
    value: AdjustmentDirection,
  ) => void
  amount: string
  setAmount: (value: string) => void
  source: string
  setSource: (value: string) => void
  paymentMethod: string
  setPaymentMethod: (
    value: string,
  ) => void
  referenceNumber: string
  setReferenceNumber: (
    value: string,
  ) => void
  note: string
  setNote: (value: string) => void
  saving: boolean
  onClose: () => void
  onSave: () => void
}) {
  return (
    <Modal
      title="إضافة عملية مالية"
      onClose={onClose}
    >
      <div className="space-y-5">
        <Field label="نوع العملية">
          <div className="grid grid-cols-3 gap-2">
            <TypeButton
              active={
                transactionType === 'in'
              }
              onClick={() =>
                setTransactionType('in')
              }
            >
              دخل
            </TypeButton>

            <TypeButton
              active={
                transactionType === 'out'
              }
              onClick={() =>
                setTransactionType('out')
              }
            >
              مصروف
            </TypeButton>

            <TypeButton
              active={
                transactionType ===
                'adjustment'
              }
              onClick={() =>
                setTransactionType(
                  'adjustment',
                )
              }
            >
              تسوية
            </TypeButton>
          </div>
        </Field>

        {transactionType ===
          'adjustment' && (
          <Field label="اتجاه التسوية">
            <div className="grid grid-cols-2 gap-2">
              <TypeButton
                active={
                  adjustmentDirection ===
                  'plus'
                }
                onClick={() =>
                  setAdjustmentDirection(
                    'plus',
                  )
                }
              >
                تسوية +
              </TypeButton>

              <TypeButton
                active={
                  adjustmentDirection ===
                  'minus'
                }
                onClick={() =>
                  setAdjustmentDirection(
                    'minus',
                  )
                }
              >
                تسوية -
              </TypeButton>
            </div>
          </Field>
        )}

        <Field label="المبلغ" required>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) =>
              setAmount(
                event.target.value,
              )
            }
            placeholder="0.00"
            className={inputClass}
          />
        </Field>

        <Field label="المصدر">
          <input
            value={source}
            onChange={(event) =>
              setSource(
                event.target.value,
              )
            }
            placeholder={
              transactionType === 'out'
                ? 'مثال: شراء، صيانة، راتب...'
                : 'مثال: نقد، تحويل، دعم...'
            }
            className={inputClass}
          />
        </Field>

        {transactionType !==
          'adjustment' && (
          <Field label="طريقة الدفع">
            <select
              value={paymentMethod}
              onChange={(event) =>
                setPaymentMethod(
                  event.target.value,
                )
              }
              className={inputClass}
            >
              <option value="">
                اختر الطريقة
              </option>
              <option value="نقدي">
                نقدي
              </option>
              <option value="تحويل">
                تحويل
              </option>
              <option value="بطاقة">
                بطاقة
              </option>
              <option value="أخرى">
                أخرى
              </option>
            </select>
          </Field>
        )}

        <Field label="رقم المرجع">
          <input
            value={referenceNumber}
            onChange={(event) =>
              setReferenceNumber(
                event.target.value,
              )
            }
            placeholder="اختياري"
            className={inputClass}
          />
        </Field>

        <Field label="ملاحظة">
          <textarea
            value={note}
            onChange={(event) =>
              setNote(
                event.target.value,
              )
            }
            rows={3}
            className={textareaClass}
            placeholder="ملاحظات العملية..."
          />
        </Field>

        <div className="flex justify-end gap-2 border-t pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-muted"
          >
            إلغاء
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {saving && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            حفظ العملية
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ======================================================
   Details Modal
====================================================== */

function DetailsModal({
  transaction,
  onClose,
  onDelete,
  deleting,
}: {
  transaction: Transaction
  onClose: () => void
  onDelete: () => void
  deleting: boolean
}) {
  return (
    <Modal
      title="تفاصيل العملية"
      onClose={onClose}
    >
      <div className="space-y-5">
        <div className="rounded-xl bg-muted/40 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                نوع العملية
              </p>

              <p className="mt-1 font-semibold">
                {transactionLabel(
                  transaction,
                )}
              </p>
            </div>

            <p className="text-xl font-bold">
              {transactionIsPositive(
                transaction,
              )
                ? '+'
                : '-'}{' '}
              {formatMoney(
                Number(
                  transaction.amount,
                ),
              )}{' '}
              د.ب
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Detail
            label="معرف العملية"
            value={transaction.id}
          />

          <Detail
            label="تاريخ العملية"
            value={formatDateTime(
              transaction.created_at,
            )}
          />

          <Detail
            label="الرصيد قبل"
            value={`${formatMoney(
              Number(
                transaction.balance_before,
              ),
            )} د.ب`}
          />

          <Detail
            label="الرصيد بعد"
            value={`${formatMoney(
              Number(
                transaction.balance_after,
              ),
            )} د.ب`}
          />

          <Detail
            label="مصدر العملية"
            value={
              sourceLabel(
                transaction,
              )
            }
          />

          <Detail
            label="نوع المصدر"
            value={
              transaction.source_type
            }
          />

          <Detail
            label="معرف الدفعة"
            value={
              transaction.payment_id
            />

          <Detail
            label="معرف الطالب"
            value={
              transaction.student_id
            }
          />

          <Detail
            label="رقم طلب الطالب"
            value={
              transaction.student_request_number
            }
          />

          <Detail
            label="طريقة الدفع"
            value={
              transaction.payment_method
            }
          />

          <Detail
            label="رقم المرجع"
            value={
              transaction.reference_number
            }
          />

          <Detail
            label="حالة التأكيد"
            value={
              transaction.confirmation_status ===
              'pending'
                ? 'بانتظار التأكيد'
                : transaction.confirmation_status ===
                  'confirmed'
                ? 'مؤكد'
                : 'لا يحتاج تأكيد'
            }
          />

          <Detail
            label="المؤكد بواسطة"
            value={
              transaction.confirmed_by
            }
          />

          <Detail
            label="وقت التأكيد"
            value={formatDateTime(
              transaction.confirmed_at,
            )}
          />

          <Detail
            label="أنشأ بواسطة"
            value={
              transaction.created_by
            }
          />

          {transaction.adjustment_direction && (
            <Detail
              label="اتجاه التسوية"
              value={
                transaction.adjustment_direction ===
                'plus'
                  ? 'زيادة'
                  : 'نقص'
              }
            />
          )}
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">
            الملاحظة
          </p>

          <div className="min-h-[70px] rounded-lg border bg-muted/20 p-3 text-sm">
            {transaction.note ||
              'لا توجد ملاحظات'}
          </div>
        </div>

        <div className="flex justify-between border-t pt-4">
          <button
            type="button"
            disabled={deleting}
            onClick={onDelete}
            className="inline-flex items-center gap-2 rounded-lg border border-destructive/30 px-4 py-2 text-sm text-destructive hover:bg-destructive/5 disabled:opacity-50"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            حذف العملية
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-muted"
          >
            إغلاق
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ======================================================
   Shared UI
====================================================== */

const inputClass =
  'w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary'

const textareaClass =
  'w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary'

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">
        {label}
        {required && (
          <span className="mr-1 text-destructive">
            *
          </span>
        )}
      </label>

      {children}
    </div>
  )
}

function TypeButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-lg border px-3 py-2 text-sm transition',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'hover:bg-muted',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function Detail({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 break-all text-sm font-medium">
        {value || '—'}
      </p>
    </div>
  )
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-background shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-5 py-4">
          <h3 className="font-semibold">
            {title}
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          {children}
        </div>
      </div>
    </div>
  )
}