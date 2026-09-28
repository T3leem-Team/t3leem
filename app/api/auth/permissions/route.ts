import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { requireAuth } from '@/lib/require-auth'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL!

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
)

export async function GET() {
  try {
    /*
     * ------------------------------------------------------
     * التحقق من جلسة المستخدم الحالية
     * ------------------------------------------------------
     */

    const {
      access,
      response,
    } = await requireAuth()

    if (response) {
      return response
    }

    if (!access?.profileId) {
      return NextResponse.json(
        {
          authenticated: false,
          error:
            'تعذر تحديد حساب المستخدم.',
        },
        { status: 401 },
      )
    }

    /*
     * ------------------------------------------------------
     * جلب بيانات المستخدم
     * ------------------------------------------------------
     */

    const {
      data: profile,
      error: profileError,
    } =
      await supabaseAdmin
        .from('user_profiles')
        .select(
          `
          id,
          role,
          is_active
          `,
        )
        .eq(
          'id',
          access.profileId,
        )
        .maybeSingle()

    if (profileError) {
      console.error(
        'Permissions profile lookup error:',
        profileError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر قراءة صلاحيات المستخدم.',
        },
        { status: 500 },
      )
    }

    if (
      !profile ||
      !profile.is_active
    ) {
      return NextResponse.json(
        {
          authenticated: false,
          error:
            'حساب المستخدم غير نشط.',
        },
        { status: 403 },
      )
    }

    /*
     * ------------------------------------------------------
     * الصلاحيات المباشرة للمستخدم
     * ------------------------------------------------------
     */

    const {
      data: directPermissions,
      error: directPermissionsError,
    } =
      await supabaseAdmin
        .from('user_permissions')
        .select(
          'permission_id',
        )
        .eq(
          'user_profile_id',
          access.profileId,
        )

    if (directPermissionsError) {
      console.error(
        'Direct permissions lookup error:',
        directPermissionsError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر قراءة الصلاحيات المباشرة.',
        },
        { status: 500 },
      )
    }

    /*
     * ------------------------------------------------------
     * صلاحيات الدور
     * ------------------------------------------------------
     */

    const {
      data: rolePermissions,
      error: rolePermissionsError,
    } =
      await supabaseAdmin
        .from('role_permissions')
        .select(
          'permission_id',
        )
        .eq(
          'role',
          profile.role,
        )

    if (rolePermissionsError) {
      console.error(
        'Role permissions lookup error:',
        rolePermissionsError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر قراءة صلاحيات الدور.',
        },
        { status: 500 },
      )
    }

    /*
     * ------------------------------------------------------
     * دمج الصلاحيات المباشرة + صلاحيات الدور
     * ------------------------------------------------------
     */

    const permissionIds =
      Array.from(
        new Set(
          [
            ...(directPermissions ??
              []).map(
              (item) =>
                item.permission_id,
            ),
            ...(rolePermissions ??
              []).map(
              (item) =>
                item.permission_id,
            ),
          ].filter(Boolean),
        ),
      )

    /*
     * ------------------------------------------------------
     * جلب تفاصيل الصلاحيات
     * ------------------------------------------------------
     */

    let permissions: Array<{
      id: string
      name: string
      description:
        | string
        | null
    }> = []

    if (permissionIds.length > 0) {
      const {
        data: permissionRows,
        error: permissionsError,
      } =
        await supabaseAdmin
          .from('permissions')
          .select(
            `
            id,
            name,
            description
            `,
          )
          .in(
            'id',
            permissionIds,
          )

      if (permissionsError) {
        console.error(
          'Permissions lookup error:',
          permissionsError,
        )

        return NextResponse.json(
          {
            error:
              'تعذر قراءة تفاصيل الصلاحيات.',
          },
          { status: 500 },
        )
      }

      permissions =
        permissionRows ?? []
    }

    /*
     * ------------------------------------------------------
     * النتيجة
     * ------------------------------------------------------
     */

    return NextResponse.json(
      {
        authenticated: true,
        role: profile.role,
        permissionIds,
        permissionNames:
          permissions.map(
            (permission) =>
              permission.name,
          ),
        permissions,
      },
      {
        headers: {
          'Cache-Control':
            'no-store, no-cache, must-revalidate',
        },
      },
    )
  } catch (error) {
    console.error(
      'Permissions route error:',
      error,
    )

    return NextResponse.json(
      {
        error:
          'حدث خطأ أثناء قراءة صلاحيات المستخدم.',
      },
      { status: 500 },
    )
  }
}
