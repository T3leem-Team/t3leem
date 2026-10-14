import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requirePermission } from '@/lib/auth/authorization';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

const DELETE_SETTING_PERMISSION = 'students.delete_setting.manage';
const STUDENT_DATES_PERMISSION = 'students.dates.manage';

async function authorize(permissionKey: string, message: string) {
  const result = await requirePermission(permissionKey);

  if (result.error || !result.access) {
    return {
      allowed: false as const,
      response:
        result.error ??
        NextResponse.json({ error: message }, { status: 403 }),
    };
  }

  return { allowed: true as const };
}

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function isValidDate(value: unknown): value is string {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function getTodayDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bahrain',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  return `${year}-${month}-${day}`;
}

/**
 * يحول timestamp إلى تاريخ البحرين بصيغة YYYY-MM-DD.
 */
function getBahrainDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bahrain',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    return null;
  }

  return `${year}-${month}-${day}`;
}

function cleanSearch(value: string) {
  return value.replace(/[%_,()]/g, '').trim().slice(0, 100);
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
    );
  }

  const { data: course, error: courseError } =
    await supabaseAdmin
      .from('courses')
      .select('id, start_date, end_date, academic_year_id')
      .eq('id', courseId)
      .maybeSingle();

  if (courseError) {
    console.error('Read course for date validation:', courseError);

    return NextResponse.json(
      { error: 'تعذر التحقق من تواريخ الدورة.' },
      { status: 500 },
    );
  }

  if (!course) {
    return NextResponse.json(
      { error: 'الدورة المرتبطة غير موجودة.' },
      { status: 400 },
    );
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
    );
  }

  if (course.start_date > course.end_date) {
    return NextResponse.json(
      { error: 'تاريخ بداية الدورة يتجاوز تاريخ نهايتها.' },
      { status: 400 },
    );
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
    );
  }

  if (joinDate < course.start_date) {
    return NextResponse.json(
      {
        error:
          'تاريخ الانضمام لا يمكن أن يكون قبل تاريخ بداية الدورة.',
      },
      { status: 400 },
    );
  }

  if (joinDate > course.end_date) {
    return NextResponse.json(
      {
        error:
          'تاريخ الانضمام لا يمكن أن يكون بعد تاريخ نهاية الدورة.',
      },
      { status: 400 },
    );
  }

  if (!course.academic_year_id) {
    return NextResponse.json(
      { error: 'الدورة غير مرتبطة بسنة دراسية.' },
      { status: 400 },
    );
  }

  const { data: academicYear, error: academicYearError } =
    await supabaseAdmin
      .from('academic_years')
      .select('id, start_date, end_date')
      .eq('id', course.academic_year_id)
      .maybeSingle();

  if (academicYearError) {
    console.error(
      'Read academic year for date validation:',
      academicYearError,
    );

    return NextResponse.json(
      { error: 'تعذر التحقق من تواريخ السنة الدراسية.' },
      { status: 500 },
    );
  }

  if (!academicYear) {
    return NextResponse.json(
      { error: 'السنة الدراسية المرتبطة بالدورة غير موجودة.' },
      { status: 400 },
    );
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
    );
  }

  if (academicYear.start_date > academicYear.end_date) {
    return NextResponse.json(
      {
        error:
          'تاريخ بداية السنة الدراسية يتجاوز تاريخ نهايتها.',
      },
      { status: 400 },
    );
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
    );
  }

  return null;
}

/**
 * يتحقق من تاريخ انضمام الطالب للدورة،
 * ومن عدم تجاوزه تاريخ إنشاء أول تعيين للطالب لدى معلم.
 */
async function validateEnrollmentJoinDate(
  enrollmentId: string,
  newJoinDate: string,
) {
  const { data: enrollment, error: enrollmentError } =
    await supabaseAdmin
      .from('enrollments')
      .select(
        'id, student_id, course_id, academic_year_id, join_date',
      )
      .eq('id', enrollmentId)
      .maybeSingle();

  if (enrollmentError) {
    console.error(
      'Read enrollment before date validation:',
      enrollmentError,
    );

    return {
      error: NextResponse.json(
        { error: 'تعذر التحقق من تسجيل الطالب.' },
        { status: 500 },
      ),
    };
  }

  if (!enrollment) {
    return {
      error: NextResponse.json(
        { error: 'التسجيل المطلوب غير موجود.' },
        { status: 404 },
      ),
    };
  }

  const dateError = await validateDateWithinCourseAndYear(
    enrollment.course_id,
    newJoinDate,
    enrollment.academic_year_id,
  );

  if (dateError) {
    return { error: dateError };
  }

  const {
    data: assignments,
    error: assignmentsError,
  } = await supabaseAdmin
    .from('teacher_student_assignments')
    .select('created_at')
    .eq('student_id', enrollment.student_id)
    .eq('course_id', enrollment.course_id)
    .not('created_at', 'is', null);

  if (assignmentsError) {
    console.error('Read assignment dates:', assignmentsError);

    return {
      error: NextResponse.json(
        { error: 'تعذر التحقق من تواريخ تعيين المعلمين.' },
        { status: 500 },
      ),
    };
  }

  const assignmentDates = (assignments ?? [])
    .map((assignment) =>
      getBahrainDate(assignment.created_at),
    )
    .filter((date): date is string => Boolean(date))
    .sort();

  const earliestAssignmentDate = assignmentDates[0];

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
    };
  }

  return {
    enrollment,
    error: null,
  };
}

