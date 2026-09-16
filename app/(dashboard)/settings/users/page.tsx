'use client'

import { useState } from 'react'
import {
  Check,
  ChevronDown,
  Edit3,
  Shield,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react'

import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

import { navItems } from '@/lib/nav'

type Role =
  | 'admin'
  | 'manager'
  | 'teacher'
  | 'registration'
  | 'accountant'

type User = {
  id: number
  name: string
  email: string
  password: string
  role: Role
  permissions: string[]
  active: boolean
}

const roles: { value: Role; label: string }[] = [
  { value: 'admin', label: 'مدير النظام' },
  { value: 'manager', label: 'مدير' },
  { value: 'teacher', label: 'معلم' },
  { value: 'registration', label: 'موظف تسجيل' },
  { value: 'accountant', label: 'محاسب' },
]

const initialUsers: User[] = []

// الصلاحيات تُبنى تلقائيًا من التبويبات الموجودة في nav.ts
// لوحة التحكم الرئيسية لا تحتاج صلاحية مستقلة.
const permissions = navItems
  .filter((item) => item.key !== 'dashboard')
  .map((item) => ({
    key: item.key,
    label: item.title,
  }))

export default function Page() {
  const [users, setUsers] = useState<User[]>(initialUsers)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('teacher')
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    [],
  )

  const [openPermissions, setOpenPermissions] = useState(false)

  const resetForm = () => {
    setName('')
    setEmail('')
    setPassword('')
    setRole('teacher')
    setSelectedPermissions([])
    setEditingId(null)
    setShowForm(false)
    setOpenPermissions(false)
  }

  const openAddForm = () => {
    setEditingId(null)
    setName('')
    setEmail('')
    setPassword('')
    setRole('teacher')
    setSelectedPermissions([])
    setOpenPermissions(false)
    setShowForm(true)
  }

  const openEditForm = (user: User) => {
    setEditingId(user.id)
    setName(user.name)
    setEmail(user.email)
    setPassword(user.password)
    setRole(user.role)
    setSelectedPermissions([...user.permissions])
    setOpenPermissions(false)
    setShowForm(true)
  }

  const togglePermission = (permission: string) => {
    setSelectedPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission],
    )
  }

  const handleSave = () => {
    const trimmedName = name.trim()
    const trimmedEmail = email.trim()

    if (!trimmedName) {
      alert('اكتب اسم المستخدم')
      return
    }

    if (!trimmedEmail) {
      alert('اكتب البريد الإلكتروني')
      return
    }

    if (!password.trim()) {
      alert('اكتب كلمة المرور')
      return
    }

    const emailExists = users.some(
      (user) =>
        user.id !== editingId &&
        user.email.toLowerCase() === trimmedEmail.toLowerCase(),
    )

    if (emailExists) {
      alert('هذا البريد الإلكتروني مستخدم بالفعل')
      return
    }

    const newUser: User = {
      id: editingId ?? Date.now(),
      name: trimmedName,
      email: trimmedEmail,
      password,
      role,
      permissions: [...selectedPermissions],
      active:
        editingId !== null
          ? users.find((user) => user.id === editingId)?.active ?? true
          : true,
    }

    if (editingId !== null) {
      setUsers((current) =>
        current.map((user) =>
          user.id === editingId ? newUser : user,
        ),
      )
    } else {
      setUsers((current) => [...current, newUser])
    }

    resetForm()
  }

  const toggleUserStatus = (id: number) => {
    setUsers((current) =>
      current.map((user) =>
        user.id === id
          ? { ...user, active: !user.active }
          : user,
      ),
    )
  }

  const deleteUser = (id: number) => {
    const user = users.find((item) => item.id === id)

    if (!user) return

    const confirmed = window.confirm(
      `هل أنت متأكد من مسح المستخدم "${user.name}"؟`,
    )

    if (!confirmed) return

    setUsers((current) =>
      current.filter((item) => item.id !== id),
    )
  }

  const getRoleLabel = (value: Role) => {
    return (
      roles.find((role) => role.value === value)?.label ??
      value
    )
  }

  const getPermissionLabel = (value: string) => {
    return (
      permissions.find(
        (permission) => permission.key === value,
      )?.label ?? value
    )
  }

  const selectedPermissionsLabel =
    selectedPermissions.length === 0
      ? 'اختر الصلاحيات'
      : selectedPermissions.length === permissions.length
        ? 'جميع الصلاحيات'
        : selectedPermissions
            .map(getPermissionLabel)
            .join('، ')

  return (
    <div className="space-y-6">
      <PageHeader
        title="المستخدمون والصلاحيات"
        description="إدارة مستخدمي النظام والأدوار والصلاحيات"
      />

      {!showForm && (
        <div className="flex justify-end">
          <Button type="button" onClick={openAddForm}>
            <UserPlus className="size-4" />
            إضافة مستخدم
          </Button>
        </div>
      )}

      {showForm && (
        <Card>
          <CardContent className="space-y-6 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  {editingId !== null
                    ? 'تعديل المستخدم'
                    : 'إضافة مستخدم جديد'}
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  حدد بيانات المستخدم والدور والصلاحيات المسموحة له.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={resetForm}
                aria-label="إغلاق"
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  اسم المستخدم
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="مثال: أحمد محمد"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  البريد الإلكتروني
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="example@email.com"
                  dir="ltr"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm text-left outline-none focus:ring-2 focus:ring-primary/30"
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
                  placeholder="كلمة المرور"
                  dir="ltr"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm text-left outline-none focus:ring-2 focus:ring-primary/30"
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
                  onClick={() =>
                    setOpenPermissions(
                      (current) => !current,
                    )
                  }
                  className="flex h-10 w-full items-center justify-between rounded-md border bg-background px-3 text-sm outline-none hover:bg-muted/40 focus:ring-2 focus:ring-primary/30"
                >
                  <span
                    className={
                      selectedPermissions.length === 0
                        ? 'text-muted-foreground'
                        : 'truncate'
                    }
                  >
                    {selectedPermissionsLabel}
                  </span>

                  <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                </button>

                {openPermissions && (
                  <div className="absolute right-0 top-full z-50 mt-1 w-full rounded-md border bg-background p-2 shadow-lg">
                    <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                      {permissions.map((permission) => {
                        const selected =
                          selectedPermissions.includes(
                            permission.key,
                          )

                        return (
                          <button
                            key={permission.key}
                            type="button"
                            onClick={() =>
                              togglePermission(
                                permission.key,
                              )
                            }
                            className="flex items-center gap-2 rounded-md px-3 py-2 text-right text-sm hover:bg-muted"
                          >
                            <span
                              className={`flex size-4 shrink-0 items-center justify-center rounded-sm border ${
                                selected
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-muted-foreground/40'
                              }`}
                            >
                              {selected && (
                                <Check className="size-3" />
                              )}
                            </span>

                            <span>
                              {permission.label}
                            </span>
                          </button>
                        )
                      })}
                    </div>

                    <div className="mt-2 flex justify-end border-t pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenPermissions(false)
                        }
                        className="rounded-md px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10"
                      >
                        تم
                      </button>
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  يمكنك اختيار أكثر من صلاحية للمستخدم.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
              >
                إلغاء
              </Button>

              <Button
                type="button"
                onClick={handleSave}
              >
                {editingId !== null
                  ? 'حفظ التعديلات'
                  : 'إضافة المستخدم'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <div className="p-10 text-center">
              <Shield className="mx-auto size-10 text-muted-foreground" />

              <h3 className="mt-4 font-semibold">
                لا يوجد مستخدمون
              </h3>

              <p className="mt-1 text-sm text-muted-foreground">
                اضغط على "إضافة مستخدم" لإضافة أول مستخدم.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-5 py-4 text-right font-medium">
                      المستخدم
                    </th>

                    <th className="px-5 py-4 text-right font-medium">
                      الدور
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
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="transition-colors hover:bg-muted/20"
                    >
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-medium">
                            {user.name}
                          </p>

                          <p
                            className="mt-1 text-xs text-muted-foreground"
                            dir="ltr"
                          >
                            {user.email}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <Badge variant="neutral">
                          {getRoleLabel(user.role)}
                        </Badge>
                      </td>

                      <td className="max-w-[350px] px-5 py-4">
                        {user.permissions.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            لا توجد صلاحيات
                          </span>
                        ) : user.permissions.length ===
                          permissions.length ? (
                          <Badge variant="success">
                            جميع الصلاحيات
                          </Badge>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {user.permissions
                              .slice(0, 3)
                              .map((permission) => (
                                <Badge
                                  key={permission}
                                  variant="neutral"
                                >
                                  {getPermissionLabel(
                                    permission,
                                  )}
                                </Badge>
                              ))}

                            {user.permissions.length > 3 && (
                              <Badge variant="neutral">
                                +{user.permissions.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {user.active ? (
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

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              toggleUserStatus(user.id)
                            }
                          >
                            {user.active
                              ? 'تعطيل'
                              : 'تفعيل'}
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              deleteUser(user.id)
                            }
                          >
                            <Trash2 className="size-4" />
                            مسح
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
