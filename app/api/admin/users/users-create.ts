
import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/authorization'
import { supabaseAdmin } from './users-supabase'
import {
  isAllowedRole,
  isValidEmail,
  readString,
  readStringArray,
  uniqueStrings,
} from './users-validation'

export async function createUser(request: Request) {
  let authUserId: string | null = null
  let profileId: string | null = null

  try {
    const { error } = await requirePermission('users.manage')
    if (error) return error

    let body: Record<string, unknown>

    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'بيانات الطلب غير صالحة.' },
        { status: 400 },
      )
    }

    const username = readString(body.username)
    const fullName = readString(body.fullName)
    const emailValue = readString(body.email)
    const email = emailValue?.toLowerCase() ?? null
    const password = readString(body.password, false)
    const role = readString(body.role)
    const department = readString(body.department) || null

    const permissionIds = uniqueStrings(
      readStringArray(body.permissionIds) ?? [],
    )

    const sectionIds = uniqueStrings(
      readStringArray(body.sectionIds) ?? [],
    )

    if (!username || !fullName || !email || !password || !role) {
      return NextResponse.json(
        {
          error:
            'اسم المستخدم والاسم الكامل والبريد الإلكتروني وكلمة المرور والدور مطلوبة.',
        },
        { status: 400 },
      )
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني غير صالح.' },
        { status: 400 },
      )
    }

    if (!isAllowedRole(role)) {
      return NextResponse.json(
        { error: 'الدور المحدد غير صالح.' },
        { status: 400 },
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.' },
        { status: 400 },
      )
    }

    const {
      data: existingUsername,
      error: usernameError,
    } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle()

    if (usernameError) {
      console.error('Existing username lookup error:', usernameError)

      return NextResponse.json(
        { error: 'تعذر التحقق من اسم المستخدم.' },
        { status: 500 },
      )
    }

    if (existingUsername) {
      return NextResponse.json(
        { error: 'اسم المستخدم مستخدم بالفعل.' },
        { status: 409 },
      )
    }

    const {
      data: existingEmail,
      error: emailError,
    } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (emailError) {
      console.error('Existing email lookup error:', emailError)

      return NextResponse.json(
        { error: 'تعذر التحقق من البريد الإلكتروني.' },
        { status: 500 },
      )
    }

    if (existingEmail) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني مستخدم بالفعل.' },
        { status: 409 },
      )
    }

    const {
      data: authData,
      error: authError,
    } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      console.error('Auth user creation error:', authError)

      return NextResponse.json(
        {
          error:
            authError?.message ?? 'تعذر إنشاء حساب المستخدم.',
        },
        { status: 500 },
      )
    }

    authUserId = authData.user.id

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
        department,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .select(`
        id, auth_user_id, username, email, full_name,
        role, department, is_active, created_at, updated_at
      `)
      .single()

    if (profileError || !profile) {
      console.error('Profile creation error:', profileError)

      await supabaseAdmin.auth.admin.deleteUser(authUserId)
      authUserId = null

      return NextResponse.json(
        { error: 'تعذر إنشاء ملف المستخدم.' },
        { status: 500 },
      )
    }

    profileId = profile.id

    let validPermissionIds: string[] = []

    if (permissionIds.length > 0) {
      const {
        data,
        error: validationError,
      } = await supabaseAdmin
        .from('permissions')
        .select('id')
        .in('id', permissionIds)

      if (validationError) {
        throw new Error('تعذر التحقق من الصلاحيات.')
      }

      validPermissionIds = (data ?? []).map(
        (item) => item.id,
      )

      if (validPermissionIds.length > 0) {
        const { error: insertError } =
          await supabaseAdmin
            .from('user_permissions')
            .insert(
              validPermissionIds.map((permissionId) => ({
                user_profile_id: profile.id,
                permission_id: permissionId,
              })),
            )

        if (insertError) {
          throw new Error('تعذر حفظ صلاحيات المستخدم.')
        }
      }
    }

    let validSectionIds: string[] = []

    if (sectionIds.length > 0) {
      const {
        data,
        error: validationError,
      } = await supabaseAdmin
        .from('dashboard_sections')
        .select('id')
        .in('id', sectionIds)

      if (validationError) {
        throw new Error(
          'تعذر التحقق من أقسام لوحة التحكم.',
        )
      }

      validSectionIds = (data ?? []).map(
        (item) => item.id,
      )

      if (validSectionIds.length > 0) {
        const { error: insertError } =
          await supabaseAdmin
            .from('user_dashboard_sections')
            .insert(
              validSectionIds.map((sectionId) => ({
                user_profile_id: profile.id,
                section_id: sectionId,
              })),
            )

        if (insertError) {
          throw new Error(
            'تعذر حفظ أقسام لوحة التحكم للمستخدم.',
          )
        }
      }
    }

    const {
      data: rolePermissions,
      error: rolePermissionsError,
    } = await supabaseAdmin
      .from('role_permissions')
      .select('permission_id')
      .eq('role', role)

    if (rolePermissionsError) {
      throw new Error('تعذر تحميل صلاحيات الدور.')
    }

    const rolePermissionIds = Array.from(
      new Set(
        (rolePermissions ?? []).map(
          (item) => item.permission_id,
        ),
      ),
    )

    const effectivePermissionIds = Array.from(
      new Set([
        ...rolePermissionIds,
        ...validPermissionIds,
      ]),
    )

    return NextResponse.json(
      {
        success: true,
        user: {
          ...profile,
          permissionIds: validPermissionIds,
          rolePermissionIds,
          effectivePermissionIds,
          sectionIds: validSectionIds,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Users POST error:', error)

    // تنظيف البيانات التي أنشأها الطلب إذا فشل.
    if (profileId) {
      await supabaseAdmin
        .from('user_dashboard_sections')
        .delete()
        .eq('user_profile_id', profileId)

      await supabaseAdmin
        .from('user_permissions')
        .delete()
        .eq('user_profile_id', profileId)

      await supabaseAdmin
        .from('user_profiles')
        .delete()
        .eq('id', profileId)
    }

    if (authUserId) {
      await supabaseAdmin.auth.admin.deleteUser(authUserId)
    }

    const message =
      error instanceof Error
        ? error.message
        : 'حدث خطأ أثناء إنشاء المستخدم.'

    return NextResponse.json(
      { error: message },
      { status: 500 },
    )
  }
}
