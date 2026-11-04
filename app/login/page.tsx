'use client'

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

import {
  saveDashboardSections,
  type DashboardSection,
} from '@/lib/dashboard-sections-cache'

type LogoutWindow = Window & {
  __t3leemLogoutPromise?: Promise<void>
}

export default function LoginPage() {
  const router = useRouter()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [logoutWaiting, setLogoutWaiting] = useState(false)
  const [error, setError] = useState('')

  const mountedRef = useRef(false)
  const logoutCheckRef = useRef(false)

  const isBusy = loading || redirecting || logoutWaiting

  /**
   * انتظار عملية الخروج إن كانت موجودة.
   * إذا لم توجد عملية خروج معلّقة، لا نضيف أي انتظار.
   */
  async function waitForPendingLogout(): Promise<boolean> {
    if (typeof window === 'undefined') {
      return true
    }

    const logoutWindow = window as LogoutWindow
    const pendingLogout = logoutWindow.__t3leemLogoutPromise

    if (!pendingLogout) {
      return true
    }

    setLogoutWaiting(true)
    setError('')

    try {
      await pendingLogout
      return true
    } catch (logoutError) {
      console.error(
        'Waiting for logout failed:',
        logoutError,
      )

      setError(
        'تعذر التأكد من اكتمال تسجيل الخروج. أعد المحاولة.',
      )

      return false
    } finally {
      setLogoutWaiting(false)
    }
  }

  /**
   * عند فتح صفحة الدخول عن طريق التنقل داخل التطبيق،
   * ننتظر عملية الخروج إذا كانت ما زالت معلّقة.
   */
  useEffect(() => {
    mountedRef.current = true

    if (!logoutCheckRef.current) {
      logoutCheckRef.current = true

      void waitForPendingLogout()
    }

    return () => {
      mountedRef.current = false
    }
  }, [])

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (isBusy) return

    setError('')

    const cleanUsername = username.trim()

    if (!cleanUsername || !password) {
      setError('أدخل اسم المستخدم وكلمة المرور.')
      return
    }

    /*
     * فحص أخير قبل إرسال طلب تسجيل الدخول.
     * هذا يمنع بدء تسجيل الدخول قبل اكتمال طلب الخروج
     * عندما تكون العملية محفوظة في النافذة الحالية.
     */
    const logoutFinished = await waitForPendingLogout()

    if (!logoutFinished) {
      return
    }

    if (!mountedRef.current) {
      return
    }

    setLoading(true)

    try {
      /*
       * 1. تسجيل الدخول الأساسي.
       */
      const loginResponse = await fetch(
        '/api/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          cache: 'no-store',
          body: JSON.stringify({
            username: cleanUsername,
            password,
          }),
        },
      )

      const loginData =
        await loginResponse.json().catch(() => null)

      if (!loginResponse.ok) {
        setError(
          typeof loginData?.error === 'string'
            ? loginData.error
            : 'اسم المستخدم أو كلمة المرور غير صحيحة.',
        )

        setLoading(false)
        return
      }

      /*
       * 2. تحميل أقسام لوحة التحكم.
       */
      const sectionsResponse = await fetch(
        '/api/auth/dashboard-sections',
        {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        },
      )

      const sectionsData =
        await sectionsResponse.json().catch(() => null)

      if (!sectionsResponse.ok) {
        setError(
          typeof sectionsData?.error === 'string'
            ? sectionsData.error
            : 'تم تسجيل الدخول، لكن تعذر تحديد الصفحة الرئيسية.',
        )

        setLoading(false)
        return
      }

          const sections: DashboardSection[] =
          Array.isArray(sectionsData?.sections)
            ? sectionsData.sections
                .filter((section: unknown): section is DashboardSection => {
                  if (
                    typeof section !== 'object' ||
                    section === null
                  ) {
                    return false
                  }
  
                  const item = section as Record<string, unknown>
  
                  return (
                    typeof item.id === 'string' &&
                    typeof item.section_key === 'string' &&
                    typeof item.section_name === 'string' &&
                    typeof item.href === 'string' &&
                    typeof item.sort_order === 'number' &&
                    Number.isFinite(item.sort_order) &&
                    (
                      item.icon === undefined ||
                      item.icon === null ||
                      typeof item.icon === 'string'
                    ) &&
                    (
                      item.description === undefined ||
                      item.description === null ||
                      typeof item.description === 'string'
                    )
                  )
                })
                .sort((a, b) => a.sort_order - b.sort_order)
            : []

      saveDashboardSections(sections)

      const firstSection = sections[0]

      const destination =
        typeof firstSection?.href === 'string' &&
        firstSection.href.trim()
          ? firstSection.href.trim()
          : '/'

      const canAccessStudents = sections.some(
        (section) =>
          section.href.trim() === '/students' ||
          section.section_key === 'students',
      )

      if (canAccessStudents) {
        void import('@/lib/students-cache')
          .then(({ loadStudentsCache }) =>
            loadStudentsCache(),
          )
          .catch((cacheError) => {
            console.warn(
              'Students preload failed:',
              cacheError,
            )
          })
      }

      const canAccessTeachers = sections.some(
        (section) =>
          section.href.trim() === '/teachers' ||
          section.section_key === 'teachers',
      )

      if (canAccessTeachers) {
        void import('@/lib/teachers-cache')
          .then(({ loadTeachersCache }) =>
            loadTeachersCache(),
          )
          .catch((cacheError) => {
            console.warn(
              'Teachers preload failed:',
              cacheError,
            )
          })
      }

      /*
       * 3. التوجيه إلى الصفحة الرئيسية المسموح بها.
       */
      setRedirecting(true)
      setLoading(false)

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve())
      })

      router.replace(destination)
    } catch (submitError) {
      console.error(
        'Login request error:',
        submitError,
      )

      setError(
        'تعذر الاتصال بالخادم. حاول مرة أخرى.',
      )

      setLoading(false)
      setRedirecting(false)
    }
  }

  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-background px-4 py-8"
    >
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-300 bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-col items-center text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <GraduationCap className="size-7" />
            </div>

            <h1 className="mt-5 text-2xl font-bold">
              تسجيل الدخول
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              نظام إدارة المدارس
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-5"
          >
            <div className="space-y-2">
              <label
                htmlFor="username"
                className="text-sm font-medium"
              >
                اسم المستخدم
              </label>

              <input
                id="username"
                type="text"
                value={username}
                onChange={(event) =>
                  setUsername(event.target.value)
                }
                placeholder="أدخل اسم المستخدم"
                autoComplete="username"
                disabled={isBusy}
                className="h-11 w-full rounded-lg border border-slate-400 bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium"
              >
                كلمة المرور
              </label>

              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="أدخل كلمة المرور"
                  autoComplete="current-password"
                  disabled={isBusy}
                  className="h-11 w-full rounded-lg border border-slate-400 bg-background px-3 pl-11 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((value) => !value)
                  }
                  disabled={isBusy}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none"
                  aria-label={
                    showPassword
                      ? 'إخفاء كلمة المرور'
                      : 'إظهار كلمة المرور'
                  }
                >
                  {showPassword ? (
                    <EyeOff className="size-5" />
                  ) : (
                    <Eye className="size-5" />
                  )}
                </button>
              </div>
            </div>

            {logoutWaiting && (
              <div
                role="status"
                className="flex items-center gap-2 rounded-lg border border-slate-300 bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground"
              >
                <Loader2 className="size-4 shrink-0 animate-spin" />
                جارٍ إكمال تسجيل الخروج السابق...
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isBusy}
              className={`flex h-11 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-all duration-300 disabled:cursor-not-allowed ${
                redirecting
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-700'
                  : loading
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/30 hover:bg-red-700'
                    : logoutWaiting
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-primary text-primary-foreground hover:opacity-90'
              }`}
            >
              {isBusy && (
                <Loader2 className="size-4 animate-spin" />
              )}

              {logoutWaiting
                ? 'انتظر اكتمال الخروج...'
                : redirecting
                  ? 'جارٍ فتح النظام...'
                  : loading
                    ? 'جارٍ تسجيل الدخول...'
                    : 'دخول'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => router.push('/forgot-password')}
                disabled={isBusy}
                className="text-sm font-medium text-primary hover:underline disabled:pointer-events-none disabled:opacity-60"
              >
                نسيت كلمة المرور؟
              </button>
            </div>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          جميع الحقوق محفوظة لنظام تعليم
        </p>
      </div>
    </main>
  )
}
