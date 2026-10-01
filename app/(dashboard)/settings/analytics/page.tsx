'use client'

import {
  ArrowRight,
  BarChart3,
  ChevronLeft,
  Eye,
  LineChart,
  PieChart,
  TrendingUp,
} from 'lucide-react'

import { useRouter } from 'next/navigation'

import { PageHeader } from '@/components/dashboard/page-header'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type AnalyticsOption = {
  title: string
  description: string
  icon: typeof BarChart3
  href: string
  badge?: string
}

const analyticsOptions: AnalyticsOption[] = [
  {
    title: 'تحليل زيارة صفحة متابعة الطلاب',
    description:
      'تحليل عدد زيارات صفحة متابعة الطلاب وعدد مرات الوصول الفعلي إلى واجهة تتبع الطالب.',
    icon: Eye,
    href: '/settings/analytics/student-tracking',
    badge: 'متاح',
  },
]

export default function AnalyticsPage() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <PageHeader
        title="التحليلات"
        description="عرض وتحليل مؤشرات النظام والبيانات المتوفرة."
      />

      {/* العودة إلى الإدارة */}
      <div className="flex justify-start">
        <Button
          variant="outline"
          onClick={() => router.push('/settings')}
          className="gap-2"
        >
          <ArrowRight className="h-4 w-4" />
          العودة إلى الإدارة
        </Button>
      </div>

      {/* مقدمة */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <TrendingUp className="h-6 w-6" />
            </div>

            <div>
              <CardTitle>
                مركز التحليلات
              </CardTitle>

              <CardDescription className="mt-2 leading-6">
                اختر نوع التحليل الذي تريد عرضه. سيتم إضافة مؤشرات وتحليلات
                أخرى من بيانات النظام الموجودة لاحقًا.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* خيارات التحليلات */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">
            التحليلات المتاحة
          </h2>

          <p className="text-sm text-muted-foreground">
            اختر التحليل الذي تريد استعراض تفاصيله.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {analyticsOptions.map((item) => {
            const Icon = item.icon

            return (
              <Card
                key={item.href}
                className="cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md"
                onClick={() => router.push(item.href)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-6 w-6" />
                    </div>

                    {item.badge && (
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        {item.badge}
                      </span>
                    )}
                  </div>

                  <CardTitle className="pt-2 text-base">
                    {item.title}
                  </CardTitle>

                  <CardDescription className="leading-6">
                    {item.description}
                  </CardDescription>

                  <div className="flex items-center gap-1 pt-2 text-sm font-medium text-primary">
                    عرض التحليل
                    <ChevronLeft className="h-4 w-4" />
                  </div>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      </section>

      {/* التحليلات القادمة */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">
            تحليلات قادمة
          </h2>

          <p className="text-sm text-muted-foreground">
            يمكن إضافة مؤشرات جديدة من بيانات النظام الحالية في المستقبل.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card className="opacity-70">
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <BarChart3 className="h-6 w-6" />
              </div>

              <CardTitle className="pt-2 text-base">
                تحليلات الطلاب
              </CardTitle>

              <CardDescription>
                مؤشرات وإحصائيات الطلاب المسجلين في النظام.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="opacity-70">
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <LineChart className="h-6 w-6" />
              </div>

              <CardTitle className="pt-2 text-base">
                تحليلات الحضور
              </CardTitle>

              <CardDescription>
                تحليل الحضور والغياب والتأخير والاستئذان.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="opacity-70">
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <PieChart className="h-6 w-6" />
              </div>

              <CardTitle className="pt-2 text-base">
                تحليلات المدفوعات
              </CardTitle>

              <CardDescription>
                مؤشرات المدفوعات والحالة المالية للطلاب.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>
    </div>
  )
}
