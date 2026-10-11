
'use client'

import { Loader2, CheckCircle2, RotateCcw } from 'lucide-react'
import type { Dispatch, SetStateAction } from 'react'

import { Detail, Modal } from './payment-financial.components'

import type {
  AdjustmentDirection,
  FinancialMode,
  ModalType,
  Transaction,
  TransactionType,
} from './payment-financial.types'

import {
  formatDate,
  getConfirmationLabel,
  getTransactionLabel,
  money,
} from './payment-financial.utils'

type PaymentFinancialModalsProps = {
  modal: ModalType
  setModal: Dispatch<SetStateAction<ModalType>>
  saving: boolean

  initializeMode: FinancialMode
  setInitializeMode: Dispatch<SetStateAction<FinancialMode>>
  openingBalance: string
  setOpeningBalance: Dispatch<SetStateAction<string>>
  openingSource: string
  setOpeningSource: Dispatch<SetStateAction<string>>
  openingNote: string
  setOpeningNote: Dispatch<SetStateAction<string>>

  transactionType: TransactionType
  setTransactionType: Dispatch<SetStateAction<TransactionType>>
  transactionAmount: string
  setTransactionAmount: Dispatch<SetStateAction<string>>
  transactionSource: string
  setTransactionSource: Dispatch<SetStateAction<string>>
  transactionNote: string
  setTransactionNote: Dispatch<SetStateAction<string>>

  adjustmentDirection: AdjustmentDirection
  setAdjustmentDirection: Dispatch<SetStateAction<AdjustmentDirection>>

  selectedTransaction: Transaction | null
  setSelectedTransaction: Dispatch<SetStateAction<Transaction | null>>

  selectedDeleteId: string | null
  setSelectedDeleteId: Dispatch<SetStateAction<string | null>>

  initializeFinancial: () => void | Promise<void>
  resetFinancialManagement: () => void | Promise<void>
  createTransaction: () => void | Promise<void>
  confirmTransaction: (transaction: Transaction) => void | Promise<void>
  deleteTransaction: () => void | Promise<void>
}

