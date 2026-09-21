'use client'

import { useState } from 'react'

import { PaymentStudents } from './PaymentStudents'
import { PaymentFinancial } from './PaymentFinancial'
import { PaymentPersonal } from './PaymentPersonal'

export function PaymentsView() {
  const [active, setActive] = useState('students')

  return (
    <div dir="rtl" className="space-y-6">

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setActive('students')}
          className="rounded-lg border px-4 py-2"
        >
          المدفوعات
        </button>

        <button
          type="button"
          onClick={() => setActive('financial')}
          className="rounded-lg border px-4 py-2"
        >
          إدارة المالية
        </button>

        <button
          type="button"
          onClick={() => setActive('personal')}
          className="rounded-lg border px-4 py-2"
        >
          الإدارة الشخصية
        </button>
      </div>

      <div>
        {active === 'students' && <PaymentStudents />}

        {active === 'financial' && (
          <div className="rounded-xl border p-8">
            إدارة المالية تعمل
          </div>
        )}

        {active === 'personal' && (
          <div className="rounded-xl border p-8">
            الإدارة الشخصية تعمل
          </div>
        )}
      </div>

    </div>
  )
}