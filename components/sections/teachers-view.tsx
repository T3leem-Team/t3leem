'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeftRight,
  Plus,
  Search,
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
  normalizeStatusName,
} from '@/components/sections/attendance-view'

type Teacher = {
  id: string
  name: string
  isActive: boolean
}

type Assignment = {
  id: string
  courseId: string
  teacherId: string
  studentId: string
}

export function TeachersView() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [attendanceStatuses, setAttendanceStatuses] = useState<
    AttendanceStatus[]
  >([])
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [search, setSearch] = useState('')

  const [selectedTeacherId, setSelectedTeacherId] =
    useState<string | null>(null)

  const [activePanel, setActivePanel] = useState<
    'students' | 'addStudents' | 'attendance'
  >('students')

  const [selectedGrade, setSelectedGrade] = useState('')
  const [selectedStudentIds, setSelectedStudentIds] =
    useState<string[]>([])

  const [isTransferOpen, setIsTransferOpen] =
    useState(false)

  const [transferStudentId, setTransferStudentId] =
    useState<string | null>(null)

  const [transferTeacherId, setTransferTeacherId] =
    useState('')

  const [selectedAttendanceDate, setSelectedAttendanceDate] =
    useState<string | null>(null)

  const [attendanceNotes, setAttendanceNotes] =
    useState<AttendanceNotes>({})

  const [courseTeacherIds, setCourseTeacherIds] =
    useState<Record<string, string[]>>({})

  const loadData = async () => {
    setLoading(true)
    setStatusMessage('')

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
      setLoading(false)
      return
    }

    if (!academicYear) {
      setStatusMessage(
        'لا توجد سنة دراسية حالية مفعلة.',
      )
      setLoading(false)
      return
    }

    const {
      data: courseRows,
      error: coursesError,
    } = await supabase
      .from('courses')
      .select(
        'id, name, start_date, end_date, days, created_at',
      )
      .eq('academic_year_id', academicYear.id)
      .order('created_at', {
        ascending: true,
      })

    if (coursesError) {
      setStatusMessage(
        `خطأ في تحميل الدورات: ${coursesError.message}`,
      )
      setLoading(false)
      return
    }

    const mappedCourses: Course[] = (
      courseRows ?? []
    ).map((course) => ({
      id: course.id,
      name: course.name,
      startDate: course.start_date ?? '',
      endDate: course.end_date ?? '',
      days: Array.isArray(course.days)
        ? course.days
        : [],
    }))

    setCourses(mappedCourses)

    const courseIds = mappedCourses.map(
      (course) => course.id,
    )

    let courseTeacherRows: {
      id: string
      course_id: string
      teacher_id: string
    }[] = []

    if (courseIds.length > 0) {
      const { data, error } = await supabase
        .from('course_teachers')
        .select(
          'id, course_id, teacher_id',
        )
        .in('course_id', courseIds)

      if (error) {
        setStatusMessage(
          `خطأ في تحميل ارتباط المعلمين بالدورات: ${error.message}`,
        )
        setLoading(false)
        return
      }

      courseTeacherRows = data ?? []
    }

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
      const { data, error } = await supabase
        .from('teachers')
        .select(
          'id, name, is_active',
        )
        .in('id', teacherIds)
        .eq('is_active', true)
        .order('name', {
          ascending: true,
        })

      if (error) {
        setStatusMessage(
          `خطأ في تحميل المعلمين: ${error.message}`,
        )
        setLoading(false)
        return
      }

      teacherRows = data ?? []
    }

    const mappedTeachers: Teacher[] =
      teacherRows
        .map((teacher) => ({
          id: teacher.id,
          name: teacher.name,
          isActive: Boolean(
            teacher.is_active,
          ),
        }))
        .sort((a, b) =>
          a.name.localeCompare(b.name, 'ar'),
        )

    setTeachers(mappedTeachers)

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
      setLoading(false)
      return
    }

    const studentIds = Array.from(
      new Set(
        (enrollmentRows ?? []).map(
          (row) => row.student_id,
        ),
      ),
    )

    let studentRows: {
      id: string
      student_id: string | null
      name: string
      personal_id: string | null
      phone: string | null
      status: string
    }[] = []

    if (studentIds.length > 0) {
      const { data, error } = await supabase
        .from('students')
        .select(
          'id, student_id, name, personal_id, phone, status',
        )
        .in('id', studentIds)

      if (error) {
        setStatusMessage(
          `خطأ في تحميل الطلاب: ${error.message}`,
        )
        setLoading(false)
        return
      }

      studentRows = data ?? []
    }

    const studentMap = new Map(
      studentRows.map((student) => [
        student.id,
        student,
      ]),
    )

    const mappedStudents: Student[] = (
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
          studentId:
            student.student_id ?? '',
          name: student.name,
          personalId:
            student.personal_id ?? '',
          phone: student.phone ?? '',
          levelId: enrollment.level_id,
          levelName:
            levelData?.name ?? '—',
          enrollmentId: enrollment.id,
        }
      })
      .filter(
        (
          student,
        ): student is Student =>
          student !== null,
      )

    setStudents(mappedStudents)

    let assignmentRows: Assignment[] = []

    if (courseIds.length > 0) {
      const { data, error } = await supabase
        .from(
          'teacher_student_assignments',
        )
        .select(
          'id, course_id, teacher_id, student_id',
        )
        .in('course_id', courseIds)

      if (error) {
        setStatusMessage(
          `خطأ في تحميل توزيع الطلاب: ${error.message}`,
        )
        setLoading(false)
        return
      }

      assignmentRows = (
        data ?? []
      ).map((row) => ({
        id: row.id,
        courseId: row.course_id,
        teacherId: row.teacher_id,
        studentId: row.student_id,
      }))
    }

    setAssignments(assignmentRows)

    const teacherMap: Record<
      string,
      string[]
    > = {}

    for (const row of courseTeacherRows) {
      teacherMap[row.course_id] ??= []
      teacherMap[row.course_id].push(
        row.teacher_id,
      )
    }

    setCourseTeacherIds(teacherMap)
    const {
  data: {
    user,
  },
} = await supabase.auth.getUser()

