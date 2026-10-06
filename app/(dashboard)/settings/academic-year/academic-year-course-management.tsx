'use client'

import {
  Dispatch,
  SetStateAction,
} from 'react'

import {
  CalendarDays,
  Download,
  Eye,
  Lock,
  Plus,
  Trash2,
  Unlock,
  UserRound,
  X,
} from 'lucide-react'

import * as XLSX from 'xlsx'

import { supabase } from '@/lib/supabase'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

import CourseEditor from './course-editor'

export type DayOfWeek =
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'

export type Teacher = {
  id: string
  name: string
  isActive: boolean
}

export type Subject = {
  id: string
  name: string
  isActive: boolean
}

export type TeacherAssignment = {
  teacherId: string
  subjectIds: string[]
}

export type Course = {
  id?: string
  name: string
  startDate: string
  endDate: string
  days: DayOfWeek[]
  teacherIds: string[]
  teacherAssignments: TeacherAssignment[]
  isClosed: boolean
  closedAt: string | null
}

export type AcademicYear = {
  id: string
  name: string
  startDate: string
  endDate: string
  annualFee: number
  courses: Course[]
}

export type SummaryData = {
  studentCount: number
  subjectCount: number
  teacherCount: number
  lessonDays: number
  attendance: {
    present: number
    absent: number
    late: number
    excused: number
    notRecorded: number
    percentage: number
  }
}

type ExportStudent = {
  id: string
  name: string
  personalId: string
  gender: string
  age: string
  phone: string
  whatsapp: string
  notes: string
  healthNotes: string
  levelName: string
  className: string
}

type ExportAssignment = {
  studentId: string
  teacherId: string
  teacherName: string
  subjectName: string
}

type ExportAttendance = {
  student_id: string
  attendance_date: string
  status_id: string
  note: string | null
}

type ExportStatus = {
  id: string
  name: string
}

type ExportLesson = {
  date: string
  dayName: string
}

const days: {
  value: DayOfWeek
  label: string
}[] = [
  { value: 'sunday', label: 'الأحد' },
  { value: 'monday', label: 'الاثنين' },
  { value: 'tuesday', label: 'الثلاثاء' },
  { value: 'wednesday', label: 'الأربعاء' },
  { value: 'thursday', label: 'الخميس' },
  { value: 'friday', label: 'الجمعة' },
  { value: 'saturday', label: 'السبت' },
]

const getDaysLabel = (course: Course) => {
  if (course.days.length === 0) {
    return 'لا توجد أيام محددة'
  }

  return days
    .filter((day) =>
      course.days.includes(day.value),
    )
    .map((day) => day.label)
    .join('، ')
}

const formatDate = (
  value: string | null,
) => {
  if (!value) return '—'

  try {
    return new Intl.DateTimeFormat(
      'ar-BH',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      },
    ).format(new Date(value))
  } catch {
    return value
  }
}

const formatExcelDate = (
  value: string | null,
) => {
  if (!value) return ''

  try {
    return new Intl.DateTimeFormat(
      'ar-BH',
      {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      },
    ).format(
      new Date(`${value}T00:00:00`),
    )
  } catch {
    return value
  }
}

const getDayNumber = (
  date: Date,
): DayOfWeek => {
  const map: DayOfWeek[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ]

  return map[date.getDay()]
}

const getDayLabel = (
  day: DayOfWeek,
) => {
  return (
    days.find(
      (item) => item.value === day,
    )?.label ?? ''
  )
}

const countLessonDays = (
  startDate: string,
  endDate: string,
  courseDays: DayOfWeek[],
) => {
  if (
    !startDate ||
    !endDate ||
    courseDays.length === 0
  ) {
    return 0
  }

  const start = new Date(
    `${startDate}T00:00:00`,
  )
  const end = new Date(
    `${endDate}T00:00:00`,
  )

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start > end
  ) {
    return 0
  }

  const today = new Date()

  const todayOnly = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  )

  const effectiveEnd =
    end < todayOnly ? end : todayOnly

  if (start > effectiveEnd) {
    return 0
  }

  let count = 0
  const current = new Date(start)

  while (current <= effectiveEnd) {
    if (
      courseDays.includes(
        getDayNumber(current),
      )
    ) {
      count += 1
    }

    current.setDate(
      current.getDate() + 1,
    )
  }

  return count
}

const getLessonDates = (
  startDate: string,
  endDate: string,
  courseDays: DayOfWeek[],
): ExportLesson[] => {
  if (
    !startDate ||
    !endDate ||
    courseDays.length === 0
  ) {
    return []
  }

  const start = new Date(
    `${startDate}T00:00:00`,
  )
  const end = new Date(
    `${endDate}T00:00:00`,
  )

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start > end
  ) {
    return []
  }

  const today = new Date()

  const todayOnly = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  )

  const effectiveEnd =
    end < todayOnly ? end : todayOnly

  if (start > effectiveEnd) {
    return []
  }

  const result: ExportLesson[] = []
  const current = new Date(start)

  while (current <= effectiveEnd) {
    const day = getDayNumber(current)

    if (courseDays.includes(day)) {
      const year =
        current.getFullYear()

      const month = String(
        current.getMonth() + 1,
      ).padStart(2, '0')

      const date = String(
        current.getDate(),
      ).padStart(2, '0')

      result.push({
        date: `${year}-${month}-${date}`,
        dayName: getDayLabel(day),
      })
    }

    current.setDate(
      current.getDate() + 1,
    )
  }

  return result
}

