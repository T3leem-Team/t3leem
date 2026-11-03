'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { StatCard } from '@/components/dashboard/stat-card'
import { Card, CardContent } from '@/components/ui/card'

import { students as fallbackStudents } from '@/lib/data'
import {
  getPaymentsCache,
  loadPaymentsCache,
  loadMorePaymentsCache,
  type PaymentStatus,
  type StudentRow,
  type PaymentLevel,
} from '@/lib/payments-cache'

import {
  getPaymentHistory,
  createPayment,
  updatePayment,
} from '@/lib/features/payments/repositories/payments.repository'

import PaymentStudentsTable from './payment-students.table'
import PaymentDetailsModal from './payment-students.details-modal'
import PaymentEditModal from './payment-students.edit-modal'

import {
  emptyFilters,
  type Filters,
  type PaymentMethod,
  type PaymentRecord,
} from './payment-students.types'

import {
  formatCurrency,
  getErrorMessage,
  getToday,
  selectedRemaining,
} from './payment-students.utils'

type PaymentsSummary = {
  totalStudents: number
  totalExempt: number
  totalDue: number
  totalPaid: number
}

const EMPTY_SUMMARY: PaymentsSummary = {
  totalStudents: 0,
  totalExempt: 0,
  totalDue: 0,
  totalPaid: 0,
}

