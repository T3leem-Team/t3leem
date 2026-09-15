import { PageHeader } from '@/components/dashboard/page-header'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { StatCard } from '@/components/dashboard/stat-card'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { payments, type Stat } from '@/lib/data'

const paymentStats: Stat[] = [
  { label: 'إجمالي المحصّل', value: '٣٢٤٬٥٠٠ ر.س', change: '٨٫٧٪+', trend: 'up', hint: 'هذا الشهر' },
  { label: 'مدفوعات معلّقة', value: '١٨٬٦٠٠ ر.س', change: '٣٫١٪−', trend: 'down', hint: 'بانتظار السداد' },
  { label: 'مدفوعات متأخرة', value: '٦٬٥٠٠ ر.س', change: '١٪+', trend: 'up', hint: 'تجاوزت الموعد' },
]

export function PaymentsView() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="المدفوعات"
        description="متابعة الرسوم الدراسية والفواتير"
        action={<Button>إنشاء فاتورة</Button>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {paymentStats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الفاتورة</TableHead>
                <TableHead>الطالب</TableHead>
                <TableHead>البند</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>طريقة الدفع</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium tabular-nums">
                    {payment.id}
                  </TableCell>
                  <TableCell className="font-medium">{payment.student}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {payment.item}
                  </TableCell>
                  <TableCell className="font-medium tabular-nums">
                    {payment.amount}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {payment.date}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {payment.method}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={payment.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
