
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
    const data = await loadPaymentsRepositoryData()

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
