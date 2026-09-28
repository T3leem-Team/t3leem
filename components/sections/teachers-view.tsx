'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  ArrowLeftRight,
  History,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'

import { PageHeader } from '@/components/dashboard/page-header'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
} from '@/components/ui/card'

import {
  AttendanceView,
  AttendanceStatus,
  AttendanceRecord,
  AttendanceNotes,
  Course,
  Student,
} from '@/components/sections/attendance-view'

import {
  TeachersViewPreviousCourses,
  PreviousCourseAssignment,
  PreviousCourseSubject,
  PreviousManagedCourse,
} from '@/components/sections/teachers-view-previous-courses'

type Teacher = {
  id: string
  name: string
  isActive: boolean
}

type Assignment = PreviousCourseAssignment

type TeacherCourseSubject =
  PreviousCourseSubject

type ManagedCourse =
  PreviousManagedCourse

type TeachersCache = {
  teachers: Teacher[]
  courses: ManagedCourse[]
  students: Student[]
  assignments: Assignment[]
  attendanceStatuses: AttendanceStatus[]
  attendanceRecords: AttendanceRecord[]
  allowTeacherTransfer: boolean
  allowTeacherRemove: boolean
  courseTeacherIds: Record<
    string,
    string[]
  >
  teacherCourseSubjects: TeacherCourseSubject[]
}

let teachersCache: TeachersCache | null =
  null

let teachersDataLoading = false

function updateTeachersCache(
  patch: Partial<TeachersCache>,
) {
  teachersCache = {
    teachers:
      teachersCache?.teachers ?? [],
    courses:
      teachersCache?.courses ?? [],
    students:
      teachersCache?.students ?? [],
    assignments:
      teachersCache?.assignments ?? [],
    attendanceStatuses:
      teachersCache?.attendanceStatuses ??
      [],
    attendanceRecords:
      teachersCache?.attendanceRecords ??
      [],
    allowTeacherTransfer:
      teachersCache?.allowTeacherTransfer ??
      false,
    allowTeacherRemove:
      teachersCache?.allowTeacherRemove ??
      false,
    courseTeacherIds:
      teachersCache?.courseTeacherIds ??
      {},
    teacherCourseSubjects:
      teachersCache?.teacherCourseSubjects ??
      [],
    ...patch,
  }
}

