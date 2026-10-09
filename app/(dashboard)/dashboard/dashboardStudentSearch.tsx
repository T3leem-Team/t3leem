'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Search,
  X,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type Student = {
  id: string
  studentId: string | null
  name: string
  personalId: string | null
  phone: string | null
  whatsapp: string | null
  status: string | null
}

type Enrollment = {
  id: string
  studentId: string
  academicYearId: string
  levelId: string | null
  status: string
}

type Assignment = {
  id: string
  courseId: string
  teacherId: string
  studentId: string
}

type Course = {
  id: string
  name: string
}

type Teacher = {
  id: string
  name: string
}

type AttendanceRecord = {
  id: string
  studentId: string
  enrollmentId: string | null
  attendanceDate: string
  statusId: string
  note: string | null
  courseId: string
}

export type StudentSearchResult = {
  student: Student
  courseNames: string[]
  teacherNames: string[]
  attendanceStatus: string | null
}

type Props = {
  students: Student[]
  enrollments: Enrollment[]
  assignments: Assignment[]
  courses: Course[]
  teachers: Teacher[]
  attendanceRecords: AttendanceRecord[]
  statusMap: Map<string, string>
  selectedCourseId: string
  selectedDate: string
  lessonDateStatus: string
  onSelectStudent: (
    result: StudentSearchResult,
  ) => void
}

function normalizeText(
  value: string | null | undefined,
) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

function normalizeId(
  value: string | null | undefined,
) {
  return String(value ?? '').trim()
}

function normalizeArabicText(
  value: string | null | undefined,
) {
  return normalizeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(
      /[\u064B-\u065F\u0670\u06D6-\u06ED]/g,
      '',
    )
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ـ/g, '')
}

function normalizeNumber(
  value: string | null | undefined,
) {
  return String(value ?? '')
    .replace(/\s+/g, '')
    .replace(/[-()]/g, '')
    .trim()
}

function getAttendanceStatusLabel(
  value: string,
) {
  const status = normalizeText(value)

  if (
    status === 'حاضر' ||
    status === 'حضور'
  ) {
    return 'حاضر'
  }

  if (
    status === 'غائب' ||
    status === 'غياب'
  ) {
    return 'غائب'
  }

  if (
    status === 'متأخر' ||
    status === 'متأخر عن الحضور'
  ) {
    return 'متأخر'
  }

  if (
    status === 'مستأذن' ||
    status === 'مستأذن بعذر'
  ) {
    return 'مستأذن'
  }

  return status || null
}

