
import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/authorization'

import {
  type StudentDateChangeLog,
  insertStudentDateChangeLog,
  loadCourseForDateValidation,
  loadAcademicYearForDateValidation,
  loadEnrollmentForDateValidation,
  loadStudentAssignmentDates,
  processUnjoinedAttendance as processUnjoinedAttendanceRepository,

  // GET
  loadAdminStudent,
  loadAdminStudentEnrollments,
  loadAdminStudentAssignments,
  searchAdminStudents,
  loadStudentDeletionSetting,

  // PATCH
  updateStudentDeletionSetting,
  updateEnrollmentJoinDate,
  rollbackEnrollmentJoinDate,
  loadAssignmentForDateUpdate,
  loadStudentEnrollmentsForAssignmentDate,
  updateAssignmentCreatedAt,
  rollbackAssignmentCreatedAt,

  // POST
  loadStudentDeletionEnabledSetting,
  deleteStudentCompletely,
} from '@/lib/features/students/repositories/students-admin.repository'
const DELETE_SETTING_PERMISSION = 'students.delete_setting.manage'
const STUDENT_DATES_PERMISSION = 'students.dates.manage'

async function authorize(permissionKey: string, message: string) {
  const result = await requirePermission(permissionKey)

  if (result.error || !result.access) {
    return {
      allowed: false as const,
      response:
        result.error ??
        NextResponse.json({ error: message }, { status: 403 }),
    }
  }

  return { allowed: true as const }
}

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
}

function isValidDate(value: unknown): value is string {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false
  }

  const date = new Date(`${value}T00:00:00.000Z`)

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  )
}

function getTodayDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bahrain',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  return `${year}-${month}-${day}`
}

/**
 * تحويل timestamp إلى تاريخ البحرين بصيغة YYYY-MM-DD.
 */
function getBahrainDate(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bahrain',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  if (!year || !month || !day) {
    return null
  }

  return `${year}-${month}-${day}`
}

function cleanSearch(value: string) {
  return value.replace(/[%_,()]/g, '').trim().slice(0, 100)
}

/**
 * تحويل تاريخ البحرين إلى timestamp عند منتصف الليل.
 * يحافظ على استخدام created_at كمصدر لتاريخ التعيين،
 * ويغيّر التاريخ وفق اليوم المطلوب في البحرين.
 */
function getBahrainMidnightTimestamp(date: string) {
  return new Date(`${date}T00:00:00+03:00`).toISOString()
}

/**
 * تسجيل تعديل التاريخ.
 *
 * changed_by غير محدد هنا لأن authorize لا يعيد هوية المستخدم.
 * يظل الحقل NULL إلى أن تتوفر هوية المستخدم من نظام المصادقة.
 */
async function insertDateChangeLog(log: StudentDateChangeLog) {
  const { error } = await insertStudentDateChangeLog(log)

  if (error) {
    console.error('Insert student date change log:', error)
    return false
  }

  return true
}

/**
 * التحقق من تاريخ الانضمام مقابل الدورة والسنة الدراسية.
 */
