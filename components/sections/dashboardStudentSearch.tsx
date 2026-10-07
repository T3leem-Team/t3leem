'use client'

import {
  useMemo,
  useState,
} from 'react'

import {
  Search,
  X,
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export type StudentSearchStudent = {
  id: string
  studentId: string | null
  name: string
  personalId: string | null
  phone: string | null
  whatsapp: string | null
  status: string | null
}

export type StudentSearchEnrollment = {
  id: string
  studentId: string
  academicYearId: string
  levelId: string | null
  status: string
}

export type StudentSearchAssignment = {
  id: string
  courseId: string
  teacherId: string
  studentId: string
}

export type StudentSearchCourse = {
  id: string
  name: string
}

export type StudentSearchTeacher = {
  id: string
  name: string
}

export type StudentSearchAttendanceRecord = {
  id: string
  studentId: string
  enrollmentId: string | null
  attendanceDate: string
  statusId: string
  note: string | null
  courseId: string
}

export type StudentSearchResult = {
  student: StudentSearchStudent
  courseNames: string[]
  teacherNames: string[]
  attendanceStatus: string | null
  levelName: string | null
}

type Level = {
  id: string
  name: string
}

type Props = {
  students: StudentSearchStudent[]
  enrollments: StudentSearchEnrollment[]
  assignments: StudentSearchAssignment[]
  courses: StudentSearchCourse[]
  teachers: StudentSearchTeacher[]
  attendanceRecords: StudentSearchAttendanceRecord[]
  attendanceStatusMap: Map<string, string>
  selectedCourseId: string
  selectedDate: string
  lessonDateStatus: string
  levels: Level[]
  onSelectStudent: (
    student: StudentSearchResult,
  ) => void
}

function normalizeText(
  value: string | null | undefined,
) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

function normalizeArabicText(
  value: string | null | undefined,
) {
  return normalizeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ـ/g, '')
}

function normalizeId(
  value: string | null | undefined,
) {
  return String(value ?? '').trim()
}

function normalizeAttendanceDate(
  value: string | null | undefined,
) {
  return String(value ?? '').slice(0, 10)
}

function getAttendanceStatusLabel(
  name: string,
) {
  const value = normalizeText(name)

  if (
    value === 'حاضر' ||
    value === 'حضور'
  ) {
    return 'حاضر'
  }

  if (
    value === 'غائب' ||
    value === 'غياب'
  ) {
    return 'غائب'
  }

  if (
    value === 'متأخر' ||
    value === 'متأخر عن الحضور'
  ) {
    return 'متأخر'
  }

  if (
    value === 'مستأذن' ||
    value === 'مستأذن بعذر'
  ) {
    return 'مستأذن'
  }

  return value || null
}

