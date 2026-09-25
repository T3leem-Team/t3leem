'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'

import { Sidebar } from './sidebar'
import { Header } from './header'
import { SectionRouter } from './section-router'
import { ActivityTracker } from '@/components/auth/activity-tracker'

export function DashboardShell({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  const mainRoutes = [
    '/',
    '/settings',
    '/supervision',
    '/enrollment',
    '/students',
    '/teachers',
    '/payments',
    '/communication',
    '/trips',
  ]

  const isMainRoute = mainRoutes.includes(pathname)

  return (
    <div className="flex min-h-screen bg-background">
      <ActivityTracker />

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">
          {isMainRoute ? (
            <SectionRouter />
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  )
}