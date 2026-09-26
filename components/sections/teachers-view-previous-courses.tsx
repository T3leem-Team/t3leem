'use client'

import { History } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'

import type {
  AttendanceRecord,
  AttendanceStatus,
  Course,
  Student,
} from '@/components/sections/attendance-view'

export type PreviousCourseAssignment = {
  id: string
  courseId: string
  teacherId: string
  studentId: string
  subjectId: string
}

export type PreviousCourseSubject = {
  courseId: string
  teacherId: string
  subjectId: string
  subjectName: string
}

export type PreviousManagedCourse = Course & {
  isClosed: boolean
  closedAt: string | null
}

type PreviousCourseItem = {
  course: PreviousManagedCourse
  subjects: PreviousCourseSubject[]
}

type PreviousCourseStudent = {
  assignment: PreviousCourseAssignment
  student: Student
  percentage: number | null
}

type Props = {
  teacherId: string
  courses: PreviousManagedCourse[]
  assignments: PreviousCourseAssignment[]
  students: Student[]
  attendanceStatuses: AttendanceStatus[]
  attendanceRecords: AttendanceRecord[]
  courseTeacherIds: Record<string, string[]>
  teacherCourseSubjects: PreviousCourseSubject[]
  selectedCourseId: string | null
  onSelectedCourseChange: (
    courseId: string | null,
  ) => void
}

function getAttendancePercentage(
  courseId: string,
  studentId: string,
  attendanceStatuses: AttendanceStatus[],
  attendanceRecords: AttendanceRecord[],
) {
  const statusMap = new Map(
    attendanceStatuses.map((status) => [
      status.id,
      status.name,
    ]),
  )

  const records = attendanceRecords.filter(
    (record) =>
      record.courseId === courseId &&
      record.studentId === studentId,
  )

  /*
   * إذا وجد أكثر من سجل في نفس اليوم،
   * نستخدم آخر سجل حتى لا تتضاعف النسبة.
   */
  const dailyRecords =
    new Map<string, AttendanceRecord>()

  for (const record of records) {
    dailyRecords.set(
      `${record.studentId}_${record.attendanceDate}`,
      record,
    )
  }

  let attended = 0
  let absent = 0

  for (const record of dailyRecords.values()) {
    const status = statusMap.get(
      record.statusId,
    )

    if (
      status === 'حاضر' ||
      status === 'متأخر' ||
      status === 'مستأذن'
    ) {
      attended += 1
    } else if (status === 'غائب') {
      absent += 1
    }
  }

  const denominator = attended + absent

  if (denominator === 0) {
    return null
  }

  return (
    Math.round(
      (attended / denominator) * 1000,
    ) / 10
  )
}

function formatDate(value: string) {
  if (!value) {
    return '—'
  }

  return new Intl.DateTimeFormat(
    'ar-BH',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    },
  ).format(
    new Date(`${value}T00:00:00`),
  )
}

