
import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/require-auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'

import {
  loadTripStudentsTrip,
  loadTripStudentsCourse,
  loadTripStudentsTripLevels,
  loadTripStudentsLevelsByIds,
  loadTripStudentsEnrollments,
  loadTripStudentsAssignments,
  loadTripStudentsProfiles,
  loadTripStudentsAttendanceStatuses,
  loadTripStudentsAttendance,
  loadSavedTripStudents,
  loadTripStudentsForSaving,
  loadTripLevelIdsForSaving,
  loadTripStudentNotes,
  deleteStaleTripStudents,
  updateTripStudentSelection,
  insertNewTripStudents,
  loadFinalTripStudents,
  loadTripStatusForStudentUpdate,
  updateTripStudentParticipant,
  updateTripStudentPayment,
  updateTripStudentResponse,
} from '@/lib/features/trips/repositories/trip-students-admin.repository'

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

type AssignmentRow = {
  id: string
  student_id: string
  course_id: string
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
  payment_amount: number | null
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
 * حساب الحضور:
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
  if (min === null && max === null) {
    return true
  }

  if (percentage === null) {
    return false
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
    (
      attendanceMin !== null ||
      attendanceMax !== null
    )
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

/*
 * ============================================================
 * GET
 * ============================================================
 */

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
          error: 'غير مصرح بالوصول',
        },
        { status: 401 },
      )
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json(
        {
          error: 'معرف الرحلة مطلوب',
        },
        { status: 400 },
      )
    }

    const supabase =
      await createSupabaseServerClient()

    /*
     * الرحلة
     */
    const {
      data: trip,
      error: tripError,
    } = await loadTripStudentsTrip(
      supabase,
      id,
    )

    if (tripError) {
      console.error(
        'GET /api/trips/[id]/students - trip error:',
        tripError,
      )

      return NextResponse.json(
        {
          error: 'تعذر تحميل الرحلة',
          details: tripError.message,
        },
        { status: 500 },
      )
    }

    if (!trip) {
      return NextResponse.json(
        {
          error: 'الرحلة غير موجودة',
        },
        { status: 404 },
      )
    }

    /*
     * الدورة
     */
    const {
      data: course,
      error: courseError,
    } = await loadTripStudentsCourse(
      supabase,
      trip.course_id,
    )

    if (courseError) {
      console.error(
        'GET /api/trips/[id]/students - course error:',
        courseError,
      )

      return NextResponse.json(
        {
          error: 'تعذر تحميل الدورة',
          details: courseError.message,
        },
        { status: 500 },
      )
    }

    /*
     * مستويات الرحلة
     */
    const {
      data: tripLevels,
      error: tripLevelsError,
    } = await loadTripStudentsTripLevels(
      supabase,
      id,
    )

    if (tripLevelsError) {
      console.error(
        'GET /api/trips/[id]/students - trip levels error:',
        tripLevelsError,
      )

      return NextResponse.json(
        {
          error: 'تعذر تحميل مستويات الرحلة',
          details: tripLevelsError.message,
        },
        { status: 500 },
      )
    }

    const levelIds =
      (tripLevels ?? []).map(
        (item) => item.level_id,
      )

    /*
     * المستويات
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
      } = await loadTripStudentsLevelsByIds(
        supabase,
        levelIds,
      )

      if (levelsError) {
        console.error(
          'GET /api/trips/[id]/students - levels error:',
          levelsError,
        )

        return NextResponse.json(
          {
            error: 'تعذر تحميل المستويات',
            details: levelsError.message,
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
     * التسجيلات في السنة + المستوى
     */
    let enrollmentRows: EnrollmentRow[] = []

    if (levelIds.length > 0) {
      const {
        data: enrollments,
        error: enrollmentsError,
      } = await loadTripStudentsEnrollments(
        supabase,
        trip.academic_year_id,
        levelIds,
      )

      if (enrollmentsError) {
        console.error(
          'GET /api/trips/[id]/students - enrollments error:',
          enrollmentsError,
        )

        return NextResponse.json(
          {
            error: 'تعذر تحميل تسجيلات الطلاب',
            details: enrollmentsError.message,
          },
          { status: 500 },
        )
      }

      enrollmentRows =
        (enrollments ?? []) as EnrollmentRow[]
    }

    /*
     * الإسناد للدورة
     */
    const enrollmentStudentIds = [
      ...new Set(
        enrollmentRows.map(
          (item) => item.student_id,
        ),
      ),
    ]

    let assignmentRows: AssignmentRow[] = []

    if (enrollmentStudentIds.length > 0) {
      const {
        data: assignments,
        error: assignmentsError,
      } = await loadTripStudentsAssignments(
        supabase,
        trip.course_id,
        enrollmentStudentIds,
      )

      if (assignmentsError) {
        console.error(
          'GET /api/trips/[id]/students - assignments error:',
          assignmentsError,
        )

        return NextResponse.json(
          {
            error: 'تعذر تحميل إسنادات الطلاب للدورة',
            details: assignmentsError.message,
          },
          { status: 500 },
        )
      }

      assignmentRows =
        (assignments ?? []) as AssignmentRow[]
    }

    const assignedStudentIds =
      new Set(
        assignmentRows.map(
          (item) => item.student_id,
        ),
      )

    const candidateEnrollmentRows =
      enrollmentRows.filter(
        (enrollment) =>
          assignedStudentIds.has(
            enrollment.student_id,
          ),
      )

    const candidateStudentIds = [
      ...new Set(
        candidateEnrollmentRows.map(
          (item) => item.student_id,
        ),
      ),
    ]

    /*
     * الطلاب
     */
    let students: StudentRow[] = []

    if (candidateStudentIds.length > 0) {
      const {
        data: studentRows,
        error: studentsError,
      } = await loadTripStudentsProfiles(
        supabase,
        candidateStudentIds,
      )

      if (studentsError) {
        console.error(
          'GET /api/trips/[id]/students - students error:',
          studentsError,
        )

        return NextResponse.json(
          {
            error: 'تعذر تحميل الطلاب',
            details: studentsError.message,
          },
          { status: 500 },
        )
      }

      students =
        (studentRows ?? []) as StudentRow[]
    }

    /*
     * حالات الحضور
     */
    const {
      data: attendanceStatuses,
      error: attendanceStatusesError,
    } = await loadTripStudentsAttendanceStatuses(
      supabase,
    )

    if (attendanceStatusesError) {
      console.error(
        'GET /api/trips/[id]/students - attendance statuses error:',
        attendanceStatusesError,
      )

      return NextResponse.json(
        {
          error: 'تعذر تحميل حالات الحضور',
          details: attendanceStatusesError.message,
        },
        { status: 500 },
      )
    }

    const statusMap =
      new Map<string, string>(
        (
          (attendanceStatuses ?? []) as AttendanceStatus[]
        ).map((status) => [
          status.id,
          status.name,
        ]),
      )

    /*
     * الحضور
     */
    let attendance: AttendanceRow[] = []

    if (candidateStudentIds.length > 0) {
      const {
        data: attendanceRows,
        error: attendanceError,
      } = await loadTripStudentsAttendance(
        supabase,
        trip.course_id,
        candidateStudentIds,
        course?.end_date,
      )

      if (attendanceError) {
        console.error(
          'GET /api/trips/[id]/students - attendance error:',
          attendanceError,
        )

        return NextResponse.json(
          {
            error: 'تعذر تحميل الحضور',
            details: attendanceError.message,
          },
          { status: 500 },
        )
      }

      attendance =
        (attendanceRows ?? []) as AttendanceRow[]
    }

    /*
     * طلاب الرحلة المحفوظون
     */
    const {
      data: tripStudents,
      error: tripStudentsError,
    } = await loadSavedTripStudents(
      supabase,
      id,
    )

    if (tripStudentsError) {
      console.error(
        'GET /api/trips/[id]/students - trip students error:',
        tripStudentsError,
      )

      return NextResponse.json(
        {
          error: 'تعذر تحميل طلاب الرحلة',
          details: tripStudentsError.message,
        },
        { status: 500 },
      )
    }

    const savedTripStudents =
      (tripStudents ?? []) as TripStudentRow[]

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
     * تجميع الحضور
     */
    const attendanceByStudent =
      new Map<string, AttendanceRow[]>()

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
     * القائمة النهائية
     */
    const resultStudents =
      students
        .map((student) => {
          const enrollment =
            candidateEnrollmentRows.find(
              (item) =>
                item.student_id === student.id,
            )

          if (!enrollment) {
            return null
          }

          const level =
            levelMap.get(enrollment.level_id)

          const records =
            attendanceByStudent.get(student.id) ?? []

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

          const notesEligible =
            isNotesEligible(
              student.notes,
              trip.notes_requirement,
            )

          const eligible =
            attendanceEligible && notesEligible

          const saved =
            savedTripStudentMap.get(student.id)

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
            personal_id: student.personal_id,
            phone: student.phone,
            whatsapp: student.whatsapp,

            level: level
              ? {
                  id: level.id,
                  name: level.name,
                  sort_order: level.sort_order,
                }
              : null,

            enrollment_id: enrollment.id,
            enrollment_status: enrollment.status,

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

            course_notes: student.notes
              ? [
                  {
                    note: student.notes,
                    source: 'student',
                  },
                ]
              : [],

            eligible,
            eligibility_note: eligibilityNote,

            selected: saved
              ? Boolean(saved.selected)
              : eligible,

            response: saved?.response ?? 'pending',
            response_note: saved?.response_note ?? null,
            responded_at: saved?.responded_at ?? null,
            payment_amount: saved?.payment_amount ?? 0,
            trip_student_id: saved?.id ?? null,
          }
        })
        .filter(
          (
            item,
          ): item is NonNullable<typeof item> =>
            item !== null,
        )
        .sort((a, b) =>
          a.name.localeCompare(b.name, 'ar'),
        )

    const lessonDates = [
      ...new Set(
        attendance.map(
          (item) => item.attendance_date,
        ),
      ),
    ].sort()

    return NextResponse.json({
      trip,
      course,
      levels,
      tripLevels: tripLevels ?? [],
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
        error: 'حدث خطأ أثناء تحميل طلاب الرحلة',
      },
      { status: 500 },
    )
  }
}

