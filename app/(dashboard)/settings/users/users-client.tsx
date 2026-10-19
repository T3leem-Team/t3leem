'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { PageHeader } from '@/components/dashboard/page-header'

import UsersTable from './users-table'
import UsersForm, { type UsersFormData } from './users-form'
import UsersDetailsDialog from './users-details-dialog'

import type {
  DashboardSection,
  Permission,
  Role,
  RolePermission,
  User,
} from './users-types'

const EMPTY_FORM: UsersFormData = {
  username: '',
  email: '',
  fullName: '',
  department: '',
  password: '',
  role: 'Teacher',
  selectedPermissions: [],
  selectedSections: [],
}

export default function Page() {
  const [users, setUsers] = useState<User[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [dashboardSections, setDashboardSections] = useState<
    DashboardSection[]
  >([])
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [initialFormData, setInitialFormData] =
    useState<UsersFormData>(EMPTY_FORM)

  const [search, setSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const loadUsers = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      setError('')

      const response = await fetch('/api/admin/users', {
        method: 'GET',
        cache: 'no-store',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? 'تعذر تحميل المستخدمين.')
      }

      setUsers(data.users ?? [])
      setPermissions(data.permissions ?? [])
      setDashboardSections(data.dashboardSections ?? [])
      setRolePermissions(data.rolePermissions ?? [])
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'تعذر تحميل المستخدمين.',
      )
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  const getRolePermissionIds = useCallback(
    (role: Role): string[] =>
      Array.from(
        new Set(
          rolePermissions
            .filter((item) => item.role === role)
            .map((item) => item.permission_id),
        ),
      ),
    [rolePermissions],
  )

  const getEffectivePermissionIds = useCallback(
    (user: User): string[] =>
      Array.from(
        new Set([
          ...(user.rolePermissionIds ?? getRolePermissionIds(user.role)),
          ...(user.permissionIds ?? []),
        ]),
      ),
    [getRolePermissionIds],
  )

  const filteredUsers = useMemo(() => {
    const value = search.trim().toLowerCase()

    if (!value) return users

    return users.filter(
      (user) =>
        user.username.toLowerCase().includes(value) ||
        user.full_name.toLowerCase().includes(value) ||
        (user.email ?? '').toLowerCase().includes(value) ||
        (user.department ?? '').toLowerCase().includes(value),
    )
  }, [users, search])

  const selectedDetailsUser =
    users.find((user) => user.id === selectedUserId) ?? null

  function resetForm() {
    setShowForm(false)
    setEditingId(null)
    setInitialFormData(EMPTY_FORM)
    setError('')
  }

  function openAddForm() {
    setEditingId(null)
    setInitialFormData(EMPTY_FORM)
    setError('')
    setShowForm(true)
  }

  function openEditForm(user: User) {
    setEditingId(user.id)

    setInitialFormData({
      username: user.username,
      email: user.email ?? '',
      fullName: user.full_name,
      department: user.department ?? '',
      password: '',
      role: user.role,
      selectedPermissions: [...(user.permissionIds ?? [])],
      selectedSections: [...(user.sectionIds ?? [])],
    })

    setError('')
    setShowForm(true)
  }

  async function handleSave(form: UsersFormData) {
    if (!form.username.trim() && !editingId) {
      setError('اكتب اسم المستخدم.')
      return
    }

    if (!form.email.trim()) {
      setError('اكتب البريد الإلكتروني.')
      return
    }

    if (!form.fullName.trim()) {
      setError('اكتب الاسم الكامل.')
      return
    }

    if (!editingId && !form.password) {
      setError('اكتب كلمة المرور.')
      return
    }

    if (form.password && form.password.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل.')
      return
    }

    try {
      setSaving(true)
      setError('')

      const isEditing = editingId !== null
      const rolePermissionIds = getRolePermissionIds(form.role)

      const additionalPermissionIds = Array.from(
        new Set(
          form.selectedPermissions.filter(
            (id) => !rolePermissionIds.includes(id),
          ),
        ),
      )

      const body = isEditing
        ? {
            userId: editingId,
            email: form.email.trim().toLowerCase(),
            fullName: form.fullName.trim(),
            department: form.department.trim() || null,
            role: form.role,
            ...(form.password ? { password: form.password } : {}),
            permissionIds: additionalPermissionIds,
            sectionIds: form.selectedSections,
          }
        : {
            username: form.username.trim(),
            email: form.email.trim().toLowerCase(),
            fullName: form.fullName.trim(),
            department: form.department.trim() || null,
            password: form.password,
            role: form.role,
            permissionIds: additionalPermissionIds,
            sectionIds: form.selectedSections,
          }

      const response = await fetch('/api/admin/users', {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      await loadUsers(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(user: User) {
    const action = user.is_active ? 'تعطيل' : 'تفعيل'

    if (
      !window.confirm(
        `هل أنت متأكد من ${action} المستخدم "${user.full_name}"؟`,
      )
    ) {
      return
    }

    try {
      setSaving(true)
      setError('')

      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          department: user.department,
          isActive: !user.is_active,
          permissionIds: user.permissionIds ?? [],
          sectionIds: user.sectionIds ?? [],
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? `تعذر ${action} المستخدم.`)
      }

      await loadUsers(false)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `تعذر ${action} المستخدم.`,
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="المستخدمون والصلاحيات"
        description="إدارة حسابات المستخدمين والأدوار وأقسام النظام والصلاحيات التفصيلية."
      />

      {showForm ? (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-background/95 p-4 sm:p-8">
          <div className="mx-auto max-w-3xl rounded-xl border bg-background p-5 shadow-xl sm:p-8">
            {error && (
              <div className="mb-5 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <UsersForm
              key={editingId ?? 'new-user'}
              initialData={initialFormData}
              editing={editingId !== null}
              saving={saving}
              permissions={permissions}
              dashboardSections={dashboardSections.filter(
                (section) => section.is_active,
              )}
              rolePermissionIds={getRolePermissionIds(
                initialFormData.role,
              )}
              onSubmit={handleSave}
              onCancel={resetForm}
            />
          </div>
        </div>
      ) : (
        <>
          <UsersTable
            users={users}
            filteredUsers={filteredUsers}
            permissions={permissions}
            loading={loading}
            saving={saving}
            error={error}
            search={search}
            showForm={showForm}
            selectedUserId={selectedUserId}
            getEffectivePermissionIds={getEffectivePermissionIds}
            getRolePermissionIds={getRolePermissionIds}
            onSearchChange={setSearch}
            onAdd={openAddForm}
            onEdit={openEditForm}
            onToggleActive={handleToggleActive}
            onSelectUser={setSelectedUserId}
            onShowDetails={(userId) => {
              setSelectedUserId(userId)
              setDetailsOpen(true)
            }}
          />

          {detailsOpen && selectedDetailsUser && (
            <UsersDetailsDialog
              user={selectedDetailsUser}
              permissions={permissions}
              dashboardSections={dashboardSections}
              getEffectivePermissionIds={getEffectivePermissionIds}
              getRolePermissionIds={getRolePermissionIds}
              onClose={() => setDetailsOpen(false)}
            />
          )}
        </>
      )}
    </div>
  )
}
