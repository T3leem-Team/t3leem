'use client'

import { useState } from 'react'
import { ChevronDown, Loader2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { DashboardSection, Permission, Role } from './users-types'
import { roles } from './users-utils'

export type UsersFormData = {
  username: string
  email: string
  fullName: string
  department: string
  password: string
  role: Role
  selectedPermissions: string[]
  selectedSections: string[]
}

type UsersFormProps = {
  initialData: UsersFormData
  editing: boolean
  saving: boolean
  permissions: Permission[]
  dashboardSections: DashboardSection[]
  rolePermissionIds: string[]
  onSubmit: (data: UsersFormData) => void
  onCancel: () => void
}

export default function UsersForm({
  initialData,
  editing,
  saving,
  permissions,
  dashboardSections,
  rolePermissionIds,
  onSubmit,
  onCancel,
}: UsersFormProps) {
  const [form, setForm] = useState<UsersFormData>(initialData)
  const [openPermissions, setOpenPermissions] = useState(false)
  const [openSections, setOpenSections] = useState(false)

  function update<K extends keyof UsersFormData>(
    key: K,
    value: UsersFormData[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function togglePermission(id: string) {
    setForm((current) => ({
      ...current,
      selectedPermissions: current.selectedPermissions.includes(id)
        ? current.selectedPermissions.filter((item) => item !== id)
        : [...current.selectedPermissions, id],
    }))
  }

  function toggleSection(id: string) {
    setForm((current) => ({
      ...current,
      selectedSections: current.selectedSections.includes(id)
        ? current.selectedSections.filter((item) => item !== id)
        : [...current.selectedSections, id],
    }))
  }

  const extraPermissions = permissions.filter(
    (permission) => !rolePermissionIds.includes(permission.id),
  )

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">
            {editing ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            أدخل بيانات المستخدم وحدد دوره وصلاحياته.
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onCancel}
          aria-label="إغلاق النموذج"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit(form)
        }}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="user-full-name">
              الاسم الكامل *
            </label>
            <input
              id="user-full-name"
              required
              value={form.fullName}
              onChange={(event) => update('fullName', event.target.value)}
              placeholder="الاسم الكامل"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="user-username">
              اسم المستخدم *
            </label>
            <input
              id="user-username"
              required
              value={form.username}
              onChange={(event) => update('username', event.target.value)}
              placeholder="اسم المستخدم"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="user-email">
              البريد الإلكتروني *
            </label>
            <input
              id="user-email"
              type="email"
              required
              value={form.email}
              onChange={(event) => update('email', event.target.value)}
              placeholder="name@example.com"
              dir="ltr"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="user-department">
              القسم
            </label>
            <input
              id="user-department"
              value={form.department}
              onChange={(event) => update('department', event.target.value)}
              placeholder="القسم أو الإدارة"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="user-role">
              الدور الوظيفي *
            </label>
            <select
              id="user-role"
              value={form.role}
              onChange={(event) => update('role', event.target.value as Role)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {roles.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="user-password">
              كلمة المرور {editing ? '(اختياري)' : '*'}
            </label>
            <input
              id="user-password"
              type="password"
              required={!editing}
              minLength={8}
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => update('password', event.target.value)}
              placeholder={editing ? 'اتركها فارغة دون تغيير' : '8 أحرف على الأقل'}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">أقسام لوحة التحكم</div>
          <button
            type="button"
            onClick={() => setOpenSections((open) => !open)}
            className="flex min-h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <span>
              {form.selectedSections.length
                ? `تم تحديد ${form.selectedSections.length} قسم`
                : 'اختر الأقسام المتاحة للمستخدم'}
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${openSections ? 'rotate-180' : ''}`}
            />
          </button>

          {openSections && (
            <div className="max-h-60 space-y-2 overflow-y-auto rounded-md border p-3">
              {dashboardSections.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  لا توجد أقسام متاحة.
                </p>
              ) : (
                dashboardSections.map((section) => (
                  <label
                    key={section.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md p-2 hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={form.selectedSections.includes(section.id)}
                      onChange={() => toggleSection(section.id)}
                    />
                    <span className="text-sm">{section.section_name}</span>
                  </label>
                ))
              )}
            </div>
          )}

          {form.selectedSections.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {dashboardSections
                .filter((section) => form.selectedSections.includes(section.id))
                .map((section) => (
                  <Badge key={section.id} variant="secondary">
                    {section.section_name}
                  </Badge>
                ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">الصلاحيات الإضافية</div>
          <p className="text-xs text-muted-foreground">
            صلاحيات الدور تُطبق تلقائياً. يمكنك تحديد صلاحيات إضافية لهذا المستخدم.
          </p>

          <button
            type="button"
            onClick={() => setOpenPermissions((open) => !open)}
            className="flex min-h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <span>
              {form.selectedPermissions.length
                ? `تم تحديد ${form.selectedPermissions.length} صلاحية إضافية`
                : 'اختر الصلاحيات الإضافية'}
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${openPermissions ? 'rotate-180' : ''}`}
            />
          </button>

          {openPermissions && (
            <div className="max-h-60 space-y-2 overflow-y-auto rounded-md border p-3">
              {extraPermissions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  لا توجد صلاحيات إضافية للاختيار.
                </p>
              ) : (
                extraPermissions.map((permission) => (
                  <label
                    key={permission.id}
                    className="flex cursor-pointer items-start gap-2 rounded-md p-2 hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={form.selectedPermissions.includes(permission.id)}
                      onChange={() => togglePermission(permission.id)}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-medium">
                        {permission.permission_name}
                      </span>
                      {permission.description && (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {permission.description}
                        </span>
                      )}
                    </span>
                  </label>
                ))
              )}
            </div>
          )}

          {form.selectedPermissions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {permissions
                .filter((permission) =>
                  form.selectedPermissions.includes(permission.id),
                )
                .map((permission) => (
                  <Badge key={permission.id} variant="outline">
                    {permission.permission_name}
                  </Badge>
                ))}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={saving}
          >
            إلغاء
          </Button>
          <Button type="submit" disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving
              ? 'جاري الحفظ...'
              : editing
                ? 'حفظ التعديلات'
                : 'إضافة المستخدم'}
          </Button>
        </div>
      </form>
    </div>
  )
}
