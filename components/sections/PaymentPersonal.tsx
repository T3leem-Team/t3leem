'use client'

import { useEffect, useState } from 'react'

type Cycle = {
  id: string
  name: string
  initial_balance: number
  initial_source: string | null
  initial_note: string | null
  status: 'open' | 'closed'
  created_at: string
  updated_at: string
}

type Transaction = {
  id: string
  cycle_id: string
  transaction_type: 'in' | 'out' | 'adjustment'
  amount: number
  description: string
  note: string | null
  adjustment_sign: number | null
  balance_after: number
  created_at: string
}

export function PaymentPersonal() {
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [selectedCycle, setSelectedCycle] =
    useState<Cycle | null>(null)

  const [transactions, setTransactions] =
    useState<Transaction[]>([])

  const [currentBalance, setCurrentBalance] =
    useState(0)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [showCreateCycle, setShowCreateCycle] =
    useState(false)

  const [showAddTransaction, setShowAddTransaction] =
    useState(false)

  const [cycleName, setCycleName] = useState('')
  const [initialBalance, setInitialBalance] =
    useState('')

  const [initialSource, setInitialSource] =
    useState('')

  const [initialNote, setInitialNote] =
    useState('')

  const [transactionType, setTransactionType] =
    useState<'in' | 'out' | 'adjustment'>('in')

  const [transactionAmount, setTransactionAmount] =
    useState('')

  const [transactionDescription, setTransactionDescription] =
    useState('')

  const [transactionNote, setTransactionNote] =
    useState('')

  const [adjustmentSign, setAdjustmentSign] =
    useState<1 | -1>(1)

  async function loadCycles() {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(
        '/api/personal-finance?action=cycles',
        {
          cache: 'no-store',
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            'تعذر تحميل الدفاتر.',
        )
      }

      setCycles(data.cycles ?? [])
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'تعذر تحميل الدفاتر.',
      )
    } finally {
      setLoading(false)
    }
  }

  async function loadTransactions(
    cycle: Cycle,
  ) {
    try {
      setError('')

      const response = await fetch(
        `/api/personal-finance?action=transactions&cycleId=${cycle.id}`,
        {
          cache: 'no-store',
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            'تعذر تحميل العمليات.',
        )
      }

      setSelectedCycle(data.cycle)
      setTransactions(data.transactions ?? [])
      setCurrentBalance(
        Number(data.currentBalance ?? 0),
      )
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'تعذر تحميل العمليات.',
      )
    }
  }

  async function createCycle() {
    if (!cycleName.trim()) {
      setError('اسم الدفتر مطلوب.')
      return
    }

    const balance = Number(initialBalance || 0)

    if (!Number.isFinite(balance) || balance < 0) {
      setError('الرصيد الأولي غير صحيح.')
      return
    }

    try {
      setSaving(true)
      setError('')

      const response = await fetch(
        '/api/personal-finance',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'create-cycle',
            name: cycleName.trim(),
            initial_balance: balance,
            initial_source:
              initialSource.trim() || null,
            initial_note:
              initialNote.trim() || null,
          }),
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            'تعذر إنشاء الدفتر.',
        )
      }

      setCycleName('')
      setInitialBalance('')
      setInitialSource('')
      setInitialNote('')
      setShowCreateCycle(false)

      await loadCycles()

      if (data.cycle) {
        await loadTransactions(data.cycle)
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'تعذر إنشاء الدفتر.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function addTransaction() {
    if (!selectedCycle) {
      setError('اختر دفترًا أولًا.')
      return
    }

    if (selectedCycle.status !== 'open') {
      setError('الدفتر مغلق.')
      return
    }

    const amount = Number(transactionAmount)

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('المبلغ يجب أن يكون أكبر من صفر.')
      return
    }

    if (!transactionDescription.trim()) {
      setError('وصف العملية مطلوب.')
      return
    }

    try {
      setSaving(true)
      setError('')

      const response = await fetch(
        '/api/personal-finance',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'add-transaction',
            cycle_id: selectedCycle.id,
            transaction_type: transactionType,
            amount,
            description:
              transactionDescription.trim(),
            note:
              transactionNote.trim() || null,
            adjustment_sign:
              transactionType === 'adjustment'
                ? adjustmentSign
                : null,
          }),
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            'تعذر إضافة العملية.',
        )
      }

      setTransactionAmount('')
      setTransactionDescription('')
      setTransactionNote('')
      setAdjustmentSign(1)
      setShowAddTransaction(false)

      await loadTransactions(selectedCycle)
      await loadCycles()
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'تعذر إضافة العملية.',
      )
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    loadCycles()
  }, [])

  return (
    <div dir="rtl" className="space-y-6">

      {/* العنوان */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            الإدارة الشخصية
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            إدارة الدفاتر المالية والعمليات الشخصية.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setError('')
            setShowCreateCycle(true)
          }}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          + إضافة دفتر
        </button>
      </div>

      {/* الخطأ */}
      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* الدفاتر */}
      <div className="rounded-2xl border bg-background p-6">

        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            الدفاتر المالية
          </h3>

          <button
            type="button"
            onClick={loadCycles}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            تحديث
          </button>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            جاري التحميل...
          </div>
        ) : cycles.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <p className="font-medium">
              لا توجد دفاتر
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              ابدأ بإضافة دفتر مالي جديد.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {cycles.map((cycle) => (
              <button
                key={cycle.id}
                type="button"
                onClick={() => loadTransactions(cycle)}
                className={`rounded-xl border p-4 text-right transition hover:border-primary ${
                  selectedCycle?.id === cycle.id
                    ? 'border-primary bg-primary/5'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">
                    {cycle.name}
                  </span>

                  <span className="text-xs">
                    {cycle.status === 'open'
                      ? 'مفتوح'
                      : 'مغلق'}
                  </span>
                </div>

                <div className="mt-3 text-sm text-muted-foreground">
                  الرصيد الأولي
                </div>

                <div className="mt-1 text-lg font-bold">
                  {Number(
                    cycle.initial_balance ?? 0,
                  ).toFixed(3)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* تفاصيل الدفتر */}
      {selectedCycle && (
        <div className="rounded-2xl border bg-background p-6">

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

            <div>
              <h3 className="text-xl font-semibold">
                {selectedCycle.name}
              </h3>

              <p className="mt-1 text-sm text-muted-foreground">
                {selectedCycle.status === 'open'
                  ? 'الدفتر مفتوح'
                  : 'الدفتر مغلق'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-xl border px-5 py-3 text-center">
                <div className="text-xs text-muted-foreground">
                  الرصيد الحالي
                </div>

                <div className="mt-1 text-xl font-bold">
                  {currentBalance.toFixed(3)}
                </div>
              </div>

              {selectedCycle.status === 'open' && (
                <button
                  type="button"
                  onClick={() => {
                    setError('')
                    setShowAddTransaction(true)
                  }}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                  + إضافة عملية
                </button>
              )}
            </div>

          </div>

          {/* العمليات */}
          <div className="mt-6">

            <h4 className="mb-3 font-semibold">
              العمليات
            </h4>

            {transactions.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                لا توجد عمليات في هذا الدفتر.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-right">
                        العملية
                      </th>
                      <th className="px-4 py-3 text-right">
                        الوصف
                      </th>
                      <th className="px-4 py-3 text-right">
                        المبلغ
                      </th>
                      <th className="px-4 py-3 text-right">
                        الرصيد
                      </th>
                      <th className="px-4 py-3 text-right">
                        التاريخ
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {transactions.map(
                      (transaction) => (
                        <tr
                          key={transaction.id}
                          className="border-t"
                        >
                          <td className="px-4 py-3">
                            {transaction.transaction_type ===
                            'in'
                              ? 'إيداع'
                              : transaction.transaction_type ===
                                'out'
                                ? 'مصروف'
                                : 'تسوية'}
                          </td>

                          <td className="px-4 py-3">
                            {transaction.description}
                          </td>

                          <td className="px-4 py-3">
                            {transaction.transaction_type ===
                              'out' ||
                            (transaction.transaction_type ===
                              'adjustment' &&
                              transaction.adjustment_sign ===
                                -1)
                              ? '-'
                              : '+'}
                            {Number(
                              transaction.amount,
                            ).toFixed(3)}
                          </td>

                          <td className="px-4 py-3 font-semibold">
                            {Number(
                              transaction.balance_after,
                            ).toFixed(3)}
                          </td>

                          <td className="px-4 py-3 text-muted-foreground">
                            {new Date(
                              transaction.created_at,
                            ).toLocaleString('ar-SA')}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        </div>
      )}

      {/* نافذة إضافة دفتر */}
      {showCreateCycle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

          <div className="w-full max-w-lg rounded-2xl bg-background p-6 shadow-xl">

            <h3 className="text-xl font-bold">
              إضافة دفتر مالي
            </h3>

            <div className="mt-5 space-y-4">

              <div>
                <label className="text-sm font-medium">
                  اسم الدفتر
                </label>

                <input
                  value={cycleName}
                  onChange={(e) =>
                    setCycleName(e.target.value)
                  }
                  placeholder="مثال: مصروفات شخصية"
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium">
                  الرصيد الأولي
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={initialBalance}
                  onChange={(e) =>
                    setInitialBalance(e.target.value)
                  }
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium">
                  المصدر
                </label>

                <input
                  value={initialSource}
                  onChange={(e) =>
                    setInitialSource(e.target.value)
                  }
                  placeholder="مثال: نقدي"
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium">
                  ملاحظة
                </label>

                <textarea
                  value={initialNote}
                  onChange={(e) =>
                    setInitialNote(e.target.value)
                  }
                  className="mt-1 min-h-24 w-full rounded-lg border bg-background px-3 py-2"
                />
              </div>

            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  setShowCreateCycle(false)
                }
                className="rounded-lg border px-4 py-2"
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={createCycle}
                className="rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
              >
                {saving
                  ? 'جاري الحفظ...'
                  : 'إنشاء الدفتر'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* نافذة إضافة عملية */}
      {showAddTransaction &&
        selectedCycle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

            <div className="w-full max-w-lg rounded-2xl bg-background p-6 shadow-xl">

              <h3 className="text-xl font-bold">
                إضافة عملية
              </h3>

              <div className="mt-5 space-y-4">

                <div>
                  <label className="text-sm font-medium">
                    نوع العملية
                  </label>

                  <select
                    value={transactionType}
                    onChange={(e) =>
                      setTransactionType(
                        e.target.value as
                          | 'in'
                          | 'out'
                          | 'adjustment',
                      )
                    }
                    className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
                  >
                    <option value="in">
                      إيداع
                    </option>

                    <option value="out">
                      مصروف
                    </option>

                    <option value="adjustment">
                      تسوية
                    </option>
                  </select>
                </div>

                {transactionType ===
                  'adjustment' && (
                  <div>
                    <label className="text-sm font-medium">
                      اتجاه التسوية
                    </label>

                    <select
                      value={adjustmentSign}
                      onChange={(e) =>
                        setAdjustmentSign(
                          Number(
                            e.target.value,
                          ) as 1 | -1,
                        )
                      }
                      className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
                    >
                      <option value={1}>
                        زيادة الرصيد
                      </option>

                      <option value={-1}>
                        تخفيض الرصيد
                      </option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium">
                    المبلغ
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={transactionAmount}
                    onChange={(e) =>
                      setTransactionAmount(
                        e.target.value,
                      )
                    }
                    className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">
                    وصف العملية
                  </label>

                  <input
                    value={transactionDescription}
                    onChange={(e) =>
                      setTransactionDescription(
                        e.target.value,
                      )
                    }
                    placeholder="مثال: شراء مستلزمات"
                    className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">
                    ملاحظة
                  </label>

                  <textarea
                    value={transactionNote}
                    onChange={(e) =>
                      setTransactionNote(
                        e.target.value,
                      )
                    }
                    className="mt-1 min-h-24 w-full rounded-lg border bg-background px-3 py-2"
                  />
                </div>

              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setShowAddTransaction(false)
                  }
                  className="rounded-lg border px-4 py-2"
                >
                  إلغاء
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={addTransaction}
                  className="rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
                >
                  {saving
                    ? 'جاري الحفظ...'
                    : 'إضافة العملية'}
                </button>
              </div>

            </div>
          </div>
        )}
    </div>
  )
}