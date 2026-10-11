import type {
  Summary,
  Transaction,
} from './payment-financial.types'

export const emptySummary: Summary = {
  openingBalance: 0,
  balance: 0,
  totalIn: 0,
  totalOut: 0,
  totalAdjustmentsPlus: 0,
  totalAdjustmentsMinus: 0,
  operations: 0,
}

export const money = (value: number) =>
  new Intl.NumberFormat('ar-BH', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(Number(value || 0))

export const formatDate = (
  value: string | null | undefined
) => {
  if (!value) return '-'

  return new Intl.DateTimeFormat('ar-BH', {
    calendar: 'gregory',
    numberingSystem: 'latn',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export const formatDateOnly = (
  value: string | null | undefined
) => {
  if (!value) return '-'

  return new Intl.DateTimeFormat('ar-BH', {
    calendar: 'gregory',
    numberingSystem: 'latn',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
}

export const getTransactionLabel = (
  transaction: Transaction
) => {
  if (transaction.transaction_type === 'in') {
    return 'إيراد'
  }

  if (transaction.transaction_type === 'out') {
    return 'مصروف'
  }

  if (
    transaction.adjustment_direction === 'plus'
  ) {
    return 'تسوية +'
  }

  return 'تسوية -'
}

export const getConfirmationLabel = (
  status: Transaction['confirmation_status']
) => {
  if (status === 'pending') {
    return 'بانتظار التأكيد'
  }

  if (status === 'confirmed') {
    return 'تم التأكيد'
  }

  return 'غير مطلوب'
}

export const getTypeClass = (
  transaction: Transaction
) => {
  if (transaction.transaction_type === 'in') {
    return 'text-emerald-600 dark:text-emerald-400'
  }

  if (transaction.transaction_type === 'out') {
    return 'text-red-600 dark:text-red-400'
  }

  if (
    transaction.adjustment_direction === 'plus'
  ) {
    return 'text-blue-600 dark:text-blue-400'
  }

  return 'text-orange-600 dark:text-orange-400'
}
