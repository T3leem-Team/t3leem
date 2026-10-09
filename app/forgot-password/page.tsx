‘use client’

import { useState } from ‘react’
import Link from ‘next/link’
import { supabase } from ‘@/lib/supabase/client’

export default function ForgotPasswordPage() {
const [email, setEmail] = useState(’’)
const [loading, setLoading] = useState(false)
const [message, setMessage] = useState(’’)
const [error, setError] = useState(’’)

async function handleSubmit(e: React.FormEvent) {
e.preventDefault()
setMessage(’’)
setError(’’)

const normalizedEmail = email.trim()
if (!normalizedEmail) {
  setError('يرجى إدخال البريد الإلكتروني.')
  return
}
setLoading(true)
try {
  const { error } = await supabase.auth.resetPasswordForEmail(
    normalizedEmail,
    {
      redirectTo: `${window.location.origin}/reset-password`,
    },
  )
  if (error) {
    setError('تعذر إرسال طلب الاستعادة. تأكد من البريد وحاول مرة أخرى.')
  } else {
    setMessage(
      'إذا كان البريد مرتبطًا بحساب، فستصلك رسالة لاستعادة كلمة المرور. تحقق من البريد الوارد والرسائل غير المرغوب فيها.',
    )
  }
} catch {
  setError('حدث خطأ غير متوقع. حاول مرة أخرى.')
} finally {
  setLoading(false)
}

}

return (
استعادة كلمة المرور
    <p className="mb-6 text-sm leading-6 text-gray-600">
      أدخل بريدك الإلكتروني المسجل في T3LEEM، وسنرسل لك رابطًا لاستعادة كلمة المرور.
    </p>
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">
          البريد الإلكتروني
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          className="w-full rounded-lg border border-gray-300 px-3 py-3 text-left outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>
      {message && (
        <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'جارٍ إرسال الطلب...' : 'إرسال رابط الاستعادة'}
      </button>
    </form>
    <div className="mt-6 text-center">
      <Link href="/login" className="text-sm font-medium text-blue-600 hover:underline">
        العودة إلى تسجيل الدخول
      </Link>
    </div>
  </div>
</main>

)
}
