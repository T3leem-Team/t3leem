import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/require-auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

type AttendanceStatus = {
  id: string
  name: string
}

type StudentRow = {
  id: string
  name: string
  personal_id: string | null
  phone: string | null
  whatsapp: string | null
  notes: string | null
}

type EnrollmentRow = {
  id: string
  student_id: string
  academic_year_id: string
  level_id: string
  class_id: string | null
  status: string | null
}

type AttendanceRow = {
  id: string
  student_id: string
  enrollment_id: string | null
  attendance_date: string
  status_id: string
  note: string | null
  course_id: string | null
}

type TripStudentRow = {
  id: string
  trip_id: string
  student_id: string
  enrollment_id: string | null
  attendance_percentage: number | null
  attendance_present: number | null
  attendance_absent: number | null
  attendance_late: number | null
  attendance_excused: number | null
  attendance_not_recorded: number | null
  eligibility_note: string | null
  selected: boolean | null
  response: string | null
  response_note: string | null
  responded_at: string | null
}

function normalizePercentage(
  value: number | null | undefined,
) {
  if (value === null || value === undefined) {
    return null
  }

  return Math.round(Number(value) * 100) / 100
}

/*
 * حساب الحضور بنفس قاعدة النظام:
 *
 * حاضر + متأخر + مستأذن = حضور
 * غائب = ضمن المقام
 * لم يسجل = خارج المقام
 */
function calculateAttendance(
  records: AttendanceRow[],
  statusMap: Map<string, string>,
) {
  let present = 0
  let absent = 0
  let late = 0
  let excused = 0
  let notRecorded = 0

  for (const record of records) {
    const statusName =
      statusMap.get(record.status_id) ?? ''

    if (statusName === 'حاضر') {
      present += 1
      continue
    }

    if (statusName === 'غائب') {
      absent += 1
      continue
    }

    if (statusName === 'متأخر') {
      late += 1
      continue
    }

    if (statusName === 'مستأذن') {
      excused += 1
      continue
    }

    /*
     * أي حالة أخرى لا تدخل في النسبة.
     */
    notRecorded += 1
  }

  const denominator =
    present +
    absent +
    late +
    excused

  const attended =
    present +
    late +
    excused

  const percentage =
    denominator > 0
      ? (attended / denominator) * 100
      : null

  return {
    present,
    absent,
    late,
    excused,
    notRecorded,
    percentage:
      percentage === null
        ? null
        : normalizePercentage(percentage),
  }
}

function isAttendanceEligible(
  percentage: number | null,
  min: number | null,
  max: number | null,
) {
  if (percentage === null) {
    return min === null
  }

  if (
    min !== null &&
    percentage < min
  ) {
    return false
  }

  if (
    max !== null &&
    percentage > max
  ) {
    return false
  }

  return true
}

function isNotesEligible(
  notes: string | null,
  requirement: string,
) {
  const hasNotes =
    typeof notes === 'string' &&
    notes.trim().length > 0

  if (requirement === 'required') {
    return hasNotes
  }

  if (requirement === 'none') {
    return !hasNotes
  }

  return true
}

function getEligibilityNote(
  attendancePercentage: number | null,
  attendanceMin: number | null,
  attendanceMax: number | null,
  studentNotes: string | null,
  notesRequirement: string,
) {
  const reasons: string[] = []

  if (
    attendancePercentage === null &&
    attendanceMin !== null
  ) {
    reasons.push(
      'لا توجد بيانات حضور كافية',
    )
  }

  if (
    attendancePercentage !== null &&
    attendanceMin !== null &&
    attendancePercentage < attendanceMin
  ) {
    reasons.push(
      `نسبة الحضور أقل من الحد الأدنى (${attendanceMin}%)`,
    )
  }

  if (
    attendancePercentage !== null &&
    attendanceMax !== null &&
    attendancePercentage > attendanceMax
  ) {
    reasons.push(
      `نسبة الحضور أعلى من الحد الأعلى (${attendanceMax}%)`,
    )
  }

  const hasNotes =
    typeof studentNotes === 'string' &&
    studentNotes.trim().length > 0

  if (
    notesRequirement === 'required' &&
    !hasNotes
  ) {
    reasons.push(
      'لا توجد ملاحظات لهذا الطالب',
    )
  }

  if (
    notesRequirement === 'none' &&
    hasNotes
  ) {
    reasons.push(
      'يوجد للطالب ملاحظات',
    )
  }

  return reasons.length
    ? reasons.join('، ')
    : null
}

