
import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/authorization'
import { supabaseAdmin } from './users-supabase'

import {
  loadUserById,
  loadExistingUserEmail,
  loadPermissionIdsByIds,
  updateUserProfile,
  deleteUserPermissions,
  insertUserPermissions,
  loadDashboardSectionIdsByIds,
  deleteUserDashboardSections,
  insertUserDashboardSections,
  loadRolePermissionIds,
} from '@/lib/features/users/repositories/users-admin.repository'

import {
  isAllowedRole,
  isValidEmail,
  readString,
  readStringArray,
  uniqueStrings,
} from './users-validation'

import {
  isProtectedAdmin,
  denyProtectedAdminEdit,
  denyProtectedAdminRoleChange,
} from './users-protection'

export async function updateUser(request: Request) {
  try {
    const { access, error } =
      await requirePermission('users.manage')

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

    const userId = readString(body.userId)
    const fullName = readString(body.fullName)
    const emailValue = readString(body.email)
    const email = emailValue?.toLowerCase() ?? null
    const role = readString(body.role)
    const department = readString(body.department) || null
    const isActive =
      typeof body.isActive === 'boolean'
        ? body.isActive
        : undefined
    const password = readString(body.password, false)

    const permissionIds = uniqueStrings(
      readStringArray(body.permissionIds) ?? [],
    )

    const sectionIds = uniqueStrings(
      readStringArray(body.sectionIds) ?? [],
    )

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

    if (!isAllowedRole(role)) {
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

    if (email && !isValidEmail(email)) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني غير صالح.' },
        { status: 400 },
      )
    }

    const {
      data: targetUser,
      error: targetUserError,
    } = await loadUserById(userId)

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

    // حماية الحساب الإداري الأساسي قبل أي عملية كتابة.
    if (isProtectedAdmin(targetUser.id)) {
      if (targetUser.auth_user_id !== access?.userId) {
        return denyProtectedAdminEdit()
      }

      // الحساب الأساسي يبقى Admin ومفعّلًا دائمًا.
      if (role !== 'Admin' || isActive === false) {
        return denyProtectedAdminRoleChange()
      }
    }

    if (email && email !== targetUser.email) {
      const {
        data: existingEmail,
        error: existingEmailError,
      } = await loadExistingUserEmail(email, userId)

      if (existingEmailError) {
        console.error(
          'Existing email lookup error:',
          existingEmailError,
        )

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
    }

    if (
      targetUser.auth_user_id === access?.userId &&
      isActive === false
    ) {
      return NextResponse.json(
        { error: 'لا يمكنك تعطيل حسابك الحالي.' },
        { status: 400 },
      )
    }

    const authUpdate: {
      password?: string
      ban_duration?: string
      email?: string
    } = {}

    if (password) {
      authUpdate.password = password
    }

    if (isActive !== undefined) {
      authUpdate.ban_duration = isActive
        ? 'none'
        : '876000h'
    }

    if (email && email !== targetUser.email) {
      authUpdate.email = email
    }

    if (Object.keys(authUpdate).length > 0) {
      if (!targetUser.auth_user_id) {
        return NextResponse.json(
          {
            error:
              'حساب تسجيل الدخول غير مرتبط بهذا المستخدم.',
          },
          { status: 500 },
        )
      }

      const { error: authUpdateError } =
        await supabaseAdmin.auth.admin.updateUserById(
          targetUser.auth_user_id,
          authUpdate,
        )

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

    const profileUpdate: Record<string, unknown> = {
      full_name: fullName,
      role,
      department,
      updated_at: new Date().toISOString(),
    }

    if (email) {
      profileUpdate.email = email
    }

    if (isActive !== undefined) {
      profileUpdate.is_active = isActive
    }

    const {
      data: updatedProfile,
      error: profileUpdateError,
    } = await updateUserProfile(userId, profileUpdate)

    if (profileUpdateError || !updatedProfile) {
      console.error(
        'Profile update error:',
        profileUpdateError,
      )

      return NextResponse.json(
        { error: 'تعذر تحديث بيانات المستخدم.' },
        { status: 500 },
      )
    }

    let validPermissionIds: string[] = []

    if (permissionIds.length > 0) {
      const {
        data,
        error: permissionsError,
      } = await loadPermissionIdsByIds(permissionIds)

      if (permissionsError) {
        console.error(
          'Permission lookup error:',
          permissionsError,
        )

        return NextResponse.json(
          { error: 'تعذر التحقق من الصلاحيات.' },
          { status: 500 },
        )
      }

      validPermissionIds = (data ?? []).map(
        (item) => item.id,
      )
    }

    const { error: deletePermissionsError } =
      await deleteUserPermissions(userId)

    if (deletePermissionsError) {
      console.error(
        'Old permissions delete error:',
        deletePermissionsError,
      )

      return NextResponse.json(
        { error: 'تعذر تحديث صلاحيات المستخدم.' },
        { status: 500 },
      )
    }

    if (validPermissionIds.length > 0) {
      const { error: insertPermissionsError } =
        await insertUserPermissions(
          userId,
          validPermissionIds,
        )

      if (insertPermissionsError) {
        console.error(
          'New permissions insert error:',
          insertPermissionsError,
        )

        return NextResponse.json(
          { error: 'تعذر حفظ صلاحيات المستخدم.' },
          { status: 500 },
        )
      }
    }

    let validSectionIds: string[] = []

    if (sectionIds.length > 0) {
      const {
        data,
        error: sectionsError,
      } = await loadDashboardSectionIdsByIds(sectionIds)

      if (sectionsError) {
        console.error(
          'Dashboard section lookup error:',
          sectionsError,
        )

        return NextResponse.json(
          {
            error:
              'تعذر التحقق من أقسام لوحة التحكم.',
          },
          { status: 500 },
        )
      }

      validSectionIds = (data ?? []).map(
        (item) => item.id,
      )
    }

    const { error: deleteSectionsError } =
      await deleteUserDashboardSections(userId)

    if (deleteSectionsError) {
      console.error(
        'Old dashboard sections delete error:',
        deleteSectionsError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر تحديث أقسام لوحة التحكم للمستخدم.',
        },
        { status: 500 },
      )
    }

    if (validSectionIds.length > 0) {
      const { error: insertSectionsError } =
        await insertUserDashboardSections(
          userId,
          validSectionIds,
        )

      if (insertSectionsError) {
        console.error(
          'New dashboard sections insert error:',
          insertSectionsError,
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

    const {
      data: rolePermissions,
      error: rolePermissionsError,
    } = await loadRolePermissionIds(role)

    if (rolePermissionsError) {
      console.error(
        'Role permissions lookup error:',
        rolePermissionsError,
      )

      return NextResponse.json(
        { error: 'تعذر تحميل صلاحيات الدور.' },
        { status: 500 },
      )
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

    return NextResponse.json({
      success: true,
      user: {
        ...updatedProfile,
        permissionIds: validPermissionIds,
        rolePermissionIds,
        effectivePermissionIds,
        sectionIds: validSectionIds,
      },
    })
  } catch (error) {
    console.error('Users PATCH error:', error)

    return NextResponse.json(
      { error: 'حدث خطأ أثناء تحديث المستخدم.' },
      { status: 500 },
    )
  }
}