export function PaymentStudents() {
  const router = useRouter()
  const initialCache = getPaymentsCache()

  const [returnPath, setReturnPath] = useState('')
  const [studentIdFromUrl, setStudentIdFromUrl] = useState<string | null>(null)

  const autoOpenedStudentRef = useRef<string | null>(null)
  const initialLoadDoneRef = useRef(Boolean(initialCache))

  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [search, setSearch] = useState('')

  const [studentList, setStudentList] = useState<StudentRow[]>(
    initialCache?.studentList ?? [],
  )

  const [levels, setLevels] = useState<PaymentLevel[]>(
    initialCache?.levels ?? [],
  )

  const [loading, setLoading] = useState(initialCache === null)
  const [loadingMore, setLoadingMore] = useState(false)

  const [totalStudents, setTotalStudents] = useState(
    initialCache?.totalStudents ?? 0,
  )

  const [hasMore, setHasMore] = useState(
    initialCache?.hasMore ?? false,
  )

  const [summary, setSummary] = useState<PaymentsSummary>(
    initialCache?.summary ?? EMPTY_SUMMARY,
  )

  const [currentAcademicYearId, setCurrentAcademicYearId] =
    useState<string | null>(initialCache?.currentAcademicYearId ?? null)

  const [currentAcademicYearName, setCurrentAcademicYearName] =
    useState(initialCache?.currentAcademicYearName ?? '')

  const [currentAnnualFee, setCurrentAnnualFee] =
    useState(initialCache?.currentAnnualFee ?? 0)

  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [detailsStudent, setDetailsStudent] = useState<StudentRow | null>(null)
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [savingPayment, setSavingPayment] = useState(false)
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setReturnPath(params.get('return') || '')
    setStudentIdFromUrl(params.get('student'))
  }, [])

  const applyPaymentsCache = (
    cache: NonNullable<Awaited<ReturnType<typeof loadPaymentsCache>>>,
  ) => {
    setStudentList(cache.studentList)
    setLevels(cache.levels ?? [])
    setCurrentAcademicYearId(cache.currentAcademicYearId)
    setCurrentAcademicYearName(cache.currentAcademicYearName)
    setCurrentAnnualFee(cache.currentAnnualFee)
    setTotalStudents(cache.totalStudents ?? 0)
    setHasMore(cache.hasMore ?? false)
    setSummary(cache.summary ?? EMPTY_SUMMARY)
    setLoading(false)

    if (detailsStudent) {
      const updatedStudent = cache.studentList.find(
        (student) => student.id === detailsStudent.id,
      )

      if (updatedStudent) {
        setDetailsStudent(updatedStudent)
      }
    }
  }

  const loadPayments = async (
    force = false,
    searchValue = search,
  ): Promise<StudentRow[]> => {
    try {
      const cache = await loadPaymentsCache({
        force,
        search: searchValue,
      })

      applyPaymentsCache(cache)
      return cache.studentList
    } catch (error) {
      console.error('Failed to load payments:', error)

      const existingCache = getPaymentsCache()

      if (existingCache) {
        applyPaymentsCache(existingCache)
        return existingCache.studentList
      }

      const fallback: StudentRow[] = fallbackStudents.map((student: any) => {
        const paymentStatus: PaymentStatus =
          student.paymentStatus === 'معفي'
            ? 'معفي'
            : student.paymentStatus === 'مدفوع بالكامل'
              ? 'مدفوع بالكامل'
              : student.paymentStatus === 'مدفوع جزئياً'
                ? 'مدفوع جزئياً'
                : 'غير مدفوع'

        return {
          id: String(student.id),
          name: String(student.name ?? ''),
          personalId: String(student.personalId ?? ''),
          levelId: student.levelId ? String(student.levelId) : null,
          grade: String(student.grade ?? 'غير محدد'),
          levelSortOrder:
            student.levelSortOrder == null
              ? null
              : Number(student.levelSortOrder),
          amountDue: Number(student.amountDue ?? 0),
          amountPaid: Number(student.amountPaid ?? 0),
          feeExempt: paymentStatus === 'معفي',
          paymentStatus,
        }
      })

      setLevels([])
      setStudentList(fallback)
      setLoading(false)

      return fallback
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const cache = getPaymentsCache()

    if (cache) {
      applyPaymentsCache(cache)
      initialLoadDoneRef.current = true
      return
    }

    void loadPayments().then(() => {
      initialLoadDoneRef.current = true
    })

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // البحث في جميع الطلاب من الخادم، وليس فقط الطلاب المحمّلين.
  useEffect(() => {
    if (!initialLoadDoneRef.current) return

    const timer = setTimeout(() => {
      setLoading(true)
      void loadPayments(true, search.trim())
    }, 350)

    return () => clearTimeout(timer)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  // تحميل الطالب المطلوب من رابط الصفحة إن كان موجوداً ضمن النتائج.
  useEffect(() => {
    if (
      loading ||
      !studentIdFromUrl ||
      detailsDialogOpen ||
      autoOpenedStudentRef.current === studentIdFromUrl
    ) {
      return
    }

    const student = studentList.find(
      (item) => item.id === studentIdFromUrl,
    )

    if (!student) return

    autoOpenedStudentRef.current = studentIdFromUrl
    void openDetailsDialog(student)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, studentIdFromUrl, studentList, detailsDialogOpen])

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return

    setLoadingMore(true)

    try {
      const cache = await loadMorePaymentsCache()

      if (cache) {
        applyPaymentsCache(cache)
      }
    } catch (error) {
      console.error('Failed to load more payment students:', error)
      alert(getErrorMessage(error, 'تعذر تحميل بقية الطلاب.'))
    } finally {
      setLoadingMore(false)
    }
  }

  // تحديث البيانات بعد إضافة أو تعديل دفعة، مع الاحتفاظ بعدد الصفحات المحمّلة.
  const refreshLoadedPayments = async (): Promise<StudentRow[]> => {
    const previousCount = getPaymentsCache()?.studentList.length ?? 50

    let cache = await loadPaymentsCache({
      force: true,
      search: search.trim(),
    })

    let attempts = 0

    while (
      cache.hasMore &&
      cache.studentList.length < previousCount &&
      attempts < 100
    ) {
      const nextCache = await loadMorePaymentsCache()

      if (!nextCache) break

      cache = nextCache
      attempts += 1
    }

    applyPaymentsCache(cache)

    return cache.studentList
  }

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const grades = useMemo(() => {
    const availableGrades = new Set(
      studentList.map((student) => student.grade),
    )

    const orderedGrades = levels
      .filter((level) => availableGrades.has(level.name))
      .map((level) => level.name)

    const matchedGrades = new Set(orderedGrades)

    const unmatchedGrades = Array.from(availableGrades)
      .filter((grade) => !matchedGrades.has(grade))
      .sort((a, b) => a.localeCompare(b, 'ar'))

    return [...orderedGrades, ...unmatchedGrades]
  }, [studentList, levels])

  const paymentStatuses = useMemo(
    () =>
      Array.from(
        new Set(studentList.map((student) => student.paymentStatus)),
      ),
    [studentList],
  )

  const filteredStudents = useMemo(
    () =>
      studentList.filter((student) => {
        const remaining = student.feeExempt
          ? 0
          : Math.max(student.amountDue - student.amountPaid, 0)

        const matchesName =
          !filters.name ||
          student.name.toLowerCase().includes(filters.name.toLowerCase())

        const matchesPersonalId =
          !filters.personalId ||
          student.personalId.includes(filters.personalId)

        const matchesGrade =
          !filters.grade || student.grade === filters.grade

        const matchesDue =
          !filters.amountDue ||
          String(student.amountDue).includes(filters.amountDue)

        const matchesPaid =
          !filters.amountPaid ||
          String(student.amountPaid).includes(filters.amountPaid)

        const matchesRemaining =
          !filters.amountRemaining ||
          String(remaining).includes(filters.amountRemaining)

        const matchesStatus =
          !filters.paymentStatus ||
          student.paymentStatus === filters.paymentStatus

        return (
          matchesName &&
          matchesPersonalId &&
          matchesGrade &&
          matchesDue &&
          matchesPaid &&
          matchesRemaining &&
          matchesStatus
        )
      }),
    [studentList, filters],
  )

  // الإحصائيات من جميع طلاب السنة الدراسية، وليس من الصفحة الحالية.
  const totalDue = summary.totalDue
  const totalPaid = summary.totalPaid
  const totalExempt = summary.totalExempt

  const collectionPercentage =
    totalDue > 0
      ? Math.round((totalPaid / totalDue) * 100)
      : 0

  const exemptionPercentage =
    summary.totalStudents > 0
      ? Math.round((totalExempt / summary.totalStudents) * 100)
      : 0

  const paymentStats = [
    {
      label: 'إجمالي المستحق',
      value: formatCurrency(totalDue),
      change: `${summary.totalStudents} طالب`,
      trend: 'up' as const,
      hint: 'إجمالي الرسوم',
    },
    {
      label: 'إجمالي المدفوع',
      value: formatCurrency(totalPaid),
      change: `${collectionPercentage}٪`,
      trend: 'up' as const,
      hint: 'نسبة التحصيل',
    },
    {
      label: 'نسبة التحصيل',
      value: `${collectionPercentage}٪`,
      change: formatCurrency(Math.max(totalDue - totalPaid, 0)),
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

  const hasFilters = Object.values(filters).some(
    (value) => value !== '',
  )

  const clearFilters = () => setFilters(emptyFilters)

  const openPaymentDialog = (student: StudentRow) => {
    void openDetailsDialog(student)
  }

  // تحميل سجل الدفعات عند اختيار الطالب فقط.
  const openDetailsDialog = async (student: StudentRow) => {
    if (!currentAcademicYearId) {
      alert('لا توجد سنة دراسية حالية مفعلة.')
      return
    }

    setDetailsStudent(student)
    setDetailsDialogOpen(true)
    setLoadingHistory(true)
    setPaymentHistory([])
    setEditingPayment(null)

    try {
      const data = await getPaymentHistory(
        student.id,
        currentAcademicYearId,
      )

      setPaymentHistory((data.payments ?? []) as PaymentRecord[])
    } catch (error) {
      console.error('Failed to load payment history:', error)
      alert(getErrorMessage(error, 'تعذر تحميل سجل الدفعات.'))
    } finally {
      setLoadingHistory(false)
    }
  }

  const closeDetailsDialog = () => {
    if (loadingHistory || savingPayment || savingEdit) return

    setDetailsDialogOpen(false)
    setDetailsStudent(null)
    setPaymentHistory([])
    setEditingPayment(null)

    if (returnPath) router.push(returnPath)
  }

  const refreshPaymentHistory = async (
    studentId: string,
    academicYearId: string,
  ) => {
    try {
      const data = await getPaymentHistory(studentId, academicYearId)

      setPaymentHistory((data.payments ?? []) as PaymentRecord[])
    } catch (historyError) {
      console.error('Failed to refresh payment history:', historyError)
    }
  }

  // إضافة دفعة جديدة.
  const handleAddPayment = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    if (!detailsStudent || !currentAcademicYearId) {
      alert('تعذر تحديد الطالب أو السنة الدراسية.')
      return
    }

    const form = event.currentTarget
    const formData = new FormData(form)
    const amount = Number(formData.get('amount') || 0)

    const paymentMethod = String(
      formData.get('paymentMethod') || 'نقدي',
    ) as PaymentMethod

    const paymentDate = String(
      formData.get('paymentDate') || '',
    ).trim()

    const referenceNumber = String(
      formData.get('referenceNumber') || '',
    ).trim()

    const notes = String(formData.get('notes') || '').trim()

    if (!Number.isFinite(amount) || amount <= 0) {
      alert('أدخل مبلغاً صحيحاً.')
      return
    }

    if (!paymentDate) {
      alert('اختر تاريخ الدفع.')
      return
    }

    const remaining = selectedRemaining(detailsStudent)

    if (remaining <= 0) {
      alert('لا يوجد مبلغ متبقٍ على هذا الطالب.')
      return
    }

    if (amount > remaining) {
      alert(
        `المبلغ أكبر من المبلغ المتبقي. المتبقي: ${formatCurrency(remaining)}`,
      )
      return
    }

    setSavingPayment(true)

    try {
      const paymentPayload = {
        student_id: detailsStudent.id,
        academic_year_id: currentAcademicYearId,
        amount: Number(amount.toFixed(3)),
        payment_method: paymentMethod,
        payment_date: paymentDate,
        reference_number: referenceNumber || null,
        notes: notes || null,
      }

      const data = await createPayment(paymentPayload)

      if (!data.payment) {
        throw new Error(
          'تم إرسال الدفعة ولكن لم يتم إرجاع سجل الدفعة.',
        )
      }

      const refreshedStudents = await refreshLoadedPayments()

      const refreshedStudent = refreshedStudents.find(
        (student) => student.id === detailsStudent.id,
      )

      if (refreshedStudent) {
        setDetailsStudent(refreshedStudent)
      }

      await refreshPaymentHistory(
        detailsStudent.id,
        currentAcademicYearId,
      )

      form.reset()

      const dateInput = form.elements.namedItem(
        'paymentDate',
      ) as HTMLInputElement | null

      if (dateInput) dateInput.value = getToday()

      alert('تم تسجيل الدفعة بنجاح.')
    } catch (error) {
      console.error('Failed to add payment:', error)
      alert(getErrorMessage(error, 'تعذر حفظ الدفعة.'))
    } finally {
      setSavingPayment(false)
    }
  }

  // تعديل دفعة موجودة باستخدام PATCH من خلال Repository.
  const handleEditPayment = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    if (!editingPayment || !detailsStudent || !currentAcademicYearId) {
      alert('تعذر تحديد الدفعة أو الطالب أو السنة الدراسية.')
      return
    }

    const form = event.currentTarget
    const formData = new FormData(form)
    const amount = Number(formData.get('editAmount') || 0)

    const paymentMethod = String(
      formData.get('editPaymentMethod') || 'نقدي',
    ) as PaymentMethod

    const paymentDate = String(
      formData.get('editPaymentDate') || '',
    ).trim()

    const referenceNumber = String(
      formData.get('editReferenceNumber') || '',
    ).trim()

    const notes = String(
      formData.get('editNotes') || '',
    ).trim()

    if (!Number.isFinite(amount) || amount <= 0) {
      alert('أدخل مبلغاً صحيحاً.')
      return
    }

    if (!paymentDate) {
      alert('اختر تاريخ الدفع.')
      return
    }

    setSavingEdit(true)

    try {
      const data = await updatePayment({
        payment_id: editingPayment.id,
        amount: Number(amount.toFixed(3)),
        payment_method: paymentMethod,
        payment_date: paymentDate,
        reference_number: referenceNumber || null,
        notes: notes || null,
      })

      if (!data.payment) {
        throw new Error(
          'تم تعديل الدفعة ولكن لم يتم إرجاع السجل المحدث.',
        )
      }

      const refreshedStudents = await refreshLoadedPayments()

      const refreshedStudent = refreshedStudents.find(
        (student) => student.id === detailsStudent.id,
      )

      if (refreshedStudent) {
        setDetailsStudent(refreshedStudent)
      }

      await refreshPaymentHistory(
        detailsStudent.id,
        currentAcademicYearId,
      )

      setEditingPayment(null)
      alert('تم تعديل الدفعة بنجاح.')
    } catch (error) {
      console.error('Failed to edit payment:', error)

      const paymentError = error as Error & {
        maxAmount?: number
      }

      if (paymentError.maxAmount != null) {
        alert(
          `${paymentError.message} الحد الأقصى المسموح: ${formatCurrency(
            Number(paymentError.maxAmount),
          )}`,
        )
      } else {
        alert(getErrorMessage(error, 'تعذر تعديل الدفعة.'))
      }
    } finally {
      setSavingEdit(false)
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
                {currentAcademicYearName}
              </p>
            </div>

            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                الرسوم السنوية
              </p>
              <p className="text-lg font-semibold tabular-nums">
                {formatCurrency(currentAnnualFee)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {paymentStats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">البحث في جميع الطلاب</p>
              <p className="text-sm text-muted-foreground">
                البحث يشمل جميع الطلاب، حتى غير المحمّلين في الجدول.
              </p>
            </div>

            <div className="w-full sm:max-w-sm">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="اسم الطالب أو الرقم الشخصي..."
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <PaymentStudentsTable
        students={filteredStudents}
        loading={loading}
        filters={filters}
        grades={grades}
        paymentStatuses={paymentStatuses}
        hasFilters={hasFilters}
        onUpdateFilter={updateFilter}
        onClearFilters={clearFilters}
        onOpenStudent={openPaymentDialog}
      />

      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-muted-foreground">
          عرض {studentList.length} من أصل {totalStudents} طالب
        </p>

        {hasMore && (
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loadingMore || loading}
            className="rounded-md border px-6 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingMore ? 'جاري تحميل الطلاب...' : 'تحميل 50 طالب إضافي'}
          </button>
        )}
      </div>

      {detailsDialogOpen && detailsStudent && (
        <PaymentDetailsModal
          student={detailsStudent}
          academicYearName={currentAcademicYearName}
          paymentHistory={paymentHistory}
          loadingHistory={loadingHistory}
          savingPayment={savingPayment}
          savingEdit={savingEdit}
          onClose={closeDetailsDialog}
          onEditPayment={setEditingPayment}
          onAddPayment={handleAddPayment}
        />
      )}

      {editingPayment && (
        <PaymentEditModal
          payment={editingPayment}
          studentName={detailsStudent?.name ?? ''}
          savingEdit={savingEdit}
          onClose={() => setEditingPayment(null)}
          onSubmit={handleEditPayment}
        />
      )}
    </div>
  )
}
