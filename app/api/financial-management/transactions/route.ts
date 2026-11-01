
import { NextResponse } from 'next/server'
import { validateDashboardSection } from '@/lib/dashboard-section-guard'

import {
  checkFinancialAcademicYear,
  loadFinancialTransaction,
  syncExistingFinancialPayments,
  deleteFinancialTransactionsByYear,
  deleteFinancialSettingsByYear,
  loadFinancialSettingsId,
  insertFinancialSettings,
  deleteFinancialSettingsById,
  loadFinancialSettings,
  loadOriginalStudentPayment,
  loadTransactionByPaymentId,
  loadFinancialStudentIdentity,
  insertStudentPaymentTransaction,
  insertManualFinancialTransaction,
  confirmFinancialTransactionAdmin,
  deleteFinancialTransactionAdmin,
} from '@/lib/features/payments/repositories/financial-management-admin.repository'

async function checkAccess() {
  return validateDashboardSection('payments')
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

    const academicYear = await checkFinancialAcademicYear(
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
     * حذف معاملات الإدارة المالية وإعداداتها للسنة فقط.
     * لا نحذف سجلات payments أو students أو enrollments.
     */
    if (action === 'reset') {
      const {
        error: transactionsDeleteError,
      } = await deleteFinancialTransactionsByYear(
        academic_year_id,
      )

      if (transactionsDeleteError) {
        throw transactionsDeleteError
      }

      const {
        error: settingsDeleteError,
      } = await deleteFinancialSettingsByYear(
        academic_year_id,
      )

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
      } = await loadFinancialSettingsId(academic_year_id)

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
      } = await insertFinancialSettings({
        academic_year_id,
        financial_mode,
        opening_balance: balance,
        opening_source: opening_source || null,
        opening_note: opening_note || null,
      })

      if (settingsError) {
        throw settingsError
      }

      if (financial_mode === 'student_payments') {
        try {
          const result = await syncExistingFinancialPayments(
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
          } = await deleteFinancialSettingsById(settings.id)

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
      } = await loadFinancialSettings(academic_year_id)

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
        } = await loadOriginalStudentPayment(
          payment_id,
          academic_year_id,
        )

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
        } = await loadTransactionByPaymentId(payment.id)

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
        } = await loadFinancialStudentIdentity(
          payment.student_id,
        )

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
        } = await insertStudentPaymentTransaction({
          academic_year_id,
          amount: Number(
            Number(payment.amount).toFixed(3),
          ),
          source: finalSource,
          payment_id: finalPaymentId,
          student_id: finalStudentId,
          course_id: finalCourseId,
          student_request_number:
            finalStudentRequestNumber,
          payment_method: finalPaymentMethod,
          reference_number: finalReferenceNumber,
          note: finalNote,
        })

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
      } = await insertManualFinancialTransaction({
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
        note: finalNote,
      })

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

      const transaction = await loadFinancialTransaction(
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
      } = await confirmFinancialTransactionAdmin(
        transactionId,
        academic_year_id,
        new Date().toISOString(),
      )

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

      const transaction = await loadFinancialTransaction(
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

      const { error: deleteError } =
        await deleteFinancialTransactionAdmin(
          transactionId,
          academic_year_id,
        )

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
