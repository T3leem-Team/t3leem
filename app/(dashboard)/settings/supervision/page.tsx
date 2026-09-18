'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  ShieldCheck,
  Users,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'

import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type UserProfile = {
  id: string
  username: string
  full_name: string
  role: string
  department: string | null
  is_active: boolean
}

type Permission = {
  id: string
  name: string
  description: string | null
  is_active: boolean
}

type RolePermission = {
  id: string
  role: string
  permission_id: string
  can_view: boolean
  can_create: boolean
  can_update: boolean
  can_delete: boolean
}

const supervisionPermissions = [
  {
    key: 'supervision_view',
    name: 'عرض الإشراف',
    description: 'السماح بعرض قسم الإشراف وسجل الحالات.',
  },
  {
    key: 'supervision_create',
    name: 'إضافة سجل إشرافي',
    description:
      'السماح بتسجيل إلغاء الأيام والدروس وغياب وتأخر المعلمين والملاحظات.',
  },
  {
    key: 'supervision_update',
    name: 'تعديل السجلات',
    description: 'السماح بتعديل السجلات الإشرافية الموجودة.',
  },
  {
    key: 'supervision_delete',
    name: 'حذف السجلات',
    description: 'السماح بحذف السجلات الإشرافية.',
  },
] as const

function getRoleLabel(role: string) {
  switch (role) {
    case 'admin':
      return 'مدير النظام'
    case 'supervisor':
      return 'مشرف'
    case 'teacher':
      return 'معلم'
    default:
      return role || 'غير محدد'
  }
}

function getRoleBadgeVariant(role: string) {
  switch (role) {
    case 'admin':
      return 'default' as const
    case 'supervisor':
      return 'success' as const
    case 'teacher':
      return 'neutral' as const
    default:
      return 'neutral' as const
  }
}

