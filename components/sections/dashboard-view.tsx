import Link from 'next/link'
import {
  ArrowLeft,
  CalendarCheck,
  CreditCard,
  GraduationCap,
  ClipboardCheck,
  UserCog,
} from 'lucide-react'

import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  academicYears,
  students,
  teachers,
  enrollmentRequests,
} from '@/lib/data'

const currentAcademicYear = academicYears.find((year) => year.isCurrent)

const currentCourse =
  currentAcademicYear?.courses.find((course) => course.isActive) ??
  currentAcademicYear?.courses[0]

const pendingRegistrations = enrollmentRequests.filter(
  (request) => request.status === 'قيد المراجعة',
).length

const totalStudents = students.length
const totalTeachers = teachers.length

const dashboardOptions = [
  {
    title: 'الطلاب',
    description: 'إدارة بيانات الطلاب والملفات الأساسية.',
    value: totalStudents,
    suffix: 'طالب',
    href: '/students',
    icon: GraduationCap,
  },
  {
    title: 'المعلمون',
    description: 'المعلمون والطلاب المسندون لكل معلم.',
    value: totalTeachers,
    suffix: 'معلم',
    href: '/teachers',
    icon: UserCog,
  },
  {
    title: 'طلبات التسجيل',
    description: 'الطلبات التي تحتاج إلى مراجعة.',
    value: pendingRegistrations,
    suffix: 'قيد المراجعة',
    href: '/enrollment',
    icon: ClipboardCheck,
  },
  {
    title: 'الحضور',
    description: 'متابعة حضور وغياب الطلاب.',
    value: 'عرض',
    suffix: 'التفاصيل',
    href: '/teachers',
    icon: CalendarCheck,
  },
  {
    title: 'المدفوعات',
    description: 'متابعة المدفوعات والمبالغ المستحقة.',
    value: 'عرض',
    suffix: 'التفاصيل',
    href: '/payments',
    icon: CreditCard,
  },
]

export function DashboardView() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="مرحباً بك في تعليم"
        description="نظرة سريعة على العمل اليومي في المدرسة"
      />

      {/* الحالة الحالية */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">الحالة الحالية</p>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="font-semibold">
                {currentAcademicYear?.name ?? 'السنة الدراسية غير محددة'}
              </h2>

              <span className="text-muted-foreground">•</span>

              <span className="text-sm">
                {currentCourse?.name ?? 'لا توجد دورة نشطة'}
              </span>
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              {currentCourse?.startDate && currentCourse?.endDate
                ? `${currentCourse.startDate} — ${currentCourse.endDate}`
                : 'لم يتم تحديد فترة الدورة'}
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/settings/academic-year" />}
          >
            عرض الحالة
            <ArrowLeft className="size-4" />
          </Button>
        </CardContent>
      </Card>

      {/* الأقسام الرئيسية */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">الأقسام</h2>
          <p className="text-sm text-muted-foreground">
            الوصول السريع للأعمال اليومية
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dashboardOptions.map((option) => {
            const Icon = option.icon

            return (
              <Link
                key={option.title}
                href={option.href}
                className="group block"
              >
                <Card className="h-full transition-colors hover:border-primary/40 hover:bg-muted/20">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="size-5" />
                      </div>

                      <ArrowLeft className="size-4 text-muted-foreground transition-transform group-hover:-translate-x-1 group-hover:text-primary" />
                    </div>

                    <div className="mt-5">
                      <div className="flex items-end justify-between gap-3">
                        <h3 className="font-semibold">{option.title}</h3>

                        <span className="text-lg font-bold tabular-nums">
                          {option.value}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {option.suffix}
                      </p>

                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        {option.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

      {/* ملخص اليوم */}
      <Card>
        <CardHeader>
          <CardTitle>ملخص سريع</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl border p-4">
              <p className="text-xs text-muted-foreground">الطلاب</p>
              <p className="mt-2 text-xl font-bold tabular-nums">
                {totalStudents}
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-xs text-muted-foreground">المعلمون</p>
              <p className="mt-2 text-xl font-bold tabular-nums">
                {totalTeachers}
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-xs text-muted-foreground">طلبات التسجيل</p>
              <p className="mt-2 text-xl font-bold tabular-nums">
                {pendingRegistrations}
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-xs text-muted-foreground">الدورة الحالية</p>
              <p className="mt-2 text-sm font-semibold">
                {currentCourse?.name ?? 'غير محددة'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
