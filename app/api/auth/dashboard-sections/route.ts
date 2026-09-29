import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/require-auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET() {
  const { access, response } =
    await requireAuth()

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

  const supabase =
    await createSupabaseServerClient()

  const {
    data: userSections,
    error: userSectionsError,
  } = await supabase
    .from('user_dashboard_sections')
    .select('section_id')
    .eq(
      'user_profile_id',
      access.profileId,
    )

  if (userSectionsError) {
    console.error(
      'dashboard-sections user mapping error:',
      userSectionsError,
    )

    return NextResponse.json(
      {
        error:
          'تعذر تحميل صلاحيات أقسام النظام',
      },
      { status: 500 },
    )
  }

  const sectionIds =
    (userSections ?? []).map(
      (item) => item.section_id,
    )

  if (sectionIds.length === 0) {
    return NextResponse.json(
      {
        sections: [],
      },
      {
        status: 200,
        headers: {
          'Cache-Control':
            'no-store',
        },
      },
    )
  }

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

  if (sectionsError) {
    console.error(
      'dashboard-sections data error:',
      sectionsError,
    )

    return NextResponse.json(
      {
        error:
          'تعذر تحميل أقسام النظام',
      },
      { status: 500 },
    )
  }

  return NextResponse.json(
    {
      sections: sections ?? [],
    },
    {
      status: 200,
      headers: {
        'Cache-Control':
          'no-store',
      },
    },
  )
}