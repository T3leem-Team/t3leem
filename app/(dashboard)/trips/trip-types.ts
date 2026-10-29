
export type TripStatus =
  | 'draft'
  | 'pending_approval'
  | 'published'
  | 'rejected'
  | 'closed'

export type Trip = {
  id: string
  name: string
  description: string | null
  location: string | null
  trip_date: string | null
  meeting_time: string | null
  return_time: string | null
  fee: number
  note: string | null
  attendance_min: number | null
  attendance_max: number | null
  notes_requirement: 'any' | 'required' | 'none'
  status: TripStatus
}

export type Course = {
  id: string
  name: string
}

export type Level = {
  id: string
  name: string
}

export type CourseNote = {
  note: string
  source: string
}

export type ResponseStatus = 'pending' | 'accepted' | 'rejected'

export type ResponseSource = 'student' | 'admin' | null

export type Student = {
  id: string
  name: string
  personal_id: string | null
  phone: string | null
  whatsapp?: string | null
  level: {
    id: string
    name: string
    sort_order: number | null
  } | null
  enrollment_id: string
  enrollment_status?: string | null
  attendance_percentage: number | null
  attendance_present: number
  attendance_absent: number
  attendance_late: number
  attendance_excused: number
  attendance_not_recorded: number
  course_notes: CourseNote[]
  eligible: boolean
  eligibility_note: string | null
  selected: boolean
  response: ResponseStatus
  response_note: string | null
  response_source: ResponseSource
  responded_at: string | null
  payment_amount: number
}

export type ApiResponse = {
  trip: Trip
  course: Course | null
  levels: Level[]
  lesson_dates: string[]
  students: Student[]
}