export function TeachersView() {
  const [teachers, setTeachers] =
    useState<Teacher[]>(
      teachersCache?.teachers ?? [],
    )

  const [courses, setCourses] =
    useState<ManagedCourse[]>(
      teachersCache?.courses ?? [],
    )

  const [students, setStudents] =
    useState<Student[]>(
      teachersCache?.students ?? [],
    )

  const [assignments, setAssignments] =
    useState<Assignment[]>(
      teachersCache?.assignments ?? [],
    )

  const [
    attendanceStatuses,
    setAttendanceStatuses,
  ] = useState<AttendanceStatus[]>(
    teachersCache?.attendanceStatuses ??
      [],
  )

  const [
    attendanceRecords,
    setAttendanceRecords,
  ] = useState<AttendanceRecord[]>(
    teachersCache?.attendanceRecords ??
      [],
  )

  const [
    teacherCourseSubjects,
    setTeacherCourseSubjects,
  ] = useState<TeacherCourseSubject[]>(
    teachersCache?.teacherCourseSubjects ??
      [],
  )

  const [loading, setLoading] =
    useState(
      teachersCache === null,
    )

  const [saving, setSaving] =
    useState(false)

  const [
    deletingAssignmentId,
    setDeletingAssignmentId,
  ] = useState<string | null>(
    null,
  )

  const [
    allowTeacherTransfer,
    setAllowTeacherTransfer,
  ] = useState(
    teachersCache?.allowTeacherTransfer ??
      false,
  )

  const [
    allowTeacherRemove,
    setAllowTeacherRemove,
  ] = useState(
    teachersCache?.allowTeacherRemove ??
      false,
  )

  /*
   * =========================================================
   * صلاحيات المستخدم الحالي
   * =========================================================
   *
   * Admin:
   *   يقدر ينقل ويمسح حتى لو المشرف قفل الميزة.
   *
   * Teacher:
   *   يحتاج صلاحية teachers.manage_assignments
   *   بالإضافة إلى فتح الميزة من إعدادات المشرف.
   */
  const [
    currentUserRole,
    setCurrentUserRole,
  ] = useState<string | null>(
    null,
  )

  const [
    currentPermissionNames,
    setCurrentPermissionNames,
  ] = useState<string[]>([])

  const [
    permissionsLoading,
    setPermissionsLoading,
  ] = useState(true)

  const canManageAssignments =
    currentUserRole === 'Admin' ||
    currentPermissionNames.includes(
      'teachers.manage_assignments',
    )

  const canTransferStudents =
    currentUserRole === 'Admin' ||
    (
      canManageAssignments &&
      allowTeacherTransfer
    )

  const canRemoveStudents =
    currentUserRole === 'Admin' ||
    (
      canManageAssignments &&
      allowTeacherRemove
    )

  const [
    statusMessage,
    setStatusMessage,
  ] = useState('')

  const [search, setSearch] =
    useState('')

  const [
    selectedTeacherId,
    setSelectedTeacherId,
  ] = useState<string | null>(
    null,
  )

  const [activePanel, setActivePanel] =
    useState<
      | 'students'
      | 'addStudents'
      | 'attendance'
      | 'previousCourses'
    >('students')

  const [
    selectedGrade,
    setSelectedGrade,
  ] = useState('')

  const [
    selectedStudentIds,
    setSelectedStudentIds,
  ] = useState<string[]>([])

  const [
    isTransferOpen,
    setIsTransferOpen,
  ] = useState(false)

  const [
    transferStudentId,
    setTransferStudentId,
  ] = useState<string | null>(
    null,
  )

  const [
    transferTeacherId,
    setTransferTeacherId,
  ] = useState('')

  const [
    selectedAttendanceDate,
    setSelectedAttendanceDate,
  ] = useState<string | null>(
    null,
  )

  const [
    attendanceNotes,
    setAttendanceNotes,
  ] = useState<AttendanceNotes>(
    {},
  )

  const [
    courseTeacherIds,
    setCourseTeacherIds,
  ] = useState<
    Record<string, string[]>
  >(
    teachersCache?.courseTeacherIds ??
      {},
  )

  const [
    selectedPreviousCourseId,
    setSelectedPreviousCourseId,
  ] = useState<string | null>(
    null,
  )

  /*
   * =========================================================
   * تحميل صلاحيات المستخدم + إعدادات المشرف
   * =========================================================
   *
   * مهم:
   * هذا الجزء لا يعتمد على teachersCache.
   *
   * السبب:
   * إعدادات المشرف قد تتغير بينما بيانات المعلمين
   * موجودة في الكاش.
   *
   * لذلك نعيد قراءة:
   * - صلاحية المستخدم
   * - دور المستخدم
   * - إعدادات نقل الطلاب
   * - إعدادات مسح الطلاب
   *
   * عند Mount للصفحة.
   */
  const loadAccessSettings =
    async () => {
      setPermissionsLoading(true)

      try {
        const [
          permissionsResponse,
          supervisionResult,
        ] = await Promise.all([
          fetch(
            '/api/auth/permissions',
            {
              method: 'GET',
              cache: 'no-store',
            },
          ),

          supabase
            .from(
              'supervision_settings',
            )
            .select(
              'id, allow_teacher_transfer, allow_teacher_remove',
            )
            .eq(
              'id',
              'default',
            )
            .maybeSingle(),
        ])

        /*
         * -----------------------------------------------------
         * صلاحيات المستخدم
         * -----------------------------------------------------
         */
        if (
          permissionsResponse.ok
        ) {
          const permissionData =
            await permissionsResponse.json()

          setCurrentUserRole(
            permissionData?.role ??
              null,
          )

          setCurrentPermissionNames(
            Array.isArray(
              permissionData?.permissionNames,
            )
              ? permissionData.permissionNames
              : [],
          )
        } else {
          setCurrentUserRole(null)
          setCurrentPermissionNames([])

          console.error(
            'Failed to load current permissions:',
            await permissionsResponse.text(),
          )
        }

        /*
         * -----------------------------------------------------
         * إعدادات المشرف
         * -----------------------------------------------------
         */
        const {
          data: supervisionSettings,
          error:
            supervisionSettingsError,
        } = supervisionResult

        if (
          supervisionSettingsError
        ) {
          setAllowTeacherTransfer(false)
          setAllowTeacherRemove(false)

          updateTeachersCache({
            allowTeacherTransfer:
              false,
            allowTeacherRemove:
              false,
          })

          console.error(
            'Supervision settings error:',
            supervisionSettingsError,
          )
        } else {
          const nextAllowTeacherTransfer =
            Boolean(
              supervisionSettings?.allow_teacher_transfer,
            )

          const nextAllowTeacherRemove =
            Boolean(
              supervisionSettings?.allow_teacher_remove,
            )

          setAllowTeacherTransfer(
            nextAllowTeacherTransfer,
          )

          setAllowTeacherRemove(
            nextAllowTeacherRemove,
          )

          updateTeachersCache({
            allowTeacherTransfer:
              nextAllowTeacherTransfer,
            allowTeacherRemove:
              nextAllowTeacherRemove,
          })
        }
      } catch (error) {
        console.error(
          'Access settings load error:',
          error,
        )

        setCurrentUserRole(null)
        setCurrentPermissionNames([])
        setAllowTeacherTransfer(false)
        setAllowTeacherRemove(false)
      } finally {
        setPermissionsLoading(false)
      }
    }

  /*
   * =========================================================
   * تحميل البيانات
   * =========================================================
   */
  const loadData = async (
    showLoading = false,
  ) => {
    if (
      teachersDataLoading
    ) {
      return
    }

    /*
     * إذا لدينا Cache كامل، لا نحتاج Reload للبيانات.
     *
     * ملاحظة:
     * صلاحيات المستخدم وإعدادات المشرف يتم تحميلها
     * بشكل مستقل في loadAccessSettings().
     */
    if (
      teachersCache !== null
    ) {
      setLoading(false)
      return
    }

    teachersDataLoading = true

    if (showLoading) {
      setLoading(true)
    }

    setStatusMessage('')

    try {
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
        setStatusMessage(
          `خطأ في تحميل السنة الدراسية: ${academicYearError.message}`,
        )

        return
      }

      if (!academicYear) {
        setStatusMessage(
          'لا توجد سنة دراسية حالية مفعلة.',
        )

        return
      }

      const {
        data: courseRows,
        error: coursesError,
      } = await supabase
        .from('courses')
        .select(
          'id, name, start_date, end_date, days, created_at, is_closed, closed_at',
        )
        .eq(
          'academic_year_id',
          academicYear.id,
        )
        .order('created_at', {
          ascending: true,
        })

      if (coursesError) {
        setStatusMessage(
          `خطأ في تحميل الدورات: ${coursesError.message}`,
        )

        return
      }

      const mappedCourses: ManagedCourse[] =
        (courseRows ?? []).map(
          (course) => ({
            id: course.id,
            name: course.name,
            startDate:
              course.start_date ?? '',
            endDate:
              course.end_date ?? '',
            days: Array.isArray(
              course.days,
            )
              ? course.days
              : [],
            isClosed:
              Boolean(
                course.is_closed,
              ),
            closedAt:
              course.closed_at ??
              null,
          }),
        )

      setCourses(mappedCourses)

      updateTeachersCache({
        courses: mappedCourses,
      })

      const courseIds =
        mappedCourses.map(
          (course) => course.id,
        )

      let courseTeacherRows: {
        id: string
        course_id: string
        teacher_id: string
      }[] = []

      if (
        courseIds.length > 0
      ) {
        const {
          data,
          error,
        } = await supabase
          .from('course_teachers')
          .select(
            'id, course_id, teacher_id',
          )
          .in(
            'course_id',
            courseIds,
          )

        if (error) {
          setStatusMessage(
            `خطأ في تحميل ارتباط المعلمين بالدورات: ${error.message}`,
          )

          return
        }

        courseTeacherRows =
          data ?? []
      }

      let courseSubjectRows: {
        id: string
        course_id: string
        subject_id: string
      }[] = []

      if (
        courseIds.length > 0
      ) {
        const {
          data,
          error,
        } = await supabase
          .from('course_subjects')
          .select(
            'id, course_id, subject_id',
          )
          .in(
            'course_id',
            courseIds,
          )

        if (error) {
          setStatusMessage(
            `خطأ في تحميل مواد الدورات: ${error.message}`,
          )

          return
        }

        courseSubjectRows =
          data ?? []
      }

      const subjectIds =
        Array.from(
          new Set(
            courseSubjectRows.map(
              (row) =>
                row.subject_id,
            ),
          ),
        )

      let subjectRows: {
        id: string
        name: string
        is_active: boolean
      }[] = []

      if (
        subjectIds.length > 0
      ) {
        const {
          data,
          error,
        } = await supabase
          .from('subjects')
          .select(
            'id, name, is_active',
          )
          .in(
            'id',
            subjectIds,
          )

        if (error) {
          setStatusMessage(
            `خطأ في تحميل المواد الدراسية: ${error.message}`,
          )

          return
        }

        subjectRows =
          data ?? []
      }

      let courseSubjectTeacherRows: {
        id: string
        course_subject_id: string
        teacher_id: string
      }[] = []

      if (
        courseSubjectRows.length >
        0
      ) {
        const courseSubjectIds =
          courseSubjectRows.map(
            (row) => row.id,
          )

        const {
          data,
          error,
        } = await supabase
          .from(
            'course_subject_teachers',
          )
          .select(
            'id, course_subject_id, teacher_id',
          )
          .in(
            'course_subject_id',
            courseSubjectIds,
          )

        if (error) {
          setStatusMessage(
            `خطأ في تحميل ارتباط المواد بالمعلمين: ${error.message}`,
          )

          return
        }

        courseSubjectTeacherRows =
          data ?? []
      }

      const subjectMap =
        new Map(
          subjectRows.map(
            (subject) => [
              subject.id,
              subject,
            ],
          ),
        )

      const courseSubjectMap =
        new Map(
          courseSubjectRows.map(
            (row) => [
              row.id,
              row,
            ],
          ),
        )

      const mappedTeacherCourseSubjects: TeacherCourseSubject[] =
        courseSubjectTeacherRows
          .map((row) => {
            const courseSubject =
              courseSubjectMap.get(
                row.course_subject_id,
              )

            if (!courseSubject) {
              return null
            }

            const subject =
              subjectMap.get(
                courseSubject.subject_id,
              )

            if (!subject) {
              return null
            }

            return {
              courseId:
                courseSubject.course_id,
              teacherId:
                row.teacher_id,
              subjectId:
                subject.id,
              subjectName:
                subject.name,
            }
          })
          .filter(
            (
              item,
            ): item is TeacherCourseSubject =>
              item !== null,
          )

      setTeacherCourseSubjects(
        mappedTeacherCourseSubjects,
      )

      updateTeachersCache({
        teacherCourseSubjects:
          mappedTeacherCourseSubjects,
      })

      const teacherIds =
        Array.from(
          new Set(
            courseTeacherRows.map(
              (item) =>
                item.teacher_id,
            ),
          ),
        )

      let teacherRows: {
        id: string
        name: string
        is_active: boolean
      }[] = []

      if (
        teacherIds.length > 0
      ) {
        const {
          data,
          error,
        } = await supabase
          .from('teachers')
          .select(
            'id, name, is_active',
          )
          .in(
            'id',
            teacherIds,
          )
          .eq(
            'is_active',
            true,
          )
          .order('name', {
            ascending: true,
          })

        if (error) {
          setStatusMessage(
            `خطأ في تحميل المعلمين: ${error.message}`,
          )

          return
        }

        teacherRows =
          data ?? []
      }

      const mappedTeachers: Teacher[] =
        teacherRows
          .map((teacher) => ({
            id: teacher.id,
            name: teacher.name,
            isActive:
              Boolean(
                teacher.is_active,
              ),
          }))
          .sort((a, b) =>
            a.name.localeCompare(
              b.name,
              'ar',
            ),
          )

      setTeachers(
        mappedTeachers,
      )

      updateTeachersCache({
        teachers:
          mappedTeachers,
      })

      const {
        data: enrollmentRows,
        error: enrollmentsError,
      } = await supabase
        .from('enrollments')
        .select(
          `
            id,
            student_id,
            academic_year_id,
            level_id,
            status,
            levels (
              id,
              name,
              sort_order
            )
          `,
        )
        .eq(
          'academic_year_id',
          academicYear.id,
        )
        .eq('status', 'نشط')

      if (enrollmentsError) {
        setStatusMessage(
          `خطأ في تحميل تسجيلات الطلاب: ${enrollmentsError.message}`,
        )

        return
      }

      const enrolledStudentIds =
        Array.from(
          new Set(
            (
              enrollmentRows ?? []
            ).map(
              (row) =>
                row.student_id,
            ),
          ),
        )

      let studentRows: {
        id: string
        student_id: string | null
        name: string
        personal_id:
          | string
          | null
        phone: string | null
        status: string
      }[] = []

      if (
        enrolledStudentIds.length >
        0
      ) {
        const {
          data,
          error,
        } = await supabase
          .from('students')
          .select(
            'id, student_id, name, personal_id, phone, status',
          )
          .in(
            'id',
            enrolledStudentIds,
          )

        if (error) {
          setStatusMessage(
            `خطأ في تحميل الطلاب: ${error.message}`,
          )

          return
        }

        studentRows =
          data ?? []
      }

      const studentMap =
        new Map(
          studentRows.map(
            (student) => [
              student.id,
              student,
            ],
          ),
        )

      let rawAssignmentRows: {
        id: string
        course_id: string
        teacher_id: string
        student_id: string
        subject_id: string
      }[] = []

      if (
        courseIds.length > 0
      ) {
        const {
          data,
          error,
        } = await supabase
          .from(
            'teacher_student_assignments',
          )
          .select(
            'id, course_id, teacher_id, student_id, subject_id',
          )
          .in(
            'course_id',
            courseIds,
          )

        if (error) {
          setStatusMessage(
            `خطأ في تحميل توزيع الطلاب: ${error.message}`,
          )

          return
        }

        rawAssignmentRows =
          data ?? []
      }

      const assignmentStudentIds =
        Array.from(
          new Set(
            rawAssignmentRows.map(
              (row) =>
                row.student_id,
            ),
          ),
        )

      const missingStudentIds =
        assignmentStudentIds.filter(
          (studentId) =>
            !studentMap.has(
              studentId,
            ),
        )

      if (
        missingStudentIds.length >
        0
      ) {
        const {
          data,
          error,
        } = await supabase
          .from('students')
          .select(
            'id, student_id, name, personal_id, phone, status',
          )
          .in(
            'id',
            missingStudentIds,
          )

        if (error) {
          setStatusMessage(
            `خطأ في تحميل بعض الطلاب السابقين: ${error.message}`,
          )

          return
        }

        for (const student of
          data ?? []) {
          studentMap.set(
            student.id,
            student,
          )
        }
      }

      const mappedStudents: Student[] =
        (
          enrollmentRows ?? []
        )
          .map(
            (enrollment) => {
              const student =
                studentMap.get(
                  enrollment.student_id,
                )

              if (!student) {
                return null
              }

              const levelData =
                Array.isArray(
                  enrollment.levels,
                )
                  ? enrollment
                      .levels[0]
                  : enrollment.levels

              return {
                id: student.id,
                studentId:
                  student.student_id ??
                  '',
                name:
                  student.name,
                personalId:
                  student.personal_id ??
                  '',
                phone:
                  student.phone ??
                  '',
                levelId:
                  enrollment.level_id,
                levelName:
                  levelData?.name ??
                  '—',
                enrollmentId:
                  enrollment.id,
              }
            },
          )
          .filter(
            (
              student,
            ): student is Student =>
              student !== null,
          )

      const mappedStudentIds =
        new Set(
          mappedStudents.map(
            (student) =>
              student.id,
          ),
        )

      for (const studentId of
        missingStudentIds) {
        const student =
          studentMap.get(
            studentId,
          )

        if (
          !student ||
          mappedStudentIds.has(
            studentId,
          )
        ) {
          continue
        }

        mappedStudents.push({
          id: student.id,
          studentId:
            student.student_id ??
            '',
          name: student.name,
          personalId:
            student.personal_id ??
            '',
          phone:
            student.phone ??
            '',
          levelId: '',
          levelName: '—',
          enrollmentId: '',
        })
      }

      setStudents(
        mappedStudents,
      )

      updateTeachersCache({
        students:
          mappedStudents,
      })

      const assignmentRows: Assignment[] =
        rawAssignmentRows.map(
          (row) => ({
            id: row.id,
            courseId:
              row.course_id,
            teacherId:
              row.teacher_id,
            studentId:
              row.student_id,
            subjectId:
              row.subject_id,
          }),
        )

      setAssignments(
        assignmentRows,
      )

      updateTeachersCache({
        assignments:
          assignmentRows,
      })

      const teacherMap: Record<
        string,
        string[]
      > = {}

      for (const row of courseTeacherRows) {
        teacherMap[row.course_id] ??=
          []

        teacherMap[
          row.course_id
        ].push(
          row.teacher_id,
        )
      }

      setCourseTeacherIds(
        teacherMap,
      )

      updateTeachersCache({
        courseTeacherIds:
          teacherMap,
      })

      const {
        data: statusRows,
        error: statusError,
      } = await supabase
        .from(
          'attendance_statuses',
        )
        .select(
          'id, name, is_active, sort_order',
        )
        .order(
          'sort_order',
          {
            ascending: true,
          },
        )

      if (statusError) {
        setStatusMessage(
          `خطأ في تحميل حالات الحضور: ${statusError.message}`,
        )

        return
      }

      const mappedStatuses: AttendanceStatus[] =
        (
          statusRows ?? []
        )
          .filter((status) => {
            const name =
              String(
                status.name ??
                  '',
              ).trim()

            return (
              name === 'حاضر' ||
              name === 'غائب' ||
              name === 'متأخر' ||
              name ===
                'مستأذن'
            )
          })
          .map((status) => ({
            id: status.id,
            name: String(
              status.name,
            ).trim() as AttendanceStatus['name'],
            isActive:
              Boolean(
                status.is_active,
              ),
            sortOrder:
              status.sort_order ??
              0,
          }))

      setAttendanceStatuses(
        mappedStatuses,
      )

      updateTeachersCache({
        attendanceStatuses:
          mappedStatuses,
      })

      let attendanceRows: {
        id: string
        student_id: string
        enrollment_id:
          | string
          | null
        attendance_date: string
        status_id: string
        note: string | null
        course_id: string
      }[] = []

      if (
        courseIds.length > 0
      ) {
        const {
          data,
          error,
        } = await supabase
          .from('attendance')
          .select(
            'id, student_id, enrollment_id, attendance_date, status_id, note, course_id',
          )
          .in(
            'course_id',
            courseIds,
          )

        if (error) {
          setStatusMessage(
            `خطأ في تحميل الحضور: ${error.message}`,
          )

          return
        }

        attendanceRows =
          data ?? []
      }

      const mappedAttendanceRecords: AttendanceRecord[] =
        attendanceRows.map(
          (record) => ({
            id: record.id,
            studentId:
              record.student_id,
            enrollmentId:
              record.enrollment_id,
            courseId:
              record.course_id,
            attendanceDate:
              record.attendance_date,
            statusId:
              record.status_id,
            note:
              record.note ?? '',
          }),
        )

      setAttendanceRecords(
        mappedAttendanceRecords,
      )

      updateTeachersCache({
        attendanceRecords:
          mappedAttendanceRecords,
      })
    } catch (error) {
      console.error(
        'Teachers load error:',
        error,
      )

      if (
        error instanceof Error
      ) {
        setStatusMessage(
          `حدث خطأ أثناء تحميل البيانات: ${error.message}`,
        )
      }
    } finally {
      setLoading(false)
      teachersDataLoading = false
    }
  }

  /*
   * =========================================================
   * تشغيل تحميل البيانات والصلاحيات
   * =========================================================
   */
  useEffect(() => {
    void loadAccessSettings()

    if (
      teachersCache !== null
    ) {
      setLoading(false)
      return
    }

    void loadData(true)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateAttendanceRecords = (
    value:
      | AttendanceRecord[]
      | ((
          previous: AttendanceRecord[],
        ) => AttendanceRecord[]),
  ) => {
    setAttendanceRecords(
      (previous) => {
        const next =
          typeof value ===
          'function'
            ? value(previous)
            : value

        updateTeachersCache({
          attendanceRecords:
            next,
        })

        return next
      },
    )
  }

  const currentCourse =
    courses[0] ?? null

  const actualCurrentCourseTeacherIds =
    currentCourse
      ? new Set(
          courseTeacherIds[
            currentCourse.id
          ] ?? [],
        )
      : new Set<string>()

  const operationalTeachers =
    teachers.filter((teacher) =>
      actualCurrentCourseTeacherIds.has(
        teacher.id,
      ),
    )

  const filteredTeachers =
    useMemo(() => {
      const query = search
        .trim()
        .toLowerCase()

      if (!query) {
        return operationalTeachers
      }

      return operationalTeachers.filter(
        (teacher) =>
          teacher.name
            .toLowerCase()
            .includes(query) ||
          teacher.id
            .toLowerCase()
            .includes(query),
      )
    }, [
      search,
      operationalTeachers,
    ])

  const selectedTeacher =
    operationalTeachers.find(
      (teacher) =>
        teacher.id ===
        selectedTeacherId,
    ) ?? null

  const selectedTeacherSubjects =
    currentCourse &&
    selectedTeacherId
      ? teacherCourseSubjects.filter(
          (item) =>
            item.courseId ===
              currentCourse.id &&
            item.teacherId ===
              selectedTeacherId,
        )
      : []

  const selectedTeacherSubject =
    selectedTeacherSubjects[0] ??
    null

  const selectedTeacherSubjectNames =
    Array.from(
      new Set(
        selectedTeacherSubjects.map(
          (item) =>
            item.subjectName,
        ),
      ),
    )

  const assignedStudentIds =
    selectedTeacherId &&
    currentCourse
      ? assignments
          .filter(
            (assignment) =>
              assignment.courseId ===
                currentCourse.id &&
              assignment.teacherId ===
                selectedTeacherId,
          )
          .map(
            (assignment) =>
              assignment.studentId,
          )
      : []

  const assignedStudents =
    students.filter((student) =>
      assignedStudentIds.includes(
        student.id,
      ),
    )

  const availableGrades =
    Array.from(
      new Set(
        students
          .filter((student) =>
            Boolean(
              student.levelName &&
                student.levelName !==
                  '—',
            ),
          )
          .map(
            (student) =>
              student.levelName,
          ),
      ),
    ).sort((a, b) =>
      a.localeCompare(b, 'ar'),
    )

  const availableStudents =
    useMemo(() => {
      if (
        !selectedGrade ||
        !currentCourse
      ) {
        return []
      }

      return students.filter(
        (student) => {
          if (
            student.levelName !==
            selectedGrade
          ) {
            return false
          }

          const assignedToAnotherTeacher =
            assignments.some(
              (assignment) =>
                assignment.courseId ===
                  currentCourse.id &&
                assignment.studentId ===
                  student.id &&
                assignment.teacherId !==
                  selectedTeacherId,
            )

          const assignedToCurrentTeacher =
            assignments.some(
              (assignment) =>
                assignment.courseId ===
                  currentCourse.id &&
                assignment.studentId ===
                  student.id &&
                assignment.teacherId ===
                  selectedTeacherId,
            )

          return (
            !assignedToAnotherTeacher &&
            !assignedToCurrentTeacher
          )
        },
      )
    }, [
      selectedGrade,
      currentCourse,
      students,
      assignments,
      selectedTeacherId,
    ])

  const unavailableStudents =
    useMemo(() => {
      if (
        !selectedGrade ||
        !currentCourse
      ) {
        return []
      }

      return students
        .filter(
          (student) =>
            student.levelName ===
            selectedGrade,
        )
        .map((student) => {
          const assignment =
            assignments.find(
              (item) =>
                item.courseId ===
                  currentCourse.id &&
                item.studentId ===
                  student.id &&
                item.teacherId !==
                  selectedTeacherId,
            )

          if (!assignment) {
            return null
          }

          const teacher =
            operationalTeachers.find(
              (item) =>
                item.id ===
                assignment.teacherId,
            )

          return {
            student,
            teacherName:
              teacher?.name ??
              'معلم آخر',
          }
        })
        .filter(
          (
            item,
          ): item is {
            student: Student
            teacherName: string
          } => item !== null,
        )
    }, [
      selectedGrade,
      currentCourse,
      students,
      assignments,
      selectedTeacherId,
      operationalTeachers,
    ])

  const getStudentCount = (
    teacherId: string,
  ) => {
    if (!currentCourse) {
      return 0
    }

    return assignments.filter(
      (assignment) =>
        assignment.courseId ===
          currentCourse.id &&
        assignment.teacherId ===
          teacherId,
    ).length
  }

  const openTeacher = (
    teacherId: string,
  ) => {
    setSelectedTeacherId(
      teacherId,
    )

    setActivePanel(
      'students',
    )

    setSelectedGrade('')

    setSelectedStudentIds([])

    setIsTransferOpen(false)

    setTransferStudentId(null)

    setTransferTeacherId('')

    setSelectedAttendanceDate(
      null,
    )

    const previousCourses =
      courses.filter(
        (course) =>
          course.isClosed &&
          (
            courseTeacherIds[
              course.id
            ] ?? []
          ).includes(
            teacherId,
          ),
      )

    setSelectedPreviousCourseId(
      previousCourses[0]?.id ??
        null,
    )
  }

  const closeTeacher = () => {
    setSelectedTeacherId(null)

    setActivePanel(
      'students',
    )

    setSelectedGrade('')

    setSelectedStudentIds([])

    setIsTransferOpen(false)

    setTransferStudentId(null)

    setTransferTeacherId('')

    setSelectedAttendanceDate(
      null,
    )

    setSelectedPreviousCourseId(
      null,
    )
  }

  const openAddStudents = () => {
    setSelectedGrade('')

    setSelectedStudentIds([])

    setStatusMessage('')

    setActivePanel(
      'addStudents',
    )
  }

  const toggleStudent = (
    studentId: string,
  ) => {
    setSelectedStudentIds(
      (current) =>
        current.includes(studentId)
          ? current.filter(
              (id) =>
                id !==
                studentId,
            )
          : [
              ...current,
              studentId,
            ],
    )
  }

  const saveStudents = async () => {
    if (
      !selectedTeacherId ||
      !currentCourse ||
      selectedStudentIds.length ===
        0
    ) {
      return
    }

    if (
      selectedTeacherSubjects.length ===
      0
    ) {
      setStatusMessage(
        'لا توجد مادة مخصصة لهذا المعلم في الدورة الحالية. يرجى ضبط المادة من إعدادات الدورة أولًا.',
      )

      return
    }

    if (
      selectedTeacherSubjects.length >
      1
    ) {
      setStatusMessage(
        `هذا المعلم مرتبط بأكثر من مادة في الدورة الحالية: ${selectedTeacherSubjectNames.join(
          '، ',
        )}. يجب أن يكون للمعلم مادة واحدة قبل بدء تعيين الطلاب.`,
      )

      return
    }

    const subjectId =
      selectedTeacherSubject?.subjectId

    if (!subjectId) {
      setStatusMessage(
        'تعذر تحديد مادة المعلم تلقائيًا.',
      )

      return
    }

    setSaving(true)

    setStatusMessage(
      'جاري التحقق من الطلاب...',
    )

    const {
      data: existingRows,
      error: existingError,
    } = await supabase
      .from(
        'teacher_student_assignments',
      )
      .select(
        'id, course_id, teacher_id, student_id, subject_id',
      )
      .eq(
        'course_id',
        currentCourse.id,
      )
      .in(
        'student_id',
        selectedStudentIds,
      )

    if (existingError) {
      setStatusMessage(
        `تعذر التحقق من توزيع الطلاب: ${existingError.message}`,
      )

      setSaving(false)

      return
    }

    const existingAssignments: Assignment[] =
      (
        existingRows ?? []
      ).map((row) => ({
        id: row.id,
        courseId:
          row.course_id,
        teacherId:
          row.teacher_id,
        studentId:
          row.student_id,
        subjectId:
          row.subject_id,
      }))

    const alreadyWithCurrentTeacher =
      existingAssignments
        .filter(
          (assignment) =>
            assignment.teacherId ===
            selectedTeacherId,
        )
        .map(
          (assignment) =>
            assignment.studentId,
        )

    const assignedToAnotherTeacher =
      existingAssignments.filter(
        (assignment) =>
          assignment.teacherId !==
          selectedTeacherId,
      )

    if (
      assignedToAnotherTeacher.length >
      0
    ) {
      const anotherTeacher =
        operationalTeachers.find(
          (teacher) =>
            teacher.id ===
            assignedToAnotherTeacher[0]
              .teacherId,
        )

      setStatusMessage(
        `لا يمكن إضافة الطالب لأنه مسند بالفعل إلى ${anotherTeacher?.name ?? 'معلم آخر'} في هذه الدورة.`,
      )

      setSaving(false)

      return
    }

    const studentsToInsert =
      selectedStudentIds.filter(
        (studentId) =>
          !alreadyWithCurrentTeacher.includes(
            studentId,
          ),
      )

    if (
      studentsToInsert.length ===
      0
    ) {
      setSelectedStudentIds([])

      setSelectedGrade('')

      setActivePanel(
        'students',
      )

      setStatusMessage(
        'الطلاب المحددون مضافون بالفعل لهذا المعلم.',
      )

      setSaving(false)

      return
    }

    const rows =
      studentsToInsert.map(
        (studentId) => ({
          course_id:
            currentCourse.id,
          teacher_id:
            selectedTeacherId,
          student_id:
            studentId,
          subject_id:
            subjectId,
        }),
      )

    const { data, error } =
      await supabase
        .from(
          'teacher_student_assignments',
        )
        .insert(rows)
        .select(
          'id, course_id, teacher_id, student_id, subject_id',
        )

    if (error) {
      setStatusMessage(
        `تعذر إضافة الطلاب: ${error.message}`,
      )

      setSaving(false)

      return
    }

    const newAssignments: Assignment[] =
      (data ?? []).map((row) => ({
        id: row.id,
        courseId:
          row.course_id,
        teacherId:
          row.teacher_id,
        studentId:
          row.student_id,
        subjectId:
          row.subject_id,
      }))

    setAssignments(
      (current) => {
        const next = [
          ...current,
          ...newAssignments,
        ]

        updateTeachersCache({
          assignments: next,
        })

        return next
      },
    )

    setSelectedStudentIds([])

    setSelectedGrade('')

    setActivePanel(
      'students',
    )

    setStatusMessage(
      'تمت إضافة الطلاب بنجاح ✅',
    )

    setSaving(false)
  }

  const openTransfer = (
    studentId: string,
  ) => {
    if (
      !canTransferStudents
    ) {
      return
    }

    const assignment =
      assignments.find(
        (item) =>
          item.courseId ===
            currentCourse?.id &&
          item.teacherId ===
            selectedTeacherId &&
          item.studentId ===
            studentId,
      )

    if (!assignment) {
      setStatusMessage(
        'تعذر العثور على ربط الطالب الحالي.',
      )

      return
    }

    setTransferStudentId(
      studentId,
    )

    setTransferTeacherId('')

    setStatusMessage('')

    setIsTransferOpen(true)
  }

  const transferTeachers =
    useMemo(() => {
      if (
        !selectedTeacher ||
        !currentCourse
      ) {
        return []
      }

      return operationalTeachers
        .filter(
          (teacher) =>
            teacher.id !==
            selectedTeacher.id,
        )
        .map((teacher) => {
          const subjects =
            teacherCourseSubjects.filter(
              (item) =>
                item.courseId ===
                  currentCourse.id &&
                item.teacherId ===
                  teacher.id,
            )

          return {
            teacher,
            subjects,
          }
        })
    }, [
      operationalTeachers,
      selectedTeacher,
      currentCourse,
      teacherCourseSubjects,
    ])

  const selectedTransferTeacher =
    transferTeachers.find(
      (item) =>
        item.teacher.id ===
        transferTeacherId,
    ) ?? null

  const saveTransfer = async () => {
    if (
      !canTransferStudents
    ) {
      return
    }

    if (
      !selectedTeacherId ||
      !currentCourse ||
      !transferStudentId ||
      !transferTeacherId ||
      selectedTeacherId ===
        transferTeacherId
    ) {
      return
    }

    const assignment =
      assignments.find(
        (item) =>
          item.courseId ===
            currentCourse.id &&
          item.teacherId ===
            selectedTeacherId &&
          item.studentId ===
            transferStudentId,
      )

    if (!assignment) {
      setStatusMessage(
        'تعذر العثور على ربط الطالب الحالي.',
      )

      return
    }

    const targetTeacher =
      transferTeachers.find(
        (item) =>
          item.teacher.id ===
          transferTeacherId,
      )

    if (!targetTeacher) {
      setStatusMessage(
        'المعلم الجديد غير مرتبط بالدورة الحالية.',
      )

      return
    }

    if (
      targetTeacher.subjects.length ===
      0
    ) {
      setStatusMessage(
        'المعلم الجديد لا توجد له مادة مخصصة في هذه الدورة. يرجى ضبط المادة من إعدادات الدورة أولًا.',
      )

      return
    }

    if (
      targetTeacher.subjects.length >
      1
    ) {
      const subjectNames =
        Array.from(
          new Set(
            targetTeacher.subjects.map(
              (item) =>
                item.subjectName,
            ),
          ),
        )

      setStatusMessage(
        `لا يمكن نقل الطالب حاليًا لأن المعلم الجديد مرتبط بأكثر من مادة: ${subjectNames.join(
          '، ',
        )}. يجب تحديد مادة واحدة للمعلم من إعدادات الدورة.`,
      )

      return
    }

    const targetSubject =
      targetTeacher.subjects[0]

    if (!targetSubject?.subjectId) {
      setStatusMessage(
        'تعذر تحديد مادة المعلم الجديد.',
      )

      return
    }

    setSaving(true)

    setStatusMessage(
      'جاري نقل الطالب وتحديث مادة المعلم...',
    )

    const {
      data,
      error,
    } = await supabase
      .from(
        'teacher_student_assignments',
      )
      .update({
        teacher_id:
          transferTeacherId,
        subject_id:
          targetSubject.subjectId,
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        'id',
        assignment.id,
      )
      .select(
        'id, course_id, teacher_id, student_id, subject_id',
      )
      .single()

    if (error) {
      setStatusMessage(
        `تعذر نقل الطالب: ${error.message}`,
      )

      setSaving(false)

      return
    }

    const updatedAssignment: Assignment =
      {
        id: data.id,
        courseId:
          data.course_id,
        teacherId:
          data.teacher_id,
        studentId:
          data.student_id,
        subjectId:
          data.subject_id,
      }

    setAssignments(
      (current) => {
        const next =
          current.map(
            (item) =>
              item.id ===
              assignment.id
                ? updatedAssignment
                : item,
          )

        updateTeachersCache({
          assignments: next,
        })

        return next
      },
    )

    setTransferStudentId(
      null,
    )

    setTransferTeacherId('')

    setIsTransferOpen(false)

    setStatusMessage(
      `تم نقل الطالب إلى ${targetTeacher.teacher.name} وتحديث المادة إلى ${targetSubject.subjectName} بنجاح ✅`,
    )

    setSaving(false)
  }

  const removeStudentFromTeacher =
    async (
      assignment: Assignment,
      student: Student,
    ) => {
      if (
        !canRemoveStudents
      ) {
        return
      }

      const confirmed =
        window.confirm(
          `هل أنت متأكد من مسح الطالب "${student.name}" من هذا المعلم؟\n\nسيتم إلغاء ربط الطالب بالمعلم والمادة فقط، ولن يتم حذف الطالب من النظام أو حذف أو تعديل أي سجل من سجلات الحضور والغياب.`,
        )

      if (!confirmed) {
        return
      }

      setDeletingAssignmentId(
        assignment.id,
      )

      setStatusMessage(
        'جاري مسح الطالب من المعلم...',
      )

      const { error } =
        await supabase
          .from(
            'teacher_student_assignments',
          )
          .delete()
          .eq(
            'id',
            assignment.id,
          )

      if (error) {
        setStatusMessage(
          `تعذر مسح الطالب من المعلم: ${error.message}`,
        )

        setDeletingAssignmentId(
          null,
        )

        return
      }

      setAssignments(
        (current) => {
          const next =
            current.filter(
              (item) =>
                item.id !==
                assignment.id,
            )

          updateTeachersCache({
            assignments: next,
          })

          return next
        },
      )

      setSelectedStudentIds(
        (current) =>
          current.filter(
            (id) =>
              id !== student.id,
          ),
      )

      setDeletingAssignmentId(
        null,
      )

      setStatusMessage(
        `تم مسح ${student.name} من المعلم والمادة بنجاح، وسجلات الحضور محفوظة كما هي ✅`,
      )
    }

  if (
    !loading &&
    !currentCourse
  ) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="المعلمون"
          description="إدارة الطلاب والحضور للمعلمين"
        />

        {statusMessage && (
          <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
            {statusMessage}
          </div>
        )}

        <Card>
          <CardContent className="p-10 text-center">
            <p className="font-medium">
              لا توجد دورة دراسية حالية.
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              أضف سنة دراسية ودورة من قسم الإدارة والتحكم أولًا.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="المعلمون"
        description={`${operationalTeachers.length} معلم ضمن الدورة الحالية`}
      />

      {statusMessage && (
        <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
          {statusMessage}
        </div>
      )}

      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                الدورة الحالية
              </p>

              <h2 className="mt-1 text-lg font-semibold">
                {currentCourse?.name ??
                  '—'}
              </h2>
            </div>
          </div>

          {currentCourse && (
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-muted px-3 py-1.5">
                {currentCourse.startDate
                  ? new Intl.DateTimeFormat(
                      'ar-BH',
                      {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      },
                    ).format(
                      new Date(
                        `${currentCourse.startDate}T00:00:00`,
                      ),
                    )
                  : '—'}{' '}
                —{' '}
                {currentCourse.endDate
                  ? new Intl.DateTimeFormat(
                      'ar-BH',
                      {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      },
                    ).format(
                      new Date(
                        `${currentCourse.endDate}T00:00:00`,
                      ),
                    )
                  : '—'}
              </span>

              <span className="rounded-full bg-muted px-3 py-1.5">
                {currentCourse.days.join(
                  ' • ',
                ) || '—'}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

        <input
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value,
            )
          }
          placeholder="البحث عن معلم..."
          className="h-10 w-full rounded-md border bg-background px-3 pr-9 text-sm outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              جاري تحميل بيانات المعلمين...
            </div>
          ) : filteredTeachers.length ===
            0 ? (
            <div className="p-10 text-center">
              <p className="font-medium">
                لا يوجد معلمون مرتبطون بهذه الدورة.
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                اربط المعلمين بالدورة من قسم السنة الدراسية والدورات.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-right font-medium">
                      المعلم
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      المادة
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      المستوى
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      طلاب المعلم
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredTeachers.map(
                    (teacher) => {
                      const teacherStudentIds =
                        assignments
                          .filter(
                            (
                              assignment,
                            ) =>
                              assignment.courseId ===
                                currentCourse?.id &&
                              assignment.teacherId ===
                                teacher.id,
                          )
                          .map(
                            (
                              assignment,
                            ) =>
                              assignment.studentId,
                          )

                      const teacherGrades =
                        Array.from(
                          new Set(
                            students
                              .filter(
                                (
                                  student,
                                ) =>
                                  teacherStudentIds.includes(
                                    student.id,
                                  ),
                              )
                              .map(
                                (
                                  student,
                                ) =>
                                  student.levelName,
                              ),
                          ),
                        )

                      const teacherSubjects =
                        Array.from(
                          new Set(
                            teacherCourseSubjects
                              .filter(
                                (
                                  item,
                                ) =>
                                  item.courseId ===
                                    currentCourse?.id &&
                                  item.teacherId ===
                                    teacher.id,
                              )
                              .map(
                                (
                                  item,
                                ) =>
                                  item.subjectName,
                              ),
                          ),
                        )

                      return (
                        <tr
                          key={
                            teacher.id
                          }
                          onClick={() =>
                            openTeacher(
                              teacher.id,
                            )
                          }
                          className="cursor-pointer border-t hover:bg-muted/40"
                        >
                          <td className="px-4 py-4">
                            <button
                              type="button"
                              onClick={(
                                event,
                              ) => {
                                event.stopPropagation()

                                openTeacher(
                                  teacher.id,
                                )
                              }}
                              className="font-medium text-primary hover:underline"
                            >
                              {
                                teacher.name
                              }
                            </button>
                          </td>

                          <td className="px-4 py-4">
                            {teacherSubjects.length >
                            0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {teacherSubjects.map(
                                  (
                                    subject,
                                  ) => (
                                    <span
                                      key={
                                        subject
                                      }
                                      className="rounded-full bg-muted px-2.5 py-1 text-xs"
                                    >
                                      {
                                        subject
                                      }
                                    </span>
                                  ),
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">
                                —
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-4">
                            {teacherGrades.length >
                            0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {teacherGrades.map(
                                  (
                                    grade,
                                  ) => (
                                    <span
                                      key={
                                        grade
                                      }
                                      className="rounded-full bg-muted px-2.5 py-1 text-xs"
                                    >
                                      {
                                        grade
                                      }
                                    </span>
                                  ),
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">
                                —
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-4 font-medium tabular-nums">
                            {getStudentCount(
                              teacher.id,
                            )}
                          </td>
                        </tr>
                      )
                    },
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTeacher && (
        <div className="fixed inset-0 z-50 bg-background">
          <div className="mx-auto flex h-full max-w-6xl flex-col">
            <div className="flex items-center justify-between border-b px-4 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-semibold">
                  {
                    selectedTeacher.name
                  }
                </h2>

                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>
                    {currentCourse?.name ??
                      '—'}
                  </span>

                  {selectedTeacherSubjectNames.length >
                    0 && (
                    <>
                      <span>•</span>

                      <span className="font-medium text-foreground">
                        {selectedTeacherSubjectNames.join(
                          '، ',
                        )}
                      </span>
                    </>
                  )}
                </div>

                <p className="mt-1 text-sm text-muted-foreground">
                  {getStudentCount(
                    selectedTeacher.id,
                  )}{' '}
                  طالب
                </p>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={
                  closeTeacher
                }
                disabled={saving}
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="border-b bg-muted/20 px-4 py-4 sm:px-6">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    الدورة الحالية
                  </p>

                  <p className="font-semibold">
                    {
                      currentCourse?.name ??
                      '—'
                    }
                  </p>
                </div>

                {selectedTeacherSubjectNames.length >
                  0 && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      المادة
                    </p>

                    <p className="font-semibold">
                      {selectedTeacherSubjectNames.join(
                        '، ',
                      )}
                    </p>
                  </div>
                )}

                {currentCourse && (
                  <>
                    <span className="rounded-full bg-background px-3 py-1.5 text-sm">
                      {currentCourse.startDate
                        ? new Intl.DateTimeFormat(
                            'ar-BH',
                            {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            },
                          ).format(
                            new Date(
                              `${currentCourse.startDate}T00:00:00`,
                            ),
                          )
                        : '—'}{' '}
                      —{' '}
                      {currentCourse.endDate
                        ? new Intl.DateTimeFormat(
                            'ar-BH',
                            {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            },
                          ).format(
                            new Date(
                              `${currentCourse.endDate}T00:00:00`,
                            ),
                          )
                        : '—'}
                    </span>

                    <span className="rounded-full bg-background px-3 py-1.5 text-sm">
                      {currentCourse.days.join(
                        ' • ',
                      ) ||
                        '—'}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="border-b px-4 py-3 sm:px-6">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={
                    activePanel ===
                    'students'
                      ? 'default'
                      : 'outline'
                  }
                  onClick={() => {
                    setActivePanel(
                      'students',
                    )

                    setSelectedAttendanceDate(
                      null,
                    )
                  }}
                >
                  الطلاب
                </Button>

                <Button
                  variant={
                    activePanel ===
                    'attendance'
                      ? 'default'
                      : 'outline'
                  }
                  onClick={() => {
                    setActivePanel(
                      'attendance',
                    )

                    setSelectedAttendanceDate(
                      null,
                    )
                  }}
                >
                  الحضور والغياب
                </Button>

                <Button
                  variant={
                    activePanel ===
                    'previousCourses'
                      ? 'default'
                      : 'outline'
                  }
                  onClick={() => {
                    setActivePanel(
                      'previousCourses',
                    )

                    const firstCourse =
                      courses.find(
                        (course) =>
                          course.isClosed &&
                          (
                            courseTeacherIds[
                              course.id
                            ] ?? []
                          ).includes(
                            selectedTeacher.id,
                          ),
                      )

                    setSelectedPreviousCourseId(
                      firstCourse?.id ??
                        null,
                    )
                  }}
                >
                  <History className="size-4" />
                  الدورات السابقة
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {activePanel ===
                'students' && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">
                        طلاب المعلم
                      </h3>

                      <p className="text-sm text-muted-foreground">
                        الطلاب المسندون لهذا المعلم في الدورة الحالية.
                      </p>
                    </div>

                    <Button
                      onClick={
                        openAddStudents
                      }
                    >
                      <Plus className="size-4" />
                      إضافة طلاب
                    </Button>
                  </div>

                  {assignedStudents.length ===
                  0 ? (
                    <div className="rounded-lg border border-dashed p-10 text-center">
                      <p className="font-medium">
                        لا يوجد طلاب حاليًا
                      </p>

                      <p className="mt-1 text-sm text-muted-foreground">
                        أضف الطلاب من القائمة الأساسية.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 text-right font-medium">
                              الطالب
                            </th>

                            <th className="px-4 py-3 text-right font-medium">
                              الرقم الشخصي
                            </th>

                            <th className="px-4 py-3 text-right font-medium">
                              المستوى
                            </th>

                            {(canTransferStudents ||
                              canRemoveStudents) && (
                              <th className="px-4 py-3 text-right font-medium">
                                إجراء
                              </th>
                            )}
                          </tr>
                        </thead>

                        <tbody>
                          {assignedStudents.map(
                            (
                              student,
                            ) => {
                              const assignment =
                                assignments.find(
                                  (
                                    item,
                                  ) =>
                                    item.courseId ===
                                      currentCourse?.id &&
                                    item.teacherId ===
                                      selectedTeacher.id &&
                                    item.studentId ===
                                      student.id,
                                )

                              const isDeleting =
                                assignment?.id ===
                                deletingAssignmentId

                              return (
                                <tr
                                  key={
                                    student.id
                                  }
                                  className="border-t"
                                >
                                  <td className="px-4 py-3 font-medium">
                                    {
                                      student.name
                                    }
                                  </td>

                                  <td className="px-4 py-3">
                                    {student.personalId ||
                                      '—'}
                                  </td>

                                  <td className="px-4 py-3">
                                    {
                                      student.levelName
                                    }
                                  </td>

                                  {(canTransferStudents ||
                                    canRemoveStudents) && (
                                    <td className="px-4 py-3">
                                      <div className="flex flex-wrap gap-2">
                                        {canTransferStudents && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                              openTransfer(
                                                student.id,
                                              )
                                            }
                                            disabled={
                                              isDeleting ||
                                              saving
                                            }
                                          >
                                            <ArrowLeftRight className="size-4" />
                                            نقل
                                          </Button>
                                        )}

                                        {canRemoveStudents && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              if (
                                                assignment
                                              ) {
                                                removeStudentFromTeacher(
                                                  assignment,
                                                  student,
                                                )
                                              }
                                            }}
                                            disabled={
                                              !assignment ||
                                              isDeleting ||
                                              saving
                                            }
                                            className="text-destructive hover:text-destructive"
                                          >
                                            <Trash2 className="size-4" />

                                            {isDeleting
                                              ? 'جاري المسح...'
                                              : 'مسح'}
                                          </Button>
                                        )}
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              )
                            },
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activePanel ===
                'addStudents' && (
                <div className="mx-auto max-w-3xl space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">
                        إضافة طلاب
                      </h3>

                      <p className="text-sm text-muted-foreground">
                        اختر الطلاب من الطلاب المسجلين في السنة الدراسية الحالية.
                      </p>

                      <div className="mt-3 rounded-lg border bg-muted/30 p-3">
                        <p className="text-xs text-muted-foreground">
                          سيتم الإضافة تلقائيًا إلى
                        </p>

                        <p className="mt-1 font-medium">
                          {currentCourse?.name ??
                            '—'}
                        </p>

                        <p className="mt-1 text-sm text-muted-foreground">
                          المادة:{' '}
                          <span className="font-medium text-foreground">
                            {selectedTeacherSubjectNames.length >
                            0
                              ? selectedTeacherSubjectNames.join(
                                  '، ',
                                )
                              : 'غير محددة'}
                          </span>
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setActivePanel(
                          'students',
                        )
                      }
                    >
                      <X className="size-4" />
                    </Button>
                  </div>

                  {selectedTeacherSubjects.length ===
                    0 && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
                      لا توجد مادة مخصصة لهذا المعلم في هذه الدورة.
                      <br />
                      يرجى تحديد المادة للمعلم من إعدادات الدورة قبل
                      بدء تعيين الطلاب.
                    </div>
                  )}

                  {selectedTeacherSubjects.length >
                    1 && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
                      المعلم مرتبط بأكثر من مادة في هذه الدورة:
                      <span className="font-medium">
                        {' '}
                        {selectedTeacherSubjectNames.join(
                          '، ',
                        )}
                      </span>
                      .
                      <br />
                      لا يوجد اختيار مادة في هذه الصفحة، لذلك يجب أن
                      تكون مادة المعلم محددة بشكل واحد من إعدادات الدورة.
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      المستوى الأكاديمي
                    </label>

                    <select
                      value={
                        selectedGrade
                      }
                      onChange={(
                        event,
                      ) => {
                        setSelectedGrade(
                          event.target
                            .value,
                        )

                        setSelectedStudentIds(
                          [],
                        )
                      }}
                      className="h-11 w-full rounded-md border bg-background px-3 text-sm outline-none"
                    >
                      <option value="">
                        اختر المستوى
                      </option>

                      {availableGrades.map(
                        (
                          grade,
                        ) => (
                          <option
                            key={
                              grade
                            }
                            value={
                              grade
                            }
                          >
                            {
                              grade
                            }
                          </option>
                        ),
                      )}
                    </select>
                  </div>

                  {selectedGrade && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          الطلاب
                        </span>

                        <span className="text-xs text-muted-foreground">
                          تم تحديد{' '}
                          {
                            selectedStudentIds.length
                          }
                        </span>
                      </div>

                      {availableStudents.length ===
                        0 &&
                      unavailableStudents.length ===
                        0 ? (
                        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                          لا يوجد طلاب لهذا المستوى.
                        </div>
                      ) : (
                        <div className="overflow-hidden rounded-lg border">
                          {availableStudents.map(
                            (
                              student,
                            ) => {
                              const selected =
                                selectedStudentIds.includes(
                                  student.id,
                                )

                              return (
                                <label
                                  key={
                                    student.id
                                  }
                                  className="flex cursor-pointer items-center gap-3 border-b p-4 last:border-b-0 hover:bg-muted/30"
                                >
                                  <input
                                    type="checkbox"
                                    checked={
                                      selected
                                    }
                                    onChange={() =>
                                      toggleStudent(
                                        student.id,
                                      )
                                    }
                                    className="size-4"
                                  />

                                  <div>
                                    <p className="font-medium">
                                      {
                                        student.name
                                      }
                                    </p>

                                    <p className="text-xs text-muted-foreground">
                                      {student.personalId ||
                                        '—'}
                                    </p>
                                  </div>
                                </label>
                              )
                            },
                          )}

                          {unavailableStudents.map(
                            ({
                              student,
                              teacherName,
                            }) => (
                              <div
                                key={
                                  student.id
                                }
                                className="flex items-center gap-3 border-b bg-muted/20 p-4 last:border-b-0"
                              >
                                <input
                                  type="checkbox"
                                  disabled
                                  className="size-4"
                                />

                                <div>
                                  <p className="font-medium text-muted-foreground">
                                    {
                                      student.name
                                    }
                                  </p>

                                  <p className="text-xs text-muted-foreground">
                                    عند الأستاذ{' '}
                                    {
                                      teacherName
                                    }
                                  </p>
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 border-t pt-4">
                    <Button
                      variant="outline"
                      onClick={() =>
                        setActivePanel(
                          'students',
                        )
                      }
                      disabled={saving}
                    >
                      إلغاء
                    </Button>

                    <Button
                      onClick={
                        saveStudents
                      }
                      disabled={
                        saving ||
                        selectedStudentIds.length ===
                          0 ||
                        selectedTeacherSubjects.length !==
                          1
                      }
                    >
                      {saving
                        ? 'جاري الحفظ...'
                        : 'حفظ'}
                    </Button>
                  </div>
                </div>
              )}

              {activePanel ===
                'attendance' && (
                <AttendanceView
                  currentCourse={
                    currentCourse
                  }
                  assignedStudents={
                    assignedStudents
                  }
                  attendanceStatuses={
                    attendanceStatuses
                  }
                  attendanceRecords={
                    attendanceRecords
                  }
                  setAttendanceRecords={
                    updateAttendanceRecords
                  }
                  attendanceNotes={
                    attendanceNotes
                  }
                  setAttendanceNotes={
                    setAttendanceNotes
                  }
                  statusMessage={
                    statusMessage
                  }
                  setStatusMessage={
                    setStatusMessage
                  }
                  selectedAttendanceDate={
                    selectedAttendanceDate
                  }
                  setSelectedAttendanceDate={
                    setSelectedAttendanceDate
                  }
                />
              )}

              {activePanel ===
                'previousCourses' &&
                selectedTeacher && (
                  <TeachersViewPreviousCourses
                    teacherId={
                      selectedTeacher.id
                    }
                    courses={courses}
                    assignments={
                      assignments
                    }
                    students={students}
                    attendanceStatuses={
                      attendanceStatuses
                    }
                    attendanceRecords={
                      attendanceRecords
                    }
                    courseTeacherIds={
                      courseTeacherIds
                    }
                    teacherCourseSubjects={
                      teacherCourseSubjects
                    }
                    selectedCourseId={
                      selectedPreviousCourseId
                    }
                    onSelectedCourseChange={
                      setSelectedPreviousCourseId
                    }
                  />
                )}
            </div>
          </div>
        </div>
      )}

      {isTransferOpen &&
        transferStudentId &&
        selectedTeacher &&
        currentCourse &&
        canTransferStudents && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
            <Card className="w-full max-w-md">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">
                    نقل الطالب
                  </h2>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setIsTransferOpen(
                        false,
                      )

                      setTransferStudentId(
                        null,
                      )

                      setTransferTeacherId(
                        '',
                      )
                    }}
                    disabled={saving}
                  >
                    <X className="size-4" />
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground">
                  سيتم إلغاء الربط الحالي ونقل الطالب إلى المعلم الجديد.
                  <br />
                  <span className="font-medium text-foreground">
                    المادة ستتغير تلقائيًا إلى مادة المعلم الجديد.
                  </span>
                  <br />
                  <span className="font-medium text-foreground">
                    سجلات الحضور والغياب لن تتأثر.
                  </span>
                </p>

                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="font-medium">
                    {
                      students.find(
                        (
                          student,
                        ) =>
                          student.id ===
                          transferStudentId,
                      )?.name
                    }
                  </p>

                  {(() => {
                    const currentAssignment =
                      assignments.find(
                        (item) =>
                          item.courseId ===
                            currentCourse.id &&
                          item.teacherId ===
                            selectedTeacher.id &&
                          item.studentId ===
                            transferStudentId,
                      )

                    const currentSubject =
                      currentAssignment
                        ? teacherCourseSubjects.find(
                            (item) =>
                              item.courseId ===
                                currentCourse.id &&
                              item.teacherId ===
                                selectedTeacher.id &&
                              item.subjectId ===
                                currentAssignment.subjectId,
                          )
                        : null

                    return (
                      <div className="mt-2 text-sm text-muted-foreground">
                        <div>
                          المعلم الحالي:{' '}
                          <span className="font-medium text-foreground">
                            {
                              selectedTeacher.name
                            }
                          </span>
                        </div>

                        <div>
                          المادة الحالية:{' '}
                          <span className="font-medium text-foreground">
                            {currentSubject?.subjectName ||
                              selectedTeacherSubjectNames.join(
                                '، ',
                              ) ||
                              '—'}
                          </span>
                        </div>
                      </div>
                    )
                  })()}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    المعلم الجديد
                  </label>

                  <select
                    value={
                      transferTeacherId
                    }
                    onChange={(
                      event,
                    ) => {
                      setTransferTeacherId(
                        event.target
                          .value,
                      )

                      setStatusMessage(
                        '',
                      )
                    }}
                    className="h-11 w-full rounded-md border bg-background px-3 text-sm outline-none"
                  >
                    <option value="">
                      اختر المعلم
                    </option>

                    {transferTeachers.map(
                      ({
                        teacher,
                        subjects,
                      }) => {
                        const subjectNames =
                          Array.from(
                            new Set(
                              subjects.map(
                                (
                                  subject,
                                ) =>
                                  subject.subjectName,
                              ),
                            ),
                          )

                        return (
                          <option
                            key={
                              teacher.id
                            }
                            value={
                              teacher.id
                            }
                          >
                            {teacher.name}
                            {subjectNames.length >
                            0
                              ? ` — ${subjectNames.join(
                                  '، ',
                                )}`
                              : ' — لا توجد مادة'}
                          </option>
                        )
                      },
                    )}
                  </select>
                </div>

                {transferTeacherId && (
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">
                      بعد النقل ستكون المادة
                    </p>

                    <p className="mt-1 font-medium">
                      {selectedTransferTeacher &&
                      selectedTransferTeacher
                        .subjects.length ===
                        1
                        ? selectedTransferTeacher
                            .subjects[0]
                            .subjectName
                        : selectedTransferTeacher
                              ?.subjects.length ===
                            0
                          ? 'غير محددة'
                          : 'أكثر من مادة'}
                    </p>
                  </div>
                )}

                {transferTeacherId &&
                  selectedTransferTeacher &&
                  selectedTransferTeacher
                    .subjects.length !==
                    1 && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                      {selectedTransferTeacher
                        .subjects.length ===
                      0
                        ? 'لا يمكن النقل إلى هذا المعلم قبل تحديد مادته في إعدادات الدورة.'
                        : 'لا يمكن النقل لأن هذا المعلم مرتبط بأكثر من مادة في الدورة. يجب تحديد مادة واحدة للمعلم.'}
                    </div>
                  )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsTransferOpen(
                        false,
                      )

                      setTransferStudentId(
                        null,
                      )

                      setTransferTeacherId(
                        '',
                      )
                    }}
                    disabled={saving}
                  >
                    إلغاء
                  </Button>

                  <Button
                    onClick={
                      saveTransfer
                    }
                    disabled={
                      saving ||
                      !transferTeacherId ||
                      !selectedTransferTeacher ||
                      selectedTransferTeacher
                        .subjects.length !==
                        1
                    }
                  >
                    <ArrowLeftRight className="size-4" />

                    {saving
                      ? 'جاري النقل...'
                      : 'تأكيد النقل'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
    </div>
  )
}