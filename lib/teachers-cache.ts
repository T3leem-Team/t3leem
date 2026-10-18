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

export type Teacher = {
  id: string
  name: string
  isActive: boolean
}

export type Assignment =
  PreviousCourseAssignment

export type TeacherCourseSubject =
  PreviousCourseSubject

export type ManagedCourse =
  PreviousManagedCourse

export type AcademicLevel = {
  id: string
  name: string
  sort_order: number
}

export type TeachersCache = {
  teachers: Teacher[]
  courses: ManagedCourse[]
  students: Student[]
  assignments: Assignment[]
  attendanceStatuses: AttendanceStatus[]
  attendanceRecords: AttendanceRecord[]
  allowTeacherTransfer: boolean
  allowTeacherRemove: boolean
  courseTeacherIds: Record<string, string[]>
  teacherCourseSubjects: TeacherCourseSubject[]
  academicLevels: AcademicLevel[]
}

let teachersCache: TeachersCache | null = null

let teachersCacheLoading: Promise<TeachersCache> | null =
  null

export function getTeachersCache() {
  return teachersCache
}

export function setTeachersCache(data: TeachersCache) {
  teachersCache = data
}

export function updateTeachersCache(
  patch: Partial<TeachersCache>,
) {
  teachersCache = {
    teachers: teachersCache?.teachers ?? [],
    courses: teachersCache?.courses ?? [],
    students: teachersCache?.students ?? [],
    assignments: teachersCache?.assignments ?? [],
    attendanceStatuses:
      teachersCache?.attendanceStatuses ?? [],
    attendanceRecords:
      teachersCache?.attendanceRecords ?? [],
    allowTeacherTransfer:
      teachersCache?.allowTeacherTransfer ?? false,
    allowTeacherRemove:
      teachersCache?.allowTeacherRemove ?? false,
    courseTeacherIds:
      teachersCache?.courseTeacherIds ?? {},
    teacherCourseSubjects:
      teachersCache?.teacherCourseSubjects ?? [],
    academicLevels: teachersCache?.academicLevels ?? [],
    ...patch,
  }
}

export function clearTeachersCache() {
  teachersCache = null
}

