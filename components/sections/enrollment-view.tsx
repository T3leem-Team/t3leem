import { PageHeader } from '@/components/dashboard/page-header'
import { StatusBadge } from '@/components/dashboard/status-badge'
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
import { enrollmentRequests } from '@/lib/data'

export function EnrollmentView() {
  const pending = enrollmentRequests.filter(
    (r) => r.status === 'قيد المراجعة',
  ).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="طلبات التسجيل"
        description={`${pending} طلب بانتظار المراجعة من إجمالي ${enrollmentRequests.length} طلب`}
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الطلب</TableHead>
                <TableHead>اسم الطالب</TableHead>
                <TableHead>الصف المطلوب</TableHead>
                <TableHead>ولي الأمر</TableHead>
                <TableHead>رقم الجوال</TableHead>
                <TableHead>تاريخ التقديم</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الإجراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrollmentRequests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-medium tabular-nums">
                    {req.id}
                  </TableCell>
                  <TableCell className="font-medium">{req.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {req.grade}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {req.guardian}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {req.phone}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {req.submittedAt}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={req.status} />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      مراجعة
                    </Button>
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
