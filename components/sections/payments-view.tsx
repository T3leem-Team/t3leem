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

        <button
          type="button"
          onClick={() => setActiveSection('students')}
          className="rounded-xl border p-5 text-right"
        >
          المدفوعات
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('financial')}
          className="rounded-xl border p-5 text-right"
        >
          إدارة المالية
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('personal')}
          className="rounded-xl border p-5 text-right"
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