async function validateDateWithinCourseAndYear(
  courseId: string,
  joinDate: string,
  expectedAcademicYearId?: string | null,
) {
  if (joinDate > getTodayDate()) {
    return NextResponse.json(
      { error: 'لا يمكن اختيار تاريخ في المستقبل.' },
      { status: 400 },
    )
  }

  const { data: course, error: courseError } =
    await loadCourseForDateValidation(courseId)

  if (courseError) {
    console.error('Read course for date validation:', courseError)

    return NextResponse.json(
      { error: 'تعذر التحقق من تواريخ الدورة.' },
      { status: 500 },
    )
  }

  if (!course) {
    return NextResponse.json(
      { error: 'الدورة المرتبطة غير موجودة.' },
      { status: 400 },
    )
  }

  if (
    !course.start_date ||
    !course.end_date ||
    !isValidDate(course.start_date) ||
    !isValidDate(course.end_date)
  ) {
    return NextResponse.json(
      {
        error:
          'تواريخ بداية الدورة ونهايتها غير مكتملة أو غير صالحة.',
      },
      { status: 400 },
    )
  }

  if (course.start_date > course.end_date) {
    return NextResponse.json(
      { error: 'تاريخ بداية الدورة يتجاوز تاريخ نهايتها.' },
      { status: 400 },
    )
  }

  if (
    expectedAcademicYearId &&
    course.academic_year_id !== expectedAcademicYearId
  ) {
    return NextResponse.json(
      {
        error:
          'السنة الدراسية للتسجيل لا تطابق السنة الدراسية المرتبطة بالدورة.',
      },
      { status: 400 },
    )
  }

  if (joinDate < course.start_date) {
    return NextResponse.json(
      {
        error:
          'تاريخ الانضمام لا يمكن أن يكون قبل تاريخ بداية الدورة.',
      },
      { status: 400 },
    )
  }

  if (joinDate > course.end_date) {
    return NextResponse.json(
      {
        error:
          'تاريخ الانضمام لا يمكن أن يكون بعد تاريخ نهاية الدورة.',
      },
      { status: 400 },
    )
  }

  if (!course.academic_year_id) {
    return NextResponse.json(
      { error: 'الدورة غير مرتبطة بسنة دراسية.' },
      { status: 400 },
    )
  }

  const { data: academicYear, error: academicYearError } =
    await loadAcademicYearForDateValidation(
      course.academic_year_id,
    )

  if (academicYearError) {
    console.error(
      'Read academic year for date validation:',
      academicYearError,
    )

    return NextResponse.json(
      { error: 'تعذر التحقق من تواريخ السنة الدراسية.' },
      { status: 500 },
    )
  }

  if (!academicYear) {
    return NextResponse.json(
      { error: 'السنة الدراسية المرتبطة بالدورة غير موجودة.' },
      { status: 400 },
    )
  }

  if (
    !academicYear.start_date ||
    !academicYear.end_date ||
    !isValidDate(academicYear.start_date) ||
    !isValidDate(academicYear.end_date)
  ) {
    return NextResponse.json(
      {
        error:
          'تواريخ بداية السنة الدراسية ونهايتها غير مكتملة أو غير صالحة.',
      },
      { status: 400 },
    )
  }

  if (academicYear.start_date > academicYear.end_date) {
    return NextResponse.json(
      {
        error:
          'تاريخ بداية السنة الدراسية يتجاوز تاريخ نهايتها.',
      },
      { status: 400 },
    )
  }

  if (
    joinDate < academicYear.start_date ||
    joinDate > academicYear.end_date
  ) {
    return NextResponse.json(
      {
        error:
          'تاريخ الانضمام يجب أن يقع ضمن السنة الدراسية المرتبطة بالدورة.',
      },
      { status: 400 },
    )
  }

  return null
}

/**
 * التحقق من تاريخ انضمام الطالب للدورة،
 * ومن عدم تجاوزه تاريخ إنشاء أول تعيين للطالب لدى معلم.
 */
async function validateEnrollmentJoinDate(
  enrollmentId: string,
  newJoinDate: string,
) {
  const { data: enrollment, error: enrollmentError } =
    await loadEnrollmentForDateValidation(enrollmentId)

  if (enrollmentError) {
    console.error(
      'Read enrollment before date validation:',
      enrollmentError,
    )

    return {
      error: NextResponse.json(
        { error: 'تعذر التحقق من تسجيل الطالب.' },
        { status: 500 },
      ),
    }
  }

  if (!enrollment) {
    return {
      error: NextResponse.json(
        { error: 'التسجيل المطلوب غير موجود.' },
        { status: 404 },
      ),
    }
  }

  const dateError = await validateDateWithinCourseAndYear(
    enrollment.course_id,
    newJoinDate,
    enrollment.academic_year_id,
  )

  if (dateError) {
    return { error: dateError }
  }

  const {
    data: assignments,
    error: assignmentsError,
  } = await loadStudentAssignmentDates(
    enrollment.student_id,
    enrollment.course_id,
  )

  if (assignmentsError) {
    console.error('Read assignment dates:', assignmentsError)

    return {
      error: NextResponse.json(
        { error: 'تعذر التحقق من تواريخ تعيين المعلمين.' },
        { status: 500 },
      ),
    }
  }

  const assignmentDates = (assignments ?? [])
    .map((assignment) => getBahrainDate(assignment.created_at))
    .filter((date): date is string => Boolean(date))
    .sort()

  const earliestAssignmentDate = assignmentDates[0]

  if (
    earliestAssignmentDate &&
    newJoinDate > earliestAssignmentDate
  ) {
    return {
      error: NextResponse.json(
        {
          error:
            'تاريخ انضمام الدورة يجب أن يكون قبل أو يساوي تاريخ تعيين الطالب للمعلم.',
        },
        { status: 400 },
      ),
    }
  }

  return {
    enrollment,
    error: null,
  }
}

