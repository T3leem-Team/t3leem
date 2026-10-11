
'use client'

import {
  Loader2,
} from 'lucide-react'

import type { Dispatch, SetStateAction } from 'react'

import {
  Detail,
  Modal,
} from './payment-financial.components'

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
  setAdjustmentDirection: Dispatch<
    SetStateAction<AdjustmentDirection>
  >

  selectedTransaction: Transaction | null
  setSelectedTransaction: Dispatch<
    SetStateAction<Transaction | null>
  >

  selectedDeleteId: string | null
  setSelectedDeleteId: Dispatch<
    SetStateAction<string | null>
  >

  initializeFinancial: () => void | Promise<void>
  resetFinancialManagement: () => void | Promise<void>
  createTransaction: () => void | Promise<void>
  confirmTransaction: (
    transaction: Transaction
  ) => void | Promise<void>
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
  const closeModal = () => {
    setModal('none')
    setSelectedTransaction(null)
    setSelectedDeleteId(null)
  }

  return (
    <>
      {/* تهيئة الإدارة المالية */}

      {modal === 'initialize' && (
        <Modal
          title="تهيئة الإدارة المالية"
          onClose={closeModal}
        >
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium">
                طريقة الإدارة المالية
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() =>
                    setInitializeMode('student_payments')
                  }
                  className={`rounded-xl border p-4 text-right transition ${
                    initializeMode === 'student_payments'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <div className="font-semibold">
                    دفعات الطلاب
                  </div>

                  <p className="mt-1 text-xs text-muted-foreground">
                    ربط الدفعات الطلابية بالرصيد المالي.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setInitializeMode('manual')
                  }
                  className={`rounded-xl border p-4 text-right transition ${
                    initializeMode === 'manual'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <div className="font-semibold">
                    إدارة يدوية
                  </div>

                  <p className="mt-1 text-xs text-muted-foreground">
                    تسجيل الإيرادات والمصروفات والتسويات يدويًا.
                  </p>
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
                onChange={(event) =>
                  setOpeningBalance(event.target.value)
                }
                placeholder="0.000"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                مصدر الرصيد الافتتاحي
              </label>

              <input
                type="text"
                value={openingSource}
                onChange={(event) =>
                  setOpeningSource(event.target.value)
                }
                placeholder="مثال: الرصيد المرحل"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                ملاحظات
              </label>

              <textarea
                value={openingNote}
                onChange={(event) =>
                  setOpeningNote(event.target.value)
                }
                rows={3}
                placeholder="ملاحظات اختيارية"
                className="w-full resize-y rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={initializeFinancial}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {saving && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                تهيئة الإدارة المالية
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* إعادة تعيين الإدارة المالية */}

      {modal === 'reset' && (
        <Modal
          title="إعادة تعيين الإدارة المالية"
          onClose={closeModal}
        >
          <div className="space-y-5">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              <p className="font-semibold">
                هل أنت متأكد من إعادة التعيين؟
              </p>

              <p className="mt-2 leading-6">
                سيؤدي هذا الإجراء إلى إعادة ضبط بيانات الإدارة
                المالية للسنة الدراسية الحالية. تأكد من مراجعة
                البيانات قبل المتابعة.
              </p>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={resetFinancialManagement}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {saving && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                إعادة التعيين
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* إضافة عملية مالية */}

      {modal === 'transaction' && (
        <Modal
          title={
            transactionType === 'in'
              ? 'إضافة إيراد'
              : transactionType === 'out'
              ? 'إضافة مصروف'
              : 'إضافة تسوية'
          }
          onClose={closeModal}
        >
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium">
                نوع العملية
              </label>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTransactionType('in')}
                  className={`rounded-xl border px-3 py-3 text-sm font-medium ${
                    transactionType === 'in'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  إيراد
                </button>

                <button
                  type="button"
                  onClick={() => setTransactionType('out')}
                  className={`rounded-xl border px-3 py-3 text-sm font-medium ${
                    transactionType === 'out'
                      ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  مصروف
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setTransactionType('adjustment')
                  }
                  className={`rounded-xl border px-3 py-3 text-sm font-medium ${
                    transactionType === 'adjustment'
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  تسوية
                </button>
              </div>
            </div>

            {transactionType === 'adjustment' && (
              <div>
                <label className="mb-2 block text-sm font-medium">
                  اتجاه التسوية
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setAdjustmentDirection('plus')
                    }
                    className={`rounded-xl border px-4 py-3 text-sm font-medium ${
                      adjustmentDirection === 'plus'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    زيادة الرصيد (+)
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setAdjustmentDirection('minus')
                    }
                    className={`rounded-xl border px-4 py-3 text-sm font-medium ${
                      adjustmentDirection === 'minus'
                        ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    خفض الرصيد (-)
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
                min="0"
                step="0.001"
                value={transactionAmount}
                onChange={(event) =>
                  setTransactionAmount(event.target.value)
                }
                placeholder="0.000"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                المصدر
              </label>

              <input
                type="text"
                value={transactionSource}
                onChange={(event) =>
                  setTransactionSource(event.target.value)
                }
                placeholder="مصدر العملية"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                ملاحظات
              </label>

              <textarea
                value={transactionNote}
                onChange={(event) =>
                  setTransactionNote(event.target.value)
                }
                rows={3}
                placeholder="ملاحظات اختيارية"
                className="w-full resize-y rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={createTransaction}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {saving && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                حفظ العملية
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* تفاصيل العملية */}

      {modal === 'details' && selectedTransaction && (
        <Modal
          title="تفاصيل العملية المالية"
          onClose={closeModal}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Detail
              label="نوع العملية"
              value={getTransactionLabel(
                selectedTransaction
              )}
            />

            <Detail
              label="المبلغ"
              value={money(selectedTransaction.amount)}
            />

            <Detail
              label="التاريخ"
              value={formatDate(
                selectedTransaction.created_at
              )}
            />

            <Detail
              label="الحالة"
              value={getConfirmationLabel(
                selectedTransaction.confirmation_status
              )}
            />

            <Detail
              label="المصدر"
              value={selectedTransaction.source}
            />

            <Detail
              label="رقم المرجع"
              value={selectedTransaction.reference_number}
            />

            <Detail
              label="طريقة الدفع"
              value={selectedTransaction.payment_method}
            />

            <Detail
              label="رقم طلب الطالب"
              value={selectedTransaction.student_request_number}
            />

            <Detail
              label="الرصيد قبل العملية"
              value={
                selectedTransaction.balance_before !==
                undefined
                  ? money(
                      selectedTransaction.balance_before
                    )
                  : null
              }
            />

            <Detail
              label="الرصيد بعد العملية"
              value={
                selectedTransaction.balance_after !==
                undefined
                  ? money(
                      selectedTransaction.balance_after
                    )
                  : null
              }
            />

            <Detail
              label="وقت التأكيد"
              value={
                selectedTransaction.confirmed_at
                  ? formatDate(
                      selectedTransaction.confirmed_at
                    )
                  : null
              }
            />

            <Detail
              label="تم التأكيد بواسطة"
              value={selectedTransaction.confirmed_by}
            />

            <div className="sm:col-span-2">
              <Detail
                label="الملاحظات"
                value={selectedTransaction.note}
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            {selectedTransaction.confirmation_status ===
              'pending' && (
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  confirmTransaction(selectedTransaction)
                }
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                تأكيد الاستلام
              </button>
            )}

            <button
              type="button"
              onClick={closeModal}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
            >
              إغلاق
            </button>
          </div>
        </Modal>
      )}

      {/* تأكيد حذف العملية */}

      {modal === 'delete' && selectedDeleteId && (
        <Modal
          title="حذف العملية المالية"
          onClose={closeModal}
        >
          <div className="space-y-5">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              هل أنت متأكد من حذف هذه العملية المالية؟ لا يمكن
              التراجع عن هذا الإجراء.
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={deleteTransaction}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {saving && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                حذف العملية
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
