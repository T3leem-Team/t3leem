
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

type AuthorizationAccess = {
  allowed: true
  userId: string
  sessionId: string
  deviceId: string
  profileId: string
  role?: string
}

type AuthorizationResult = {
  access: AuthorizationAccess | null
  error: NextResponse | null
}

/**
 * Checks whether the currently authenticated user
 * has a specific permission.
 *
 * Permission checks are performed by one database RPC.
 * A permission can be assigned through the user's role
 * or directly to the user.
 */
export async function requirePermission(
  permissionKey: string,
): Promise<AuthorizationResult> {
  const auth = await requireAuth()

  if (auth.response) {
    return {
      access: null,
      error: auth.response,
    }
  }

  if (!auth.access) {
    return {
      access: null,
      error: NextResponse.json(
        {
          authorized: false,
          error: 'تعذر التحقق من صلاحيات الوصول.',
          reason: 'authorization_error',
        },
        { status: 503 },
      ),
    }
  }

  const access = auth.access as AuthorizationAccess

  if (!permissionKey.trim()) {
    console.error('Authorization error: empty permission key.')

    return {
      access: null,
      error: NextResponse.json(
        {
          authorized: false,
          error: 'تعذر التحقق من صلاحيات الوصول.',
          reason: 'invalid_permission',
        },
        { status: 500 },
      ),
    }
  }

  try {
    const { data: hasPermission, error } =
      await supabaseAdmin.rpc('check_user_permission', {
        p_profile_id: access.profileId,
        p_role: access.role ?? '',
        p_permission_key: permissionKey,
      })

    if (error) {
      console.error('Permission lookup error:', error)

      return {
        access: null,
        error: NextResponse.json(
          {
            authorized: false,
            error: 'تعذر التحقق من الصلاحيات حالياً.',
            reason: 'authorization_error',
          },
          { status: 503 },
        ),
      }
    }

    if (hasPermission === true) {
      return {
        access,
        error: null,
      }
    }

    // Distinguish a missing permission configuration
    // from a valid permission that the user does not have.
    const { data: permission, error: permissionError } =
      await supabaseAdmin
        .from('permissions')
        .select('id')
        .eq('permission_key', permissionKey)
        .limit(1)
        .maybeSingle()

    if (permissionError) {
      console.error('Permission configuration lookup error:', permissionError)

      return {
        access: null,
        error: NextResponse.json(
          {
            authorized: false,
            error: 'تعذر التحقق من الصلاحيات حالياً.',
            reason: 'authorization_error',
          },
          { status: 503 },
        ),
      }
    }

    if (!permission) {
      console.error(`Permission does not exist: ${permissionKey}`)

      return {
        access: null,
        error: NextResponse.json(
          {
            authorized: false,
            error: 'الصلاحية المطلوبة غير معرفة في النظام.',
            reason: 'permission_not_configured',
          },
          { status: 500 },
        ),
      }
    }

    return {
      access: null,
      error: NextResponse.json(
        {
          authorized: false,
          error: 'ليس لديك صلاحية لتنفيذ هذا الإجراء.',
          reason: 'forbidden',
        },
        { status: 403 },
      ),
    }
  } catch (error) {
    console.error('Authorization error:', error)

    return {
      access: null,
      error: NextResponse.json(
        {
          authorized: false,
          error: 'تعذر التحقق من الصلاحيات حالياً.',
          reason: 'authorization_error',
        },
        { status: 503 },
      ),
    }
  }
}

/**
 * Checks whether the currently authenticated user
 * is allowed to access a specific main dashboard section.
 *
 * Dashboard section access is managed through:
 * user_dashboard_sections
 * -> dashboard_sections
 */
export async function requireDashboardSection(
  sectionKey: string,
): Promise<AuthorizationResult> {
  const auth = await requireAuth()

  if (auth.response) {
    return {
      access: null,
      error: auth.response,
    }
  }

  if (!auth.access) {
    return {
      access: null,
      error: NextResponse.json(
        {
          authorized: false,
          error: 'تعذر التحقق من صلاحيات الوصول.',
          reason: 'authorization_error',
        },
        { status: 503 },
      ),
    }
  }

  const access = auth.access as AuthorizationAccess

  if (!sectionKey.trim()) {
    console.error(
      'Dashboard section authorization error: empty section key.',
    )

    return {
      access: null,
      error: NextResponse.json(
        {
          authorized: false,
          error: 'قسم الوصول غير محدد.',
          reason: 'invalid_section',
        },
        { status: 500 },
      ),
    }
  }

  try {
    const {
      data: userSection,
      error: userSectionError,
    } = await supabaseAdmin
      .from('user_dashboard_sections')
      .select(`
        section_id,
        dashboard_sections!inner (
          section_key,
          is_active
        )
      `)
      .eq('user_profile_id', access.profileId)
      .eq('dashboard_sections.section_key', sectionKey)
      .eq('dashboard_sections.is_active', true)
      .limit(1)
      .maybeSingle()

    if (userSectionError) {
      console.error(
        'Dashboard section authorization lookup error:',
        userSectionError,
      )

      return {
        access: null,
        error: NextResponse.json(
          {
            authorized: false,
            error: 'تعذر التحقق من صلاحية القسم حالياً.',
            reason: 'authorization_error',
          },
          { status: 503 },
        ),
      }
    }

    if (!userSection) {
      return {
        access: null,
        error: NextResponse.json(
          {
            authorized: false,
            error: 'ليس لديك صلاحية للوصول إلى هذا القسم.',
            reason: 'forbidden',
          },
          { status: 403 },
        ),
      }
    }

    return {
      access,
      error: null,
    }
  } catch (error) {
    console.error(
      'Dashboard section authorization error:',
      error,
    )

    return {
      access: null,
      error: NextResponse.json(
        {
          authorized: false,
          error: 'تعذر التحقق من صلاحية القسم حالياً.',
          reason: 'authorization_error',
        },
        { status: 503 },
      ),
    }
  }
}
