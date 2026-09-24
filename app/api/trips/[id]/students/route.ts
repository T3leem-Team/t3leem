import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

function calculateAttendance(
  records: Array<{
    student_id: string
    attendance_date: string
    status_id: string
    note: string | null
  }>,
  statusMap: Map<string, string>,
  lessonDates: string[],
) {
  const recordsByDate = new Map<
    string,
    {
      status: string
      note: string | null
    }
  >()

  for (const record of records) {
    recordsByDate.set(record.attendance_date, {
      status:
        statusMap.get(record.status_id) ?? '',
      note: record.note ?? null,
    })
  }

  let present = 0
  let absent = 0
  let late = 0
  let excused = 0
  let notRecorded = 0

  const courseNotes: string[] = []

  for (const date of lessonDates) {
    const record = recordsByDate.get(date)

    if (!record) {
      notRecorded += 1
      continue
    }

    if (record.note?.trim()) {
      courseNotes.push(record.note.trim())
    }

    switch (record.status) {
      case 'حاضر':
        present += 1
        break

      case 'غائب':
        absent += 1
        break

      case 'متأخر':
        late += 1
        break

      case 'مستأذن':
        excused += 1
        break

      default:
        break
    }
  }

  const denominator =
    present + absent + late + excused

  const attended =
    present + late + excused

  const percentage =
    denominator > 0
      ? Number(
          ((attended / denominator) * 100).toFixed(
            2,
          ),
        )
      : null

  return {
    present,
    absent,
    late,
    excused,
    notRecorded,
    percentage,
    courseNotes,
  }
}

