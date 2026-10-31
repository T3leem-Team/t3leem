
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
  levelId: string | null
  grade: string
  levelSortOrder: number | null
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
  levels: PaymentLevel[]
}

export type PaymentLevel = {
  id: string
  name: string
  sortOrder: number | null
}

let paymentsCache: PaymentStudentsCache | null = null

let paymentsLoadingPromise:
  | Promise<PaymentStudentsCache>
  | null = null

let paymentsCacheVersion = 0

export function getPaymentsCache() {
  return paymentsCache
}

export function setPaymentsCache(
  value: PaymentStudentsCache,
) {
  paymentsCacheVersion += 1
  paymentsLoadingPromise = null
  paymentsCache = value
}

export function updatePaymentsCache(
  patch: Partial<PaymentStudentsCache>,
) {
  paymentsCacheVersion += 1
  paymentsLoadingPromise = null

  paymentsCache = {
    studentList: paymentsCache?.studentList ?? [],

    currentAcademicYearId:
      paymentsCache?.currentAcademicYearId ?? null,

    currentAcademicYearName:
      paymentsCache?.currentAcademicYearName ?? '',

    currentAnnualFee:
      paymentsCache?.currentAnnualFee ?? 0,

    levels: paymentsCache?.levels ?? [],

    ...patch,
  }

  return paymentsCache
}

export function clearPaymentsCache() {
  paymentsCacheVersion += 1
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

  const requestVersion = ++paymentsCacheVersion

  const loadPromise = (async (): Promise<PaymentStudentsCache> => {
    const response = await fetch('/api/payments', {
      method: 'GET',
      cache: 'no-store',
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)

      throw new Error(
        errorData?.error ?? 'تعذر تحميل بيانات المدفوعات.',
      )
    }

    const data = await response.json()

    const currentYear = data.academicYear ?? null

    if (!currentYear) {
      const emptyCache: PaymentStudentsCache = {
        studentList: [],
        currentAcademicYearId: null,
        currentAcademicYearName: '',
        currentAnnualFee: 0,
        levels: [],
      }

      if (requestVersion === paymentsCacheVersion) {
        paymentsCache = emptyCache
      }

      return emptyCache
    }

    const annualFee = Number(currentYear.annual_fee ?? 0)

    const students = data.students ?? []
    const enrollments = data.enrollments ?? []
    const payments = data.payments ?? []
    const levels = data.levels ?? []

    /*
     * المستويات الأكاديمية
     */

    const normalizedLevels: PaymentLevel[] = levels
      .map((level: any) => ({
        id: String(level.id),
        name: String(level.name ?? 'غير محدد'),
        sortOrder:
          level.sort_order == null
            ? null
            : Number(level.sort_order),
      }))
      .sort(
        (a: PaymentLevel, b: PaymentLevel) => {
          const aOrder =
            a.sortOrder ?? Number.MAX_SAFE_INTEGER

          const bOrder =
            b.sortOrder ?? Number.MAX_SAFE_INTEGER

          if (aOrder !== bOrder) {
            return aOrder - bOrder
          }

          return a.name.localeCompare(b.name, 'ar')
        },
      )

    const levelMap = new Map<string, PaymentLevel>(
      normalizedLevels.map((level) => [
        level.id,
        level,
      ]),
    )

    /*
     * ربط كل طالب بتسجيله ومستواه.
     * نحتفظ بأول تسجيل لكل طالب كما في النسخة السابقة.
     */

    const enrollmentMap = new Map<
      string,
      {
        levelId: string | null
        grade: string
        levelSortOrder: number | null
      }
    >()

    for (const enrollment of enrollments) {
      if (enrollmentMap.has(enrollment.student_id)) {
        continue
      }

      const levelId = enrollment.level_id
        ? String(enrollment.level_id)
        : null

      const level = levelId
        ? levelMap.get(levelId)
        : undefined

      enrollmentMap.set(enrollment.student_id, {
        levelId,
        grade: level?.name ?? 'غير محدد',
        levelSortOrder: level?.sortOrder ?? null,
      })
    }

    /*
     * تجميع المدفوعات لكل طالب.
     */

    const paidByStudent = new Map<string, number>()

    for (const payment of payments) {
      const studentId = payment.student_id

      paidByStudent.set(
        studentId,
        (paidByStudent.get(studentId) ?? 0) +
          Number(payment.amount ?? 0),
      )
    }

    /*
     * بناء قائمة الطلاب.
     * دمج filter و map في مرور واحد.
     */

    const studentList: StudentRow[] = []

    for (const student of students) {
      const enrollment = enrollmentMap.get(student.id)

      // تجاهل الطالب إذا لم يكن لديه تسجيل في السنة الحالية.
      if (!enrollment) {
        continue
      }

      const amountPaid =
        paidByStudent.get(student.id) ?? 0

      const feeExempt = Boolean(student.fee_exempt)

      let paymentStatus: PaymentStatus

      if (feeExempt) {
        paymentStatus = 'معفي'
      } else if (
        annualFee > 0 &&
        amountPaid >= annualFee
      ) {
        paymentStatus = 'مدفوع بالكامل'
      } else if (amountPaid > 0) {
        paymentStatus = 'مدفوع جزئياً'
      } else {
        paymentStatus = 'غير مدفوع'
      }

      studentList.push({
        id: student.id,
        name: student.name,
        personalId: student.personal_id ?? '',
        levelId: enrollment.levelId,
        grade: enrollment.grade,
        levelSortOrder: enrollment.levelSortOrder,
        amountDue: annualFee,
        amountPaid,
        feeExempt,
        paymentStatus,
      })
    }

    /*
     * ترتيب الطلاب حسب ترتيب المستويات.
     */

    studentList.sort((a, b) => {
      const aOrder =
        a.levelSortOrder ?? Number.MAX_SAFE_INTEGER

      const bOrder =
        b.levelSortOrder ?? Number.MAX_SAFE_INTEGER

      if (aOrder !== bOrder) {
        return aOrder - bOrder
      }

      return a.name.localeCompare(b.name, 'ar')
    })

    const nextCache: PaymentStudentsCache = {
      studentList,
      currentAcademicYearId: currentYear.id,
      currentAcademicYearName: currentYear.name,
      currentAnnualFee: annualFee,
      levels: normalizedLevels,
    }

    // لا تحفظ البيانات إلا إذا كان الطلب ما زال الأحدث.
    if (requestVersion === paymentsCacheVersion) {
      paymentsCache = nextCache
    }

    return nextCache
  })()

  paymentsLoadingPromise = loadPromise

  try {
    return await loadPromise
  } finally {
    // لا تسمح لطلب قديم بمسح مرجع طلب أحدث.
    if (paymentsLoadingPromise === loadPromise) {
      paymentsLoadingPromise = null
    }
  }
}
