'use client'

import { useMemo, useState } from 'react'
import {
  ArrowLeftRight,
  ChevronDown,
  Plus,
  Search,
  UserPlus,
  Users,
  X,
} from 'lucide-react'

import { PageHeader } from '@/components/dashboard/page-header'
import { StatusBadge } from '@/components/dashboard/status-badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { students, academicGrades, teachers } from '@/lib/data'

type TeacherStudentMap = Record<string, string[]>

type NewTeacher = {
  name: string
  subject: string
  status: 'دوام كامل' | 'دوام جزئي'
}

export function TeachersView() {
  const [teacherList, setTeacherList] = useState(teachers)

  const [teacherStudents, setTeacherStudents] = useState<TeacherStudentMap>({
    'TCH-301': ['1'],
    'TCH-302': ['2'],
    'TCH-303': ['3'],
    'TCH-304': [],
    'TCH-305': [],
    'TCH-306': ['4'],
  })

  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(
    null,
  )

  const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false)
  const [isAddStudentsOpen, setIsAddStudentsOpen] = useState(false)
  const [isTransferOpen, setIsTransferOpen] = useState(false)

  const [selectedGrade, setSelectedGrade] = useState('')
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [transferStudentId, setTransferStudentId] = useState<string | null>(
    null,
  )
  const [transferTeacherId, setTransferTeacherId] = useState('')

  const [newTeacher, setNewTeacher] = useState<NewTeacher>({
    name: '',
    subject: '',
    status: 'دوام كامل',
  })

  const selectedTeacher = teacherList.find(
    (teacher) => teacher.id === selectedTeacherId,
  )

  const assignedStudentIds = useMemo(() => {
    if (!selectedTeacherId) return []

    return teacherStudents[selectedTeacherId] ?? []
  }, [selectedTeacherId, teacherStudents])

  const assignedStudents = useMemo(() => {
    return students.filter((student) => assignedStudentIds.includes(student.id))
  }, [assignedStudentIds])

  const availableStudents = useMemo(() => {
    if (!selectedGrade) return []

    return students.filter((student) => {
      const assignedToAnotherTeacher = Object.entries(teacherStudents).some(
        ([teacherId, studentIds]) =>
          teacherId !== selectedTeacherId && studentIds.includes(student.id),
      )

      return student.grade === selectedGrade && !assignedToAnotherTeacher
    })
  }, [selectedGrade, selectedTeacherId, teacherStudents])

  const openTeacher = (teacherId: string) => {
    setSelectedTeacherId(teacherId)
    setIsAddStudentsOpen(false)
    setIsTransferOpen(false)
  }

  const closeTeacherDetails = () => {
    setSelectedTeacherId(null)
    setIsAddStudentsOpen(false)
    setIsTransferOpen(false)
  }

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId],
    )
  }

  const openAddStudents = () => {
    setSelectedGrade('')
    setSelectedStudentIds([])
    setIsAddStudentsOpen(true)
  }

  const saveStudents = () => {
    if (!selectedTeacherId || selectedStudentIds.length === 0) return

    setTeacherStudents((current) => {
      const updated = { ...current }

      updated[selectedTeacherId] = Array.from(
        new Set([
          ...(updated[selectedTeacherId] ?? []),
          ...selectedStudentIds,
        ]),
      )

      Object.keys(updated).forEach((teacherId) => {
        if (teacherId !== selectedTeacherId) {
          updated[teacherId] = (updated[teacherId] ?? []).filter(
            (studentId) => !selectedStudentIds.includes(studentId),
          )
        }
      })

      return updated
    })

    setSelectedStudentIds([])
    setSelectedGrade('')
    setIsAddStudentsOpen(false)
  }

  const openTransfer = (studentId: string) => {
    setTransferStudentId(studentId)
    setTransferTeacherId('')
    setIsTransferOpen(true)
  }

  const saveTransfer = () => {
    if (!transferStudentId || !selectedTeacherId || !transferTeacherId) return
    if (transferTeacherId === selectedTeacherId) return

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

  const addTeacher = () => {
    if (!newTeacher.name.trim() || !newTeacher.subject.trim()) return

    const nextNumber = teacherList.length + 301
    const newTeacherId = `TCH-${nextNumber}`

    setTeacherList((current) => [
      ...current,
      {
        id: newTeacherId,
        name: newTeacher.name.trim(),
        subject: newTeacher.subject.trim(),
        classes: 0,
        students: 0,
        status: newTeacher.status,
      },
    ])

    setTeacherStudents((current) => ({
      ...current,
      [newTeacherId]: [],
    }))

    setNewTeacher({
      name: '',
      subject: '',
      status: 'دوام كامل',
    })

    setIsAddTeacherOpen(false)
  }

  const getTeacherStudentCount = (teacherId: string) =>
    teacherStudents[teacherId]?.length ?? 0

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {teacherList.map((teacher) => {
          const initials = teacher.name
            .replace(/^أ\.?\s*/, '')
            .split(' ')
            .slice(0, 2)
            .map((word) => word[0])
            .join(' ')

          const studentCount = getTeacherStudentCount(teacher.id)

          return (
            <Card
              key={teacher.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => openTeacher(teacher.id)}
            >
              <CardHeader className="flex-row items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {initials}
                </span>

                <div className="min-w-0 flex-1 space-y-1">
                  <CardTitle className="truncate text-sm">
                    {teacher.name}
                  </CardTitle>

                  <CardDescription>{teacher.subject}</CardDescription>
                </div>

                <StatusBadge status={teacher.status} />
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">عدد الفصول</span>
                  <span className="font-medium tabular-nums">
                    {teacher.classes}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">عدد الطلاب</span>
                  <span className="font-medium tabular-nums">
                    {studentCount}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground">
                    إدارة الطلاب
                  </span>

                  <span className="text-xs text-muted-foreground tabular-nums">
                    {teacher.id}
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {isAddTeacherOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle>إضافة معلم</CardTitle>
                <CardDescription>
                  أضف بيانات المعلم الأساسية
                </CardDescription>
              </div>

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
                <label className="text-sm font-medium">اسم المعلم</label>
                <input
                  value={newTeacher.name}
                  onChange={(event) =>
                    setNewTeacher((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="مثال: أ. أحمد محمد"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">المادة</label>
                <input
                  value={newTeacher.subject}
                  onChange={(event) =>
                    setNewTeacher((current) => ({
                      ...current,
                      subject: event.target.value,
                    }))
                  }
                  placeholder="مثال: الرياضيات"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">نوع الدوام</label>

                <select
                  value={newTeacher.status}
                  onChange={(event) =>
                    setNewTeacher((current) => ({
                      ...current,
                      status: event.target.value as
                        | 'دوام كامل'
                        | 'دوام جزئي',
                    }))
                  }
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
                >
                  <option value="دوام كامل">دوام كامل</option>
                  <option value="دوام جزئي">دوام جزئي</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setIsAddTeacherOpen(false)}
                >
                  إلغاء
                </Button>

                <Button onClick={addTeacher}>حفظ المعلم</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="max-h-[90vh] w-full max-w-4xl overflow-hidden">
            <CardHeader className="border-b">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>{selectedTeacher.name}</CardTitle>
                  <CardDescription>
                    {selectedTeacher.subject} ·{' '}
                    {getTeacherStudentCount(selectedTeacher.id)} طالب
                  </CardDescription>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeTeacherDetails}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="max-h-[calc(90vh-100px)] overflow-y-auto p-6">
              {!isAddStudentsOpen && !isTransferOpen && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">الطلاب المخصصون</h3>
                      <p className="text-sm text-muted-foreground">
                        الطلاب المسجلون حاليًا لدى هذا المعلم
                      </p>
                    </div>

                    <Button onClick={openAddStudents}>
                      <Plus className="size-4" />
                      إضافة طلاب
                    </Button>
                  </div>

                  {assignedStudents.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-10 text-center">
                      <Users className="mx-auto mb-3 size-8 text-muted-foreground" />
                      <p className="font-medium">لا يوجد طلاب مخصصون</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        استخدم زر إضافة طلاب لتوزيع الطلاب على هذا المعلم.
                      </p>
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
                              className="border-t hover:bg-muted/30"
                            >
                              <td className="px-4 py-3 font-medium">
                                {student.name}
                              </td>
                              <td className="px-4 py-3">
                                {student.personalId}
                              </td>
                              <td className="px-4 py-3">{student.grade}</td>
                              <td className="px-4 py-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openTransfer(student.id)}
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

              {isAddStudentsOpen && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">إضافة طلاب</h3>
                      <p className="text-sm text-muted-foreground">
                        اختر المستوى ثم حدد طالبًا أو أكثر.
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsAddStudentsOpen(false)}
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
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
                    >
                      <option value="">اختر المستوى</option>

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
                          {availableStudents.length} طالب
                        </span>
                      </div>

                      {availableStudents.length === 0 ? (
                        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                          لا يوجد طلاب متاحون لهذا المستوى.
                        </div>
                      ) : (
                        <div className="max-h-80 overflow-y-auto rounded-lg border">
                          {availableStudents.map((student) => {
                            const checked = selectedStudentIds.includes(
                              student.id,
                            )

                            return (
                              <label
                                key={student.id}
                                className="flex cursor-pointer items-center gap-3 border-b p-3 last:border-b-0 hover:bg-muted/30"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() =>
                                    toggleStudentSelection(student.id)
                                  }
                                  className="size-4"
                                />

                                <div className="min-w-0 flex-1">
                                  <p className="font-medium">{student.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {student.personalId} · {student.grade}
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
                      onClick={() => setIsAddStudentsOpen(false)}
                    >
                      إلغاء
                    </Button>

                    <Button
                      onClick={saveStudents}
                      disabled={selectedStudentIds.length === 0}
                    >
                      حفظ الطلاب
                    </Button>
                  </div>
                </div>
              )}

              {isTransferOpen && transferStudentId && (
                <div className="space-y-5">
                  {(() => {
                    const student = students.find(
                      (item) => item.id === transferStudentId,
                    )

                    return (
                      <>
                        <div>
                          <h3 className="font-semibold">نقل الطالب</h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            سيتم إزالة الطالب من هذا المعلم وتعيينه للمعلم
                            الجديد.
                          </p>
                        </div>

                        <div className="rounded-lg border bg-muted/30 p-4">
                          <p className="font-medium">{student?.name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {student?.grade} · {student?.personalId}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            نقل إلى المعلم
                          </label>

                          <select
                            value={transferTeacherId}
                            onChange={(event) =>
                              setTransferTeacherId(event.target.value)
                            }
                            className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
                          >
                            <option value="">اختر المعلم الجديد</option>

                            {teacherList
                              .filter(
                                (teacher) =>
                                  teacher.id !== selectedTeacherId,
                              )
                              .map((teacher) => (
                                <option key={teacher.id} value={teacher.id}>
                                  {teacher.name} — {teacher.subject}
                                </option>
                              ))}
                          </select>
                        </div>

                        <div className="flex justify-end gap-2 border-t pt-4">
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
                      </>
                    )
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

