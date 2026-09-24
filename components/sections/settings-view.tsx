'use client'

import {
  Archive,
  BookOpen,
  ClipboardCheck,
  ExternalLink,
  FileKey,
  GraduationCap,
  KeyRound,
  LockKeyhole,
  Settings2,
  ShieldCheck,
  UserCog,
  Users,
} from 'lucide-react'

import { useRouter } from 'next/navigation'

import { PageHeader } from '@/components/dashboard/page-header'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type ManagementOption = {
  title: string
  description: string
  href: string
  icon: typeof Settings2
  badge?: string
}

type QuickLink = {
  title: string
  description: string
  href: string
  icon: typeof ExternalLink
  external?: boolean
}

const quickLinks: QuickLink[] = [
  {
    title: 'رابط التسجيل الخارجي',
    description:
      'فتح صفحة التسجيل الخارجي العامة التي يستخدمها أولياء الأمور والطلاب.',
    href: 'https://t3leem-school-management-dashboard-virid.vercel.app/register',
    icon: ExternalLink,
    external: true,
  },
  {
    title: 'رابط متابعة الطالب',
    description:
      'فتح صفحة متابعة الطالب العامة باستخدام الرقم الشخصي (CPR).',
    href: 'https://t3leem-school-management-dashboard-virid.vercel.app/student-status',
    icon: ExternalLink,
    external: true,
  },
]

const managementOptions: ManagementOption[] = [
  {
    title: 'إعدادات التسجيل',
    description:
      'التحكم في نموذج التسجيل الخارجي والحقول المطلوبة وطرق الدفع.',
    href: '/settings/registration',
    icon: ClipboardCheck,
  },
  {
    title: 'المستخدمون والصلاحيات',
    description:
      'إدارة المستخدمين والأدوار والصلاحيات داخل النظام.',
    href: '/settings/users',
    icon: UserCog,
  },
  {
    title: 'الأجهزة الموثوقة',
    description:
      'مراجعة الأجهزة الجديدة والموافقة عليها أو رفضها وإدارة الأجهزة المعتمدة.',
    href: '/settings/trusted-devices',
    icon: ShieldCheck,
  },
  {
    title: 'السنة الدراسية والدورات',
    description:
      'إدارة السنوات الدراسية والدورات ومواعيدها وأيام الدراسة.',
    href: '/settings/academic-year',
    icon: BookOpen,
  },
  {
    title: 'المعلمون',
    description:
      'إدارة بيانات المعلمين وربطهم بالدورات والطلاب.',
    href: '/settings/teachers',
    icon: Users,
  },
  {
    title: 'المواد الدراسية',
    description:
      'إضافة وتعديل وحذف المواد الدراسية المستخدمة في النظام.',
    href: '/settings/subjects',
    icon: GraduationCap,
  },
  {
    title: 'الأرشيف',
    description:
      'الوصول إلى السجلات والبيانات المؤرشفة وإدارتها.',
    href: '/settings/archive',
    icon: Archive,
  },
  {
    title: 'إدارة المفاتيح',
    description:
      'إدارة مفاتيح التحكم الخاصة بالوظائف الحساسة والمميزات التي يمكن تفعيلها أو تعطيلها من الإدارة.',
    href: '/settings/keys',
    icon: KeyRound,
    badge: 'مفاتيح النظام',
  },
  {
    title: 'الإجراءات الإدارية الخاصة',
    description:
      'إدارة الإجراءات الحساسة التي تحتاج إلى صلاحيات خاصة.',
    href: '/settings/special-actions',
    icon: LockKeyhole,
  },
]

export function SettingsView() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <PageHeader
        title="الإدارة"
        description="إدارة إعدادات النظام والصلاحيات والوظائف الرئيسية."
      />

      {/* روابط سريعة */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">
            روابط سريعة
          </h2>

          <p className="text-sm text-muted-foreground">
            الوصول السريع إلى الروابط العامة المستخدمة.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {quickLinks.map((item) => {
            const Icon = item.icon

            return (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Card className="cursor-pointer transition hover:shadow-md">
                  <CardContent className="flex items-center gap-4 p-5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-6 w-6" />
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-semibold">
                        {item.title}
                      </h3>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </a>
            )
          })}
        </div>
      </section>

      {/* إعدادات الإدارة */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">
            إعدادات الإدارة
          </h2>

          <p className="text-sm text-muted-foreground">
            إدارة أقسام النظام والإعدادات الداخلية.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {managementOptions.map((item) => {
            const Icon = item.icon

            return (
              <Card
                key={item.href}
                className="cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md"
                onClick={() => router.push(item.href)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
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
                </CardHeader>
              </Card>
            )
          })}
        </div>
      </section>

      {/* تنبيه */}
      <Card className="border-dashed">
        <CardContent className="flex items-start gap-3 p-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <FileKey className="h-4 w-4 text-muted-foreground" />
          </div>

          <div>
            <p className="font-medium">
              مفاتيح النظام
            </p>

            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              سيتم من خلال إدارة المفاتيح التحكم في
              الوظائف الحساسة مثل استيراد سجل الطلاب
              وغيرها من العمليات التي تحتاج إلى تفعيل
              صريح من الإدارة.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}