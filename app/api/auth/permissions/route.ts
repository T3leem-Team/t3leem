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

const PRIMARY_ADMIN_USERNAME = 'admin'

const MANAGE_ASSIGNMENTS_PERMISSION_ID =
  '549e42cf-2348-4750-a943-2ca4ce51177a'

const SUPERVISION_MANAGE_PERMISSION_ID =
  '172a4a69-8046-4e80-b3d3-e5be2d63bc40'

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
      'id, username, role, is_active',
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

  /*
   * صلاحيات عناصر النظام
   *
   * هذه الصلاحيات منفصلة تماماً عن
   * permissions / role_permissions.
   *
   * مدير النظام الأساسي username = admin
   * يحصل تلقائياً على جميع العناصر النشطة.
   *
   * باقي المستخدمين يحصلون فقط على العناصر
   * التي تم تعيينها لهم من صفحة التحكم بعناصر النظام.
   */
  let systemElementKeys: string[] = []

  if (
    profile.username ===
      PRIMARY_ADMIN_USERNAME &&
    profile.role === 'Admin'
  ) {
    const {
      data: elements,
      error: elementsError,
    } =
      await supabaseAdmin
        .from('system_elements')
        .select(
          'element_key',
        )
        .eq(
          'is_active',
          true,
        )

    if (elementsError) {
      console.error(
        'System elements lookup error:',
        elementsError,
      )

      return {
        access: null,
        response: NextResponse.json(
          {
            error:
              'تعذر قراءة صلاحيات عناصر النظام.',
          },
          { status: 500 },
        ),
      }
    }

    systemElementKeys =
      Array.from(
        new Set(
          (elements ?? [])
            .map(
              (element) =>
                element.element_key,
            )
            .filter(Boolean),
        ),
      )
  } else {
    const {
      data: elementRows,
      error: elementRowsError,
    } =
      await supabaseAdmin
        .from('system_element_users')
        .select(`
          element_id,
          system_elements!inner (
            element_key,
            is_active
          )
        `)
        .eq(
          'user_profile_id',
          access.profileId,
        )

    if (elementRowsError) {
      console.error(
        'User system elements lookup error:',
        elementRowsError,
      )

      return {
        access: null,
        response: NextResponse.json(
          {
            error:
              'تعذر قراءة صلاحيات عناصر النظام.',
          },
          { status: 500 },
        ),
      }
    }

    systemElementKeys =
      Array.from(
        new Set(
          (elementRows ?? [])
            .filter(
              (row) =>
                row.system_elements &&
                row.system_elements.is_active,
            )
            .map(
              (row) =>
                row.system_elements.element_key,
            )
            .filter(Boolean),
        ),
      )
  }

  return {
    access: {
      profile,
      permissionIds,
      permissionNames,
      systemElementKeys,
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

    let {
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

    /*
     * إذا لم يوجد سجل الإعدادات الأساسي،
     * ننشئه تلقائياً بالقيم الافتراضية.
     */
    if (!supervisionSettings) {
      const {
        data: createdSettings,
        error: createSettingsError,
      } =
        await supabaseAdmin
          .from('supervision_settings')
          .insert({
            id: 'default',
            allow_teacher_transfer: true,
            allow_teacher_remove: true,
          })
          .select(
            'allow_teacher_transfer, allow_teacher_remove',
          )
          .single()

      if (createSettingsError) {
        console.error(
          'Supervision settings create error:',
          createSettingsError,
        )

        return NextResponse.json(
          {
            error:
              'تعذر إنشاء إعدادات الإشراف.',
          },
          { status: 500 },
        )
      }

      supervisionSettings =
        createdSettings
    }

    return NextResponse.json(
      {
        authenticated: true,

        role:
          access.profile.role,

        permissionIds:
          access.permissionIds,

        permissionNames:
          access.permissionNames,

        /*
         * صلاحيات عناصر النظام المنفصلة.
         */
        systemElementKeys:
          access.systemElementKeys,

        permissions: [],

        allowTeacherTransfer:
          Boolean(
            supervisionSettings
              ?.allow_teacher_transfer,
          ),

        allowTeacherRemove:
          Boolean(
            supervisionSettings
              ?.allow_teacher_remove,
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
        SUPERVISION_MANAGE_PERMISSION_ID,
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

    /*
     * نتأكد من وجود سجل الإعدادات.
     * إذا لم يكن موجوداً ننشئه بالقيم الافتراضية
     * ثم نطبق التعديل المطلوب.
     */
    const {
      data: existingSettings,
      error: existingSettingsError,
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

    if (existingSettingsError) {
      console.error(
        'Supervision settings lookup error:',
        existingSettingsError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر قراءة إعدادات الإشراف الحالية.',
        },
        { status: 500 },
      )
    }

    if (!existingSettings) {
      const {
        data: createdSettings,
        error: createError,
      } =
        await supabaseAdmin
          .from('supervision_settings')
          .insert({
            id: 'default',
            allow_teacher_transfer:
              updates.allow_teacher_transfer ??
              true,
            allow_teacher_remove:
              updates.allow_teacher_remove ??
              true,
          })
          .select(
            'allow_teacher_transfer, allow_teacher_remove',
          )
          .single()

      if (createError) {
        console.error(
          'Supervision settings create error:',
          createError,
        )

        return NextResponse.json(
          {
            error:
              'تعذر إنشاء إعدادات الإشراف.',
          },
          { status: 500 },
        )
      }

      return NextResponse.json({
        success: true,

        allowTeacherTransfer:
          Boolean(
            createdSettings
              ?.allow_teacher_transfer,
          ),

        allowTeacherRemove:
          Boolean(
            createdSettings
              ?.allow_teacher_remove,
          ),
      })
    }

    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from('supervision_settings')
        .update(updates)
        .eq(
          'id',
          'default',
        )
        .select(
          'allow_teacher_transfer, allow_teacher_remove',
        )
        .single()

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