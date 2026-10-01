'use client'

import {
  Archive,
  BarChart3,
  BookOpen,
  ClipboardCheck,
  ExternalLink,
  GraduationCap,
  LockKeyhole,
  ShieldCheck,
  SlidersHorizontal,
  UserCog,
  Users,
} from 'lucide-react'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { PageHeader } from '@/components/dashboard/page-header'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { supabase } from '@/lib/supabase'

type ManagementOption = {
  title: string
  description: string
  href: string
  icon: typeof ShieldCheck
  badge?: string
  permission?: string
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
    href:
      'https://t3leem-school-management-dashboard-virid.vercel.app/register',
    icon: ExternalLink,
    external: true,
  },
  {
    title: 'رابط متابعة الطالب',
    description:
      'فتح صفحة متابعة الطالب العامة باستخدام الرقم الشخصي (CPR).',
    href:
      'https://t3leem-school-management-dashboard-virid.vercel.app/student-status',
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
    title: 'إدارة صفحة متابعة الطالب',
    description:
      'إدارة إعدادات ومحتوى صفحة متابعة الطالب العامة التي يمكن للطالب أو ولي الأمر الوصول إليها.',
    href: '/settings/student-status',
    icon: UserCog,
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
    title: 'التحليلات',
    description:
      'عرض وتحليل مؤشرات النظام، والبدء بتحليل زيارات صفحة متابعة الطلاب وإضافة تحليلات أخرى لاحقًا.',
    href: '/settings/analytics',
    icon: BarChart3,
    badge: 'جديد',
    permission: 'analytics.view',
  },
  {
    title: 'الإجراءات الإدارية الخاصة',
    description:
      'إدارة الإجراءات الحساسة التي تحتاج إلى صلاحيات خاصة.',
    href: '/settings/special-actions',
    icon: LockKeyhole,
  },
  {
    title: 'التحكم بعناصر النظام',
    description:
      'التحكم في ظهور واستخدام الأزرار والبطاقات والعناصر الداخلية للمستخدمين.',
    href: '/settings/system-elements',
    icon: SlidersHorizontal,
    badge: 'خاص',
  },
]

export function SettingsView() {
  const router = useRouter()

  const [canViewAnalytics, setCanViewAnalytics] =
    useState(false)

  const [permissionsLoaded, setPermissionsLoaded] =
    useState(false)

  const [isPrimaryAdmin, setIsPrimaryAdmin] =
    useState(false)

  const [systemElementsChecked, setSystemElementsChecked] =
    useState(false)

  useEffect(() => {
    let mounted = true

    const checkPermissions = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        console.log(
          'CURRENT AUTH USER:',
          user?.id,
        )

        if (userError) {
          console.error(
            'AUTH USER ERROR:',
            userError,
          )
        }

        if (!user) {
          console.log('NO AUTH USER')

          if (mounted) {
            setCanViewAnalytics(false)
            setPermissionsLoaded(true)
            setIsPrimaryAdmin(false)
            setSystemElementsChecked(true)
          }

          return
        }

        /*
         * صلاحية صفحة التحليلات نفسها.
         *
         * هذه تبقى منفصلة عن صلاحيات عناصر النظام.
         */
        const {
          data,
          error,
        } = await supabase.rpc(
          'has_permission',
          {
            required_permission:
              'analytics.view',
          },
        )

        console.log(
          'ANALYTICS PERMISSION:',
          data,
        )

        console.log(
          'ANALYTICS PERMISSION ERROR:',
          error,
        )

        if (mounted) {
          if (error) {
            setCanViewAnalytics(false)
          } else {
            setCanViewAnalytics(
              data === true,
            )
          }

          setPermissionsLoaded(true)
        }

        /*
         * التحقق من مدير النظام الأساسي.
         *
         * الـ API نفسه محمي ولا يسمح إلا للمستخدم:
         * username = admin
         * role = Admin
         * active
         *
         * لذلك إذا رجع 200 فهذا هو الـ admin الأساسي.
         */
        try {
          const response = await fetch(
            '/api/admin/system-elements',
            {
              method: 'GET',
              cache: 'no-store',
            },
          )

          if (mounted) {
            setIsPrimaryAdmin(
              response.ok,
            )
            setSystemElementsChecked(
              true,
            )
          }
        } catch (error) {
          console.error(
            'System elements access check error:',
            error,
          )

          if (mounted) {
            setIsPrimaryAdmin(false)
            setSystemElementsChecked(true)
          }
        }
      } catch (error) {
        console.error(
          'Permission check error:',
          error,
        )

        if (mounted) {
          setCanViewAnalytics(false)
          setPermissionsLoaded(true)
          setIsPrimaryAdmin(false)
          setSystemElementsChecked(true)
        }
      }
    }

    checkPermissions()

    return () => {
      mounted = false
    }
  }, [])

  const visibleManagementOptions =
    managementOptions.filter((item) => {
      /*
       * التحكم بعناصر النظام:
       * يظهر فقط للـ admin الأساسي.
       */
      if (
        item.href ===
        '/settings/system-elements'
      ) {
        return (
          systemElementsChecked &&
          isPrimaryAdmin
        )
      }

      /*
       * باقي العناصر التي لا تعتمد على
       * صلاحية محددة تظهر كالمعتاد.
       */
      if (!item.permission) {
        return true
      }

      if (!permissionsLoaded) {
        return false
      }

      if (
        item.permission ===
        'analytics.view'
      ) {
        return canViewAnalytics
      }

      return false
    })

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
          {visibleManagementOptions.map(
            (item) => {
              const Icon = item.icon

              return (
                <Card
                  key={item.href}
                  className="cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md"
                  onClick={() =>
                    router.push(item.href)
                  }
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
            },
          )}
        </div>
      </section>
    </div>
  )
}