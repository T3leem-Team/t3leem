'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  GraduationCap,
  X,
  LayoutDashboard,
  ShieldCheck,
  Eye,
  ClipboardList,
  Users,
  CreditCard,
  MessageCircle,
  Map,
  LogOut,
  ChevronUp,
  Loader2,
  Pencil,
} from 'lucide-react'

import { cn } from '@/lib/utils'

type DashboardSection = {
  id: string
  section_key: string
  section_name: string
  description?: string | null
  icon?: string | null
  href: string
  sort_order: number
}

type SchoolSettings = {
  id: number
  school_name: string
  school_subtitle: string
  updated_at?: string
}

type CurrentUser = {
  id: string
  username?: string | null
  full_name?: string | null
  email?: string | null
  role?: string | null
}

const DEFAULT_SCHOOL_NAME = 'تعليم'
const DEFAULT_SCHOOL_SUBTITLE = 'نظام إدارة المدارس'

let schoolSettingsCache: SchoolSettings | null = null

const iconMap = {
  LayoutDashboard,
  ShieldCheck,
  Eye,
  ClipboardList,
  GraduationCap,
  Users,
  CreditCard,
  MessageCircle,
  Map,
} as const

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function getUserInitials(user: CurrentUser | null) {
  const name =
    user?.full_name?.trim() ||
    user?.username?.trim() ||
    ''

  if (!name) {
    return 'م'
  }

  const parts = name.split(/\s+/).filter(Boolean)

  if (parts.length === 1) {
    return parts[0].charAt(0)
  }

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
}

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()

  const [sections, setSections] = useState<
    DashboardSection[]
  >([])

  const [loading, setLoading] = useState(true)

  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null)

  const [userLoading, setUserLoading] =
    useState(true)

  const [userMenuOpen, setUserMenuOpen] =
    useState(false)

  const [loggingOut, setLoggingOut] =
    useState(false)

  const [schoolSettings, setSchoolSettings] =
    useState<SchoolSettings>(
      schoolSettingsCache ?? {
        id: 1,
        school_name: DEFAULT_SCHOOL_NAME,
        school_subtitle:
          DEFAULT_SCHOOL_SUBTITLE,
      },
    )

  const [schoolDialogOpen, setSchoolDialogOpen] =
    useState(false)

  const [schoolName, setSchoolName] =
    useState(
      schoolSettingsCache?.school_name ??
        DEFAULT_SCHOOL_NAME,
    )

  const [schoolSubtitle, setSchoolSubtitle] =
    useState(
      schoolSettingsCache?.school_subtitle ??
        DEFAULT_SCHOOL_SUBTITLE,
    )

  const [savingSchoolSettings, setSavingSchoolSettings] =
    useState(false)

  const [schoolSettingsError, setSchoolSettingsError] =
    useState('')

  useEffect(() => {
    let cancelled = false

    async function loadCurrentUser() {
      try {
        const response = await fetch(
          '/api/auth/me',
          {
            method: 'GET',
            cache: 'no-store',
          },
        )

        if (!response.ok) {
          if (!cancelled) {
            setCurrentUser(null)
          }

          return
        }

        const data = await response.json()

        if (!cancelled) {
          setCurrentUser(
            data?.user ?? null,
          )
        }
      } catch (error) {
        console.error(
          'Load current user error:',
          error,
        )

        if (!cancelled) {
          setCurrentUser(null)
        }
      } finally {
        if (!cancelled) {
          setUserLoading(false)
        }
      }
    }

    loadCurrentUser()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadSections() {
      try {
        setLoading(true)

        const response = await fetch(
          '/api/auth/dashboard-sections',
          {
            method: 'GET',
            cache: 'no-store',
          },
        )

        if (!response.ok) {
          if (!cancelled) {
            setSections([])
          }

          return
        }

        const data = await response.json()

        if (!cancelled) {
          const loadedSections =
            Array.isArray(data.sections)
              ? data.sections
                  .slice()
                  .sort(
                    (
                      a: DashboardSection,
                      b: DashboardSection,
                    ) =>
                      a.sort_order -
                      b.sort_order,
                  )
              : []

          setSections(loadedSections)
        }
      } catch {
        if (!cancelled) {
          setSections([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadSections()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadSchoolSettings() {
      try {
        const response = await fetch(
          '/api/settings/school',
          {
            method: 'GET',
            cache: 'no-store',
          },
        )

        if (!response.ok) {
          return
        }

        const data = await response.json()

        if (
          !cancelled &&
          data?.settings
        ) {
          const settings: SchoolSettings =
            data.settings

          schoolSettingsCache = settings

          setSchoolSettings(settings)

          setSchoolName(
            settings.school_name,
          )

          setSchoolSubtitle(
            settings.school_subtitle,
          )
        }
      } catch {
        // الاحتفاظ بالقيم الافتراضية
      }
    }

    loadSchoolSettings()

    return () => {
      cancelled = true
    }
  }, [])

  function openSchoolSettings() {
    setSchoolName(
      schoolSettings.school_name,
    )

    setSchoolSubtitle(
      schoolSettings.school_subtitle,
    )

    setSchoolSettingsError('')
    setSchoolDialogOpen(true)
  }

  function closeSchoolSettings() {
    if (savingSchoolSettings) {
      return
    }

    setSchoolDialogOpen(false)
    setSchoolSettingsError('')

    setSchoolName(
      schoolSettings.school_name,
    )

    setSchoolSubtitle(
      schoolSettings.school_subtitle,
    )
  }

  async function saveSchoolSettings() {
    const trimmedName =
      schoolName.trim()

    const trimmedSubtitle =
      schoolSubtitle.trim()

    if (!trimmedName) {
      setSchoolSettingsError(
        'اسم المدرسة مطلوب.',
      )

      return
    }

    if (!trimmedSubtitle) {
      setSchoolSettingsError(
        'اسم النظام مطلوب.',
      )

      return
    }

    setSavingSchoolSettings(true)
    setSchoolSettingsError('')

    try {
      const response = await fetch(
        '/api/settings/school',
        {
          method: 'PUT',
          headers: {
            'Content-Type':
              'application/json',
          },
          cache: 'no-store',
          body: JSON.stringify({
            school_name: trimmedName,
            school_subtitle:
              trimmedSubtitle,
          }),
        },
      )

      let data: {
        settings?: SchoolSettings
        error?: string
      } = {}

      try {
        data = await response.json()
      } catch {
        data = {}
      }

      if (!response.ok) {
        setSchoolSettingsError(
          data.error ??
            'تعذر حفظ الإعدادات.',
        )

        return
      }

      if (!data.settings) {
        setSchoolSettingsError(
          'تم الحفظ لكن لم يتم استلام البيانات الجديدة.',
        )

        return
      }

      const updatedSettings =
        data.settings

      schoolSettingsCache =
        updatedSettings

      setSchoolSettings(
        updatedSettings,
      )

      setSchoolName(
        updatedSettings.school_name,
      )

      setSchoolSubtitle(
        updatedSettings.school_subtitle,
      )

      setSchoolDialogOpen(false)
    } catch (error) {
      console.error(
        'Save school settings error:',
        error,
      )

      setSchoolSettingsError(
        'حدث خطأ أثناء الحفظ. حاول مرة أخرى.',
      )
    } finally {
      setSavingSchoolSettings(false)
    }
  }

  async function handleLogout() {
    if (loggingOut) {
      return
    }

    setLoggingOut(true)

    try {
      const response = await fetch(
        '/api/auth/logout',
        {
          method: 'POST',
          cache: 'no-store',
        },
      )

      if (!response.ok) {
        console.error(
          'Logout request failed:',
          response.status,
        )
      }

      router.replace('/login')
      router.refresh()
    } catch (error) {
      console.error(
        'Logout error:',
        error,
      )

      router.replace('/login')
      router.refresh()
    }
  }

  const userName =
    currentUser?.full_name?.trim() ||
    currentUser?.username?.trim() ||
    'المستخدم'

  const userEmail =
    currentUser?.email?.trim() ||
    currentUser?.username?.trim() ||
    ''

  const userInitials =
    getUserInitials(currentUser)

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-hidden="true"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-72 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:static lg:translate-x-0',
          open
            ? 'translate-x-0'
            : 'translate-x-full',
        )}
      >
        {/* الشعار */}
        <div className="flex h-16 items-center justify-between gap-2 border-b border-sidebar-border px-5">
          <button
            type="button"
            onClick={openSchoolSettings}
            className="group flex min-w-0 items-center gap-2.5 text-right outline-none"
            title="إعدادات اسم المدرسة والنظام"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground transition-transform group-hover:scale-105">
              <GraduationCap className="size-5" />
            </span>

            <span className="flex min-w-0 flex-col leading-tight">
              <span className="flex items-center gap-1.5 text-lg font-bold tracking-tight">
                <span className="truncate">
                  {schoolSettings.school_name}
                </span>

                <Pencil className="size-3 shrink-0 text-sidebar-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" />
              </span>

              <span className="truncate text-[11px] text-sidebar-foreground/60">
                {
                  schoolSettings.school_subtitle
                }
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent lg:hidden"
            aria-label="إغلاق القائمة"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* القائمة الرئيسية */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <p className="px-3 pb-2 text-[11px] font-medium text-sidebar-foreground/50">
            القائمة الرئيسية
          </p>

          {loading ? (
            <div className="space-y-2 px-3 py-2">
              <div className="h-9 animate-pulse rounded-lg bg-sidebar-accent/50" />
              <div className="h-9 animate-pulse rounded-lg bg-sidebar-accent/50" />
              <div className="h-9 animate-pulse rounded-lg bg-sidebar-accent/50" />
            </div>
          ) : (
            sections.map((section) => {
              const active =
                isActive(
                  pathname,
                  section.href,
                )

              const Icon =
                iconMap[
                  section.icon as keyof typeof iconMap
                ] ??
                LayoutDashboard

              return (
                <Link
                  key={section.id}
                  href={section.href}
                  onClick={onClose}
                  aria-current={
                    active
                      ? 'page'
                      : undefined
                  }
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  )}
                >
                  <Icon className="size-[18px] shrink-0" />

                  <span>
                    {section.section_name}
                  </span>
                </Link>
              )
            })
          )}
        </nav>

        {/* المستخدم */}
        <div className="relative border-t border-sidebar-border p-4">
          {userMenuOpen && (
            <div className="absolute bottom-full right-4 left-4 mb-2 overflow-hidden rounded-xl border border-sidebar-border bg-sidebar shadow-lg">
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loggingOut ? (
                  <Loader2 className="size-[18px] animate-spin" />
                ) : (
                  <LogOut className="size-[18px]" />
                )}

                <span>
                  {loggingOut
                    ? 'جاري تسجيل الخروج...'
                    : 'تسجيل الخروج'}
                </span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() =>
              setUserMenuOpen(
                (current) => !current,
              )
            }
            aria-expanded={
              userMenuOpen
            }
            className="flex w-full items-center gap-3 rounded-lg bg-sidebar-accent/60 p-3 text-right transition-colors hover:bg-sidebar-accent"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sidebar-primary/20 text-sm font-semibold text-sidebar-primary-foreground">
              {userLoading
                ? '…'
                : userInitials}
            </span>

            <span className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="truncate text-sm font-semibold">
                {userLoading
                  ? 'جاري التحميل...'
                  : userName}
              </span>

              <span className="truncate text-[11px] text-sidebar-foreground/60">
                {userEmail}
              </span>
            </span>

            <ChevronUp
              className={cn(
                'size-4 shrink-0 text-sidebar-foreground/50 transition-transform',
                userMenuOpen &&
                  'rotate-180',
              )}
            />
          </button>
        </div>
      </aside>

      {/* نافذة إعدادات اسم المدرسة */}
      {schoolDialogOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="school-settings-title"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeSchoolSettings()
            }
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
            {/* رأس النافذة */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2
                  id="school-settings-title"
                  className="text-base font-bold"
                >
                  إعدادات اسم المدرسة
                </h2>

                <p className="mt-1 text-xs text-muted-foreground">
                  تعديل الاسم الذي يظهر في الشريط الجانبي.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeSchoolSettings
                }
                disabled={
                  savingSchoolSettings
                }
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                aria-label="إغلاق"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* الحقول */}
            <div className="space-y-5 p-5">
              <div className="space-y-2">
                <label
                  htmlFor="school-name"
                  className="text-sm font-medium"
                >
                  اسم المدرسة
                </label>

                <input
                  id="school-name"
                  type="text"
                  value={schoolName}
                  onChange={(event) =>
                    setSchoolName(
                      event.target.value,
                    )
                  }
                  maxLength={100}
                  disabled={
                    savingSchoolSettings
                  }
                  placeholder="مثال: تعليم"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="school-subtitle"
                  className="text-sm font-medium"
                >
                  اسم النظام
                </label>

                <input
                  id="school-subtitle"
                  type="text"
                  value={schoolSubtitle}
                  onChange={(event) =>
                    setSchoolSubtitle(
                      event.target.value,
                    )
                  }
                  maxLength={150}
                  disabled={
                    savingSchoolSettings
                  }
                  placeholder="مثال: نظام إدارة المدارس"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              {schoolSettingsError && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                  {schoolSettingsError}
                </div>
              )}
            </div>

            {/* الأزرار */}
            <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-5 py-4">
              <button
                type="button"
                onClick={
                  closeSchoolSettings
                }
                disabled={
                  savingSchoolSettings
                }
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={
                  saveSchoolSettings
                }
                disabled={
                  savingSchoolSettings
                }
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingSchoolSettings && (
                  <Loader2 className="size-4 animate-spin" />
                )}

                {savingSchoolSettings
                  ? 'جاري الحفظ...'
                  : 'حفظ التغييرات'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}