'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  ChevronDown,
  Edit3,
  Loader2,
  Shield,
  UserPlus,
  Users,
  X,
} from 'lucide-react'

import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type Role =
  | 'Admin'
  | 'Supervisor'
  | 'Teacher'
  | 'Payments Manager'

type User = {
  id: string
  auth_user_id: string
  username: string
  full_name: string
  role: Role
  department: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  permissionIds: string[]
}

type Permission = {
  id: string
  permission_key: string
  permission_name: string
  description: string | null
}

const roles: {
  value: Role
  label: string
}[] = [
  {
    value: 'Admin',
    label: 'مدير النظام',
  },
  {
    value: 'Supervisor',
    label: 'مشرف',
  },
  {
    value: 'Teacher',
    label: 'معلم',
  },
  {
    value: 'Payments Manager',
    label: 'مدير المدفوعات',
  },
]

export default function Page() {
  const [users, setUsers] = useState<User[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [department, setDepartment] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('Teacher')

  const [selectedPermissions, setSelectedPermissions] =
    useState<string[]>([])

  const [openPermissions, setOpenPermissions] = useState(false)
  const [search, setSearch] = useState('')

  const loadUsers = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch('/api/admin/users', {
        method: 'GET',
        cache: 'no-store',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ?? 'تعذر تحميل المستخدمين.',
        )
      }

      setUsers(data.users ?? [])
      setPermissions(data.permissions ?? [])
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'تعذر تحميل المستخدمين.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadUsers()
  }, [])

  const resetForm = () => {
    setUsername('')
    setFullName('')
    setDepartment('')
    setPassword('')
    setRole('Teacher')
    setSelectedPermissions([])
    setEditingId(null)
    setOpenPermissions(false)
    setShowForm(false)
  }

  const openAddForm = () => {
    setEditingId(null)
    setUsername('')
    setFullName('')
    setDepartment('')
    setPassword('')
    setRole('Teacher')
    setSelectedPermissions([])
    setOpenPermissions(false)
    setError('')
    setShowForm(true)
  }

  const openEditForm = (user: User) => {
    setEditingId(user.id)
    setUsername(user.username)
    setFullName(user.full_name)
    setDepartment(user.department ?? '')
    setPassword('')
    setRole(user.role)
    setSelectedPermissions([...user.permissionIds])
    setOpenPermissions(false)
    setError('')
    setShowForm(true)
  }

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions((current) =>
      current.includes(permissionId)
        ? current.filter((id) => id !== permissionId)
        : [...current, permissionId],
    )
  }

  const handleSave = async () => {
    if (!username.trim()) {
      setError('اكتب اسم المستخدم.')
      return
    }

    if (!fullName.trim()) {
      setError('اكتب الاسم الكامل.')
      return
    }

    if (!editingId && !password) {
      setError('اكتب كلمة المرور.')
      return
    }

    if (password && password.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل.')
      return
    }

    try {
      setSaving(true)
      setError('')

      const isEditing = editingId !== null

      const body = isEditing
        ? {
            userId: editingId,
            fullName: fullName.trim(),
            department: department.trim() || null,
            role,
            ...(password
              ? { password }
              : {}),
            permissionIds: selectedPermissions,
          }
        : {
            username: username.trim(),
            fullName: fullName.trim(),
            department: department.trim() || null,
            password,
            role,
            permissionIds: selectedPermissions,
          }

      const response = await fetch('/api/admin/users', {
        method: isEditing ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ??
            (isEditing
              ? 'تعذر حفظ التعديلات.'
              : 'تعذر إنشاء المستخدم.'),
        )
      }

      resetForm()
      await loadUsers()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'حدث خطأ غير متوقع.',
      )
    } finally {
      setSaving(false)
    }
  }

  const selectedPermissionsLabel =
    selectedPermissions.length === 0
      ? 'اختر الصلاحيات'
      : selectedPermissions.length === permissions.length
        ? 'جميع الصلاحيات'
        : `${selectedPermissions.length} صلاحية محددة`

  const filteredUsers = useMemo(() => {
    const value = search.trim().toLowerCase()

    if (!value) {
      return users
    }

    return users.filter(
      (user) =>
        user.username.toLowerCase().includes(value) ||
        user.full_name.toLowerCase().includes(value) ||
        (user.department ?? '')
          .toLowerCase()
          .includes(value),
    )
  }, [users, search])

  const activeUsers = users.filter(
    (user) => user.is_active,
  ).length

  const inactiveUsers = users.length - activeUsers

  const getRoleLabel = (value: Role) =>
    roles.find(
      (item) => item.value === value,
    )?.label ?? value

  const getPermissionName = (id: string) =>
    permissions.find(
      (permission) => permission.id === id,
    )?.permission_name ?? id

  return (
    <div className="space-y-6">
      <PageHeader
        title="المستخدمون والصلاحيات"
        description="إدارة حسابات المستخدمين والأدوار والصلاحيات المسموحة لهم داخل النظام."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="size-5" />
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                إجمالي المستخدمين
              </p>

              <p className="mt-1 text-2xl font-bold">
                {users.length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <Check className="size-5" />
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                المستخدمون النشطون
              </p>

              <p className="mt-1 text-2xl font-bold">
                {activeUsers}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Shield className="size-5" />
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                المستخدمون المعطلون
              </p>

              <p className="mt-1 text-2xl font-bold">
                {inactiveUsers}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Shield className="size-5" />
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                الصلاحيات المتاحة
              </p>

              <p className="mt-1 text-2xl font-bold">
                {permissions.length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {showForm && (
        <Card>
          <CardContent className="space-y-6 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">
                  {editingId
                    ? 'تعديل المستخدم'
                    : 'إضافة مستخدم جديد'}
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  حدد بيانات المستخدم والدور والصلاحيات.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={resetForm}
              >
                <X className="size-4" />
              </Button>
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  اسم المستخدم
                </label>

                <input
                  value={username}
                  onChange={(event) =>
                    setUsername(event.target.value)
                  }
                  disabled={editingId !== null}
                  placeholder="مثال: ahmed"
                  dir="ltr"
                  className="h-10 w-full rounded-md border bg-background px-3 text-left text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <p className="text-xs text-muted-foreground">
                  يستخدم لتسجيل الدخول إلى النظام.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  الاسم الكامل
                </label>

                <input
                  value={fullName}
                  onChange={(event) =>
                    setFullName(event.target.value)
                  }
                  placeholder="مثال: أحمد محمد"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  القسم
                </label>

                <input
                  value={department}
                  onChange={(event) =>
                    setDepartment(event.target.value)
                  }
                  placeholder="اختياري"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  كلمة المرور
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder={
                    editingId
                      ? 'اتركها فارغة إذا لا تريد تغييرها'
                      : '8 أحرف على الأقل'
                  }
                  dir="ltr"
                  className="h-10 w-full rounded-md border bg-background px-3 text-left text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  الدور
                </label>

                <select
                  value={role}
                  onChange={(event) =>
                    setRole(event.target.value as Role)
                  }
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {roles.map((item) => (
                    <option
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative space-y-2 md:col-span-2">
                <label className="text-sm font-medium">
                  الصلاحيات
                </label>

                <button
                  type="button"
                  disabled={permissions.length === 0}
                  onClick={() =>
                    setOpenPermissions(
                      (current) => !current,
                    )
                  }
                  className="flex h-10 w-full items-center justify-between rounded-md border bg-background px-3 text-sm hover:bg-muted/40 disabled:opacity-60"
                >
                  <span
                    className={
                      selectedPermissions.length === 0
                        ? 'text-muted-foreground'
                        : ''
                    }
                  >
                    {permissions.length === 0
                      ? 'لا توجد صلاحيات متاحة'
                      : selectedPermissionsLabel}
                  </span>

                  <ChevronDown className="size-4 text-muted-foreground" />
                </button>

                {openPermissions &&
                  permissions.length > 0 && (
                    <div className="absolute right-0 top-full z-50 mt-1 w-full rounded-lg border bg-background p-3 shadow-xl">
                      <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                        {permissions.map(
                          (permission) => {
                            const selected =
                              selectedPermissions.includes(
                                permission.id,
                              )

                            return (
                              <button
                                key={permission.id}
                                type="button"
                                onClick={() =>
                                  togglePermission(
                                    permission.id,
                                  )
                                }
                                className="flex items-start gap-3 rounded-md px-3 py-2.5 text-right hover:bg-muted"
                              >
                                <span
                                  className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border ${
                                    selected
                                      ? 'border-primary bg-primary text-primary-foreground'
                                      : 'border-muted-foreground/40'
                                  }`}
                                >
                                  {selected && (
                                    <Check className="size-3" />
                                  )}
                                </span>

                                <span className="min-w-0">
                                  <span className="block text-sm font-medium">
                                    {
                                      permission.permission_name
                                    }
                                  </span>

                                  {permission.description && (
                                    <span className="mt-0.5 block text-xs text-muted-foreground">
                                      {
                                        permission.description
                                      }
                                    </span>
                                  )}
                                </span>
                              </button>
                            )
                          },
                        )}
                      </div>

                      <div className="mt-3 flex justify-end border-t pt-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setOpenPermissions(false)
                          }
                        >
                          تم
                        </Button>
                      </div>
                    </div>
                  )}

                <p className="text-xs text-muted-foreground">
                  الصلاحيات تحدد العمليات التي يستطيع المستخدم تنفيذها.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-5">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={saving}
              >
                إلغاء
              </Button>

              <Button
                type="button"
                onClick={handleSave}
                disabled={saving}
              >
                {saving && (
                  <Loader2 className="size-4 animate-spin" />
                )}

                {editingId
                  ? 'حفظ التعديلات'
                  : 'إضافة المستخدم'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!showForm && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="بحث باسم المستخدم أو الاسم أو القسم..."
            className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 sm:max-w-md"
          />

          <Button
            type="button"
            onClick={openAddForm}
          >
            <UserPlus className="size-4" />
            إضافة مستخدم
          </Button>
        </div>
      )}

      {error && !showForm && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              جاري تحميل المستخدمين...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="mx-auto size-10 text-muted-foreground" />

              <h3 className="mt-4 font-semibold">
                {users.length === 0
                  ? 'لا يوجد مستخدمون'
                  : 'لا توجد نتائج'}
              </h3>

              <p className="mt-1 text-sm text-muted-foreground">
                {users.length === 0
                  ? 'اضغط على إضافة مستخدم لإنشاء أول حساب.'
                  : 'جرب البحث باستخدام كلمة مختلفة.'}
              </p>

              {users.length === 0 && (
                <Button
                  className="mt-5"
                  onClick={openAddForm}
                >
                  <UserPlus className="size-4" />
                  إضافة مستخدم
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-5 py-4 text-right font-medium">
                      المستخدم
                    </th>

                    <th className="px-5 py-4 text-right font-medium">
                      الدور
                    </th>

                    <th className="px-5 py-4 text-right font-medium">
                      القسم
                    </th>

                    <th className="px-5 py-4 text-right font-medium">
                      الصلاحيات
                    </th>

                    <th className="px-5 py-4 text-right font-medium">
                      الحالة
                    </th>

                    <th className="px-5 py-4 text-right font-medium">
                      الإجراءات
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="transition-colors hover:bg-muted/20"
                    >
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-medium">
                            {user.full_name}
                          </p>

                          <p
                            className="mt-1 text-xs text-muted-foreground"
                            dir="ltr"
                          >
                            @{user.username}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <Badge variant="neutral">
                          {getRoleLabel(user.role)}
                        </Badge>
                      </td>

                      <td className="px-5 py-4">
                        {user.department || '—'}
                      </td>

                      <td className="max-w-[360px] px-5 py-4">
                        {user.permissionIds.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            لا توجد صلاحيات إضافية
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {user.permissionIds
                              .slice(0, 3)
                              .map((id) => (
                                <Badge
                                  key={id}
                                  variant="neutral"
                                >
                                  {getPermissionName(id)}
                                </Badge>
                              ))}

                            {user.permissionIds.length >
                              3 && (
                              <Badge variant="neutral">
                                +
                                {user.permissionIds.length -
                                  3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {user.is_active ? (
                          <Badge variant="success">
                            نشط
                          </Badge>
                        ) : (
                          <Badge variant="neutral">
                            معطل
                          </Badge>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              openEditForm(user)
                            }
                          >
                            <Edit3 className="size-4" />
                            تعديل
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}