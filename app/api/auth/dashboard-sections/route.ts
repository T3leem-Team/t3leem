import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/require-auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET() {
  const startedAt = performance.now()
  let lastTimingAt = startedAt

  const markTiming = (step: string) => {
    const now = performance.now()

    console.info(
      `[DASHBOARD SECTIONS TIMING] ${step}: ${
        Math.round(now - lastTimingAt)
      }ms | total: ${Math.round(now - startedAt)}ms`,
    )

    lastTimingAt = now
  }

  // المرحلة الأولى: التحقق من المستخدم
  const { access, response } = await requireAuth()

  markTiming('requireAuth')

  if (response) {
    return response
  }

  if (!access) {
    return NextResponse.json(
      {
        error: 'غير مصرح بالوصول',
      },
      { status: 401 },
    )
  }

  // المرحلة الثانية: إنشاء عميل Supabase
  const supabase = await createSupabaseServerClient()

  markTiming('createSupabaseServerClient')

  // المرحلة الثالثة: جلب الأقسام المخصصة للمستخدم
  const {
    data: userSections,
    error: userSectionsError,
  } = await supabase
    .from('user_dashboard_sections')
    .select('section_id')
    .eq('user_profile_id', access.profileId)

  markTiming('query user_dashboard_sections')

  if (userSectionsError) {
    console.error(
      'dashboard-sections user mapping error:',
      userSectionsError,
    )

    return NextResponse.json(
      {
        error: 'تعذر تحميل صلاحيات أقسام النظام',
      },
      { status: 500 },
    )
  }

  const sectionIds = (userSections ?? []).map(
    (item) => item.section_id,
  )

  console.info(
    `[DASHBOARD SECTIONS TIMING] section count: ${sectionIds.length}`,
  )

  if (sectionIds.length === 0) {
    markTiming('no sections found')

    return NextResponse.json(
      {
        sections: [],
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )
  }

  // المرحلة الرابعة: جلب تفاصيل الأقسام المسموحة
  const {
    data: sections,
    error: sectionsError,
  } = await supabase
    .from('dashboard_sections')
    .select(
      'id, section_key, section_name, description, icon, href, sort_order, is_active',
    )
    .in('id', sectionIds)
    .eq('is_active', true)
    .order('sort_order', {
      ascending: true,
    })

  markTiming('query dashboard_sections')

  if (sectionsError) {
    console.error(
      'dashboard-sections data error:',
      sectionsError,
    )

    return NextResponse.json(
      {
        error: 'تعذر تحميل أقسام النظام',
      },
      { status: 500 },
    )
  }

  const result = NextResponse.json(
    {
      sections: sections ?? [],
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )

  markTiming('response prepared')

  return result
}
