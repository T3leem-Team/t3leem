'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'

import { Sidebar } from './sidebar'
import { Header } from './header'

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
  ]

  const isMainRoute = mainRoutes.includes(pathname)

  return (
    <div className="flex min-h-screen bg-background">
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
            <div
              dir="rtl"
              className="rounded-2xl border-2 border-green-500 bg-green-50 p-10"
            >
              <h1 className="text-3xl font-bold text-green-700">
                DashboardShell يعمل
              </h1>

              <p className="mt-4 text-green-600">
                المسار الحالي: {pathname}
              </p>

              <button
                type="button"
                onClick={() => alert('الضغط يعمل')}
                className="mt-6 rounded-xl bg-black px-6 py-3 text-white"
              >
                اختبار الضغط
              </button>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  )
}