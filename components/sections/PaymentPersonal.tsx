'use client'

import { useEffect, useState } from 'react'

export function PaymentPersonal() {
  const [message, setMessage] = useState(
    'جاري تحميل الإدارة الشخصية...',
  )

  useEffect(() => {
    setMessage('الإدارة الشخصية تعمل بشكل صحيح')
  }, [])

  return (
    <div
      dir="rtl"
      className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm"
    >
      <h2 className="text-2xl font-bold text-slate-900">
        الإدارة الشخصية
      </h2>

      <p className="mt-3 text-sm text-slate-500">
        {message}
      </p>

      <div className="mt-6 rounded-xl bg-slate-50 p-5">
        <div className="text-sm font-semibold text-slate-700">
          اختبار القسم
        </div>

        <div className="mt-2 text-sm text-slate-500">
          إذا ظهر هذا المربع، فهذا يعني أن قسم
          الإدارة الشخصية يتم تحميله بشكل صحيح.
        </div>
      </div>
    </div>
  )
}