export function TeachersViewPreviousCourses({
  teacherId,
  courses,
  assignments,
  students,
  attendanceStatuses,
  attendanceRecords,
  courseTeacherIds,
  teacherCourseSubjects,
  selectedCourseId,
  onSelectedCourseChange,
}: Props) {
  const previousCoursesForTeacher: PreviousCourseItem[] =
    courses
      .filter(
        (course) =>
          course.isClosed &&
          (
            courseTeacherIds[course.id] ??
            []
          ).includes(teacherId),
      )
      .map((course) => {
        const subjects =
          teacherCourseSubjects.filter(
            (item) =>
              item.courseId === course.id &&
              item.teacherId === teacherId,
          )

        return {
          course,
          subjects,
        }
      })

  const selectedPreviousCourse =
    previousCoursesForTeacher.find(
      (item) =>
        item.course.id ===
        selectedCourseId,
    ) ??
    previousCoursesForTeacher[0] ??
    null

  const previousCourseAssignments =
    selectedPreviousCourse
      ? assignments.filter(
          (assignment) =>
            assignment.courseId ===
              selectedPreviousCourse.course
                .id &&
            assignment.teacherId ===
              teacherId,
        )
      : []

  const previousCourseStudents: PreviousCourseStudent[] =
    previousCourseAssignments
      .map((assignment) => {
        const student = students.find(
          (item) =>
            item.id ===
            assignment.studentId,
        )

        if (!student) {
          return null
        }

        return {
          assignment,
          student,
          percentage:
            getAttendancePercentage(
              assignment.courseId,
              assignment.studentId,
              attendanceStatuses,
              attendanceRecords,
            ),
        }
      })
      .filter(
        (
          item,
        ): item is PreviousCourseStudent =>
          item !== null,
      )

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold">
          الدورات السابقة
        </h3>

        <p className="text-sm text-muted-foreground">
          الدورات المغلقة لهذا المعلم في السنة الدراسية الحالية.
        </p>
      </div>

      {previousCoursesForTeacher.length ===
      0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <History className="mx-auto size-8 text-muted-foreground" />

          <p className="mt-3 font-medium">
            لا توجد دورات سابقة
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            لا توجد دورة مغلقة مرتبطة بهذا المعلم في السنة الحالية.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              الدورة السابقة
            </label>

            <select
              value={
                selectedPreviousCourse?.course.id ??
                ''
              }
              onChange={(event) =>
                onSelectedCourseChange(
                  event.target.value ||
                    null,
                )
              }
              className="h-11 w-full rounded-md border bg-background px-3 text-sm outline-none"
            >
              {previousCoursesForTeacher.map(
                ({
                  course,
                  subjects,
                }) => {
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
                      key={course.id}
                      value={course.id}
                    >
                      {course.name}
                      {subjectNames.length >
                      0
                        ? ` — ${subjectNames.join(
                            '، ',
                          )}`
                        : ''}
                    </option>
                  )
                },
              )}
            </select>
          </div>

          {selectedPreviousCourse && (
            <Card>
              <CardContent className="space-y-5 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      الدورة
                    </p>

                    <h3 className="mt-1 text-lg font-semibold">
                      {
                        selectedPreviousCourse
                          .course.name
                      }
                    </h3>

                    <div className="mt-2 flex flex-wrap gap-2 text-sm">
                      {selectedPreviousCourse
                        .subjects.length >
                        0 && (
                        <span className="rounded-full bg-muted px-3 py-1.5">
                          المادة:{' '}
                          {Array.from(
                            new Set(
                              selectedPreviousCourse.subjects.map(
                                (subject) =>
                                  subject.subjectName,
                              ),
                            ),
                          ).join('، ')}
                        </span>
                      )}

                      <span className="rounded-full bg-muted px-3 py-1.5">
                        {formatDate(
                          selectedPreviousCourse
                            .course.startDate,
                        )}{' '}
                        —{' '}
                        {formatDate(
                          selectedPreviousCourse
                            .course.endDate,
                        )}
                      </span>
                    </div>
                  </div>

                  <span className="rounded-full bg-muted px-3 py-1.5 text-sm">
                    {
                      previousCourseStudents.length
                    }{' '}
                    طالب
                  </span>
                </div>

                {previousCourseStudents.length ===
                0 ? (
                  <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
                    لا يوجد طلاب مسندون لهذا المعلم في هذه الدورة.
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
                            نسبة الحضور
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {previousCourseStudents.map(
                          ({
                            assignment,
                            student,
                            percentage,
                          }) => (
                            <tr
                              key={
                                assignment.id
                              }
                              className="border-t"
                            >
                              <td className="px-4 py-3 font-medium">
                                {
                                  student.name
                                }
                              </td>

                              <td className="px-4 py-3 font-semibold tabular-nums">
                                {percentage ===
                                null
                                  ? '—'
                                  : `${percentage}%`}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
