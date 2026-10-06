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

async function checkPaymentsAccess() {
  return validateDashboardSection('payments')
}

async function checkPaymentWriteAccess() {
  const paymentsAccess =
    await validateDashboardSection('payments')

  if (paymentsAccess.allowed) {
    return paymentsAccess
  }

  const studentsAccess =
    await validateDashboardSection('students')

  if (studentsAccess.allowed) {
    return studentsAccess
  }

  return {
    allowed: false,
    reason: 'payment_write_not_allowed',
  }
}

export async function GET() {
  const access =
    await checkPaymentsAccess()

  if (!access.allowed) {
    return NextResponse.json(
      {
        error:
          'غير مصرح لك بالوصول إلى قسم المدفوعات.',
        reason: access.reason,
      },
      { status: 403 },
    )
  }

  try {
    const {
      data: currentYear,
      error: yearError,
    } = await supabaseAdmin
      .from('academic_years')
      .select(
        'id, name, annual_fee',
      )
      .eq('is_current', true)
      .eq('is_active', true)
      .maybeSingle()

    if (yearError) {
      throw yearError
    }

    if (!currentYear) {
      return NextResponse.json({
        academicYear: null,
        students: [],
        enrollments: [],
        payments: [],
        levels: [],
      })
    }

    const [
      studentsResult,
      enrollmentsResult,
      paymentsResult,
      levelsResult,
    ] = await Promise.all([
      supabaseAdmin
        .from('students')
        .select(
          'id, name, personal_id, fee_exempt, created_at',
        )
        .order('created_at', {
          ascending: false,
        }),

      supabaseAdmin
        .from('enrollments')
        .select(
          'student_id, level_id',
        )
        .eq(
          'academic_year_id',
          currentYear.id,
        )
        .eq('status', 'نشط'),

      supabaseAdmin
        .from('payments')
        .select(
          `
          id,
          student_id,
          academic_year_id,
          amount,
          payment_method,
          payment_date,
          reference_number,
          notes,
          created_at
          `,
        )
        .eq(
          'academic_year_id',
          currentYear.id,
        )
        .order('payment_date', {
          ascending: false,
        })
        .order('created_at', {
          ascending: false,
        }),

      supabaseAdmin
        .from('levels')
        .select(
          'id, name, sort_order',
        )
        .eq('is_active', true)
        .order('sort_order', {
          ascending: true,
          nullsFirst: false,
        }),
    ])

    if (studentsResult.error) {
      throw studentsResult.error
    }

    if (enrollmentsResult.error) {
      throw enrollmentsResult.error
    }

    if (paymentsResult.error) {
      throw paymentsResult.error
    }

    if (levelsResult.error) {
      throw levelsResult.error
    }

    const levels =
      (levelsResult.data ?? [])
        .map((level) => ({
          id: level.id,
          name: level.name,
          sort_order:
            level.sort_order == null
              ? null
              : Number(
                  level.sort_order,
                ),
        }))
        .sort(
          (a, b) => {
            const aOrder =
              a.sort_order ??
              Number.MAX_SAFE_INTEGER

            const bOrder =
              b.sort_order ??
              Number.MAX_SAFE_INTEGER

            if (
              aOrder !==
              bOrder
            ) {
              return (
                aOrder -
                bOrder
              )
            }

            return String(
              a.name ?? '',
            ).localeCompare(
              String(
                b.name ?? '',
              ),
              'ar',
            )
          },
        )

    return NextResponse.json({
      academicYear: currentYear,
      students:
        studentsResult.data ??
        [],
      enrollments:
        enrollmentsResult.data ??
        [],
      payments:
        paymentsResult.data ??
        [],
      levels,
    })
  } catch (error) {
    console.error(
      'Payments API GET error:',
      error,
    )

    return NextResponse.json(
      {
        error:
          'تعذر تحميل بيانات المدفوعات.',
      },
      { status: 500 },
    )
  }
}

