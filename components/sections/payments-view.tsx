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

export function PaymentsView() {
  const totalDue = students.reduce(
    (total, student) => total + student.amountDue,
    0,
  )

  const totalPaid = students.reduce(
    (total, student) => total + student.amountPaid,
    0,
  )

  const totalExempt = students.filter(
    (student) => student.paymentStatus === 'معفي',
  ).length

  const collectionPercentage =
    totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0

  const exemptionPercentage =
    students.length > 0
      ? Math.round((totalExempt / students.length) * 100)
      : 0

  const paymentStats: Stat[] = [
    {
      label: 'إجمالي المستحق',
      value: formatCurrency(totalDue),
      change: `${students.length} طالب`,
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
              {students.map((student) => {
                const remaining =
                  student.paymentStatus === 'معفي'
                    ? 0
                    : Math.max(student.amountDue - student.amountPaid, 0)

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
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

