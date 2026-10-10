'use client'

import {
  ArrowLeftRight,
  Plus,
  Trash2,
} from 'lucide-react'

import type {
  Assignment,
  ManagedCourse,
  Teacher,
} from '@/lib/teachers-cache'

import type {
  Student,
} from '@/app/(dashboard)/teachers/teacher-attendance'

import { Button } from '@/components/ui/button'

type TeachersViewStudentsProps = {
  selectedTeacher: Teacher
  currentCourse: ManagedCourse | null
  assignedStudents: Student[]
  assignments: Assignment[]
  canTransferStudents: boolean
  canRemoveStudents: boolean
  openAddStudents: () => void
  openTransfer: (studentId: string) => void
  removeStudentFromTeacher: (
    assignment: Assignment,
    student: Student,
  ) => Promise<void>
  deletingAssignmentId: string | null
  saving: boolean
}

export function TeachersViewStudents({
  selectedTeacher,
  currentCourse,
  assignedStudents,
  assignments,
  canTransferStudents,
  canRemoveStudents,
  openAddStudents,
  openTransfer,
  removeStudentFromTeacher,
  deletingAssignmentId,
  saving,
}: TeachersViewStudentsProps) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            عدد الطلاب
          </p>

          <p className="mt-1 text-2xl font-bold">
            {assignedStudents.length}
          </p>
        </div>

        <Button
          onClick={openAddStudents}
          className="shrink-0"
        >
          <Plus className="size-4" />
          إضافة طلاب
        </Button>
      </div>

      {assignedStudents.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center sm:p-10">
          <p className="font-medium">
            لا يوجد طلاب حاليًا
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            أضف الطلاب من القائمة الأساسية.
          </p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="w-16 px-4 py-3 text-right font-medium">
                  #
                </th>

                <th className="px-4 py-3 text-right font-medium">
                  الطالب
                </th>

                <th className="px-4 py-3 text-right font-medium">
                  الاتصال
                </th>

                <th className="px-4 py-3 text-right font-medium">
                  المستوى
                </th>

                {(canTransferStudents ||
                  canRemoveStudents) && (
                  <th className="px-4 py-3 text-right font-medium">
                    إجراء
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {assignedStudents.map((student, index) => {
                const assignment = assignments.find(
                  (item) =>
                    item.courseId === currentCourse?.id &&
                    item.teacherId === selectedTeacher.id &&
                    item.studentId === student.id,
                )

                const isDeleting =
                  assignment?.id === deletingAssignmentId

                return (
                  <tr
                    key={student.id}
                    className="border-t"
                  >
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {index + 1}
                    </td>

                    <td className="px-4 py-3 font-medium">
                      {student.name}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span>
                          {student.phone || '—'}
                        </span>

                        <span>
                          {student.whatsapp || '—'}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {student.levelName}
                    </td>

                    {(canTransferStudents ||
                      canRemoveStudents) && (
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {canTransferStudents && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openTransfer(student.id)
                              }
                              disabled={isDeleting || saving}
                            >
                              <ArrowLeftRight className="size-4" />
                              نقل
                            </Button>
                          )}

                          {canRemoveStudents && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (assignment) {
                                  void removeStudentFromTeacher(
                                    assignment,
                                    student,
                                  )
                                }
                              }}
                              disabled={
                                !assignment ||
                                isDeleting ||
                                saving
                              }
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="size-4" />

                              {isDeleting
                                ? 'جاري المسح...'
                                : 'مسح'}
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
