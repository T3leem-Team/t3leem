'use client'

import type {
  Dispatch,
  SetStateAction,
} from 'react'

import {
  ArrowLeftRight,
  ArrowRight,
  History,
  X,
} from 'lucide-react'

import {
  type Teacher,
  type Assignment,
  type TeacherCourseSubject,
  type ManagedCourse,
} from '@/lib/teachers-cache'

import { Button } from '@/components/ui/button'

import {
  Card,
  CardContent,
} from '@/components/ui/card'

import {
  AttendanceView,
  type AttendanceStatus,
  type AttendanceRecord,
  type AttendanceNotes,
  type Student,
} from '@/app/(dashboard)/teachers/teacher-attendance'

import {
  TeachersViewPreviousCourses,
} from '@/app/(dashboard)/teachers/teachers-view-previous-courses'

import {
  TeachersViewStudents,
} from '@/app/(dashboard)/teachers/teachers-view-students'

import {
  TeachersViewAddStudents,
} from '@/app/(dashboard)/teachers/teachers-view-add-students'

type ActivePanel =
  | 'students'
  | 'addStudents'
  | 'attendance'
  | 'previousCourses'

type UnavailableStudent = {
  student: Student
  teacherName: string
}

type TransferTeacher = {
  teacher: Teacher
  subjects: TeacherCourseSubject[]
}

type TeachersViewTeacherPanelProps = {
  selectedTeacher: Teacher
  currentCourse: ManagedCourse | null
  selectedTeacherSubjects: TeacherCourseSubject[]
  selectedTeacherSubjectNames: string[]
  assignedStudents: Student[]
  assignments: Assignment[]
  setAssignments: Dispatch<SetStateAction<Assignment[]>>
  students: Student[]
  courses: ManagedCourse[]
  teacherCourseSubjects: TeacherCourseSubject[]
  attendanceStatuses: AttendanceStatus[]
  attendanceRecords: AttendanceRecord[]
  updateAttendanceRecords: Dispatch<SetStateAction<AttendanceRecord[]>>
  attendanceNotes: AttendanceNotes
  setAttendanceNotes: Dispatch<SetStateAction<AttendanceNotes>>
  statusMessage: string
  setStatusMessage: Dispatch<SetStateAction<string>>
  selectedAttendanceDate: string | null
  setSelectedAttendanceDate: Dispatch<SetStateAction<string | null>>
  activePanel: ActivePanel
  setActivePanel: Dispatch<SetStateAction<ActivePanel>>
  selectedGrade: string
  setSelectedGrade: Dispatch<SetStateAction<string>>
  availableGrades: string[]
  availableStudents: Student[]
  unavailableStudents: UnavailableStudent[]
  selectedStudentIds: string[]
  setSelectedStudentIds?: Dispatch<SetStateAction<string[]>>
  toggleStudent: (studentId: string) => void
  saving: boolean
  openAddStudents: () => void
  saveStudents: () => Promise<void>
  canTransferStudents: boolean
  canRemoveStudents: boolean
  openTransfer: (studentId: string) => void
  removeStudentFromTeacher: (
    assignment: Assignment,
    student: Student,
  ) => Promise<void>
  deletingAssignmentId: string | null
  closeTeacher: () => void
  courseTeacherIds: Record<string, string[]>
  selectedPreviousCourseId: string | null
  setSelectedPreviousCourseId: Dispatch<SetStateAction<string | null>>
  isTransferOpen: boolean
  setIsTransferOpen: Dispatch<SetStateAction<boolean>>
  transferStudentId: string | null
  setTransferStudentId: Dispatch<SetStateAction<string | null>>
  transferTeacherId: string
  setTransferTeacherId: Dispatch<SetStateAction<string>>
  transferTeachers: TransferTeacher[]
  selectedTransferTeacher: TransferTeacher | null
  saveTransfer: () => Promise<void>
}

