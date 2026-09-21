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
  const [loadingTransactions, setLoadingTransactions] =
    useState(false)

  const [error, setError] = useState('')

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
            'تعذر تحميل الإدارة الشخصية.',
        )
      }

      setCycles(data.cycles ?? [])
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'تعذر تحميل البيانات.',
      )
    } finally {
      setLoading(false)
    }
  }

  async function loadTransactions(
    cycle: Cycle,
  ) {
    try {
      setLoadingTransactions(true)
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
    } finally {
      setLoadingTransactions(false)
    }
  }

  useEffect(() => {
    loadCycles()
  }, [])

  return (
    <div dir="rtl" className="space-y-6">

      <div>
        <h2 className="text-2xl font-bold">
          الإدارة الشخصية
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          إدارة الدفاتر المالية والعمليات الشخصية.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-2xl border bg-background p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              الدفاتر المالية
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              اختر دفترًا لعرض العمليات والرصيد.
            </p>
          </div>

          <button
            type="button"
            onClick={loadCycles}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-muted"
          >
            تحديث
          </button>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            جاري تحميل الدفاتر...
          </div>
        ) : cycles.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <div className="font-medium">
              لا توجد دفاتر مالية
            </div>

            <div className="mt-1 text-sm text-muted-foreground">
              لم يتم إنشاء أي دفتر حتى الآن.
            </div>
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

                  <span
                    className={`rounded-full px-2 py-1 text-xs ${
                      cycle.status === 'open'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
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

      {selectedCycle && (
        <div className="rounded-2xl border bg-background p-6">

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

            <div>
              <h3 className="text-xl font-semibold">
                {selectedCycle.name}
              </h3>

              <div className="mt-1 text-sm text-muted-foreground">
                {selectedCycle.status === 'open'
                  ? 'الدفتر مفتوح'
                  : 'الدفتر مغلق'}
              </div>
            </div>

            <div className="rounded-xl border px-5 py-3 text-center">
              <div className="text-sm text-muted-foreground">
                الرصيد الحالي
              </div>

              <div className="mt-1 text-2xl font-bold">
                {currentBalance.toFixed(3)}
              </div>
            </div>

          </div>

          <div className="mt-6">

            <h4 className="mb-3 font-semibold">
              العمليات
            </h4>

            {loadingTransactions ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                جاري تحميل العمليات...
              </div>
            ) : transactions.length === 0 ? (
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
                        الرصيد بعد العملية
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

                          <td className="px-4 py-3 font-medium">
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

    </div>
  )
}