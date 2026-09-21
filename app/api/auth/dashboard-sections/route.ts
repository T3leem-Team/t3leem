import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/require-auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'

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
    .select('id, auth_user_id, username, full_name, role, is_active')
    .eq('auth_user_id', access.userId)
    .maybeSingle()

  const { data: userSections, error: userSectionsError } = await supabase
    .from('user_dashboard_sections')
    .select('id, user_profile_id, section_id')
    .eq(
      'user_profile_id',
      'df39e205-dcc6-4c36-b9eb-80a6b617ac98',
    )

  return NextResponse.json({
    debug: {
      authUserId: access.userId,
      profile,
      profileError,
      userSections,
      userSectionsError,
    },
  })
}