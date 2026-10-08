'use client'

import {
  FormEvent,
  useEffect,
  useState,
} from 'react'

import {
  X,
  AlertCircle,
} from 'lucide-react'

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
  guardianRelation?: string
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
  setStudentList: React.Dispatch<
    React.SetStateAction<any[]>
  >
}

const GUARDIAN_RELATIONS = [
  'الأب',
  'الأم',
  'الأخ',
  'الأخت',
  'الجد',
  'الجدة',
] as const

function getTodayString() {
  const today = new Date()

  const year = today.getFullYear()
  const month = String(
    today.getMonth() + 1,
  ).padStart(2, '0')
  const day = String(
    today.getDate(),
  ).padStart(2, '0')

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
  const date = new Date(
    `${dateString}T00:00:00`,
  )

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
  if (
    !course.days ||
    course.days.length === 0
  ) {
    return true
  }

  const currentDay =
    normalizeArabicDay(
      getDayOfWeek(dateString),
    )

  return course.days.some(
    (day) =>
      normalizeArabicDay(day) ===
      currentDay,
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

  const assigned =
    assignments.some(
      (assignment) =>
        assignment.course_id ===
          course.id &&
        assignment.student_id ===
          studentId,
    )

  return assigned
    ? 'حاضر'
    : 'لم يحضر'
}

function getStatusName(
  statusId: string,
  attendanceStatuses: AttendanceStatus[],
) {
  return (
    attendanceStatuses.find(
      (status) =>
        status.id === statusId,
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
      String(
        current.getMonth() + 1,
      ).padStart(2, '0'),
      String(
        current.getDate(),
      ).padStart(2, '0'),
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
          item.studentId ===
            studentId &&
          item.courseId === course.id &&
          item.attendanceDate ===
            dateString,
      )

      if (!record) {
        notRecorded += 1
      } else {
        const status =
          getStatusName(
            record.statusId,
            attendanceStatuses,
          )

        if (status === 'حاضر') {
          present += 1
        } else if (
          status === 'غائب'
        ) {
          absent += 1
        } else if (
          status === 'متأخر'
        ) {
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
  const [errorMessage, setErrorMessage] =
    useState('')

  const [isErrorOpen, setIsErrorOpen] =
    useState(false)

  const [
    selectedGuardianRelation,
    setSelectedGuardianRelation,
  ] = useState('')

  const [
    customGuardianRelation,
    setCustomGuardianRelation,
  ] = useState('')

  useEffect(() => {
    const relation =
      editingStudent?.guardianRelation?.trim() ??
      ''

    if (!relation) {
      setSelectedGuardianRelation('')
      setCustomGuardianRelation('')
      return
    }

    if (
      GUARDIAN_RELATIONS.includes(
        relation as (typeof GUARDIAN_RELATIONS)[number],
      )
    ) {
      setSelectedGuardianRelation(
        relation,
      )
      setCustomGuardianRelation('')
      return
    }

    setSelectedGuardianRelation('أخرى')
    setCustomGuardianRelation(
      relation,
    )
  }, [editingStudent])

  const showError = (
    message: string,
  ) => {
    setErrorMessage(message)
    setIsErrorOpen(true)
  }

  const closeError = () => {
    setIsErrorOpen(false)
    setErrorMessage('')
  }

  const getDatabaseErrorMessage = (
    error: any,
  ) => {
    const message = String(
      error?.message ?? '',
    )

    const details = String(
      error?.details ?? '',
    )

    const combined =
      `${message} ${details}`.toLowerCase()

    if (
      combined.includes(
        'personal_id',
      ) ||
      combined.includes(
        'personal id',
      ) ||
      combined.includes(
        'duplicate key',
      ) ||
      combined.includes(
        'unique constraint',
      ) ||
      combined.includes(
        'already exists',
      )
    ) {
      return (
        'الرقم الشخصي مكرر.\n\nهذا الرقم موجود مسبقًا في قاعدة البيانات. استخدم رقمًا شخصيًا مختلفًا.'
      )
    }

    if (
      combined.includes(
        'student_id',
      )
    ) {
      return (
        'تعذر إنشاء رقم الطالب.\n\nرقم الطالب الناتج موجود مسبقًا في قاعدة البيانات.'
      )
    }

    if (
      combined.includes(
        'academic_year',
      )
    ) {
      return (
        'تعذر ربط الطالب بالسنة الدراسية الحالية.\n\nتأكد من وجود سنة دراسية مفعلة.'
      )
    }

    if (
      combined.includes(
        'level_id',
      )
    ) {
      return (
        'تعذر ربط الطالب بالصف الأكاديمي.\n\nتأكد من أن الصف المحدد موجود في النظام.'
      )
    }

    if (
      combined.includes(
        'phone',
      )
    ) {
      return (
        'تعذر حفظ رقم الهاتف.\n\nتحقق من رقم الهاتف المدخل.'
      )
    }

    if (
      combined.includes(
        'whatsapp',
      )
    ) {
      return (
        'تعذر حفظ رقم الواتساب.\n\nتحقق من رقم الواتساب المدخل.'
      )
    }

    if (
      combined.includes(
        'permission',
      ) ||
      combined.includes(
        'row-level security',
      ) ||
      combined.includes(
        'rls',
      )
    ) {
      return (
        'تم رفض العملية من قاعدة البيانات.\n\nلا توجد صلاحية كافية لتنفيذ هذه العملية.'
      )
    }

    if (
      combined.includes(
        'invalid input',
      ) ||
      combined.includes(
        'invalid value',
      )
    ) {
      return (
        'إحدى البيانات المدخلة غير صحيحة.\n\nتحقق من جميع الحقول وحاول مرة أخرى.'
      )
    }

    return (
      message ||
      'حدث خطأ غير معروف أثناء حفظ الطالب.'
    )
  }

  async function handleSubmit(
    e: FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault()

    closeError()

    const form = e.currentTarget

    const data = new FormData(form)

    const name = String(
      data.get('name') || '',
    ).trim()

    const personalId =
      String(
        data.get('personalId') || '',
      ).trim()

    const guardianRelationSelection =
      String(
        data.get(
          'guardianRelation',
        ) || '',
      ).trim()

    const customGuardianRelationValue =
      String(
        data.get(
          'customGuardianRelation',
        ) || '',
      ).trim()

    const guardianRelation =
      guardianRelationSelection ===
      'أخرى'
        ? customGuardianRelationValue
        : guardianRelationSelection

    const grade = String(
      data.get('grade') || '',
    )

    const phone = String(
      data.get('phone') || '',
    ).trim()

    const whatsapp =
      String(
        data.get('whatsapp') || '',
      ).trim()

    const chronicDiseases =
      String(
        data.get(
          'chronicDiseases',
        ) || '',
      ).trim()

    const amountPaid =
      Number(
        data.get('amountPaid') || 0,
      )

    const notes = String(
      data.get('notes') || '',
    ).trim()

    if (
      personalId &&
      !/^\d{1,9}$/.test(
        personalId,
      )
    ) {
      showError(
        'الرقم الشخصي غير صحيح.\n\nيسمح بإدخال أرقام فقط وبحد أقصى 9 أرقام.',
      )
      return
    }

    if (
      phone &&
      !/^\d{1,8}$/.test(phone)
    ) {
      showError(
        'رقم الهاتف غير صحيح.\n\nيسمح بإدخال أرقام فقط وبحد أقصى 8 أرقام.',
      )
      return
    }

    if (
      whatsapp &&
      !/^\d{1,8}$/.test(
        whatsapp,
      )
    ) {
      showError(
        'رقم الواتساب غير صحيح.\n\nيسمح بإدخال أرقام فقط وبحد أقصى 8 أرقام.',
      )
      return
    }

    if (
      guardianRelationSelection ===
        'أخرى' &&
      !customGuardianRelationValue
    ) {
      showError(
        'يرجى كتابة صلة القرابة عند اختيار "أخرى".',
      )
      return
    }

    const missingFields: string[] =
      []

    if (!name) {
      missingFields.push(
        'اسم الطالب',
      )
    }

    if (!personalId) {
      missingFields.push(
        'الرقم الشخصي',
      )
    }

    if (!grade) {
      missingFields.push(
        'الصف الأكاديمي',
      )
    }

    if (
      missingFields.length > 0
    ) {
      showError(
        `يرجى تعبئة الحقول التالية:\n\n• ${missingFields.join(
          '\n• ',
        )}`,
      )
      return
    }

    if (
      personalId.length < 5
    ) {
      showError(
        'الرقم الشخصي غير صحيح.\n\nيجب إدخال الرقم الشخصي كاملًا.',
      )
      return
    }

    if (
      !Number.isFinite(
        amountPaid,
      ) ||
      amountPaid < 0
    ) {
      showError(
        'المبلغ المدفوع غير صحيح.\n\nيجب أن يكون المبلغ صفرًا أو مبلغًا موجبًا.',
      )
      return
    }

    if (!currentAcademicYearId) {
      showError(
        'لا توجد سنة دراسية حالية مفعلة.\n\nيجب تفعيل سنة دراسية قبل تسجيل الطالب.',
      )
      return
    }

    const selectedLevel =
      academicLevels.find(
        (level) =>
          level.name === grade,
      )

    if (!selectedLevel) {
      showError(
        `الصف الأكاديمي "${grade}" غير موجود.\n\nاختر صفًا موجودًا في قائمة الصفوف.`,
      )
      return
    }

    if (
      !editingStudent &&
      amountPaid >
        currentAnnualFee &&
      currentAnnualFee > 0
    ) {
      showError(
        `المبلغ المدفوع أكبر من الرسوم السنوية.\n\nالرسوم السنوية: ${currentAnnualFee.toFixed(
          3,
        )} د.ب\nالمبلغ المدخل: ${amountPaid.toFixed(
          3,
        )} د.ب`,
      )
      return
    }

    const {
      data: duplicateStudents,
      error: duplicateCheckError,
    } = await supabase
      .from('students')
      .select(
        'id, name, personal_id',
      )
      .eq(
        'personal_id',
        personalId,
      )

    if (duplicateCheckError) {
      showError(
        `تعذر التحقق من الرقم الشخصي.\n\n${getDatabaseErrorMessage(
          duplicateCheckError,
        )}`,
      )
      return
    }

    const duplicateStudent =
      duplicateStudents?.find(
        (student) =>
          student.id !==
          editingStudent?.id,
      )

    if (duplicateStudent) {
      showError(
        `الرقم الشخصي "${personalId}" مستخدم مسبقًا.\n\nالطالب المسجل بهذا الرقم:\n"${duplicateStudent.name}"\n\nلا يمكن تسجيل طالب آخر بنفس الرقم الشخصي.`,
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
          guardian_relation:
            guardianRelation,
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
          'id, student_id, name, personal_id, guardian_relation, phone, whatsapp, notes, health_notes, status, fee_exempt, source',
        )
        .single()

      if (error) {
        showError(
          `تعذر تعديل بيانات الطالب.\n\n${getDatabaseErrorMessage(
            error,
          )}`,
        )
        return
      }

      const {
        data: existingEnrollment,
        error:
          enrollmentLookupError,
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
        showError(
          `تعذر قراءة ربط الطالب بالصف الأكاديمي.\n\n${getDatabaseErrorMessage(
            enrollmentLookupError,
          )}`,
        )
        return
      }

      if (existingEnrollment) {
        const {
          error:
            enrollmentUpdateError,
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
          showError(
            `تعذر تعديل الصف الأكاديمي.\n\n${getDatabaseErrorMessage(
              enrollmentUpdateError,
            )}`,
          )
          return
        }
      } else {
        const {
          error:
            enrollmentInsertError,
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
            course_id:
              currentCourse?.id ?? null,
            status: 'نشط',
            join_date:
              getTodayString(),
          })

        if (enrollmentInsertError) {
          showError(
            `تعذر ربط الطالب بالصف الأكاديمي.\n\n${getDatabaseErrorMessage(
              enrollmentInsertError,
            )}`,
          )
          return
        }
      }

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
                    guardianRelation:
                      updatedStudent.guardian_relation ??
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
        'تم تعديل الطالب وربط الصف الأكاديمي في Supabase ✅',
      )

      closeStudentDrawer()

      form.reset()

      return
    }

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
        guardian_relation:
          guardianRelation,
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
        'id, student_id, name, personal_id, guardian_relation, phone, whatsapp, notes, health_notes, status, fee_exempt, source',
      )
      .single()

    if (error) {
      showError(
        `تعذر حفظ الطالب.\n\n${getDatabaseErrorMessage(
          error,
        )}`,
      )
      return
    }

    /*
     * ============================================================
     * ربط الصف الأكاديمي والدورة الحالية
     * ============================================================
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
        course_id:
          currentCourse?.id ?? null,
        status: 'نشط',
        join_date:
          getTodayString(),
      })

    if (enrollmentError) {
      await supabase
        .from('students')
        .delete()
        .eq(
          'id',
          newStudent.id,
        )

      showError(
        `تم إنشاء الطالب، ولكن تعذر ربطه بالصف الأكاديمي.\n\n${getDatabaseErrorMessage(
          enrollmentError,
        )}\n\nتم إلغاء إنشاء الطالب تلقائيًا حتى لا تبقى بيانات ناقصة.`,
      )

      return
    }

    /*
     * ============================================================
     * الدفعة الأولى
     * ============================================================
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
          amount: amountPaid,
          payment_method:
            'نقدي',
          payment_date:
            new Date()
              .toISOString()
              .slice(0, 10),
        })

      if (paymentError) {
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

        showError(
          `تم رفض الدفعة الأولى.\n\n${getDatabaseErrorMessage(
            paymentError,
          )}\n\nتم إلغاء تسجيل الطالب بالكامل حتى لا تبقى عملية ناقصة.`,
        )

        return
      }
    }

    /*
     * ============================================================
     * حالة الدفع
     * ============================================================
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
     * ============================================================
     * تجهيز الطالب للقائمة
     * ============================================================
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

      guardianRelation:
        newStudent.guardian_relation ??
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
        newStudent.notes ?? '',

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

    setSupabaseStatus(
      amountPaid > 0
        ? 'تم حفظ الطالب والدفعة الأولى وربط الصف الأكاديمي في Supabase ✅'
        : 'تم حفظ الطالب وربط الصف الأكاديمي في Supabase ✅',
    )

    closeStudentDrawer()

    form.reset()
  }

  return (
    <>
      {isErrorOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div
            dir="rtl"
            className="w-full max-w-md overflow-hidden rounded-xl border border-red-200 bg-background shadow-2xl"
          >
            <div className="flex items-start gap-3 border-b border-red-200 bg-red-50 px-5 py-4 dark:bg-red-950/30">
              <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400">
                <AlertCircle className="size-5" />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold text-red-700 dark:text-red-400">
                  تعذر حفظ الطالب
                </h3>

                <p className="mt-1 text-sm text-red-600/90 dark:text-red-300/90">
                  يرجى مراجعة السبب أدناه.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeError
                }
                className="rounded-md p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40"
                aria-label="إغلاق رسالة الخطأ"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="whitespace-pre-line px-5 py-5 text-sm leading-7">
              {errorMessage}
            </div>

            <div className="flex justify-end border-t bg-muted/20 px-5 py-4">
              <Button
                type="button"
                variant="destructive"
                onClick={
                  closeError
                }
              >
                فهمت
              </Button>
            </div>
          </div>
        </div>
      )}

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
            onSubmit={
              handleSubmit
            }
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
                    defaultValue={
                      editingStudent?.personalId ??
                      ''
                    }
                    placeholder="أدخل الرقم الشخصي"
                    maxLength={9}
                    inputMode="numeric"
                    onChange={(event) => {
                      event.currentTarget.value =
                        event.currentTarget.value
                          .replace(/\D/g, '')
                          .slice(0, 9)
                    }}
                    dir="ltr"
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
                  />

                  <p className="mt-1 text-xs text-muted-foreground">
                    أرقام فقط، بحد أقصى 9 أرقام.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    صلة القرابة
                  </label>

                  <select
                    name="guardianRelation"
                    value={
                      selectedGuardianRelation
                    }
                    onChange={(
                      event,
                    ) => {
                      const value =
                        event.target
                          .value

                      setSelectedGuardianRelation(
                        value,
                      )

                      if (
                        value !==
                        'أخرى'
                      ) {
                        setCustomGuardianRelation(
                          '',
                        )
                      }
                    }}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
                  >
                    <option value="">
                      اختر صلة القرابة
                    </option>

                    <option value="الأب">
                      الأب
                    </option>

                    <option value="الأم">
                      الأم
                    </option>

                    <option value="الأخ">
                      الأخ
                    </option>

                    <option value="الأخت">
                      الأخت
                    </option>

                    <option value="الجد">
                      الجد
                    </option>

                    <option value="الجدة">
                      الجدة
                    </option>

                    <option value="أخرى">
                      أخرى
                    </option>
                  </select>

                  {selectedGuardianRelation ===
                    'أخرى' && (
                    <input
                      id="customGuardianRelation"
                      name="customGuardianRelation"
                      type="text"
                      value={
                        customGuardianRelation
                      }
                      onChange={(
                        event,
                      ) =>
                        setCustomGuardianRelation(
                          event.target
                            .value,
                        )
                      }
                      placeholder="اكتب صلة القرابة"
                      required
                      autoFocus
                      className="mt-3 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
                    />
                  )}
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
                          key={
                            level.id
                          }
                          value={
                            level.name
                          }
                        >
                          {
                            level.name
                          }
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
                    defaultValue={
                      editingStudent?.phone ??
                      ''
                    }
                    placeholder="مثال: 33xxxxxx"
                    maxLength={8}
                    inputMode="numeric"
                    onChange={(event) => {
                      event.currentTarget.value =
                        event.currentTarget.value
                          .replace(/\D/g, '')
                          .slice(0, 8)
                    }}
                    dir="ltr"
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
                  />

                  <p className="mt-1 text-xs text-muted-foreground">
                    أرقام فقط، بحد أقصى 8 أرقام.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    رقم واتساب
                  </label>

                  <input
                    name="whatsapp"
                    type="tel"
                    defaultValue={
                      editingStudent?.whatsapp ??
                      ''
                    }
                    placeholder="مثال: 33xxxxxx"
                    maxLength={8}
                    inputMode="numeric"
                    onChange={(event) => {
                      event.currentTarget.value =
                        event.currentTarget.value
                          .replace(/\D/g, '')
                          .slice(0, 8)
                    }}
                    dir="ltr"
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
                  />

                  <p className="mt-1 text-xs text-muted-foreground">
                    أرقام فقط، بحد أقصى 8 أرقام.
                  </p>
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
    </>
  )
}
