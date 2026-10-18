import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/authorization'
import { supabaseAdmin } from './users-supabase'

export async function getUsers() {
  try {
    const { error } = await requirePermission('users.view')
    if (error) return error

    const [
      usersResult,
      permissionsResult,
      userPermissionsResult,
      rolePermissionsResult,
      sectionsResult,
      userSectionsResult,
    ] = await Promise.all([
      supabaseAdmin
        .from('user_profiles')
        .select(`
          id, auth_user_id, username, email, full_name,
          role, department, is_active, created_at, updated_at
        `)
        .order('created_at', { ascending: false }),

      supabaseAdmin
        .from('permissions')
        .select('id, permission_key, permission_name, description, created_at')
        .order('permission_name', { ascending: true }),

      supabaseAdmin
        .from('user_permissions')
        .select('id, user_profile_id, permission_id, created_at'),

      supabaseAdmin
        .from('role_permissions')
        .select('role, permission_id'),

      supabaseAdmin
        .from('dashboard_sections')
        .select(`
          id, section_key, section_name, description, icon,
          href, sort_order, is_active, created_at, updated_at
        `)
        .order('sort_order', { ascending: true }),

      supabaseAdmin
        .from('user_dashboard_sections')
        .select('id, user_profile_id, section_id, created_at'),
    ])

    const results = [
      { name: 'Users', error: usersResult.error, message: 'تعذر تحميل المستخدمين.' },
      { name: 'Permissions', error: permissionsResult.error, message: 'تعذر تحميل الصلاحيات.' },
      { name: 'User permissions', error: userPermissionsResult.error, message: 'تعذر تحميل صلاحيات المستخدمين.' },
      { name: 'Role permissions', error: rolePermissionsResult.error, message: 'تعذر تحميل صلاحيات الأدوار.' },
      { name: 'Dashboard sections', error: sectionsResult.error, message: 'تعذر تحميل أقسام لوحة التحكم.' },
      { name: 'User dashboard sections', error: userSectionsResult.error, message: 'تعذر تحميل أقسام لوحة التحكم للمستخدمين.' },
    ]

    const failed = results.find((result) => result.error)

    if (failed) {
      console.error(`${failed.name} lookup error:`, failed.error)
      return NextResponse.json({ error: failed.message }, { status: 500 })
    }

    const users = usersResult.data ?? []
    const permissions = permissionsResult.data ?? []
    const userPermissions = userPermissionsResult.data ?? []
    const rolePermissions = rolePermissionsResult.data ?? []
    const dashboardSections = sectionsResult.data ?? []
    const userDashboardSections = userSectionsResult.data ?? []

    const usersWithPermissions = users.map((user) => {
      const permissionIds = Array.from(
        new Set(
          userPermissions
            .filter((item) => item.user_profile_id === user.id)
            .map((item) => item.permission_id),
        ),
      )

      const rolePermissionIds = Array.from(
        new Set(
          rolePermissions
            .filter((item) => item.role === user.role)
            .map((item) => item.permission_id),
        ),
      )

      const effectivePermissionIds = Array.from(
        new Set([...rolePermissionIds, ...permissionIds]),
      )

      const sectionIds = Array.from(
        new Set(
          userDashboardSections
            .filter((item) => item.user_profile_id === user.id)
            .map((item) => item.section_id),
        ),
      )

      return {
        ...user,
        permissionIds,
        permissions: permissions.filter((item) =>
          permissionIds.includes(item.id),
        ),
        rolePermissionIds,
        rolePermissions: permissions.filter((item) =>
          rolePermissionIds.includes(item.id),
        ),
        effectivePermissionIds,
        effectivePermissions: permissions.filter((item) =>
          effectivePermissionIds.includes(item.id),
        ),
        sectionIds,
        sections: dashboardSections.filter((item) =>
          sectionIds.includes(item.id),
        ),
      }
    })

    return NextResponse.json({
      users: usersWithPermissions,
      permissions,
      dashboardSections,
    })
  } catch (error) {
    console.error('Users GET error:', error)

    return NextResponse.json(
      { error: 'حدث خطأ أثناء تحميل المستخدمين.' },
      { status: 500 },
    )
  }
}
