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
 * Authorization is granted if the permission is assigned
 * either through the user's role or directly to the user.
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
    console.error(
      'Authorization error: empty permission key.',
    )

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
    /*
     * 1. Find the permission itself.
     *
     * A missing permission means there is a configuration/
     * programming problem, not that the user is forbidden.
     */
    const {
      data: permission,
      error: permissionError,
    } = await supabaseAdmin
      .from('permissions')
      .select('id')
      .eq(
        'permission_key',
        permissionKey,
      )
      .limit(1)
      .maybeSingle()

    if (permissionError) {
      console.error(
        'Permission lookup error:',
        permissionError,
      )

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
      console.error(
        `Permission does not exist: ${permissionKey}`,
      )

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

    /*
     * 2. Check permission through the user's role.
     *
     * We use the role only as a lookup key.
     * We never special-case a role name such as "Admin".
     */
    if (access.role) {
      const {
        data: rolePermission,
        error: rolePermissionError,
      } = await supabaseAdmin
        .from('role_permissions')
        .select('permission_id')
        .eq('role', access.role)
        .eq(
          'permission_id',
          permission.id,
        )
        .limit(1)

      if (rolePermissionError) {
        console.error(
          'Role permission lookup error:',
          rolePermissionError,
        )

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

      if (
        rolePermission &&
        rolePermission.length > 0
      ) {
        return {
          access,
          error: null,
        }
      }
    }

    /*
     * 3. Check permission assigned directly to the user.
     */
    const {
      data: userPermission,
      error: userPermissionError,
    } = await supabaseAdmin
      .from('user_permissions')
      .select('permission_id')
      .eq(
        'user_profile_id',
        access.profileId,
      )
      .eq(
        'permission_id',
        permission.id,
      )
      .limit(1)

    if (userPermissionError) {
      console.error(
        'User permission lookup error:',
        userPermissionError,
      )

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

    if (
      userPermission &&
      userPermission.length > 0
    ) {
      return {
        access,
        error: null,
      }
    }

    /*
     * 4. Authentication succeeded,
     *    but authorization failed.
     */
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
    console.error(
      'Authorization error:',
      error,
    )

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
 *
 * This is separate from granular permissions such as
 * users.view, users.manage, analytics.view, etc.
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
    /*
     * The user must have a mapping in
     * user_dashboard_sections for the requested section.
     *
     * The section must also be active in dashboard_sections.
     */
    const {
      data: userSection,
      error: userSectionError,
    } = await supabaseAdmin
      .from('user_dashboard_sections')
      .select(
        `
          section_id,
          dashboard_sections!inner (
            section_key,
            is_active
          )
        `,
      )
      .eq(
        'user_profile_id',
        access.profileId,
      )
      .eq(
        'dashboard_sections.section_key',
        sectionKey,
      )
      .eq(
        'dashboard_sections.is_active',
        true,
      )
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
            error:
              'تعذر التحقق من صلاحية القسم حالياً.',
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
            error:
              'ليس لديك صلاحية للوصول إلى هذا القسم.',
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
          error:
            'تعذر التحقق من صلاحية القسم حالياً.',
          reason: 'authorization_error',
        },
        { status: 503 },
      ),
    }
  }
}