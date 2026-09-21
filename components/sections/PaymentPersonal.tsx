'use client'

import { useEffect, useMemo, useState } from 'react'

import {
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Calculator,
  Check,
  ChevronRight,
  CircleDollarSign,
  Lock,
  Plus,
  RefreshCcw,
  Trash2,
  Unlock,
  X,
} from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type CycleStatus = 'open' | 'closed'

type TransactionType =
  | 'in'
  | 'out'
  | 'adjustment'

type Cycle = {
  id: string
  name: string
  initial_balance: number
  initial_source: string | null
  initial_note: string | null
  status: CycleStatus
  created_at: string
  closed_at: string | null
  close_note: string | null
  reopened_at: string | null
  reopen_note: string | null
}

type Transaction = {
  id: string
  cycle_id: string
  transaction_type: TransactionType
  amount: number
  description: string
  note: string | null
  adjustment_sign: number | null
  balance_after: number
  created_at: string
}

type ModalType =
  | 'create-cycle'
  | 'transaction'
  | 'close'
  | 'reopen'
  | 'delete-cycle'
  | 'delete-transaction'
  | null

type TransactionFormType =
  | 'in'
  | 'out'
  | 'adjustment'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('ar-BH', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value) + ' د.ب'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ar-BH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'حدث خطأ غير متوقع.'
}