const safeFileName = (
  value: string,
) => {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 100)
}

type Props = {
  years: AcademicYear[]
  setYears: Dispatch<
    SetStateAction<AcademicYear[]>
  >

  teachers: Teacher[]
  subjects: Subject[]

  loadingYears: boolean
  loadingTeachers: boolean
  loadingSubjects: boolean

  saving: boolean
  deletingId: string | null
  closingId: string | null

  exportingExcel: boolean
  setExportingExcel: Dispatch<
    SetStateAction<boolean>
  >

  supabaseStatus: string
  setSupabaseStatus: Dispatch<
    SetStateAction<string>
  >

  showForm: boolean
  setShowForm: Dispatch<
    SetStateAction<boolean>
  >

  editingId: string | null
  setEditingId: Dispatch<
    SetStateAction<string | null>
  >

  yearName: string
  setYearName: Dispatch<
    SetStateAction<string>
  >

  startDate: string
  setStartDate: Dispatch<
    SetStateAction<string>
  >

  endDate: string
  setEndDate: Dispatch<
    SetStateAction<string>
  >

  annualFee: string
  setAnnualFee: Dispatch<
    SetStateAction<string>
  >

  courses: Course[]
  setCourses: Dispatch<
    SetStateAction<Course[]>
  >

  selectedSummaryCourse: Course | null
  setSelectedSummaryCourse: Dispatch<
    SetStateAction<Course | null>
  >

  summaryData: SummaryData | null
  setSummaryData: Dispatch<
    SetStateAction<SummaryData | null>
  >

  summaryLoading: boolean
  setSummaryLoading: Dispatch<
    SetStateAction<boolean>
  >

  onResetForm: () => void
  onOpenEditForm: (
    year: AcademicYear,
  ) => void
  onOpenAddCourseForYear: (
    year: AcademicYear,
  ) => void
  onSave: () => void
  onDelete: (id: string) => void
}

