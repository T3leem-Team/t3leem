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

/**
 * إنشاء إعداد الإدارة المالية للسنة الدراسية
 */
export async function POST(request: Request) {
  try {
    const access = await checkAccess()

    if (!access.allowed) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 403 },
      )
    }

    const body = await request.json()

    const {
      action,
      academic_year_id,
      financial_mode,
      opening_balance,
      opening_source,
      opening_note,

      transaction_type,
      amount,
      source_type,
      source,
      payment_id,
      student_id,
      student_request_number,
      payment_method,
      reference_number,
      note,
      adjustment_direction,
    } = body

    if (!academic_year_id) {
      return NextResponse.json(
        { error: 'السنة الدراسية مطلوبة' },
        { status: 400 },
      )
    }

    /*
     * --------------------------------------------------
     * إنشاء إعداد السنة المالية
     * --------------------------------------------------
     */
    if (action === 'initialize') {
      if (
        financial_mode !== 'student_payments' &&
        financial_mode !== 'manual'
      ) {
        return NextResponse.json(
          { error: 'نوع النظام المالي غير صحيح' },
          { status: 400 },
        )
      }

      const balance = Number(opening_balance ?? 0)

      if (balance < 0) {
        return NextResponse.json(
          { error: 'الرصيد الافتتاحي لا يمكن أن يكون سالبًا' },
          { status: 400 },
        )
      }

      const { data: existing } =
        await supabaseAdmin
          .from('financial_settings')
          .select('id')
          .eq('academic_year_id', academic_year_id)
          .maybeSingle()

      if (existing) {
        return NextResponse.json(
          {
            error:
              'تم إعداد النظام المالي لهذه السنة مسبقًا',
          },
          { status: 409 },
        )
      }

      const { data: settings, error } =
        await supabaseAdmin
          .from('financial_settings')
          .insert({
            academic_year_id,
            financial_mode,
            opening_balance: balance,
            opening_source:
              opening_source || null,
            opening_note:
              opening_note || null,
          })
          .select()
          .single()

      if (error) {
        throw error
      }

      /*
       * إذا كان هناك رصيد افتتاحي،
       * نسجله أيضًا كعملية مالية حتى يظهر
       * في السجل والتقارير وExcel.
       */
      if (balance > 0) {
        const { error: transactionError } =
          await supabaseAdmin
            .from('financial_transactions')
            .insert({
              academic_year_id,
              transaction_type: 'in',
              amount: balance,
              source_type: 'opening',
              source:
                opening_source || 'الرصيد الافتتاحي',
              note: opening_note || null,
              confirmation_status: 'not_required',
            })

        if (transactionError) {
          /*
           * لا نترك إعدادًا بدون العملية الافتتاحية
           */
          await supabaseAdmin
            .from('financial_settings')
            .delete()
            .eq('id', settings.id)

          throw transactionError
        }
      }

      return NextResponse.json({
        success: true,
        settings,
      })
    }

    /*
     * --------------------------------------------------
     * إضافة عملية مالية
     * --------------------------------------------------
     */
    if (action === 'create') {
      if (
        transaction_type !== 'in' &&
        transaction_type !== 'out' &&
        transaction_type !== 'adjustment'
      ) {
        return NextResponse.json(
          { error: 'نوع العملية غير صحيح' },
          { status: 400 },
        )
      }

      const numericAmount = Number(amount)

      if (
        !Number.isFinite(numericAmount) ||
        numericAmount <= 0
      ) {
        return NextResponse.json(
          { error: 'المبلغ يجب أن يكون أكبر من صفر' },
          { status: 400 },
        )
      }

      if (
        transaction_type === 'adjustment' &&
        adjustment_direction !== 'plus' &&
        adjustment_direction !== 'minus'
      ) {
        return NextResponse.json(
          { error: 'اتجاه التسوية مطلوب' },
          { status: 400 },
        )
      }

      const { data: settings } =
        await supabaseAdmin
          .from('financial_settings')
          .select('*')
          .eq('academic_year_id', academic_year_id)
          .maybeSingle()

      if (!settings) {
        return NextResponse.json(
          {
            error:
              'يجب إعداد النظام المالي للسنة أولًا',
          },
          { status: 400 },
        )
      }

      /*
       * عمليات IN المرتبطة بالطلاب:
       * يجب أن تكون في نظام مدفوعات الطلاب.
       */
      if (
        transaction_type === 'in' &&
        source_type === 'student_payment' &&
        settings.financial_mode !== 'student_payments'
      ) {
        return NextResponse.json(
          {
            error:
              'النظام المالي الحالي هو الإدخال اليدوي',
          },
          { status: 400 },
        )
      }

      /*
       * إذا كانت العملية مرتبطة بدفعة طالب،
       * تكون بانتظار التأكيد.
       */
      const confirmationStatus =
        source_type === 'student_payment'
          ? 'pending'
          : 'not_required'

      const { data: transaction, error } =
        await supabaseAdmin
          .from('financial_transactions')
          .insert({
            academic_year_id,
            transaction_type,
            amount: numericAmount,
            adjustment_direction:
              transaction_type === 'adjustment'
                ? adjustment_direction
                : null,
            source_type:
              source_type ||
              (
                transaction_type === 'adjustment'
                  ? 'adjustment'
                  : 'manual'
              ),
            source: source || null,
            payment_id: payment_id || null,
            student_id: student_id || null,
            student_request_number:
              student_request_number || null,
            payment_method:
              payment_method || null,
            reference_number:
              reference_number || null,
            confirmation_status:
              confirmationStatus,
            note: note || null,
          })
          .select()
          .single()

      if (error) {
        throw error
      }

      return NextResponse.json({
        success: true,
        transaction,
      })
    }

    /*
     * --------------------------------------------------
     * تأكيد استلام دفعة طالب
     * --------------------------------------------------
     */
    if (action === 'confirm') {
      const { transaction_id } = body

      if (!transaction_id) {
        return NextResponse.json(
          { error: 'معرف العملية مطلوب' },
          { status: 400 },
        )
      }

      const { data: transaction, error: fetchError } =
        await supabaseAdmin
          .from('financial_transactions')
          .select('*')
          .eq('id', transaction_id)
          .single()

      if (fetchError) {
        throw fetchError
      }

      if (
        transaction.source_type !==
        'student_payment'
      ) {
        return NextResponse.json(
          {
            error:
              'هذه العملية لا تحتاج إلى تأكيد',
          },
          { status: 400 },
        )
      }

      if (
        transaction.confirmation_status ===
        'confirmed'
      ) {
        return NextResponse.json(
          {
            error: 'تم تأكيد العملية مسبقًا',
          },
          { status: 400 },
        )
      }

      /*
       * نحاول معرفة المستخدم الحالي من جلسة التطبيق.
       * إذا لم يتوفر ID نتركه null بدل اختلاق مستخدم.
       */
      const confirmedAt = new Date().toISOString()

      const { data: updated, error } =
        await supabaseAdmin
          .from('financial_transactions')
          .update({
            confirmation_status: 'confirmed',
            confirmed_at: confirmedAt,
          })
          .eq('id', transaction_id)
          .select()
          .single()

      if (error) {
        throw error
      }

      return NextResponse.json({
        success: true,
        transaction: updated,
      })
    }

    /*
     * --------------------------------------------------
     * حذف عملية
     * --------------------------------------------------
     */
    if (action === 'delete') {
      const { transaction_id } = body

      if (!transaction_id) {
        return NextResponse.json(
          { error: 'معرف العملية مطلوب' },
          { status: 400 },
        )
      }

      const { data: transaction, error: fetchError } =
        await supabaseAdmin
          .from('financial_transactions')
          .select('*')
          .eq('id', transaction_id)
          .single()

      if (fetchError) {
        throw fetchError
      }

      /*
       * لا نحذف دفعة الطالب نفسها.
       * نحذف سجلها المالي فقط.
       */
      const { error } =
        await supabaseAdmin
          .from('financial_transactions')
          .delete()
          .eq('id', transaction_id)

      if (error) {
        throw error
      }

      return NextResponse.json({
        success: true,
        deleted_id: transaction.id,
      })
    }

    return NextResponse.json(
      {
        error: 'الإجراء غير معروف',
      },
      { status: 400 },
    )
  } catch (error) {
    console.error(
      'Financial transaction API error:',
      error,
    )

    return NextResponse.json(
      {
        error:
          'حدث خطأ أثناء تنفيذ العملية المالية',
      },
      { status: 500 },
    )
  }
}
