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

type AuthorizationResult = {
  access: NonNullable<
    Awaited<
      ReturnType<typeof requireAuth>
    >['access']
  > | null

  error: NextResponse | null
}

/*
 * ==================================================
 * التحقق من صلاحية معينة
 *
 * مثال:
 *
 * requirePermission('users.view')
 * requirePermission('users.create')
 * requirePermission('users.edit')
 * requirePermission('users.delete')
 *
 * الصلاحية تعتبر موجودة إذا كانت:
 *
 * 1. مرتبطة بدور المستخدم
 *    role_permissions
 *
 * أو
 *
 * 2. مرتبطة بالمستخدم مباشرة
 *    user_permissions
 *
 * لا نعتمد على اسم الدور مثل Admin.
 * ==================================================
 */
export async function requirePermission(
  permissionKey: string,
): Promise<AuthorizationResult> {
  /*
   * --------------------------------------------------
   * أولاً:
   * التحقق من Authentication
   *
   * هذا يعيد استخدام الحماية الحالية بالكامل:
   *
   * - Supabase Auth
   * - Session
   * - Device
   * - Idle timeout
   * - Expiry
   * - Active user
   * --------------------------------------------------
   */
  const { access, response } =
    await requireAuth()

  if (response) {
    return {
      access: null,
      error: response,
    }
  }

  if (!access) {
    return {
      access: null,
      error: NextResponse.json(
        {
          authenticated: false,
          error:
            'انتهت صلاحية الوصول إلى النظام.',
        },
        { status: 401 },
      ),
    }
  }

  /*
   * --------------------------------------------------
   * التحقق من اسم الصلاحية
   * --------------------------------------------------
   */
  const normalizedPermissionKey =
    permissionKey.trim()

  if (!normalizedPermissionKey) {
    console.error(
      'requirePermission called without permission key',
    )

    return {
      access: null,
      error: NextResponse.json(
        {
          error:
            'تعذر التحقق من الصلاحية.',
        },
        { status: 500 },
      ),
    }
  }

  /*
   * --------------------------------------------------
   * البحث عن الصلاحية
   *
   * permissions.permission_key
   * --------------------------------------------------
   */
  const {
    data: permission,
    error: permissionError,
  } =
    await supabaseAdmin
      .from('permissions')
      .select('id, permission_key')
      .eq(
        'permission_key',
        normalizedPermissionKey,
      )
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
          error:
            'تعذر التحقق من الصلاحيات.',
        },
        { status: 500 },
      ),
    }
  }

  /*
   * إذا الصلاحية نفسها غير موجودة
   *
   * لا نعطي المستخدم صلاحية بالخطأ.
   */
  if (!permission) {
    console.error(
      `Permission not found: ${normalizedPermissionKey}`,
    )

    return {
      access: null,
      error: NextResponse.json(
        {
          error:
            'الصلاحية المطلوبة غير موجودة في النظام.',
        },
        { status: 500 },
      ),
    }
  }

  /*
   * --------------------------------------------------
   * التحقق من صلاحية الدور
   *
   * role_permissions
   *
   * مهم:
   *
   * نحن نستخدم role فقط لمعرفة الصلاحيات
   * المرتبطة بهذا الدور.
   *
   * لا نقول:
   *
   * role === 'Admin'
   *
   * لذلك تغيير اسم الدور لا يكسر الحماية.
   * --------------------------------------------------
   */
  const {
    data: rolePermission,
    error: rolePermissionError,
  } =
    await supabaseAdmin
      .from('role_permissions')
      .select('permission_id')
      .eq(
        'role',
        await getCurrentUserRole(
          access.profileId,
        ),
      )
      .eq(
        'permission_id',
        permission.id,
      )
      .maybeSingle()

  if (rolePermissionError) {
    console.error(
      'Role permission lookup error:',
      rolePermissionError,
    )

    return {
      access: null,
      error: NextResponse.json(
        {
          error:
            'تعذر التحقق من صلاحيات الدور.',
        },
        { status: 500 },
      ),
    }
  }

  /*
   * --------------------------------------------------
   * إذا كانت الصلاحية موجودة في الدور
   * --------------------------------------------------
   */
  if (rolePermission) {
    return {
      access,
      error: null,
    }
  }

  /*
   * --------------------------------------------------
   * التحقق من الصلاحية الفردية
   *
   * user_permissions
   * --------------------------------------------------
   */
  const {
    data: userPermission,
    error: userPermissionError,
  } =
    await supabaseAdmin
      .from('user_permissions')
      .select('permission_id')
      .eq(
        'user_profile_id',
        access.profileId!,
      )
      .eq(
        'permission_id',
        permission.id,
      )
      .maybeSingle()

  if (userPermissionError) {
    console.error(
      'User permission lookup error:',
      userPermissionError,
    )

    return {
      access: null,
      error: NextResponse.json(
        {
          error:
            'تعذر التحقق من الصلاحيات الفردية.',
        },
        { status: 500 },
      ),
    }
  }

  /*
   * --------------------------------------------------
   * إذا كانت الصلاحية فردية
   * --------------------------------------------------
   */
  if (userPermission) {
    return {
      access,
      error: null,
    }
  }

  /*
   * --------------------------------------------------
   * المستخدم مسجل دخول لكنه لا يملك الصلاحية
   *
   * 403 = Forbidden
   * --------------------------------------------------
   */
  return {
    access: null,
    error: NextResponse.json(
      {
        authenticated: true,
        authorized: false,
        error:
          'ليس لديك صلاحية لتنفيذ هذا الإجراء.',
        permission:
          normalizedPermissionKey,
      },
      { status: 403 },
    ),
  }
}

/*
 * ==================================================
 * جلب Role المستخدم الحالي
 *
 * هذا ليس فحصاً من نوع:
 *
 * role === 'Admin'
 *
 * فقط نحتاج الدور حتى نبحث في:
 *
 * role_permissions
 *
 * عن الصلاحية المرتبطة به.
 * ==================================================
 */
async function getCurrentUserRole(
  profileId: string | undefined,
) {
  if (!profileId) {
    return null
  }

  const {
    data: profile,
    error,
  } =
    await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq(
        'id',
        profileId,
      )
      .maybeSingle()

  if (error) {
    console.error(
      'Current user role lookup error:',
      error,
    )

    throw error
  }

  return profile?.role ?? null
}
