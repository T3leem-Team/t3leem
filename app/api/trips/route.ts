import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/require-auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const VALID_NOTES_REQUIREMENTS = [
  'any',
  'required',
  'none',
] as const

export async function GET() {
  const { access, response } = await requireAuth()

  if (response) return response

  if (!access) {
    return NextResponse.json(
      { error: 'غير مصرح بالوصول' },
      { status: 401 },
    )
  }

  const supabase =
    await createSupabaseServerClient()

  const [
    tripsResult,
    academicYearsResult,
    coursesResult,
    levelsResult,
  ] = await Promise.all([
    supabase
      .from('trips')
      .select(
        `
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
        `,
      )
      .order('created_at', {
        ascending: false,
      }),

    supabase
      .from('academic_years')
      .select(
        'id, name, is_current, is_active, created_at',
      )
      .eq('is_active', true)
      .order('is_current', {
        ascending: false,
      })
      .order('created_at', {
        ascending: false,
      }),

    supabase
      .from('courses')
      .select(
        'id, name, academic_year_id, start_date, end_date',
      )
      .order('created_at', {
        ascending: false,
      }),

    supabase
      .from('levels')
      .select(
        'id, name, sort_order, is_active',
      )
      .eq('is_active', true)
      .order('sort_order', {
        ascending: true,
      }),
  ])

  if (tripsResult.error) {
    console.error(
      'GET /api/trips trips error:',
      tripsResult.error,
    )

    return NextResponse.json(
      {
        error: 'تعذر تحميل الرحلات.',
      },
      { status: 500 },
    )
  }

  if (academicYearsResult.error) {
    console.error(
      'GET /api/trips academic years error:',
      academicYearsResult.error,
    )

    return NextResponse.json(
      {
        error:
          'تعذر تحميل السنوات الدراسية.',
      },
      { status: 500 },
    )
  }

  if (coursesResult.error) {
    console.error(
      'GET /api/trips courses error:',
      coursesResult.error,
    )

    return NextResponse.json(
      {
        error: 'تعذر تحميل الدورات.',
      },
      { status: 500 },
    )
  }

  if (levelsResult.error) {
    console.error(
      'GET /api/trips levels error:',
      levelsResult.error,
    )

    return NextResponse.json(
      {
        error: 'تعذر تحميل المستويات.',
      },
      { status: 500 },
    )
  }

  return NextResponse.json({
    trips: tripsResult.data ?? [],
    academicYears:
      academicYearsResult.data ?? [],
    courses:
      coursesResult.data ?? [],
    levels:
      levelsResult.data ?? [],
  })
}

