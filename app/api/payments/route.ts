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

export async function GET() {
  const access = await checkPaymentsAccess()

  if (!access.allowed) {
    return NextResponse.json(
      {
        error: 'غير مصرح لك بالوصول إلى قسم المدفوعات.',
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

    if (yearError) throw yearError

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
        .eq('academic_year_id', currentYear.id)
        .eq('status', 'نشط'),

      supabaseAdmin
        .from('payments')
        .select(
          'id, student_id, academic_year_id, amount, payment_method, payment_date, reference_number, notes, created_at',
        )
        .eq('academic_year_id', currentYear.id)
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

    if (studentsResult.error) throw studentsResult.error
    if (enrollmentsResult.error) throw enrollmentsResult.error
    if (paymentsResult.error) throw paymentsResult.error
    if (levelsResult.error) throw levelsResult.error

    return NextResponse.json({
      academicYear: currentYear,
      students: studentsResult.data ?? [],
      enrollments: enrollmentsResult.data ?? [],
      payments: paymentsResult.data ?? [],
      levels: levelsResult.data ?? [],
    })
  } catch (error) {
    console.error('Payments API GET error:', error)

    return NextResponse.json(
      { error: 'تعذر تحميل بيانات المدفوعات.' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  const access = await checkPaymentsAccess()

  if (!access.allowed) {
    return NextResponse.json(
      {
        error: 'غير مصرح لك بإضافة دفعات.',
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
        { error: 'بيانات الدفعة غير مكتملة.' },
        { status: 400 },
      )
    }

    const { data, error } = await supabaseAdmin
      .from('payments')
      .insert({
        student_id: body.student_id,
        academic_year_id: body.academic_year_id,
        amount: Number(amount.toFixed(3)),
        payment_method: body.payment_method ?? 'نقدي',
        payment_date: body.payment_date,
        reference_number:
          body.reference_number || null,
        notes: body.notes || null,
      })
      .select(
        'id, student_id, academic_year_id, amount, payment_method, payment_date, reference_number, notes, created_at',
      )
      .single()

    if (error) throw error

    return NextResponse.json(
      { payment: data },
      { status: 201 },
    )
  } catch (error) {
    console.error('Payments API POST error:', error)

    return NextResponse.json(
      { error: 'تعذر حفظ الدفعة.' },
      { status: 500 },
    )
  }
}