if (!user) {
  setStatusMessage(
    'خطأ: لا يوجد مستخدم مسجل دخول في Supabase Auth.',
  )
  setLoading(false)
  return
}

const {
  data: statusRows,
  error: statusError,
} = await supabase
  .from('attendance_statuses')
  .select(
    'id, name, is_active, sort_order',
  )
  .order('sort_order', {
    ascending: true,
  })

if (statusError) {
  setStatusMessage(
    `خطأ في تحميل حالات الحضور: ${statusError.message}`,
  )
  setLoading(false)
  return
}

const mappedStatuses: AttendanceStatus[] = (
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
    isActive: Boolean(
      status.is_active,
    ),
    sortOrder:
      status.sort_order ?? 0,
  }))

setAttendanceStatuses(
  mappedStatuses,
)

if (mappedStatuses.length === 0) {
  setStatusMessage(
    `تم تسجيل الدخول، لكن Supabase لم يرجع حالات الحضور. عدد السجلات: ${
      statusRows?.length ?? 0
    }`,
  )
}
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
      const { data, error } =
        await supabase
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
        setLoading(false)
        return
      }

      attendanceRows = data ?? []
    }

    setAttendanceRecords(
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
      ),
    )

    setLoading(false)
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const filteredTeachers = useMemo(() => {
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
        students.map(
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
    setActivePanel('students')
    setSelectedGrade('')
    setSelectedStudentIds([])
    setIsTransferOpen(false)
    setTransferStudentId(null)
    setTransferTeacherId('')
    setSelectedAttendanceDate(null)
  }

  const closeTeacher = () => {
    setSelectedTeacherId(null)
    setActivePanel('students')
    setSelectedGrade('')
    setSelectedStudentIds([])
    setIsTransferOpen(false)
    setTransferStudentId(null)
    setTransferTeacherId('')
    setSelectedAttendanceDate(null)
  }

  const openAddStudents = () => {
    setSelectedGrade('')
    setSelectedStudentIds([])
    setActivePanel('addStudents')
  }

  const toggleStudent = (
    studentId: string,
  ) => {
    setSelectedStudentIds(
      (current) =>
        current.includes(studentId)
          ? current.filter(
              (id) => id !== studentId,
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
      selectedStudentIds.length === 0
    ) {
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
        'id, course_id, teacher_id, student_id',
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
      studentsToInsert.length === 0
    ) {
      setSelectedStudentIds([])
      setSelectedGrade('')
      setActivePanel('students')
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
        }),
      )

    const { data, error } =
      await supabase
        .from(
          'teacher_student_assignments',
        )
        .insert(rows)
        .select(
          'id, course_id, teacher_id, student_id',
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
      }))

    setAssignments(
      (current) => [
        ...current,
        ...newAssignments,
      ],
    )

    setSelectedStudentIds([])
    setSelectedGrade('')
    setActivePanel('students')
    setStatusMessage(
      'تمت إضافة الطلاب بنجاح ✅',
    )
    setSaving(false)
  }

  const openTransfer = (
    studentId: string,
  ) => {
    setTransferStudentId(
      studentId,
    )
    setTransferTeacherId('')
    setIsTransferOpen(true)
  }

  const saveTransfer = async () => {
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
      return
    }

    setSaving(true)
    setStatusMessage(
      'جاري نقل الطالب...',
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
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        'id',
        assignment.id,
      )
      .select(
        'id, course_id, teacher_id, student_id',
      )
      .single()

    if (error) {
      setStatusMessage(
        `تعذر نقل الطالب: ${error.message}`,
      )
      setSaving(false)
      return
    }

    setAssignments(
      (current) =>
        current.map((item) =>
          item.id ===
          assignment.id
            ? {
                id: data.id,
                courseId:
                  data.course_id,
                teacherId:
                  data.teacher_id,
                studentId:
                  data.student_id,
              }
            : item,
        ),
    )

    setTransferStudentId(null)
    setTransferTeacherId('')
    setIsTransferOpen(false)
    setStatusMessage(
      'تم نقل الطالب بنجاح ✅',
    )
    setSaving(false)
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
                {currentCourse?.name ?? '—'}
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
                            (assignment) =>
                              assignment.courseId ===
                                currentCourse?.id &&
                              assignment.teacherId ===
                                teacher.id,
                          )
                          .map(
                            (assignment) =>
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

                <p className="text-sm text-muted-foreground">
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
              <div className="flex gap-2">
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

                            <th className="px-4 py-3 text-right font-medium">
                              إجراء
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {assignedStudents.map(
                            (
                              student,
                            ) => (
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

                                <td className="px-4 py-3">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      openTransfer(
                                        student.id,
                                      )
                                    }
                                  >
                                    <ArrowLeftRight className="size-4" />
                                    نقل
                                  </Button>
                                </td>
                              </tr>
                            ),
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
                          0
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
                    setAttendanceRecords
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
            </div>
          </div>
        </div>
      )}

      {isTransferOpen &&
        transferStudentId &&
        selectedTeacher &&
        currentCourse && (
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
                    onClick={() =>
                      setIsTransferOpen(
                        false,
                      )
                    }
                  >
                    <X className="size-4" />
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground">
                  سيتم نقل الطالب من{' '}
                  <span className="font-medium text-foreground">
                    {
                      selectedTeacher.name
                    }
                  </span>{' '}
                  إلى المعلم الجديد.
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
                    ) =>
                      setTransferTeacherId(
                        event.target
                          .value,
                      )
                    }
                    className="h-11 w-full rounded-md border bg-background px-3 text-sm outline-none"
                  >
                    <option value="">
                      اختر المعلم
                    </option>

                    {operationalTeachers
                      .filter(
                        (
                          teacher,
                        ) =>
                          teacher.id !==
                          selectedTeacher.id,
                      )
                      .map(
                        (
                          teacher,
                        ) => (
                          <option
                            key={
                              teacher.id
                            }
                            value={
                              teacher.id
                            }
                          >
                            {
                              teacher.name
                            }
                          </option>
                        ),
                      )}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setIsTransferOpen(
                        false,
                      )
                    }
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
                      !transferTeacherId
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
