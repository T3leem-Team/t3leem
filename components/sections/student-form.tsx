'use client'

import { FormEvent } from 'react'
import { X } from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

type AcademicLevel = {
  id: string
  name: string
  sort_order: number
}

type Course = {
  id: string
  academic_year_id: string
  name: string
  start_date: string | null
  end_date: string | null
  days: string[]
}

type AttendanceStatus = {
  id: string
  name: string
  isActive: boolean
  sortOrder: number
}

type StudentFormStudent = {
  id: string
  studentId?: string
  name: string
  personalId?: string
  phone?: string
  whatsapp?: string
  grade?: string
  chronicDiseases?: string
  notes?: string
  amountPaid?: number
  feeExempt?: boolean
}

type StudentFormProps = {
  editingStudent: StudentFormStudent | null
  academicLevels: AcademicLevel[]
  currentAcademicYearId: string | null
  currentAcademicYearName: string
  currentAnnualFee: number
  currentCourse: Course | null
  courses: Course[]
  attendanceStatuses: AttendanceStatus[]
  closeStudentDrawer: () => void
  setSupabaseStatus: (message: string) => void
  setStudentList: React.Dispatch<React.SetStateAction<any[]>>
}

function getTodayString() {
  const today = new Date()

  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function normalizeArabicDay(day: string) {
  return day
    .trim()
    .replace(/^ال/, '')
    .replace('أ', 'ا')
    .replace('إ', 'ا')
    .replace('آ', 'ا')
}

function getDayOfWeek(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`)
  const day = date.getDay()

  const days = [
    'الاحد',
    'الاثنين',
    'الثلاثاء',
    'الاربعاء',
    'الخميس',
    'الجمعة',
    'السبت',
  ]

  return days[day]
}

function isCourseStudyDay(
  dateString: string,
  course: Course,
) {
  if (!course.days || course.days.length === 0) {
    return true
  }

  const currentDay = normalizeArabicDay(
    getDayOfWeek(dateString),
  )

  return course.days.some(
    (day) =>
      normalizeArabicDay(day) === currentDay,
  )
}

function getCourseStatus(
  course: Course,
  studentId: string,
  assignments: Array<{
    course_id: string
    student_id: string
  }>,
  today: string,
) {
  if (
    course.start_date &&
    today < course.start_date
  ) {
    return 'لم تبدأ'
  }

  if (
    course.end_date &&
    today > course.end_date
  ) {
    return 'انتهت'
  }

  const assigned = assignments.some(
    (assignment) =>
      assignment.course_id === course.id &&
      assignment.student_id === studentId,
  )

  return assigned ? 'حاضر' : 'لم يحضر'
}

function getStatusName(
  statusId: string,
  attendanceStatuses: AttendanceStatus[],
) {
  return (
    attendanceStatuses.find(
      (status) => status.id === statusId,
    )?.name ?? ''
  )
}

function calculateAttendanceSummary(
  studentId: string,
  course: Course,
  records: Array<{
    studentId: string
    courseId: string
    attendanceDate: string
    statusId: string
    note: string
  }>,
  attendanceStatuses: AttendanceStatus[],
) {
  const today = getTodayString()

  let present = 0
  let absent = 0
  let late = 0
  let excused = 0
  let notRecorded = 0

  if (
    !course.start_date ||
    !course.end_date
  ) {
    return {
      courseId: course.id,
      courseName: course.name,
      startDate: course.start_date,
      endDate: course.end_date,
      days: course.days,
      teacherName: '',
      totalDays: 0,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      notRecorded: 0,
      percentage: 0,
    }
  }

  const start = new Date(
    `${course.start_date}T00:00:00`,
  )

  const end = new Date(
    `${course.end_date}T00:00:00`,
  )

  const current = new Date(start)

  let totalDays = 0

  while (current <= end) {
    const dateString = [
      current.getFullYear(),
      String(current.getMonth() + 1).padStart(
        2,
        '0',
      ),
      String(current.getDate()).padStart(
        2,
        '0',
      ),
    ].join('-')

    if (
      dateString <= today &&
      isCourseStudyDay(
        dateString,
        course,
      )
    ) {
      totalDays += 1

      const record = records.find(
        (item) =>
          item.studentId === studentId &&
          item.courseId === course.id &&
          item.attendanceDate ===
            dateString,
      )

      if (!record) {
        notRecorded += 1
      } else {
        const status = getStatusName(
          record.statusId,
          attendanceStatuses,
        )

        if (status === 'حاضر') {
          present += 1
        } else if (status === 'غائب') {
          absent += 1
        } else if (status === 'متأخر') {
          late += 1
        } else if (
          status === 'مستأذن'
        ) {
          excused += 1
        }
      }
    }

    current.setDate(
      current.getDate() + 1,
    )
  }

  const denominator =
    present + late + absent

  const percentage =
    denominator > 0
      ? Math.round(
          ((present + late) /
            denominator) *
            100,
        )
      : 0

  return {
    courseId: course.id,
    courseName: course.name,
    startDate: course.start_date,
    endDate: course.end_date,
    days: course.days,
    teacherName: '',
    totalDays,
    present,
    absent,
    late,
    excused,
    notRecorded,
    percentage,
  }
}

/*
 * ============================================================
 * تحويل أخطاء Supabase إلى رسائل واضحة للمستخدم
 * ============================================================
 */
function getReadableSupabaseError(
  error: any,
  fieldName?: string,
) {
  if (!error) {
    return 'حدث خطأ غير معروف.'
  }

  const code = String(
    error.code ?? '',
  )

  const message = String(
    error.message ?? '',
  )

  const details = String(
    error.details ?? '',
  )

  const hint = String(
    error.hint ?? '',
  )

  const fullText =
    `${message} ${details} ${hint}`.toLowerCase()

  /*
   * الرقم الشخصي مكرر
   */
  if (
    code === '23505' ||
    fullText.includes('duplicate key') ||
    fullText.includes('unique constraint') ||
    fullText.includes('already exists')
  ) {
    if (
      fullText.includes('personal_id') ||
      fieldName === 'personal_id'
    ) {
      return 'الرقم الشخصي مستخدم مسبقًا لطالب آخر. يرجى التأكد من الرقم الشخصي أو البحث عن الطالب الموجود بدل تسجيله مرة أخرى.'
    }

    if (
      fullText.includes('phone') ||
      fieldName === 'phone'
    ) {
      return 'رقم الهاتف مستخدم مسبقًا في النظام.'
    }

    if (
      fullText.includes('whatsapp') ||
      fieldName === 'whatsapp'
    ) {
      return 'رقم الواتساب مستخدم مسبقًا في النظام.'
    }

    return 'هناك بيانات مكررة. يبدو أن إحدى القيم التي أدخلتها مستخدمة مسبقًا في النظام.'
  }

  /*
   * قيمة لا تطابق CHECK constraint
   */
  if (
    code === '23514' ||
    fullText.includes('check constraint')
  ) {
    return 'إحدى البيانات المدخلة لا تطابق القاعدة المطلوبة في النظام. يرجى مراجعة القيم المدخلة، خصوصًا الرقم الشخصي أو الهاتف أو حالة الطالب.'
  }

  /*
   * Foreign Key
   */
  if (
    code === '23503' ||
    fullText.includes('foreign key')
  ) {
    return 'لا يمكن حفظ الطالب لأن إحدى البيانات المرتبطة به غير موجودة أو غير صحيحة. يرجى التأكد من السنة الدراسية والصف الأكاديمي.'
  }

  /*
   * NOT NULL
   */
  if (
    code === '23502' ||
    fullText.includes('not-null') ||
    fullText.includes('not null')
  ) {
    return 'هناك حقل مطلوب في قاعدة البيانات لم يتم إدخال قيمته. يرجى التأكد من تعبئة جميع البيانات الأساسية.'
  }

  /*
   * صيغة UUID
   */
  if (
    code === '22P02' ||
    fullText.includes('invalid input syntax')
  ) {
    return 'إحدى البيانات المدخلة ليست بالصيغة الصحيحة. يرجى مراجعة الصف أو السنة الدراسية أو البيانات المرتبطة.'
  }

  /*
   * صلاحيات
   */
  if (
    code === '42501' ||
    fullText.includes('permission denied') ||
    fullText.includes('row-level security')
  ) {
    return 'ليس لديك صلاحية لتنفيذ هذه العملية. يرجى التأكد من صلاحيات حساب المستخدم وقواعد الوصول في النظام.'
  }

  /*
   * خطأ في الاتصال
   */
  if (
    fullText.includes('network') ||
    fullText.includes('fetch') ||
    fullText.includes('connection')
  ) {
    return 'تعذر الاتصال بقاعدة البيانات. تحقق من اتصال الإنترنت ثم حاول مرة أخرى.'
  }

  /*
   * إذا كان لدينا اسم حقل محدد
   */
  if (fieldName) {
    return `تعذر حفظ الحقل ${fieldName}. سبب الرفض من قاعدة البيانات: ${message}`
  }

  /*
   * آخر حل:
   * عرض رسالة Supabase الأصلية بدل إخفائها.
   */
  return message || 'حدث خطأ أثناء حفظ البيانات.'
}

export function StudentForm({
  editingStudent,
  academicLevels,
  currentAcademicYearId,
  currentAcademicYearName,
  currentAnnualFee,
  currentCourse,
  courses,
  attendanceStatuses,
  closeStudentDrawer,
  setSupabaseStatus,
  setStudentList,
}: StudentFormProps) {
  async function handleSubmit(
    e: FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault()

    const form = e.currentTarget

    const data = new FormData(form)

    /*
     * ============================================================
     * قراءة البيانات
     * ============================================================
     */

    const name = String(
      data.get('name') || '',
    ).trim()

    const personalId = String(
      data.get('personalId') || '',
    ).trim()

    const grade = String(
      data.get('grade') || '',
    ).trim()

    const phone = String(
      data.get('phone') || '',
    ).trim()

    const whatsapp = String(
      data.get('whatsapp') || '',
    ).trim()

    const chronicDiseases = String(
      data.get('chronicDiseases') || '',
    ).trim()

    const amountPaid = Number(
      data.get('amountPaid') || 0,
    )

    const notes = String(
      data.get('notes') || '',
    ).trim()

    /*
     * ============================================================
     * التحقق الأساسي
     * ============================================================
     */

    if (!name) {
      setSupabaseStatus(
        '❌ لم يتم حفظ الطالب: اسم الطالب مطلوب.',
      )
      return
    }

    if (!personalId) {
      setSupabaseStatus(
        '❌ لم يتم حفظ الطالب: الرقم الشخصي مطلوب.',
      )
      return
    }

    if (!grade) {
      setSupabaseStatus(
        '❌ لم يتم حفظ الطالب: يجب اختيار الصف الأكاديمي.',
      )
      return
    }

    /*
     * ============================================================
     * التحقق من الرقم الشخصي
     *
     * لا نفترض طولًا معينًا هنا.
     * فقط نمنع الأحرف والمسافات والرموز.
     * قانون الطول الفعلي يبقى حسب قاعدة البيانات.
     * ============================================================
     */

    if (!/^\d+$/.test(personalId)) {
      setSupabaseStatus(
        '❌ الرقم الشخصي غير صحيح: يجب أن يحتوي على أرقام فقط، بدون مسافات أو أحرف أو رموز.',
      )
      return
    }

    /*
     * ============================================================
     * التحقق من رقم الهاتف
     * ============================================================
     */

    if (
      phone &&
      !/^\d+$/.test(phone)
    ) {
      setSupabaseStatus(
        '❌ رقم الهاتف غير صحيح: يجب أن يحتوي على أرقام فقط.',
      )
      return
    }

    if (
      whatsapp &&
      !/^\d+$/.test(whatsapp)
    ) {
      setSupabaseStatus(
        '❌ رقم الواتساب غير صحيح: يجب أن يحتوي على أرقام فقط.',
      )
      return
    }

    /*
     * ============================================================
     * التحقق من المبلغ
     * ============================================================
     */

    if (
      !Number.isFinite(amountPaid)
    ) {
      setSupabaseStatus(
        '❌ المبلغ المدفوع غير صحيح: يجب إدخال رقم صحيح.',
      )
      return
    }

    if (amountPaid < 0) {
      setSupabaseStatus(
        '❌ المبلغ المدفوع غير صحيح: لا يمكن أن يكون المبلغ سالبًا.',
      )
      return
    }

    if (!currentAcademicYearId) {
      setSupabaseStatus(
        '❌ لا يمكن حفظ الطالب: لا توجد سنة دراسية حالية مفعلة.',
      )
      return
    }

    /*
     * ============================================================
     * التحقق من الصف الأكاديمي
     * ============================================================
     */

    const selectedLevel =
      academicLevels.find(
        (level) =>
          level.name === grade,
      )

    if (!selectedLevel) {
      setSupabaseStatus(
        `❌ الصف الأكاديمي «${grade}» غير موجود في النظام. يرجى اختيار صف موجود من القائمة.`,
      )
      return
    }

    /*
     * ============================================================
     * التحقق من الرسوم
     * ============================================================
     */

    if (
      !editingStudent &&
      amountPaid > currentAnnualFee &&
      currentAnnualFee > 0
    ) {
      setSupabaseStatus(
        `❌ المبلغ المدفوع (${amountPaid.toFixed(
          3,
        )} د.ب) أكبر من الرسوم السنوية (${currentAnnualFee.toFixed(
          3,
        )} د.ب). يرجى إدخال مبلغ صحيح.`,
      )
      return
    }

    /*
     * ============================================================
     * فحص الرقم الشخصي قبل الإضافة
     *
     * في حالة التعديل نستثني الطالب الحالي.
     * ============================================================
     */

    const {
      data: duplicatePersonalId,
      error: duplicatePersonalIdError,
    } = await supabase
      .from('students')
      .select(
        'id, name, personal_id',
      )
      .eq(
        'personal_id',
        personalId,
      )
      .neq(
        'id',
        editingStudent?.id ?? '',
      )
      .maybeSingle()

    if (duplicatePersonalIdError) {
      console.error(
        'personal ID lookup error:',
        duplicatePersonalIdError,
      )

      setSupabaseStatus(
        `❌ تعذر التحقق من الرقم الشخصي قبل الحفظ: ${getReadableSupabaseError(
          duplicatePersonalIdError,
          'personal_id',
        )}`,
      )
      return
    }

    if (duplicatePersonalId) {
      setSupabaseStatus(
        `❌ لا يمكن حفظ الطالب: الرقم الشخصي «${personalId}» مستخدم مسبقًا للطالب «${duplicatePersonalId.name}».`,
      )
      return
    }

    /*
     * ============================================================
     * تعديل طالب
     * ============================================================
     */

    if (editingStudent) {
      const {
        data: updatedStudent,
        error,
      } = await supabase
        .from('students')
        .update({
          name,
          personal_id:
            personalId,
          phone,
          whatsapp,
          notes,
          health_notes:
            chronicDiseases,
        })
        .eq(
          'id',
          editingStudent.id,
        )
        .select(
          'id, student_id, name, personal_id, phone, whatsapp, notes, health_notes, status, fee_exempt, source',
        )
        .single()

      if (error) {
        console.error(
          'update student error:',
          error,
        )

        setSupabaseStatus(
          `❌ لم يتم تعديل الطالب: ${getReadableSupabaseError(
            error,
            'بيانات الطالب',
          )}`,
        )
        return
      }

      /*
       * ========================================================
       * قراءة ربط الصف الحالي
       * ========================================================
       */

      const {
        data: existingEnrollment,
        error: enrollmentLookupError,
      } = await supabase
        .from('enrollments')
        .select('id')
        .eq(
          'student_id',
          editingStudent.id,
        )
        .eq(
          'academic_year_id',
          currentAcademicYearId,
        )
        .maybeSingle()

      if (enrollmentLookupError) {
        console.error(
          'enrollment lookup error:',
          enrollmentLookupError,
        )

        setSupabaseStatus(
          `❌ تم تعديل بيانات الطالب، لكن تعذر قراءة ربط الصف الأكاديمي: ${getReadableSupabaseError(
            enrollmentLookupError,
          )}`,
        )
        return
      }

      /*
       * ========================================================
       * تعديل ربط الصف
       * ========================================================
       */

      if (existingEnrollment) {
        const {
          error: enrollmentUpdateError,
        } = await supabase
          .from('enrollments')
          .update({
            level_id:
              selectedLevel.id,
            status: 'نشط',
          })
          .eq(
            'id',
            existingEnrollment.id,
          )

        if (enrollmentUpdateError) {
          console.error(
            'enrollment update error:',
            enrollmentUpdateError,
          )

          setSupabaseStatus(
            `❌ تم تعديل بيانات الطالب، لكن لم يتم تعديل الصف الأكاديمي: ${getReadableSupabaseError(
              enrollmentUpdateError,
            )}`,
          )
          return
        }
      } else {
        const {
          error: enrollmentInsertError,
        } = await supabase
          .from('enrollments')
          .insert({
            student_id:
              editingStudent.id,
            academic_year_id:
              currentAcademicYearId,
            level_id:
              selectedLevel.id,
            class_id: null,
            status: 'نشط',
            join_date:
              getTodayString(),
          })

        if (enrollmentInsertError) {
          console.error(
            'enrollment insert error:',
            enrollmentInsertError,
          )

          setSupabaseStatus(
            `❌ تم تعديل بيانات الطالب، لكن لم يتم ربط الصف الأكاديمي: ${getReadableSupabaseError(
              enrollmentInsertError,
            )}`,
          )
          return
        }
      }

      /*
       * ========================================================
       * تحديث القائمة
       * ========================================================
       */

      setStudentList(
        (current) =>
          current.map(
            (student) =>
              student.id ===
              editingStudent.id
                ? {
                    ...student,
                    name:
                      updatedStudent.name,
                    personalId:
                      updatedStudent.personal_id ??
                      '',
                    phone:
                      updatedStudent.phone ??
                      '',
                    whatsapp:
                      updatedStudent.whatsapp ??
                      '',
                    chronicDiseases:
                      updatedStudent.health_notes ??
                      '',
                    notes:
                      updatedStudent.notes ??
                      '',
                    grade,
                    feeExempt:
                      Boolean(
                        updatedStudent.fee_exempt,
                      ),
                  }
                : student,
          ),
      )

      setSupabaseStatus(
        '✅ تم تعديل بيانات الطالب وربط الصف الأكاديمي بنجاح.',
      )
    } else {
      /*
       * ============================================================
       * إضافة طالب جديد
       * ============================================================
       */

      const {
        data: newStudent,
        error,
      } = await supabase
        .from('students')
        .insert({
          academic_year_id:
            currentAcademicYearId,
          name,
          personal_id:
            personalId,
          phone,
          whatsapp,
          notes,
          health_notes:
            chronicDiseases,
          status: 'نشط',
          fee_exempt: false,
          source: 'manual',
        })
        .select(
          'id, student_id, name, personal_id, phone, whatsapp, notes, health_notes, status, fee_exempt, source',
        )
        .single()

      if (error) {
        console.error(
          'insert student error:',
          error,
        )

        setSupabaseStatus(
          `❌ لم يتم تسجيل الطالب.\n\n${getReadableSupabaseError(
            error,
            'بيانات الطالب',
          )}`,
        )
        return
      }

      /*
       * ========================================================
       * ربط الصف الأكاديمي
       * ========================================================
       */

      const {
        error: enrollmentError,
      } = await supabase
        .from('enrollments')
        .insert({
          student_id:
            newStudent.id,
          academic_year_id:
            currentAcademicYearId,
          level_id:
            selectedLevel.id,
          class_id: null,
          status: 'نشط',
          join_date:
            getTodayString(),
        })

      if (enrollmentError) {
        console.error(
          'enrollment insert error:',
          enrollmentError,
        )

        /*
         * تنظيف الطالب الذي تم إنشاؤه
         */
        await supabase
          .from('students')
          .delete()
          .eq(
            'id',
            newStudent.id,
          )

        setSupabaseStatus(
          `❌ لم يتم تسجيل الطالب بالكامل.\n\nتم رفض ربط الطالب بالصف الأكاديمي.\n\nالسبب: ${getReadableSupabaseError(
            enrollmentError,
          )}`,
        )
        return
      }

      /*
       * ========================================================
       * الدفعة الأولى
       * ========================================================
       */

      if (amountPaid > 0) {
        const {
          error: paymentError,
        } = await supabase
          .from('payments')
          .insert({
            student_id:
              newStudent.id,
            academic_year_id:
              currentAcademicYearId,
            amount:
              amountPaid,
            payment_method:
              'نقدي',
            payment_date:
              new Date()
                .toISOString()
                .slice(0, 10),
          })

        if (paymentError) {
          console.error(
            'payment insert error:',
            paymentError,
          )

          /*
           * تنظيف البيانات التي تم إنشاؤها
           */
          await supabase
            .from('enrollments')
            .delete()
            .eq(
              'student_id',
              newStudent.id,
            )
            .eq(
              'academic_year_id',
              currentAcademicYearId,
            )

          await supabase
            .from('students')
            .delete()
            .eq(
              'id',
              newStudent.id,
            )

          setSupabaseStatus(
            `❌ لم يتم تسجيل الطالب بالكامل.\n\nتم حفظ بيانات الطالب مؤقتًا، لكن تم رفض الدفعة الأولى.\n\nالسبب: ${getReadableSupabaseError(
              paymentError,
            )}`,
          )
          return
        }
      }

      /*
       * ========================================================
       * تحديد حالة الدفع
       * ========================================================
       */

      const paymentStatus =
        amountPaid >=
          currentAnnualFee &&
        currentAnnualFee > 0
          ? 'مدفوع بالكامل'
          : amountPaid > 0
            ? 'مدفوع جزئيًا'
            : 'غير مدفوع'

      /*
       * ========================================================
       * تجهيز الطالب للقائمة
       * ========================================================
       */

      const mappedStudent = {
        id: newStudent.id,

        studentId:
          newStudent.student_id ??
          '',

        name:
          newStudent.name,

        personalId:
          newStudent.personal_id ??
          '',

        gender: '',

        age: null,

        grade,

        phone:
          newStudent.phone ??
          '',

        whatsapp:
          newStudent.whatsapp ??
          '',

        status:
          newStudent.status ??
          'نشط',

        source:
          newStudent.source ??
          'manual',

        createdAt:
          new Date().toISOString(),

        updatedAt: '',

        academicYearId:
          currentAcademicYearId,

        paymentStatus,

        amountDue:
          currentAnnualFee,

        amountPaid,

        feeExempt:
          Boolean(
            newStudent.fee_exempt,
          ),

        chronicDiseases:
          newStudent.health_notes ??
          '',

        notes:
          newStudent.notes ??
          '',

        attendance:
          currentCourse
            ? 'لم يحضر'
            : 'لم يحضر',

        courseStatuses:
          courses.map(
            (course) => ({
              courseId:
                course.id,

              courseName:
                course.name,

              startDate:
                course.start_date,

              endDate:
                course.end_date,

              status:
                getCourseStatus(
                  course,
                  newStudent.id,
                  [],
                  getTodayString(),
                ),
            }),
          ),

        attendanceSummaries:
          courses.map(
            (course) =>
              calculateAttendanceSummary(
                newStudent.id,
                course,
                [],
                attendanceStatuses,
              ),
          ),

        attendanceRecords: [],
      }

      setStudentList(
        (current) => [
          mappedStudent,
          ...current,
        ],
      )

      /*
       * ========================================================
       * نجاح التسجيل
       * ========================================================
       */

      setSupabaseStatus(
        amountPaid > 0
          ? '✅ تم تسجيل الطالب وربط الصف الأكاديمي وحفظ الدفعة الأولى بنجاح.'
          : '✅ تم تسجيل الطالب وربط الصف الأكاديمي بنجاح.',
      )
    }

    closeStudentDrawer()
    form.reset()
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="إغلاق"
        className="absolute inset-0 bg-black/40"
        onClick={
          closeStudentDrawer
        }
      />

      <aside className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l bg-background shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">
              {editingStudent
                ? 'تعديل بيانات الطالب'
                : 'إضافة طالب'}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {editingStudent
                ? 'تعديل بيانات الطالب الأساسية'
                : 'إدخال بيانات الطالب الأساسية'}
            </p>
          </div>

          <button
            type="button"
            onClick={
              closeStudentDrawer
            }
            className="rounded-md p-2 hover:bg-muted"
            aria-label="إغلاق"
          >
            <X className="size-5" />
          </button>
        </div>

        <form
          key={
            editingStudent?.id ??
            'new'
          }
          onSubmit={handleSubmit}
        >
          <div className="space-y-6 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium">
                  اسم الطالب
                </label>

                <input
                  name="name"
                  type="text"
                  required
                  defaultValue={
                    editingStudent?.name ??
                    ''
                  }
                  placeholder="أدخل اسم الطالب"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  الرقم الشخصي
                </label>

                <input
                  name="personalId"
                  type="text"
                  required
                  inputMode="numeric"
                  pattern="[0-9]+"
                  defaultValue={
                    editingStudent?.personalId ??
                    ''
                  }
                  placeholder="أدخل الرقم الشخصي"
                  dir="ltr"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
                />

                <p className="mt-1 text-xs text-muted-foreground">
                  يجب إدخال أرقام فقط.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  الصف الأكاديمي
                </label>

                <select
                  name="grade"
                  required
                  defaultValue={
                    editingStudent?.grade ??
                    ''
                  }
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="">
                    اختر الصف
                  </option>

                  {academicLevels.map(
                    (level) => (
                      <option
                        key={level.id}
                        value={
                          level.name
                        }
                      >
                        {level.name}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  رقم الهاتف
                </label>

                <input
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  defaultValue={
                    editingStudent?.phone ??
                    ''
                  }
                  placeholder="مثال: 33xxxxxx"
                  dir="ltr"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  رقم واتساب
                </label>

                <input
                  name="whatsapp"
                  type="tel"
                  inputMode="numeric"
                  defaultValue={
                    editingStudent?.whatsapp ??
                    ''
                  }
                  placeholder="مثال: 33xxxxxx"
                  dir="ltr"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
                />
              </div>
            </div>

            <div className="border-t pt-5">
              <h3 className="mb-4 text-sm font-semibold">
                المعلومات الصحية
              </h3>

              <label className="mb-2 block text-sm font-medium">
                الأمراض المزمنة
              </label>

              <input
                name="chronicDiseases"
                type="text"
                defaultValue={
                  editingStudent?.chronicDiseases ??
                  ''
                }
                placeholder="لا يوجد"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
              />
            </div>

            <div className="border-t pt-5">
              <h3 className="mb-4 text-sm font-semibold">
                المعلومات المالية
              </h3>

              <div className="rounded-md border bg-muted/30 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">
                      الرسوم السنوية
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      حسب السنة الدراسية الحالية:{' '}
                      {
                        currentAcademicYearName
                      }
                    </p>
                  </div>

                  <div className="text-lg font-semibold">
                    {currentAnnualFee.toLocaleString(
                      'ar-BH',
                      {
                        minimumFractionDigits: 3,
                        maximumFractionDigits: 3,
                      },
                    )}{' '}
                    د.ب
                  </div>
                </div>
              </div>

              {!editingStudent ? (
                <>
                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-medium">
                      الدفعة الأولى
                    </label>

                    <input
                      name="amountPaid"
                      type="number"
                      min="0"
                      max={
                        currentAnnualFee >
                        0
                          ? currentAnnualFee
                          : undefined
                      }
                      step="0.001"
                      defaultValue="0"
                      placeholder="0"
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
                    />
                  </div>

                  <p className="mt-3 text-xs text-muted-foreground">
                    يمكنك تسجيل الدفعة الأولى مع إضافة الطالب. سيتم حفظها كدفعة فعلية، ويمكن إضافة الدفعات اللاحقة من قسم المدفوعات.
                  </p>
                </>
              ) : (
                <div className="mt-4 rounded-md border bg-muted/30 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">
                        المدفوع حتى الآن
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        لتسجيل دفعة جديدة استخدم حالة الدفع من قائمة الطلاب.
                      </p>
                    </div>

                    <div className="text-lg font-semibold">
                      {Number(
                        editingStudent?.amountPaid ??
                          0,
                      ).toLocaleString(
                        'ar-BH',
                        {
                          minimumFractionDigits: 3,
                          maximumFractionDigits: 3,
                        },
                      )}{' '}
                      د.ب
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t pt-5">
              <label className="mb-2 block text-sm font-medium">
                ملاحظات
              </label>

              <textarea
                name="notes"
                defaultValue={
                  editingStudent?.notes ??
                  ''
                }
                placeholder="أدخل أي ملاحظات إضافية..."
                rows={4}
                className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none"
              />
            </div>
          </div>

          <div className="sticky bottom-0 flex gap-3 border-t bg-background p-6">
            <Button
              type="submit"
              className="flex-1"
            >
              {editingStudent
                ? 'حفظ التعديلات'
                : 'حفظ الطالب'}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={
                closeStudentDrawer
              }
            >
              إلغاء
            </Button>
          </div>
        </form>
      </aside>
    </div>
  )
}