export function DashboardStudentSearch({
  students,
  enrollments,
  assignments,
  courses,
  teachers,
  attendanceRecords,
  attendanceStatusMap,
  selectedCourseId,
  selectedDate,
  lessonDateStatus,
  levels,
  onSelectStudent,
}: Props) {
  const [
    studentSearch,
    setStudentSearch,
  ] = useState('')

  const searchResults =
    useMemo<StudentSearchResult[]>(
      () => {
        const rawQuery =
          normalizeText(
            studentSearch,
          )

        const query =
          normalizeArabicText(
            rawQuery,
          )

        if (query.length < 2) {
          return []
        }

        const matchedStudents =
          students.filter(
            (student) => {
              const name =
                normalizeArabicText(
                  student.name,
                )

              const personalId =
                normalizeText(
                  student.personalId,
                ).toLowerCase()

              const studentId =
                normalizeText(
                  student.studentId,
                ).toLowerCase()

              const phone =
                normalizeText(
                  student.phone,
                ).toLowerCase()

              const whatsapp =
                normalizeText(
                  student.whatsapp,
                ).toLowerCase()

              return (
                name.includes(query) ||
                personalId.includes(
                  query,
                ) ||
                studentId.includes(
                  query,
                ) ||
                phone.includes(query) ||
                whatsapp.includes(query)
              )
            },
          )

        return matchedStudents
          .slice(0, 8)
          .map((student) => {
            const normalizedStudentId =
              normalizeId(
                student.id,
              )

            const enrollment =
              enrollments.find(
                (item) =>
                  normalizeId(
                    item.studentId,
                  ) ===
                    normalizedStudentId &&
                  item.status ===
                    'نشط',
              )

            const levelName =
              enrollment?.levelId
                ? levels.find(
                    (level) =>
                      normalizeId(
                        level.id,
                      ) ===
                      normalizeId(
                        enrollment.levelId,
                      ),
                  )?.name ?? null
                : null

            const studentAssignments =
              assignments.filter(
                (assignment) =>
                  normalizeId(
                    assignment.studentId,
                  ) ===
                  normalizedStudentId,
              )

            const studentCourseIds =
              Array.from(
                new Set(
                  studentAssignments.map(
                    (assignment) =>
                      normalizeId(
                        assignment.courseId,
                      ),
                  ),
                ),
              )

            const courseNames =
              studentCourseIds
                .map(
                  (courseId) =>
                    courses.find(
                      (course) =>
                        normalizeId(
                          course.id,
                        ) ===
                        courseId,
                    )?.name,
                )
                .filter(
                  (
                    name,
                  ): name is string =>
                    Boolean(name),
                )

            const teacherNames =
              Array.from(
                new Set(
                  studentAssignments
                    .map(
                      (assignment) =>
                        teachers.find(
                          (teacher) =>
                            normalizeId(
                              teacher.id,
                            ) ===
                            normalizeId(
                              assignment.teacherId,
                            ),
                        )?.name,
                    )
                    .filter(
                      (
                        name,
                      ): name is string =>
                        Boolean(name),
                    ),
                ),
              )

            let attendanceStatus:
              | string
              | null = null

            if (
              selectedCourseId &&
              selectedDate &&
              lessonDateStatus ===
                'lesson'
            ) {
              const record =
                attendanceRecords.find(
                  (item) =>
                    normalizeId(
                      item.studentId,
                    ) ===
                      normalizedStudentId &&
                    normalizeId(
                      item.courseId,
                    ) ===
                      normalizeId(
                        selectedCourseId,
                      ) &&
                    normalizeAttendanceDate(
                      item.attendanceDate,
                    ) ===
                      normalizeAttendanceDate(
                        selectedDate,
                      ),
                )

              if (record) {
                const rawStatus =
                  attendanceStatusMap.get(
                    normalizeId(
                      record.statusId,
                    ),
                  ) ?? ''

                attendanceStatus =
                  getAttendanceStatusLabel(
                    rawStatus,
                  )
              }
            }

            return {
              student,
              courseNames,
              teacherNames,
              attendanceStatus,
              levelName,
            }
          })
      },
      [
        studentSearch,
        students,
        enrollments,
        assignments,
        courses,
        teachers,
        attendanceRecords,
        attendanceStatusMap,
        selectedCourseId,
        selectedDate,
        lessonDateStatus,
        levels,
      ],
    )

  const searchType =
    useMemo(() => {
      const query =
        normalizeText(
          studentSearch,
        ).toLowerCase()

      if (!query) {
        return 'name'
      }

      const personalMatch =
        students.some(
          (student) =>
            normalizeText(
              student.personalId,
            )
              .toLowerCase()
              .includes(query),
        )

      if (personalMatch) {
        return 'personal'
      }

      const phoneMatch =
        students.some(
          (student) =>
            normalizeText(
              student.phone,
            )
              .toLowerCase()
              .includes(query) ||
            normalizeText(
              student.whatsapp,
            )
              .toLowerCase()
              .includes(query),
        )

      if (phoneMatch) {
        return 'phone'
      }

      return 'name'
    }, [
      studentSearch,
      students,
    ])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Search className="size-5 text-slate-500" />
          البحث السريع عن طالب
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

          <input
            value={studentSearch}
            onChange={(event) =>
              setStudentSearch(
                event.target.value,
              )
            }
            placeholder="ابحث بالاسم أو الرقم الشخصي أو رقم الهاتف..."
            className="h-11 w-full rounded-lg border bg-background px-10 text-sm outline-none transition-colors focus:ring-2 focus:ring-sky-200"
          />

          {studentSearch && (
            <button
              type="button"
              onClick={() =>
                setStudentSearch('')
              }
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {studentSearch.trim().length >=
          2 && (
          <div className="mt-3 overflow-hidden rounded-lg border">
            {searchResults.length ===
            0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                لا يوجد طالب مطابق للبحث
              </div>
            ) : (
              <div className="divide-y">
                {searchResults.map(
                  (result) => {
                    const student =
                      result.student

                    const personalId =
                      normalizeText(
                        student.personalId,
                      )

                    const phone =
                      normalizeText(
                        student.phone ||
                          student.whatsapp,
                      )

                    return (
                      <button
                        key={
                          student.id
                        }
                        type="button"
                        onClick={() =>
                          onSelectStudent(
                            result,
                          )
                        }
                        className="w-full px-4 py-3 text-right transition-colors hover:bg-muted/40"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {
                              student.name
                            }
                          </p>

                          {searchType ===
                            'personal' &&
                            personalId && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                الرقم الشخصي:{' '}
                                {
                                  personalId
                                }
                              </p>
                            )}

                          {searchType ===
                            'phone' &&
                            phone && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                رقم الهاتف:{' '}
                                {
                                  phone
                                }
                              </p>
                            )}

                          {searchType ===
                            'name' &&
                            result.levelName && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {
                                  result.levelName
                                }
                              </p>
                            )}
                        </div>
                      </button>
                    )
                  },
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
