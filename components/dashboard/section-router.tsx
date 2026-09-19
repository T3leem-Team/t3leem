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
    view: () => (
      <div className="p-10">
        <h1 className="text-2xl font-bold">
          اختبار الإشراف
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          إذا ظهر هذا النص مع السايدبار، فالمشكلة داخل
          SupervisionView.
        </p>
      </div>
    ),
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
]

export function SectionRouter() {
  const pathname = usePathname()

  const isSubPage =
    pathname.split('/').filter(Boolean).length > 1

  if (isSubPage) {
    return null
  }

  const active =
    routes.find((route) => route.match(pathname)) ??
    routes[0]

  return active.view()
}
