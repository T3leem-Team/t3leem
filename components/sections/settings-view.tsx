import Link from 'next/link'
import {
  Archive,
  ArrowLeft,
  BookOpen,
  ClipboardCheck,
  ExternalLink,
  Settings2,
  ShieldAlert,
  Users,
} from 'lucide-react'

import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const quickLinks = [
  {
    title: 'التسجيل العام',
    description:
      'فتح صفحة التسجيل العامة مباشرة وإرسال رابطها للطلاب أو أولياء الأمور.',
    href: '/registration',
    icon: ClipboardCheck,
  },
  {
    title: 'تقييم الطالب',
    description:
      'فتح صفحة تقييم الطالب مباشرة للوصول إليها بسرعة عند الحاجة.',
    href: '/student-evaluation',
    icon: ClipboardCheck,
  },
]

const managementOptions = [
  {
    title: 'إعدادات التسجيل',
    description:
      'التحكم في صفحة التسجيل العامة، وتحديد الحقول الظاهرة والمطلوبة، وإعدادات الدفع وطرق الدفع وإثبات الدفع.',
    href: '/settings/registration',
    icon: Settings2,
    badge: 'التسجيل العام',
  },
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
    title: 'المعلمون',
    description:
      'إضافة وإدارة المعلمين وتعديل بياناتهم وتفعيلهم أو تعطيلهم.',
    href: '/settings/teachers',
    icon: Users,
    badge: 'إدارة المعلمين',
  },
  {
    title: 'إشراف الدوام والدروس',
    description:
      'إدارة الحالات اليومية للدروس والمعلمين، مثل إلغاء يوم دراسي أو درس، تسجيل غياب أو تأخر المعلم، وإضافة الملاحظات الإشرافية.',
    href: '/settings/supervision',
    icon: ClipboardCheck,
    badge: 'الإشراف',
  },
  {
    title: 'المواد الدراسية',
    description:
      'إضافة وتعديل المواد الدراسية التي يستخدمها النظام والمعلمون.',
    href: '/settings/subjects',
    icon: BookOpen,
    badge: 'المواد',
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
    title: 'الإجراءات الإدارية الخاصة',
    description:
      'إجراءات إدارية خاصة تحتاج إلى صلاحية محددة، مثل احتساب نسب الحضور وتجهيز قوائم التكريم وبعض الإجراءات الحساسة.',
    href: '/settings/special-actions',
    icon: ShieldAlert,
    badge: 'إجراءات خاصة',
    danger: true,
  },
]

export function SettingsView() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="الإدارة والتحكم"
        description="إدارة المستخدمين والصلاحيات والتسجيل والدورات والمعلمين والمواد والإشراف والأرشيف والإجراءات الإدارية"
      />

      {/* روابط سريعة */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">روابط سريعة</h2>
          <p className="text-sm text-muted-foreground">
            الوصول المباشر إلى الصفحات التي تستخدمها بشكل متكرر
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {quickLinks.map((link) => {
            const Icon = link.icon

            return (
              <Link
                key={link.href}
                href={link.href}
                className="group block"
              >
                <Card className="h-full transition-colors hover:border-primary/40">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="size-6" />
                      </span>

                      <ExternalLink className="mt-2 size-5 text-muted-foreground transition-colors group-hover:text-primary" />
                    </div>

                    <div className="mt-5">
                      <h3 className="text-base font-semibold">
                        {link.title}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {link.description}
                      </p>

                      <div className="mt-5 flex items-center text-sm font-medium text-primary">
                        فتح الصفحة
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

      {/* الإدارة الرئيسية */}
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
                          variant={
                            option.danger
                              ? 'destructive'
                              : 'neutral'
                          }
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