'use client'

import { useState } from 'react'

import { Sidebar } from './sidebar'
import { Header } from './header'
import { SectionRouter } from './section-router'

export function DashboardShell({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">
          <SectionRouter />
          {children}
        </main>
      </div>
    </div>
  )
}

