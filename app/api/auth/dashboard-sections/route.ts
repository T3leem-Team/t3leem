import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/require-auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'

type DashboardSection = {
  id: string
  section_key: string
  section_name: string
  description: string | null
  icon: string | null
  href: string
  sort_order: number
  is_active: boolean
}

export async function GET() {
  const { access, response } = await requireAuth()

  if (response) {
    return response
  }

  if (!access) {
    return NextResponse.json(
      { error: 'غير مصرح بالوصول' },
      { status: 401 },
    )
  }

  const supabase = await createSupabaseServerClient()

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, role, is_active')
    .eq('auth_user_id', access.userId)
    .maybeSingle()

  if (profileError) {
    console.error('dashboard-sections profile error:', profileError)

    return NextResponse.json(
      { error: 'تعذر تحميل بيانات المستخدم' },
      { status: 500 },
    )
  }

  if (!profile || !profile.is_active) {
    return NextResponse.json(
      { error: 'الحساب غير نشط' },
      { status: 403 },
    )
  }

  const { data, error } = await supabase
    .from('user_dashboard_sections')
    .select(`
      section_id,
      dashboard_sections (
        id,
        section_key,
        section_name,
        description,
        icon,
        href,
        sort_order,
        is_active
      )
    `)
    .eq('user_profile_id', profile.id)

  if (error) {
    console.error('dashboard-sections query error:', error)

    return NextResponse.json(
      { error: 'تعذر تحميل صلاحيات أقسام النظام' },
      { status: 500 },
    )
  }

  const sections: DashboardSection[] = []

  for (const item of data ?? []) {
    const section = item.dashboard_sections

    if (!section) {
      continue
    }

    if (Array.isArray(section)) {
      for (const row of section) {
        if (row && row.is_active) {
          sections.push(row as DashboardSection)
        }
      }
    } else {
      if (section.is_active) {
        sections.push(section as DashboardSection)
      }
    }
  }

  sections.sort(
    (a: DashboardSection, b: DashboardSection) =>
      a.sort_order - b.sort_order,
  )

  return NextResponse.json(
    {
      sections,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}