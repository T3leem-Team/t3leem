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

export async function GET(request: Request) {
  const access =
    await validateDashboardSection('payments')

  if (!access.allowed) {
    return NextResponse.json(
      {
        error: 'غير مصرح لك بالوصول إلى سجل المدفوعات.',
        reason: access.reason,
      },
      { status: 403 },
    )
  }

  try {
    const { searchParams } =
      new URL(request.url)

    const studentId =
      searchParams.get('studentId')

    const academicYearId =
      searchParams.get('academicYearId')

    if (!studentId || !academicYearId) {
      return NextResponse.json(
        {
          error:
            'بيانات الطالب والسنة الدراسية مطلوبة.',
        },
        { status: 400 },
      )
    }

    const { data, error } =
      await supabaseAdmin
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
        .eq('student_id', studentId)
        .eq(
          'academic_year_id',
          academicYearId,
        )
        .order('payment_date', {
          ascending: false,
        })
        .order('created_at', {
          ascending: false,
        })

    if (error) {
      throw error
    }

    return NextResponse.json(
      {
        payments: data ?? [],
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )
  } catch (error) {
    console.error(
      'Payment history API error:',
      error,
    )

    return NextResponse.json(
      {
        error:
          'تعذر تحميل سجل المدفوعات.',
      },
      { status: 500 },
    )
  }
}
