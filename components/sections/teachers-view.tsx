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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { academicGrades, students, teachers } from '@/lib/data'

type TeacherStudentMap = Record<string, string[]>

type AttendanceStatus =
  | 'لم يسجل'
  | 'حاضر'
  | 'غائب'
  | 'متأخر'
  | 'مستأذن'

type AttendanceMap = Record<string, AttendanceStatus>

type NewTeacher = {
  name: string
  subject: string
}

const todayLabel = new Intl.DateTimeFormat('ar-BH', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(new Date())

export function TeachersView() {
  const [teacherList, setTeacherList] = useState(teachers)

  const [teacherStudents, setTeacherStudents] =
    useState<TeacherStudentMap>({
      'TCH-301': ['1'],
      'TCH-302': ['2'],
      'TCH-303': ['3'],
      'TCH-304': [],
      'TCH-305': [],
      'TCH-306': ['4'],
    })

  const [attendance, setAttendance] = useState<AttendanceMap>({
    '1': 'حاضر',
    '2': 'لم يسجل',
    '3': 'غائب',
    '4': 'لم يسجل',
  })

  const [search, setSearch] = useState('')
  const [selectedTeacherId, setSelectedTeacherId] =
    useState<string | null>(null)

  const [activePanel, setActivePanel] = useState<
    'students' | 'addStudents' | 'attendance'
  >('students')

  const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false)
  const [isTransferOpen, setIsTransferOpen] = useState(false)

  const [selectedGrade, setSelectedGrade] = useState('')
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])

  const [transferStudentId, setTransferStudentId] =
    useState<string | null>(null)

  const [transferTeacherId, setTransferTeacherId] = useState('')

  const [newTeacher, setNewTeacher] = useState<NewTeacher>({
    name: '',
    subject: '',
  })

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
    ? teacherStudents[selectedTeacherId] ?? []
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

      const assignedToAnotherTeacher = Object.entries(
        teacherStudents,
      ).some(
        ([teacherId, studentIds]) =>
          teacherId !== selectedTeacherId &&
          studentIds.includes(student.id),
      )

      return !assignedToAnotherTeacher
    })
  }, [selectedGrade, selectedTeacherId, teacherStudents])

  const getStudentCount = (teacherId: string) => {
    return teacherStudents[teacherId]?.length ?? 0
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

      return [...current, studentId]
    })
  }

  const saveStudents = () => {
    if (!selectedTeacherId || selectedStudentIds.length === 0) {
      return
    }

    setTeacherStudents((current) => {
      const updated = { ...current }

      Object.keys(updated).forEach((teacherId) => {
        updated[teacherId] = (updated[teacherId] ?? []).filter(
          (studentId) => !selectedStudentIds.includes(studentId),
        )
      })

      updated[selectedTeacherId] = [
        ...(updated[selectedTeacherId] ?? []),
        ...selectedStudentIds,
      ]

      return updated
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
      const updated = { ...current }

      Object.keys(updated).forEach((teacherId) => {
        updated[teacherId] = (updated[teacherId] ?? []).filter(
          (studentId) => studentId !== transferStudentId,
        )
      })

      updated[transferTeacherId] = [
        ...(updated[transferTeacherId] ?? []),
        transferStudentId,
      ]

      return updated
    })

    setTransferStudentId(null)
    setTransferTeacherId('')
    setIsTransferOpen(false)
  }

  const updateAttendance = (
    studentId: string,
    status: AttendanceStatus,
  ) => {
    setAttendance((current) => ({
      ...current,
      [studentId]: status,
    }))
  }

  const addTeacher = () => {
    if (!newTeacher.name.trim() || !newTeacher.subject.trim()) {
      return
    }

    const numbers = teacherList.map((teacher) => {
      const number = Number(teacher.id.replace('TCH-', ''))

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
      [id]: [],
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="المعلمون"
        description={`${teacherList.length} معلماً ومعلمة ضمن هيئة التدريس`}
        action={
          <Button onClick={() => setIsAddTeacherOpen(true)}>
            <UserPlus className="size-4" />
            إضافة معلم
          </Button>
        }
      />

      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
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
                    عدد الطلاب
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredTeachers.map((teacher) => {
                  const teacherStudentIds =
                    teacherStudents[teacher.id] ?? []

                  const teacherGrades = Array.from(
                    new Set(
                      students
                        .filter((student) =>
                          teacherStudentIds.includes(student.id),
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
                onClick={() => setIsAddTeacherOpen(false)}
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
                  onClick={() => setIsAddTeacherOpen(false)}
                >
                  إلغاء
                </Button>

                <Button onClick={addTeacher}>حفظ</Button>
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

            <div className="border-b px-4 py-3 sm:px-6">
              <div className="flex gap-2 overflow-x-auto">
                <Button
                  variant={
                    activePanel === 'students'
                      ? 'default'
                      : 'outline'
                  }
                  onClick={() => setActivePanel('students')}
                  className="shrink-0"
                >
                  الطلاب
                </Button>

                <Button
                  variant={
                    activePanel === 'attendance'
                      ? 'default'
                      : 'outline'
                  }
                  onClick={() => setActivePanel('attendance')}
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
                        طلاب المعلم
                      </h3>

                      <p className="text-sm text-muted-foreground">
                        إدارة الطلاب وتوزيعهم
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
                        أضف الطلاب حسب المستوى الأكاديمي.
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
                          {assignedStudents.map((student) => (
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
                                    openTransfer(student.id)
                                  }
                                >
                                  <ArrowLeftRight className="size-4" />
                                  نقل
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activePanel === 'addStudents' && (
                <div className="mx-auto max-w-3xl space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">
                        إضافة طلاب
                      </h3>

                      <p className="text-sm text-muted-foreground">
                        اختر المستوى ثم حدد الطلاب المطلوب
                        إضافتهم.
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
                        setSelectedGrade(event.target.value)
                        setSelectedStudentIds([])
                      }}
                      className="h-11 w-full rounded-md border bg-background px-3 text-sm outline-none"
                    >
                      <option value="">
                        اختر المستوى
                      </option>

                      {academicGrades.map((grade) => (
                        <option key={grade} value={grade}>
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
                          تم تحديد {selectedStudentIds.length}
                        </span>
                      </div>

                      {availableStudents.length === 0 ? (
                        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                          لا يوجد طلاب متاحون لهذا المستوى.
                        </div>
                      ) : (
                        <div className="overflow-hidden rounded-lg border">
                          {availableStudents.map((student) => {
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
                                    toggleStudent(student.id)
                                  }
                                  className="size-4"
                                />

                                <div className="min-w-0">
                                  <p className="font-medium">
                                    {student.name}
                                  </p>

                                  <p className="text-xs text-muted-foreground">
                                    {student.personalId}
                                  </p>
                                </div>
                              </label>
                            )
                          })}
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
                      disabled={selectedStudentIds.length === 0}
                    >
                      حفظ
                    </Button>
                  </div>
                </div>
              )}

              {activePanel === 'attendance' && (
                <div className="mx-auto max-w-3xl space-y-5">
                  <div>
                    <h3 className="text-lg font-semibold">
                      الحضور والغياب
                    </h3>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {todayLabel}
                    </p>
                  </div>

                  {assignedStudents.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
                      لا يوجد طلاب لتسجيل الحضور.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {assignedStudents.map((student) => {
                        const currentStatus =
                          attendance[student.id] ?? 'لم يسجل'

                        const statuses: AttendanceStatus[] = [
                          'حاضر',
                          'غائب',
                          'متأخر',
                          'مستأذن',
                        ]

                        return (
                          <div
                            key={student.id}
                            className="rounded-lg border p-3 sm:p-4"
                          >
                            <div className="mb-3">
                              <p className="font-medium">
                                {student.name}
                              </p>

                              <p className="text-xs text-muted-foreground">
                                {student.grade}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                              {statuses.map((status) => (
                                <button
                                  key={status}
                                  type="button"
                                  onClick={() =>
                                    updateAttendance(
                                      student.id,
                                      status,
                                    )
                                  }
                                  className={`min-h-11 rounded-md border px-3 py-2 text-sm font-medium transition ${getAttendanceClass(
                                    currentStatus,
                                    status,
                                  )}`}
                                >
                                  {currentStatus === status && (
                                    <Check className="ml-1 inline-block size-4" />
                                  )}

                                  {status}
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isTransferOpen && transferStudentId && selectedTeacher && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>نقل الطالب</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                سيتم إزالة الطالب من{' '}
                <span className="font-medium text-foreground">
                  {selectedTeacher.name}
                </span>{' '}
                وتعيينه للمعلم الجديد.
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
                    setTransferTeacherId(event.target.value)
                  }
                  className="h-11 w-full rounded-md border bg-background px-3 text-sm outline-none"
                >
                  <option value="">اختر المعلم</option>

                  {teacherList
                    .filter(
                      (teacher) =>
                        teacher.id !== selectedTeacher.id,
                    )
                    .map((teacher) => (
                      <option
                        key={teacher.id}
                        value={teacher.id}
                      >
                        {teacher.name} — {teacher.subject}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setIsTransferOpen(false)}
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

