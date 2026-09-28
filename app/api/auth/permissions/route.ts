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
     * التحقق من دخول المستخدم والجلسة
     * ------------------------------------------------------
     */

    const {
      access,
      response,
    } = await requireAuth()

    console.log(
      'PERMISSIONS AUTH DEBUG:',
      {
        access,
        responseStatus:
          response?.status ?? null,
      },
    )

    if (response) {
      return response
    }

    if (!access?.profileId) {
      console.error(
        'PERMISSIONS AUTH DEBUG: Missing profileId',
        {
          access,
        },
      )

      return NextResponse.json(
        {
          authenticated: false,
          error:
            'تعذر تحديد حساب المستخدم.',
          debug: {
            access,
          },
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

    console.log(
      'PERMISSIONS PROFILE DEBUG:',
      {
        profile,
        profileError,
        profileId:
          access.profileId,
      },
    )

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
      console.error(
        'PERMISSIONS PROFILE DEBUG: Profile missing or inactive',
        {
          profile,
          profileId:
            access.profileId,
        },
      )

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

    console.log(
      'PERMISSIONS DIRECT DEBUG:',
      {
        directRows,
        directError,
        profileId:
          access.profileId,
      },
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

    console.log(
      'PERMISSIONS ROLE DEBUG:',
      {
        role:
          profile.role,
        roleRows,
        roleError,
      },
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

    console.log(
      'PERMISSIONS IDS DEBUG:',
      {
        permissionIds,
      },
    )

    /*
     * ------------------------------------------------------
     * تفاصيل الصلاحيات
     * ------------------------------------------------------
     */

    let permissionRows: Array<{
      id: string
      name: string | null
      description:
        | string
        | null
    }> = []

    if (
      permissionIds.length > 0
    ) {
      const {
        data,
        error,
      } =
        await supabaseAdmin
          .from('permissions')
          .select(
            'id, name, description',
          )
          .in(
            'id',
            permissionIds,
          )

      console.log(
        'PERMISSIONS DETAILS DEBUG:',
        {
          data,
          error,
        },
      )

      if (error) {
        console.error(
          'Permissions lookup error:',
          error,
        )

        return NextResponse.json(
          {
            error:
              'تعذر قراءة تفاصيل الصلاحيات.',
          },
          { status: 500 },
        )
      }

      permissionRows =
        data ?? []
    }

    /*
     * ------------------------------------------------------
     * أسماء الصلاحيات
     * ------------------------------------------------------
     */

    const permissionNames =
      permissionRows
        .map(
          (permission) =>
            permission.name?.trim(),
        )
        .filter(
          (
            name,
          ): name is string =>
            Boolean(name),
        )

    /*
     * ------------------------------------------------------
     * صلاحية إدارة توزيع الطلاب
     * ------------------------------------------------------
     */

    const manageAssignmentsPermissionId =
      '549e42cf-2348-4750-a943-2ca4ce51177a'

    const hasManageAssignments =
      permissionIds.includes(
        manageAssignmentsPermissionId,
      )

    if (
      hasManageAssignments &&
      !permissionNames.includes(
        'teachers.manage_assignments',
      )
    ) {
      permissionNames.push(
        'teachers.manage_assignments',
      )
    }

    /*
     * ------------------------------------------------------
     * Admin
     * ------------------------------------------------------
     */

    if (
      profile.role === 'Admin' &&
      !permissionNames.includes(
        'teachers.manage_assignments',
      )
    ) {
      permissionNames.push(
        'teachers.manage_assignments',
      )
    }

    /*
     * ------------------------------------------------------
     * النتيجة النهائية
     * ------------------------------------------------------
     */

    const result = {
      authenticated: true,
      role: profile.role,
      permissionIds,
      permissionNames,
      permissions:
        permissionRows,
    }

    console.log(
      'PERMISSIONS FINAL DEBUG:',
      result,
    )

    return NextResponse.json(
      result,
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