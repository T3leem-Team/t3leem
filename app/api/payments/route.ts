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
  const access = await checkPaymentsAccess()

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
    const { data: currentYear, error: yearError } =
      await supabaseAdmin
        .from('academic_years')
        .select('id, name, annual_fee')
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
        .select('student_id, level_id')
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
        .select('id, name')
        .eq('is_active', true),
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

    return NextResponse.json({
      academicYear: currentYear,
      students: studentsResult.data ?? [],
      enrollments: enrollmentsResult.data ?? [],
      payments: paymentsResult.data ?? [],
      levels: levelsResult.data ?? [],
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
    const body = await request.json()

    const amount = Number(body.amount)

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
      body.payment_method ?? 'نقدي'

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

    const { data: currentYear, error: yearError } =
      await supabaseAdmin
        .from('academic_years')
        .select(
          'id, name, annual_fee',
        )
        .eq('id', body.academic_year_id)
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

    const { data: student, error: studentError } =
      await supabaseAdmin
        .from('students')
        .select(
          'id, fee_exempt',
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

    const { data: enrollment, error: enrollmentError } =
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

    const { data: existingPayments, error: paymentsError } =
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
      (existingPayments ?? []).reduce(
        (total, payment) =>
          total +
          Number(payment.amount ?? 0),
        0,
      )

    const annualFee =
      Number(
        currentYear.annual_fee ?? 0,
      )

    const remaining =
      Math.max(
        annualFee - totalPaid,
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

    const { data, error } =
      await supabaseAdmin
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
            body.notes || null,
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