
'use client'

import { supabase } from '@/lib/supabase'

import type {
  AttendanceRecord,
  AttendanceStatus,
  Student,
} from '@/app/(dashboard)/teachers/teacher-attendance-utils'

import type {
  PreviousCourseAssignment,
  PreviousCourseSubject,
  PreviousManagedCourse,
} from '@/app/(dashboard)/teachers/teachers-view-previous-courses'

export type RepositoryTeacher = {
  id: string
  name: string
  isActive: boolean
}

export type RepositoryAssignment = PreviousCourseAssignment

export type RepositoryTeacherCourseSubject = PreviousCourseSubject

export type RepositoryManagedCourse = PreviousManagedCourse

export type RepositoryAcademicLevel = {
  id: string
  name: string
  sort_order: number
}

export type TeachersRepositoryData = {
  teachers: RepositoryTeacher[]
  courses: RepositoryManagedCourse[]
  students: Student[]
  assignments: RepositoryAssignment[]
  attendanceStatuses: AttendanceStatus[]
  attendanceRecords: AttendanceRecord[]
  allowTeacherTransfer: boolean
  allowTeacherRemove: boolean
  courseTeacherIds: Record<string, string[]>
  teacherCourseSubjects: RepositoryTeacherCourseSubject[]
  academicLevels: RepositoryAcademicLevel[]
}

