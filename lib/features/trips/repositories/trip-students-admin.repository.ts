
import type { createSupabaseServerClient } from '@/lib/supabase-server'

type SupabaseServerClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>

const tripStudentSelect = `
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
  responded_at,
  payment_amount
`

/*
 * =========================================================
 * GET
 * =========================================================
 */

export async function loadTripStudentsTrip(
  supabase: SupabaseServerClient,
  tripId: string,
) {
  return await supabase
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
    .eq('id', tripId)
    .maybeSingle()
}

export async function loadTripStudentsCourse(
  supabase: SupabaseServerClient,
  courseId: string,
) {
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
    .eq('id', courseId)
    .maybeSingle()
}

export async function loadTripStudentsTripLevels(
  supabase: SupabaseServerClient,
  tripId: string,
) {
  return await supabase
    .from('trip_levels')
    .select(`
      id,
      trip_id,
      level_id
    `)
    .eq('trip_id', tripId)
}

export async function loadTripStudentsLevelsByIds(
  supabase: SupabaseServerClient,
  levelIds: string[],
) {
  return await supabase
    .from('levels')
    .select(`
      id,
      name,
      sort_order
    `)
    .in('id', levelIds)
}

export async function loadTripStudentsEnrollments(
  supabase: SupabaseServerClient,
  academicYearId: string,
  levelIds: string[],
) {
  return await supabase
    .from('enrollments')
    .select(`
      id,
      student_id,
      academic_year_id,
      level_id,
      class_id,
      status
    `)
    .eq('academic_year_id', academicYearId)
    .in('level_id', levelIds)
}

export async function loadTripStudentsAssignments(
  supabase: SupabaseServerClient,
  courseId: string,
  studentIds: string[],
) {
  return await supabase
    .from('teacher_student_assignments')
    .select(`
      id,
      student_id,
      course_id
    `)
    .eq('course_id', courseId)
    .in('student_id', studentIds)
}

export async function loadTripStudentsProfiles(
  supabase: SupabaseServerClient,
  studentIds: string[],
) {
  return await supabase
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
}

export async function loadTripStudentsAttendanceStatuses(
  supabase: SupabaseServerClient,
) {
  return await supabase
    .from('attendance_statuses')
    .select(`
      id,
      name
    `)
}

export async function loadTripStudentsAttendance(
  supabase: SupabaseServerClient,
  courseId: string,
  studentIds: string[],
  endDate?: string | null,
) {
  let query = supabase
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
    .eq('course_id', courseId)
    .in('student_id', studentIds)

  if (endDate) {
    query = query.lte('attendance_date', endDate)
  }

  return await query
}

export async function loadSavedTripStudents(
  supabase: SupabaseServerClient,
  tripId: string,
) {
  return await supabase
    .from('trip_students')
    .select(tripStudentSelect)
    .eq('trip_id', tripId)
}

/*
 * =========================================================
 * POST
 * =========================================================
 */

export async function loadTripStudentsForSaving(
  supabase: SupabaseServerClient,
  tripId: string,
) {
  return await supabase
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
    .eq('id', tripId)
    .maybeSingle()
}

export async function loadTripLevelIdsForSaving(
  supabase: SupabaseServerClient,
  tripId: string,
) {
  return await supabase
    .from('trip_levels')
    .select(`
      level_id
    `)
    .eq('trip_id', tripId)
}

export async function loadTripStudentNotes(
  supabase: SupabaseServerClient,
  studentIds: string[],
) {
  return await supabase
    .from('students')
    .select(`
      id,
      notes
    `)
    .in('id', studentIds)
}

export async function deleteStaleTripStudents(
  supabase: SupabaseServerClient,
  tripId: string,
  studentIds: string[],
) {
  return await supabase
    .from('trip_students')
    .delete()
    .eq('trip_id', tripId)
    .in('student_id', studentIds)
}

export async function updateTripStudentSelection(
  supabase: SupabaseServerClient,
  tripStudentId: string,
  data: {
    enrollment_id: string
    attendance_percentage: number | null
    attendance_present: number
    attendance_absent: number
    attendance_late: number
    attendance_excused: number
    attendance_not_recorded: number
    eligibility_note: string | null
    selected: boolean
  },
) {
  return await supabase
    .from('trip_students')
    .update(data)
    .eq('id', tripStudentId)
}

export async function insertNewTripStudents(
  supabase: SupabaseServerClient,
  rows: {
    trip_id: string
    student_id: string
    enrollment_id: string
    attendance_percentage: number | null
    attendance_present: number
    attendance_absent: number
    attendance_late: number
    attendance_excused: number
    attendance_not_recorded: number
    eligibility_note: string | null
    selected: boolean
  }[],
) {
  return await supabase
    .from('trip_students')
    .insert(
      rows.map((row) => ({
        ...row,
        response: 'pending',
      })),
    )
}

export async function loadFinalTripStudents(
  supabase: SupabaseServerClient,
  tripId: string,
  studentIds: string[],
) {
  return await supabase
    .from('trip_students')
    .select(tripStudentSelect)
    .eq('trip_id', tripId)
    .in(
      'student_id',
      studentIds.length > 0
        ? studentIds
        : ['00000000-0000-0000-0000-000000000000'],
    )
}

/*
 * =========================================================
 * PATCH
 * =========================================================
 */

export async function loadTripStatusForStudentUpdate(
  supabase: SupabaseServerClient,
  tripId: string,
) {
  return await supabase
    .from('trips')
    .select('id, status')
    .eq('id', tripId)
    .maybeSingle()
}

export async function updateTripStudentParticipant(
  supabase: SupabaseServerClient,
  tripId: string,
  studentId: string,
  data: {
    payment_amount: number
    response: string
    response_note: string | null
    responded_at: string | null
    response_source: string | null
  },
) {
  return await supabase
    .from('trip_students')
    .update(data)
    .eq('trip_id', tripId)
    .eq('student_id', studentId)
    .select(`
      id,
      trip_id,
      student_id,
      selected,
      payment_amount,
      response,
      response_note,
      responded_at,
      response_source
    `)
    .maybeSingle()
}

export async function updateTripStudentPayment(
  supabase: SupabaseServerClient,
  tripId: string,
  studentId: string,
  paymentAmount: number,
) {
  return await supabase
    .from('trip_students')
    .update({
      payment_amount: paymentAmount,
    })
    .eq('trip_id', tripId)
    .eq('student_id', studentId)
    .select(`
      id,
      trip_id,
      student_id,
      payment_amount
    `)
    .maybeSingle()
}

export async function updateTripStudentResponse(
  supabase: SupabaseServerClient,
  tripId: string,
  studentId: string,
  data: {
    response: string
    response_note: string | null
    responded_at: string | null
    response_source: string | null
  },
) {
  return await supabase
    .from('trip_students')
    .update(data)
    .eq('trip_id', tripId)
    .eq('student_id', studentId)
    .select(`
      id,
      trip_id,
      student_id,
      selected,
      response,
      response_note,
      responded_at,
      response_source
    `)
    .maybeSingle()
}
