'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  X,
  Eye,
} from 'lucide-react'

import { StatusBadge } from '@/components/dashboard/status-badge'
import { StatCard } from '@/components/dashboard/stat-card'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
} from '@/components/ui/card'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { students as fallbackStudents } from '@/lib/data'

import {
  getPaymentsCache,
  loadPaymentsCache,
  type PaymentStatus,
  type StudentRow,
} from '@/lib/payments-cache'

type Filters = {
  name: string
  personalId: string
  grade: string
  amountDue: string
  amountPaid: string
  amountRemaining: string
  paymentStatus: string
}

type PaymentMethod =
  | 'نقدي'
  | 'تحويل'
  | 'بطاقة'

type PaymentRecord = {
  id: string
  amount: number
  payment_method: string
  payment_date: string
  reference_number: string | null
  notes: string | null
  created_at: string
}

const emptyFilters: Filters = {
  name: '',
  personalId: '',
  grade: '',
  amountDue: '',
  amountPaid: '',
  amountRemaining: '',
  paymentStatus: '',
}

export function PaymentStudents() {
  const router = useRouter()

  const initialCache =
    getPaymentsCache()

  const [returnPath, setReturnPath] =
    useState('')

  const [
    studentIdFromUrl,
    setStudentIdFromUrl,
  ] = useState<string | null>(null)

  const autoOpenedStudentRef =
    useRef<string | null>(null)

  const [filters, setFilters] =
    useState<Filters>(
      emptyFilters,
    )

  const [studentList, setStudentList] =
    useState<StudentRow[]>(
      initialCache?.studentList ?? [],
    )

  const [loading, setLoading] =
    useState(
      initialCache === null,
    )

  const [
    currentAcademicYearId,
    setCurrentAcademicYearId,
  ] = useState<string | null>(
    initialCache?.currentAcademicYearId ??
      null,
  )

  const [
    currentAcademicYearName,
    setCurrentAcademicYearName,
  ] = useState(
    initialCache?.currentAcademicYearName ??
      '',
  )

  const [
    currentAnnualFee,
    setCurrentAnnualFee,
  ] = useState(
    initialCache?.currentAnnualFee ??
      0,
  )

  const [
    detailsDialogOpen,
    setDetailsDialogOpen,
  ] = useState(false)

  const [
    detailsStudent,
    setDetailsStudent,
  ] = useState<StudentRow | null>(
    null,
  )

  const [
    paymentHistory,
    setPaymentHistory,
  ] = useState<PaymentRecord[]>([])

  const [
    loadingHistory,
    setLoadingHistory,
  ] = useState(false)

  const [
    savingPayment,
    setSavingPayment,
  ] = useState(false)

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search,
      )

    setReturnPath(
      params.get('return') || '',
    )

    setStudentIdFromUrl(
      params.get('student'),
    )
  }, [])

  const applyPaymentsCache = (
    cache: Awaited<
      ReturnType<typeof loadPaymentsCache>
    >,
  ) => {
    setStudentList(
      cache.studentList,
    )

    setCurrentAcademicYearId(
      cache.currentAcademicYearId,
    )

    setCurrentAcademicYearName(
      cache.currentAcademicYearName,
    )

    setCurrentAnnualFee(
      cache.currentAnnualFee,
    )

    setLoading(false)

    if (detailsStudent) {
      const updatedStudent =
        cache.studentList.find(
          (student) =>
            student.id ===
            detailsStudent.id,
        )

      if (updatedStudent) {
        setDetailsStudent(
          updatedStudent,
        )
      }
    }
  }

  const loadPayments = async (
    force = false,
  ): Promise<StudentRow[]> => {
    try {
      const cache =
        await loadPaymentsCache({
          force,
        })

      applyPaymentsCache(cache)

      return cache.studentList
    } catch (error) {
      console.error(
        'Failed to load payments:',
        error,
      )

      const existingCache =
        getPaymentsCache()

      if (existingCache) {
        applyPaymentsCache(
          existingCache,
        )

        return existingCache.studentList
      }

      const fallback:
        StudentRow[] =
        fallbackStudents.map(
          (student: any) => {
            const paymentStatus:
              PaymentStatus =
              student.paymentStatus ===
              'معفي'
                ? 'معفي'
                : student.paymentStatus ===
                    'مدفوع بالكامل'
                  ? 'مدفوع بالكامل'
                  : student.paymentStatus ===
                      'مدفوع جزئياً'
                    ? 'مدفوع جزئياً'
                    : 'غير مدفوع'

            return {
              id: String(
                student.id,
              ),
              name: String(
                student.name ?? '',
              ),
              personalId: String(
                student.personalId ??
                  '',
              ),
              grade: String(
                student.grade ??
                  'غير محدد',
              ),
              amountDue: Number(
                student.amountDue ??
                  0,
              ),
              amountPaid: Number(
                student.amountPaid ??
                  0,
              ),
              feeExempt:
                paymentStatus ===
                'معفي',
              paymentStatus,
            }
          },
        )

      setStudentList(
        fallback,
      )

      setLoading(false)

      return fallback
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const cache =
      getPaymentsCache()

    if (cache) {
      applyPaymentsCache(cache)
      return
    }

    void loadPayments()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (
      loading ||
      !studentIdFromUrl ||
      detailsDialogOpen ||
      autoOpenedStudentRef.current ===
        studentIdFromUrl
    ) {
      return
    }

    const student =
      studentList.find(
        (item) =>
          item.id ===
          studentIdFromUrl,
      )

    if (!student) {
      return
    }

    autoOpenedStudentRef.current =
      studentIdFromUrl

    void openDetailsDialog(
      student,
    )
  }, [
    loading,
    studentIdFromUrl,
    studentList,
    detailsDialogOpen,
  ])

  const updateFilter = (
    key: keyof Filters,
    value: string,
  ) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const grades = useMemo(
    () =>
      Array.from(
        new Set(
          studentList.map(
            (student) =>
              student.grade,
          ),
        ),
      ).sort(),
    [studentList],
  )

  const paymentStatuses =
    useMemo(
      () =>
        Array.from(
          new Set(
            studentList.map(
              (student) =>
                student.paymentStatus,
            ),
          ),
        ),
      [studentList],
    )

  const filteredStudents =
    useMemo(() => {
      return studentList.filter(
        (student) => {
          const remaining =
            student.feeExempt
              ? 0
              : Math.max(
                  student.amountDue -
                    student.amountPaid,
                  0,
                )

          const matchesName =
            !filters.name ||
            student.name
              .toLowerCase()
              .includes(
                filters.name.toLowerCase(),
              )

          const matchesPersonalId =
            !filters.personalId ||
            student.personalId.includes(
              filters.personalId,
            )

          const matchesGrade =
            !filters.grade ||
            student.grade ===
              filters.grade

          const matchesDue =
            !filters.amountDue ||
            String(
              student.amountDue,
            ).includes(
              filters.amountDue,
            )

          const matchesPaid =
            !filters.amountPaid ||
            String(
              student.amountPaid,
            ).includes(
              filters.amountPaid,
            )

          const matchesRemaining =
            !filters.amountRemaining ||
            String(
              remaining,
            ).includes(
              filters.amountRemaining,
            )

          const matchesStatus =
            !filters.paymentStatus ||
            student.paymentStatus ===
              filters.paymentStatus

          return (
            matchesName &&
            matchesPersonalId &&
            matchesGrade &&
            matchesDue &&
            matchesPaid &&
            matchesRemaining &&
            matchesStatus
          )
        },
      )
    }, [
      studentList,
      filters,
    ])

  const totalDue =
    filteredStudents.reduce(
      (total, student) =>
        total +
        (student.feeExempt
          ? 0
          : student.amountDue),
      0,
    )

  const totalPaid =
    filteredStudents.reduce(
      (total, student) =>
        total +
        (student.feeExempt
          ? 0
          : student.amountPaid),
      0,
    )

  const totalExempt =
    filteredStudents.filter(
      (student) =>
        student.feeExempt,
    ).length

  const collectionPercentage =
    totalDue > 0
      ? Math.round(
          (totalPaid /
            totalDue) *
            100,
        )
      : 0

  const exemptionPercentage =
    filteredStudents.length > 0
      ? Math.round(
          (totalExempt /
            filteredStudents.length) *
            100,
        )
      : 0

  const paymentStats = [
    {
      label: 'إجمالي المستحق',
      value:
        formatCurrency(
          totalDue,
        ),
      change: `${filteredStudents.length} طالب`,
      trend: 'up' as const,
      hint: 'إجمالي الرسوم',
    },
    {
      label: 'إجمالي المدفوع',
      value:
        formatCurrency(
          totalPaid,
        ),
      change: `${collectionPercentage}٪`,
      trend: 'up' as const,
      hint: 'نسبة التحصيل',
    },
    {
      label: 'نسبة التحصيل',
      value: `${collectionPercentage}٪`,
      change:
        formatCurrency(
          Math.max(
            totalDue -
              totalPaid,
            0,
          ),
        ),
      trend: 'down' as const,
      hint: 'المتبقي للتحصيل',
    },
    {
      label: 'نسبة المعفين',
      value: `${exemptionPercentage}٪`,
      change: `${totalExempt} طالب`,
      trend: 'down' as const,
      hint: 'من إجمالي الطلاب',
    },
  ]

  const hasFilters =
    Object.values(filters).some(
      (value) => value !== '',
    )

  const clearFilters = () => {
    setFilters(emptyFilters)
  }

  const openPaymentDialog = (
    student: StudentRow,
  ) => {
    void openDetailsDialog(
      student,
    )
  }

  const openDetailsDialog =
    async (
      student: StudentRow,
    ) => {
      if (
        !currentAcademicYearId
      ) {
        alert(
          'لا توجد سنة دراسية حالية مفعلة.',
        )
        return
      }

      setDetailsStudent(student)
      setDetailsDialogOpen(true)
      setLoadingHistory(true)
      setPaymentHistory([])

      try {
        const response =
          await fetch(
            `/api/payments/history?studentId=${encodeURIComponent(
              student.id,
            )}&academicYearId=${encodeURIComponent(
              currentAcademicYearId,
            )}`,
            {
              method: 'GET',
              cache: 'no-store',
            },
          )

        const data =
          await response
            .json()
            .catch(() => null)

        if (!response.ok) {
          throw new Error(
            data?.error ||
              'تعذر تحميل سجل الدفعات.',
          )
        }

        setPaymentHistory(
          (data?.payments ??
            []) as PaymentRecord[],
        )
      } catch (error) {
        console.error(
          'Failed to load payment history:',
          error,
        )

        alert(
          getErrorMessage(
            error,
            'تعذر تحميل سجل الدفعات.',
          ),
        )
      } finally {
        setLoadingHistory(false)
      }
    }

  const closeDetailsDialog =
    () => {
      if (
        loadingHistory ||
        savingPayment
      ) {
        return
      }

      setDetailsDialogOpen(false)
      setDetailsStudent(null)
      setPaymentHistory([])

      if (returnPath) {
        router.push(
          returnPath,
        )
      }
    }

  const handleAddPayment =
    async (
      event: React.FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault()

      if (
        !detailsStudent ||
        !currentAcademicYearId
      ) {
        alert(
          'تعذر تحديد الطالب أو السنة الدراسية.',
        )
        return
      }

      const form =
        event.currentTarget

      const formData =
        new FormData(form)

      const amount = Number(
        formData.get(
          'amount',
        ) || 0,
      )

      const paymentMethod =
        String(
          formData.get(
            'paymentMethod',
          ) || 'نقدي',
        ) as PaymentMethod

      const paymentDate =
        String(
          formData.get(
            'paymentDate',
          ) || '',
        ).trim()

      const referenceNumber =
        String(
          formData.get(
            'referenceNumber',
          ) || '',
        ).trim()

      const notes =
        String(
          formData.get(
            'notes',
          ) || '',
        ).trim()

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        alert(
          'أدخل مبلغاً صحيحاً.',
        )
        return
      }

      if (!paymentDate) {
        alert(
          'اختر تاريخ الدفع.',
        )
        return
      }

      const remaining =
        selectedRemaining(
          detailsStudent,
        )

      if (remaining <= 0) {
        alert(
          'لا يوجد مبلغ متبقٍ على هذا الطالب.',
        )
        return
      }

      if (amount > remaining) {
        alert(
          `المبلغ أكبر من المبلغ المتبقي. المتبقي: ${formatCurrency(
            remaining,
          )}`,
        )
        return
      }

      setSavingPayment(true)

      try {
        const paymentPayload = {
          student_id:
            detailsStudent.id,

          academic_year_id:
            currentAcademicYearId,

          amount: Number(
            amount.toFixed(3),
          ),

          payment_method:
            paymentMethod,

          payment_date:
            paymentDate,

          reference_number:
            referenceNumber ||
            null,

          notes:
            notes || null,
        }

        const response =
          await fetch(
            '/api/payments',
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json',
              },
              body: JSON.stringify(
                paymentPayload,
              ),
            },
          )

        const data =
          await response
            .json()
            .catch(() => null)

        if (!response.ok) {
          throw new Error(
            data?.error ||
              'تعذر حفظ الدفعة.',
          )
        }

        const insertedPayment =
          data?.payment

        if (!insertedPayment) {
          throw new Error(
            'تم إرسال الدفعة ولكن لم يتم إرجاع سجل الدفعة.',
          )
        }

        /*
         * إجبار تحديث الكاش بعد إضافة الدفعة
         * حتى تتحدث المبالغ والحالة مباشرة.
         */
        const refreshedStudents =
          await loadPayments(true)

        const refreshedStudent =
          refreshedStudents.find(
            (student) =>
              student.id ===
              detailsStudent.id,
          )

        if (
          refreshedStudent
        ) {
          setDetailsStudent(
            refreshedStudent,
          )
        }

        try {
          const historyResponse =
            await fetch(
              `/api/payments/history?studentId=${encodeURIComponent(
                detailsStudent.id,
              )}&academicYearId=${encodeURIComponent(
                currentAcademicYearId,
              )}`,
              {
                method: 'GET',
                cache: 'no-store',
              },
            )

          const historyData =
            await historyResponse
              .json()
              .catch(() => null)

          if (
            historyResponse.ok
          ) {
            setPaymentHistory(
              (historyData?.payments ??
                []) as PaymentRecord[],
            )
          }
        } catch (
          historyError
        ) {
          console.error(
            'Failed to refresh payment history:',
            historyError,
          )
        }

        form.reset()

        const dateInput =
          form.elements.namedItem(
            'paymentDate',
          ) as HTMLInputElement | null

        if (dateInput) {
          dateInput.value =
            getToday()
        }

        alert(
          'تم تسجيل الدفعة بنجاح.',
        )
      } catch (error) {
        console.error(
          'Failed to add payment:',
          error,
        )

        alert(
          getErrorMessage(
            error,
            'تعذر حفظ الدفعة.',
          ),
        )
      } finally {
        setSavingPayment(false)
      }
    }

  return (
    <div className="space-y-6">
      {currentAcademicYearName && (
        <Card>
          <CardContent className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                السنة الدراسية الحالية
              </p>

              <p className="text-lg font-semibold">
                {
                  currentAcademicYearName
                }
              </p>
            </div>

            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                الرسوم السنوية
              </p>

              <p className="text-lg font-semibold tabular-nums">
                {formatCurrency(
                  currentAnnualFee,
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {paymentStats.map(
          (stat) => (
            <StatCard
              key={stat.label}
              stat={stat}
            />
          ),
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">
                    #
                  </TableHead>

                  <TableHead className="min-w-[190px]">
                    <div className="space-y-2 py-1">
                      <div className="font-medium">
                        اسم الطالب
                      </div>

                      <input
                        type="text"
                        value={
                          filters.name
                        }
                        onChange={(
                          event,
                        ) =>
                          updateFilter(
                            'name',
                            event.target.value,
                          )
                        }
                        placeholder="بحث"
                        className="h-8 w-full rounded-md border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </TableHead>

                  <TableHead className="min-w-[150px]">
                    <div className="space-y-2 py-1">
                      <div className="font-medium">
                        الرقم الشخصي
                      </div>

                      <input
                        type="text"
                        value={
                          filters.personalId
                        }
                        onChange={(
                          event,
                        ) =>
                          updateFilter(
                            'personalId',
                            event.target.value,
                          )
                        }
                        placeholder="بحث"
                        className="h-8 w-full rounded-md border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </TableHead>

                  <TableHead className="min-w-[150px]">
                    <div className="space-y-2 py-1">
                      <div className="font-medium">
                        الصف الأكاديمي
                      </div>

                      <select
                        value={
                          filters.grade
                        }
                        onChange={(
                          event,
                        ) =>
                          updateFilter(
                            'grade',
                            event.target.value,
                          )
                        }
                        className="h-8 w-full rounded-md border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value="">
                          الكل
                        </option>

                        {grades.map(
                          (
                            grade,
                          ) => (
                            <option
                              key={
                                grade
                              }
                              value={
                                grade
                              }
                            >
                              {
                                grade
                              }
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                  </TableHead>

                  <TableHead className="min-w-[140px]">
                    <div className="space-y-2 py-1">
                      <div className="font-medium">
                        المدفوع
                      </div>

                      <input
                        type="text"
                        inputMode="decimal"
                        value={
                          filters.amountPaid
                        }
                        onChange={(
                          event,
                        ) =>
                          updateFilter(
                            'amountPaid',
                            event.target.value,
                          )
                        }
                        placeholder="بحث"
                        className="h-8 w-full rounded-md border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </TableHead>

                  <TableHead className="min-w-[140px]">
                    <div className="space-y-2 py-1">
                      <div className="font-medium">
                        المتبقي
                      </div>

                      <input
                        type="text"
                        inputMode="decimal"
                        value={
                          filters.amountRemaining
                        }
                        onChange={(
                          event,
                        ) =>
                          updateFilter(
                            'amountRemaining',
                            event.target.value,
                          )
                        }
                        placeholder="بحث"
                        className="h-8 w-full rounded-md border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </TableHead>

                  <TableHead className="min-w-[140px]">
                    <div className="space-y-2 py-1">
                      <div className="font-medium">
                        الوضع
                      </div>

                      <select
                        value={
                          filters.paymentStatus
                        }
                        onChange={(
                          event,
                        ) =>
                          updateFilter(
                            'paymentStatus',
                            event.target.value,
                          )
                        }
                        className="h-8 w-full rounded-md border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value="">
                          الكل
                        </option>

                        {paymentStatuses.map(
                          (
                            status,
                          ) => (
                            <option
                              key={
                                status
                              }
                              value={
                                status
                              }
                            >
                              {
                                status
                              }
                            </option>
                          ),
                        )}
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
                ) : filteredStudents.length ===
                  0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-10 text-center text-muted-foreground"
                    >
                      لا توجد نتائج مطابقة للفلاتر
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map(
                    (
                      student,
                      index,
                    ) => {
                      const remaining =
                        student.feeExempt
                          ? 0
                          : Math.max(
                              student.amountDue -
                                student.amountPaid,
                              0,
                            )

                      const canAddPayment =
                        !student.feeExempt &&
                        remaining >
                          0

                      return (
                        <TableRow
                          key={
                            student.id
                          }
                        >
                          <TableCell className="text-center text-muted-foreground">
                            {
                              index +
                              1
                            }
                          </TableCell>

                          <TableCell className="font-medium">
                            {
                              student.name
                            }
                          </TableCell>

                          <TableCell>
                            {
                              student.personalId ||
                              '—'
                            }
                          </TableCell>

                          <TableCell>
                            {
                              student.grade
                            }
                          </TableCell>

                          <TableCell className="font-medium tabular-nums">
                            {student.feeExempt
                              ? '—'
                              : formatCurrency(
                                  student.amountPaid,
                                )}
                          </TableCell>

                          <TableCell className="font-medium tabular-nums">
                            {student.feeExempt
                              ? '—'
                              : formatCurrency(
                                  remaining,
                                )}
                          </TableCell>

                          <TableCell>
                            <StatusBadge
                              status={
                                student.paymentStatus
                              }
                            />
                          </TableCell>

                          <TableCell className="text-center">
                            {canAddPayment ? (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() =>
                                  openPaymentDialog(
                                    student,
                                  )
                                }
                              >
                                <Plus className="ml-1 size-4" />
                                إضافة دفعة
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  openPaymentDialog(
                                    student,
                                  )
                                }
                              >
                                <Eye className="ml-1 size-4" />
                                تفاصيل
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    },
                  )
                )}
              </TableBody>
            </Table>
          </div>

          {hasFilters && (
            <div className="flex justify-end border-t px-5 py-3">
              <button
                type="button"
                onClick={
                  clearFilters
                }
                className="text-sm font-medium text-primary hover:underline"
              >
                مسح جميع الفلاتر
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {detailsDialogOpen &&
        detailsStudent && (
          <div
            className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-0 sm:p-4"
            dir="rtl"
          >
            <div className="flex min-h-full w-full items-center justify-center">
              <Card className="my-0 w-full rounded-none sm:my-4 sm:max-w-2xl sm:rounded-2xl">
                <CardContent className="p-0">
                  <div className="flex items-start justify-between gap-4 border-b p-4 sm:p-6">
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold">
                        تفاصيل المدفوعات
                      </h2>

                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {
                          detailsStudent.name
                        }
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        السنة الدراسية:{' '}
                        {
                          currentAcademicYearName
                        }
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={
                        closeDetailsDialog
                      }
                      disabled={
                        loadingHistory ||
                        savingPayment
                      }
                      className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-muted"
                      aria-label="إغلاق"
                    >
                      <X className="size-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 border-b p-4 sm:grid-cols-3 sm:p-6">
                    <div className="rounded-lg bg-muted/50 p-4">
                      <p className="text-xs text-muted-foreground">
                        الرسوم السنوية
                      </p>

                      <p className="mt-1 font-semibold tabular-nums">
                        {detailsStudent.feeExempt
                          ? 'معفي'
                          : formatCurrency(
                              detailsStudent.amountDue,
                            )}
                      </p>
                    </div>

                    <div className="rounded-lg bg-muted/50 p-4">
                      <p className="text-xs text-muted-foreground">
                        إجمالي المدفوع
                      </p>

                      <p className="mt-1 font-semibold tabular-nums">
                        {detailsStudent.feeExempt
                          ? '—'
                          : formatCurrency(
                              detailsStudent.amountPaid,
                            )}
                      </p>
                    </div>

                    <div className="rounded-lg bg-muted/50 p-4">
                      <p className="text-xs text-muted-foreground">
                        المتبقي
                      </p>

                      <p className="mt-1 font-semibold tabular-nums">
                        {detailsStudent.feeExempt
                          ? '—'
                          : formatCurrency(
                              Math.max(
                                detailsStudent.amountDue -
                                  detailsStudent.amountPaid,
                                0,
                              ),
                            )}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6 p-4 sm:p-6">
                    <section>
                      <div className="mb-3">
                        <h3 className="font-semibold">
                          سجل الدفعات
                        </h3>

                        <p className="text-xs text-muted-foreground">
                          {
                            paymentHistory.length
                          }{' '}
                          دفعة
                        </p>
                      </div>

                      {loadingHistory ? (
                        <div className="py-10 text-center text-sm text-muted-foreground">
                          جاري تحميل سجل الدفعات
                        </div>
                      ) : paymentHistory.length ===
                        0 ? (
                        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                          لا توجد دفعات مسجلة لهذا الطالب في السنة الحالية.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {paymentHistory.map(
                            (
                              payment,
                            ) => (
                              <div
                                key={
                                  payment.id
                                }
                                className="rounded-lg border p-4"
                              >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div>
                                    <p className="text-sm text-muted-foreground">
                                      تاريخ الدفع
                                    </p>

                                    <p className="mt-1 font-medium">
                                      {formatPaymentDate(
                                        payment.payment_date,
                                      )}
                                    </p>
                                  </div>

                                  <div className="sm:text-right">
                                    <p className="text-sm text-muted-foreground">
                                      المبلغ
                                    </p>

                                    <p className="mt-1 text-lg font-semibold tabular-nums">
                                      {formatCurrency(
                                        Number(
                                          payment.amount,
                                        ),
                                      )}
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-4 grid grid-cols-1 gap-3 border-t pt-3 sm:grid-cols-2">
                                  <div>
                                    <p className="text-xs text-muted-foreground">
                                      طريقة الدفع
                                    </p>

                                    <p className="mt-1 text-sm font-medium">
                                      {
                                        payment.payment_method
                                      }
                                    </p>
                                  </div>

                                  {payment.reference_number && (
                                    <div>
                                      <p className="text-xs text-muted-foreground">
                                        رقم العملية
                                      </p>

                                      <p className="mt-1 break-words text-sm font-medium">
                                        {
                                          payment.reference_number
                                        }
                                      </p>
                                    </div>
                                  )}

                                  {payment.notes && (
                                    <div className="sm:col-span-2">
                                      <p className="text-xs text-muted-foreground">
                                        ملاحظات
                                      </p>

                                      <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                                        {
                                          payment.notes
                                        }
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </section>

                    {!detailsStudent.feeExempt &&
                      Math.max(
                        detailsStudent.amountDue -
                          detailsStudent.amountPaid,
                        0,
                      ) > 0 && (
                        <section className="border-t pt-6">
                          <div className="mb-4">
                            <h3 className="font-semibold">
                              إضافة دفعة
                            </h3>

                            <p className="mt-1 text-xs text-muted-foreground">
                              يمكنك تسجيل دفعة جزئية أو تسديد المبلغ المتبقي بالكامل.
                            </p>
                          </div>

                          <form
                            onSubmit={
                              handleAddPayment
                            }
                            className="space-y-4"
                          >
                            <div>
                              <label className="mb-1.5 block text-sm font-medium">
                                المبلغ
                              </label>

                              <input
                                name="amount"
                                type="number"
                                step="0.001"
                                min="0.001"
                                max={Math.max(
                                  detailsStudent.amountDue -
                                    detailsStudent.amountPaid,
                                  0,
                                )}
                                required
                                disabled={
                                  savingPayment
                                }
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
                                disabled={
                                  savingPayment
                                }
                                className="h-10 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-primary/30"
                              >
                                <option value="نقدي">
                                  نقدي
                                </option>

                                <option value="تحويل">
                                  تحويل
                                </option>

                                <option value="بطاقة">
                                  بطاقة
                                </option>
                              </select>
                            </div>

                            <div>
                              <label className="mb-1.5 block text-sm font-medium">
                                تاريخ الدفع
                              </label>

                              <input
                                name="paymentDate"
                                type="date"
                                defaultValue={
                                  getToday()
                                }
                                required
                                disabled={
                                  savingPayment
                                }
                                className="h-10 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-primary/30"
                              />
                            </div>

                            <div>
                              <label className="mb-1.5 block text-sm font-medium">
                                رقم العملية
                                <span className="mr-1 text-xs text-muted-foreground">
                                  اختياري
                                </span>
                              </label>

                              <input
                                name="referenceNumber"
                                type="text"
                                disabled={
                                  savingPayment
                                }
                                className="h-10 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-primary/30"
                              />
                            </div>

                            <div>
                              <label className="mb-1.5 block text-sm font-medium">
                                ملاحظات
                                <span className="mr-1 text-xs text-muted-foreground">
                                  اختياري
                                </span>
                              </label>

                              <textarea
                                name="notes"
                                rows={3}
                                disabled={
                                  savingPayment
                                }
                                className="w-full rounded-md border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30"
                              />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                              <Button
                                type="submit"
                                disabled={
                                  savingPayment
                                }
                              >
                                {savingPayment
                                  ? 'جاري حفظ الدفعة...'
                                  : 'حفظ الدفعة'}
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
                      onClick={
                        closeDetailsDialog
                      }
                      disabled={
                        loadingHistory ||
                        savingPayment
                      }
                    >
                      إغلاق
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
    </div>
  )
}

function selectedRemaining(
  student: StudentRow,
) {
  if (student.feeExempt) {
    return 0
  }

  return Math.max(
    student.amountDue -
      student.amountPaid,
    0,
  )
}

function formatCurrency(
  value: number,
) {
  return `${value.toLocaleString(
    'ar-BH',
    {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    },
  )} د.ب`
}

function formatPaymentDate(
  value: string,
) {
  if (!value) {
    return '—'
  }

  const [
    year,
    month,
    day,
  ] = value.split('-')

  if (
    !year ||
    !month ||
    !day
  ) {
    return value
  }

  return `${day}/${month}/${year}`
}

function getToday() {
  const today =
    new Date()

  const year =
    today.getFullYear()

  const month =
    String(
      today.getMonth() + 1,
    ).padStart(2, '0')

  const day =
    String(
      today.getDate(),
    ).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getErrorMessage(
  error: unknown,
  fallback: string,
) {
  if (
    error &&
    typeof error === 'object'
  ) {
    const apiError =
      error as {
        message?: string
      }

    if (apiError.message) {
      return apiError.message
    }
  }

  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message
  }

  return fallback
}