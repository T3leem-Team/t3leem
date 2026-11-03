
'use client'

import {
  loadPaymentsRepositoryData,
} from '@/lib/features/payments/repositories/payments.repository'

import type {
  PaymentStatus,
  PaymentLevel,
  StudentRow,
  PaymentStudentsRepositoryData,
} from '@/lib/features/payments/repositories/payments.repository'

export type {
  PaymentStatus,
  PaymentLevel,
  StudentRow,
}

export type PaymentStudentsCache =
  PaymentStudentsRepositoryData

let paymentsCache: PaymentStudentsCache | null = null

let paymentsLoadingPromise:
  | Promise<PaymentStudentsCache>
  | null = null

let paymentsCacheVersion = 0

let paymentsSearch = ''

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

    totalStudents:
      paymentsCache?.totalStudents ?? 0,

    hasMore:
      paymentsCache?.hasMore ?? false,

    currentPage:
      paymentsCache?.currentPage ?? 0,

    summary:
      paymentsCache?.summary ?? {
        totalStudents: 0,
        totalExempt: 0,
        totalDue: 0,
        totalPaid: 0,
      },

    ...patch,
  }

  return paymentsCache
}

export function clearPaymentsCache() {
  paymentsCacheVersion += 1
  paymentsCache = null
  paymentsLoadingPromise = null
  paymentsSearch = ''
}

/**
 * تحميل أول صفحة من بيانات المدفوعات.
 */
export async function loadPaymentsCache(
  options?: {
    force?: boolean
    search?: string
  },
): Promise<PaymentStudentsCache> {
  const force = options?.force ?? false

  const search = String(
    options?.search ?? '',
  ).trim()

  const searchChanged = search !== paymentsSearch

  if (!force && !searchChanged && paymentsCache) {
    return paymentsCache
  }

  if (
    !force &&
    !searchChanged &&
    paymentsLoadingPromise
  ) {
    return paymentsLoadingPromise
  }

  const requestVersion = ++paymentsCacheVersion

  paymentsSearch = search

  const loadPromise = (async (): Promise<PaymentStudentsCache> => {
    const data = await loadPaymentsRepositoryData({
      page: 0,
      search,
    })

    if (requestVersion === paymentsCacheVersion) {
      paymentsCache = data
    }

    return data
  })()

  paymentsLoadingPromise = loadPromise

  try {
    return await loadPromise
  } finally {
    if (paymentsLoadingPromise === loadPromise) {
      paymentsLoadingPromise = null
    }
  }
}

/**
 * تحميل 50 طالبًا إضافيًا وإضافتهم إلى القائمة الحالية.
 */
export async function loadMorePaymentsCache(): Promise<PaymentStudentsCache | null> {
  if (!paymentsCache || !paymentsCache.hasMore) {
    return paymentsCache
  }

  if (paymentsLoadingPromise) {
    return paymentsLoadingPromise
  }

  const requestVersion = ++paymentsCacheVersion

  const nextPage = paymentsCache.currentPage + 1
  const currentCache = paymentsCache
  const currentSearch = paymentsSearch

  const loadPromise = (async (): Promise<PaymentStudentsCache> => {
    const nextData = await loadPaymentsRepositoryData({
      page: nextPage,
      search: currentSearch,
    })

    if (
      requestVersion === paymentsCacheVersion &&
      paymentsCache === currentCache
    ) {
      const existingIds = new Set(
        currentCache.studentList.map(
          (student) => student.id,
        ),
      )

      const newStudents = nextData.studentList.filter(
        (student) => !existingIds.has(student.id),
      )

      paymentsCache = {
        ...nextData,
        studentList: [
          ...currentCache.studentList,
          ...newStudents,
        ],
      }
    }

    return paymentsCache ?? nextData
  })()

  paymentsLoadingPromise = loadPromise

  try {
    return await loadPromise
  } finally {
    if (paymentsLoadingPromise === loadPromise) {
      paymentsLoadingPromise = null
    }
  }
}

/**
 * معرفة نص البحث الحالي.
 */
export function getPaymentsSearch() {
  return paymentsSearch
}
