
import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/authorization'

import {
  loadAllUsers,
  loadAllPermissions,
  loadAllUserPermissions,
  loadAllRolePermissions,
  loadAllDashboardSections,
  loadAllUserDashboardSections,
} from '@/lib/features/users/repositories/users-admin.repository'

export async function getUsers() {
  try {
    const permissionCheck = await requirePermission('users.view')

    if (permissionCheck.error) {
      return permissionCheck.error
    }

    const [
      usersResult,
      permissionsResult,
      userPermissionsResult,
      rolePermissionsResult,
      sectionsResult,
      userSectionsResult,
    ] = await Promise.all([
      loadAllUsers(),
      loadAllPermissions(),
      loadAllUserPermissions(),
      loadAllRolePermissions(),
      loadAllDashboardSections(),
      loadAllUserDashboardSections(),
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

      return NextResponse.json(
        { error: failed.message },
        { status: 500 },
      )
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
