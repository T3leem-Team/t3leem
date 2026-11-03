
export type PaymentStatus =
  | 'مدفوع بالكامل'
  | 'مدفوع جزئياً'
  | 'غير مدفوع'
  | 'معفي'

export type PaymentLevel = {
  id: string
  name: string
  sortOrder: number | null
}

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

export type PaymentSummary = {
  totalStudents: number
  totalExempt: number
  totalDue: number
  totalPaid: number
}

export type PaymentStudentsRepositoryData = {
  studentList: StudentRow[]
  currentAcademicYearId: string | null
  currentAcademicYearName: string
  currentAnnualFee: number
  levels: PaymentLevel[]
  totalStudents: number
  hasMore: boolean
  currentPage: number
  summary: PaymentSummary
}

export type PaymentApiResponse<T = unknown> = {
  payment?: T
  payments?: T[]
  error?: string
  maxAmount?: number
}

type PaymentsListApiResponse = {
  academicYear?: {
    id: string
    name: string
    annual_fee: number | string | null
  } | null
  students?: any[]
  totalStudents?: number
  hasMore?: boolean
  enrollments?: any[]
  payments?: any[]
  levels?: any[]
  summary?: Partial<PaymentSummary>
  error?: string
}

async function paymentRequest<T>(
  url: string,
  options: RequestInit,
  fallbackError: string,
): Promise<T> {
  const response = await fetch(url, options)

  const data = (await response.json().catch(() => null)) as
    | (T & { error?: string; maxAmount?: number })
    | null

  if (!response.ok) {
    const error = new Error(
      data?.error || fallbackError,
    ) as Error & { maxAmount?: number }

    if (data?.maxAmount != null) {
      error.maxAmount = Number(data.maxAmount)
    }

    throw error
  }

  return (data ?? {}) as T
}

const EMPTY_SUMMARY: PaymentSummary = {
  totalStudents: 0,
  totalExempt: 0,
  totalDue: 0,
  totalPaid: 0,
}

/**
 * تحميل صفحة من بيانات المدفوعات.
 *
 * page يبدأ من صفر.
 * كل صفحة تحتوي على 50 طالبًا كحد أقصى.
 * البحث يتم في قاعدة البيانات ويشمل جميع الطلاب.
 */
export async function loadPaymentsRepositoryData(
  options?: {
    page?: number
    search?: string
  },
): Promise<PaymentStudentsRepositoryData> {
  const page = Math.max(
    0,
    Math.floor(options?.page ?? 0),
  )

  const search = String(
    options?.search ?? '',
  ).trim()

  const params = new URLSearchParams({
    page: String(page),
  })

  if (search) {
    params.set('search', search)
  }

  const response = await fetch(
    `/api/payments?${params.toString()}`,
    {
      method: 'GET',
      cache: 'no-store',
    },
  )

  const data =
    (await response.json().catch(() => null)) as
      | PaymentsListApiResponse
      | null

  if (!response.ok) {
    throw new Error(
      data?.error ?? 'تعذر تحميل بيانات المدفوعات.',
    )
  }

  const currentYear = data?.academicYear ?? null

  if (!currentYear) {
    return {
      studentList: [],
      currentAcademicYearId: null,
      currentAcademicYearName: '',
      currentAnnualFee: 0,
      levels: [],
      totalStudents: 0,
      hasMore: false,
      currentPage: page,
      summary: EMPTY_SUMMARY,
    }
  }

  const annualFee = Number(
    currentYear.annual_fee ?? 0,
  )

  const students = data?.students ?? []
  const enrollments = data?.enrollments ?? []
  const payments = data?.payments ?? []
  const levels = data?.levels ?? []

  // Normalize academic levels.
  const normalizedLevels: PaymentLevel[] = levels
    .map((level: any): PaymentLevel => ({
      id: String(level.id),
      name: String(level.name ?? 'غير محدد'),
      sortOrder:
        level.sort_order == null
          ? null
          : Number(level.sort_order),
    }))
    .sort((a, b) => {
      const aOrder =
        a.sortOrder ?? Number.MAX_SAFE_INTEGER

      const bOrder =
        b.sortOrder ?? Number.MAX_SAFE_INTEGER

      if (aOrder !== bOrder) {
        return aOrder - bOrder
      }

      return a.name.localeCompare(b.name, 'ar')
    })

  const levelMap = new Map<string, PaymentLevel>(
    normalizedLevels.map((level) => [
      level.id,
      level,
    ]),
  )

  // Keep the first enrollment for each student.
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

  // Aggregate payments for each student.
  const paidByStudent = new Map<string, number>()

  for (const payment of payments) {
    const studentId = payment.student_id

    paidByStudent.set(
      studentId,
      (paidByStudent.get(studentId) ?? 0) +
        Number(payment.amount ?? 0),
    )
  }

  // Build the student list for this page only.
  const studentList: StudentRow[] = []

  for (const student of students) {
    const enrollment = enrollmentMap.get(student.id)

    // لا نعرض طالبًا غير مسجل في السنة الحالية.
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

  // Sort students by academic level, then name.
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

  const summary: PaymentSummary = {
    totalStudents: Number(
      data?.summary?.totalStudents ?? 0,
    ),
    totalExempt: Number(
      data?.summary?.totalExempt ?? 0,
    ),
    totalDue: Number(
      data?.summary?.totalDue ?? 0,
    ),
    totalPaid: Number(
      data?.summary?.totalPaid ?? 0,
    ),
  }

  return {
    studentList,
    currentAcademicYearId: currentYear.id,
    currentAcademicYearName: currentYear.name,
    currentAnnualFee: annualFee,
    levels: normalizedLevels,
    totalStudents: Number(data?.totalStudents ?? 0),
    hasMore: Boolean(data?.hasMore),
    currentPage: page,
    summary,
  }
}

/**
 * تحميل سجل دفعات طالب في سنة دراسية محددة.
 */
export async function getPaymentHistory(
  studentId: string,
  academicYearId: string,
): Promise<PaymentApiResponse> {
  const params = new URLSearchParams({
    studentId,
    academicYearId,
  })

  return paymentRequest<PaymentApiResponse>(
    `/api/payments/history?${params.toString()}`,
    {
      method: 'GET',
      cache: 'no-store',
    },
    'تعذر تحميل سجل الدفعات.',
  )
}

/**
 * إضافة دفعة جديدة.
 */
export async function createPayment(payload: {
  student_id: string
  academic_year_id: string
  amount: number
  payment_method: string
  payment_date: string
  reference_number: string | null
  notes: string | null
}): Promise<PaymentApiResponse> {
  return paymentRequest<PaymentApiResponse>(
    '/api/payments',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'تعذر حفظ الدفعة.',
  )
}

/**
 * تعديل دفعة موجودة.
 */
export async function updatePayment(payload: {
  payment_id: string
  amount: number
  payment_method: string
  payment_date: string
  reference_number: string | null
  notes: string | null
}): Promise<PaymentApiResponse> {
  return paymentRequest<PaymentApiResponse>(
    '/api/payments',
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'تعذر تعديل الدفعة.',
  )
}