export async function GET(
  request: Request,
  { params }: RouteContext,
) {
  try {
    const { access, response } =
      await requireAuth()

    if (response) return response

    if (!access) {
      return NextResponse.json(
        {
          error:
            'غير مصرح بالوصول',
        },
        { status: 401 },
      )
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json(
        {
          error:
            'معرف الرحلة مطلوب',
        },
        { status: 400 },
      )
    }

    const supabase =
      await createSupabaseServerClient()

    /*
     * -------------------------------------------------------
     * الرحلة
     * -------------------------------------------------------
     */

    const {
      data: trip,
      error: tripError,
    } = await supabase
      .from('trips')
      .select(`
        id,
        name,
        description,
        location,
        trip_date,
        meeting_time,
        return_time,
        fee,
        note,
        academic_year_id,
        course_id,
        attendance_min,
        attendance_max,
        notes_requirement,
        status,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .maybeSingle()

    if (tripError) {
      console.error(
        'GET /api/trips/[id]/students - trip error:',
        tripError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر تحميل الرحلة',
          details:
            tripError.message,
        },
        { status: 500 },
      )
    }

    if (!trip) {
      return NextResponse.json(
        {
          error:
            'الرحلة غير موجودة',
        },
        { status: 404 },
      )
    }

    /*
     * -------------------------------------------------------
     * الدورة
     * -------------------------------------------------------
     */

    const {
      data: course,
      error: courseError,
    } = await supabase
      .from('courses')
      .select(`
        id,
        name,
        academic_year_id,
        start_date,
        end_date,
        days
      `)
      .eq('id', trip.course_id)
      .maybeSingle()

    if (courseError) {
      console.error(
        'GET /api/trips/[id]/students - course error:',
        courseError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر تحميل الدورة',
          details:
            courseError.message,
        },
        { status: 500 },
      )
    }

    /*
     * -------------------------------------------------------
     * مستويات الرحلة
     * -------------------------------------------------------
     */

    const {
      data: tripLevels,
      error: tripLevelsError,
    } = await supabase
      .from('trip_levels')
      .select(`
        id,
        trip_id,
        level_id
      `)
      .eq('trip_id', id)

    if (tripLevelsError) {
      console.error(
        'GET /api/trips/[id]/students - trip levels error:',
        tripLevelsError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر تحميل مستويات الرحلة',
          details:
            tripLevelsError.message,
        },
        { status: 500 },
      )
    }

    const levelIds =
      (tripLevels ?? []).map(
        (item) => item.level_id,
      )

    /*
     * -------------------------------------------------------
     * المستويات
     * -------------------------------------------------------
     */

    let levels: Array<{
      id: string
      name: string
      sort_order: number | null
    }> = []

    if (levelIds.length > 0) {
      const {
        data: levelRows,
        error: levelsError,
      } = await supabase
        .from('levels')
        .select(`
          id,
          name,
          sort_order
        `)
        .in('id', levelIds)

      if (levelsError) {
        console.error(
          'GET /api/trips/[id]/students - levels error:',
          levelsError,
        )

        return NextResponse.json(
          {
            error:
              'تعذر تحميل المستويات',
            details:
              levelsError.message,
          },
          { status: 500 },
        )
      }

      levels = levelRows ?? []
    }

    const levelMap = new Map(
      levels.map((level) => [
        level.id,
        level,
      ]),
    )

    /*
     * -------------------------------------------------------
     * طلاب السنة الحالية
     * -------------------------------------------------------
     *
     * نستخدم enrollments لمعرفة مستوى الطالب
     * داخل السنة الدراسية الخاصة بالرحلة.
     */

    const {
      data: enrollments,
      error: enrollmentsError,
    } = await supabase
      .from('enrollments')
      .select(`
        id,
        student_id,
        academic_year_id,
        level_id,
        class_id,
        status
      `)
      .eq(
        'academic_year_id',
        trip.academic_year_id,
      )
      .in(
        'level_id',
        levelIds.length > 0
          ? levelIds
          : ['00000000-0000-0000-0000-000000000000'],
      )

    if (enrollmentsError) {
      console.error(
        'GET /api/trips/[id]/students - enrollments error:',
        enrollmentsError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر تحميل تسجيلات الطلاب',
          details:
            enrollmentsError.message,
        },
        { status: 500 },
      )
    }

    const enrollmentRows =
      (enrollments ??
        []) as EnrollmentRow[]

    const enrollmentIds =
      enrollmentRows.map(
        (item) => item.id,
      )

    const studentIds = [
      ...new Set(
        enrollmentRows.map(
          (item) => item.student_id,
        ),
      ),
    ]

    /*
     * -------------------------------------------------------
     * الطلاب
     * -------------------------------------------------------
     */

    let students: StudentRow[] = []

    if (studentIds.length > 0) {
      const {
        data: studentRows,
        error: studentsError,
      } = await supabase
        .from('students')
        .select(`
          id,
          name,
          personal_id,
          phone,
          whatsapp,
          notes
        `)
        .in('id', studentIds)

      if (studentsError) {
        console.error(
          'GET /api/trips/[id]/students - students error:',
          studentsError,
        )

        return NextResponse.json(
          {
            error:
              'تعذر تحميل الطلاب',
            details:
              studentsError.message,
          },
          { status: 500 },
        )
      }

      students =
        (studentRows ??
          []) as StudentRow[]
    }

    /*
     * -------------------------------------------------------
     * حالات الحضور
     * -------------------------------------------------------
     */

    const {
      data: attendanceStatuses,
      error: attendanceStatusesError,
    } = await supabase
      .from('attendance_statuses')
      .select(`
        id,
        name
      `)

    if (attendanceStatusesError) {
      console.error(
        'GET /api/trips/[id]/students - attendance statuses error:',
        attendanceStatusesError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر تحميل حالات الحضور',
          details:
            attendanceStatusesError.message,
        },
        { status: 500 },
      )
    }

    const statusMap =
      new Map<string, string>(
        (
          (attendanceStatuses ??
            []) as AttendanceStatus[]
        ).map((status) => [
          status.id,
          status.name,
        ]),
      )

    /*
     * -------------------------------------------------------
     * الحضور
     * -------------------------------------------------------
     *
     * نقرأ سجلات الحضور للدورة والسنة
     * للطلاب المرشحين.
     */

    let attendance: AttendanceRow[] = []

    if (
      studentIds.length > 0
    ) {
      let attendanceQuery =
        supabase
          .from('attendance')
          .select(`
            id,
            student_id,
            enrollment_id,
            attendance_date,
            status_id,
            note,
            course_id
          `)
          .eq(
            'course_id',
            trip.course_id,
          )
          .in(
            'student_id',
            studentIds,
          )

      /*
       * إذا كانت الدورة لها تاريخ نهاية،
       * لا نستخدم سجلات بعد تاريخ النهاية.
       */
      if (course?.end_date) {
        attendanceQuery =
          attendanceQuery.lte(
            'attendance_date',
            course.end_date,
          )
      }

      const {
        data: attendanceRows,
        error: attendanceError,
      } = await attendanceQuery

      if (attendanceError) {
        console.error(
          'GET /api/trips/[id]/students - attendance error:',
          attendanceError,
        )

        return NextResponse.json(
          {
            error:
              'تعذر تحميل الحضور',
            details:
              attendanceError.message,
          },
          { status: 500 },
        )
      }

      attendance =
        (attendanceRows ??
          []) as AttendanceRow[]
    }

    /*
     * -------------------------------------------------------
     * الملاحظات الخاصة بالرحلة الموجودة مسبقاً
     * -------------------------------------------------------
     */

    const {
      data: tripStudents,
      error: tripStudentsError,
    } = await supabase
      .from('trip_students')
      .select(`
        id,
        trip_id,
        student_id,
        enrollment_id,
        attendance_percentage,
        attendance_present,
        attendance_absent,
        attendance_late,
        attendance_excused,
        attendance_not_recorded,
        eligibility_note,
        selected,
        response,
        response_note,
        responded_at
      `)
      .eq('trip_id', id)

    if (tripStudentsError) {
      console.error(
        'GET /api/trips/[id]/students - trip students error:',
        tripStudentsError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر تحميل طلاب الرحلة',
          details:
            tripStudentsError.message,
        },
        { status: 500 },
      )
    }

    const savedTripStudents =
      (tripStudents ??
        []) as TripStudentRow[]

    const savedTripStudentMap =
      new Map(
        savedTripStudents.map(
          (item) => [
            item.student_id,
            item,
          ],
        ),
      )

    /*
     * -------------------------------------------------------
     * تجميع الحضور لكل طالب
     * -------------------------------------------------------
     */

    const attendanceByStudent =
      new Map<
        string,
        AttendanceRow[]
      >()

    for (const record of attendance) {
      const current =
        attendanceByStudent.get(
          record.student_id,
        ) ?? []

      current.push(record)

      attendanceByStudent.set(
        record.student_id,
        current,
      )
    }

    /*
     * -------------------------------------------------------
     * تجهيز القائمة النهائية
     * -------------------------------------------------------
     */

    const resultStudents =
      students
        .map((student) => {
          const enrollment =
            enrollmentRows.find(
              (item) =>
                item.student_id ===
                student.id,
            )

          if (!enrollment) {
            return null
          }

          const level =
            levelMap.get(
              enrollment.level_id,
            )

          const records =
            attendanceByStudent.get(
              student.id,
            ) ?? []

          const attendanceSummary =
            calculateAttendance(
              records,
              statusMap,
            )

          const attendanceEligible =
            isAttendanceEligible(
              attendanceSummary.percentage,
              trip.attendance_min,
              trip.attendance_max,
            )

          /*
           * حالياً notes الموجودة في students
           * هي مصدر الملاحظات العامة للطالب.
           *
           * لا ننشئ مصدراً جديداً للملاحظات.
           */
          const notesEligible =
            isNotesEligible(
              student.notes,
              trip.notes_requirement,
            )

          const eligible =
            attendanceEligible &&
            notesEligible

          const saved =
            savedTripStudentMap.get(
              student.id,
            )

          const eligibilityNote =
            getEligibilityNote(
              attendanceSummary.percentage,
              trip.attendance_min,
              trip.attendance_max,
              student.notes,
              trip.notes_requirement,
            )

          return {
            id: student.id,
            name: student.name,
            personal_id:
              student.personal_id,
            phone: student.phone,
            whatsapp:
              student.whatsapp,

            level: level
              ? {
                  id: level.id,
                  name: level.name,
                  sort_order:
                    level.sort_order,
                }
              : null,

            enrollment_id:
              enrollment.id,

            enrollment_status:
              enrollment.status,

            attendance_percentage:
              attendanceSummary.percentage,

            attendance_present:
              attendanceSummary.present,

            attendance_absent:
              attendanceSummary.absent,

            attendance_late:
              attendanceSummary.late,

            attendance_excused:
              attendanceSummary.excused,

            attendance_not_recorded:
              attendanceSummary.notRecorded,

            /*
             * نرسل ملاحظات الطالب للعرض
             * داخل صفحة الرحلة.
             */
            course_notes:
              student.notes
                ? [
                    {
                      note: student.notes,
                      source: 'student',
                    },
                  ]
                : [],

            eligible,

            eligibility_note:
              eligibilityNote,

            selected:
              saved
                ? Boolean(
                    saved.selected,
                  )
                : eligible,

            response:
              saved?.response ??
              'pending',

            response_note:
              saved?.response_note ??
              null,

            responded_at:
              saved?.responded_at ??
              null,

            trip_student_id:
              saved?.id ?? null,
          }
        })
        .filter(
          (
            item,
          ): item is NonNullable<
            typeof item
          > => item !== null,
        )
        .sort((a, b) =>
          a.name.localeCompare(
            b.name,
            'ar',
          ),
        )

    /*
     * -------------------------------------------------------
     * تواريخ الحضور الموجودة فعلياً
     * -------------------------------------------------------
     *
     * نرسلها للواجهة للاستفادة منها
     * في التفاصيل.
     */

    const lessonDates = [
      ...new Set(
        attendance.map(
          (item) =>
            item.attendance_date,
        ),
      ),
    ].sort()

    return NextResponse.json({
      trip,
      course,
      levels,
      tripLevels:
        tripLevels ?? [],
      lesson_dates: lessonDates,
      students: resultStudents,
    })
  } catch (error) {
    console.error(
      'GET /api/trips/[id]/students error:',
      error,
    )

    return NextResponse.json(
      {
        error:
          'حدث خطأ أثناء تحميل طلاب الرحلة',
      },
      { status: 500 },
    )
  }
}

export async function POST(
  request: Request,
  { params }: RouteContext,
) {
  try {
    const { access, response } =
      await requireAuth()

    if (response) return response

    if (!access) {
      return NextResponse.json(
        {
          error:
            'غير مصرح بالوصول',
        },
        { status: 401 },
      )
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json(
        {
          error:
            'معرف الرحلة مطلوب',
        },
        { status: 400 },
      )
    }

    const supabase =
      await createSupabaseServerClient()

    /*
     * -------------------------------------------------------
     * التحقق من الرحلة
     * -------------------------------------------------------
     */

    const {
      data: trip,
      error: tripError,
    } = await supabase
      .from('trips')
      .select(`
        id,
        academic_year_id,
        course_id,
        attendance_min,
        attendance_max,
        notes_requirement,
        status
      `)
      .eq('id', id)
      .maybeSingle()

    if (tripError) {
      console.error(
        'POST /api/trips/[id]/students - trip error:',
        tripError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر التحقق من الرحلة',
          details:
            tripError.message,
        },
        { status: 500 },
      )
    }

    if (!trip) {
      return NextResponse.json(
        {
          error:
            'الرحلة غير موجودة',
        },
        { status: 404 },
      )
    }

    if (trip.status === 'closed') {
      return NextResponse.json(
        {
          error:
            'لا يمكن تعديل رحلة مغلقة',
        },
        { status: 400 },
      )
    }

    /*
     * -------------------------------------------------------
     * قراءة الطلب
     * -------------------------------------------------------
     */

    let body: any

    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        {
          error:
            'بيانات الطلب غير صحيحة',
        },
        { status: 400 },
      )
    }

    const selectedStudentIds =
      Array.isArray(
        body.student_ids,
      )
        ? [
            ...new Set(
              body.student_ids.filter(
                (
                  value: unknown,
                ): value is string =>
                  typeof value ===
                    'string' &&
                  value.trim()
                    .length > 0,
              ),
            ),
          ]
        : []

    /*
     * -------------------------------------------------------
     * المستويات التابعة للرحلة
     * -------------------------------------------------------
     */

    const {
      data: tripLevels,
      error: tripLevelsError,
    } = await supabase
      .from('trip_levels')
      .select(`
        level_id
      `)
      .eq('trip_id', id)

    if (tripLevelsError) {
      console.error(
        'POST /api/trips/[id]/students - trip levels error:',
        tripLevelsError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر تحميل مستويات الرحلة',
          details:
            tripLevelsError.message,
        },
        { status: 500 },
      )
    }

    const levelIds =
      (tripLevels ?? []).map(
        (item) => item.level_id,
      )

    if (levelIds.length === 0) {
      return NextResponse.json(
        {
          error:
            'لا توجد مستويات مرتبطة بالرحلة',
        },
        { status: 400 },
      )
    }

    /*
     * -------------------------------------------------------
     * الطلاب المؤهلون فعلياً
     * -------------------------------------------------------
     *
     * نعيد التحقق من أن الطالب:
     * - في السنة الصحيحة
     * - في مستوى الرحلة
     *
     * ثم نحفظ المختارين فقط.
     */

    const {
      data: enrollments,
      error: enrollmentsError,
    } = await supabase
      .from('enrollments')
      .select(`
        id,
        student_id,
        academic_year_id,
        level_id,
        class_id,
        status
      `)
      .eq(
        'academic_year_id',
        trip.academic_year_id,
      )
      .in(
        'level_id',
        levelIds,
      )

    if (enrollmentsError) {
      console.error(
        'POST /api/trips/[id]/students - enrollments error:',
        enrollmentsError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر التحقق من تسجيلات الطلاب',
          details:
            enrollmentsError.message,
        },
        { status: 500 },
      )
    }

    const enrollmentRows =
      (enrollments ??
        []) as EnrollmentRow[]

    const validEnrollmentMap =
      new Map<
        string,
        EnrollmentRow
      >()

    for (const enrollment of enrollmentRows) {
      validEnrollmentMap.set(
        enrollment.student_id,
        enrollment,
      )
    }

    const invalidStudentIds =
      selectedStudentIds.filter(
        (studentId) =>
          !validEnrollmentMap.has(
            studentId,
          ),
      )

    if (invalidStudentIds.length > 0) {
      return NextResponse.json(
        {
          error:
            'يوجد طالب غير مرتبط بالسنة أو المستوى المحدد للرحلة',
        },
        { status: 400 },
      )
    }

    /*
     * -------------------------------------------------------
     * حذف الاختيارات السابقة
     * -------------------------------------------------------
     */

    const {
      error: deleteError,
    } = await supabase
      .from('trip_students')
      .delete()
      .eq('trip_id', id)

    if (deleteError) {
      console.error(
        'POST /api/trips/[id]/students - delete old students error:',
        deleteError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر تحديث طلاب الرحلة',
          details:
            deleteError.message,
        },
        { status: 500 },
      )
    }

    /*
     * -------------------------------------------------------
     * حفظ الطلاب المختارين
     * -------------------------------------------------------
     */

    if (selectedStudentIds.length === 0) {
      return NextResponse.json({
        success: true,
        tripId: id,
        students: [],
      })
    }

    /*
     * نحصل على النسب الحالية قبل الحفظ
     * حتى تبقى بيانات trip_students متزامنة
     * مع العرض.
     */

    const studentIds =
      selectedStudentIds

    const {
      data: attendanceStatuses,
    } = await supabase
      .from('attendance_statuses')
      .select(`
        id,
        name
      `)

    const statusMap =
      new Map<string, string>(
        (
          (attendanceStatuses ??
            []) as AttendanceStatus[]
        ).map((status) => [
          status.id,
          status.name,
        ]),
      )

    const {
      data: attendanceRows,
      error: attendanceError,
    } = await supabase
      .from('attendance')
      .select(`
        id,
        student_id,
        enrollment_id,
        attendance_date,
        status_id,
        note,
        course_id
      `)
      .eq(
        'course_id',
        trip.course_id,
      )
      .in(
        'student_id',
        studentIds,
      )

    if (attendanceError) {
      console.error(
        'POST /api/trips/[id]/students - attendance error:',
        attendanceError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر حساب حضور الطلاب',
          details:
            attendanceError.message,
        },
        { status: 500 },
      )
    }

    const attendanceByStudent =
      new Map<
        string,
        AttendanceRow[]
      >()

    for (const record of (
      (attendanceRows ??
        []) as AttendanceRow[]
    )) {
      const current =
        attendanceByStudent.get(
          record.student_id,
        ) ?? []

      current.push(record)

      attendanceByStudent.set(
        record.student_id,
        current,
      )
    }

    const {
      data: studentRows,
      error: studentsError,
    } = await supabase
      .from('students')
      .select(`
        id,
        notes
      `)
      .in(
        'id',
        studentIds,
      )

    if (studentsError) {
      console.error(
        'POST /api/trips/[id]/students - student notes error:',
        studentsError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر تحميل ملاحظات الطلاب',
          details:
            studentsError.message,
        },
        { status: 500 },
      )
    }

    const studentNotesMap =
      new Map<string, string | null>(
        (
          studentRows ?? []
        ).map((student) => [
          student.id,
          student.notes,
        ]),
      )

    const rows =
      selectedStudentIds.map(
        (studentId) => {
          const enrollment =
            validEnrollmentMap.get(
              studentId,
            )!

          const records =
            attendanceByStudent.get(
              studentId,
            ) ?? []

          const summary =
            calculateAttendance(
              records,
              statusMap,
            )

          const notes =
            studentNotesMap.get(
              studentId,
            ) ?? null

          const attendanceEligible =
            isAttendanceEligible(
              summary.percentage,
              trip.attendance_min,
              trip.attendance_max,
            )

          const notesEligible =
            isNotesEligible(
              notes,
              trip.notes_requirement,
            )

          const eligible =
            attendanceEligible &&
            notesEligible

          return {
            trip_id: id,
            student_id: studentId,
            enrollment_id:
              enrollment.id,

            attendance_percentage:
              summary.percentage,

            attendance_present:
              summary.present,

            attendance_absent:
              summary.absent,

            attendance_late:
              summary.late,

            attendance_excused:
              summary.excused,

            attendance_not_recorded:
              summary.notRecorded,

            eligibility_note:
              getEligibilityNote(
                summary.percentage,
                trip.attendance_min,
                trip.attendance_max,
                notes,
                trip.notes_requirement,
              ),

            selected: true,

            response: 'pending',
          }
        },
      )

    /*
     * مهم:
     * الاختيار النهائي يتم من الإدارة.
     *
     * لذلك لا نمنع الحفظ إذا كانت بعض الشروط
     * غير متحققة، لكن نحفظ eligibility_note
     * حتى تكون الحالة واضحة للمستخدم.
     */

    const {
      data: insertedStudents,
      error: insertError,
    } = await supabase
      .from('trip_students')
      .insert(rows)
      .select(`
        id,
        trip_id,
        student_id,
        enrollment_id,
        attendance_percentage,
        attendance_present,
        attendance_absent,
        attendance_late,
        attendance_excused,
        attendance_not_recorded,
        eligibility_note,
        selected,
        response,
        response_note,
        responded_at
      `)

    if (insertError) {
      console.error(
        'POST /api/trips/[id]/students - insert error:',
        insertError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر حفظ طلاب الرحلة',
          details:
            insertError.message,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      tripId: id,
      students:
        insertedStudents ?? [],
    })
  } catch (error) {
    console.error(
      'POST /api/trips/[id]/students error:',
      error,
    )

    return NextResponse.json(
      {
        error:
          'حدث خطأ أثناء حفظ طلاب الرحلة',
      },
      { status: 500 },
    )
  }
}