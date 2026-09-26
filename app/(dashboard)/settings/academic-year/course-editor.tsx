'use client'

import { useState } from 'react'
import {
  CalendarDays,
  Check,
  Eye,
  Lock,
  Plus,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type DayOfWeek =
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'

type Teacher = {
  id: string
  name: string
  isActive: boolean
}

type Subject = {
  id: string
  name: string
  isActive: boolean
}

type TeacherAssignment = {
  teacherId: string
  subjectIds: string[]
}

type Course = {
  id?: string
  name: string
  startDate: string
  endDate: string
  days: DayOfWeek[]
  teacherIds: string[]
  teacherAssignments: TeacherAssignment[]
  isClosed: boolean
  closedAt: string | null
}

type Props = {
  editingId: string | null
  yearName: string
  startDate: string
  endDate: string
  annualFee: string
  courses: Course[]
  teachers: Teacher[]
  subjects: Subject[]
  loadingTeachers: boolean
  loadingSubjects: boolean
  saving: boolean
  closingId: string | null

  onYearNameChange: (
    value: string,
  ) => void

  onStartDateChange: (
    value: string,
  ) => void

  onEndDateChange: (
    value: string,
  ) => void

  onAnnualFeeChange: (
    value: string,
  ) => void

  onCoursesChange: (
    courses: Course[],
  ) => void

  onClose: () => void

  onSave: () => void

  onCloseCourse: (
    course: Course,
  ) => void

  onOpenSummary: (
    course: Course,
  ) => void
}

const days: {
  value: DayOfWeek
  label: string
}[] = [
  { value: 'sunday', label: 'الأحد' },
  { value: 'monday', label: 'الاثنين' },
  { value: 'tuesday', label: 'الثلاثاء' },
  { value: 'wednesday', label: 'الأربعاء' },
  { value: 'thursday', label: 'الخميس' },
  { value: 'friday', label: 'الجمعة' },
  { value: 'saturday', label: 'السبت' },
]

export default function CourseEditor({
  editingId,
  yearName,
  startDate,
  endDate,
  annualFee,
  courses,
  teachers,
  subjects,
  loadingTeachers,
  loadingSubjects,
  saving,
  closingId,
  onYearNameChange,
  onStartDateChange,
  onEndDateChange,
  onAnnualFeeChange,
  onCoursesChange,
  onClose,
  onSave,
  onCloseCourse,
  onOpenSummary,
}: Props) {
  const [
    openDaysDropdown,
    setOpenDaysDropdown,
  ] = useState<number | null>(null)

  const [
    openTeachersDropdown,
    setOpenTeachersDropdown,
  ] = useState<number | null>(null)

  const [
    openSubjectDropdown,
    setOpenSubjectDropdown,
  ] = useState<string | null>(null)

  const createEmptyCourse = (): Course => ({
    name: '',
    startDate: '',
    endDate: '',
    days: [],
    teacherIds: [],
    teacherAssignments: [],
    isClosed: false,
    closedAt: null,
  })

  const addCourse = () => {
    onCoursesChange([
      ...courses,
      createEmptyCourse(),
    ])

    setOpenDaysDropdown(null)
    setOpenTeachersDropdown(null)
    setOpenSubjectDropdown(null)
  }

  const removeNewCourse = (
    index: number,
  ) => {
    const course = courses[index]

    if (course?.id) {
      return
    }

    onCoursesChange(
      courses.filter(
        (_, currentIndex) =>
          currentIndex !== index,
      ),
    )

    setOpenDaysDropdown(null)
    setOpenTeachersDropdown(null)
    setOpenSubjectDropdown(null)
  }

  const updateCourse = (
    index: number,
    field:
      | 'name'
      | 'startDate'
      | 'endDate',
    value: string,
  ) => {
    onCoursesChange(
      courses.map(
        (course, courseIndex) =>
          courseIndex === index
            ? {
                ...course,
                [field]: value,
              }
            : course,
      ),
    )
  }

  const toggleCourseDay = (
    courseIndex: number,
    day: DayOfWeek,
  ) => {
    const course = courses[courseIndex]

    if (!course || course.isClosed) {
      return
    }

    const selected = course.days.includes(
      day,
    )

    onCoursesChange(
      courses.map(
        (item, index) => {
          if (index !== courseIndex) {
            return item
          }

          return {
            ...item,
            days: selected
              ? item.days.filter(
                  (currentDay) =>
                    currentDay !== day,
                )
              : [
                  ...item.days,
                  day,
                ],
          }
        },
      ),
    )
  }

  const toggleTeacher = (
    courseIndex: number,
    teacherId: string,
  ) => {
    const course = courses[courseIndex]

    if (!course || course.isClosed) {
      return
    }

    const teacher = teachers.find(
      (item) => item.id === teacherId,
    )

    if (!teacher || !teacher.isActive) {
      return
    }

    const existing =
      course.teacherAssignments.find(
        (item) =>
          item.teacherId === teacherId,
      )

    if (existing) {
      onCoursesChange(
        courses.map(
          (item, index) => {
            if (
              index !== courseIndex
            ) {
              return item
            }

            const remainingAssignments =
              item.teacherAssignments.filter(
                (assignment) =>
                  assignment.teacherId !==
                  teacherId,
              )

            return {
              ...item,
              teacherIds:
                item.teacherIds.filter(
                  (id) =>
                    id !== teacherId,
                ),
              teacherAssignments:
                remainingAssignments,
            }
          },
        ),
      )

      return
    }

    onCoursesChange(
      courses.map(
        (item, index) => {
          if (index !== courseIndex) {
            return item
          }

          return {
            ...item,
            teacherIds: [
              ...item.teacherIds,
              teacherId,
            ],
            teacherAssignments: [
              ...item.teacherAssignments,
              {
                teacherId,
                subjectIds: [],
              },
            ],
          }
        },
      ),
    )
  }

  const toggleSubject = (
    courseIndex: number,
    teacherId: string,
    subjectId: string,
  ) => {
    const course = courses[courseIndex]

    if (!course || course.isClosed) {
      return
    }

    onCoursesChange(
      courses.map(
        (item, index) => {
          if (index !== courseIndex) {
            return item
          }

          const assignments =
            item.teacherAssignments.map(
              (assignment) => {
                if (
                  assignment.teacherId !==
                  teacherId
                ) {
                  return assignment
                }

                const selected =
                  assignment.subjectIds.includes(
                    subjectId,
                  )

                return {
                  ...assignment,
                  subjectIds: selected
                    ? assignment.subjectIds.filter(
                        (id) =>
                          id !==
                          subjectId,
                      )
                    : [
                        ...assignment.subjectIds,
                        subjectId,
                      ],
                }
              },
            )

          return {
            ...item,
            teacherAssignments:
              assignments,
          }
        },
      ),
    )
  }

  const getSelectedDaysLabel = (
    course: Course,
  ) => {
    if (course.days.length === 0) {
      return 'اختر الأيام'
    }

    return days
      .filter((day) =>
        course.days.includes(
          day.value,
        ),
      )
      .map((day) => day.label)
      .join('، ')
  }

  const getTeacher = (
    teacherId: string,
  ) => {
    return teachers.find(
      (teacher) =>
        teacher.id === teacherId,
    )
  }

  const getSubject = (
    subjectId: string,
  ) => {
    return subjects.find(
      (subject) =>
        subject.id === subjectId,
    )
  }

  const getTeacherSubjectsLabel = (
    assignment: TeacherAssignment,
  ) => {
    if (assignment.subjectIds.length === 0) {
      return 'المادة مطلوبة'
    }

    const names = assignment.subjectIds
      .map(
        (subjectId) =>
          getSubject(subjectId)?.name,
      )
      .filter(Boolean) as string[]

    if (names.length === 0) {
      return 'المادة مطلوبة'
    }

    return names.join('، ')
  }

  const getCourseTeacherAssignments = (
    course: Course,
  ) => {
    return course.teacherAssignments
  }

  return (
    <Card>
      <CardContent className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {editingId !== null
                ? 'تعديل السنة الدراسية'
                : 'إضافة سنة دراسية جديدة'}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              يمكنك تعديل الدورات المفتوحة فقط. الدورة المغلقة تحفظ بياناتها ولا يمكن تعديلها.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onClose}
            aria-label="إغلاق"
            disabled={saving}
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="rounded-lg border p-5">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays className="size-5 text-primary" />

            <h3 className="font-semibold">
              بيانات السنة الدراسية
            </h3>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                اسم السنة الدراسية
              </label>

              <input
                type="text"
                value={yearName}
                onChange={(event) =>
                  onYearNameChange(
                    event.target.value,
                  )
                }
                placeholder="مثال: 2026-2027"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                من
              </label>

              <input
                type="date"
                value={startDate}
                onChange={(event) =>
                  onStartDateChange(
                    event.target.value,
                  )
                }
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                إلى
              </label>

              <input
                type="date"
                value={endDate}
                onChange={(event) =>
                  onEndDateChange(
                    event.target.value,
                  )
                }
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                الرسوم السنوية
              </label>

              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={annualFee}
                  onChange={(event) =>
                    onAnnualFeeChange(
                      event.target.value,
                    )
                  }
                  placeholder="مثال: 120"
                  className="h-10 w-full rounded-md border bg-background px-3 pl-14 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />

                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  د.ب
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold">
                الدورات
              </h3>

              <p className="mt-1 text-sm text-muted-foreground">
                لكل معلم يجب تحديد مادة واحدة على الأقل.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={addCourse}
              disabled={saving}
            >
              <Plus className="size-4" />
              إضافة دورة
            </Button>
          </div>

          {courses.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <CalendarDays className="mx-auto size-8 text-muted-foreground" />

              <h4 className="mt-3 font-medium">
                لا توجد دورات
              </h4>

              <p className="mt-1 text-sm text-muted-foreground">
                أضف دورة جديدة للسنة الدراسية.
              </p>

              <Button
                type="button"
                variant="outline"
                className="mt-4"
                onClick={addCourse}
                disabled={saving}
              >
                <Plus className="size-4" />
                إضافة دورة
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {courses.map(
                (course, index) => {
                  const closed =
                    course.isClosed

                  const assignments =
                    getCourseTeacherAssignments(
                      course,
                    )

                  return (
                    <div
                      key={
                        course.id ??
                        `new-course-${index}`
                      }
                      className={`rounded-lg border p-4 ${
                        closed
                          ? 'border-blue-200 bg-blue-50/30'
                          : 'bg-muted/20'
                      }`}
                    >
                      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">
                            الدورة {index + 1}
                          </h4>

                          {closed && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-[11px] text-blue-700">
                              <Lock className="size-3" />
                              مغلقة
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {closed && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                onOpenSummary(
                                  course,
                                )
                              }
                            >
                              <Eye className="size-4" />
                              عرض ملخص الدورة
                            </Button>
                          )}

                          {!closed &&
                            !course.id && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  removeNewCourse(
                                    index,
                                  )
                                }
                                aria-label="حذف الدورة"
                                disabled={saving}
                              >
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            )}
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            اسم الدورة
                          </label>

                          <input
                            type="text"
                            value={course.name}
                            disabled={closed}
                            onChange={(event) =>
                              updateCourse(
                                index,
                                'name',
                                event.target
                                  .value,
                              )
                            }
                            placeholder="مثال: الدورة الأولى"
                            className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none disabled:cursor-not-allowed disabled:bg-muted focus:ring-2 focus:ring-primary/30"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            من
                          </label>

                          <input
                            type="date"
                            value={
                              course.startDate
                            }
                            disabled={closed}
                            onChange={(event) =>
                              updateCourse(
                                index,
                                'startDate',
                                event.target
                                  .value,
                              )
                            }
                            className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none disabled:cursor-not-allowed disabled:bg-muted focus:ring-2 focus:ring-primary/30"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            إلى
                          </label>

                          <input
                            type="date"
                            value={
                              course.endDate
                            }
                            disabled={closed}
                            onChange={(event) =>
                              updateCourse(
                                index,
                                'endDate',
                                event.target
                                  .value,
                              )
                            }
                            className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none disabled:cursor-not-allowed disabled:bg-muted focus:ring-2 focus:ring-primary/30"
                          />
                        </div>

                        <div className="relative space-y-2">
                          <label className="text-sm font-medium">
                            أيام الدورة
                          </label>

                          <button
                            type="button"
                            disabled={closed}
                            onClick={() =>
                              setOpenDaysDropdown(
                                openDaysDropdown ===
                                  index
                                  ? null
                                  : index,
                              )
                            }
                            className="flex h-10 w-full items-center justify-between rounded-md border bg-background px-3 text-sm outline-none transition-colors hover:bg-muted/50 focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <span
                              className={
                                course.days
                                  .length ===
                                0
                                  ? 'text-muted-foreground'
                                  : 'truncate'
                              }
                            >
                              {getSelectedDaysLabel(
                                course,
                              )}
                            </span>

                            <span className="mr-2 text-xs text-muted-foreground">
                              ▼
                            </span>
                          </button>

                          {openDaysDropdown ===
                            index &&
                            !closed && (
                              <div className="absolute right-0 z-50 mt-1 w-full min-w-[220px] rounded-md border bg-background p-2 shadow-lg">
                                <div className="space-y-1">
                                  {days.map(
                                    (day) => {
                                      const selected =
                                        course.days.includes(
                                          day.value,
                                        )

                                      return (
                                        <button
                                          key={
                                            day.value
                                          }
                                          type="button"
                                          onClick={() =>
                                            toggleCourseDay(
                                              index,
                                              day.value,
                                            )
                                          }
                                          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-right text-sm hover:bg-muted"
                                        >
                                          <span
                                            className={`flex size-4 items-center justify-center rounded-sm border ${
                                              selected
                                                ? 'border-primary bg-primary text-primary-foreground'
                                                : 'border-muted-foreground/40'
                                            }`}
                                          >
                                            {selected && (
                                              <Check className="size-3" />
                                            )}
                                          </span>

                                          <span>
                                            {
                                              day.label
                                            }
                                          </span>
                                        </button>
                                      )
                                    },
                                  )}
                                </div>

                                <div className="mt-2 border-t pt-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setOpenDaysDropdown(
                                        null,
                                      )
                                    }
                                    className="w-full rounded-md px-3 py-2 text-sm text-primary hover:bg-primary/10"
                                  >
                                    تم
                                  </button>
                                </div>
                              </div>
                            )}
                        </div>
                      </div>

                      <div className="relative mt-4 space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium">
                          <UserRound className="size-4 text-primary" />
                          معلمو الدورة
                        </label>

                        <button
                          type="button"
                          disabled={
                            closed ||
                            loadingTeachers
                          }
                          onClick={() =>
                            setOpenTeachersDropdown(
                              openTeachersDropdown ===
                                index
                                ? null
                                : index,
                            )
                          }
                          className="flex h-10 w-full items-center justify-between rounded-md border bg-background px-3 text-sm outline-none transition-colors hover:bg-muted/50 focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <span
                            className={
                              course.teacherIds
                                .length ===
                              0
                                ? 'text-muted-foreground'
                                : 'truncate'
                            }
                          >
                            {loadingTeachers
                              ? 'جاري تحميل المعلمين...'
                              : course.teacherIds
                                    .length ===
                                  0
                                ? 'اختر المعلمين'
                                : `${course.teacherIds.length} معلم`}
                          </span>

                          <span className="mr-2 text-xs text-muted-foreground">
                            ▼
                          </span>
                        </button>

                        {openTeachersDropdown ===
                          index &&
                          !closed && (
                            <div className="absolute right-0 z-50 mt-1 w-full rounded-md border bg-background p-2 shadow-lg">
                              {teachers.filter(
                                (teacher) =>
                                  teacher.isActive ||
                                  course.teacherIds.includes(
                                    teacher.id,
                                  ),
                              ).length ===
                              0 ? (
                                <div className="p-3 text-center text-sm text-muted-foreground">
                                  لا يوجد معلمون نشطون.
                                  <br />
                                  أضف معلمًا من قسم المعلمين أولًا.
                                </div>
                              ) : (
                                <div className="max-h-72 space-y-1 overflow-y-auto">
                                  {teachers
                                    .filter(
                                      (
                                        teacher,
                                      ) =>
                                        teacher.isActive ||
                                        course.teacherIds.includes(
                                          teacher.id,
                                        ),
                                    )
                                    .map(
                                      (
                                        teacher,
                                      ) => {
                                        const selected =
                                          course.teacherIds.includes(
                                            teacher.id,
                                          )

                                        return (
                                          <button
                                            key={
                                              teacher.id
                                            }
                                            type="button"
                                            disabled={
                                              !teacher.isActive
                                            }
                                            onClick={() =>
                                              toggleTeacher(
                                                index,
                                                teacher.id,
                                              )
                                            }
                                            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-right text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                                          >
                                            <span
                                              className={`flex size-4 shrink-0 items-center justify-center rounded-sm border ${
                                                selected
                                                  ? 'border-primary bg-primary text-primary-foreground'
                                                  : 'border-muted-foreground/40'
                                              }`}
                                            >
                                              {selected && (
                                                <Check className="size-3" />
                                              )}
                                            </span>

                                            <span className="min-w-0 flex-1 truncate">
                                              {
                                                teacher.name
                                              }
                                            </span>

                                            {!teacher.isActive && (
                                              <span className="text-xs text-muted-foreground">
                                                معطل
                                              </span>
                                            )}
                                          </button>
                                        )
                                      },
                                    )}
                                </div>
                              )}

                              <div className="mt-2 border-t pt-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenTeachersDropdown(
                                      null,
                                    )
                                  }
                                  className="w-full rounded-md px-3 py-2 text-sm text-primary hover:bg-primary/10"
                                >
                                  تم
                                </button>
                              </div>
                            </div>
                          )}
                      </div>

                      {assignments.length >
                        0 && (
                        <div className="mt-4 space-y-3">
                          {assignments.map(
                            (
                              assignment,
                            ) => {
                              const teacher =
                                getTeacher(
                                  assignment.teacherId,
                                )

                              const subjectsSelected =
                                assignment.subjectIds

                              const dropdownKey = `${index}-${assignment.teacherId}`

                              return (
                                <div
                                  key={
                                    assignment.teacherId
                                  }
                                  className="rounded-lg border bg-background p-4"
                                >
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-2">
                                      <UserRound className="size-4 text-primary" />

                                      <span className="font-medium">
                                        {teacher?.name ??
                                          'معلم'}
                                      </span>
                                    </div>

                                    <span
                                      className={`text-xs ${
                                        subjectsSelected.length ===
                                        0
                                          ? 'font-medium text-red-600'
                                          : 'text-muted-foreground'
                                      }`}
                                    >
                                      {subjectsSelected.length ===
                                      0
                                        ? 'المادة مطلوبة'
                                        : `${subjectsSelected.length} مادة`}
                                    </span>
                                  </div>

                                  <div className="relative mt-3">
                                    <label className="mb-2 block text-xs font-medium">
                                      المادة الدراسية{' '}
                                      <span className="text-red-500">
                                        *
                                      </span>
                                    </label>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        setOpenSubjectDropdown(
                                          openSubjectDropdown ===
                                            dropdownKey
                                            ? null
                                            : dropdownKey,
                                        )
                                      }
                                      disabled={
                                        loadingSubjects
                                      }
                                      className={`flex min-h-10 w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-right text-sm outline-none transition-colors hover:bg-muted/50 focus:ring-2 focus:ring-primary/30 ${
                                        subjectsSelected.length ===
                                        0
                                          ? 'border-red-300'
                                          : ''
                                      }`}
                                    >
                                      <span
                                        className={
                                          subjectsSelected.length ===
                                          0
                                            ? 'text-muted-foreground'
                                            : 'truncate'
                                        }
                                      >
                                        {loadingSubjects
                                          ? 'جاري تحميل المواد...'
                                          : subjectsSelected.length ===
                                              0
                                            ? 'اختر مادة واحدة على الأقل'
                                            : subjectsSelected
                                                .map(
                                                  (
                                                    subjectId,
                                                  ) =>
                                                    getSubject(
                                                      subjectId,
                                                    )?.name,
                                                )
                                                .filter(
                                                  Boolean,
                                                )
                                                .join(
                                                  '، ',
                                                )}
                                      </span>

                                      <span className="mr-2 text-xs text-muted-foreground">
                                        ▼
                                      </span>
                                    </button>

                                    {openSubjectDropdown ===
                                      dropdownKey && (
                                      <div className="absolute right-0 z-[60] mt-1 w-full rounded-md border bg-background p-2 shadow-lg">
                                        {subjects.filter(
                                          (subject) =>
                                            subject.isActive ||
                                            subjectsSelected.includes(
                                              subject.id,
                                            ),
                                        ).length ===
                                        0 ? (
                                          <div className="p-4 text-center text-sm text-muted-foreground">
                                            لا توجد مواد.
                                            <br />
                                            أضف المواد من صفحة المواد الدراسية أولًا.
                                          </div>
                                        ) : (
                                          <div className="max-h-64 space-y-1 overflow-y-auto">
                                            {subjects
                                              .filter(
                                                (
                                                  subject,
                                                ) =>
                                                  subject.isActive ||
                                                  subjectsSelected.includes(
                                                    subject.id,
                                                  ),
                                              )
                                              .map(
                                                (
                                                  subject,
                                                ) => {
                                                  const selected =
                                                    subjectsSelected.includes(
                                                      subject.id,
                                                    )

                                                  return (
                                                    <button
                                                      key={
                                                        subject.id
                                                      }
                                                      type="button"
                                                      onClick={() =>
                                                        toggleSubject(
                                                          index,
                                                          assignment.teacherId,
                                                          subject.id,
                                                        )
                                                      }
                                                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-right text-sm hover:bg-muted"
                                                    >
                                                      <span
                                                        className={`flex size-4 shrink-0 items-center justify-center rounded-sm border ${
                                                          selected
                                                            ? 'border-primary bg-primary text-primary-foreground'
                                                            : 'border-muted-foreground/40'
                                                        }`}
                                                      >
                                                        {selected && (
                                                          <Check className="size-3" />
                                                        )}
                                                      </span>

                                                      <span className="min-w-0 flex-1 truncate">
                                                        {
                                                          subject.name
                                                        }
                                                      </span>

                                                      {!subject.isActive && (
                                                        <span className="text-xs text-muted-foreground">
                                                          غير نشطة
                                                        </span>
                                                      )}
                                                    </button>
                                                  )
                                                },
                                              )}
                                          </div>
                                        )}

                                        <div className="mt-2 border-t pt-2">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setOpenSubjectDropdown(
                                                null,
                                              )
                                            }
                                            className="w-full rounded-md px-3 py-2 text-sm text-primary hover:bg-primary/10"
                                          >
                                            تم
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {subjectsSelected.length >
                                    0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      {subjectsSelected.map(
                                        (
                                          subjectId,
                                        ) => {
                                          const subject =
                                            getSubject(
                                              subjectId,
                                            )

                                          if (
                                            !subject
                                          ) {
                                            return null
                                          }

                                          return (
                                            <span
                                              key={
                                                subjectId
                                              }
                                              className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary"
                                            >
                                              {
                                                subject.name
                                              }

                                              <button
                                                type="button"
                                                onClick={() =>
                                                  toggleSubject(
                                                    index,
                                                    assignment.teacherId,
                                                    subjectId,
                                                  )
                                                }
                                                className="rounded-full hover:bg-primary/20"
                                                aria-label={`إزالة ${subject.name}`}
                                              >
                                                <X className="size-3" />
                                              </button>
                                            </span>
                                          )
                                        },
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            },
                          )}
                        </div>
                      )}

                      {!closed && (
                        <div className="mt-4 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            ملاحظة:
                          </span>{' '}
                          يجب تحديد مادة واحدة على الأقل لكل معلم قبل حفظ الدورة. يمكن للمعلم نفسه تدريس أكثر من مادة، ويمكن للمادة نفسها أن تكون مرتبطة بأكثر من معلم.
                        </div>
                      )}

                      {closed && (
                        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
                          هذه الدورة مغلقة. بياناتها محفوظة ولا يمكن تعديل اسمها أو أيامها أو معلميها أو موادها.
                        </div>
                      )}
                    </div>
                  )
                },
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            إلغاء
          </Button>

          <Button
            type="button"
            onClick={onSave}
            disabled={saving}
          >
            {saving
              ? 'جاري الحفظ...'
              : editingId !== null
                ? 'حفظ التعديلات'
                : 'حفظ'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
