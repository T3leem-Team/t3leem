
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

  // المستوى المرتبط بالطالب في السنة الحالية
  levelId: string | null
  grade: string

  // ترتيب المستوى من قاعدة البيانات
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

  // مستويات السنة الحالية مرتبة حسب levels.sort_order
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
  // إبطال أي طلب سابق قبل تعيين الكاش الجديد.
  paymentsCacheVersion += 1
  paymentsLoadingPromise = null
  paymentsCache = value
}

export function updatePaymentsCache(
  patch: Partial<PaymentStudentsCache>,
) {
  // إبطال أي طلب سابق حتى لا يستبدل التحديث اليدوي.
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
  // منع الطلبات الجارية من إعادة تعبئة الكاش بعد مسحه.
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
      const data = await response.json().catch(() => null)

      throw new Error(
        data?.error ?? 'تعذر تحميل بيانات المدفوعات.',
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

      // لا تسمح لطلب قديم باستبدال الكاش الأحدث.
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
     * المستويات:
     * المصدر الرسمي للترتيب هو levels.sort_order
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
     * نربط الطالب بالمستوى الحالي
     * عن طريق enrollment.
     */
    const enrollmentMap = new Map<
      string,
      {
        levelId: string | null
        grade: string
        levelSortOrder: number | null
      }
    >()

    enrollments.forEach((enrollment: any) => {
      const levelId = enrollment.level_id
        ? String(enrollment.level_id)
        : null

      const level = levelId
        ? levelMap.get(levelId)
        : undefined

      /*
       * إذا كان للطالب أكثر من enrollment
       * نستخدم أول واحد كما كان النظام السابق.
       */
      if (!enrollmentMap.has(enrollment.student_id)) {
        enrollmentMap.set(enrollment.student_id, {
          levelId,
          grade: level?.name ?? 'غير محدد',
          levelSortOrder: level?.sortOrder ?? null,
        })
      }
    })

    /*
     * إجمالي المدفوع لكل طالب.
     */
    const paidByStudent = new Map<string, number>()

    payments.forEach((payment: any) => {
      const current =
        paidByStudent.get(payment.student_id) ?? 0

      paidByStudent.set(
        payment.student_id,
        current + Number(payment.amount ?? 0),
      )
    })

    /*
     * بناء قائمة الطلاب.
     */
    const studentList: StudentRow[] = students
      .filter((student: any) =>
        enrollmentMap.has(student.id),
      )
      .map((student: any) => {
        const enrollment = enrollmentMap.get(student.id)

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

        return {
          id: student.id,
          name: student.name,
          personalId: student.personal_id ?? '',
          levelId: enrollment?.levelId ?? null,
          grade: enrollment?.grade ?? 'غير محدد',
          levelSortOrder:
            enrollment?.levelSortOrder ?? null,
          amountDue: annualFee,
          amountPaid,
          feeExempt,
          paymentStatus,
        }
      })

    /*
     * ترتيب الطلاب حسب ترتيب المستويات
     * الموجود في قاعدة البيانات.
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
