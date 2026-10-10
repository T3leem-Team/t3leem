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

const ALLOWED_PAYMENT_METHODS = [
  'نقدي',
  'تحويل',
  'بطاقة',
]

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

/**
 * الحصول على الكورس الخاص بالطالب في السنة الدراسية.
 *
 * الأولوية لتسجيل الطالب، وإذا لم يكن فيه course_id
 * نستخدم الكورس الوحيد المسجل للسنة الدراسية.
 */
async function resolveCourseId(
  studentId: string,
  academicYearId: string,
  enrollmentCourseId?: string | null,
): Promise<string | null> {
  if (enrollmentCourseId) {
    return enrollmentCourseId
  }

  const {
    data: enrollment,
    error: enrollmentError,
  } = await supabaseAdmin
    .from('enrollments')
    .select('course_id')
    .eq('student_id', studentId)
    .eq('academic_year_id', academicYearId)
    .eq('status', 'نشط')
    .maybeSingle()

  if (enrollmentError) {
    throw enrollmentError
  }

  if (enrollment?.course_id) {
    return enrollment.course_id
  }

  const {
    data: courses,
    error: coursesError,
  } = await supabaseAdmin
    .from('courses')
    .select('id')
    .eq('academic_year_id', academicYearId)
    .limit(2)

  if (coursesError) {
    throw coursesError
  }

  // لا نخمن الكورس إذا لم يوجد كورس أو وُجد أكثر من واحد.
  if (!courses || courses.length !== 1) {
    return null
  }

  return courses[0].id
}

/**
 * مزامنة الدفعة مع الإدارة المالية عند الحاجة.
 *
 * - لا يشترط وجود إعداد مالي لحفظ الدفعة.
 * - لا ينشئ معاملة مكررة إذا كانت موجودة.
 * - المعاملة الجديدة تبدأ بحالة pending.
 * - عند تحديث معاملة موجودة، لا نغيّر حالة التأكيد.
 * - نستخدم course_id المحفوظ في سجل الدفعة.
 */
