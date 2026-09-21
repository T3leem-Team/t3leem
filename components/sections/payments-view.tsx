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
      {/* خيارات القسم */}
      <div className="grid gap-4 md:grid-cols-3">
        <button
          type="button"
          onClick={() => setActiveSection('financial')}
          className={`rounded-xl border p-5 text-right transition ${
            activeSection === 'financial'
              ? 'border-primary bg-primary/5'
              : 'bg-background hover:border-primary/50'
          }`}
        >
          <div className="text-lg font-semibold">
            إدارة المالية
          </div>

          <div className="mt-1 text-sm text-muted-foreground">
            إدارة أموال المدرسة والاستلام والمصروفات والتسويات.
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('students')}
          className={`rounded-xl border p-5 text-right transition ${
            activeSection === 'students'
              ? 'border-primary bg-primary/5'
              : 'bg-background hover:border-primary/50'
          }`}
        >
          <div className="text-lg font-semibold">
            المدفوعات
          </div>

          <div className="mt-1 text-sm text-muted-foreground">
            إدارة رسوم ومدفوعات الطلاب.
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('personal')}
          className={`rounded-xl border p-5 text-right transition ${
            activeSection === 'personal'
              ? 'border-primary bg-primary/5'
              : 'bg-background hover:border-primary/50'
          }`}
        >
          <div className="text-lg font-semibold">
            الإدارة الشخصية
          </div>

          <div className="mt-1 text-sm text-muted-foreground">
            الإدارة المالية الشخصية.
          </div>
        </button>
      </div>

      {/* محتوى القسم */}
      <div>
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