export async function loadTeachersCache(
  options?: {
    force?: boolean
  },
) {
  const force = options?.force ?? false

  if (!force && teachersCache) {
    return teachersCache
  }

  if (teachersCacheLoading) {
    return teachersCacheLoading
  }

  teachersCacheLoading = (async () => {
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

    /*
     * =====================================================
     * الدورات
     * =====================================================
     */

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

    const mappedCourses: ManagedCourse[] = (
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

    /*
     * =====================================================
     * ارتباط المعلمين بالدورات
     * =====================================================
     */

    const courseIds = mappedCourses.map(
      (course) => course.id,
    )

    let courseTeacherRows: {
      id: string
      course_id: string
      teacher_id: string
    }[] = []

    if (courseIds.length > 0) {
      const {
        data,
        error,
      } = await supabase
        .from('course_teachers')
        .select('id, course_id, teacher_id')
        .in('course_id', courseIds)

      if (error) {
        throw new Error(
          `خطأ في تحميل ارتباط المعلمين بالدورات: ${error.message}`,
        )
      }

      courseTeacherRows = data ?? []
    }

    /*
     * =====================================================
     * مواد الدورات
     * =====================================================
     */

    let courseSubjectRows: {
      id: string
      course_id: string
      subject_id: string
    }[] = []

    if (courseIds.length > 0) {
      const {
        data,
        error,
      } = await supabase
        .from('course_subjects')
        .select('id, course_id, subject_id')
        .in('course_id', courseIds)

      if (error) {
        throw new Error(
          `خطأ في تحميل مواد الدورات: ${error.message}`,
        )
      }

      courseSubjectRows = data ?? []
    }

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
     * =====================================================
     * ارتباط المواد بالمعلمين
     * =====================================================
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

    const teacherCourseSubjects: TeacherCourseSubject[] =
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
          (item): item is TeacherCourseSubject =>
            item !== null,
        )

    /*
     * =====================================================
     * المعلمين
     * =====================================================
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

    const teachers: Teacher[] = teacherRows
      .map((teacher) => ({
        id: teacher.id,
        name: teacher.name,
        isActive: Boolean(teacher.is_active),
      }))
      .sort((a, b) =>
        a.name.localeCompare(b.name, 'ar'),
      )

    /*
     * =====================================================
     * تسجيلات الطلاب
     * =====================================================
     */

    const {
      data: enrollmentRows,
      error: enrollmentsError,
    } = await supabase
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

    if (enrollmentsError) {
      throw new Error(
        `خطأ في تحميل تسجيلات الطلاب: ${enrollmentsError.message}`,
      )
    }

    /*
     * =====================================================
     * المستويات الأكاديمية
     * =====================================================
     */

    const academicLevels: AcademicLevel[] = Array.from(
      new Map(
        (enrollmentRows ?? [])
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
              AcademicLevel,
            ] => item !== null,
          ),
      ).values(),
    ).sort(
      (a, b) => a.sort_order - b.sort_order,
    )

    const enrolledStudentIds = Array.from(
      new Set(
        (enrollmentRows ?? []).map(
          (row) => row.student_id,
        ),
      ),
    )

    /*
     * =====================================================
     * الطلاب
     * =====================================================
     */

    let studentRows: {
      id: string
      student_id: string | null
      name: string
      personal_id: string | null
      phone: string | null
      whatsapp: string | null
      status: string
    }[] = []

    if (enrolledStudentIds.length > 0) {
      const {
        data,
        error,
      } = await supabase
        .from('students')
        .select(
          'id, student_id, name, personal_id, phone, whatsapp, status',
        )
        .in('id', enrolledStudentIds)

      if (error) {
        throw new Error(
          `خطأ في تحميل الطلاب: ${error.message}`,
        )
      }

      studentRows = data ?? []
    }

    const studentMap = new Map(
      studentRows.map((student) => [
        student.id,
        student,
      ]),
    )

    /*
     * =====================================================
     * توزيع الطلاب على المعلمين
     * =====================================================
     */

    let rawAssignmentRows: {
      id: string
      course_id: string
      teacher_id: string
      student_id: string
      subject_id: string
    }[] = []

    if (courseIds.length > 0) {
      const {
        data,
        error,
      } = await supabase
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

      rawAssignmentRows = data ?? []
    }

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

    /*
     * الطلاب الموجودون في التوزيع
     * حتى لو لم يعودوا ضمن التسجيل الحالي.
     */

    if (missingStudentIds.length > 0) {
      const {
        data,
        error,
      } = await supabase
        .from('students')
        .select(
          'id, student_id, name, personal_id, phone, whatsapp, status',
        )
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

    const students: Student[] = (
      enrollmentRows ?? []
    )
      .map((enrollment) => {
        const student = studentMap.get(
          enrollment.student_id,
        )

        if (!student) {
          return null
        }

        const levelData = Array.isArray(
          enrollment.levels,
        )
          ? enrollment.levels[0]
          : enrollment.levels

        return {
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
        }
      })
      .filter(
        (student): student is Student =>
          student !== null,
      )

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

    const assignments: Assignment[] =
      rawAssignmentRows.map((row) => ({
        id: row.id,
        courseId: row.course_id,
        teacherId: row.teacher_id,
        studentId: row.student_id,
        subjectId: row.subject_id,
      }))

    /*
     * =====================================================
     * ربط المعلمين بالدورات
     * =====================================================
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
     * =====================================================
     * حالات الحضور
     * =====================================================
     */

    const {
      data: statusRows,
      error: statusError,
    } = await supabase
      .from('attendance_statuses')
      .select('id, name, is_active, sort_order')
      .order('sort_order', {
        ascending: true,
      })

    if (statusError) {
      throw new Error(
        `خطأ في تحميل حالات الحضور: ${statusError.message}`,
      )
    }

    const attendanceStatuses: AttendanceStatus[] = (
      statusRows ?? []
    )
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
     * =====================================================
     * الحضور
     * =====================================================
     */

    let attendanceRows: {
      id: string
      student_id: string
      enrollment_id: string | null
      attendance_date: string
      status_id: string
      note: string | null
      course_id: string
    }[] = []

    if (courseIds.length > 0) {
      const pageSize = 1000
      let from = 0

      while (true) {
        const {
          data,
          error,
        } = await supabase
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

        attendanceRows.push(...batch)

        if (batch.length < pageSize) {
          break
        }

        from += pageSize
      }
    }

    console.log('ATTENDANCE LOAD CHECK', {
      total: attendanceRows.length,
      matchingRows: attendanceRows.filter(
        row =>
          row.course_id === '27097455-819d-409b-b8b7-3a40bc44f482' &&
          row.attendance_date === '2026-10-12'
      ).length,
    })

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

    const data: TeachersCache = {
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

    teachersCache = data

    return data
  })()

  try {
    return await teachersCacheLoading
  } finally {
    teachersCacheLoading = null
  }
}
