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

async function checkAcademicYear(academicYearId: string) {
  const { data, error } = await supabaseAdmin
    .from('academic_years')
    .select('id, name, is_current, is_active')
    .eq('id', academicYearId)
    .maybeSingle()

  if (error) throw error

  return data
}

async function getTransaction(
  transactionId: string,
  academicYearId: string,
) {
  const { data, error } = await supabaseAdmin
    .from('financial_transactions')
    .select('*')
    .eq('id', transactionId)
    .eq('academic_year_id', academicYearId)
    .maybeSingle()

  if (error) throw error

  return data
}

/**
 * مزامنة الدفعات المسجلة مسبقًا.
 *
 * تستخدم بيانات payments نفسها، بما فيها course_id،
 * ولا تنشئ معاملة ثانية للدفعة المرتبطة مسبقًا.
 */
async function syncExistingPayments(
  academicYearId: string,
) {
  const {
    data: payments,
    error: paymentsError,
  } = await supabaseAdmin
    .from('payments')
    .select(`
      id,
      student_id,
      academic_year_id,
      course_id,
      amount,
      payment_method,
      payment_date,
      reference_number,
      notes
    `)
    .eq('academic_year_id', academicYearId)

  if (paymentsError) throw paymentsError

  if (!payments?.length) {
    return { synced: 0 }
  }

  // لا نبدأ المزامنة إذا كانت أي دفعة تفتقد الكورس.
  const paymentsWithoutCourse = payments.filter(
    (payment) => !payment.course_id,
  )

  if (paymentsWithoutCourse.length > 0) {
    throw new Error(
      `توجد ${paymentsWithoutCourse.length} دفعة بدون course_id. تعذرت المزامنة.`,
    )
  }

  const paymentIds = payments.map(
    (payment) => payment.id,
  )

  const {
    data: existingTransactions,
    error: existingTransactionsError,
  } = await supabaseAdmin
    .from('financial_transactions')
    .select('payment_id')
    .in('payment_id', paymentIds)

  if (existingTransactionsError) {
    throw existingTransactionsError
  }

  const existingPaymentIds = new Set(
    (existingTransactions ?? [])
      .map((transaction) => transaction.payment_id)
      .filter(Boolean),
  )

  const paymentsToSync = payments.filter(
    (payment) => !existingPaymentIds.has(payment.id),
  )

  if (!paymentsToSync.length) {
    return { synced: 0 }
  }

  const studentIds = Array.from(
    new Set(
      paymentsToSync
        .map((payment) => payment.student_id)
        .filter(Boolean),
    ),
  )

  const studentsMap = new Map<
    string,
    {
      name: string | null
      personal_id: string | null
    }
  >()

  if (studentIds.length > 0) {
    const {
      data: students,
      error: studentsError,
    } = await supabaseAdmin
      .from('students')
      .select('id, name, personal_id')
      .in('id', studentIds)

    if (studentsError) throw studentsError

    for (const student of students ?? []) {
      studentsMap.set(student.id, {
        name: student.name ?? null,
        personal_id: student.personal_id ?? null,
      })
    }
  }

  const financialRows = paymentsToSync.map((payment) => {
    const student = studentsMap.get(payment.student_id)

    return {
      academic_year_id: payment.academic_year_id,
      transaction_type: 'in',
      amount: Number(Number(payment.amount).toFixed(3)),
      adjustment_direction: null,
      source_type: 'student_payment',
      source: student?.name
        ? `دفعة طالب - ${student.name}`
        : 'دفعة طالب',
      payment_id: payment.id,
      student_id: payment.student_id,
      course_id: payment.course_id,
      student_request_number: student?.personal_id ?? null,
      payment_method: payment.payment_method ?? null,
      reference_number: payment.reference_number ?? null,
      confirmation_status: 'pending',
      confirmed_by: null,
      confirmed_at: null,
      note: payment.notes ?? null,
    }
  })

  const { error: insertError } = await supabaseAdmin
    .from('financial_transactions')
    .insert(financialRows)

  if (insertError) throw insertError

  return { synced: financialRows.length }
}

/**
 * الإدارة المالية
 */
