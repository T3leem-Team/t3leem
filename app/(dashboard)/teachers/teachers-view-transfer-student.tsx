'use client'

import type {
  Dispatch,
  SetStateAction,
} from 'react'

import {
  ArrowRight,
  History,
} from 'lucide-react'

import {
  type Teacher,
  type Assignment,
  type TeacherCourseSubject,
  type ManagedCourse,
} from '@/lib/teachers-cache'

import { Button } from '@/components/ui/button'

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

import {
  TeachersViewTransferStudent,
  type TransferTeacher,
} from '@/app/(dashboard)/teachers/teachers-view-transfer-student'

type ActivePanel =
  | 'students'
  | 'addStudents'
  | 'attendance'
  | 'previousCourses'

type UnavailableStudent = {
  student: Student
  teacherName: string
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
  setSelectedStudentIds: Dispatch<SetStateAction<string[]>>
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
                      ? new Intl.DateTimeFormat('ar-BH', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        }).format(
                          new Date(
                            `${currentCourse.startDate}T00:00:00`,
                          ),
                        )
                      : '—'}{' '}
                    —{' '}
                    {currentCourse.endDate
                      ? new Intl.DateTimeFormat('ar-BH', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        }).format(
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
                type="button"
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
                type="button"
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
                type="button"
                variant="outline"
                onClick={() => {
                  setActivePanel('previousCourses')

                  const firstCourse = courses.find(
                    (course) =>
                      course.isClosed &&
                      (courseTeacherIds[course.id] ?? []).includes(
                        selectedTeacher.id,
                      ),
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
                removeStudentFromTeacher={removeStudentFromTeacher}
                deletingAssignmentId={deletingAssignmentId}
                saving={saving}
              />
            )}

            {/* إضافة الطلاب */}
            {activePanel === 'addStudents' && (
              <TeachersViewAddStudents
                currentCourse={currentCourse}
                selectedTeacherSubjects={selectedTeacherSubjects}
                selectedTeacherSubjectNames={selectedTeacherSubjectNames}
                selectedGrade={selectedGrade}
                setSelectedGrade={setSelectedGrade}
                availableGrades={availableGrades}
                availableStudents={availableStudents}
                unavailableStudents={unavailableStudents}
                selectedStudentIds={selectedStudentIds}
                setSelectedStudentIds={setSelectedStudentIds}
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
                  setAttendanceRecords={updateAttendanceRecords}
                  attendanceNotes={attendanceNotes}
                  setAttendanceNotes={setAttendanceNotes}
                  statusMessage={statusMessage}
                  setStatusMessage={setStatusMessage}
                  selectedAttendanceDate={selectedAttendanceDate}
                  setSelectedAttendanceDate={setSelectedAttendanceDate}
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
                  teacherCourseSubjects={teacherCourseSubjects}
                  selectedCourseId={selectedPreviousCourseId}
                  onSelectedCourseChange={setSelectedPreviousCourseId}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* نافذة نقل الطالب - أصبحت في ملف مستقل */}
      {isTransferOpen &&
        transferStudentId &&
        currentCourse &&
        canTransferStudents && (
          <TeachersViewTransferStudent
            selectedTeacher={selectedTeacher}
            currentCourse={currentCourse}
            selectedTeacherSubjectNames={selectedTeacherSubjectNames}
            students={students}
            assignments={assignments}
            teacherCourseSubjects={teacherCourseSubjects}
            transferStudentId={transferStudentId}
            transferTeacherId={transferTeacherId}
            setTransferTeacherId={setTransferTeacherId}
            transferTeachers={transferTeachers}
            selectedTransferTeacher={selectedTransferTeacher}
            setStatusMessage={setStatusMessage}
            saving={saving}
            closeTransfer={closeTransfer}
            saveTransfer={saveTransfer}
          />
        )}
    </>
  )
}
