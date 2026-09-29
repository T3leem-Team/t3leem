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
  getDashboardSections,
  saveDashboardSections,
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

let sectionsCache: DashboardSection[] | null = null
let sectionsLoading = false

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

async function refreshSections(
  router: ReturnType<typeof useRouter>,
) {
  if (sectionsLoading) {
    return
  }

  sectionsLoading = true

  try {
    const response = await fetch(
      '/api/auth/dashboard-sections',
      {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      },
    )

    if (!response.ok) {
      clearDashboardSections()
      sectionsCache = null
      router.replace('/login')
      return
    }

    const data = await response.json()

    const allowedSections: DashboardSection[] =
      Array.isArray(data.sections)
        ? [...data.sections]
            .filter(
              (section) =>
                section &&
                typeof section.section_key ===
                  'string' &&
                typeof section.href ===
                  'string',
            )
            .sort(
              (
                a: DashboardSection,
                b: DashboardSection,
              ) =>
                (a.sort_order ?? 0) -
                (b.sort_order ?? 0),
            )
        : []

    sectionsCache = allowedSections

    saveDashboardSections(
      allowedSections,
    )
  } catch (error) {
    console.error(
      'Section access check error:',
      error,
    )
  } finally {
    sectionsLoading = false
  }
}

export function SectionRouter() {
  const pathname = usePathname()
  const router = useRouter()

  const [sections, setSections] =
    useState<DashboardSection[] | null>(
      () => {
        /*
         * أول شيء:
         * حاول استخدام الكاش الموجود في الذاكرة.
         */
        if (sectionsCache) {
          return sectionsCache
        }

        /*
         * إذا كانت الصفحة فتحت بعد LoginPage مباشرة،
         * نقرأ النتيجة التي حفظها LoginPage.
         */
        const stored =
          getDashboardSections()

        if (stored) {
          sectionsCache = stored
          return stored
        }

        return null
      },
    )

  /*
   * --------------------------------------------------
   * تحديث الصلاحيات في الخلفية
   * --------------------------------------------------
   *
   * إذا كانت الصلاحيات موجودة:
   * - لا نعرض Loading.
   * - لا ننتظر الطلب.
   * - نحدثها في الخلفية فقط.
   *
   * إذا لم تكن موجودة:
   * - ننتظر أول طلب.
   * --------------------------------------------------
   */

  useEffect(() => {
    let cancelled = false

    async function checkAccess() {
      if (sectionsCache) {
        /*
         * لدينا صلاحيات جاهزة.
         *
         * لا نغير الـ UI.
         * فقط نحدث البيانات في الخلفية.
         */
        await refreshSections(router)

        if (
          !cancelled &&
          sectionsCache
        ) {
          setSections(
            [...sectionsCache],
          )
        }

        return
      }

      /*
       * لا يوجد كاش إطلاقًا.
       */
      await refreshSections(router)

      if (
        !cancelled &&
        sectionsCache
      ) {
        setSections(
          [...sectionsCache],
        )
      }
    }

    checkAccess()

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
          section.section_key ===
          currentSectionKey,
      )

    if (hasAccess) {
      return
    }

    const firstAllowedSection =
      sections[0]

    if (
      firstAllowedSection?.href &&
      firstAllowedSection.href !==
        pathname
    ) {
      router.replace(
        firstAllowedSection.href,
      )

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
   * فقط إذا لم تكن لدينا أي صلاحيات جاهزة
   * --------------------------------------------------
   */

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
        section.section_key ===
        currentSectionKey,
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