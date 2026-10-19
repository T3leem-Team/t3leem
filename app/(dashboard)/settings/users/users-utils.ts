import type { Role } from './users-types'

export const roles: { value: Role; label: string }[] = [
  { value: 'Admin', label: 'مدير النظام' },
  { value: 'Supervisor', label: 'مشرف' },
  { value: 'Teacher', label: 'معلم' },
  { value: 'Payments Manager', label: 'مدير المدفوعات' },
]
