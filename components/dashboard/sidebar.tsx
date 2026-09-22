'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  GraduationCap,
  X,
  LayoutDashboard,
  ShieldCheck,
  Eye,
  ClipboardList,
  Users,
  CreditCard,
  MessageCircle,
} from 'lucide-react'

import { cn } from '@/lib/utils'

type DashboardSection = {
  id: string
  section_key: string
  section_name: string
  description?: string | null
  icon?: string | null
  href: string
  sort_order: number
}

const iconMap = {
  LayoutDashboard,
  ShieldCheck,
  Eye,
  ClipboardList,
  GraduationCap,
  Users,
  CreditCard,
  MessageCircle,
} as const

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const pathname = usePathname()
  const [sections, setSections] = useState<DashboardSection[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadSections() {
      try {
        setLoading(true)

        const response = await fetch('/api/auth/dashboard-sections', {
          method: 'GET',
          cache: 'no-store',
        })

        if (!response.ok) {
          if (!cancelled) setSections([])
          return
        }

        const data = await response.json()

        if (!cancelled) {
          setSections(
            Array.isArray(data.sections)
              ? data.sections.sort(
                  (a: DashboardSection, b: DashboardSection) =>
                    a.sort_order - b.sort_order,
                )
              : [],
          )
        }
      } catch {
        if (!cancelled) setSections([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadSections()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      {/* Overlay للجوال */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden',
          open
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-72 flex-col border-l bg-background transition-transform duration-200',
          open
            ? 'translate-x-0'
            : 'translate-x-full lg:translate-x-0',
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>

            <div>
              <div className="font-semibold">تعليم</div>
              <div className="text-xs text-muted-foreground">
                إدارة المدرسة
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 hover:bg-muted lg:hidden"
            aria-label="إغلاق القائمة"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="space-y-2">
              <div className="h-10 animate-pulse rounded-lg bg-muted" />
              <div className="h-10 animate-pulse rounded-lg bg-muted" />
              <div className="h-10 animate-pulse rounded-lg bg-muted" />
            </div>
          ) : (
            <div className="space-y-1">
              {sections.map((section) => {
                const active = isActive(pathname, section.href)

                const Icon =
                  iconMap[section.icon as keyof typeof iconMap] ??
                  LayoutDashboard

                return (
                  <Link
                    key={section.id}
                    href={section.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />

                    <span>{section.section_name}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </nav>
      </aside>
    </>
  )
}