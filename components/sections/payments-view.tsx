'use client'

import { useState } from 'react'

import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent } from '@/components/ui/card'

import { PaymentStudents } from '@/components/PaymentStudents'
import { PaymentFinancial } from '@/components/PaymentFinancial'
import { PaymentPersonal } from '@/components/PaymentPersonal'

type PaymentSection =
  | 'financial'
  | 'students'
  | 'personal'

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
              className="text-right"
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
        <PaymentPersonal />
      )}
    </div>
  )
}