import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateDashboardSection } from '@/lib/dashboard-section-guard'

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

async function checkAccess() {
  return validateDashboardSection('payments')
}

function calculateBalance(
  openingBalance: number,
  transactions: any[],
) {
  let balance = Number(openingBalance || 0)

  return transactions.map((transaction) => {
    const before = balance
    const amount = Number(transaction.amount || 0)

    if (transaction.transaction_type === 'in') {
      balance += amount
    }

    if (transaction.transaction_type === 'out') {
      balance -= amount
    }

    if (
      transaction.transaction_type === 'adjustment' &&
      transaction.adjustment_direction === 'plus'
    ) {
      balance += amount
    }

    if (
      transaction.transaction_type === 'adjustment' &&
      transaction.adjustment_direction === 'minus'
    ) {
      balance -= amount
    }

    return {
      ...transaction,
      balance_before: before,
      balance_after: balance,
    }
  })
}

export async function GET(request: Request) {
  try {
    const access = await checkAccess()

    if (!access.allowed) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 403 },
      )
    }

    const { searchParams } = new URL(request.url)

    const academicYearId = searchParams.get('academic_year_id')

    if (!academicYearId) {
      return NextResponse.json(
        { error: 'academic_year_id مطلوب' },
        { status: 400 },
      )
    }

    const { data: settings, error: settingsError } =
      await supabaseAdmin
        .from('financial_settings')
        .select('*')
        .eq('academic_year_id', academicYearId)
        .maybeSingle()

    if (settingsError) {
      throw settingsError
    }

    const { data: transactions, error: transactionsError } =
      await supabaseAdmin
        .from('financial_transactions')
        .select('*')
        .eq('academic_year_id', academicYearId)
        .order('created_at', {
          ascending: true,
        })

    if (transactionsError) {
      throw transactionsError
    }

    const calculatedTransactions = calculateBalance(
      settings?.opening_balance ?? 0,
      transactions ?? [],
    )

    let balance = Number(settings?.opening_balance ?? 0)

    if (calculatedTransactions.length) {
      balance =
        calculatedTransactions[
          calculatedTransactions.length - 1
        ].balance_after
    }

    const totalIn = (transactions ?? [])
      .filter(
        (item) =>
          item.transaction_type === 'in' ||
          (
            item.transaction_type === 'adjustment' &&
            item.adjustment_direction === 'plus'
          ),
      )
      .reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0,
      )

    const totalOut = (transactions ?? [])
      .filter(
        (item) =>
          item.transaction_type === 'out' ||
          (
            item.transaction_type === 'adjustment' &&
            item.adjustment_direction === 'minus'
          ),
      )
      .reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0,
      )

    return NextResponse.json({
      settings,
      transactions: calculatedTransactions.reverse(),
      summary: {
        openingBalance: Number(
          settings?.opening_balance ?? 0,
        ),
        balance,
        totalIn,
        totalOut,
        operations: transactions?.length ?? 0,
      },
    })
  } catch (error) {
    console.error('Financial GET error:', error)

    return NextResponse.json(
      {
        error: 'حدث خطأ أثناء تحميل الإدارة المالية',
      },
      { status: 500 },
    )
  }
}
