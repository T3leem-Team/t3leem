import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/require-auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'

type TripStatus =
  | 'draft'
  | 'pending_approval'
  | 'published'
  | 'rejected'
  | 'closed'

const tripSelect = `
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
`

function jsonError(
  error: string,
  status = 400,
  details?: string,
) {
  return NextResponse.json(
    {
      error,
      ...(details ? { details } : {}),
    },
    { status },
  )
}

async function getTripSettings(
  supabase: Awaited<
    ReturnType<typeof createSupabaseServerClient>
  >,
) {
  const {
    data,
    error,
  } = await supabase
    .from('student_status_settings')
    .select(`
      is_enabled,
      allow_trip_creation,
      allow_direct_trip_publish
    `)
    .limit(1)
    .maybeSingle()

  return {
    settings: data,
    error,
  }
}

/*
 * =========================================================
 * GET
 * =========================================================
 */

export async function GET() {
  const { access, response } =
    await requireAuth()

  if (response) return response

  if (!access) {
    return jsonError(
      'غير مصرح بالوصول',
      401,
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
      .select(tripSelect)
      .order('created_at', {
        ascending: false,
      }),

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

    return jsonError(
      'تعذر تحميل الرحلات',
      500,
      tripsResult.error.message,
    )
  }

  if (academicYearsResult.error) {
    console.error(
      'GET /api/trips - academic years error:',
      academicYearsResult.error,
    )

    return jsonError(
      'تعذر تحميل السنوات الدراسية',
      500,
      academicYearsResult.error.message,
    )
  }

  if (coursesResult.error) {
    console.error(
      'GET /api/trips - courses error:',
      coursesResult.error,
    )

    return jsonError(
      'تعذر تحميل الدورات',
      500,
      coursesResult.error.message,
    )
  }

  if (levelsResult.error) {
    console.error(
      'GET /api/trips - levels error:',
      levelsResult.error,
    )

    return jsonError(
      'تعذر تحميل المستويات',
      500,
      levelsResult.error.message,
    )
  }

  const trips =
    tripsResult.data ?? []

  let tripLevels: Array<{
    id: string
    trip_id: string
    level_id: string
  }> = []

  if (trips.length > 0) {
    const tripIds = trips.map(
      (trip) => trip.id,
    )

    const {
      data,
      error,
    } = await supabase
      .from('trip_levels')
      .select(`
        id,
        trip_id,
        level_id
      `)
      .in('trip_id', tripIds)

    if (error) {
      console.error(
        'GET /api/trips - trip levels error:',
        error,
      )

      return jsonError(
        'تعذر تحميل مستويات الرحلات',
        500,
        error.message,
      )
    }

    tripLevels = data ?? []
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

/*
 * =========================================================
 * POST
 * =========================================================
 */

export async function POST(
  request: Request,
) {
  const { access, response } =
    await requireAuth()

  if (response) return response

  if (!access || !access.userId) {
    return jsonError(
      'غير مصرح بالوصول',
      401,
    )
  }

  return createTrip(
    request,
    access.userId,
  )
}
/*
 * =========================================================
 * PATCH
 * =========================================================
 */

export async function PATCH(
  request: Request,
) {
  const { access, response } =
    await requireAuth()

  if (response) return response

  if (!access) {
    return jsonError(
      'غير مصرح بالوصول',
      401,
    )
  }

  let body: any

  try {
    body = await request.json()
  } catch {
    return jsonError(
      'بيانات الطلب غير صحيحة',
      400,
    )
  }

  const tripId =
    typeof body.id === 'string'
      ? body.id.trim()
      : ''

  if (!tripId) {
    return jsonError(
      'معرف الرحلة مطلوب',
      400,
    )
  }

  const supabase =
    await createSupabaseServerClient()

  /*
   * =======================================================
   * إغلاق الرحلة
   * =======================================================
   *
   * يدعم الطلب الحالي من الواجهة:
   *
   * {
   *   id: tripId,
   *   status: 'closed'
   * }
   *
   * ويدعم أيضًا:
   *
   * {
   *   id: tripId,
   *   action: 'close',
   *   close_note: '...'
   * }
   *
   * الإغلاق مسموح فقط:
   *
   * published -> closed
   *
   */

  if (
    body.status === 'closed' ||
    body.action === 'close'
  ) {
    const {
      data: existingTrip,
      error: existingError,
    } = await supabase
      .from('trips')
      .select(`
        id,
        status
      `)
      .eq('id', tripId)
      .maybeSingle()

    if (existingError) {
      console.error(
        'PATCH /api/trips - close trip lookup error:',
        existingError,
      )

      return jsonError(
        'تعذر التحقق من الرحلة',
        500,
        existingError.message,
      )
    }

    if (!existingTrip) {
      return jsonError(
        'الرحلة غير موجودة',
        404,
      )
    }

    if (
      existingTrip.status ===
      'closed'
    ) {
      return jsonError(
        'الرحلة مغلقة بالفعل',
        400,
      )
    }

    if (
      existingTrip.status !==
      'published'
    ) {
      return jsonError(
        'لا يمكن إغلاق الرحلة إلا إذا كانت منشورة',
        400,
      )
    }

    const closeNote =
      typeof body.close_note ===
      'string'
        ? body.close_note.trim()
        : null

    const now =
      new Date().toISOString()

    const {
      data: closedTrip,
      error: closeError,
    } = await supabase
      .from('trips')
      .update({
        status: 'closed',
        closed_by:
          access.userId,
        closed_at: now,
        close_note:
          closeNote || null,
        updated_at: now,
      })
      .eq('id', tripId)
      .eq('status', 'published')
      .select(tripSelect)
      .single()

    if (
      closeError ||
      !closedTrip
    ) {
      console.error(
        'PATCH /api/trips - close error:',
        closeError,
      )

      return jsonError(
        'تعذر إغلاق الرحلة',
        500,
        closeError?.message,
      )
    }

    return NextResponse.json({
      trip: closedTrip,
      closed: true,
    })
  }

  /*
   * =======================================================
   * نشر الرحلة
   * =======================================================
   *
   * الطلب:
   *
   * {
   *   id: tripId,
   *   status: 'published'
   * }
   *
   */

  if (body.status === 'published') {
    const {
      data: existingTrip,
      error: existingError,
    } = await supabase
      .from('trips')
      .select(`
        id,
        status
      `)
      .eq('id', tripId)
      .maybeSingle()

    if (existingError) {
      console.error(
        'PATCH /api/trips - publish trip lookup error:',
        existingError,
      )

      return jsonError(
        'تعذر التحقق من الرحلة',
        500,
        existingError.message,
      )
    }

    if (!existingTrip) {
      return jsonError(
        'الرحلة غير موجودة',
        404,
      )
    }

    if (
      existingTrip.status ===
      'closed'
    ) {
      return jsonError(
        'لا يمكن نشر رحلة مغلقة',
        400,
      )
    }

    if (
      existingTrip.status !==
      'draft'
    ) {
      return jsonError(
        'لا يمكن نشر الرحلة إلا إذا كانت في حالة مسودة',
        400,
      )
    }

    const {
      settings,
      error: settingsError,
    } = await getTripSettings(
      supabase,
    )

    if (settingsError) {
      console.error(
        'PATCH /api/trips - publish settings error:',
        settingsError,
      )

      return jsonError(
        'تعذر التحقق من إعدادات النشر',
        500,
        settingsError.message,
      )
    }

    if (
      settings?.is_enabled ===
      false
    ) {
      return jsonError(
        'ميزة الرحلات موقوفة من إعدادات النظام',
        403,
      )
    }

    if (
      settings?.allow_direct_trip_publish !==
      true
    ) {
      return jsonError(
        'النشر المباشر موقوف من إعدادات النظام',
        403,
      )
    }

    const {
      count: selectedStudentsCount,
      error: studentsError,
    } = await supabase
      .from('trip_students')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq('trip_id', tripId)
      .eq('selected', true)

    if (studentsError) {
      console.error(
        'PATCH /api/trips - selected students error:',
        studentsError,
      )

      return jsonError(
        'تعذر التحقق من طلاب الرحلة',
        500,
        studentsError.message,
      )
    }

    if (
      !selectedStudentsCount ||
      selectedStudentsCount === 0
    ) {
      return jsonError(
        'يجب حفظ طالب واحد على الأقل قبل نشر الرحلة',
        400,
      )
    }

    const {
      data: publishedTrip,
      error: publishError,
    } = await supabase
      .from('trips')
      .update({
        status: 'published',
        updated_at:
          new Date().toISOString(),
      })
      .eq('id', tripId)
      .eq('status', 'draft')
      .select(tripSelect)
      .single()

    if (
      publishError ||
      !publishedTrip
    ) {
      console.error(
        'PATCH /api/trips - publish error:',
        publishError,
      )

      return jsonError(
        'تعذر نشر الرحلة',
        500,
        publishError?.message,
      )
    }

    return NextResponse.json({
      trip: publishedTrip,
      published: true,
    })
  }

  /*
   * =======================================================
   * تعديل بيانات الرحلة
   * =======================================================
   */

  const {
    data: existingTrip,
    error: existingError,
  } = await supabase
    .from('trips')
    .select(`
      id,
      status
    `)
    .eq('id', tripId)
    .maybeSingle()

  if (existingError) {
    console.error(
      'PATCH /api/trips - existing trip error:',
      existingError,
    )

    return jsonError(
      'تعذر التحقق من الرحلة',
      500,
      existingError.message,
    )
  }

  if (!existingTrip) {
    return jsonError(
      'الرحلة غير موجودة',
      404,
    )
  }

  if (
    existingTrip.status ===
    'closed'
  ) {
    return jsonError(
      'لا يمكن تعديل رحلة مغلقة',
      400,
    )
  }

  if (
    existingTrip.status ===
    'published'
  ) {
    return jsonError(
      'لا يمكن تعديل رحلة منشورة',
      400,
    )
  }

  /*
   * قراءة البيانات.
   */

  const name =
    typeof body.name === 'string'
      ? body.name.trim()
      : ''

  const description =
    typeof body.description ===
    'string'
      ? body.description.trim()
      : null

  const location =
    typeof body.location ===
    'string'
      ? body.location.trim()
      : null

  const tripDate =
    typeof body.trip_date ===
      'string' &&
    body.trip_date.trim()
      ? body.trip_date.trim()
      : null

  const meetingTime =
    typeof body.meeting_time ===
      'string' &&
    body.meeting_time.trim()
      ? body.meeting_time.trim()
      : null

  const returnTime =
    typeof body.return_time ===
      'string' &&
    body.return_time.trim()
      ? body.return_time.trim()
      : null

  const note =
    typeof body.note === 'string'
      ? body.note.trim()
      : null

  const academicYearId =
    typeof body.academic_year_id ===
    'string'
      ? body.academic_year_id.trim()
      : ''

  const courseId =
    typeof body.course_id ===
    'string'
      ? body.course_id.trim()
      : ''

  const fee =
    body.fee === null ||
    body.fee === undefined ||
    body.fee === ''
      ? 0
      : Number(body.fee)

  const attendanceMin =
    body.attendance_min ===
      null ||
    body.attendance_min ===
      undefined ||
    body.attendance_min === ''
      ? null
      : Number(body.attendance_min)

  const attendanceMax =
    body.attendance_max ===
      null ||
    body.attendance_max ===
      undefined ||
    body.attendance_max === ''
      ? null
      : Number(body.attendance_max)

  const notesRequirement =
    body.notes_requirement ===
      'required' ||
    body.notes_requirement ===
      'none' ||
    body.notes_requirement ===
      'any'
      ? body.notes_requirement
      : 'any'

  const levelIds =
    Array.isArray(
      body.level_ids,
    )
      ? [
          ...new Set(
            body.level_ids.filter(
              (
                id: unknown,
              ): id is string =>
                typeof id ===
                  'string' &&
                id.trim().length >
                  0,
            ),
          ),
        ]
      : []

  /*
   * =======================================================
   * التحقق الأساسي
   * =======================================================
   */

  if (!name) {
    return jsonError(
      'اسم الرحلة مطلوب',
      400,
    )
  }

  if (!academicYearId) {
    return jsonError(
      'السنة الدراسية مطلوبة',
      400,
    )
  }

  if (!courseId) {
    return jsonError(
      'الدورة مطلوبة',
      400,
    )
  }

  if (levelIds.length === 0) {
    return jsonError(
      'اختر مستوى واحداً على الأقل',
      400,
    )
  }

  if (
    !Number.isFinite(fee) ||
    fee < 0
  ) {
    return jsonError(
      'قيمة رسوم الرحلة غير صحيحة',
      400,
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
    return jsonError(
      'الحد الأدنى للحضور يجب أن يكون بين 0 و100',
      400,
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
    return jsonError(
      'الحد الأعلى للحضور يجب أن يكون بين 0 و100',
      400,
    )
  }

  if (
    attendanceMin !== null &&
    attendanceMax !== null &&
    attendanceMin >
      attendanceMax
  ) {
    return jsonError(
      'الحد الأدنى للحضور لا يمكن أن يكون أكبر من الحد الأعلى',
      400,
    )
  }

  /*
   * =======================================================
   * التحقق من السنة الدراسية
   * =======================================================
   */

  const {
    data: academicYear,
    error: academicYearError,
  } = await supabase
    .from('academic_years')
    .select(`
      id,
      is_active
    `)
    .eq('id', academicYearId)
    .maybeSingle()

  if (academicYearError) {
    console.error(
      'PATCH /api/trips - academic year error:',
      academicYearError,
    )

    return jsonError(
      'تعذر التحقق من السنة الدراسية',
      500,
      academicYearError.message,
    )
  }

  if (!academicYear) {
    return jsonError(
      'السنة الدراسية غير موجودة',
      400,
    )
  }

  if (!academicYear.is_active) {
    return jsonError(
      'لا يمكن استخدام سنة دراسية غير مفعلة',
      400,
    )
  }

  /*
   * =======================================================
   * التحقق من الدورة
   * =======================================================
   */

  const {
    data: course,
    error: courseError,
  } = await supabase
    .from('courses')
    .select(`
      id,
      academic_year_id
    `)
    .eq('id', courseId)
    .maybeSingle()

  if (courseError) {
    console.error(
      'PATCH /api/trips - course error:',
      courseError,
    )

    return jsonError(
      'تعذر التحقق من الدورة',
      500,
      courseError.message,
    )
  }

  if (!course) {
    return jsonError(
      'الدورة غير موجودة',
      400,
    )
  }

  if (
    course.academic_year_id !==
    academicYearId
  ) {
    return jsonError(
      'الدورة لا تتبع السنة الدراسية المحددة',
      400,
    )
  }

  /*
   * =======================================================
   * التحقق من المستويات
   * =======================================================
   */

  const {
    data: levels,
    error: levelsValidationError,
  } = await supabase
    .from('levels')
    .select(`
      id,
      is_active
    `)
    .in('id', levelIds)

  if (levelsValidationError) {
    console.error(
      'PATCH /api/trips - levels validation error:',
      levelsValidationError,
    )

    return jsonError(
      'تعذر التحقق من المستويات',
      500,
      levelsValidationError.message,
    )
  }

  const validLevelIds =
    new Set(
      (levels ?? [])
        .filter(
          (level) =>
            level.is_active,
        )
        .map(
          (level) =>
            level.id,
        ),
    )

  if (
    levelIds.some(
      (id) =>
        !validLevelIds.has(id),
    )
  ) {
    return jsonError(
      'يوجد مستوى غير موجود أو غير مفعل',
      400,
    )
  }

  /*
   * =======================================================
   * تحديث الرحلة
   * =======================================================
   */

  const {
    data: updatedTrip,
    error: updateError,
  } = await supabase
    .from('trips')
    .update({
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
      updated_at:
        new Date().toISOString(),
    })
    .eq('id', tripId)
    .select(tripSelect)
    .single()

  if (
    updateError ||
    !updatedTrip
  ) {
    console.error(
      'PATCH /api/trips - update error:',
      updateError,
    )

    return jsonError(
      'تعذر تعديل الرحلة',
      500,
      updateError?.message,
    )
  }

  /*
   * =======================================================
   * تحديث مستويات الرحلة
   * =======================================================
   */

  const {
    error: deleteLevelsError,
  } = await supabase
    .from('trip_levels')
    .delete()
    .eq('trip_id', tripId)

  if (deleteLevelsError) {
    console.error(
      'PATCH /api/trips - delete old levels error:',
      deleteLevelsError,
    )

    return jsonError(
      'تعذر تحديث مستويات الرحلة',
      500,
      deleteLevelsError.message,
    )
  }

  const tripLevelRows =
    levelIds.map(
      (levelId) => ({
        trip_id: tripId,
        level_id: levelId,
      }),
    )

  const {
    data: insertedLevels,
    error: levelsError,
  } = await supabase
    .from('trip_levels')
    .insert(tripLevelRows)
    .select(`
      id,
      trip_id,
      level_id
    `)

  if (levelsError) {
    console.error(
      'PATCH /api/trips - insert levels error:',
      levelsError,
    )

    return jsonError(
      'تعذر حفظ مستويات الرحلة',
      500,
      levelsError.message,
    )
  }

  return NextResponse.json({
    trip: updatedTrip,
    tripLevels:
      insertedLevels ?? [],
  })
}

/*
 * =========================================================
 * DELETE
 * =========================================================
 */

export async function DELETE(
  request: Request,
) {
  const { access, response } =
    await requireAuth()

  if (response) return response

  if (!access) {
    return jsonError(
      'غير مصرح بالوصول',
      401,
    )
  }

  let body: any

  try {
    body = await request.json()
  } catch {
    return jsonError(
      'بيانات الطلب غير صحيحة',
      400,
    )
  }

  const tripId =
    typeof body.id === 'string'
      ? body.id.trim()
      : ''

  if (!tripId) {
    return jsonError(
      'معرف الرحلة مطلوب',
      400,
    )
  }

  const supabase =
    await createSupabaseServerClient()

  const {
    data: trip,
    error: tripError,
  } = await supabase
    .from('trips')
    .select(`
      id,
      status
    `)
    .eq('id', tripId)
    .maybeSingle()

  if (tripError) {
    console.error(
      'DELETE /api/trips - trip lookup error:',
      tripError,
    )

    return jsonError(
      'تعذر التحقق من الرحلة',
      500,
      tripError.message,
    )
  }

  if (!trip) {
    return jsonError(
      'الرحلة غير موجودة',
      404,
    )
  }

  if (
    trip.status === 'closed'
  ) {
    return jsonError(
      'لا يمكن حذف رحلة مغلقة',
      400,
    )
  }

  if (
    trip.status === 'published'
  ) {
    return jsonError(
      'لا يمكن حذف رحلة منشورة',
      400,
    )
  }

  const {
    error: deleteError,
  } = await supabase
    .from('trips')
    .delete()
    .eq('id', tripId)

  if (deleteError) {
    console.error(
      'DELETE /api/trips - delete error:',
      deleteError,
    )

    return jsonError(
      'تعذر حذف الرحلة',
      500,
      deleteError.message,
    )
  }

  return NextResponse.json({
    success: true,
  })
}

/*
 * =========================================================
 * CREATE TRIP
 * =========================================================
 */

async function createTrip(
  request: Request,
  userId: string,
) {
  let body: any

  try {
    body = await request.json()
  } catch {
    return jsonError(
      'بيانات الطلب غير صحيحة',
      400,
    )
  }

  const name =
    typeof body.name === 'string'
      ? body.name.trim()
      : ''

  const description =
    typeof body.description ===
    'string'
      ? body.description.trim()
      : null

  const location =
    typeof body.location ===
    'string'
      ? body.location.trim()
      : null

  const tripDate =
    typeof body.trip_date ===
      'string' &&
    body.trip_date.trim()
      ? body.trip_date.trim()
      : null

  const meetingTime =
    typeof body.meeting_time ===
      'string' &&
    body.meeting_time.trim()
      ? body.meeting_time.trim()
      : null

  const returnTime =
    typeof body.return_time ===
      'string' &&
    body.return_time.trim()
      ? body.return_time.trim()
      : null

  const note =
    typeof body.note === 'string'
      ? body.note.trim()
      : null

  const academicYearId =
    typeof body.academic_year_id ===
    'string'
      ? body.academic_year_id.trim()
      : ''

  const courseId =
    typeof body.course_id ===
    'string'
      ? body.course_id.trim()
      : ''

  const fee =
    body.fee === null ||
    body.fee === undefined ||
    body.fee === ''
      ? 0
      : Number(body.fee)

  const attendanceMin =
    body.attendance_min ===
      null ||
    body.attendance_min ===
      undefined ||
    body.attendance_min === ''
      ? null
      : Number(body.attendance_min)

  const attendanceMax =
    body.attendance_max ===
      null ||
    body.attendance_max ===
      undefined ||
    body.attendance_max === ''
      ? null
      : Number(body.attendance_max)

  const notesRequirement =
    body.notes_requirement ===
      'required' ||
    body.notes_requirement ===
      'none' ||
    body.notes_requirement ===
      'any'
      ? body.notes_requirement
      : 'any'

  const levelIds =
    Array.isArray(
      body.level_ids,
    )
      ? [
          ...new Set(
            body.level_ids.filter(
              (
                id: unknown,
              ): id is string =>
                typeof id ===
                  'string' &&
                id.trim().length >
                  0,
            ),
          ),
        ]
      : []

  /*
   * =======================================================
   * التحقق الأساسي
   * =======================================================
   */

  if (!name) {
    return jsonError(
      'اسم الرحلة مطلوب',
      400,
    )
  }

  if (!academicYearId) {
    return jsonError(
      'السنة الدراسية مطلوبة',
      400,
    )
  }

  if (!courseId) {
    return jsonError(
      'الدورة مطلوبة',
      400,
    )
  }

  if (levelIds.length === 0) {
    return jsonError(
      'اختر مستوى واحداً على الأقل',
      400,
    )
  }

  if (
    !Number.isFinite(fee) ||
    fee < 0
  ) {
    return jsonError(
      'قيمة رسوم الرحلة غير صحيحة',
      400,
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
    return jsonError(
      'الحد الأدنى للحضور يجب أن يكون بين 0 و100',
      400,
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
    return jsonError(
      'الحد الأعلى للحضور يجب أن يكون بين 0 و100',
      400,
    )
  }

  if (
    attendanceMin !== null &&
    attendanceMax !== null &&
    attendanceMin >
      attendanceMax
  ) {
    return jsonError(
      'الحد الأدنى للحضور لا يمكن أن يكون أكبر من الحد الأعلى',
      400,
    )
  }

  const supabase =
    await createSupabaseServerClient()

  /*
   * =======================================================
   * إعدادات الرحلات
   * =======================================================
   */

  const {
    settings,
    error: settingsError,
  } = await getTripSettings(
    supabase,
  )

  if (settingsError) {
    console.error(
      'POST /api/trips - settings error:',
      settingsError,
    )

    return jsonError(
      'تعذر التحقق من إعدادات الرحلات',
      500,
      settingsError.message,
    )
  }

  if (
    settings?.is_enabled ===
    false
  ) {
    return jsonError(
      'ميزة الرحلات موقوفة من إعدادات النظام',
      403,
    )
  }

  if (
    settings?.allow_trip_creation ===
    false
  ) {
    return jsonError(
      'إنشاء الرحلات موقوف من إعدادات النظام',
      403,
    )
  }

  /*
   * =======================================================
   * السنة الدراسية
   * =======================================================
   */

  const {
    data: academicYear,
    error: academicYearError,
  } = await supabase
    .from('academic_years')
    .select(`
      id,
      is_active
    `)
    .eq('id', academicYearId)
    .maybeSingle()

  if (academicYearError) {
    console.error(
      'POST /api/trips - academic year error:',
      academicYearError,
    )

    return jsonError(
      'تعذر التحقق من السنة الدراسية',
      500,
      academicYearError.message,
    )
  }

  if (!academicYear) {
    return jsonError(
      'السنة الدراسية غير موجودة',
      400,
    )
  }

  if (!academicYear.is_active) {
    return jsonError(
      'لا يمكن إنشاء رحلة لسنة غير مفعلة',
      400,
    )
  }

  /*
   * =======================================================
   * الدورة
   * =======================================================
   */

  const {
    data: course,
    error: courseError,
  } = await supabase
    .from('courses')
    .select(`
      id,
      academic_year_id
    `)
    .eq('id', courseId)
    .maybeSingle()

  if (courseError) {
    console.error(
      'POST /api/trips - course error:',
      courseError,
    )

    return jsonError(
      'تعذر التحقق من الدورة',
      500,
      courseError.message,
    )
  }

  if (!course) {
    return jsonError(
      'الدورة غير موجودة',
      400,
    )
  }

  if (
    course.academic_year_id !==
    academicYearId
  ) {
    return jsonError(
      'الدورة لا تتبع السنة الدراسية المحددة',
      400,
    )
  }

  /*
   * =======================================================
   * المستويات
   * =======================================================
   */

  const {
    data: levels,
    error: levelsError,
  } = await supabase
    .from('levels')
    .select(`
      id,
      is_active
    `)
    .in('id', levelIds)

  if (levelsError) {
    console.error(
      'POST /api/trips - levels validation error:',
      levelsError,
    )

    return jsonError(
      'تعذر التحقق من المستويات',
      500,
      levelsError.message,
    )
  }

  const validLevelIds =
    new Set(
      (levels ?? [])
        .filter(
          (level) =>
            level.is_active,
        )
        .map(
          (level) =>
            level.id,
        ),
    )

  if (
    levelIds.some(
      (id) =>
        !validLevelIds.has(id),
    )
  ) {
    return jsonError(
      'يوجد مستوى غير موجود أو غير مفعل',
      400,
    )
  }

  /*
   * =======================================================
   * إنشاء الرحلة
   * =======================================================
   */

  const {
    data: trip,
    error: tripError,
  } = await supabase
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
      created_by: userId,
    })
    .select(tripSelect)
    .single()

  if (
    tripError ||
    !trip
  ) {
    console.error(
      'POST /api/trips - create error:',
      tripError,
    )

    return jsonError(
      'تعذر إنشاء الرحلة',
      500,
      tripError?.message,
    )
  }

  /*
   * =======================================================
   * حفظ مستويات الرحلة
   * =======================================================
   */

  const tripLevelRows =
    levelIds.map(
      (levelId) => ({
        trip_id: trip.id,
        level_id: levelId,
      }),
    )

  const {
    data: insertedLevels,
    error: insertedLevelsError,
  } = await supabase
    .from('trip_levels')
    .insert(tripLevelRows)
    .select(`
      id,
      trip_id,
      level_id
    `)

  if (insertedLevelsError) {
    console.error(
      'POST /api/trips - levels error:',
      insertedLevelsError,
    )

    /*
     * تنظيف الرحلة إذا فشل حفظ المستويات.
     */

    await supabase
      .from('trips')
      .delete()
      .eq('id', trip.id)

    return jsonError(
      'تعذر حفظ مستويات الرحلة',
      500,
      insertedLevelsError.message,
    )
  }

  return NextResponse.json(
    {
      trip,
      tripLevels:
        insertedLevels ?? [],
    },
    {
      status: 201,
    },
  )
}