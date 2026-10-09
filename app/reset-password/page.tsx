'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [ready, setReady] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function checkRecoverySession() {
      const { data, error } = await supabase.auth.getSession()

      if (!active) return

      if (error || !data.session) {
        setError(
          'رابط الاستعادة غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا.',
        )
        setReady(false)
      } else {
        setReady(true)
      }

      setChecking(false)
    }

    checkRecoverySession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return

      if (event === 'PASSWORD_RECOVERY' && session) {
        setReady(true)
        setError('')
        setChecking(false)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage('')
    setError('')

    if (!ready) {
      setError('رابط الاستعادة غير صالح أو انتهت صلاحيته.')
      return
    }

    if (password.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل.')
      return
    }

    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين.')
      return
    }

    setLoading(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) {
        setError(
          'تعذر تغيير كلمة المرور. قد يكون رابط الاستعادة منتهي الصلاحية؛ اطلب رابطًا جديدًا.',
        )
        return
      }

      setMessage('تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.')
      setPassword('')
      setConfirmPassword('')

      await supabase.auth.signOut()

      window.setTimeout(() => {
        router.replace('/login')
      }, 1500)
    } catch {
      setError('حدث خطأ غير متوقع. حاول مرة أخرى.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm sm:p-8">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          تعيين كلمة مرور جديدة
        </h1>

        <p className="mb-6 text-sm leading-6 text-gray-600">
          اختر كلمة مرور جديدة لحسابك في T3LEEM.
        </p>

        {checking ? (
          <p role="status" className="text-sm text-gray-600">
            جارٍ التحقق من رابط الاستعادة...
          </p>
        ) : (
          <>
            {message && (
              <p
                role="status"
                className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800"
              >
                {message}
              </p>
            )}

            {error && (
              <p
                role="alert"
                className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            {ready && !message && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    كلمة المرور الجديدة
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    تأكيد كلمة المرور
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'جارٍ تغيير كلمة المرور...' : 'حفظ كلمة المرور الجديدة'}
                </button>
              </form>
            )}

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                العودة إلى تسجيل الدخول
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