export async function loadTeachersRepositoryData(): Promise<TeachersRepositoryData> {
  // السنة الدراسية الحالية
  const {
    data: academicYear,
    error: academicYearError,
  } = await supabase
    .from('academic_years')
    .select(
      'id, name, start_date, end_date, is_current, is_active',
    )
    .eq('is_current', true)
    .eq('is_active', true)
    .maybeSingle()

  if (academicYearError) {
    throw new Error(
      `خطأ في تحميل السنة الدراسية: ${academicYearError.message}`,
    )
  }

  if (!academicYear) {
    throw new Error('لا توجد سنة دراسية حالية مفعلة.')
  }

  // الدورات
  const {
    data: courseRows,
    error: coursesError,
  } = await supabase
    .from('courses')
    .select(
      'id, name, start_date, end_date, days, created_at, is_closed, closed_at',
    )
    .eq('academic_year_id', academicYear.id)
    .order('created_at', {
      ascending: true,
    })

  if (coursesError) {
    throw new Error(
      `خطأ في تحميل الدورات: ${coursesError.message}`,
    )
  }

  const mappedCourses: RepositoryManagedCourse[] = (
    courseRows ?? []
  ).map((course) => ({
    id: course.id,
    name: course.name,
    startDate: course.start_date ?? '',
    endDate: course.end_date ?? '',
    days: Array.isArray(course.days)
      ? course.days.map((day) => {
          const normalizedDay = String(day)
            .trim()
            .toLowerCase()

          const arabicDays: Record<string, string> = {
            sunday: 'الأحد',
            monday: 'الإثنين',
            tuesday: 'الثلاثاء',
            wednesday: 'الأربعاء',
            thursday: 'الخميس',
            friday: 'الجمعة',
            saturday: 'السبت',
            الأحد: 'الأحد',
            الاحد: 'الأحد',
            الإثنين: 'الإثنين',
            الاثنين: 'الإثنين',
            الثلاثاء: 'الثلاثاء',
            الأربعاء: 'الأربعاء',
            الاربعاء: 'الأربعاء',
            الخميس: 'الخميس',
            الجمعة: 'الجمعة',
            السبت: 'السبت',
          }

          return arabicDays[normalizedDay] ?? day
        })
      : [],
    isClosed: Boolean(course.is_closed),
    closedAt: course.closed_at ?? null,
  }))

  const courseIds = mappedCourses.map(
    (course) => course.id,
  )

  /*
   * تحميل البيانات المستقلة بالتوازي.
   */

  const loadCourseTeachers = async () => {
    if (courseIds.length === 0) {
      return []
    }

    const { data, error } = await supabase
      .from('course_teachers')
      .select('id, course_id, teacher_id')
      .in('course_id', courseIds)

    if (error) {
      throw new Error(
        `خطأ في تحميل ارتباط المعلمين بالدورات: ${error.message}`,
      )
    }

    return data ?? []
  }

  const loadCourseSubjects = async () => {
    if (courseIds.length === 0) {
      return []
    }

    const { data, error } = await supabase
      .from('course_subjects')
      .select('id, course_id, subject_id')
      .in('course_id', courseIds)

    if (error) {
      throw new Error(
        `خطأ في تحميل مواد الدورات: ${error.message}`,
      )
    }

    return data ?? []
  }

  const loadEnrollments = async () => {
    const { data, error } = await supabase
      .from('enrollments')
      .select(`
        id,
        student_id,
        academic_year_id,
        level_id,
        status,
        join_date,
        levels (
          id,
          name,
          sort_order
        )
      `)
      .eq('academic_year_id', academicYear.id)
      .eq('status', 'نشط')

    if (error) {
      throw new Error(
        `خطأ في تحميل تسجيلات الطلاب: ${error.message}`,
      )
    }

    return data ?? []
  }

  const loadAssignments = async () => {
    if (courseIds.length === 0) {
      return []
    }

    const { data, error } = await supabase
      .from('teacher_student_assignments')
      .select(
        'id, course_id, teacher_id, student_id, subject_id',
      )
      .in('course_id', courseIds)

    if (error) {
      throw new Error(
        `خطأ في تحميل توزيع الطلاب: ${error.message}`,
      )
    }

    return data ?? []
  }

  const loadAttendanceStatuses = async () => {
    const { data, error } = await supabase
      .from('attendance_statuses')
      .select('id, name, is_active, sort_order')
      .order('sort_order', {
        ascending: true,
      })

    if (error) {
      throw new Error(
        `خطأ في تحميل حالات الحضور: ${error.message}`,
      )
    }

    return data ?? []
  }

  const loadAttendance = async () => {
    const rows: {
      id: string
      student_id: string
      enrollment_id: string | null
      attendance_date: string
      status_id: string
      note: string | null
      course_id: string
    }[] = []

    if (courseIds.length === 0) {
      return rows
    }

    const pageSize = 1000
    let from = 0

    while (true) {
      const { data, error } = await supabase
        .from('attendance')
        .select(
          'id, student_id, enrollment_id, attendance_date, status_id, note, course_id',
        )
        .in('course_id', courseIds)
        .order('id', { ascending: true })
        .range(from, from + pageSize - 1)

      if (error) {
        throw new Error(
          `خطأ في تحميل الحضور: ${error.message}`,
        )
      }

      const batch = data ?? []

      rows.push(...batch)

      if (batch.length < pageSize) {
        break
      }

      from += pageSize
    }

    return rows
  }

  const [
    courseTeacherRows,
    courseSubjectRows,
    enrollmentRows,
    rawAssignmentRows,
    statusRows,
    attendanceRows,
  ] = await Promise.all([
    loadCourseTeachers(),
    loadCourseSubjects(),
    loadEnrollments(),
    loadAssignments(),
    loadAttendanceStatuses(),
    loadAttendance(),
  ])

  /*
   * مواد الدورات
   */

  const subjectIds = Array.from(
    new Set(
      courseSubjectRows.map(
        (row) => row.subject_id,
      ),
    ),
  )

  let subjectRows: {
    id: string
    name: string
    is_active: boolean
  }[] = []

  if (subjectIds.length > 0) {
    const {
      data,
      error,
    } = await supabase
      .from('subjects')
      .select('id, name, is_active')
      .in('id', subjectIds)

    if (error) {
      throw new Error(
        `خطأ في تحميل المواد الدراسية: ${error.message}`,
      )
    }

    subjectRows = data ?? []
  }

  /*
   * ارتباط المواد بالمعلمين
   */

  let courseSubjectTeacherRows: {
    id: string
    course_subject_id: string
    teacher_id: string
  }[] = []

  if (courseSubjectRows.length > 0) {
    const courseSubjectIds = courseSubjectRows.map(
      (row) => row.id,
    )

    const {
      data,
      error,
    } = await supabase
      .from('course_subject_teachers')
      .select(
        'id, course_subject_id, teacher_id',
      )
      .in('course_subject_id', courseSubjectIds)

    if (error) {
      throw new Error(
        `خطأ في تحميل ارتباط المواد بالمعلمين: ${error.message}`,
      )
    }

    courseSubjectTeacherRows = data ?? []
  }

  const subjectMap = new Map(
    subjectRows.map((subject) => [
      subject.id,
      subject,
    ]),
  )

  const courseSubjectMap = new Map(
    courseSubjectRows.map((row) => [
      row.id,
      row,
    ]),
  )

  const teacherCourseSubjects: RepositoryTeacherCourseSubject[] =
    courseSubjectTeacherRows
      .map((row) => {
        const courseSubject = courseSubjectMap.get(
          row.course_subject_id,
        )

        if (!courseSubject) {
          return null
        }

        const subject = subjectMap.get(
          courseSubject.subject_id,
        )

        if (!subject) {
          return null
        }

        return {
          courseId: courseSubject.course_id,
          teacherId: row.teacher_id,
          subjectId: subject.id,
          subjectName: subject.name,
        }
      })
      .filter(
        (item): item is RepositoryTeacherCourseSubject =>
          item !== null,
      )

  /*
   * المعلمين
   */

  const teacherIds = Array.from(
    new Set(
      courseTeacherRows.map(
        (item) => item.teacher_id,
      ),
    ),
  )

  let teacherRows: {
    id: string
    name: string
    is_active: boolean
  }[] = []

  if (teacherIds.length > 0) {
    const {
      data,
      error,
    } = await supabase
      .from('teachers')
      .select('id, name, is_active')
      .in('id', teacherIds)
      .eq('is_active', true)
      .order('name', {
        ascending: true,
      })

    if (error) {
      throw new Error(
        `خطأ في تحميل المعلمين: ${error.message}`,
      )
    }

    teacherRows = data ?? []
  }

  const teachers: RepositoryTeacher[] = teacherRows
    .map((teacher) => ({
      id: teacher.id,
      name: teacher.name,
      isActive: Boolean(teacher.is_active),
    }))
    .sort((a, b) =>
      a.name.localeCompare(b.name, 'ar'),
    )

  /*
   * المستويات الأكاديمية
   */

  const academicLevels: RepositoryAcademicLevel[] = Array.from(
    new Map(
      enrollmentRows
        .map((row) => {
          const levelData = Array.isArray(row.levels)
            ? row.levels[0]
            : row.levels

          if (!levelData?.id || !levelData?.name) {
            return null
          }

          return [
            levelData.id,
            {
              id: levelData.id,
              name: String(levelData.name),
              sort_order: Number(
                levelData.sort_order ?? 0,
              ),
            },
          ] as const
        })
        .filter(
          (
            item,
          ): item is readonly [
            string,
            RepositoryAcademicLevel,
          ] => item !== null,
        ),
    ).values(),
  ).sort(
    (a, b) => a.sort_order - b.sort_order,
  )

  const enrolledStudentIds = Array.from(
    new Set(
      enrollmentRows.map(
        (row) => row.student_id,
      ),
    ),
  )

  /*
   * الطلاب
   */

  const studentColumns =
    'id, student_id, name, personal_id, phone, whatsapp, status'

  const studentMap = new Map<
    string,
    {
      id: string
      student_id: string | null
      name: string
      personal_id: string | null
      phone: string | null
      whatsapp: string | null
      status: string
    }
  >()

  if (enrolledStudentIds.length > 0) {
    const {
      data,
      error,
    } = await supabase
      .from('students')
      .select(studentColumns)
      .in('id', enrolledStudentIds)

    if (error) {
      throw new Error(
        `خطأ في تحميل الطلاب: ${error.message}`,
      )
    }

    for (const student of data ?? []) {
      studentMap.set(student.id, student)
    }
  }

  /*
   * الطلاب الموجودون في التوزيع
   * حتى لو لم يعودوا ضمن التسجيل الحالي.
   */

  const assignmentStudentIds = Array.from(
    new Set(
      rawAssignmentRows.map(
        (row) => row.student_id,
      ),
    ),
  )

  const missingStudentIds = assignmentStudentIds.filter(
    (studentId) => !studentMap.has(studentId),
  )

  if (missingStudentIds.length > 0) {
    const {
      data,
      error,
    } = await supabase
      .from('students')
      .select(studentColumns)
      .in('id', missingStudentIds)

    if (error) {
      throw new Error(
        `خطأ في تحميل بعض الطلاب السابقين: ${error.message}`,
      )
    }

    for (const student of data ?? []) {
      studentMap.set(student.id, student)
    }
  }

  const students: Student[] = []

  for (const enrollment of enrollmentRows) {
    const student = studentMap.get(
      enrollment.student_id,
    )

    if (!student) {
      continue
    }

    const levelData = Array.isArray(
      enrollment.levels,
    )
      ? enrollment.levels[0]
      : enrollment.levels

    students.push({
      id: student.id,
      studentId: student.student_id ?? '',
      name: student.name,
      personalId: student.personal_id ?? '',
      phone: student.phone ?? '',
      whatsapp: student.whatsapp ?? '',
      levelId: enrollment.level_id,
      levelName: levelData?.name ?? '—',
      enrollmentId: enrollment.id,
      joinDate: enrollment.join_date ?? null,
    })
  }

  const mappedStudentIds = new Set(
    students.map((student) => student.id),
  )

  for (const studentId of missingStudentIds) {
    const student = studentMap.get(studentId)

    if (
      !student ||
      mappedStudentIds.has(studentId)
    ) {
      continue
    }

    students.push({
      id: student.id,
      studentId: student.student_id ?? '',
      name: student.name,
      personalId: student.personal_id ?? '',
      phone: student.phone ?? '',
      whatsapp: student.whatsapp ?? '',
      levelId: '',
      levelName: '—',
      enrollmentId: '',
      joinDate: null,
    })
  }

  /*
   * التوزيعات
   */

  const assignments: RepositoryAssignment[] =
    rawAssignmentRows.map((row) => ({
      id: row.id,
      courseId: row.course_id,
      teacherId: row.teacher_id,
      studentId: row.student_id,
      subjectId: row.subject_id,
    }))

  /*
   * ربط المعلمين بالدورات
   */

  const courseTeacherIds: Record<
    string,
    string[]
  > = {}

  for (const row of courseTeacherRows) {
    courseTeacherIds[row.course_id] ??= []

    courseTeacherIds[row.course_id].push(
      row.teacher_id,
    )
  }

  /*
   * حالات الحضور
   */

  const attendanceStatuses: AttendanceStatus[] =
    statusRows
      .filter((status) => {
        const name = String(
          status.name ?? '',
        ).trim()

        return (
          name === 'حاضر' ||
          name === 'غائب' ||
          name === 'متأخر' ||
          name === 'مستأذن'
        )
      })
      .map((status) => ({
        id: status.id,
        name: String(
          status.name,
        ).trim() as AttendanceStatus['name'],
        isActive: Boolean(status.is_active),
        sortOrder: status.sort_order ?? 0,
      }))

  /*
   * سجلات الحضور
   */

  const attendanceRecords: AttendanceRecord[] =
    attendanceRows.map((record) => ({
      id: record.id,
      studentId: record.student_id,
      enrollmentId: record.enrollment_id,
      courseId: record.course_id,
      attendanceDate: record.attendance_date,
      statusId: record.status_id,
      note: record.note ?? '',
    }))

  return {
    teachers,
    courses: mappedCourses,
    students,
    assignments,
    attendanceStatuses,
    attendanceRecords,
    allowTeacherTransfer: false,
    allowTeacherRemove: false,
    courseTeacherIds,
    teacherCourseSubjects,
    academicLevels,
  }
}
export async function loadActiveAcademicLevels() {
  return await supabase
    .from('levels')
    .select('id, name, sort_order')
    .eq('is_active', true)
    .order('sort_order', {
      ascending: true,
    })
}
