
import type { FormEvent } from 'react'
import type { PaymentLevel, StudentRow } from '@/lib/payments-cache'

export type Filters = {
  name: string
  personalId: string
  grade: string
  amountDue: string
  amountPaid: string
  amountRemaining: string
  paymentStatus: string
}

export type PaymentMethod = 'نقدي' | 'تحويل' | 'بطاقة'

export type PaymentRecord = {
  id: string
  amount: number
  payment_method: string
  payment_date: string
  reference_number: string | null
  notes: string | null
  created_at: string
}

export type PaymentStats = {
  label: string
  value: string
  change: string
  trend: 'up' | 'down'
  hint: string
}

export const emptyFilters: Filters = {
  name: '',
  personalId: '',
  grade: '',
  amountDue: '',
  amountPaid: '',
  amountRemaining: '',
  paymentStatus: '',
}

export type PaymentStudentsTableProps = {
  students: StudentRow[]
  loading: boolean
  filters: Filters
  grades: string[]
  paymentStatuses: string[]
  hasFilters: boolean
  onUpdateFilter: (key: keyof Filters, value: string) => void
  onClearFilters: () => void
  onOpenStudent: (student: StudentRow) => void
}

export type PaymentDetailsModalProps = {
  student: StudentRow
  academicYearName: string
  paymentHistory: PaymentRecord[]
  loadingHistory: boolean
  savingPayment: boolean
  savingEdit: boolean
  onClose: () => void
  onEditPayment: (payment: PaymentRecord) => void
  onAddPayment: (event: FormEvent<HTMLFormElement>) => void
}

export type PaymentEditModalProps = {
  payment: PaymentRecord
  studentName: string
  savingEdit: boolean
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export type PaymentsCacheResult = Awaited<
  ReturnType<typeof import('@/lib/payments-cache').loadPaymentsCache>
>

export type { PaymentLevel, StudentRow }