/**
 * تشغيل معالجة سجلات «غير منضم» للتسجيل.
 */
async function processUnjoinedAttendance(enrollmentId: string) {
  const { error } =
    await processUnjoinedAttendanceRepository(enrollmentId)

  if (error) {
    console.error(
      'Process unjoined attendance:',
      enrollmentId,
      error,
    )

    return false
  }

  return true
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const operation = url.searchParams.get('operation')

  if (operation === 'dates') {
    const authorization = await authorize(
      STUDENT_DATES_PERMISSION,
      'ليس لديك صلاحية إدارة تواريخ الطلاب.',
    )

    if (!authorization.allowed) {
      return authorization.response
    }

    const studentId = url.searchParams.get('studentId')

    if (studentId) {
      if (!isValidUuid(studentId)) {
        return NextResponse.json(
          { error: 'معرّف الطالب غير صالح.' },
          { status: 400 },
        )
      }

      const { data: student, error: studentError } =
        await loadAdminStudent(studentId)

      if (studentError) {
        console.error('Read student:', studentError)

        return NextResponse.json(
          { error: 'تعذر تحميل بيانات الطالب.' },
          { status: 500 },
        )
      }

      if (!student) {
        return NextResponse.json(
          { error: 'الطالب غير موجود.' },
          { status: 404 },
        )
      }

      const [
        { data: enrollments, error: enrollmentError },
        { data: assignmentRows, error: assignmentError },
      ] = await Promise.all([
        loadAdminStudentEnrollments(studentId),
        loadAdminStudentAssignments(studentId),
      ])

      if (enrollmentError || assignmentError) {
        console.error(
          'Read student dates:',
          enrollmentError ?? assignmentError,
        )

        return NextResponse.json(
          { error: 'تعذر تحميل تسجيلات الطالب وتوزيعاته.' },
          { status: 500 },
        )
      }

      // اسم join_date هنا خاص باستجابة API فقط.
      // مصدر تاريخ التعيين هو created_at في قاعدة البيانات.
      const assignments = (assignmentRows ?? []).map(
        (assignment) => ({
          ...assignment,
          join_date: getBahrainDate(assignment.created_at),
        }),
      )

      return NextResponse.json({
        student,
        enrollments: enrollments ?? [],
        assignments,
      })
    }

    const search = cleanSearch(
      url.searchParams.get('search') ?? '',
    )

    if (search.length < 2) {
      return NextResponse.json({ students: [] })
    }

    const {
      byName,
      byPersonalId,
      byStudentId,
    } = await searchAdminStudents(search)

    const searchError =
      byName.error ??
      byPersonalId.error ??
      byStudentId.error

    if (searchError) {
      console.error('Search students:', searchError)

      return NextResponse.json(
        { error: 'تعذر البحث عن الطلاب.' },
        { status: 500 },
      )
    }

    const uniqueStudents = new Map<
      string,
      {
        id: string
        student_id: string | null
        name: string
        personal_id: string | null
      }
    >()

    for (const student of [
      ...(byName.data ?? []),
      ...(byPersonalId.data ?? []),
      ...(byStudentId.data ?? []),
    ]) {
      uniqueStudents.set(student.id, student)
    }

    return NextResponse.json({
      students: Array.from(uniqueStudents.values()).slice(0, 30),
    })
  }

  const authorization = await authorize(
    DELETE_SETTING_PERMISSION,
    'ليس لديك صلاحية لإدارة إعداد حذف الطلاب.',
  )

  if (!authorization.allowed) {
    return authorization.response
  }

  const { data, error } = await loadStudentDeletionSetting()

  if (error) {
    console.error('Read student deletion settings:', error)

    return NextResponse.json(
      { error: 'تعذر قراءة إعداد حذف الطلاب.' },
      { status: 500 },
    )
  }

  if (!data) {
    return NextResponse.json(
      { error: 'إعداد حذف الطلاب غير موجود.' },
      { status: 500 },
    )
  }

  return NextResponse.json({
    deletionEnabled: data.deletion_enabled,
    updatedAt: data.updated_at,
  })
}

