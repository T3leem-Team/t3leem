import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { PageHeader } from '@/components/dashboard/page-header'
import { StatCard } from '@/components/dashboard/stat-card'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { EnrollmentChart } from '@/components/dashboard/enrollment-chart'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { dashboardStats, enrollmentRequests, recentActivity } from '@/lib/data'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="مرحباً بك في تعليم"
        description="نظرة عامة على أداء المدرسة لعام ٢٠٢٦ / ٢٠٢٧"
        action={<Button>تصدير التقرير</Button>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>نمو أعداد الطلاب</CardTitle>
            <CardDescription>
              تطور عدد الطلاب المسجّلين خلال أشهر العام الدراسي
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EnrollmentChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>آخر النشاطات</CardTitle>
            <CardDescription>أحدث التحديثات في النظام</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {recentActivity.map((item) => (
                <li key={item.id} className="flex gap-3">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                  <div className="space-y-0.5">
                    <p className="text-sm leading-snug">{item.text}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle>أحدث طلبات التسجيل</CardTitle>
            <CardDescription>طلبات الالتحاق التي تنتظر المراجعة</CardDescription>
          </div>
          <Button variant="outline" size="sm" render={<Link href="/enrollment" />}>
            عرض الكل
            <ArrowLeft className="size-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الطلب</TableHead>
                <TableHead>اسم الطالب</TableHead>
                <TableHead>الصف</TableHead>
                <TableHead>تاريخ التقديم</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrollmentRequests.slice(0, 5).map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-medium tabular-nums">
                    {req.id}
                  </TableCell>
                  <TableCell>{req.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {req.grade}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {req.submittedAt}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={req.status} />
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