export default function PaymentFinancialModals({
  modal,
  setModal,
  saving,
  initializeMode,
  setInitializeMode,
  openingBalance,
  setOpeningBalance,
  openingSource,
  setOpeningSource,
  openingNote,
  setOpeningNote,
  transactionType,
  setTransactionType,
  transactionAmount,
  setTransactionAmount,
  transactionSource,
  setTransactionSource,
  transactionNote,
  setTransactionNote,
  adjustmentDirection,
  setAdjustmentDirection,
  selectedTransaction,
  setSelectedTransaction,
  selectedDeleteId,
  setSelectedDeleteId,
  initializeFinancial,
  resetFinancialManagement,
  createTransaction,
  confirmTransaction,
  deleteTransaction,
}: PaymentFinancialModalsProps) {
  return (
    <>
      {/* Modal: التهيئة */}
      {modal === 'initialize' && (
        <Modal
          title="تهيئة الإدارة المالية"
          onClose={() => setModal('none')}
        >
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium">
                طريقة الإدارة
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setInitializeMode('student_payments')}
                  className={`rounded-xl border border-border p-4 text-right ${
                    initializeMode === 'student_payments'
                      ? 'border-foreground bg-muted'
                      : 'bg-background hover:bg-muted'
                  }`}
                >
                  <div className="font-semibold">
                    مرتبط بمدفوعات الطلاب
                  </div>

                  <div className="mt-1 text-xs leading-5 text-muted-foreground">
                    دفعات الطلاب تحتاج تأكيد الاستلام قبل دخولها في الرصيد.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setInitializeMode('manual')}
                  className={`rounded-xl border border-border p-4 text-right ${
                    initializeMode === 'manual'
                      ? 'border-foreground bg-muted'
                      : 'bg-background hover:bg-muted'
                  }`}
                >
                  <div className="font-semibold">
                    إدخال يدوي
                  </div>

                  <div className="mt-1 text-xs leading-5 text-muted-foreground">
                    إدخال الرصيد الأولي يدوياً من أي مصدر.
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                الرصيد الافتتاحي
              </label>

              <input
                type="number"
                min="0"
                step="0.001"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                placeholder="0.000"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                مصدر الرصيد
              </label>

              <select
                value={openingSource}
                onChange={(e) => setOpeningSource(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
              >
                <option value="">اختر المصدر</option>
                <option value="previous_balance">رصيد سابق</option>
                <option value="cash">نقدي</option>
                <option value="transfer">تحويل</option>
                <option value="support">دعم</option>
                <option value="deposit">إيداع</option>
                <option value="other">أخرى</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                ملاحظات
              </label>

              <textarea
                value={openingNote}
                onChange={(e) => setOpeningNote(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                placeholder="ملاحظات الرصيد الافتتاحي..."
              />
            </div>

            {initializeMode === 'student_payments' && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                سيتم جلب الدفعات الموجودة مسبقًا لهذه السنة وربطها
                بالإدارة المالية كدفعات بانتظار تأكيد الاستلام.
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModal('none')}
                className="rounded-lg border border-border bg-background px-4 py-2 hover:bg-muted"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={initializeFinancial}
                disabled={saving}
                className="rounded-lg bg-primary px-5 py-2 text-primary-foreground disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'حفظ وبدء'
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: إعادة التهيئة */}
      {modal === 'reset' && (
        <Modal
          title="إعادة تهيئة الإدارة المالية"
          onClose={() => setModal('none')}
        >
          <div className="space-y-5">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
              <div className="font-semibold text-red-800 dark:text-red-300">
                تنبيه
              </div>

              <p className="mt-2 text-sm leading-6 text-red-700 dark:text-red-300">
                سيتم حذف إعداد الإدارة المالية وعملياتها لهذه السنة فقط.
              </p>

              <p className="mt-2 text-sm leading-6 text-red-700 dark:text-red-300">
                لن يتم حذف مدفوعات الطلاب، الطلاب، التسجيلات أو الاشتراكات.
              </p>

              <p className="mt-2 text-sm leading-6 text-red-700 dark:text-red-300">
                بعد ذلك يمكنك اختيار طريقة الإدارة المالية من جديد.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModal('none')}
                className="rounded-lg border border-border bg-background px-4 py-2 hover:bg-muted"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={resetFinancialManagement}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-white disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                إعادة التهيئة
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: إضافة عملية */}
      {modal === 'transaction' && (
        <Modal
          title={
            transactionType === 'in'
              ? 'إضافة إيراد'
              : transactionType === 'out'
                ? 'إضافة مصروف'
                : 'إضافة تسوية'
          }
          onClose={() => setModal('none')}
        >
          <div className="space-y-5">
            {transactionType === 'adjustment' && (
              <div>
                <label className="mb-2 block text-sm font-medium">
                  اتجاه التسوية
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAdjustmentDirection('plus')}
                    className={`rounded-lg border border-border px-4 py-3 ${
                      adjustmentDirection === 'plus'
                        ? 'border-foreground bg-muted'
                        : 'bg-background hover:bg-muted'
                    }`}
                  >
                    تسوية +
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustmentDirection('minus')}
                    className={`rounded-lg border border-border px-4 py-3 ${
                      adjustmentDirection === 'minus'
                        ? 'border-foreground bg-muted'
                        : 'bg-background hover:bg-muted'
                    }`}
                  >
                    تسوية -
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium">
                المبلغ
              </label>

              <input
                type="number"
                min="0.001"
                step="0.001"
                value={transactionAmount}
                onChange={(e) => setTransactionAmount(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                placeholder="0.000"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                المصدر / البيان
              </label>

              <input
                type="text"
                value={transactionSource}
                onChange={(e) => setTransactionSource(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                placeholder={
                  transactionType === 'out'
                    ? 'مثال: صيانة، مشتريات...'
                    : transactionType === 'adjustment'
                      ? 'سبب التسوية'
                      : 'مصدر الإيراد'
                }
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                ملاحظات
              </label>

              <textarea
                value={transactionNote}
                onChange={(e) => setTransactionNote(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModal('none')}
                className="rounded-lg border border-border bg-background px-4 py-2 hover:bg-muted"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={createTransaction}
                disabled={saving}
                className="rounded-lg bg-primary px-5 py-2 text-primary-foreground disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'حفظ العملية'
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: التفاصيل */}
      {modal === 'details' && selectedTransaction && (
        <Modal
          title="تفاصيل العملية"
          onClose={() => {
            setModal('none')
            setSelectedTransaction(null)
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Detail
              label="نوع العملية"
              value={getTransactionLabel(selectedTransaction)}
            />

            <Detail
              label="المبلغ"
              value={money(selectedTransaction.amount)}
            />

            <Detail
              label="التاريخ"
              value={formatDate(selectedTransaction.created_at)}
            />

            <Detail
              label="الرصيد قبل"
              value={
                selectedTransaction.balance_before !== undefined
                  ? money(selectedTransaction.balance_before)
                  : '-'
              }
            />

            <Detail
              label="الرصيد بعد"
              value={
                selectedTransaction.balance_after !== undefined
                  ? money(selectedTransaction.balance_after)
                  : '-'
              }
            />

            <Detail
              label="المصدر"
              value={selectedTransaction.source || '-'}
            />

            <Detail
              label="نوع المصدر"
              value={selectedTransaction.source_type}
            />

            <Detail
              label="معرف الدفعة"
              value={selectedTransaction.payment_id}
            />

            <Detail
              label="معرف الطالب"
              value={selectedTransaction.student_id}
            />

            <Detail
              label="رقم طلب التسجيل"
              value={selectedTransaction.student_request_number}
            />

            <Detail
              label="طريقة الدفع"
              value={selectedTransaction.payment_method}
            />

            <Detail
              label="رقم المرجع"
              value={selectedTransaction.reference_number}
            />

            <Detail
              label="حالة التأكيد"
              value={getConfirmationLabel(
                selectedTransaction.confirmation_status
              )}
            />

            <Detail
              label="تم التأكيد بواسطة"
              value={selectedTransaction.confirmed_by}
            />

            <Detail
              label="وقت التأكيد"
              value={
                selectedTransaction.confirmed_at
                  ? formatDate(selectedTransaction.confirmed_at)
                  : null
              }
            />

            <Detail
              label="أنشأ العملية"
              value={selectedTransaction.created_by}
            />

            {selectedTransaction.adjustment_direction && (
              <Detail
                label="اتجاه التسوية"
                value={
                  selectedTransaction.adjustment_direction === 'plus'
                    ? 'تسوية +'
                    : 'تسوية -'
                }
              />
            )}

            <div className="md:col-span-2">
              <Detail
                label="الملاحظات"
                value={selectedTransaction.note}
              />
            </div>

            {selectedTransaction.confirmation_status === 'pending' && (
              <div className="md:col-span-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => confirmTransaction(selectedTransaction)}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  تأكيد استلام الدفعة
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Modal: حذف */}
      {modal === 'delete' && (
        <Modal
          title="حذف العملية"
          onClose={() => {
            setModal('none')
            setSelectedDeleteId(null)
          }}
        >
          <div className="space-y-5">
            <p className="text-sm leading-6 text-muted-foreground">
              هل أنت متأكد من حذف هذه العملية؟ سيتم إعادة احتساب الرصيد بعد الحذف.
            </p>

            <p className="rounded-lg bg-muted p-3 text-xs leading-5 text-muted-foreground">
              حذف العملية المالية لا يحذف دفعة الطالب الأصلية من جدول المدفوعات.
            </p>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setModal('none')
                  setSelectedDeleteId(null)
                }}
                className="rounded-lg border border-border bg-background px-4 py-2 hover:bg-muted"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={deleteTransaction}
                disabled={saving || !selectedDeleteId}
                className="rounded-lg bg-red-600 px-5 py-2 text-white disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'حذف العملية'
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
