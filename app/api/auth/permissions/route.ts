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

export async function GET() {
  try {
    /*
     * ------------------------------------------------------
     * التحقق من المستخدم
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
     * المستخدم الحالي
     * ------------------------------------------------------
     */

    const {
      data: profile,
      error: profileError,
    } =
      await supabaseAdmin
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

      return NextResponse.json(
        {
          error:
            'تعذر قراءة المستخدم الحالي.',
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
     * الصلاحيات المباشرة
     * ------------------------------------------------------
     */

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

      return NextResponse.json(
        {
          error:
            'تعذر قراءة صلاحيات المستخدم.',
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
     * دمج IDs
     * ------------------------------------------------------
     */

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

    /*
     * ------------------------------------------------------
     * الصلاحيات المستخدمة في النظام
     *
     * لا نعتمد على جدول permissions
     * لمعرفة اسم الصلاحية، لأن جدول permissions
     * عندك لا يحتوي على name.
     * ------------------------------------------------------
     */

    const permissionNames: string[] = []

    const hasManageAssignments =
      permissionIds.includes(
        MANAGE_ASSIGNMENTS_PERMISSION_ID,
      )

    /*
     * ------------------------------------------------------
     * إدارة توزيع الطلاب على المعلمين
     * ------------------------------------------------------
     */

    if (
      hasManageAssignments ||
      profile.role === 'Admin'
    ) {
      permissionNames.push(
        'teachers.manage_assignments',
      )
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
        permissionNames,
        permissions: [],
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