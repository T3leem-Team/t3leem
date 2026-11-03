
'use client'

import {
  loadStudentsRepositoryData,
  loadStudentAttendanceData,
  type RepositoryStudentFilters,
} from '@/lib/features/students/repositories/students.repository'

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
  totalStudents: number
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

function mapStudentsRepositoryDataToStudentList(
  repositoryData: Awaited<ReturnType<typeof loadStudentsRepositoryData>>,
): StudentTableStudent[] {
  const {
    currentYear,
    annualFee,
    loadedCourses: repositoryCourses,
    today,
    currentCourse: repositoryCurrentCourse,
    dynamicValuesMap,
    enrollmentMap,
    studentsData,
    paymentsData,
    assignments,
    teacherNames,
    loadedAttendanceStatuses,
    attendanceRows,
  } = repositoryData

  const loadedCourses = repositoryCourses as Course[]

  const currentCourse = repositoryCurrentCourse as Course | null

  const hasAttendanceData =
    loadedAttendanceStatuses.length > 0

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

      const attendanceSummaries = hasAttendanceData
        ? loadedCourses.map((course) => {
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
          })
        : []

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
        guardianRelation: student.guardian_relation ?? '',
        studentPhone: student.student_phone ?? '',
        enrollmentCourseId: enrollment?.courseId ?? '',
        enrollmentCourseName: enrollment?.courseName ?? '',
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
        academicYearId: student.academic_year_id ?? currentYear.id,
        academicYearName: currentYear.name ?? '',
        attendance: currentStatus,
        courseStatuses,
        attendanceSummaries,
        attendanceRecords,
        dynamicValues: dynamicValuesMap.get(student.id) ?? {},
      }
    }
  )

  return mappedStudents as StudentTableStudent[]
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
  studentList: StudentTableStudent[],
  totalStudents?: number,
  removedIds: string[] = [],
) {
  if (!studentsCache) {
    return
  }

  studentsCacheVersion++
  studentsCacheLoading = null

  const hasFullStudentCache =
    studentsCache.studentList.length >= studentsCache.totalStudents

  let nextStudentList = studentList

  if (hasFullStudentCache) {
    const byId = new Map(
      studentsCache.studentList.map((student) => [student.id, student]),
    )

    studentList.forEach((student) => {
      byId.set(student.id, student)
    })

    removedIds.forEach((id) => byId.delete(id))

    nextStudentList = Array.from(byId.values()).sort((a, b) => {
      const dateOrder = String(b.createdAt ?? '').localeCompare(
        String(a.createdAt ?? ''),
      )

      return dateOrder || b.id.localeCompare(a.id)
    })
  }

  studentsCache = {
    ...studentsCache,
    studentList: nextStudentList,
    totalStudents: totalStudents ?? studentsCache.totalStudents,
  }
}

export async function loadStudentsCachePage(options: {
  offset: number
  limit?: number
  search?: string
  filters?: RepositoryStudentFilters
}) {
  const repositoryData = await loadStudentsRepositoryData({
    offset: options.offset,
    limit: options.limit ?? 50,
    search: options.search,
    filters: options.filters,
    includeAttendance: false,
  })

  return {
    students: mapStudentsRepositoryDataToStudentList(repositoryData),
    totalStudents: repositoryData.totalStudents,
  }
}

export async function loadStudentsCache(options?: {
  force?: boolean
  all?: boolean
}) {
  const loadAll = options?.all ?? false
  const force = (options?.force ?? false) || loadAll

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
    const repositoryData = await loadStudentsRepositoryData({
      offset: 0,
      limit: loadAll ? 500 : 50,
      includeAttendance: false,
    })

    const {
      currentYear,
      annualFee,
      loadedAcademicLevels,
      loadedCourses: repositoryCourses,
      currentCourse: repositoryCurrentCourse,
      loadedDynamicFields,
      loadedAttendanceStatuses,
      totalStudents,
    } = repositoryData

    const loadedCourses = repositoryCourses as Course[]
    const currentCourse = repositoryCurrentCourse as Course | null

    const mappedStudents = mapStudentsRepositoryDataToStudentList(repositoryData)

    if (loadAll) {
      let offset = repositoryData.studentsData.length

      while (offset < totalStudents) {
        const page = await loadStudentsRepositoryData({
          offset,
          limit: 500,
          includeAttendance: false,
        })

        if (page.studentsData.length === 0) break

        mappedStudents.push(
          ...mapStudentsRepositoryDataToStudentList(page),
        )

        offset += page.studentsData.length
      }
    }

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
      studentList: mappedStudents as StudentTableStudent[],
      attendanceStatuses: loadedAttendanceStatuses,
      supabaseStatus: finalStatus,
      totalStudents,
    }

    if (requestVersion === studentsCacheVersion) {
      studentsCache = data
    }

    return data
  })()

  studentsCacheLoading = loadingPromise

  try {
    return await loadingPromise
  } finally {
    if (studentsCacheLoading === loadingPromise) {
      studentsCacheLoading = null
    }
  }
}

/*
 * تحميل تفاصيل حضور طالب واحد عند فتح تفاصيل الحضور فقط.
 */
export async function loadStudentAttendanceDetails(
  studentId: string,
) {
  const cache = studentsCache

  if (!cache) {
    throw new Error('بيانات الطلاب غير محمّلة')
  }

  if (!studentId) {
    throw new Error('معرّف الطالب غير موجود')
  }

  const student = cache.studentList.find(
    (item) => item.id === studentId
  )

  if (!student) {
    throw new Error('الطالب غير موجود في الكاش')
  }

  const repositoryData = await loadStudentAttendanceData(
    studentId,
    cache.courses.map((course) => course.id),
  )

  const statusNameById = new Map<string, string>()

  repositoryData.loadedAttendanceStatuses.forEach((status) => {
    statusNameById.set(status.id, status.name)
  })

  const attendanceByStudentCourseDate = new Map<
    string,
    AttendanceRecord
  >()

  const attendanceRecords: StudentAttendanceRecord[] = []

  repositoryData.attendanceRows.forEach((record) => {
    const key = getAttendanceKey(
      record.studentId,
      record.courseId,
      record.attendanceDate,
    )

    if (!attendanceByStudentCourseDate.has(key)) {
      attendanceByStudentCourseDate.set(key, record)
    }

    const status = normalizeAttendanceStatus(
      statusNameById.get(record.statusId) ?? '',
    )

    if (status) {
      attendanceRecords.push({
        id: record.id,
        studentId: record.studentId,
        courseId: record.courseId,
        attendanceDate: record.attendanceDate,
        status,
        note: record.note,
      })
    }
  })

  const assignmentByStudentCourse = new Map<
    string,
    TeacherStudentAssignment
  >()

  repositoryData.assignments.forEach((assignment) => {
    const key = getAssignmentKey(
      assignment.student_id,
      assignment.course_id,
    )

    if (!assignmentByStudentCourse.has(key)) {
      assignmentByStudentCourse.set(key, assignment)
    }
  })

  const attendanceSummaries = cache.courses.map((course) => {
    const assignment = assignmentByStudentCourse.get(
      getAssignmentKey(studentId, course.id),
    )

    const teacherName = assignment
      ? repositoryData.teacherNames.get(assignment.teacher_id) ?? ''
      : ''

    return calculateAttendanceSummary(
      studentId,
      course,
      attendanceByStudentCourseDate,
      statusNameById,
      teacherName,
      repositoryData.today,
    )
  })

  return {
    attendanceSummaries,
    attendanceRecords,
  }
}
