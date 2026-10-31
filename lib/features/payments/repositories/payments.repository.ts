
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

export type PaymentStudentsRepositoryData = {
  studentList: StudentRow[]
  currentAcademicYearId: string | null
  currentAcademicYearName: string
  currentAnnualFee: number
  levels: PaymentLevel[]
}

export async function loadPaymentsRepositoryData(): Promise<PaymentStudentsRepositoryData> {
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
    return {
      studentList: [],
      currentAcademicYearId: null,
      currentAcademicYearName: '',
      currentAnnualFee: 0,
      levels: [],
    }
  }

  const annualFee = Number(currentYear.annual_fee ?? 0)

  const students = data.students ?? []
  const enrollments = data.enrollments ?? []
  const payments = data.payments ?? []
  const levels = data.levels ?? []

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

  // Build the student list.
  const studentList: StudentRow[] = []

  for (const student of students) {
    const enrollment = enrollmentMap.get(student.id)

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

  return {
    studentList,
    currentAcademicYearId: currentYear.id,
    currentAcademicYearName: currentYear.name,
    currentAnnualFee: annualFee,
    levels: normalizedLevels,
  }
}
