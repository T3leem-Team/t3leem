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

const routes: {
  match: (p: string) => boolean
  view: () => React.ReactNode
}[] = [
  { match: (p) => p === '/', view: () => <DashboardView /> },
  { match: (p) => p.startsWith('/settings'), view: () => <SettingsView /> },
  { match: (p) => p.startsWith('/supervision'), view: () => <SupervisionView /> },
  { match: (p) => p.startsWith('/enrollment'), view: () => <EnrollmentView /> },
  { match: (p) => p.startsWith('/students'), view: () => <StudentsView /> },
  { match: (p) => p.startsWith('/teachers'), view: () => <TeachersView /> },
  { match: (p) => p.startsWith('/payments'), view: () => <PaymentsView /> },
]

type DashboardSection = {
  section_key: string
  href: string
  sort_order: number
}

function getSectionKey(pathname: string) {
  if (pathname === '/') return 'dashboard'
  if (pathname.startsWith('/settings')) return 'settings'
  if (pathname.startsWith('/supervision')) return 'supervision'
  if (pathname.startsWith('/enrollment')) return 'enrollment'
  if (pathname.startsWith('/students')) return 'students'
  if (pathname.startsWith('/teachers')) return 'teachers'
  if (pathname.startsWith('/payments')) return 'payments'

  return null
}

export function SectionRouter() {
  const pathname = usePathname()
  const router = useRouter()

  const [sections, setSections] = useState<DashboardSection[] | null>(null)

  useEffect(() => {
    let cancelled = false

    async function checkAccess() {
      try {
        const response = await fetch(
          '/api/auth/dashboard-sections',
          {
            method: 'GET',
            cache: 'no-store',
          },
        )

        if (!response.ok) {
          router.replace('/login?reason=session_expired')
          return
        }

        const data = await response.json()

        if (cancelled) return

        const allowedSections: DashboardSection[] =
          Array.isArray(data.sections)
            ? data.sections.sort(
                (
                  a: DashboardSection,
                  b: DashboardSection,
                ) => a.sort_order - b.sort_order,
              )
            : []

        setSections(allowedSections)

        const currentSectionKey =
          getSectionKey(pathname)

        if (!currentSectionKey) return

        const allowed =
          allowedSections.some(
            (section) =>
              section.section_key ===
              currentSectionKey,
          )

        if (allowed) return

        const firstSection =
          allowedSections[0]

        if (firstSection) {
          router.replace(firstSection.href)
        } else {
          router.replace(
            '/status?reason=no_permissions',
          )
        }
      } catch (error) {
        console.error(
          'Section access check error:',
          error,
        )
      }
    }

    checkAccess()

    return () => {
      cancelled = true
    }
  }, [pathname, router])

  const isSubPage =
    pathname.split('/').filter(Boolean).length > 1

  if (isSubPage) {
    return null
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

  return (
  <div
    dir="rtl"
    className="m-6 rounded-2xl border-4 border-red-500 bg-red-50 p-10"
  >
    <h1 className="text-3xl font-bold text-red-700">
      SECTION ROUTER TEST
    </h1>

    <p className="mt-4 text-lg">
      المسار الحالي: {pathname}
    </p>

    <p className="mt-2 text-lg">
      القسم: {currentSectionKey}
    </p>

    <button
      type="button"
      onClick={() => alert('BUTTON WORKS')}
      className="mt-6 rounded-xl bg-black px-6 py-3 text-white"
    >
      اختبار الضغط
    </button>
  </div>
)
}