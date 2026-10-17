'use client'

import { useMemo } from 'react'
import { ClipboardCheck, Clock3, UserCheck, UserX } from 'lucide-react'
import {
  type Assignment,
  type AttendanceRecord,
  type AttendanceStatus,
  type CourseTeacher,
  type DashboardStats,
  type Enrollment,
  type LessonDateStatus,
  type Teacher,
  isAbsentStatus,
  isExcusedStatus,
  isLateStatus,
  isPresentStatus,
  normalizeAttendanceDate,
  normalizeId,
} from '@/app/(dashboard)/dashboard/dashboard-data'
import { type TeacherAttendanceDetail } from '@/app/(dashboard)/teachers/teacher-attendance-details'

type DashboardStatsInput = {
  attendanceStatuses: AttendanceStatus[]
  assignments: Assignment[]
  courseTeachers: CourseTeacher[]
  teachers: Teacher[]
  enrollments: Enrollment[]
  attendanceRecords: AttendanceRecord[]
  selectedCourseId: string
  selectedDate: string
  lessonDateStatus: LessonDateStatus
}

export function useDashboardStats({
  attendanceStatuses,
  assignments,
  courseTeachers,
  teachers,
  enrollments,
  attendanceRecords,
  selectedCourseId,
  selectedDate,
  lessonDateStatus,
}: DashboardStatsInput) {
    const statusMap = useMemo(
      () =>
        new Map(
          attendanceStatuses.map(
            (status) => [
              normalizeId(
                status.id,
              ),
              status.name,
            ],
          ),
        ),
      [attendanceStatuses],
    )

    const selectedCourseAssignments =
      useMemo(
        () =>
          assignments.filter(
            (assignment) =>
              normalizeId(
                assignment.courseId,
              ) ===
              normalizeId(
                selectedCourseId,
              ),
          ),
        [
          assignments,
          selectedCourseId,
        ],
      )

    const assignedStudentIds =
      useMemo(
        () =>
          new Set(
            selectedCourseAssignments.map(
              (assignment) =>
                normalizeId(
                  assignment.studentId,
                ),
            ),
          ),
        [selectedCourseAssignments],
      )

    const selectedDateRecords =
      useMemo(() => {
        const selectedCourse =
          normalizeId(
            selectedCourseId,
          )

        const selectedDay =
          normalizeAttendanceDate(
            selectedDate,
          )

        const seenStudents =
          new Set<string>()

        return attendanceRecords.filter(
          (record) => {
            const recordCourse =
              normalizeId(
                record.courseId,
              )

            const recordStudent =
              normalizeId(
                record.studentId,
              )

            const recordDate =
              normalizeAttendanceDate(
                record.attendanceDate,
              )

            if (
              recordCourse !==
                selectedCourse ||
              recordDate !==
                selectedDay ||
              !recordStudent ||
              seenStudents.has(
                recordStudent,
              )
            ) {
              return false
            }

            seenStudents.add(
              recordStudent,
            )

            return true
          },
        )
      }, [
        attendanceRecords,
        selectedCourseId,
        selectedDate,
      ])

    const stats = useMemo<DashboardStats>(
      () => {
        const studentIds =
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
          )

        const studentsCount =
          studentIds.size

        const assignedCount =
          assignedStudentIds.size

        const unassignedCount =
          Array.from(
            studentIds,
          ).filter(
            (studentId) =>
              !assignedStudentIds.has(
                studentId,
              ),
          ).length

        let presentCount = 0
        let absentCount = 0
        let lateCount = 0
        let excusedCount = 0

        for (const record of selectedDateRecords) {
          const statusName =
            statusMap.get(
              normalizeId(
                record.statusId,
              ),
            ) ?? ''

          if (
            isPresentStatus(
              statusName,
            )
          ) {
            presentCount += 1
          } else if (
            isAbsentStatus(
              statusName,
            )
          ) {
            absentCount += 1
          } else if (
            isLateStatus(
              statusName,
            )
          ) {
            lateCount += 1
          } else if (
            isExcusedStatus(
              statusName,
            )
          ) {
            excusedCount += 1
          }
        }

        const recordedCount =
          presentCount +
          absentCount +
          lateCount +
          excusedCount

        return {
          studentsCount,
          assignedCount,
          unassignedCount,
          presentCount,
          absentCount,
          lateCount,
          excusedCount,
          recordedCount,
        }
      },
      [
        enrollments,
        assignedStudentIds,
        selectedDateRecords,
        statusMap,
      ],
    )

    const attendancePercentage =
      stats.assignedCount > 0
        ? Math.round(
            (stats.presentCount /
              stats.assignedCount) *
              100,
          )
        : 0

    const teacherAttendanceDetails =
      useMemo<TeacherAttendanceDetail[]>(
        () => {
          if (
            !selectedCourseId ||
            lessonDateStatus !== 'lesson'
          ) {
            return []
          }

          const normalizedCourseId =
            normalizeId(
              selectedCourseId,
            )

          const courseTeacherRows =
            courseTeachers.filter(
              (item) =>
                normalizeId(
                  item.courseId,
                ) === normalizedCourseId,
            )

          const assignmentRows =
            assignments.filter(
              (item) =>
                normalizeId(
                  item.courseId,
                ) === normalizedCourseId,
            )

          const teacherIds =
            Array.from(
              new Set([
                ...courseTeacherRows.map(
                  (item) =>
                    normalizeId(
                      item.teacherId,
                    ),
                ),
                ...assignmentRows.map(
                  (item) =>
                    normalizeId(
                      item.teacherId,
                    ),
                ),
              ]),
            ).filter(Boolean)

          return teacherIds.map(
            (teacherId) => {
              const teacher =
                teachers.find(
                  (item) =>
                    normalizeId(
                      item.id,
                    ) === teacherId,
                )

              const teacherStudentIds =
                new Set(
                  assignmentRows
                    .filter(
                      (item) =>
                        normalizeId(
                          item.teacherId,
                        ) === teacherId,
                    )
                    .map(
                      (item) =>
                        normalizeId(
                          item.studentId,
                        ),
                    )
                    .filter(Boolean),
                )

              const studentCount =
                teacherStudentIds.size

              const teacherRecords =
                selectedDateRecords.filter(
                  (record) =>
                    teacherStudentIds.has(
                      normalizeId(
                        record.studentId,
                      ),
                    ),
                )

              const seenStudents =
                new Set<string>()

              let presentCount = 0

              for (const record of teacherRecords) {
                const studentId =
                  normalizeId(
                    record.studentId,
                  )

                if (
                  !studentId ||
                  seenStudents.has(
                    studentId,
                  )
                ) {
                  continue
                }

                seenStudents.add(
                  studentId,
                )

                const statusName =
                  statusMap.get(
                    normalizeId(
                      record.statusId,
                    ),
                  ) ?? ''

                if (
                  isPresentStatus(
                    statusName,
                  )
                ) {
                  presentCount += 1
                }
              }

              const recordedCount =
                seenStudents.size

              const percentage =
                recordedCount === 0
                  ? null
                  : Math.round(
                      (presentCount /
                        studentCount) *
                        100,
                    )

              return {
                teacherId,
                teacherName:
                  teacher?.name ??
                  'معلم غير معروف',
                studentCount,
                presentCount,
                percentage,
                recordedCount,
              } as TeacherAttendanceDetail
            },
          )
        },
        [
          courseTeachers,
          assignments,
          teachers,
          selectedCourseId,
          selectedDateRecords,
          statusMap,
          lessonDateStatus,
        ],
      )

    const attendanceItems =
      useMemo(
        () => {
          const items = [
            {
              label: 'حاضرون',
              count:
                stats.presentCount,
              icon: UserCheck,
              color:
                'border-emerald-200 bg-emerald-50 text-emerald-700',
              iconColor:
                'bg-emerald-100 text-emerald-700',
            },
            {
              label: 'غائبون',
              count:
                stats.absentCount,
              icon: UserX,
              color:
                'border-red-200 bg-red-50 text-red-700',
              iconColor:
                'bg-red-100 text-red-700',
            },
            {
              label: 'متأخرون',
              count:
                stats.lateCount,
              icon: Clock3,
              color:
                'border-amber-200 bg-amber-50 text-amber-700',
              iconColor:
                'bg-amber-100 text-amber-700',
            },
            {
              label: 'مستأذنون',
              count:
                stats.excusedCount,
              icon: ClipboardCheck,
              color:
                'border-sky-200 bg-sky-50 text-sky-700',
              iconColor:
                'bg-sky-100 text-sky-700',
            },
          ]

          return items.filter(
            (item) =>
              item.count > 0,
          )
        },
        [stats],
      )

  return {
    statusMap,
    stats,
    attendancePercentage,
    teacherAttendanceDetails,
    attendanceItems,
  }
}
