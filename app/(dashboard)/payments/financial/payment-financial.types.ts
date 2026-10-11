
export type FinancialMode = 'student_payments' | 'manual'
export type TransactionType = 'in' | 'out' | 'adjustment'
export type AdjustmentDirection = 'plus' | 'minus'

export type FinancialSettings = {
  id: string
  academic_year_id: string
  financial_mode: FinancialMode
  opening_balance: number
  opening_source: string | null
  opening_note: string | null
  created_at: string
  updated_at: string
}

export type Transaction = {
  id: string
  academic_year_id: string
  transaction_type: TransactionType
  amount: number
  adjustment_direction: AdjustmentDirection | null
  source_type: 'student_payment' | 'manual' | 'adjustment' | 'opening'
  source: string | null
  payment_id: string | null
  student_id: string | null
  student_request_number: string | null
  payment_method: string | null
  reference_number: string | null
  confirmation_status: 'pending' | 'confirmed' | 'not_required'
  confirmed_by: string | null
  confirmed_at: string | null
  created_by: string | null
  created_at: string
  note: string | null
  balance_before?: number
  balance_after?: number
}

export type Summary = {
  openingBalance: number
  balance: number
  totalIn: number
  totalOut: number
  totalAdjustmentsPlus: number
  totalAdjustmentsMinus: number
  operations: number
}

export type ModalType =
  | 'none'
  | 'initialize'
  | 'transaction'
  | 'details'
  | 'delete'
  | 'reset'

export type AcademicYear = {
  id: string
  name: string
  start_date: string
  end_date: string
  is_current: boolean
  is_active: boolean
  annual_fee: number
}

export type StudentPaymentRow = {
  studentId: string
  name: string
  personalId: string | null
  feeExempt: boolean
  annualFee: number
  paidAmount: number
  remaining: number
  status: 'paid' | 'partial' | 'exempt' | 'unpaid'
  latestPaymentMethod: string | null
  latestPaymentDate: string | null
  latestPaymentId: string | null
  latestTransaction: Transaction | null
  pendingCount: number
}

export type StudentRecord = {
  id: string
  name: string | null
  personal_id: string | null
  fee_exempt: boolean | null
}

export type PaymentRecord = {
  id: string
  student_id: string
  amount: number
  payment_method: string | null
  payment_date: string | null
  reference_number: string | null
  notes: string | null
}

export type PaymentFinancialCache = {
  academicYear: AcademicYear | null
  settings: FinancialSettings | null
  transactions: Transaction[]
  studentPayments: StudentPaymentRow[]
  summary: Summary
}
