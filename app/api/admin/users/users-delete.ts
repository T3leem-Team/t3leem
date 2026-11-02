
import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/authorization'
import { supabaseAdmin } from './users-supabase'
import { readString } from './users-validation'

import {
  loadUserForDeletion,
  deleteUserPermissionsByUserId,
  deleteUserSectionsByUserId,
  deleteUserProfile,
} from '@/lib/features/users/repositories/users-admin.repository'

import {
  isProtectedAdmin,
  denyProtectedAdminDelete,
} from './users-protection'

export async function deleteUser(request: Request) {
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

    if (!userId) {
      return NextResponse.json(
        { error: 'معرف المستخدم مطلوب.' },
        { status: 400 },
      )
    }

    const {
      data: targetUser,
      error: targetUserError,
    } = await loadUserForDeletion(userId)

    if (targetUserError) {
      console.error(
        'Delete user lookup error:',
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

    // منع حذف الحساب الإداري الأساسي من أي حساب.
    if (isProtectedAdmin(targetUser.id)) {
      return denyProtectedAdminDelete()
    }

    // منع حذف الحساب المستخدم حاليًا.
    if (targetUser.auth_user_id === access?.userId) {
      return NextResponse.json(
        { error: 'لا يمكنك حذف حسابك الحالي.' },
        { status: 400 },
      )
    }

    const { error: permissionsDeleteError } =
      await deleteUserPermissionsByUserId(targetUser.id)

    if (permissionsDeleteError) {
      console.error(
        'Permissions delete error:',
        permissionsDeleteError,
      )

      return NextResponse.json(
        { error: 'تعذر حذف صلاحيات المستخدم.' },
        { status: 500 },
      )
    }

    const { error: sectionsDeleteError } =
      await deleteUserSectionsByUserId(targetUser.id)

    if (sectionsDeleteError) {
      console.error(
        'Dashboard sections delete error:',
        sectionsDeleteError,
      )

      return NextResponse.json(
        { error: 'تعذر حذف أقسام لوحة التحكم.' },
        { status: 500 },
      )
    }

    const { error: profileDeleteError } =
      await deleteUserProfile(targetUser.id)

    if (profileDeleteError) {
      console.error(
        'Profile delete error:',
        profileDeleteError,
      )

      return NextResponse.json(
        { error: 'تعذر حذف بيانات المستخدم.' },
        { status: 500 },
      )
    }

    if (!targetUser.auth_user_id) {
      return NextResponse.json(
        {
          error:
            'تم حذف بيانات المستخدم لكن لم يُعثر على معرّف حساب الدخول.',
        },
        { status: 500 },
      )
    }

    const { error: authDeleteError } =
      await supabaseAdmin.auth.admin.deleteUser(
        targetUser.auth_user_id,
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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Users DELETE error:', error)

    return NextResponse.json(
      { error: 'حدث خطأ أثناء حذف المستخدم.' },
      { status: 500 },
    )
  }
}
