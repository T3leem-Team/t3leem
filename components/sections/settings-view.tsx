
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
  ArrowUpLeft,
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
import {
  checkSettingsPermission,
} from '@/lib/features/settings/repositories/settings.repository'

type ManagementOption = {
  title: string
  description: string
  href: string
  icon: typeof ShieldCheck
  badge?: string
  permission?: string
  elementKey?: string
  color: string
  iconColor: string
  badgeColor?: string
}

type QuickLink = {
  title: string
  description: string
  href: string
  icon: typeof ExternalLink
  external?: boolean
  color: string
  iconColor: string
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
    color:
      'border-sky-200 bg-gradient-to-br from-sky-50 via-white to-cyan-50 hover:border-sky-400 dark:border-sky-900 dark:from-sky-950/50 dark:via-card dark:to-cyan-950/30 dark:hover:border-sky-600',
    iconColor:
      'bg-sky-100 text-sky-700 ring-1 ring-sky-200 dark:bg-sky-900/60 dark:text-sky-300 dark:ring-sky-800',
  },
  {
    title: 'رابط متابعة الطالب',
    description:
      'فتح صفحة متابعة الطالب العامة باستخدام الرقم الشخصي (CPR).',
    href:
      'https://t3leem-school-management-dashboard-virid.vercel.app/student-status',
    icon: ExternalLink,
    external: true,
    color:
      'border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 hover:border-emerald-400 dark:border-emerald-900 dark:from-emerald-950/50 dark:via-card dark:to-teal-950/30 dark:hover:border-emerald-600',
    iconColor:
      'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-300 dark:ring-emerald-800',
  },
]

