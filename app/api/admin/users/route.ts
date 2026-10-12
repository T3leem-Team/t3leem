
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission } from '@/lib/auth/authorization'

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
 * GET
 *
 * تحميل:
 * - المستخدمين
 * - الصلاحيات
 * - صلاحيات الأدوار
 * - أقسام لوحة التحكم
 * - ربط الأقسام بالمستخدمين
 *
 * الحماية:
 * users.view
 * --------------------------------------------------
 */
export async function GET() {
  try {
    const { error } =
      await requirePermission('users.view')

    if (error) {
      return error
    }

    /*
     * --------------------------------------------------
     * تحميل البيانات بالتوازي
     * --------------------------------------------------
     */
    const [
      usersResult,
      permissionsResult,
      userPermissionsResult,
      rolePermissionsResult,
      dashboardSectionsResult,
      userDashboardSectionsResult,
    ] = await Promise.all([
      supabaseAdmin
        .from('user_profiles')
        .select(`
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
        `)
        .order('created_at', {
          ascending: false,
        }),

      supabaseAdmin
        .from('permissions')
        .select(`
          id,
          permission_key,
          permission_name,
          description,
          created_at
        `)
        .order('permission_name', {
          ascending: true,
        }),

      supabaseAdmin
        .from('user_permissions')
        .select(`
          id,
          user_profile_id,
          permission_id,
          created_at
        `),

      supabaseAdmin
        .from('role_permissions')
        .select(`
          role,
          permission_id
        `),

      supabaseAdmin
        .from('dashboard_sections')
        .select(`
          id,
          section_key,
          section_name,
          description,
          icon,
          href,
          sort_order,
          is_active,
          created_at,
          updated_at
        `)
        .order('sort_order', {
          ascending: true,
        }),

      supabaseAdmin
        .from('user_dashboard_sections')
        .select(`
          id,
          user_profile_id,
          section_id,
          created_at
        `),
    ])

    /*
     * --------------------------------------------------
     * التحقق من أخطاء الاستعلامات
     * --------------------------------------------------
     */
    if (usersResult.error) {
      console.error(
        'Users lookup error:',
        usersResult.error,
      )

      return NextResponse.json(
        {
          error: 'تعذر تحميل المستخدمين.',
        },
        { status: 500 },
      )
    }

    if (permissionsResult.error) {
      console.error(
        'Permissions lookup error:',
        permissionsResult.error,
      )

      return NextResponse.json(
        {
          error: 'تعذر تحميل الصلاحيات.',
        },
        { status: 500 },
      )
    }

    if (userPermissionsResult.error) {
      console.error(
        'User permissions lookup error:',
        userPermissionsResult.error,
      )

      return NextResponse.json(
        {
          error: 'تعذر تحميل صلاحيات المستخدمين.',
        },
        { status: 500 },
      )
    }

    if (rolePermissionsResult.error) {
      console.error(
        'Role permissions lookup error:',
        rolePermissionsResult.error,
      )

      return NextResponse.json(
        {
          error: 'تعذر تحميل صلاحيات الأدوار.',
        },
        { status: 500 },
      )
    }

    if (dashboardSectionsResult.error) {
      console.error(
        'Dashboard sections lookup error:',
        dashboardSectionsResult.error,
      )

      return NextResponse.json(
        {
          error: 'تعذر تحميل أقسام لوحة التحكم.',
        },
        { status: 500 },
      )
    }

    if (userDashboardSectionsResult.error) {
      console.error(
        'User dashboard sections lookup error:',
        userDashboardSectionsResult.error,
      )

      return NextResponse.json(
        {
          error:
            'تعذر تحميل أقسام لوحة التحكم للمستخدمين.',
        },
        { status: 500 },
      )
    }

    const users = usersResult.data ?? []
    const permissions = permissionsResult.data ?? []
    const userPermissions = userPermissionsResult.data ?? []
    const rolePermissions = rolePermissionsResult.data ?? []
    const dashboardSections = dashboardSectionsResult.data ?? []
    const userDashboardSections =
      userDashboardSectionsResult.data ?? []

    /*
     * --------------------------------------------------
     * تجهيز فهارس الصلاحيات الفردية حسب المستخدم
     * --------------------------------------------------
     */
    const userPermissionIdsByUser =
      new Map<string, Set<string>>()

    for (const item of userPermissions) {
      let permissionIds =
        userPermissionIdsByUser.get(
          item.user_profile_id,
        )

      if (!permissionIds) {
        permissionIds = new Set<string>()

        userPermissionIdsByUser.set(
          item.user_profile_id,
          permissionIds,
        )
      }

      permissionIds.add(item.permission_id)
    }

    /*
     * --------------------------------------------------
     * تجهيز فهارس صلاحيات الأدوار
     * --------------------------------------------------
     */
    const rolePermissionIdsByRole =
      new Map<string, Set<string>>()

    for (const item of rolePermissions) {
      let permissionIds =
        rolePermissionIdsByRole.get(item.role)

      if (!permissionIds) {
        permissionIds = new Set<string>()

        rolePermissionIdsByRole.set(
          item.role,
          permissionIds,
        )
      }

      permissionIds.add(item.permission_id)
    }

    /*
     * --------------------------------------------------
     * تجهيز فهارس أقسام لوحة التحكم حسب المستخدم
     * --------------------------------------------------
     */
    const userSectionIdsByUser =
      new Map<string, Set<string>>()

    for (const item of userDashboardSections) {
      let sectionIds =
        userSectionIdsByUser.get(
          item.user_profile_id,
        )

      if (!sectionIds) {
        sectionIds = new Set<string>()

        userSectionIdsByUser.set(
          item.user_profile_id,
          sectionIds,
        )
      }

      sectionIds.add(item.section_id)
    }

    /*
     * --------------------------------------------------
     * تجهيز فهرس تفاصيل الصلاحيات
     * --------------------------------------------------
     */
    const permissionsById =
      new Map(
        permissions.map((permission) => [
          permission.id,
          permission,
        ]),
      )

    /*
     * --------------------------------------------------
     * تجهيز تفاصيل صلاحيات الأدوار مرة واحدة
     * --------------------------------------------------
     */
    const rolePermissionDetailsByRole =
      new Map<string, typeof permissions>()

    for (const [role, permissionIds] of rolePermissionIdsByRole) {
      rolePermissionDetailsByRole.set(
        role,
        permissions.filter((permission) =>
          permissionIds.has(permission.id),
        ),
      )
    }

    /*
     * --------------------------------------------------
     * تجهيز فهرس تفاصيل أقسام لوحة التحكم
     * --------------------------------------------------
     */
    const sectionsById =
      new Map(
        dashboardSections.map((section) => [
          section.id,
          section,
        ]),
      )

    /*
     * --------------------------------------------------
     * تجهيز بيانات المستخدمين
     * --------------------------------------------------
     */
    const usersWithPermissions =
      users.map((user) => {
        /*
         * الصلاحيات الفردية فقط
         */
        const userPermissionIds = Array.from(
          userPermissionIdsByUser.get(user.id) ??
            new Set<string>(),
        )

        const userPermissionIdSet =
          new Set(userPermissionIds)

        const userPermissionDetails =
          userPermissionIds
            .map((id) => permissionsById.get(id))
            .filter(
              (
                permission,
              ): permission is (typeof permissions)[number] =>
                permission !== undefined,
            )

        /*
         * صلاحيات الدور
         */
        const rolePermissionIds = Array.from(
          rolePermissionIdsByRole.get(user.role) ??
            new Set<string>(),
        )

        const rolePermissionIdSet =
          new Set(rolePermissionIds)

        const rolePermissionDetails =
          rolePermissionDetailsByRole.get(user.role) ?? []

        /*
         * جميع الصلاحيات الفعلية
         */
        const effectivePermissionIds =
          Array.from(
            new Set([
              ...rolePermissionIds,
              ...userPermissionIds,
            ]),
          )

        const effectivePermissionIdSet =
          new Set(effectivePermissionIds)

        const effectivePermissionDetails =
          permissions.filter((permission) =>
            effectivePermissionIdSet.has(
              permission.id,
            ),
          )

        /*
         * أقسام لوحة التحكم
         */
        const userSectionIds = Array.from(
          userSectionIdsByUser.get(user.id) ??
            new Set<string>(),
        )

        const userSectionDetails =
          userSectionIds
            .map((id) => sectionsById.get(id))
            .filter(
              (
                section,
              ): section is (typeof dashboardSections)[number] =>
                section !== undefined,
            )

        return {
          ...user,

          permissionIds:
            userPermissionIds,

          permissions:
            userPermissionDetails,

          rolePermissionIds:
            rolePermissionIds,

          rolePermissions:
            rolePermissionDetails,

          effectivePermissionIds:
            effectivePermissionIds,

          effectivePermissions:
            effectivePermissionDetails,

          sectionIds:
            userSectionIds,

          sections:
            userSectionDetails,
        }
      })

    return NextResponse.json({
      users: usersWithPermissions,

      permissions,

      dashboardSections,
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
 *
 * الحماية:
 * users.manage
 * --------------------------------------------------
 */
export async function POST(
  request: Request,
) {
  try {
    const { error } =
      await requirePermission('users.manage')

    if (error) {
      return error
    }

    const body =
      await request.json()

    const username =
      typeof body.username === 'string'
        ? body.username.trim()
        : ''

    const fullName =
      typeof body.fullName === 'string'
        ? body.fullName.trim()
        : ''

    const email =
      typeof body.email === 'string'
        ? body.email.trim().toLowerCase()
        : ''

    const password =
      typeof body.password === 'string'
        ? body.password
        : ''

    const role =
      typeof body.role === 'string'
        ? body.role
        : ''

    const department =
      typeof body.department === 'string'
        ? body.department.trim()
        : null

    /*
     * الصلاحيات الفردية فقط
     */
    const permissionIds =
      Array.isArray(body.permissionIds)
        ? body.permissionIds.filter(
            (id: unknown): id is string =>
              typeof id === 'string',
          )
        : []

    /*
     * أقسام لوحة التحكم
     */
    const sectionIds =
      Array.isArray(body.sectionIds)
        ? body.sectionIds.filter(
            (id: unknown): id is string =>
              typeof id === 'string',
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
     * التحقق من البريد
     */
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return NextResponse.json(
        {
          error: 'البريد الإلكتروني غير صالح.',
        },
        { status: 400 },
      )
    }

    /*
     * التحقق من الدور
     */
    if (
      !ALLOWED_ROLES.includes(role as AllowedRole)
    ) {
      return NextResponse.json(
        {
          error: 'الدور المحدد غير صالح.',
        },
        { status: 400 },
      )
    }

    /*
     * التحقق من كلمة المرور
     */
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
     * التحقق من اسم المستخدم والبريد بالتوازي
     */
    const [
      existingProfileResult,
      existingEmailResult,
    ] = await Promise.all([
      supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle(),

      supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle(),
    ])

    const {
      data: existingProfile,
      error: existingProfileError,
    } = existingProfileResult

    if (existingProfileError) {
      console.error(
        'Existing username lookup error:',
        existingProfileError,
      )

      return NextResponse.json(
        {
          error: 'تعذر التحقق من اسم المستخدم.',
        },
        { status: 500 },
      )
    }

    if (existingProfile) {
      return NextResponse.json(
        {
          error: 'اسم المستخدم مستخدم بالفعل.',
        },
        { status: 409 },
      )
    }

    const {
      data: existingEmailProfile,
      error: existingEmailError,
    } = existingEmailResult

    if (existingEmailError) {
      console.error(
        'Existing email lookup error:',
        existingEmailError,
      )

      return NextResponse.json(
        {
          error: 'تعذر التحقق من البريد الإلكتروني.',
        },
        { status: 500 },
      )
    }

    if (existingEmailProfile) {
      return NextResponse.json(
        {
          error: 'البريد الإلكتروني مستخدم بالفعل.',
        },
        { status: 409 },
      )
    }

    /*
     * --------------------------------------------------
     * إنشاء حساب Supabase Auth
     * --------------------------------------------------
     */
    const {
      data: authData,
      error: authError,
    } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError || !authData.user) {
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
     * --------------------------------------------------
     * إنشاء user_profiles
     * --------------------------------------------------
     */
    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        auth_user_id: authUserId,
        username,
        email,
        full_name: fullName,
        role,
        department: department || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .select(`
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
      `)
      .single()

    if (profileError || !profile) {
      console.error(
        'Profile creation error:',
        profileError,
      )

      await supabaseAdmin.auth.admin.deleteUser(
        authUserId,
      )

      return NextResponse.json(
        {
          error: 'تعذر إنشاء ملف المستخدم.',
        },
        { status: 500 },
      )
    }

    /*
     * --------------------------------------------------
     * حفظ الصلاحيات الفردية فقط
     *
     * صلاحيات الدور لا يتم نسخها هنا.
     * المستخدم يحصل عليها تلقائيًا من role_permissions.
     * --------------------------------------------------
     */
    const uniquePermissionIds =
      Array.from(new Set(permissionIds))

    if (uniquePermissionIds.length > 0) {
      const {
        data: validPermissions,
        error: permissionsError,
      } = await supabaseAdmin
        .from('permissions')
        .select('id')
        .in('id', uniquePermissionIds)

      if (permissionsError) {
        console.error(
          'Permission lookup error:',
          permissionsError,
        )

        await supabaseAdmin
          .from('user_profiles')
          .delete()
          .eq('id', profile.id)

        await supabaseAdmin.auth.admin.deleteUser(
          authUserId,
        )

        return NextResponse.json(
          {
            error: 'تعذر التحقق من الصلاحيات.',
          },
          { status: 500 },
        )
      }

      if (
        validPermissions &&
        validPermissions.length > 0
      ) {
        const rows =
          validPermissions.map((permission) => ({
            user_profile_id: profile.id,
            permission_id: permission.id,
          }))

        const {
          error: permissionInsertError,
        } = await supabaseAdmin
          .from('user_permissions')
          .insert(rows)

        if (permissionInsertError) {
          console.error(
            'User permissions insert error:',
            permissionInsertError,
          )

          await supabaseAdmin
            .from('user_profiles')
            .delete()
            .eq('id', profile.id)

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

    /*
     * --------------------------------------------------
     * أقسام لوحة التحكم
     * --------------------------------------------------
     */
    const uniqueSectionIds =
      Array.from(new Set(sectionIds))

    let validSectionIds: string[] = []

    if (uniqueSectionIds.length > 0) {
      const {
        data: validSections,
        error: sectionsError,
      } = await supabaseAdmin
        .from('dashboard_sections')
        .select('id')
        .in('id', uniqueSectionIds)

      if (sectionsError) {
        console.error(
          'Dashboard section lookup error:',
          sectionsError,
        )

        await supabaseAdmin
          .from('user_permissions')
          .delete()
          .eq('user_profile_id', profile.id)

        await supabaseAdmin
          .from('user_profiles')
          .delete()
          .eq('id', profile.id)

        await supabaseAdmin.auth.admin.deleteUser(
          authUserId,
        )

        return NextResponse.json(
          {
            error:
              'تعذر التحقق من أقسام لوحة التحكم.',
          },
          { status: 500 },
        )
      }

      validSectionIds =
        (validSections ?? []).map(
          (section) => section.id,
        )

      if (validSectionIds.length > 0) {
        const rows =
          validSectionIds.map((sectionId) => ({
            user_profile_id: profile.id,
            section_id: sectionId,
          }))

        const {
          error: sectionInsertError,
        } = await supabaseAdmin
          .from('user_dashboard_sections')
          .insert(rows)

        if (sectionInsertError) {
          console.error(
            'User dashboard sections insert error:',
            sectionInsertError,
          )

          await supabaseAdmin
            .from('user_permissions')
            .delete()
            .eq('user_profile_id', profile.id)

          await supabaseAdmin
            .from('user_profiles')
            .delete()
            .eq('id', profile.id)

          await supabaseAdmin.auth.admin.deleteUser(
            authUserId,
          )

          return NextResponse.json(
            {
              error:
                'تعذر حفظ أقسام لوحة التحكم للمستخدم.',
            },
            { status: 500 },
          )
        }
      }
    }

    /*
     * --------------------------------------------------
     * إرجاع المستخدم الجديد
     * --------------------------------------------------
     */
    const {
      data: createdRolePermissions,
    } = await supabaseAdmin
      .from('role_permissions')
      .select('permission_id')
      .eq('role', role)

    const createdRolePermissionIds =
      Array.from(
        new Set(
          (createdRolePermissions ?? []).map(
            (item) => item.permission_id,
          ),
        ),
      )

    const createdEffectivePermissionIds =
      Array.from(
        new Set([
          ...createdRolePermissionIds,
          ...uniquePermissionIds,
        ]),
      )

    return NextResponse.json(
      {
        success: true,

        user: {
          ...profile,

          permissionIds:
            uniquePermissionIds,

          rolePermissionIds:
            createdRolePermissionIds,

          effectivePermissionIds:
            createdEffectivePermissionIds,

          sectionIds:
            validSectionIds,
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
 * تعديل المستخدم
 *
 * الحماية:
 * users.manage
 * --------------------------------------------------
 */
export async function PATCH(request: Request) {
  const totalStart = performance.now()

  const logTiming = (step: string, start: number) => {
    console.log(
      `[users PATCH] ${step}: ${Math.round(performance.now() - start)}ms`,
    )
  }

  try {
    const authStart = performance.now()

    const { access, error } =
      await requirePermission('users.manage')

    logTiming('requirePermission', authStart)

    if (error) {
      return error
    }

    const body = await request.json()

    const userId =
      typeof body.userId === 'string'
        ? body.userId
        : ''

    const fullName =
      typeof body.fullName === 'string'
        ? body.fullName.trim()
        : ''

    const email =
      typeof body.email === 'string'
        ? body.email.trim().toLowerCase()
        : ''

    const role =
      typeof body.role === 'string'
        ? body.role
        : ''

    const department =
      typeof body.department === 'string'
        ? body.department.trim()
        : null

    const isActive =
      typeof body.isActive === 'boolean'
        ? body.isActive
        : undefined

    const password =
      typeof body.password === 'string'
        ? body.password
        : ''

    const permissionIds: string[] =
      Array.isArray(body.permissionIds)
        ? body.permissionIds.filter(
            (id: unknown): id is string =>
              typeof id === 'string',
          )
        : []

    const sectionIds: string[] =
      Array.isArray(body.sectionIds)
        ? body.sectionIds.filter(
            (id: unknown): id is string =>
              typeof id === 'string',
          )
        : []

    if (!userId) {
      return NextResponse.json(
        { error: 'معرف المستخدم مطلوب.' },
        { status: 400 },
      )
    }

    if (!fullName || !role) {
      return NextResponse.json(
        { error: 'الاسم الكامل والدور مطلوبان.' },
        { status: 400 },
      )
    }

    if (!ALLOWED_ROLES.includes(role as AllowedRole)) {
      return NextResponse.json(
        { error: 'الدور المحدد غير صالح.' },
        { status: 400 },
      )
    }

    if (password && password.length < 8) {
      return NextResponse.json(
        {
          error:
            'كلمة المرور يجب أن تكون 8 أحرف على الأقل.',
        },
        { status: 400 },
      )
    }

    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني غير صالح.' },
        { status: 400 },
      )
    }

    /*
     * جلب المستخدم
     */
    const targetStart = performance.now()

    const {
      data: targetUser,
      error: targetUserError,
    } = await supabaseAdmin
      .from('user_profiles')
      .select(`
        id,
        auth_user_id,
        username,
        email,
        full_name,
        role,
        department,
        is_active
      `)
      .eq('id', userId)
      .maybeSingle()

    logTiming('target user lookup', targetStart)

    if (targetUserError) {
      console.error(
        'Target user lookup error:',
        targetUserError,
      )

      return NextResponse.json(
        { error: 'تعذر العثور على المستخدم.' },
        { status: 500 },
      )
    }

    if (!targetUser) {
      return NextResponse.json(
        { error: 'المستخدم غير موجود.' },
        { status: 404 },
      )
    }

    /*
     * منع المستخدم من تعطيل نفسه
     */
    if (
      targetUser.auth_user_id === access!.userId &&
      isActive === false
    ) {
      return NextResponse.json(
        { error: 'لا يمكنك تعطيل حسابك الحالي.' },
        { status: 400 },
      )
    }

    /*
     * تجهيز القوائم الفريدة
     */
    const uniquePermissionIds =
      Array.from(new Set(permissionIds))

    const uniqueSectionIds =
      Array.from(new Set(sectionIds))

    const emailChanged =
      Boolean(email) && email !== targetUser.email

    /*
     * التحقق من البريد والصلاحيات والأقسام بالتوازي.
     * لا تحدث أي بيانات قبل اكتمال هذه الفحوصات.
     */
    const validationStart = performance.now()

    const [
      emailResult,
      permissionsResult,
      sectionsResult,
    ] = await Promise.all([
      emailChanged
        ? supabaseAdmin
            .from('user_profiles')
            .select('id')
            .eq('email', email)
            .neq('id', userId)
            .maybeSingle()
        : Promise.resolve({
            data: null,
            error: null,
          }),

      uniquePermissionIds.length > 0
        ? supabaseAdmin
            .from('permissions')
            .select('id')
            .in('id', uniquePermissionIds)
        : Promise.resolve({
            data: [],
            error: null,
          }),

      uniqueSectionIds.length > 0
        ? supabaseAdmin
            .from('dashboard_sections')
            .select('id')
            .in('id', uniqueSectionIds)
        : Promise.resolve({
            data: [],
            error: null,
          }),
    ])

    logTiming('parallel validation queries', validationStart)

    if (emailResult.error) {
      console.error(
        'Existing email lookup error:',
        emailResult.error,
      )

      return NextResponse.json(
        { error: 'تعذر التحقق من البريد الإلكتروني.' },
        { status: 500 },
      )
    }

    if (emailResult.data) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني مستخدم بالفعل.' },
        { status: 409 },
      )
    }

    if (permissionsResult.error) {
      console.error(
        'Permission lookup error:',
        permissionsResult.error,
      )

      return NextResponse.json(
        { error: 'تعذر التحقق من الصلاحيات.' },
        { status: 500 },
      )
    }

    if (sectionsResult.error) {
      console.error(
        'Dashboard section lookup error:',
        sectionsResult.error,
      )

      return NextResponse.json(
        { error: 'تعذر التحقق من أقسام لوحة التحكم.' },
        { status: 500 },
      )
    }

    const validPermissionIds =
      (permissionsResult.data ?? []).map(
        (permission) => permission.id,
      )

    const validSectionIds =
      (sectionsResult.data ?? []).map(
        (section) => section.id,
      )

    /*
     * تحديث Supabase Auth عند الحاجة
     */
    const authUpdate: {
      password?: string
      ban_duration?: string
      email?: string
    } = {}

    if (password) {
      authUpdate.password = password
    }

    if (isActive !== undefined) {
      authUpdate.ban_duration =
        isActive ? 'none' : '876000h'
    }

    if (emailChanged) {
      authUpdate.email = email
    }

    if (Object.keys(authUpdate).length > 0) {
      const authUpdateStart = performance.now()

      const {
        error: authUpdateError,
      } = await supabaseAdmin.auth.admin.updateUserById(
        targetUser.auth_user_id!,
        authUpdate,
      )

      logTiming('Supabase Auth update', authUpdateStart)

      if (authUpdateError) {
        console.error(
          'Auth update error:',
          authUpdateError,
        )

        return NextResponse.json(
          { error: 'تعذر تحديث حساب الدخول.' },
          { status: 500 },
        )
      }
    }

    /*
     * تحديث الملف الشخصي
     */
    const profileUpdate: Record<string, unknown> = {
      full_name: fullName,
      role,
      department: department || null,
      updated_at: new Date().toISOString(),
    }

    if (email) {
      profileUpdate.email = email
    }

    if (isActive !== undefined) {
      profileUpdate.is_active = isActive
    }

    const profileStart = performance.now()

    const {
      data: updatedProfile,
      error: profileUpdateError,
    } = await supabaseAdmin
      .from('user_profiles')
      .update(profileUpdate)
      .eq('id', userId)
      .select(`
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
      `)
      .single()

    logTiming('profile update', profileStart)

    if (profileUpdateError) {
      console.error(
        'Profile update error:',
        profileUpdateError,
      )

      return NextResponse.json(
        { error: 'تعذر تحديث بيانات المستخدم.' },
        { status: 500 },
      )
    }

    /*
     * حذف الصلاحيات والأقسام القديمة بالتوازي.
     */
    const deleteRelationsStart = performance.now()

    const [
      deletePermissionsResult,
      deleteSectionsResult,
    ] = await Promise.all([
      supabaseAdmin
        .from('user_permissions')
        .delete()
        .eq('user_profile_id', userId),

      supabaseAdmin
        .from('user_dashboard_sections')
        .delete()
        .eq('user_profile_id', userId),
    ])

    logTiming('delete old relations', deleteRelationsStart)

    if (deletePermissionsResult.error) {
      console.error(
        'Old permissions delete error:',
        deletePermissionsResult.error,
      )

      return NextResponse.json(
        { error: 'تعذر تحديث صلاحيات المستخدم.' },
        { status: 500 },
      )
    }

    if (deleteSectionsResult.error) {
      console.error(
        'Old dashboard sections delete error:',
        deleteSectionsResult.error,
      )

      return NextResponse.json(
        {
          error:
            'تعذر تحديث أقسام لوحة التحكم للمستخدم.',
        },
        { status: 500 },
      )
    }

    /*
     * إضافة الصلاحيات والأقسام الجديدة بالتوازي.
     * لا ننفذ insert إذا كانت القائمة فارغة.
     */
    const insertRelationsStart = performance.now()

    const [
      insertPermissionsResult,
      insertSectionsResult,
      rolePermissionsResult,
    ] = await Promise.all([
      validPermissionIds.length > 0
        ? supabaseAdmin
            .from('user_permissions')
            .insert(
              validPermissionIds.map((permissionId) => ({
                user_profile_id: userId,
                permission_id: permissionId,
              })),
            )
        : Promise.resolve({ error: null }),

      validSectionIds.length > 0
        ? supabaseAdmin
            .from('user_dashboard_sections')
            .insert(
              validSectionIds.map((sectionId) => ({
                user_profile_id: userId,
                section_id: sectionId,
              })),
            )
        : Promise.resolve({ error: null }),

      supabaseAdmin
        .from('role_permissions')
        .select('permission_id')
        .eq('role', role),
    ])

    logTiming('insert relations and role permissions', insertRelationsStart)

    if (insertPermissionsResult.error) {
      console.error(
        'New permissions insert error:',
        insertPermissionsResult.error,
      )

      return NextResponse.json(
        { error: 'تعذر حفظ صلاحيات المستخدم.' },
        { status: 500 },
      )
    }

    if (insertSectionsResult.error) {
      console.error(
        'New dashboard sections insert error:',
        insertSectionsResult.error,
      )

      return NextResponse.json(
        {
          error:
            'تعذر حفظ أقسام لوحة التحكم للمستخدم.',
        },
        { status: 500 },
      )
    }

    if (rolePermissionsResult.error) {
      console.error(
        'Role permissions lookup error:',
        rolePermissionsResult.error,
      )

      return NextResponse.json(
        { error: 'تعذر تحميل صلاحيات الدور.' },
        { status: 500 },
      )
    }

    const updatedRolePermissionIds =
      Array.from(
        new Set(
          (rolePermissionsResult.data ?? []).map(
            (item) => item.permission_id,
          ),
        ),
      )

    const updatedEffectivePermissionIds =
      Array.from(
        new Set([
          ...updatedRolePermissionIds,
          ...validPermissionIds,
        ]),
      )

    logTiming('TOTAL', totalStart)

    return NextResponse.json({
      success: true,

      user: {
        ...updatedProfile,

        permissionIds: validPermissionIds,

        rolePermissionIds:
          updatedRolePermissionIds,

        effectivePermissionIds:
          updatedEffectivePermissionIds,

        sectionIds: validSectionIds,
      },
    })
  } catch (error) {
    console.error('Users PATCH error:', error)

    logTiming('TOTAL before error response', totalStart)

    return NextResponse.json(
      {
        error:
          'حدث خطأ أثناء تحديث المستخدم.',
      },
      { status: 500 },
    )
  }
}
