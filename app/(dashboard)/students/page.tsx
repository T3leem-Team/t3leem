import { UserPlus } from 'lucide-react'

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
import { students } from '@/lib/data'

export default function StudentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="الطلاب"
        description={`إجمالي ${students.length} طالب مسجّل في النظام`}
        action={
          <Button>
            <UserPlus className="size-4" />
            إضافة طالب
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الرقم التعريفي</TableHead>
                <TableHead>اسم الطالب</TableHead>
                <TableHead>الصف</TableHead>
                <TableHead>الشعبة</TableHead>
                <TableHead>ولي الأمر</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium tabular-nums">
                    {student.id}
                  </TableCell>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {student.grade}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {student.section}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {student.guardian}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={student.status} />
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
