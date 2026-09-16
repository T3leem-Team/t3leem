'use client'

import { usePathname } from 'next/navigation'

import { DashboardView } from '@/components/sections/dashboard-view'
import { StudentsView } from '@/components/sections/students-view'
import { EnrollmentView } from '@/components/sections/enrollment-view'
import { TeachersView } from '@/components/sections/teachers-view'
import { PaymentsView } from '@/components/sections/payments-view'
import { SettingsView } from '@/components/sections/settings-view'

const routes: {
  match: (p: string) => boolean
  view: () => React.ReactNode
}[] = [
  { match: (p) => p === '/', view: () => <DashboardView /> },
  { match: (p) => p.startsWith('/students'), view: () => <StudentsView /> },
  { match: (p) => p.startsWith('/enrollment'), view: () => <EnrollmentView /> },
  { match: (p) => p.startsWith('/teachers'), view: () => <TeachersView /> },
  { match: (p) => p.startsWith('/payments'), view: () => <PaymentsView /> },
  { match: (p) => p === '/settings', view: () => <SettingsView /> },
]

export function SectionRouter() {
  const pathname = usePathname()

  // Any nested route is handled by the Next.js App Router.
  const isSubPage = pathname.split('/').filter(Boolean).length > 1

  if (isSubPage) {
    return null
  }

  const active = routes.find((route) => route.match(pathname)) ?? routes[0]

  return active.view()
}

