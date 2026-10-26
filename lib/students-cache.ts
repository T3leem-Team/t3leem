
'use client'

import { supabase } from '@/lib/supabase'

import type {
  StudentAttendanceSummary,
  StudentCourseStatus,
} from '@/app/(dashboard)/students/student-details'

import type {
  StudentAttendanceRecord,
} from '@/app/(dashboard)/students/student-attendance-details'

import type {
  StudentDynamicField,
  StudentTableStudent,
  StudentTableCourse,
} from '@/app/(dashboard)/students/students-table'

export type AcademicLevel = {
  id: string
  name: string
  sort_order: number
}

export type Course = Omit<StudentTableCourse, 'days'> & {
  academic_year_id: string
  days: string[]
}

export type TeacherStudentAssignment = {
  id: string
  course_id: string
  teacher_id: string
  student_id: string
}

export type AttendanceStatus = {
  id: string
  name: string
  isActive: boolean
  sortOrder: number
}

type AttendanceRecord = {
  id: string
  studentId: string
  enrollmentId: string | null
  courseId: string
  attendanceDate: string
  statusId: string
  note: string
}

export type StudentsCacheData = {
  academicLevels: AcademicLevel[]
  currentAcademicYearId: string | null
  currentAcademicYearName: string
  currentAnnualFee: number
  courses: Course[]
  currentCourseId: string | null
  currentCourseName: string
  dynamicFields: StudentDynamicField[]
  studentList: StudentTableStudent[]
  attendanceStatuses: AttendanceStatus[]
  supabaseStatus: string
}

let studentsCache: StudentsCacheData | null = null

let studentsCacheLoading: Promise<StudentsCacheData> | null = null

// إصدار الكاش لمنع الطلبات القديمة من استبدال البيانات الأحدث.
let studentsCacheVersion = 0

// عدد سجلات الحضور في كل طلب إلى Supabase.
const ATTENDANCE_PAGE_SIZE = 100

