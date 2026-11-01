import { createSupabaseServerClient } from '@/lib/supabase-server'

/*
 * =========================================================
 * TRIP SELECT
 * =========================================================
 */

export const tripSelect = `
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

/*
 * =========================================================
 * GET - LOAD TRIPS DATA
 * =========================================================
 */

export async function loadTrips() {
  const supabase = await createSupabaseServerClient()

  return await supabase
    .from('trips')
    .select(tripSelect)
    .order('created_at', {
      ascending: false,
    })
}

export async function loadActiveAcademicYears() {
  const supabase = await createSupabaseServerClient()

  return await supabase
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
    })
}

export async function loadCourses() {
  const supabase = await createSupabaseServerClient()

  return await supabase
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
    })
}

export async function loadActiveLevels() {
  const supabase = await createSupabaseServerClient()

  return await supabase
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
    })
}

export async function loadTripLevels(tripIds: string[]) {
  const supabase = await createSupabaseServerClient()

  return await supabase
    .from('trip_levels')
    .select(`
      id,
      trip_id,
      level_id
    `)
    .in('trip_id', tripIds)
}

/*
 * =========================================================
 * TRIP SETTINGS
 * =========================================================
 */

export async function loadTripSettings() {
  const supabase = await createSupabaseServerClient()

  return await supabase
    .from('student_status_settings')
    .select(`
      is_enabled,
      allow_trip_creation,
      allow_direct_trip_publish
    `)
    .limit(1)
    .maybeSingle()
}

/*
 * =========================================================
 * TRIP LOOKUPS
 * =========================================================
 */

export async function loadTripStatus(tripId: string) {
  const supabase = await createSupabaseServerClient()

  return await supabase
    .from('trips')
    .select(`
      id,
      status
    `)
    .eq('id', tripId)
    .maybeSingle()
}

export async function loadAcademicYearForTrip(
  academicYearId: string,
) {
  const supabase = await createSupabaseServerClient()

  return await supabase
    .from('academic_years')
    .select(`
      id,
      is_active
    `)
    .eq('id', academicYearId)
    .maybeSingle()
}

export async function loadCourseForTrip(
  courseId: string,
) {
  const supabase = await createSupabaseServerClient()

  return await supabase
    .from('courses')
    .select(`
      id,
      academic_year_id
    `)
    .eq('id', courseId)
    .maybeSingle()
}

export async function loadLevelsForTrip(
  levelIds: string[],
) {
  const supabase = await createSupabaseServerClient()

  return await supabase
    .from('levels')
    .select(`
      id,
      is_active
    `)
    .in('id', levelIds)
}

/*
 * =========================================================
 * CREATE TRIP
 * =========================================================
 */

export async function insertTrip(input: {
  name: string
  description: string | null
  location: string | null
  trip_date: string | null
  meeting_time: string | null
  return_time: string | null
  fee: number
  note: string | null
  academic_year_id: string
  course_id: string
  attendance_min: number | null
  attendance_max: number | null
  notes_requirement: 'required' | 'none' | 'any'
  status: 'draft'
  created_by: string
}) {
  const supabase = await createSupabaseServerClient()

  return await supabase
    .from('trips')
    .insert(input)
    .select(tripSelect)
    .single()
}

/*
 * =========================================================
 * UPDATE TRIP
 * =========================================================
 */

export async function updateTrip(
  tripId: string,
  input: {
    name: string
    description: string | null
    location: string | null
    trip_date: string | null
    meeting_time: string | null
    return_time: string | null
    fee: number
    note: string | null
    academic_year_id: string
    course_id: string
    attendance_min: number | null
    attendance_max: number | null
    notes_requirement: 'required' | 'none' | 'any'
    updated_at: string
  },
) {
  const supabase = await createSupabaseServerClient()

  return await supabase
    .from('trips')
    .update(input)
    .eq('id', tripId)
    .select(tripSelect)
    .single()
}

/*
 * =========================================================
 * CLOSE TRIP
 * =========================================================
 */

export async function closeTrip(
  tripId: string,
  data: {
    closed_by?: string
    closed_at: string
    close_note: string | null
    updated_at: string
  },
) {
  const supabase = await createSupabaseServerClient()

  return await supabase
    .from('trips')
    .update({
      status: 'closed',
      ...input,
    })
    .eq('id', tripId)
    .eq('status', 'published')
    .select(tripSelect)
    .single()
}

/*
 * =========================================================
 * PUBLISH TRIP
 * =========================================================
 */

export async function countSelectedTripStudents(
  tripId: string,
) {
  const supabase = await createSupabaseServerClient()

  return await supabase
    .from('trip_students')
    .select('id', {
      count: 'exact',
      head: true,
    })
    .eq('trip_id', tripId)
    .eq('selected', true)
}

export async function publishTrip(
  tripId: string,
  updatedAt: string,
) {
  const supabase = await createSupabaseServerClient()

  return await supabase
    .from('trips')
    .update({
      status: 'published',
      updated_at: updatedAt,
    })
    .eq('id', tripId)
    .eq('status', 'draft')
    .select(tripSelect)
    .single()
}

/*
 * =========================================================
 * TRIP LEVELS
 * =========================================================
 */

export async function deleteTripLevels(
  tripId: string,
) {
  const supabase = await createSupabaseServerClient()

  return await supabase
    .from('trip_levels')
    .delete()
    .eq('trip_id', tripId)
}

export async function insertTripLevels(
  rows: {
    trip_id: string
    level_id: string
  }[],
) {
  const supabase = await createSupabaseServerClient()

  return await supabase
    .from('trip_levels')
    .insert(rows)
    .select(`
      id,
      trip_id,
      level_id
    `)
}

/*
 * =========================================================
 * DELETE TRIP
 * =========================================================
 */

export async function deleteTrip(
  tripId: string,
) {
  const supabase = await createSupabaseServerClient()

  return await supabase
    .from('trips')
    .delete()
    .eq('id', tripId)
}
