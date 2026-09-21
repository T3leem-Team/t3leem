'use client'

export function PaymentsView() {
  return (
    <div
      dir="rtl"
      className="p-8"
    >
      <div className="rounded-2xl border-2 border-red-500 bg-red-50 p-10">
        <h1 className="text-3xl font-bold text-red-700">
          اختبار PaymentsView
        </h1>

        <p className="mt-4 text-lg text-red-600">
          الإدارة الشخصية تعمل — هذا الاختبار داخل
          payments-view.tsx مباشرة.
        </p>

        <div className="mt-6 rounded-xl bg-white p-6">
          إذا ظهر هذا النص، فالملف يتم تحميله بشكل صحيح.
        </div>
      </div>
    </div>
  )
}