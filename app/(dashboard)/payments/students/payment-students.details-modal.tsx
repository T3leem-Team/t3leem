
'use client'

import { Pencil, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

import type { PaymentDetailsModalProps } from './payment-students.types'
import { formatCurrency, formatPaymentDate, getToday } from './payment-students.utils'

export default function PaymentDetailsModal({
  student,
  academicYearName,
  paymentHistory,
  loadingHistory,
  savingPayment,
  savingEdit,
  onClose,
  onEditPayment,
  onAddPayment,
}: PaymentDetailsModalProps) {
  const remaining = student.feeExempt
    ? 0
    : Math.max(student.amountDue - student.amountPaid, 0)

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-0 sm:p-4"
      dir="rtl"
    >
      <div className="flex min-h-full w-full items-center justify-center">
        <Card className="my-0 w-full rounded-none sm:my-4 sm:max-w-2xl sm:rounded-2xl">
          <CardContent className="p-0">
            <div className="flex items-start justify-between gap-4 border-b p-4 sm:p-6">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">تفاصيل المدفوعات</h2>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {student.name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  السنة الدراسية: {academicYearName}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                disabled={loadingHistory || savingPayment || savingEdit}
                className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                aria-label="إغلاق"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 border-b p-4 sm:grid-cols-3 sm:p-6">
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-xs text-muted-foreground">الرسوم السنوية</p>
                <p className="mt-1 font-semibold tabular-nums">
                  {student.feeExempt ? 'معفي' : formatCurrency(student.amountDue)}
                </p>
              </div>

              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-xs text-muted-foreground">إجمالي المدفوع</p>
                <p className="mt-1 font-semibold tabular-nums">
                  {student.feeExempt ? '—' : formatCurrency(student.amountPaid)}
                </p>
              </div>

              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-xs text-muted-foreground">المتبقي</p>
                <p className="mt-1 font-semibold tabular-nums">
                  {student.feeExempt ? '—' : formatCurrency(remaining)}
                </p>
              </div>
            </div>

            <div className="space-y-6 p-4 sm:p-6">
              <section>
                <div className="mb-3">
                  <h3 className="font-semibold">سجل الدفعات</h3>
                  <p className="text-xs text-muted-foreground">
                    {paymentHistory.length} دفعة
                  </p>
                </div>

                {loadingHistory ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    جاري تحميل سجل الدفعات
                  </div>
                ) : paymentHistory.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                    لا توجد دفعات مسجلة لهذا الطالب في السنة الحالية.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paymentHistory.map((payment) => (
                      <div key={payment.id} className="rounded-lg border p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">تاريخ الدفع</p>
                            <p className="mt-1 font-medium">
                              {formatPaymentDate(payment.payment_date)}
                            </p>
                          </div>

                          <div className="sm:text-right">
                            <p className="text-sm text-muted-foreground">المبلغ</p>
                            <p className="mt-1 text-lg font-semibold tabular-nums">
                              {formatCurrency(Number(payment.amount))}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3 border-t pt-3 sm:grid-cols-2">
                          <div>
                            <p className="text-xs text-muted-foreground">طريقة الدفع</p>
                            <p className="mt-1 text-sm font-medium">
                              {payment.payment_method}
                            </p>
                          </div>

                          {payment.reference_number && (
                            <div>
                              <p className="text-xs text-muted-foreground">رقم العملية</p>
                              <p className="mt-1 break-words text-sm font-medium">
                                {payment.reference_number}
                              </p>
                            </div>
                          )}

                          {payment.notes && (
                            <div className="sm:col-span-2">
                              <p className="text-xs text-muted-foreground">ملاحظات</p>
                              <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                                {payment.notes}
                              </p>
                            </div>
                          )}

                          <div className="flex justify-end border-t pt-3 sm:col-span-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => onEditPayment(payment)}
                              disabled={savingPayment || savingEdit}
                            >
                              <Pencil className="ml-1 size-4" />
                              تعديل
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {!student.feeExempt && remaining > 0 && (
                <section className="border-t pt-6">
                  <div className="mb-4">
                    <h3 className="font-semibold">إضافة دفعة</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      يمكنك تسجيل دفعة جزئية أو تسديد المبلغ المتبقي بالكامل.
                    </p>
                  </div>

                  <form onSubmit={onAddPayment} className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        المبلغ
                      </label>
                      <input
                        name="amount"
                        type="number"
                        step="0.001"
                        min="0.001"
                        max={remaining}
                        required
                        disabled={savingPayment}
                        className="h-10 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        طريقة الدفع
                      </label>
                      <select
                        name="paymentMethod"
                        defaultValue="نقدي"
                        disabled={savingPayment}
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
                        name="paymentDate"
                        type="date"
                        defaultValue={getToday()}
                        required
                        disabled={savingPayment}
                        className="h-10 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        رقم العملية
                        <span className="mr-1 text-xs text-muted-foreground">اختياري</span>
                      </label>
                      <input
                        name="referenceNumber"
                        type="text"
                        disabled={savingPayment}
                        className="h-10 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        ملاحظات
                        <span className="mr-1 text-xs text-muted-foreground">اختياري</span>
                      </label>
                      <textarea
                        name="notes"
                        rows={3}
                        disabled={savingPayment}
                        className="w-full rounded-md border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="submit" disabled={savingPayment}>
                        {savingPayment ? 'جاري حفظ الدفعة...' : 'حفظ الدفعة'}
                      </Button>
                    </div>
                  </form>
                </section>
              )}
            </div>

            <div className="border-t bg-background p-4">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={onClose}
                disabled={loadingHistory || savingPayment || savingEdit}
              >
                إغلاق
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
