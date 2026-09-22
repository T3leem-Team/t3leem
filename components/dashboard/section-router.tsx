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

  const [sections, setSections] =
    useState<DashboardSection[] | null>(null)

  useEffect(() => {
    if (sections) return

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
          router.replace(
            '/login?reason=session_expired',
          )
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
  }, [sections, router])

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
    const firstSection = sections[0]

    if (firstSection) {
      router.replace(firstSection.href)
    } else {
      router.replace(
        '/status?reason=no_permissions',
      )
    }

    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <div className="text-sm text-muted-foreground">
          جاري تحويلك إلى القسم المسموح...
        </div>
      </div>
    )
  }

  return (
    <div className="min-w-0">
      <div
        className={
          currentSectionKey === 'dashboard'
            ? 'block'
            : 'hidden'
        }
      >
        <DashboardView />
      </div>

      <div
        className={
          currentSectionKey === 'settings'
            ? 'block'
            : 'hidden'
        }
      >
        <SettingsView />
      </div>

      <div
        className={
          currentSectionKey === 'supervision'
            ? 'block'
            : 'hidden'
        }
      >
        <SupervisionView />
      </div>

      <div
        className={
          currentSectionKey === 'enrollment'
            ? 'block'
            : 'hidden'
        }
      >
        <EnrollmentView />
      </div>

      <div
        className={
          currentSectionKey === 'students'
            ? 'block'
            : 'hidden'
        }
      >
        <StudentsView />
      </div>

      <div
        className={
          currentSectionKey === 'teachers'
            ? 'block'
            : 'hidden'
        }
      >
        <TeachersView />
      </div>

      <div
        className={
          currentSectionKey === 'payments'
            ? 'block'
            : 'hidden'
        }
      >
        <PaymentsView />
      </div>
    </div>
  )
}