
'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { DashboardView } from '@/components/sections/dashboard-view'
import { StudentsView } from '@/components/sections/students-view'
import { EnrollmentView } from '@/components/sections/enrollment-view'
import { TeachersView } from '@/components/sections/teachers-view'
import { PaymentsView } from '@/components/sections/payments-view'
import { SettingsView } from '@/components/sections/settings-view'
import { SupervisionView } from '@/components/sections/supervision-view'
import { TripsView } from '@/components/sections/trips-view'
import { CommunicationView } from '@/components/sections/communication'

import {
  clearDashboardSections,
  DashboardSectionsError,
  loadDashboardSections,
  type DashboardSection,
} from '@/lib/dashboard-sections-cache'

const routes: {
  match: (p: string) => boolean
  view: () => React.ReactNode
}[] = [
  {
    match: (p) => p === '/',
    view: () => <DashboardView />,
  },
  {
    match: (p) => p.startsWith('/settings'),
    view: () => <SettingsView />,
  },
  {
    match: (p) => p.startsWith('/supervision'),
    view: () => <SupervisionView />,
  },
  {
    match: (p) => p.startsWith('/enrollment'),
    view: () => <EnrollmentView />,
  },
  {
    match: (p) => p.startsWith('/students'),
    view: () => <StudentsView />,
  },
  {
    match: (p) => p.startsWith('/teachers'),
    view: () => <TeachersView />,
  },
  {
    match: (p) => p.startsWith('/payments'),
    view: () => <PaymentsView />,
  },
  {
    match: (p) => p.startsWith('/communication'),
    view: () => <CommunicationView />,
  },
  {
    match: (p) => p.startsWith('/trips'),
    view: () => <TripsView />,
  },
]

function getSectionKey(pathname: string) {
  if (pathname === '/') return 'dashboard'
  if (pathname.startsWith('/settings')) return 'settings'
  if (pathname.startsWith('/supervision')) return 'supervision'
  if (pathname.startsWith('/enrollment')) return 'enrollment'
  if (pathname.startsWith('/students')) return 'students'
  if (pathname.startsWith('/teachers')) return 'teachers'
  if (pathname.startsWith('/payments')) return 'payments'
  if (pathname.startsWith('/communication')) return 'communication'
  if (pathname.startsWith('/trips')) return 'trips'

  return null
}

export function SectionRouter() {
  const pathname = usePathname()
  const router = useRouter()

  const [sections, setSections] =
    useState<DashboardSection[] | null>(null)

  const [loadError, setLoadError] =
    useState(false)

  /*
   * --------------------------------------------------
   * تحميل الصلاحيات
   *
   * يستخدم نفس Promise الموجود في Sidebar.
   * إذا كان الطلب جاريًا، تتم مشاركته بدل إنشاء طلب جديد.
   * وإذا كانت البيانات مخزنة وحديثة، لا يتم إرسال طلب.
   * --------------------------------------------------
   */
  useEffect(() => {
    let cancelled = false

    async function checkAccess() {
      try {
        setLoadError(false)

        const loadedSections =
          await loadDashboardSections()

        if (!cancelled) {
          setSections([...loadedSections])
        }
      } catch (error) {
        if (cancelled) {
          return
        }

        if (
          error instanceof DashboardSectionsError &&
          error.status === 401
        ) {
          clearDashboardSections()
          setSections(null)
          router.replace('/login')
          return
        }

        console.error(
          'Section access check error:',
          error,
        )

        setLoadError(true)
      }
    }

    void checkAccess()

    return () => {
      cancelled = true
    }
  }, [router])

  /*
   * --------------------------------------------------
   * التحقق من القسم الحالي
   * --------------------------------------------------
   */
  useEffect(() => {
    if (!sections) {
      return
    }

    const currentSectionKey =
      getSectionKey(pathname)

    const hasAccess =
      currentSectionKey === null ||
      sections.some(
        (section) =>
          section.section_key === currentSectionKey,
      )

    if (hasAccess) {
      return
    }

    const firstAllowedSection =
      sections[0]

    if (
      firstAllowedSection?.href &&
      firstAllowedSection.href !== pathname
    ) {
      router.replace(firstAllowedSection.href)
      return
    }

    if (!firstAllowedSection) {
      clearDashboardSections()
      router.replace('/login')
    }
  }, [
    sections,
    pathname,
    router,
  ])

  const isSubPage =
    pathname
      .split('/')
      .filter(Boolean)
      .length > 1

  if (isSubPage) {
    return null
  }

  /*
   * --------------------------------------------------
   * حالة التحميل
   * --------------------------------------------------
   */
  if (!sections && loadError) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-destructive">
            تعذر تحميل صلاحيات الوصول.
          </p>

          <button
            type="button"
            onClick={() => {
              setLoadError(false)

              void loadDashboardSections({
                forceRefresh: true,
              })
                .then((loadedSections) => {
                  setSections([...loadedSections])
                })
                .catch((error) => {
                  console.error(
                    'Retry dashboard sections error:',
                    error,
                  )

                  if (
                    error instanceof DashboardSectionsError &&
                    error.status === 401
                  ) {
                    clearDashboardSections()
                    router.replace('/login')
                    return
                  }

                  setLoadError(true)
                })
            }}
            className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    )
  }

  if (!sections) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <div className="text-sm text-muted-foreground">
          جاري التحقق من صلاحيات الوصول...
        </div>
      </div>
    )
  }

  const currentSectionKey =
    getSectionKey(pathname)

  const hasAccess =
    currentSectionKey === null ||
    sections.some(
      (section) =>
        section.section_key === currentSectionKey,
    )

  if (!hasAccess) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <div className="text-sm text-muted-foreground">
          جاري تحويلك إلى القسم المسموح...
        </div>
      </div>
    )
  }

  const active =
    routes.find((route) =>
      route.match(pathname),
    ) ?? routes[0]

  return active.view()
}
