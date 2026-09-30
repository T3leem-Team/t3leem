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

    const annualFee =
      Number(
        currentYear.annual_fee ?? 0,
      )

    const [
      studentsResult,
      enrollmentsResult,
      paymentsResult,
      levelsResult,
    ] = await Promise.all([
      /*
       * الطلاب
       */
      supabaseAdmin
        .from('students')
        .select(
          'id, name, personal_id, fee_exempt, created_at',
        )
        .order('created_at', {
          ascending: false,
        }),

      /*
       * تسجيلات الطلاب في السنة الحالية
       */
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

      /*
       * دفعات السنة الحالية
       */
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

      /*
       * المستويات
       *
       * مهم:
       * sort_order هو المصدر الرسمي
       * لترتيب المستويات في النظام.
       */
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

    /*
     * نضمن أن الـ API يرجع مستويات
     * مرتبة حسب sort_order.
     *
     * الـ order أعلاه يقوم بهذا في Supabase،
     * وهذا الفرز الإضافي يحافظ على النتيجة
     * بشكل واضح حتى لو كانت بعض القيم null.
     */
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

      /*
       * يحتوي الآن على:
       *
       * id
       * name
       * sort_order
       */
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

    /*
     * التأكد من أن السنة الحالية
     * صحيحة ونشطة.
     */
    const {
      data: currentYear,
      error: yearError,
    } = await supabaseAdmin
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

    /*
     * جلب الطالب.
     */
    const {
      data: student,
      error: studentError,
    } = await supabaseAdmin
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

    /*
     * الطالب المعفي لا يمكن
     * تسجيل دفعة له.
     */
    if (student.fee_exempt) {
      return NextResponse.json(
        {
          error:
            'الطالب معفي من الرسوم ولا يمكن إضافة دفعة له.',
        },
        { status: 400 },
      )
    }

    /*
     * التأكد من وجود تسجيل نشط
     * للطالب في السنة الحالية.
     */
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

    /*
     * حساب إجمالي المدفوع
     * قبل إضافة الدفعة الجديدة.
     */
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

    /*
     * منع دفع مبلغ أكبر
     * من المتبقي.
     */
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

    /*
     * الخطوة الأولى:
     * حفظ الدفعة في جدول payments.
     */
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

    /*
     * الخطوة الثانية:
     * معرفة إعداد الإدارة المالية لهذه السنة.
     */
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
      /*
       * الدفعة تم حفظها بالفعل.
       *
       * لذلك لا نفشل تسجيل الدفعة
       * بسبب إعداد الإدارة المالية.
       */
      console.error(
        'Financial settings lookup error:',
        financialSettingsError,
      )
    }

    /*
     * إذا كان النظام يعمل على
     * student_payments
     * ننشئ عملية مالية معلقة.
     */
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
        /*
         * الدفعة الأساسية موجودة بالفعل.
         *
         * نسجل الخطأ فقط.
         */
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