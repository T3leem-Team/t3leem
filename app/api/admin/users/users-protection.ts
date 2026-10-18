import { NextResponse } from 'next/server'

export const PROTECTED_ADMIN_PROFILE_ID =
  '70060d69-27ec-4065-9057-33f8b12a20c1'

export function isProtectedAdmin(profileId: string): boolean {
  return profileId === PROTECTED_ADMIN_PROFILE_ID
}

export function denyProtectedAdminEdit() {
  return NextResponse.json(
    {
      error: 'لا تملك صلاحية تعديل الحساب الإداري الأساسي.',
    },
    { status: 403 },
  )
}

export function denyProtectedAdminDelete() {
  return NextResponse.json(
    {
      error: 'لا يمكن حذف الحساب الإداري الأساسي.',
    },
    { status: 403 },
  )
}

export function denyProtectedAdminRoleChange() {
  return NextResponse.json(
    {
      error: 'لا يمكن تغيير دور الحساب الإداري الأساسي أو تعطيله.',
    },
    { status: 403 },
  )
}