export async function GET(
  request: Request,
  { params }: RouteContext,
) {
  try {
    await requireAuth()

    const { id } = await params

    if (!id) {
      return NextResponse.json(
        {
          error: 'معرّف الرحلة غير موجود.',
        },
        {
          status: 400,
        },
      )
    }

    const supabase =
      await createSupabaseServerClient()

    const [
      tripResult,
      tripLevelsResult,
      existingStudentsResult,
    ] = await Promise.all([
      supabase
        .from('trips')
        .select('*')
        .eq('id', id)
        .maybeSingle(),

      supabase
        .from('trip_levels')
        .select('id, trip_id, level_id')
        .eq('trip_id', id),

      supabase
        .from('trip_students')
        .select(
          `
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
          `,
        )
        .eq('trip_id', id),
    ])

    if (tripResult.error) {
      console.error(
        'Get trip error:',
        tripResult.error,
      )

      return NextResponse.json(
        {
          error:
            tripResult.error.message ??
            'تعذر تحميل الرحلة.',
        },
        {
          status: 500,
        },
      )
    }

    const trip = tripResult.data

    if (!trip) {
      return NextResponse.json(
        {
          error: 'الرحلة غير موجودة.',
        },
        {
          status: 404,
        },
      )
    }

    if (tripLevelsResult.error) {
      console.error(
        'Get trip levels error:',
        tripLevelsResult.error,
      )

      return NextResponse.json(
        {
          error:
            tripLevelsResult.error.message ??
            'تعذر تحميل مستويات الرحلة.',
        },
        {
          status: 500,
        },
      )
    }

    if (existingStudentsResult.error) {
      console.error(
        'Get trip students error:',
        existingStudentsResult.error,
      )

      return NextResponse.json(
        {
          error:
            existingStudentsResult.error.message ??
            'تعذر تحميل طلاب الرحلة.',
        },
        {
          status: 500,
        },
      )
    }

    const tripLevels =
      tripLevelsResult.data ?? []

    const levelIds = tripLevels.map(
      (item) => item.level_id,
    )

    const [
      courseResult,
      levelsResult,
      enrollmentsResult,
      statusesResult,
    ] = await Promise.all([
      supabase
        .from('courses')
        .select(
          'id, name, academic_year_id, start_date, end_date, days',
        )
        .eq('id', trip.course_id)
        .maybeSingle(),

      levelIds.length > 0
        ? supabase
            .from('levels')
            .select(
              'id, name, sort_order, is_active',
            )
            .in('id', levelIds)
        : Promise.resolve({
            data: [],
            error: null,
          }),

      levelIds.length > 0
        ? supabase
            .from('enrollments')
            .select(
              `
                id,
                student_id,
                academic_year_id,
                level_id,
                class_id,
                status
              `,
            )
            .eq(
              'academic_year_id',
              trip.academic_year_id,
            )
            .in('level_id', levelIds)
        : Promise.resolve({
            data: [],
            error: null,
          }),

      supabase
        .from('attendance_statuses')
        .select('id, name'),
    ])

    if (courseResult.error) {
      console.error(
        'Get course error:',
        courseResult.error,
      )

      return NextResponse.json(
        {
          error:
            courseResult.error.message ??
            'تعذر تحميل الدورة.',
        },
        {
          status: 500,
        },
      )
    }

    if (levelsResult.error) {
      console.error(
        'Get levels error:',
        levelsResult.error,
      )

      return NextResponse.json(
        {
          error:
            levelsResult.error.message ??
            'تعذر تحميل المستويات.',
        },
        {
          status: 500,
        },
      )
    }

    if (enrollmentsResult.error) {
      console.error(
        'Get enrollments error:',
        enrollmentsResult.error,
      )

      return NextResponse.json(
        {
          error:
            enrollmentsResult.error.message ??
            'تعذر تحميل تسجيلات الطلاب.',
        },
        {
          status: 500,
        },
      )
    }

    if (statusesResult.error) {
      console.error(
        'Get attendance statuses error:',
        statusesResult.error,
      )

      return NextResponse.json(
        {
          error:
            statusesResult.error.message ??
            'تعذر تحميل حالات الحضور.',
        },
        {
          status: 500,
        },
      )
    }

    const course = courseResult.data

    if (!course) {
      return NextResponse.json(
        {
          error: 'الدورة المرتبطة بالرحلة غير موجودة.',
        },
        {
          status: 404,
        },
      )
    }

    const enrollments =
      enrollmentsResult.data ?? []

    const studentIds = Array.from(
      new Set(
        enrollments.map(
          (enrollment) => enrollment.student_id,
        ),
      ),
    )

    const [
      studentsResult,
      attendanceResult,
    ] = await Promise.all([
      studentIds.length > 0
        ? supabase
            .from('students')
            .select(
              `
                id,
                name,
                personal_id,
                phone,
                whatsapp,
                notes
              `,
            )
            .in('id', studentIds)
        : Promise.resolve({
            data: [],
            error: null,
          }),

      studentIds.length > 0
        ? supabase
            .from('attendance')
            .select(
              `
                id,
                student_id,
                enrollment_id,
                attendance_date,
                status_id,
                note
              `,
            )
            .eq('course_id', trip.course_id)
            .in('student_id', studentIds)
        : Promise.resolve({
            data: [],
            error: null,
          }),
    ])

    if (studentsResult.error) {
      console.error(
        'Get students error:',
        studentsResult.error,
      )

      return NextResponse.json(
        {
          error:
            studentsResult.error.message ??
            'تعذر تحميل الطلاب.',
        },
        {
          status: 500,
        },
      )
    }

    if (attendanceResult.error) {
      console.error(
        'Get attendance error:',
        attendanceResult.error,
      )

      return NextResponse.json(
        {
          error:
            attendanceResult.error.message ??
            'تعذر تحميل الحضور.',
        },
        {
          status: 500,
        },
      )
    }

    /*
     * نحاول تحديد أيام الدروس المنتهية.
     *
     * إذا كانت الدورة تحتوي على start_date / end_date
     * نستخدم نطاق الدورة.
     *
     * الأيام الفعلية للحضور الموجودة في جدول attendance
     * تدخل ضمن الحساب كذلك.
     */
    const today = new Date()

    const lessonDates = new Set<string>()

    for (const record of attendanceResult.data ?? []) {
      if (
        record.attendance_date &&
        new Date(
          `${record.attendance_date}T00:00:00`,
        ) <= today
      ) {
        lessonDates.add(
          record.attendance_date,
        )
      }
    }

    /*
     * إذا كانت هناك سجلات حضور، فهذه هي الأيام التي
     * نحتاجها للحساب. الأيام التي لم يسجل فيها الطالب
     * داخل هذه الفترة لا يمكن معرفتها من attendance وحده.
     *
     * لذلك نستخدم أيام الحضور الموجودة كأيام الدروس
     * المتاحة حاليًا.
     */
    const lessonDateList = Array.from(
      lessonDates,
    ).sort()

    const statusMap = new Map<string, string>()

    for (const status of
      statusesResult.data ?? []) {
      statusMap.set(
        status.id,
        status.name,
      )
    }

    const levelMap = new Map<
      string,
      string
    >()

    for (const level of
      levelsResult.data ?? []) {
      levelMap.set(
        level.id,
        level.name,
      )
    }

    const enrollmentByStudent =
      new Map<string, (typeof enrollments)[number]>()

    for (const enrollment of enrollments) {
      if (
        !enrollmentByStudent.has(
          enrollment.student_id,
        )
      ) {
        enrollmentByStudent.set(
          enrollment.student_id,
          enrollment,
        )
      }
    }

    const studentMap = new Map<
      string,
      (typeof studentsResult.data)[number]
    >()

    for (const student of
      studentsResult.data ?? []) {
      studentMap.set(student.id, student)
    }

    const attendanceByStudent =
      new Map<
        string,
        Array<{
          student_id: string
          attendance_date: string
          status_id: string
          note: string | null
        }>
      >()

    for (const record of
      attendanceResult.data ?? []) {
      const list =
        attendanceByStudent.get(
          record.student_id,
        ) ?? []

      list.push({
        student_id: record.student_id,
        attendance_date:
          record.attendance_date,
        status_id: record.status_id,
        note: record.note,
      })

      attendanceByStudent.set(
        record.student_id,
        list,
      )
    }

    const existingMap = new Map<
      string,
      (typeof existingStudentsResult.data)[number]
    >()

    for (const item of
      existingStudentsResult.data ?? []) {
      existingMap.set(
        item.student_id,
        item,
      )
    }

    const students = Array.from(
      enrollmentByStudent.entries(),
    )
      .map(([studentId, enrollment]) => {
        const student =
          studentMap.get(studentId)

        if (!student) {
          return null
        }

        const attendance =
          calculateAttendance(
            attendanceByStudent.get(
              studentId,
            ) ?? [],
            statusMap,
            lessonDateList,
          )

        let eligible = true

        let eligibilityNote: string | null =
          null

        if (
          trip.attendance_min !== null &&
          (
            attendance.percentage === null ||
            attendance.percentage <
              Number(trip.attendance_min)
          )
        ) {
          eligible = false

          eligibilityNote =
            `نسبة الحضور أقل من الحد الأدنى ${trip.attendance_min}%.`
        }

        if (
          trip.attendance_max !== null &&
          attendance.percentage !== null &&
          attendance.percentage >
            Number(trip.attendance_max)
        ) {
          eligible = false

          eligibilityNote =
            `نسبة الحضور أعلى من الحد الأعلى ${trip.attendance_max}%.`
        }

        const hasNotes =
          attendance.courseNotes.length >
          0

        if (
          trip.notes_requirement ===
            'required' &&
          !hasNotes
        ) {
          eligible = false

          eligibilityNote =
            'الرحلة تتطلب وجود ملاحظات لهذه الدورة.'
        }

        if (
          trip.notes_requirement ===
            'none' &&
          hasNotes
        ) {
          eligible = false

          eligibilityNote =
            'الرحلة لا تسمح بالطلاب الذين لديهم ملاحظات لهذه الدورة.'
        }

        const existing =
          existingMap.get(studentId)

        return {
          id: student.id,
          name: student.name,
          personal_id:
            student.personal_id,
          phone: student.phone,
          whatsapp: student.whatsapp,

          level_id: enrollment.level_id,
          level_name:
            levelMap.get(
              enrollment.level_id,
            ) ?? 'غير محدد',

          attendance_percentage:
            attendance.percentage,

          attendance_present:
            attendance.present,

          attendance_absent:
            attendance.absent,

          attendance_late:
            attendance.late,

          attendance_excused:
            attendance.excused,

          attendance_not_recorded:
            attendance.notRecorded,

          course_notes:
            attendance.courseNotes,

          eligible,
          eligibility_note:
            eligibilityNote,

          selected:
            existing?.selected ?? false,

          response:
            existing?.response ??
            'pending',

          response_note:
            existing?.response_note ??
            null,

          responded_at:
            existing?.responded_at ??
            null,
        }
      })
      .filter(
        (
          student,
        ): student is NonNullable<
          typeof student
        > => student !== null,
      )

    return NextResponse.json({
      trip,
      course,
      levels:
        levelsResult.data ?? [],
      lesson_dates:
        lessonDateList,
      students,
    })
  } catch (error) {
    console.error(
      'GET trip students error:',
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'حدث خطأ غير متوقع.',
      },
      {
        status: 500,
      },
    )
  }
}

