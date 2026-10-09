'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Check,
  ChevronDown,
  Edit3,
  Info,
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
  permissionIds: string[]
  rolePermissionIds: string[]
  effectivePermissionIds: string[]
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
  const router = useRouter()

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

  const [selectedPermissions, setSelectedPermissions] =
    useState<string[]>([])

  const [selectedSections, setSelectedSections] =
    useState<string[]>([])

  const [openPermissions, setOpenPermissions] = useState(false)
  const [openSections, setOpenSections] = useState(false)

  const [search, setSearch] = useState('')

  const [selectedUserId, setSelectedUserId] =
    useState<string | null>(null)

  const [detailsOpen, setDetailsOpen] = useState(false)

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

  const selectedDetailsUser =
    users.find(
      (user) =>
        user.id === selectedUserId,
    ) ?? null

  const hasInternalScroll =
    filteredUsers.length > 10

  return (
    <div className="space-y-6">
      <PageHeader
        title="المستخدمون والصلاحيات"
        description="إدارة حسابات المستخدمين والأدوار وأقسام النظام والصلاحيات التفصيلية."
      />

      {/* زر العودة */}
      <div className="flex justify-start">
        <Button
          type="button"
          onClick={() => router.back()}
          className="h-10 gap-2 bg-primary px-4 text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          <ArrowRight className="size-4" />
          عودة
        </Button>
      </div>

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
            <>
              <div
                dir="rtl"
                className={
                  hasInternalScroll
                    ? 'users-table-scroll max-h-[690px] overflow-y-auto overflow-x-auto'
                    : 'users-table-scroll overflow-x-auto'
                }
                style={{
                  scrollbarColor:
                    'var(--primary) transparent',
                }}
              >
                <table
                  dir="rtl"
                  className="w-full min-w-[1100px] text-sm"
                >
                  <thead className="sticky top-0 z-20">
                    <tr className="border-b bg-background shadow-sm">
                      <th className="w-[70px] px-5 py-4 text-center font-semibold">
                        #
                      </th>

                      <th className="px-5 py-4 text-right font-semibold">
                        المستخدم
                      </th>

                      <th className="px-5 py-4 text-right font-semibold">
                        البريد الإلكتروني
                      </th>

                      <th className="px-5 py-4 text-right font-semibold">
                        الدور
                      </th>

                      <th className="px-5 py-4 text-right font-semibold">
                        الصلاحيات
                      </th>

                      <th className="px-5 py-4 text-right font-semibold">
                        الحالة
                      </th>

                      <th className="px-5 py-4 text-right font-semibold">
                        الإجراءات
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {filteredUsers.map(
                      (user, index) => {
                        const effectivePermissionIds =
                          getEffectivePermissionIds(
                            user,
                          )

                        const firstPermissionId =
                          effectivePermissionIds[0]

                        const isSelected =
                          selectedUserId ===
                          user.id

                        const sectionCount =
                          (
                            user.sectionIds ??
                            []
                          ).length

                        const permissionCount =
                          effectivePermissionIds.length

                        return (
                          <tr
                            key={
                              user.id
                            }
                            onClick={() =>
                              setSelectedUserId(
                                user.id,
                              )
                            }
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-primary/10 ring-1 ring-inset ring-primary/30'
                                : 'hover:bg-muted/30'
                            }`}
                          >
                            <td className="px-5 py-4 text-center">
                              <span
                                className={`inline-flex size-8 items-center justify-center rounded-lg text-xs font-semibold ${
                                  isSelected
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {index + 1}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation()

                                  setSelectedUserId(
                                    user.id,
                                  )
                                }}
                                className="text-right"
                              >
                                <p
                                  className={`font-semibold transition-colors ${
                                    isSelected
                                      ? 'text-primary'
                                      : 'text-foreground'
                                  }`}
                                >
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
                              </button>
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
                              <div className="flex items-center gap-2">
                                {firstPermissionId ? (
                                  <Badge variant="neutral">
                                    {getPermissionName(
                                      firstPermissionId,
                                    )}
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    لا توجد صلاحيات
                                  </span>
                                )}

                                {(sectionCount >
                                  0 ||
                                  permissionCount >
                                    1) && (
                                  <button
                                    type="button"
                                    onClick={(
                                      event,
                                    ) => {
                                      event.stopPropagation()

                                      setSelectedUserId(
                                        user.id,
                                      )

                                      setDetailsOpen(
                                        true,
                                      )
                                    }}
                                    className="text-xs font-medium text-primary hover:underline"
                                  >
                                    تفاصيل
                                  </button>
                                )}
                              </div>
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
                              <div
                                className="flex items-center gap-2"
                                onClick={(event) =>
                                  event.stopPropagation()
                                }
                              >
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() =>
                                    openEditForm(
                                      user,
                                    )
                                  }
                                  disabled={
                                    saving
                                  }
                                  className="border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                                >
                                  <Edit3 className="size-4" />
                                  تعديل
                                </Button>

                                {user.is_active ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() =>
                                      handleToggleActive(
                                        user,
                                      )
                                    }
                                    disabled={
                                      saving
                                    }
                                    className="border border-red-500/30 bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:text-red-400"
                                  >
                                    {saving ? (
                                      <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                      <Power className="size-4" />
                                    )}

                                    تعطيل
                                  </Button>
                                ) : (
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() =>
                                      handleToggleActive(
                                        user,
                                      )
                                    }
                                    disabled={
                                      saving
                                    }
                                    className="border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
                                  >
                                    {saving ? (
                                      <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                      <Power className="size-4" />
                                    )}

                                    تفعيل
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      },
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex min-h-14 items-center justify-between border-t bg-muted/20 px-5 py-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="size-4" />

                  <span>
                    عدد المستخدمين:
                  </span>

                  <span className="font-bold text-foreground">
                    {filteredUsers.length}
                  </span>

                  {search.trim() &&
                    users.length !==
                      filteredUsers.length && (
                      <span className="text-xs">
                        من أصل {users.length}
                      </span>
                    )}
                </div>

                {selectedUserId && (
                  <div className="flex items-center gap-2 text-xs text-primary">
                    <span>
                      تم تحديد مستخدم
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedUserId(
                          null,
                        )
                      }
                      className="rounded-md px-2 py-1 hover:bg-primary/10"
                    >
                      إلغاء التحديد
                    </button>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  {hasInternalScroll
                    ? 'مرر داخل الجدول لعرض بقية المستخدمين'
                    : 'جميع المستخدمين ظاهرون'}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ملاحظة:
          بقية الملف من عند نافذة التعديل الجانبية،
          ونوافذ التفاصيل، و CSS يبقى كما هو تمامًا
          في الملف الذي أرسلته. */}
    </div>
  )
}
