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

/*
 * --------------------------------------------------
 * التحقق من أن المستخدم الحالي هو مدير النظام
 * --------------------------------------------------
 */
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
        `
        id,
        auth_user_id,
        username,
        email,
        full_name,
        role,
        department,
        is_active
        `,
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
    access,
  }
}

/*
 * --------------------------------------------------
 * GET
 *
 * تحميل المستخدمين + الصلاحيات الخاصة بكل مستخدم
 * --------------------------------------------------
 */
export async function GET() {
  try {
    const { error } =
      await requireAdmin()

    if (error) {
      return error
    }

    /*
     * تحميل المستخدمين
     */
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
          email,
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

    /*
     * تحميل الصلاحيات المعرفة في النظام
     */
    const {
      data: permissions,
      error: permissionsError,
    } =
      await supabaseAdmin
        .from('permissions')
        .select(
          `
          id,
          permission_key,
          permission_name,
          description,
          created_at
          `,
        )
        .order(
          'permission_name',
          {
            ascending: true,
          },
        )

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

    /*
     * تحميل ربط المستخدمين بالصلاحيات
     */
    const {
      data: userPermissions,
      error:
        userPermissionsError,
    } =
      await supabaseAdmin
        .from('user_permissions')
        .select(
          `
          id,
          user_profile_id,
          permission_id,
          created_at
          `,
        )

    if (userPermissionsError) {
      console.error(
        'User permissions lookup error:',
        userPermissionsError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر تحميل صلاحيات المستخدمين.',
        },
        { status: 500 },
      )
    }

    /*
     * تجهيز الصلاحيات داخل كل مستخدم
     */
    const usersWithPermissions =
      (users ?? []).map(
        (user) => {
          const links =
            (userPermissions ?? []).filter(
              (item) =>
                item.user_profile_id ===
                user.id,
            )

          const userPermissionIds =
            links.map(
              (item) =>
                item.permission_id,
            )

          const userPermissionDetails =
            (permissions ?? []).filter(
              (permission) =>
                userPermissionIds.includes(
                  permission.id,
                ),
            )

          return {
            ...user,

            permissionIds:
              userPermissionIds,

            permissions:
              userPermissionDetails,
          }
        },
      )

    return NextResponse.json({
      users:
        usersWithPermissions,

      permissions:
        permissions ?? [],
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
 * --------------------------------------------------
 * POST
 *
 * إنشاء مستخدم جديد
 * --------------------------------------------------
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

    const email =
      typeof body.email ===
      'string'
        ? body.email.trim().toLowerCase()
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
            (
              id: unknown,
            ): id is string =>
              typeof id ===
              'string',
          )
        : []

    /*
     * التحقق من البيانات
     */
    if (
      !username ||
      !fullName ||
      !email ||
      !password ||
      !role
    ) {
      return NextResponse.json(
        {
          error:
            'اسم المستخدم والاسم الكامل والبريد الإلكتروني وكلمة المرور والدور مطلوبة.',
        },
        { status: 400 },
      )
    }

    /*
     * التحقق من صيغة البريد الإلكتروني
     */
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email,
      )
    ) {
      return NextResponse.json(
        {
          error:
            'البريد الإلكتروني غير صالح.',
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

    if (
      password.length < 8
    ) {
      return NextResponse.json(
        {
          error:
            'كلمة المرور يجب أن تكون 8 أحرف على الأقل.',
        },
        { status: 400 },
      )
    }

    /*
     * التحقق من اسم المستخدم
     */
    const {
      data: existingProfile,
      error:
        existingProfileError,
    } =
      await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq(
          'username',
          username,
        )
        .maybeSingle()

    if (existingProfileError) {
      console.error(
        'Existing username lookup error:',
        existingProfileError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر التحقق من اسم المستخدم.',
        },
        { status: 500 },
      )
    }

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
     * التحقق من البريد الإلكتروني
     */
    const {
      data: existingEmailProfile,
      error:
        existingEmailError,
    } =
      await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq(
          'email',
          email,
        )
        .maybeSingle()

    if (existingEmailError) {
      console.error(
        'Existing email lookup error:',
        existingEmailError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر التحقق من البريد الإلكتروني.',
        },
        { status: 500 },
      )
    }

    if (existingEmailProfile) {
      return NextResponse.json(
        {
          error:
            'البريد الإلكتروني مستخدم بالفعل.',
        },
        { status: 409 },
      )
    }

    /*
     * إنشاء حساب Supabase Auth
     *
     * نستخدم البريد الحقيقي للمستخدم.
     */
    const {
      data: authData,
      error: authError,
    } =
      await supabaseAdmin.auth.admin.createUser(
        {
          email,
          password,
          email_confirm:
            true,
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
     * إنشاء user_profiles
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

          email,

          full_name:
            fullName,

          role,

          department:
            department || null,

          is_active:
            true,
        })
        .select(
          `
          id,
          auth_user_id,
          username,
          email,
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
       * تنظيف حساب Auth إذا فشل
       * إنشاء profile
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
     * التحقق من الصلاحيات المطلوبة
     */
    const uniquePermissionIds =
      Array.from(
        new Set(
          permissionIds,
        ),
      )

    if (
      uniquePermissionIds.length >
      0
    ) {
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

        /*
         * Rollback
         */
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

      /*
       * إضافة الصلاحيات
       */
      if (
        validPermissions &&
        validPermissions.length >
          0
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
            .from(
              'user_permissions',
            )
            .insert(rows)

        if (
          permissionInsertError
        ) {
          console.error(
            'User permissions insert error:',
            permissionInsertError,
          )

          /*
           * Rollback
           */
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

        user: {
          ...profile,

          permissionIds:
            uniquePermissionIds,
        },
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

/*
 * --------------------------------------------------
 * PATCH
 *
 * تعديل المستخدم + البريد + الدور + القسم +
 * الحالة + كلمة المرور + الصلاحيات
 * --------------------------------------------------
 */
export async function PATCH(
  request: Request,
) {
  try {
    const {
      access,
      error,
    } = await requireAdmin()

    if (error) {
      return error
    }

    const body =
      await request.json()

    const userId =
      typeof body.userId ===
      'string'
        ? body.userId
        : ''

    const fullName =
      typeof body.fullName ===
      'string'
        ? body.fullName.trim()
        : ''

    const email =
      typeof body.email ===
      'string'
        ? body.email.trim().toLowerCase()
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

    const isActive =
      typeof body.isActive ===
      'boolean'
        ? body.isActive
        : undefined

    const password =
      typeof body.password ===
      'string'
        ? body.password
        : ''

    const permissionIds =
      Array.isArray(
        body.permissionIds,
      )
        ? body.permissionIds.filter(
            (
              id: unknown,
            ): id is string =>
              typeof id ===
              'string',
          )
        : []

    if (!userId) {
      return NextResponse.json(
        {
          error:
            'معرف المستخدم مطلوب.',
        },
        { status: 400 },
      )
    }

    if (
      !fullName ||
      !role
    ) {
      return NextResponse.json(
        {
          error:
            'الاسم الكامل والدور مطلوبان.',
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

    if (
      password &&
      password.length < 8
    ) {
      return NextResponse.json(
        {
          error:
            'كلمة المرور يجب أن تكون 8 أحرف على الأقل.',
        },
        { status: 400 },
      )
    }

    /*
     * إذا تم إرسال البريد، نتحقق منه
     */
    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email,
      )
    ) {
      return NextResponse.json(
        {
          error:
            'البريد الإلكتروني غير صالح.',
        },
        { status: 400 },
      )
    }

    /*
     * جلب المستخدم المطلوب تعديله
     */
    const {
      data: targetUser,
      error:
        targetUserError,
    } =
      await supabaseAdmin
        .from('user_profiles')
        .select(
          `
          id,
          auth_user_id,
          username,
          email,
          full_name,
          role,
          department,
          is_active
          `,
        )
        .eq(
          'id',
          userId,
        )
        .maybeSingle()

    if (targetUserError) {
      console.error(
        'Target user lookup error:',
        targetUserError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر العثور على المستخدم.',
        },
        { status: 500 },
      )
    }

    if (!targetUser) {
      return NextResponse.json(
        {
          error:
            'المستخدم غير موجود.',
        },
        { status: 404 },
      )
    }

    /*
     * إذا كان البريد مختلفًا، نتحقق من عدم استخدامه
     * لمستخدم آخر.
     */
    if (
      email &&
      email !== targetUser.email
    ) {
      const {
        data: existingEmailProfile,
        error:
          existingEmailError,
      } =
        await supabaseAdmin
          .from('user_profiles')
          .select('id')
          .eq(
            'email',
            email,
          )
          .neq(
            'id',
            userId,
          )
          .maybeSingle()

      if (existingEmailError) {
        console.error(
          'Existing email lookup error:',
          existingEmailError,
        )

        return NextResponse.json(
          {
            error:
              'تعذر التحقق من البريد الإلكتروني.',
          },
          { status: 500 },
        )
      }

      if (existingEmailProfile) {
        return NextResponse.json(
          {
            error:
              'البريد الإلكتروني مستخدم بالفعل.',
          },
          { status: 409 },
        )
      }
    }

    /*
     * منع الأدمن من تعطيل نفسه
     */
    if (
      targetUser.auth_user_id ===
        access!.userId &&
      isActive === false
    ) {
      return NextResponse.json(
        {
          error:
            'لا يمكنك تعطيل حسابك الحالي.',
        },
        { status: 400 },
      )
    }

    /*
     * تحديث Supabase Auth
     */
    if (
      password ||
      isActive !== undefined ||
      email
    ) {
      const authUpdate: {
        password?: string
        ban_duration?: string
        email?: string
      } = {}

      if (password) {
        authUpdate.password =
          password
      }

      if (
        isActive !==
        undefined
      ) {
        authUpdate.ban_duration =
          isActive
            ? 'none'
            : '876000h'
      }

      if (
        email &&
        email !== targetUser.email
      ) {
        authUpdate.email =
          email
      }

      const {
        error:
          authUpdateError,
      } =
        await supabaseAdmin.auth.admin.updateUserById(
          targetUser.auth_user_id!,
          authUpdate,
        )

      if (authUpdateError) {
        console.error(
          'Auth update error:',
          authUpdateError,
        )

        return NextResponse.json(
          {
            error:
              'تعذر تحديث حساب الدخول.',
          },
          { status: 500 },
        )
      }
    }

    /*
     * تحديث Profile
     */
    const profileUpdate: Record<
      string,
      unknown
    > = {
      full_name:
        fullName,

      role,

      department:
        department || null,

      updated_at:
        new Date().toISOString(),
    }

    if (email) {
      profileUpdate.email =
        email
    }

    if (
      isActive !==
      undefined
    ) {
      profileUpdate.is_active =
        isActive
    }

    const {
      data: updatedProfile,
      error:
        profileUpdateError,
    } =
      await supabaseAdmin
        .from('user_profiles')
        .update(
          profileUpdate,
        )
        .eq(
          'id',
          userId,
        )
        .select(
          `
          id,
          auth_user_id,
          username,
          email,
          full_name,
          role,
          department,
          is_active,
          created_at,
          updated_at
          `,
        )
        .single()

    if (profileUpdateError) {
      console.error(
        'Profile update error:',
        profileUpdateError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر تحديث بيانات المستخدم.',
        },
        { status: 500 },
      )
    }

    /*
     * التحقق من الصلاحيات
     */
    const uniquePermissionIds =
      Array.from(
        new Set(
          permissionIds,
        ),
      )

    let validPermissionIds: string[] =
      []

    if (
      uniquePermissionIds.length >
      0
    ) {
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

        return NextResponse.json(
          {
            error:
              'تعذر التحقق من الصلاحيات.',
          },
          { status: 500 },
        )
      }

      validPermissionIds =
        (
          validPermissions ??
          []
        ).map(
          (permission) =>
            permission.id,
        )
    }

    /*
     * حذف الصلاحيات القديمة
     */
    const {
      error:
        deletePermissionsError,
    } =
      await supabaseAdmin
        .from(
          'user_permissions',
        )
        .delete()
        .eq(
          'user_profile_id',
          userId,
        )

    if (
      deletePermissionsError
    ) {
      console.error(
        'Old permissions delete error:',
        deletePermissionsError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر تحديث صلاحيات المستخدم.',
        },
        { status: 500 },
      )
    }

    /*
     * إضافة الصلاحيات الجديدة
     */
    if (
      validPermissionIds.length >
      0
    ) {
      const rows =
        validPermissionIds.map(
          (permissionId) => ({
            user_profile_id:
              userId,

            permission_id:
              permissionId,
          }),
        )

      const {
        error:
          permissionInsertError,
      } =
        await supabaseAdmin
          .from(
            'user_permissions',
          )
          .insert(rows)

      if (
        permissionInsertError
      ) {
        console.error(
          'New permissions insert error:',
          permissionInsertError,
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

    return NextResponse.json({
      success: true,

      user: {
        ...updatedProfile,

        permissionIds:
          validPermissionIds,
      },
    })
  } catch (error) {
    console.error(
      'Users PATCH error:',
      error,
    )

    return NextResponse.json(
      {
        error:
          'حدث خطأ أثناء تحديث المستخدم.',
      },
      { status: 500 },
    )
  }
}

/*
 * --------------------------------------------------
 * DELETE
 *
 * حذف المستخدم نهائيًا
 *
 * ملاحظة:
 * نمنع حذف المستخدم الحالي.
 * --------------------------------------------------
 */
export async function DELETE(
  request: Request,
) {
  try {
    const {
      access,
      error,
    } = await requireAdmin()

    if (error) {
      return error
    }

    const body =
      await request.json()

    const userId =
      typeof body.userId ===
      'string'
        ? body.userId
        : ''

    if (!userId) {
      return NextResponse.json(
        {
          error:
            'معرف المستخدم مطلوب.',
        },
        { status: 400 },
      )
    }

    /*
     * جلب المستخدم
     */
    const {
      data: targetUser,
      error:
        targetUserError,
    } =
      await supabaseAdmin
        .from('user_profiles')
        .select(
          `
          id,
          auth_user_id,
          username,
          role
          `,
        )
        .eq(
          'id',
          userId,
        )
        .maybeSingle()

    if (targetUserError) {
      console.error(
        'Delete user lookup error:',
        targetUserError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر العثور على المستخدم.',
        },
        { status: 500 },
      )
    }

    if (!targetUser) {
      return NextResponse.json(
        {
          error:
            'المستخدم غير موجود.',
        },
        { status: 404 },
      )
    }

    /*
     * منع حذف الحساب الحالي
     */
    if (
      targetUser.auth_user_id ===
      access!.userId
    ) {
      return NextResponse.json(
        {
          error:
            'لا يمكنك حذف حسابك الحالي.',
        },
        { status: 400 },
      )
    }

    /*
     * حذف الصلاحيات أولًا
     */
    const {
      error:
        permissionsDeleteError,
    } =
      await supabaseAdmin
        .from(
          'user_permissions',
        )
        .delete()
        .eq(
          'user_profile_id',
          targetUser.id,
        )

    if (
      permissionsDeleteError
    ) {
      console.error(
        'Permissions delete error:',
        permissionsDeleteError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر حذف صلاحيات المستخدم.',
        },
        { status: 500 },
      )
    }

    /*
     * حذف Profile
     */
    const {
      error:
        profileDeleteError,
    } =
      await supabaseAdmin
        .from('user_profiles')
        .delete()
        .eq(
          'id',
          targetUser.id,
        )

    if (
      profileDeleteError
    ) {
      console.error(
        'Profile delete error:',
        profileDeleteError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر حذف بيانات المستخدم.',
        },
        { status: 500 },
      )
    }

    /*
     * حذف حساب Supabase Auth
     */
    const {
      error:
        authDeleteError,
    } =
      await supabaseAdmin.auth.admin.deleteUser(
        targetUser.auth_user_id!,
      )

    if (authDeleteError) {
      console.error(
        'Auth delete error:',
        authDeleteError,
      )

      return NextResponse.json(
        {
          error:
            'تم حذف بيانات المستخدم لكن تعذر حذف حساب الدخول.',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error(
      'Users DELETE error:',
      error,
    )

    return NextResponse.json(
      {
        error:
          'حدث خطأ أثناء حذف المستخدم.',
      },
      { status: 500 },
    )
  }
}