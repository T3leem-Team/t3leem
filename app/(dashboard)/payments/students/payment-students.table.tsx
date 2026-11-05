
'use client'

import { Eye, Plus } from 'lucide-react'

import { StatusBadge } from '@/components/dashboard/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import type { PaymentStudentsTableProps } from './payment-students.types'
import { formatCurrency } from './payment-students.utils'

type Props = PaymentStudentsTableProps & {
  totalLoaded?: number
  totalStudents?: number
  loadingMore?: boolean
  hasMore?: boolean
  scrollRef?: React.RefObject<HTMLDivElement | null>
  sentinelRef?: React.RefObject<HTMLDivElement | null>
}

export default function PaymentStudentsTable({
  students,
  loading,
  filters,
  grades,
  paymentStatuses,
  hasFilters,
  onUpdateFilter,
  onClearFilters,
  onOpenStudent,
  totalLoaded = students.length,
  totalStudents = students.length,
  loadingMore = false,
  hasMore = false,
  scrollRef,
  sentinelRef,
}: Props) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div
          dir="rtl"
          className="flex items-center justify-between border-b px-5 py-3"
        >
          <h3 className="font-semibold">قائمة المدفوعات</h3>

          <span className="text-sm text-muted-foreground tabular-nums">
            عرض {totalLoaded} من {totalStudents} طالب
          </span>
        </div>

        <div
          ref={scrollRef}
          dir="rtl"
          className="h-[65vh] min-h-[350px] max-h-[650px] overflow-auto"
        >
          <div dir="rtl">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>

                  <TableHead className="min-w-[190px]">
                    <div className="space-y-2 py-1">
                      <div className="font-medium">اسم الطالب</div>
                      <input
                        type="text"
                        value={filters.name}
                        onChange={(event) =>
                          onUpdateFilter('name', event.target.value)
                        }
                        placeholder="بحث"
                        className="h-8 w-full rounded-md border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </TableHead>

                  <TableHead className="min-w-[150px]">
                    <div className="space-y-2 py-1">
                      <div className="font-medium">الرقم الشخصي</div>
                      <input
                        type="text"
                        value={filters.personalId}
                        onChange={(event) =>
                          onUpdateFilter('personalId', event.target.value)
                        }
                        placeholder="بحث"
                        className="h-8 w-full rounded-md border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </TableHead>

                  <TableHead className="min-w-[150px]">
                    <div className="space-y-2 py-1">
                      <div className="font-medium">الصف الأكاديمي</div>
                      <select
                        value={filters.grade}
                        onChange={(event) =>
                          onUpdateFilter('grade', event.target.value)
                        }
                        className="h-8 w-full rounded-md border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value="">الكل</option>
                        {grades.map((grade) => (
                          <option key={grade} value={grade}>
                            {grade}
                          </option>
                        ))}
                      </select>
                    </div>
                  </TableHead>

                  <TableHead className="min-w-[140px]">
                    <div className="space-y-2 py-1">
                      <div className="font-medium">المدفوع</div>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={filters.amountPaid}
                        onChange={(event) =>
                          onUpdateFilter('amountPaid', event.target.value)
                        }
                        placeholder="بحث"
                        className="h-8 w-full rounded-md border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </TableHead>

                  <TableHead className="min-w-[140px]">
                    <div className="space-y-2 py-1">
                      <div className="font-medium">المتبقي</div>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={filters.amountRemaining}
                        onChange={(event) =>
                          onUpdateFilter('amountRemaining', event.target.value)
                        }
                        placeholder="بحث"
                        className="h-8 w-full rounded-md border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </TableHead>

                  <TableHead className="min-w-[140px]">
                    <div className="space-y-2 py-1">
                      <div className="font-medium">الوضع</div>
                      <select
                        value={filters.paymentStatus}
                        onChange={(event) =>
                          onUpdateFilter('paymentStatus', event.target.value)
                        }
                        className="h-8 w-full rounded-md border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value="">الكل</option>
                        {paymentStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                  </TableHead>

                  <TableHead className="min-w-[150px] text-center">
                    إضافة دفعة
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-10 text-center text-muted-foreground"
                    >
                      جاري تحميل بيانات المدفوعات
                    </TableCell>
                  </TableRow>
                ) : students.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-10 text-center text-muted-foreground"
                    >
                      لا توجد نتائج مطابقة للفلاتر
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((student, index) => {
                    const remaining = student.feeExempt
                      ? 0
                      : Math.max(
                          student.amountDue - student.amountPaid,
                          0,
                        )

                    const canAddPayment =
                      !student.feeExempt && remaining > 0

                    return (
                      <TableRow key={student.id}>
                        <TableCell className="text-center text-muted-foreground">
                          {index + 1}
                        </TableCell>

                        <TableCell className="font-medium">
                          {student.name}
                        </TableCell>

                        <TableCell>
                          {student.personalId || '—'}
                        </TableCell>

                        <TableCell>{student.grade}</TableCell>

                        <TableCell className="font-medium tabular-nums">
                          {student.feeExempt
                            ? '—'
                            : formatCurrency(student.amountPaid)}
                        </TableCell>

                        <TableCell className="font-medium tabular-nums">
                          {student.feeExempt
                            ? '—'
                            : formatCurrency(remaining)}
                        </TableCell>

                        <TableCell>
                          <StatusBadge status={student.paymentStatus} />
                        </TableCell>

                        <TableCell className="text-center">
                          <Button
                            type="button"
                            size="sm"
                            variant={canAddPayment ? 'default' : 'outline'}
                            onClick={() => onOpenStudent(student)}
                          >
                            {canAddPayment ? (
                              <>
                                <Plus className="ml-1 size-4" />
                                إضافة دفعة
                              </>
                            ) : (
                              <>
                                <Eye className="ml-1 size-4" />
                                تفاصيل
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>

            <div
              ref={sentinelRef}
              className="flex min-h-12 items-center justify-center p-3"
            >
              {loadingMore && (
                <span className="text-sm text-muted-foreground">
                  جاري تحميل 50 طالب...
                </span>
              )}

              {!hasMore && !loading && students.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  تم عرض جميع الطلاب
                </span>
              )}
            </div>
          </div>
        </div>

        {hasFilters && (
          <div className="flex justify-end border-t px-5 py-3">
            <button
              type="button"
              onClick={onClearFilters}
              className="text-sm font-medium text-primary hover:underline"
            >
              مسح جميع الفلاتر
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
8
