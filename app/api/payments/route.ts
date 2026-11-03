
import { NextResponse } from 'next/server'

import { validateDashboardSection } from '@/lib/dashboard-section-guard'

import {
  loadCurrentPaymentsAcademicYear,
  loadActivePaymentsAcademicYear,
  loadActivePaymentLevels,
  loadPaymentStudent,
  loadActivePaymentEnrollment,
  loadPaymentEnrollmentCourse,
  loadPaymentCourses,
  loadStudentPaymentsForYear,
  loadOtherStudentPaymentsForYear,
  loadPaymentForUpdate,
  insertStudentPayment,
  updateStudentPayment,
  loadPaymentsStudentsPage,
  loadPaymentsSummary,
  loadPaymentsEnrollmentsForStudents,
  loadPaymentsForStudents,
} from '@/lib/features/payments/repositories/payments-admin.repository'

import {
  loadTransactionByPaymentId,
  loadFinancialSettings,
  insertStudentPaymentTransaction,
  updateStudentPaymentTransaction,
} from '@/lib/features/payments/repositories/financial-management-admin.repository'

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
  } = await loadPaymentEnrollmentCourse(
    studentId,
    academicYearId,
  )

  if (enrollmentError) {
    throw enrollmentError
  }

  if (enrollment?.course_id) {
    return enrollment.course_id
  }

  const {
    data: courses,
    error: coursesError,
  } = await loadPaymentCourses(academicYearId)

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
 * - فشل المزامنة لا يلغي حفظ الدفعة.
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
    } = await loadTransactionByPaymentId(payment.id)

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
      amount: Number(Number(payment.amount).toFixed(3)),
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
      } = await updateStudentPaymentTransaction(
        existingTransaction.id,
        transactionData,
      )

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
    } = await loadFinancialSettings(
      payment.academic_year_id,
    )

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
    } = await insertStudentPaymentTransaction(
      transactionData,
    )

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

/**
 * تحميل المدفوعات:
 * - أول 50 طالبًا عند فتح الصفحة.
 * - البحث في جميع الطلاب من خلال قاعدة البيانات.
 * - تحميل تسجيلات ودفعات الطلاب الظاهرين فقط.
 * - الإحصائيات محسوبة على كامل السنة الدراسية.
 */
export async function GET(request: Request) {
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
    const { searchParams } = new URL(request.url)

    const page = Math.max(
      0,
      Number(searchParams.get('page') ?? 0) || 0,
    )

    const search = String(
      searchParams.get('search') ?? '',
    ).trim()

    const pageSize = 50

    const {
      data: currentYear,
      error: yearError,
    } = await loadCurrentPaymentsAcademicYear()

    if (yearError) {
      throw yearError
    }

    if (!currentYear) {
      return NextResponse.json({
        academicYear: null,
        students: [],
        totalStudents: 0,
        hasMore: false,
        enrollments: [],
        payments: [],
        levels: [],
        summary: {
          totalStudents: 0,
          totalExempt: 0,
          totalDue: 0,
          totalPaid: 0,
        },
      })
    }

    // تحميل الطلاب والإحصائيات والمستويات بالتوازي.
    const [
      studentsResult,
      levelsResult,
      summaryResult,
    ] = await Promise.all([
      loadPaymentsStudentsPage(
        page,
        pageSize,
        search,
      ),
      loadActivePaymentLevels(),
      loadPaymentsSummary(
        currentYear.id,
        Number(currentYear.annual_fee ?? 0),
      ),
    ])

    if (studentsResult.error) {
      throw studentsResult.error
    }

    if (levelsResult.error) {
      throw levelsResult.error
    }

    if (summaryResult.error) {
      throw summaryResult.error
    }

    const students = studentsResult.data ?? []

    const studentIds = students.map(
      (student) => student.id,
    )

    // تحميل تسجيلات ودفعات الطلاب الموجودين في هذه الدفعة فقط.
    const [
      enrollmentsResult,
      paymentsResult,
    ] = await Promise.all([
      loadPaymentsEnrollmentsForStudents(
        currentYear.id,
        studentIds,
      ),
      loadPaymentsForStudents(
        currentYear.id,
        studentIds,
      ),
    ])

    if (enrollmentsResult.error) {
      throw enrollmentsResult.error
    }

    if (paymentsResult.error) {
      throw paymentsResult.error
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

    const totalStudents = studentsResult.count ?? 0

    return NextResponse.json({
      academicYear: currentYear,
      students,
      totalStudents,
      hasMore: (page + 1) * pageSize < totalStudents,
      enrollments: enrollmentsResult.data ?? [],
      payments: paymentsResult.data ?? [],
      levels,
      summary: summaryResult.data,
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
    } = await loadActivePaymentsAcademicYear(
      body.academic_year_id,
    )

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
    } = await loadPaymentStudent(body.student_id)

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
    } = await loadActivePaymentEnrollment(
      student.id,
      currentYear.id,
    )

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
    } = await loadStudentPaymentsForYear(
      student.id,
      currentYear.id,
    )

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
    } = await insertStudentPayment({
      student_id: student.id,
      academic_year_id: currentYear.id,
      course_id: courseId,
      amount: Number(amount.toFixed(3)),
      payment_method: paymentMethod,
      payment_date: body.payment_date,
      reference_number: referenceNumber || null,
      notes: notes || null,
    })

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
    } = await loadPaymentForUpdate(paymentId)

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
    } = await loadActivePaymentsAcademicYear(
      existingPayment.academic_year_id,
    )

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
    } = await loadPaymentStudent(
      existingPayment.student_id,
    )

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
    } = await loadOtherStudentPaymentsForYear(
      existingPayment.student_id,
      currentYear.id,
      paymentId,
    )

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
    } = await updateStudentPayment(
      paymentId,
      {
        course_id: courseId,
        amount: Number(amount.toFixed(3)),
        payment_method: paymentMethod,
        payment_date: paymentDate,
        reference_number: referenceNumber || null,
        notes: notes || null,
      },
    )

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
