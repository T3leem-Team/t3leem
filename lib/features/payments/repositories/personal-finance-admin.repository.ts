import 'server-only'

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
)

// =========================================
// CYCLES
// =========================================

export async function loadPersonalFinancialCycle(
  cycleId: string,
) {
  return await supabaseAdmin
    .from('personal_financial_cycles')
    .select('*')
    .eq('id', cycleId)
    .maybeSingle()
}

export async function loadPersonalFinancialCycles() {
  return await supabaseAdmin
    .from('personal_financial_cycles')
    .select(`
      id,
      name,
      initial_balance,
      initial_source,
      initial_note,
      status,
      created_by,
      created_at,
      closed_by,
      closed_at,
      close_note,
      reopened_by,
      reopened_at,
      reopen_note,
      updated_at
    `)
    .order('created_at', {
      ascending: false,
    })
}

export async function insertPersonalFinancialCycle(
  input: {
    name: string
    initial_balance: number
    initial_source: string | null
    initial_note: string | null
    status: string
  },
) {
  return await supabaseAdmin
    .from('personal_financial_cycles')
    .insert(input)
    .select()
    .single()
}

export async function updatePersonalFinancialCycle(
  cycleId: string,
  input: Record<string, unknown>,
) {
  return await supabaseAdmin
    .from('personal_financial_cycles')
    .update(input)
    .eq('id', cycleId)
    .select()
    .single()
}

export async function touchPersonalFinancialCycle(
  cycleId: string,
  updatedAt: string,
) {
  return await supabaseAdmin
    .from('personal_financial_cycles')
    .update({
      updated_at: updatedAt,
    })
    .eq('id', cycleId)
}

export async function deletePersonalFinancialCycle(
  cycleId: string,
) {
  return await supabaseAdmin
    .from('personal_financial_cycles')
    .delete()
    .eq('id', cycleId)
}

// =========================================
// TRANSACTIONS
// =========================================

export async function loadPersonalFinancialTransactions(
  cycleId: string,
) {
  return await supabaseAdmin
    .from('personal_financial_transactions')
    .select(`
      id,
      cycle_id,
      transaction_type,
      amount,
      description,
      note,
      adjustment_sign,
      balance_after,
      created_by,
      created_at
    `)
    .eq('cycle_id', cycleId)
    .order('created_at', {
      ascending: true,
    })
    .order('id', {
      ascending: true,
    })
}

export async function insertPersonalFinancialTransaction(
  input: {
    cycle_id: string
    transaction_type: string
    amount: number
    description: string
    note: string | null
    adjustment_sign: number | null
    balance_after: number
  },
) {
  return await supabaseAdmin
    .from('personal_financial_transactions')
    .insert(input)
    .select(`
      id,
      cycle_id,
      transaction_type,
      amount,
      description,
      note,
      adjustment_sign,
      balance_after,
      created_by,
      created_at
    `)
    .single()
}

export async function loadPersonalFinancialTransaction(
  transactionId: string,
) {
  return await supabaseAdmin
    .from('personal_financial_transactions')
    .select(`
      id,
      cycle_id
    `)
    .eq('id', transactionId)
    .maybeSingle()
}

export async function deletePersonalFinancialTransaction(
  transactionId: string,
) {
  return await supabaseAdmin
    .from('personal_financial_transactions')
    .delete()
    .eq('id', transactionId)
}

export async function deletePersonalFinancialTransactionsByCycle(
  cycleId: string,
) {
  return await supabaseAdmin
    .from('personal_financial_transactions')
    .delete()
    .eq('cycle_id', cycleId)
}