/**
 * يشغّل معالجة سجلات «غير منضم» للتسجيل.
 */
async function processUnjoinedAttendance(enrollmentId: string) {
  const { error } = await supabaseAdmin.rpc(
    'create_unjoined_attendance_for_enrollment',
    { p_enrollment_id: enrollmentId },
  );

  if (error) {
    console.error(
      'Process unjoined attendance:',
      enrollmentId,
      error,
    );

    return false;
  }

  return true;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const operation = url.searchParams.get('operation');

  if (operation === 'dates') {
    const authorization = await authorize(
      STUDENT_DATES_PERMISSION,
      'ليس لديك صلاحية إدارة تواريخ الطلاب.',
    );

    if (!authorization.allowed) {
      return authorization.response;
    }

    const studentId = url.searchParams.get('studentId');

    if (studentId) {
      if (!isValidUuid(studentId)) {
        return NextResponse.json(
          { error: 'معرّف الطالب غير صالح.' },
          { status: 400 },
        );
      }

      const { data: student, error: studentError } =
        await supabaseAdmin
          .from('students')
          .select('id, student_id, name, personal_id')
          .eq('id', studentId)
          .maybeSingle();

      if (studentError) {
        console.error('Read student:', studentError);

        return NextResponse.json(
          { error: 'تعذر تحميل بيانات الطالب.' },
          { status: 500 },
        );
      }

      if (!student) {
        return NextResponse.json(
          { error: 'الطالب غير موجود.' },
          { status: 404 },
        );
      }

      const [
        { data: enrollments, error: enrollmentError },
        { data: assignmentRows, error: assignmentError },
      ] = await Promise.all([
        supabaseAdmin
          .from('enrollments')
          .select(
            'id, join_date, course_id, academic_year_id, level_id, status',
          )
          .eq('student_id', studentId)
          .order('created_at', { ascending: false }),

        supabaseAdmin
          .from('teacher_student_assignments')
          .select(
            'id, created_at, course_id, teacher_id, subject_id',
          )
          .eq('student_id', studentId)
          .order('created_at', { ascending: false }),
      ]);

      if (enrollmentError || assignmentError) {
        console.error(
          'Read student dates:',
          enrollmentError ?? assignmentError,
        );

        return NextResponse.json(
          { error: 'تعذر تحميل تسجيلات الطالب وتوزيعاته.' },
          { status: 500 },
        );
      }

      /*
       * نحافظ على اسم الحقل join_date في الاستجابة
       * لتفادي كسر الواجهة الحالية، لكن مصدره أصبح
       * created_at المحوّل إلى تاريخ البحرين.
       *
       * هذا اسم في استجابة API فقط، وليس عمودًا في قاعدة البيانات.
       */
      const assignments = (assignmentRows ?? []).map(
        (assignment) => ({
          ...assignment,
          join_date: getBahrainDate(assignment.created_at),
        }),
      );

      return NextResponse.json({
        student,
        enrollments: enrollments ?? [],
        assignments,
      });
    }

    const search = cleanSearch(
      url.searchParams.get('search') ?? '',
    );

    if (search.length < 2) {
      return NextResponse.json({ students: [] });
    }

    const [byName, byPersonalId, byStudentId] =
      await Promise.all([
        supabaseAdmin
          .from('students')
          .select('id, student_id, name, personal_id')
          .ilike('name', `%${search}%`)
          .limit(20),

        supabaseAdmin
          .from('students')
          .select('id, student_id, name, personal_id')
          .ilike('personal_id', `%${search}%`)
          .limit(20),

        supabaseAdmin
          .from('students')
          .select('id, student_id, name, personal_id')
          .ilike('student_id', `%${search}%`)
          .limit(20),
      ]);

    const searchError =
      byName.error ??
      byPersonalId.error ??
      byStudentId.error;

    if (searchError) {
      console.error('Search students:', searchError);

      return NextResponse.json(
        { error: 'تعذر البحث عن الطلاب.' },
        { status: 500 },
      );
    }

    const uniqueStudents = new Map<
      string,
      {
        id: string;
        student_id: string | null;
        name: string;
        personal_id: string | null;
      }
    >();

    for (const student of [
      ...(byName.data ?? []),
      ...(byPersonalId.data ?? []),
      ...(byStudentId.data ?? []),
    ]) {
      uniqueStudents.set(student.id, student);
    }

    return NextResponse.json({
      students: Array.from(uniqueStudents.values()).slice(0, 30),
    });
  }

  const authorization = await authorize(
    DELETE_SETTING_PERMISSION,
    'ليس لديك صلاحية لإدارة إعداد حذف الطلاب.',
  );

  if (!authorization.allowed) {
    return authorization.response;
  }

  const { data, error } = await supabaseAdmin
    .from('student_deletion_settings')
    .select('deletion_enabled, updated_at')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    console.error('Read student deletion settings:', error);

    return NextResponse.json(
      { error: 'تعذر قراءة إعداد حذف الطلاب.' },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: 'إعداد حذف الطلاب غير موجود.' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    deletionEnabled: data.deletion_enabled,
    updatedAt: data.updated_at,
  });
}

