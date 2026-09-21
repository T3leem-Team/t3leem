import { createClient } from '@supabase/supabase-js'

import { validateCurrentAccess } from '@/lib/auth-guard'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
)

export type DashboardSectionAccess = {
  allowed: boolean
  reason?: string
  userId?: string
  profileId?: string
}

export async function validateDashboardSection(
  sectionKey: string,
): Promise<DashboardSectionAccess> {
  const access = await validateCurrentAccess()

  if (!access.allowed || !access.userId) {
    return {
      allowed: false,
      reason: access.reason ?? 'not_authenticated',
    }
  }

  const { data: profile, error: profileError } =
    await supabaseAdmin
      .from('user_profiles')
      .select('id, is_active')
      .eq('auth_user_id', access.userId)
      .maybeSingle()

  if (
    profileError ||
    !profile ||
    !profile.is_active
  ) {
    return {
      allowed: false,
      reason: 'user_inactive',
    }
  }

  const { data: section, error: sectionError } =
    await supabaseAdmin
      .from('dashboard_sections')
      .select('id, is_active')
      .eq('section_key', sectionKey)
      .maybeSingle()

  if (
    sectionError ||
    !section ||
    !section.is_active
  ) {
    return {
      allowed: false,
      reason: 'section_not_found',
    }
  }

  const { data: permission, error: permissionError } =
    await supabaseAdmin
      .from('user_dashboard_sections')
      .select('id')
      .eq('user_profile_id', profile.id)
      .eq('section_id', section.id)
      .maybeSingle()

  if (permissionError) {
    console.error(
      'Dashboard section permission error:',
      permissionError,
    )

    return {
      allowed: false,
      reason: 'permission_check_failed',
    }
  }

  if (!permission) {
    return {
      allowed: false,
      reason: 'section_not_allowed',
    }
  }

  return {
    allowed: true,
    userId: access.userId,
    profileId: profile.id,
  }
}
