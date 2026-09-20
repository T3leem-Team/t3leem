import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/require-auth'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
)

const ALLOWED_ROLES = [
  'Admin',
  'Supervisor',
  'Teacher',
  'Payments Manager',
] as const

type AllowedRole =
  (typeof ALLOWED_ROLES)[number]

async function requireAdmin() {
  const { access, response } =
    await requireAuth()

  if (response) {
    return {
      error: response,
    }
  }

  const { data: profile, error } =
    await supabaseAdmin
      .from('user_profiles')
      .select(
        'id, auth_user_id, username, role, is_active',
      )
      .eq(
        'auth_user_id',
        access!.userId,
      )
      .maybeSingle()

  if (error) {
    console.error(
      'Admin profile lookup error:',
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
            'ليس لديك صلاحية إدارة المستخدمين.',
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
 * عرض جميع المستخدمين
 */
export async function GET() {
  try {
    const { error } =
      await requireAdmin()

    if (error) {
      return error
    }

    const {
      data: users,
      error: usersError,
    } =
      await supabaseAdmin
        .from('user_profiles')
        .select(
          `
          id,
          auth_user_id,
          username,
          full_name,
          role,
          department,
          is_active,
          created_at,
          updated_at
          `,
        )
        .order(
          'created_at',
          {
            ascending: false,
          },
        )

    if (usersError) {
      console.error(
        'Users lookup error:',
        usersError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر تحميل المستخدمين.',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      users: users ?? [],
    })
  } catch (error) {
    console.error(
      'Users GET error:',
      error,
    )

    return NextResponse.json(
      {
        error:
          'حدث خطأ أثناء تحميل المستخدمين.',
      },
      { status: 500 },
    )
  }
}

/*
 * POST
 * إنشاء مستخدم جديد
 */
export async function POST(
  request: Request,
) {
  try {
    const { error } =
      await requireAdmin()

    if (error) {
      return error
    }

    const body =
      await request.json()

    const username =
      typeof body.username ===
      'string'
        ? body.username.trim()
        : ''

    const fullName =
      typeof body.fullName ===
      'string'
        ? body.fullName.trim()
        : ''

    const password =
      typeof body.password ===
      'string'
        ? body.password
        : ''

    const role =
      typeof body.role ===
      'string'
        ? body.role
        : ''

    const department =
      typeof body.department ===
      'string'
        ? body.department.trim()
        : null

    const permissionIds =
      Array.isArray(
        body.permissionIds,
      )
        ? body.permissionIds.filter(
            (id: unknown) =>
              typeof id === 'string',
          )
        : []

    if (
      !username ||
      !fullName ||
      !password ||
      !role
    ) {
      return NextResponse.json(
        {
          error:
            'اسم المستخدم والاسم الكامل وكلمة المرور والدور مطلوبة.',
        },
        { status: 400 },
      )
    }

    if (
      !ALLOWED_ROLES.includes(
        role as AllowedRole,
      )
    ) {
      return NextResponse.json(
        {
          error:
            'الدور المحدد غير صالح.',
        },
        { status: 400 },
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          error:
            'كلمة المرور يجب أن تكون 8 أحرف على الأقل.',
        },
        { status: 400 },
      )
    }

    /*
     * منع تكرار اسم المستخدم.
     */
    const {
      data: existingProfile,
    } =
      await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq(
          'username',
          username,
        )
        .maybeSingle()

    if (existingProfile) {
      return NextResponse.json(
        {
          error:
            'اسم المستخدم مستخدم بالفعل.',
        },
        { status: 409 },
      )
    }

    /*
     * نستخدم Email داخليًا في Supabase Auth.
     * المستخدم يتعامل فقط مع username.
     */
    const email =
      `${username.toLowerCase()}@t3leem.local`

    /*
     * إنشاء حساب Auth.
     */
    const {
      data: authData,
      error: authError,
    } =
      await supabaseAdmin.auth.admin.createUser(
        {
          email,
          password,
          email_confirm: true,
        },
      )

    if (
      authError ||
      !authData.user
    ) {
      console.error(
        'Auth user creation error:',
        authError,
      )

      return NextResponse.json(
        {
          error:
            authError?.message ??
            'تعذر إنشاء حساب المستخدم.',
        },
        { status: 500 },
      )
    }

    const authUserId =
      authData.user.id

    /*
     * إنشاء user_profile.
     */
    const {
      data: profile,
      error: profileError,
    } =
      await supabaseAdmin
        .from('user_profiles')
        .insert({
          auth_user_id:
            authUserId,
          username,
          full_name:
            fullName,
          role,
          department:
            department || null,
          is_active: true,
        })
        .select(
          `
          id,
          auth_user_id,
          username,
          full_name,
          role,
          department,
          is_active,
          created_at,
          updated_at
          `,
        )
        .single()

    if (
      profileError ||
      !profile
    ) {
      console.error(
        'Profile creation error:',
        profileError,
      )

      /*
       * تنظيف حساب Auth إذا فشل إنشاء profile.
       */
      await supabaseAdmin.auth.admin.deleteUser(
        authUserId,
      )

      return NextResponse.json(
        {
          error:
            'تعذر إنشاء ملف المستخدم.',
        },
        { status: 500 },
      )
    }

    /*
     * إضافة الصلاحيات المحددة.
     */
    if (permissionIds.length > 0) {
      const uniquePermissionIds =
        Array.from(
          new Set(permissionIds),
        )

      const {
        data: validPermissions,
        error:
          permissionsError,
      } =
        await supabaseAdmin
          .from('permissions')
          .select('id')
          .in(
            'id',
            uniquePermissionIds,
          )

      if (permissionsError) {
        console.error(
          'Permission lookup error:',
          permissionsError,
        )

        await supabaseAdmin
          .from('user_profiles')
          .delete()
          .eq(
            'id',
            profile.id,
          )

        await supabaseAdmin.auth.admin.deleteUser(
          authUserId,
        )

        return NextResponse.json(
          {
            error:
              'تعذر التحقق من الصلاحيات.',
          },
          { status: 500 },
        )
      }

      if (
        validPermissions &&
        validPermissions.length > 0
      ) {
        const rows =
          validPermissions.map(
            (permission) => ({
              user_profile_id:
                profile.id,
              permission_id:
                permission.id,
            }),
          )

        const {
          error:
            permissionInsertError,
        } =
          await supabaseAdmin
            .from('user_permissions')
            .insert(rows)

        if (
          permissionInsertError
        ) {
          console.error(
            'User permissions insert error:',
            permissionInsertError,
          )

          await supabaseAdmin
            .from('user_profiles')
            .delete()
            .eq(
              'id',
              profile.id,
            )

          await supabaseAdmin.auth.admin.deleteUser(
            authUserId,
          )

          return NextResponse.json(
            {
              error:
                'تعذر حفظ صلاحيات المستخدم.',
            },
            { status: 500 },
          )
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        user: profile,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error(
      'Users POST error:',
      error,
    )

    return NextResponse.json(
      {
        error:
          'حدث خطأ أثناء إنشاء المستخدم.',
      },
      { status: 500 },
    )
  }
}
