import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/require-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    const { access, response } = await requireAuth()

    if (response) {
      return response
    }

    if (!access?.profileId) {
      return NextResponse.json(
        {
          authenticated: false,
          error: 'تعذر تحديد حساب المستخدم.',
        },
        { status: 401 },
      )
    }

    // جلب بيانات المستخدم الحالي
    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from('user_profiles')
        .select('id, role, is_active')
        .eq('id', access.profileId)
        .maybeSingle()

    if (profileError) {
      console.error(
        'Current user profile error:',
        profileError,
      )

      return NextResponse.json(
        {
          error: 'تعذر قراءة بيانات المستخدم.',
        },
        { status: 500 },
      )
    }

    if (!profile || !profile.is_active) {
      return NextResponse.json(
        {
          authenticated: false,
          error: 'الحساب غير نشط.',
        },
        { status: 403 },
      )
    }

    // الصلاحيات المباشرة للمستخدم
    const { data: directPermissions, error: directError } =
      await supabaseAdmin
        .from('user_permissions')
        .select(
          `
            permission_id,
            permissions (
              id,
              name,
              description
            )
          `,
        )
        .eq('user_profile_id', profile.id)

    if (directError) {
      console.error(
        'Direct permissions error:',
        directError,
      )

      return NextResponse.json(
        {
          error: 'تعذر قراءة صلاحيات المستخدم.',
        },
        { status: 500 },
      )
    }

    // صلاحيات الدور
    const { data: rolePermissions, error: roleError } =
      await supabaseAdmin
        .from('role_permissions')
        .select(
          `
            permission_id,
            permissions (
              id,
              name,
              description
            )
          `,
        )
        .eq('role', profile.role)

    if (roleError) {
      console.error(
        'Role permissions error:',
        roleError,
      )

      return NextResponse.json(
        {
          error: 'تعذر قراءة صلاحيات الدور.',
        },
        { status: 500 },
      )
    }

    const permissionsMap = new Map<
      string,
      {
        id: string
        name: string
        description: string | null
      }
    >()

    const addPermissions = (
      rows: any[] | null,
    ) => {
      if (!rows) {
        return
      }

      for (const row of rows) {
        const permission = Array.isArray(
          row.permissions,
        )
          ? row.permissions[0]
          : row.permissions

        if (!permission?.id || !permission?.name) {
          continue
        }

        permissionsMap.set(
          permission.id,
          {
            id: permission.id,
            name: permission.name,
            description:
              permission.description ?? null,
          },
        )
      }
    }

    addPermissions(directPermissions)
    addPermissions(rolePermissions)

    const permissions = Array.from(
      permissionsMap.values(),
    )

    return NextResponse.json({
      authenticated: true,
      role: profile.role,
      permissionIds: permissions.map(
        (permission) => permission.id,
      ),
      permissionNames: permissions.map(
        (permission) => permission.name,
      ),
      permissions,
    })
  } catch (error) {
    console.error(
      'Current permissions API error:',
      error,
    )

    return NextResponse.json(
      {
        error: 'حدث خطأ أثناء قراءة الصلاحيات.',
      },
      { status: 500 },
    )
  }
}
