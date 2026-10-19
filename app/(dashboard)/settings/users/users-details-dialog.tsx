'use client'

import {
  Info,
  Shield,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

import type {
  User,
  Permission,
  DashboardSection,
  Role,
} from './users-types'

type UsersDetailsDialogProps = {
  user: User
  permissions: Permission[]
  dashboardSections: DashboardSection[]
  getEffectivePermissionIds: (user: User) => string[]
  getRolePermissionIds: (role: Role) => string[]
  onClose: () => void
}

export default function UsersDetailsDialog({
  user,
  permissions,
  dashboardSections,
  getEffectivePermissionIds,
  getRolePermissionIds,
  onClose,
}: UsersDetailsDialogProps) {
  const effectivePermissionIds =
    getEffectivePermissionIds(user)

  const sectionIds = user.sectionIds ?? []

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="إغلاق"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
      />

      <div
        dir="rtl"
        className="relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Shield className="size-5" />
            </div>

            <div>
              <h2 className="font-semibold">
                الصلاحيات والوصول
              </h2>

              <p className="mt-1 text-xs text-muted-foreground">
                {user.full_name}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* التفاصيل */}
        <div
          className="users-details-scroll flex-1 overflow-y-auto p-6"
          style={{
            scrollbarColor:
              'var(--primary) transparent',
          }}
        >
          <div className="space-y-6">
            {/* أقسام لوحة التحكم */}
            <section>
              <div className="mb-3 flex items-center gap-2">
                <Info className="size-4 text-primary" />

                <h3 className="font-semibold">
                  أقسام لوحة التحكم
                </h3>

                <Badge variant="neutral">
                  {sectionIds.length}
                </Badge>
              </div>

              {sectionIds.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  لا توجد أقسام مسندة لهذا المستخدم.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {sectionIds.map(
                    (sectionId, index) => {
                      const section =
                        dashboardSections.find(
                          (item) =>
                            item.id === sectionId,
                        )

                      return (
                        <div
                          key={sectionId}
                          className="rounded-xl border bg-muted/20 p-4"
                        >
                          <div className="flex items-start gap-3">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                              {index + 1}
                            </span>

                            <div className="min-w-0">
                              <p className="font-medium">
                                {section?.section_name ??
                                  sectionId}
                              </p>

                              {section?.description && (
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {section.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    },
                  )}
                </div>
              )}
            </section>

            {/* الصلاحيات */}
            <section>
              <div className="mb-3 flex items-center gap-2">
                <Shield className="size-4 text-primary" />

                <h3 className="font-semibold">
                  الصلاحيات
                </h3>

                <Badge variant="neutral">
                  {effectivePermissionIds.length}
                </Badge>
              </div>

              {effectivePermissionIds.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  لا توجد صلاحيات مسندة لهذا المستخدم.
                </div>
              ) : (
                <div className="space-y-3">
                  {effectivePermissionIds.map(
                    (permissionId, index) => {
                      const permission =
                        permissions.find(
                          (item) =>
                            item.id === permissionId,
                        )

                      const rolePermissionIds =
                        user.rolePermissionIds ??
                        getRolePermissionIds(user.role)

                      const isRolePermission =
                        rolePermissionIds.includes(
                          permissionId,
                        )

                      return (
                        <div
                          key={permissionId}
                          className="rounded-xl border bg-muted/20 p-4"
                        >
                          <div className="flex items-start gap-3">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                              {index + 1}
                            </span>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium">
                                  {permission?.permission_name ??
                                    permissionId}
                                </p>

                                <Badge
                                  variant={
                                    isRolePermission
                                      ? 'neutral'
                                      : 'success'
                                  }
                                >
                                  {isRolePermission
                                    ? 'من الدور'
                                    : 'إضافية'}
                                </Badge>
                              </div>

                              {permission?.description && (
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {permission.description}
                                </p>
                              )}

                              {permission?.permission_key && (
                                <p
                                  className="mt-2 text-xs text-muted-foreground"
                                  dir="ltr"
                                >
                                  {permission.permission_key}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    },
                  )}
                </div>
              )}
            </section>
          </div>
        </div>

        {/* Bottom */}
        <div className="flex items-center justify-between border-t bg-muted/20 px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{sectionIds.length} أقسام</span>

            <span>•</span>

            <span>
              {effectivePermissionIds.length} صلاحيات
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            إغلاق
          </Button>
        </div>
      </div>

      <style jsx>{`
        .users-details-scroll {
          direction: rtl;
          scrollbar-width: auto;
          scrollbar-color: var(--primary) transparent;
        }

        .users-details-scroll::-webkit-scrollbar {
          width: 12px;
          height: 12px;
        }

        .users-details-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .users-details-scroll::-webkit-scrollbar-thumb {
          background: var(--primary);
          border: 3px solid transparent;
          border-radius: 9999px;
          background-clip: padding-box;
        }

        .users-details-scroll::-webkit-scrollbar-thumb:hover {
          background: var(--primary);
          border: 2px solid transparent;
          background-clip: padding-box;
        }
      `}</style>
    </div>
  )
}
