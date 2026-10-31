
'use client'

import { loadStudentsRepositoryData } from '@/lib/features/students/repositories/students.repository'

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

// مفتاح مركب لتحديد الطالب والدورة بدون تعارض بين القيم.
function getAssignmentKey(
  studentId: string,
  courseId: string
) {
  return JSON.stringify([studentId, courseId])
}

// مفتاح مركب لتحديد الطالب والدورة وتاريخ الحضور.
function getAttendanceKey(
  studentId: string,
  courseId: string,
  date: string
) {
  return JSON.stringify([studentId, courseId, date])
}

function getCourseStatus(
  course: Course,
  studentId: string,
  assignmentByStudentCourse: Map<
    string,
    TeacherStudentAssignment
  >,
  today: string
): StudentCourseStatus['status'] {
  const hasAssignment = assignmentByStudentCourse.has(
    getAssignmentKey(studentId, course.id)
  )

  if (course.start_date && today < course.start_date) {
    return 'لم تقم الدورة حتى الآن'
  }

  return hasAssignment ? 'حاضر' : 'لم يحضر'
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
  attendanceByStudentCourseDate: Map<
    string,
    AttendanceRecord
  >,
  statusNameById: Map<string, string>,
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

      const record = attendanceByStudentCourseDate.get(
        getAttendanceKey(studentId, course.id, date)
      )

      if (!record) {
        notRecorded += 1
        return
      }

      const status = normalizeAttendanceStatus(
        statusNameById.get(record.statusId) ?? ''
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
    /*
     * جلب البيانات من Repository
     */
    const {
      currentYear,
      annualFee,
      loadedAcademicLevels,
      loadedCourses: repositoryCourses,
      today,
      currentCourse: repositoryCurrentCourse,
      loadedDynamicFields,
      dynamicValuesMap,
      enrollmentMap,
      studentsData,
      paymentsData,
      assignments,
      teacherNames,
      loadedAttendanceStatuses,
      attendanceRows,
    } = await loadStudentsRepositoryData()

    // المحافظة على أنواع البيانات العامة المستخدمة حالياً في النظام.
    const loadedCourses = repositoryCourses as Course[]

    const currentCourse = repositoryCurrentCourse as Course | null

    /*
     * فهارس داخل الذاكرة لتقليل البحث المتكرر أثناء بناء قائمة الطلاب.
     * نحافظ على أول توزيع وأول سجل حضور مطابق، مثل سلوك find السابق.
     */
    const assignmentByStudentCourse = new Map<
      string,
      TeacherStudentAssignment
    >()

    assignments.forEach((assignment) => {
      const key = getAssignmentKey(
        assignment.student_id,
        assignment.course_id
      )

      if (!assignmentByStudentCourse.has(key)) {
        assignmentByStudentCourse.set(key, assignment)
      }
    })

    const statusNameById = new Map<string, string>()

    loadedAttendanceStatuses.forEach((status) => {
      statusNameById.set(status.id, status.name)
    })

    const attendanceByStudent = new Map<
      string,
      AttendanceRecord[]
    >()

    const attendanceByStudentCourseDate = new Map<
      string,
      AttendanceRecord
    >()

    attendanceRows.forEach((record) => {
      const studentRecords =
        attendanceByStudent.get(record.studentId) ?? []

      studentRecords.push(record)
      attendanceByStudent.set(record.studentId, studentRecords)

      const key = getAttendanceKey(
        record.studentId,
        record.courseId,
        record.attendanceDate
      )

      if (!attendanceByStudentCourseDate.has(key)) {
        attendanceByStudentCourseDate.set(key, record)
      }
    })

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
              assignmentByStudentCourse,
              today
            ),
          })
        )

        const attendanceSummaries = loadedCourses.map(
          (course) => {
            const assignment = assignmentByStudentCourse.get(
              getAssignmentKey(student.id, course.id)
            )

            const teacherName = assignment
              ? teacherNames.get(assignment.teacher_id) ?? ''
              : ''

            return calculateAttendanceSummary(
              student.id,
              course,
              attendanceByStudentCourseDate,
              statusNameById,
              teacherName,
              today
            )
          }
        )

        const attendanceRecords: StudentAttendanceRecord[] =
          (attendanceByStudent.get(student.id) ?? [])
            .map((record) => {
              const status = normalizeAttendanceStatus(
                statusNameById.get(record.statusId) ?? ''
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
              assignmentByStudentCourse,
              today
            )
          : 'لم يحضر'

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
