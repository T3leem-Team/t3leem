'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  Check,
  Menu,
  Search,
  Bell,
  Palette,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react'
import { navItems } from '@/lib/nav'
import { supabase } from '@/lib/supabase'

function currentTitle(pathname: string) {
  const match = navItems.find((item) =>
    item.href === '/'
      ? pathname === '/'
      : pathname.startsWith(item.href),
  )

  return match?.title ?? 'تعليم'
}

const themes = [
  {
    name: 'أخضر',
    value: 'green',
    light: 'oklch(0.52 0.09 155)',
    dark: 'oklch(0.65 0.11 155)',
  },
  {
    name: 'أزرق',
    value: 'blue',
    light: 'oklch(0.52 0.13 250)',
    dark: 'oklch(0.68 0.14 250)',
  },
  {
    name: 'بنفسجي',
    value: 'purple',
    light: 'oklch(0.52 0.13 290)',
    dark: 'oklch(0.68 0.14 290)',
  },
  {
    name: 'برتقالي',
    value: 'orange',
    light: 'oklch(0.62 0.15 55)',
    dark: 'oklch(0.72 0.16 55)',
  },
  {
    name: 'أحمر',
    value: 'red',
    light: 'oklch(0.55 0.18 25)',
    dark: 'oklch(0.68 0.18 25)',
  },
  {
    name: 'وردي',
    value: 'pink',
    light: 'oklch(0.58 0.15 350)',
    dark: 'oklch(0.7 0.16 350)',
  },
]

type UserProfile = {
  username: string
  full_name: string
  role: string
}

type AuditLog = {
  id: string
  auth_user_id: string
  event_type: string
  success: boolean
  created_at: string
}

type NotificationItem = {
  id: string
  userName: string
  username: string
  createdAt: string
}

function getInitials(name: string) {
  const cleanName = name.trim()

  if (!cleanName) {
    return 'م أ'
  }

  const words = cleanName.split(/\s+/)

  if (words.length === 1) {
    return words[0].slice(0, 2)
  }

  return `${words[0][0]}${words[1][0]}`
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()

  const diffSeconds = Math.floor(
    (now.getTime() - date.getTime()) / 1000,
  )

  if (diffSeconds < 60) {
    return 'الآن'
  }

  const minutes = Math.floor(
    diffSeconds / 60,
  )

  if (minutes < 60) {
    return minutes === 1
      ? 'قبل دقيقة'
      : `قبل ${minutes} دقائق`
  }

  const hours = Math.floor(
    minutes / 60,
  )

  if (hours < 24) {
    return hours === 1
      ? 'قبل ساعة'
      : `قبل ${hours} ساعات`
  }

  const days = Math.floor(
    hours / 24,
  )

  if (days === 1) {
    return 'أمس'
  }

  if (days < 7) {
    return `قبل ${days} أيام`
  }

  return date.toLocaleDateString(
    'ar-BH',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    },
  )
}

