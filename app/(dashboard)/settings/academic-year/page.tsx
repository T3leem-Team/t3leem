'use client'

import { useState } from 'react'
import { CalendarDays, Edit3, Plus, Trash2, X } from 'lucide-react'

import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type Course = {
  name: string
  startDate: string
  endDate: string
}

type AcademicYear = {
  id: number
  name: string
  startDate: string
  endDate: string
  courses: Course[]
}

const initialYears: AcademicYear[] = []

export default function Page() {
  const [years, setYears] = useState<AcademicYear[]>(initialYears)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [yearName, setYearName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [courseCount, setCourseCount] = useState(3)
  const [courses, setCourses] = useState<Course[]>([])

  const resetForm = () => {
    setYearName('')
    setStartDate('')
    setEndDate('')
    setCourseCount(3)
    setCourses([])
    setEditingId(null)
    setShowForm(false)
  }

  const openAddForm = () => {
    setEditingId(null)
    setYearName('')
    setStartDate('')
    setEndDate('')
    setCourseCount(3)
    setCourses(
      Array.from({ length: 3 }, () => ({
        name: '',
        startDate: '',
        endDate: '',
      })),
    )
    setShowForm(true)
  }

  const openEditForm = (year: AcademicYear) => {
    setEditingId(year.id)
    setYearName(year.name)
    setStartDate(year.startDate)
    setEndDate(year.endDate)
    setCourseCount(year.courses.length)
    setCourses(year.courses.map((course) => ({ ...course })))
    setShowForm(true)
  }

  const handleCourseCountChange = (count: number) => {
    setCourseCount(count)

    setCourses((current) => {
      const updated = [...current]

      if (count > updated.length) {
        while (updated.length < count) {
          updated.push({
            name: '',
            startDate: '',
            endDate: '',
          })
        }
      } else {
        updated.splice(count)
      }

      return updated
    })
  }

  const updateCourse = (
    index: number,
    field: keyof Course,
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

  const handleSave = () => {
    if (!yearName.trim()) {
      alert('اكتب اسم السنة الدراسية')
      return
    }

    if (!startDate || !endDate) {
      alert('حدد تاريخ بداية ونهاية السنة الدراسية')
      return
    }

    if (startDate > endDate) {
      alert('تاريخ بداية السنة يجب أن يكون قبل تاريخ النهاية')
      return
    }

    for (let index = 0; index < courses.length; index++) {
      const course = courses[index]

      if (!course.name.trim()) {
        alert(`اكتب اسم الدورة ${index + 1}`)
        return
      }

      if (!course.startDate || !course.endDate) {
        alert(`حدد تاريخ بداية ونهاية الدورة ${index + 1}`)
        return
      }

      if (course.startDate > course.endDate) {
        alert(`تاريخ بداية الدورة ${index + 1} يجب أن يكون قبل تاريخ النهاية`)
        return
      }
    }

    const newYear: AcademicYear = {
      id: editingId ?? Date.now(),
      name: yearName.trim(),
      startDate,
      endDate,
      courses,
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

    const confirmed = window.confirm(
      `هل أنت متأكد من حذف السنة الدراسية "${year.name}"؟`,
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
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  {editingId !== null
                    ? 'تعديل السنة الدراسية'
                    : 'إضافة سنة دراسية جديدة'}
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  أدخل بيانات السنة والدورات التابعة لها
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
                    السنة الدراسية
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
                    يمكن إضافة من دورة واحدة إلى خمس دورات
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

                    <div className="grid gap-4 md:grid-cols-3">
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
                {editingId !== null ? 'حفظ التعديلات' : 'حفظ'}
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
                        {year.name}
                      </h3>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {year.startDate} → {year.endDate}
                      </p>

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