export function DashboardStudentSearch({
  students,
  enrollments,
  assignments,
  courses,
  teachers,
  attendanceRecords,
  statusMap,
  selectedCourseId,
  selectedDate,
  lessonDateStatus,
  onSelectStudent,
}: Props) {
  const [
    studentSearch,
    setStudentSearch,
  ] = useState('')

  const [
    levels,
    setLevels,
  ] = useState<
    { id: string; name: string }[]
  >([])

  useEffect(() => {
    let cancelled = false

    const loadLevels = async () => {
      const {
        data,
        error,
      } = await supabase
        .from('levels')
        .select('id, name')
        .order('name', {
          ascending: true,
        })

      if (error) {
        console.error(
          'Dashboard levels load error:',
          error,
        )
        return
      }

      if (cancelled) {
        return
      }

      setLevels(
        (data ?? []).map(
          (level) => ({
            id: normalizeId(
              level.id,
            ),
            name: String(
              level.name ?? '',
            ),
          }),
        ),
      )
    }

    void loadLevels()

    return () => {
      cancelled = true
    }
  }, [])

  const enrolledStudentIds =
    useMemo(
      () =>
        new Set(
          enrollments
            .filter(
              (enrollment) =>
                enrollment.status ===
                'نشط',
            )
            .map(
              (enrollment) =>
                normalizeId(
                  enrollment.studentId,
                ),
            )
            .filter(Boolean),
        ),
      [enrollments],
    )

  const searchResults =
    useMemo<StudentSearchResult[]>(
      () => {
        const rawQuery =
          normalizeText(
            studentSearch,
          )

        if (rawQuery.length < 2) {
          return []
        }

        const normalizedQuery =
          normalizeArabicText(
            rawQuery,
          )

        const numericQuery =
          normalizeNumber(
            rawQuery,
          )

        const isNumericSearch =
          /^[0-9]+$/.test(
            numericQuery,
          )

        const enrolledStudents =
          students.filter(
            (student) =>
              enrolledStudentIds.has(
                normalizeId(
                  student.id,
                ),
              ),
          )

        let matchedStudents =
          enrolledStudents

        if (isNumericSearch) {
          const personalMatches =
            enrolledStudents.filter(
              (student) =>
                normalizeNumber(
                  student.personalId,
                ).includes(
                  numericQuery,
                ),
            )

          if (
            personalMatches.length > 0
          ) {
            matchedStudents =
              personalMatches
          } else {
            matchedStudents =
              enrolledStudents.filter(
                (student) =>
                  normalizeNumber(
                    student.phone,
                  ).includes(
                    numericQuery,
                  ) ||
                  normalizeNumber(
                    student.whatsapp,
                  ).includes(
                    numericQuery,
                  ) ||
                  normalizeNumber(
                    student.studentId,
                  ).includes(
                    numericQuery,
                  ),
              )
          }
        } else {
          matchedStudents =
            enrolledStudents.filter(
              (student) =>
                normalizeArabicText(
                  student.name,
                ).includes(
                  normalizedQuery,
                ),
            )
        }

        return matchedStudents
          .slice(0, 8)
          .map((student) => {
            const studentId =
              normalizeId(
                student.id,
              )

            const studentAssignments =
              assignments.filter(
                (assignment) =>
                  normalizeId(
                    assignment.studentId,
                  ) === studentId,
              )

            const courseNames =
              Array.from(
                new Set(
                  studentAssignments
                    .map(
                      (assignment) =>
                        courses.find(
                          (course) =>
                            normalizeId(
                              course.id,
                            ) ===
                            normalizeId(
                              assignment.courseId,
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
                    ) === studentId &&
                    normalizeId(
                      item.courseId,
                    ) ===
                      normalizeId(
                        selectedCourseId,
                      ) &&
                    String(
                      item.attendanceDate,
                    ).slice(0, 10) ===
                      String(
                        selectedDate,
                      ).slice(0, 10),
                )

              if (record) {
                const rawStatus =
                  statusMap.get(
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
            }
          })
      },
      [
        studentSearch,
        students,
        enrollments,
        enrolledStudentIds,
        assignments,
        courses,
        teachers,
        attendanceRecords,
        statusMap,
        selectedCourseId,
        selectedDate,
        lessonDateStatus,
      ],
    )

  const getLevelName = (
    studentId: string,
  ) => {
    const enrollment =
      enrollments.find(
        (item) =>
          normalizeId(
            item.studentId,
          ) ===
            normalizeId(
              studentId,
            ) &&
          item.status === 'نشط',
      )

    if (!enrollment?.levelId) {
      return null
    }

    return (
      levels.find(
        (level) =>
          normalizeId(
            level.id,
          ) ===
          normalizeId(
            enrollment.levelId,
          ),
      )?.name ?? null
    )
  }

  const handleSelectStudent = (
    result: StudentSearchResult,
  ) => {
    onSelectStudent(result)
    setStudentSearch('')
  }

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
                    const levelName =
                      getLevelName(
                        result.student.id,
                      )

                    return (
                      <button
                        key={
                          result.student
                            .id
                        }
                        type="button"
                        onClick={() =>
                          handleSelectStudent(
                            result,
                          )
                        }
                        className="w-full px-4 py-3 text-right transition-colors hover:bg-muted/40"
                      >
                        <p className="truncate font-medium">
                          {
                            result
                              .student
                              .name
                          }
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          المستوى:{' '}
                          {levelName ||
                            '—'}
                        </p>
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
