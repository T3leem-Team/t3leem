'use client'

import { Search } from 'lucide-react'

import {
  Card,
  CardContent,
} from '@/components/ui/card'

import type {
  Teacher,
  Assignment,
  TeacherCourseSubject,
  ManagedCourse,
} from '@/lib/teachers-cache'

import type { Student } from '@/app/(dashboard)/teachers/teacher-attendance'

type AcademicLevel = {
  id: string
  name: string
  sort_order: number
}

type TeachersViewTeachersListProps = {
  loading: boolean
  search: string
  setSearch: (value: string) => void
  filteredTeachers: Teacher[]
  currentCourse: ManagedCourse | null
  assignments: Assignment[]
  students: Student[]
  academicLevels: AcademicLevel[]
  teacherCourseSubjects: TeacherCourseSubject[]
  getStudentCount: (teacherId: string) => number
  onSelectTeacher: (teacherId: string) => void
}

export function TeachersViewTeachersList({
  loading,
  search,
  setSearch,
  filteredTeachers,
  currentCourse,
  assignments,
  students,
  academicLevels,
  teacherCourseSubjects,
  getStudentCount,
  onSelectTeacher,
}: TeachersViewTeachersListProps) {
  return (
    <>
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
          {loading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              جاري تحميل بيانات المعلمين...
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-medium">
                لا يوجد معلمون مرتبطون بهذه الدورة.
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                اربط المعلمين بالدورة من قسم السنة الدراسية والدورات.
              </p>
            </div>
          ) : (
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
                      assignments
                        .filter(
                          (assignment) =>
                            assignment.courseId ===
                              currentCourse?.id &&
                            assignment.teacherId ===
                              teacher.id,
                        )
                        .map(
                          (assignment) =>
                            assignment.studentId,
                        )

                    const teacherGrades =
                      Array.from(
                        new Set(
                          students
                            .filter(
                              (student) =>
                                teacherStudentIds.includes(
                                  student.id,
                                ) &&
                                Boolean(
                                  student.levelName &&
                                    student.levelName !==
                                      '—',
                                ),
                            )
                            .map(
                              (student) =>
                                student.levelName,
                            ),
                        ),
                      ).sort((a, b) => {
                        const levelA =
                          academicLevels.find(
                            (level) =>
                              level.name === a,
                          )

                        const levelB =
                          academicLevels.find(
                            (level) =>
                              level.name === b,
                          )

                        if (levelA && levelB) {
                          return (
                            Number(
                              levelA.sort_order ?? 0,
                            ) -
                            Number(
                              levelB.sort_order ?? 0,
                            )
                          )
                        }

                        if (levelA) {
                          return -1
                        }

                        if (levelB) {
                          return 1
                        }

                        return String(a).localeCompare(
                          String(b),
                          'ar',
                        )
                      })

                    const teacherSubjects =
                      Array.from(
                        new Set(
                          teacherCourseSubjects
                            .filter(
                              (item) =>
                                item.courseId ===
                                  currentCourse?.id &&
                                item.teacherId ===
                                  teacher.id,
                            )
                            .map(
                              (item) =>
                                item.subjectName,
                            ),
                        ),
                      )

                    return (
                      <tr
                        key={teacher.id}
                        onClick={() =>
                          onSelectTeacher(teacher.id)
                        }
                        className="cursor-pointer border-t hover:bg-muted/40"
                      >
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              onSelectTeacher(teacher.id)
                            }}
                            className="font-medium text-primary hover:underline"
                          >
                            {teacher.name}
                          </button>
                        </td>

                        <td className="px-4 py-4">
                          {teacherSubjects.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {teacherSubjects.map(
                                (subject) => (
                                  <span
                                    key={subject}
                                    className="rounded-full bg-muted px-2.5 py-1 text-xs"
                                  >
                                    {subject}
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
          )}
        </CardContent>
      </Card>
    </>
  )
}
