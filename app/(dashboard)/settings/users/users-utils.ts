import type { Role } from './users-types'

export const roles: { value: Role; label: string }[] = [
  { value: 'Admin', label: 'مدير النظام' },
  { value: 'Supervisor', label: 'مشرف' },
  { value: 'Teacher', label: 'معلم' },
  { value: 'Payments Manager', label: 'مدير المدفوعات' },
]

export const PROTECTED_ADMIN_ID = '70060d69-27ec-4065-9057-33f8b12a20c1'

export function getRoleLabel(role: Role): string {
  return roles.find((item) => item.value === role)?.label ?? role
}

export function getEffectivePermissionIds(
  permissionIds: string[],
  rolePermissionIds: string[],
): string[] {
  return Array.from(new Set([...rolePermissionIds, ...permissionIds]))
}
