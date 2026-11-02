import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'
import { requirePermission } from '@/lib/auth/authorization'

import {
  loadPermissionProfileById,
  loadUserPermissionIds,
  loadRolePermissionIds,
  loadActiveSystemElementKeys,
  loadUserSystemElementAssignments,
  loadSupervisionSettings,
  createDefaultSupervisionSettings,
  updateSupervisionSettings,
} from '@/lib/features/permissions/repositories/permissions-admin.repository'

const PRIMARY_ADMIN_USERNAME = 'admin'

const TEACHERS_ASSIGNMENTS_PERMISSION_ID =
  '549e42cf-2348-4750-a943-2ca4ce51177a'

type SystemElement = {
  element_key: string | null
  is_active: boolean
}

type SystemElementRelation =
  | SystemElement
  | SystemElement[]
  | null

type UserSystemElementRow = {
  element_id: string
  system_elements: SystemElementRelation
}

function getActiveSystemElementKeys(
  rows: UserSystemElementRow[] | null,
) {
  const keys =
    rows?.flatMap((row) => {
      const relation = row.system_elements

      const elements = Array.isArray(relation)
        ? relation
        : relation
          ? [relation]
          : []

      return elements
        .filter(
          (element) =>
            element.is_active &&
            typeof element.element_key === 'string' &&
            element.element_key.trim().length > 0,
        )
        .map((element) => element.element_key!.trim())
    }) ?? []

  return [...new Set(keys)]
}

async function getCurrentAccess() {
  const authResult = await requireAuth()

  if (authResult.response) {
    return {
      error: authResult.response,
    }
  }

  const access = authResult.access

  if (!access?.profileId) {
    return {
      error: NextResponse.json(
        { error: 'لم يتم العثور على ملف المستخدم' },
        { status: 401 },
      ),
    }
  }

  const {
    data: profile,
    error: profileError,
  } = await loadPermissionProfileById(access.profileId)

  if (profileError || !profile) {
    return {
      error: NextResponse.json(
        { error: 'تعذر العثور على بيانات المستخدم' },
        { status: 401 },
      ),
    }
  }

  if (!profile.is_active) {
    return {
      error: NextResponse.json(
        { error: 'الحساب غير نشط' },
        { status: 403 },
      ),
    }
  }

  const {
    data: userPermissions,
    error: userPermissionsError,
  } = await loadUserPermissionIds(access.profileId)

  if (userPermissionsError) {
    return {
      error: NextResponse.json(
        { error: 'حدث خطأ أثناء جلب صلاحيات المستخدم' },
        { status: 500 },
      ),
    }
  }

  let rolePermissions: { permission_id: string }[] = []

  if (access.role) {
    const {
      data,
      error,
    } = await loadRolePermissionIds(access.role)

    if (error) {
      return {
        error: NextResponse.json(
          { error: 'حدث خطأ أثناء جلب صلاحيات الدور' },
          { status: 500 },
        ),
      }
    }

    rolePermissions = data ?? []
  }

  const permissionIds = [
    ...new Set(
      [
        ...(userPermissions ?? []).map(
          (item) => item.permission_id,
        ),
        ...rolePermissions.map(
          (item) => item.permission_id,
        ),
      ].filter(
        (id): id is string =>
          typeof id === 'string' && id.length > 0,
      ),
    ),
  ]

  const permissionNames: string[] = []

  if (
    permissionIds.includes(
      TEACHERS_ASSIGNMENTS_PERMISSION_ID,
    )
  ) {
    permissionNames.push('teachers.manage_assignments')
  }

  let systemElementKeys: string[] = []

  if (profile.username === PRIMARY_ADMIN_USERNAME) {
    const {
      data,
      error,
    } = await loadActiveSystemElementKeys()

    if (error) {
      return {
        error: NextResponse.json(
          { error: 'حدث خطأ أثناء جلب عناصر النظام' },
          { status: 500 },
        ),
      }
    }

    systemElementKeys = [
      ...new Set(
        (data ?? [])
          .map((item) => item.element_key)
          .filter(
            (key): key is string =>
              typeof key === 'string' &&
              key.trim().length > 0,
          )
          .map((key) => key.trim()),
      ),
    ]
  } else {
    const {
      data,
      error,
    } = await loadUserSystemElementAssignments(
      access.profileId,
    )

    if (error) {
      return {
        error: NextResponse.json(
          { error: 'حدث خطأ أثناء جلب عناصر المستخدم' },
          { status: 500 },
        ),
      }
    }

    systemElementKeys = getActiveSystemElementKeys(
      (data ?? []) as UserSystemElementRow[],
    )
  }

  return {
    profile,
    permissionIds,
    permissionNames,
    systemElementKeys,
  }
}

export async function GET() {
  try {
    const access = await getCurrentAccess()

    if ('error' in access) {
      return access.error
    }

    let {
      data: settings,
      error: settingsError,
    } = await loadSupervisionSettings()

    if (settingsError) {
      return NextResponse.json(
        { error: 'حدث خطأ أثناء جلب إعدادات الإشراف' },
        { status: 500 },
      )
    }

    if (!settings) {
      const result =
        await createDefaultSupervisionSettings()

      settings = result.data

      if (result.error || !settings) {
        return NextResponse.json(
          { error: 'حدث خطأ أثناء إنشاء إعدادات الإشراف' },
          { status: 500 },
        )
      }
    }

    return NextResponse.json(
      {
        authenticated: true,
        role: access.profile.role,
        permissionIds: access.permissionIds,
        permissionNames: access.permissionNames,
        systemElementKeys: access.systemElementKeys,
        permissions: [],
        allowTeacherTransfer:
          settings.allow_teacher_transfer,
        allowTeacherRemove:
          settings.allow_teacher_remove,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )
  } catch {
    return NextResponse.json(
      { error: 'حدث خطأ غير متوقع' },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const permissionCheck = await requirePermission(
      'supervision.manage',
    )

    if (permissionCheck) {
      return permissionCheck
    }

    const body = await request.json()

    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        { error: 'بيانات الطلب غير صحيحة' },
        { status: 400 },
      )
    }

    const updates: {
      allow_teacher_transfer?: boolean
      allow_teacher_remove?: boolean
    } = {}

    if (typeof body.allowTeacherTransfer === 'boolean') {
      updates.allow_teacher_transfer =
        body.allowTeacherTransfer
    }

    if (typeof body.allowTeacherRemove === 'boolean') {
      updates.allow_teacher_remove =
        body.allowTeacherRemove
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'لا توجد إعدادات صالحة للتحديث' },
        { status: 400 },
      )
    }

    const {
      data: currentSettings,
      error: settingsError,
    } = await loadSupervisionSettings()

    if (settingsError) {
      return NextResponse.json(
        { error: 'حدث خطأ أثناء جلب إعدادات الإشراف' },
        { status: 500 },
      )
    }

    let result

    if (!currentSettings) {
      result = await createDefaultSupervisionSettings(
        updates,
      )
    } else {
      result = await updateSupervisionSettings(updates)
    }

    if (result.error || !result.data) {
      return NextResponse.json(
        { error: 'حدث خطأ أثناء تحديث إعدادات الإشراف' },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      allowTeacherTransfer:
        result.data.allow_teacher_transfer,
      allowTeacherRemove:
        result.data.allow_teacher_remove,
    })
  } catch {
    return NextResponse.json(
      { error: 'حدث خطأ غير متوقع' },
      { status: 500 },
    )
  }
}
