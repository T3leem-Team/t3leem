'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Search,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'

import {
  getTeachersCache,
  loadTeachersCache,
  updateTeachersCache,
  type Teacher,
  type Assignment,
  type TeacherCourseSubject,
  type ManagedCourse,
} from '@/lib/teachers-cache'

import { PageHeader } from '@/components/dashboard/page-header'

import {
  Card,
  CardContent,
} from '@/components/ui/card'

import {
  type AttendanceStatus,
  type AttendanceRecord,
  type AttendanceNotes,
  type Student,
} from '@/components/sections/teacher-attendance'

import {
  TeachersViewTeacherPanel,
} from '@/components/sections/teachers-view-teacher-panel'

const initialTeachersCache =
  getTeachersCache()

type RemoveMode =
  | 'assignment_only'
  | 'assignment_and_attendance'

export function TeachersView() {
  const [teachers, setTeachers] =
    useState<Teacher[]>(
      initialTeachersCache?.teachers ?? [],
    )

  const [courses, setCourses] =
    useState<ManagedCourse[]>(
      initialTeachersCache?.courses ?? [],
    )

  const [students, setStudents] =
    useState<Student[]>(
      initialTeachersCache?.students ?? [],
    )

  const [assignments, setAssignments] =
    useState<Assignment[]>(
      initialTeachersCache?.assignments ?? [],
    )

  const [
    attendanceStatuses,
    setAttendanceStatuses,
  ] = useState<AttendanceStatus[]>(
    initialTeachersCache?.attendanceStatuses ?? [],
  )

  const [
    attendanceRecords,
    setAttendanceRecords,
  ] = useState<AttendanceRecord[]>(
    initialTeachersCache?.attendanceRecords ?? [],
  )

  const [
    teacherCourseSubjects,
    setTeacherCourseSubjects,
  ] = useState<TeacherCourseSubject[]>(
    initialTeachersCache?.teacherCourseSubjects ?? [],
  )

  const [loading, setLoading] =
    useState(
      initialTeachersCache === null,
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
    pendingRemove,
    setPendingRemove,
  ] = useState<{
    assignment: Assignment
    student: Student
  } | null>(null)

  const [
    allowTeacherTransfer,
    setAllowTeacherTransfer,
  ] = useState(
    initialTeachersCache?.allowTeacherTransfer ??
      false,
  )

  const [
    allowTeacherRemove,
    setAllowTeacherRemove,
  ] = useState(
    initialTeachersCache?.allowTeacherRemove ??
      false,
  )

  const [
    academicLevels,
    setAcademicLevels,
  ] = useState<
    {
      id: string
      name: string
      sort_order: number
    }[]
  >([])

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
    currentPermissionIds,
    setCurrentPermissionIds,
  ] = useState<string[]>([])

  const [
    permissionsLoading,
    setPermissionsLoading,
  ] = useState(true)

  const canManageAssignments =
    currentPermissionNames.includes(
      'teachers.manage_assignments',
    ) ||
    currentPermissionIds.includes(
      '549e42cf-2348-4750-a943-2ca4ce51177a',
    )

  const canTransferStudents =
    allowTeacherTransfer &&
    (
      currentUserRole === 'Admin' ||
      canManageAssignments
    )

  const canRemoveStudents =
    allowTeacherRemove &&
    (
      currentUserRole === 'Admin' ||
      canManageAssignments
    )

  console.log('TEACHERS ACCESS', {
    currentUserRole,
    currentPermissionNames,
    currentPermissionIds,
    allowTeacherTransfer,
    allowTeacherRemove,
    canManageAssignments,
    canTransferStudents,
    canRemoveStudents,
  })

  const [
    statusMessage,
    setStatusMessage,
  ] = useState('')

  const [search, setSearch] =
    useState('')

  const [
    selectedTeacherId,
    setSelectedTeacherId,
  ] = useState<string | null>(null)

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
  ] = useState<string | null>(null)

  const [
    transferTeacherId,
    setTransferTeacherId,
  ] = useState('')

  const [
    selectedAttendanceDate,
    setSelectedAttendanceDate,
  ] = useState<string | null>(null)

  const [
    attendanceNotes,
    setAttendanceNotes,
  ] = useState<AttendanceNotes>({})

  const [
    courseTeacherIds,
    setCourseTeacherIds,
  ] = useState<Record<string, string[]>>(
    initialTeachersCache?.courseTeacherIds ?? {},
  )

  const [
    selectedPreviousCourseId,
    setSelectedPreviousCourseId,
  ] = useState<string | null>(null)

  const loadAccessSettings =
    async () => {
      setPermissionsLoading(true)

      try {
        const permissionsResponse =
          await fetch(
            '/api/auth/permissions',
            {
              method: 'GET',
              cache: 'no-store',
            },
          )

        if (
          !permissionsResponse.ok
        ) {
          const errorText =
            await permissionsResponse.text()

          console.error(
            'Failed to load current permissions:',
            errorText,
          )

          setCurrentUserRole(null)

          setCurrentPermissionNames(
            [],
          )

          setCurrentPermissionIds(
            [],
          )

          setAllowTeacherTransfer(
            false,
          )

          setAllowTeacherRemove(
            false,
          )

          updateTeachersCache({
            allowTeacherTransfer:
              false,
            allowTeacherRemove:
              false,
          })

          return
        }

        const permissionData =
          await permissionsResponse.json()

        console.log(
          'TEACHERS ACCESS - permissions:',
          permissionData,
        )

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

        setCurrentPermissionIds(
          Array.isArray(
            permissionData?.permissionIds,
          )
            ? permissionData.permissionIds
            : [],
        )

        const nextAllowTeacherTransfer =
          Boolean(
            permissionData?.allowTeacherTransfer,
          )

        const nextAllowTeacherRemove =
          Boolean(
            permissionData?.allowTeacherRemove,
          )

        console.log(
          'TEACHERS ACCESS - transfer:',
          nextAllowTeacherTransfer,
          'remove:',
          nextAllowTeacherRemove,
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
      } catch (error) {
        console.error(
          'Access settings load error:',
          error,
        )

        setCurrentUserRole(null)

        setCurrentPermissionNames(
          [],
        )

        setCurrentPermissionIds(
          [],
        )

        setAllowTeacherTransfer(
          false,
        )

        setAllowTeacherRemove(
          false,
        )

        updateTeachersCache({
          allowTeacherTransfer:
            false,
          allowTeacherRemove:
            false,
        })
      } finally {
        setPermissionsLoading(false)
      }
    }

  useEffect(() => {
    void loadAccessSettings()

    const loadAcademicLevels =
      async () => {
        const {
          data,
          error,
        } = await supabase
          .from('levels')
          .select(
            'id, name, sort_order',
          )
          .eq(
            'is_active',
            true,
          )
          .order(
            'sort_order',
            {
              ascending: true,
            },
          )

        if (error) {
          console.error(
            'Academic levels load error:',
            error,
          )

          return
        }

        setAcademicLevels(
          (data ?? []).map(
            (level) => ({
              id: level.id,
              name: level.name,
              sort_order:
                Number(
                  level.sort_order ??
                    0,
                ),
            }),
          ),
        )
      }

    void loadAcademicLevels()

    const cached =
      getTeachersCache()

    if (cached) {
      setTeachers(
        cached.teachers,
      )

      setCourses(
        cached.courses,
      )

      setStudents(
        cached.students,
      )

      setAssignments(
        cached.assignments,
      )

      setAttendanceStatuses(
        cached.attendanceStatuses,
      )

      setAttendanceRecords(
        cached.attendanceRecords,
      )

      setTeacherCourseSubjects(
        cached.teacherCourseSubjects,
      )

      setCourseTeacherIds(
        cached.courseTeacherIds,
      )

      setAllowTeacherTransfer(
        cached.allowTeacherTransfer,
      )

      setAllowTeacherRemove(
        cached.allowTeacherRemove,
      )

      setLoading(false)

      return
    }

    let cancelled = false

    const load = async () => {
      setLoading(true)
      setStatusMessage('')

      try {
        const data =
          await loadTeachersCache()

        if (cancelled) {
          return
        }

        setTeachers(
          data.teachers,
        )

        setCourses(
          data.courses,
        )

        setStudents(
          data.students,
        )

        setAssignments(
          data.assignments,
        )

        setAttendanceStatuses(
          data.attendanceStatuses,
        )

        setAttendanceRecords(
          data.attendanceRecords,
        )

        setTeacherCourseSubjects(
          data.teacherCourseSubjects,
        )

        setCourseTeacherIds(
          data.courseTeacherIds,
        )

        setAllowTeacherTransfer(
          data.allowTeacherTransfer,
        )

        setAllowTeacherRemove(
          data.allowTeacherRemove,
        )
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
        } else {
          setStatusMessage(
            'حدث خطأ أثناء تحميل بيانات المعلمين.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }

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
    useMemo(() => {
      const existingGrades =
        new Set<string>()

      students.forEach(
        (student) => {
          const grade =
            String(
              student.levelName ??
                '',
            ).trim()

          if (
            grade &&
            grade !== '—'
          ) {
            existingGrades.add(
              grade,
            )
          }
        },
      )

      const orderedGrades =
        academicLevels
          .filter((level) =>
            existingGrades.has(
              level.name,
            ),
          )
          .sort(
            (a, b) =>
              Number(
                a.sort_order ?? 0,
              ) -
              Number(
                b.sort_order ?? 0,
              ),
          )
          .map(
            (level) =>
              level.name,
          )

      const remainingGrades =
        Array.from(
          existingGrades,
        ).filter(
          (grade) =>
            !orderedGrades.includes(
              grade,
            ),
        )

      return [
        ...orderedGrades,
        ...remainingGrades,
      ]
    }, [
      students,
      academicLevels,
    ])

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

    setPendingRemove(null)

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

    setPendingRemove(null)
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

      setStatusMessage('')

      setPendingRemove({
        assignment,
        student,
      })
    }

  const executeRemoveStudent =
    async (
      assignment: Assignment,
      student: Student,
      mode: RemoveMode,
    ) => {
      if (
        !canRemoveStudents
      ) {
        return
      }

      if (
        deletingAssignmentId
      ) {
        return
      }

      setDeletingAssignmentId(
        assignment.id,
      )

      setPendingRemove(null)

      if (
        mode ===
        'assignment_and_attendance'
      ) {
        setStatusMessage(
          'جاري مسح التعيين وسجل الحضور...',
        )
      } else {
        setStatusMessage(
          'جاري مسح التعيين...',
        )
      }

      /*
       * أولًا نحذف التعيين نفسه.
       * لا يتم حذف الطالب ولا enrollment.
       */
      const {
        error: assignmentError,
      } = await supabase
        .from(
          'teacher_student_assignments',
        )
        .delete()
        .eq(
          'id',
          assignment.id,
        )

      if (assignmentError) {
        setStatusMessage(
          `تعذر مسح التعيين: ${assignmentError.message}`,
        )

        setDeletingAssignmentId(
          null,
        )

        return
      }

      /*
       * في حالة اختيار:
       * "مسح التعيين وسجل الحضور"
       *
       * نحذف حضور الطالب في هذه الدورة فقط.
       * لا نستخدم enrollment_id ولا نحذف enrollment.
       */
      if (
        mode ===
        'assignment_and_attendance'
      ) {
        const {
          error: attendanceError,
        } = await supabase
          .from('attendance')
          .delete()
          .eq(
            'student_id',
            student.id,
          )
          .eq(
            'course_id',
            assignment.courseId,
          )

        if (attendanceError) {
          /*
           * التعيين تم حذفه بالفعل.
           * لذلك نحدث الواجهة بحيث لا يظهر الطالب
           * كمعين، لكن نوضح أن الحضور لم يُحذف.
           */
          setAssignments(
            (current) => {
              const next =
                current.filter(
                  (item) =>
                    item.id !==
                    assignment.id,
                )

              updateTeachersCache({
                assignments:
                  next,
              })

              return next
            },
          )

          setSelectedStudentIds(
            (current) =>
              current.filter(
                (id) =>
                  id !==
                  student.id,
              ),
          )

          setStatusMessage(
            `تم مسح التعيين، لكن تعذر مسح سجل حضور ${student.name}: ${attendanceError.message}`,
          )

          setDeletingAssignmentId(
            null,
          )

          return
        }

        /*
         * تحديث سجل الحضور الموجود في الكاش
         * حتى لا يظهر الحضور القديم مباشرة في الواجهة.
         */
        updateAttendanceRecords(
          (current) =>
            current.filter(
              (record) =>
                !(
                  record.studentId ===
                    student.id &&
                  record.courseId ===
                    assignment.courseId
                ),
            ),
        )
      }

      /*
       * تحديث قائمة التعيينات في الواجهة والكاش.
       */
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

      if (
        mode ===
        'assignment_and_attendance'
      ) {
        setStatusMessage(
          `تم مسح تعيين ${student.name} وسجل حضوره في الدورة الحالية بنجاح ✅`,
        )
      } else {
        setStatusMessage(
          `تم مسح تعيين ${student.name} بنجاح، وسجل الحضور محفوظ كما هو ✅`,
        )
      }
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
                                  ) &&
                                  Boolean(
                                    student.levelName &&
                                      student.levelName !==
                                        '—',
                                  ),
                              )
                              .map(
                                (
                                  student,
                                ) =>
                                  student.levelName,
                              ),
                          ),
                        ).sort(
                          (a, b) => {
                            const levelA =
                              academicLevels.find(
                                (
                                  level,
                                ) =>
                                  level.name ===
                                  a,
                              )

                            const levelB =
                              academicLevels.find(
                                (
                                  level,
                                ) =>
                                  level.name ===
                                  b,
                              )

                            if (
                              levelA &&
                              levelB
                            ) {
                              return (
                                Number(
                                  levelA.sort_order ??
                                    0,
                                ) -
                                Number(
                                  levelB.sort_order ??
                                    0,
                                )
                              )
                            }

                            if (
                              levelA
                            ) {
                              return -1
                            }

                            if (
                              levelB
                            ) {
                              return 1
                            }

                            return a.localeCompare(
                              b,
                              'ar',
                            )
                          },
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
        <TeachersViewTeacherPanel
          selectedTeacher={
            selectedTeacher
          }
          currentCourse={
            currentCourse
          }
          selectedTeacherSubjects={
            selectedTeacherSubjects
          }
          selectedTeacherSubjectNames={
            selectedTeacherSubjectNames
          }
          assignedStudents={
            assignedStudents
          }
          assignments={
            assignments
          }
          setAssignments={
            setAssignments
          }
          students={
            students
          }
          courses={
            courses
          }
          teacherCourseSubjects={
            teacherCourseSubjects
          }
          attendanceStatuses={
            attendanceStatuses
          }
          attendanceRecords={
            attendanceRecords
          }
          updateAttendanceRecords={
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
          activePanel={
            activePanel
          }
          setActivePanel={
            setActivePanel
          }
          selectedGrade={
            selectedGrade
          }
          setSelectedGrade={
            setSelectedGrade
          }
          availableGrades={
            availableGrades
          }
          availableStudents={
            availableStudents
          }
          unavailableStudents={
            unavailableStudents
          }
          selectedStudentIds={
            selectedStudentIds
          }
          toggleStudent={
            toggleStudent
          }
          saving={
            saving
          }
          openAddStudents={
            openAddStudents
          }
          saveStudents={
            saveStudents
          }
          canTransferStudents={
            canTransferStudents
          }
          canRemoveStudents={
            canRemoveStudents
          }
          openTransfer={
            openTransfer
          }
          removeStudentFromTeacher={
            removeStudentFromTeacher
          }
          deletingAssignmentId={
            deletingAssignmentId
          }
          closeTeacher={
            closeTeacher
          }
          courseTeacherIds={
            courseTeacherIds
          }
          selectedPreviousCourseId={
            selectedPreviousCourseId
          }
          setSelectedPreviousCourseId={
            setSelectedPreviousCourseId
          }
          isTransferOpen={
            isTransferOpen
          }
          setIsTransferOpen={
            setIsTransferOpen
          }
          transferStudentId={
            transferStudentId
          }
          setTransferStudentId={
            setTransferStudentId
          }
          transferTeacherId={
            transferTeacherId
          }
          setTransferTeacherId={
            setTransferTeacherId
          }
          transferTeachers={
            transferTeachers
          }
          selectedTransferTeacher={
            selectedTransferTeacher
          }
          saveTransfer={
            saveTransfer
          }
        />
      )}

      {pendingRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="w-full max-w-md rounded-xl border bg-background p-6 shadow-xl"
            dir="rtl"
          >
            <div>
              <h3 className="text-lg font-semibold">
                مسح تعيين الطالب
              </h3>

              <p className="mt-2 text-sm text-muted-foreground">
                الطالب:{' '}
                <span className="font-medium text-foreground">
                  {pendingRemove.student.name}
                </span>
              </p>

              <p className="mt-3 text-sm text-muted-foreground">
                اختر الإجراء الذي تريد تنفيذه:
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                disabled={
                  deletingAssignmentId !==
                  null
                }
                onClick={() => {
                  const pending =
                    pendingRemove

                  void executeRemoveStudent(
                    pending.assignment,
                    pending.student,
                    'assignment_only',
                  )
                }}
                className="w-full rounded-lg border px-4 py-3 text-right transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="font-medium">
                  مسح التعيين فقط
                </div>

                <div className="mt-1 text-xs leading-5 text-muted-foreground">
                  يتم إلغاء تعيين الطالب من المعلم
                  والمادة، مع الاحتفاظ بسجل الحضور
                  كما هو.
                </div>
              </button>

              <button
                type="button"
                disabled={
                  deletingAssignmentId !==
                  null
                }
                onClick={() => {
                  const pending =
                    pendingRemove

                  void executeRemoveStudent(
                    pending.assignment,
                    pending.student,
                    'assignment_and_attendance',
                  )
                }}
                className="w-full rounded-lg border border-destructive/30 px-4 py-3 text-right text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="font-medium">
                  مسح التعيين وسجل الحضور
                </div>

                <div className="mt-1 text-xs leading-5 text-muted-foreground">
                  يتم إلغاء تعيين الطالب وحذف جميع
                  سجلات حضوره في الدورة الحالية فقط.
                </div>
              </button>

              <button
                type="button"
                disabled={
                  deletingAssignmentId !==
                  null
                }
                onClick={() =>
                  setPendingRemove(null)
                }
                className="w-full rounded-lg bg-muted px-4 py-3 text-center text-sm font-medium transition-colors hover:bg-muted/80 disabled:cursor-not-allowed disabled:opacity-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