export async function POST(request: Request) {
  try {
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

    if (!academic_year_id) {
      return NextResponse.json(
        { error: 'السنة الدراسية مطلوبة' },
        { status: 400 },
      )
    }

    const academicYear = await checkAcademicYear(
      academic_year_id,
    )

    if (!academicYear) {
      return NextResponse.json(
        { error: 'السنة الدراسية غير موجودة' },
        { status: 404 },
      )
    }

    /*
     * RESET
     *
     * نحافظ على السلوك الحالي:
     * حذف معاملات الإدارة المالية وإعداداتها للسنة فقط.
     * لا نحذف سجلات payments أو students أو enrollments.
     */
    if (action === 'reset') {
      const {
        error: transactionsDeleteError,
      } = await supabaseAdmin
        .from('financial_transactions')
        .delete()
        .eq('academic_year_id', academic_year_id)

      if (transactionsDeleteError) {
        throw transactionsDeleteError
      }

      const {
        error: settingsDeleteError,
      } = await supabaseAdmin
        .from('financial_settings')
        .delete()
        .eq('academic_year_id', academic_year_id)

      if (settingsDeleteError) {
        throw settingsDeleteError
      }

      return NextResponse.json({
        success: true,
        message:
          'تم مسح إعداد الإدارة المالية وعملياتها لهذه السنة فقط.',
      })
    }

    /*
     * INITIALIZE
     */
    if (action === 'initialize') {
      if (
        financial_mode !== 'student_payments' &&
        financial_mode !== 'manual'
      ) {
        return NextResponse.json(
          { error: 'نوع النظام المالي غير صحيح' },
          { status: 400 },
        )
      }

      const balance = Number(opening_balance ?? 0)

      if (!Number.isFinite(balance) || balance < 0) {
        return NextResponse.json(
          { error: 'الرصيد الافتتاحي غير صحيح' },
          { status: 400 },
        )
      }

      const {
        data: existing,
        error: existingSettingsError,
      } = await supabaseAdmin
        .from('financial_settings')
        .select('id')
        .eq('academic_year_id', academic_year_id)
        .maybeSingle()

      if (existingSettingsError) {
        throw existingSettingsError
      }

      if (existing) {
        return NextResponse.json(
          {
            error:
              'تم إعداد النظام المالي لهذه السنة مسبقًا',
          },
          { status: 409 },
        )
      }

      const {
        data: settings,
        error: settingsError,
      } = await supabaseAdmin
        .from('financial_settings')
        .insert({
          academic_year_id,
          financial_mode,
          opening_balance: balance,
          opening_source: opening_source || null,
          opening_note: opening_note || null,
        })
        .select()
        .single()

      if (settingsError) {
        throw settingsError
      }

      if (financial_mode === 'student_payments') {
        try {
          const result = await syncExistingPayments(
            academic_year_id,
          )

          return NextResponse.json({
            success: true,
            settings,
            synced_payments: result.synced,
          })
        } catch (syncError) {
          /*
           * إذا فشلت المزامنة، نحاول حذف الإعداد الذي
           * أُنشئ في هذه المحاولة حتى لا نترك تهيئة ناقصة.
           *
           * لا نحذف أي دفعات من payments.
           */
          const {
            error: rollbackError,
          } = await supabaseAdmin
            .from('financial_settings')
            .delete()
            .eq('id', settings.id)

          if (rollbackError) {
            console.error(
              'Financial settings rollback error:',
              rollbackError,
            )
          }

          throw syncError
        }
      }

      return NextResponse.json({
        success: true,
        settings,
        synced_payments: 0,
      })
    }

    /*
     * CREATE
     */
    if (action === 'create') {
      if (
        transaction_type !== 'in' &&
        transaction_type !== 'out' &&
        transaction_type !== 'adjustment'
      ) {
        return NextResponse.json(
          { error: 'نوع العملية غير صحيح' },
          { status: 400 },
        )
      }

      const numericAmount = Number(amount)

      if (
        !Number.isFinite(numericAmount) ||
        numericAmount <= 0
      ) {
        return NextResponse.json(
          { error: 'المبلغ يجب أن يكون أكبر من صفر' },
          { status: 400 },
        )
      }

      if (
        transaction_type === 'adjustment' &&
        adjustment_direction !== 'plus' &&
        adjustment_direction !== 'minus'
      ) {
        return NextResponse.json(
          { error: 'اتجاه التسوية مطلوب' },
          { status: 400 },
        )
      }

      const {
        data: settings,
        error: settingsError,
      } = await supabaseAdmin
        .from('financial_settings')
        .select('*')
        .eq('academic_year_id', academic_year_id)
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

      let finalSourceType = source_type

      if (!finalSourceType) {
        finalSourceType =
          transaction_type === 'adjustment'
            ? 'adjustment'
            : 'manual'
      }

      let finalPaymentId: string | null = null
      let finalStudentId: string | null = student_id || null
      let finalCourseId: string | null = null
      let finalStudentRequestNumber:
        | string
        | null = student_request_number || null
      let finalPaymentMethod: string | null =
        payment_method || null
      let finalReferenceNumber: string | null =
        reference_number || null
      let finalNote: string | null = note || null
      let finalSource: string | null = source || null

      /*
       * إذا كانت العملية دفعة طالب، نعتمد بيانات
       * سجل payments نفسه ولا نثق بمبالغ أو تفاصيل
       * مرسلة من الواجهة.
       */
      if (finalSourceType === 'student_payment') {
        if (settings.financial_mode !== 'student_payments') {
          return NextResponse.json(
            {
              error:
                'النظام المالي الحالي هو الإدخال اليدوي',
            },
            { status: 400 },
          )
        }

        if (transaction_type !== 'in') {
          return NextResponse.json(
            {
              error: 'دفعات الطلاب يجب أن تكون إيرادًا',
            },
            { status: 400 },
          )
        }

        if (!payment_id) {
          return NextResponse.json(
            {
              error:
                'يجب تحديد سجل الدفعة الأصلي',
            },
            { status: 400 },
          )
        }

        const {
          data: payment,
          error: paymentError,
        } = await supabaseAdmin
          .from('payments')
          .select(`
            id,
            student_id,
            academic_year_id,
            course_id,
            amount,
            payment_method,
            reference_number,
            notes
          `)
          .eq('id', payment_id)
          .eq('academic_year_id', academic_year_id)
          .maybeSingle()

        if (paymentError) {
          throw paymentError
        }

        if (!payment) {
          return NextResponse.json(
            {
              error:
                'الدفعة غير موجودة أو لا تتبع السنة الدراسية المحددة',
            },
            { status: 404 },
          )
        }

        if (!payment.course_id) {
          return NextResponse.json(
            {
              error:
                'الدفعة لا تحتوي على كورس مرتبط بها',
            },
            { status: 400 },
          )
        }

        const {
          data: duplicate,
          error: duplicateError,
        } = await supabaseAdmin
          .from('financial_transactions')
          .select('id')
          .eq('payment_id', payment.id)
          .maybeSingle()

        if (duplicateError) {
          throw duplicateError
        }

        if (duplicate) {
          return NextResponse.json(
            {
              error:
                'هذه الدفعة مرتبطة بالفعل بالإدارة المالية',
            },
            { status: 409 },
          )
        }

        finalPaymentId = payment.id
        finalStudentId = payment.student_id
        finalCourseId = payment.course_id
        finalPaymentMethod = payment.payment_method || null
        finalReferenceNumber = payment.reference_number || null
        finalNote = payment.notes || null

        const {
          data: student,
          error: studentError,
        } = await supabaseAdmin
          .from('students')
          .select('name, personal_id')
          .eq('id', payment.student_id)
          .maybeSingle()

        if (studentError) {
          throw studentError
        }

        finalStudentRequestNumber =
          student?.personal_id || null

        finalSource = student?.name
          ? `دفعة طالب - ${student.name}`
          : 'دفعة طالب'

        // المبلغ الصحيح مصدره سجل الدفعة الأصلي.
        // لا نستخدم مبلغ الطلب لإنشاء نسخة مالية مختلفة.
        const {
          data: transaction,
          error: insertError,
        } = await supabaseAdmin
          .from('financial_transactions')
          .insert({
            academic_year_id,
            transaction_type: 'in',
            amount: Number(
              Number(payment.amount).toFixed(3),
            ),
            adjustment_direction: null,
            source_type: 'student_payment',
            source: finalSource,
            payment_id: finalPaymentId,
            student_id: finalStudentId,
            course_id: finalCourseId,
            student_request_number:
              finalStudentRequestNumber,
            payment_method: finalPaymentMethod,
            reference_number: finalReferenceNumber,
            confirmation_status: 'pending',
            confirmed_by: null,
            confirmed_at: null,
            note: finalNote,
          })
          .select()
          .single()

        if (insertError) {
          // يتولى الفهرس الفريد منع التكرار أيضًا.
          if (insertError.code === '23505') {
            return NextResponse.json(
              {
                error:
                  'هذه الدفعة مرتبطة بالفعل بالإدارة المالية',
              },
              { status: 409 },
            )
          }

          throw insertError
        }

        return NextResponse.json({
          success: true,
          transaction,
        })
      }

      /*
       * المعاملات اليدوية والتسويات.
       * نحافظ على منطق الصادر والوارد الحالي.
       */
      const confirmationStatus =
        finalSourceType === 'student_payment'
          ? 'pending'
          : 'not_required'

      const {
        data: transaction,
        error: insertError,
      } = await supabaseAdmin
        .from('financial_transactions')
        .insert({
          academic_year_id,
          transaction_type,
          amount: Number(numericAmount.toFixed(3)),
          adjustment_direction:
            transaction_type === 'adjustment'
              ? adjustment_direction
              : null,
          source_type: finalSourceType,
          source: finalSource,
          payment_id: finalPaymentId,
          student_id: finalStudentId,
          course_id: finalCourseId,
          student_request_number:
            finalStudentRequestNumber,
          payment_method: finalPaymentMethod,
          reference_number: finalReferenceNumber,
          confirmation_status: confirmationStatus,
          confirmed_by: null,
          confirmed_at: null,
          note: finalNote,
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      return NextResponse.json({
        success: true,
        transaction,
      })
    }

    /*
     * CONFIRM
     */
    if (action === 'confirm') {
      const transactionId = body.transaction_id

      if (!transactionId) {
        return NextResponse.json(
          { error: 'معرف العملية مطلوب' },
          { status: 400 },
        )
      }

      const transaction = await getTransaction(
        transactionId,
        academic_year_id,
      )

      if (!transaction) {
        return NextResponse.json(
          { error: 'العملية غير موجودة' },
          { status: 404 },
        )
      }

      if (transaction.source_type !== 'student_payment') {
        return NextResponse.json(
          {
            error: 'هذه العملية لا تحتاج إلى تأكيد',
          },
          { status: 400 },
        )
      }

      if (transaction.confirmation_status === 'confirmed') {
        return NextResponse.json(
          {
            error: 'تم تأكيد العملية مسبقًا',
          },
          { status: 400 },
        )
      }

      const {
        data: updated,
        error: updateError,
      } = await supabaseAdmin
        .from('financial_transactions')
        .update({
          confirmation_status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', transactionId)
        .eq('academic_year_id', academic_year_id)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }

      return NextResponse.json({
        success: true,
        transaction: updated,
      })
    }

    /*
     * DELETE
     *
     * حذف المعاملة المالية فقط؛ لا نحذف payment الأصلي.
     */
    if (action === 'delete') {
      const transactionId = body.transaction_id

      if (!transactionId) {
        return NextResponse.json(
          { error: 'معرف العملية مطلوب' },
          { status: 400 },
        )
      }

      const transaction = await getTransaction(
        transactionId,
        academic_year_id,
      )

      if (!transaction) {
        return NextResponse.json(
          { error: 'العملية غير موجودة' },
          { status: 404 },
        )
      }

      if (transaction.source_type === 'opening') {
        return NextResponse.json(
          {
            error:
              'لا يمكن حذف الرصيد الافتتاحي من سجل العمليات',
          },
          { status: 400 },
        )
      }

      const { error: deleteError } = await supabaseAdmin
        .from('financial_transactions')
        .delete()
        .eq('id', transactionId)
        .eq('academic_year_id', academic_year_id)

      if (deleteError) {
        throw deleteError
      }

      return NextResponse.json({
        success: true,
        deleted_id: transaction.id,
      })
    }

    return NextResponse.json(
      { error: 'الإجراء غير معروف' },
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