export async function PATCH(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'البيانات المرسلة غير صالحة.' },
      { status: 400 },
    );
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json(
      { error: 'البيانات المرسلة غير صالحة.' },
      { status: 400 },
    );
  }

  const payload = body as Record<string, unknown>;

  /*
   * تعديل تاريخ انضمام الطالب للدورة.
   */
  if (payload.operation === 'updateEnrollmentJoinDate') {
    const authorization = await authorize(
      STUDENT_DATES_PERMISSION,
      'ليس لديك صلاحية تعديل تواريخ الطلاب.',
    );

    if (!authorization.allowed) {
      return authorization.response;
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
      );
    }

    const enrollmentId = payload.enrollmentId;
    const joinDate = payload.joinDate;

    const validation = await validateEnrollmentJoinDate(
      enrollmentId,
      joinDate,
    );

    if (validation.error) {
      return validation.error;
    }

    const { data: enrollment, error: updateError } =
      await supabaseAdmin
        .from('enrollments')
        .update({ join_date: joinDate })
        .eq('id', enrollmentId)
        .select(
          'id, student_id, course_id, join_date',
        )
        .maybeSingle();

    if (updateError) {
      console.error(
        'Update enrollment join date:',
        updateError,
      );

      return NextResponse.json(
        {
          error:
            'تعذر حفظ تاريخ انضمام الطالب للدورة.',
        },
        { status: 500 },
      );
    }

    if (!enrollment) {
      return NextResponse.json(
        { error: 'التسجيل المطلوب غير موجود.' },
        { status: 404 },
      );
    }

    const processed = await processUnjoinedAttendance(
      enrollment.id,
    );

    if (!processed) {
      return NextResponse.json({
        success: true,
        enrollment,
        warning:
          'تم حفظ التاريخ، لكن تعذرت معالجة سجلات «غير منضم». لم تُحذف سجلات الحضور الموجودة.',
      });
    }

    return NextResponse.json({
      success: true,
      enrollment,
      message:
        'تم حفظ تاريخ انضمام الطالب للدورة وتشغيل معالجة «غير منضم».',
    });
  }

  /*
   * تاريخ تعيين المعلم أصبح مشتقًا من created_at.
   * لا نحدّث created_at عبر هذه العملية؛ لأنه تاريخ
   * إنشاء السجل وليس حقل تاريخ انضمام قابلًا للتعديل.
   */
  if (payload.operation === 'updateAssignmentJoinDate') {
    const authorization = await authorize(
      STUDENT_DATES_PERMISSION,
      'ليس لديك صلاحية تعديل تواريخ الطلاب.',
    );

    if (!authorization.allowed) {
      return authorization.response;
    }

    return NextResponse.json(
      {
        error:
          'تاريخ تعيين الطالب للمعلم يُحدد من تاريخ إنشاء سجل التعيين، ولم يعد حقلًا مستقلًا قابلًا للتعديل.',
      },
      { status: 400 },
    );
  }

  /*
   * إعداد حذف الطلاب.
   */
  const authorization = await authorize(
    DELETE_SETTING_PERMISSION,
    'ليس لديك صلاحية لإدارة إعداد حذف الطلاب.',
  );

  if (!authorization.allowed) {
    return authorization.response;
  }

  if (typeof payload.deletionEnabled !== 'boolean') {
    return NextResponse.json(
      {
        error:
          'يجب تحديد قيمة صحيحة للسماح بحذف الطلاب.',
      },
      { status: 400 },
    );
  }

  const { data, error } = await supabaseAdmin
    .from('student_deletion_settings')
    .update({
      deletion_enabled: payload.deletionEnabled,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)
    .select('deletion_enabled, updated_at')
    .maybeSingle();

  if (error) {
    console.error(
      'Update student deletion settings:',
      error,
    );

    return NextResponse.json(
      { error: 'تعذر حفظ إعداد حذف الطلاب.' },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: 'إعداد حذف الطلاب غير موجود.' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    deletionEnabled: data.deletion_enabled,
    updatedAt: data.updated_at,
  });
}
