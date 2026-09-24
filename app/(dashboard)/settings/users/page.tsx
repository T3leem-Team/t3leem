'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  ChevronDown,
  Edit3,
  Loader2,
  Power,
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

type RolePermission = {
  role: Role
  permission_id: string
}

type User = {
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

  // الصلاحيات الإضافية الخاصة بالمستخدم فقط
  permissionIds: string[]

  // صلاحيات الدور
  rolePermissionIds: string[]

  // جميع الصلاحيات الفعلية = صلاحيات الدور + الإضافية
  effectivePermissionIds: string[]

  // أقسام لوحة التحكم
  sectionIds: string[]
}

type Permission = {
  id: string
  permission_key: string
  permission_name: string
  description: string | null
}

type DashboardSection = {
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
  const [dashboardSections, setDashboardSections] = useState<
    DashboardSection[]
  >([])

  const [rolePermissions, setRolePermissions] = useState<
    RolePermission[]
  >([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [department, setDepartment] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('Teacher')

  // الصلاحيات الإضافية فقط
  const [selectedPermissions, setSelectedPermissions] =
    useState<string[]>([])

  // أقسام لوحة التحكم
  const [selectedSections, setSelectedSections] =
    useState<string[]>([])

  const [openPermissions, setOpenPermissions] = useState(false)
  const [openSections, setOpenSections] = useState(false)

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
      setDashboardSections(data.dashboardSections ?? [])
      setRolePermissions(data.rolePermissions ?? [])
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

  const getRolePermissionIds = (
    roleValue: Role,
  ) => {
    return Array.from(
      new Set(
        rolePermissions
          .filter(
            (item) =>
              item.role === roleValue,
          )
          .map(
            (item) =>
              item.permission_id,
          ),
      ),
    )
  }

  const resetForm = () => {
    setUsername('')
    setEmail('')
    setFullName('')
    setDepartment('')
    setPassword('')
    setRole('Teacher')

    setSelectedPermissions([])
    setSelectedSections([])

    setEditingId(null)

    setOpenPermissions(false)
    setOpenSections(false)

    setShowForm(false)
  }

  const openAddForm = () => {
    setEditingId(null)

    setUsername('')
    setEmail('')
    setFullName('')
    setDepartment('')
    setPassword('')
    setRole('Teacher')

    setSelectedPermissions([])
    setSelectedSections([])

    setOpenPermissions(false)
    setOpenSections(false)

    setError('')
    setShowForm(true)
  }

  const openEditForm = (user: User) => {
    setEditingId(user.id)

    setUsername(user.username)
    setEmail(user.email ?? '')
    setFullName(user.full_name)
    setDepartment(user.department ?? '')
    setPassword('')
    setRole(user.role)

    // مهم:
    // نضع فقط الصلاحيات الإضافية في selectedPermissions
    // ولا نضع صلاحيات الدور فيها.
    setSelectedPermissions([
      ...(user.permissionIds ?? []),
    ])

    setSelectedSections([
      ...(user.sectionIds ?? []),
    ])

    setOpenPermissions(false)
    setOpenSections(false)

    setError('')
    setShowForm(true)
  }

  const togglePermission = (
    permissionId: string,
  ) => {
    const currentRolePermissionIds =
      getRolePermissionIds(role)

    // لا نسمح بتحويل صلاحية الدور إلى صلاحية فردية
    if (
      currentRolePermissionIds.includes(
        permissionId,
      )
    ) {
      return
    }

    setSelectedPermissions((current) =>
      current.includes(permissionId)
        ? current.filter(
            (id) => id !== permissionId,
          )
        : [
            ...current,
            permissionId,
          ],
    )
  }

  const toggleSection = (
    sectionId: string,
  ) => {
    setSelectedSections((current) =>
      current.includes(sectionId)
        ? current.filter(
            (id) => id !== sectionId,
          )
        : [
            ...current,
            sectionId,
          ],
    )
  }

  const handleSave = async () => {
    if (!username.trim()) {
      setError('اكتب اسم المستخدم.')
      return
    }

    if (!email.trim()) {
      setError('اكتب البريد الإلكتروني.')
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

    if (
      password &&
      password.length < 8
    ) {
      setError(
        'كلمة المرور يجب أن تكون 8 أحرف على الأقل.',
      )
      return
    }

    try {
      setSaving(true)
      setError('')

      const isEditing =
        editingId !== null

      const rolePermissionIds =
        getRolePermissionIds(role)

      // إزالة أي صلاحية موجودة أصلًا في الدور
      // من قائمة الصلاحيات الفردية.
      const additionalPermissionIds =
        Array.from(
          new Set(
            selectedPermissions.filter(
              (id) =>
                !rolePermissionIds.includes(
                  id,
                ),
            ),
          ),
        )

      const body = isEditing
        ? {
            userId: editingId,

            email:
              email
                .trim()
                .toLowerCase(),

            fullName:
              fullName.trim(),

            department:
              department.trim() ||
              null,

            role,

            ...(password
              ? { password }
              : {}),

            // إضافية فقط
            permissionIds:
              additionalPermissionIds,

            sectionIds:
              selectedSections,
          }
        : {
            username:
              username.trim(),

            email:
              email
                .trim()
                .toLowerCase(),

            fullName:
              fullName.trim(),

            department:
              department.trim() ||
              null,

            password,

            role,

            // إضافية فقط
            permissionIds:
              additionalPermissionIds,

            sectionIds:
              selectedSections,
          }

      const response =
        await fetch(
          '/api/admin/users',
          {
            method: isEditing
              ? 'PATCH'
              : 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify(
                body,
              ),
          },
        )

      const data =
        await response.json()

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

  const handleToggleActive = async (
    user: User,
  ) => {
    const action = user.is_active
      ? 'تعطيل'
      : 'تفعيل'

    const confirmed =
      window.confirm(
        `هل أنت متأكد من ${action} المستخدم "${user.full_name}"؟`,
      )

    if (!confirmed) {
      return
    }

    try {
      setSaving(true)
      setError('')

      const response =
        await fetch(
          '/api/admin/users',
          {
            method: 'PATCH',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                userId: user.id,

                email:
                  user.email,

                fullName:
                  user.full_name,

                role:
                  user.role,

                department:
                  user.department,

                isActive:
                  !user.is_active,

                // نحافظ على الإضافية فقط
                permissionIds:
                  user.permissionIds ??
                  [],

                sectionIds:
                  user.sectionIds ??
                  [],
              }),
          },
        )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ??
            `تعذر ${action} المستخدم.`,
        )
      }

      await loadUsers()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `تعذر ${action} المستخدم.`,
      )
    } finally {
      setSaving(false)
    }
  }

  const selectedSectionsLabel =
    selectedSections.length === 0
      ? 'اختر أقسام لوحة التحكم'
      : selectedSections.length ===
          dashboardSections.filter(
            (section) =>
              section.is_active,
          ).length
        ? 'جميع الأقسام'
        : `${selectedSections.length} قسم محدد`

  const selectedPermissionsLabel =
    selectedPermissions.length === 0
      ? 'لا توجد صلاحيات إضافية'
      : `${selectedPermissions.length} صلاحية إضافية`

  const activeDashboardSections =
    dashboardSections.filter(
      (section) =>
        section.is_active,
    )

  const currentRolePermissionIds =
    getRolePermissionIds(role)

  const currentRolePermissions =
    permissions.filter(
      (permission) =>
        currentRolePermissionIds.includes(
          permission.id,
        ),
    )

  const filteredUsers = useMemo(() => {
    const value =
      search.trim().toLowerCase()

    if (!value) {
      return users
    }

    return users.filter(
      (user) =>
        user.username
          .toLowerCase()
          .includes(value) ||
        user.full_name
          .toLowerCase()
          .includes(value) ||
        (user.email ?? '')
          .toLowerCase()
          .includes(value) ||
        (user.department ?? '')
          .toLowerCase()
          .includes(value),
    )
  }, [users, search])

  const activeUsers =
    users.filter(
      (user) => user.is_active,
    ).length

  const inactiveUsers =
    users.length - activeUsers

  const getRoleLabel = (
    value: Role,
  ) =>
    roles.find(
      (item) =>
        item.value === value,
    )?.label ?? value

  const getPermissionName = (
    id: string,
  ) =>
    permissions.find(
      (permission) =>
        permission.id === id,
    )?.permission_name ?? id

  const getSectionName = (
    id: string,
  ) =>
    dashboardSections.find(
      (section) =>
        section.id === id,
    )?.section_name ?? id

  const getEffectivePermissionIds =
    (user: User) => {
      const roleIds =
        user.rolePermissionIds ??
        getRolePermissionIds(
          user.role,
        )

      const extraIds =
        user.permissionIds ?? []

      return Array.from(
        new Set([
          ...roleIds,
          ...extraIds,
        ]),
      )
    }

  return (
    <div className="space-y-6">
      <PageHeader
        title="المستخدمون والصلاحيات"
        description="إدارة حسابات المستخدمين والأدوار وأقسام النظام والصلاحيات التفصيلية."
      />

      {/* الإحصائيات */}
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
                الصلاحيات التفصيلية
              </p>

              <p className="mt-1 text-2xl font-bold">
                {permissions.length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* نموذج الإضافة والتعديل */}
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
                  حدد بيانات المستخدم والدور وأقسام النظام والصلاحيات الإضافية.
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
                    setUsername(
                      event.target.value,
                    )
                  }
                  disabled={
                    editingId !== null
                  }
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
                  البريد الإلكتروني
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value,
                    )
                  }
                  placeholder="example@email.com"
                  dir="ltr"
                  className="h-10 w-full rounded-md border bg-background px-3 text-left text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />

                <p className="text-xs text-muted-foreground">
                  يستخدم لاستعادة كلمة المرور.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  الاسم الكامل
                </label>

                <input
                  value={fullName}
                  onChange={(event) =>
                    setFullName(
                      event.target.value,
                    )
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
                    setDepartment(
                      event.target.value,
                    )
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
                    setPassword(
                      event.target.value,
                    )
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
                  onChange={(event) => {
                    setRole(
                      event.target
                        .value as Role,
                    )

                    // تنظيف أي صلاحية إضافية
                    // أصبحت جزءًا من الدور الجديد
                    const newRole =
                      event.target
                        .value as Role

                    const newRolePermissionIds =
                      getRolePermissionIds(
                        newRole,
                      )

                    setSelectedPermissions(
                      (current) =>
                        current.filter(
                          (id) =>
                            !newRolePermissionIds.includes(
                              id,
                            ),
                        ),
                    )
                  }}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {roles.map(
                    (item) => (
                      <option
                        key={
                          item.value
                        }
                        value={
                          item.value
                        }
                      >
                        {item.label}
                      </option>
                    ),
                  )}
                </select>
              </div>

              {/* أقسام لوحة التحكم */}
              <div className="relative space-y-2 md:col-span-2">
                <label className="text-sm font-medium">
                  أقسام لوحة التحكم
                </label>

                <button
                  type="button"
                  disabled={
                    activeDashboardSections.length ===
                    0
                  }
                  onClick={() =>
                    setOpenSections(
                      (current) =>
                        !current,
                    )
                  }
                  className="flex h-10 w-full items-center justify-between rounded-md border bg-background px-3 text-sm hover:bg-muted/40 disabled:opacity-60"
                >
                  <span
                    className={
                      selectedSections.length ===
                      0
                        ? 'text-muted-foreground'
                        : ''
                    }
                  >
                    {activeDashboardSections.length ===
                    0
                      ? 'لا توجد أقسام متاحة'
                      : selectedSectionsLabel}
                  </span>

                  <ChevronDown className="size-4 text-muted-foreground" />
                </button>

                {openSections &&
                  activeDashboardSections.length >
                    0 && (
                    <div className="absolute right-0 top-full z-[60] mt-1 w-full rounded-lg border bg-background p-3 shadow-xl">
                      <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                        {activeDashboardSections.map(
                          (section) => {
                            const selected =
                              selectedSections.includes(
                                section.id,
                              )

                            return (
                              <button
                                key={
                                  section.id
                                }
                                type="button"
                                onClick={() =>
                                  toggleSection(
                                    section.id,
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
                                      section.section_name
                                    }
                                  </span>

                                  {section.description && (
                                    <span className="mt-0.5 block text-xs text-muted-foreground">
                                      {
                                        section.description
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
                            setOpenSections(
                              false,
                            )
                          }
                        >
                          تم
                        </Button>
                      </div>
                    </div>
                  )}

                <p className="text-xs text-muted-foreground">
                  تحدد هذه الأقسام الصفحات الرئيسية التي يستطيع المستخدم الوصول إليها.
                </p>
              </div>

              {/* الصلاحيات التفصيلية */}
              <div className="relative space-y-2 md:col-span-2">
                <label className="text-sm font-medium">
                  الصلاحيات التفصيلية
                </label>

                <button
                  type="button"
                  disabled={
                    permissions.length ===
                    0
                  }
                  onClick={() =>
                    setOpenPermissions(
                      (current) =>
                        !current,
                    )
                  }
                  className="flex h-10 w-full items-center justify-between rounded-md border bg-background px-3 text-sm hover:bg-muted/40 disabled:opacity-60"
                >
                  <span
                    className={
                      selectedPermissions.length ===
                      0
                        ? 'text-muted-foreground'
                        : ''
                    }
                  >
                    {permissions.length ===
                    0
                      ? 'لا توجد صلاحيات متاحة'
                      : selectedPermissionsLabel}
                  </span>

                  <ChevronDown className="size-4 text-muted-foreground" />
                </button>

                {openPermissions &&
                  permissions.length >
                    0 && (
                    <div className="absolute right-0 top-full z-50 mt-1 w-full rounded-lg border bg-background p-3 shadow-xl">
                      {/* صلاحيات الدور */}
                      {currentRolePermissions.length >
                        0 && (
                        <div className="mb-4 rounded-lg border bg-muted/30 p-3">
                          <div className="mb-2">
                            <p className="text-sm font-semibold">
                              صلاحيات الدور
                            </p>

                            <p className="mt-1 text-xs text-muted-foreground">
                              هذه الصلاحيات تأتي تلقائيًا من دور المستخدم ولا تحتاج إلى إضافتها يدويًا.
                            </p>
                          </div>

                          <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                            {currentRolePermissions.map(
                              (
                                permission,
                              ) => (
                                <div
                                  key={
                                    permission.id
                                  }
                                  className="flex items-start gap-3 rounded-md bg-background px-3 py-2.5"
                                >
                                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border border-primary bg-primary text-primary-foreground">
                                    <Check className="size-3" />
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
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      )}

                      {/* الصلاحيات الإضافية */}
                      <div>
                        <div className="mb-2">
                          <p className="text-sm font-semibold">
                            صلاحيات إضافية للمستخدم
                          </p>

                          <p className="mt-1 text-xs text-muted-foreground">
                            هذه الصلاحيات تضاف لهذا المستخدم فقط بالإضافة إلى صلاحيات دوره.
                          </p>
                        </div>

                        <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                          {permissions
                            .filter(
                              (
                                permission,
                              ) =>
                                !currentRolePermissionIds.includes(
                                  permission.id,
                                ),
                            )
                            .map(
                              (
                                permission,
                              ) => {
                                const selected =
                                  selectedPermissions.includes(
                                    permission.id,
                                  )

                                return (
                                  <button
                                    key={
                                      permission.id
                                    }
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
                      </div>

                      <div className="mt-3 flex justify-end border-t pt-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setOpenPermissions(
                              false,
                            )
                          }
                        >
                          تم
                        </Button>
                      </div>
                    </div>
                  )}

                <p className="text-xs text-muted-foreground">
                  صلاحيات الدور تُطبق تلقائيًا، ويمكن إضافة صلاحيات إضافية للمستخدم عند الحاجة.
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

      {/* شريط الأدوات */}
      {!showForm && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="بحث باسم المستخدم أو الاسم أو البريد أو القسم..."
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

      {/* الخطأ العام */}
      {error && !showForm && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* الجدول */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              جاري تحميل المستخدمين...
            </div>
          ) : filteredUsers.length ===
            0 ? (
            <div className="p-12 text-center">
              <Users className="mx-auto size-10 text-muted-foreground" />

              <h3 className="mt-4 font-semibold">
                {users.length ===
                0
                  ? 'لا يوجد مستخدمون'
                  : 'لا توجد نتائج'}
              </h3>

              <p className="mt-1 text-sm text-muted-foreground">
                {users.length ===
                0
                  ? 'اضغط على إضافة مستخدم لإنشاء أول حساب.'
                  : 'جرب البحث باستخدام كلمة مختلفة.'}
              </p>

              {users.length ===
                0 && (
                <Button
                  className="mt-5"
                  onClick={
                    openAddForm
                  }
                >
                  <UserPlus className="size-4" />
                  إضافة مستخدم
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1350px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-5 py-4 text-right font-medium">
                      المستخدم
                    </th>

                    <th className="px-5 py-4 text-right font-medium">
                      البريد الإلكتروني
                    </th>

                    <th className="px-5 py-4 text-right font-medium">
                      الدور
                    </th>

                    <th className="px-5 py-4 text-right font-medium">
                      القسم
                    </th>

                    <th className="px-5 py-4 text-right font-medium">
                      أقسام لوحة التحكم
                    </th>

                    <th className="px-5 py-4 text-right font-medium">
                      الصلاحيات الفعلية
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
                  {filteredUsers.map(
                    (user) => {
                      const effectivePermissionIds =
                        getEffectivePermissionIds(
                          user,
                        )

                      const rolePermissionIds =
                        user.rolePermissionIds ??
                        getRolePermissionIds(
                          user.role,
                        )

                      const additionalPermissionIds =
                        user.permissionIds ??
                        []

                      return (
                        <tr
                          key={
                            user.id
                          }
                          className="transition-colors hover:bg-muted/20"
                        >
                          <td className="px-5 py-4">
                            <div>
                              <p className="font-medium">
                                {
                                  user.full_name
                                }
                              </p>

                              <p
                                className="mt-1 text-xs text-muted-foreground"
                                dir="ltr"
                              >
                                @
                                {
                                  user.username
                                }
                              </p>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className="text-sm"
                              dir="ltr"
                            >
                              {user.email ||
                                '—'}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <Badge variant="neutral">
                              {getRoleLabel(
                                user.role,
                              )}
                            </Badge>
                          </td>

                          <td className="px-5 py-4">
                            {user.department ||
                              '—'}
                          </td>

                          {/* أقسام لوحة التحكم */}
                          <td className="max-w-[360px] px-5 py-4">
                            {(
                              user.sectionIds ??
                              []
                            ).length ===
                            0 ? (
                              <span className="text-xs text-muted-foreground">
                                لا توجد أقسام
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {(
                                  user.sectionIds ??
                                  []
                                )
                                  .slice(
                                    0,
                                    3,
                                  )
                                  .map(
                                    (
                                      id,
                                    ) => (
                                      <Badge
                                        key={
                                          id
                                        }
                                        variant="neutral"
                                      >
                                        {getSectionName(
                                          id,
                                        )}
                                      </Badge>
                                    ),
                                  )}

                                {(
                                  user.sectionIds ??
                                  []
                                ).length >
                                  3 && (
                                  <Badge variant="neutral">
                                    +
                                    {(
                                      user.sectionIds ??
                                      []
                                    ).length -
                                      3}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </td>

                          {/* الصلاحيات الفعلية */}
                          <td className="max-w-[400px] px-5 py-4">
                            {effectivePermissionIds.length ===
                            0 ? (
                              <span className="text-xs text-muted-foreground">
                                لا توجد صلاحيات
                              </span>
                            ) : (
                              <div className="space-y-2">
                                <div className="flex flex-wrap gap-1">
                                  {effectivePermissionIds
                                    .slice(
                                      0,
                                      4,
                                    )
                                    .map(
                                      (
                                        id,
                                      ) => {
                                        const isRolePermission =
                                          rolePermissionIds.includes(
                                            id,
                                          )

                                        return (
                                          <Badge
                                            key={
                                              id
                                            }
                                            variant="neutral"
                                          >
                                            {getPermissionName(
                                              id,
                                            )}

                                            {isRolePermission &&
                                              ' • دور'}
                                          </Badge>
                                        )
                                      },
                                    )}

                                  {effectivePermissionIds.length >
                                    4 && (
                                    <Badge variant="neutral">
                                      +
                                      {effectivePermissionIds.length -
                                        4}
                                    </Badge>
                                  )}
                                </div>

                                <div className="text-xs text-muted-foreground">
                                  {rolePermissionIds.length >
                                    0 &&
                                    `${rolePermissionIds.length} من الدور`}

                                  {rolePermissionIds.length >
                                    0 &&
                                    additionalPermissionIds.length >
                                      0 &&
                                    ' • '}

                                  {additionalPermissionIds.length >
                                    0 &&
                                    `${additionalPermissionIds.length} إضافية`}
                                </div>
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
                                  openEditForm(
                                    user,
                                  )
                                }
                                disabled={
                                  saving
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
                                  handleToggleActive(
                                    user,
                                  )
                                }
                                disabled={
                                  saving
                                }
                              >
                                {saving ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <Power className="size-4" />
                                )}

                                {user.is_active
                                  ? 'تعطيل'
                                  : 'تفعيل'}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    },
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}