import Link from 'next/link'
import { BookOpen, Users, Archive, ShieldAlert } from 'lucide-react'

import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent } from '@/components/ui/card'

const options = [
  {
    title: 'المستخدمون والصلاحيات',
    description: 'إدارة المستخدمين والصلاحيات',
    href: '/settings/users',
    icon: Users,
  },
  {
    title: 'السنة الدراسية والدورات',
    description: 'إدارة السنوات الدراسية والدورات',
    href: '/settings/academic-year',
    icon: BookOpen,
  },
  {
    title: 'المواد الدراسية',
    description: 'إضافة وتعديل المواد الدراسية',
    href: '/settings/subjects',
    icon: BookOpen,
  },
  {
    title: 'الأرشيف',
    description: 'إدارة الدورات والسنوات المؤرشفة',
    href: '/settings/archive',
    icon: Archive,
  },
  {
    title: 'الإجراءات الحساسة',
    description: 'الإجراءات التي تحتاج صلاحيات خاصة',
    href: '/settings/danger-zone',
    icon: ShieldAlert,
  },
]

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="الإدارة والتحكم"
        description="إدارة إعدادات النظام والبيانات الإدارية"
      />

      <div className="grid gap-4 md:grid-cols-2">
        {options.map((option) => {
          const Icon = option.icon

          return (
            <Link key={option.href} href={option.href}>
              <Card className="transition-colors hover:border-primary/50">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-6" />
                  </div>

                  <div>
                    <h2 className="font-semibold">{option.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
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
  )
}