/*
 * ============================================================
 * POST
 * ============================================================
 *
 * حفظ اختيار الطلاب فقط.
 *
 * payment_amount لا يتم لمسه هنا.
 */

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
          error: 'غير مصرح بالوصول',
        },
        { status: 401 },
      )
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json(
        {
          error: 'معرف الرحلة مطلوب',
        },
        { status: 400 },
      )
    }

    const supabase =
      await createSupabaseServerClient()

    const {
      data: trip,
      error: tripError,
    } = await loadTripStudentsForSaving(
      supabase,
      id,
    )

    if (tripError) {
      return NextResponse.json(
        {
          error: 'تعذر التحقق من الرحلة',
          details: tripError.message,
        },
        { status: 500 },
      )
    }

    if (!trip) {
      return NextResponse.json(
        {
          error: 'الرحلة غير موجودة',
        },
        { status: 404 },
      )
    }

    if (
      trip.status === 'closed' ||
      trip.status === 'published'
    ) {
      return NextResponse.json(
        {
          error: 'لا يمكن تعديل قائمة طلاب رحلة منشورة أو مغلقة',
        },
        { status: 400 },
      )
    }

    let body: any

    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        {
          error: 'بيانات الطلب غير صحيحة',
        },
        { status: 400 },
      )
    }

    const selectedStudentIds =
      Array.isArray(body.student_ids)
        ? [
            ...new Set(
              body.student_ids.filter(
                (
                  value: unknown,
                ): value is string =>
                  typeof value === 'string' &&
                  value.trim().length > 0,
              ),
            ),
          ]
        : []

    const selectedSet =
      new Set(selectedStudentIds)

    const {
      data: tripLevels,
      error: tripLevelsError,
    } = await loadTripLevelIdsForSaving(
      supabase,
      id,
    )

    if (tripLevelsError) {
      return NextResponse.json(
        {
          error: 'تعذر تحميل مستويات الرحلة',
          details: tripLevelsError.message,
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
          error: 'لا توجد مستويات مرتبطة بالرحلة',
        },
        { status: 400 },
      )
    }

    const {
      data: enrollments,
      error: enrollmentsError,
    } = await loadTripStudentsEnrollments(
      supabase,
      trip.academic_year_id,
      levelIds,
    )

    if (enrollmentsError) {
      return NextResponse.json(
        {
          error: 'تعذر التحقق من تسجيلات الطلاب',
          details: enrollmentsError.message,
        },
        { status: 500 },
      )
    }

    const enrollmentRows =
      (enrollments ?? []) as EnrollmentRow[]

    const enrollmentStudentIds = [
      ...new Set(
        enrollmentRows.map(
          (item) => item.student_id,
        ),
      ),
    ]

    let assignmentRows: AssignmentRow[] = []

    if (enrollmentStudentIds.length > 0) {
      const {
        data: assignments,
        error: assignmentsError,
      } = await loadTripStudentsAssignments(
        supabase,
        trip.course_id,
        enrollmentStudentIds,
      )

      if (assignmentsError) {
        return NextResponse.json(
          {
            error: 'تعذر التحقق من إسنادات الطلاب للدورة',
            details: assignmentsError.message,
          },
          { status: 500 },
        )
      }

      assignmentRows =
        (assignments ?? []) as AssignmentRow[]
    }

    const assignedStudentIds =
      new Set(
        assignmentRows.map(
          (item) => item.student_id,
        ),
      )

    const candidateEnrollmentRows =
      enrollmentRows.filter(
        (enrollment) =>
          assignedStudentIds.has(
            enrollment.student_id,
          ),
      )

    const candidateStudentIds = [
      ...new Set(
        candidateEnrollmentRows.map(
          (item) => item.student_id,
        ),
      ),
    ]

    const candidateStudentSet =
      new Set(candidateStudentIds)

    const invalidStudentIds =
      (selectedStudentIds as string[]).filter(
        (studentId) =>
          !candidateStudentSet.has(studentId),
      )

    if (invalidStudentIds.length > 0) {
      return NextResponse.json(
        {
          error: 'يوجد طالب غير مرتبط بالسنة أو المستوى أو غير مسند للدورة المحددة',
        },
        { status: 400 },
      )
    }

    const {
      data: existingTripStudents,
      error: existingTripStudentsError,
    } = await loadSavedTripStudents(
      supabase,
      id,
    )

    if (existingTripStudentsError) {
      return NextResponse.json(
        {
          error: 'تعذر تحميل الاختيارات السابقة',
          details: existingTripStudentsError.message,
        },
        { status: 500 },
      )
    }

    const existingRows =
      (existingTripStudents ?? []) as TripStudentRow[]

    const existingMap =
      new Map(
        existingRows.map(
          (row) => [
            row.student_id,
            row,
          ],
        ),
      )

    const staleStudentIds =
      existingRows
        .map((row) => row.student_id)
        .filter(
          (studentId) =>
            !candidateStudentSet.has(studentId),
        )

    if (staleStudentIds.length > 0) {
      const {
        error: deleteStaleError,
      } = await deleteStaleTripStudents(
        supabase,
        id,
        staleStudentIds,
      )

      if (deleteStaleError) {
        return NextResponse.json(
          {
            error: 'تعذر تنظيف طلاب الرحلة السابقين',
            details: deleteStaleError.message,
          },
          { status: 500 },
        )
      }

      for (const studentId of staleStudentIds) {
        existingMap.delete(studentId)
      }
    }

    const {
      data: attendanceStatuses,
      error: attendanceStatusesError,
    } = await loadTripStudentsAttendanceStatuses(
      supabase,
    )

    if (attendanceStatusesError) {
      return NextResponse.json(
        {
          error: 'تعذر تحميل حالات الحضور',
          details: attendanceStatusesError.message,
        },
        { status: 500 },
      )
    }

    const statusMap =
      new Map<string, string>(
        (
          (attendanceStatuses ?? []) as AttendanceStatus[]
        ).map((status) => [
          status.id,
          status.name,
        ]),
      )

    let attendanceRows: AttendanceRow[] = []

    if (candidateStudentIds.length > 0) {
      const {
        data: attendance,
        error: attendanceError,
      } = await loadTripStudentsAttendance(
        supabase,
        trip.course_id,
        candidateStudentIds,
      )

      if (attendanceError) {
        return NextResponse.json(
          {
            error: 'تعذر حساب حضور الطلاب',
            details: attendanceError.message,
          },
          { status: 500 },
        )
      }

      attendanceRows =
        (attendance ?? []) as AttendanceRow[]
    }

    const attendanceByStudent =
      new Map<string, AttendanceRow[]>()

    for (const record of attendanceRows) {
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

    let studentRows: Array<{
      id: string
      notes: string | null
    }> = []

    if (candidateStudentIds.length > 0) {
      const {
        data: students,
        error: studentsError,
      } = await loadTripStudentNotes(
        supabase,
        candidateStudentIds,
      )

      if (studentsError) {
        return NextResponse.json(
          {
            error: 'تعذر تحميل ملاحظات الطلاب',
            details: studentsError.message,
          },
          { status: 500 },
        )
      }

      studentRows = students ?? []
    }

    const studentNotesMap =
      new Map<string, string | null>(
        studentRows.map(
          (student) => [
            student.id,
            student.notes,
          ],
        ),
      )

    const newRows: Array<{
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
    }> = []

    for (const studentId of candidateStudentIds) {
      const enrollment =
        candidateEnrollmentRows.find(
          (item) => item.student_id === studentId,
        )

      if (!enrollment) {
        continue
      }

      const records =
        attendanceByStudent.get(studentId) ?? []

      const summary =
        calculateAttendance(
          records,
          statusMap,
        )

      const notes =
        studentNotesMap.get(studentId) ?? null

      const eligibilityNote =
        getEligibilityNote(
          summary.percentage,
          trip.attendance_min,
          trip.attendance_max,
          notes,
          trip.notes_requirement,
        )

      const selected =
        selectedSet.has(studentId)

      const existing =
        existingMap.get(studentId)

      if (existing) {
        const {
          error: updateError,
        } = await updateTripStudentSelection(
          supabase,
          existing.id,
          {
            enrollment_id: enrollment.id,
            attendance_percentage: summary.percentage,
            attendance_present: summary.present,
            attendance_absent: summary.absent,
            attendance_late: summary.late,
            attendance_excused: summary.excused,
            attendance_not_recorded: summary.notRecorded,
            eligibility_note: eligibilityNote,
            selected,
          },
        )

        if (updateError) {
          return NextResponse.json(
            {
              error: 'تعذر تحديث اختيار أحد الطلاب',
              details: updateError.message,
            },
            { status: 500 },
          )
        }

        continue
      }

      newRows.push({
        trip_id: id,
        student_id: studentId,
        enrollment_id: enrollment.id,
        attendance_percentage: summary.percentage,
        attendance_present: summary.present,
        attendance_absent: summary.absent,
        attendance_late: summary.late,
        attendance_excused: summary.excused,
        attendance_not_recorded: summary.notRecorded,
        eligibility_note: eligibilityNote,
        selected,
      })
    }

    if (newRows.length > 0) {
      const {
        error: insertError,
      } = await insertNewTripStudents(
        supabase,
        newRows,
      )

      if (insertError) {
        return NextResponse.json(
          {
            error: 'تعذر حفظ طلاب الرحلة الجدد',
            details: insertError.message,
          },
          { status: 500 },
        )
      }
    }

    const {
      data: finalStudents,
      error: finalStudentsError,
    } = await loadFinalTripStudents(
      supabase,
      id,
      candidateStudentIds,
    )

    if (finalStudentsError) {
      return NextResponse.json(
        {
          error: 'تم الحفظ ولكن تعذر تحميل النتيجة النهائية',
          details: finalStudentsError.message,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      tripId: id,
      selectedStudentIds,
      students: finalStudents ?? [],
    })
  } catch (error) {
    console.error(
      'POST /api/trips/[id]/students error:',
      error,
    )

    return NextResponse.json(
      {
        error: 'حدث خطأ أثناء حفظ طلاب الرحلة',
      },
      { status: 500 },
    )
  }
}

