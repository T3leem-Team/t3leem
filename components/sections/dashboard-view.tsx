import Link from 'next/link'
import {
  Archive,
  ArrowLeft,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  GraduationCap,
  Settings,
  ShieldCheck,
  Users,
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

const paidStudents = students.filter(
  (student) => student.paymentStatus === 'مدفوع بالكامل',
).length

const exemptStudents = students.filter(
  (student) => student.paymentStatus === 'معفي',
).length

const totalStudents = students.length
const totalTeachers = teachers.length

const dashboardOptions = [
  {
    title: 'الطلاب',
    description: 'بيانات الطلاب والملفات والمعلومات الأساسية',
    value: totalStudents,
    suffix: 'طالب',
    href: '/students',
    icon: GraduationCap,
  },
  {
    title: 'المعلمون',
    description: 'المعلمين والطلاب المسندين لكل معلم',
    value: totalTeachers,
    suffix: 'معلم',
    href: '/teachers',
    icon: UserCog,
  },
  {
    title: 'طلبات التسجيل',
    description: 'متابعة طلبات التسجيل الجديدة والمراجعة',
    value: pendingRegistrations,
    suffix: 'قيد المراجعة',
    href: '/enrollment',
    icon: ClipboardCheck,
  },
  {
    title: 'الحضور',
    description: 'الحضور والغياب وسجل حضور الطلاب',
    value: 'عرض',
    suffix: 'التفاصيل',
    href: '/teachers',
    icon: CalendarDays,
  },
  {
    title: 'المدفوعات',
    description: 'المبالغ المستحقة والمدفوعة والمتبقية',
    value: paidStudents,
    suffix: 'مدفوع بالكامل',
    href: '/payments',
    icon: CreditCard,
  },
]

const adminOptions = [
  {
    title: 'المستخدمون',
    description: 'إضافة المستخدمين وإدارة حساباتهم',
    href: '/settings/users',
    icon: Users,
  },
  {
    title: 'الصلاحيات',
    description: 'تحديد صلاحيات الوصول لكل مستخدم أو دور',
    href: '/settings/permissions',
    icon: ShieldCheck,
  },
  {
    title: 'الدورات والسنة الدراسية',
    description: 'إدارة السنة الحالية والدورات ومواعيدها',
    href: '/settings/academic-year',
    icon: BookOpen,
  },
  {
    title: 'الأرشيف',
    description: 'الوصول إلى الدورات السابقة والبيانات المؤرشفة',
    href: '/settings/archive',
    icon: Archive,
  },
  {
    title: 'إعدادات النظام',
    description: 'إعدادات النظام العامة',
    href: '/settings',
    icon: Settings,
  },
]

export function DashboardView() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="مرحباً بك في تعليم"
        description="لوحة مختصرة لإدارة المدرسة والدورة الحالية"
      />

      {/* السنة والدورة الحالية */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="size-5 text-primary" />
              السنة الدراسية والدورة الحالية
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              المعلومات الأساسية للدورة النشطة حاليًا
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/settings/academic-year" />}
          >
            إدارة الدورات
            <ArrowLeft className="size-4" />
          </Button>
        </CardHeader>

        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">السنة الدراسية</p>
              <p className="mt-2 font-semibold">
                {currentAcademicYear?.name ?? 'غير محددة'}
              </p>
            </div>

            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">الدورة الحالية</p>
              <p className="mt-2 font-semibold">
                {currentCourse?.name ?? 'غير محددة'}
              </p>
            </div>

            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">فترة الدورة</p>
              <p className="mt-2 font-semibold">
                {currentCourse?.startDate && currentCourse?.endDate
                  ? `${currentCourse.startDate} — ${currentCourse.endDate}`
                  : 'لم يتم تحديدها'}
              </p>
            </div>

            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">أيام الدراسة</p>
              <p className="mt-2 font-semibold">
                {currentCourse?.studyDays?.length
                  ? currentCourse.studyDays.join('، ')
                  : 'لم تحدد'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* الخيارات الرئيسية */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">الإدارة اليومية</h2>
          <p className="text-sm text-muted-foreground">
            اختر القسم الذي تريد العمل عليه
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
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="size-5" />
                      </div>

                      <ArrowLeft className="mt-1 size-4 text-muted-foreground transition-transform group-hover:-translate-x-1 group-hover:text-primary" />
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

      {/* الدورة والأرشيف */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="size-5 text-primary" />
              الدورة الحالية
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">الدورة</p>
                <p className="mt-1 font-semibold">
                  {currentCourse?.name ?? 'غير محددة'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">البداية</p>
                  <p className="mt-1 text-sm font-medium">
                    {currentCourse?.startDate ?? 'غير محدد'}
                  </p>
                </div>

                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">النهاية</p>
                  <p className="mt-1 text-sm font-medium">
                    {currentCourse?.endDate ?? 'غير محدد'}
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                nativeButton={false}
                render={<Link href="/settings/academic-year" />}
              >
                عرض تفاصيل الدورة
                <ArrowLeft className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="size-5 text-primary" />
              الأرشيف
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">
              الدورات المنتهية لا يتم حذفها. يتم أرشفتها مع الاحتفاظ ببيانات
              الطلاب والحضور والمعلمين والمدفوعات والتسجيلات المرتبطة بها.
            </p>

            <div className="mt-4 rounded-lg border bg-muted/30 p-3">
              <p className="text-sm font-medium">قواعد الأرشفة</p>
              <ul className="mt-2 space-y-1 text-xs leading-5 text-muted-foreground">
                <li>• الدورة المؤرشفة تصبح للقراءة فقط.</li>
                <li>• لا يمكن تسجيل حضور جديد عليها.</li>
                <li>• لا يتم حذف الطالب من النظام.</li>
                <li>• انتقال الطالب لدورة جديدة يتم بشكل مستقل.</li>
              </ul>
            </div>

            <Button
              variant="outline"
              className="mt-4 w-full"
              nativeButton={false}
              render={<Link href="/settings/archive" />}
            >
              فتح الأرشيف
              <ArrowLeft className="size-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* إدارة النظام - Admin */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            إدارة النظام
          </CardTitle>

          <p className="text-sm text-muted-foreground">
            تظهر هذه الخيارات للمستخدمين الذين لديهم صلاحية الإدارة.
          </p>
        </CardHeader>

        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {adminOptions.map((option) => {
              const Icon = option.icon

              return (
                <Link
                  key={option.title}
                  href={option.href}
                  className="group rounded-xl border p-4 transition-colors hover:border-primary/40 hover:bg-muted/20"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary">
                      <Icon className="size-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-medium">{option.title}</h3>
                        <ArrowLeft className="size-4 text-muted-foreground transition-transform group-hover:-translate-x-1" />
                      </div>

                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {option.description}
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* ملخص سريع */}
      <Card>
        <CardHeader>
          <CardTitle>ملخص سريع</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl border p-4">
              <p className="text-xs text-muted-foreground">إجمالي الطلاب</p>
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
              <p className="text-xs text-muted-foreground">المعفيون</p>
              <p className="mt-2 text-xl font-bold tabular-nums">
                {exemptStudents}
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-xs text-muted-foreground">
                طلبات تحتاج مراجعة
              </p>
              <p className="mt-2 text-xl font-bold tabular-nums">
                {pendingRegistrations}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
