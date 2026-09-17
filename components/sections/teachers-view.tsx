'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeftRight,
  Check,
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

type Teacher = {
  id: string
  name: string
  isActive: boolean
}

type Course = {
  id: string
  name: string
  startDate: string
  endDate: string
  days: string[]
}

type Student = {
  id: string
  studentId: string
  name: string
  personalId: string
  phone: string
  levelId: string
  levelName: string
  enrollmentId: string
}

type Assignment = {
  id: string
  courseId: string
  teacherId: string
  studentId: string
}

type AttendanceStatus = {
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

type AttendanceStatusName =
  | 'حاضر'
  | 'غائب'
  | 'متأخر'
  | 'مستأذن'

type AttendanceNotes = Record<string, string>

const attendanceStatusNames: AttendanceStatusName[] = [
  'حاضر',
  'غائب',
  'متأخر',
  'مستأذن',
]

const formatDateForDisplay = (date: string) => {
  const parsed = new Date(`${date}T00:00:00`)

  if (Number.isNaN(parsed.getTime())) {
    return date
  }

  return new Intl.DateTimeFormat('ar-BH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsed)
}

const formatShortDate = (date: string) => {
  const parsed = new Date(`${date}T00:00:00`)

  if (Number.isNaN(parsed.getTime())) {
    return date
  }

  return new Intl.DateTimeFormat('ar-BH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed)
}

const todayString = () => {
  const now = new Date()

  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const isDateWithinCourse = (
  date: string,
  course: Course,
) => {
  if (!course.startDate || !course.endDate) {
    return true
  }

  return (
    date >= course.startDate &&
    date <= course.endDate
  )
}

const getStatusIdByName = (
  statuses: AttendanceStatus[],
  name: AttendanceStatusName,
) =>
  statuses.find((status) => status.name === name)?.id ??
  null

const getStatusName = (
  statuses: AttendanceStatus[],
  statusId: string | null,
): AttendanceStatusName | 'لم يسجل' => {
  if (!statusId) {
    return 'لم يسجل'
  }

  const status = statuses.find(
    (item) => item.id === statusId,
  )

  if (
    status?.name === 'حاضر' ||
    status?.name === 'غائب' ||
    status?.name === 'متأخر' ||
    status?.name === 'مستأذن'
  ) {
    return status.name
  }

  return 'لم يسجل'
}

export function TeachersView() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [assignments, setAssignments] = useState<
    Assignment[]
  >([])
  const [attendanceStatuses, setAttendanceStatuses] =
    useState<AttendanceStatus[]>([])
  const [attendanceRecords, setAttendanceRecords] =
    useState<AttendanceRecord[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  const [search, setSearch] = useState('')
  const [selectedCourseId, setSelectedCourseId] =
    useState<string | null>(null)

  const [selectedTeacherId, setSelectedTeacherId] =
    useState<string | null>(null)

  const [activePanel, setActivePanel] = useState<
    'students' | 'addStudents' | 'attendance'
  >('students')

  const [selectedGrade, setSelectedGrade] =
    useState('')

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

  /*
   * تحميل كل بيانات الصفحة من Supabase.
   */
  const loadData = async () => {
    setLoading(true)
    setStatusMessage('')

    /*
     * السنة الدراسية الحالية.
     */
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

    /*
     * الدورات التابعة للسنة الحالية.
     */
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

    /*
     * المعلمون المرتبطون بالدورات الحالية.
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

    /*
     * بيانات المعلمين.
     *
     * نعرض فقط المعلمين النشطين في التشغيل.
     */
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
          a.name.localeCompare(
            b.name,
            'ar',
          ),
        )

    setTeachers(mappedTeachers)

    /*
     * الطلاب المسجلون في السنة الحالية
     * مع المستوى الأكاديمي.
     */
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
      const {
        data,
        error,
      } = await supabase
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
        const student =
          studentMap.get(
            enrollment.student_id,
          )

        if (!student) {
          return null
        }

        const levelData =
          Array.isArray(enrollment.levels)
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
        (student): student is Student =>
          student !== null,
      )

    setStudents(mappedStudents)

    /*
     * توزيع الطلاب على المعلمين.
     */
    let assignmentRows: Assignment[] = []

    if (courseIds.length > 0) {
      const {
        data,
        error,
      } = await supabase
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
      ) as Assignment[]
    }

    setAssignments(assignmentRows)

    /*
     * حالات الحضور.
     */
    const {
      data: statusRows,
      error: statusesError,
    } = await supabase
      .from('attendance_statuses')
      .select(
        'id, name, is_active, sort_order',
      )
      .eq('is_active', true)
      .order('sort_order', {
        ascending: true,
      })

    if (statusesError) {
      setStatusMessage(
        `خطأ في تحميل حالات الحضور: ${statusesError.message}`,
      )
      setLoading(false)
      return
    }

    setAttendanceStatuses(
      (statusRows ?? []).map(
        (status) => ({
          id: status.id,
          name: status.name,
          isActive: Boolean(
            status.is_active,
          ),
          sortOrder:
            status.sort_order ?? 0,
        }),
      ),
    )

    /*
     * سجل الحضور للدورات الحالية.
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
        setLoading(false)
        return
      }

      attendanceRows =
        data ?? []
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

    /*
     * اختيار أول دورة محفوظة.
     */
    if (
      mappedCourses.length > 0 &&
      !selectedCourseId
    ) {
      setSelectedCourseId(
        mappedCourses[0].id,
      )
    }

    setLoading(false)
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const currentCourse =
    courses.find(
      (course) =>
        course.id ===
        selectedCourseId,
    ) ??
    courses[0] ??
    null

  const currentCourseTeacherIds =
    currentCourse
      ? new Set(
          assignments
            .filter(
              (assignment) =>
                assignment.courseId ===
                currentCourse.id,
            )
            .map(
              (assignment) =>
                assignment.teacherId,
            ),
        )
      : new Set<string>()

  const currentCourseTeachers =
    teachers.filter((teacher) => {
      if (!currentCourse) {
        return false
      }

      return (
        currentCourseTeacherIds.has(
          teacher.id,
        ) ||
        /*
         * teacherIds من course_teachers
         * يتم تحميلها ضمن القائمة.
         */
        false
      )
    })

  /*
   * ملاحظة:
   * assignments لا تحتوي بالضرورة على كل
   * المعلمين المرتبطين بالدورة، لذلك نحتاج
   * بيانات course_teachers من جديد لهذا الجزء.
   *
   * نحافظ على قائمة IDs في state بشكل مستقل.
   */
  const [courseTeacherIds, setCourseTeacherIds] =
    useState<
      Record<string, string[]>
    >({})

  useEffect(() => {
    const loadCourseTeachers = async () => {
      if (courses.length === 0) {
        setCourseTeacherIds({})
        return
      }

      const ids = courses.map(
        (course) => course.id,
      )

      const {
        data,
        error,
      } = await supabase
        .from('course_teachers')
        .select(
          'course_id, teacher_id',
        )
        .in('course_id', ids)

      if (error) {
        setStatusMessage(
          `خطأ في تحميل معلمي الدورات: ${error.message}`,
        )
        return
      }

      const next: Record<
        string,
        string[]
      > = {}

      for (const row of data ?? []) {
        if (!next[row.course_id]) {
          next[row.course_id] = []
        }

        next[row.course_id].push(
          row.teacher_id,
        )
      }

      setCourseTeacherIds(next)
    }

    loadCourseTeachers()
  }, [courses])

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
      const query =
        search.trim().toLowerCase()

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

  const selectedGradeNames =
    Array.from(
      new Set(
        assignedStudents.map(
          (student) =>
            student.levelName,
        ),
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
      a.localeCompare(
        b,
        'ar',
      ),
    )

  /*
   * الطلاب المتاحون للإضافة:
   *
   * - من الطلاب المسجلين في السنة الحالية.
   * - المستوى المختار.
   * - الطالب غير مسند إلى معلم آخر
   *   في نفس الدورة.
   */
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

  /*
   * الطلاب المسندون إلى معلم آخر.
   *
   * نعرضهم في قائمة الإضافة ولكنهم معطلون
   * مع اسم المعلم الحالي.
   */
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
              (id) =>
                id !== studentId,
            )
          : [
              ...current,
              studentId,
            ],
    )
  }

  /*
   * إضافة الطلاب إلى المعلم.
   *
   * unique(course_id, student_id)
   * يمنع ازدواجية الطالب داخل الدورة.
   */
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
      'جاري إضافة الطلاب...',
    )

    const rows =
      selectedStudentIds.map(
        (studentId) => ({
          course_id:
            currentCourse.id,
          teacher_id:
            selectedTeacherId,
          student_id:
            studentId,
        }),
      )

    const {
      data,
      error,
    } = await supabase
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

    setAssignments(
      (current) => [
        ...current,
        ...((data ??
          []) as Assignment[]),
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

  /*
   * نقل الطالب:
   * نحدث teacher_id في نفس سجل التوزيع.
   */
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
      .eq('id', assignment.id)
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
        current.map(
          (item) =>
            item.id ===
            assignment.id
              ? (data as Assignment)
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

  /*
   * تاريخ الحضور الحالي.
   *
   * نستخدم تاريخ اليوم إذا كان داخل
   * نطاق الدورة.
   */
  const currentAttendanceDate =
    currentCourse &&
    isDateWithinCourse(
      todayString(),
      currentCourse,
    )
      ? todayString()
      : null

  const displayedAttendanceDate =
    selectedAttendanceDate ??
    currentAttendanceDate

  /*
   * سجلات الحضور لليوم المعروض.
   */
  const displayedAttendanceRecords =
    displayedAttendanceDate &&
    currentCourse
      ? attendanceRecords.filter(
          (record) =>
            record.courseId ===
              currentCourse.id &&
            record.attendanceDate ===
              displayedAttendanceDate,
        )
      : []

  const getStudentAttendanceRecord =
    (
      studentId: string,
      date: string | null,
    ) => {
      if (!date || !currentCourse) {
        return null
      }

      return (
        attendanceRecords.find(
          (record) =>
            record.courseId ===
              currentCourse.id &&
            record.studentId ===
              studentId &&
            record.attendanceDate ===
              date,
        ) ?? null
      )
    }

  const getSessionStatus = (
    studentId: string,
    date: string | null,
  ) => {
    const record =
      getStudentAttendanceRecord(
        studentId,
        date,
      )

    return getStatusName(
      attendanceStatuses,
      record?.statusId ?? null,
    )
  }

  const updateAttendance = async (
    studentId: string,
    statusName: AttendanceStatusName,
    date?: string,
  ) => {
    if (
      !currentCourse ||
      !date
    ) {
      return
    }

    const statusId =
      getStatusIdByName(
        attendanceStatuses,
        statusName,
      )

    if (!statusId) {
      setStatusMessage(
        `حالة الحضور "${statusName}" غير موجودة.`,
      )
      return
    }

    const student =
      students.find(
        (item) =>
          item.id === studentId,
      )

    if (!student) {
      return
    }

    setSaving(true)
    setStatusMessage(
      'جاري حفظ الحضور...',
    )

    const existing =
      getStudentAttendanceRecord(
        studentId,
        date,
      )

    if (existing) {
      const {
        data,
        error,
      } = await supabase
        .from('attendance')
        .update({
          status_id:
            statusId,
          enrollment_id:
            student.enrollmentId,
          note:
            existing.note || null,
        })
        .eq(
          'id',
          existing.id,
        )
        .select(
          'id, student_id, enrollment_id, attendance_date, status_id, note, course_id',
        )
        .single()

      if (error) {
        setStatusMessage(
          `تعذر حفظ الحضور: ${error.message}`,
        )
        setSaving(false)
        return
      }

      const mapped: AttendanceRecord =
        {
          id: data.id,
          studentId:
            data.student_id,
          enrollmentId:
            data.enrollment_id,
          courseId:
            data.course_id,
          attendanceDate:
            data.attendance_date,
          statusId:
            data.status_id,
          note:
            data.note ?? '',
        }

      setAttendanceRecords(
        (current) =>
          current.map(
            (record) =>
              record.id ===
              existing.id
                ? mapped
                : record,
          ),
      )
    } else {
      const {
        data,
        error,
      } = await supabase
        .from('attendance')
        .insert({
          student_id:
            studentId,
          enrollment_id:
            student.enrollmentId,
          attendance_date:
            date,
          status_id:
            statusId,
          note: null,
          course_id:
            currentCourse.id,
        })
        .select(
          'id, student_id, enrollment_id, attendance_date, status_id, note, course_id',
        )
        .single()

      if (error) {
        setStatusMessage(
          `تعذر حفظ الحضور: ${error.message}`,
        )
        setSaving(false)
        return
      }

      const mapped: AttendanceRecord =
        {
          id: data.id,
          studentId:
            data.student_id,
          enrollmentId:
            data.enrollment_id,
          courseId:
            data.course_id,
          attendanceDate:
            data.attendance_date,
          statusId:
            data.status_id,
          attendanceDate:
            data.attendance_date,
          note:
            data.note ?? '',
        }

      setAttendanceRecords(
        (current) => [
          ...current,
          mapped,
        ],
      )
    }

    setStatusMessage(
      'تم حفظ الحضور ✅',
    )
    setSaving(false)
  }

  /*
   * حفظ ملاحظة الحضور.
   */
  const updateAttendanceNote =
    async (
      studentId: string,
      value: string,
      date?: string,
    ) => {
      if (
        !currentCourse ||
        !date
      ) {
        return
      }

      const existing =
        getStudentAttendanceRecord(
          studentId,
          date,
        )

      if (!existing) {
        /*
         * إذا لم يسجل المعلم حالة بعد،
         * نخزن الملاحظة محليًا مؤقتًا.
         * عند تسجيل الحالة تُحفظ معها.
         */
        const key = `${date}:${studentId}`

        setAttendanceNotes(
          (current) => ({
            ...current,
            [key]: value,
          }),
        )

        return
      }

      const {
        data,
        error,
      } = await supabase
        .from('attendance')
        .update({
          note: value || null,
        })
        .eq(
          'id',
          existing.id,
        )
        .select(
          'id, student_id, enrollment_id, attendance_date, status_id, note, course_id',
        )
        .single()

      if (error) {
        setStatusMessage(
          `تعذر حفظ الملاحظة: ${error.message}`,
        )
        return
      }

      const mapped: AttendanceRecord =
        {
          id: data.id,
          studentId:
            data.student_id,
          enrollmentId:
            data.enrollment_id,
          courseId:
            data.course_id,
          attendanceDate:
            data.attendance_date,
          statusId:
            data.status_id,
          note:
            data.note ?? '',
        }

      setAttendanceRecords(
        (current) =>
          current.map(
            (record) =>
              record.id ===
              existing.id
                ? mapped
                : record,
          ),
      )
    }

  /*
   * حفظ الملاحظة المحلية مع أول تسجيل للحالة.
   */
  const getPendingNote = (
    studentId: string,
    date: string | null,
  ) => {
    if (!date) {
      return ''
    }

    return (
      attendanceNotes[
        `${date}:${studentId}`
      ] ?? ''
    )
  }

  const getAttendanceStats = (
    studentId: string,
    courseId: string,
  ) => {
    const course =
      courses.find(
        (item) =>
          item.id === courseId,
      )

    if (!course) {
      return {
        present: 0,
        total: 0,
        percentage: 0,
      }
    }

    const dates = Array.from(
      new Set(
        attendanceRecords
          .filter(
            (record) =>
              record.courseId ===
                courseId &&
              record.studentId ===
                studentId &&
              isDateWithinCourse(
                record.attendanceDate,
                course,
              ),
          )
          .map(
            (record) =>
              record.attendanceDate,
          ),
      ),
    )

    const records =
      attendanceRecords.filter(
        (record) =>
          record.courseId ===
            courseId &&
          record.studentId ===
            studentId &&
          dates.includes(
            record.attendanceDate,
          ),
      )

    const present =
      records.filter(
        (record) => {
          const status =
            getStatusName(
              attendanceStatuses,
              record.statusId,
            )

          return (
            status === 'حاضر' ||
            status === 'متأخر' ||
            status === 'مستأذن'
          )
        },
      ).length

    const total =
      dates.length

    return {
      present,
      total,
      percentage:
        total > 0
          ? (present / total) *
            100
          : 0,
    }
  }

  /*
   * تواريخ الحضور السابقة.
   */
  const attendanceArchive =
    currentCourse
      ? Array.from(
          new Set(
            attendanceRecords
              .filter(
                (record) =>
                  record.courseId ===
                  currentCourse.id,
              )
              .map(
                (record) =>
                  record.attendanceDate,
              ),
          ),
        )
          .filter(
            (date) =>
              date !==
              currentAttendanceDate,
          )
          .sort((a, b) =>
            b.localeCompare(a),
          )
      : []

  const openAttendanceArchive = (
    date: string,
  ) => {
    if (
      !currentCourse ||
      !isDateWithinCourse(
        date,
        currentCourse,
      )
    ) {
      return
    }

    setSelectedAttendanceDate(
      date,
    )
  }

  const closeAttendanceArchive = () => {
    setSelectedAttendanceDate(
      null,
    )
  }

  const getAttendanceClass = (
    currentStatus:
      | AttendanceStatusName
      | 'لم يسجل',
    buttonStatus:
      AttendanceStatusName,
  ) => {
    if (
      currentStatus !==
      buttonStatus
    ) {
      return 'border-border bg-background text-muted-foreground'
    }

    if (
      buttonStatus ===
      'حاضر'
    ) {
      return 'border-green-500 bg-green-50 text-green-700'
    }

    if (
      buttonStatus ===
      'غائب'
    ) {
      return 'border-red-500 bg-red-50 text-red-700'
    }

    if (
      buttonStatus ===
      'متأخر'
    ) {
      return 'border-amber-500 bg-amber-50 text-amber-700'
    }

    if (
      buttonStatus ===
      'مستأذن'
    ) {
      return 'border-blue-500 bg-blue-50 text-blue-700'
    }

    return 'border-border bg-background'
  }

  const formatPercentage = (
    value: number,
  ) =>
    `${value.toFixed(1)}%`

  /*
   * حفظ الحالة + الملاحظة إذا كانت الملاحظة
   * موجودة قبل تسجيل الحالة.
   */
  const handleAttendanceClick =
    async (
      studentId: string,
      statusName: AttendanceStatusName,
      date: string,
    ) => {
      const pendingNote =
        getPendingNote(
          studentId,
          date,
        )

      const existing =
        getStudentAttendanceRecord(
          studentId,
          date,
        )

      await updateAttendance(
        studentId,
        statusName,
        date,
      )

      if (
        pendingNote &&
        !existing
      ) {
        /*
         * نحتاج انتظار state المحلي لاستخدام
         * سجل الحضور الجديد، لذلك نعيد القراءة
         * من قاعدة البيانات بعد الحفظ.
         */
        const {
          data,
          error,
        } = await supabase
          .from('attendance')
          .select(
            'id, student_id, enrollment_id, attendance_date, status_id, note, course_id',
          )
          .eq(
            'course_id',
            currentCourse?.id ?? '',
          )
          .eq(
            'student_id',
            studentId,
          )
          .eq(
            'attendance_date',
            date,
          )
          .maybeSingle()

        if (
          !error &&
          data
        ) {
          const {
            data: updatedData,
            error:
              updateError,
          } = await supabase
            .from('attendance')
            .update({
              note:
                pendingNote ||
                null,
            })
            .eq(
              'id',
              data.id,
            )
            .select(
              'id, student_id, enrollment_id, attendance_date, status_id, note, course_id',
            )
            .single()

          if (
            !updateError &&
            updatedData
          ) {
            const mapped: AttendanceRecord =
              {
                id:
                  updatedData.id,
                studentId:
                  updatedData.student_id,
                enrollmentId:
                  updatedData.enrollment_id,
                courseId:
                  updatedData.course_id,
                attendanceDate:
                  updatedData.attendance_date,
                statusId:
                  updatedData.status_id,
                note:
                  updatedData.note ??
                  '',
              }

            setAttendanceRecords(
              (current) => [
                ...current.filter(
                  (record) =>
                    record.id !==
                    mapped.id,
                ),
                mapped,
              ],
            )
          }
        }

        setAttendanceNotes(
          (current) => {
            const next = {
              ...current,
            }

            delete next[
              `${date}:${studentId}`
            ]

            return next
          },
        )
      }
    }

  /*
   * إذا كانت الصفحة لا تحتوي على سنة أو دورة.
   */
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

      {/* اختيار الدورة */}
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

            {courses.length > 1 && (
              <select
                value={
                  currentCourse?.id ??
                  ''
                }
                onChange={(event) => {
                  setSelectedCourseId(
                    event.target.value,
                  )
                  setSelectedTeacherId(
                    null,
                  )
                  setActivePanel(
                    'students',
                  )
                  setSelectedAttendanceDate(
                    null,
                  )
                }}
                className="h-10 min-w-[220px] rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              >
                {courses.map(
                  (course) => (
                    <option
                      key={course.id}
                      value={course.id}
                    >
                      {course.name}
                    </option>
                  ),
                )}
              </select>
            )}
          </div>

          {currentCourse && (
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-muted px-3 py-1.5">
                {currentCourse.startDate
                  ? formatShortDate(
                      currentCourse.startDate,
                    )
                  : '—'}{' '}
                —{' '}
                {currentCourse.endDate
                  ? formatShortDate(
                      currentCourse.endDate,
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

      {/* قائمة المعلمين */}
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
                                (student) =>
                                  teacherStudentIds.includes(
                                    student.id,
                                  ),
                              )
                              .map(
                                (student) =>
                                  student.levelName,
                              ),
                          ),
                        )

                      return (
                        <tr
                          key={teacher.id}
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
                              {teacher.name}
                            </button>
                          </td>

                          <td className="px-4 py-4">
                            {teacherGrades.length >
                            0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {teacherGrades.map(
                                  (grade) => (
                                    <span
                                      key={
                                        grade
                                      }
                                      className="rounded-full bg-muted px-2.5 py-1 text-xs"
                                    >
                                      {grade}
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

      {/* صفحة المعلم */}
      {selectedTeacher && (
        <div className="fixed inset-0 z-50 bg-background">
          <div className="mx-auto flex h-full max-w-6xl flex-col">
            <div className="flex items-center justify-between border-b px-4 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-semibold">
                  {selectedTeacher.name}
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

            {/* الدورة */}
            <div className="border-b bg-muted/20 px-4 py-4 sm:px-6">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    الدورة الحالية
                  </p>

                  <p className="font-semibold">
                    {currentCourse?.name ??
                      '—'}
                  </p>
                </div>

                {currentCourse && (
                  <>
                    <span className="rounded-full bg-background px-3 py-1.5 text-sm">
                      {currentCourse.startDate
                        ? formatShortDate(
                            currentCourse.startDate,
                          )
                        : '—'}{' '}
                      —{' '}
                      {currentCourse.endDate
                        ? formatShortDate(
                            currentCourse.endDate,
                          )
                        : '—'}
                    </span>

                    <span className="rounded-full bg-background px-3 py-1.5 text-sm">
                      {currentCourse.days.join(
                        ' • ',
                      ) || '—'}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* التبويبات */}
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
              {/* الطلاب */}
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
                      disabled={
                        saving
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
                            (student) => (
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
                                    disabled={
                                      saving
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

              {/* إضافة طلاب */}
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
                        (grade) => (
                          <option
                            key={
                              grade
                            }
                            value={
                              grade
                            }
                          >
                            {grade}
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
                      disabled={
                        saving
                      }
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

              {/* الحضور */}
              {activePanel ===
                'attendance' && (
                <div className="space-y-6">
                  {/* تعديل يوم سابق */}
                  {selectedAttendanceDate ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            تعديل حضور
                          </p>

                          <h3 className="text-lg font-semibold">
                            {formatDateForDisplay(
                              selectedAttendanceDate,
                            )}
                          </h3>

                          <p className="mt-1 text-sm text-muted-foreground">
                            {
                              currentCourse?.name
                            }
                          </p>
                        </div>

                        <Button
                          variant="outline"
                          onClick={
                            closeAttendanceArchive
                          }
                        >
                          العودة للأرشيف
                        </Button>
                      </div>

                      {assignedStudents.length ===
                      0 ? (
                        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
                          لا يوجد طلاب لتعديل الحضور.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/50">
                              <tr>
                                <th className="px-4 py-3 text-right font-medium">
                                  اسم الطالب
                                </th>

                                <th className="px-4 py-3 text-right font-medium">
                                  الوضع
                                </th>

                                <th className="px-4 py-3 text-right font-medium">
                                  ملاحظات
                                </th>

                                <th className="px-4 py-3 text-right font-medium">
                                  نسبة الحضور —{' '}
                                  {
                                    currentCourse?.name
                                  }
                                </th>
                              </tr>
                            </thead>

                            <tbody>
                              {assignedStudents.map(
                                (
                                  student,
                                ) => {
                                  const currentStatus =
                                    getSessionStatus(
                                      student.id,
                                      selectedAttendanceDate,
                                    )

                                  const stats =
                                    getAttendanceStats(
                                      student.id,
                                      currentCourse?.id ??
                                        '',
                                    )

                                  const existing =
                                    getStudentAttendanceRecord(
                                      student.id,
                                      selectedAttendanceDate,
                                    )

                                  const noteKey = `${selectedAttendanceDate}:${student.id}`

                                  const noteValue =
                                    existing?.note ??
                                    attendanceNotes[
                                      noteKey
                                    ] ??
                                    ''

                                  return (
                                    <tr
                                      key={
                                        student.id
                                      }
                                      className="border-t"
                                    >
                                      <td className="px-4 py-4">
                                        <p className="font-medium">
                                          {
                                            student.name
                                          }
                                        </p>

                                        <p className="mt-1 text-xs text-muted-foreground">
                                          {
                                            student.levelName
                                          }
                                        </p>
                                      </td>

                                      <td className="px-4 py-4">
                                        <div className="flex flex-wrap gap-1.5">
                                          {attendanceStatusNames.map(
                                            (
                                              status,
                                            ) => (
                                              <button
                                                key={
                                                  status
                                                }
                                                type="button"
                                                onClick={() =>
                                                  handleAttendanceClick(
                                                    student.id,
                                                    status,
                                                    selectedAttendanceDate,
                                                  )
                                                }
                                                disabled={
                                                  saving
                                                }
                                                className={`rounded-md border px-3 py-2 text-xs font-medium transition ${getAttendanceClass(
                                                  currentStatus,
                                                  status,
                                                )}`}
                                              >
                                                {currentStatus ===
                                                  status && (
                                                  <Check className="ml-1 inline-block size-3.5" />
                                                )}

                                                {
                                                  status
                                                }
                                              </button>
                                            ),
                                          )}
                                        </div>
                                      </td>

                                      <td className="px-4 py-4">
                                        <input
                                          value={
                                            noteValue
                                          }
                                          onChange={(
                                            event,
                                          ) =>
                                            updateAttendanceNote(
                                              student.id,
                                              event
                                                .target
                                                .value,
                                              selectedAttendanceDate,
                                            )
                                          }
                                          placeholder="ملاحظة..."
                                          className="h-9 min-w-[180px] rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                      </td>

                                      <td className="px-4 py-4">
                                        <div className="font-semibold tabular-nums">
                                          {
                                            stats.present
                                          }{' '}
                                          /{' '}
                                          {
                                            stats.total
                                          }{' '}
                                          —{' '}
                                          {formatPercentage(
                                            stats.percentage,
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )
                                },
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <div className="flex justify-end border-t pt-4">
                        <Button
                          onClick={
                            closeAttendanceArchive
                          }
                        >
                          حفظ التعديلات
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* الحضور الحالي */}
                      <div>
                        <h3 className="text-lg font-semibold">
                          الحضور والغياب
                        </h3>

                        <p className="mt-1 text-sm text-muted-foreground">
                          {
                            currentCourse?.name
                          }
                          {currentAttendanceDate
                            ? ` · ${formatDateForDisplay(
                                currentAttendanceDate,
                              )}`
                            : ''}
                        </p>
                      </div>

                      {assignedStudents.length ===
                      0 ? (
                        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
                          لا يوجد طلاب لتسجيل الحضور.
                        </div>
                      ) : currentAttendanceDate ? (
                        <div className="overflow-x-auto rounded-lg border">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/50">
                              <tr>
                                <th className="px-4 py-3 text-right font-medium">
                                  اسم الطالب
                                </th>

                                <th className="px-4 py-3 text-right font-medium">
                                  الوضع
                                </th>

                                <th className="px-4 py-3 text-right font-medium">
                                  ملاحظات
                                </th>

                                <th className="px-4 py-3 text-right font-medium">
                                  نسبة الحضور —{' '}
                                  {
                                    currentCourse?.name
                                  }
                                </th>
                              </tr>
                            </thead>

                            <tbody>
                              {assignedStudents.map(
                                (
                                  student,
                                ) => {
                                  const currentStatus =
                                    getSessionStatus(
                                      student.id,
                                      currentAttendanceDate,
                                    )

                                  const stats =
                                    getAttendanceStats(
                                      student.id,
                                      currentCourse?.id ??
                                        '',
                                    )

                                  const existing =
                                    getStudentAttendanceRecord(
                                      student.id,
                                      currentAttendanceDate,
                                    )

                                  const noteKey = `${currentAttendanceDate}:${student.id}`

                                  const noteValue =
                                    existing?.note ??
                                    attendanceNotes[
                                      noteKey
                                    ] ??
                                    ''

                                  return (
                                    <tr
                                      key={
                                        student.id
                                      }
                                      className="border-t"
                                    >
                                      <td className="px-4 py-4">
                                        <p className="font-medium">
                                          {
                                            student.name
                                          }
                                        </p>

                                        <p className="mt-1 text-xs text-muted-foreground">
                                          {
                                            student.levelName
                                          }
                                        </p>
                                      </td>

                                      <td className="px-4 py-4">
                                        <div className="flex flex-wrap gap-1.5">
                                          {attendanceStatusNames.map(
                                            (
                                              status,
                                            ) => (
                                              <button
                                                key={
                                                  status
                                                }
                                                type="button"
                                                onClick={() =>
                                                  handleAttendanceClick(
                                                    student.id,
                                                    status,
                                                    currentAttendanceDate,
                                                  )
                                                }
                                                disabled={
                                                  saving
                                                }
                                                className={`rounded-md border px-3 py-2 text-xs font-medium transition ${getAttendanceClass(
                                                  currentStatus,
                                                  status,
                                                )}`}
                                              >
                                                {currentStatus ===
                                                  status && (
                                                  <Check className="ml-1 inline-block size-3.5" />
                                                )}

                                                {
                                                  status
                                                }
                                              </button>
                                            ),
                                          )}
                                        </div>
                                      </td>

                                      <td className="px-4 py-4">
                                        <input
                                          value={
                                            noteValue
                                          }
                                          onChange={(
                                            event,
                                          ) =>
                                            updateAttendanceNote(
                                              student.id,
                                              event
                                                .target
                                                .value,
                                              currentAttendanceDate,
                                            )
                                          }
                                          placeholder="ملاحظة..."
                                          className="h-9 min-w-[180px] rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                      </td>

                                      <td className="px-4 py-4">
                                        <div className="font-semibold tabular-nums">
                                          {
                                            stats.present
                                          }{' '}
                                          /{' '}
                                          {
                                            stats.total
                                          }{' '}
                                          —{' '}
                                          {formatPercentage(
                                            stats.percentage,
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )
                                },
                              )}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
                          لا توجد جلسة حضور حالية لهذا التاريخ.
                        </div>
                      )}

                      {/* أرشيف الحضور */}
                      <div className="space-y-3 border-t pt-6">
                        <div>
                          <h3 className="font-semibold">
                            أرشيف الحضور
                          </h3>

                          <p className="mt-1 text-sm text-muted-foreground">
                            أيام الحضور السابقة في{' '}
                            {
                              currentCourse?.name
                            }.
                          </p>
                        </div>

                        {attendanceArchive.length ===
                        0 ? (
                          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                            لا يوجد أرشيف حضور حتى الآن.
                          </div>
                        ) : (
                          <div className="overflow-hidden rounded-lg border">
                            <table className="w-full text-sm">
                              <thead className="bg-muted/50">
                                <tr>
                                  <th className="px-4 py-3 text-right font-medium">
                                    التاريخ
                                  </th>

                                  <th className="px-4 py-3 text-right font-medium">
                                    الحالة
                                  </th>

                                  <th className="px-4 py-3 text-right font-medium">
                                    الإجراء
                                  </th>
                                </tr>
                              </thead>

                              <tbody>
                                {attendanceArchive.map(
                                  (
                                    date,
                                  ) => (
                                    <tr
                                      key={
                                        date
                                      }
                                      className="border-t"
                                    >
                                      <td className="px-4 py-4 font-medium">
                                        {formatDateForDisplay(
                                          date,
                                        )}
                                      </td>

                                      <td className="px-4 py-4">
                                        <span className="inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                                          محفوظ
                                        </span>
                                      </td>

                                      <td className="px-4 py-4">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            openAttendanceArchive(
                                              date,
                                            )
                                          }
                                        >
                                          تعديل
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
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* نقل طالب */}
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
                        (student) =>
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
                        (teacher) =>
                          teacher.id !==
                          selectedTeacher.id,
                      )
                      .map(
                        (teacher) => (
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
                    disabled={
                      saving
                    }
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