export async function PATCH(request: Request) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'البيانات المرسلة غير صالحة.' },
      { status: 400 },
    )
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json(
      { error: 'البيانات المرسلة غير صالحة.' },
      { status: 400 },
    )
  }

  const payload = body as Record<string, unknown>

  /*
   * تعديل تاريخ انضمام الطالب للدورة مع تسجيل التعديل.
   */
  if (payload.operation === 'updateEnrollmentJoinDate') {
    const authorization = await authorize(
      STUDENT_DATES_PERMISSION,
      'ليس لديك صلاحية تعديل تواريخ الطلاب.',
    )

    if (!authorization.allowed) {
      return authorization.response
    }

    if (
      !isValidUuid(payload.enrollmentId) ||
      !isValidDate(payload.joinDate)
    ) {
      return NextResponse.json(
        {
          error:
            'معرّف التسجيل أو تاريخ الانضمام غير صالح.',
        },
        { status: 400 },
      )
    }

    const enrollmentId = payload.enrollmentId
    const joinDate = payload.joinDate

    const validation = await validateEnrollmentJoinDate(
      enrollmentId,
      joinDate,
    )

    if (validation.error) {
      return validation.error
    }

    const oldDate = validation.enrollment.join_date

    if (oldDate === joinDate) {
      const processed = await processUnjoinedAttendance(enrollmentId)

      return NextResponse.json({
        success: true,
        enrollment: validation.enrollment,
        ...(processed
          ? {}
          : {
              warning:
                'لم يتغير التاريخ، لكن تعذرت معالجة سجلات «غير منضم».',
            }),
      })
    }

    const { data: enrollment, error: updateError } =
      await updateEnrollmentJoinDate(enrollmentId, joinDate)

    if (updateError) {
      console.error(
        'Update enrollment join date:',
        updateError,
      )

      return NextResponse.json(
        { error: 'تعذر حفظ تاريخ انضمام الطالب للدورة.' },
        { status: 500 },
      )
    }

    if (!enrollment) {
      return NextResponse.json(
        { error: 'التسجيل المطلوب غير موجود.' },
        { status: 404 },
      )
    }

    const logged = await insertDateChangeLog({
      student_id: enrollment.student_id,
      entity_type: 'enrollment',
      entity_id: enrollment.id,
      date_field: 'join_date',
      old_date: oldDate,
      new_date: joinDate,
    })

    if (!logged) {
      // محاولة إعادة التاريخ السابق إذا تعذّر تسجيل التدقيق.
      const { error: rollbackError } =
        await rollbackEnrollmentJoinDate(
          enrollment.id,
          oldDate,
        )

      if (rollbackError) {
        console.error(
          'Rollback enrollment date after audit failure:',
          rollbackError,
        )
      }

      return NextResponse.json(
        {
          error:
            'تعذر تسجيل تعديل التاريخ في سجل التدقيق. تمت محاولة إعادة التاريخ السابق.',
        },
        { status: 500 },
      )
    }

    const processed = await processUnjoinedAttendance(
      enrollment.id,
    )

    if (!processed) {
      return NextResponse.json({
        success: true,
        enrollment,
        warning:
          'تم حفظ التاريخ وتسجيل التعديل، لكن تعذرت معالجة سجلات «غير منضم». لم تُحذف سجلات الحضور الموجودة.',
      })
    }

    return NextResponse.json({
      success: true,
      enrollment,
      message:
        'تم حفظ تاريخ انضمام الطالب للدورة وتسجيل التعديل وتشغيل معالجة «غير منضم».',
    })
  }

  /*
   * تعديل تاريخ تعيين الطالب عند المعلم.
   *
   * المصدر يظل teacher_student_assignments.created_at.
   * نحدّث التاريخ نفسه ولا نضيف حقل تاريخ بديل.
   */
  if (payload.operation === 'updateAssignmentJoinDate') {
    const authorization = await authorize(
      STUDENT_DATES_PERMISSION,
      'ليس لديك صلاحية تعديل تواريخ الطلاب.',
    )

    if (!authorization.allowed) {
      return authorization.response
    }

    if (
      !isValidUuid(payload.assignmentId) ||
      !isValidDate(payload.joinDate)
    ) {
      return NextResponse.json(
        {
          error:
            'معرّف التعيين أو تاريخ التعيين غير صالح.',
        },
        { status: 400 },
      )
    }

    const assignmentId = payload.assignmentId
    const joinDate = payload.joinDate

    const {
      data: assignment,
      error: assignmentError,
    } = await loadAssignmentForDateUpdate(assignmentId)

    if (assignmentError) {
      console.error(
        'Read assignment before update:',
        assignmentError,
      )

      return NextResponse.json(
        { error: 'تعذر قراءة سجل تعيين الطالب.' },
        { status: 500 },
      )
    }

    if (!assignment) {
      return NextResponse.json(
        { error: 'سجل تعيين الطالب غير موجود.' },
        { status: 404 },
      )
    }

    const oldDate = getBahrainDate(assignment.created_at)

    if (!oldDate) {
      return NextResponse.json(
        { error: 'تاريخ التعيين الحالي غير صالح.' },
        { status: 400 },
      )
    }

    const dateError = await validateDateWithinCourseAndYear(
      assignment.course_id,
      joinDate,
    )

    if (dateError) {
      return dateError
    }

    /*
     * لا نسمح بأن يصبح تاريخ تعيين الطالب بعد تاريخ انضمامه للدورة.
     */
    const {
      data: enrollments,
      error: enrollmentsError,
    } = await loadStudentEnrollmentsForAssignmentDate(
      assignment.student_id,
      assignment.course_id,
    )

    if (enrollmentsError) {
      console.error(
        'Read enrollments for assignment date validation:',
        enrollmentsError,
      )

      return NextResponse.json(
        { error: 'تعذر التحقق من تاريخ انضمام الطالب للدورة.' },
        { status: 500 },
      )
    }

    const conflictingEnrollment = (enrollments ?? []).find(
      (enrollment) =>
        enrollment.join_date &&
        isValidDate(enrollment.join_date) &&
        joinDate < enrollment.join_date,
    )

    if (conflictingEnrollment) {
      return NextResponse.json(
        {
          error:
            'تاريخ تعيين الطالب للمعلم لا يمكن أن يكون قبل تاريخ انضمام الطالب للدورة.',
        },
        { status: 400 },
      )
    }

    if (oldDate === joinDate) {
      return NextResponse.json({
        success: true,
        assignment: {
          ...assignment,
          join_date: oldDate,
        },
        message: 'التاريخ المحدد هو تاريخ التعيين الحالي.',
      })
    }

    const previousCreatedAt = assignment.created_at
    const newCreatedAt = getBahrainMidnightTimestamp(joinDate)

    const {
      data: updatedAssignment,
      error: updateError,
    } = await updateAssignmentCreatedAt(
      assignmentId,
      newCreatedAt,
    )

    if (updateError) {
      console.error(
        'Update assignment created_at:',
        updateError,
      )

      return NextResponse.json(
        { error: 'تعذر حفظ تاريخ تعيين الطالب عند المعلم.' },
        { status: 500 },
      )
    }

    if (!updatedAssignment) {
      return NextResponse.json(
        { error: 'سجل تعيين الطالب غير موجود.' },
        { status: 404 },
      )
    }

    const logged = await insertDateChangeLog({
      student_id: assignment.student_id,
      entity_type: 'teacher_assignment',
      entity_id: assignment.id,
      date_field: 'created_at',
      old_date: oldDate,
      new_date: joinDate,
    })

    if (!logged) {
      // محاولة استرجاع timestamp الأصلي كاملًا، لا التاريخ فقط.
      const { error: rollbackError } =
        await rollbackAssignmentCreatedAt(
          assignment.id,
          previousCreatedAt,
        )

      if (rollbackError) {
        console.error(
          'Rollback assignment date after audit failure:',
          rollbackError,
        )
      }

      return NextResponse.json(
        {
          error:
            'تعذر تسجيل تعديل التاريخ في سجل التدقيق. تمت محاولة إعادة تاريخ التعيين السابق.',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      assignment: {
        ...updatedAssignment,
        join_date: getBahrainDate(updatedAssignment.created_at),
      },
      message:
        'تم تعديل تاريخ تعيين الطالب عند المعلم وتسجيل التعديل.',
    })
  }

  /*
   * إعداد حذف الطلاب.
   */
  const authorization = await authorize(
    DELETE_SETTING_PERMISSION,
    'ليس لديك صلاحية لإدارة إعداد حذف الطلاب.',
  )

  if (!authorization.allowed) {
    return authorization.response
  }

  if (typeof payload.deletionEnabled !== 'boolean') {
    return NextResponse.json(
      {
        error:
          'يجب تحديد قيمة صحيحة للسماح بحذف الطلاب.',
      },
      { status: 400 },
    )
  }

  const { data, error } = await updateStudentDeletionSetting(
    payload.deletionEnabled,
    new Date().toISOString(),
  )

  if (error) {
    console.error(
      'Update student deletion settings:',
      error,
    )

    return NextResponse.json(
      { error: 'تعذر حفظ إعداد حذف الطلاب.' },
      { status: 500 },
    )
  }

  if (!data) {
    return NextResponse.json(
      { error: 'إعداد حذف الطلاب غير موجود.' },
      { status: 500 },
    )
  }

  return NextResponse.json({
    deletionEnabled: data.deletion_enabled,
    updatedAt: data.updated_at,
  })
}

