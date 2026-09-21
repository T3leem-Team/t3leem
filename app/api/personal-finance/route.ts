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

function errorResponse(
  message: string,
  status = 400,
) {
  return NextResponse.json(
    { error: message },
    { status },
  )
}

async function getOwnedCycle(
  cycleId: string,
) {
  const { data, error } =
    await supabaseAdmin
      .from('personal_financial_cycles')
      .select('*')
      .eq('id', cycleId)
      .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

async function getCycleTransactions(
  cycleId: string,
) {
  const { data, error } =
    await supabaseAdmin
      .from(
        'personal_financial_transactions',
      )
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

  if (error) {
    throw error
  }

  return data ?? []
}

function calculateBalance(
  initialBalance: number,
  transactions: any[],
) {
  let balance = initialBalance

  const calculated = transactions.map(
    (transaction) => {
      const amount =
        Number(transaction.amount) || 0

      if (
        transaction.transaction_type ===
        'in'
      ) {
        balance += amount
      } else if (
        transaction.transaction_type ===
        'out'
      ) {
        balance -= amount
      } else if (
        transaction.transaction_type ===
        'adjustment'
      ) {
        const sign =
          Number(
            transaction.adjustment_sign,
          ) === -1
            ? -1
            : 1

        balance += amount * sign
      }

      return {
        ...transaction,
        balance_after: Number(
          balance.toFixed(3),
        ),
      }
    },
  )

  return {
    transactions: calculated,
    balance: Number(
      balance.toFixed(3),
    ),
  }
}

/**
 * GET
 *
 * ?action=cycles
 *
 * ?action=transactions&cycleId=...
 */
export async function GET(
  request: Request,
) {
  const access = await checkAccess()

  if (!access.allowed) {
    return NextResponse.json(
      {
        error:
          'غير مصرح لك بالوصول إلى الإدارة الشخصية.',
        reason: access.reason,
      },
      { status: 403 },
    )
  }

  try {
    const url = new URL(
      request.url,
    )

    const action =
      url.searchParams.get('action') ??
      'cycles'

    if (action === 'cycles') {
      const { data, error } =
        await supabaseAdmin
          .from(
            'personal_financial_cycles',
          )
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

      if (error) {
        throw error
      }

      return NextResponse.json({
        cycles: data ?? [],
      })
    }

    if (action === 'transactions') {
      const cycleId =
        url.searchParams.get(
          'cycleId',
        )

      if (!cycleId) {
        return errorResponse(
          'معرف الدفتر مطلوب.',
        )
      }

      const cycle =
        await getOwnedCycle(
          cycleId,
        )

      if (!cycle) {
        return errorResponse(
          'الدفتر غير موجود.',
          404,
        )
      }

      const transactions =
        await getCycleTransactions(
          cycleId,
        )

      const result =
        calculateBalance(
          Number(
            cycle.initial_balance ?? 0,
          ),
          transactions,
        )

      return NextResponse.json({
        cycle,
        transactions:
          result.transactions,
        currentBalance:
          result.balance,
      })
    }

    return errorResponse(
      'الطلب غير صحيح.',
    )
  } catch (error) {
    console.error(
      'Personal Finance GET error:',
      error,
    )

    return NextResponse.json(
      {
        error:
          'تعذر تحميل بيانات الإدارة الشخصية.',
      },
      { status: 500 },
    )
  }
}

/**
 * POST
 *
 * action=create-cycle
 *
 * action=add-transaction
 */
export async function POST(
  request: Request,
) {
  const access = await checkAccess()

  if (!access.allowed) {
    return NextResponse.json(
      {
        error:
          'غير مصرح لك باستخدام الإدارة الشخصية.',
        reason: access.reason,
      },
      { status: 403 },
    )
  }

  try {
    const body =
      await request.json()

    const action =
      body.action

    // =========================================
    // إنشاء دفتر جديد
    // =========================================

    if (
      action ===
      'create-cycle'
    ) {
      const name =
        String(
          body.name ?? '',
        ).trim()

      const initialBalance =
        Number(
          body.initial_balance ?? 0,
        )

      if (!name) {
        return errorResponse(
          'اسم الطلب أو العملية مطلوب.',
        )
      }

      if (
        !Number.isFinite(
          initialBalance,
        ) ||
        initialBalance < 0
      ) {
        return errorResponse(
          'الرصيد الأولي غير صحيح.',
        )
      }

      const { data, error } =
        await supabaseAdmin
          .from(
            'personal_financial_cycles',
          )
          .insert({
            name,
            initial_balance:
              Number(
                initialBalance.toFixed(
                  3,
                ),
              ),
            initial_source:
              body.initial_source ||
              null,
            initial_note:
              body.initial_note ||
              null,
            status: 'open',
          })
          .select()
          .single()

      if (error) {
        throw error
      }

      return NextResponse.json(
        {
          cycle: data,
        },
        { status: 201 },
      )
    }

    // =========================================
    // إضافة عملية
    // =========================================

    if (
      action ===
      'add-transaction'
    ) {
      const cycleId =
        String(
          body.cycle_id ?? '',
        ).trim()

      const transactionType =
        body.transaction_type

      const amount =
        Number(
          body.amount,
        )

      const description =
        String(
          body.description ?? '',
        ).trim()

      if (!cycleId) {
        return errorResponse(
          'الدفتر مطلوب.',
        )
      }

      if (
        ![
          'in',
          'out',
          'adjustment',
        ].includes(
          transactionType,
        )
      ) {
        return errorResponse(
          'نوع العملية غير صحيح.',
        )
      }

      if (
        !Number.isFinite(
          amount,
        ) ||
        amount <= 0
      ) {
        return errorResponse(
          'المبلغ يجب أن يكون أكبر من صفر.',
        )
      }

      if (!description) {
        return errorResponse(
          'وصف العملية مطلوب.',
        )
      }

      const cycle =
        await getOwnedCycle(
          cycleId,
        )

      if (!cycle) {
        return errorResponse(
          'الدفتر غير موجود.',
          404,
        )
      }

      if (
        cycle.status !==
        'open'
      ) {
        return errorResponse(
          'الدفتر مغلق ولا يمكن إضافة عمليات جديدة.',
        )
      }

      let adjustmentSign:
        | number
        | null = null

      if (
        transactionType ===
        'adjustment'
      ) {
        adjustmentSign =
          Number(
            body.adjustment_sign,
          )

        if (
          adjustmentSign !==
            1 &&
          adjustmentSign !==
            -1
        ) {
          return errorResponse(
            'يجب تحديد اتجاه تعديل الفرق.',
          )
        }
      }

      const transactions =
        await getCycleTransactions(
          cycleId,
        )

      const current =
        calculateBalance(
          Number(
            cycle.initial_balance ??
              0,
          ),
          transactions,
        )

      let newBalance =
        current.balance

      if (
        transactionType ===
        'in'
      ) {
        newBalance += amount
      }

      if (
        transactionType ===
        'out'
      ) {
        newBalance -= amount
      }

      if (
        transactionType ===
        'adjustment'
      ) {
        newBalance +=
          amount *
          Number(
            adjustmentSign,
          )
      }

      newBalance = Number(
        newBalance.toFixed(
          3,
        ),
      )

      const { data, error } =
        await supabaseAdmin
          .from(
            'personal_financial_transactions',
          )
          .insert({
            cycle_id:
              cycleId,
            transaction_type:
              transactionType,
            amount:
              Number(
                amount.toFixed(
                  3,
                ),
              ),
            description,
            note:
              body.note ||
              null,
            adjustment_sign:
              adjustmentSign,
            balance_after:
              newBalance,
          })
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

      if (error) {
        throw error
      }

      await supabaseAdmin
        .from(
          'personal_financial_cycles',
        )
        .update({
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          'id',
          cycleId,
        )

      return NextResponse.json(
        {
          transaction: data,
          currentBalance:
            newBalance,
        },
        { status: 201 },
      )
    }

    return errorResponse(
      'نوع العملية غير معروف.',
    )
  } catch (error) {
    console.error(
      'Personal Finance POST error:',
      error,
    )

    return NextResponse.json(
      {
        error:
          'تعذر حفظ العملية.',
      },
      { status: 500 },
    )
  }
}

/**
 * PATCH
 *
 * action=close
 * action=reopen
 */
export async function PATCH(
  request: Request,
) {
  const access = await checkAccess()

  if (!access.allowed) {
    return NextResponse.json(
      {
        error:
          'غير مصرح لك بتعديل الإدارة الشخصية.',
        reason: access.reason,
      },
      { status: 403 },
    )
  }

  try {
    const body =
      await request.json()

    const action =
      body.action

    const cycleId =
      String(
        body.cycle_id ?? '',
      ).trim()

    const note =
      String(
        body.note ?? '',
      ).trim()

    if (!cycleId) {
      return errorResponse(
        'معرف الدفتر مطلوب.',
      )
    }

    if (!note) {
      return errorResponse(
        action === 'close'
          ? 'ملاحظة الإغلاق مطلوبة.'
          : 'ملاحظة إعادة الفتح مطلوبة.',
      )
    }

    const cycle =
      await getOwnedCycle(
        cycleId,
      )

    if (!cycle) {
      return errorResponse(
        'الدفتر غير موجود.',
        404,
      )
    }

    // =========================================
    // إغلاق
    // =========================================

    if (
      action === 'close'
    ) {
      if (
        cycle.status ===
        'closed'
      ) {
        return errorResponse(
          'الدفتر مغلق بالفعل.',
        )
      }

      const { data, error } =
        await supabaseAdmin
          .from(
            'personal_financial_cycles',
          )
          .update({
            status: 'closed',
            closed_at:
              new Date().toISOString(),
            close_note:
              note,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            'id',
            cycleId,
          )
          .select()
          .single()

      if (error) {
        throw error
      }

      return NextResponse.json({
        cycle: data,
      })
    }

    // =========================================
    // إعادة فتح
    // =========================================

    if (
      action === 'reopen'
    ) {
      if (
        cycle.status !==
        'closed'
      ) {
        return errorResponse(
          'الدفتر مفتوح بالفعل.',
        )
      }

      const { data, error } =
        await supabaseAdmin
          .from(
            'personal_financial_cycles',
          )
          .update({
            status: 'open',
            reopened_at:
              new Date().toISOString(),
            reopen_note:
              note,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            'id',
            cycleId,
          )
          .select()
          .single()

      if (error) {
        throw error
      }

      return NextResponse.json({
        cycle: data,
      })
    }

    return errorResponse(
      'إجراء غير معروف.',
    )
  } catch (error) {
    console.error(
      'Personal Finance PATCH error:',
      error,
    )

    return NextResponse.json(
      {
        error:
          'تعذر تحديث الدفتر.',
      },
      { status: 500 },
    )
  }
}

/**
 * DELETE
 *
 * action=delete-cycle
 * action=delete-transaction
 */
export async function DELETE(
  request: Request,
) {
  const access = await checkAccess()

  if (!access.allowed) {
    return NextResponse.json(
      {
        error:
          'غير مصرح لك بالحذف.',
        reason: access.reason,
      },
      { status: 403 },
    )
  }

  try {
    const body =
      await request.json()

    const action =
      body.action

    // =========================================
    // حذف دفتر كامل
    // =========================================

    if (
      action ===
      'delete-cycle'
    ) {
      const cycleId =
        String(
          body.cycle_id ?? '',
        ).trim()

      if (!cycleId) {
        return errorResponse(
          'معرف الدفتر مطلوب.',
        )
      }

      const cycle =
        await getOwnedCycle(
          cycleId,
        )

      if (!cycle) {
        return errorResponse(
          'الدفتر غير موجود.',
          404,
        )
      }

      const { error } =
        await supabaseAdmin
          .from(
            'personal_financial_cycles',
          )
          .delete()
          .eq(
            'id',
            cycleId,
          )

      if (error) {
        throw error
      }

      return NextResponse.json({
        success: true,
      })
    }

    // =========================================
    // حذف عملية
    // =========================================

    if (
      action ===
      'delete-transaction'
    ) {
      const transactionId =
        String(
          body.transaction_id ??
            '',
        ).trim()

      if (!transactionId) {
        return errorResponse(
          'معرف العملية مطلوب.',
        )
      }

      const {
        data: transaction,
        error:
          transactionError,
      } =
        await supabaseAdmin
          .from(
            'personal_financial_transactions',
          )
          .select(
            'id, cycle_id',
          )
          .eq(
            'id',
            transactionId,
          )
          .maybeSingle()

      if (transactionError) {
        throw transactionError
      }

      if (!transaction) {
        return errorResponse(
          'العملية غير موجودة.',
          404,
        )
      }

      const cycle =
        await getOwnedCycle(
          transaction.cycle_id,
        )

      if (!cycle) {
        return errorResponse(
          'الدفتر غير موجود.',
          404,
        )
      }

      const { error } =
        await supabaseAdmin
          .from(
            'personal_financial_transactions',
          )
          .delete()
          .eq(
            'id',
            transactionId,
          )

      if (error) {
        throw error
      }

      return NextResponse.json({
        success: true,
      })
    }

    return errorResponse(
      'إجراء الحذف غير معروف.',
    )
  } catch (error) {
    console.error(
      'Personal Finance DELETE error:',
      error,
    )

    return NextResponse.json(
      {
        error:
          'تعذر تنفيذ عملية الحذف.',
      },
      { status: 500 },
    )
  }
}
