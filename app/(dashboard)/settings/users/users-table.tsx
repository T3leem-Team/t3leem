'use client'

import {
  Check,
  Edit3,
  Info,
  Loader2,
  Power,
  Shield,
  UserPlus,
  Users,
} from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

import type { User, Permission, Role } from './users-types'

const PROTECTED_ADMIN_ID = '70060d69-27ec-4065-9057-33f8b12a20c1'

type UsersTableProps = {
  users: User[]
  filteredUsers: User[]
  permissions: Permission[]
  loading: boolean
  saving: boolean
  error: string | null
  search: string
  showForm: boolean
  selectedUserId: string | null
  getEffectivePermissionIds: (user: User) => string[]
  getRolePermissionIds: (role: Role) => string[]
  onSearchChange: (value: string) => void
  onAdd: () => void
  onEdit: (user: User) => void
  onToggleActive: (user: User) => void
  onSelectUser: (userId: string | null) => void
  onShowDetails: (userId: string) => void
}

export default function UsersTable({
  users,
  filteredUsers,
  permissions,
  loading,
  saving,
  error,
  search,
  showForm,
  selectedUserId,
  getEffectivePermissionIds,
  getRolePermissionIds,
  onSearchChange,
  onAdd,
  onEdit,
  onToggleActive,
  onSelectUser,
  onShowDetails,
}: UsersTableProps) {
  const activeUsers = users.filter((user) => user.is_active).length
  const inactiveUsers = users.length - activeUsers

  const roleLabels: Record<Role, string> = {
    Admin: 'مدير النظام',
    Supervisor: 'مشرف',
    Teacher: 'معلم',
    'Payments Manager': 'مدير المدفوعات',
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">إجمالي المستخدمين</p>
              <p className="mt-1 text-2xl font-bold">{users.length}</p>
            </div>
            <div className="rounded-xl bg-primary/10 p-3">
              <Users className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">المستخدمون النشطون</p>
              <p className="mt-1 text-2xl font-bold text-green-600">
                {activeUsers}
              </p>
            </div>
            <div className="rounded-xl bg-green-500/10 p-3">
              <Check className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">المستخدمون غير النشطين</p>
              <p className="mt-1 text-2xl font-bold text-muted-foreground">
                {inactiveUsers}
              </p>
            </div>
            <div className="rounded-xl bg-muted p-3">
              <Power className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {!showForm && (
              <div className="relative flex-1">
                <Users className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder="ابحث عن مستخدم بالاسم أو البريد أو اسم المستخدم..."
                  className="h-10 w-full rounded-md border border-input bg-background pr-10 pl-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}

            {!showForm && (
              <Button onClick={onAdd} className="gap-2">
                <UserPlus className="h-4 w-4" />
                إضافة مستخدم
              </Button>
            )}
          </div>

          {!showForm && error && (
            <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {!showForm && (
            <div className="users-table-scroll mt-4 overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-muted/50">
                  <tr className="border-b">
                    <th className="whitespace-nowrap px-4 py-3 text-right font-medium">
                      المستخدم
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-right font-medium">
                      اسم المستخدم
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-right font-medium">
                      الدور
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-right font-medium">
                      الصلاحيات
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-right font-medium">
                      الحالة
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-center font-medium">
                      الإجراءات
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center">
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          جاري تحميل المستخدمين...
                        </div>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-12 text-center text-muted-foreground"
                      >
                        لا يوجد مستخدمون مطابقون للبحث
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const effectivePermissionIds =
                        getEffectivePermissionIds(user)

                      const rolePermissionIds =
                        getRolePermissionIds(user.role)

                      const extraPermissionCount =
                        effectivePermissionIds.filter(
                          (permissionId) =>
                            !rolePermissionIds.includes(permissionId),
                        ).length

                      const isSelected = selectedUserId === user.id

                      return (
                        <tr
                          key={user.id}
                          onClick={() => onSelectUser(user.id)}
                          className={`cursor-pointer border-b last:border-0 transition-colors hover:bg-muted/30 ${
                            isSelected ? 'bg-primary/5' : ''
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium">{user.full_name}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {user.email || 'لا يوجد بريد إلكتروني'}
                            </div>
                            {user.department && (
                              <div className="mt-1 text-xs text-muted-foreground">
                                {user.department}
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <span dir="ltr" className="inline-block">
                              {user.username}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <Badge variant="secondary">
                              {roleLabels[user.role] || user.role}
                            </Badge>
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex max-w-[260px] flex-wrap gap-1.5">
                              {effectivePermissionIds.length === 0 ? (
                                <span className="text-xs text-muted-foreground">
                                  لا توجد صلاحيات
                                </span>
                              ) : (
                                <>
                                  {effectivePermissionIds
                                    .slice(0, 3)
                                    .map((permissionId) => {
                                      const permission = permissions.find(
                                        (item) => item.id === permissionId,
                                      )

                                      if (!permission) return null

                                      return (
                                        <Badge
                                          key={permissionId}
                                          variant="outline"
                                          className="max-w-[150px] truncate text-xs"
                                        >
                                          {permission.permission_name}
                                        </Badge>
                                      )
                                    })}

                                  {effectivePermissionIds.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{effectivePermissionIds.length - 3}
                                    </Badge>
                                  )}
                                </>
                              )}
                            </div>

                            {extraPermissionCount > 0 && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {extraPermissionCount} صلاحية إضافية
                              </p>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <Badge
                              variant={user.is_active ? 'default' : 'secondary'}
                              className={
                                user.is_active
                                  ? 'bg-green-600 hover:bg-green-600'
                                  : ''
                              }
                            >
                              {user.is_active ? 'نشط' : 'غير نشط'}
                            </Badge>
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                title="عرض التفاصيل"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  onShowDetails(user.id)
                                }}
                              >
                                <Info className="h-4 w-4" />
                              </Button>

                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                title="تعديل المستخدم"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  onEdit(user)
                                }}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>

                              {user.id !== PROTECTED_ADMIN_ID && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  title={
                                    user.is_active
                                      ? 'تعطيل المستخدم'
                                      : 'تفعيل المستخدم'
                                  }
                                  disabled={saving}
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    onToggleActive(user)
                                  }}
                                >
                                  <Power
                                    className={`h-4 w-4 ${
                                      user.is_active
                                        ? 'text-destructive'
                                        : 'text-green-600'
                                    }`}
                                  />
                                </Button>
                              )}

                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                title="الصلاحيات"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  onShowDetails(user.id)
                                }}
                              >
                                <Shield className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!showForm && selectedUserId && (
            <div className="mt-3 flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">
                تم تحديد مستخدم. اضغط على التفاصيل لعرض معلوماته وصلاحياته.
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelectUser(null)}
              >
                إلغاء التحديد
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <style jsx global>{`
        .users-table-scroll {
          scrollbar-width: thin;
          scrollbar-color: hsl(var(--border)) transparent;
        }

        .users-table-scroll::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .users-table-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .users-table-scroll::-webkit-scrollbar-thumb {
          background: hsl(var(--border));
          border-radius: 999px;
        }
      `}</style>
    </div>
  )
}
