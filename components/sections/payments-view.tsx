'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Eye } from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/dashboard/page-header'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { StatCard } from '@/components/dashboard/stat-card'
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
import { students as fallbackStudents } from '@/lib/data'

type Filters = {
name: string
personalId: string
grade: string
amountDue: string
amountPaid: string
amountRemaining: string
paymentStatus: string
}

type PaymentMethod = 'نقدي' | 'تحويل' | 'بطاقة'

type PaymentStatus =
| 'مدفوع بالكامل'
| 'مدفوع جزئياً'
| 'غير مدفوع'
| 'معفي'

type StudentRow = {
id: string
name: string
personalId: string
grade: string
amountDue: number
amountPaid: number
feeExempt: boolean
paymentStatus: PaymentStatus
}

type PaymentRecord = {
id: string
amount: number
payment_method: string
payment_date: string
reference_number: string | null
notes: string | null
created_at: string
}

type AcademicYear = {
id: string
name: string
annual_fee: number | null
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

export function PaymentsView() {
const router = useRouter()

const [returnPath, setReturnPath] = useState('')
const [studentIdFromUrl, setStudentIdFromUrl] = useState<string | null>(null)

const autoOpenedStudentRef = useRef<string | null>(null)

const [filters, setFilters] = useState<Filters>(emptyFilters)

const [studentList, setStudentList] = useState<StudentRow[]>([])
const [loading, setLoading] = useState(true)

const [currentAcademicYearId, setCurrentAcademicYearId] =
useState<string | null>(null)

const [currentAcademicYearName, setCurrentAcademicYearName] = useState('')
const [currentAnnualFee, setCurrentAnnualFee] = useState(0)

const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
const [detailsStudent, setDetailsStudent] = useState<StudentRow | null>(null)

const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([])
const [loadingHistory, setLoadingHistory] = useState(false)
const [savingPayment, setSavingPayment] = useState(false)

useEffect(() => {
const params = new URLSearchParams(window.location.search)

```
setReturnPath(params.get('return') || '')
setStudentIdFromUrl(params.get('student'))
```

}, [])

const loadPayments = async (): Promise<StudentRow[]> => {
setLoading(true)

```
try {
  const {
    data: currentYear,
    error: yearError,
  } = await supabase
    .from('academic_years')
    .select('id, name, annual_fee')
    .eq('is_current', true)
    .eq('is_active', true)
    .maybeSingle()

  if (yearError) {
    throw yearError
  }

  if (!currentYear) {
    setStudentList([])
    setCurrentAcademicYearId(null)
    setCurrentAcademicYearName('')
    setCurrentAnnualFee(0)

    return []
  }

  const academicYear: AcademicYear = {
    id: currentYear.id,
    name: currentYear.name,
    annual_fee: currentYear.annual_fee,
  }

  const annualFee = Number(academicYear.annual_fee ?? 0)

  setCurrentAcademicYearId(academicYear.id)
  setCurrentAcademicYearName(academicYear.name)
  setCurrentAnnualFee(annualFee)

  const {
    data: students,
    error: studentsError,
  } = await supabase
    .from('students')
    .select('id, name, personal_id, fee_exempt, created_at')
    .order('created_at', {
      ascending: false,
    })

  if (studentsError) {
    throw studentsError
  }

  const {
    data: enrollments,
    error: enrollmentError,
  } = await supabase
    .from('enrollments')
    .select('student_id, level_id')
    .eq('academic_year_id', academicYear.id)
    .eq('status', 'نشط')

  if (enrollmentError) {
    throw enrollmentError
  }

  const studentIds = (enrollments ?? [])
    .map((item) => item.student_id)
    .filter(Boolean)

  let payments: Array<{
    student_id: string
    amount: number | null
  }> = []

  if (studentIds.length > 0) {
    const {
      data: paymentData,
      error: paymentError,
    } = await supabase
      .from('payments')
      .select('student_id, amount')
      .eq('academic_year_id', academicYear.id)
      .in('student_id', studentIds)

    if (paymentError) {
      throw paymentError
    }

    payments = paymentData ?? []
  }

  const {
    data: levels,
    error: levelsError,
  } = await supabase
    .from('levels')
    .select('id, name')
    .eq('is_active', true)

  if (levelsError) {
    throw levelsError
  }

  const levelMap = new Map<string, string>(
    (levels ?? []).map((level) => [
      level.id,
      level.name,
    ]),
  )

  const enrollmentMap = new Map<string, string>(
    (enrollments ?? []).map((enrollment) => [
      enrollment.student_id,
      levelMap.get(enrollment.level_id) ?? 'غير محدد',
    ]),
  )

  const paidByStudent = new Map<string, number>()

  payments.forEach((payment) => {
    const current = paidByStudent.get(payment.student_id) ?? 0

    paidByStudent.set(
      payment.student_id,
      current + Number(payment.amount ?? 0),
    )
  })

  const mappedStudents: StudentRow[] = (students ?? [])
    .filter((student) => enrollmentMap.has(student.id))
    .map((student) => {
      const amountPaid = paidByStudent.get(student.id) ?? 0
      const feeExempt = Boolean(student.fee_exempt)

      let paymentStatus: PaymentStatus

      if (feeExempt) {
        paymentStatus = 'معفي'
      } else if (annualFee > 0 && amountPaid >= annualFee) {
        paymentStatus = 'مدفوع بالكامل'
      } else if (amountPaid > 0) {
        paymentStatus = 'مدفوع جزئياً'
      } else {
        paymentStatus = 'غير مدفوع'
      }

      return {
        id: student.id,
        name: student.name,
        personalId: student.personal_id ?? '',
        grade: enrollmentMap.get(student.id) ?? 'غير محدد',
        amountDue: annualFee,
        amountPaid,
        feeExempt,
        paymentStatus,
      }
    })

  setStudentList(mappedStudents)

  if (detailsStudent) {
    const updatedStudent = mappedStudents.find(
      (student) => student.id === detailsStudent.id,
    )

    if (updatedStudent) {
      setDetailsStudent(updatedStudent)
    }
  }

  return mappedStudents
} catch (error) {
  console.error('Failed to load payments:', error)

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
      grade: String(student.grade ?? 'غير محدد'),
      amountDue: Number(student.amountDue ?? 0),
      amountPaid: Number(student.amountPaid ?? 0),
      feeExempt: paymentStatus === 'معفي',
      paymentStatus,
    }
  })

  setStudentList(fallback)

  return fallback
} finally {
  setLoading(false)
}
```

}

useEffect(() => {
void loadPayments()
}, [])

useEffect(() => {
if (
loading ||
!studentIdFromUrl ||
detailsDialogOpen ||
autoOpenedStudentRef.current === studentIdFromUrl
) {
return
}

```
const student = studentList.find(
  (item) => item.id === studentIdFromUrl,
)

if (!student) {
  return
}

autoOpenedStudentRef.current = studentIdFromUrl

void openDetailsDialog(student)
```

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
studentList.map((student) => student.grade),
),
).sort(),
[studentList],
)

const paymentStatuses = useMemo(
() =>
Array.from(
new Set(
studentList.map(
(student) => student.paymentStatus,
),
),
),
[studentList],
)

const filteredStudents = useMemo(() => {
return studentList.filter((student) => {
const remaining = student.feeExempt
? 0
: Math.max(
student.amountDue - student.amountPaid,
0,
)

```
  const matchesName =
    !filters.name ||
    student.name
      .toLowerCase()
      .includes(filters.name.toLowerCase())

  const matchesPersonalId =
    !filters.personalId ||
    student.personalId.includes(filters.personalId)

  const matchesGrade =
    !filters.grade ||
    student.grade === filters.grade

  const matchesDue =
    !filters.amountDue ||
    String(student.amountDue).includes(
      filters.amountDue,
    )

  const matchesPaid =
    !filters.amountPaid ||
    String(student.amountPaid).includes(
      filters.amountPaid,
    )

  const matchesRemaining =
    !filters.amountRemaining ||
    String(remaining).includes(
      filters.amountRemaining,
    )

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
})
```

}, [studentList, filters])

const totalDue = filteredStudents.reduce(
(total, student) =>
total +
(student.feeExempt ? 0 : student.amountDue),
0,
)

const totalPaid = filteredStudents.reduce(
(total, student) =>
total +
(student.feeExempt ? 0 : student.amountPaid),
0,
)

const totalExempt = filteredStudents.filter(
(student) => student.feeExempt,
).length

const collectionPercentage =
totalDue > 0
? Math.round((totalPaid / totalDue) * 100)
: 0

const exemptionPercentage =
filteredStudents.length > 0
? Math.round(
(totalExempt / filteredStudents.length) * 100,
)
: 0

const paymentStats = [
{
label: 'إجمالي المستحق',
value: formatCurrency(totalDue),
change: `${filteredStudents.length} طالب`,
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
change: formatCurrency(
Math.max(totalDue - totalPaid, 0),
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

const hasFilters = Object.values(filters).some(
(value) => value !== '',
)

const clearFilters = () => {
setFilters(emptyFilters)
}

const openPaymentDialog = (student: StudentRow) => {
void openDetailsDialog(student)
}

const openDetailsDialog = async (
student: StudentRow,
) => {
if (!currentAcademicYearId) {
return
}

```
setDetailsStudent(student)
setDetailsDialogOpen(true)
setLoadingHistory(true)
setPaymentHistory([])

try {
  const {
    data,
    error,
  } = await supabase
    .from('payments')
    .select(
      'id, amount, payment_method, payment_date, reference_number, notes, created_at',
    )
    .eq('student_id', student.id)
    .eq(
      'academic_year_id',
      currentAcademicYearId,
    )
    .order('payment_date', {
      ascending: false,
    })
    .order('created_at', {
      ascending: false,
    })

  if (error) {
    throw error
  }

  setPaymentHistory(
    (data ?? []) as PaymentRecord[],
  )
} catch (error) {
  console.error(
    'Failed to load payment history:',
    error,
  )

  alert('تعذر تحميل سجل الدفعات.')
} finally {
  setLoadingHistory(false)
}
```

}

const closeDetailsDialog = () => {
if (loadingHistory || savingPayment) {
return
}

```
setDetailsDialogOpen(false)
setDetailsStudent(null)
setPaymentHistory([])

if (returnPath) {
  router.push(returnPath)
}
```

}

const handleAddPayment = async (
event: React.FormEvent<HTMLFormElement>,
) => {
event.preventDefault()

```
if (
  !detailsStudent ||
  !currentAcademicYearId
) {
  return
}

const studentBeingPaid = detailsStudent
const studentBeingPaidId = detailsStudent.id

const formData = new FormData(
  event.currentTarget,
)

const amount = Number(
  formData.get('amount') || 0,
)

const paymentMethod = String(
  formData.get('paymentMethod') || 'نقدي',
) as PaymentMethod

const paymentDate = String(
  formData.get('paymentDate') || '',
)

const referenceNumber = String(
  formData.get('referenceNumber') || '',
).trim()

const notes = String(
  formData.get('notes') || '',
).trim()

if (!amount || amount <= 0) {
  alert('أدخل مبلغاً صحيحاً.')
  return
}

const remaining = Math.max(
  selectedRemaining(studentBeingPaid),
  0,
)

if (amount > remaining) {
  alert(
    'المبلغ أكبر من المبلغ المتبقي على الطالب.',
  )
  return
}

setSavingPayment(true)

try {
  const { error } = await supabase
    .from('payments')
    .insert({
      student_id: studentBeingPaidId,
      academic_year_id: currentAcademicYearId,
      amount,
      payment_method: paymentMethod,
      payment_date: paymentDate || undefined,
      reference_number:
        referenceNumber || null,
      notes: notes || null,
    })

  if (error) {
    throw error
  }

  const refreshedStudents =
    await loadPayments()

  const refreshedStudent =
    refreshedStudents.find(
      (student) =>
        student.id === studentBeingPaidId,
    )

  if (refreshedStudent) {
    await openDetailsDialog(
      refreshedStudent,
    )
  }

  event.currentTarget.reset()
} catch (error) {
  console.error(
    'Failed to add payment:',
    error,
  )

  alert(
    'تعذر حفظ الدفعة. حاول مرة أخرى.',
  )
} finally {
  setSavingPayment(false)
}
```

}

return ( <div className="space-y-6"> <PageHeader
     title="المدفوعات"
     description="متابعة الرسوم الدراسية والدفعات المسجلة للطلاب"
   />

```
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
      <StatCard
        key={stat.label}
        stat={stat}
      />
    ))}
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
                    value={filters.name}
                    onChange={(event) =>
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
                    value={filters.personalId}
                    onChange={(event) =>
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
                    value={filters.grade}
                    onChange={(event) =>
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

                    {grades.map((grade) => (
                      <option
                        key={grade}
                        value={grade}
                      >
                        {grade}
                      </option>
                    ))}
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
                    value={filters.amountPaid}
                    onChange={(event) =>
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
                    value={filters.amountRemaining}
                    onChange={(event) =>
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
                    value={filters.paymentStatus}
                    onChange={(event) =>
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
                      (status) => (
                        <option
                          key={status}
                          value={status}
                        >
                          {status}
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
            ) : filteredStudents.length === 0 ? (
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
                (student, index) => {
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
                    remaining > 0

                  return (
                    <TableRow
                      key={student.id}
                    >
                      <TableCell className="text-center text-muted-foreground">
                        {index + 1}
                      </TableCell>

                      <TableCell className="font-medium">
                        {student.name}
                      </TableCell>

                      <TableCell>
                        {student.personalId || '—'}
                      </TableCell>

                      <TableCell>
                        {student.grade}
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
            onClick={clearFilters}
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <Card className="max-h-[90vh] w-full max-w-2xl overflow-hidden">
          <CardContent className="flex max-h-[90vh] flex-col p-0">
            <div className="flex items-start justify-between gap-4 border-b p-6">
              <div>
                <h2 className="text-lg font-semibold">
                  تفاصيل المدفوعات
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  {detailsStudent.name}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  السنة الدراسية:{' '}
                  {currentAcademicYearName}
                </p>
              </div>

              <button
                type="button"
                onClick={closeDetailsDialog}
                disabled={
                  loadingHistory ||
                  savingPayment
                }
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 border-b p-6 sm:grid-cols-3">
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

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="flex min-h-0 flex-col">
                <div className="flex items-center justify-between gap-3 px-6 pb-3 pt-5">
                  <div>
                    <h3 className="font-semibold">
                      سجل الدفعات
                    </h3>

                    <p className="text-xs text-muted-foreground">
                      {paymentHistory.length} دفعة
                    </p>
                  </div>
                </div>

                <div className="px-6 pb-6">
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
                      {paymentHistory.map(
                        (payment) => (
                          <div
                            key={payment.id}
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

                              <div className="text-left sm:text-right">
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

                                  <p className="mt-1 text-sm font-medium">
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

                                  <p className="mt-1 whitespace-pre-wrap text-sm">
                                    {payment.notes}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>

                {!detailsStudent.feeExempt &&
                  Math.max(
                    detailsStudent.amountDue -
                      detailsStudent.amountPaid,
                    0,
                  ) > 0 && (
                    <div className="border-t bg-muted/20 px-6 py-5">
                      <div className="mb-4">
                        <h3 className="font-semibold">
                          إضافة دفعة
                        </h3>

                        <p className="mt-1 text-xs text-muted-foreground">
                          يمكنك تسجيل دفعة جزئية أو تسديد المبلغ المتبقي بالكامل.
                        </p>
                      </div>

                      <form
                        onSubmit={handleAddPayment}
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
                            defaultValue={getToday()}
                            required
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
                            className="w-full rounded-md border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <Button
                            type="submit"
                            disabled={savingPayment}
                          >
                            {savingPayment
                              ? 'جاري الحفظ'
                              : 'حفظ الدفعة'}
                          </Button>
                        </div>
                      </form>
                    </div>
                  )}
              </div>
            </div>
          </CardContent>
        </Card>
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
student.amountDue - student.amountPaid,
0,
)
}

function formatCurrency(value: number) {
return `${value.toLocaleString('ar-BH', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })} د.ب`
}

function formatPaymentDate(value: string) {
if (!value) {
return '—'
}

const [year, month, day] = value.split('-')

if (!year || !month || !day) {
return value
}

return `${day}/${month}/${year}`
}

function getToday() {
const today = new Date()

const year = today.getFullYear()

const month = String(
today.getMonth() + 1,
).padStart(2, '0')

const day = String(
today.getDate(),
).padStart(2, '0')

return `${year}-${month}-${day}`
}
