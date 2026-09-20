import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/require-auth'

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

export async function requirePermission(
  permissionKey: string,
) {
  const auth = await requireAuth()

  if (!auth.ok) {
    return {
      ok: false as const,
      response: auth.response,
    }
  }

  const { data: profile, error: profileError } =
    await supabaseAdmin
      .from('user_profiles')
      .select('id, auth_user_id, role, is_active')
      .eq('auth_user_id', auth.user.id)
      .maybeSingle()

  if (profileError || !profile) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: 'المستخدم غير موجود.' },
        { status: 403 },
      ),
    }
  }

  if (!profile.is_active) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: 'الحساب معطل.' },
        { status: 403 },
      ),
    }
  }

  // مدير النظام لديه صلاحيات النظام كاملة
  if (profile.role === 'Admin') {
    return {
      ok: true as const,
      user: auth.user,
      profile,
    }
  }

  const { data: permission, error: permissionError } =
    await supabaseAdmin
      .from('permissions')
      .select('id')
      .eq('permission_key', permissionKey)
      .maybeSingle()

  if (permissionError || !permission) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: 'الصلاحية المطلوبة غير موجودة.' },
        { status: 403 },
      ),
    }
  }

  const { data: userPermission, error: userPermissionError } =
    await supabaseAdmin
      .from('user_permissions')
      .select('id')
      .eq('user_profile_id', profile.id)
      .eq('permission_id', permission.id)
      .maybeSingle()

  if (
    userPermissionError ||
    !userPermission
  ) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: 'ليس لديك صلاحية لتنفيذ هذه العملية.' },
        { status: 403 },
      ),
    }
  }

  return {
    ok: true as const,
    user: auth.user,
    profile,
  }
}
