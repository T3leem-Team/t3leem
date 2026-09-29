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

export default function LoginPage() {
  const router = useRouter()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] =
    useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (loading) {
      return
    }

    setError('')

    const cleanUsername = username.trim()

    if (!cleanUsername || !password) {
      setError(
        'أدخل اسم المستخدم وكلمة المرور.',
      )
      return
    }

    setLoading(true)

    try {
      /*
       * --------------------------------------------------
       * 1. تسجيل الدخول
       * --------------------------------------------------
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
        await loginResponse
          .json()
          .catch(() => null)

      if (!loginResponse.ok) {
        setError(
          typeof loginData?.error === 'string'
            ? loginData.error
            : 'اسم المستخدم أو كلمة المرور غير صحيحة.',
        )

        return
      }

      /*
       * --------------------------------------------------
       * 2. جلب الأقسام المسموحة
       *
       * هذا الطلب يتم مرة واحدة أثناء تسجيل الدخول.
       * بعدها نخزن النتيجة مؤقتًا حتى لا يعيد
       * SectionRouter الطلب مرة ثانية.
       * --------------------------------------------------
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
        await sectionsResponse
          .json()
          .catch(() => null)

      if (!sectionsResponse.ok) {
        setError(
          typeof sectionsData?.error === 'string'
            ? sectionsData.error
            : 'تم تسجيل الدخول، لكن تعذر تحديد الصفحة الرئيسية.',
        )

        return
      }

      /*
       * --------------------------------------------------
       * 3. ترتيب الأقسام
       * --------------------------------------------------
       */

      const sections: DashboardSection[] =
        Array.isArray(
          sectionsData?.sections,
        )
          ? [...sectionsData.sections]
              .filter(
                (section) =>
                  section &&
                  typeof section.section_key ===
                    'string' &&
                  typeof section.href ===
                    'string',
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

      /*
       * --------------------------------------------------
       * 4. حفظ الصلاحيات
       * --------------------------------------------------
       */

      saveDashboardSections(sections)

      /*
       * --------------------------------------------------
       * 5. تحديد أول صفحة مسموحة
       * --------------------------------------------------
       */

      const firstSection = sections[0]

      const destination =
        typeof firstSection?.href ===
          'string' &&
        firstSection.href.trim()
          ? firstSection.href.trim()
          : '/'

      /*
       * --------------------------------------------------
       * 6. Preload بيانات الطلاب بالخلفية
       *
       * مهم:
       * لا نستخدم await هنا.
       *
       * يبدأ تحميل بيانات الطلاب مباشرة بعد نجاح
       * تسجيل الدخول، وفي نفس الوقت ننتقل للداشبورد.
       *
       * إذا المستخدم لا يملك صلاحية الطلاب، لن يتم
       * تنفيذ طلب بيانات الطلاب أساساً.
       * --------------------------------------------------
       */

      const canAccessStudents =
        sections.some(
          (section) =>
            section.href.trim() ===
              '/students' ||
            section.section_key ===
              'students',
        )

      if (canAccessStudents) {
        void import('@/lib/students-cache')
          .then(
            ({
              loadStudentsCache,
            }) =>
              loadStudentsCache(),
          )
          .catch((error) => {
            console.warn(
              'Students preload failed:',
              error,
            )
          })
      }

      /*
       * --------------------------------------------------
       * 7. الانتقال مباشرة
       *
       * لا ننتظر preload.
       * --------------------------------------------------
       */

      router.replace(destination)
    } catch (error) {
      console.error(
        'Login request error:',
        error,
      )

      setError(
        'تعذر الاتصال بالخادم. حاول مرة أخرى.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-background px-4 py-8"
    >
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
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
                disabled={loading}
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60"
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
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="أدخل كلمة المرور"
                  autoComplete="current-password"
                  disabled={loading}
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 pl-11 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (value) => !value,
                    )
                  }
                  disabled={loading}
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
                className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && (
                <Loader2 className="size-4 animate-spin" />
              )}

              {loading
                ? 'جارٍ تسجيل الدخول...'
                : 'دخول'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() =>
                  router.push('/forgot-password')
                }
                disabled={loading}
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