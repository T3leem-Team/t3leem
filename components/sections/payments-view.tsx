'use client'

import { useState } from 'react'

import { PaymentStudents } from './PaymentStudents'
import { PaymentFinancial } from './PaymentFinancial'
import { PaymentPersonal } from './PaymentPersonal'

type PaymentSection =
  | 'students'
  | 'financial'
  | 'personal'

export function PaymentsView() {
  const [activeSection, setActiveSection] =
    useState<PaymentSection>('students')

  return (
    <div dir="rtl" className="space-y-6">

      <div className="grid gap-4 md:grid-cols-3">

        {/* المدفوعات */}
        <button
          type="button"
          onClick={() => setActiveSection('students')}
          className={`rounded-xl border p-5 text-right font-semibold transition-all duration-200 ${
            activeSection === 'students'
              ? 'border-emerald-400 bg-emerald-50 text-emerald-800 shadow-md ring-1 ring-emerald-200 dark:border-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-800'
              : 'border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-sm dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 dark:hover:bg-emerald-950/30'
          }`}
        >
          المدفوعات
        </button>

        {/* إدارة المالية */}
        <button
          type="button"
          onClick={() => setActiveSection('financial')}
          className={`rounded-xl border p-5 text-right font-semibold transition-all duration-200 ${
            activeSection === 'financial'
              ? 'border-blue-400 bg-blue-50 text-blue-800 shadow-md ring-1 ring-blue-200 dark:border-blue-600 dark:bg-blue-950/30 dark:text-blue-300 dark:ring-blue-800'
              : 'border-blue-200 bg-blue-50/50 text-blue-700 hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm dark:border-blue-800 dark:bg-blue-950/20 dark:text-blue-400 dark:hover:bg-blue-950/30'
          }`}
        >
          إدارة المالية
        </button>

        {/* الإدارة الشخصية */}
        <button
          type="button"
          onClick={() => setActiveSection('personal')}
          className={`rounded-xl border p-5 text-right font-semibold transition-all duration-200 ${
            activeSection === 'personal'
              ? 'border-violet-400 bg-violet-50 text-violet-800 shadow-md ring-1 ring-violet-200 dark:border-violet-600 dark:bg-violet-950/30 dark:text-violet-300 dark:ring-violet-800'
              : 'border-violet-200 bg-violet-50/50 text-violet-700 hover:border-violet-300 hover:bg-violet-50 hover:shadow-sm dark:border-violet-800 dark:bg-violet-950/20 dark:text-violet-400 dark:hover:bg-violet-950/30'
          }`}
        >
          الإدارة الشخصية
        </button>

      </div>

      <div className="min-h-[200px]">

        {activeSection === 'students' && (
          <PaymentStudents />
        )}

        {activeSection === 'financial' && (
          <PaymentFinancial />
        )}

        {activeSection === 'personal' && (
          <PaymentPersonal />
        )}

      </div>

    </div>
  )
}
