import { NextResponse } from 'next/server'

import { validateDashboardSection } from '@/lib/dashboard-section-guard'

import {
  loadStudentPaymentHistory,
} from '@/lib/features/payments/repositories/payments-admin.repository'

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
      await loadStudentPaymentHistory(
        studentId,
        academicYearId,
      )

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
