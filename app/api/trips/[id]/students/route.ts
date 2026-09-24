import { NextRequest, NextResponse } from 'next/server'

import { requireAuth } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'

type Context = {
  params: Promise<{
    id: string
  }>
}

function calculateAttendance(
  records: {
    student_id: string
    attendance_date: string
    status_id: string
    note: string | null
  }[],
  studentId: string,
  lessonDates: string[],
  statusMap: Map<string, string>,
) {
  let present = 0
  let absent = 0
  let late = 0
  let excused = 0
  let notRecorded = 0

  const notes: string[] = []

  const studentRecords = records.filter(
    (record) =>
      record.student_id === studentId &&
      lessonDates.includes(record.attendance_date),
  )

  const recordsByDate = new Map(
    studentRecords.map((record) => [
      record.attendance_date,
      record,
    ]),
  )

  for (const date of lessonDates) {
    const record = recordsByDate.get(date)

    if (!record) {
      notRecorded++
      continue
    }

    const status = statusMap.get(record.status_id)

    if (status === 'حاضر') {
      present++
    } else if (status === 'غائب') {
      absent++
    } else if (status === 'متأخر') {
      late++
    } else if (status === 'مستأذن') {
      excused++
    }

    if (record.note?.trim()) {
      notes.push(record.note.trim())
    }
  }

  const denominator =
    present +
    absent +
    late +
    excused

  const percentage =
    denominator > 0
      ? Number(
          (
            ((present + late + excused) /
              denominator) *
            100
          ).toFixed(2),
        )
      : null

  return {
    percentage,
    present,
    absent,
    late,
    excused,
    notRecorded,
    notes,
  }
}

function getLessonDates(
  startDate: string | null,
  endDate: string | null,
  days: unknown,
) {
  if (!startDate || !endDate || !Array.isArray(days)) {
    return []
  }

  const selectedDays = days
    .map((day) => Number(day))
    .filter(
      (day) =>
        Number.isInteger(day) &&
        day >= 0 &&
        day <= 6,
    )

  if (selectedDays.length === 0) {
    return []
  }

  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const finalDate = end < today ? end : today

  const result: string[] = []

  const current = new Date(start)

  while (current <= finalDate) {
    if (selectedDays.includes(current.getDay())) {
      const year = current.getFullYear()
      const month = String(
        current.getMonth() + 1,
      ).padStart(2, '0')
      const day = String(
        current.getDate(),
      ).padStart(2, '0')

      result.push(
        `${year}-${month}-${day}`,
      )
    }

    current.setDate(
      current.getDate() + 1,
    )
  }

  return result
}