/*
 * ============================================================
 * PATCH
 * ============================================================
 */

export async function PATCH(
  request: Request,
  { params }: RouteContext,
) {
  try {
    const { access, response } =
      await requireAuth()

    if (response) return response

    if (!access) {
      return NextResponse.json(
        { error: 'غير مصرح بالوصول' },
        { status: 401 },
      )
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'معرف الرحلة مطلوب' },
        { status: 400 },
      )
    }

    const supabase =
      await createSupabaseServerClient()

    const {
      data: trip,
      error: tripError,
    } = await loadTripStatusForStudentUpdate(
      supabase,
      id,
    )

    if (tripError) {
      return NextResponse.json(
        {
          error: 'تعذر التحقق من الرحلة',
          details: tripError.message,
        },
        { status: 500 },
      )
    }

    if (!trip) {
      return NextResponse.json(
        { error: 'الرحلة غير موجودة' },
        { status: 404 },
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

    const studentId =
      typeof body.student_id === 'string'
        ? body.student_id.trim()
        : ''

    if (!studentId) {
      return NextResponse.json(
        { error: 'معرف الطالب مطلوب' },
        { status: 400 },
      )
    }

    /*
     * --------------------------------------------------------
     * تحديث المبلغ والرد معًا
     * action: participant_update
     * --------------------------------------------------------
     */
    if (body.action === 'participant_update') {
      if (trip.status === 'closed') {
        return NextResponse.json(
          { error: 'لا يمكن تعديل طالب في رحلة مغلقة' },
          { status: 400 },
        )
      }

      const hasPayment =
        Object.prototype.hasOwnProperty.call(
          body,
          'payment_amount',
        )

      const hasResponse =
        Object.prototype.hasOwnProperty.call(
          body,
          'response',
        )

      if (!hasPayment || !hasResponse) {
        return NextResponse.json(
          {
            error: 'المبلغ والرد مطلوبان للحفظ معًا',
          },
          { status: 400 },
        )
      }

      const rawAmount = body.payment_amount

      const paymentAmount =
        rawAmount === '' || rawAmount === null
          ? 0
          : Number(rawAmount)

      if (
        !Number.isFinite(paymentAmount) ||
        paymentAmount < 0
      ) {
        return NextResponse.json(
          { error: 'مبلغ الدفع غير صحيح' },
          { status: 400 },
        )
      }

      const roundedAmount =
        Math.round(paymentAmount * 1000) / 1000

      const tripResponse = body.response

      if (
        tripResponse !== 'pending' &&
        tripResponse !== 'accepted' &&
        tripResponse !== 'rejected'
      ) {
        return NextResponse.json(
          { error: 'حالة الرد غير صحيحة' },
          { status: 400 },
        )
      }

      if (
        roundedAmount > 0 &&
        tripResponse !== 'accepted'
      ) {
        return NextResponse.json(
          {
            error: 'لا يمكن تسجيل مبلغ دفع إلا إذا كانت حالة الرد موافق.',
          },
          { status: 400 },
        )
      }

      const responseNote =
        typeof body.response_note === 'string'
          ? body.response_note.trim() || null
          : null

      const isPending =
        tripResponse === 'pending'

      const {
        data: updated,
        error: updateError,
      } = await updateTripStudentParticipant(
        supabase,
        id,
        studentId,
        {
          payment_amount: roundedAmount,
          response: tripResponse,
          response_note: responseNote,
          responded_at: isPending
            ? null
            : new Date().toISOString(),
          response_source: isPending
            ? null
            : 'admin',
        },
      )

      if (updateError) {
        console.error(
          'PATCH participant_update error:',
          updateError,
        )

        return NextResponse.json(
          {
            error: 'تعذر حفظ المبلغ والرد',
            details: updateError.message,
          },
          { status: 500 },
        )
      }

      if (!updated) {
        return NextResponse.json(
          { error: 'الطالب غير موجود في الرحلة' },
          { status: 404 },
        )
      }

      return NextResponse.json({
        success: true,
        student: updated,
      })
    }

    /*
     * --------------------------------------------------------
     * تحديث مبلغ الدفع فقط — للتوافق مع الاستخدامات القديمة
     * --------------------------------------------------------
     */
    if (body.action === 'payment') {
      if (trip.status === 'closed') {
        return NextResponse.json(
          {
            error: 'لا يمكن تعديل الدفع في رحلة مغلقة',
          },
          { status: 400 },
        )
      }

      let paymentAmount = 0

      if (
        body.payment_amount !== null &&
        body.payment_amount !== undefined &&
        body.payment_amount !== ''
      ) {
        paymentAmount = Number(body.payment_amount)
      }

      if (
        !Number.isFinite(paymentAmount) ||
        paymentAmount < 0
      ) {
        return NextResponse.json(
          { error: 'مبلغ الدفع غير صحيح' },
          { status: 400 },
        )
      }

      paymentAmount =
        Math.round(paymentAmount * 1000) / 1000

      const {
        data: updated,
        error: updateError,
      } = await updateTripStudentPayment(
        supabase,
        id,
        studentId,
        paymentAmount,
      )

      if (updateError) {
        console.error(
          'PATCH payment error:',
          updateError,
        )

        return NextResponse.json(
          {
            error: 'تعذر حفظ مبلغ الدفع',
            details: updateError.message,
          },
          { status: 500 },
        )
      }

      if (!updated) {
        return NextResponse.json(
          { error: 'الطالب غير موجود في الرحلة' },
          { status: 404 },
        )
      }

      return NextResponse.json({
        success: true,
        student_id: studentId,
        payment_amount: updated.payment_amount ?? 0,
      })
    }

    /*
     * --------------------------------------------------------
     * تحديث الرد فقط — للتوافق مع الاستخدامات القديمة
     * --------------------------------------------------------
     */
    if (body.action === 'response') {
      const tripResponse = body.response

      if (
        tripResponse !== 'pending' &&
        tripResponse !== 'accepted' &&
        tripResponse !== 'rejected'
      ) {
        return NextResponse.json(
          { error: 'حالة الرد غير صحيحة' },
          { status: 400 },
        )
      }

      if (trip.status === 'closed') {
        return NextResponse.json(
          {
            error: 'لا يمكن تعديل الرد في رحلة مغلقة',
          },
          { status: 400 },
        )
      }

      const responseNote =
        typeof body.response_note === 'string'
          ? body.response_note.trim() || null
          : null

      const isPending =
        tripResponse === 'pending'

      const {
        data: updated,
        error: updateError,
      } = await updateTripStudentResponse(
        supabase,
        id,
        studentId,
        {
          response: tripResponse,
          response_note: responseNote,
          responded_at: isPending
            ? null
            : new Date().toISOString(),
          response_source: isPending
            ? null
            : 'admin',
        },
      )

      if (updateError) {
        console.error(
          'PATCH response error:',
          updateError,
        )

        return NextResponse.json(
          {
            error: 'تعذر حفظ رد الطالب',
            details: updateError.message,
          },
          { status: 500 },
        )
      }

      if (!updated) {
        return NextResponse.json(
          { error: 'الطالب غير موجود في الرحلة' },
          { status: 404 },
        )
      }

      return NextResponse.json({
        success: true,
        student: updated,
      })
    }

    return NextResponse.json(
      { error: 'نوع العملية غير معروف' },
      { status: 400 },
    )
  } catch (error) {
    console.error(
      'PATCH /api/trips/[id]/students error:',
      error,
    )

    return NextResponse.json(
      { error: 'حدث خطأ أثناء تحديث طالب الرحلة' },
      { status: 500 },
    )
  }
}
