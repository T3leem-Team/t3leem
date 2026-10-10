'use client'

import type { Dispatch, SetStateAction } from 'react'

import {
  ArrowLeftRight,
  X,
} from 'lucide-react'

import {
  type Teacher,
  type Assignment,
  type TeacherCourseSubject,
  type ManagedCourse,
} from '@/lib/teachers-cache'

import {
  type Student,
} from '@/app/(dashboard)/teachers/teacher-attendance'

import { Button } from '@/components/ui/button'

import {
  Card,
  CardContent,
} from '@/components/ui/card'

export type TransferTeacher = {
  teacher: Teacher
  subjects: TeacherCourseSubject[]
}

type TeachersViewTransferStudentProps = {
  selectedTeacher: Teacher
  currentCourse: ManagedCourse
  selectedTeacherSubjectNames: string[]
  students: Student[]
  assignments: Assignment[]
  teacherCourseSubjects: TeacherCourseSubject[]
  transferStudentId: string
  transferTeacherId: string
  setTransferTeacherId: Dispatch<SetStateAction<string>>
  transferTeachers: TransferTeacher[]
  selectedTransferTeacher: TransferTeacher | null
  setStatusMessage: Dispatch<SetStateAction<string>>
  saving: boolean
  closeTransfer: () => void
  saveTransfer: () => Promise<void>
}

export function TeachersViewTransferStudent({
  selectedTeacher,
  currentCourse,
  selectedTeacherSubjectNames,
  students,
  assignments,
  teacherCourseSubjects,
  transferStudentId,
  transferTeacherId,
  setTransferTeacherId,
  transferTeachers,
  selectedTransferTeacher,
  setStatusMessage,
  saving,
  closeTransfer,
  saveTransfer,
}: TeachersViewTransferStudentProps) {
  const currentAssignment = assignments.find(
    (item) =>
      item.courseId === currentCourse.id &&
      item.teacherId === selectedTeacher.id &&
      item.studentId === transferStudentId,
  )

  const currentSubject = currentAssignment
    ? teacherCourseSubjects.find(
        (item) =>
          item.courseId === currentCourse.id &&
          item.teacherId === selectedTeacher.id &&
          item.subjectId === currentAssignment.subjectId,
      )
    : null

  const student = students.find(
    (item) => item.id === transferStudentId,
  )

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/40 p-3 touch-pan-y sm:items-center sm:p-4">
      <Card className="my-3 w-full max-w-md sm:my-auto">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">
              نقل الطالب
            </h2>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={closeTransfer}
              disabled={saving}
              className="shrink-0"
              aria-label="إغلاق نافذة النقل"
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
              {student?.name ?? '—'}
            </p>

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
          </div>

          <div className="space-y-2">
            <label
              htmlFor="transfer-teacher-select"
              className="text-sm font-medium"
            >
              المعلم الجديد
            </label>

            <select
              id="transfer-teacher-select"
              value={transferTeacherId}
              onChange={(event) => {
                setTransferTeacherId(event.target.value)
                setStatusMessage('')
              }}
              disabled={saving}
              className="h-11 w-full rounded-md border bg-background px-3 text-sm outline-none"
            >
              <option value="">
                اختر المعلم
              </option>

              {transferTeachers.map(({ teacher, subjects }) => {
                const subjectNames = Array.from(
                  new Set(
                    subjects.map(
                      (subject) => subject.subjectName,
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
              })}
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
              type="button"
              variant="outline"
              onClick={closeTransfer}
              disabled={saving}
            >
              إلغاء
            </Button>

            <Button
              type="button"
              onClick={saveTransfer}
              disabled={
                saving ||
                !transferTeacherId ||
                !selectedTransferTeacher ||
                selectedTransferTeacher.subjects.length !== 1
              }
            >
              <ArrowLeftRight className="size-4" />

              {saving ? 'جاري النقل...' : 'تأكيد النقل'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
