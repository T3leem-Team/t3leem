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

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
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
    // هنا **نفس الـ JSX الموجود عندك أصلاً**
    // لا نغيره
  )
}