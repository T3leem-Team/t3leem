'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  Check,
  ChevronDown,
  Loader2,
  Shield,
  UserRound,
  Users,
  X,
} from 'lucide-react'

import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type SystemElement = {
  id: string
  element_key: string
  element_name: string
  description: string | null
  section_name: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  userIds: string[]
}

type User = {
  id: string
  username: string
  full_name: string
  role: string
  department: string | null
  is_active: boolean
}

type LoadingAction = {
  elementId: string
  userId: string
} | null

const roleLabels: Record<
  string,
  string
> = {
  Admin: 'مدير النظام',
  Supervisor: 'مشرف',
  Teacher: 'معلم',
  'Payments Manager':
    'مدير المدفوعات',
}

export default function Page() {
  const [elements, setElements] =
    useState<SystemElement[]>([])

  const [users, setUsers] =
    useState<User[]>([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [saving, setSaving] =
    useState<LoadingAction>(null)

  const [openElementId, setOpenElementId] =
    useState<string | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')

      const response =
        await fetch(
          '/api/admin/system-elements',
          {
            method: 'GET',
            cache: 'no-store',
          },
        )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ??
            'تعذر تحميل عناصر النظام.',
        )
      }

      setElements(
        data.elements ?? [],
      )

      setUsers(
        data.users ?? [],
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'تعذر تحميل عناصر النظام.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const groupedElements =
    useMemo(() => {
      const groups =
        new Map<
          string,
          SystemElement[]
        >()

      for (const element of elements) {
        const section =
          element.section_name ||
          'عناصر النظام'

        const current =
          groups.get(section) ??
          []

        current.push(element)

        groups.set(
          section,
          current,
        )
      }

      return Array.from(
        groups.entries(),
      )
    }, [elements])

  const getAssignedUsers = (
    element: SystemElement,
  ) => {
    return users.filter(
      (user) =>
        element.userIds.includes(
          user.id,
        ),
    )
  }

  const toggleUser = async (
    element: SystemElement,
    user: User,
  ) => {
    const currentlyEnabled =
      element.userIds.includes(
        user.id,
      )

    setSaving({
      elementId: element.id,
      userId: user.id,
    })

    setError('')

    /*
     * تحديث الواجهة مباشرة
     * حتى تكون الاستجابة سريعة.
     */
    setElements(
      (current) =>
        current.map(
          (item) => {
            if (
              item.id !==
              element.id
            ) {
              return item
            }

            return {
              ...item,

              userIds:
                currentlyEnabled
                  ? item.userIds.filter(
                      (id) =>
                        id !==
                        user.id,
                    )
                  : Array.from(
                      new Set([
                        ...item.userIds,
                        user.id,
                      ]),
                    ),
            }
          },
        ),
    )

    try {
      const response =
        currentlyEnabled
          ? await fetch(
              '/api/admin/system-elements',
              {
                method:
                  'DELETE',

                headers: {
                  'Content-Type':
                    'application/json',
                },

                body: JSON.stringify({
                  elementId:
                    element.id,

                  userProfileId:
                    user.id,
                }),
              },
            )
          : await fetch(
              '/api/admin/system-elements',
              {
                method: 'POST',

                headers: {
                  'Content-Type':
                    'application/json',
                },

                body: JSON.stringify({
                  elementId:
                    element.id,

                  userProfileId:
                    user.id,
                }),
              },
            )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ??
            'تعذر حفظ التغيير.',
        )
      }
    } catch (err) {
      /*
       * إذا فشل الحفظ نرجع
       * الواجهة للحالة السابقة.
       */
      setElements(
        (current) =>
          current.map(
            (item) => {
              if (
                item.id !==
                element.id
              ) {
                return item
              }

              return {
                ...item,

                userIds:
                  currentlyEnabled
                    ? Array.from(
                        new Set([
                          ...item.userIds,
                          user.id,
                        ]),
                      )
                    : item.userIds.filter(
                        (id) =>
                          id !==
                          user.id,
                      ),
              }
            },
          ),
      )

      setError(
        err instanceof Error
          ? err.message
          : 'تعذر حفظ التغيير.',
      )
    } finally {
      setSaving(null)
    }
  }

  const enableAllForElement = async (
    element: SystemElement,
  ) => {
    const availableUsers =
      users.filter(
        (user) =>
          user.username !==
          'admin',
      )

    for (const user of availableUsers) {
      if (
        !element.userIds.includes(
          user.id,
        )
      ) {
        await toggleUser(
          element,
          user,
        )
      }
    }
  }

  const disableAllForElement = async (
    element: SystemElement,
  ) => {
    const assignedUsers =
      users.filter(
        (user) =>
          user.username !==
            'admin' &&
          element.userIds.includes(
            user.id,
          ),
      )

    for (const user of assignedUsers) {
      await toggleUser(
        element,
        user,
      )
    }
  }

  if (loading) {
    return (
      <div
        dir="rtl"
        className="space-y-6"
      >
        <PageHeader
          title="التحكم بعناصر النظام"
          description="التحكم في الأزرار والعناصر التي تظهر للمستخدمين."
        />

        <Card>
          <CardContent className="flex min-h-[300px] items-center justify-center">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>
                جاري تحميل عناصر النظام...
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div
      dir="rtl"
      className="space-y-6"
    >
      <PageHeader
        title="التحكم بعناصر النظام"
        description="حدد المستخدمين الذين يمكنهم استخدام الأزرار والعناصر الحساسة داخل صفحات النظام."
      />

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 py-4 text-red-700">
            <X className="h-5 w-5 shrink-0" />

            <span className="text-sm">
              {error}
            </span>

            <Button
              variant="outline"
              size="sm"
              className="mr-auto"
              onClick={() => {
                setError('')
                void loadData()
              }}
            >
              إعادة المحاولة
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-200">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100">
              <Shield className="h-5 w-5 text-slate-600" />
            </div>

            <div>
              <h2 className="font-semibold text-slate-900">
                تحكم خاص بعناصر الصفحات
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                هذه الصلاحيات مستقلة عن صلاحيات دخول
                الصفحات والأدوار. مدير النظام الأساسي
                فقط يستطيع تعديلها.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {groupedElements.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-[250px] flex-col items-center justify-center text-center">
            <Shield className="mb-3 h-10 w-10 text-slate-300" />

            <h3 className="font-semibold text-slate-800">
              لا توجد عناصر قابلة للتحكم
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              ستظهر هنا الأزرار والعناصر التي تتم
              إضافتها إلى نظام التحكم.
            </p>
          </CardContent>
        </Card>
      ) : (
        groupedElements.map(
          ([sectionName, sectionElements]) => (
            <div
              key={sectionName}
              className="space-y-3"
            >
              <div className="flex items-center gap-2 px-1">
                <div className="h-2 w-2 rounded-full bg-slate-400" />

                <h2 className="text-sm font-semibold text-slate-700">
                  {sectionName}
                </h2>
              </div>

              {sectionElements.map(
                (element) => {
                  const assignedUsers =
                    getAssignedUsers(
                      element,
                    )

                  const isOpen =
                    openElementId ===
                    element.id

                  const nonAdminUsers =
                    users.filter(
                      (user) =>
                        user.username !==
                        'admin',
                    )

                  const allEnabled =
                    nonAdminUsers.length >
                      0 &&
                    nonAdminUsers.every(
                      (user) =>
                        element.userIds.includes(
                          user.id,
                        ),
                    )

                  return (
                    <Card
                      key={element.id}
                      className="overflow-hidden border-slate-200"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpenElementId(
                            isOpen
                              ? null
                              : element.id,
                          )
                        }
                        className="flex w-full items-center gap-4 p-5 text-right transition hover:bg-slate-50"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                          <Shield className="h-5 w-5 text-slate-600" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-slate-900">
                              {element.element_name}
                            </h3>

                            <Badge variant="secondary">
                              {assignedUsers.length}{' '}
                              مستخدم
                            </Badge>
                          </div>

                          {element.description && (
                            <p className="mt-1 text-sm text-slate-500">
                              {element.description}
                            </p>
                          )}
                        </div>

                        <ChevronDown
                          className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${
                            isOpen
                              ? 'rotate-180'
                              : ''
                          }`}
                        />
                      </button>

                      {isOpen && (
                        <div className="border-t bg-slate-50/70 p-5">
                          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                              <Users className="h-4 w-4" />

                              المستخدمون المسموح لهم
                            </div>

                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={
                                  saving !==
                                  null ||
                                  allEnabled
                                }
                                onClick={() =>
                                  void enableAllForElement(
                                    element,
                                  )
                                }
                              >
                                <Check className="ml-1 h-4 w-4" />
                                تحديد الجميع
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={
                                  saving !==
                                  null ||
                                  assignedUsers.length ===
                                    0
                                }
                                onClick={() =>
                                  void disableAllForElement(
                                    element,
                                  )
                                }
                              >
                                <X className="ml-1 h-4 w-4" />
                                إلغاء الجميع
                              </Button>
                            </div>
                          </div>

                          {nonAdminUsers.length ===
                          0 ? (
                            <div className="rounded-xl border border-dashed bg-white p-8 text-center">
                              <UserRound className="mx-auto mb-2 h-8 w-8 text-slate-300" />

                              <p className="text-sm text-slate-500">
                                لا يوجد مستخدمون آخرون
                                حاليًا.
                              </p>
                            </div>
                          ) : (
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              {nonAdminUsers.map(
                                (user) => {
                                  const enabled =
                                    element.userIds.includes(
                                      user.id,
                                    )

                                  const isSaving =
                                    saving?.elementId ===
                                      element.id &&
                                    saving?.userId ===
                                      user.id

                                  return (
                                    <button
                                      key={
                                        user.id
                                      }
                                      type="button"
                                      disabled={
                                        saving !==
                                          null &&
                                        !isSaving
                                      }
                                      onClick={() =>
                                        void toggleUser(
                                          element,
                                          user,
                                        )
                                      }
                                      className={`flex items-center gap-3 rounded-xl border p-3 text-right transition ${
                                        enabled
                                          ? 'border-slate-300 bg-white shadow-sm'
                                          : 'border-slate-200 bg-white/60 hover:bg-white'
                                      }`}
                                    >
                                      <div
                                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                                          enabled
                                            ? 'bg-slate-900 text-white'
                                            : 'bg-slate-100 text-slate-400'
                                        }`}
                                      >
                                        {isSaving ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : enabled ? (
                                          <Check className="h-4 w-4" />
                                        ) : (
                                          <UserRound className="h-4 w-4" />
                                        )}
                                      </div>

                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-slate-800">
                                          {
                                            user.full_name
                                          }
                                        </p>

                                        <p className="mt-0.5 text-xs text-slate-500">
                                          {roleLabels[
                                            user
                                              .role
                                          ] ??
                                            user.role}
                                        </p>
                                      </div>
                                    </button>
                                  )
                                },
                              )}
                            </div>
                          )}

                          <div className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
                            <span className="font-medium text-slate-700">
                              ملاحظة:
                            </span>{' '}
                            حساب مدير النظام الأساسي
                            <span className="mx-1 font-medium">
                              admin
                            </span>
                            لديه هذه العناصر تلقائيًا
                            ولا يحتاج إلى إضافته هنا.
                          </div>
                        </div>
                      )}
                    </Card>
                  )
                },
              )}
            </div>
          ),
        )
      )}
    </div>
  )
}
