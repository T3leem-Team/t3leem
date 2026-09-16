'use client'

import { useState } from 'react'
import { CalendarDays, Check, Edit3, Plus, Trash2, X } from 'lucide-react'

import { PageHeader } from '@/components/dashboard/page-header'
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

type Course = {
  name: string
  startDate: string
  endDate: string
  days: DayOfWeek[]
}

type AcademicYear = {
  id: number
  name: string
  startDate: string
  endDate: string
  courses: Course[]
}

const days: { value: DayOfWeek; label: string }[] = [
  { value: 'sunday', label: 'الأحد' },
  { value: 'monday', label: 'الاثنين' },
  { value: 'tuesday', label: 'الثلاثاء' },
  { value: 'wednesday', label: 'الأربعاء' },
  { value: 'thursday', label: 'الخميس' },
  { value: 'friday', label: 'الجمعة' },
  { value: 'saturday', label: 'السبت' },
]

const defaultDays: DayOfWeek[] = [
  'sunday',
  'tuesday',
  'thursday',
]

const initialYears: AcademicYear[] = []

const createEmptyCourse = (): Course => ({
  name: '',
  startDate: '',
  endDate: '',
  days: [...defaultDays],
})

export default function Page() {
  const [years, setYears] = useState<AcademicYear[]>(initialYears)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [yearName, setYearName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [courseCount, setCourseCount] = useState(3)

  const [courses, setCourses] = useState<Course[]>(
    Array.from({ length: 3 }, createEmptyCourse),
  )

  const [openDaysDropdown, setOpenDaysDropdown] = useState<number | null>(
    null,
  )

  const resetForm = () => {
    setYearName('')
    setStartDate('')
    setEndDate('')
    setCourseCount(3)
    setCourses(Array.from({ length: 3 }, createEmptyCourse))
    setEditingId(null)
    setShowForm(false)
    setOpenDaysDropdown(null)
  }

  const openAddForm = () => {
    setEditingId(null)
    setYearName('')
    setStartDate('')
    setEndDate('')
    setCourseCount(3)
    setCourses(Array.from({ length: 3 }, createEmptyCourse))
    setOpenDaysDropdown(null)
    setShowForm(true)
  }

  const openEditForm = (year: AcademicYear) => {
    setEditingId(year.id)
    setYearName(year.name)
    setStartDate(year.startDate)
    setEndDate(year.endDate)
    setCourseCount(year.courses.length || 3)

    setCourses(
      year.courses.length > 0
        ? year.courses.map((course) => ({
            ...course,
            days:
              course.days && course.days.length > 0
                ? [...course.days]
                : [...defaultDays],
          }))
        : Array.from({ length: 3 }, createEmptyCourse),
    )

    setOpenDaysDropdown(null)
    setShowForm(true)
  }

  const handleCourseCountChange = (count: number) => {
    setCourseCount(count)

    setCourses((current) => {
      const updated = [...current]

      if (count > updated.length) {
        while (updated.length < count) {
          updated.push(createEmptyCourse())
        }
      } else {
        updated.splice(count)
      }

      return updated
    })
  }

  const updateCourse = (
    index: number,
    field: 'name' | 'startDate' | 'endDate',
    value: string,
  ) => {
    setCourses((current) =>
      current.map((course, courseIndex) =>
        courseIndex === index
          ? { ...course, [field]: value }
          : course,
      ),
    )
  }

  const toggleCourseDay = (
    courseIndex: number,
    day: DayOfWeek,
  ) => {
    setCourses((current) =>
      current.map((course, index) => {
        if (index !== courseIndex) {
          return course
        }

        const alreadySelected = course.days.includes(day)

        return {
          ...course,
          days: alreadySelected
            ? course.days.filter(
                (currentDay) => currentDay !== day,
              )
            : [...course.days, day],
        }
      }),
    )
  }

  const getSelectedDaysLabel = (course: Course) => {
    if (course.days.length === 0) {
      return 'اختر الأيام'
    }

    return days
      .filter((day) => course.days.includes(day.value))
      .map((day) => day.label)
      .join('، ')
  }

  const handleSave = () => {
    const newYear: AcademicYear = {
      id: editingId ?? Date.now(),
      name: yearName.trim(),
      startDate,
      endDate,
      courses: courses.map((course) => ({
        name: course.name.trim(),
        startDate: course.startDate,
        endDate: course.endDate,
        days: [...course.days],
      })),
    }

    if (editingId !== null) {
      setYears((current) =>
        current.map((year) =>
          year.id === editingId ? newYear : year,
        ),
      )
    } else {
      setYears((current) => [...current, newYear])
    }

    resetForm()
  }

  const handleDelete = (id: number) => {
    const year = years.find((item) => item.id === id)

    if (!year) return

    const displayName = year.name || 'هذه السنة الدراسية'

    const confirmed = window.confirm(
      `هل أنت متأكد من مسح "${displayName}"؟`,
    )

    if (!confirmed) return

    setYears((current) =>
      current.filter((item) => item.id !== id),
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="السنة الدراسية والدورات"
        description="إدارة السنوات الدراسية والدورات التابعة لها"
      />

      {!showForm && (
        <div className="flex justify-end">
          <Button type="button" onClick={openAddForm}>
            <Plus className="size-4" />
            إضافة سنة جديدة
          </Button>
        </div>
      )}

      {showForm ? (
        <Card>
          <CardContent className="space-y-6 p-6">
            {/* عنوان النموذج */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  {editingId !== null
                    ? 'تعديل السنة الدراسية'
                    : 'إضافة سنة دراسية جديدة'}
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  يمكنك إدخال البيانات أو تركها فارغة وتعديلها لاحقًا.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={resetForm}
                aria-label="إغلاق"
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* بيانات السنة */}
            <div className="rounded-lg border p-5">
              <div className="mb-4 flex items-center gap-2">
                <CalendarDays className="size-5 text-primary" />

                <h3 className="font-semibold">
                  بيانات السنة الدراسية
                </h3>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    اسم السنة الدراسية
                  </label>

                  <input
                    type="text"
                    value={yearName}
                    onChange={(event) =>
                      setYearName(event.target.value)
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
                      setStartDate(event.target.value)
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
                      setEndDate(event.target.value)
                    }
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
            </div>

            {/* الدورات */}
            <div className="rounded-lg border p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold">
                    الدورات
                  </h3>

                  <p className="mt-1 text-sm text-muted-foreground">
                    العدد الافتراضي 3، ويمكن تغييره من 1 إلى 5.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">
                    عدد الدورات
                  </label>

                  <select
                    value={courseCount}
                    onChange={(event) =>
                      handleCourseCountChange(
                        Number(event.target.value),
                      )
                    }
                    className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {[1, 2, 3, 4, 5].map((count) => (
                      <option key={count} value={count}>
                        {count}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                {courses.map((course, index) => (
                  <div
                    key={index}
                    className="rounded-lg border bg-muted/20 p-4"
                  >
                    <h4 className="mb-4 font-medium">
                      الدورة {index + 1}
                    </h4>

                    {/* كل بيانات الدورة في نفس السطر */}
                    <div className="grid gap-4 md:grid-cols-4">
                      {/* اسم الدورة */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          اسم الدورة
                        </label>

                        <input
                          type="text"
                          value={course.name}
                          onChange={(event) =>
                            updateCourse(
                              index,
                              'name',
                              event.target.value,
                            )
                          }
                          placeholder={`مثال: الدورة ${index + 1}`}
                          className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>

                      {/* تاريخ البداية */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          من
                        </label>

                        <input
                          type="date"
                          value={course.startDate}
                          onChange={(event) =>
                            updateCourse(
                              index,
                              'startDate',
                              event.target.value,
                            )
                          }
                          className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>

                      {/* تاريخ النهاية */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          إلى
                        </label>

                        <input
                          type="date"
                          value={course.endDate}
                          onChange={(event) =>
                            updateCourse(
                              index,
                              'endDate',
                              event.target.value,
                            )
                          }
                          className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>

                      {/* Dropdown الأيام */}
                      <div className="relative space-y-2">
                        <label className="text-sm font-medium">
                          أيام الدورة
                        </label>

                        <button
                          type="button"
                          onClick={() =>
                            setOpenDaysDropdown(
                              openDaysDropdown === index
                                ? null
                                : index,
                            )
                          }
                          className="flex h-10 w-full items-center justify-between rounded-md border bg-background px-3 text-sm outline-none transition-colors hover:bg-muted/50 focus:ring-2 focus:ring-primary/30"
                        >
                          <span
                            className={
                              course.days.length === 0
                                ? 'text-muted-foreground'
                                : 'truncate'
                            }
                          >
                            {getSelectedDaysLabel(course)}
                          </span>

                          <span className="mr-2 text-xs text-muted-foreground">
                            ▼
                          </span>
                        </button>

                        {openDaysDropdown === index && (
                          <div className="absolute right-0 z-50 mt-1 w-full min-w-[220px] rounded-md border bg-background p-2 shadow-lg">
                            <div className="space-y-1">
                              {days.map((day) => {
                                const selected =
                                  course.days.includes(
                                    day.value,
                                  )

                                return (
                                  <button
                                    key={day.value}
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
                                      {day.label}
                                    </span>
                                  </button>
                                )
                              })}
                            </div>

                            <div className="mt-2 border-t pt-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenDaysDropdown(null)
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
                  </div>
                ))}
              </div>
            </div>

            {/* الأزرار */}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
              >
                إلغاء
              </Button>

              <Button
                type="button"
                onClick={handleSave}
              >
                {editingId !== null
                  ? 'حفظ التعديلات'
                  : 'حفظ'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            {years.length === 0 ? (
              <div className="p-10 text-center">
                <CalendarDays className="mx-auto size-10 text-muted-foreground" />

                <h3 className="mt-4 font-semibold">
                  لا توجد سنوات دراسية
                </h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  اضغط على "إضافة سنة جديدة" لإضافة أول سنة دراسية.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {years.map((year) => (
                  <div
                    key={year.id}
                    className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="min-w-0">
                      <h3 className="font-semibold">
                        {year.name || 'بدون اسم'}
                      </h3>

                      {(year.startDate || year.endDate) && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {year.startDate || '—'} →{' '}
                          {year.endDate || '—'}
                        </p>
                      )}

                      <p className="mt-2 text-sm">
                        عدد الدورات:{' '}
                        <span className="font-medium">
                          {year.courses.length}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openEditForm(year)}
                      >
                        <Edit3 className="size-4" />
                        تعديل
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(year.id)}
                      >
                        <Trash2 className="size-4" />
                        مسح
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
