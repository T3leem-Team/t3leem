
import type { StudentRow } from '@/lib/payments-cache'

export function selectedRemaining(student: StudentRow): number {
  if (student.feeExempt) return 0

  return Math.max(student.amountDue - student.amountPaid, 0)
}

export function formatCurrency(value: number): string {
  return `${value.toLocaleString('ar-BH', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })} د.ب`
}

export function formatPaymentDate(value: string): string {
  if (!value) return '—'

  const [year, month, day] = value.split('-')

  if (!year || !month || !day) return value

  return `${day}/${month}/${year}`
}

export function getToday(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (error && typeof error === 'object') {
    const apiError = error as { message?: string }

    if (apiError.message) return apiError.message
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}