function getTodayString() {
  const now = new Date()

  const year = now.getFullYear()

  const month = String(
    now.getMonth() + 1
  ).padStart(2, '0')

  const day = String(
    now.getDate()
  ).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function normalizeArabicDay(value: unknown) {
  const text = String(value ?? '')
    .trim()
    .toLowerCase()

  const map: Record<string, string> = {
    'الأحد': 'sunday',
    'الاحد': 'sunday',
    sunday: 'sunday',
    sun: 'sunday',
    '0': 'sunday',

    'الإثنين': 'monday',
    'الاثنين': 'monday',
    monday: 'monday',
    mon: 'monday',
    '1': 'monday',

    'الثلاثاء': 'tuesday',
    tuesday: 'tuesday',
    tue: 'tuesday',
    '2': 'tuesday',

    'الأربعاء': 'wednesday',
    'الاربعاء': 'wednesday',
    wednesday: 'wednesday',
    wed: 'wednesday',
    '3': 'wednesday',

    'الخميس': 'thursday',
    thursday: 'thursday',
    thu: 'thursday',
    '4': 'thursday',

    'الجمعة': 'friday',
    friday: 'friday',
    fri: 'friday',
    '5': 'friday',

    'السبت': 'saturday',
    saturday: 'saturday',
    sat: 'saturday',
    '6': 'saturday',
  }

  return map[text] ?? text
}

function getDayOfWeek(date: string) {
  const [year, month, day] = date.split('-').map(Number)

  const value = new Date(
    Date.UTC(year, month - 1, day)
  )

  return [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ][value.getUTCDay()]
}

function isCourseStudyDay(
  date: string,
  courseDays: string[]
) {
  if (!courseDays.length) {
    return false
  }

  const currentDay = getDayOfWeek(date)

  return courseDays.some(
    (day) => normalizeArabicDay(day) === currentDay
  )
}

function getDateRange(
  startDate: string,
  endDate: string
) {
  const result: string[] = []

  const [sy, sm, sd] = startDate.split('-').map(Number)
  const [ey, em, ed] = endDate.split('-').map(Number)

  const current = new Date(
    Date.UTC(sy, sm - 1, sd)
  )

  const end = new Date(
    Date.UTC(ey, em - 1, ed)
  )

  while (current <= end) {
    const year = current.getUTCFullYear()

    const month = String(
      current.getUTCMonth() + 1
    ).padStart(2, '0')

    const day = String(
      current.getUTCDate()
    ).padStart(2, '0')

    result.push(`${year}-${month}-${day}`)

    current.setUTCDate(current.getUTCDate() + 1)
  }

  return result
}

function getCourseStatus(
  course: Course,
  studentId: string,
  assignments: TeacherStudentAssignment[],
  today: string
): StudentCourseStatus['status'] {
  const hasAssignment = assignments.some(
    (assignment) =>
      assignment.student_id === studentId &&
      assignment.course_id === course.id
  )

  if (course.start_date && today < course.start_date) {
    return 'لم تقم الدورة حتى الآن'
  }

  return hasAssignment ? 'حاضر' : 'لم يحضر'
}

function getCurrentCourse(
  courses: Course[],
  today: string
) {
  return (
    courses.find((course) => {
      if (!course.start_date || !course.end_date) {
        return false
      }

      return (
        today >= course.start_date &&
        today <= course.end_date
      )
    }) ?? null
  )
}

function getStatusName(
  statuses: AttendanceStatus[],
  statusId: string
) {
  return (
    statuses.find((status) => status.id === statusId)
      ?.name ?? ''
  )
}

function normalizeAttendanceStatus(
  value: string
): StudentAttendanceRecord['status'] | '' {
  const text = value.trim().toLowerCase()

  if (text === 'حاضر' || text === 'present') {
    return 'حاضر'
  }

  if (text === 'غائب' || text === 'absent') {
    return 'غائب'
  }

  if (
    text === 'متأخر' ||
    text === 'متاخر' ||
    text === 'late'
  ) {
    return 'متأخر'
  }

  if (
    text === 'مستأذن' ||
    text === 'مستاذن' ||
    text === 'excused'
  ) {
    return 'مستأذن'
  }

  return ''
}

function calculateAttendanceSummary(
  studentId: string,
  course: Course,
  records: AttendanceRecord[],
  statuses: AttendanceStatus[],
  teacherName: string,
  today: string
): StudentAttendanceSummary {
  let present = 0
  let absent = 0
  let late = 0
  let excused = 0
  let notRecorded = 0

  const studyDates: string[] = []

  if (course.start_date && course.end_date) {
    const dates = getDateRange(
      course.start_date,
      course.end_date
    )

    dates.forEach((date) => {
      if (
        date > today ||
        !isCourseStudyDay(date, course.days)
      ) {
        return
      }

      studyDates.push(date)

      const record = records.find(
        (item) =>
          item.studentId === studentId &&
          item.courseId === course.id &&
          item.attendanceDate === date
      )

      if (!record) {
        notRecorded += 1
        return
      }

      const status = normalizeAttendanceStatus(
        getStatusName(statuses, record.statusId)
      )

      if (status === 'حاضر') {
        present += 1
      } else if (status === 'غائب') {
        absent += 1
      } else if (status === 'متأخر') {
        late += 1
      } else if (status === 'مستأذن') {
        excused += 1
      } else {
        notRecorded += 1
      }
    })
  }

  const counted = present + late + excused + absent
  const attended = present + late + excused

  const percentage =
    counted === 0
      ? 0
      : Math.round((attended / counted) * 100)

  return {
    courseId: course.id,
    courseName: course.name,
    startDate: course.start_date,
    endDate: course.end_date,
    days: course.days,
    teacherName,
    totalDays: studyDates.length,
    present,
    absent,
    late,
    excused,
    notRecorded,
    percentage,
  }
}

export function getStudentsCache() {
  return studentsCache
}

export function setStudentsCache(
  data: StudentsCacheData
) {
  studentsCacheVersion++
  studentsCacheLoading = null
  studentsCache = data
}

export function clearStudentsCache() {
  studentsCacheVersion++
  studentsCacheLoading = null
  studentsCache = null
}

export function updateStudentsCacheStudentList(
  studentList: StudentTableStudent[]
) {
  if (!studentsCache) {
    return
  }

  studentsCacheVersion++
  studentsCacheLoading = null

  studentsCache = {
    ...studentsCache,
    studentList,
  }
}

export async function loadStudentsCache(options?: {
  force?: boolean
}) {
  const force = options?.force ?? false

  if (!force && studentsCache) {
    return studentsCache
  }

  if (force) {
    studentsCacheVersion++
    studentsCacheLoading = null
  }

  if (studentsCacheLoading) {
    return studentsCacheLoading
  }

  const requestVersion = studentsCacheVersion

  const loadingPromise = (async (): Promise<StudentsCacheData> => {
    const {
      data: currentYear,
      error: yearError,
    } = await supabase
      .from('academic_years')
      .select('id, name, annual_fee')
      .eq('is_current', true)
      .eq('is_active', true)
      .maybeSingle()

    if (yearError) {
      throw new Error(
        `خطأ في تحميل السنة الدراسية: ${yearError.message}`
      )
    }

    if (!currentYear) {
      throw new Error('لا توجد سنة دراسية حالية مفعلة')
    }

    const annualFee = Number(currentYear.annual_fee ?? 0)

    /*
     * الصفوف الأكاديمية
     */
    const {
      data: levels,
      error: levelsError,
    } = await supabase
      .from('levels')
      .select('id, name, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (levelsError) {
      throw new Error(
        `خطأ في تحميل الصفوف الأكاديمية: ${levelsError.message}`
      )
    }

    const loadedAcademicLevels = levels ?? []

    /*
     * الدورات
     */
    const {
      data: coursesData,
      error: coursesError,
    } = await supabase
      .from('courses')
      .select(
        'id, academic_year_id, name, start_date, end_date, days'
      )
      .eq('academic_year_id', currentYear.id)
      .order('start_date', {
        ascending: true,
        nullsFirst: false,
      })

    if (coursesError) {
      throw new Error(
        `خطأ في تحميل الدورات: ${coursesError.message}`
      )
    }

    const loadedCourses: Course[] = (coursesData ?? []).map(
      (course) => ({
        id: course.id,
        academic_year_id: course.academic_year_id,
        name: course.name,
        start_date: course.start_date ?? null,
        end_date: course.end_date ?? null,
        days: Array.isArray(course.days) ? course.days : [],
      })
    )

    const courseNameMap = new Map<string, string>()

    loadedCourses.forEach((course) => {
      courseNameMap.set(course.id, course.name)
    })

    const today = getTodayString()

    const currentCourse = getCurrentCourse(
      loadedCourses,
      today
    )

    /*
     * الحقول الديناميكية
     */
    const {
      data: dynamicFieldsData,
      error: dynamicFieldsError,
    } = await supabase
      .from('dynamic_fields')
      .select(
        'id, name, field_key, field_type, is_required, show_in_registration, is_active, sort_order'
      )
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (dynamicFieldsError) {
      throw new Error(
        `خطأ في تحميل حقول التسجيل: ${dynamicFieldsError.message}`
      )
    }

    const loadedDynamicFields: StudentDynamicField[] = (
      dynamicFieldsData ?? []
    ).map((field) => ({
      id: field.id,
      name: field.name,
      field_key: field.field_key,
      field_type: field.field_type,
      is_required: Boolean(field.is_required),
      show_in_registration: Boolean(
        field.show_in_registration
      ),
      is_active: Boolean(field.is_active),
      sort_order: Number(field.sort_order ?? 0),
    }))

    /*
     * قيم الحقول الديناميكية
     */
    const {
      data: dynamicValuesData,
      error: dynamicValuesError,
    } = await supabase
      .from('student_dynamic_values')
      .select('id, student_id, field_id, value')

    if (dynamicValuesError) {
      throw new Error(
        `خطأ في تحميل بيانات حقول الطلاب: ${dynamicValuesError.message}`
      )
    }

    const dynamicValuesMap = new Map<
      string,
      Record<string, string>
    >()

    ;(dynamicValuesData ?? []).forEach((item) => {
      const current =
        dynamicValuesMap.get(item.student_id) ?? {}

      current[item.field_id] = item.value ?? ''

      dynamicValuesMap.set(item.student_id, current)
    })

    /*
     * enrollments
     *
     * course_id = دورة الالتحاق
     */
    const {
      data: enrollmentRows,
      error: enrollmentsError,
    } = await supabase
      .from('enrollments')
      .select(
        'student_id, level_id, class_id, academic_year_id, status, course_id'
      )
      .eq('academic_year_id', currentYear.id)

    if (enrollmentsError) {
      throw new Error(
        `خطأ في تحميل ربط الطلاب بالصفوف والدورات: ${enrollmentsError.message}`
      )
    }

    /*
     * الفصول
     */
    const {
      data: classesData,
      error: classesError,
    } = await supabase
      .from('classes')
      .select('id, name, level_id, academic_year_id')
      .eq('academic_year_id', currentYear.id)

    if (classesError) {
      throw new Error(
        `خطأ في تحميل الفصول: ${classesError.message}`
      )
    }

    const levelMap = new Map<string, string>()

    ;(levels ?? []).forEach((level) => {
      levelMap.set(level.id, level.name)
    })

    const classMap = new Map<string, string>()

    ;(classesData ?? []).forEach((item) => {
      classMap.set(item.id, item.name)
    })

    const enrollmentMap = new Map<
      string,
      {
        levelName: string
        className: string
        courseId: string
        courseName: string
      }
    >()

    ;(enrollmentRows ?? []).forEach((enrollment) => {
      const courseId = enrollment.course_id ?? ''

      enrollmentMap.set(enrollment.student_id, {
        levelName:
          levelMap.get(enrollment.level_id) ?? '',

        className: enrollment.class_id
          ? classMap.get(enrollment.class_id) ?? ''
          : '',

        courseId,

        courseName: courseId
          ? courseNameMap.get(courseId) ?? ''
          : '',
      })
    })

    /*
     * الطلاب
     */
    let studentsData: any[] | null = null

    const {
      data: loadedStudents,
      error: studentsError,
    } = await supabase
      .from('students')
      .select(
        'id, student_id, name, personal_id, gender, phone, whatsapp, age, notes, health_notes, guardian_relation, student_phone, status, fee_exempt, created_at, updated_at, source, academic_year_id'
      )
      .order('created_at', { ascending: false })

    studentsData = loadedStudents

    if (studentsError) {
      const {
        data: fallbackStudents,
        error: fallbackError,
      } = await supabase
        .from('students')
        .select(
          'id, student_id, name, personal_id, phone, whatsapp, age, notes, health_notes, guardian_relation, student_phone, status, fee_exempt, created_at, updated_at, source, academic_year_id'
        )
        .order('created_at', { ascending: false })

      if (fallbackError) {
        throw new Error(
          `خطأ في تحميل الطلاب: ${fallbackError.message}`
        )
      }

      studentsData = fallbackStudents
    }

    /*
     * المدفوعات
     */
    const {
      data: paymentsData,
      error: paymentsError,
    } = await supabase
      .from('payments')
      .select('student_id, academic_year_id, amount')
      .eq('academic_year_id', currentYear.id)

    if (paymentsError) {
      throw new Error(
        `خطأ في تحميل الدفعات: ${paymentsError.message}`
      )
    }

    /*
     * توزيع الطلاب على المعلمين
     */
    let assignments: TeacherStudentAssignment[] = []

    if (loadedCourses.length > 0) {
      const {
        data: assignmentsData,
        error: assignmentsError,
      } = await supabase
        .from('teacher_student_assignments')
        .select('id, course_id, teacher_id, student_id')
        .in(
          'course_id',
          loadedCourses.map((course) => course.id)
        )

      if (assignmentsError) {
        throw new Error(
          `خطأ في تحميل توزيع الطلاب على المعلمين: ${assignmentsError.message}`
        )
      }

      assignments = (assignmentsData ?? []).map(
        (assignment) => ({
          id: assignment.id,
          course_id: assignment.course_id,
          teacher_id: assignment.teacher_id,
          student_id: assignment.student_id,
        })
      )
    }

    /*
     * أسماء المعلمين
     */
    const teacherNames = new Map<string, string>()

    if (assignments.length > 0) {
      const teacherIds = Array.from(
        new Set(
          assignments.map((item) => item.teacher_id)
        )
      )

      const {
        data: teachersData,
        error: teachersError,
      } = await supabase
        .from('teachers')
        .select('id, name')
        .in('id', teacherIds)

      if (teachersError) {
        throw new Error(
          `خطأ في تحميل أسماء المعلمين: ${teachersError.message}`
        )
      }

      ;(teachersData ?? []).forEach((teacher) => {
        teacherNames.set(teacher.id, teacher.name ?? '')
      })
    }

    /*
     * حالات الحضور
     */
    const {
      data: statusesData,
      error: statusesError,
    } = await supabase
      .from('attendance_statuses')
      .select('id, name, is_active, sort_order')
      .order('sort_order', { ascending: true })

    if (statusesError) {
      throw new Error(
        `خطأ في تحميل حالات الحضور: ${statusesError.message}`
      )
    }

    const loadedAttendanceStatuses: AttendanceStatus[] = (
      statusesData ?? []
    ).map((status) => ({
      id: status.id,
      name: status.name,
      isActive: Boolean(status.is_active),
      sortOrder: Number(status.sort_order ?? 0),
    }))

    /*
     * الحضور
     *
     * تحميل السجلات على دفعات من 100 سجل.
     * لا نكمل بناء بيانات الطلاب إذا فشلت أي دفعة.
     */
    const attendanceRows: AttendanceRecord[] = []

    if (loadedCourses.length > 0) {
      const courseIds = loadedCourses.map(
        (course) => course.id
      )

      let from = 0

      while (true) {
        const {
          data: attendanceData,
          error: attendanceError,
        } = await supabase
          .from('attendance')
          .select(
            'id, student_id, enrollment_id, attendance_date, status_id, note, course_id'
          )
          .in('course_id', courseIds)
          .order('id', { ascending: true })
          .range(
            from,
            from + ATTENDANCE_PAGE_SIZE - 1
          )

        if (attendanceError) {
          throw new Error(
            `خطأ في تحميل سجلات الحضور: ${attendanceError.message}`
          )
        }

        const page = attendanceData ?? []

        attendanceRows.push(
          ...page.map((record) => ({
            id: record.id,
            studentId: record.student_id,
            enrollmentId: record.enrollment_id ?? null,
            courseId: record.course_id,
            attendanceDate: record.attendance_date,
            statusId: record.status_id,
            note: record.note ?? '',
          }))
        )

        if (page.length < ATTENDANCE_PAGE_SIZE) {
          break
        }

        from += ATTENDANCE_PAGE_SIZE
      }
    }

    /*
     * المدفوع لكل طالب
     */
    const paidMap = new Map<string, number>()

    ;(paymentsData ?? []).forEach((payment) => {
      const current =
        paidMap.get(payment.student_id) ?? 0

      paidMap.set(
        payment.student_id,
        current + Number(payment.amount ?? 0)
      )
    })

    /*
     * بناء بيانات الطلاب النهائية
     */
    const mappedStudents = (studentsData ?? []).map(
      (student: any) => {
        const amountPaid = paidMap.get(student.id) ?? 0

        const feeExempt = Boolean(student.fee_exempt)

        const paymentStatus = feeExempt
          ? 'معفي'
          : amountPaid >= annualFee && annualFee > 0
            ? 'مدفوع بالكامل'
            : amountPaid > 0
              ? 'مدفوع جزئيًا'
              : 'غير مدفوع'

        const enrollment = enrollmentMap.get(student.id)

        const courseStatuses = loadedCourses.map(
          (course) => ({
            courseId: course.id,
            courseName: course.name,
            startDate: course.start_date,
            endDate: course.end_date,
            status: getCourseStatus(
              course,
              student.id,
              assignments,
              today
            ),
          })
        )

        const attendanceSummaries = loadedCourses.map(
          (course) => {
            const assignment = assignments.find(
              (item) =>
                item.student_id === student.id &&
                item.course_id === course.id
            )

            const teacherName = assignment
              ? teacherNames.get(assignment.teacher_id) ?? ''
              : ''

            return calculateAttendanceSummary(
              student.id,
              course,
              attendanceRows,
              loadedAttendanceStatuses,
              teacherName,
              today
            )
          }
        )

        const attendanceRecords: StudentAttendanceRecord[] =
          attendanceRows
            .filter(
              (record) => record.studentId === student.id
            )
            .map((record) => {
              const status = normalizeAttendanceStatus(
                getStatusName(
                  loadedAttendanceStatuses,
                  record.statusId
                )
              )

              if (!status) {
                return null
              }

              return {
                id: record.id,
                studentId: record.studentId,
                courseId: record.courseId,
                attendanceDate: record.attendanceDate,
                status,
                note: record.note,
              }
            })
            .filter(
              (
                record
              ): record is StudentAttendanceRecord =>
                Boolean(record)
            )

        const currentStatus = currentCourse
          ? getCourseStatus(
              currentCourse,
              student.id,
              assignments,
              today
            )
          : 'لم يحضر'

        const currentTeacherAssignment = currentCourse
          ? assignments.find(
              (item) =>
                item.student_id === student.id &&
                item.course_id === currentCourse.id
            )
          : undefined

        const currentTeacherName = currentTeacherAssignment
          ? teacherNames.get(
              currentTeacherAssignment.teacher_id
            ) ?? ''
          : ''

        return {
          id: student.id,

          studentId: student.student_id ?? '',

          name: student.name ?? '',

          personalId: student.personal_id ?? '',

          gender: student.gender ?? '',

          age: student.age ?? null,

          grade: enrollment?.levelName ?? '',

          className: enrollment?.className ?? '',

          phone: student.phone ?? '',

          whatsapp: student.whatsapp ?? '',

          guardianRelation:
            student.guardian_relation ?? '',

          studentPhone: student.student_phone ?? '',

          enrollmentCourseId:
            enrollment?.courseId ?? '',

          enrollmentCourseName:
            enrollment?.courseName ?? '',

          currentTeacherName,

          status: student.status ?? '',

          paymentStatus,

          amountDue: annualFee,

          amountPaid,

          feeExempt,

          chronicDiseases: student.health_notes ?? '',

          notes: student.notes ?? '',

          source: student.source ?? '',

          createdAt: student.created_at ?? '',

          updatedAt: student.updated_at ?? '',

          academicYearId:
            student.academic_year_id ?? currentYear.id,

          academicYearName: currentYear.name ?? '',

          attendance: currentStatus,

          courseStatuses,

          attendanceSummaries,

          attendanceRecords,

          dynamicValues:
            dynamicValuesMap.get(student.id) ?? {},
        }
      }
    )

    const finalStatus = 'متصل بقاعدة البيانات ✅'
    
    const data: StudentsCacheData = {
      academicLevels: loadedAcademicLevels,

      currentAcademicYearId: currentYear.id,

      currentAcademicYearName: currentYear.name ?? '',

      currentAnnualFee: annualFee,

      courses: loadedCourses,

      currentCourseId: currentCourse?.id ?? null,

      currentCourseName: currentCourse?.name ?? '',

      dynamicFields: loadedDynamicFields,

      studentList:
        mappedStudents as StudentTableStudent[],

      attendanceStatuses: loadedAttendanceStatuses,

      supabaseStatus: finalStatus,
    }

    // الطلب القديم لا يستبدل الكاش إذا تغير الإصدار أثناء تحميله.
    if (requestVersion === studentsCacheVersion) {
      studentsCache = data
    }

    return data
  })()

  studentsCacheLoading = loadingPromise

  try {
    return await loadingPromise
  } finally {
    // لا نمسح مرجع طلب أحدث من هذا الطلب.
    if (studentsCacheLoading === loadingPromise) {
      studentsCacheLoading = null
    }
  }
}