export function TeachersViewTeacherPanel({
  selectedTeacher,
  currentCourse,
  selectedTeacherSubjects,
  selectedTeacherSubjectNames,
  assignedStudents,
  assignments,
  students,
  courses,
  teacherCourseSubjects,
  attendanceStatuses,
  attendanceRecords,
  updateAttendanceRecords,
  attendanceNotes,
  setAttendanceNotes,
  statusMessage,
  setStatusMessage,
  selectedAttendanceDate,
  setSelectedAttendanceDate,
  activePanel,
  setActivePanel,
  selectedGrade,
  setSelectedGrade,
  availableGrades,
  availableStudents,
  unavailableStudents,
  selectedStudentIds,
  setSelectedStudentIds,
  toggleStudent,
  saving,
  openAddStudents,
  saveStudents,
  canTransferStudents,
  canRemoveStudents,
  openTransfer,
  removeStudentFromTeacher,
  deletingAssignmentId,
  closeTeacher,
  courseTeacherIds,
  selectedPreviousCourseId,
  setSelectedPreviousCourseId,
  isTransferOpen,
  setIsTransferOpen,
  transferStudentId,
  setTransferStudentId,
  transferTeacherId,
  setTransferTeacherId,
  transferTeachers,
  selectedTransferTeacher,
  saveTransfer,
}: TeachersViewTeacherPanelProps) {
  const closeTransfer = () => {
    setIsTransferOpen(false)
    setTransferStudentId(null)
    setTransferTeacherId('')
  }

  return (
    <>
      {/* الصفحة الرئيسية */}
      {/*
        هذه هي الحاوية الوحيدة المسؤولة عن التمرير العمودي.
        لا تضف حاوية تمرير عمودية داخل محتوى الصفحة.
      */}
      <div className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden bg-background">
        <div className="mx-auto w-full max-w-6xl">

          {/* زر العودة */}
          <div className="border-b px-3 py-3 sm:px-6 sm:py-4">
            <div
              dir="rtl"
              className="flex justify-start"
            >
              <Button
                type="button"
                onClick={closeTeacher}
                disabled={saving}
                className="h-10 gap-2 bg-primary px-4 text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                <ArrowRight className="size-4" />
                عودة
              </Button>
            </div>
          </div>

          {/* بيانات المعلم وتفاصيل الدورة */}
          <div
            dir="rtl"
            className="border-b bg-muted/20 px-3 py-4 sm:px-6"
          >
            <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-4">

              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  المعلم
                </p>

                <div className="mt-1 flex min-w-0 flex-wrap items-center gap-3">
                  <p className="break-words font-semibold">
                    {selectedTeacher.name}
                  </p>
                </div>
              </div>

              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  الدورة الحالية
                </p>

                <p className="mt-1 break-words font-semibold">
                  {currentCourse?.name ?? '—'}
                </p>
              </div>

              {selectedTeacherSubjectNames.length > 0 && (
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    المادة
                  </p>

                  <p className="mt-1 break-words font-semibold">
                    {selectedTeacherSubjectNames.join('، ')}
                  </p>
                </div>
              )}

              {currentCourse && (
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    الفترة
                  </p>

                  <span className="mt-1 inline-flex max-w-full flex-wrap rounded-full bg-background px-3 py-1.5 text-sm">
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
                </div>
              )}
            </div>
          </div>

          {/* التبويبات */}
          <div className="border-b px-3 py-3 sm:px-6">
            <div className="flex gap-2 overflow-x-auto pb-1">

              <Button
                variant="outline"
                onClick={() => {
                  setActivePanel('students')
                  setSelectedAttendanceDate(null)
                }}
                className={`shrink-0 ${
                  activePanel === 'students'
                    ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700 hover:text-white'
                    : 'border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800'
                }`}
              >
                الطلاب
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setActivePanel('attendance')
                  setSelectedAttendanceDate(null)
                }}
                className={`shrink-0 ${
                  activePanel === 'attendance'
                    ? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white'
                    : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800'
                }`}
              >
                الحضور والغياب
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setActivePanel('previousCourses')

                  const firstCourse = courses.find(
                    (course) =>
                      course.isClosed &&
                      (
                        courseTeacherIds[course.id] ?? []
                      ).includes(selectedTeacher.id),
                  )

                  setSelectedPreviousCourseId(
                    firstCourse?.id ?? null,
                  )
                }}
                className={`shrink-0 ${
                  activePanel === 'previousCourses'
                    ? 'border-violet-600 bg-violet-600 text-white hover:bg-violet-700 hover:text-white'
                    : 'border-violet-200 text-violet-700 hover:bg-violet-50 hover:text-violet-800'
                }`}
              >
                <History className="size-4" />
                الدورات السابقة
              </Button>
            </div>
          </div>

          {/* محتوى المعلم */}
          <div className="min-w-0 w-full p-3 sm:p-6">

            {/* عرض الطلاب */}
            {activePanel === 'students' && (
              <TeachersViewStudents
                selectedTeacher={selectedTeacher}
                currentCourse={currentCourse}
                assignedStudents={assignedStudents}
                assignments={assignments}
                canTransferStudents={canTransferStudents}
                canRemoveStudents={canRemoveStudents}
                openAddStudents={openAddStudents}
                openTransfer={openTransfer}
                removeStudentFromTeacher={
                  removeStudentFromTeacher
                }
                deletingAssignmentId={deletingAssignmentId}
                saving={saving}
              />
            )}

            {/* إضافة الطلاب */}
            {activePanel === 'addStudents' && (
              <TeachersViewAddStudents
                currentCourse={currentCourse}
                selectedTeacherSubjects={
                  selectedTeacherSubjects
                }
                selectedTeacherSubjectNames={
                  selectedTeacherSubjectNames
                }
                selectedGrade={selectedGrade}
                setSelectedGrade={setSelectedGrade}
                availableGrades={availableGrades}
                availableStudents={availableStudents}
                unavailableStudents={unavailableStudents}
                selectedStudentIds={selectedStudentIds}
                setSelectedStudentIds={
                  setSelectedStudentIds
                }
                toggleStudent={toggleStudent}
                saving={saving}
                saveStudents={saveStudents}
                onClose={() => {
                  setActivePanel('students')
                }}
              />
            )}

            {/* الحضور والغياب */}
            {activePanel === 'attendance' && (
              <div className="w-full min-w-0">
                <AttendanceView
                  currentCourse={currentCourse}
                  teacherId={selectedTeacher.id}
                  assignedStudents={assignedStudents}
                  attendanceStatuses={attendanceStatuses}
                  attendanceRecords={attendanceRecords}
                  setAttendanceRecords={
                    updateAttendanceRecords
                  }
                  attendanceNotes={attendanceNotes}
                  setAttendanceNotes={
                    setAttendanceNotes
                  }
                  statusMessage={statusMessage}
                  setStatusMessage={setStatusMessage}
                  selectedAttendanceDate={
                    selectedAttendanceDate
                  }
                  setSelectedAttendanceDate={
                    setSelectedAttendanceDate
                  }
                />
              </div>
            )}

            {/* الدورات السابقة */}
            {activePanel === 'previousCourses' && (
              <div className="w-full min-w-0">
                <TeachersViewPreviousCourses
                  teacherId={selectedTeacher.id}
                  courses={courses}
                  assignments={assignments}
                  students={students}
                  attendanceStatuses={attendanceStatuses}
                  attendanceRecords={attendanceRecords}
                  courseTeacherIds={courseTeacherIds}
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
              </div>
            )}
          </div>
        </div>
      </div>

      {/* نافذة نقل الطالب */}
      {isTransferOpen &&
        transferStudentId &&
        currentCourse &&
        canTransferStudents && (
          <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/40 p-3 touch-pan-y sm:items-center sm:p-4">
            <Card className="my-3 w-full max-w-md sm:my-auto">
              <CardContent className="space-y-4 p-4 sm:p-5">

                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">
                    نقل الطالب
                  </h2>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={closeTransfer}
                    disabled={saving}
                    className="shrink-0"
                  >
                    <X className="size-4" />
                  </Button>
                </div>

                <p className="break-words text-sm text-muted-foreground">
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
                  <p className="break-words font-medium">
                    {
                      students.find(
                        (student) =>
                          student.id === transferStudentId,
                      )?.name
                    }
                  </p>

                  {(() => {
                    const currentAssignment =
                      assignments.find(
                        (item) =>
                          item.courseId === currentCourse.id &&
                          item.teacherId === selectedTeacher.id &&
                          item.studentId === transferStudentId,
                      )

                    const currentSubject =
                      currentAssignment
                        ? teacherCourseSubjects.find(
                            (item) =>
                              item.courseId === currentCourse.id &&
                              item.teacherId === selectedTeacher.id &&
                              item.subjectId ===
                                currentAssignment.subjectId,
                          )
                        : null

                    return (
                      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                        <div className="break-words">
                          المعلم الحالي:{' '}
                          <span className="font-medium text-foreground">
                            {selectedTeacher.name}
                          </span>
                        </div>

                        <div className="break-words">
                          المادة الحالية:{' '}
                          <span className="font-medium text-foreground">
                            {currentSubject?.subjectName ||
                              selectedTeacherSubjectNames.join('، ') ||
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
                    value={transferTeacherId}
                    onChange={(event) => {
                      setTransferTeacherId(
                        event.target.value,
                      )

                      setStatusMessage('')
                    }}
                    className="h-11 w-full rounded-md border bg-background px-3 text-sm outline-none"
                  >
                    <option value="">
                      اختر المعلم
                    </option>

                    {transferTeachers.map(
                      ({ teacher, subjects }) => {
                        const subjectNames =
                          Array.from(
                            new Set(
                              subjects.map(
                                (subject) =>
                                  subject.subjectName,
                              ),
                            ),
                          )

                        return (
                          <option
                            key={teacher.id}
                            value={teacher.id}
                          >
                            {teacher.name}
                            {subjectNames.length > 0
                              ? ` — ${subjectNames.join('، ')}`
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

                    <p className="mt-1 break-words font-medium">
                      {selectedTransferTeacher &&
                      selectedTransferTeacher.subjects.length === 1
                        ? selectedTransferTeacher.subjects[0].subjectName
                        : selectedTransferTeacher?.subjects.length === 0
                          ? 'غير محددة'
                          : 'أكثر من مادة'}
                    </p>
                  </div>
                )}

                {transferTeacherId &&
                  selectedTransferTeacher &&
                  selectedTransferTeacher.subjects.length !== 1 && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                      {selectedTransferTeacher.subjects.length === 0
                        ? 'لا يمكن النقل إلى هذا المعلم قبل تحديد مادته في إعدادات الدورة.'
                        : 'لا يمكن النقل لأن هذا المعلم مرتبط بأكثر من مادة في الدورة. يجب تحديد مادة واحدة للمعلم.'}
                    </div>
                  )}

                <div className="flex flex-col-reverse justify-end gap-2 pt-2 sm:flex-row">
                  <Button
                    variant="outline"
                    onClick={closeTransfer}
                    disabled={saving}
                  >
                    إلغاء
                  </Button>

                  <Button
                    onClick={saveTransfer}
                    disabled={
                      saving ||
                      !transferTeacherId ||
                      !selectedTransferTeacher ||
                      selectedTransferTeacher.subjects.length !== 1
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
    </>
  )
}
