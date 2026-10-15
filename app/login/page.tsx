'use client'

import { FormEvent, useState } from 'react'
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
import { getOrCreateDeviceKey } from '@/lib/device-key'

export default function LoginPage() {
  const router = useRouter()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [error, setError] = useState('')

  const isBusy = loading || redirecting

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

    const startedAt = performance.now()
    let lastTimingAt = startedAt

    const markTiming = (step: string) => {
      const now = performance.now()

      console.info(
        `[LOGIN PAGE TIMING] ${step}: ${Math.round(now - lastTimingAt)}ms | total: ${Math.round(now - startedAt)}ms`,
      )

      lastTimingAt = now
    }

    async function timedFetch(
      label: string,
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> {
      const requestStartedAt = performance.now()

      try {
        const response = await fetch(input, init)

        console.info(
          `[LOGIN FETCH] ${label}: ${Math.round(performance.now() - requestStartedAt)}ms | status: ${response.status}`,
        )

        return response
      } catch (fetchError) {
        console.info(
          `[LOGIN FETCH] ${label}: failed after ${Math.round(performance.now() - requestStartedAt)}ms`,
        )

        throw fetchError
      }
    }

    setLoading(true)

    try {
      /*
       * 1. تجهيز مفتاح الجهاز محليًا.
       * لا نستدعي مسار استعادة الجهاز.
       */
      let deviceKey:
        | Awaited<ReturnType<typeof getOrCreateDeviceKey>>
        | null = null

      try {
        const keyStartedAt = performance.now()

        deviceKey = await getOrCreateDeviceKey()

        console.info(
          `[LOGIN PAGE TIMING] getOrCreateDeviceKey: ${Math.round(performance.now() - keyStartedAt)}ms`,
        )
      } catch (keyError) {
        console.warn('Device key unavailable:', keyError)
      }

      markTiming('device key preparation')
      markTiming('device recovery skipped')

      /*
       * 2. تسجيل الدخول الأساسي.
       */
      const loginResponse = await timedFetch(
        'main login',
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

      markTiming('read main login response')

      if (!loginResponse.ok) {
        setError(
          typeof loginData?.error === 'string'
            ? loginData.error
            : 'اسم المستخدم أو كلمة المرور غير صحيحة.',
        )
        setLoading(false)
        markTiming('stop: main login failed')
        return
      }

      /*
       * 3. تسجيل مفتاح الجهاز إذا توفر.
       * تبقى آلية التسجيل الأصلية كما هي.
       */
      if (deviceKey) {
        try {
          const challengeResponse = await timedFetch(
            'device key registration challenge',
            '/api/auth/device-key',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              cache: 'no-store',
              body: JSON.stringify({
                action: 'challenge',
              }),
            },
          )

          if (challengeResponse.ok) {
            const challengeData =
              await challengeResponse.json()

            markTiming('read device registration challenge')

            if (
              typeof challengeData?.challenge === 'string'
            ) {
              const signingStartedAt = performance.now()

              const signature =
                await deviceKey.signChallenge(
                  challengeData.challenge,
                )

              console.info(
                `[LOGIN PAGE TIMING] sign registration challenge: ${Math.round(performance.now() - signingStartedAt)}ms`,
              )

              const registerResponse = await timedFetch(
                'device key registration',
                '/api/auth/device-key',
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  credentials: 'include',
                  cache: 'no-store',
                  body: JSON.stringify({
                    action: 'register',
                    publicKey: deviceKey.publicKey,
                    challenge: challengeData.challenge,
                    signature,
                  }),
                },
              )

              if (!registerResponse.ok) {
                console.warn(
                  'Device key registration failed.',
                )
              }

              markTiming('device key registration finished')
            }
          } else {
            console.warn(
              'Device key registration challenge failed.',
            )
          }
        } catch (keyError) {
          console.warn(
            'Device key registration unavailable:',
            keyError,
          )
        }

        markTiming('device key registration stage')
      } else {
        markTiming('device key registration skipped: no key')
      }

      /*
       * 4. تحميل أقسام لوحة التحكم.
       */
      const sectionsResponse = await timedFetch(
        'dashboard sections',
        '/api/auth/dashboard-sections',
        {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        },
      )

      const sectionsData =
        await sectionsResponse.json().catch(() => null)

      markTiming('read dashboard sections response')

      if (!sectionsResponse.ok) {
        setError(
          typeof sectionsData?.error === 'string'
            ? sectionsData.error
            : 'تم تسجيل الدخول، لكن تعذر تحديد الصفحة الرئيسية.',
        )
        setLoading(false)
        markTiming('stop: dashboard sections failed')
        return
      }

      const sections: DashboardSection[] =
        Array.isArray(sectionsData?.sections)
          ? [...sectionsData.sections]
              .filter(
                (section) =>
                  section &&
                  typeof section.section_key === 'string' &&
                  typeof section.href === 'string',
              )
              .sort(
                (
                  a: DashboardSection,
                  b: DashboardSection,
                ) =>
                  (a.sort_order ?? 0) -
                  (b.sort_order ?? 0),
              )
          : []

      const cacheStartedAt = performance.now()

      saveDashboardSections(sections)

      console.info(
        `[LOGIN PAGE TIMING] save dashboard sections cache: ${Math.round(performance.now() - cacheStartedAt)}ms`,
      )

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

      markTiming('start dashboard cache preloading')

      /*
       * 5. التوجيه إلى الصفحة الرئيسية المسموح بها.
       */
      setRedirecting(true)
      setLoading(false)

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve())
      })

      markTiming(`before router.replace: ${destination}`)

      router.replace(destination)

      markTiming('router.replace called')
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
      markTiming('login flow exception')
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
                    : 'bg-primary text-primary-foreground hover:opacity-90'
              }`}
            >
              {isBusy && (
                <Loader2 className="size-4 animate-spin" />
              )}

              {redirecting
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