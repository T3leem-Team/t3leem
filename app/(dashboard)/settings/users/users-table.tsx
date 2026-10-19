'use client'

import {
  Check,
  Edit3,
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
    <div className="space-y-5" dir="rtl">
      {/* إحصائيات المستخدمين */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">
                إجمالي المستخدمين
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">
                {users.length}
              </p>
            </div>
            <div className="rounded-xl bg-sky-50 p-3 dark:bg-sky-950/40">
              <Users className="h-6 w-6 text-sky-600 dark:text-sky-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">
                المستخدمون النشطون
              </p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">
                {activeUsers}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/40">
              <Check className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">
                المستخدمون غير النشطين
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-500">
                {inactiveUsers}
              </p>
            </div>
            <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
              <Power className="h-6 w-6 text-slate-500 dark:text-slate-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* لوحة إدارة المستخدمين */}
      <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <CardContent className="p-4 sm:p-5">
          {/* البحث والإضافة */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {!showForm && (
              <div className="relative flex-1">
                <Users className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder="ابحث عن مستخدم بالاسم أو البريد أو اسم المستخدم..."
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/70 pr-10 pl-3 text-sm outline-none transition-colors placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:bg-slate-950 dark:focus:ring-sky-950"
                />
              </div>
            )}

            {!showForm && (
              <Button onClick={onAdd} className="gap-2 rounded-lg">
                <UserPlus className="h-4 w-4" />
                إضافة مستخدم
              </Button>
            )}
          </div>

          {/* رسالة الخطأ */}
          {!showForm && error && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
              {error}
            </div>
          )}

          {/* جدول بتمرير مستقل */}
          {!showForm && (
            <div className="users-table-scroll mt-4 max-h-[55vh] min-h-[240px] overflow-auto rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_#e2e8f0] dark:bg-slate-900 dark:shadow-[0_1px_0_0_#334155]">
                  <tr>
                    <th className="w-16 whitespace-nowrap px-4 py-3 text-center font-semibold text-slate-600 dark:text-slate-300">
                      #
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">
                      المستخدم
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">
                      اسم المستخدم
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">
                      الدور
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">
                      الصلاحيات
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">
                      الحالة
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-center font-semibold text-slate-600 dark:text-slate-300">
                      الإجراءات
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center">
                        <div className="flex items-center justify-center gap-2 text-slate-500">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          جاري تحميل المستخدمين...
                        </div>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-12 text-center text-slate-500"
                      >
                        لا يوجد مستخدمون مطابقون للبحث
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user, index) => {
                      const effectivePermissionIds =
                        getEffectivePermissionIds(user)

                      const rolePermissionIds =
                        getRolePermissionIds(user.role)

                      const extraPermissionCount =
                        effectivePermissionIds.filter(
                          (permissionId) =>
                            !rolePermissionIds.includes(permissionId),
                        ).length

                      const firstPermission = permissions.find(
                        (permission) =>
                          permission.id === effectivePermissionIds[0],
                      )

                      const remainingPermissionCount = Math.max(
                        0,
                        effectivePermissionIds.length -
                          (firstPermission ? 1 : 0),
                      )

                      const isSelected = selectedUserId === user.id

                      return (
                        <tr
                          key={user.id}
                          onClick={() => onSelectUser(user.id)}
                          aria-selected={isSelected}
                          className={`cursor-pointer border-b border-slate-100 transition-colors last:border-0 dark:border-slate-800 ${
                            isSelected
                              ? 'bg-sky-50 hover:bg-sky-100/80 dark:bg-sky-950/40 dark:hover:bg-sky-950/60'
                              : 'hover:bg-slate-50/80 dark:hover:bg-slate-900/70'
                          }`}
                        >
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full text-xs font-semibold ${
                                isSelected
                                  ? 'bg-sky-600 text-white'
                                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {index + 1}
                            </span>
                          </td>

                          <td
                            className={`px-4 py-3 ${
                              isSelected
                                ? 'border-r-4 border-sky-500'
                                : 'border-r-4 border-transparent'
                            }`}
                          >
                            <div className="font-medium text-slate-800 dark:text-slate-100">
                              {user.full_name}
                            </div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {user.email || 'لا يوجد بريد إلكتروني'}
                            </div>
                            {user.department && (
                              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {user.department}
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <span
                              dir="ltr"
                              className="inline-block text-slate-600 dark:text-slate-300"
                            >
                              {user.username}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <Badge variant="neutral">
                              {roleLabels[user.role] || user.role}
                            </Badge>
                          </td>

                          <td className="px-4 py-3">
                            {effectivePermissionIds.length === 0 ? (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  onShowDetails(user.id)
                                }}
                                className="text-xs text-slate-500 underline-offset-4 hover:text-sky-700 hover:underline dark:hover:text-sky-300"
                              >
                                لا توجد صلاحيات
                              </button>
                            ) : (
                              <button
                                type="button"
                                title="اضغط لعرض جميع الصلاحيات"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  onShowDetails(user.id)
                                }}
                                className="flex max-w-[260px] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-right transition-colors hover:border-sky-300 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-sky-800 dark:hover:bg-sky-950/40"
                              >
                                <Shield className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />

                                <span className="max-w-[160px] truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                                  {firstPermission?.permission_name ??
                                    'عرض الصلاحيات'}
                                </span>

                                {remainingPermissionCount > 0 && (
                                  <Badge
                                    variant="neutral"
                                    className="shrink-0 text-xs"
                                  >
                                    +{remainingPermissionCount}
                                  </Badge>
                                )}
                              </button>
                            )}

                            {extraPermissionCount > 0 && (
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {extraPermissionCount} صلاحية إضافية
                              </p>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <Badge
                              variant={user.is_active ? 'success' : 'neutral'}
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
                                title="تعديل المستخدم"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  onEdit(user)
                                }}
                              >
                                <Edit3 className="h-4 w-4 text-slate-600 dark:text-slate-300" />
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
                                        ? 'text-rose-500'
                                        : 'text-emerald-600'
                                    }`}
                                  />
                                </Button>
                              )}
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

          {/* شريط المستخدم المحدد */}
          {!showForm && selectedUserId && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-sky-100 bg-sky-50/70 px-3 py-2.5 text-sm dark:border-sky-900/60 dark:bg-sky-950/30">
              <span className="text-slate-600 dark:text-slate-300">
                تم تحديد مستخدم. اضغط على الصلاحيات لعرض تفاصيلها.
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
          scrollbar-color: #cbd5e1 transparent;
          overscroll-behavior: contain;
        }

        .users-table-scroll::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .users-table-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .users-table-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 999px;
        }

        .users-table-scroll::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        .users-table-scroll thead {
          position: sticky;
          top: 0;
          z-index: 10;
        }
      `}</style>
    </div>
  )
}
