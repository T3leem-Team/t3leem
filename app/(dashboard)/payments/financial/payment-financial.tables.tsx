
'use client'

import {
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react'

import {
  StatusBadge,
  StudentPaymentStatus,
} from './payment-financial.components'

import type {
  FinancialSettings,
  StudentPaymentRow,
  Transaction,
} from './payment-financial.types'

import {
  formatDate,
  getTransactionLabel,
  getTypeClass,
  money,
} from './payment-financial.utils'

type FinancialTablesProps = {
  settings: FinancialSettings
  studentPayments: StudentPaymentRow[]
  transactions: Transaction[]
  pendingTransactions: Transaction[]
  saving: boolean

  onConfirmTransaction: (
    transaction: Transaction
  ) => void

  onConfirmAllTransactions: () => void

  onShowDetails: (
    transaction: Transaction
  ) => void

  onRequestDelete: (
    transactionId: string
  ) => void

  onAddIncome: () => void
  onAddExpense: () => void
  onAddAdjustment: () => void
}

export default function FinancialTables({
  settings,
  studentPayments,
  transactions,
  pendingTransactions,
  saving,
  onConfirmTransaction,
  onConfirmAllTransactions,
  onShowDetails,
  onRequestDelete,
  onAddIncome,
  onAddExpense,
  onAddAdjustment,
}: FinancialTablesProps) {
  return (
    <>
      {/* جدول الطلاب أو العمليات المالية */}

      {settings.financial_mode ===
      'student_payments' ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-bold">
                  الطلاب والدفع
                </h3>

                <p className="mt-1 text-xs text-muted-foreground">
                  هذه القائمة تمثل الإدارة المالية الحالية فقط.
                </p>
              </div>

              <div className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                {studentPayments.length} طالب
              </div>
            </div>
          </div>

          {studentPayments.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">
              لا توجد دفعات مرتبطة بالإدارة المالية الحالية.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted text-right">
                    <th className="px-4 py-3">
                      الطالب
                    </th>

                    <th className="px-4 py-3">
                      الحالة المالية
                    </th>

                    <th className="px-4 py-3">
                      المدفوع
                    </th>

                    <th className="px-4 py-3">
                      المتبقي
                    </th>

                    <th className="px-4 py-3">
                      طريقة الدفع
                    </th>

                    <th className="px-4 py-3">
                      تاريخ الدفعة
                    </th>

                    <th className="px-4 py-3">
                      الاستلام
                    </th>

                    <th className="px-4 py-3">
                      الإجراء
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {studentPayments.map((student) => (
                    <tr
                      key={student.studentId}
                      className="border-b border-border last:border-b-0 hover:bg-muted/60"
                    >
                      <td className="px-4 py-4">
                        <div className="font-semibold">
                          {student.name}
                        </div>

                        {student.personalId && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {student.personalId}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <StudentPaymentStatus
                          status={student.status}
                        />
                      </td>

                      <td className="px-4 py-4 font-semibold">
                        {student.feeExempt
                          ? '-'
                          : money(student.paidAmount)}
                      </td>

                      <td className="px-4 py-4">
                        {student.feeExempt
                          ? '-'
                          : money(student.remaining)}
                      </td>

                      <td className="px-4 py-4">
                        {student.feeExempt
                          ? '-'
                          : student.latestPaymentMethod || '-'}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4">
                        {student.feeExempt
                          ? '-'
                          : formatDate(
                              student.latestPaymentDate
                            )}
                      </td>

                      <td className="px-4 py-4">
                        {student.feeExempt ? (
                          <span className="text-xs text-muted-foreground">
                            لا ينطبق
                          </span>
                        ) : student.pendingCount > 0 ? (
                          <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                            بانتظار التأكيد
                          </span>
                        ) : student.latestTransaction
                            ?.confirmation_status ===
                          'confirmed' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            تم التأكيد
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            غير مرتبط
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          {student.pendingCount > 0 &&
                            student.latestTransaction
                              ?.confirmation_status ===
                              'pending' && (
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => {
                                  if (
                                    student.latestTransaction
                                  ) {
                                    onConfirmTransaction(
                                      student.latestTransaction
                                    )
                                  }
                                }}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                تأكيد الاستلام
                              </button>
                            )}

                          {student.latestTransaction && (
                            <button
                              type="button"
                              onClick={() =>
                                onShowDetails(
                                  student.latestTransaction!
                                )
                              }
                              className="rounded-lg border border-border bg-background px-3 py-2 text-xs hover:bg-muted"
                            >
                              تفاصيل
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <h3 className="font-bold">
              العمليات المالية
            </h3>
          </div>

          {transactions.length === 0 ? (
            <div className="px-5 py-16 text-center text-sm text-muted-foreground">
              لا توجد عمليات مالية حتى الآن.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted text-right">
                    <th className="px-4 py-3">
                      التاريخ
                    </th>

                    <th className="px-4 py-3">
                      النوع
                    </th>

                    <th className="px-4 py-3">
                      المبلغ
                    </th>

                    <th className="px-4 py-3">
                      المصدر
                    </th>

                    <th className="px-4 py-3">
                      الطالب
                    </th>

                    <th className="px-4 py-3">
                      الحالة
                    </th>

                    <th className="px-4 py-3">
                      الرصيد
                    </th>

                    <th className="px-4 py-3">
                      التفاصيل
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {transactions.map((transaction) => {
                    const student = studentPayments.find(
                      (item) =>
                        item.studentId ===
                        transaction.student_id
                    )

                    return (
                      <tr
                        key={transaction.id}
                        className="border-b border-border last:border-b-0 hover:bg-muted/60"
                      >
                        <td className="whitespace-nowrap px-4 py-4">
                          {formatDate(
                            transaction.created_at
                          )}
                        </td>

                        <td
                          className={`px-4 py-4 font-semibold ${getTypeClass(
                            transaction
                          )}`}
                        >
                          {getTransactionLabel(
                            transaction
                          )}
                        </td>

                        <td className="px-4 py-4 font-semibold">
                          {money(transaction.amount)}
                        </td>

                        <td className="px-4 py-4">
                          {transaction.source ||
                            (transaction.source_type ===
                            'student_payment'
                              ? 'دفعة طالب'
                              : transaction.source_type ===
                                'opening'
                              ? 'الرصيد الافتتاحي'
                              : '-')}
                        </td>

                        <td className="px-4 py-4">
                          {student?.name || '-'}
                        </td>

                        <td className="px-4 py-4">
                          <StatusBadge
                            status={
                              transaction.confirmation_status
                            }
                          />
                        </td>

                        <td className="px-4 py-4 font-semibold">
                          {transaction.balance_after !==
                          undefined
                            ? money(
                                transaction.balance_after
                              )
                            : '-'}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                onShowDetails(transaction)
                              }
                              className="rounded-lg border border-border bg-background px-3 py-2 text-xs hover:bg-muted"
                            >
                              تفاصيل
                            </button>

                            {transaction.confirmation_status ===
                              'pending' && (
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() =>
                                  onConfirmTransaction(
                                    transaction
                                  )
                                }
                                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs text-white hover:opacity-90 disabled:opacity-50"
                              >
                                تأكيد
                              </button>
                            )}

                            {transaction.source_type !==
                              'opening' && (
                              <button
                                type="button"
                                onClick={() =>
                                  onRequestDelete(
                                    transaction.id
                                  )
                                }
                                aria-label="حذف العملية"
                                className="rounded-lg border border-red-200 px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/30"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* العمليات المعلقة */}

      {settings.financial_mode ===
        'student_payments' &&
        pendingTransactions.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/60 dark:bg-amber-950/30">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-bold text-amber-900 dark:text-amber-300">
                  دفعات بانتظار تأكيد الاستلام
                </h3>

                <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                  هذه الدفعات لا تدخل في الرصيد المالي حتى يتم تأكيد استلامها.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-full bg-amber-100 px-4 py-2 text-sm font-bold text-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
                  {pendingTransactions.length} معلقة
                </div>

                <button
                  type="button"
                  disabled={saving}
                  onClick={onConfirmAllTransactions}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  قبول الكل
                </button>
              </div>
            </div>
          </div>
        )}

      {/* أزرار إضافة العمليات */}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onAddIncome}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          إضافة إيراد
        </button>

        <button
          type="button"
          onClick={onAddExpense}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          إضافة مصروف
        </button>

        <button
          type="button"
          onClick={onAddAdjustment}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          <Plus className="h-4 w-4" />
          إضافة تسوية
        </button>
      </div>
    </>
  )
}
