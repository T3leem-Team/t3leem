
'use client'

import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

import type { PaymentEditModalProps } from './payment-students.types'

export default function PaymentEditModal({
  payment,
  studentName,
  savingEdit,
  onClose,
  onSubmit,
}: PaymentEditModalProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      dir="rtl"
    >
      <Card className="w-full max-w-lg shadow-2xl">
        <CardContent className="p-0">
          <div className="flex items-start justify-between gap-4 border-b p-5">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold">تعديل الدفعة</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {studentName}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                سيتم تعديل نفس الدفعة ولن يتم إنشاء دفعة جديدة.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={savingEdit}
              className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
              aria-label="إغلاق"
            >
              <X className="size-5" />
            </button>
          </div>

          <form
            onSubmit={onSubmit}
            className="max-h-[85vh] space-y-4 overflow-y-auto p-5"
          >
            <div>
              <label className="mb-1.5 block text-sm font-medium">المبلغ</label>
              <input
                name="editAmount"
                type="number"
                step="0.001"
                min="0.001"
                defaultValue={Number(payment.amount).toFixed(3)}
                required
                disabled={savingEdit}
                className="h-10 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">
                طريقة الدفع
              </label>
              <select
                name="editPaymentMethod"
                defaultValue={payment.payment_method}
                disabled={savingEdit}
                className="h-10 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="نقدي">نقدي</option>
                <option value="تحويل">تحويل</option>
                <option value="بطاقة">بطاقة</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">
                تاريخ الدفع
              </label>
              <input
                name="editPaymentDate"
                type="date"
                defaultValue={payment.payment_date}
                required
                disabled={savingEdit}
                className="h-10 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">
                رقم العملية
                <span className="mr-1 text-xs text-muted-foreground">اختياري</span>
              </label>
              <input
                name="editReferenceNumber"
                type="text"
                defaultValue={payment.reference_number ?? ''}
                disabled={savingEdit}
                className="h-10 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">
                ملاحظات
                <span className="mr-1 text-xs text-muted-foreground">اختياري</span>
              </label>
              <textarea
                name="editNotes"
                rows={3}
                defaultValue={payment.notes ?? ''}
                disabled={savingEdit}
                className="w-full rounded-md border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={savingEdit}
              >
                إلغاء
              </Button>

              <Button type="submit" disabled={savingEdit}>
                {savingEdit ? 'جاري حفظ التعديل...' : 'حفظ التعديل'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