const managementOptions: ManagementOption[] = [
  {
    title: 'إعدادات التسجيل',
    description:
      'التحكم في نموذج التسجيل الخارجي والحقول المطلوبة وطرق الدفع.',
    href: '/settings/registration',
    icon: ClipboardCheck,
    color:
      'border-blue-200 hover:border-blue-400 hover:bg-blue-50/70 dark:border-blue-900 dark:hover:border-blue-700 dark:hover:bg-blue-950/30',
    iconColor:
      'bg-blue-100 text-blue-700 ring-blue-200 dark:bg-blue-900/60 dark:text-blue-300 dark:ring-blue-800',
  },
  {
    title: 'إدارة صفحة متابعة الطالب',
    description:
      'إدارة إعدادات ومحتوى صفحة متابعة الطالب العامة التي يمكن للطالب أو ولي الأمر الوصول إليها.',
    href: '/settings/student-status',
    icon: UserCog,
    color:
      'border-teal-200 hover:border-teal-400 hover:bg-teal-50/70 dark:border-teal-900 dark:hover:border-teal-700 dark:hover:bg-teal-950/30',
    iconColor:
      'bg-teal-100 text-teal-700 ring-teal-200 dark:bg-teal-900/60 dark:text-teal-300 dark:ring-teal-800',
  },
  {
    title: 'المستخدمون والصلاحيات',
    description:
      'إدارة المستخدمين والأدوار والصلاحيات داخل النظام.',
    href: '/settings/users',
    icon: UserCog,
    color:
      'border-violet-200 hover:border-violet-400 hover:bg-violet-50/70 dark:border-violet-900 dark:hover:border-violet-700 dark:hover:bg-violet-950/30',
    iconColor:
      'bg-violet-100 text-violet-700 ring-violet-200 dark:bg-violet-900/60 dark:text-violet-300 dark:ring-violet-800',
  },
  {
    title: 'الأجهزة الموثوقة',
    description:
      'مراجعة الأجهزة الجديدة والموافقة عليها أو رفضها وإدارة الأجهزة المعتمدة.',
    href: '/settings/trusted-devices',
    icon: ShieldCheck,
    color:
      'border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/70 dark:border-emerald-900 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30',
    iconColor:
      'bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-300 dark:ring-emerald-800',
  },
  {
    title: 'السنة الدراسية والدورات',
    description:
      'إدارة السنوات الدراسية والدورات ومواعيدها وأيام الدراسة.',
    href: '/settings/academic-year',
    icon: BookOpen,
    color:
      'border-amber-200 hover:border-amber-400 hover:bg-amber-50/70 dark:border-amber-900 dark:hover:border-amber-700 dark:hover:bg-amber-950/30',
    iconColor:
      'bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-900/60 dark:text-amber-300 dark:ring-amber-800',
  },
  {
    title: 'المعلمون',
    description:
      'إدارة بيانات المعلمين وربطهم بالدورات والطلاب.',
    href: '/settings/teachers',
    icon: Users,
    color:
      'border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/70 dark:border-indigo-900 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/30',
    iconColor:
      'bg-indigo-100 text-indigo-700 ring-indigo-200 dark:bg-indigo-900/60 dark:text-indigo-300 dark:ring-indigo-800',
  },
  {
    title: 'إدارة الطلاب',
    description:
      'تعديل تاريخ انضمام الطلاب وتاريخ الالتحاق بالمعلم، والتحكم في السماح بحذف الطلاب من صفحة الطلاب.',
    href: '/settings/students-management',
    icon: Users,
    color:
      'border-cyan-200 hover:border-cyan-400 hover:bg-cyan-50/70 dark:border-cyan-900 dark:hover:border-cyan-700 dark:hover:bg-cyan-950/30',
    iconColor:
      'bg-cyan-100 text-cyan-700 ring-cyan-200 dark:bg-cyan-900/60 dark:text-cyan-300 dark:ring-cyan-800',
  },
  {
    title: 'المواد الدراسية',
    description:
      'إضافة وتعديل وحذف المواد الدراسية المستخدمة في النظام.',
    href: '/settings/subjects',
    icon: GraduationCap,
    color:
      'border-purple-200 hover:border-purple-400 hover:bg-purple-50/70 dark:border-purple-900 dark:hover:border-purple-700 dark:hover:bg-purple-950/30',
    iconColor:
      'bg-purple-100 text-purple-700 ring-purple-200 dark:bg-purple-900/60 dark:text-purple-300 dark:ring-purple-800',
  },
  {
    title: 'الأرشيف',
    description:
      'الوصول إلى السجلات والبيانات المؤرشفة وإدارتها.',
    href: '/settings/archive',
    icon: Archive,
    color:
      'border-slate-200 hover:border-slate-400 hover:bg-slate-50/80 dark:border-slate-700 dark:hover:border-slate-500 dark:hover:bg-slate-800/40',
    iconColor:
      'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
  },
  {
    title: 'التحليلات',
    description:
      'عرض وتحليل مؤشرات النظام، والبدء بتحليل زيارات صفحة متابعة الطلاب وإضافة تحليلات أخرى لاحقًا.',
    href: '/settings/analytics',
    icon: BarChart3,
    badge: 'جديد',
    permission: 'analytics.view',
    elementKey: 'analytics.page.view',
    color:
      'border-rose-200 hover:border-rose-400 hover:bg-rose-50/70 dark:border-rose-900 dark:hover:border-rose-700 dark:hover:bg-rose-950/30',
    iconColor:
      'bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-900/60 dark:text-rose-300 dark:ring-rose-800',
    badgeColor:
      'border border-rose-200 bg-rose-100 text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300',
  },
  {
    title: 'الإجراءات الإدارية الخاصة',
    description:
      'إدارة الإجراءات الحساسة التي تحتاج إلى صلاحيات خاصة.',
    href: '/settings/special-actions',
    icon: LockKeyhole,
    color:
      'border-red-200 hover:border-red-400 hover:bg-red-50/70 dark:border-red-900 dark:hover:border-red-700 dark:hover:bg-red-950/30',
    iconColor:
      'bg-red-100 text-red-700 ring-red-200 dark:bg-red-900/60 dark:text-red-300 dark:ring-red-800',
  },
  {
    title: 'التحكم بعناصر النظام',
    description:
      'التحكم في ظهور واستخدام الأزرار والبطاقات والعناصر الداخلية للمستخدمين.',
    href: '/settings/system-elements',
    icon: SlidersHorizontal,
    badge: 'خاص',
    color:
      'border-fuchsia-200 hover:border-fuchsia-400 hover:bg-fuchsia-50/70 dark:border-fuchsia-900 dark:hover:border-fuchsia-700 dark:hover:bg-fuchsia-950/30',
    iconColor:
      'bg-fuchsia-100 text-fuchsia-700 ring-fuchsia-200 dark:bg-fuchsia-900/60 dark:text-fuchsia-300 dark:ring-fuchsia-800',
    badgeColor:
      'border border-fuchsia-200 bg-fuchsia-100 text-fuchsia-700 dark:border-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-300',
  },
]