export function Header({
  onMenuClick,
}: {
  onMenuClick: () => void
}) {
  const pathname = usePathname()

  const [open, setOpen] = useState(false)
  const [profileOpen, setProfileOpen] =
    useState(false)
  const [notificationsOpen, setNotificationsOpen] =
    useState(false)

  const [mode, setMode] =
    useState<'light' | 'dark'>('light')

  const [theme, setTheme] = useState('green')

  const [profile, setProfile] =
    useState<UserProfile | null>(null)

  const [loadingProfile, setLoadingProfile] =
    useState(true)

  const [notifications, setNotifications] =
    useState<NotificationItem[]>([])

  const [loadingNotifications, setLoadingNotifications] =
    useState(false)

  const menuRef =
    useRef<HTMLDivElement>(null)

  const profileRef =
    useRef<HTMLDivElement>(null)

  const notificationsRef =
    useRef<HTMLDivElement>(null)

  useEffect(() => {
    const savedMode =
      localStorage.getItem('t3leem-mode')

    const savedTheme =
      localStorage.getItem('t3leem-theme')

    const initialMode =
      savedMode === 'dark'
        ? 'dark'
        : 'light'

    const initialTheme =
      themes.some(
        (item) => item.value === savedTheme,
      )
        ? savedTheme!
        : 'green'

    setMode(initialMode)
    setTheme(initialTheme)

    applyTheme(
      initialMode,
      initialTheme,
    )
  }, [])

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoadingProfile(true)

        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setProfile(null)
          return
        }

        const { data, error } =
          await supabase
            .from('user_profiles')
            .select(
              'username, full_name, role',
            )
            .eq(
              'auth_user_id',
              user.id,
            )
            .maybeSingle()

        if (error) {
          console.error(
            'Profile load error:',
            error,
          )

          return
        }

        if (data) {
          setProfile(data)
        }
      } catch (error) {
        console.error(
          'Profile request error:',
          error,
        )
      } finally {
        setLoadingProfile(false)
      }
    }

    loadProfile()
  }, [])

  async function loadNotifications() {
    try {
      setLoadingNotifications(true)

      const { data: logs, error: logsError } =
        await supabase
          .from('auth_audit_logs')
          .select(
            `
            id,
            auth_user_id,
            event_type,
            success,
            created_at
            `,
          )
          .eq(
            'event_type',
            'login_success',
          )
          .eq(
            'success',
            true,
          )
          .order(
            'created_at',
            {
              ascending: false,
            },
          )
          .limit(10)

      if (logsError) {
        console.error(
          'Notifications load error:',
          logsError,
        )

        setNotifications([])
        return
      }

      if (!logs || logs.length === 0) {
        setNotifications([])
        return
      }

      const userIds = [
        ...new Set(
          logs.map(
            (log: AuditLog) =>
              log.auth_user_id,
          ),
        ),
      ]

      const {
        data: profiles,
        error: profilesError,
      } =
        await supabase
          .from('user_profiles')
          .select(
            `
            auth_user_id,
            username,
            full_name
            `,
          )
          .in(
            'auth_user_id',
            userIds,
          )

      if (profilesError) {
        console.error(
          'Notification profiles load error:',
          profilesError,
        )
      }

      const profileMap =
        new Map<
          string,
          {
            username: string
            full_name: string
          }
        >()

      ;(profiles ?? []).forEach(
        (item) => {
          profileMap.set(
            item.auth_user_id,
            {
              username:
                item.username,
              full_name:
                item.full_name,
            },
          )
        },
      )

      const items: NotificationItem[] =
        logs.map(
          (log: AuditLog) => {
            const userProfile =
              profileMap.get(
                log.auth_user_id,
              )

            return {
              id: log.id,
              userName:
                userProfile?.full_name ||
                userProfile?.username ||
                'مستخدم',
              username:
                userProfile?.username ||
                '',
              createdAt:
                log.created_at,
            }
          },
        )

      setNotifications(items)
    } catch (error) {
      console.error(
        'Notifications request error:',
        error,
      )

      setNotifications([])
    } finally {
      setLoadingNotifications(false)
    }
  }

  useEffect(() => {
    function handleClickOutside(
      event: MouseEvent,
    ) {
      const target =
        event.target as Node

      if (
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setOpen(false)
      }

      if (
        profileRef.current &&
        !profileRef.current.contains(
          target,
        )
      ) {
        setProfileOpen(false)
      }

      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(
          target,
        )
      ) {
        setNotificationsOpen(false)
      }
    }

    document.addEventListener(
      'mousedown',
      handleClickOutside,
    )

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside,
      )
    }
  }, [])

  function applyTheme(
    selectedMode: 'light' | 'dark',
    selectedTheme: string,
  ) {
    const selected = themes.find(
      (item) =>
        item.value === selectedTheme,
    )

    if (!selected) {
      return
    }

    const root =
      document.documentElement

    root.classList.toggle(
      'dark',
      selectedMode === 'dark',
    )

    root.classList.toggle(
      'light',
      selectedMode === 'light',
    )

    const primary =
      selectedMode === 'dark'
        ? selected.dark
        : selected.light

    root.style.setProperty(
      '--primary',
      primary,
    )

    root.style.setProperty(
      '--ring',
      primary,
    )

    root.style.setProperty(
      '--sidebar-primary',
      primary,
    )

    root.style.setProperty(
      '--sidebar-ring',
      primary,
    )

    root.style.setProperty(
      '--chart-1',
      primary,
    )

    root.style.setProperty(
      '--secondary',
      selectedMode === 'dark'
        ? 'oklch(0.30 0.03 200)'
        : 'oklch(0.95 0.02 185)',
    )
  }

  function changeMode(
    nextMode: 'light' | 'dark',
  ) {
    setMode(nextMode)

    localStorage.setItem(
      't3leem-mode',
      nextMode,
    )

    applyTheme(
      nextMode,
      theme,
    )
  }

  function changeTheme(
    nextTheme: string,
  ) {
    setTheme(nextTheme)

    localStorage.setItem(
      't3leem-theme',
      nextTheme,
    )

    applyTheme(
      mode,
      nextTheme,
    )
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      })
    } catch (error) {
      console.error(
        'Logout request error:',
        error,
      )
    } finally {
      window.location.href = '/login'
    }
  }

  const displayName =
    profile?.full_name ||
    profile?.username ||
    'مدير النظام'

  const initials =
    getInitials(displayName)

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden"
        aria-label="فتح القائمة"
      >
        <Menu className="size-5" />
      </button>

      <h1 className="text-base font-semibold md:text-lg">
        {currentTitle(pathname)}
      </h1>

      <div className="relative mr-auto hidden md:block">
        <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

        <input
          type="search"
          placeholder="بحث عن طالب، معلم، طلب..."
          className="h-9 w-64 rounded-lg border border-border bg-card pr-9 pl-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
        />
      </div>

      <div
        ref={menuRef}
        className="relative"
      >
        <button
          type="button"
          onClick={() =>
            setOpen(
              (value) => !value,
            )
          }
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="تخصيص المظهر"
          aria-expanded={open}
        >
          <Palette className="size-5" />
        </button>

        {open && (
          <div className="absolute left-0 top-full mt-2 w-64 rounded-xl border border-border bg-card p-4 shadow-lg">
            <div>
              <p className="text-sm font-semibold">
                مظهر التطبيق
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                اختر الوضع واللون الأساسي
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  changeMode('light')
                }
                className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  mode === 'light'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:bg-muted'
                }`}
              >
                <Sun className="size-4" />
                نهاري

                {mode === 'light' && (
                  <Check className="size-3.5" />
                )}
              </button>

              <button
                type="button"
                onClick={() =>
                  changeMode('dark')
                }
                className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  mode === 'dark'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:bg-muted'
                }`}
              >
                <Moon className="size-4" />
                دارك

                {mode === 'dark' && (
                  <Check className="size-3.5" />
                )}
              </button>
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <p className="mb-3 text-xs font-medium text-muted-foreground">
                اللون الأساسي
              </p>

              <div className="grid grid-cols-6 gap-2">
                {themes.map((item) => {
                  const selected =
                    theme === item.value

                  const color =
                    mode === 'dark'
                      ? item.dark
                      : item.light

                  return (
                    <button
                      key={item.value}
                      type="button"
                      title={item.name}
                      onClick={() =>
                        changeTheme(
                          item.value,
                        )
                      }
                      className={`relative flex size-9 items-center justify-center rounded-full border-2 transition-transform hover:scale-110 ${
                        selected
                          ? 'border-foreground'
                          : 'border-transparent'
                      }`}
                      style={{
                        backgroundColor:
                          color,
                      }}
                      aria-label={
                        item.name
                      }
                    >
                      {selected && (
                        <Check className="size-4 text-white drop-shadow" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div
        ref={notificationsRef}
        className="relative"
      >
        <button
          type="button"
          onClick={() => {
            const next =
              !notificationsOpen

            setNotificationsOpen(next)

            if (next) {
              loadNotifications()
            }
          }}
          className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="الإشعارات"
          aria-expanded={
            notificationsOpen
          }
        >
          <Bell className="size-5" />

          {notifications.length > 0 && (
            <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive ring-2 ring-background" />
          )}
        </button>

        {notificationsOpen && (
          <div className="absolute left-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-card shadow-lg">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold">
                آخر النشاطات
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                آخر عمليات الدخول إلى النظام
              </p>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loadingNotifications ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  جاري تحميل النشاطات...
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  لا توجد عمليات دخول مسجلة.
                </div>
              ) : (
                notifications.map(
                  (item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {getInitials(
                          item.userName,
                        )}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {item.userName}
                        </p>

                        <p className="mt-0.5 text-xs text-muted-foreground">
                          سجل دخول إلى النظام
                        </p>
                      </div>

                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {formatRelativeTime(
                          item.createdAt,
                        )}
                      </span>
                    </div>
                  ),
                )
              )}
            </div>

            {notifications.length > 0 && (
              <div className="border-t border-border px-4 py-2.5">
                <p className="text-center text-xs text-muted-foreground">
                  يتم عرض آخر 10 عمليات دخول
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Profile */}
      <div
        ref={profileRef}
        className="relative"
      >
        <button
          type="button"
          onClick={() =>
            setProfileOpen(
              (value) => !value,
            )
          }
          className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-muted"
          aria-label="حساب المستخدم"
          aria-expanded={profileOpen}
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {loadingProfile
              ? '...'
              : initials}
          </span>

          <div className="hidden text-right lg:block">
            <p className="max-w-32 truncate text-sm font-medium">
              {loadingProfile
                ? 'جارٍ التحميل...'
                : displayName}
            </p>

            <p className="text-xs text-muted-foreground">
              {profile?.role ||
                'Admin'}
            </p>
          </div>
        </button>

        {profileOpen && (
          <div className="absolute left-0 top-full mt-2 w-64 rounded-xl border border-border bg-card p-3 shadow-lg">
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {initials}
              </span>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {displayName}
                </p>

                <p className="truncate text-xs text-muted-foreground">
                  @{profile?.username ||
                    'admin'}
                </p>

                <p className="mt-0.5 text-xs text-muted-foreground">
                  {profile?.role ||
                    'Admin'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="size-4" />
              تسجيل الخروج
            </button>
          </div>
        )}
      </div>
    </header>
  )
}