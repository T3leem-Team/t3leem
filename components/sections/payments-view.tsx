'use client'

import { useState } from 'react'

type Section = 'students' | 'financial' | 'personal'

export function PaymentsView() {
  const [activeSection, setActiveSection] =
    useState<Section>('students')

  return (
    <div dir="rtl" className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">
        المدفوعات
      </h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <button
          type="button"
          onClick={() => setActiveSection('financial')}
          className="rounded-2xl border p-6 text-right hover:bg-gray-50"
        >
          <div className="text-lg font-bold">
            إدارة المالية
          </div>
          <div className="mt-2 text-sm text-gray-500">
            اختبار
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('students')}
          className="rounded-2xl border p-6 text-right hover:bg-gray-50"
        >
          <div className="text-lg font-bold">
            المدفوعات
          </div>
          <div className="mt-2 text-sm text-gray-500">
            اختبار
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('personal')}
          className="rounded-2xl border-2 border-red-500 p-6 text-right hover:bg-red-50"
        >
          <div className="text-lg font-bold text-red-700">
            الإدارة الشخصية
          </div>
          <div className="mt-2 text-sm text-red-500">
            اضغط هنا للاختبار
          </div>
        </button>
      </div>

      <div className="rounded-2xl border bg-white p-8">
        <div className="mb-4 text-sm text-gray-500">
          القسم الحالي:
        </div>

        <div className="text-2xl font-bold">
          {activeSection === 'students' &&
            'المدفوعات تعمل'}

          {activeSection === 'financial' &&
            'إدارة المالية تعمل'}

          {activeSection === 'personal' &&
            'الإدارة الشخصية تعمل'}
        </div>
      </div>
    </div>
  )
}