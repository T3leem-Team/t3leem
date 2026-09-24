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

type PaymentPersonalCache = {
  cycles: Cycle[]
}

let paymentPersonalCache:
  | PaymentPersonalCache
  | null = null

let paymentPersonalLoading = false

export function PaymentPersonal() {
  const [cycles, setCycles] = useState<Cycle[]>(
    paymentPersonalCache?.cycles ?? [],
  )

  const [selectedCycle, setSelectedCycle] =
    useState<Cycle | null>(null)

  const [transactions, setTransactions] = useState<
    Transaction[]
  >([])

  const [currentBalance, setCurrentBalance] =
    useState(0)

  const [loading, setLoading] = useState(
    paymentPersonalCache === null,
  )

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [showCreateCycle, setShowCreateCycle] =
    useState(false)

  const [showDetails, setShowDetails] =
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

  const [
    transactionDescription,
    setTransactionDescription,
  ] = useState('')

  const [transactionNote, setTransactionNote] =
    useState('')

  const [adjustmentSign, setAdjustmentSign] =
    useState<1 | -1>(1)

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('ar-SA', {
      calendar: 'gregory',
      numberingSystem: 'latn',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  function formatDateTime(date: string) {
    return new Date(date).toLocaleString('ar-SA', {
      calendar: 'gregory',
      numberingSystem: 'latn',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  async function loadCycles() {
    const hasCache =
      paymentPersonalCache !== null

    try {
      if (!hasCache) {
        setLoading(true)
      }

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
          data.error || 'تعذر تحميل الدفاتر.',
        )
      }

      const nextCycles: Cycle[] =
        Array.isArray(data.cycles)
          ? data.cycles
          : []

      setCycles(nextCycles)

      paymentPersonalCache = {
        cycles: nextCycles,
      }
    } catch (err) {
      if (!hasCache) {
        setError(
          err instanceof Error
            ? err.message
            : 'تعذر تحميل الدفاتر.',
        )
      }
    } finally {
      setLoading(false)
    }
  }

  async function openDetails(cycle: Cycle) {
    try {
      setError('')
      setSelectedCycle(cycle)
      setTransactions([])
      setCurrentBalance(0)
      setShowDetails(true)

      const response = await fetch(
        `/api/personal-finance?action=transactions&cycleId=${cycle.id}`,
        {
          cache: 'no-store',
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error || 'تعذر تحميل العمليات.',
        )
      }

      const nextCycle: Cycle =
        data.cycle ?? cycle

      setSelectedCycle(nextCycle)
      setTransactions(
        Array.isArray(data.transactions)
          ? data.transactions
          : [],
      )

      setCurrentBalance(
        Number(data.currentBalance ?? 0),
      )

      setCycles((current) =>
        current.map((item) =>
          item.id === nextCycle.id
            ? nextCycle
            : item,
        ),
      )

      paymentPersonalCache = {
        cycles: cycles.map((item) =>
          item.id === nextCycle.id
            ? nextCycle
            : item,
        ),
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'تعذر تحميل العمليات.',
      )
    }
  }

  async function createCycle() {
    if (!cycleName.trim()) {
      setError('اسم الدفتر مطلوب.')
      return
    }

    const balance = Number(
      initialBalance || 0,
    )

    if (
      !Number.isFinite(balance) ||
      balance < 0
    ) {
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
          data.error || 'تعذر إنشاء الدفتر.',
        )
      }

      setCycleName('')
      setInitialBalance('')
      setInitialSource('')
      setInitialNote('')
      setShowCreateCycle(false)

      await loadCycles()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'تعذر إنشاء الدفتر.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function addTransaction() {
    if (!selectedCycle) {
      return
    }

    if (selectedCycle.status !== 'open') {
      setError(
        'هذا الدفتر مغلق ولا يمكن إضافة عمليات جديدة.',
      )
      return
    }

    const amount = Number(
      transactionAmount,
    )

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setError(
        'المبلغ يجب أن يكون أكبر من صفر.',
      )
      return
    }

    if (
      !transactionDescription.trim()
    ) {
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
            transaction_type:
              transactionType,
            amount,
            description:
              transactionDescription.trim(),
            note:
              transactionNote.trim() ||
              null,
            adjustment_sign:
              transactionType ===
              'adjustment'
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

      await openDetails(selectedCycle)
      await loadCycles()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'تعذر إضافة العملية.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function updateCycleStatus(
    cycle: Cycle,
    status: 'open' | 'closed',
  ) {
    const message =
      status === 'closed'
        ? `هل تريد إغلاق الدفتر "${cycle.name}"؟\n\nبعد الإغلاق لن تتمكن من إضافة عمليات جديدة.`
        : `هل تريد فتح الدفتر "${cycle.name}" مرة أخرى؟`

    if (!window.confirm(message)) {
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
            action:
              'update-cycle-status',
            cycle_id: cycle.id,
            status,
          }),
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            'تعذر تحديث حالة الدفتر.',
        )
      }

      const updatedCycle: Cycle = {
        ...cycle,
        status,
        updated_at:
          data.cycle?.updated_at ??
          cycle.updated_at,
      }

      setCycles((current) =>
        current.map((item) =>
          item.id === cycle.id
            ? updatedCycle
            : item,
        ),
      )

      paymentPersonalCache = {
        cycles: (
          paymentPersonalCache?.cycles ??
          cycles
        ).map((item) =>
          item.id === cycle.id
            ? updatedCycle
            : item,
        ),
      }

      if (
        selectedCycle?.id === cycle.id
      ) {
        setSelectedCycle(updatedCycle)
      }

      if (status === 'closed') {
        setShowAddTransaction(false)
      }

      await loadCycles()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'تعذر تحديث حالة الدفتر.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function deleteCycle(
    cycle: Cycle,
  ) {
    const confirmed = window.confirm(
      `هل أنت متأكد من مسح الدفتر "${cycle.name}"؟\n\nسيتم حذف الدفتر وجميع عملياته نهائيًا ولا يمكن التراجع عن ذلك.`,
    )

    if (!confirmed) {
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
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            action: 'delete-cycle',
            cycle_id: cycle.id,
          }),
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            'تعذر مسح الدفتر.',
        )
      }

      const nextCycles = cycles.filter(
        (item) =>
          item.id !== cycle.id,
      )

      setCycles(nextCycles)

      paymentPersonalCache = {
        cycles: nextCycles,
      }

      if (
        selectedCycle?.id === cycle.id
      ) {
        setSelectedCycle(null)
        setTransactions([])
        setCurrentBalance(0)
        setShowDetails(false)
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'تعذر مسح الدفتر.',
      )
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (paymentPersonalLoading) {
      return
    }

    paymentPersonalLoading = true

    void loadCycles()

    return () => {
      /*
       * لا نلغي الطلب.
       * التحديث يستمر بالخلفية
       * ويحدث الـ cache.
       */
    }
  }, [])

  return (
    <div
      dir="rtl"
      className="space-y-6"
    >
      {/* العنوان */}
      <div className="flex items-center justify-between">
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

      {/* رسالة الخطأ */}
      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* جدول الدفاتر */}
      <div className="overflow-hidden rounded-2xl border bg-background">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="font-semibold">
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
          <div className="p-10 text-center text-sm text-muted-foreground">
            جاري التحميل...
          </div>
        ) : cycles.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-medium">
              لا توجد دفاتر مالية
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              اضغط «إضافة دفتر» لإنشاء أول دفتر.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-5 py-4 text-right">
                    اسم الدفتر
                  </th>

                  <th className="px-5 py-4 text-right">
                    الرصيد الأولي
                  </th>

                  <th className="px-5 py-4 text-right">
                    الحالة
                  </th>

                  <th className="px-5 py-4 text-right">
                    تاريخ الإنشاء
                  </th>

                  <th className="px-5 py-4 text-center">
                    الإجراءات
                  </th>
                </tr>
              </thead>

              <tbody>
                {cycles.map((cycle) => (
                  <tr
                    key={cycle.id}
                    className="border-t hover:bg-muted/30"
                  >
                    <td className="px-5 py-4 font-semibold">
                      {cycle.name}
                    </td>

                    <td className="px-5 py-4">
                      {Number(
                        cycle.initial_balance ??
                          0,
                      ).toFixed(3)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={
                          cycle.status ===
                          'open'
                            ? 'rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700'
                            : 'rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700'
                        }
                      >
                        {cycle.status ===
                        'open'
                          ? 'مفتوح'
                          : 'مغلق'}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-muted-foreground">
                      {formatDate(
                        cycle.created_at,
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openDetails(
                              cycle,
                            )
                          }
                          className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
                        >
                          التفاصيل
                        </button>

                        {cycle.status ===
                        'open' ? (
                          <button
                            type="button"
                            disabled={
                              saving
                            }
                            onClick={() =>
                              updateCycleStatus(
                                cycle,
                                'closed',
                              )
                            }
                            className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            إغلاق
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={
                              saving
                            }
                            onClick={() =>
                              updateCycleStatus(
                                cycle,
                                'open',
                              )
                            }
                            className="rounded-lg border border-green-300 px-3 py-2 text-sm font-medium text-green-600 hover:bg-green-50 disabled:opacity-50"
                          >
                            فتح
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={
                            saving
                          }
                          onClick={() =>
                            deleteCycle(
                              cycle,
                            )
                          }
                          className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          مسح
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* نافذة تفاصيل الدفتر */}
      {showDetails &&
        selectedCycle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="flex max-h-[90vh] w-full max-w-6xl flex-col rounded-2xl bg-background shadow-2xl">

              {/* رأس النافذة */}
              <div className="flex items-center justify-between border-b p-5">
                <div>
                  <h3 className="text-xl font-bold">
                    {
                      selectedCycle.name
                    }
                  </h3>

                  <p className="mt-1 text-sm text-muted-foreground">
                    تفاصيل الدفتر وجميع العمليات
                  </p>
                </div>

                <div className="flex items-center gap-2">

                  {selectedCycle.status ===
                  'open' ? (
                    <button
                      type="button"
                      disabled={
                        saving
                      }
                      onClick={() =>
                        updateCycleStatus(
                          selectedCycle,
                          'closed',
                        )
                      }
                      className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      إغلاق الدفتر
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={
                        saving
                      }
                      onClick={() =>
                        updateCycleStatus(
                          selectedCycle,
                          'open',
                        )
                      }
                      className="rounded-lg border border-green-300 px-3 py-2 text-sm font-medium text-green-600 hover:bg-green-50 disabled:opacity-50"
                    >
                      فتح الدفتر
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={
                      saving
                    }
                    onClick={() =>
                      deleteCycle(
                        selectedCycle,
                      )
                    }
                    className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    مسح
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setShowDetails(
                        false,
                      )
                    }
                    className="rounded-lg border px-3 py-2 text-sm"
                  >
                    إغلاق
                  </button>

                </div>
              </div>

              {/* ملخص الدفتر */}
              <div className="grid gap-4 border-b p-5 md:grid-cols-3">

                <div className="rounded-xl border p-4">
                  <div className="text-sm text-muted-foreground">
                    الرصيد الأولي
                  </div>

                  <div className="mt-1 text-xl font-bold">
                    {Number(
                      selectedCycle.initial_balance ??
                        0,
                    ).toFixed(3)}
                  </div>
                </div>

                <div className="rounded-xl border p-4">
                  <div className="text-sm text-muted-foreground">
                    الرصيد الحالي
                  </div>

                  <div className="mt-1 text-xl font-bold">
                    {currentBalance.toFixed(
                      3,
                    )}
                  </div>
                </div>

                <div className="rounded-xl border p-4">
                  <div className="text-sm text-muted-foreground">
                    الحالة
                  </div>

                  <div
                    className={
                      selectedCycle.status ===
                      'open'
                        ? 'mt-1 text-xl font-bold text-green-600'
                        : 'mt-1 text-xl font-bold text-red-600'
                    }
                  >
                    {selectedCycle.status ===
                    'open'
                      ? 'مفتوح'
                      : 'مغلق'}
                  </div>
                </div>

              </div>

              {/* العمليات */}
              <div className="flex-1 overflow-auto p-5">

                <div className="mb-4 flex items-center justify-between">
                  <h4 className="font-semibold">
                    جميع العمليات
                  </h4>

                  {selectedCycle.status ===
                    'open' && (
                    <button
                      type="button"
                      onClick={() => {
                        setError('')
                        setShowAddTransaction(
                          true,
                        )
                      }}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                    >
                      + إضافة عملية
                    </button>
                  )}
                </div>

                {selectedCycle.status ===
                  'closed' && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    هذا الدفتر مغلق. لا يمكن إضافة عمليات
                    جديدة حتى يتم فتحه.
                  </div>
                )}

                {transactions.length ===
                0 ? (
                  <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                    لا توجد عمليات في هذا الدفتر.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border">
                    <table className="w-full text-sm">

                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 text-right">
                            النوع
                          </th>

                          <th className="px-4 py-3 text-right">
                            الوصف
                          </th>

                          <th className="px-4 py-3 text-right">
                            المبلغ
                          </th>

                          <th className="px-4 py-3 text-right">
                            الرصيد بعد العملية
                          </th>

                          <th className="px-4 py-3 text-right">
                            التاريخ
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {transactions.map(
                          (
                            transaction,
                          ) => {
                            const isOut =
                              transaction.transaction_type ===
                                'out' ||
                              (
                                transaction.transaction_type ===
                                  'adjustment' &&
                                transaction.adjustment_sign ===
                                  -1
                              )

                            return (
                              <tr
                                key={
                                  transaction.id
                                }
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

                                <td className="px-4 py-3 font-medium">
                                  {
                                    transaction.description
                                  }

                                  {transaction.note && (
                                    <div className="mt-1 text-xs text-muted-foreground">
                                      {
                                        transaction.note
                                      }
                                    </div>
                                  )}
                                </td>

                                <td
                                  className={`px-4 py-3 font-semibold ${
                                    isOut
                                      ? 'text-red-600'
                                      : 'text-green-600'
                                  }`}
                                >
                                  {isOut
                                    ? '-'
                                    : '+'}

                                  {Number(
                                    transaction.amount,
                                  ).toFixed(
                                    3,
                                  )}
                                </td>

                                <td className="px-4 py-3 font-semibold">
                                  {Number(
                                    transaction.balance_after,
                                  ).toFixed(
                                    3,
                                  )}
                                </td>

                                <td className="px-4 py-3 text-muted-foreground">
                                  {formatDateTime(
                                    transaction.created_at,
                                  )}
                                </td>
                              </tr>
                            )
                          },
                        )}
                      </tbody>

                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      {/* نافذة إضافة دفتر */}
      {showCreateCycle && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">

          <div className="w-full max-w-lg rounded-2xl bg-background p-6 shadow-2xl">

            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">
                إضافة دفتر مالي
              </h3>

              <button
                type="button"
                onClick={() =>
                  setShowCreateCycle(
                    false,
                  )
                }
                className="rounded-lg border px-3 py-1"
              >
                ×
              </button>
            </div>

            <div className="mt-5 space-y-4">

              <div>
                <label className="text-sm font-medium">
                  اسم الدفتر
                </label>

                <input
                  value={cycleName}
                  onChange={(e) =>
                    setCycleName(
                      e.target.value,
                    )
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
                  value={
                    initialBalance
                  }
                  onChange={(e) =>
                    setInitialBalance(
                      e.target.value,
                    )
                  }
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium">
                  المصدر
                </label>

                <input
                  value={
                    initialSource
                  }
                  onChange={(e) =>
                    setInitialSource(
                      e.target.value,
                    )
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
                  value={
                    initialNote
                  }
                  onChange={(e) =>
                    setInitialNote(
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
                  setShowCreateCycle(
                    false,
                  )
                }
                className="rounded-lg border px-4 py-2"
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={
                  createCycle
                }
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
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">

            <div className="w-full max-w-lg rounded-2xl bg-background p-6 shadow-2xl">

              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">
                  إضافة عملية
                </h3>

                <button
                  type="button"
                  onClick={() =>
                    setShowAddTransaction(
                      false,
                    )
                  }
                  className="rounded-lg border px-3 py-1"
                >
                  ×
                </button>
              </div>

              <div className="mt-5 space-y-4">

                <div>
                  <label className="text-sm font-medium">
                    نوع العملية
                  </label>

                  <select
                    value={
                      transactionType
                    }
                    onChange={(e) =>
                      setTransactionType(
                        e.target
                          .value as
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
                      value={
                        adjustmentSign
                      }
                      onChange={(e) =>
                        setAdjustmentSign(
                          Number(
                            e.target
                              .value,
                          ) as
                            | 1
                            | -1,
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
                    value={
                      transactionAmount
                    }
                    onChange={(e) =>
                      setTransactionAmount(
                        e.target
                          .value,
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
                    value={
                      transactionDescription
                    }
                    onChange={(e) =>
                      setTransactionDescription(
                        e.target
                          .value,
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
                    value={
                      transactionNote
                    }
                    onChange={(e) =>
                      setTransactionNote(
                        e.target
                          .value,
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
                    setShowAddTransaction(
                      false,
                    )
                  }
                  className="rounded-lg border px-4 py-2"
                >
                  إلغاء
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={
                    addTransaction
                  }
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