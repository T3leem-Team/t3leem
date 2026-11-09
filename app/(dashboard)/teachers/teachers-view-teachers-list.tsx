'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, Users } from 'lucide-react'

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

import {
  loadTeacherDisplaySettings,
  type TeacherDisplayMode,
  type TeacherLevelAlias,
  type TeacherCustomAlias,
} from '@/lib/features/settings/repositories/teacher-settings.repository'

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

type TeacherDisplaySettings = {
  displayMode: TeacherDisplayMode
  levelAliases: TeacherLevelAlias[]
  teacherAliases: TeacherCustomAlias[]
}

type DisplayedGrade = {
  name: string
  colorKey: string
}

const gradeColors = [
  'bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:ring-teal-800',
  'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-800',
  'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-800',
  'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800',
  'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800',
  'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-800',
  'bg-cyan-50 text-cyan-700 ring-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:ring-cyan-800',
  'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-800',
]

function getGradeColor(colorKey: string) {
  let hash = 0

  for (let i = 0; i < colorKey.length; i++) {
    hash = (hash * 31 + colorKey.charCodeAt(i)) | 0
  }

  const index = Math.abs(hash) % gradeColors.length

  return gradeColors[index]
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
  const [displaySettings, setDisplaySettings] =
    useState<TeacherDisplaySettings>({
      displayMode: 'original',
      levelAliases: [],
      teacherAliases: [],
    })

  // تحميل إعدادات العرض المحفوظة
  useEffect(() => {
    let active = true

    async function loadDisplaySettings() {
      try {
        const { data, error } =
          await loadTeacherDisplaySettings()

        if (error) {
          throw error
        }

        if (!active || !data) return

        setDisplaySettings({
          displayMode:
            data.display_mode as TeacherDisplayMode,

          levelAliases: Array.isArray(data.level_aliases)
            ? data.level_aliases as unknown as TeacherLevelAlias[]
            : [],

          teacherAliases: Array.isArray(data.teacher_aliases)
            ? data.teacher_aliases as unknown as TeacherCustomAlias[]
            : [],
        })
      } catch (error) {
        console.error(
          'تعذر تحميل إعدادات عرض المعلمين:',
          error,
        )
      }
    }

    loadDisplaySettings()

    return () => {
      active = false
    }
  }, [])

  const levelMap = useMemo(
    () =>
      new Map(
        academicLevels.map((level) => [
          level.id,
          level,
        ]),
      ),
    [academicLevels],
  )

  // تجهيز مستويات المعلم حسب ترتيبها الدراسي
  const getTeacherGrades = (teacherId: string) => {
    const teacherStudentIds = new Set(
      assignments
        .filter(
          (assignment) =>
            assignment.courseId === currentCourse?.id &&
            assignment.teacherId === teacherId,
        )
        .map((assignment) => assignment.studentId),
    )

    const teacherLevels = Array.from(
      new Map(
        students
          .filter(
            (student) =>
              teacherStudentIds.has(student.id) &&
              Boolean(
                student.levelName &&
                student.levelName !== '—',
              ),
          )
          .map((student) => [
            student.levelId || student.levelName,
            {
              id: student.levelId || '',
              name: student.levelName,
            },
          ]),
      ).values(),
    ).sort((a, b) => {
      const levelA = levelMap.get(a.id)
      const levelB = levelMap.get(b.id)

      if (levelA && levelB) {
        return levelA.sort_order - levelB.sort_order
      }

      if (levelA) return -1
      if (levelB) return 1

      return a.name.localeCompare(b.name, 'ar')
    })

    return teacherLevels
  }

  // تطبيق طريقة العرض المختارة على مستويات المعلم
  const getDisplayedGrades = (
    teacherId: string,
    teacherGrades: {
      id: string
      name: string
    }[],
  ): DisplayedGrade[] => {
    if (displaySettings.displayMode === 'teacher') {
      const customAlias = displaySettings.teacherAliases.find(
        (item) => item.teacherId === teacherId,
      )

      if (customAlias?.displayName?.trim()) {
        return [
          {
            name: customAlias.displayName.trim(),
            colorKey: customAlias.id || teacherId,
          },
        ]
      }

      return teacherGrades.map((level) => ({
        name: level.name,
        colorKey: level.id || level.name,
      }))
    }

    if (displaySettings.displayMode === 'short') {
      const displayedGrades: DisplayedGrade[] = []

      for (const level of teacherGrades) {
        const matchingAlias =
          displaySettings.levelAliases.find(
            (alias) =>
              Boolean(level.id) &&
              alias.levels.includes(level.id),
          )

        const displayName =
          matchingAlias?.name?.trim() || level.name

        const colorKey =
          matchingAlias?.id || level.id || level.name

        if (
          !displayedGrades.some(
            (item) => item.name === displayName,
          )
        ) {
          displayedGrades.push({
            name: displayName,
            colorKey,
          })
        }
      }

      return displayedGrades
    }

    return teacherGrades.map((level) => ({
      name: level.name,
      colorKey: level.id || level.name,
    }))
  }

  return (
    <div className="space-y-3">
      {/* البحث */}
      <div className="relative w-full max-w-sm">
        <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

        <input
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="ابحث عن اسم المعلم..."
          className="h-10 w-full rounded-lg border border-input bg-background pr-9 pl-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/10"
        />
      </div>

      {/* جدول المعلمين */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
              جاري تحميل بيانات المعلمين...
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-2 p-6 text-center">
              <div className="flex size-11 items-center justify-center rounded-full bg-muted">
                <Users className="size-5 text-muted-foreground" />
              </div>

              <p className="font-medium">
                لا يوجد معلمون مرتبطون بهذه الدورة
              </p>

              <p className="text-sm text-muted-foreground">
                اربط المعلمين بالدورة من قسم السنة الدراسية والدورات.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[580px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="w-14 px-3 py-3 text-center text-xs font-semibold text-muted-foreground">
                      #
                    </th>

                    <th className="min-w-[150px] px-4 py-3 text-right text-xs font-semibold text-muted-foreground">
                      المعلم
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">
                      المواد والمستويات
                    </th>

                    <th className="w-28 px-4 py-3 text-center text-xs font-semibold text-muted-foreground">
                      عدد الطلاب
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredTeachers.map((teacher, index) => {
                    const teacherGrades =
                      getTeacherGrades(teacher.id)

                    const displayedGrades =
                      getDisplayedGrades(
                        teacher.id,
                        teacherGrades,
                      )

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

                    const studentCount =
                      getStudentCount(teacher.id)

                    return (
                      <tr
                        key={teacher.id}
                        onClick={() =>
                          onSelectTeacher(teacher.id)
                        }
                        className="group cursor-pointer border-b last:border-0 transition-colors hover:bg-muted/30"
                      >
                        {/* التسلسل */}
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex size-7 items-center justify-center rounded-md bg-muted/70 text-xs font-semibold tabular-nums text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary">
                            {index + 1}
                          </span>
                        </td>

                        {/* اسم المعلم */}
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              onSelectTeacher(teacher.id)
                            }}
                            className="text-right font-semibold text-foreground transition-colors hover:text-primary"
                          >
                            {teacher.name}
                          </button>
                        </td>

                        {/* المواد والمستويات */}
                        <td className="px-4 py-3">
                          <div className="flex min-w-0 flex-col items-start gap-2">
                            {teacherSubjects.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {teacherSubjects.map(
                                  (subject) => (
                                    <span
                                      key={subject}
                                      className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-foreground"
                                    >
                                      {subject}
                                    </span>
                                  ),
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                لا توجد مواد
                              </span>
                            )}

                            {displayedGrades.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {displayedGrades.map(
                                  (grade, gradeIndex) => (
                                    <span
                                      key={`${teacher.id}-${grade.colorKey}-${gradeIndex}`}
                                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${getGradeColor(grade.colorKey)}`}
                                    >
                                      {grade.name}
                                    </span>
                                  ),
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* عدد الطلاب */}
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex min-w-9 items-center justify-center rounded-lg bg-muted/60 px-2.5 py-1 text-sm font-semibold tabular-nums">
                            {studentCount}
                          </span>
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

      {/* عدد النتائج */}
      {!loading && filteredTeachers.length > 0 && (
        <div className="px-1 text-xs text-muted-foreground">
          عرض {filteredTeachers.length} معلم
        </div>
      )}
    </div>
  )
}
