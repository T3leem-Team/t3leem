'use client'

import { useState } from 'react'
import { StatusBadge } from '@/components/dashboard/status-badge'
import {
  getPaymentStatusLabel,
} from './students-table-utils'

export type PaymentStudent = {
  id: string
  name: string
  academicYearId: string | null
  amountDue: number
  amountPaid: number
  feeExempt: boolean
  paymentStatus: string
}

type Props = {
  student: PaymentStudent | null
  onClose: () => void
  onPaymentSaved?: (
    studentId: string,
    amount: number,
    paymentStatus: string
  ) => void
}

export function StudentPaymentDialog({
  student,
  onClose,
  onPaymentSaved,
}: Props) {
  const [showAddPayment, setShowAddPayment] =
    useState(false)
  const [paymentAmount, setPaymentAmount] =
    useState('')
  const [paymentMethod, setPaymentMethod] =
    useState<'نقدي' | 'تحويل' | 'بطاقة'>('نقدي')
  const [paymentDate, setPaymentDate] =
    useState(new Date().toISOString().slice(0, 10))
  const [paymentReference, setPaymentReference] =
    useState('')
  const [paymentNotes, setPaymentNotes] =
    useState('')
  const [paymentSaving, setPaymentSaving] =
    useState(false)
  const [paymentMessage, setPaymentMessage] =
    useState('')

  if (!student) return null

  const remaining = Math.max(
    Number(student.amountDue) -
      Number(student.amountPaid),
    0
  )

  const close = () => {
    if (paymentSaving) return
    onClose()
  }

  const savePayment = async () => {
    const amount = Number(paymentAmount)

    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentMessage('أدخل مبلغاً صحيحاً.')
      return
    }

    if (!student.academicYearId) {
      setPaymentMessage(
        'لا توجد سنة دراسية مرتبطة بالطالب.'
      )
      return
    }

    if (amount > remaining + 0.000001) {
      setPaymentMessage(
        `المبلغ أكبر من المتبقي. المتبقي: ${remaining.toFixed(3)} د.ب`
      )
      return
    }

    setPaymentSaving(true)
    setPaymentMessage('')

    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_id: student.id,
          academic_year_id: student.academicYearId,
          amount,
          payment_method: paymentMethod,
          payment_date: paymentDate,
          reference_number: paymentReference || null,
          notes: paymentNotes || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error || 'تعذر حفظ الدفعة.'
        )
      }

      const newPaid = Number(student.amountPaid) + amount
      const newRemaining = Math.max(
        Number(student.amountDue) - newPaid,
        0
      )

      const newStatus = student.feeExempt
        ? 'معفي'
        : newRemaining <= 0
          ? 'مدفوع بالكامل'
          : newPaid > 0
            ? 'مدفوع جزئيًا'
            : 'غير مدفوع'

      onPaymentSaved?.(
        student.id,
        newPaid,
        newStatus
      )

      setPaymentAmount('')
      setPaymentReference('')
      setPaymentNotes('')
      setPaymentMessage('تم تسجيل الدفعة بنجاح ✅')

      setTimeout(() => {
        setShowAddPayment(false)
      }, 700)
    } catch (error) {
      setPaymentMessage(
        error instanceof Error
          ? error.message
          : 'تعذر حفظ الدفعة.'
      )
    } finally {
      setPaymentSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-background p-5 shadow-xl"
        dir="rtl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              تفاصيل السداد
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {student.name}
            </p>
          </div>

          <button
            type="button"
            onClick={close}
            disabled={paymentSaving}
            className="rounded-md px-3 py-1.5 text-sm hover:bg-muted"
          >
            إغلاق
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Summary label="المستحق" value={student.amountDue} />
          <Summary label="المدفوع" value={student.amountPaid} />
          <Summary label="المتبقي" value={remaining} />

          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">
              الحالة
            </div>
            <div className="mt-2">
              <StatusBadge
                status={getPaymentStatusLabel(student.paymentStatus)}
              />
            </div>
          </div>
        </div>

        {!student.feeExempt && remaining > 0 && (
          <div className="mt-5">
            {!showAddPayment ? (
              <button
                type="button"
                onClick={() => setShowAddPayment(true)}
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                إضافة دفعة
              </button>
            ) : (
              <div className="space-y-4 rounded-lg border p-4">
                <h3 className="font-semibold">إضافة دفعة</h3>

                <Field label="المبلغ">
                  <input
                    type="number"
                    min="0"
                    max={remaining}
                    step="0.001"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.000"
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  />
                </Field>

                <Field label="طريقة الدفع">
                  <select
                    value={paymentMethod}
                    onChange={(e) =>
                      setPaymentMethod(
                        e.target.value as 'نقدي' | 'تحويل' | 'بطاقة'
                      )
                    }
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="نقدي">نقدي</option>
                    <option value="تحويل">تحويل</option>
                    <option value="بطاقة">بطاقة</option>
                  </select>
                </Field>

                <Field label="تاريخ الدفع">
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  />
                </Field>

                <Field label="رقم المرجع">
                  <input
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="اختياري"
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  />
                </Field>

                <Field label="ملاحظات">
                  <textarea
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    rows={3}
                    placeholder="اختياري"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </Field>

                {paymentMessage && (
                  <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                    {paymentMessage}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={savePayment}
                    disabled={paymentSaving}
                    className="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
                  >
                    {paymentSaving ? 'جاري الحفظ...' : 'حفظ الدفعة'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAddPayment(false)}
                    disabled={paymentSaving}
                    className="rounded-md border px-4 py-2.5 text-sm hover:bg-muted"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {student.feeExempt && (
          <div className="mt-5 rounded-lg border p-3 text-sm">
            الطالب معفي من الرسوم ولا يمكن إضافة دفعة له.
          </div>
        )}

        {!student.feeExempt && remaining <= 0 && (
          <div className="mt-5 rounded-lg border p-3 text-sm">
            تم سداد الرسوم بالكامل.
          </div>
        )}
      </div>
    </div>
  )
}

function Summary({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-semibold">
        {Number(value).toFixed(3)} د.ب
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}
