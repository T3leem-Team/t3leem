import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { requireAuth } from '@/lib/require-auth'
import { requirePermission } from '@/lib/auth/authorization'

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

const TEACHERS_ASSIGNMENTS_PERMISSION_ID =
  '549e42cf-2348-4750-a943-2ca4ce51177a'

type SystemElement = {
  element_key: string
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
  rows: UserSystemElementRow[],
): string[] {
  const keys: string[] = []

  for (const row of rows) {
    const relation = row.system_elements

    const elements: SystemElement[] =
      Array.isArray(relation)
        ? relation
        : relation
          ? [relation]
          : []

    for (const element of elements) {
      if (
        element.is_active &&
        typeof element.element_key === 'string' &&
        element.element_key.length > 0
      ) {
        keys.push(element.element_key)
      }
    }
  }

  return Array.from(new Set(keys))
}

/**
 * تحميل صلاحيات المستخدم الحالية.
 *
 * الدور يستخدم لجلب الصلاحيات المرتبطة به،
 * ولا يُستخدم وحده لاتخاذ قرار السماح.
 */
async function getCurrentAccess() {
  const { access, response } = await requireAuth()

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
          error: 'تعذر تحديد حساب المستخدم.',
        },
        { status: 401 },
      ),
    }
  }

  /*
   * نحتاج username لمنطق system_elements
   * الخاص بالحساب الأساسي.
   */
  const {
    data: profile,
    error: profileError,
  } = await supabaseAdmin
    .from('user_profiles')
    .select('id, username, role, is_active')
    .eq('id', access.profileId)
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
          error: 'تعذر قراءة المستخدم الحالي.',
        },
        { status: 500 },
      ),
    }
  }

  if (!profile || !profile.is_active) {
    return {
      access: null,
      response: NextResponse.json(
        {
          authenticated: false,
          error: 'حساب المستخدم غير نشط.',
        },
        { status: 403 },
      ),
    }
  }

  /*
   * صلاحيات المستخدم المباشرة.
   */
  const {
    data: directRows,
    error: directError,
  } = await supabaseAdmin
    .from('user_permissions')
    .select('permission_id')
    .eq('user_profile_id', access.profileId)

  if (directError) {
    console.error(
      'Direct permissions error:',
      directError,
    )

    return {
      access: null,
      response: NextResponse.json(
        {
          error: 'تعذر قراءة صلاحيات المستخدم.',
        },
        { status: 500 },
      ),
    }
  }

  /*
   * صلاحيات الدور.
   */
  let roleRows: { permission_id: string }[] = []

  if (access.role) {
    const {
      data,
      error: roleError,
    } = await supabaseAdmin
      .from('role_permissions')
      .select('permission_id')
      .eq('role', access.role)

    if (roleError) {
      console.error(
        'Role permissions error:',
        roleError,
      )

      return {
        access: null,
        response: NextResponse.json(
          {
            error: 'تعذر قراءة صلاحيات الدور.',
          },
          { status: 500 },
        ),
      }
    }

    roleRows = data ?? []
  }

  /*
   * دمج الصلاحيات المباشرة وصلاحيات الدور.
   */
  const permissionIds = Array.from(
    new Set(
      [
        ...(directRows ?? []).map(
          (row) => row.permission_id,
        ),
        ...roleRows.map(
          (row) => row.permission_id,
        ),
      ].filter(
        (permissionId): permissionId is string =>
          typeof permissionId === 'string' &&
          permissionId.length > 0,
      ),
    ),
  )

  /*
   * أسماء الصلاحيات المستخدمة في الواجهة.
   */
  const permissionNames: string[] = []

  const hasManageAssignments = permissionIds.includes(
    TEACHERS_ASSIGNMENTS_PERMISSION_ID,
  )

  if (hasManageAssignments) {
    permissionNames.push(
      'teachers.manage_assignments',
    )
  }

  /*
   * صلاحيات عناصر النظام.
   */
  let systemElementKeys: string[] = []

  if (profile.username === PRIMARY_ADMIN_USERNAME) {
    /*
     * الحساب الأساسي يرى جميع العناصر النشطة.
     */
    const {
      data: elements,
      error: elementsError,
    } = await supabaseAdmin
      .from('system_elements')
      .select('element_key')
      .eq('is_active', true)

    if (elementsError) {
      console.error(
        'System elements lookup error:',
        elementsError,
      )

      return {
        access: null,
        response: NextResponse.json(
          {
            error: 'تعذر قراءة صلاحيات عناصر النظام.',
          },
          { status: 500 },
        ),
      }
    }

    systemElementKeys = Array.from(
      new Set(
        (elements ?? [])
          .map((element) => element.element_key)
          .filter(
            (key): key is string =>
              typeof key === 'string' &&
              key.length > 0,
          ),
      ),
    )
  } else {
    /*
     * بقية المستخدمين يحصلون على العناصر
     * النشطة المعيّنة لهم فقط.
     *
     * العلاقة قد تصل كعنصر أو كمصفوفة؛
     * لذلك نعالج الشكلين.
     */
    const {
      data: elementRows,
      error: elementRowsError,
    } = await supabaseAdmin
      .from('system_element_users')
      .select(`
        element_id,
        system_elements!inner (
          element_key,
          is_active
        )
      `)
      .eq('user_profile_id', access.profileId)

    if (elementRowsError) {
      console.error(
        'User system elements lookup error:',
        elementRowsError,
      )

      return {
        access: null,
        response: NextResponse.json(
          {
            error: 'تعذر قراءة صلاحيات عناصر النظام.',
          },
          { status: 500 },
        ),
      }
    }

    systemElementKeys = getActiveSystemElementKeys(
      (elementRows ?? []) as UserSystemElementRow[],
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

/*
 * GET
 *
 * قراءة صلاحيات المستخدم الحالية
 * + عناصر النظام
 * + إعدادات الإشراف.
 */
export async function GET() {
  try {
    const { access, response } = await getCurrentAccess()

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
    } = await supabaseAdmin
      .from('supervision_settings')
      .select(
        'allow_teacher_transfer, allow_teacher_remove',
      )
      .eq('id', 'default')
      .maybeSingle()

    if (supervisionSettingsError) {
      console.error(
        'Supervision settings error:',
        supervisionSettingsError,
      )

      return NextResponse.json(
        {
          error: 'تعذر قراءة إعدادات الإشراف.',
        },
        { status: 500 },
      )
    }

    /*
     * إذا لم يوجد سجل الإعدادات الأساسي،
     * ننشئه بالقيم الافتراضية.
     */
    if (!supervisionSettings) {
      const {
        data: createdSettings,
        error: createSettingsError,
      } = await supabaseAdmin
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
            error: 'تعذر إنشاء إعدادات الإشراف.',
          },
          { status: 500 },
        )
      }

      supervisionSettings = createdSettings
    }

    return NextResponse.json(
      {
        authenticated: true,

        role: access.profile.role,

        permissionIds: access.permissionIds,

        permissionNames: access.permissionNames,

        systemElementKeys: access.systemElementKeys,

        permissions: [],

        allowTeacherTransfer: Boolean(
          supervisionSettings?.allow_teacher_transfer,
        ),

        allowTeacherRemove: Boolean(
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

/*
 * PATCH
 *
 * تعديل إعدادات الإشراف.
 *
 * الحماية تعتمد على permission_key،
 * وليس على اسم الدور.
 */
export async function PATCH(request: Request) {
  try {
    const { error: permissionError } =
      await requirePermission('supervision.manage')

    if (permissionError) {
      return permissionError
    }

    const body: unknown = await request.json()

    if (
      typeof body !== 'object' ||
      body === null ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        {
          error: 'بيانات الطلب غير صحيحة.',
        },
        { status: 400 },
      )
    }

    const requestBody = body as Record<string, unknown>

    const updates: {
      allow_teacher_transfer?: boolean
      allow_teacher_remove?: boolean
    } = {}

    if (
      typeof requestBody.allowTeacherTransfer ===
      'boolean'
    ) {
      updates.allow_teacher_transfer =
        requestBody.allowTeacherTransfer
    }

    if (
      typeof requestBody.allowTeacherRemove ===
      'boolean'
    ) {
      updates.allow_teacher_remove =
        requestBody.allowTeacherRemove
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        {
          error: 'لا توجد إعدادات صالحة للتحديث.',
        },
        { status: 400 },
      )
    }

    /*
     * نتأكد من وجود سجل الإعدادات.
     */
    const {
      data: existingSettings,
      error: existingSettingsError,
    } = await supabaseAdmin
      .from('supervision_settings')
      .select(
        'allow_teacher_transfer, allow_teacher_remove',
      )
      .eq('id', 'default')
      .maybeSingle()

    if (existingSettingsError) {
      console.error(
        'Supervision settings lookup error:',
        existingSettingsError,
      )

      return NextResponse.json(
        {
          error: 'تعذر قراءة إعدادات الإشراف الحالية.',
        },
        { status: 500 },
      )
    }

    /*
     * إذا لم يوجد السجل، ننشئه بالقيم
     * الافتراضية مع تطبيق التعديل المطلوب.
     */
    if (!existingSettings) {
      const {
        data: createdSettings,
        error: createError,
      } = await supabaseAdmin
        .from('supervision_settings')
        .insert({
          id: 'default',

          allow_teacher_transfer:
            updates.allow_teacher_transfer ?? true,

          allow_teacher_remove:
            updates.allow_teacher_remove ?? true,
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
            error: 'تعذر إنشاء إعدادات الإشراف.',
          },
          { status: 500 },
        )
      }

      return NextResponse.json({
        success: true,

        allowTeacherTransfer: Boolean(
          createdSettings?.allow_teacher_transfer,
        ),

        allowTeacherRemove: Boolean(
          createdSettings?.allow_teacher_remove,
        ),
      })
    }

    /*
     * تحديث الإعدادات الموجودة.
     */
    const {
      data,
      error,
    } = await supabaseAdmin
      .from('supervision_settings')
      .update(updates)
      .eq('id', 'default')
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
          error: 'تعذر حفظ إعدادات الإشراف.',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,

      allowTeacherTransfer: Boolean(
        data?.allow_teacher_transfer,
      ),

      allowTeacherRemove: Boolean(
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
        error: 'حدث خطأ أثناء حفظ إعدادات الإشراف.',
      },
      { status: 500 },
    )
  }
}