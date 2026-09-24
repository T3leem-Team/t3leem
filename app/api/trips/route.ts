import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/require-auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET() {
  const { access, response } = await requireAuth()

  if (response) return response

  if (!access) {
    return NextResponse.json(
      { error: 'غير مصرح بالوصول' },
      { status: 401 },
    )
  }

  const supabase = await createSupabaseServerClient()

  const [
    tripsResult,
    academicYearsResult,
    coursesResult,
    levelsResult,
  ] = await Promise.all([
    supabase
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
        created_by,
        approved_by,
        approved_at,
        approval_note,
        rejected_by,
        rejected_at,
        rejection_note,
        closed_by,
        closed_at,
        close_note,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false }),

    supabase
      .from('academic_years')
      .select(`
        id,
        name,
        start_date,
        end_date,
        is_current,
        is_active,
        annual_fee
      `)
      .eq('is_active', true)
      .order('is_current', {
        ascending: false,
      })
      .order('start_date', {
        ascending: false,
      }),

    supabase
      .from('courses')
      .select(`
        id,
        name,
        academic_year_id,
        start_date,
        end_date,
        days
      `)
      .order('name', {
        ascending: true,
      }),

    supabase
      .from('levels')
      .select(`
        id,
        name,
        sort_order,
        is_active,
        registration_enabled
      `)
      .eq('is_active', true)
      .order('sort_order', {
        ascending: true,
      }),
  ])

  if (tripsResult.error) {
    console.error(
      'GET /api/trips - trips error:',
      tripsResult.error,
    )

    return NextResponse.json(
      {
        error: 'تعذر تحميل الرحلات',
        details: tripsResult.error.message,
      },
      { status: 500 },
    )
  }

  if (academicYearsResult.error) {
    console.error(
      'GET /api/trips - academic years error:',
      academicYearsResult.error,
    )

    return NextResponse.json(
      {
        error: 'تعذر تحميل السنوات الدراسية',
        details: academicYearsResult.error.message,
      },
      { status: 500 },
    )
  }

  if (coursesResult.error) {
    console.error(
      'GET /api/trips - courses error:',
      coursesResult.error,
    )

    return NextResponse.json(
      {
        error: 'تعذر تحميل الدورات',
        details: coursesResult.error.message,
      },
      { status: 500 },
    )
  }

  if (levelsResult.error) {
    console.error(
      'GET /api/trips - levels error:',
      levelsResult.error,
    )

    return NextResponse.json(
      {
        error: 'تعذر تحميل المستويات',
        details: levelsResult.error.message,
      },
      { status: 500 },
    )
  }

  const trips = tripsResult.data ?? []

  /*
   * تحميل المستويات المرتبطة بكل رحلة.
   *
   * نخليها داخل GET حتى نقدر نعرض المستويات
   * في صفحة الرحلات بدون إنشاء مصدر بيانات جديد.
   */
  let tripLevels: Array<{
    id: string
    trip_id: string
    level_id: string
  }> = []

  if (trips.length > 0) {
    const tripIds = trips.map((trip) => trip.id)

    const tripLevelsResult = await supabase
      .from('trip_levels')
      .select(`
        id,
        trip_id,
        level_id
      `)
      .in('trip_id', tripIds)

    if (tripLevelsResult.error) {
      console.error(
        'GET /api/trips - trip levels error:',
        tripLevelsResult.error,
      )

      return NextResponse.json(
        {
          error: 'تعذر تحميل مستويات الرحلات',
          details: tripLevelsResult.error.message,
        },
        { status: 500 },
      )
    }

    tripLevels = tripLevelsResult.data ?? []
  }

  return NextResponse.json({
    trips,
    academicYears:
      academicYearsResult.data ?? [],
    courses:
      coursesResult.data ?? [],
    levels:
      levelsResult.data ?? [],
    tripLevels,
  })
}

