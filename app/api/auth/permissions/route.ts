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

const MANAGE_ASSIGNMENTS_PERMISSION_ID =
  '549e42cf-2348-4750-a943-2ca4ce51177a'

async function getCurrentAccess() {
  const {
    access,
    response,
  } = await requireAuth()

  if (response) {
    return {
      access: null,
      response,
    }
  }

  if (!access?.profileId) {
    return {
      access: null,
      response: NextResponse.json(
        {
          authenticated: false,
          error:
            'تعذر تحديد حساب المستخدم.',
        },
        { status: 401 },
      ),
    }
  }

  const {
    data: profile,
    error: profileError,
  } = await supabaseAdmin
    .from('user_profiles')
    .select(
      'id, role, is_active',
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

    return {
      access: null,
      response: NextResponse.json(
        {
          error:
            'تعذر قراءة المستخدم الحالي.',
        },
        { status: 500 },
      ),
    }
  }

  if (
    !profile ||
    !profile.is_active
  ) {
    return {
      access: null,
      response: NextResponse.json(
        {
          authenticated: false,
          error:
            'حساب المستخدم غير نشط.',
        },
        { status: 403 },
      ),
    }
  }

  const {
    data: directRows,
    error: directError,
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

  if (directError) {
    console.error(
      'Direct permissions error:',
      directError,
    )

    return {
      access: null,
      response: NextResponse.json(
        {
          error:
            'تعذر قراءة صلاحيات المستخدم.',
        },
        { status: 500 },
      ),
    }
  }

  const {
    data: roleRows,
    error: roleError,
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

  if (roleError) {
    console.error(
      'Role permissions error:',
      roleError,
    )

    return {
      access: null,
      response: NextResponse.json(
        {
          error:
            'تعذر قراءة صلاحيات الدور.',
        },
        { status: 500 },
      ),
    }
  }

  const permissionIds =
    Array.from(
      new Set(
        [
          ...(directRows ?? []).map(
            (row) =>
              row.permission_id,
          ),
          ...(roleRows ?? []).map(
            (row) =>
              row.permission_id,
          ),
        ].filter(Boolean),
      ),
    )

  const permissionNames: string[] = []

  const hasManageAssignments =
    permissionIds.includes(
      MANAGE_ASSIGNMENTS_PERMISSION_ID,
    )

  if (
    hasManageAssignments ||
    profile.role === 'Admin'
  ) {
    permissionNames.push(
      'teachers.manage_assignments',
    )
  }

  return {
    access: {
      profile,
      permissionIds,
      permissionNames,
    },
    response: null,
  }
}

export async function GET() {
  try {
    const {
      access,
      response,
    } = await getCurrentAccess()

    if (response) {
      return response
    }

    if (!access) {
      return NextResponse.json(
        {
          authenticated: false,
        },
        { status: 401 },
      )
    }

    const {
      data: supervisionSettings,
      error: supervisionSettingsError,
    } =
      await supabaseAdmin
        .from('supervision_settings')
        .select(
          'allow_teacher_transfer, allow_teacher_remove',
        )
        .eq(
          'id',
          'default',
        )
        .maybeSingle()

    if (supervisionSettingsError) {
      console.error(
        'Supervision settings error:',
        supervisionSettingsError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر قراءة إعدادات الإشراف.',
        },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        authenticated: true,
        role: access.profile.role,
        permissionIds:
          access.permissionIds,
        permissionNames:
          access.permissionNames,
        permissions: [],

        allowTeacherTransfer:
          Boolean(
            supervisionSettings?.allow_teacher_transfer,
          ),

        allowTeacherRemove:
          Boolean(
            supervisionSettings?.allow_teacher_remove,
          ),
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
      'Permissions GET error:',
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

export async function PATCH(
  request: Request,
) {
  try {
    const {
      access,
      response,
    } = await getCurrentAccess()

    if (response) {
      return response
    }

    if (!access) {
      return NextResponse.json(
        {
          authenticated: false,
        },
        { status: 401 },
      )
    }

    const canManageSupervision =
      access.profile.role === 'Admin' ||
      access.permissionIds.includes(
        'SUPERVISION_MANAGE_PERMISSION_ID',
      )

    if (!canManageSupervision) {
      return NextResponse.json(
        {
          error:
            'ليس لديك صلاحية إدارة إعدادات الإشراف.',
        },
        { status: 403 },
      )
    }

    const body =
      await request.json()

    const updates: {
      allow_teacher_transfer?: boolean
      allow_teacher_remove?: boolean
    } = {}

    if (
      typeof body.allowTeacherTransfer ===
      'boolean'
    ) {
      updates.allow_teacher_transfer =
        body.allowTeacherTransfer
    }

    if (
      typeof body.allowTeacherRemove ===
      'boolean'
    ) {
      updates.allow_teacher_remove =
        body.allowTeacherRemove
    }

    if (
      Object.keys(updates).length === 0
    ) {
      return NextResponse.json(
        {
          error:
            'لا توجد إعدادات صالحة للتحديث.',
        },
        { status: 400 },
      )
    }

    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from('supervision_settings')
        .update(updates)
        .eq('id', 'default')
        .select(
          'allow_teacher_transfer, allow_teacher_remove',
        )
        .maybeSingle()

    if (error) {
      console.error(
        'Supervision settings update error:',
        error,
      )

      return NextResponse.json(
        {
          error:
            'تعذر حفظ إعدادات الإشراف.',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      allowTeacherTransfer:
        Boolean(
          data?.allow_teacher_transfer,
        ),
      allowTeacherRemove:
        Boolean(
          data?.allow_teacher_remove,
        ),
    })
  } catch (error) {
    console.error(
      'Permissions PATCH error:',
      error,
    )

    return NextResponse.json(
      {
        error:
          'حدث خطأ أثناء حفظ إعدادات الإشراف.',
      },
      { status: 500 },
    )
  }
}