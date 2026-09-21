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

/*
 * هل العملية تدخل فعلياً في الرصيد؟
 *
 * دفعة الطالب المعلقة لا تدخل الرصيد حتى يتم تأكيدها.
 */
function affectsBalance(transaction: any) {
  if (
    transaction.source_type === 'student_payment' &&
    transaction.confirmation_status === 'pending'
  ) {
    return false
  }

  /*
   * الرصيد الافتتاحي محفوظ أصلاً داخل
   * financial_settings.opening_balance
   *
   * لذلك لا نحسب transaction من نوع opening مرة ثانية.
   */
  if (transaction.source_type === 'opening') {
    return false
  }

  return true
}

/*
 * حساب الرصيد بالتسلسل
 */
function calculateBalance(
  openingBalance: number,
  transactions: any[],
) {
  let balance = Number(openingBalance || 0)

  return transactions.map((transaction) => {
    const before = balance
    const amount = Number(transaction.amount || 0)

    if (affectsBalance(transaction)) {
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
    }

    return {
      ...transaction,
      balance_before: before,
      balance_after: balance,
      affects_balance: affectsBalance(transaction),
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

    const academicYearId =
      searchParams.get('academic_year_id')

    if (!academicYearId) {
      return NextResponse.json(
        { error: 'academic_year_id مطلوب' },
        { status: 400 },
      )
    }

    /*
     * -------------------------------------------------------
     * الإعدادات المالية
     * -------------------------------------------------------
     */

    const {
      data: settings,
      error: settingsError,
    } = await supabaseAdmin
      .from('financial_settings')
      .select('*')
      .eq('academic_year_id', academicYearId)
      .maybeSingle()

    if (settingsError) {
      throw settingsError
    }

    /*
     * -------------------------------------------------------
     * العمليات
     * -------------------------------------------------------
     */

    const {
      data: transactions,
      error: transactionsError,
    } = await supabaseAdmin
      .from('financial_transactions')
      .select('*')
      .eq('academic_year_id', academicYearId)
      .order('created_at', {
        ascending: true,
      })
      .order('id', {
        ascending: true,
      })

    if (transactionsError) {
      throw transactionsError
    }

    const allTransactions = transactions ?? []

    /*
     * -------------------------------------------------------
     * حساب الرصيد
     * -------------------------------------------------------
     */

    const calculatedTransactions =
      calculateBalance(
        Number(settings?.opening_balance ?? 0),
        allTransactions,
      )

    let balance =
      Number(settings?.opening_balance ?? 0)

    if (calculatedTransactions.length) {
      balance =
        calculatedTransactions[
          calculatedTransactions.length - 1
        ].balance_after
    }

    /*
     * -------------------------------------------------------
     * العمليات التي تدخل فعلياً في الحساب
     * -------------------------------------------------------
     */

    const effectiveTransactions =
      allTransactions.filter(
        (transaction) =>
          affectsBalance(transaction),
      )

    /*
     * -------------------------------------------------------
     * إجمالي الإيرادات
     *
     * يشمل:
     * - الإيرادات
     * - التسويات +
     *
     * ولا يشمل:
     * - الدفعات المعلقة
     * - opening
     * -------------------------------------------------------
     */

    const totalIn = effectiveTransactions
      .filter(
        (item) =>
          item.transaction_type === 'in' ||
          (
            item.transaction_type ===
              'adjustment' &&
            item.adjustment_direction ===
              'plus'
          ),
      )
      .reduce(
        (sum, item) =>
          sum + Number(item.amount || 0),
        0,
      )

    /*
     * -------------------------------------------------------
     * إجمالي المصروفات
     *
     * يشمل:
     * - المصروفات
     * - التسويات -
     * -------------------------------------------------------
     */

    const totalOut = effectiveTransactions
      .filter(
        (item) =>
          item.transaction_type === 'out' ||
          (
            item.transaction_type ===
              'adjustment' &&
            item.adjustment_direction ===
              'minus'
          ),
      )
      .reduce(
        (sum, item) =>
          sum + Number(item.amount || 0),
        0,
      )

    /*
     * -------------------------------------------------------
     * إجمالي التسويات بشكل منفصل
     * -------------------------------------------------------
     */

    const totalAdjustmentsPlus =
      effectiveTransactions
        .filter(
          (item) =>
            item.transaction_type ===
              'adjustment' &&
            item.adjustment_direction ===
              'plus',
        )
        .reduce(
          (sum, item) =>
            sum + Number(item.amount || 0),
          0,
        )

    const totalAdjustmentsMinus =
      effectiveTransactions
        .filter(
          (item) =>
            item.transaction_type ===
              'adjustment' &&
            item.adjustment_direction ===
              'minus',
        )
        .reduce(
          (sum, item) =>
            sum + Number(item.amount || 0),
          0,
        )

    /*
     * -------------------------------------------------------
     * إعادة العمليات للأحدث أولاً
     * -------------------------------------------------------
     */

    const responseTransactions =
      [...calculatedTransactions].reverse()

    /*
     * -------------------------------------------------------
     * النتيجة
     * -------------------------------------------------------
     */

    return NextResponse.json({
      settings,

      transactions: responseTransactions,

      summary: {
        openingBalance:
          Number(
            settings?.opening_balance ?? 0,
          ),

        balance,

        totalIn,

        totalOut,

        totalAdjustmentsPlus,

        totalAdjustmentsMinus,

        operations:
          allTransactions.length,
      },
    })
  } catch (error) {
    console.error(
      'Financial GET error:',
      error,
    )

    return NextResponse.json(
      {
        error:
          'حدث خطأ أثناء تحميل الإدارة المالية',
      },
      { status: 500 },
    )
  }
}