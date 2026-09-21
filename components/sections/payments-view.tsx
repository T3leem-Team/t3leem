'use client'

import { useState } from 'react'

import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent } from '@/components/ui/card'

import { PaymentStudents } from './PaymentStudents'
import { PaymentFinancial } from './PaymentFinancial'

type PaymentSection =
  | 'financial'
  | 'students'
  | 'personal'

function PaymentPersonalTest() {
  return (
    <div
      dir="rtl"
      className="rounded-2xl border-2 border-red-500 bg-red-50 p-10"
    >
      <h2 className="text-2xl font-bold text-red-700">
        الإدارة الشخصية تعمل
      </h2>

      <p className="mt-3 text-red-600">
        هذا اختبار مباشر داخل payments-view.tsx
      </p>

      <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
        <div className="text-sm font-semibold text-slate-700">
          إذا ظهر هذا المربع
        </div>

        <div className="mt-2 text-sm text-slate-500">
          فهذا يعني أن المشكلة ليست في زر الإدارة الشخصية،
          وإنما في ملف PaymentPersonal.tsx أو استيراده.
        </div>
      </div>
    </div>
  )
}

export function PaymentsView() {
  const [activeSection, setActiveSection] =
    useState<PaymentSection>('students')

  const sections = [
    {
      id: 'financial' as const,
      title: 'إدارة المالية',
      description:
        'إدارة أموال المدرسة والاستلام والمصروفات والتسويات',
    },
    {
      id: 'students' as const,
      title: 'المدفوعات',
      description:
        'متابعة الرسوم الدراسية والدفعات المسجلة للطلاب',
    },
    {
      id: 'personal' as const,
      title: 'الإدارة الشخصية',
      description:
        'إدارة الدورات والحسابات المالية الشخصية',
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="المدفوعات"
        description="إدارة المدفوعات والشؤون المالية"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {sections.map((section) => {
          const isActive =
            activeSection === section.id

          return (
            <button
              key={section.id}
              type="button"
              onClick={() =>
                setActiveSection(section.id)
              }
              className="w-full text-right"
            >
              <Card
                className={
                  isActive
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'transition-colors hover:border-primary/50'
                }
              >
                <CardContent className="p-5">
                  <h2 className="text-lg font-semibold">
                    {section.title}
                  </h2>

                  <p className="mt-2 text-sm text-muted-foreground">
                    {section.description}
                  </p>
                </CardContent>
              </Card>
            </button>
          )
        })}
      </div>

      {activeSection === 'financial' && (
        <PaymentFinancial />
      )}

      {activeSection === 'students' && (
        <PaymentStudents />
      )}

      {activeSection === 'personal' && (
        <PaymentPersonalTest />
      )}
    </div>
  )
}