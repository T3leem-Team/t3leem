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

type AttendanceMap = Record<
string,
AttendanceStatus

>

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

/*

* الدورة الحالية.
*
* لاحقًا لن تكون مكتوبة هنا، وإنما ستأتي من Supabase
* حسب السنة الدراسية والتاريخ الحالي.
  */
  const currentCourse = courses[0]

const todayLabel = new Intl.DateTimeFormat('ar-BH', {
weekday: 'long',
day: 'numeric',
month: 'long',
year: 'numeric',
}).format(new Date())

export function TeachersView() {
const [teacherList, setTeacherList] = useState(teachers)

/*

* التوزيع مرتبط بالدورة.
*
* كل دورة تبدأ بتوزيع مستقل.
* لا يوجد أي نسخ تلقائي من الدورة السابقة.
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

* حالة اليوم فقط.
*
* لاحقًا سيصبح السجل اليومي جزءًا من
* attendance_records في Supabase.
  */
  const [attendance, setAttendance] =
  useState<AttendanceMap>({
  'course-1:1': 'حاضر',
  'course-1:2': 'لم يسجل',
  'course-1:3': 'غائب',
  'course-1:4': 'لم يسجل',
  })

/*

* جلسات الحضور الفعلية.
*
* الجلسة الملغاة لا تدخل في نسبة الحضور.
*
* هذه بيانات تجريبية مؤقتة، وستأتي لاحقًا
* من Supabase.
  */
  const [attendanceSessions] =
  useState<AttendanceSession[]>([
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
* غائب = غياب.
  */
  const [attendanceRecords] =
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

const [search, setSearch] = useState('')

const [selectedTeacherId, setSelectedTeacherId] =
useState<string | null>(null)

const [activePanel, setActivePanel] = useState<
'students' | 'addStudents' | 'attendance' | 'courseStudents'

> ('students')

const [isAddTeacherOpen, setIsAddTeacherOpen] =
useState(false)

const [isTransferOpen, setIsTransferOpen] =
useState(false)

const [selectedGrade, setSelectedGrade] = useState('')

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

const currentTeacherStudents =
teacherStudents[currentCourse.id] ?? {}

const filteredTeachers = useMemo(() => {
const query = search.trim().toLowerCase()

```
if (!query) {
  return teacherList
}

return teacherList.filter(
  (teacher) =>
    teacher.name.toLowerCase().includes(query) ||
    teacher.subject.toLowerCase().includes(query),
)
```

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

const currentCourseStudentIds = useMemo(() => {
return Array.from(
new Set(
Object.values(currentTeacherStudents).flat(),
),
)
}, [currentTeacherStudents])

const currentCourseStudents = useMemo(() => {
return students.filter((student) =>
currentCourseStudentIds.includes(student.id),
)
}, [currentCourseStudentIds])

const notInCurrentCourseStudents = useMemo(() => {
return students.filter(
(student) =>
!currentCourseStudentIds.includes(student.id),
)
}, [currentCourseStudentIds])

const getStudentHistory = (studentId: string) => {
return courses
.filter((course) => course.id !== currentCourse.id)
.map((course) => {
const courseTeacherMap =
teacherStudents[course.id] ?? {}

```
    const teacherId = Object.entries(
      courseTeacherMap,
    ).find(([, studentIds]) =>
      studentIds.includes(studentId),
    )?.[0]

    if (!teacherId) {
      return null
    }

    const teacher = teacherList.find(
      (item) => item.id === teacherId,
    )

    if (!teacher) {
      return null
    }

    return {
      course,
      teacher,
    }
  })
  .filter(
    (
      item,
    ): item is {
      course: Course
      teacher: (typeof teacherList)[number]
    } => Boolean(item),
  )
```

}

const availableStudents = useMemo(() => {
if (!selectedGrade) {
return []
}

```
return students.filter((student) => {
  if (student.grade !== selectedGrade) {
    return false
  }

  const assignedToAnotherTeacher = Object.entries(
    currentTeacherStudents,
  ).some(
    ([teacherId, studentIds]) =>
      teacherId !== selectedTeacherId &&
      studentIds.includes(student.id),
  )

  return !assignedToAnotherTeacher
})
```

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
}

const closeTeacher = () => {
setSelectedTeacherId(null)
setActivePanel('students')
setSelectedGrade('')
setSelectedStudentIds([])
setIsTransferOpen(false)
setTransferStudentId(null)
setTransferTeacherId('')
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

```
  return [...current, studentId]
})
```

}

const saveStudents = () => {
if (
!selectedTeacherId ||
selectedStudentIds.length === 0
) {
return
}

```
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
```

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

```
setTeacherStudents((current) => {
  const courseMap = {
    ...(current[currentCourse.id] ?? {}),
  }

  Object.keys(courseMap).forEach((teacherId) => {
    courseMap[teacherId] = (
      courseMap[teacherId] ?? []
    ).filter(
      (studentId) => studentId !== transferStudentId,
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
```

}

const updateAttendance = (
studentId: string,
status: AttendanceStatus,
) => {
const attendanceKey = `${currentCourse.id}:${studentId}`

```
setAttendance((current) => ({
  ...current,
  [attendanceKey]: status,
}))
```

}

const addTeacher = () => {
if (
!newTeacher.name.trim() ||
!newTeacher.subject.trim()
) {
return
}

```
const numbers = teacherList.map((teacher) => {
  const number = Number(
    teacher.id.replace('TCH-', ''),
  )

  return Number.isNaN(number) ? 300 : number
})

const nextNumber = Math.max(300, ...numbers) + 1
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
```

}

const getAttendanceClass = (
currentStatus: AttendanceStatus,
buttonStatus: AttendanceStatus,
) => {
if (currentStatus !== buttonStatus) {
return 'border-border bg-background text-muted-foreground'
}

```
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
```

}

/*

* حساب تفاصيل حضور طالب في دورة معينة.
*
* حاضر + متأخر + مستأذن = حضور.
* غائب = غياب.
* الجلسات الملغاة لا تدخل في المقام.
  */
  const getAttendanceStats = (
  studentId: string,
  courseId: string,
  ) => {
  const courseSessions = attendanceSessions.filter(
  (session) =>
  session.courseId === courseId &&
  !session.cancelled,
  )

```
const records = attendanceRecords.filter(
```

```
  (record) =>
    record.courseId === courseId &&
    record.studentId === studentId &&
    courseSessions.some(
      (session) => session.id === record.sessionId,
    ),
)

const present = records.filter(
  (record) =>
    record.status === 'حاضر' ||
    record.status === 'متأخر' ||
    record.status === 'مستأذن',
).length

const absent = records.filter(
  (record) => record.status === 'غائب',
).length

const late = records.filter(
  (record) => record.status === 'متأخر',
).length

const excused = records.filter(
  (record) => record.status === 'مستأذن',
).length

const actualSessions = courseSessions.length

const cancelledSessions =
  attendanceSessions.filter(
    (session) =>
      session.courseId === courseId &&
      session.cancelled,
  ).length

const percentage =
  actualSessions > 0
    ? (present / actualSessions) * 100
    : 0

return {
  present,
  absent,
  late,
  excused,
  actualSessions,
  cancelledSessions,
  percentage,
}
```

}

/*

* النسبة السنوية.
*
* فقط الدورات التي تم توزيع الطالب فيها تدخل بالحساب.
* لا يتم أخذ متوسط نسب الدورات.
  */
  const getAnnualAttendanceStats = (
  studentId: string,
  ) => {
  let totalPresent = 0
  let totalSessions = 0

```
courses.forEach((course) => {
```

```
  const courseStudentIds = Object.values(
    teacherStudents[course.id] ?? {},
  ).flat()

  if (!courseStudentIds.includes(studentId)) {
    return
  }

  const stats = getAttendanceStats(
    studentId,
    course.id,
  )

  totalPresent += stats.present
  totalSessions += stats.actualSessions
})

return {
  present: totalPresent,
  totalSessions,
  percentage:
    totalSessions > 0
      ? (totalPresent / totalSessions) * 100
      : 0,
}
```

}

const formatPercentage = (value: number) =>
`${value.toFixed(1)}%`

return ( <div className="space-y-6">
<PageHeader
title="المعلمون"
description={`${teacherList.length} معلماً ومعلمة ضمن هيئة التدريس`}
action={
<Button onClick={() => setIsAddTeacherOpen(true)}> <UserPlus className="size-4" />
إضافة معلم </Button>
}
/>

```
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

  {/* ملخص الدورة */}
  <div className="grid gap-4 sm:grid-cols-2">
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">
          طلاب الدورة الحالية
        </p>

        <p className="mt-1 text-2xl font-semibold">
          {currentCourseStudents.length}
        </p>

        <p className="mt-1 text-xs text-muted-foreground">
          تم توزيعهم على معلم في هذه الدورة
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">
          لم يحضروا الدورة
        </p>

        <p className="mt-1 text-2xl font-semibold">
          {notInCurrentCourseStudents.length}
        </p>

        <p className="mt-1 text-xs text-muted-foreground">
          طلاب موجودون في القائمة الأساسية ولم يتم
          توزيعهم في الدورة الحالية
        </p>
      </CardContent>
    </Card>
  </div>

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
                طلاب الدورة
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
                  onClick={() => openTeacher(teacher.id)}
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
                        {teacherGrades.map((grade) => (
                          <span
                            key={grade}
                            className="rounded-full bg-muted px-2.5 py-1 text-xs"
                          >
                            {grade}
                          </span>
                        ))}
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
              {' · '}
              {currentCourse.name}
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

        {/* معلومات الدورة */}
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

        <div className="border-b px-4 py-3 sm:px-6">
          <div className="flex gap-2 overflow-x-auto">
            <Button
              variant={
                activePanel === 'students'
                  ? 'default'
                  : 'outline'
              }
              onClick={() =>
                setActivePanel('students')
              }
              className="shrink-0"
            >
              الطلاب
            </Button>

            <Button
              variant={
                activePanel === 'courseStudents'
                  ? 'default'
                  : 'outline'
              }
              onClick={() =>
                setActivePanel('courseStudents')
              }
              className="shrink-0"
            >
              طلاب الدورة الحالية
            </Button>

            <Button
              variant={
                activePanel === 'attendance'
                  ? 'default'
                  : 'outline'
              }
              onClick={() =>
                setActivePanel('attendance')
              }
              className="shrink-0"
            >
              الحضور والغياب
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {activePanel === 'students' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">
                    طلاب المعلم في الدورة الحالية
                  </h3>

                  <p className="text-sm text-muted-foreground">
                    التوزيع مستقل عن الدورات السابقة.
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
                    أضف الطلاب من القائمة الأساسية لهذه
                    الدورة.
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
                          السجل السابق
                        </th>

                        <th className="px-4 py-3 text-right font-medium">
                          إجراء
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {assignedStudents.map(
                        (student) => {
                          const history =
                            getStudentHistory(
                              student.id,
                            )

                          return (
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
                                {history.length > 0 ? (
                                  <div className="space-y-1">
                                    {history.map(
                                      (item) => (
                                        <p
                                          key={
                                            item.course.id
                                          }
                                          className="text-xs text-muted-foreground"
                                        >
                                          {item.course.name}{' '}
                                          →{' '}
                                          {
                                            item.teacher
                                              .name
                                          }
                                        </p>
                                      ),
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    لا يوجد توزيع سابق
                                  </span>
                                )}
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
                          )
                        },
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activePanel === 'courseStudents' && (
            <div className="space-y-5">
              <div>
                <h3 className="font-semibold">
                  طلاب الدورة الحالية
                </h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  هؤلاء هم الطلاب الذين تم توزيعهم على
                  معلم في {currentCourse.name}.
                </p>
              </div>

              {currentCourseStudents.length === 0 ? (
                <div className="rounded-lg border border-dashed p-10 text-center">
                  <p className="font-medium">
                    لا يوجد طلاب مسجلون في الدورة حتى الآن
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    عند إضافة الطالب إلى أي معلم في هذه
                    الدورة سيظهر هنا.
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
                          المستوى
                        </th>

                        <th className="px-4 py-3 text-right font-medium">
                          المعلم
                        </th>

                        <th className="px-4 py-3 text-right font-medium">
                          السجل السابق
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {currentCourseStudents.map(
                        (student) => {
                          const teacherId =
                            Object.entries(
                              currentTeacherStudents,
                            ).find(
                              ([, studentIds]) =>
                                studentIds.includes(
                                  student.id,
                                ),
                            )?.[0]

                          const teacher =
                            teacherList.find(
                              (item) =>
                                item.id === teacherId,
                            )

                          const history =
                            getStudentHistory(
                              student.id,
                            )

                          return (
                            <tr
                              key={student.id}
                              className="border-t"
                            >
                              <td className="px-4 py-3 font-medium">
                                {student.name}
                              </td>

                              <td className="px-4 py-3">
                                {student.grade}
                              </td>

                              <td className="px-4 py-3">
                                {teacher?.name ?? '—'}
                              </td>

                              <td className="px-4 py-3">
                                {history.length > 0 ? (
                                  <div className="space-y-1">
                                    {history.map(
                                      (item) => (
                                        <p
                                          key={
                                            item.course.id
                                          }
                                          className="text-xs text-muted-foreground"
                                        >
                                          {item.course.name}{' '}
                                          →{' '}
                                          {
                                            item.teacher
                                              .name
                                          }
                                        </p>
                                      ),
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    لا يوجد توزيع سابق
                                  </span>
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

              <div className="rounded-lg border bg-muted/20 p-4">
                <p className="font-medium">
                  غير موزعين في الدورة الحالية
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  هؤلاء من قائمة الطلاب الأساسية، لكن لم
                  تتم إضافتهم لأي معلم في هذه الدورة.
                  لذلك لا يدخلون في نسبة حضور هذه الدورة.
                </p>

                <p className="mt-3 text-2xl font-semibold">
                  {notInCurrentCourseStudents.length}
                </p>
              </div>
            </div>
          )}

          {activePanel === 'addStudents' && (
            <div className="mx-auto max-w-3xl space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">
                    إضافة طلاب للدورة الحالية
                  </h3>

                  <p className="text-sm text-muted-foreground">
                    اختر الطلاب من القائمة الأساسية ثم
                    أضفهم إلى هذا المعلم في{' '}
                    {currentCourse.name}.
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

              <div className="rounded-lg border bg-muted/20 p-4">
                <p className="text-sm font-medium">
                  الدورة الحالية
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  {currentCourse.name} ·{' '}
                  {currentCourse.startDate} —{' '}
                  {currentCourse.endDate}
                </p>
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

                          const history =
                            getStudentHistory(
                              student.id,
                            )

                          return (
                            <label
                              key={student.id}
                              className="flex cursor-pointer items-start gap-3 border-b p-4 last:border-b-0 hover:bg-muted/30"
                            >
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() =>
                                  toggleStudent(
                                    student.id,
                                  )
                                }
                                className="mt-1 size-4"
                              />

                              <div className="min-w-0 flex-1">
                                <p className="font-medium">
                                  {student.name}
                                </p>

                                <p className="text-xs text-muted-foreground">
                                  {student.personalId}
                                </p>

                                {history.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {history.map(
                                      (item) => (
                                        <p
                                          key={
                                            item.course.id
                                          }
                                          className="text-xs text-muted-foreground"
                                        >
                                          سبق أن كان مع{' '}
                                          <span className="font-medium text-foreground">
                                            {
                                              item.teacher
                                                .name
                                            }
                                          </span>{' '}
                                          في{' '}
                                          {
                                            item.course
                                              .name
                                          }
                                        </p>
                                      ),
                                    )}
                                  </div>
                                )}
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

          {activePanel === 'attendance' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold">
                  الحضور والغياب
                </h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  {currentCourse.name} · {todayLabel}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  متأخر ومستأذن يحسبان حضورًا، والغياب فقط
                  لا يحسب حضورًا.
                </p>
              </div>

              {assignedStudents.length === 0 ? (
                <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
                  لا يوجد طلاب لتسجيل الحضور.
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
                          الحالة اليوم
                        </th>

                        <th className="px-4 py-3 text-right font-medium">
                          نسبة الحضور
                        </th>

                        <th className="px-4 py-3 text-right font-medium">
                          التفاصيل
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {assignedStudents.map((student) => {
                        const attendanceKey =
                          `${currentCourse.id}:${student.id}`

                        const currentStatus =
                          attendance[attendanceKey] ??
                          'لم يسجل'

                        const stats =
                          getAttendanceStats(
                            student.id,
                            currentCourse.id,
                          )

                        const annualStats =
                          getAnnualAttendanceStats(
                            student.id,
                          )

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
                              <div className="font-semibold tabular-nums">
                                {formatPercentage(
                                  stats.percentage,
                                )}
                              </div>

                              <p className="mt-1 text-xs text-muted-foreground">
                                {stats.present} حضور من{' '}
                                {stats.actualSessions}{' '}
                                جلسة
                              </p>
                            </td>

                            <td className="px-4 py-4">
                              <details>
                                <summary className="cursor-pointer text-sm font-medium text-primary">
                                  عرض التفاصيل
                                </summary>

                                <div className="mt-3 min-w-[260px] rounded-lg border bg-muted/20 p-4">
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                      <p className="text-xs text-muted-foreground">
                                        حاضر
                                      </p>

                                      <p className="mt-1 font-semibold">
                                        {stats.present -
                                          stats.late -
                                          stats.excused}
                                      </p>
                                    </div>

                                    <div>
                                      <p className="text-xs text-muted-foreground">
                                        متأخر
                                      </p>

                                      <p className="mt-1 font-semibold">
                                        {stats.late}
                                      </p>
                                    </div>

                                    <div>
                                      <p className="text-xs text-muted-foreground">
                                        مستأذن
                                      </p>

                                      <p className="mt-1 font-semibold">
                                        {stats.excused}
                                      </p>
                                    </div>

                                    <div>
                                      <p className="text-xs text-muted-foreground">
                                        غائب
                                      </p>

                                      <p className="mt-1 font-semibold">
                                        {stats.absent}
                                      </p>
                                    </div>

                                    <div>
                                      <p className="text-xs text-muted-foreground">
                                        الجلسات الفعلية
                                      </p>

                                      <p className="mt-1 font-semibold">
                                        {stats.actualSessions}
                                      </p>
                                    </div>

                                    <div>
                                      <p className="text-xs text-muted-foreground">
                                        الجلسات الملغاة
                                      </p>

                                      <p className="mt-1 font-semibold">
                                        {stats.cancelledSessions}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="mt-4 border-t pt-4">
                                    <p className="text-xs text-muted-foreground">
                                      نسبة{' '}
                                      {currentCourse.name}
                                    </p>

                                    <p className="mt-1 text-lg font-bold">
                                      {formatPercentage(
                                        stats.percentage,
                                      )}
                                    </p>
                                  </div>

                                  <div className="mt-4 border-t pt-4">
                                    <p className="text-xs text-muted-foreground">
                                      النسبة السنوية
                                    </p>

                                    <p className="mt-1 text-lg font-bold">
                                      {formatPercentage(
                                        annualStats.percentage,
                                      )}
                                    </p>

                                    <p className="mt-1 text-xs text-muted-foreground">
                                      {annualStats.present}{' '}
                                      حضور من{' '}
                                      {annualStats.totalSessions}{' '}
                                      جلسة فعلية
                                    </p>
                                  </div>
                                </div>
                              </details>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )}

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
              إلى المعلم الجديد في{' '}
              <span className="font-medium text-foreground">
                {currentCourse.name}
              </span>
              فقط.
            </p>

            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="font-medium">
                {
                  students.find(
                    (student) =>
                      student.id === transferStudentId,
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
