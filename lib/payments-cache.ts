'use client'

export type PaymentStatus =
  | 'مدفوع بالكامل'
  | 'مدفوع جزئياً'
  | 'غير مدفوع'
  | 'معفي'

export type StudentRow = {
  id: string
  name: string
  personalId: string
  grade: string
  amountDue: number
  amountPaid: number
  feeExempt: boolean
  paymentStatus: PaymentStatus
}

export type PaymentStudentsCache = {
  studentList: StudentRow[]
  currentAcademicYearId: string | null
  currentAcademicYearName: string
  currentAnnualFee: number
}

let paymentsCache: PaymentStudentsCache | null = null

let paymentsLoadingPromise:
  | Promise<PaymentStudentsCache>
  | null = null

export function getPaymentsCache() {
  return paymentsCache
}

export function setPaymentsCache(
  value: PaymentStudentsCache,
) {
  paymentsCache = value
}

export function updatePaymentsCache(
  patch: Partial<PaymentStudentsCache>,
) {
  paymentsCache = {
    studentList:
      paymentsCache?.studentList ?? [],
    currentAcademicYearId:
      paymentsCache?.currentAcademicYearId ??
      null,
    currentAcademicYearName:
      paymentsCache?.currentAcademicYearName ??
      '',
    currentAnnualFee:
      paymentsCache?.currentAnnualFee ?? 0,
    ...patch,
  }

  return paymentsCache
}

export function clearPaymentsCache() {
  paymentsCache = null
  paymentsLoadingPromise = null
}

export async function loadPaymentsCache(
  options?: {
    force?: boolean
  },
): Promise<PaymentStudentsCache> {
  const force = options?.force ?? false

  if (!force && paymentsCache) {
    return paymentsCache
  }

  if (!force && paymentsLoadingPromise) {
    return paymentsLoadingPromise
  }

  const loadPromise =
    (async () => {
      const response = await fetch(
        '/api/payments',
        {
          method: 'GET',
          cache: 'no-store',
        },
      )

      if (!response.ok) {
        const data =
          await response
            .json()
            .catch(() => null)

        throw new Error(
          data?.error ||
            'تعذر تحميل بيانات المدفوعات.',
        )
      }

      const data =
        await response.json()

      const currentYear =
        data.academicYear ?? null

      if (!currentYear) {
        const emptyCache:
          PaymentStudentsCache = {
            studentList: [],
            currentAcademicYearId:
              null,
            currentAcademicYearName:
              '',
            currentAnnualFee: 0,
          }

        paymentsCache =
          emptyCache

        return emptyCache
      }

      const annualFee =
        Number(
          currentYear.annual_fee ??
            0,
        )

      const students =
        data.students ?? []

      const enrollments =
        data.enrollments ?? []

      const payments =
        data.payments ?? []

      const levels =
        data.levels ?? []

      const levelMap =
        new Map<string, string>(
          levels.map(
            (level: any) => [
              level.id,
              level.name,
            ],
          ),
        )

      const enrollmentMap =
        new Map<string, string>(
          enrollments.map(
            (enrollment: any) => [
              enrollment.student_id,
              levelMap.get(
                enrollment.level_id,
              ) ?? 'غير محدد',
            ],
          ),
        )

      const paidByStudent =
        new Map<string, number>()

      payments.forEach(
        (payment: any) => {
          const current =
            paidByStudent.get(
              payment.student_id,
            ) ?? 0

          paidByStudent.set(
            payment.student_id,
            current +
              Number(
                payment.amount ?? 0,
              ),
          )
        },
      )

      const studentList:
        StudentRow[] =
        students
          .filter(
            (student: any) =>
              enrollmentMap.has(
                student.id,
              ),
          )
          .map(
            (student: any) => {
              const amountPaid =
                paidByStudent.get(
                  student.id,
                ) ?? 0

              const feeExempt =
                Boolean(
                  student.fee_exempt,
                )

              let paymentStatus:
                PaymentStatus

              if (feeExempt) {
                paymentStatus =
                  'معفي'
              } else if (
                annualFee > 0 &&
                amountPaid >=
                  annualFee
              ) {
                paymentStatus =
                  'مدفوع بالكامل'
              } else if (
                amountPaid > 0
              ) {
                paymentStatus =
                  'مدفوع جزئياً'
              } else {
                paymentStatus =
                  'غير مدفوع'
              }

              return {
                id: student.id,
                name: student.name,
                personalId:
                  student.personal_id ??
                  '',
                grade:
                  enrollmentMap.get(
                    student.id,
                  ) ??
                  'غير محدد',
                amountDue:
                  annualFee,
                amountPaid,
                feeExempt,
                paymentStatus,
              }
            },
          )

      const nextCache:
        PaymentStudentsCache = {
          studentList,
          currentAcademicYearId:
            currentYear.id,
          currentAcademicYearName:
            currentYear.name,
          currentAnnualFee:
            annualFee,
        }

      paymentsCache =
        nextCache

      return nextCache
    })()

  paymentsLoadingPromise =
    loadPromise

  try {
    return await loadPromise
  } finally {
    if (
      paymentsLoadingPromise ===
      loadPromise
    ) {
      paymentsLoadingPromise =
        null
    }
  }
}