/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
| جلب الطلاب المؤهلين للرحلة + الطلاب المختارين سابقاً
*/
export async function GET(
  _request: NextRequest,
  context: Context,
) {
  try {
    await requireAuth()

    const supabase =
      await createSupabaseServerClient()

    const { id: tripId } =
      await context.params

    if (!tripId) {
      return NextResponse.json(
        {
          error: 'معرف الرحلة مطلوب.',
        },
        { status: 400 },
      )
    }

    // الرحلة
    const { data: trip, error: tripError } =
      await supabase
        .from('trips')
        .select(
          `
            id,
            name,
            academic_year_id,
            course_id,
            attendance_min,
            attendance_max,
            notes_requirement,
            status
          `,
        )
        .eq('id', tripId)
        .maybeSingle()

    if (tripError) {
      console.error(tripError)

      return NextResponse.json(
        {
          error: 'تعذر تحميل الرحلة.',
        },
        { status: 500 },
      )
    }

    if (!trip) {
      return NextResponse.json(
        {
          error: 'الرحلة غير موجودة.',
        },
        { status: 404 },
      )
    }

    // مستويات الرحلة
    const {
      data: tripLevels,
      error: tripLevelsError,
    } = await supabase
      .from('trip_levels')
      .select('level_id')
      .eq('trip_id', tripId)

    if (tripLevelsError) {
      console.error(tripLevelsError)

      return NextResponse.json(
        {
          error:
            'تعذر تحميل مستويات الرحلة.',
        },
        { status: 500 },
      )
    }

    const levelIds =
      tripLevels?.map(
        (item) => item.level_id,
      ) ?? []

    // الدورة
    const {
      data: course,
      error: courseError,
    } = await supabase
      .from('courses')
      .select(
        `
          id,
          name,
          academic_year_id,
          start_date,
          end_date,
          days
        `,
      )
      .eq('id', trip.course_id)
      .maybeSingle()

    if (courseError) {
      console.error(courseError)

      return NextResponse.json(
        {
          error:
            'تعذر تحميل الدورة.',
        },
        { status: 500 },
      )
    }

    if (!course) {
      return NextResponse.json(
        {
          error:
            'الدورة غير موجودة.',
        },
        { status: 404 },
      )
    }

    // المستويات
    const {
      data: levels,
      error: levelsError,
    } = await supabase
      .from('levels')
      .select('id, name')
      .in(
        'id',
        levelIds.length > 0
          ? levelIds
          : ['00000000-0000-0000-0000-000000000000'],
      )

    if (levelsError) {
      console.error(levelsError)

      return NextResponse.json(
        {
          error:
            'تعذر تحميل المستويات.',
        },
        { status: 500 },
      )
    }

    const levelMap = new Map(
      (levels ?? []).map((level) => [
        level.id,
        level.name,
      ]),
    )

    // تسجيلات الطلاب في السنة الدراسية
    let enrollmentsQuery = supabase
      .from('enrollments')
      .select(
        `
          id,
          student_id,
          level_id,
          class_id,
          status
        `,
      )
      .eq(
        'academic_year_id',
        trip.academic_year_id,
      )

    if (levelIds.length > 0) {
      enrollmentsQuery =
        enrollmentsQuery.in(
          'level_id',
          levelIds,
        )
    }

    const {
      data: enrollments,
      error: enrollmentsError,
    } = await enrollmentsQuery

    if (enrollmentsError) {
      console.error(enrollmentsError)

      return NextResponse.json(
        {
          error:
            'تعذر تحميل تسجيلات الطلاب.',
        },
        { status: 500 },
      )
    }

    const enrollmentRows =
      enrollments ?? []

    const studentIds = [
      ...new Set(
        enrollmentRows.map(
          (item) => item.student_id,
        ),
      ),
    ]

    if (studentIds.length === 0) {
      return NextResponse.json({
        trip,
        course,
        levels: levels ?? [],
        students: [],
      })
    }

    // الطلاب
    const {
      data: students,
      error: studentsError,
    } = await supabase
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

    if (studentsError) {
      console.error(studentsError)

      return NextResponse.json(
        {
          error:
            'تعذر تحميل الطلاب.',
        },
        { status: 500 },
      )
    }

    // حالات الحضور
    const {
      data: attendanceStatuses,
      error: statusesError,
    } = await supabase
      .from('attendance_statuses')
      .select('id, name')

    if (statusesError) {
      console.error(statusesError)

      return NextResponse.json(
        {
          error:
            'تعذر تحميل حالات الحضور.',
        },
        { status: 500 },
      )
    }

    const statusMap = new Map(
      (attendanceStatuses ?? []).map(
        (status) => [
          status.id,
          status.name,
        ],
      ),
    )

    // أيام الدورة
    const lessonDates =
      getLessonDates(
        course.start_date,
        course.end_date,
        course.days,
      )

    // سجلات الحضور
    const {
      data: attendance,
      error: attendanceError,
    } = await supabase
      .from('attendance')
      .select(
        `
          student_id,
          attendance_date,
          status_id,
          note
        `,
      )
      .eq(
        'course_id',
        trip.course_id,
      )
      .in(
        'student_id',
        studentIds,
      )

    if (attendanceError) {
      console.error(attendanceError)

      return NextResponse.json(
        {
          error:
            'تعذر تحميل الحضور.',
        },
        { status: 500 },
      )
    }

    // الطلاب الموجودون مسبقاً في الرحلة
    const {
      data: selectedRows,
      error: selectedError,
    } = await supabase
      .from('trip_students')
      .select(
        `
          id,
          student_id,
          enrollment_id,
          selected,
          response,
          response_note,
          responded_at
        `,
      )
      .eq('trip_id', tripId)

    if (selectedError) {
      console.error(selectedError)

      return NextResponse.json(
        {
          error:
            'تعذر تحميل الطلاب المختارين.',
        },
        { status: 500 },
      )
    }

    const selectedMap = new Map(
      (selectedRows ?? []).map(
        (row) => [
          row.student_id,
          row,
        ],
      ),
    )

    // تجهيز القائمة النهائية
    const result = (students ?? [])
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

        const attendanceData =
          calculateAttendance(
            attendance ?? [],
            student.id,
            lessonDates,
            statusMap,
          )

        const hasNotes =
          attendanceData.notes.length > 0

        let eligible = true

        if (
          trip.attendance_min !== null &&
          (
            attendanceData.percentage ===
              null ||
            attendanceData.percentage <
              Number(
                trip.attendance_min,
              )
          )
        ) {
          eligible = false
        }

        if (
          trip.attendance_max !== null &&
          attendanceData.percentage !==
            null &&
          attendanceData.percentage >
            Number(
              trip.attendance_max,
            )
        ) {
          eligible = false
        }

        if (
          trip.notes_requirement ===
            'required' &&
          !hasNotes
        ) {
          eligible = false
        }

        if (
          trip.notes_requirement ===
            'none' &&
          hasNotes
        ) {
          eligible = false
        }

        const existing =
          selectedMap.get(
            student.id,
          )

        return {
          id: student.id,
          name: student.name,
          personal_id:
            student.personal_id,
          phone: student.phone,
          whatsapp: student.whatsapp,
          notes: student.notes,

          level_id:
            enrollment.level_id,

          level_name:
            levelMap.get(
              enrollment.level_id,
            ) ?? 'غير محدد',

          enrollment_id:
            enrollment.id,

          attendance_percentage:
            attendanceData.percentage,

          attendance_present:
            attendanceData.present,

          attendance_absent:
            attendanceData.absent,

          attendance_late:
            attendanceData.late,

          attendance_excused:
            attendanceData.excused,

          attendance_not_recorded:
            attendanceData.notRecorded,

          course_notes:
            attendanceData.notes,

          eligible,

          selected:
            existing?.selected ??
            false,

          response:
            existing?.response ??
            'pending',

          response_note:
            existing?.response_note ??
            null,

          responded_at:
            existing?.responded_at ??
            null,

          trip_student_id:
            existing?.id ?? null,
        }
      })
      .filter(Boolean)

    return NextResponse.json({
      trip,
      course,
      levels: levels ?? [],
      lesson_dates: lessonDates,
      students: result,
    })
  } catch (error) {
    console.error(
      'Trip students GET error:',
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'حدث خطأ غير متوقع.',
      },
      { status: 500 },
    )
  }
}

