'use client'

import { useEffect, useMemo, useState } from 'react'

type CycleStatus = 'open' | 'closed'
type TransactionType = 'in' | 'out' | 'adjustment'

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

const API_URL = '/api/personal-finance'

function formatMoney(value: number) {
  return new Intl.NumberFormat('ar-BH', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(Number(value || 0))
}

function formatDate(value: string | null) {
  if (!value) return '-'

  return new Intl.DateTimeFormat('ar-BH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function PaymentPersonal() {
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [selectedCycle, setSelectedCycle] =
    useState<Cycle | null>(null)

  const [transactions, setTransactions] =
    useState<Transaction[]>([])

  const [currentBalance, setCurrentBalance] =
    useState(0)

  const [loading, setLoading] =
    useState(true)

  const [transactionsLoading, setTransactionsLoading] =
    useState(false)

  const [saving, setSaving] =
    useState(false)

  const [error, setError] =
    useState('')

  const [showCreateModal, setShowCreateModal] =
    useState(false)

  const [showTransactionModal, setShowTransactionModal] =
    useState(false)

  const [showCloseModal, setShowCloseModal] =
    useState(false)

  const [showReopenModal, setShowReopenModal] =
    useState(false)

  const [cycleToDelete, setCycleToDelete] =
    useState<Cycle | null>(null)

  const [transactionToDelete, setTransactionToDelete] =
    useState<Transaction | null>(null)

  // إنشاء دفتر
  const [cycleName, setCycleName] =
    useState('')

  const [initialBalance, setInitialBalance] =
    useState('')

  const [initialSource, setInitialSource] =
    useState('')

  const [initialNote, setInitialNote] =
    useState('')

  // العملية
  const [transactionType, setTransactionType] =
    useState<TransactionType>('in')

  const [transactionAmount, setTransactionAmount] =
    useState('')

  const [transactionDescription, setTransactionDescription] =
    useState('')

  const [transactionNote, setTransactionNote] =
    useState('')

  const [adjustmentSign, setAdjustmentSign] =
    useState<1 | -1>(1)

  // الإغلاق / إعادة الفتح
  const [actionNote, setActionNote] =
    useState('')

  const [search, setSearch] =
    useState('')

  const filteredCycles = useMemo(() => {
    const value = search.trim().toLowerCase()

    if (!value) return cycles

    return cycles.filter((cycle) =>
      cycle.name
        .toLowerCase()
        .includes(value),
    )
  }, [cycles, search])

  const openCycles = useMemo(
    () =>
      cycles.filter(
        (cycle) =>
          cycle.status === 'open',
      ).length,
    [cycles],
  )

  const closedCycles = useMemo(
    () =>
      cycles.filter(
        (cycle) =>
          cycle.status === 'closed',
      ).length,
    [cycles],
  )

  const totalTransactions = transactions.length

  async function loadCycles() {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(
        `${API_URL}?action=cycles`,
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

      if (selectedCycle) {
        const updatedCycle =
          (data.cycles ?? []).find(
            (cycle: Cycle) =>
              cycle.id ===
              selectedCycle.id,
          )

        setSelectedCycle(
          updatedCycle ?? null,
        )
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'تعذر تحميل الدفاتر.',
      )
    } finally {
      setLoading(false)
    }
  }

  async function loadTransactions(
    cycleId: string,
  ) {
    try {
      setTransactionsLoading(true)
      setError('')

      const response = await fetch(
        `${API_URL}?action=transactions&cycleId=${encodeURIComponent(
          cycleId,
        )}`,
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

      setTransactions(
        data.transactions ?? [],
      )

      setCurrentBalance(
        Number(
          data.currentBalance ?? 0,
        ),
      )

      if (data.cycle) {
        setSelectedCycle(data.cycle)
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'تعذر تحميل العمليات.',
      )
    } finally {
      setTransactionsLoading(false)
    }
  }

  useEffect(() => {
  setLoading(false)
}, [])

  async function createCycle() {
    if (!cycleName.trim()) {
      setError(
        'اكتب اسم الطلب أو العملية.',
      )
      return
    }

    const balance =
      Number(initialBalance || 0)

    if (
      !Number.isFinite(balance) ||
      balance < 0
    ) {
      setError(
        'الرصيد الأولي غير صحيح.',
      )
      return
    }

    try {
      setSaving(true)
      setError('')

      const response = await fetch(
        API_URL,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            action: 'create-cycle',
            name: cycleName.trim(),
            initial_balance:
              balance,
            initial_source:
              initialSource.trim() ||
              null,
            initial_note:
              initialNote.trim() ||
              null,
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

      setCycles((previous) => [
        data.cycle,
        ...previous,
      ])

      setSelectedCycle(data.cycle)
      setTransactions([])
      setCurrentBalance(
        Number(
          data.cycle
            ?.initial_balance ?? 0,
        ),
      )

      setCycleName('')
      setInitialBalance('')
      setInitialSource('')
      setInitialNote('')

      setShowCreateModal(false)
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
    if (!selectedCycle) return

    const amount =
      Number(transactionAmount)

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setError(
        'أدخل مبلغًا صحيحًا أكبر من صفر.',
      )
      return
    }

    if (
      !transactionDescription.trim()
    ) {
      setError(
        'اكتب وصف العملية.',
      )
      return
    }

    if (
      selectedCycle.status !==
      'open'
    ) {
      setError(
        'الدفتر مغلق ولا يمكن إضافة عملية.',
      )
      return
    }

    try {
      setSaving(true)
      setError('')

      const response = await fetch(
        API_URL,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            action:
              'add-transaction',
            cycle_id:
              selectedCycle.id,
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
      setShowTransactionModal(false)

      await loadTransactions(
        selectedCycle.id,
      )
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

  async function closeCycle() {
    if (!selectedCycle) return

    if (!actionNote.trim()) {
      setError(
        'ملاحظة الإغلاق مطلوبة.',
      )
      return
    }

    try {
      setSaving(true)
      setError('')

      const response = await fetch(
        API_URL,
        {
          method: 'PATCH',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            action: 'close',
            cycle_id:
              selectedCycle.id,
            note: actionNote.trim(),
          }),
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            'تعذر إغلاق الدفتر.',
        )
      }

      setSelectedCycle(data.cycle)

      setCycles((previous) =>
        previous.map((cycle) =>
          cycle.id ===
          data.cycle.id
            ? data.cycle
            : cycle,
        ),
      )

      setActionNote('')
      setShowCloseModal(false)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'تعذر إغلاق الدفتر.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function reopenCycle() {
    if (!selectedCycle) return

    if (!actionNote.trim()) {
      setError(
        'ملاحظة إعادة الفتح مطلوبة.',
      )
      return
    }

    try {
      setSaving(true)
      setError('')

      const response = await fetch(
        API_URL,
        {
          method: 'PATCH',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            action: 'reopen',
            cycle_id:
              selectedCycle.id,
            note: actionNote.trim(),
          }),
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            'تعذر إعادة فتح الدفتر.',
        )
      }

      setSelectedCycle(data.cycle)

      setCycles((previous) =>
        previous.map((cycle) =>
          cycle.id ===
          data.cycle.id
            ? data.cycle
            : cycle,
        ),
      )

      setActionNote('')
      setShowReopenModal(false)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'تعذر إعادة فتح الدفتر.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function deleteCycle() {
    if (!cycleToDelete) return

    try {
      setSaving(true)
      setError('')

      const response = await fetch(
        API_URL,
        {
          method: 'DELETE',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            action:
              'delete-cycle',
            cycle_id:
              cycleToDelete.id,
          }),
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            'تعذر حذف الدفتر.',
        )
      }

      setCycles((previous) =>
        previous.filter(
          (cycle) =>
            cycle.id !==
            cycleToDelete.id,
        ),
      )

      if (
        selectedCycle?.id ===
        cycleToDelete.id
      ) {
        setSelectedCycle(null)
        setTransactions([])
        setCurrentBalance(0)
      }

      setCycleToDelete(null)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'تعذر حذف الدفتر.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function deleteTransaction() {
    if (!transactionToDelete) return

    try {
      setSaving(true)
      setError('')

      const response = await fetch(
        API_URL,
        {
          method: 'DELETE',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            action:
              'delete-transaction',
            transaction_id:
              transactionToDelete.id,
          }),
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            'تعذر حذف العملية.',
        )
      }

      setTransactionToDelete(null)

      if (selectedCycle) {
        await loadTransactions(
          selectedCycle.id,
        )
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'تعذر حذف العملية.',
      )
    } finally {
      setSaving(false)
    }
  }

  function selectCycle(cycle: Cycle) {
    setSelectedCycle(cycle)
    loadTransactions(cycle.id)
  }

  function resetTransactionForm() {
    setTransactionType('in')
    setTransactionAmount('')
    setTransactionDescription('')
    setTransactionNote('')
    setAdjustmentSign(1)
    setError('')
  }

  function resetCreateForm() {
    setCycleName('')
    setInitialBalance('')
    setInitialSource('')
    setInitialNote('')
    setError('')
  }

  return (
    <div
      dir="rtl"
      className="space-y-6"
    >
      {/* العنوان */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            الإدارة الشخصية
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            إدارة الطلبات والعمليات المالية
            الشخصية بشكل مستقل عن مالية المدرسة.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            resetCreateForm()
            setShowCreateModal(true)
          }}
          className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          + دفتر جديد
        </button>
      </div>

      {/* الخطأ */}
      {error && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError('')}
            className="font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* الإحصائيات */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">
            إجمالي الدفاتر
          </div>

          <div className="mt-2 text-2xl font-bold text-slate-900">
            {cycles.length}
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <div className="text-sm text-emerald-700">
            دفاتر مفتوحة
          </div>

          <div className="mt-2 text-2xl font-bold text-emerald-800">
            {openCycles}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">
            دفاتر مغلقة
          </div>

          <div className="mt-2 text-2xl font-bold text-slate-900">
            {closedCycles}
          </div>
        </div>
      </div>

      {/* المحتوى */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        {/* قائمة الدفاتر */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <div className="mb-3 text-base font-bold text-slate-900">
              الدفاتر
            </div>

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="بحث عن دفتر..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
            />
          </div>

          <div className="max-h-[620px] overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-sm text-slate-500">
                جاري التحميل...
              </div>
            ) : filteredCycles.length ===
              0 ? (
              <div className="p-8 text-center">
                <div className="text-3xl">
                  📒
                </div>

                <div className="mt-3 text-sm font-semibold text-slate-700">
                  لا توجد دفاتر
                </div>

                <div className="mt-1 text-xs text-slate-400">
                  أنشئ أول دفتر للبدء.
                </div>
              </div>
            ) : (
              filteredCycles.map(
                (cycle) => {
                  const selected =
                    selectedCycle?.id ===
                    cycle.id

                  return (
                    <button
                      key={cycle.id}
                      type="button"
                      onClick={() =>
                        selectCycle(cycle)
                      }
                      className={`w-full border-b border-slate-100 p-4 text-right transition ${
                        selected
                          ? 'bg-slate-100'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-900">
                            {cycle.name}
                          </div>

                          <div className="mt-1 text-xs text-slate-400">
                            {formatDate(
                              cycle.created_at,
                            )}
                          </div>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            cycle.status ===
                            'open'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {cycle.status ===
                          'open'
                            ? 'مفتوح'
                            : 'مغلق'}
                        </span>
                      </div>
                    </button>
                  )
                },
              )
            )}
          </div>
        </div>

        {/* تفاصيل الدفتر */}
        <div className="min-w-0">
          {!selectedCycle ? (
            <div className="flex min-h-[500px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white">
              <div className="text-center">
                <div className="text-5xl">
                  📒
                </div>

                <div className="mt-4 text-lg font-bold text-slate-800">
                  اختر دفترًا
                </div>

                <div className="mt-1 text-sm text-slate-500">
                  اختر دفترًا من القائمة لعرض
                  تفاصيله وعملياته.
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* رأس الدفتر */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-bold text-slate-900">
                        {selectedCycle.name}
                      </h3>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          selectedCycle.status ===
                          'open'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {selectedCycle.status ===
                        'open'
                          ? 'مفتوح'
                          : 'مغلق'}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-500 sm:grid-cols-2">
                      <div>
                        الرصيد الأولي:{' '}
                        <span className="font-semibold text-slate-800">
                          {formatMoney(
                            Number(
                              selectedCycle.initial_balance,
                            ),
                          )}
                        </span>
                      </div>

                      {selectedCycle.initial_source && (
                        <div>
                          مصدر الرصيد:{' '}
                          <span className="font-semibold text-slate-800">
                            {
                              selectedCycle.initial_source
                            }
                          </span>
                        </div>
                      )}

                      <div>
                        تاريخ الإنشاء:{' '}
                        <span className="font-semibold text-slate-800">
                          {formatDate(
                            selectedCycle.created_at,
                          )}
                        </span>
                      </div>

                      {selectedCycle.closed_at && (
                        <div>
                          تاريخ الإغلاق:{' '}
                          <span className="font-semibold text-slate-800">
                            {formatDate(
                              selectedCycle.closed_at,
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    {selectedCycle.initial_note && (
                      <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                        <span className="font-semibold">
                          الملاحظة:
                        </span>{' '}
                        {
                          selectedCycle.initial_note
                        }
                      </div>
                    )}

                    {selectedCycle.status ===
                      'closed' &&
                      selectedCycle.close_note && (
                        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                          <span className="font-semibold">
                            ملاحظة الإغلاق:
                          </span>{' '}
                          {
                            selectedCycle.close_note
                          }
                        </div>
                      )}

                    {selectedCycle.reopen_note && (
                      <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
                        <span className="font-semibold">
                          آخر ملاحظة إعادة فتح:
                        </span>{' '}
                        {
                          selectedCycle.reopen_note
                        }
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selectedCycle.status ===
                      'open' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            resetTransactionForm()
                            setShowTransactionModal(
                              true,
                            )
                          }}
                          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                          + إضافة عملية
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActionNote('')
                            setError('')
                            setShowCloseModal(
                              true,
                            )
                          }}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          إغلاق الدفتر
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setActionNote('')
                          setError('')
                          setShowReopenModal(
                            true,
                          )
                        }}
                        className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                      >
                        إعادة فتح
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        setCycleToDelete(
                          selectedCycle,
                        )
                      }
                      className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              </div>

              {/* الرصيد */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-sm text-slate-500">
                    الرصيد الحالي
                  </div>

                  <div className="mt-2 text-2xl font-bold text-slate-900">
                    {formatMoney(
                      currentBalance,
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-sm text-slate-500">
                    عدد العمليات
                  </div>

                  <div className="mt-2 text-2xl font-bold text-slate-900">
                    {totalTransactions}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-sm text-slate-500">
                    الحالة
                  </div>

                  <div className="mt-2 text-lg font-bold text-slate-900">
                    {selectedCycle.status ===
                    'open'
                      ? 'قابل للتعديل'
                      : 'للقراءة فقط'}
                  </div>
                </div>
              </div>

              {/* العمليات */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 p-5">
                  <div>
                    <h4 className="font-bold text-slate-900">
                      العمليات
                    </h4>

                    <p className="mt-1 text-xs text-slate-500">
                      جميع الحركات المالية لهذا
                      الدفتر فقط.
                    </p>
                  </div>
                </div>

                {transactionsLoading ? (
                  <div className="p-10 text-center text-sm text-slate-500">
                    جاري تحميل العمليات...
                  </div>
                ) : transactions.length ===
                  0 ? (
                  <div className="p-10 text-center">
                    <div className="text-4xl">
                      🧾
                    </div>

                    <div className="mt-3 font-semibold text-slate-700">
                      لا توجد عمليات
                    </div>

                    <div className="mt-1 text-sm text-slate-400">
                      لم تتم إضافة أي عملية لهذا
                      الدفتر حتى الآن.
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[850px] text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-right text-xs text-slate-500">
                          <th className="px-4 py-3 font-semibold">
                            التاريخ
                          </th>

                          <th className="px-4 py-3 font-semibold">
                            النوع
                          </th>

                          <th className="px-4 py-3 font-semibold">
                            الوصف
                          </th>

                          <th className="px-4 py-3 font-semibold">
                            المبلغ
                          </th>

                          <th className="px-4 py-3 font-semibold">
                            الرصيد بعد العملية
                          </th>

                          <th className="px-4 py-3 font-semibold">
                            ملاحظة
                          </th>

                          <th className="px-4 py-3 font-semibold">
                            إجراء
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {transactions.map(
                          (
                            transaction,
                          ) => {
                            const isIn =
                              transaction.transaction_type ===
                              'in'

                            const isOut =
                              transaction.transaction_type ===
                              'out'

                            const isAdjustment =
                              transaction.transaction_type ===
                              'adjustment'

                            return (
                              <tr
                                key={
                                  transaction.id
                                }
                                className="border-b border-slate-100 last:border-0"
                              >
                                <td className="px-4 py-4 text-slate-600">
                                  {formatDate(
                                    transaction.created_at,
                                  )}
                                </td>

                                <td className="px-4 py-4">
                                  <span
                                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                      isIn
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : isOut
                                          ? 'bg-red-100 text-red-700'
                                          : 'bg-amber-100 text-amber-700'
                                    }`}
                                  >
                                    {isIn
                                      ? 'مبلغ داخل'
                                      : isOut
                                        ? 'مبلغ خارج'
                                        : transaction.adjustment_sign ===
                                            -1
                                          ? 'تعديل فرق −'
                                          : 'تعديل فرق +'}
                                  </span>
                                </td>

                                <td className="max-w-[250px] px-4 py-4">
                                  <div className="font-semibold text-slate-800">
                                    {
                                      transaction.description
                                    }
                                  </div>
                                </td>

                                <td
                                  className={`px-4 py-4 font-bold ${
                                    isIn
                                      ? 'text-emerald-600'
                                      : isOut
                                        ? 'text-red-600'
                                        : 'text-amber-600'
                                  }`}
                                >
                                  {isIn
                                    ? '+ '
                                    : isOut
                                      ? '- '
                                      : transaction.adjustment_sign ===
                                          -1
                                        ? '- '
                                        : '+ '}

                                  {formatMoney(
                                    Number(
                                      transaction.amount,
                                    ),
                                  )}
                                </td>

                                <td className="px-4 py-4 font-semibold text-slate-800">
                                  {formatMoney(
                                    Number(
                                      transaction.balance_after,
                                    ),
                                  )}
                                </td>

                                <td className="max-w-[220px] px-4 py-4 text-slate-500">
                                  {transaction.note ||
                                    '-'}
                                </td>

                                <td className="px-4 py-4">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setTransactionToDelete(
                                        transaction,
                                      )
                                    }
                                    className="rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                                  >
                                    حذف
                                  </button>
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
          )}
        </div>
      </div>

      {/* ====================================== */}
      {/* إنشاء دفتر */}
      {/* ====================================== */}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 p-5">
              <h3 className="text-lg font-bold text-slate-900">
                إنشاء دفتر جديد
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                كل دفتر مستقل تمامًا عن الدفاتر
                الأخرى.
              </p>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  اسم الطلب أو العملية
                </label>

                <input
                  value={cycleName}
                  onChange={(event) =>
                    setCycleName(
                      event.target.value,
                    )
                  }
                  placeholder="مثال: طلب شركة X"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  الرصيد الأولي
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={
                    initialBalance
                  }
                  onChange={(event) =>
                    setInitialBalance(
                      event.target.value,
                    )
                  }
                  placeholder="0.000"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  من أين استلم
                </label>

                <input
                  value={
                    initialSource
                  }
                  onChange={(event) =>
                    setInitialSource(
                      event.target.value,
                    )
                  }
                  placeholder="اختياري"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  ملاحظة
                </label>

                <textarea
                  value={
                    initialNote
                  }
                  onChange={(event) =>
                    setInitialNote(
                      event.target.value,
                    )
                  }
                  rows={3}
                  placeholder="ملاحظة اختيارية..."
                  className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 p-5">
              <button
                type="button"
                onClick={() =>
                  setShowCreateModal(false)
                }
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={
                  createCycle
                }
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving
                  ? 'جاري الحفظ...'
                  : 'إنشاء الدفتر'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================== */}
      {/* إضافة عملية */}
      {/* ====================================== */}

      {showTransactionModal &&
        selectedCycle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
              <div className="border-b border-slate-200 p-5">
                <h3 className="text-lg font-bold text-slate-900">
                  إضافة عملية
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  الدفتر: {
                    selectedCycle.name
                  }
                </p>
              </div>

              <div className="space-y-4 p-5">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    نوع العملية
                  </label>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setTransactionType(
                          'in',
                        )
                      }
                      className={`rounded-xl border px-3 py-3 text-sm font-semibold ${
                        transactionType ===
                        'in'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      مبلغ داخل
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setTransactionType(
                          'out',
                        )
                      }
                      className={`rounded-xl border px-3 py-3 text-sm font-semibold ${
                        transactionType ===
                        'out'
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      مبلغ خارج
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setTransactionType(
                          'adjustment',
                        )
                      }
                      className={`rounded-xl border px-3 py-3 text-sm font-semibold ${
                        transactionType ===
                        'adjustment'
                          ? 'border-amber-500 bg-amber-50 text-amber-700'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      تعديل فرق
                    </button>
                  </div>
                </div>

                {transactionType ===
                  'adjustment' && (
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      اتجاه الفرق
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setAdjustmentSign(
                            1,
                          )
                        }
                        className={`rounded-xl border px-3 py-3 text-sm font-semibold ${
                          adjustmentSign ===
                          1
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        زيادة +
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setAdjustmentSign(
                            -1,
                          )
                        }
                        className={`rounded-xl border px-3 py-3 text-sm font-semibold ${
                          adjustmentSign ===
                          -1
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        نقص −
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    المبلغ
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={
                      transactionAmount
                    }
                    onChange={(event) =>
                      setTransactionAmount(
                        event.target.value,
                      )
                    }
                    placeholder="0.000"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    وصف العملية
                  </label>

                  <input
                    value={
                      transactionDescription
                    }
                    onChange={(event) =>
                      setTransactionDescription(
                        event.target.value,
                      )
                    }
                    placeholder="مثال: استلام مبلغ من العميل"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    ملاحظة
                  </label>

                  <textarea
                    value={
                      transactionNote
                    }
                    onChange={(event) =>
                      setTransactionNote(
                        event.target.value,
                      )
                    }
                    rows={3}
                    placeholder="ملاحظة اختيارية..."
                    className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200 p-5">
                <button
                  type="button"
                  onClick={() =>
                    setShowTransactionModal(
                      false,
                    )
                  }
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
                >
                  إلغاء
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={
                    addTransaction
                  }
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving
                    ? 'جاري الحفظ...'
                    : 'حفظ العملية'}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* ====================================== */}
      {/* إغلاق الدفتر */}
      {/* ====================================== */}

      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="p-5">
              <h3 className="text-lg font-bold text-slate-900">
                إغلاق الدفتر
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                بعد الإغلاق لن تستطيع إضافة أو
                تعديل العمليات حتى تعيد فتح
                الدفتر.
              </p>

              <textarea
                value={actionNote}
                onChange={(event) =>
                  setActionNote(
                    event.target.value,
                  )
                }
                rows={4}
                placeholder="اكتب سبب أو ملاحظة الإغلاق..."
                className="mt-4 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-400"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 p-5">
              <button
                type="button"
                onClick={() =>
                  setShowCloseModal(false)
                }
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={closeCycle}
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving
                  ? 'جاري الحفظ...'
                  : 'تأكيد الإغلاق'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================== */}
      {/* إعادة الفتح */}
      {/* ====================================== */}

      {showReopenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="p-5">
              <h3 className="text-lg font-bold text-slate-900">
                إعادة فتح الدفتر
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                سيبقى جميع العمليات السابقة
                والرصيد كما هي، ويمكنك متابعة
                العمليات من آخر رصيد.
              </p>

              <textarea
                value={actionNote}
                onChange={(event) =>
                  setActionNote(
                    event.target.value,
                  )
                }
                rows={4}
                placeholder="اكتب سبب أو ملاحظة إعادة الفتح..."
                className="mt-4 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-400"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 p-5">
              <button
                type="button"
                onClick={() =>
                  setShowReopenModal(false)
                }
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={reopenCycle}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving
                  ? 'جاري الحفظ...'
                  : 'تأكيد إعادة الفتح'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================== */}
      {/* تأكيد حذف الدفتر */}
      {/* ====================================== */}

      {cycleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="p-5">
              <h3 className="text-lg font-bold text-red-700">
                حذف الدفتر؟
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                سيتم حذف دفتر{' '}
                <strong>
                  {cycleToDelete.name}
                </strong>{' '}
                وجميع العمليات الموجودة داخله
                نهائيًا.
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 p-5">
              <button
                type="button"
                onClick={() =>
                  setCycleToDelete(null)
                }
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={
                  deleteCycle
                }
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving
                  ? 'جاري الحذف...'
                  : 'حذف نهائي'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================== */}
      {/* تأكيد حذف العملية */}
      {/* ====================================== */}

      {transactionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="p-5">
              <h3 className="text-lg font-bold text-red-700">
                حذف العملية؟
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                سيتم حذف العملية التالية نهائيًا:
              </p>

              <div className="mt-3 rounded-xl bg-slate-50 p-3">
                <div className="font-semibold text-slate-800">
                  {
                    transactionToDelete.description
                  }
                </div>

                <div className="mt-1 text-sm text-slate-500">
                  {formatMoney(
                    Number(
                      transactionToDelete.amount,
                    ),
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 p-5">
              <button
                type="button"
                onClick={() =>
                  setTransactionToDelete(
                    null,
                  )
                }
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={
                  deleteTransaction
                }
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving
                  ? 'جاري الحذف...'
                  : 'حذف نهائي'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}