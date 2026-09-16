'use client'

import { useMemo, useState } from 'react'

import { PageHeader } from '@/components/dashboard/page-header'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { StatCard } from '@/components/dashboard/stat-card'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { students, type Stat } from '@/lib/data'

function formatCurrency(value: number) {
  return `${value.toLocaleString('ar-BH')} د.ب`
}

function parseAmount(value: string) {
  if (value.trim() === '') return null

  const number = Number(value)

  return Number.isFinite(number) ? number : null
}

export function PaymentsView() {
  const [dueMin, setDueMin] = useState('')
  const [dueMax, setDueMax] = useState('')

  const [paidMin, setPaidMin] = useState('')
  const [paidMax, setPaidMax] = useState('')

  const [remainingMin, setRemainingMin] = useState('')
  const [remainingMax, setRemainingMax] = useState('')

  const filteredStudents = useMemo(() => {
    const dueMinValue = parseAmount(dueMin)
    const dueMaxValue = parseAmount(dueMax)

    const paidMinValue = parseAmount(paidMin)
    const paidMaxValue = parseAmount(paidMax)

    const remainingMinValue = parseAmount(remainingMin)
    const remainingMaxValue = parseAmount(remainingMax)

    return students.filter((student) => {
      const remaining =
        student.paymentStatus === 'معفي'
          ? 0
          : Math.max(student.amountDue - student.amountPaid, 0)

      const matchesDue =
        (dueMinValue === null || student.amountDue >= dueMinValue) &&
        (dueMaxValue === null || student.amountDue <= dueMaxValue)

      const matchesPaid =
        (paidMinValue === null || student.amountPaid >= paidMinValue) &&
        (paidMaxValue === null || student.amountPaid <= paidMaxValue)

      const matchesRemaining =
        (remainingMinValue === null || remaining >= remainingMinValue) &&
        (remainingMaxValue === null || remaining <= remainingMaxValue)

      return matchesDue && matchesPaid && matchesRemaining
    })
  }, [
    dueMin,
    dueMax,
    paidMin,
    paidMax,
    remainingMin,
    remainingMax,
  ])

  const totalDue = filteredStudents.reduce(
    (total, student) => total + student.amountDue,
    0,
  )

  const totalPaid = filteredStudents.reduce(
    (total, student) => total + student.amountPaid,
    0,
  )

  const totalExempt = filteredStudents.filter(
    (student) => student.paymentStatus === 'معفي',
  ).length

  const collectionPercentage =
    totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0

  const exemptionPercentage =
    filteredStudents.length > 0
      ? Math.round((totalExempt / filteredStudents.length) * 100)
      : 0

  const paymentStats: Stat[] = [
    {
      label: 'إجمالي المستحق',
      value: formatCurrency(totalDue),
      change: `${filteredStudents.length} طالب`,
      trend: 'up',
      hint: 'إجمالي الرسوم',
    },
    {
      label: 'إجمالي المدفوع',
      value: formatCurrency(totalPaid),
      change: `${collectionPercentage}٪`,
      trend: 'up',
      hint: 'نسبة التحصيل',
    },
    {
      label: 'نسبة التحصيل',
      value: `${collectionPercentage}٪`,
      change: `${formatCurrency(Math.max(totalDue - totalPaid, 0))}`,
      trend: 'down',
      hint: 'المتبقي للتحصيل',
    },
    {
      label: 'نسبة المعفين',
      value: `${exemptionPercentage}٪`,
      change: `${totalExempt} طالب`,
      trend: 'down',
      hint: 'من إجمالي الطلاب',
    },
  ]

  const clearFilters = () => {
    setDueMin('')
    setDueMax('')
    setPaidMin('')
    setPaidMax('')
    setRemainingMin('')
    setRemainingMax('')
  }

  const hasFilters =
    dueMin ||
    dueMax ||
    paidMin ||
    paidMax ||
    remainingMin ||
    remainingMax

  return (
    <div className="space-y-6">
      <PageHeader
        title="المدفوعات"
        description="متابعة الرسوم الدراسية وحالة السداد للطلاب"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {paymentStats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </div>

      <Card>
        <CardContent className="space-y-5 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold">
                فلترة المبالغ
              </h2>

              <p className="mt-1 text-xs text-muted-foreground">
                حدد الحد الأدنى والأقصى لكل مبلغ.
              </p>
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm font-medium text-primary hover:underline"
              >
                مسح الفلاتر
              </button>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                المبلغ المستحق
              </label>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min="0"
                  value={dueMin}
                  onChange={(event) => setDueMin(event.target.value)}
                  placeholder="من"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />

                <input
                  type="number"
                  min="0"
                  value={dueMax}
                  onChange={(event) => setDueMax(event.target.value)}
                  placeholder="إلى"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                المبلغ المدفوع
              </label>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min="0"
                  value={paidMin}
                  onChange={(event) => setPaidMin(event.target.value)}
                  placeholder="من"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />

                <input
                  type="number"
                  min="0"
                  value={paidMax}
                  onChange={(event) => setPaidMax(event.target.value)}
                  placeholder="إلى"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                المبلغ المتبقي
              </label>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min="0"
                  value={remainingMin}
                  onChange={(event) =>
                    setRemainingMin(event.target.value)
                  }
                  placeholder="من"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />

                <input
                  type="number"
                  min="0"
                  value={remainingMax}
                  onChange={(event) =>
                    setRemainingMax(event.target.value)
                  }
                  placeholder="إلى"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الطالب</TableHead>
                <TableHead>المستوى</TableHead>
                <TableHead>المبلغ المستحق</TableHead>
                <TableHead>المبلغ المدفوع</TableHead>
                <TableHead>المبلغ المتبقي</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-muted-foreground"
                  >
                    لا توجد نتائج مطابقة للفلاتر
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((student) => {
                  const remaining =
                    student.paymentStatus === 'معفي'
                      ? 0
                      : Math.max(
                          student.amountDue - student.amountPaid,
                          0,
                        )

                  return (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        {student.name}
                      </TableCell>

                      <TableCell className="text-muted-foreground">
                        {student.grade}
                      </TableCell>

                      <TableCell className="font-medium tabular-nums">
                        {student.paymentStatus === 'معفي'
                          ? '—'
                          : formatCurrency(student.amountDue)}
                      </TableCell>

                      <TableCell className="font-medium tabular-nums">
                        {student.paymentStatus === 'معفي'
                          ? '—'
                          : formatCurrency(student.amountPaid)}
                      </TableCell>

                      <TableCell className="font-medium tabular-nums">
                        {student.paymentStatus === 'معفي'
                          ? '—'
                          : formatCurrency(remaining)}
                      </TableCell>

                      <TableCell>
                        <StatusBadge status={student.paymentStatus} />
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

