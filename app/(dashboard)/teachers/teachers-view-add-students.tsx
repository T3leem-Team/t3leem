'use client'

import type { Dispatch, SetStateAction } from 'react'

import type {
  ManagedCourse,
  TeacherCourseSubject,
} from '@/lib/teachers-cache'

import type {
  Student,
} from '@/app/(dashboard)/teachers/teacher-attendance'

import { Button } from '@/components/ui/button'

type UnavailableStudent = {
  student: Student
  teacherName: string
}

type TeachersViewAddStudentsProps = {
  currentCourse: ManagedCourse | null
  selectedTeacherSubjects: TeacherCourseSubject[]
  selectedTeacherSubjectNames: string[]
  selectedGrade: string
  setSelectedGrade: Dispatch<SetStateAction<string>>
  availableGrades: string[]
  availableStudents: Student[]
  unavailableStudents: UnavailableStudent[]
  selectedStudentIds: string[]
  setSelectedStudentIds: Dispatch<SetStateAction<string[]>>
  toggleStudent: (studentId: string) => void
  saving: boolean
  saveStudents: () => Promise<void>
  onClose: () => void
}

export function TeachersViewAddStudents({
  currentCourse,
  selectedTeacherSubjects,
  selectedTeacherSubjectNames,
  selectedGrade,
  setSelectedGrade,
  availableGrades,
  availableStudents,
  unavailableStudents,
  selectedStudentIds,
  setSelectedStudentIds,
  toggleStudent,
  saving,
  saveStudents,
  onClose,
}: TeachersViewAddStudentsProps) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold">
            إضافة طلاب
          </h3>

          <p className="break-words text-sm text-muted-foreground">
            اختر الطلاب من الطلاب المسجلين في السنة الدراسية الحالية.
          </p>

          <div className="mt-3 rounded-lg border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">
              سيتم الإضافة تلقائيًا إلى
            </p>

            <p className="mt-1 break-words font-medium">
              {currentCourse?.name ?? '—'}
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              المادة:{' '}
              <span className="font-medium text-foreground">
                {selectedTeacherSubjectNames.length > 0
                  ? selectedTeacherSubjectNames.join('، ')
                  : 'غير محددة'}
              </span>
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="shrink-0"
        >
          <span className="sr-only">إغلاق</span>
          ×
        </Button>
      </div>

      {selectedTeacherSubjects.length === 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          لا توجد مادة مخصصة لهذا المعلم في هذه الدورة.
          <br />
          يرجى تحديد المادة للمعلم من إعدادات الدورة قبل
          بدء تعيين الطلاب.
        </div>
      )}

      {selectedTeacherSubjects.length > 1 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          المعلم مرتبط بأكثر من مادة في هذه الدورة:
          <span className="font-medium">
            {' '}
            {selectedTeacherSubjectNames.join('، ')}
          </span>
          .
          <br />
          لا يوجد اختيار مادة في هذه الصفحة، لذلك يجب أن
          تكون مادة المعلم محددة بشكل واحد من إعدادات الدورة.
        </div>
      )}

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

          {availableGrades.map((grade) => (
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
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">
              الطلاب
            </span>

            <span className="shrink-0 text-xs text-muted-foreground">
              تم تحديد {selectedStudentIds.length}
            </span>
          </div>

          {availableStudents.length === 0 &&
          unavailableStudents.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              لا يوجد طلاب لهذا المستوى.
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              {availableStudents.map((student) => {
                const selected =
                  selectedStudentIds.includes(student.id)

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
                      className="size-4 shrink-0"
                    />

                    <div className="min-w-0">
                      <p className="break-words font-medium">
                        {student.name}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {student.personalId || '—'}
                      </p>
                    </div>
                  </label>
                )
              })}

              {unavailableStudents.map(
                ({ student, teacherName }) => (
                  <div
                    key={student.id}
                    className="flex items-center gap-3 border-b bg-muted/20 p-4 last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      disabled
                      className="size-4 shrink-0"
                    />

                    <div className="min-w-0">
                      <p className="break-words font-medium text-muted-foreground">
                        {student.name}
                      </p>

                      <p className="break-words text-xs text-muted-foreground">
                        عند الأستاذ {teacherName}
                      </p>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col-reverse justify-end gap-2 border-t pt-4 sm:flex-row">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={saving}
        >
          إلغاء
        </Button>

        <Button
          onClick={saveStudents}
          disabled={
            saving ||
            selectedStudentIds.length === 0 ||
            selectedTeacherSubjects.length !== 1
          }
        >
          {saving ? 'جاري الحفظ...' : 'حفظ'}
        </Button>
      </div>
    </div>
  )
}