export default function SupervisionSettingsPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [rolePermissions, setRolePermissions] = useState<
    RolePermission[]
  >([])

  const [selectedUserId, setSelectedUserId] = useState('')

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const supervisors = useMemo(
    () =>
      users.filter(
        (user) =>
          user.is_active &&
          (user.role === 'supervisor' ||
            user.role === 'admin'),
      ),
    [users],
  )

  const selectedUser = useMemo(
    () =>
      users.find(
        (user) => user.id === selectedUserId,
      ) ?? null,
    [users, selectedUserId],
  )

  const loadData = async () => {
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const [
        usersResult,
        permissionsResult,
        rolePermissionsResult,
      ] = await Promise.all([
        supabase
          .from('user_profiles')
          .select(
            'id, username, full_name, role, department, is_active',
          )
          .order('full_name', {
            ascending: true,
          }),

        supabase
          .from('permissions')
          .select(
            'id, name, description, is_active',
          )
          .eq('is_active', true)
          .order('name', {
            ascending: true,
          }),

        supabase
          .from('role_permissions')
          .select(
            'id, role, permission_id, can_view, can_create, can_update, can_delete',
          ),
      ])

      if (usersResult.error) {
        throw usersResult.error
      }

      if (permissionsResult.error) {
        throw permissionsResult.error
      }

      if (rolePermissionsResult.error) {
        throw rolePermissionsResult.error
      }

      setUsers(
        (usersResult.data ?? []) as UserProfile[],
      )

      setPermissions(
        (permissionsResult.data ?? []) as Permission[],
      )

      setRolePermissions(
        (rolePermissionsResult.data ??
          []) as RolePermission[],
      )

      const firstSupervisor =
        (usersResult.data ?? []).find(
          (user) =>
            user.is_active &&
            (user.role === 'supervisor' ||
              user.role === 'admin'),
        )

      setSelectedUserId(
        firstSupervisor?.id ?? '',
      )
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : 'تعذر تحميل إعدادات الإشراف.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const getPermissionByKey = (
    key: string,
  ) => {
    return permissions.find(
      (permission) =>
        permission.name === key,
    )
  }

  const getRolePermission = (
    permissionId: string,
    role: string,
  ) => {
    return rolePermissions.find(
      (item) =>
        item.permission_id === permissionId &&
        item.role === role,
    )
  }

  const saveSupervisorRole = async (
    userId: string,
  ) => {
    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const { error: updateError } =
        await supabase
          .from('user_profiles')
          .update({
            role: 'supervisor',
          })
          .eq('id', userId)

      if (updateError) {
        throw updateError
      }

      setUsers((current) =>
        current.map((user) =>
          user.id === userId
            ? {
                ...user,
                role: 'supervisor',
              }
            : user,
        ),
      )

      setSuccess(
        'تم منح المستخدم صلاحية المشرف.',
      )
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : 'تعذر حفظ صلاحية المشرف.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const removeSupervisorRole = async (
    userId: string,
  ) => {
    const user = users.find(
      (item) => item.id === userId,
    )

    if (!user || user.role !== 'supervisor') {
      return
    }

    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const { error: updateError } =
        await supabase
          .from('user_profiles')
          .update({
            role: 'teacher',
          })
          .eq('id', userId)

      if (updateError) {
        throw updateError
      }

      setUsers((current) =>
        current.map((item) =>
          item.id === userId
            ? {
                ...item,
                role: 'teacher',
              }
            : item,
        ),
      )

      setSuccess(
        'تم إلغاء صلاحية المشرف.',
      )
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : 'تعذر إلغاء صلاحية المشرف.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const activeSupervisors = supervisors.length

  return (
    <div className="space-y-6">
      <PageHeader
        title="إعدادات الإشراف"
        description="إدارة صلاحيات الإشراف والمستخدمين المسموح لهم بالوصول إلى أعمال الإشراف"
      />

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />

          <div>
            <p className="font-medium text-destructive">
              تعذر تنفيذ العملية
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              {error}
            </p>
          </div>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/20">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green-600" />

          <p className="text-sm text-green-700 dark:text-green-400">
            {success}
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </span>

            <div>
              <p className="text-sm text-muted-foreground">
                المشرفون الحاليون
              </p>

              <p className="mt-1 text-2xl font-bold tabular-nums">
                {activeSupervisors}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <span className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <Users className="size-5 text-muted-foreground" />
            </span>

            <div>
              <p className="text-sm text-muted-foreground">
                المستخدمون النشطون
              </p>

              <p className="mt-1 text-2xl font-bold tabular-nums">
                {
                  users.filter(
                    (user) => user.is_active,
                  ).length
                }
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <span className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <Eye className="size-5 text-muted-foreground" />
            </span>

            <div>
              <p className="text-sm text-muted-foreground">
                صلاحيات الإشراف
              </p>

              <p className="mt-1 text-2xl font-bold tabular-nums">
                {supervisionPermissions.length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            مستخدمو الإشراف
          </CardTitle>

          <p className="text-sm text-muted-foreground">
            حدد المستخدمين الذين لديهم دور مشرف للوصول
            إلى قسم الإشراف التشغيلي.
          </p>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map(
                (_, index) => (
                  <div
                    key={index}
                    className="h-16 animate-pulse rounded-lg bg-muted"
                  />
                ),
              )}
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-lg border p-8 text-center">
              <Users className="mx-auto size-8 text-muted-foreground" />

              <p className="mt-3 font-medium">
                لا يوجد مستخدمون
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                لم يتم العثور على مستخدمين في النظام.
              </p>
            </div>
          ) : (
            <div className="divide-y rounded-lg border">
              {users
                .filter(
                  (user) =>
                    user.is_active,
                )
                .map((user) => {
                  const isSupervisor =
                    user.role === 'supervisor'

                  const isAdmin =
                    user.role === 'admin'

                  return (
                    <div
                      key={user.id}
                      className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {(
                            user.full_name ||
                            user.username ||
                            '?'
                          )
                            .trim()
                            .charAt(0)}
                        </span>

                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {user.full_name ||
                              user.username}
                          </p>

                          <p className="mt-1 text-xs text-muted-foreground">
                            @{user.username}
                            {user.department
                              ? ` • ${user.department}`
                              : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={getRoleBadgeVariant(
                            user.role,
                          )}
                        >
                          {getRoleLabel(
                            user.role,
                          )}
                        </Badge>

                        {isAdmin ? (
                          <span className="text-xs text-muted-foreground">
                            المدير لديه صلاحيات النظام
                          </span>
                        ) : isSupervisor ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              removeSupervisorRole(
                                user.id,
                              )
                            }
                            disabled={isSaving}
                          >
                            إلغاء صلاحية المشرف
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              saveSupervisorRole(
                                user.id,
                              )
                            }
                            disabled={isSaving}
                          >
                            منح صلاحية المشرف
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            صلاحيات الإشراف
          </CardTitle>

          <p className="text-sm text-muted-foreground">
            الصلاحيات التي يتحكم بها النظام لقسم الإشراف
            التشغيلي.
          </p>
        </CardHeader>

        <CardContent>
          <div className="space-y-3">
            {supervisionPermissions.map(
              (permission) => (
                <div
                  key={permission.key}
                  className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-medium">
                      {permission.name}
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {permission.description}
                    </p>
                  </div>

                  <Badge variant="neutral">
                    إعداد صلاحية
                  </Badge>
                </div>
              ),
            )}
          </div>
        </CardContent>
      </Card>

      {selectedUser && (
        <Card>
          <CardHeader>
            <CardTitle>
              المستخدم المحدد
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium">
                  {selectedUser.full_name ||
                    selectedUser.username}
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  {getRoleLabel(
                    selectedUser.role,
                  )}
                </p>
              </div>

              <select
                value={selectedUserId}
                onChange={(event) =>
                  setSelectedUserId(
                    event.target.value,
                  )
                }
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none md:w-72"
              >
                {supervisors.map(
                  (supervisor) => (
                    <option
                      key={supervisor.id}
                      value={supervisor.id}
                    >
                      {supervisor.full_name ||
                        supervisor.username}
                    </option>
                  ),
                )}
              </select>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}