'use client'

import { FormEvent, useState } from 'react'
import { Eye, EyeOff, GraduationCap, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setError('')

    if (!username.trim() || !password) {
      setError('أدخل اسم المستخدم وكلمة المرور.')
      return
    }

    setLoading(true)

    try {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('auth_user_id, username, full_name, role, is_active')
        .eq('username', username.trim())
        .maybeSingle()

      if (profileError) {
        console.error(profileError)
        setError('حدث خطأ أثناء التحقق من بيانات المستخدم.')
        return
      }

      if (!profile) {
        setError('اسم المستخدم أو كلمة المرور غير صحيحة.')
        return
      }

      if (!profile.is_active) {
        setError('هذا الحساب غير مفعل.')
        return
      }

      /*
       * Supabase Auth يحتاج البريد الإلكتروني عند تسجيل الدخول.
       * البريد مخفي عن المستخدم، ونأخذه من auth.users عبر السيرفر
       * في الخطوة التالية.
       *
       * مؤقتًا نوقف هنا حتى نضيف Route آمن لجلب البريد.
       */
      setError(
        'تم العثور على الحساب. باقي خطوة ربط تسجيل الدخول بـ Supabase Auth.',
      )
    } catch (error) {
      console.error(error)
      setError('حدث خطأ غير متوقع.')
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
                onChange={(event) => setUsername(event.target.value)}
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
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="أدخل كلمة المرور"
                  autoComplete="current-password"
                  disabled={loading}
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 pl-11 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
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

              {loading ? 'جارٍ التحقق...' : 'دخول'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => router.push('/forgot-password')}
                className="text-sm font-medium text-primary hover:underline"
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

