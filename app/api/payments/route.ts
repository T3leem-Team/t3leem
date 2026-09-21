import { NextResponse } from 'next/server'

import { validateDashboardSection } from '@/lib/dashboard-section-guard'
import { createClient } from '@supabase/supabase-js'

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

  const { data, error } = await supabaseAdmin
    .from('payments')
    .select(
      'id, student_id, academic_year_id, amount, payment_method, payment_date, reference_number, notes, created_at',
    )
    .order('payment_date', {
      ascending: false,
    })
    .order('created_at', {
      ascending: false,
    })

  if (error) {
    console.error('Payments API GET error:', error)

    return NextResponse.json(
      { error: 'تعذر تحميل بيانات المدفوعات.' },
      { status: 500 },
    )
  }

  return NextResponse.json({
    payments: data ?? [],
  })
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

  let body: {
    student_id?: string
    academic_year_id?: string
    amount?: number
    payment_method?: string
    payment_date?: string
    reference_number?: string | null
    notes?: string | null
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'بيانات الطلب غير صحيحة.' },
      { status: 400 },
    )
  }

  if (
    !body.student_id ||
    !body.academic_year_id ||
    !Number.isFinite(Number(body.amount)) ||
    Number(body.amount) <= 0 ||
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
      amount: Number(Number(body.amount).toFixed(3)),
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

  if (error) {
    console.error('Payments API POST error:', error)

    return NextResponse.json(
      { error: 'تعذر حفظ الدفعة.' },
      { status: 500 },
    )
  }

  return NextResponse.json(
    { payment: data },
    { status: 201 },
  )
}
