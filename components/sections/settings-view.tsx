import Link from 'next/link'
import {
  Archive,
  ArrowLeft,
  BookOpen,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react'

import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const managementOptions = [
  {
    title: 'المستخدمون والصلاحيات',
    description:
      'إضافة المستخدمين وإدارة حساباتهم وتحديد الأدوار والصلاحيات لكل مستخدم.',
    href: '/settings/users',
    icon: Users,
    badge: 'إدارة المستخدمين',
  },
  {
    title: 'السنة الدراسية والدورات',
    description:
      'إدارة السنة الدراسية، الدورات التابعة لها، مواعيدها وأيام الدراسة.',
    href: '/settings/academic-year',
    icon: BookOpen,
    badge: 'إدارة الدورات',
  },
  {
    title: 'الأرشيف',
    description:
      'أرشفة دورة محددة أو سنة دراسية كاملة مع الاحتفاظ بجميع بياناتها.',
    href: '/settings/archive',
    icon: Archive,
    badge: 'الأرشفة',
  },
  {
    title: 'الإجراءات الحساسة',
    description:
      'إجراءات إدارية تحتاج إلى صلاحية خاصة، مثل إلغاء دورة.',
    href: '/settings/danger-zone',
    icon: ShieldAlert,
    badge: 'صلاحيات خاصة',
    danger: true,
  },
]

export function SettingsView() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="الإدارة والتحكم"
        description="إدارة المستخدمين والصلاحيات والدورات والأرشيف والإجراءات الإدارية"
      />

      {/* ملاحظة الإدارة */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </span>

            <div>
              <p className="font-medium">منطقة الإدارة</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                هذه الأقسام مخصصة لإدارة النظام والبيانات الحساسة، وتخضع
                للصلاحيات المحددة لكل مستخدم.
              </p>
            </div>
          </div>

          <Badge variant="success">Admin</Badge>
        </CardContent>
      </Card>

      {/* الخيارات الرئيسية */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">الإدارة الرئيسية</h2>
          <p className="text-sm text-muted-foreground">
            اختر القسم الذي تريد إدارته
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {managementOptions.map((option) => {
            const Icon = option.icon

            return (
              <Link
                key={option.title}
                href={option.href}
                className="group block"
              >
                <Card
                  className={`h-full transition-colors ${
                    option.danger
                      ? 'hover:border-destructive/50'
                      : 'hover:border-primary/40'
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <span
                        className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${
                          option.danger
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-primary/10 text-primary'
                        }`}
                      >
                        <Icon className="size-6" />
                      </span>

                      <ArrowLeft className="mt-2 size-5 text-muted-foreground transition-transform group-hover:-translate-x-1 group-hover:text-primary" />
                    </div>

                    <div className="mt-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold">
                          {option.title}
                        </h3>

                        <Badge
                          variant={option.danger ? 'destructive' : 'neutral'}
                        >
                          {option.badge}
                        </Badge>
                      </div>

                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {option.description}
                      </p>

                      <div className="mt-5 flex items-center text-sm font-medium text-primary">
                        فتح القسم
                        <ArrowLeft className="mr-2 size-4 transition-transform group-hover:-translate-x-1" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

      {/* الوصول السريع */}
      <Card>
        <CardHeader>
          <CardTitle>الوصول السريع</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              variant="outline"
              className="h-auto justify-between py-4"
              nativeButton={false}
              render={<Link href="/settings/users" />}
            >
              <span className="flex items-center gap-3">
                <UserPlus className="size-5 text-primary" />
                <span className="text-right">
                  <span className="block font-medium">إضافة مستخدم</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    إنشاء مستخدم وتحديد صلاحياته
                  </span>
                </span>
              </span>

              <ArrowLeft className="size-4" />
            </Button>

            <Button
              variant="outline"
              className="h-auto justify-between py-4"
              nativeButton={false}
              render={<Link href="/settings/academic-year" />}
            >
              <span className="flex items-center gap-3">
                <BookOpen className="size-5 text-primary" />
                <span className="text-right">
                  <span className="block font-medium">إدارة الدورات</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    إضافة أو تعديل دورة دراسية
                  </span>
                </span>
              </span>

              <ArrowLeft className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* تنبيه الأرشفة */}
      <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
        <CardContent className="flex gap-3 p-5">
          <Archive className="mt-0.5 size-5 shrink-0 text-amber-600" />

          <div>
            <p className="font-medium">الأرشفة لا تعني الحذف</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              عند أرشفة دورة أو سنة دراسية، تبقى جميع بيانات الطلاب والحضور
              والمعلمين والمدفوعات والسجلات محفوظة ويمكن الرجوع إليها لاحقًا.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