export function PaymentPersonal() {
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [selectedCycle, setSelectedCycle] =
    useState<Cycle | null>(null)

  const [transactions, setTransactions] =
    useState<Transaction[]>([])

  const [loading, setLoading] = useState(true)
  const [loadingTransactions, setLoadingTransactions] =
    useState(false)

  const [modal, setModal] =
    useState<ModalType>(null)

  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')

  /*
   * Create cycle
   */
  const [cycleName, setCycleName] = useState('')
  const [initialBalance, setInitialBalance] =
    useState('')
  const [initialSource, setInitialSource] =
    useState('')
  const [initialNote, setInitialNote] =
    useState('')

  /*
   * Transaction
   */
  const [transactionType, setTransactionType] =
    useState<TransactionFormType>('in')

  const [transactionAmount, setTransactionAmount] =
    useState('')

  const [transactionDescription, setTransactionDescription] =
    useState('')

  const [transactionNote, setTransactionNote] =
    useState('')

  const [adjustmentSign, setAdjustmentSign] =
    useState<1 | -1>(1)

  /*
   * Close / reopen
   */
  const [closeNote, setCloseNote] =
    useState('')

  const [reopenNote, setReopenNote] =
    useState('')

  /*
   * Delete
   */
  const [deleteTransaction, setDeleteTransaction] =
    useState<Transaction | null>(null)

  /*
   * Load cycles
   */
  async function loadCycles() {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(
        '/api/personal-finance/cycles',
        {
          method: 'GET',
          cache: 'no-store',
        },
      )

      if (!response.ok) {
        throw new Error(
          'تعذر تحميل الدورات المالية الشخصية.',
        )
      }

      const data = await response.json()

      setCycles(data.cycles ?? [])
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  /*
   * Load transactions
   */
  async function loadTransactions(cycleId: string) {
    try {
      setLoadingTransactions(true)
      setError('')

      const response = await fetch(
        `/api/personal-finance/transactions?cycleId=${encodeURIComponent(
          cycleId,
        )}`,
        {
          method: 'GET',
          cache: 'no-store',
        },
      )

      if (!response.ok) {
        throw new Error(
          'تعذر تحميل عمليات الدورة.',
        )
      }

      const data = await response.json()

      setTransactions(data.transactions ?? [])
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoadingTransactions(false)
    }
  }

  useEffect(() => {
    loadCycles()
  }, [])

  async function openCycle(cycle: Cycle) {
    setSelectedCycle(cycle)
    setError('')
    await loadTransactions(cycle.id)
  }

  function closeCycleView() {
    setSelectedCycle(null)
    setTransactions([])
    setError('')
  }

  /*
   * Current balance
   */
  const currentBalance = useMemo(() => {
    if (!selectedCycle) {
      return 0
    }

    return transactions.reduce(
      (balance, transaction) => {
        if (transaction.transaction_type === 'in') {
          return balance + transaction.amount
        }

        if (transaction.transaction_type === 'out') {
          return balance - transaction.amount
        }

        return (
          balance +
          transaction.amount *
            (transaction.adjustment_sign ?? 1)
        )
      },
      selectedCycle.initial_balance,
    )
  }, [selectedCycle, transactions])

  /*
   * Create cycle
   */
  async function handleCreateCycle() {
    if (!cycleName.trim()) {
      setError('اكتب اسم الدورة.')
      return
    }

    const parsedBalance = Number(initialBalance || 0)

    if (
      !Number.isFinite(parsedBalance) ||
      parsedBalance < 0
    ) {
      setError('الرصيد الأولي غير صحيح.')
      return
    }

    try {
      setSaving(true)
      setError('')

      const response = await fetch(
        '/api/personal-finance/cycles',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: cycleName.trim(),
            initialBalance: parsedBalance,
            initialSource:
              initialSource.trim() || null,
            initialNote:
              initialNote.trim() || null,
          }),
        },
      )

      if (!response.ok) {
        const data = await response.json().catch(
          () => null,
        )

        throw new Error(
          data?.error ||
            'تعذر إنشاء الدورة.',
        )
      }

      const data = await response.json()

      setCycles((current) => [
        data.cycle,
        ...current,
      ])

      setCycleName('')
      setInitialBalance('')
      setInitialSource('')
      setInitialNote('')
      setModal(null)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  /*
   * Add transaction
   */
  async function handleAddTransaction() {
    if (!selectedCycle) {
      return
    }

    if (selectedCycle.status === 'closed') {
      setError(
        'لا يمكن إضافة عملية إلى دورة مغلقة.',
      )
      return
    }

    const amount = Number(transactionAmount)

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setError('أدخل مبلغًا صحيحًا.')
      return
    }

    if (!transactionDescription.trim()) {
      setError('اكتب بيان العملية.')
      return
    }

    try {
      setSaving(true)
      setError('')

      const response = await fetch(
        '/api/personal-finance/transactions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cycleId: selectedCycle.id,
            transactionType: transactionType,
            amount,
            description:
              transactionDescription.trim(),
            note:
              transactionNote.trim() || null,
            adjustmentSign:
              transactionType === 'adjustment'
                ? adjustmentSign
                : null,
          }),
        },
      )

      if (!response.ok) {
        const data = await response.json().catch(
          () => null,
        )

        throw new Error(
          data?.error ||
            'تعذر تسجيل العملية.',
        )
      }

      setTransactionAmount('')
      setTransactionDescription('')
      setTransactionNote('')
      setAdjustmentSign(1)
      setModal(null)

      await loadTransactions(selectedCycle.id)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  /*
   * Close cycle
   */
  async function handleCloseCycle() {
    if (!selectedCycle) {
      return
    }

    if (!closeNote.trim()) {
      setError(
        'اكتب ملاحظة إغلاق الدورة.',
      )
      return
    }

    try {
      setSaving(true)
      setError('')

      const response = await fetch(
        `/api/personal-finance/cycles/${selectedCycle.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'close',
            note: closeNote.trim(),
          }),
        },
      )

      if (!response.ok) {
        const data = await response.json().catch(
          () => null,
        )

        throw new Error(
          data?.error ||
            'تعذر إغلاق الدورة.',
        )
      }

      const data = await response.json()

      setSelectedCycle(data.cycle)

      setCycles((current) =>
        current.map((cycle) =>
          cycle.id === data.cycle.id
            ? data.cycle
            : cycle,
        ),
      )

      setCloseNote('')
      setModal(null)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  /*
   * Reopen cycle
   */
  async function handleReopenCycle() {
    if (!selectedCycle) {
      return
    }

    if (!reopenNote.trim()) {
      setError(
        'اكتب سبب إعادة فتح الدورة.',
      )
      return
    }

    try {
      setSaving(true)
      setError('')

      const response = await fetch(
        `/api/personal-finance/cycles/${selectedCycle.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'reopen',
            note: reopenNote.trim(),
          }),
        },
      )

      if (!response.ok) {
        const data = await response.json().catch(
          () => null,
        )

        throw new Error(
          data?.error ||
            'تعذر إعادة فتح الدورة.',
        )
      }

      const data = await response.json()

      setSelectedCycle(data.cycle)

      setCycles((current) =>
        current.map((cycle) =>
          cycle.id === data.cycle.id
            ? data.cycle
            : cycle,
        ),
      )

      setReopenNote('')
      setModal(null)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  /*
   * Delete cycle
   */
  async function handleDeleteCycle() {
    if (!selectedCycle) {
      return
    }

    try {
      setSaving(true)
      setError('')

      const response = await fetch(
        `/api/personal-finance/cycles/${selectedCycle.id}`,
        {
          method: 'DELETE',
        },
      )

      if (!response.ok) {
        const data = await response.json().catch(
          () => null,
        )

        throw new Error(
          data?.error ||
            'تعذر حذف الدورة.',
        )
      }

      setCycles((current) =>
        current.filter(
          (cycle) =>
            cycle.id !== selectedCycle.id,
        ),
      )

      closeCycleView()
      setModal(null)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  /*
   * Delete transaction
   */
  async function handleDeleteTransaction() {
    if (!deleteTransaction) {
      return
    }

    try {
      setSaving(true)
      setError('')

      const response = await fetch(
        `/api/personal-finance/transactions/${deleteTransaction.id}`,
        {
          method: 'DELETE',
        },
      )

      if (!response.ok) {
        const data = await response.json().catch(
          () => null,
        )

        throw new Error(
          data?.error ||
            'تعذر حذف العملية.',
        )
      }

      if (selectedCycle) {
        await loadTransactions(
          selectedCycle.id,
        )
      }

      setDeleteTransaction(null)
      setModal(null)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  /*
   * Empty state / list
   */
  if (!selectedCycle) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              الإدارة الشخصية
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              دورات مالية مستقلة وخاصة.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => {
              setError('')
              setModal('create-cycle')
            }}
          >
            <Plus className="ml-2 h-4 w-4" />
            إنشاء دورة جديدة
          </Button>
        </div>

        {error && (
          <ErrorBox message={error} />
        )}

        {loading ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              جاري تحميل الدورات...
            </CardContent>
          </Card>
        ) : cycles.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center">
              <Calculator className="mx-auto h-10 w-10 text-muted-foreground" />

              <h3 className="mt-4 font-semibold">
                لا توجد دورات حتى الآن
              </h3>

              <p className="mt-2 text-sm text-muted-foreground">
                أنشئ أول دورة مالية شخصية للبدء.
              </p>

              <Button
                type="button"
                className="mt-5"
                onClick={() => {
                  setError('')
                  setModal('create-cycle')
                }}
              >
                <Plus className="ml-2 h-4 w-4" />
                إنشاء دورة
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cycles.map((cycle) => (
              <CycleCard
                key={cycle.id}
                cycle={cycle}
                onOpen={() => openCycle(cycle)}
              />
            ))}
          </div>
        )}

        {modal === 'create-cycle' && (
          <Modal
            title="إنشاء دورة جديدة"
            onClose={() => setModal(null)}
          >
            <div className="space-y-4">
              <Field
                label="اسم الطلب أو العملية"
                required
              >
                <input
                  value={cycleName}
                  onChange={(event) =>
                    setCycleName(event.target.value)
                  }
                  placeholder="مثال: شراء معدات"
                  className="input"
                />
              </Field>

              <Field label="الرصيد الأولي">
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={initialBalance}
                  onChange={(event) =>
                    setInitialBalance(
                      event.target.value,
                    )
                  }
                  placeholder="0.000"
                  className="input"
                />
              </Field>

              <Field label="من أين استلم">
                <input
                  value={initialSource}
                  onChange={(event) =>
                    setInitialSource(
                      event.target.value,
                    )
                  }
                  placeholder="اسم الشخص أو الجهة"
                  className="input"
                />
              </Field>

              <Field label="ملاحظة">
                <textarea
                  value={initialNote}
                  onChange={(event) =>
                    setInitialNote(
                      event.target.value,
                    )
                  }
                  rows={3}
                  placeholder="ملاحظات عن الرصيد الأولي..."
                  className="input resize-none"
                />
              </Field>

              {error && (
                <ErrorBox message={error} />
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  className="flex-1"
                  disabled={saving}
                  onClick={handleCreateCycle}
                >
                  {saving
                    ? 'جاري الحفظ...'
                    : 'إنشاء الدورة'}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModal(null)}
                >
                  إلغاء
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    )
  }

  /*
   * Cycle details
   */
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={closeCycleView}
            title="العودة للدورات"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">
                {selectedCycle.name}
              </h2>

              {selectedCycle.status ===
              'open' ? (
                <span className="rounded-full px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700">
                  مفتوحة
                </span>
              ) : (
                <span className="rounded-full px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-700">
                  مغلقة
                </span>
              )}
            </div>

            <p className="mt-1 text-sm text-muted-foreground">
              أنشئت في{' '}
              {formatDate(
                selectedCycle.created_at,
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {selectedCycle.status === 'open' ? (
            <>
              <Button
                type="button"
                onClick={() => {
                  setError('')
                  setTransactionType('in')
                  setModal('transaction')
                }}
              >
                <ArrowDownToLine className="ml-2 h-4 w-4" />
                مبلغ داخل
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setError('')
                  setTransactionType('out')
                  setModal('transaction')
                }}
              >
                <ArrowUpFromLine className="ml-2 h-4 w-4" />
                مبلغ خارج
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setError('')
                  setTransactionType(
                    'adjustment',
                  )
                  setModal('transaction')
                }}
              >
                <RefreshCcw className="ml-2 h-4 w-4" />
                تعديل فرق
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setError('')
                  setModal('close')
                }}
              >
                <Lock className="ml-2 h-4 w-4" />
                إغلاق الدورة
              </Button>
            </>
          ) : (
            <Button
              type="button"
              onClick={() => {
                setError('')
                setModal('reopen')
              }}
            >
              <Unlock className="ml-2 h-4 w-4" />
              إعادة فتح الدورة
            </Button>
          )}

          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              setError('')
              setModal('delete-cycle')
            }}
          >
            <Trash2 className="ml-2 h-4 w-4" />
            حذف
          </Button>
        </div>
      </div>

      {error && (
        <ErrorBox message={error} />
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          title="الرصيد الحالي"
          value={formatCurrency(currentBalance)}
          icon={
            <CircleDollarSign className="h-5 w-5" />
          }
        />

        <StatCard
          title="الرصيد الأولي"
          value={formatCurrency(
            selectedCycle.initial_balance,
          )}
          icon={
            <Calculator className="h-5 w-5" />
          }
        />

        <StatCard
          title="عدد العمليات"
          value={transactions.length.toString()}
          icon={
            <RefreshCcw className="h-5 w-5" />
          }
        />
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <InfoItem
              label="من أين استلم"
              value={
                selectedCycle.initial_source ||
                '—'
              }
            />

            <InfoItem
              label="ملاحظة البداية"
              value={
                selectedCycle.initial_note ||
                '—'
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="border-b p-5">
            <h3 className="font-semibold">
              سجل العمليات
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              جميع العمليات الخاصة بهذه الدورة.
            </p>
          </div>

          {loadingTransactions ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              جاري تحميل العمليات...
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              لا توجد عمليات مسجلة حتى الآن.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-3 text-right font-medium">
                      التاريخ
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      النوع
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      البيان
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      المبلغ
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      الرصيد بعد العملية
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      الإجراء
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {transactions.map(
                    (transaction) => (
                      <tr
                        key={transaction.id}
                        className="border-b last:border-0"
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          {formatDate(
                            transaction.created_at,
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <TransactionBadge
                            transaction={
                              transaction
                            }
                          />
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-medium">
                            {
                              transaction.description
                            }
                          </div>

                          {transaction.note && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              {
                                transaction.note
                              }
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3 font-medium whitespace-nowrap">
                          {transaction.transaction_type ===
                          'out'
                            ? '-'
                            : transaction.transaction_type ===
                              'adjustment' &&
                              transaction.adjustment_sign ===
                                -1
                            ? '-'
                            : '+'}

                          {formatCurrency(
                            transaction.amount,
                          )}
                        </td>

                        <td className="px-4 py-3 font-semibold whitespace-nowrap">
                          {formatCurrency(
                            transaction.balance_after,
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={
                              selectedCycle.status ===
                              'closed'
                            }
                            onClick={() => {
                              setDeleteTransaction(
                                transaction,
                              )
                              setModal(
                                'delete-transaction',
                              )
                            }}
                            title="حذف العملية"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedCycle.status === 'closed' && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <Lock className="mt-0.5 h-5 w-5" />

              <div>
                <h3 className="font-semibold">
                  الدورة مغلقة
                </h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  لا يمكن إضافة عمليات حتى تتم إعادة
                  فتح الدورة.
                </p>

                {selectedCycle.close_note && (
                  <p className="mt-3 text-sm">
                    <span className="font-medium">
                      ملاحظة الإغلاق:
                    </span>{' '}
                    {selectedCycle.close_note}
                  </p>
                )}

                {selectedCycle.closed_at && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(
                      selectedCycle.closed_at,
                    )}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {modal === 'transaction' && (
        <Modal
          title={
            transactionType === 'in'
              ? 'تسجيل مبلغ داخل'
              : transactionType === 'out'
                ? 'تسجيل مبلغ خارج'
                : 'تسجيل تعديل فرق'
          }
          onClose={() => setModal(null)}
        >
          <div className="space-y-4">
            {transactionType === 'adjustment' && (
              <div>
                <label className="mb-2 block text-sm font-medium">
                  اتجاه الفرق
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setAdjustmentSign(1)
                    }
                    className={`rounded-lg border p-3 text-sm ${
                      adjustmentSign === 1
                        ? 'border-primary bg-primary/5'
                        : ''
                    }`}
                  >
                    زيادة الرصيد
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setAdjustmentSign(-1)
                    }
                    className={`rounded-lg border p-3 text-sm ${
                      adjustmentSign === -1
                        ? 'border-primary bg-primary/5'
                        : ''
                    }`}
                  >
                    نقص الرصيد
                  </button>
                </div>
              </div>
            )}

            <Field label="المبلغ" required>
              <input
                type="number"
                min="0"
                step="0.001"
                value={transactionAmount}
                onChange={(event) =>
                  setTransactionAmount(
                    event.target.value,
                  )
                }
                placeholder="0.000"
                className="input"
              />
            </Field>

            <Field label="بيان العملية" required>
              <input
                value={transactionDescription}
                onChange={(event) =>
                  setTransactionDescription(
                    event.target.value,
                  )
                }
                placeholder="مثال: استلام مبلغ من..."
                className="input"
              />
            </Field>

            <Field label="ملاحظة">
              <textarea
                value={transactionNote}
                onChange={(event) =>
                  setTransactionNote(
                    event.target.value,
                  )
                }
                rows={3}
                placeholder="تفاصيل إضافية..."
                className="input resize-none"
              />
            </Field>

            {error && (
              <ErrorBox message={error} />
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                className="flex-1"
                disabled={saving}
                onClick={handleAddTransaction}
              >
                {saving
                  ? 'جاري الحفظ...'
                  : 'حفظ العملية'}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setModal(null)}
              >
                إلغاء
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {modal === 'close' && (
        <Modal
          title="إغلاق الدورة"
          onClose={() => setModal(null)}
        >
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/40 p-4">
              <div className="text-sm text-muted-foreground">
                الرصيد الحالي
              </div>

              <div className="mt-1 text-xl font-semibold">
                {formatCurrency(currentBalance)}
              </div>
            </div>

            <Field
              label="ملاحظة الإغلاق"
              required
            >
              <textarea
                value={closeNote}
                onChange={(event) =>
                  setCloseNote(event.target.value)
                }
                rows={4}
                placeholder="سبب أو ملاحظة إغلاق الدورة..."
                className="input resize-none"
              />
            </Field>

            {error && (
              <ErrorBox message={error} />
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                className="flex-1"
                disabled={saving}
                onClick={handleCloseCycle}
              >
                {saving
                  ? 'جاري الإغلاق...'
                  : 'تأكيد الإغلاق'}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setModal(null)}
              >
                إلغاء
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {modal === 'reopen' && (
        <Modal
          title="إعادة فتح الدورة"
          onClose={() => setModal(null)}
        >
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/40 p-4 text-sm">
              سيتم الاحتفاظ بجميع العمليات والرصيد
              الحالي كما هو، وستتمكن من متابعة الدورة
              من آخر نقطة.
            </div>

            <Field
              label="سبب إعادة الفتح"
              required
            >
              <textarea
                value={reopenNote}
                onChange={(event) =>
                  setReopenNote(
                    event.target.value,
                  )
                }
                rows={4}
                placeholder="اكتب سبب إعادة فتح الدورة..."
                className="input resize-none"
              />
            </Field>

            {error && (
              <ErrorBox message={error} />
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                className="flex-1"
                disabled={saving}
                onClick={handleReopenCycle}
              >
                {saving
                  ? 'جاري إعادة الفتح...'
                  : 'إعادة فتح الدورة'}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setModal(null)}
              >
                إلغاء
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {modal === 'delete-cycle' && (
        <Modal
          title="حذف الدورة"
          onClose={() => setModal(null)}
        >
          <div className="space-y-4">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />

                <div>
                  <p className="font-medium">
                    هل تريد حذف هذه الدورة؟
                  </p>

                  <p className="mt-1 text-muted-foreground">
                    سيتم حذف الدورة وجميع عملياتها
                    نهائيًا.
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <ErrorBox message={error} />
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="destructive"
                className="flex-1"
                disabled={saving}
                onClick={handleDeleteCycle}
              >
                {saving
                  ? 'جاري الحذف...'
                  : 'حذف نهائي'}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setModal(null)}
              >
                إلغاء
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {modal === 'delete-transaction' &&
        deleteTransaction && (
          <Modal
            title="حذف العملية"
            onClose={() => {
              setDeleteTransaction(null)
              setModal(null)
            }}
          >
            <div className="space-y-4">
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
                هل تريد حذف العملية:

                <div className="mt-2 font-semibold">
                  {
                    deleteTransaction.description
                  }
                </div>

                <div className="mt-1">
                  {formatCurrency(
                    deleteTransaction.amount,
                  )}
                </div>

                <p className="mt-3 text-muted-foreground">
                  سيتم إعادة احتساب الرصيد بعد
                  الحذف.
                </p>
              </div>

              {error && (
                <ErrorBox message={error} />
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="destructive"
                  className="flex-1"
                  disabled={saving}
                  onClick={
                    handleDeleteTransaction
                  }
                >
                  {saving
                    ? 'جاري الحذف...'
                    : 'حذف العملية'}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDeleteTransaction(null)
                    setModal(null)
                  }}
                >
                  إلغاء
                </Button>
              </div>
            </div>
          </Modal>
        )}
    </div>
  )
}

/*
 * =========================================================
 * Small UI components
 * =========================================================
 */

function CycleCard({
  cycle,
  onOpen,
}: {
  cycle: Cycle
  onOpen: () => void
}) {
  return (
    <Card
      className="cursor-pointer transition-colors hover:border-primary/50"
      onClick={onOpen}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">
              {cycle.name}
            </h3>

            <p className="mt-1 text-xs text-muted-foreground">
              {formatDate(cycle.created_at)}
            </p>
          </div>

          {cycle.status === 'open' ? (
            <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
              مفتوحة
            </span>
          ) : (
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
              مغلقة
            </span>
          )}
        </div>

        <div className="mt-6">
          <div className="text-xs text-muted-foreground">
            الرصيد الأولي
          </div>

          <div className="mt-1 text-xl font-semibold">
            {formatCurrency(
              cycle.initial_balance,
            )}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            فتح الدورة
          </span>

          <ChevronRight className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  )
}

function TransactionBadge({
  transaction,
}: {
  transaction: Transaction
}) {
  if (transaction.transaction_type === 'in') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
        <ArrowDownToLine className="h-3.5 w-3.5" />
        داخل
      </span>
    )
  }

  if (transaction.transaction_type === 'out') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
        <ArrowUpFromLine className="h-3.5 w-3.5" />
        خارج
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-medium text-yellow-700">
      <RefreshCcw className="h-3.5 w-3.5" />
      تعديل فرق
    </span>
  )
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-muted p-2">
            {icon}
          </div>

          <div>
            <div className="text-sm text-muted-foreground">
              {title}
            </div>

            <div className="mt-1 text-lg font-semibold">
              {value}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function InfoItem({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">
        {label}
      </div>

      <div className="mt-1 text-sm font-medium">
        {value}
      </div>
    </div>
  )
}

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

function ErrorBox({
  message,
}: {
  message: string
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-background shadow-xl">
        <div className="flex items-center justify-between border-b p-5">
          <h3 className="font-semibold">
            {title}
          </h3>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-5">
          {children}
        </div>
      </div>
    </div>
  )
}