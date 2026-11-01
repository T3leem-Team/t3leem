import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/require-auth'

import {
  loadAdminPermissionProfile,
  loadAllPermissions,
} from '@/lib/features/permissions/repositories/permissions-admin.repository'

async function requireAdmin() {
  const { access, response } =
    await requireAuth()

  if (response) {
    return {
      error: response,
    }
  }

  if (!access?.userId) {
    return {
      error: NextResponse.json(
        {
          error: 'غير مصرح بالوصول.',
        },
        { status: 401 },
      ),
    }
  }

  const { data: profile, error } =
    await loadAdminPermissionProfile(
      access.userId,
    )

  if (error) {
    console.error(
      'Admin permission profile lookup error:',
      error,
    )

    return {
      error: NextResponse.json(
        {
          error:
            'تعذر التحقق من صلاحيات المستخدم.',
        },
        { status: 500 },
      ),
    }
  }

  if (
    !profile ||
    profile.role !== 'Admin' ||
    !profile.is_active
  ) {
    return {
      error: NextResponse.json(
        {
          error:
            'ليس لديك صلاحية إدارة المستخدمين والصلاحيات.',
        },
        { status: 403 },
      ),
    }
  }

  return {
    profile,
  }
}

/*
 * GET
 * تحميل جميع الصلاحيات
 */
export async function GET() {
  try {
    const { error } =
      await requireAdmin()

    if (error) {
      return error
    }

    const {
      data: permissions,
      error: permissionsError,
    } = await loadAllPermissions()

    if (permissionsError) {
      console.error(
        'Permissions lookup error:',
        permissionsError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر تحميل الصلاحيات.',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      permissions: permissions ?? [],
    })
  } catch (error) {
    console.error(
      'Permissions GET error:',
      error,
    )

    return NextResponse.json(
      {
        error:
          'حدث خطأ أثناء تحميل الصلاحيات.',
      },
      { status: 500 },
    )
  }
}
