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

type Filters = {
  name: string
  grade: string
  amountDue: string
  amountPaid: string
  amountRemaining: string
  paymentStatus: string
}

const emptyFilters: Filters = {
  name: '',
  grade: '',
  amountDue: '',
  amountPaid: '',
  amountRemaining: '',
  paymentStatus: '',
}

export function PaymentsView() {
  const [filters, setFilters] = useState<Filters>(emptyFilters)

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const grades = useMemo(
    () =>
      Array.from(
        new Set(students.map((student) => student.grade)),
      ).sort(),
    [],
  )

  const paymentStatuses = useMemo(
    () =>
      Array.from(
        new Set(students.map((student) => student.paymentStatus)),
      ),
    [],
  )

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const remaining =
        student.paymentStatus === 'معفي'
          ? 0
          : Math.max(student.amountDue - student.amountPaid, 0)

      const matchesName =
        !filters.name ||
        student.name
          .toLowerCase()
          .includes(filters.name.toLowerCase())

      const matchesGrade =
        !filters.grade || student.grade === filters.grade

      const matchesDue =
        !filters.amountDue ||
        String(student.amountDue).includes(filters.amountDue)

      const matchesPaid =
        !filters.amountPaid ||
        String(student.amountPaid).includes(filters.amountPaid)

      const matchesRemaining =
        !filters.amountRemaining ||
        String(remaining).includes(filters.amountRemaining)

      const matchesStatus =
        !filters.paymentStatus ||
        student.paymentStatus === filters.paymentStatus

      return (
        matchesName &&
        matchesGrade &&
        matchesDue &&
        matchesPaid &&
        matchesRemaining &&
        matchesStatus
      )
    })
  }, [filters])

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

  const hasFilters = Object.values(filters).some(
    (value) => value !== '',
  )

  const clearFilters = () => {
    setFilters(emptyFilters)
  }

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
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[190px]">
                    <div className="space-y-2 py-1">
                      <div className="font-medium">
                        الطالب
                      </div>

                      <input
                        type="text"
                        value={filters.name}
                        onChange={(event) =>
                          updateFilter(
                            'name',
                            event.target.value,
                          )
                        }
                        placeholder="بحث عن طالب..."
                        className="h-8 w-full rounded-md border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </TableHead>

                  <TableHead className="min-w-[150px]">
                    <div className="space-y-2 py-1">
                      <div className="font-medium">
                        المستوى
                      </div>

                      <select
                        value={filters.grade}
                        onChange={(event) =>
                          updateFilter(
                            'grade',
                            event.target.value,
                          )
                        }
                        className="h-8 w-full rounded-md border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value="">الكل</option>

                        {grades.map((grade) => (
                          <option key={grade} value={grade}>
                            {grade}
                          </option>
                        ))}
                      </select>
                    </div>
                  </TableHead>

                  <TableHead className="min-w-[170px]">
                    <div className="space-y-2 py-1">
                      <div className="font-medium">
                        المبلغ المستحق
                      </div>

                      <input
                        type="text"
                        inputMode="decimal"
                        value={filters.amountDue}
                        onChange={(event) =>
                          updateFilter(
                            'amountDue',
                            event.target.value,
                          )
                        }
                        placeholder="بحث بالمبلغ..."
                        className="h-8 w-full rounded-md border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </TableHead>

                  <TableHead className="min-w-[170px]">
                    <div className="space-y-2 py-1">
                      <div className="font-medium">
                        المبلغ المدفوع
                      </div>

                      <input
                        type="text"
                        inputMode="decimal"
                        value={filters.amountPaid}
                        onChange={(event) =>
                          updateFilter(
                            'amountPaid',
                            event.target.value,
                          )
                        }
                        placeholder="بحث بالمبلغ..."
                        className="h-8 w-full rounded-md border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </TableHead>

                  <TableHead className="min-w-[170px]">
                    <div className="space-y-2 py-1">
                      <div className="font-medium">
                        المبلغ المتبقي
                      </div>

                      <input
                        type="text"
                        inputMode="decimal"
                        value={filters.amountRemaining}
                        onChange={(event) =>
                          updateFilter(
                            'amountRemaining',
                            event.target.value,
                          )
                        }
                        placeholder="بحث بالمبلغ..."
                        className="h-8 w-full rounded-md border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </TableHead>

                  <TableHead className="min-w-[150px]">
                    <div className="space-y-2 py-1">
                      <div className="font-medium">
                        الحالة
                      </div>

                      <select
                        value={filters.paymentStatus}
                        onChange={(event) =>
                          updateFilter(
                            'paymentStatus',
                            event.target.value,
                          )
                        }
                        className="h-8 w-full rounded-md border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value="">الكل</option>

                        {paymentStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                  </TableHead>
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
                            student.amountDue -
                              student.amountPaid,
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
                            : formatCurrency(
                                student.amountDue,
                              )}
                        </TableCell>

                        <TableCell className="font-medium tabular-nums">
                          {student.paymentStatus === 'معفي'
                            ? '—'
                            : formatCurrency(
                                student.amountPaid,
                              )}
                        </TableCell>

                        <TableCell className="font-medium tabular-nums">
                          {student.paymentStatus === 'معفي'
                            ? '—'
                            : formatCurrency(remaining)}
                        </TableCell>

                        <TableCell>
                          <StatusBadge
                            status={student.paymentStatus}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {hasFilters && (
            <div className="flex justify-end border-t px-5 py-3">
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm font-medium text-primary hover:underline"
              >
                مسح جميع الفلاتر
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function formatCurrency(value: number) {
  return `${value.toLocaleString('ar-BH')} د.ب`
}