export async function POST(request: Request) {
  const { access, response } = await requireAuth()

  if (response) return response

  if (!access) {
    return NextResponse.json(
      { error: 'غير مصرح بالوصول' },
      { status: 401 },
    )
  }

  let body: any

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'بيانات الطلب غير صحيحة' },
      { status: 400 },
    )
  }

  const name =
    typeof body.name === 'string'
      ? body.name.trim()
      : ''

  const description =
    typeof body.description === 'string'
      ? body.description.trim()
      : null

  const location =
    typeof body.location === 'string'
      ? body.location.trim()
      : null

  const tripDate =
    typeof body.trip_date === 'string' &&
    body.trip_date.trim()
      ? body.trip_date.trim()
      : null

  const meetingTime =
    typeof body.meeting_time === 'string' &&
    body.meeting_time.trim()
      ? body.meeting_time.trim()
      : null

  const returnTime =
    typeof body.return_time === 'string' &&
    body.return_time.trim()
      ? body.return_time.trim()
      : null

  const note =
    typeof body.note === 'string'
      ? body.note.trim()
      : null

  const academicYearId =
    typeof body.academic_year_id === 'string'
      ? body.academic_year_id
      : ''

  const courseId =
    typeof body.course_id === 'string'
      ? body.course_id
      : ''

  const attendanceMin =
    body.attendance_min === null ||
    body.attendance_min === undefined ||
    body.attendance_min === ''
      ? null
      : Number(body.attendance_min)

  const attendanceMax =
    body.attendance_max === null ||
    body.attendance_max === undefined ||
    body.attendance_max === ''
      ? null
      : Number(body.attendance_max)

  const fee =
    body.fee === null ||
    body.fee === undefined ||
    body.fee === ''
      ? 0
      : Number(body.fee)

  const notesRequirement =
    body.notes_requirement === 'required' ||
    body.notes_requirement === 'none' ||
    body.notes_requirement === 'any'
      ? body.notes_requirement
      : 'any'

  /*
   * المستويات المختارة من نموذج إنشاء الرحلة.
   */
  const levelIds = Array.isArray(body.level_ids)
    ? [
        ...new Set(
          body.level_ids.filter(
            (id: unknown): id is string =>
              typeof id === 'string' &&
              id.trim().length > 0,
          ),
        ),
      ]
    : []

  if (!name) {
    return NextResponse.json(
      { error: 'اسم الرحلة مطلوب' },
      { status: 400 },
    )
  }

  if (!academicYearId) {
    return NextResponse.json(
      { error: 'السنة الدراسية مطلوبة' },
      { status: 400 },
    )
  }

  if (!courseId) {
    return NextResponse.json(
      { error: 'الدورة مطلوبة' },
      { status: 400 },
    )
  }

  if (levelIds.length === 0) {
    return NextResponse.json(
      { error: 'اختر مستوى واحداً على الأقل' },
      { status: 400 },
    )
  }

  if (!Number.isFinite(fee) || fee < 0) {
    return NextResponse.json(
      { error: 'قيمة رسوم الرحلة غير صحيحة' },
      { status: 400 },
    )
  }

  if (
    attendanceMin !== null &&
    (!Number.isFinite(attendanceMin) ||
      attendanceMin < 0 ||
      attendanceMin > 100)
  ) {
    return NextResponse.json(
      {
        error:
          'الحد الأدنى للحضور يجب أن يكون بين 0 و100',
      },
      { status: 400 },
    )
  }

  if (
    attendanceMax !== null &&
    (!Number.isFinite(attendanceMax) ||
      attendanceMax < 0 ||
      attendanceMax > 100)
  ) {
    return NextResponse.json(
      {
        error:
          'الحد الأعلى للحضور يجب أن يكون بين 0 و100',
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
          'الحد الأدنى للحضور لا يمكن أن يكون أكبر من الحد الأعلى',
      },
      { status: 400 },
    )
  }

  const supabase =
    await createSupabaseServerClient()

  /*
   * التحقق من السنة الدراسية.
   */
  const { data: academicYear, error: yearError } =
    await supabase
      .from('academic_years')
      .select(`
        id,
        name,
        is_active
      `)
      .eq('id', academicYearId)
      .maybeSingle()

  if (yearError) {
    console.error(
      'POST /api/trips - academic year error:',
      yearError,
    )

    return NextResponse.json(
      {
        error:
          'تعذر التحقق من السنة الدراسية',
        details: yearError.message,
      },
      { status: 500 },
    )
  }

  if (!academicYear) {
    return NextResponse.json(
      { error: 'السنة الدراسية غير موجودة' },
      { status: 400 },
    )
  }

  if (!academicYear.is_active) {
    return NextResponse.json(
      {
        error:
          'لا يمكن إنشاء رحلة لسنة دراسية غير مفعلة',
      },
      { status: 400 },
    )
  }

  /*
   * التحقق من الدورة وأنها تابعة لنفس السنة.
   */
  const { data: course, error: courseError } =
    await supabase
      .from('courses')
      .select(`
        id,
        name,
        academic_year_id
      `)
      .eq('id', courseId)
      .maybeSingle()

  if (courseError) {
    console.error(
      'POST /api/trips - course error:',
      courseError,
    )

    return NextResponse.json(
      {
        error: 'تعذر التحقق من الدورة',
        details: courseError.message,
      },
      { status: 500 },
    )
  }

  if (!course) {
    return NextResponse.json(
      { error: 'الدورة غير موجودة' },
      { status: 400 },
    )
  }

  if (course.academic_year_id !== academicYearId) {
    return NextResponse.json(
      {
        error:
          'الدورة المختارة لا تتبع السنة الدراسية المحددة',
      },
      { status: 400 },
    )
  }

  /*
   * التحقق من المستويات.
   */
  const { data: levels, error: levelsError } =
    await supabase
      .from('levels')
      .select(`
        id,
        name,
        is_active
      `)
      .in('id', levelIds)

  if (levelsError) {
    console.error(
      'POST /api/trips - levels error:',
      levelsError,
    )

    return NextResponse.json(
      {
        error: 'تعذر التحقق من المستويات',
        details: levelsError.message,
      },
      { status: 500 },
    )
  }

  const validLevelIds = new Set(
    (levels ?? [])
      .filter((level) => level.is_active)
      .map((level) => level.id),
  )

  const invalidLevelIds = levelIds.filter(
    (id) => !validLevelIds.has(id),
  )

  if (invalidLevelIds.length > 0) {
    return NextResponse.json(
      {
        error:
          'يوجد مستوى غير موجود أو غير مفعل',
      },
      { status: 400 },
    )
  }

  /*
   * إنشاء الرحلة.
   */
  const { data: trip, error: tripError } =
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
        academic_year_id: academicYearId,
        course_id: courseId,
        attendance_min: attendanceMin,
        attendance_max: attendanceMax,
        notes_requirement: notesRequirement,
        status: 'draft',
        created_by: access.userId,
      })
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
        created_by,
        created_at,
        updated_at
      `)
      .single()

  if (tripError || !trip) {
    console.error(
      'POST /api/trips - create trip error:',
      tripError,
    )

    return NextResponse.json(
      {
        error: 'تعذر إنشاء الرحلة',
        details:
          tripError?.message ??
          'لم يتم إنشاء الرحلة',
      },
      { status: 500 },
    )
  }

  /*
   * حفظ المستويات المرتبطة بالرحلة.
   */
  const tripLevelRows = levelIds.map(
    (levelId) => ({
      trip_id: trip.id,
      level_id: levelId,
    }),
  )

  const { data: insertedTripLevels, error: tripLevelsError } =
    await supabase
      .from('trip_levels')
      .insert(tripLevelRows)
      .select(`
        id,
        trip_id,
        level_id
      `)

  if (tripLevelsError) {
    console.error(
      'POST /api/trips - trip levels insert error:',
      tripLevelsError,
    )

    /*
     * إذا فشل حفظ المستويات، نحذف الرحلة
     * حتى لا يبقى عندنا سجل رحلة ناقص.
     */
    const { error: cleanupError } =
      await supabase
        .from('trips')
        .delete()
        .eq('id', trip.id)

    if (cleanupError) {
      console.error(
        'POST /api/trips - cleanup error:',
        cleanupError,
      )
    }

    return NextResponse.json(
      {
        error:
          'تعذر حفظ مستويات الرحلة',
        details:
          tripLevelsError.message,
      },
      { status: 500 },
    )
  }

  return NextResponse.json(
    {
      trip,
      tripLevels:
        insertedTripLevels ?? [],
    },
    { status: 201 },
  )
}