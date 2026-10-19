export type Role =
  | 'Admin'
  | 'Supervisor'
  | 'Teacher'
  | 'Payments Manager'

export type RolePermission = {
  role: Role
  permission_id: string
}

export type User = {
  id: string
  auth_user_id: string
  username: string
  email: string | null
  full_name: string
  role: Role
  department: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  permissionIds: string[]
  rolePermissionIds: string[]
  effectivePermissionIds: string[]
  sectionIds: string[]
}

export type Permission = {
  id: string
  permission_key: string
  permission_name: string
  description: string | null
}

export type DashboardSection = {
  id: string
  section_key: string
  section_name: string
  description: string | null
  icon: string | null
  href: string
  sort_order: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}