export async function POST(
  request: Request,
) {
  const access =
    await checkPaymentWriteAccess()

  if (!access.allowed) {
    return NextResponse.json(
      {
        error:
          'غير مصرح لك بإضافة دفعات.',
        reason: access.reason,
      },
      { status: 403 },
    )
  }

  try {
    const body =
      await request.json()

    const amount =
      Number(body.amount)

    if (
      !body.student_id ||
      !body.academic_year_id ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !body.payment_date
    ) {
      return NextResponse.json(
        {
          error:
            'بيانات الدفعة غير مكتملة.',
        },
        { status: 400 },
      )
    }

    const allowedMethods = [
      'نقدي',
      'تحويل',
      'بطاقة',
    ]

    const paymentMethod =
      body.payment_method ??
      'نقدي'

    if (
      !allowedMethods.includes(
        paymentMethod,
      )
    ) {
      return NextResponse.json(
        {
          error:
            'طريقة الدفع غير صحيحة.',
        },
        { status: 400 },
      )
    }

    const {
      data: currentYear,
      error: yearError,
    } =
      await supabaseAdmin
        .from('academic_years')
        .select(
          'id, name, annual_fee',
        )
        .eq(
          'id',
          body.academic_year_id,
        )
        .eq('is_current', true)
        .eq('is_active', true)
        .maybeSingle()

    if (yearError) {
      throw yearError
    }

    if (!currentYear) {
      return NextResponse.json(
        {
          error:
            'السنة الدراسية غير صحيحة أو غير نشطة.',
        },
        { status: 400 },
      )
    }

    const {
      data: student,
      error: studentError,
    } =
      await supabaseAdmin
        .from('students')
        .select(
          'id, name, personal_id, fee_exempt',
        )
        .eq(
          'id',
          body.student_id,
        )
        .maybeSingle()

    if (studentError) {
      throw studentError
    }

    if (!student) {
      return NextResponse.json(
        {
          error:
            'الطالب غير موجود.',
        },
        { status: 404 },
      )
    }

    if (student.fee_exempt) {
      return NextResponse.json(
        {
          error:
            'الطالب معفي من الرسوم ولا يمكن إضافة دفعة له.',
        },
        { status: 400 },
      )
    }

    const {
      data: enrollment,
      error: enrollmentError,
    } =
      await supabaseAdmin
        .from('enrollments')
        .select('id')
        .eq(
          'student_id',
          body.student_id,
        )
        .eq(
          'academic_year_id',
          currentYear.id,
        )
        .eq('status', 'نشط')
        .maybeSingle()

    if (enrollmentError) {
      throw enrollmentError
    }

    if (!enrollment) {
      return NextResponse.json(
        {
          error:
            'الطالب غير مسجل في السنة الدراسية الحالية.',
        },
        { status: 400 },
      )
    }

    const {
      data: existingPayments,
      error: paymentsError,
    } =
      await supabaseAdmin
        .from('payments')
        .select('amount')
        .eq(
          'student_id',
          body.student_id,
        )
        .eq(
          'academic_year_id',
          currentYear.id,
        )

    if (paymentsError) {
      throw paymentsError
    }

    const totalPaid =
      (
        existingPayments ?? []
      ).reduce(
        (
          total,
          payment,
        ) =>
          total +
          Number(
            payment.amount ?? 0,
          ),
        0,
      )

    const annualFee =
      Number(
        currentYear.annual_fee ??
          0,
      )

    const remaining =
      Math.max(
        annualFee -
          totalPaid,
        0,
      )

    if (
      annualFee > 0 &&
      amount > remaining
    ) {
      return NextResponse.json(
        {
          error:
            'مبلغ الدفعة أكبر من المبلغ المتبقي.',
          remaining,
        },
        { status: 400 },
      )
    }

    const {
      data,
      error,
    } = await supabaseAdmin
      .from('payments')
      .insert({
        student_id:
          body.student_id,
        academic_year_id:
          currentYear.id,
        amount:
          Number(
            amount.toFixed(3),
          ),
        payment_method:
          paymentMethod,
        payment_date:
          body.payment_date,
        reference_number:
          body.reference_number ||
          null,
        notes:
          body.notes ||
          null,
      })
      .select(
        `
        id,
        student_id,
        academic_year_id,
        amount,
        payment_method,
        payment_date,
        reference_number,
        notes,
        created_at
        `,
      )
      .single()

    if (error) {
      throw error
    }

    const {
      data: financialSettings,
      error:
        financialSettingsError,
    } =
      await supabaseAdmin
        .from(
          'financial_settings',
        )
        .select(
          'id, financial_mode',
        )
        .eq(
          'academic_year_id',
          currentYear.id,
        )
        .maybeSingle()

    if (
      financialSettingsError
    ) {
      console.error(
        'Financial settings lookup error:',
        financialSettingsError,
      )
    }

    if (
      financialSettings?.financial_mode ===
      'student_payments'
    ) {
      const {
        error:
          financialTransactionError,
      } =
        await supabaseAdmin
          .from(
            'financial_transactions',
          )
          .insert({
            academic_year_id:
              currentYear.id,
            transaction_type:
              'in',
            amount:
              Number(
                amount.toFixed(3),
              ),
            adjustment_direction:
              null,
            source_type:
              'student_payment',
            source:
              `دفعة طالب - ${student.name}`,
            payment_id:
              data.id,
            student_id:
              student.id,
            student_request_number:
              student.personal_id ||
              null,
            payment_method:
              paymentMethod,
            reference_number:
              body.reference_number ||
              null,
            confirmation_status:
              'pending',
            confirmed_by:
              null,
            confirmed_at:
              null,
            note:
              body.notes ||
              null,
          })

      if (
        financialTransactionError
      ) {
        console.error(
          'Financial transaction creation error:',
          financialTransactionError,
        )
      }
    }

    return NextResponse.json(
      {
        payment: data,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error(
      'Payments API POST error:',
      error,
    )

    return NextResponse.json(
      {
        error:
          'تعذر حفظ الدفعة.',
      },
      { status: 500 },
    )
  }
}

/*
 * تعديل دفعة موجودة.
 *
 * مهم:
 * التعديل يعمل حتى لو أصبح الطالب
 * "مدفوع بالكامل".
 *
 * نحسب إجمالي الدفعات بدون الدفعة
 * الحالية ثم نضيف المبلغ الجديد.
 */
export async function PATCH(
  request: Request,
) {
  const access =
    await checkPaymentWriteAccess()

  if (!access.allowed) {
    return NextResponse.json(
      {
        error:
          'غير مصرح لك بتعديل الدفعات.',
        reason: access.reason,
      },
      { status: 403 },
    )
  }

  try {
    const body =
      await request.json()

    const paymentId =
      String(
        body.payment_id ?? '',
      ).trim()

    const amount =
      Number(body.amount)

    const paymentDate =
      String(
        body.payment_date ?? '',
      ).trim()

    const paymentMethod =
      body.payment_method ??
      'نقدي'

    if (
      !paymentId ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !paymentDate
    ) {
      return NextResponse.json(
        {
          error:
            'بيانات تعديل الدفعة غير مكتملة.',
        },
        { status: 400 },
      )
    }

    const allowedMethods = [
      'نقدي',
      'تحويل',
      'بطاقة',
    ]

    if (
      !allowedMethods.includes(
        paymentMethod,
      )
    ) {
      return NextResponse.json(
        {
          error:
            'طريقة الدفع غير صحيحة.',
        },
        { status: 400 },
      )
    }

    /*
     * جلب الدفعة الحالية.
     */
    const {
      data: existingPayment,
      error: existingPaymentError,
    } =
      await supabaseAdmin
        .from('payments')
        .select(
          `
          id,
          student_id,
          academic_year_id,
          amount
          `,
        )
        .eq('id', paymentId)
        .maybeSingle()

    if (existingPaymentError) {
      throw existingPaymentError
    }

    if (!existingPayment) {
      return NextResponse.json(
        {
          error:
            'الدفعة غير موجودة.',
        },
        { status: 404 },
      )
    }

    /*
     * نتأكد أن السنة التي تنتمي إليها
     * الدفعة هي السنة الحالية.
     */
    const {
      data: currentYear,
      error: yearError,
    } =
      await supabaseAdmin
        .from('academic_years')
        .select(
          'id, name, annual_fee',
        )
        .eq(
          'id',
          existingPayment.academic_year_id,
        )
        .eq('is_current', true)
        .eq('is_active', true)
        .maybeSingle()

    if (yearError) {
      throw yearError
    }

    if (!currentYear) {
      return NextResponse.json(
        {
          error:
            'لا يمكن تعديل دفعة لسنة دراسية غير حالية أو غير نشطة.',
        },
        { status: 400 },
      )
    }

    /*
     * جلب الطالب والتأكد من عدم إعفائه.
     */
    const {
      data: student,
      error: studentError,
    } =
      await supabaseAdmin
        .from('students')
        .select(
          'id, name, personal_id, fee_exempt',
        )
        .eq(
          'id',
          existingPayment.student_id,
        )
        .maybeSingle()

    if (studentError) {
      throw studentError
    }

    if (!student) {
      return NextResponse.json(
        {
          error:
            'الطالب غير موجود.',
        },
        { status: 404 },
      )
    }

    if (student.fee_exempt) {
      return NextResponse.json(
        {
          error:
            'الطالب معفي من الرسوم ولا يمكن تعديل دفعة له.',
        },
        { status: 400 },
      )
    }

    /*
     * جلب جميع دفعات الطالب ما عدا
     * الدفعة التي نقوم بتعديلها.
     */
    const {
      data: otherPayments,
      error: otherPaymentsError,
    } =
      await supabaseAdmin
        .from('payments')
        .select('amount')
        .eq(
          'student_id',
          existingPayment.student_id,
        )
        .eq(
          'academic_year_id',
          currentYear.id,
        )
        .neq('id', paymentId)

    if (otherPaymentsError) {
      throw otherPaymentsError
    }

    const otherPaid =
      (
        otherPayments ?? []
      ).reduce(
        (
          total,
          payment,
        ) =>
          total +
          Number(
            payment.amount ?? 0,
          ),
        0,
      )

    const annualFee =
      Number(
        currentYear.annual_fee ??
          0,
      )

    const newTotalPaid =
      otherPaid + amount

    /*
     * منع تجاوز الرسوم السنوية.
     *
     * إذا كانت الرسوم 100 والدفعات
     * الأخرى 50، يمكن تعديل هذه الدفعة
     * إلى 50 فقط كحد أقصى.
     */
    if (
      annualFee > 0 &&
      newTotalPaid > annualFee
    ) {
      const allowedAmount =
        Math.max(
          annualFee -
            otherPaid,
          0,
        )

      return NextResponse.json(
        {
          error:
            'المبلغ الجديد يجعل إجمالي المدفوع أكبر من الرسوم السنوية.',
          maxAmount:
            allowedAmount,
        },
        { status: 400 },
      )
    }

    const referenceNumber =
      String(
        body.reference_number ??
          '',
      ).trim()

    const notes =
      String(
        body.notes ?? '',
      ).trim()

    /*
     * تحديث سجل الدفعة نفسه.
     */
    const {
      data: updatedPayment,
      error: updateError,
    } =
      await supabaseAdmin
        .from('payments')
        .update({
          amount:
            Number(
              amount.toFixed(3),
            ),
          payment_method:
            paymentMethod,
          payment_date:
            paymentDate,
          reference_number:
            referenceNumber ||
            null,
          notes:
            notes || null,
        })
        .eq('id', paymentId)
        .select(
          `
          id,
          student_id,
          academic_year_id,
          amount,
          payment_method,
          payment_date,
          reference_number,
          notes,
          created_at
          `,
        )
        .single()

    if (updateError) {
      throw updateError
    }

    /*
     * تحديث العملية المالية المرتبطة
     * بنفس payment_id إن كانت موجودة.
     *
     * لا ننشئ عملية جديدة هنا؛
     * نعدل العملية الأصلية فقط.
     */
    const {
      data: financialTransaction,
      error:
        financialTransactionLookupError,
    } =
      await supabaseAdmin
        .from(
          'financial_transactions',
        )
        .select(
          'id',
        )
        .eq(
          'payment_id',
          paymentId,
        )
        .maybeSingle()

    if (
      financialTransactionLookupError
    ) {
      console.error(
        'Financial transaction lookup error during payment update:',
        financialTransactionLookupError,
      )
    } else if (
      financialTransaction
    ) {
      const {
        error:
          financialTransactionUpdateError,
      } =
        await supabaseAdmin
          .from(
            'financial_transactions',
          )
          .update({
            amount:
              Number(
                amount.toFixed(3),
              ),
            payment_method:
              paymentMethod,
            reference_number:
              referenceNumber ||
              null,
            note:
              notes || null,
          })
          .eq(
            'id',
            financialTransaction.id,
          )

      if (
        financialTransactionUpdateError
      ) {
        /*
         * الدفعة الأساسية تم تعديلها.
         * نسجل الخطأ حتى لا نخفي نجاح
         * تعديل payment.
         */
        console.error(
          'Financial transaction update error:',
          financialTransactionUpdateError,
        )
      }
    }

    return NextResponse.json(
      {
        payment:
          updatedPayment,
        totalPaid:
          Number(
            newTotalPaid.toFixed(3),
          ),
        remaining:
          Math.max(
            annualFee -
              newTotalPaid,
            0,
          ),
      },
      { status: 200 },
    )
  } catch (error) {
    console.error(
      'Payments API PATCH error:',
      error,
    )

    return NextResponse.json(
      {
        error:
          'تعذر تعديل الدفعة.',
      },
      { status: 500 },
    )
  }
}
