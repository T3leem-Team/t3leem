
'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Download,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Wallet,
} from 'lucide-react'

import type {
  AcademicYear,
  AdjustmentDirection,
  FinancialMode,
  FinancialSettings,
  ModalType,
  PaymentFinancialCache,
  StudentPaymentRow,
  Summary,
  Transaction,
  TransactionType,
} from './payment-financial.types'

import {
  loadFinancialAcademicYear,
  loadFinancialManagementData,
  loadFinancialStudentPayments,
  initializeFinancialManagement,
  resetFinancialManagement as resetFinancialManagementRepository,
  createFinancialTransaction,
  confirmFinancialTransaction,
  deleteFinancialTransaction,
} from '@/lib/features/payments/repositories/financial-management.repository'

import {
  emptySummary,
  formatDate,
  formatDateOnly,
  getConfirmationLabel,
  getTransactionLabel,
  money,
} from './payment-financial.utils'

import { SummaryCard } from './payment-financial.components'
import FinancialTables from './payment-financial.tables'
import PaymentFinancialModals from './payment-financial.modals'

/*
 * =========================================================
 * Cache
 * =========================================================
 */

let paymentFinancialCache: PaymentFinancialCache | null = null
let paymentFinancialLoading = false

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
      paymentFinancialCache?.summary ?? emptySummary
    )

  const [loading, setLoading] = useState(
    paymentFinancialCache === null
  )

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [modal, setModal] = useState<ModalType>('none')

  const [
    selectedTransaction,
    setSelectedTransaction,
  ] = useState<Transaction | null>(null)

  const [selectedDeleteId, setSelectedDeleteId] =
    useState<string | null>(null)

  const [initializeMode, setInitializeMode] =
    useState<FinancialMode>('manual')

  const [openingBalance, setOpeningBalance] = useState('')
  const [openingSource, setOpeningSource] = useState('')
  const [openingNote, setOpeningNote] = useState('')

  const [transactionType, setTransactionType] =
    useState<TransactionType>('in')

  const [transactionAmount, setTransactionAmount] =
    useState('')

  const [transactionSource, setTransactionSource] =
    useState('')

  const [transactionNote, setTransactionNote] =
    useState('')

  const [
    adjustmentDirection,
    setAdjustmentDirection,
  ] = useState<AdjustmentDirection>('plus')

  const [refreshing, setRefreshing] = useState(false)

  /*
   * ---------------------------------------------------------
   * جلب السنة الدراسية الحالية
   * ---------------------------------------------------------
   */

  const loadAcademicYear = async () => {
    const year = await loadFinancialAcademicYear()

    setAcademicYear(year)

    return year
  }

  /*
   * ---------------------------------------------------------
   * تحميل الإدارة المالية
   * ---------------------------------------------------------
   */

  const loadFinancialData = async (yearId?: string) => {
    const id = yearId || academicYear?.id

    if (!id) {
      return {
        settings: null,
        transactions: [] as Transaction[],
        summary: emptySummary,
      }
    }

    setError('')

    const result = await loadFinancialManagementData(id)

    setSettings(result.settings)
    setTransactions(result.transactions)
    setSummary(result.summary)

    return result
  }

  /*
   * ---------------------------------------------------------
   * تحميل طلاب السنة ودفعاتهم
   * ---------------------------------------------------------
   */

  const loadStudentPayments = async (
    yearId?: string,
    transactionsOverride?: Transaction[],
    annualFeeOverride?: number
  ) => {
    const id = yearId || academicYear?.id

    if (!id) {
      return []
    }

    const currentTransactions =
      transactionsOverride ?? transactions

    const annualFee = Number(
      annualFeeOverride ?? academicYear?.annual_fee ?? 0
    )

    const rows = await loadFinancialStudentPayments(
      id,
      annualFee,
      currentTransactions
    )

    setStudentPayments(rows)

    return rows
  }

  /*
   * ---------------------------------------------------------
   * تحديث الكاش
   * ---------------------------------------------------------
   */

  const saveFinancialCache = ({
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
    const current = paymentFinancialCache

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
   * تحديث جميع البيانات
   * ---------------------------------------------------------
   */

  const refreshFinancialData = async (
    year: AcademicYear
  ) => {
    const financial = await loadFinancialData(year.id)

    const loadedStudents = await loadStudentPayments(
      year.id,
      financial.transactions,
      Number(year.annual_fee || 0)
    )

    saveFinancialCache({
      academicYear: year,
      settings: financial.settings,
      transactions: financial.transactions,
      studentPayments: loadedStudents,
      summary: financial.summary,
    })

    return financial
  }

  /*
   * ---------------------------------------------------------
   * التحميل الكامل
   * ---------------------------------------------------------
   */

  const loadAll = async () => {
    const hasCache = paymentFinancialCache !== null

    try {
      if (!hasCache) {
        setLoading(true)
      }

      setError('')

      const year = await loadAcademicYear()

      await refreshFinancialData(year)
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

      const year = await loadAcademicYear()

      await refreshFinancialData(year)
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

    const amount = Number(openingBalance || 0)

    if (!Number.isFinite(amount) || amount < 0) {
      setError(
        'الرصيد الافتتاحي لا يمكن أن يكون سالباً'
      )
      return
    }

    try {
      setSaving(true)
      setError('')

      const result = await initializeFinancialManagement({
        academic_year_id: academicYear.id,
        financial_mode: initializeMode,
        opening_balance: amount,
        opening_source: openingSource.trim() || null,
        opening_note: openingNote.trim() || null,
      })

      setModal('none')
      setOpeningBalance('')
      setOpeningSource('')
      setOpeningNote('')

      const financial = await loadFinancialData(
        academicYear.id
      )

      const loadedStudents = await loadStudentPayments(
        academicYear.id,
        financial.transactions,
        Number(academicYear.annual_fee || 0)
      )

      saveFinancialCache({
        academicYear,
        settings:
          financial.settings ??
          result.settings ??
          null,
        transactions: financial.transactions,
        studentPayments: loadedStudents,
        summary: financial.summary,
      })
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

      await resetFinancialManagementRepository({
        academic_year_id: academicYear.id,
      })

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

      saveFinancialCache({
        academicYear,
        settings: null,
        transactions: [],
        studentPayments: [],
        summary: {
          ...emptySummary,
        },
      })
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

    const amount = Number(transactionAmount)

    if (!Number.isFinite(amount) || amount <= 0) {
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

      await createFinancialTransaction({
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
        source: transactionSource.trim() || null,
        note: transactionNote.trim() || null,
      })

      setModal('none')
      setTransactionAmount('')
      setTransactionSource('')
      setTransactionNote('')
      setTransactionType('in')
      setAdjustmentDirection('plus')

      await refreshFinancialData(academicYear)
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

    if (transaction.confirmation_status !== 'pending') {
      return
    }

    try {
      setSaving(true)
      setError('')

      await confirmFinancialTransaction({
        academic_year_id: academicYear.id,
        transaction_id: transaction.id,
      })

      await refreshFinancialData(academicYear)

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
   * تأكيد جميع المعاملات المعلقة
   * ---------------------------------------------------------
   */

  const confirmAllPendingTransactions = async () => {
    if (
      !academicYear ||
      pendingTransactions.length === 0
    ) {
      return
    }

    try {
      setSaving(true)
      setError('')

      for (const transaction of pendingTransactions) {
        await confirmFinancialTransaction({
          academic_year_id: academicYear.id,
          transaction_id: transaction.id,
        })
      }

      await refreshFinancialData(academicYear)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'تعذر قبول جميع المعاملات المعلقة'
      )

      // إعادة تحميل البيانات حتى لو تعذّر تأكيد إحدى المعاملات
      try {
        await refreshFinancialData(academicYear)
      } catch {
        // الاحتفاظ برسالة الخطأ الأصلية
      }
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
    if (!academicYear || !selectedDeleteId) {
      return
    }

    try {
      setSaving(true)
      setError('')

      await deleteFinancialTransaction({
        academic_year_id: academicYear.id,
        transaction_id: selectedDeleteId,
      })

      setModal('none')
      setSelectedDeleteId(null)

      await refreshFinancialData(academicYear)
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

    const rows = transactions.map((transaction) => [
      formatDate(transaction.created_at),
      getTransactionLabel(transaction),
      transaction.amount,
      transaction.balance_before ?? '',
      transaction.balance_after ?? '',
      transaction.source ?? '',
      transaction.student_id
        ? studentNameById.get(transaction.student_id) || ''
        : '',
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

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            const value = String(cell ?? '')

            return `"${value.replace(/"/g, '""')}"`
          })
          .join(',')
      )
      .join('\n')

    const blob = new Blob(['\ufeff' + csv], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `financial-management-${academicYear.name}.csv`

    document.body.appendChild(link)
    link.click()
    link.remove()

    URL.revokeObjectURL(url)
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
                refreshing ? 'animate-spin' : ''
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
                {formatDateOnly(academicYear.start_date)} إلى{' '}
                {formatDateOnly(academicYear.end_date)}
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
              اختر طريقة تأسيس الرصيد لهذه السنة الدراسية.
              يمكن إعادة تهيئة هذا القسم أثناء التطوير دون حذف
              مدفوعات الطلاب أو بياناتهم.
            </p>

            <button
              type="button"
              onClick={() => setModal('initialize')}
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
                  {settings.financial_mode === 'student_payments'
                    ? 'مرتبط بمدفوعات الطلاب'
                    : 'إدخال يدوي'}
                </div>

                <div className="mt-1 text-xs text-muted-foreground">
                  {settings.financial_mode === 'student_payments'
                    ? 'دفعات الطلاب تدخل الرصيد بعد تأكيد الاستلام.'
                    : 'الإيرادات والمصروفات والتسويات تدار يدويًا.'}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="rounded-lg bg-muted px-4 py-3 text-sm">
                  الرصيد الافتتاحي:{' '}
                  <span className="font-bold">
                    {money(settings.opening_balance)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setModal('reset')}
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

          <FinancialTables
            settings={settings}
            studentPayments={studentPayments}
            transactions={transactions}
            pendingTransactions={pendingTransactions}
            saving={saving}
            onConfirmTransaction={confirmTransaction}
            onConfirmAllTransactions={confirmAllPendingTransactions}
            onShowDetails={(transaction) => {
              setSelectedTransaction(transaction)
              setModal('details')
            }}
            onRequestDelete={(id) => {
              setSelectedDeleteId(id)
              setModal('delete')
            }}
            onAddIncome={() => {
              setTransactionType('in')
              setModal('transaction')
            }}
            onAddExpense={() => {
              setTransactionType('out')
              setModal('transaction')
            }}
            onAddAdjustment={() => {
              setTransactionType('adjustment')
              setModal('transaction')
            }}
          />
        </>
      )}

      <PaymentFinancialModals
        modal={modal}
        setModal={setModal}
        saving={saving}
        initializeMode={initializeMode}
        setInitializeMode={setInitializeMode}
        openingBalance={openingBalance}
        setOpeningBalance={setOpeningBalance}
        openingSource={openingSource}
        setOpeningSource={setOpeningSource}
        openingNote={openingNote}
        setOpeningNote={setOpeningNote}
        transactionType={transactionType}
        setTransactionType={setTransactionType}
        transactionAmount={transactionAmount}
        setTransactionAmount={setTransactionAmount}
        transactionSource={transactionSource}
        setTransactionSource={setTransactionSource}
        transactionNote={transactionNote}
        setTransactionNote={setTransactionNote}
        adjustmentDirection={adjustmentDirection}
        setAdjustmentDirection={setAdjustmentDirection}
        selectedTransaction={selectedTransaction}
        setSelectedTransaction={setSelectedTransaction}
        selectedDeleteId={selectedDeleteId}
        setSelectedDeleteId={setSelectedDeleteId}
        initializeFinancial={initializeFinancial}
        resetFinancialManagement={resetFinancialManagement}
        createTransaction={createTransaction}
        confirmTransaction={confirmTransaction}
        deleteTransaction={deleteTransaction}
      />
    </div>
  )
}
