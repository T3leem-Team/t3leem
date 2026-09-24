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

function normalizeAmount(
  value: unknown,
) {
  const amount = Number(value)

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return null
  }

  return Number(
    amount.toFixed(3),
  )
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
      url.searchParams.get(
        'action',
      ) ?? 'cycles'

    // =========================================
    // تحميل الدفاتر
    // =========================================

    if (
      action === 'cycles'
    ) {
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
          .order(
            'created_at',
            {
              ascending: false,
            },
          )

      if (error) {
        throw error
      }

      return NextResponse.json({
        cycles: data ?? [],
      })
    }

    // =========================================
    // تحميل عمليات دفتر
    // =========================================

    if (
      action ===
      'transactions'
    ) {
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
            cycle.initial_balance ??
              0,
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
 *
 * action=update-cycle-status
 *
 * action=delete-cycle
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
      String(
        body.action ?? '',
      ).trim()

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
          body.initial_balance ??
            0,
        )

      if (!name) {
        return errorResponse(
          'اسم الدفتر مطلوب.',
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
              String(
                body.initial_source ??
                  '',
              ).trim() || null,
            initial_note:
              String(
                body.initial_note ??
                  '',
              ).trim() || null,
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
        normalizeAmount(
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

      if (amount === null) {
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

      // =========================================
      // الدفتر المغلق لا يقبل عمليات جديدة
      // =========================================

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
            'يجب تحديد اتجاه التسوية.',
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
      } else if (
        transactionType ===
        'out'
      ) {
        newBalance -= amount
      } else if (
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
            amount,
            description,
            note:
              String(
                body.note ?? '',
              ).trim() || null,
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

      const { error: updateError } =
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

      if (updateError) {
        throw updateError
      }

      return NextResponse.json(
        {
          transaction: data,
          currentBalance:
            newBalance,
        },
        { status: 201 },
      )
    }

    // =========================================
    // إغلاق / فتح الدفتر
    //
    // هذا هو الـaction المستخدم
    // من PaymentPersonal.tsx
    // =========================================

    if (
      action ===
      'update-cycle-status'
    ) {
      const cycleId =
        String(
          body.cycle_id ?? '',
        ).trim()

      const status =
        body.status

      if (!cycleId) {
        return errorResponse(
          'معرف الدفتر مطلوب.',
        )
      }

      if (
        status !== 'open' &&
        status !== 'closed'
      ) {
        return errorResponse(
          'حالة الدفتر غير صحيحة.',
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
        cycle.status ===
        status
      ) {
        return errorResponse(
          status === 'closed'
            ? 'الدفتر مغلق بالفعل.'
            : 'الدفتر مفتوح بالفعل.',
        )
      }

      const now =
        new Date().toISOString()

      let updateData: Record<
        string,
        unknown
      >

      if (
        status ===
        'closed'
      ) {
        updateData = {
          status: 'closed',
          closed_at: now,
          updated_at: now,
        }
      } else {
        updateData = {
          status: 'open',
          reopened_at: now,
          updated_at: now,
        }
      }

      const { data, error } =
        await supabaseAdmin
          .from(
            'personal_financial_cycles',
          )
          .update(updateData)
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
        success: true,
        cycle: data,
      })
    }

    // =========================================
    // مسح الدفتر
    //
    // نحذف العمليات أولًا ثم الدفتر
    // حتى لا نعتمد على ON DELETE CASCADE
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

      // حذف جميع العمليات التابعة للدفتر
      const {
        error:
          transactionsDeleteError,
      } =
        await supabaseAdmin
          .from(
            'personal_financial_transactions',
          )
          .delete()
          .eq(
            'cycle_id',
            cycleId,
          )

      if (
        transactionsDeleteError
      ) {
        throw transactionsDeleteError
      }

      // ثم حذف الدفتر
      const {
        error: cycleDeleteError,
      } =
        await supabaseAdmin
          .from(
            'personal_financial_cycles',
          )
          .delete()
          .eq(
            'id',
            cycleId,
          )

      if (cycleDeleteError) {
        throw cycleDeleteError
      }

      return NextResponse.json({
        success: true,
        deletedCycleId:
          cycleId,
      })
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
 * يدعم النظام القديم:
 *
 * action=close
 * action=reopen
 *
 * ويمكن استخدامه أيضًا مستقبلًا.
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
      String(
        body.action ?? '',
      ).trim()

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

      const now =
        new Date().toISOString()

      const updateData: Record<
        string,
        unknown
      > = {
        status: 'closed',
        closed_at: now,
        updated_at: now,
      }

      if (note) {
        updateData.close_note =
          note
      }

      const { data, error } =
        await supabaseAdmin
          .from(
            'personal_financial_cycles',
          )
          .update(updateData)
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
        success: true,
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

      const now =
        new Date().toISOString()

      const updateData: Record<
        string,
        unknown
      > = {
        status: 'open',
        reopened_at: now,
        updated_at: now,
      }

      if (note) {
        updateData.reopen_note =
          note
      }

      const { data, error } =
        await supabaseAdmin
          .from(
            'personal_financial_cycles',
          )
          .update(updateData)
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
        success: true,
        cycle: data,
      })
    }

    // =========================================
    // تحديث الحالة بالطريقة العامة
    // =========================================

    if (
      action ===
      'update-cycle-status'
    ) {
      const status =
        body.status

      if (
        status !== 'open' &&
        status !== 'closed'
      ) {
        return errorResponse(
          'حالة الدفتر غير صحيحة.',
        )
      }

      if (
        cycle.status ===
        status
      ) {
        return errorResponse(
          status === 'closed'
            ? 'الدفتر مغلق بالفعل.'
            : 'الدفتر مفتوح بالفعل.',
        )
      }

      const now =
        new Date().toISOString()

      const updateData: Record<
        string,
        unknown
      > = {
        status,
        updated_at: now,
      }

      if (
        status ===
        'closed'
      ) {
        updateData.closed_at =
          now

        if (note) {
          updateData.close_note =
            note
        }
      } else {
        updateData.reopened_at =
          now

        if (note) {
          updateData.reopen_note =
            note
        }
      }

      const { data, error } =
        await supabaseAdmin
          .from(
            'personal_financial_cycles',
          )
          .update(updateData)
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
        success: true,
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
 * يدعم:
 *
 * action=delete-cycle
 *
 * action=delete-transaction
 *
 * وهذا موجود أيضًا في POST
 * للتوافق مع PaymentPersonal الحالي.
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
      String(
        body.action ?? '',
      ).trim()

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

      // حذف العمليات أولًا
      const {
        error:
          transactionsDeleteError,
      } =
        await supabaseAdmin
          .from(
            'personal_financial_transactions',
          )
          .delete()
          .eq(
            'cycle_id',
            cycleId,
          )

      if (
        transactionsDeleteError
      ) {
        throw transactionsDeleteError
      }

      // حذف الدفتر
      const {
        error: cycleDeleteError,
      } =
        await supabaseAdmin
          .from(
            'personal_financial_cycles',
          )
          .delete()
          .eq(
            'id',
            cycleId,
          )

      if (cycleDeleteError) {
        throw cycleDeleteError
      }

      return NextResponse.json({
        success: true,
        deletedCycleId:
          cycleId,
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
          .select(`
            id,
            cycle_id
          `)
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

      // احترام حالة الدفتر
      if (
        cycle.status !==
        'open'
      ) {
        return errorResponse(
          'الدفتر مغلق ولا يمكن حذف عمليات منه.',
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
          transaction.cycle_id,
        )

      return NextResponse.json({
        success: true,
        deletedTransactionId:
          transactionId,
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