'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  Palette,
  Search,
  Sun,
  User,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type HeaderProps = {
  title: string
  onMenuClick?: () => void
  userName?: string
  userRole?: string
  onLogout?: () => void
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

const colorThemes = [
  {
    name: 'أزرق',
    value: 'blue',
    color: 'bg-blue-500',
  },
  {
    name: 'بنفسجي',
    value: 'violet',
    color: 'bg-violet-500',
  },
  {
    name: 'أخضر',
    value: 'green',
    color: 'bg-green-500',
  },
  {
    name: 'برتقالي',
    value: 'orange',
    color: 'bg-orange-500',
  },
  {
    name: 'وردي',
    value: 'rose',
    color: 'bg-rose-500',
  },
]

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()

  const diff = Math.max(0, now.getTime() - date.getTime())
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'الآن'

  if (minutes === 1) return 'قبل دقيقة'

  if (minutes < 60) {
    return `قبل ${minutes} دقائق`
  }

  if (hours === 1) return 'قبل ساعة'

  if (hours < 24) {
    return `قبل ${hours} ساعات`
  }

  if (days === 1) return 'أمس'

  if (days < 7) {
    return `قبل ${days} أيام`
  }

  return date.toLocaleDateString('ar-BH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function Header({
  title,
  onMenuClick,
  userName = 'المستخدم',
  userRole = 'مستخدم',
  onLogout,
}: HeaderProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loadingNotifications, setLoadingNotifications] = useState(false)

  const notificationsRef = useRef<HTMLDivElement>(null)

  const [darkMode, setDarkMode] = useState(false)
  const [showThemes, setShowThemes] = useState(false)

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')

    const isDark =
      savedTheme === 'dark' ||
      (!savedTheme &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)

    setDarkMode(isDark)

    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setNotificationsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  async function loadNotifications() {
    try {
      setLoadingNotifications(true)

      const { data: logs, error: logsError } = await supabase
        .from('auth_audit_logs')
        .select(`
          id,
          auth_user_id,
          event_type,
          success,
          created_at
        `)
        .eq('event_type', 'login_success')
        .eq('success', true)
        .order('created_at', { ascending: false })
        .limit(10)

      if (logsError) {
        console.error('Failed to load notifications:', logsError)
        setNotifications([])
        return
      }

      const auditLogs = (logs ?? []) as AuditLog[]

      if (auditLogs.length === 0) {
        setNotifications([])
        return
      }

      const userIds = [
        ...new Set(
          auditLogs
            .map((item) => item.auth_user_id)
            .filter(Boolean),
        ),
      ]

      if (userIds.length === 0) {
        setNotifications([])
        return
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select(`
          auth_user_id,
          username,
          full_name
        `)
        .in('auth_user_id', userIds)

      if (profilesError) {
        console.error('Failed to load notification users:', profilesError)

        setNotifications(
          auditLogs.map((log) => ({
            id: log.id,
            userName: 'مستخدم',
            username: '',
            createdAt: log.created_at,
          })),
        )

        return
      }

      const profileMap = new Map(
        (profiles ?? []).map((profile) => [
          profile.auth_user_id,
          {
            username: profile.username ?? '',
            full_name: profile.full_name ?? '',
          },
        ]),
      )

      const result: NotificationItem[] = auditLogs.map((log) => {
        const profile = profileMap.get(log.auth_user_id)

        return {
          id: log.id,
          userName:
            profile?.full_name ||
            profile?.username ||
            'مستخدم',
          username: profile?.username || '',
          createdAt: log.created_at,
        }
      })

      setNotifications(result)
    } catch (error) {
      console.error('Notifications error:', error)
      setNotifications([])
    } finally {
      setLoadingNotifications(false)
    }
  }

  function toggleDarkMode() {
    const next = !darkMode

    setDarkMode(next)

    document.documentElement.classList.toggle('dark', next)

    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  function changeColorTheme(value: string) {
    document.documentElement.setAttribute('data-theme', value)
    localStorage.setItem('color-theme', value)
    setShowThemes(false)
  }

  const initials =
    userName
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase() || 'U'

  return (
    <header className="relative z-50 flex h-16 w-full items-center justify-between border-b bg-background px-4 md:px-6">
      {/* الجانب الأيسر */}
      <div className="flex min-w-0 items-center gap-3">
        {onMenuClick && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="shrink-0"
          >
            <Menu className="size-5" />
          </Button>
        )}

        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">
            {title}
          </h1>
        </div>
      </div>

      {/* الجانب الأيمن */}
      <div className="flex shrink-0 items-center gap-1 md:gap-2">
        {/* البحث */}
        <div className="relative hidden md:block">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

          <input
            type="text"
            placeholder="بحث..."
            className="h-9 w-48 rounded-lg border bg-muted/30 pl-3 pr-9 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* الألوان */}
        <div className="relative">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowThemes((value) => !value)}
            title="الألوان"
          >
            <Palette className="size-5" />
          </Button>

          {showThemes && (
            <>
              <div
                className="fixed inset-0 z-[90]"
                onClick={() => setShowThemes(false)}
              />

              <div className="absolute left-0 top-full z-[100] mt-2 w-44 rounded-xl border bg-background p-2 shadow-2xl">
                <div className="mb-2 px-2 py-1 text-sm font-semibold">
                  لون الواجهة
                </div>

                {colorThemes.map((theme) => (
                  <button
                    key={theme.value}
                    type="button"
                    onClick={() => changeColorTheme(theme.value)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm transition hover:bg-muted"
                  >
                    <span
                      className={`size-4 rounded-full ${theme.color}`}
                    />

                    <span>{theme.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* الوضع الليلي */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleDarkMode}
          title={darkMode ? 'الوضع الفاتح' : 'الوضع الليلي'}
        >
          {darkMode ? (
            <Sun className="size-5" />
          ) : (
            <Moon className="size-5" />
          )}
        </Button>

        {/* الإشعارات */}
        <div
          ref={notificationsRef}
          className="relative z-[100]"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              const next = !notificationsOpen

              setNotificationsOpen(next)

              if (next) {
                loadNotifications()
              }
            }}
            title="الإشعارات"
            className="relative"
          >
            <Bell className="size-5" />

            {notifications.length > 0 && (
              <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive ring-2 ring-background" />
            )}
          </Button>

          {notificationsOpen && (
            <div
              className="
                absolute
                right-0
                top-full
                z-[9999]
                mt-2
                w-[360px]
                max-w-[calc(100vw-24px)]
                overflow-hidden
                rounded-xl
                border
                bg-background
                shadow-2xl
              "
            >
              {/* رأس النافذة */}
              <div className="border-b bg-background px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">
                      آخر النشاطات
                    </h3>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      آخر عمليات الدخول إلى النظام
                    </p>
                  </div>

                  <div className="flex size-9 items-center justify-center rounded-full bg-primary/10">
                    <Bell className="size-4 text-primary" />
                  </div>
                </div>
              </div>

              {/* المحتوى */}
              <div className="max-h-[420px] overflow-y-auto">
                {loadingNotifications ? (
                  <div className="flex items-center justify-center px-4 py-10">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />

                      <span>جاري تحميل النشاطات...</span>
                    </div>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
                      <Bell className="size-5 text-muted-foreground" />
                    </div>

                    <p className="text-sm font-medium">
                      لا توجد نشاطات
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      لا توجد عمليات دخول مسجلة حالياً
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="flex items-start gap-3 px-4 py-3 transition hover:bg-muted/50"
                      >
                        {/* الصورة */}
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {notification.userName
                            .trim()
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((part) => part.charAt(0))
                            .join('')
                            .toUpperCase() || 'U'}
                        </div>

                        {/* المعلومات */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-sm font-medium">
                              {notification.userName}
                            </p>

                            <span className="shrink-0 text-[11px] text-muted-foreground">
                              {formatRelativeTime(
                                notification.createdAt,
                              )}
                            </span>
                          </div>

                          {notification.username && (
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              @{notification.username}
                            </p>
                          )}

                          <p className="mt-1 text-xs text-muted-foreground">
                            سجل دخول إلى النظام
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* أسفل النافذة */}
              <div className="border-t bg-muted/20 px-4 py-2.5 text-center">
                <p className="text-[11px] text-muted-foreground">
                  يتم عرض آخر 10 عمليات دخول
                </p>
              </div>
            </div>
          )}
        </div>

        {/* المستخدم */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="ml-1 flex h-10 items-center gap-2 rounded-lg px-2"
            >
              <div className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {initials}
              </div>

              <div className="hidden text-right lg:block">
                <div className="max-w-32 truncate text-sm font-medium">
                  {userName}
                </div>

                <div className="max-w-32 truncate text-xs text-muted-foreground">
                  {userRole}
                </div>
              </div>

              <ChevronDown className="hidden size-4 lg:block" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-56"
          >
            <div className="flex items-center gap-3 px-2 py-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {initials}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {userName}
                </p>

                <p className="truncate text-xs text-muted-foreground">
                  {userRole}
                </p>
              </div>
            </div>

            <DropdownMenuSeparator />

            <DropdownMenuItem>
              <User className="ml-2 size-4" />
              الملف الشخصي
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={onLogout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="ml-2 size-4" />
              تسجيل الخروج
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}