/*
|--------------------------------------------------------------------------
| POST
|--------------------------------------------------------------------------
| حفظ الطلاب الذين اختارهم المستخدم يدوياً
*/
export async function POST(
  request: NextRequest,
  context: Context,
) {
  try {
    await requireAuth()

    const supabase =
      await createSupabaseServerClient()

    const { id: tripId } =
      await context.params

    if (!tripId) {
      return NextResponse.json(
        {
          error: 'معرف الرحلة مطلوب.',
        },
        { status: 400 },
      )
    }

    const body = await request.json()

    const studentIds = Array.isArray(
      body?.student_ids,
    )
      ? body.student_ids.filter(
          (id: unknown): id is string =>
            typeof id === 'string' &&
            id.length > 0,
        )
      : []

    // التحقق من الرحلة
    const {
      data: trip,
      error: tripError,
    } = await supabase
      .from('trips')
      .select(
        `
          id,
          status
        `,
      )
      .eq('id', tripId)
      .maybeSingle()

    if (tripError) {
      console.error(tripError)

      return NextResponse.json(
        {
          error:
            'تعذر التحقق من الرحلة.',
        },
        { status: 500 },
      )
    }

    if (!trip) {
      return NextResponse.json(
        {
          error: 'الرحلة غير موجودة.',
        },
        { status: 404 },
      )
    }

    if (trip.status === 'closed') {
      return NextResponse.json(
        {
          error:
            'لا يمكن تعديل رحلة مغلقة.',
        },
        { status: 400 },
      )
    }

    /*
     * نمسح الاختيارات الحالية
     * ثم نحفظ الاختيارات الجديدة.
     */
    const {
      error: deleteError,
    } = await supabase
      .from('trip_students')
      .delete()
      .eq('trip_id', tripId)

    if (deleteError) {
      console.error(deleteError)

      return NextResponse.json(
        {
          error:
            'تعذر تحديث الطلاب.',
        },
        { status: 500 },
      )
    }

    if (studentIds.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message:
          'تم إلغاء اختيار جميع الطلاب.',
      })
    }

    /*
     * نحصل على البيانات من GET
     * ونتأكد أن الطالب مؤهل فعلاً.
     */
    const {
      data: tripData,
      error: tripDataError,
    } = await supabase
      .from('trips')
      .select(
        `
          academic_year_id,
          course_id,
          attendance_min,
          attendance_max,
          notes_requirement
        `,
      )
      .eq('id', tripId)
      .single()

    if (tripDataError) {
      console.error(tripDataError)

      return NextResponse.json(
        {
          error:
            'تعذر التحقق من شروط الرحلة.',
        },
        { status: 500 },
      )
    }

    const {
      data: tripLevels,
      error: levelsError,
    } = await supabase
      .from('trip_levels')
      .select('level_id')
      .eq('trip_id', tripId)

    if (levelsError) {
      console.error(levelsError)

      return NextResponse.json(
        {
          error:
            'تعذر التحقق من مستويات الرحلة.',
        },
        { status: 500 },
      )
    }

    const levelIds =
      tripLevels?.map(
        (item) => item.level_id,
      ) ?? []

    let enrollmentsQuery = supabase
      .from('enrollments')
      .select(
        `
          id,
          student_id,
          level_id
        `,
      )
      .eq(
        'academic_year_id',
        tripData.academic_year_id,
      )

    if (levelIds.length > 0) {
      enrollmentsQuery =
        enrollmentsQuery.in(
          'level_id',
          levelIds,
        )
    }

    const {
      data: enrollments,
      error: enrollmentsError,
    } = await enrollmentsQuery

    if (enrollmentsError) {
      console.error(enrollmentsError)

      return NextResponse.json(
        {
          error:
            'تعذر التحقق من تسجيلات الطلاب.',
        },
        { status: 500 },
      )
    }

    const enrollmentMap =
      new Map(
        (enrollments ?? []).map(
          (item) => [
            item.student_id,
            item,
          ],
        ),
      )

    const validStudentIds =
      studentIds.filter((id) =>
        enrollmentMap.has(id),
      )

    if (validStudentIds.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message:
          'لم يتم العثور على طلاب مؤهلين.',
      })
    }

    const rows = validStudentIds.map(
      (studentId) => ({
        trip_id: tripId,
        student_id: studentId,
        enrollment_id:
          enrollmentMap.get(
            studentId,
          )?.id ?? null,
        selected: true,
        response: 'pending',
      }),
    )

    const {
      error: insertError,
    } = await supabase
      .from('trip_students')
      .insert(rows)

    if (insertError) {
      console.error(insertError)

      return NextResponse.json(
        {
          error:
            'تعذر حفظ الطلاب المختارين.',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      count: rows.length,
      message:
        'تم حفظ الطلاب المختارين بنجاح.',
    })
  } catch (error) {
    console.error(
      'Trip students POST error:',
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'حدث خطأ غير متوقع.',
      },
      { status: 500 },
    )
  }
}