export function SettingsView() {
  const router = useRouter()

  const [canViewAnalytics, setCanViewAnalytics] =
    useState(false)

  const [permissionsLoaded, setPermissionsLoaded] =
    useState(false)

  const [systemElementKeys, setSystemElementKeys] =
    useState<string[]>([])

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

        if (userError) {
          console.error(
            'AUTH USER ERROR:',
            userError,
          )
        }

        if (!user) {
          if (mounted) {
            setCanViewAnalytics(false)
            setPermissionsLoaded(true)
            setSystemElementKeys([])
            setIsPrimaryAdmin(false)
            setSystemElementsChecked(true)
          }

          return
        }

        /*
         * صلاحية دخول صفحة التحليلات نفسها.
         * مستقلة عن صلاحية عنصر النظام.
         */
        const { data, error } =
          await checkSettingsPermission('analytics.view')

        if (mounted) {
          setCanViewAnalytics(!error && data === true)
          setPermissionsLoaded(true)
        }

        /*
         * جلب صلاحيات عناصر النظام.
         */
        try {
          const response = await fetch(
            '/api/auth/permissions',
            {
              method: 'GET',
              cache: 'no-store',
            },
          )

          const access = await response.json()

          if (!response.ok) {
            throw new Error(
              access.error ??
                'تعذر تحميل عناصر النظام.',
            )
          }

          if (mounted) {
            setSystemElementKeys(
              Array.isArray(access.systemElementKeys)
                ? access.systemElementKeys
                : [],
            )
          }
        } catch (error) {
          console.error(
            'System elements permissions error:',
            error,
          )

          if (mounted) {
            setSystemElementKeys([])
          }
        }

        /*
         * التحقق من مدير النظام الأساسي.
         *
         * الـ API يتحقق من:
         * username = admin
         * role = Admin
         * active
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
            setIsPrimaryAdmin(response.ok)
            setSystemElementsChecked(true)
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
          setSystemElementKeys([])
          setIsPrimaryAdmin(false)
          setSystemElementsChecked(true)
        }
      }
    }

    void checkPermissions()

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
      if (item.href === '/settings/system-elements') {
        return systemElementsChecked && isPrimaryAdmin
      }

      /*
       * التحليلات:
       * admin الأساسي يحتاج analytics.view.
       * باقي المستخدمين يحتاجون أيضًا
       * analytics.page.view.
       */
      if (item.elementKey === 'analytics.page.view') {
        if (!permissionsLoaded) {
          return false
        }

        if (!canViewAnalytics) {
          return false
        }

        if (isPrimaryAdmin) {
          return true
        }

        return systemElementKeys.includes(
          'analytics.page.view',
        )
      }

      /*
       * العناصر التي لا تعتمد على
       * صلاحية محددة تظهر كالمعتاد.
       */
      if (!item.permission) {
        return true
      }

      if (!permissionsLoaded) {
        return false
      }

      if (item.permission === 'analytics.view') {
        return canViewAnalytics
      }

      return false
    })

  return (
    <div className="space-y-8 pb-8">
      <PageHeader
        title="الإدارة"
        description="إدارة إعدادات النظام والصلاحيات والوظائف الرئيسية."
      />

      {/* روابط سريعة */}
      <section className="space-y-4">
        <div className="border-r-4 border-sky-500 pr-3">
          <h2 className="text-lg font-bold tracking-tight">
            روابط سريعة
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
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
                target={item.external ? '_blank' : undefined}
                rel={
                  item.external
                    ? 'noopener noreferrer'
                    : undefined
                }
                className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <Card
                  className={`h-full overflow-hidden rounded-xl border shadow-sm transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg ${item.color}`}
                >
                  <CardContent className="flex items-center gap-4 p-5">
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-105 ${item.iconColor}`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold transition-colors">
                        {item.title}
                      </h3>

                      <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                        {item.description}
                      </p>
                    </div>

                    <ArrowUpLeft className="h-5 w-5 shrink-0 text-muted-foreground opacity-60 transition-all duration-200 group-hover:-translate-x-1 group-hover:-translate-y-1 group-hover:text-foreground group-hover:opacity-100" />
                  </CardContent>
                </Card>
              </a>
            )
          })}
        </div>
      </section>

      {/* إعدادات الإدارة */}
      <section className="space-y-4">
        <div className="border-r-4 border-violet-500 pr-3">
          <h2 className="text-lg font-bold tracking-tight">
            إعدادات الإدارة
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            إدارة أقسام النظام والإعدادات الداخلية.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleManagementOptions.map((item) => {
            const Icon = item.icon

            return (
              <Card
                key={item.href}
                role="link"
                tabIndex={0}
                aria-label={`فتح ${item.title}`}
                onClick={() => router.push(item.href)}
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter' ||
                    event.key === ' '
                  ) {
                    event.preventDefault()
                    router.push(item.href)
                  }
                }}
                className={`group relative h-full cursor-pointer overflow-hidden rounded-xl border shadow-sm outline-none transition-all duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${item.color}`}
              >
                {/* شريط علوي ملون */}
                <div
                  className={`absolute inset-x-0 top-0 h-1 opacity-60 transition-opacity duration-200 group-hover:opacity-100 ${item.iconColor.split(' ')[0]}`}
                />

                <CardHeader className="pb-4 pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 transition-all duration-200 group-hover:scale-105 group-hover:shadow-sm ${item.iconColor}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="flex items-center gap-2">
                      {item.badge && (
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.badgeColor ?? 'border border-border bg-muted text-muted-foreground'}`}
                        >
                          {item.badge}
                        </span>
                      )}

                      <ArrowUpLeft className="h-4 w-4 text-muted-foreground opacity-40 transition-all duration-200 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
                    </div>
                  </div>

                  <CardTitle className="pt-2 text-base font-bold leading-6">
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
    </div>
  )
}
