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
 * التأكد من وجود السنة الدراسية
 */
async function checkAcademicYear(
  academicYearId: string,
) {
  const { data, error } = await supabaseAdmin
    .from('academic_years')
    .select(
      'id, name, is_current, is_active',
    )
    .eq('id', academicYearId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

/*
 * التأكد من أن العملية موجودة في نفس السنة
 */
async function getTransaction(
  transactionId: string,
  academicYearId: string,
) {
  const { data, error } =
    await supabaseAdmin
      .from('financial_transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('academic_year_id', academicYearId)
      .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

/**
 * الإدارة المالية
 */
export async function POST(request: Request) {
  try {
    /*
     * --------------------------------------------------
     * الصلاحية
     * --------------------------------------------------
     */

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

    /*
     * --------------------------------------------------
     * السنة الدراسية مطلوبة
     * --------------------------------------------------
     */

    if (!academic_year_id) {
      return NextResponse.json(
        {
          error:
            'السنة الدراسية مطلوبة',
        },
        { status: 400 },
      )
    }

    /*
     * --------------------------------------------------
     * التأكد من السنة
     * --------------------------------------------------
     */

    const academicYear =
      await checkAcademicYear(
        academic_year_id,
      )

    if (!academicYear) {
      return NextResponse.json(
        {
          error:
            'السنة الدراسية غير موجودة',
        },
        { status: 404 },
      )
    }

    /*
     * ==================================================
     * INITIALIZE
     * تهيئة الإدارة المالية
     * ==================================================
     */

    if (action === 'initialize') {
      if (
        financial_mode !==
          'student_payments' &&
        financial_mode !== 'manual'
      ) {
        return NextResponse.json(
          {
            error:
              'نوع النظام المالي غير صحيح',
          },
          { status: 400 },
        )
      }

      const balance =
        Number(opening_balance ?? 0)

      if (
        !Number.isFinite(balance) ||
        balance < 0
      ) {
        return NextResponse.json(
          {
            error:
              'الرصيد الافتتاحي غير صحيح',
          },
          { status: 400 },
        )
      }

      /*
       * منع إعادة تهيئة نفس السنة
       */

      const { data: existing } =
        await supabaseAdmin
          .from('financial_settings')
          .select('id')
          .eq(
            'academic_year_id',
            academic_year_id,
          )
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

      /*
       * إنشاء الإعداد
       *
       * مهم:
       * الرصيد محفوظ هنا.
       * لا ننشئ transaction افتتاحية
       * حتى لا يتم احتساب الرصيد مرتين.
       */

      const {
        data: settings,
        error,
      } = await supabaseAdmin
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

      return NextResponse.json({
        success: true,
        settings,
      })
    }

    /*
     * ==================================================
     * CREATE
     * إضافة عملية مالية
     * ==================================================
     */

    if (action === 'create') {
      /*
       * نوع العملية
       */

      if (
        transaction_type !== 'in' &&
        transaction_type !== 'out' &&
        transaction_type !==
          'adjustment'
      ) {
        return NextResponse.json(
          {
            error:
              'نوع العملية غير صحيح',
          },
          { status: 400 },
        )
      }

      /*
       * المبلغ
       */

      const numericAmount =
        Number(amount)

      if (
        !Number.isFinite(
          numericAmount,
        ) ||
        numericAmount <= 0
      ) {
        return NextResponse.json(
          {
            error:
              'المبلغ يجب أن يكون أكبر من صفر',
          },
          { status: 400 },
        )
      }

      /*
       * التسوية تحتاج اتجاه
       */

      if (
        transaction_type ===
          'adjustment' &&
        adjustment_direction !==
          'plus' &&
        adjustment_direction !==
          'minus'
      ) {
        return NextResponse.json(
          {
            error:
              'اتجاه التسوية مطلوب',
          },
          { status: 400 },
        )
      }

      /*
       * جلب إعدادات السنة
       */

      const {
        data: settings,
        error: settingsError,
      } = await supabaseAdmin
        .from('financial_settings')
        .select('*')
        .eq(
          'academic_year_id',
          academic_year_id,
        )
        .maybeSingle()

      if (settingsError) {
        throw settingsError
      }

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
       * --------------------------------------------------
       * دفعة طالب
       * --------------------------------------------------
       */

      if (
        source_type ===
        'student_payment'
      ) {
        /*
         * دفعات الطلاب مسموحة فقط
         * في وضع مدفوعات الطلاب.
         */

        if (
          settings.financial_mode !==
          'student_payments'
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
         * دفعة الطالب يجب أن تكون IN
         */

        if (
          transaction_type !== 'in'
        ) {
          return NextResponse.json(
            {
              error:
                'دفعات الطلاب يجب أن تكون إيرادًا',
            },
            { status: 400 },
          )
        }

        /*
         * يجب أن يكون لدينا على الأقل
         * معرف دفعة أو طالب.
         */

        if (
          !payment_id &&
          !student_id
        ) {
          return NextResponse.json(
            {
              error:
                'يجب ربط دفعة الطالب بمعرف الدفعة أو الطالب',
            },
            { status: 400 },
          )
        }
      }

      /*
       * --------------------------------------------------
       * تحديد حالة التأكيد
       * --------------------------------------------------
       */

      const confirmationStatus =
        source_type ===
        'student_payment'
          ? 'pending'
          : 'not_required'

      /*
       * --------------------------------------------------
       * نوع المصدر
       * --------------------------------------------------
       */

      let finalSourceType =
        source_type

      if (!finalSourceType) {
        if (
          transaction_type ===
          'adjustment'
        ) {
          finalSourceType =
            'adjustment'
        } else {
          finalSourceType =
            'manual'
        }
      }

      /*
       * --------------------------------------------------
       * إنشاء العملية
       * --------------------------------------------------
       */

      const {
        data: transaction,
        error,
      } = await supabaseAdmin
        .from('financial_transactions')
        .insert({
          academic_year_id,

          transaction_type,

          amount: numericAmount,

          adjustment_direction:
            transaction_type ===
            'adjustment'
              ? adjustment_direction
              : null,

          source_type:
            finalSourceType,

          source:
            source || null,

          payment_id:
            payment_id || null,

          student_id:
            student_id || null,

          student_request_number:
            student_request_number ||
            null,

          payment_method:
            payment_method || null,

          reference_number:
            reference_number || null,

          confirmation_status:
            confirmationStatus,

          confirmed_by: null,

          confirmed_at: null,

          note:
            note || null,
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
     * ==================================================
     * CONFIRM
     * تأكيد استلام دفعة الطالب
     * ==================================================
     */

    if (action === 'confirm') {
      const {
        transaction_id,
      } = body

      if (!transaction_id) {
        return NextResponse.json(
          {
            error:
              'معرف العملية مطلوب',
          },
          { status: 400 },
        )
      }

      const transaction =
        await getTransaction(
          transaction_id,
          academic_year_id,
        )

      if (!transaction) {
        return NextResponse.json(
          {
            error:
              'العملية غير موجودة',
          },
          { status: 404 },
        )
      }

      /*
       * يجب أن تكون دفعة طالب
       */

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

      /*
       * منع إعادة التأكيد
       */

      if (
        transaction.confirmation_status ===
        'confirmed'
      ) {
        return NextResponse.json(
          {
            error:
              'تم تأكيد العملية مسبقًا',
          },
          { status: 400 },
        )
      }

      /*
       * التأكيد
       */

      const confirmedAt =
        new Date().toISOString()

      const {
        data: updated,
        error,
      } = await supabaseAdmin
        .from(
          'financial_transactions',
        )
        .update({
          confirmation_status:
            'confirmed',
          confirmed_at:
            confirmedAt,
        })
        .eq(
          'id',
          transaction_id,
        )
        .eq(
          'academic_year_id',
          academic_year_id,
        )
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
     * ==================================================
     * DELETE
     * حذف العملية المالية
     * ==================================================
     */

    if (action === 'delete') {
      const {
        transaction_id,
      } = body

      if (!transaction_id) {
        return NextResponse.json(
          {
            error:
              'معرف العملية مطلوب',
          },
          { status: 400 },
        )
      }

      const transaction =
        await getTransaction(
          transaction_id,
          academic_year_id,
        )

      if (!transaction) {
        return NextResponse.json(
          {
            error:
              'العملية غير موجودة',
          },
          { status: 404 },
        )
      }

      /*
       * لا نحذف الرصيد الافتتاحي
       * لأنه محفوظ في financial_settings.
       *
       * وكذلك لا نحذف دفعة الطالب الأصلية
       * من جدول payments.
       */

      if (
        transaction.source_type ===
        'opening'
      ) {
        return NextResponse.json(
          {
            error:
              'لا يمكن حذف الرصيد الافتتاحي من سجل العمليات',
          },
          { status: 400 },
        )
      }

      const { error } =
        await supabaseAdmin
          .from(
            'financial_transactions',
          )
          .delete()
          .eq(
            'id',
            transaction_id,
          )
          .eq(
            'academic_year_id',
            academic_year_id,
          )

      if (error) {
        throw error
      }

      return NextResponse.json({
        success: true,
        deleted_id:
          transaction.id,
      })
    }

    /*
     * --------------------------------------------------
     * إجراء غير معروف
     * --------------------------------------------------
     */

    return NextResponse.json(
      {
        error:
          'الإجراء غير معروف',
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