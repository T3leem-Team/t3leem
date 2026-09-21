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

async function checkAcademicYear(
  academicYearId: string,
) {
  const { data, error } = await supabaseAdmin
    .from('academic_years')
    .select(
      'id, name, is_current, is_active',
    )
    .eq('id', academicYearId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

async function getTransaction(
  transactionId: string,
  academicYearId: string,
) {
  const { data, error } =
    await supabaseAdmin
      .from('financial_transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('academic_year_id', academicYearId)
      .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

/**
 * الإدارة المالية
 */
export async function POST(request: Request) {
  try {
    /*
     * --------------------------------------------------
     * الصلاحية
     * --------------------------------------------------
     */

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

    /*
     * --------------------------------------------------
     * السنة الدراسية مطلوبة
     * --------------------------------------------------
     */

    if (!academic_year_id) {
      return NextResponse.json(
        {
          error:
            'السنة الدراسية مطلوبة',
        },
        { status: 400 },
      )
    }

    /*
     * --------------------------------------------------
     * التأكد من السنة
     * --------------------------------------------------
     */

    const academicYear =
      await checkAcademicYear(
        academic_year_id,
      )

    if (!academicYear) {
      return NextResponse.json(
        {
          error:
            'السنة الدراسية غير موجودة',
        },
        { status: 404 },
      )
    }

    /*
     * ==================================================
     * RESET
     * مسح إعداد الإدارة المالية لهذه السنة فقط
     *
     * مهم:
     * لا نحذف payments
     * لا نحذف students
     * لا نحذف enrollments
     * لا نحذف registration_requests
     * ==================================================
     */

    if (action === 'reset') {
      /*
       * حذف العمليات المالية لهذه السنة فقط.
       */

      const {
        error: transactionsDeleteError,
      } = await supabaseAdmin
        .from('financial_transactions')
        .delete()
        .eq(
          'academic_year_id',
          academic_year_id,
        )

      if (transactionsDeleteError) {
        throw transactionsDeleteError
      }

      /*
       * حذف إعداد الإدارة المالية لهذه السنة فقط.
       */

      const {
        error: settingsDeleteError,
      } = await supabaseAdmin
        .from('financial_settings')
        .delete()
        .eq(
          'academic_year_id',
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
     * ==================================================
     * INITIALIZE
     * تهيئة الإدارة المالية
     * ==================================================
     */

    if (action === 'initialize') {
      if (
        financial_mode !==
          'student_payments' &&
        financial_mode !== 'manual'
      ) {
        return NextResponse.json(
          {
            error:
              'نوع النظام المالي غير صحيح',
          },
          { status: 400 },
        )
      }

      const balance =
        Number(opening_balance ?? 0)

      if (
        !Number.isFinite(balance) ||
        balance < 0
      ) {
        return NextResponse.json(
          {
            error:
              'الرصيد الافتتاحي غير صحيح',
          },
          { status: 400 },
        )
      }

      /*
       * منع إعادة تهيئة نفس السنة.
       */

      const { data: existing } =
        await supabaseAdmin
          .from('financial_settings')
          .select('id')
          .eq(
            'academic_year_id',
            academic_year_id,
          )
          .maybeSingle()

      if (existing) {
        return NextResponse.json(
          {
            error:
              'تم إعداد النظام المالي لهذه السنة مسبقًا',
          },
          { status: 409 },
        )
      }

      /*
       * إنشاء إعداد الإدارة المالية.
       *
       * الرصيد الافتتاحي محفوظ في
       * financial_settings فقط.
       */

      const {
        data: settings,
        error,
      } = await supabaseAdmin
        .from('financial_settings')
        .insert({
          academic_year_id,
          financial_mode,
          opening_balance: balance,
          opening_source:
            opening_source || null,
          opening_note:
            opening_note || null,
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      /*
       * --------------------------------------------------
       * إذا كان النظام مرتبطًا بمدفوعات الطلاب
       *
       * نبحث عن جميع دفعات الطلاب الموجودة مسبقًا
       * في payments لهذه السنة.
       *
       * لا نكرر أي دفعة موجودة مسبقًا في
       * financial_transactions.
       * --------------------------------------------------
       */

      if (
        financial_mode ===
        'student_payments'
      ) {
        const {
          data: existingPayments,
          error: existingPaymentsError,
        } = await supabaseAdmin
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
            notes
            `,
          )
          .eq(
            'academic_year_id',
            academic_year_id,
          )

        if (existingPaymentsError) {
          /*
           * إذا فشلت المزامنة، نحذف الإعداد
           * حتى لا نترك النظام في حالة تهيئة
           * ناقصة.
           */

          await supabaseAdmin
            .from('financial_settings')
            .delete()
            .eq(
              'id',
              settings.id,
            )

          throw existingPaymentsError
        }

        if (
          existingPayments &&
          existingPayments.length > 0
        ) {
          /*
           * جلب العمليات المالية المرتبطة
           * بدفعات الطلاب الموجودة مسبقًا.
           */

          const {
            data: existingFinancialTransactions,
            error:
              existingFinancialTransactionsError,
          } = await supabaseAdmin
            .from('financial_transactions')
            .select('payment_id')
            .eq(
              'academic_year_id',
              academic_year_id,
            )
            .eq(
              'source_type',
              'student_payment',
            )
            .not(
              'payment_id',
              'is',
              null,
            )

          if (
            existingFinancialTransactionsError
          ) {
            await supabaseAdmin
              .from(
                'financial_settings',
              )
              .delete()
              .eq(
                'id',
                settings.id,
              )

            throw existingFinancialTransactionsError
          }

          const existingPaymentIds =
            new Set(
              (
                existingFinancialTransactions ??
                []
              )
                .map(
                  (item) =>
                    item.payment_id,
                )
                .filter(Boolean),
            )

          const paymentsToSync =
            existingPayments.filter(
              (payment) =>
                !existingPaymentIds.has(
                  payment.id,
                ),
            )

          if (
            paymentsToSync.length > 0
          ) {
            /*
             * نحتاج أسماء الطلاب للعمليات
             * حتى تظهر التفاصيل بشكل صحيح.
             */

            const studentIds =
              Array.from(
                new Set(
                  paymentsToSync
                    .map(
                      (payment) =>
                        payment.student_id,
                    )
                    .filter(Boolean),
                ),
              )

            let studentsMap =
              new Map<
                string,
                {
                  name: string | null
                  personal_id: string | null
                }
              >()

            if (
              studentIds.length > 0
            ) {
              const {
                data: students,
                error:
                  studentsError,
              } = await supabaseAdmin
                .from('students')
                .select(
                  'id, name, personal_id',
                )
                .in(
                  'id',
                  studentIds,
                )

              if (studentsError) {
                await supabaseAdmin
                  .from(
                    'financial_settings',
                  )
                  .delete()
                  .eq(
                    'id',
                    settings.id,
                  )

                throw studentsError
              }

              studentsMap =
                new Map(
                  (
                    students ??
                    []
                  ).map(
                    (student) => [
                      student.id,
                      {
                        name:
                          student.name ??
                          null,
                        personal_id:
                          student.personal_id ??
                          null,
                      },
                    ],
                  ),
                )
            }

            const financialRows =
              paymentsToSync.map(
                (payment) => {
                  const student =
                    studentsMap.get(
                      payment.student_id,
                    )

                  return {
                    academic_year_id:
                      academic_year_id,

                    transaction_type:
                      'in',

                    amount:
                      Number(
                        Number(
                          payment.amount,
                        ).toFixed(3),
                      ),

                    adjustment_direction:
                      null,

                    source_type:
                      'student_payment',

                    source:
                      student?.name
                        ? `دفعة طالب - ${student.name}`
                        : 'دفعة طالب',

                    payment_id:
                      payment.id,

                    student_id:
                      payment.student_id,

                    student_request_number:
                      student?.personal_id ??
                      null,

                    payment_method:
                      payment.payment_method ??
                      null,

                    reference_number:
                      payment.reference_number ??
                      null,

                    confirmation_status:
                      'pending',

                    confirmed_by:
                      null,

                    confirmed_at:
                      null,

                    note:
                      payment.notes ??
                      null,

                    /*
                     * لا نستخدم payment_date
                     * كـ created_at حتى لا نغير
                     * تاريخ إنشاء العملية.
                     *
                     * payment_date محفوظ في
                     * payments ويمكن ربطه لاحقًا.
                     */
                  }
                },
              )

            const {
              error:
                syncError,
            } = await supabaseAdmin
              .from(
                'financial_transactions',
              )
              .insert(
                financialRows,
              )

            if (syncError) {
              await supabaseAdmin
                .from(
                  'financial_settings',
                )
                .delete()
                .eq(
                  'id',
                  settings.id,
                )

              throw syncError
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        settings,
      })
    }

    /*
     * ==================================================
     * CREATE
     * إضافة عملية مالية
     * ==================================================
     */

    if (action === 'create') {
      if (
        transaction_type !== 'in' &&
        transaction_type !== 'out' &&
        transaction_type !==
          'adjustment'
      ) {
        return NextResponse.json(
          {
            error:
              'نوع العملية غير صحيح',
          },
          { status: 400 },
        )
      }

      const numericAmount =
        Number(amount)

      if (
        !Number.isFinite(
          numericAmount,
        ) ||
        numericAmount <= 0
      ) {
        return NextResponse.json(
          {
            error:
              'المبلغ يجب أن يكون أكبر من صفر',
          },
          { status: 400 },
        )
      }

      if (
        transaction_type ===
          'adjustment' &&
        adjustment_direction !==
          'plus' &&
        adjustment_direction !==
          'minus'
      ) {
        return NextResponse.json(
          {
            error:
              'اتجاه التسوية مطلوب',
          },
          { status: 400 },
        )
      }

      const {
        data: settings,
        error: settingsError,
      } = await supabaseAdmin
        .from('financial_settings')
        .select('*')
        .eq(
          'academic_year_id',
          academic_year_id,
        )
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

      /*
       * دفعة طالب
       */

      if (
        source_type ===
        'student_payment'
      ) {
        if (
          settings.financial_mode !==
          'student_payments'
        ) {
          return NextResponse.json(
            {
              error:
                'النظام المالي الحالي هو الإدخال اليدوي',
            },
            { status: 400 },
          )
        }

        if (
          transaction_type !== 'in'
        ) {
          return NextResponse.json(
            {
              error:
                'دفعات الطلاب يجب أن تكون إيرادًا',
            },
            { status: 400 },
          )
        }

        if (
          !payment_id &&
          !student_id
        ) {
          return NextResponse.json(
            {
              error:
                'يجب ربط دفعة الطالب بمعرف الدفعة أو الطالب',
            },
            { status: 400 },
          )
        }

        /*
         * منع إنشاء عملية مالية مكررة
         * لنفس payment_id.
         */

        if (payment_id) {
          const {
            data: duplicate,
            error:
              duplicateError,
          } = await supabaseAdmin
            .from(
              'financial_transactions',
            )
            .select('id')
            .eq(
              'academic_year_id',
              academic_year_id,
            )
            .eq(
              'payment_id',
              payment_id,
            )
            .maybeSingle()

          if (duplicateError) {
            throw duplicateError
          }

          if (duplicate) {
            return NextResponse.json(
              {
                error:
                  'هذه الدفعة مرتبطة بالفعل بالإدارة المالية.',
              },
              { status: 409 },
            )
          }
        }
      }

      const confirmationStatus =
        source_type ===
        'student_payment'
          ? 'pending'
          : 'not_required'

      let finalSourceType =
        source_type

      if (!finalSourceType) {
        if (
          transaction_type ===
          'adjustment'
        ) {
          finalSourceType =
            'adjustment'
        } else {
          finalSourceType =
            'manual'
        }
      }

      const {
        data: transaction,
        error,
      } = await supabaseAdmin
        .from('financial_transactions')
        .insert({
          academic_year_id,

          transaction_type,

          amount: numericAmount,

          adjustment_direction:
            transaction_type ===
            'adjustment'
              ? adjustment_direction
              : null,

          source_type:
            finalSourceType,

          source:
            source || null,

          payment_id:
            payment_id || null,

          student_id:
            student_id || null,

          student_request_number:
            student_request_number ||
            null,

          payment_method:
            payment_method || null,

          reference_number:
            reference_number || null,

          confirmation_status:
            confirmationStatus,

          confirmed_by: null,

          confirmed_at: null,

          note:
            note || null,
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      return NextResponse.json({
        success: true,
        transaction,
      })
    }

    /*
     * ==================================================
     * CONFIRM
     * تأكيد استلام دفعة الطالب
     * ==================================================
     */

    if (action === 'confirm') {
      const {
        transaction_id,
      } = body

      if (!transaction_id) {
        return NextResponse.json(
          {
            error:
              'معرف العملية مطلوب',
          },
          { status: 400 },
        )
      }

      const transaction =
        await getTransaction(
          transaction_id,
          academic_year_id,
        )

      if (!transaction) {
        return NextResponse.json(
          {
            error:
              'العملية غير موجودة',
          },
          { status: 404 },
        )
      }

      if (
        transaction.source_type !==
        'student_payment'
      ) {
        return NextResponse.json(
          {
            error:
              'هذه العملية لا تحتاج إلى تأكيد',
          },
          { status: 400 },
        )
      }

      if (
        transaction.confirmation_status ===
        'confirmed'
      ) {
        return NextResponse.json(
          {
            error:
              'تم تأكيد العملية مسبقًا',
          },
          { status: 400 },
        )
      }

      const confirmedAt =
        new Date().toISOString()

      const {
        data: updated,
        error,
      } = await supabaseAdmin
        .from(
          'financial_transactions',
        )
        .update({
          confirmation_status:
            'confirmed',
          confirmed_at:
            confirmedAt,
        })
        .eq(
          'id',
          transaction_id,
        )
        .eq(
          'academic_year_id',
          academic_year_id,
        )
        .select()
        .single()

      if (error) {
        throw error
      }

      return NextResponse.json({
        success: true,
        transaction: updated,
      })
    }

    /*
     * ==================================================
     * DELETE
     * حذف عملية مالية واحدة
     * ==================================================
     */

    if (action === 'delete') {
      const {
        transaction_id,
      } = body

      if (!transaction_id) {
        return NextResponse.json(
          {
            error:
              'معرف العملية مطلوب',
          },
          { status: 400 },
        )
      }

      const transaction =
        await getTransaction(
          transaction_id,
          academic_year_id,
        )

      if (!transaction) {
        return NextResponse.json(
          {
            error:
              'العملية غير موجودة',
          },
          { status: 404 },
        )
      }

      /*
       * لا نحذف الرصيد الافتتاحي.
       */

      if (
        transaction.source_type ===
        'opening'
      ) {
        return NextResponse.json(
          {
            error:
              'لا يمكن حذف الرصيد الافتتاحي من سجل العمليات',
          },
          { status: 400 },
        )
      }

      /*
       * حذف سجل الإدارة المالية فقط.
       *
       * لا نحذف payment الأصلي.
       */

      const { error } =
        await supabaseAdmin
          .from(
            'financial_transactions',
          )
          .delete()
          .eq(
            'id',
            transaction_id,
          )
          .eq(
            'academic_year_id',
            academic_year_id,
          )

      if (error) {
        throw error
      }

      return NextResponse.json({
        success: true,
        deleted_id:
          transaction.id,
      })
    }

    /*
     * --------------------------------------------------
     * إجراء غير معروف
     * --------------------------------------------------
     */

    return NextResponse.json(
      {
        error:
          'الإجراء غير معروف',
      },
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