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
          if (!cancelled) {
            setSections([])
          }
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
        if (!cancelled) {
          setSections([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadSections()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-hidden="true"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-72 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:static lg:translate-x-0',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-sidebar-border px-5">
          <Link
            href="/"
            className="flex items-center gap-2.5"
            onClick={onClose}
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
              <GraduationCap className="size-5" />
            </span>

            <span className="flex flex-col leading-tight">
              <span className="text-lg font-bold tracking-tight">
                تعليم
              </span>

              <span className="text-[11px] text-sidebar-foreground/60">
                نظام إدارة المدارس
              </span>
            </span>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent lg:hidden"
            aria-label="إغلاق القائمة"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <p className="px-3 pb-2 text-[11px] font-medium text-sidebar-foreground/50">
            القائمة الرئيسية
          </p>

          {loading ? (
            <div className="space-y-2 px-3 py-2">
              <div className="h-9 animate-pulse rounded-lg bg-sidebar-accent/50" />
              <div className="h-9 animate-pulse rounded-lg bg-sidebar-accent/50" />
              <div className="h-9 animate-pulse rounded-lg bg-sidebar-accent/50" />
            </div>
          ) : (
            sections.map((section) => {
              const active = isActive(pathname, section.href)

              const Icon =
                iconMap[
                  section.icon as keyof typeof iconMap
                ] ?? LayoutDashboard

              return (
                <Link
                  key={section.id}
                  href={section.href}
                  onClick={onClose}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  )}
                >
                  <Icon className="size-[18px] shrink-0" />
                  <span>{section.section_name}</span>
                </Link>
              )
            })
          )}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent/60 p-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-sidebar-primary/20 text-sm font-semibold text-sidebar-primary-foreground">
              م أ
            </span>

            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold">مدير النظام</span>

              <span className="text-[11px] text-sidebar-foreground/60">
                admin@t3leem.sa
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}