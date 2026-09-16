'use client'

import { useMemo, useState } from 'react'
import {
  ArrowLeftRight,
  Check,
  Plus,
  Search,
  UserPlus,
  X,
} from 'lucide-react'

import { PageHeader } from '@/components/dashboard/page-header'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  academicGrades,
  students,
  teachers,
} from '@/lib/data'

type Course = {
  id: string
  name: string
  startDate: string
  endDate: string
  days: string[]
}

type TeacherStudentMap = Record<string, string[]>

type TeacherStudentsByCourse = Record<
  string,
  TeacherStudentMap
>

type AttendanceStatus =
  | 'لم يسجل'
  | 'حاضر'
  | 'غائب'
  | 'متأخر'
  | 'مستأذن'

type AttendanceSession = {
  id: string
  courseId: string
  date: string
  cancelled: boolean
}

type AttendanceRecord = {
  sessionId: string
  courseId: string
  studentId: string
  status: AttendanceStatus
}

type AttendanceNotes = Record<string, string>

type NewTeacher = {
  name: string
  subject: string
}

const courses: Course[] = [
  {
    id: 'course-1',
    name: 'الدورة الأولى',
    startDate: '01/09/2026',
    endDate: '30/11/2026',
    days: ['الأحد', 'الثلاثاء', 'الخميس'],
  },
  {
    id: 'course-2',
    name: 'الدورة الثانية',
    startDate: '01/12/2026',
    endDate: '28/02/2027',
    days: ['الأحد', 'الثلاثاء', 'الخميس'],
  },
]

const currentCourse = courses[0]