export async function POST(request: Request) {
  // التحقق من صلاحية حذف الطلاب
  const authorization = await authorize(
    'students.delete',
    'ليس لديك صلاحية حذف الطلاب.',
  )

  if (!authorization.allowed) {
    return authorization.response
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'بيانات الطلب غير صالحة.' },
      { status: 400 },
    )
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !Array.isArray((body as { studentIds?: unknown }).studentIds)
  ) {
    return NextResponse.json(
      { error: 'يجب إرسال قائمة بمعرّفات الطلاب.' },
      { status: 400 },
    )
  }

  const rawIds = (body as { studentIds: unknown[] }).studentIds

  if (
    rawIds.length === 0 ||
    rawIds.length > 500 ||
    !rawIds.every(isValidUuid)
  ) {
    return NextResponse.json(
      { error: 'قائمة الطلاب غير صالحة أو تتجاوز الحد المسموح.' },
      { status: 400 },
    )
  }

  const studentIds = [...new Set(rawIds)]

  // التحقق من إعداد الحذف داخل الخادم
  const {
    data: setting,
    error: settingError,
  } = await loadStudentDeletionEnabledSetting()

  if (settingError) {
    console.error(
      'Read student deletion setting:',
      settingError,
    )

    return NextResponse.json(
      { error: 'تعذر التحقق من إعداد حذف الطلاب.' },
      { status: 500 },
    )
  }

  if (!setting || setting.deletion_enabled !== true) {
    return NextResponse.json(
      { error: 'حذف الطلاب معطّل حاليًا من إعدادات النظام.' },
      { status: 403 },
    )
  }

  const deletedIds: string[] = []

  for (const studentId of studentIds) {
    const { error } = await deleteStudentCompletely(studentId)

    if (error) {
      console.error('Delete student RPC failed:', {
        studentId,
        error,
      })

      return NextResponse.json(
        {
          error:
            'توقف الحذف قبل اكتمال جميع الطلاب. قد يكون بعض الطلاب قد حُذفوا بالفعل.',
          deletedIds,
        },
        { status: 500 },
      )
    }

    deletedIds.push(studentId)
  }

  return NextResponse.json({
    success: true,
    deletedIds,
  })
}