export default function AcademicYearCourseManagement({
  years,
  setYears,
  teachers,
  subjects,
  loadingYears,
  loadingTeachers,
  loadingSubjects,
  saving,
  deletingId,
  closingId,
  exportingExcel,
  setExportingExcel,
  supabaseStatus,
  setSupabaseStatus,
  showForm,
  setShowForm,
  editingId,
  setEditingId,
  yearName,
  setYearName,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  annualFee,
  setAnnualFee,
  courses,
  setCourses,
  selectedSummaryCourse,
  setSelectedSummaryCourse,
  summaryData,
  setSummaryData,
  summaryLoading,
  setSummaryLoading,
  onResetForm,
  onOpenEditForm,
  onOpenAddCourseForYear,
  onSave,
  onDelete,
}: Props) {
  const closeCourse = async (
    course: Course,
  ) => {
    if (
      !course.id ||
      course.isClosed
    ) {
      return
    }

    const confirmed =
      window.confirm(
        `هل أنت متأكد من إغلاق دورة "${course.name}"؟\n\nبعد الإغلاق لن يمكن تعديل الدورة أو تغيير المعلمين والمواد المرتبطة بها.\n\nلن يتم حذف أي بيانات.`,
      )

    if (!confirmed) return

    setClosingIdState(
      course.id,
    )

    setSupabaseStatus(
      'جاري إغلاق الدورة...',
    )

    const {
      data,
      error,
    } = await supabase
      .from('courses')
      .update({
        is_closed: true,
        closed_at:
          new Date().toISOString(),
      })
      .eq('id', course.id)
      .eq(
        'is_closed',
        false,
      )
      .select(
        'id, is_closed, closed_at',
      )
      .single()

    if (error) {
      setSupabaseStatus(
        `خطأ في إغلاق الدورة: ${error.message}`,
      )
      setClosingIdState(null)
      return
    }

    setYears((current) =>
      current.map((year) => ({
        ...year,
        courses:
          year.courses.map(
            (item) =>
              item.id ===
              course.id
                ? {
                    ...item,
                    isClosed:
                      Boolean(
                        data.is_closed,
                      ),
                    closedAt:
                      data.closed_at ??
                      null,
                  }
                : item,
          ),
      })),
    )

    setCourses((current) =>
      current.map((item) =>
        item.id === course.id
          ? {
              ...item,
              isClosed: true,
              closedAt:
                data.closed_at ??
                null,
            }
          : item,
      ),
    )

    setSupabaseStatus(
      'تم إغلاق الدورة بنجاح. جميع بياناتها محفوظة ✅',
    )

    setClosingIdState(null)
  }

  const [internalClosingId, setInternalClosingId] =
    useState<string | null>(null)

  const setClosingIdState = (
    value: string | null,
  ) => {
    setInternalClosingId(value)
  }

  const activeClosingId =
    internalClosingId ?? closingId

  const openSummary = async (
    course: Course,
  ) => {
    if (!course.id) return

    setSelectedSummaryCourse(course)
    setSummaryData(null)
    setSummaryLoading(true)

    try {
      const {
        data: assignments,
        error:
          assignmentsError,
      } = await supabase
        .from(
          'teacher_student_assignments',
        )
        .select('student_id')
        .eq(
          'course_id',
          course.id,
        )

      if (assignmentsError) {
        throw assignmentsError
      }

      const studentIds =
        Array.from(
          new Set(
            (assignments ?? []).map(
              (item) =>
                item.student_id,
            ),
          ),
        )

      const subjectIds =
        Array.from(
          new Set(
            course.teacherAssignments.flatMap(
              (item) =>
                item.subjectIds,
            ),
          ),
        )

      const teacherIds =
        Array.from(
          new Set(
            course.teacherIds,
          ),
        )

      const lessonDays =
        countLessonDays(
          course.startDate,
          course.endDate,
          course.days,
        )

      const {
        data: attendanceRows,
        error:
          attendanceError,
      } = await supabase
        .from('attendance')
        .select(
          'student_id, attendance_date, status_id',
        )
        .eq(
          'course_id',
          course.id,
        )

      if (attendanceError) {
        throw attendanceError
      }

      const statusIds =
        Array.from(
          new Set(
            (
              attendanceRows ??
              []
            ).map(
              (row) =>
                row.status_id,
            ),
          ),
        )

      let statusMap =
        new Map<
          string,
          string
        >()

      if (
        statusIds.length > 0
      ) {
        const {
          data: statuses,
          error:
            statusesError,
        } = await supabase
          .from(
            'attendance_statuses',
          )
          .select('id, name')
          .in(
            'id',
            statusIds,
          )

        if (statusesError) {
          throw statusesError
        }

        statusMap =
          new Map(
            (
              statuses ??
              []
            ).map(
              (
                status,
              ) => [
                status.id,
                status.name ??
                  '',
              ],
            ),
          )
      }

      let present = 0
      let absent = 0
      let late = 0
      let excused = 0

      ;(
        attendanceRows ?? []
      ).forEach((row) => {
        const status =
          statusMap.get(
            row.status_id,
          )

        if (
          status === 'حاضر'
        ) {
          present += 1
        } else if (
          status === 'غائب'
        ) {
          absent += 1
        } else if (
          status === 'متأخر'
        ) {
          late += 1
        } else if (
          status === 'مستأذن'
        ) {
          excused += 1
        }
      })

      const expectedRecords =
        studentIds.length *
        lessonDays

      const recordedCount =
        (
          attendanceRows ?? []
        ).length

      const notRecorded =
        Math.max(
          0,
          expectedRecords -
            recordedCount,
        )

      const attended =
        present +
        late +
        excused

      const denominator =
        attended +
        absent

      const percentage =
        denominator > 0
          ? Math.round(
              (attended /
                denominator) *
                1000,
            ) / 10
          : 0

      setSummaryData({
        studentCount:
          studentIds.length,
        subjectCount:
          subjectIds.length,
        teacherCount:
          teacherIds.length,
        lessonDays,
        attendance: {
          present,
          absent,
          late,
          excused,
          notRecorded,
          percentage,
        },
      })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'حدث خطأ غير معروف'

      setSupabaseStatus(
        `خطأ في تحميل ملخص الدورة: ${message}`,
      )
    } finally {
      setSummaryLoading(false)
    }
  }

  const downloadCourseExcel = async (
    course: Course,
  ) => {
    if (!course.id) {
      return
    }

    setExportingExcel(true)
    setSupabaseStatus(
      'جاري تجهيز ملف Excel الكامل للدورة...',
    )

    try {
      const {
        data: assignmentRows,
        error:
          assignmentError,
      } = await supabase
        .from(
          'teacher_student_assignments',
        )
        .select(
          'student_id, teacher_id, subject_id',
        )
        .eq(
          'course_id',
          course.id,
        )

      if (assignmentError) {
        throw assignmentError
      }

      const rawAssignments =
        assignmentRows ?? []

      const studentIds =
        Array.from(
          new Set(
            rawAssignments.map(
              (row) =>
                row.student_id,
            ),
          ),
        )

      const teacherIds =
        Array.from(
          new Set(
            rawAssignments.map(
              (row) =>
                row.teacher_id,
            ),
          ),
        )

      const subjectIds =
        Array.from(
          new Set(
            rawAssignments.map(
              (row) =>
                row.subject_id,
            ),
          ),
        )

      let students: ExportStudent[] =
        []

      if (
        studentIds.length > 0
      ) {
        const {
          data: studentRows,
          error:
            studentsError,
        } = await supabase
          .from('students')
          .select(
            'id, name, personal_id, gender, age, phone, whatsapp, notes, health_notes',
          )
          .in(
            'id',
            studentIds,
          )

        if (studentsError) {
          throw studentsError
        }

        const {
          data: courseYear,
          error:
            courseYearError,
        } = await supabase
          .from('courses')
          .select(
            'academic_year_id',
          )
          .eq(
            'id',
            course.id,
          )
          .single()

        if (courseYearError) {
          throw courseYearError
        }

        const {
          data: enrollmentRows,
          error:
            enrollmentsError,
        } = await supabase
          .from('enrollments')
          .select(
            'student_id, level_id, class_id',
          )
          .eq(
            'academic_year_id',
            courseYear
              ?.academic_year_id ??
              '',
          )
          .in(
            'student_id',
            studentIds,
          )

        if (enrollmentsError) {
          throw enrollmentsError
        }

        const levelIds =
          Array.from(
            new Set(
              (
                enrollmentRows ??
                []
              )
                .map(
                  (row) =>
                    row.level_id,
                )
                .filter(Boolean),
            ),
          )

        const classIds =
          Array.from(
            new Set(
              (
                enrollmentRows ??
                []
              )
                .map(
                  (row) =>
                    row.class_id,
                )
                .filter(Boolean),
            ),
          )

        let levelMap =
          new Map<
            string,
            string
          >()

        let classMap =
          new Map<
            string,
            string
          >()

        if (
          levelIds.length > 0
        ) {
          const {
            data: levelRows,
            error:
              levelsError,
          } = await supabase
            .from('levels')
            .select(
              'id, name',
            )
            .in(
              'id',
              levelIds,
            )

          if (levelsError) {
            throw levelsError
          }

          levelMap =
            new Map(
              (
                levelRows ??
                []
              ).map(
                (
                  row,
                ) => [
                  row.id,
                  row.name ??
                    '',
                ],
              ),
            )
        }

        if (
          classIds.length > 0
        ) {
          const {
            data: classRows,
            error:
              classesError,
          } = await supabase
            .from('classes')
            .select(
              'id, name',
            )
            .in(
              'id',
              classIds,
            )

          if (classesError) {
            throw classesError
          }

          classMap =
            new Map(
              (
                classRows ??
                []
              ).map(
                (
                  row,
                ) => [
                  row.id,
                  row.name ??
                    '',
                ],
              ),
            )
        }

        const enrollmentMap =
          new Map<
            string,
            {
              levelName: string
              className: string
            }
          >()

        ;(
          enrollmentRows ??
          []
        ).forEach(
          (row) => {
            enrollmentMap.set(
              row.student_id,
              {
                levelName:
                  row.level_id
                    ? levelMap.get(
                        row.level_id,
                      ) ?? ''
                    : '',
                className:
                  row.class_id
                    ? classMap.get(
                        row.class_id,
                      ) ?? ''
                    : '',
              },
            )
          },
        )

        students = (
          studentRows ?? []
        ).map(
          (student) => {
            const enrollment =
              enrollmentMap.get(
                student.id,
              )

            return {
              id: student.id,
              name:
                student.name ??
                '',
              personalId:
                student.personal_id ??
                '',
              gender:
                student.gender ??
                '',
              age:
                student.age !=
                null
                  ? String(
                      student.age,
                    )
                  : '',
              phone:
                student.phone ??
                '',
              whatsapp:
                student.whatsapp ??
                '',
              notes:
                student.notes ??
                '',
              healthNotes:
                student.health_notes ??
                '',
              levelName:
                enrollment
                  ?.levelName ??
                '',
              className:
                enrollment
                  ?.className ??
                '',
            }
          },
        )
      }

      let teacherMap =
        new Map<
          string,
          string
        >()

      let subjectMap =
        new Map<
          string,
          string
        >()

      if (
        teacherIds.length > 0
      ) {
        const {
          data: teacherRows,
          error:
            teacherError,
        } = await supabase
          .from('teachers')
          .select(
            'id, name',
          )
          .in(
            'id',
            teacherIds,
          )

        if (teacherError) {
          throw teacherError
        }

        teacherMap =
          new Map(
            (
              teacherRows ??
              []
            ).map(
              (
                row,
              ) => [
                row.id,
                row.name ??
                  '',
              ],
            ),
          )
      }

      if (
        subjectIds.length > 0
      ) {
        const {
          data: subjectRows,
          error:
            subjectError,
        } = await supabase
          .from('subjects')
          .select(
            'id, name',
          )
          .in(
            'id',
            subjectIds,
          )

        if (subjectError) {
          throw subjectError
        }

        subjectMap =
          new Map(
            (
              subjectRows ??
              []
            ).map(
              (
                row,
              ) => [
                row.id,
                row.name ??
                  '',
              ],
            ),
          )
      }

      const assignments: ExportAssignment[] =
        rawAssignments.map(
          (row) => ({
            studentId:
              row.student_id,
            teacherId:
              row.teacher_id,
            teacherName:
              teacherMap.get(
                row.teacher_id,
              ) ?? '',
            subjectName:
              subjectMap.get(
                row.subject_id,
              ) ?? '',
          }),
        )

      const lessonDates =
        getLessonDates(
          course.startDate,
          course.endDate,
          course.days,
        )

      const {
        data: attendanceRows,
        error:
          attendanceError,
      } = await supabase
        .from('attendance')
        .select(
          'student_id, attendance_date, status_id, note',
        )
        .eq(
          'course_id',
          course.id,
        )

      if (attendanceError) {
        throw attendanceError
      }

      const rawAttendance =
        (attendanceRows ??
          []) as ExportAttendance[]

      const attendanceStatusIds =
        Array.from(
          new Set(
            rawAttendance.map(
              (row) =>
                row.status_id,
            ),
          ),
        )

      let statusMap =
        new Map<
          string,
          string
        >()

      if (
        attendanceStatusIds.length >
        0
      ) {
        const {
          data: statusRows,
          error:
            statusError,
        } = await supabase
          .from(
            'attendance_statuses',
          )
          .select(
            'id, name',
          )
          .in(
            'id',
            attendanceStatusIds,
          )

        if (statusError) {
          throw statusError
        }

        statusMap =
          new Map(
            (
              statusRows ??
              []
            ).map(
              (
                row: ExportStatus,
              ) => [
                row.id,
                row.name ??
                  '',
              ],
            ),
          )
      }

      const attendanceMap =
        new Map<
          string,
          ExportAttendance
        >()

      rawAttendance.forEach(
        (row) => {
          const date =
            String(
              row.attendance_date,
            ).slice(0, 10)

          attendanceMap.set(
            `${row.student_id}|${date}`,
            row,
          )
        },
      )

      const assignmentMap =
        new Map<
          string,
          ExportAssignment
        >()

      assignments.forEach(
        (assignment) => {
          assignmentMap.set(
            assignment.studentId,
            assignment,
          )
        },
      )

      const summaryRows =
        students.map(
          (student, index) => {
            const studentAssignment =
              assignmentMap.get(
                student.id,
              )

            let present = 0
            let absent = 0
            let late = 0
            let excused = 0
            let notRecorded = 0

            lessonDates.forEach(
              (lesson) => {
                const attendance =
                  attendanceMap.get(
                    `${student.id}|${lesson.date}`,
                  )

                if (!attendance) {
                  notRecorded += 1
                  return
                }

                const status =
                  statusMap.get(
                    attendance.status_id,
                  )

                if (
                  status ===
                  'حاضر'
                ) {
                  present += 1
                } else if (
                  status ===
                  'غائب'
                ) {
                  absent += 1
                } else if (
                  status ===
                  'متأخر'
                ) {
                  late += 1
                } else if (
                  status ===
                  'مستأذن'
                ) {
                  excused += 1
                } else if (
                  status ===
                  'لم يسجل'
                ) {
                  notRecorded += 1
                }
              },
            )

            const attended =
              present +
              late +
              excused

            const denominator =
              attended +
              absent

            const percentage =
              denominator >
              0
                ? Math.round(
                    (attended /
                      denominator) *
                      1000,
                  ) / 10
                : 0

            return {
              '#':
                index + 1,
              'اسم الطالب':
                student.name,
              'الرقم الشخصي':
                student.personalId,
              'الجنس':
                student.gender,
              'العمر':
                student.age,
              'الهاتف':
                student.phone,
              'الواتساب':
                student.whatsapp,
              'المستوى':
                student.levelName,
              'الصف':
                student.className,
              'المعلم':
                studentAssignment
                  ?.teacherName ??
                '',
              'المادة':
                studentAssignment
                  ?.subjectName ??
                '',
              'حاضر':
                present,
              'غائب':
                absent,
              'متأخر':
                late,
              'مستأذن':
                excused,
              'لم يسجل':
                notRecorded,
              'إجمالي أيام الدروس':
                lessonDates.length,
              'أيام محتسبة للنسبة':
                denominator,
              'نسبة الحضور':
                `${percentage}%`,
              'ملاحظات الطالب':
                student.notes,
              'الملاحظات الصحية':
                student.healthNotes,
            }
          },
        )

      const detailRows: Record<
        string,
        string | number
      >[] = []

      students.forEach(
        (student, studentIndex) => {
          const studentAssignment =
            assignmentMap.get(
              student.id,
            )

          lessonDates.forEach(
            (lesson, lessonIndex) => {
              const attendance =
                attendanceMap.get(
                  `${student.id}|${lesson.date}`,
                )

              const status =
                attendance
                  ? statusMap.get(
                      attendance.status_id,
                    ) ?? ''
                  : 'لم يسجل'

              detailRows.push({
                '#':
                  detailRows.length +
                  1,
                'رقم الطالب':
                  studentIndex + 1,
                'اسم الطالب':
                  student.name,
                'الرقم الشخصي':
                  student.personalId,
                'المستوى':
                  student.levelName,
                'الصف':
                  student.className,
                'المعلم':
                  studentAssignment
                    ?.teacherName ??
                  '',
                'المادة':
                  studentAssignment
                    ?.subjectName ??
                  '',
                'رقم الحصة':
                  lessonIndex + 1,
                'تاريخ الدرس':
                  formatExcelDate(
                    lesson.date,
                  ),
                'اليوم':
                  lesson.dayName,
                'الحالة':
                  status,
                'ملاحظة الحضور':
                  attendance
                    ?.note ??
                  '',
              })
            },
          )
        },
      )

      const teacherSubjectRows =
        course.teacherAssignments.flatMap(
          (assignment) => {
            const teacherName =
              teacherMap.get(
                assignment.teacherId,
              ) ??
              teachers.find(
                (teacher) =>
                  teacher.id ===
                  assignment.teacherId,
              )?.name ??
              ''

            return assignment.subjectIds.map(
              (subjectId) => ({
                المعلم:
                  teacherName,
                المادة:
                  subjectMap.get(
                    subjectId,
                  ) ??
                  subjects.find(
                    (subject) =>
                      subject.id ===
                      subjectId,
                  )?.name ??
                  '',
              }),
            )
          },
        )

      const courseInfoRows = [
        {
          'اسم الدورة':
            course.name,
          'حالة الدورة':
            course.isClosed
              ? 'مغلقة'
              : 'مفتوحة',
          'من':
            formatExcelDate(
              course.startDate,
            ),
          'إلى':
            formatExcelDate(
              course.endDate,
            ),
          'أيام الدورة':
            getDaysLabel(course),
          'عدد أيام الدروس':
            lessonDates.length,
          'عدد الطلاب':
            students.length,
          'عدد المعلمين':
            teacherIds.length,
          'عدد المواد':
            subjectIds.length,
          'تاريخ الإغلاق':
            formatDate(
              course.closedAt,
            ),
        },
      ]

      const courseTeachersRows =
        teacherSubjectRows.length >
        0
          ? teacherSubjectRows
          : [
              {
                المعلم: '',
                المادة: '',
              },
            ]

      const workbook =
        XLSX.utils.book_new()

      const summarySheet =
        XLSX.utils.json_to_sheet(
          summaryRows,
        )

      const detailSheet =
        XLSX.utils.json_to_sheet(
          detailRows,
        )

      const courseSheet =
        XLSX.utils.json_to_sheet(
          courseInfoRows,
        )

      const teacherSheet =
        XLSX.utils.json_to_sheet(
          courseTeachersRows,
        )

      summarySheet['!cols'] = [
        { wch: 5 },
        { wch: 28 },
        { wch: 18 },
        { wch: 12 },
        { wch: 8 },
        { wch: 16 },
        { wch: 18 },
        { wch: 20 },
        { wch: 18 },
        { wch: 24 },
        { wch: 22 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 12 },
        { wch: 12 },
        { wch: 20 },
        { wch: 18 },
        { wch: 30 },
        { wch: 30 },
      ]

      detailSheet['!cols'] = [
        { wch: 7 },
        { wch: 12 },
        { wch: 28 },
        { wch: 18 },
        { wch: 20 },
        { wch: 18 },
        { wch: 24 },
        { wch: 22 },
        { wch: 12 },
        { wch: 18 },
        { wch: 14 },
        { wch: 18 },
        { wch: 35 },
      ]

      courseSheet['!cols'] = [
        { wch: 25 },
        { wch: 16 },
        { wch: 16 },
        { wch: 16 },
        { wch: 45 },
        { wch: 18 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 24 },
      ]

      teacherSheet['!cols'] = [
        { wch: 30 },
        { wch: 30 },
      ]

      XLSX.utils.book_append_sheet(
        workbook,
        summarySheet,
        'ملخص الطلاب',
      )

      XLSX.utils.book_append_sheet(
        workbook,
        detailSheet,
        'تفاصيل الحضور',
      )

      XLSX.utils.book_append_sheet(
        workbook,
        courseSheet,
        'بيانات الدورة',
      )

      XLSX.utils.book_append_sheet(
        workbook,
        teacherSheet,
        'المعلمون والمواد',
      )

      const fileName = `${safeFileName(
        course.name ||
          'الدورة',
      )}-تفاصيل-الدورة.xlsx`

      XLSX.writeFile(
        workbook,
        fileName,
      )

      setSupabaseStatus(
        'تم تنزيل ملف Excel الكامل للدورة بنجاح ✅',
      )
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'حدث خطأ غير معروف'

      setSupabaseStatus(
        `خطأ في تنزيل Excel: ${message}`,
      )
    } finally {
      setExportingExcel(false)
    }
  }

  const getTeacherNames = (
    course: Course,
  ) => {
    const names =
      course.teacherIds
        .map(
          (teacherId) =>
            teachers.find(
              (teacher) =>
                teacher.id ===
                teacherId,
            )?.name,
        )
        .filter(Boolean) as string[]

    return names
  }

  const getSubjectNames = (
    course: Course,
  ) => {
    const ids = Array.from(
      new Set(
        course.teacherAssignments.flatMap(
          (item) =>
            item.subjectIds,
        ),
      ),
    )

    return ids
      .map(
        (id) =>
          subjects.find(
            (subject) =>
              subject.id === id,
          )?.name,
      )
      .filter(Boolean) as string[]
  }

  if (showForm) {
    return (
      <CourseEditor
        editingId={editingId}
        yearName={yearName}
        startDate={startDate}
        endDate={endDate}
        annualFee={annualFee}
        courses={courses}
        teachers={teachers}
        subjects={subjects}
        loadingTeachers={
          loadingTeachers
        }
        loadingSubjects={
          loadingSubjects
        }
        saving={saving}
        closingId={activeClosingId}
        onYearNameChange={
          setYearName
        }
        onStartDateChange={
          setStartDate
        }
        onEndDateChange={
          setEndDate
        }
        onAnnualFeeChange={
          setAnnualFee
        }
        onCoursesChange={
          setCourses
        }
        onClose={onResetForm}
        onSave={onSave}
        onCloseCourse={
          closeCourse
        }
        onOpenSummary={
          openSummary
        }
      />
    )
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          {loadingYears ? (
            <div className="p-10 text-center">
              <CalendarDays className="mx-auto size-10 animate-pulse text-muted-foreground" />

              <h3 className="mt-4 font-semibold">
                جاري تحميل السنوات الدراسية...
              </h3>
            </div>
          ) : years.length > 0 ? (
            <div className="divide-y">
              {years.map(
                (year) => (
                  <div
                    key={year.id}
                    className="flex flex-col gap-4 p-5"
                  >
                    <div className="flex flex-col gap-4">
                      <div className="min-w-0">
                        <h3 className="font-semibold">
                          {year.name ||
                            'بدون اسم'}
                        </h3>

                        {(
                          year.startDate ||
                          year.endDate
                        ) && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {year.startDate ||
                              '—'}{' '}
                            →{' '}
                            {year.endDate ||
                              '—'}
                          </p>
                        )}

                        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                          <p>
                            الرسوم السنوية:{' '}
                            <span className="font-medium">
                              {year.annualFee.toFixed(
                                3,
                              )}{' '}
                              د.ب
                            </span>
                          </p>

                          <p>
                            عدد الدورات:{' '}
                            <span className="font-medium">
                              {
                                year
                                  .courses
                                  .length
                              }
                            </span>
                          </p>

                          <p>
                            عدد المعلمين:{' '}
                            <span className="font-medium">
                              {
                                new Set(
                                  year.courses.flatMap(
                                    (
                                      course,
                                    ) =>
                                      course.teacherIds,
                                  ),
                                ).size
                              }
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              onOpenAddCourseForYear(
                                year,
                              )
                            }
                            disabled={
                              saving ||
                              deletingId !==
                                null ||
                              activeClosingId !==
                                null
                            }
                          >
                            <Plus className="size-4" />
                            إضافة دورة
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              onOpenEditForm(
                                year,
                              )
                            }
                            disabled={
                              saving ||
                              deletingId !==
                                null ||
                              activeClosingId !==
                                null
                            }
                          >
                            تعديل السنة
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              onDelete(
                                year.id,
                              )
                            }
                            disabled={
                              deletingId !==
                                null ||
                              activeClosingId !==
                                null
                            }
                          >
                            <Trash2 className="size-4" />

                            {deletingId ===
                            year.id
                              ? 'جاري المسح...'
                              : 'مسح'}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {year.courses
                      .length > 0 && (
                      <div className="rounded-lg border bg-muted/20 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <h4 className="text-sm font-semibold">
                            الدورات
                          </h4>

                          <span className="text-xs text-muted-foreground">
                            {
                              year
                                .courses
                                .length
                            }{' '}
                            دورة
                          </span>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {year.courses.map(
                            (
                              course,
                              index,
                            ) => {
                              const teacherNames =
                                getTeacherNames(
                                  course,
                                )

                              const subjectNames =
                                getSubjectNames(
                                  course,
                                )

                              return (
                                <div
                                  key={
                                    course.id ??
                                    index
                                  }
                                  className={`rounded-lg border bg-background p-4 ${
                                    course.isClosed
                                      ? 'border-blue-200 bg-blue-50/30'
                                      : ''
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-medium">
                                          {course.name ||
                                            `الدورة ${
                                              index +
                                              1
                                            }`}
                                        </p>

                                        {course.isClosed ? (
                                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-[11px] text-blue-700">
                                            <Lock className="size-3" />
                                            مغلقة
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-[11px] text-green-700">
                                            <Unlock className="size-3" />
                                            مفتوحة
                                          </span>
                                        )}
                                      </div>

                                      <p className="mt-1 text-xs text-muted-foreground">
                                        {course.startDate ||
                                          '—'}{' '}
                                        →{' '}
                                        {course.endDate ||
                                          '—'}
                                      </p>

                                      {course
                                        .days
                                        .length >
                                        0 && (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                          {getDaysLabel(
                                            course,
                                          )}
                                        </p>
                                      )}
                                    </div>

                                    <CalendarDays className="size-4 shrink-0 text-primary" />
                                  </div>

                                  {teacherNames.length >
                                    0 && (
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                      {teacherNames.map(
                                        (
                                          name,
                                          teacherIndex,
                                        ) => (
                                          <span
                                            key={`${name}-${teacherIndex}`}
                                            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[11px] text-primary"
                                          >
                                            <UserRound className="size-3" />
                                            {
                                              name
                                            }
                                          </span>
                                        ),
                                      )}
                                    </div>
                                  )}

                                  {subjectNames.length >
                                    0 && (
                                    <div className="mt-2 text-xs text-muted-foreground">
                                      <span className="font-medium">
                                        المواد:
                                      </span>{' '}
                                      {subjectNames.join(
                                        '، ',
                                      )}
                                    </div>
                                  )}

                                  {course.isClosed &&
                                    course.closedAt && (
                                      <p className="mt-2 text-[11px] text-muted-foreground">
                                        أغلقت في:{' '}
                                        {formatDate(
                                          course.closedAt,
                                        )}
                                      </p>
                                    )}

                                  <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">
                                    {course.isClosed ? (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          openSummary(
                                            course,
                                          )
                                        }
                                      >
                                        <Eye className="size-4" />
                                        عرض ملخص الدورة
                                      </Button>
                                    ) : (
                                      <>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            onOpenEditForm(
                                              year,
                                            )
                                          }
                                          disabled={
                                            saving ||
                                            activeClosingId !==
                                              null
                                          }
                                        >
                                          تعديل الدورة
                                        </Button>

                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            closeCourse(
                                              course,
                                            )
                                          }
                                          disabled={
                                            saving ||
                                            activeClosingId !==
                                              null
                                          }
                                        >
                                          <Lock className="size-4" />

                                          {activeClosingId ===
                                          course.id
                                            ? 'جاري الإغلاق...'
                                            : 'إغلاق الدورة'}
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )
                            },
                          )}
                        </div>
                      </div>
                    )}

                    {year.courses
                      .length ===
                      0 && (
                      <div className="rounded-lg border border-dashed p-5 text-center">
                        <p className="text-sm text-muted-foreground">
                          لا توجد دورات لهذه السنة.
                        </p>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mt-2"
                          onClick={() =>
                            onOpenAddCourseForYear(
                              year,
                            )
                          }
                          disabled={
                            saving ||
                            deletingId !==
                              null ||
                            activeClosingId !==
                              null
                          }
                        >
                          <Plus className="size-4" />
                          إضافة دورة
                        </Button>
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {selectedSummaryCourse && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border bg-background shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background p-5">
              <div>
                <div className="flex items-center gap-2">
                  <Lock className="size-5 text-blue-600" />

                  <h2 className="text-lg font-semibold">
                    ملخص الدورة
                  </h2>
                </div>

                <p className="mt-1 text-sm text-muted-foreground">
                  {
                    selectedSummaryCourse.name
                  }
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  setSelectedSummaryCourse(
                    null,
                  )
                  setSummaryData(null)
                }}
                aria-label="إغلاق"
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="space-y-5 p-5">
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold">
                  بيانات الدورة
                </h3>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      اسم الدورة
                    </p>

                    <p className="mt-1 font-medium">
                      {
                        selectedSummaryCourse.name
                      }
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      الحالة
                    </p>

                    <p className="mt-1 font-medium text-blue-600">
                      مغلقة
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      من
                    </p>

                    <p className="mt-1 font-medium">
                      {selectedSummaryCourse.startDate ||
                        '—'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      إلى
                    </p>

                    <p className="mt-1 font-medium">
                      {selectedSummaryCourse.endDate ||
                        '—'}
                    </p>
                  </div>

                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground">
                      أيام الدورة
                    </p>

                    <p className="mt-1 font-medium">
                      {getDaysLabel(
                        selectedSummaryCourse,
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">
                    الطلاب
                  </p>

                  <p className="mt-1 text-2xl font-semibold">
                    {summaryLoading
                      ? '...'
                      : summaryData
                          ?.studentCount ??
                        0}
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">
                    المعلمون
                  </p>

                  <p className="mt-1 text-2xl font-semibold">
                    {summaryData
                      ?.teacherCount ??
                      selectedSummaryCourse
                        .teacherIds
                        .length}
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">
                    المواد
                  </p>

                  <p className="mt-1 text-2xl font-semibold">
                    {summaryData
                      ?.subjectCount ??
                      0}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="font-semibold">
                  الحضور
                </h3>

                {summaryLoading ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    جاري تحميل ملخص الحضور...
                  </div>
                ) : summaryData ? (
                  <>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="rounded-lg bg-green-50 p-3">
                        <p className="text-xs text-green-700">
                          حاضر
                        </p>

                        <p className="mt-1 text-xl font-semibold text-green-700">
                          {
                            summaryData
                              .attendance
                              .present
                          }
                        </p>
                      </div>

                      <div className="rounded-lg bg-red-50 p-3">
                        <p className="text-xs text-red-700">
                          غائب
                        </p>

                        <p className="mt-1 text-xl font-semibold text-red-700">
                          {
                            summaryData
                              .attendance
                              .absent
                          }
                        </p>
                      </div>

                      <div className="rounded-lg bg-yellow-50 p-3">
                        <p className="text-xs text-yellow-700">
                          متأخر
                        </p>

                        <p className="mt-1 text-xl font-semibold text-yellow-700">
                          {
                            summaryData
                              .attendance
                              .late
                          }
                        </p>
                      </div>

                      <div className="rounded-lg bg-blue-50 p-3">
                        <p className="text-xs text-blue-700">
                          مستأذن
                        </p>

                        <p className="mt-1 text-xl font-semibold text-blue-700">
                          {
                            summaryData
                              .attendance
                              .excused
                          }
                        </p>
                      </div>

                      <div className="rounded-lg bg-muted p-3">
                        <p className="text-xs text-muted-foreground">
                          لم يسجل
                        </p>

                        <p className="mt-1 text-xl font-semibold">
                          {
                            summaryData
                              .attendance
                              .notRecorded
                          }
                        </p>
                      </div>

                      <div className="rounded-lg bg-primary/10 p-3">
                        <p className="text-xs text-primary">
                          نسبة الحضور
                        </p>

                        <p className="mt-1 text-xl font-semibold text-primary">
                          {
                            summaryData
                              .attendance
                              .percentage
                          }
                          %
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 text-xs text-muted-foreground">
                      أيام الدروس المنتهية:{' '}
                      {
                        summaryData.lessonDays
                      }
                      . تم احتساب حاضر + متأخر + مستأذن كحضور، بينما "لم يسجل" مستبعد من النسبة.
                    </p>
                  </>
                ) : (
                  <p className="py-5 text-sm text-muted-foreground">
                    لا توجد بيانات حضور.
                  </p>
                )}
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="font-semibold">
                  المعلمون والمواد
                </h3>

                <div className="mt-3 space-y-3">
                  {selectedSummaryCourse
                    .teacherAssignments
                    .map(
                      (
                        assignment,
                        index,
                      ) => {
                        const teacher =
                          teachers.find(
                            (item) =>
                              item.id ===
                              assignment.teacherId,
                          )

                        const assignedSubjects =
                          assignment.subjectIds
                            .map(
                              (
                                subjectId,
                              ) =>
                                subjects.find(
                                  (
                                    item,
                                  ) =>
                                    item.id ===
                                    subjectId,
                                )?.name,
                            )
                            .filter(
                              Boolean,
                            ) as string[]

                        return (
                          <div
                            key={`${assignment.teacherId}-${index}`}
                            className="rounded-lg border p-3"
                          >
                            <div className="flex items-center gap-2">
                              <UserRound className="size-4 text-primary" />

                              <span className="font-medium">
                                {teacher?.name ??
                                  assignment.teacherId}
                              </span>
                            </div>

                            <p className="mt-2 text-sm text-muted-foreground">
                              المواد:{' '}
                              {assignedSubjects.length >
                              0
                                ? assignedSubjects.join(
                                    '، ',
                                  )
                                : 'لا توجد مادة مسجلة'}
                            </p>
                          </div>
                        )
                      },
                    )}
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    downloadCourseExcel(
                      selectedSummaryCourse,
                    )
                  }
                  disabled={
                    exportingExcel ||
                    summaryLoading
                  }
                >
                  <Download className="size-4" />

                  {exportingExcel
                    ? 'جاري تجهيز Excel...'
                    : 'تنزيل Excel الكامل'}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedSummaryCourse(
                      null,
                    )
                    setSummaryData(null)
                  }}
                  disabled={
                    exportingExcel
                  }
                >
                  إغلاق
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