export function TeachersView() {
  const [teacherList, setTeacherList] = useState(teachers)

  /*
   * الطلاب الأساسيون للمعلمين.
   *
   * التوزيع مرتبط بالدورة داخليًا،
   * لكن واجهة المعلم تعرض طلابه فقط.
   */
  const [teacherStudents, setTeacherStudents] =
    useState<TeacherStudentsByCourse>({
      'course-1': {
        'TCH-301': ['1'],
        'TCH-302': ['2'],
        'TCH-303': ['3'],
        'TCH-304': [],
        'TCH-305': [],
        'TCH-306': ['4'],
      },

      'course-2': {
        'TCH-301': [],
        'TCH-302': [],
        'TCH-303': [],
        'TCH-304': [],
        'TCH-305': [],
        'TCH-306': [],
      },
    })

  /*
   * الجلسات الفعلية للدورة الحالية.
   *
   * الجلسة الملغاة لا تدخل في نسبة الحضور.
   */
  const [attendanceSessions] = useState<
    AttendanceSession[]
  >([
    {
      id: 'session-1',
      courseId: 'course-1',
      date: '2026-09-01',
      cancelled: false,
    },
    {
      id: 'session-2',
      courseId: 'course-1',
      date: '2026-09-03',
      cancelled: false,
    },
    {
      id: 'session-3',
      courseId: 'course-1',
      date: '2026-09-06',
      cancelled: false,
    },
    {
      id: 'session-4',
      courseId: 'course-1',
      date: '2026-09-08',
      cancelled: true,
    },
  ])

  /*
   * سجل الحضور التاريخي.
   *
   * حاضر + متأخر + مستأذن = حضور.
   * غائب = لا يحسب حضورًا.
   */
  const [attendanceRecords, setAttendanceRecords] =
    useState<AttendanceRecord[]>([
      {
        sessionId: 'session-1',
        courseId: 'course-1',
        studentId: '1',
        status: 'حاضر',
      },
      {
        sessionId: 'session-2',
        courseId: 'course-1',
        studentId: '1',
        status: 'متأخر',
      },
      {
        sessionId: 'session-3',
        courseId: 'course-1',
        studentId: '1',
        status: 'مستأذن',
      },
      {
        sessionId: 'session-1',
        courseId: 'course-1',
        studentId: '2',
        status: 'غائب',
      },
      {
        sessionId: 'session-2',
        courseId: 'course-1',
        studentId: '2',
        status: 'حاضر',
      },
    ])

  /*
   * الملاحظات مرتبطة بالجلسة + الطالب.
   *
   * مثال:
   * session-1:1
   * session-2:1
   *
   * حتى لو عدلنا ملاحظة أحمد في يوم،
   * لا تتغير ملاحظته في يوم آخر.
   */
  const [attendanceNotes, setAttendanceNotes] =
    useState<AttendanceNotes>({
      'session-1:1': '',
      'session-1:2': '',
      'session-1:3': '',
      'session-1:4': '',

      'session-2:1': '',
      'session-2:2': '',
      'session-2:3': '',
      'session-2:4': '',

      'session-3:1': '',
      'session-3:2': '',
      'session-3:3': '',
      'session-3:4': '',
    })

  const [search, setSearch] = useState('')

  const [selectedTeacherId, setSelectedTeacherId] =
    useState<string | null>(null)

  const [activePanel, setActivePanel] = useState<
    'students' | 'addStudents' | 'attendance'
  >('students')

  const [isAddTeacherOpen, setIsAddTeacherOpen] =
    useState(false)

  const [isTransferOpen, setIsTransferOpen] =
    useState(false)

  const [selectedGrade, setSelectedGrade] =
    useState('')

  const [selectedStudentIds, setSelectedStudentIds] =
    useState<string[]>([])

  const [transferStudentId, setTransferStudentId] =
    useState<string | null>(null)

  const [transferTeacherId, setTransferTeacherId] =
    useState('')

  const [newTeacher, setNewTeacher] =
    useState<NewTeacher>({
      name: '',
      subject: '',
    })

  /*
   * إذا كانت null:
   * المعلم في الحضور الحالي.
   *
   * إذا فيها sessionId:
   * المعلم يعدل يومًا سابقًا من الأرشيف.
   */
  const [
    selectedAttendanceSessionId,
    setSelectedAttendanceSessionId,
  ] = useState<string | null>(null)

  const currentTeacherStudents =
    teacherStudents[currentCourse.id] ?? {}

  const filteredTeachers = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return teacherList
    }

    return teacherList.filter(
      (teacher) =>
        teacher.name.toLowerCase().includes(query) ||
        teacher.subject.toLowerCase().includes(query),
    )
  }, [search, teacherList])

  const selectedTeacher = teacherList.find(
    (teacher) => teacher.id === selectedTeacherId,
  )

  const assignedStudentIds = selectedTeacherId
    ? currentTeacherStudents[selectedTeacherId] ?? []
    : []

  const assignedStudents = useMemo(() => {
    return students.filter((student) =>
      assignedStudentIds.includes(student.id),
    )
  }, [assignedStudentIds])

  const availableStudents = useMemo(() => {
    if (!selectedGrade) {
      return []
    }

    return students.filter((student) => {
      if (student.grade !== selectedGrade) {
        return false
      }

      const assignedToAnotherTeacher =
        Object.entries(currentTeacherStudents).some(
          ([teacherId, studentIds]) =>
            teacherId !== selectedTeacherId &&
            studentIds.includes(student.id),
        )

      return !assignedToAnotherTeacher
    })
  }, [
    selectedGrade,
    selectedTeacherId,
    currentTeacherStudents,
  ])

  const getStudentCount = (teacherId: string) => {
    return currentTeacherStudents[teacherId]?.length ?? 0
  }

  const openTeacher = (teacherId: string) => {
    setSelectedTeacherId(teacherId)
    setActivePanel('students')
    setIsTransferOpen(false)
    setSelectedAttendanceSessionId(null)
  }

  const closeTeacher = () => {
    setSelectedTeacherId(null)
    setActivePanel('students')
    setSelectedGrade('')
    setSelectedStudentIds([])
    setIsTransferOpen(false)
    setTransferStudentId(null)
    setTransferTeacherId('')
    setSelectedAttendanceSessionId(null)
  }

  const openAddStudents = () => {
    setSelectedGrade('')
    setSelectedStudentIds([])
    setActivePanel('addStudents')
  }

  const toggleStudent = (studentId: string) => {
    setSelectedStudentIds((current) => {
      if (current.includes(studentId)) {
        return current.filter((id) => id !== studentId)
      }

      return [...current, studentId]
    })
  }

  const saveStudents = () => {
    if (
      !selectedTeacherId ||
      selectedStudentIds.length === 0
    ) {
      return
    }

    setTeacherStudents((current) => {
      const courseMap = {
        ...(current[currentCourse.id] ?? {}),
      }

      Object.keys(courseMap).forEach((teacherId) => {
        courseMap[teacherId] = (
          courseMap[teacherId] ?? []
        ).filter(
          (studentId) =>
            !selectedStudentIds.includes(studentId),
        )
      })

      courseMap[selectedTeacherId] = Array.from(
        new Set([
          ...(courseMap[selectedTeacherId] ?? []),
          ...selectedStudentIds,
        ]),
      )

      return {
        ...current,
        [currentCourse.id]: courseMap,
      }
    })

    setSelectedStudentIds([])
    setSelectedGrade('')
    setActivePanel('students')
  }

  const openTransfer = (studentId: string) => {
    setTransferStudentId(studentId)
    setTransferTeacherId('')
    setIsTransferOpen(true)
  }

  const saveTransfer = () => {
    if (
      !selectedTeacherId ||
      !transferStudentId ||
      !transferTeacherId ||
      selectedTeacherId === transferTeacherId
    ) {
      return
    }

    setTeacherStudents((current) => {
      const courseMap = {
        ...(current[currentCourse.id] ?? {}),
      }

      Object.keys(courseMap).forEach((teacherId) => {
        courseMap[teacherId] = (
          courseMap[teacherId] ?? []
        ).filter(
          (studentId) =>
            studentId !== transferStudentId,
        )
      })

      courseMap[transferTeacherId] = Array.from(
        new Set([
          ...(courseMap[transferTeacherId] ?? []),
          transferStudentId,
        ]),
      )

      return {
        ...current,
        [currentCourse.id]: courseMap,
      }
    })

    setTransferStudentId(null)
    setTransferTeacherId('')
    setIsTransferOpen(false)
  }

  /*
   * آخر جلسة فعلية قابلة لتسجيل الحضور.
   *
   * الجلسة الملغاة لا تستخدم.
   */
  const currentAttendanceSession =
    [...attendanceSessions]
      .reverse()
      .find(
        (session) =>
          session.courseId === currentCourse.id &&
          !session.cancelled,
      ) ?? null

  /*
   * الجلسة التي يعرضها جدول الحضور حاليًا.
   *
   * null = الجلسة الحالية.
   * sessionId = يوم قديم يتم تعديله من الأرشيف.
   */
  const displayedAttendanceSession =
    selectedAttendanceSessionId
      ? attendanceSessions.find(
          (session) =>
            session.id === selectedAttendanceSessionId &&
            session.courseId === currentCourse.id,
        ) ?? null
      : currentAttendanceSession

  /*
   * تعديل حالة حضور طالب في جلسة محددة.
   */
  const updateAttendance = (
    studentId: string,
    status: AttendanceStatus,
    sessionId?: string,
  ) => {
    const targetSessionId =
      sessionId ?? displayedAttendanceSession?.id

    if (
      !targetSessionId ||
      status === 'لم يسجل'
    ) {
      return
    }

    const targetSession =
      attendanceSessions.find(
        (session) => session.id === targetSessionId,
      )

    if (!targetSession || targetSession.cancelled) {
      return
    }

    setAttendanceRecords((current) => {
      const existingIndex = current.findIndex(
        (record) =>
          record.sessionId === targetSessionId &&
          record.courseId === currentCourse.id &&
          record.studentId === studentId,
      )

      if (existingIndex === -1) {
        return [
          ...current,
          {
            sessionId: targetSessionId,
            courseId: currentCourse.id,
            studentId,
            status,
          },
        ]
      }

      const next = [...current]

      next[existingIndex] = {
        ...next[existingIndex],
        status,
      }

      return next
    })
  }

  /*
   * تعديل ملاحظة لطالب في جلسة محددة.
   */
  const updateAttendanceNote = (
    studentId: string,
    value: string,
    sessionId?: string,
  ) => {
    const targetSessionId =
      sessionId ?? displayedAttendanceSession?.id

    if (!targetSessionId) {
      return
    }

    const key = `${targetSessionId}:${studentId}`

    setAttendanceNotes((current) => ({
      ...current,
      [key]: value,
    }))
  }

  /*
   * جلب حالة طالب في جلسة محددة.
   */
  const getSessionStatus = (
    studentId: string,
    sessionId: string | null,
  ) => {
    if (!sessionId) {
      return 'لم يسجل' as AttendanceStatus
    }

    return (
      attendanceRecords.find(
        (record) =>
          record.sessionId === sessionId &&
          record.courseId === currentCourse.id &&
          record.studentId === studentId,
      )?.status ?? 'لم يسجل'
    )
  }

  /*
   * نسبة الطالب في الدورة الحالية.
   *
   * حاضر + متأخر + مستأذن = حضور.
   * غائب = لا يحسب حضورًا.
   *
   * الجلسات الملغاة لا تدخل في المقام.
   */
  const getAttendanceStats = (
    studentId: string,
    courseId: string,
  ) => {
    const actualSessions =
      attendanceSessions.filter(
        (session) =>
          session.courseId === courseId &&
          !session.cancelled,
      )

    const sessionIds = new Set(
      actualSessions.map((session) => session.id),
    )

    const records = attendanceRecords.filter(
      (record) =>
        record.courseId === courseId &&
        record.studentId === studentId &&
        sessionIds.has(record.sessionId),
    )

    const present = records.filter(
      (record) =>
        record.status === 'حاضر' ||
        record.status === 'متأخر' ||
        record.status === 'مستأذن',
    ).length

    const percentage =
      actualSessions.length > 0
        ? (present / actualSessions.length) * 100
        : 0

    return {
      present,
      total: actualSessions.length,
      percentage,
    }
  }

  /*
   * تنسيق تاريخ الجلسة.
   */
  const formatSessionDate = (date: string) => {
    const parsedDate = new Date(`${date}T00:00:00`)

    return new Intl.DateTimeFormat('ar-BH', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(parsedDate)
  }

  /*
   * فتح يوم سابق من الأرشيف.
   */
  const openAttendanceArchive = (
    sessionId: string,
  ) => {
    const session = attendanceSessions.find(
      (item) => item.id === sessionId,
    )

    if (!session || session.cancelled) {
      return
    }

    setSelectedAttendanceSessionId(sessionId)
  }

  /*
   * الرجوع من تعديل اليوم إلى الأرشيف.
   */
  const closeAttendanceArchive = () => {
    setSelectedAttendanceSessionId(null)
  }

  /*
   * حفظ التعديلات.
   *
   * حاليًا البيانات محفوظة مباشرة في local state،
   * لذلك الزر ينهي وضع التعديل ويرجع للأرشيف.
   *
   * عند ربط Supabase لاحقًا:
   * هنا ستكون عملية الحفظ في قاعدة البيانات + Audit.
   */
  const saveAttendanceEdits = () => {
    setSelectedAttendanceSessionId(null)
  }

  const addTeacher = () => {
    if (
      !newTeacher.name.trim() ||
      !newTeacher.subject.trim()
    ) {
      return
    }

    const numbers = teacherList.map((teacher) => {
      const number = Number(
        teacher.id.replace('TCH-', ''),
      )

      return Number.isNaN(number) ? 300 : number
    })

    const nextNumber =
      Math.max(300, ...numbers) + 1

    const id = `TCH-${nextNumber}`

    setTeacherList((current) => [
      ...current,
      {
        id,
        name: newTeacher.name.trim(),
        subject: newTeacher.subject.trim(),
        classes: 0,
        students: 0,
        status: 'دوام كامل',
      },
    ])

    setTeacherStudents((current) => ({
      ...current,
      [currentCourse.id]: {
        ...(current[currentCourse.id] ?? {}),
        [id]: [],
      },
    }))

    setNewTeacher({
      name: '',
      subject: '',
    })

    setIsAddTeacherOpen(false)
  }

  const getAttendanceClass = (
    currentStatus: AttendanceStatus,
    buttonStatus: AttendanceStatus,
  ) => {
    if (currentStatus !== buttonStatus) {
      return 'border-border bg-background text-muted-foreground'
    }

    if (buttonStatus === 'حاضر') {
      return 'border-green-500 bg-green-50 text-green-700'
    }

    if (buttonStatus === 'غائب') {
      return 'border-red-500 bg-red-50 text-red-700'
    }

    if (buttonStatus === 'متأخر') {
      return 'border-amber-500 bg-amber-50 text-amber-700'
    }

    if (buttonStatus === 'مستأذن') {
      return 'border-blue-500 bg-blue-50 text-blue-700'
    }

    return 'border-border bg-background'
  }

  const formatPercentage = (value: number) =>
    `${value.toFixed(1)}%`

  /*
   * الأرشيف لهذه الدورة فقط.
   *
   * الجلسة الحالية لا نكررها في الأرشيف.
   */
  const attendanceArchive = attendanceSessions
    .filter(
      (session) =>
        session.courseId === currentCourse.id &&
        session.id !== currentAttendanceSession?.id,
    )
    .sort((a, b) =>
      b.date.localeCompare(a.date),
    )

  return (
    <div className="space-y-6">
      <PageHeader
        title="المعلمون"
        description={`${teacherList.length} معلماً ومعلمة ضمن هيئة التدريس`}
        action={
          <Button
            onClick={() => setIsAddTeacherOpen(true)}
          >
            <UserPlus className="size-4" />
            إضافة معلم
          </Button>
        }
      />

      {/* الدورة الحالية */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                الدورة الحالية
              </p>

              <h2 className="mt-1 text-lg font-semibold">
                {currentCourse.name}
              </h2>
            </div>

            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-muted px-3 py-1.5">
                {currentCourse.startDate} —{' '}
                {currentCourse.endDate}
              </span>

              <span className="rounded-full bg-muted px-3 py-1.5">
                {currentCourse.days.join(' • ')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

        <input
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="البحث عن معلم..."
          className="h-10 w-full rounded-md border bg-background px-3 pr-9 text-sm outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* قائمة المعلمين */}
      <Card>
        <CardContent className="p-0">
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
                {filteredTeachers.map((teacher) => {
                  const teacherStudentIds =
                    currentTeacherStudents[teacher.id] ?? []

                  const teacherGrades = Array.from(
                    new Set(
                      students
                        .filter((student) =>
                          teacherStudentIds.includes(
                            student.id,
                          ),
                        )
                        .map((student) => student.grade),
                    ),
                  )

                  return (
                    <tr
                      key={teacher.id}
                      onClick={() =>
                        openTeacher(teacher.id)
                      }
                      className="cursor-pointer border-t hover:bg-muted/40"
                    >
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            openTeacher(teacher.id)
                          }}
                          className="font-medium text-primary hover:underline"
                        >
                          {teacher.name}
                        </button>
                      </td>

                      <td className="px-4 py-4">
                        {teacher.subject}
                      </td>

                      <td className="px-4 py-4">
                        {teacherGrades.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {teacherGrades.map(
                              (grade) => (
                                <span
                                  key={grade}
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
                        {getStudentCount(teacher.id)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filteredTeachers.length === 0 && (
            <div className="p-10 text-center text-sm text-muted-foreground">
              لا توجد نتائج مطابقة.
            </div>
          )}
        </CardContent>
      </Card>

      {/* إضافة معلم */}
      {isAddTeacherOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>إضافة معلم</CardTitle>

              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  setIsAddTeacherOpen(false)
                }
              >
                <X className="size-4" />
              </Button>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  اسم المعلم
                </label>

                <input
                  value={newTeacher.name}
                  onChange={(event) =>
                    setNewTeacher((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="مثال: أ. أحمد محمد"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  المادة
                </label>

                <input
                  value={newTeacher.subject}
                  onChange={(event) =>
                    setNewTeacher((current) => ({
                      ...current,
                      subject: event.target.value,
                    }))
                  }
                  placeholder="مثال: الرياضيات"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    setIsAddTeacherOpen(false)
                  }
                >
                  إلغاء
                </Button>

                <Button onClick={addTeacher}>
                  حفظ
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
                  {selectedTeacher.subject} ·{' '}
                  {getStudentCount(selectedTeacher.id)} طالب
                </p>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={closeTeacher}
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
                    {currentCourse.name}
                  </p>
                </div>

                <span className="rounded-full bg-background px-3 py-1.5 text-sm">
                  {currentCourse.startDate} —{' '}
                  {currentCourse.endDate}
                </span>

                <span className="rounded-full bg-background px-3 py-1.5 text-sm">
                  {currentCourse.days.join(' • ')}
                </span>
              </div>
            </div>

            {/* التبويبات */}
            <div className="border-b px-4 py-3 sm:px-6">
              <div className="flex gap-2">
                <Button
                  variant={
                    activePanel === 'students'
                      ? 'default'
                      : 'outline'
                  }
                  onClick={() => {
                    setActivePanel('students')
                    setSelectedAttendanceSessionId(null)
                  }}
                >
                  الطلاب
                </Button>

                <Button
                  variant={
                    activePanel === 'attendance'
                      ? 'default'
                      : 'outline'
                  }
                  onClick={() => {
                    setActivePanel('attendance')
                    setSelectedAttendanceSessionId(null)
                  }}
                >
                  الحضور والغياب
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {/* الطلاب */}
              {activePanel === 'students' && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">
                        طلاب المعلم
                      </h3>

                      <p className="text-sm text-muted-foreground">
                        قائمة الطلاب الأساسيين المسندين لهذا
                        المعلم.
                      </p>
                    </div>

                    <Button onClick={openAddStudents}>
                      <Plus className="size-4" />
                      إضافة طلاب
                    </Button>
                  </div>

                  {assignedStudents.length === 0 ? (
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
                                key={student.id}
                                className="border-t"
                              >
                                <td className="px-4 py-3 font-medium">
                                  {student.name}
                                </td>

                                <td className="px-4 py-3">
                                  {student.personalId}
                                </td>

                                <td className="px-4 py-3">
                                  {student.grade}
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

              {/* إضافة طلاب */}
              {activePanel === 'addStudents' && (
                <div className="mx-auto max-w-3xl space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">
                        إضافة طلاب
                      </h3>

                      <p className="text-sm text-muted-foreground">
                        اختر الطلاب من القائمة الأساسية.
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setActivePanel('students')
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
                      value={selectedGrade}
                      onChange={(event) => {
                        setSelectedGrade(
                          event.target.value,
                        )
                        setSelectedStudentIds([])
                      }}
                      className="h-11 w-full rounded-md border bg-background px-3 text-sm outline-none"
                    >
                      <option value="">
                        اختر المستوى
                      </option>

                      {academicGrades.map((grade) => (
                        <option
                          key={grade}
                          value={grade}
                        >
                          {grade}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedGrade && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          الطلاب المتاحون
                        </span>

                        <span className="text-xs text-muted-foreground">
                          تم تحديد{' '}
                          {selectedStudentIds.length}
                        </span>
                      </div>

                      {availableStudents.length === 0 ? (
                        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                          لا يوجد طلاب متاحون لهذا المستوى.
                        </div>
                      ) : (
                        <div className="overflow-hidden rounded-lg border">
                          {availableStudents.map(
                            (student) => {
                              const selected =
                                selectedStudentIds.includes(
                                  student.id,
                                )

                              return (
                                <label
                                  key={student.id}
                                  className="flex cursor-pointer items-center gap-3 border-b p-4 last:border-b-0 hover:bg-muted/30"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() =>
                                      toggleStudent(
                                        student.id,
                                      )
                                    }
                                    className="size-4"
                                  />

                                  <div>
                                    <p className="font-medium">
                                      {student.name}
                                    </p>

                                    <p className="text-xs text-muted-foreground">
                                      {student.personalId}
                                    </p>
                                  </div>
                                </label>
                              )
                            },
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 border-t pt-4">
                    <Button
                      variant="outline"
                      onClick={() =>
                        setActivePanel('students')
                      }
                    >
                      إلغاء
                    </Button>

                    <Button
                      onClick={saveStudents}
                      disabled={
                        selectedStudentIds.length === 0
                      }
                    >
                      حفظ
                    </Button>
                  </div>
                </div>
              )}

              {/* الحضور */}
              {activePanel === 'attendance' && (
                <div className="space-y-6">
                  {/* إذا المعلم يعدل يوم سابق */}
                  {selectedAttendanceSessionId &&
                  displayedAttendanceSession ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            تعديل حضور
                          </p>

                          <h3 className="text-lg font-semibold">
                            {formatSessionDate(
                              displayedAttendanceSession.date,
                            )}
                          </h3>

                          <p className="mt-1 text-sm text-muted-foreground">
                            {currentCourse.name}
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

                      {assignedStudents.length === 0 ? (
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
                                  {currentCourse.name}
                                </th>
                              </tr>
                            </thead>

                            <tbody>
                              {assignedStudents.map(
                                (student) => {
                                  const currentStatus =
                                    getSessionStatus(
                                      student.id,
                                      displayedAttendanceSession.id,
                                    )

                                  const stats =
                                    getAttendanceStats(
                                      student.id,
                                      currentCourse.id,
                                    )

                                  const noteKey = `${displayedAttendanceSession.id}:${student.id}`

                                  const statuses: AttendanceStatus[] =
                                    [
                                      'حاضر',
                                      'غائب',
                                      'متأخر',
                                      'مستأذن',
                                    ]

                                  return (
                                    <tr
                                      key={student.id}
                                      className="border-t"
                                    >
                                      <td className="px-4 py-4">
                                        <p className="font-medium">
                                          {student.name}
                                        </p>

                                        <p className="mt-1 text-xs text-muted-foreground">
                                          {student.grade}
                                        </p>
                                      </td>

                                      <td className="px-4 py-4">
                                        <div className="flex flex-wrap gap-1.5">
                                          {statuses.map(
                                            (status) => (
                                              <button
                                                key={status}
                                                type="button"
                                                onClick={() =>
                                                  updateAttendance(
                                                    student.id,
                                                    status,
                                                    displayedAttendanceSession.id,
                                                  )
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

                                                {status}
                                              </button>
                                            ),
                                          )}
                                        </div>
                                      </td>

                                      <td className="px-4 py-4">
                                        <input
                                          value={
                                            attendanceNotes[
                                              noteKey
                                            ] ?? ''
                                          }
                                          onChange={(
                                            event,
                                          ) =>
                                            updateAttendanceNote(
                                              student.id,
                                              event.target
                                                .value,
                                              displayedAttendanceSession.id,
                                            )
                                          }
                                          placeholder="ملاحظة..."
                                          className="h-9 min-w-[180px] rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                      </td>

                                      <td className="px-4 py-4">
                                        <div className="font-semibold tabular-nums">
                                          {stats.present} /{' '}
                                          {stats.total}{' '}
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

                      <div className="flex justify-end gap-2 border-t pt-4">
                        <Button
                          variant="outline"
                          onClick={
                            closeAttendanceArchive
                          }
                        >
                          إلغاء
                        </Button>

                        <Button
                          onClick={saveAttendanceEdits}
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
                          {currentCourse.name}
                          {currentAttendanceSession
                            ? ` · ${formatSessionDate(
                                currentAttendanceSession.date,
                              )}`
                            : ''}
                        </p>
                      </div>

                      {assignedStudents.length === 0 ? (
                        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
                          لا يوجد طلاب لتسجيل الحضور.
                        </div>
                      ) : currentAttendanceSession ? (
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
                                  {currentCourse.name}
                                </th>
                              </tr>
                            </thead>

                            <tbody>
                              {assignedStudents.map(
                                (student) => {
                                  const currentStatus =
                                    getSessionStatus(
                                      student.id,
                                      currentAttendanceSession.id,
                                    )

                                  const stats =
                                    getAttendanceStats(
                                      student.id,
                                      currentCourse.id,
                                    )

                                  const noteKey = `${currentAttendanceSession.id}:${student.id}`

                                  const statuses: AttendanceStatus[] =
                                    [
                                      'حاضر',
                                      'غائب',
                                      'متأخر',
                                      'مستأذن',
                                    ]

                                  return (
                                    <tr
                                      key={student.id}
                                      className="border-t"
                                    >
                                      {/* اسم الطالب */}
                                      <td className="px-4 py-4">
                                        <p className="font-medium">
                                          {student.name}
                                        </p>

                                        <p className="mt-1 text-xs text-muted-foreground">
                                          {student.grade}
                                        </p>
                                      </td>

                                      {/* الوضع */}
                                      <td className="px-4 py-4">
                                        <div className="flex flex-wrap gap-1.5">
                                          {statuses.map(
                                            (status) => (
                                              <button
                                                key={status}
                                                type="button"
                                                onClick={() =>
                                                  updateAttendance(
                                                    student.id,
                                                    status,
                                                    currentAttendanceSession.id,
                                                  )
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

                                                {status}
                                              </button>
                                            ),
                                          )}
                                        </div>
                                      </td>

                                      {/* الملاحظات */}
                                      <td className="px-4 py-4">
                                        <input
                                          value={
                                            attendanceNotes[
                                              noteKey
                                            ] ?? ''
                                          }
                                          onChange={(
                                            event,
                                          ) =>
                                            updateAttendanceNote(
                                              student.id,
                                              event.target
                                                .value,
                                              currentAttendanceSession.id,
                                            )
                                          }
                                          placeholder="ملاحظة..."
                                          className="h-9 min-w-[180px] rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                      </td>

                                      {/* النسبة */}
                                      <td className="px-4 py-4">
                                        <div className="font-semibold tabular-nums">
                                          {stats.present} /{' '}
                                          {stats.total}{' '}
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
                          لا توجد جلسة حضور حالية.
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
                            {currentCourse.name} فقط.
                          </p>
                        </div>

                        {attendanceArchive.length === 0 ? (
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
                                  (session) => (
                                    <tr
                                      key={session.id}
                                      className="border-t"
                                    >
                                      <td className="px-4 py-4 font-medium">
                                        {formatSessionDate(
                                          session.date,
                                        )}
                                      </td>

                                      <td className="px-4 py-4">
                                        {session.cancelled ? (
                                          <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                                            ملغي
                                          </span>
                                        ) : (
                                          <span className="inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                                            مكتمل
                                          </span>
                                        )}
                                      </td>

                                      <td className="px-4 py-4">
                                        {session.cancelled ? (
                                          <span className="text-sm text-muted-foreground">
                                            لا يمكن تعديل يوم ملغي
                                          </span>
                                        ) : (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                              openAttendanceArchive(
                                                session.id,
                                              )
                                            }
                                          >
                                            تعديل
                                          </Button>
                                        )}
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
        selectedTeacher && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>نقل الطالب</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  سيتم نقل الطالب من{' '}
                  <span className="font-medium text-foreground">
                    {selectedTeacher.name}
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
                    value={transferTeacherId}
                    onChange={(event) =>
                      setTransferTeacherId(
                        event.target.value,
                      )
                    }
                    className="h-11 w-full rounded-md border bg-background px-3 text-sm outline-none"
                  >
                    <option value="">
                      اختر المعلم
                    </option>

                    {teacherList
                      .filter(
                        (teacher) =>
                          teacher.id !==
                          selectedTeacher.id,
                      )
                      .map((teacher) => (
                        <option
                          key={teacher.id}
                          value={teacher.id}
                        >
                          {teacher.name} —{' '}
                          {teacher.subject}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setIsTransferOpen(false)
                    }
                  >
                    إلغاء
                  </Button>

                  <Button
                    onClick={saveTransfer}
                    disabled={!transferTeacherId}
                  >
                    <ArrowLeftRight className="size-4" />
                    تأكيد النقل
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
    </div>
  )
}