async function syncPaymentToFinancialManagement(
  payment: {
    id: string
    student_id: string
    academic_year_id: string
    course_id: string | null
    amount: number
    payment_method: string
    payment_date: string
    reference_number: string | null
    notes: string | null
  },
  student: {
    id: string
    name: string
    personal_id: string | null
  },
) {
  try {
    if (!payment.course_id) {
      console.error(
        'Cannot sync payment without course_id:',
        payment.id,
      )
      return
    }

    // نبحث أولاً عن معاملة مرتبطة بالدفعة نفسها.
    const {
      data: existingTransaction,
      error: transactionLookupError,
    } = await supabaseAdmin
      .from('financial_transactions')
      .select('id')
      .eq('payment_id', payment.id)
      .maybeSingle()

    if (transactionLookupError) {
      // لا ننشئ معاملة جديدة إذا تعذر التأكد من وجود معاملة سابقة.
      console.error(
        'Financial transaction lookup error:',
        transactionLookupError,
      )
      return
    }

    const transactionData = {
      academic_year_id: payment.academic_year_id,
      transaction_type: 'in',
      amount: Number(Number(payment.amount).toFixed(3)),
      adjustment_direction: null,
      source_type: 'student_payment',
      source: `دفعة طالب - ${student.name}`,
      payment_id: payment.id,
      student_id: student.id,
      course_id: payment.course_id,
      student_request_number: student.personal_id || null,
      payment_method: payment.payment_method,
      reference_number: payment.reference_number,
      note: payment.notes,
    }

    if (existingTransaction) {
      // تحديث المعاملة نفسها مع الحفاظ على حالة التأكيد
      // وحقول confirmed_by وconfirmed_at.
      const {
        error: updateError,
      } = await supabaseAdmin
        .from('financial_transactions')
        .update(transactionData)
        .eq('id', existingTransaction.id)

      if (updateError) {
        console.error(
          'Financial transaction update error:',
          updateError,
        )
      }

      return
    }

    // إذا لم توجد معاملة مرتبطة، نتحقق من إعداد الإدارة المالية.
    const {
      data: financialSettings,
      error: settingsError,
    } = await supabaseAdmin
      .from('financial_settings')
      .select('financial_mode')
      .eq('academic_year_id', payment.academic_year_id)
      .maybeSingle()

    if (settingsError) {
      console.error(
        'Financial settings lookup error:',
        settingsError,
      )
      return
    }

    // عدم تهيئة الإدارة المالية أو اختيار الوضع اليدوي
    // لا يمنع حفظ الدفعة في جدول payments.
    if (
      financialSettings?.financial_mode !==
      'student_payments'
    ) {
      return
    }

    const {
      error: insertError,
    } = await supabaseAdmin
      .from('financial_transactions')
      .insert({
        ...transactionData,
        confirmation_status: 'pending',
        confirmed_by: null,
        confirmed_at: null,
      })

    if (insertError) {
      // قد يمنع الفهرس الفريد تكرار المعاملة.
      // لا نلغي الدفعة الأساسية بسبب خطأ المزامنة.
      console.error(
        'Financial transaction creation error:',
        insertError,
      )
    }
  } catch (error) {
    // الإدارة المالية مستقلة عن تسجيل الدفعة.
    console.error(
      'Payment financial synchronization error:',
      error,
    )
  }
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
    const {
      data: currentYear,
      error: yearError,
    } = await supabaseAdmin
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
        .select('student_id, level_id, course_id')
        .eq('academic_year_id', currentYear.id)
        .eq('status', 'نشط'),

      supabaseAdmin
        .from('payments')
        .select(
          `
          id,
          student_id,
          academic_year_id,
          course_id,
          amount,
          payment_method,
          payment_date,
          reference_number,
          notes,
          created_at
          `,
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
        .select('id, name, sort_order')
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

    const levels = (levelsResult.data ?? [])
      .map((level) => ({
        id: level.id,
        name: level.name,
        sort_order:
          level.sort_order == null
            ? null
            : Number(level.sort_order),
      }))
      .sort((a, b) => {
        const aOrder =
          a.sort_order ?? Number.MAX_SAFE_INTEGER

        const bOrder =
          b.sort_order ?? Number.MAX_SAFE_INTEGER

        if (aOrder !== bOrder) {
          return aOrder - bOrder
        }

        return String(a.name ?? '').localeCompare(
          String(b.name ?? ''),
          'ar',
        )
      })

    return NextResponse.json({
      academicYear: currentYear,
      students: studentsResult.data ?? [],
      enrollments: enrollmentsResult.data ?? [],
      payments: paymentsResult.data ?? [],
      levels,
    })
  } catch (error) {
    console.error('Payments API GET error:', error)

    return NextResponse.json(
      {
        error: 'تعذر تحميل بيانات المدفوعات.',
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  const access = await checkPaymentWriteAccess()

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
        {
          error: 'بيانات الدفعة غير مكتملة.',
        },
        { status: 400 },
      )
    }

    const paymentMethod =
      body.payment_method ?? 'نقدي'

    if (
      !ALLOWED_PAYMENT_METHODS.includes(
        paymentMethod,
      )
    ) {
      return NextResponse.json(
        {
          error: 'طريقة الدفع غير صحيحة.',
        },
        { status: 400 },
      )
    }

    const {
      data: currentYear,
      error: yearError,
    } = await supabaseAdmin
      .from('academic_years')
      .select('id, name, annual_fee')
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
          error: 'السنة الدراسية غير صحيحة أو غير نشطة.',
        },
        { status: 400 },
      )
    }

    const {
      data: student,
      error: studentError,
    } = await supabaseAdmin
      .from('students')
      .select('id, name, personal_id, fee_exempt')
      .eq('id', body.student_id)
      .maybeSingle()

    if (studentError) {
      throw studentError
    }

    if (!student) {
      return NextResponse.json(
        {
          error: 'الطالب غير موجود.',
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
    } = await supabaseAdmin
      .from('enrollments')
      .select('id, course_id')
      .eq('student_id', body.student_id)
      .eq('academic_year_id', currentYear.id)
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

    const courseId = await resolveCourseId(
      student.id,
      currentYear.id,
      enrollment.course_id,
    )

    if (!courseId) {
      return NextResponse.json(
        {
          error:
            'تعذر تحديد الكورس الخاص بالسنة الدراسية. لم تُحفظ الدفعة.',
        },
        { status: 400 },
      )
    }

    const {
      data: existingPayments,
      error: paymentsError,
    } = await supabaseAdmin
      .from('payments')
      .select('amount')
      .eq('student_id', student.id)
      .eq('academic_year_id', currentYear.id)

    if (paymentsError) {
      throw paymentsError
    }

    const totalPaid = (existingPayments ?? []).reduce(
      (total, payment) =>
        total + Number(payment.amount ?? 0),
      0,
    )

    const annualFee = Number(
      currentYear.annual_fee ?? 0,
    )

    const remaining = Math.max(
      annualFee - totalPaid,
      0,
    )

    if (annualFee > 0 && amount > remaining) {
      return NextResponse.json(
        {
          error:
            'مبلغ الدفعة أكبر من المبلغ المتبقي.',
          remaining,
        },
        { status: 400 },
      )
    }

    const referenceNumber = String(
      body.reference_number ?? '',
    ).trim()

    const notes = String(
      body.notes ?? '',
    ).trim()

    const {
      data: payment,
      error: insertError,
    } = await supabaseAdmin
      .from('payments')
      .insert({
        student_id: student.id,
        academic_year_id: currentYear.id,
        course_id: courseId,
        amount: Number(amount.toFixed(3)),
        payment_method: paymentMethod,
        payment_date: body.payment_date,
        reference_number: referenceNumber || null,
        notes: notes || null,
      })
      .select(
        `
        id,
        student_id,
        academic_year_id,
        course_id,
        amount,
        payment_method,
        payment_date,
        reference_number,
        notes,
        created_at
        `,
      )
      .single()

    if (insertError) {
      throw insertError
    }

    // المزامنة لا تتحكم في نجاح تسجيل الدفعة.
    await syncPaymentToFinancialManagement(
      payment,
      student,
    )

    return NextResponse.json(
      {
        payment,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Payments API POST error:', error)

    return NextResponse.json(
      {
        error: 'تعذر حفظ الدفعة.',
      },
      { status: 500 },
    )
  }
}

/**
 * تعديل دفعة موجودة.
 *
 * نحدّث سجل الدفعة نفسه، ونحتفظ بالسنة والكورس
 * المرتبطين بها. لا نغيّر حالة التأكيد المالي.
 */
export async function PATCH(request: Request) {
  const access = await checkPaymentWriteAccess()

  if (!access.allowed) {
    return NextResponse.json(
      {
        error: 'غير مصرح لك بتعديل الدفعات.',
        reason: access.reason,
      },
      { status: 403 },
    )
  }

  try {
    const body = await request.json()

    const paymentId = String(
      body.payment_id ?? '',
    ).trim()

    const amount = Number(body.amount)

    const paymentDate = String(
      body.payment_date ?? '',
    ).trim()

    const paymentMethod =
      body.payment_method ?? 'نقدي'

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

    if (
      !ALLOWED_PAYMENT_METHODS.includes(
        paymentMethod,
      )
    ) {
      return NextResponse.json(
        {
          error: 'طريقة الدفع غير صحيحة.',
        },
        { status: 400 },
      )
    }

    const {
      data: existingPayment,
      error: existingPaymentError,
    } = await supabaseAdmin
      .from('payments')
      .select(
        `
        id,
        student_id,
        academic_year_id,
        course_id,
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
          error: 'الدفعة غير موجودة.',
        },
        { status: 404 },
      )
    }

    const {
      data: currentYear,
      error: yearError,
    } = await supabaseAdmin
      .from('academic_years')
      .select('id, name, annual_fee')
      .eq('id', existingPayment.academic_year_id)
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

    const {
      data: student,
      error: studentError,
    } = await supabaseAdmin
      .from('students')
      .select('id, name, personal_id, fee_exempt')
      .eq('id', existingPayment.student_id)
      .maybeSingle()

    if (studentError) {
      throw studentError
    }

    if (!student) {
      return NextResponse.json(
        {
          error: 'الطالب غير موجود.',
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

    const {
      data: otherPayments,
      error: otherPaymentsError,
    } = await supabaseAdmin
      .from('payments')
      .select('amount')
      .eq('student_id', existingPayment.student_id)
      .eq('academic_year_id', currentYear.id)
      .neq('id', paymentId)

    if (otherPaymentsError) {
      throw otherPaymentsError
    }

    const otherPaid = (otherPayments ?? []).reduce(
      (total, payment) =>
        total + Number(payment.amount ?? 0),
      0,
    )

    const annualFee = Number(
      currentYear.annual_fee ?? 0,
    )

    const newTotalPaid = otherPaid + amount

    if (
      annualFee > 0 &&
      newTotalPaid > annualFee
    ) {
      const allowedAmount = Math.max(
        annualFee - otherPaid,
        0,
      )

      return NextResponse.json(
        {
          error:
            'المبلغ الجديد يجعل إجمالي المدفوع أكبر من الرسوم السنوية.',
          maxAmount: allowedAmount,
        },
        { status: 400 },
      )
    }

    // نحافظ على الكورس الأصلي للدفعة.
    // وإذا كان فارغًا لأي سبب، نحاول تحديده قبل التحديث.
    const courseId =
      existingPayment.course_id ||
      (await resolveCourseId(
        student.id,
        existingPayment.academic_year_id,
      ))

    if (!courseId) {
      return NextResponse.json(
        {
          error:
            'تعذر تحديد الكورس الخاص بالدفعة.',
        },
        { status: 400 },
      )
    }

    const referenceNumber = String(
      body.reference_number ?? '',
    ).trim()

    const notes = String(
      body.notes ?? '',
    ).trim()

    const {
      data: updatedPayment,
      error: updateError,
    } = await supabaseAdmin
      .from('payments')
      .update({
        course_id: courseId,
        amount: Number(amount.toFixed(3)),
        payment_method: paymentMethod,
        payment_date: paymentDate,
        reference_number: referenceNumber || null,
        notes: notes || null,
      })
      .eq('id', paymentId)
      .select(
        `
        id,
        student_id,
        academic_year_id,
        course_id,
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

    // إذا كانت المعاملة المالية موجودة، نحدّثها.
    // وإذا لم تكن موجودة وكان الوضع student_payments،
    // فالمزامنة تنشئها مرة واحدة بحالة pending.
    await syncPaymentToFinancialManagement(
      updatedPayment,
      student,
    )

    return NextResponse.json(
      {
        payment: updatedPayment,
        totalPaid: Number(newTotalPaid.toFixed(3)),
        remaining: Math.max(
          annualFee - newTotalPaid,
          0,
        ),
      },
      { status: 200 },
    )
  } catch (error) {
    console.error('Payments API PATCH error:', error)

    return NextResponse.json(
      {
        error: 'تعذر تعديل الدفعة.',
      },
      { status: 500 },
    )
  }
}