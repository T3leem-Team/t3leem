
export type Cycle = {
  id: string
  name: string
  initial_balance: number
  initial_source: string | null
  initial_note: string | null
  status: 'open' | 'closed'
  created_at: string
  updated_at: string
}

export type Transaction = {
  id: string
  cycle_id: string
  transaction_type: 'in' | 'out' | 'adjustment'
  amount: number
  description: string
  note: string | null
  adjustment_sign: number | null
  balance_after: number
  created_at: string
}

type ApiResponse = {
  error?: string
}

type CyclesResponse = ApiResponse & {
  cycles?: Cycle[]
}

type TransactionsResponse = ApiResponse & {
  cycle?: Cycle
  transactions?: Transaction[]
  currentBalance?: number
}

type UpdateCycleStatusResponse = ApiResponse & {
  cycle?: {
    updated_at?: string
  }
}

type CreateCyclePayload = {
  action: 'create-cycle'
  name: string
  initial_balance: number
  initial_source: string | null
  initial_note: string | null
}

type AddTransactionPayload = {
  action: 'add-transaction'
  cycle_id: string
  transaction_type: 'in' | 'out' | 'adjustment'
  amount: number
  description: string
  note: string | null
  adjustment_sign: 1 | -1 | null
}

type UpdateCycleStatusPayload = {
  action: 'update-cycle-status'
  cycle_id: string
  status: 'open' | 'closed'
}

type DeleteCyclePayload = {
  action: 'delete-cycle'
  cycle_id: string
}

async function postPersonalFinance<T extends ApiResponse>(
  payload:
    | CreateCyclePayload
    | AddTransactionPayload
    | UpdateCycleStatusPayload
    | DeleteCyclePayload,
  fallbackMessage: string,
): Promise<T> {
  const response = await fetch('/api/personal-finance', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = (await response.json()) as T

  if (!response.ok) {
    throw new Error(data.error || fallbackMessage)
  }

  return data
}

export async function loadPersonalFinanceCycles(): Promise<Cycle[]> {
  const response = await fetch(
    '/api/personal-finance?action=cycles',
    {
      cache: 'no-store',
    },
  )

  const data = (await response.json()) as CyclesResponse

  if (!response.ok) {
    throw new Error(data.error || 'تعذر تحميل الدفاتر.')
  }

  return Array.isArray(data.cycles) ? data.cycles : []
}

export async function loadPersonalFinanceTransactions(
  cycleId: string,
  fallbackCycle: Cycle,
): Promise<{
  cycle: Cycle
  transactions: Transaction[]
  currentBalance: number
}> {
  const response = await fetch(
    `/api/personal-finance?action=transactions&cycleId=${encodeURIComponent(cycleId)}`,
    {
      cache: 'no-store',
    },
  )

  const data = (await response.json()) as TransactionsResponse

  if (!response.ok) {
    throw new Error(data.error || 'تعذر تحميل العمليات.')
  }

  return {
    cycle: data.cycle ?? fallbackCycle,
    transactions: Array.isArray(data.transactions)
      ? data.transactions
      : [],
    currentBalance: Number(data.currentBalance ?? 0),
  }
}

export async function createPersonalFinanceCycle(
  payload: CreateCyclePayload,
): Promise<void> {
  await postPersonalFinance(
    payload,
    'تعذر إنشاء الدفتر.',
  )
}

export async function addPersonalFinanceTransaction(
  payload: AddTransactionPayload,
): Promise<void> {
  await postPersonalFinance(
    payload,
    'تعذر إضافة العملية.',
  )
}

export async function updatePersonalFinanceCycleStatus(
  payload: UpdateCycleStatusPayload,
): Promise<UpdateCycleStatusResponse> {
  return postPersonalFinance<UpdateCycleStatusResponse>(
    payload,
    'تعذر تحديث حالة الدفتر.',
  )
}

export async function deletePersonalFinanceCycle(
  payload: DeleteCyclePayload,
): Promise<void> {
  await postPersonalFinance(
    payload,
    'تعذر مسح الدفتر.',
  )
}