export async function POST(
  request: Request,
) {
  const { access, response } =
    await requireAuth()

  if (response) return response

  if (!access) {
    return NextResponse.json(
      { error: 'غير مصرح بالوصول' },
      { status: 401 },
    )
  }

  const supabase =
    await createSupabaseServerClient()

  let body: Record<
    string,
    unknown
  >

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      {
        error:
          'بيانات الطلب غير صالحة.',
      },
      { status: 400 },
    )
  }

  const name =
    typeof body.name === 'string'
      ? body.name.trim()
      : ''

  const description =
    typeof body.description ===
    'string'
      ? body.description.trim() ||
        null
      : null

  const location =
    typeof body.location === 'string'
      ? body.location.trim() || null
      : null

  const tripDate =
    typeof body.trip_date === 'string' &&
    body.trip_date
      ? body.trip_date
      : null

  const meetingTime =
    typeof body.meeting_time ===
      'string' &&
    body.meeting_time
      ? body.meeting_time
      : null

  const returnTime =
    typeof body.return_time ===
      'string' &&
    body.return_time
      ? body.return_time
      : null

  const note =
    typeof body.note === 'string'
      ? body.note.trim() || null
      : null

  const academicYearId =
    typeof body.academic_year_id ===
    'string'
      ? body.academic_year_id
      : ''

  const courseId =
    typeof body.course_id === 'string'
      ? body.course_id
      : ''

  const fee =
    body.fee === undefined ||
    body.fee === null ||
    body.fee === ''
      ? 0
      : Number(body.fee)

  const attendanceMin =
    body.attendance_min ===
      undefined ||
    body.attendance_min ===
      null ||
    body.attendance_min === ''
      ? null
      : Number(body.attendance_min)

  const attendanceMax =
    body.attendance_max ===
      undefined ||
    body.attendance_max ===
      null ||
    body.attendance_max === ''
      ? null
      : Number(body.attendance_max)

  const notesRequirement =
    typeof body.notes_requirement ===
    'string'
      ? body.notes_requirement
      : 'any'

  if (!name) {
    return NextResponse.json(
      { error: 'اسم الرحلة مطلوب.' },
      { status: 400 },
    )
  }

  if (!academicYearId) {
    return NextResponse.json(
      {
        error:
          'السنة الدراسية مطلوبة.',
      },
      { status: 400 },
    )
  }

  if (!courseId) {
    return NextResponse.json(
      {
        error: 'الدورة مطلوبة.',
      },
      { status: 400 },
    )
  }

  if (
    !Number.isFinite(fee) ||
    fee < 0
  ) {
    return NextResponse.json(
      {
        error:
          'رسوم الرحلة غير صالحة.',
      },
      { status: 400 },
    )
  }

  if (
    attendanceMin !== null &&
    (!Number.isFinite(
      attendanceMin,
    ) ||
      attendanceMin < 0 ||
      attendanceMin > 100)
  ) {
    return NextResponse.json(
      {
        error:
          'الحد الأدنى للحضور يجب أن يكون بين 0 و100.',
      },
      { status: 400 },
    )
  }

  if (
    attendanceMax !== null &&
    (!Number.isFinite(
      attendanceMax,
    ) ||
      attendanceMax < 0 ||
      attendanceMax > 100)
  ) {
    return NextResponse.json(
      {
        error:
          'الحد الأعلى للحضور يجب أن يكون بين 0 و100.',
      },
      { status: 400 },
    )
  }

  if (
    attendanceMin !== null &&
    attendanceMax !== null &&
    attendanceMin > attendanceMax
  ) {
    return NextResponse.json(
      {
        error:
          'الحد الأدنى لا يمكن أن يكون أكبر من الحد الأعلى.',
      },
      { status: 400 },
    )
  }

  if (
    !VALID_NOTES_REQUIREMENTS.includes(
      notesRequirement as
        (typeof VALID_NOTES_REQUIREMENTS)[number],
    )
  ) {
    return NextResponse.json(
      {
        error:
          'شرط الملاحظات غير صالح.',
      },
      { status: 400 },
    )
  }

  const { data: academicYear, error: academicYearError } =
    await supabase
      .from('academic_years')
      .select(
        'id, is_active',
      )
      .eq('id', academicYearId)
      .maybeSingle()

  if (academicYearError) {
    console.error(
      'POST /api/trips academic year error:',
      academicYearError,
    )

    return NextResponse.json(
      {
        error:
          'تعذر التحقق من السنة الدراسية.',
      },
      { status: 500 },
    )
  }

  if (!academicYear) {
    return NextResponse.json(
      {
        error:
          'السنة الدراسية غير موجودة.',
      },
      { status: 400 },
    )
  }

  if (!academicYear.is_active) {
    return NextResponse.json(
      {
        error:
          'السنة الدراسية غير نشطة.',
      },
      { status: 400 },
    )
  }

  const { data: course, error: courseError } =
    await supabase
      .from('courses')
      .select(
        'id, academic_year_id',
      )
      .eq('id', courseId)
      .maybeSingle()

  if (courseError) {
    console.error(
      'POST /api/trips course error:',
      courseError,
    )

    return NextResponse.json(
      {
        error:
          'تعذر التحقق من الدورة.',
      },
      { status: 500 },
    )
  }

  if (!course) {
    return NextResponse.json(
      {
        error: 'الدورة غير موجودة.',
      },
      { status: 400 },
    )
  }

  if (
    course.academic_year_id !==
    academicYearId
  ) {
    return NextResponse.json(
      {
        error:
          'الدورة لا تتبع السنة الدراسية المحددة.',
      },
      { status: 400 },
    )
  }

  const { data: trip, error: insertError } =
    await supabase
      .from('trips')
      .insert({
        name,
        description,
        location,
        trip_date: tripDate,
        meeting_time: meetingTime,
        return_time: returnTime,
        fee,
        note,
        academic_year_id:
          academicYearId,
        course_id: courseId,
        attendance_min:
          attendanceMin,
        attendance_max:
          attendanceMax,
        notes_requirement:
          notesRequirement,
        status: 'draft',
        created_by: access.userId,
      })
      .select(
        `
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
        `,
      )
      .single()

  if (insertError) {
    console.error(
      'POST /api/trips insert error:',
      insertError,
    )

    return NextResponse.json(
      {
        error:
          insertError.message ||
          'تعذر إنشاء الرحلة.',
      },
      { status: 500 },
    )
  }

  return NextResponse.json(
    { trip },
    { status: 201 },
  )
}