export async function POST(
  request: Request,
  { params }: RouteContext,
) {
  try {
    await requireAuth()

    const { id } = await params

    if (!id) {
      return NextResponse.json(
        {
          error: 'معرّف الرحلة غير موجود.',
        },
        {
          status: 400,
        },
      )
    }

    const body = await request.json()

    const studentIds = Array.isArray(
      body?.student_ids,
    )
      ? body.student_ids.filter(
          (value: unknown): value is string =>
            typeof value === 'string' &&
            value.length > 0,
        )
      : []

    const supabase =
      await createSupabaseServerClient()

    const { data: trip, error: tripError } =
      await supabase
        .from('trips')
        .select(
          `
            id,
            academic_year_id,
            course_id,
            status
          `,
        )
        .eq('id', id)
        .maybeSingle()

    if (tripError) {
      console.error(
        'Get trip for save error:',
        tripError,
      )

      return NextResponse.json(
        {
          error:
            tripError.message ??
            'تعذر تحميل الرحلة.',
        },
        {
          status: 500,
        },
      )
    }

    if (!trip) {
      return NextResponse.json(
        {
          error: 'الرحلة غير موجودة.',
        },
        {
          status: 404,
        },
      )
    }

    if (trip.status === 'closed') {
      return NextResponse.json(
        {
          error:
            'لا يمكن تعديل الطلاب في رحلة مغلقة.',
        },
        {
          status: 400,
        },
      )
    }

    const { data: tripLevels, error: levelsError } =
      await supabase
        .from('trip_levels')
        .select('level_id')
        .eq('trip_id', id)

    if (levelsError) {
      console.error(
        'Get trip levels for save error:',
        levelsError,
      )

      return NextResponse.json(
        {
          error:
            levelsError.message ??
            'تعذر تحميل مستويات الرحلة.',
        },
        {
          status: 500,
        },
      )
    }

    const levelIds =
      tripLevels?.map(
        (item) => item.level_id,
      ) ?? []

    if (levelIds.length === 0) {
      return NextResponse.json(
        {
          error:
            'يجب أن تحتوي الرحلة على مستوى واحد على الأقل.',
        },
        {
          status: 400,
        },
      )
    }

    let validStudentIds: string[] = []

    if (studentIds.length > 0) {
      const { data: enrollments, error } =
        await supabase
          .from('enrollments')
          .select(
            `
              id,
              student_id,
              academic_year_id,
              level_id
            `,
          )
          .eq(
            'academic_year_id',
            trip.academic_year_id,
          )
          .in('level_id', levelIds)
          .in('student_id', studentIds)

      if (error) {
        console.error(
          'Validate enrollments error:',
          error,
        )

        return NextResponse.json(
          {
            error:
              error.message ??
              'تعذر التحقق من الطلاب.',
          },
          {
            status: 500,
          },
        )
      }

      validStudentIds = Array.from(
        new Set(
          (enrollments ?? []).map(
            (item) => item.student_id,
          ),
        ),
      )
    }

    const { error: deleteError } =
      await supabase
        .from('trip_students')
        .delete()
        .eq('trip_id', id)

    if (deleteError) {
      console.error(
        'Delete old trip students error:',
        deleteError,
      )

      return NextResponse.json(
        {
          error:
            deleteError.message ??
            'تعذر تحديث طلاب الرحلة.',
        },
        {
          status: 500,
        },
      )
    }

    if (validStudentIds.length > 0) {
      const { data: enrollments, error } =
        await supabase
          .from('enrollments')
          .select(
            `
              id,
              student_id,
              academic_year_id,
              level_id
            `,
          )
          .eq(
            'academic_year_id',
            trip.academic_year_id,
          )
          .in('level_id', levelIds)
          .in(
            'student_id',
            validStudentIds,
          )

      if (error) {
        console.error(
          'Get enrollments for insert error:',
          error,
        )

        return NextResponse.json(
          {
            error:
              error.message ??
              'تعذر تجهيز الطلاب للحفظ.',
          },
          {
            status: 500,
          },
        )
      }

      const enrollmentMap =
        new Map<
          string,
          string
        >()

      for (const enrollment of
        enrollments ?? []) {
        enrollmentMap.set(
          enrollment.student_id,
          enrollment.id,
        )
      }

      const rows = validStudentIds.map(
        (studentId) => ({
          trip_id: id,
          student_id: studentId,
          enrollment_id:
            enrollmentMap.get(
              studentId,
            ) ?? null,
          selected: true,
          response: 'pending',
        }),
      )

      const { error: insertError } =
        await supabase
          .from('trip_students')
          .insert(rows)

      if (insertError) {
        console.error(
          'Insert trip students error:',
          insertError,
        )

        return NextResponse.json(
          {
            error:
              insertError.message ??
              'تعذر حفظ طلاب الرحلة.',
          },
          {
            status: 500,
          },
        )
      }
    }

    return NextResponse.json({
      success: true,
      student_ids: validStudentIds,
    })
  } catch (error) {
    console.error(
      'POST trip students error:',
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'حدث خطأ غير متوقع.',
      },
      {
        status: 500,
      },
    )
  }
}