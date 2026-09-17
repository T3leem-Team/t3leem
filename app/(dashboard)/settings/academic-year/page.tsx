'use client'

import { useEffect, useState } from 'react'
import {
  CalendarDays,
  Check,
  Edit3,
  Plus,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'

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

type Teacher = {
  id: string
  name: string
  isActive: boolean
}

type Course = {
  id?: string
  name: string
  startDate: string
  endDate: string
  days: DayOfWeek[]
  teacherIds: string[]
}

type AcademicYear = {
  id: string
  name: string
  startDate: string
  endDate: string
  annualFee: number
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

const createEmptyCourse = (): Course => ({
  name: '',
  startDate: '',
  endDate: '',
  days: [...defaultDays],
  teacherIds: [],
})

export default function Page() {
  const [years, setYears] = useState<AcademicYear[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])

  const [loadingYears, setLoadingYears] = useState(true)
  const [loadingTeachers, setLoadingTeachers] = useState(true)

  const [saving, setSaving] = useState(false)
  const [supabaseStatus, setSupabaseStatus] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [yearName, setYearName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [annualFee, setAnnualFee] = useState('')
  const [courseCount, setCourseCount] = useState(3)

  const [courses, setCourses] = useState<Course[]>(
    Array.from({ length: 3 }, createEmptyCourse),
  )

  const [openDaysDropdown, setOpenDaysDropdown] =
    useState<number | null>(null)

  const [openTeachersDropdown, setOpenTeachersDropdown] =
    useState<number | null>(null)

  useEffect(() => {
    const loadTeachers = async () => {
      setLoadingTeachers(true)

      const { data, error } = await supabase
        .from('teachers')
        .select('id, name, is_active')
        .order('name', { ascending: true })

      if (error) {
        setSupabaseStatus(
          `خطأ في تحميل المعلمين: ${error.message}`,
        )
        setLoadingTeachers(false)
        return
      }

      const mappedTeachers: Teacher[] = (data ?? []).map(
        (teacher) => ({
          id: teacher.id,
          name: teacher.name ?? '',
          isActive: Boolean(teacher.is_active),
        }),
      )

      mappedTeachers.sort((a, b) =>
        a.name.localeCompare(b.name, 'ar'),
      )

      setTeachers(mappedTeachers)
      setLoadingTeachers(false)
    }

    loadTeachers()
  }, [])

  useEffect(() => {
    const loadYears = async () => {
      setLoadingYears(true)

      const { data, error } = await supabase
        .from('academic_years')
        .select(
          'id, name, start_date, end_date, annual_fee, is_current, is_active, created_at',
        )
        .order('created_at', { ascending: false })

      if (error) {
        setSupabaseStatus(
          `خطأ في تحميل السنوات الدراسية: ${error.message}`,
        )
        setLoadingYears(false)
        return
      }

      const academicYears = data ?? []

      if (academicYears.length === 0) {
        setYears([])
        setSupabaseStatus('متصل بـ Supabase ✅')
        setLoadingYears(false)
        return
      }

      const yearIds = academicYears.map((year) => year.id)

      const { data: courseData, error: courseError } =
        await supabase
          .from('courses')
          .select(
            'id, academic_year_id, name, start_date, end_date, days',
          )
          .in('academic_year_id', yearIds)
          .order('created_at', {
            ascending: true,
          })

      if (courseError) {
        setSupabaseStatus(
          `خطأ في تحميل الدورات: ${courseError.message}`,
        )
        setLoadingYears(false)
        return
      }

      const courseIds = (courseData ?? []).map(
        (course) => course.id,
      )

      let courseTeacherData: {
        course_id: string
        teacher_id: string
      }[] = []

      if (courseIds.length > 0) {
        const {
          data: relationData,
          error: relationError,
        } = await supabase
          .from('course_teachers')
          .select('course_id, teacher_id')
          .in('course_id', courseIds)

        if (relationError) {
          setSupabaseStatus(
            `خطأ في تحميل معلمي الدورات: ${relationError.message}`,
          )
          setLoadingYears(false)
          return
        }

        courseTeacherData = relationData ?? []
      }

      const mappedYears: AcademicYear[] =
        academicYears.map((year) => {
          const yearCourses = (courseData ?? [])
            .filter(
              (course) =>
                course.academic_year_id === year.id,
            )
            .map((course) => ({
              id: course.id,
              name: course.name ?? '',
              startDate: course.start_date ?? '',
              endDate: course.end_date ?? '',
              days:
                Array.isArray(course.days) &&
                course.days.length > 0
                  ? (course.days as DayOfWeek[])
                  : [...defaultDays],
              teacherIds: courseTeacherData
                .filter(
                  (relation) =>
                    relation.course_id === course.id,
                )
                .map((relation) => relation.teacher_id),
            }))

          return {
            id: year.id,
            name: year.name ?? '',
            startDate: year.start_date ?? '',
            endDate: year.end_date ?? '',
            annualFee: Number(year.annual_fee ?? 0),
            courses: yearCourses,
          }
        })

      setYears(mappedYears)
      setSupabaseStatus('متصل بـ Supabase ✅')
      setLoadingYears(false)
    }

    loadYears()
  }, [])

  const resetForm = () => {
    setYearName('')
    setStartDate('')
    setEndDate('')
    setAnnualFee('')
    setCourseCount(3)
    setCourses(
      Array.from({ length: 3 }, createEmptyCourse),
    )
    setEditingId(null)
    setShowForm(false)
    setOpenDaysDropdown(null)
    setOpenTeachersDropdown(null)
  }

  const openAddForm = () => {
    setEditingId(null)
    setYearName('')
    setStartDate('')
    setEndDate('')
    setAnnualFee('')
    setCourseCount(3)
    setCourses(
      Array.from({ length: 3 }, createEmptyCourse),
    )
    setOpenDaysDropdown(null)
    setOpenTeachersDropdown(null)
    setSupabaseStatus('')
    setShowForm(true)
  }

  const openEditForm = (year: AcademicYear) => {
    setEditingId(year.id)
    setYearName(year.name)
    setStartDate(year.startDate)
    setEndDate(year.endDate)
    setAnnualFee(
      year.annualFee !== undefined &&
        year.annualFee !== null
        ? String(year.annualFee)
        : '',
    )

    setCourseCount(year.courses.length || 3)

    setCourses(
      year.courses.length > 0
        ? year.courses.map((course) => ({
            ...course,
            teacherIds: [...course.teacherIds],
            days:
              course.days &&
              course.days.length > 0
                ? [...course.days]
                : [...defaultDays],
          }))
        : Array.from(
            { length: 3 },
            createEmptyCourse,
          ),
    )

    setOpenDaysDropdown(null)
    setOpenTeachersDropdown(null)
    setSupabaseStatus('')
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

        const alreadySelected =
          course.days.includes(day)

        return {
          ...course,
          days: alreadySelected
            ? course.days.filter(
                (currentDay) =>
                  currentDay !== day,
              )
            : [...course.days, day],
        }
      }),
    )
  }

  const toggleCourseTeacher = (
    courseIndex: number,
    teacherId: string,
  ) => {
    const teacher = teachers.find(
      (item) => item.id === teacherId,
    )

    if (!teacher || !teacher.isActive) {
      return
    }

    setCourses((current) =>
      current.map((course, index) => {
        if (index !== courseIndex) {
          return course
        }

        const alreadySelected =
          course.teacherIds.includes(teacherId)

        return {
          ...course,
          teacherIds: alreadySelected
            ? course.teacherIds.filter(
                (id) => id !== teacherId,
              )
            : [...course.teacherIds, teacherId],
        }
      }),
    )
  }

  const getSelectedDaysLabel = (course: Course) => {
    if (course.days.length === 0) {
      return 'اختر الأيام'
    }

    return days
      .filter((day) =>
        course.days.includes(day.value),
      )
      .map((day) => day.label)
      .join('، ')
  }

  const getSelectedTeachersLabel = (
    course: Course,
  ) => {
    if (course.teacherIds.length === 0) {
      return 'اختر المعلمين'
    }

    const selectedTeachers = teachers.filter(
      (teacher) =>
        course.teacherIds.includes(teacher.id),
    )

    if (selectedTeachers.length === 0) {
      return 'اختر المعلمين'
    }

    if (selectedTeachers.length <= 2) {
      return selectedTeachers
        .map((teacher) => teacher.name)
        .join('، ')
    }

    return `${selectedTeachers[0].name}، ${selectedTeachers[1].name} + ${selectedTeachers.length - 2}`
  }

  const handleSave = async () => {
    const trimmedName = yearName.trim()

    const parsedAnnualFee =
      annualFee.trim() === ''
        ? 0
        : Number(annualFee)

    if (!trimmedName) {
      setSupabaseStatus(
        'يرجى إدخال اسم السنة الدراسية',
      )
      return
    }

    if (
      !Number.isFinite(parsedAnnualFee) ||
      parsedAnnualFee < 0
    ) {
      setSupabaseStatus(
        'يرجى إدخال رسوم سنوية صحيحة',
      )
      return
    }

    for (
      let index = 0;
      index < courses.length;
      index += 1
    ) {
      const course = courses[index]

      if (!course.name.trim()) {
        setSupabaseStatus(
          `يرجى إدخال اسم الدورة ${index + 1}`,
        )
        return
      }

      if (course.days.length === 0) {
        setSupabaseStatus(
          `يرجى اختيار يوم واحد على الأقل للدورة ${index + 1}`,
        )
        return
      }

      if (course.teacherIds.length === 0) {
        setSupabaseStatus(
          `يرجى إضافة معلم واحد على الأقل للدورة ${index + 1}`,
        )
        return
      }
    }

    setSaving(true)
    setSupabaseStatus('جاري الحفظ...')

    if (editingId !== null) {
      const {
        data: updatedYear,
        error: yearError,
      } = await supabase
        .from('academic_years')
        .update({
          name: trimmedName,
          start_date: startDate || null,
          end_date: endDate || null,
          annual_fee: parsedAnnualFee,
        })
        .eq('id', editingId)
        .select(
          'id, name, start_date, end_date, annual_fee',
        )
        .single()

      if (yearError) {
        setSupabaseStatus(
          `خطأ في تعديل السنة الدراسية: ${yearError.message}`,
        )
        setSaving(false)
        return
      }

      const {
        data: existingCourses,
        error: existingCoursesError,
      } = await supabase
        .from('courses')
        .select('id')
        .eq('academic_year_id', editingId)

      if (existingCoursesError) {
        setSupabaseStatus(
          `خطأ في تحميل دورات السنة: ${existingCoursesError.message}`,
        )
        setSaving(false)
        return
      }

      const existingCourseIds =
        (existingCourses ?? []).map(
          (course) => course.id,
        )

      if (existingCourseIds.length > 0) {
        const {
          error: deleteRelationsError,
        } = await supabase
          .from('course_teachers')
          .delete()
          .in(
            'course_id',
            existingCourseIds,
          )

        if (deleteRelationsError) {
          setSupabaseStatus(
            `خطأ في تحديث معلمي الدورات: ${deleteRelationsError.message}`,
          )
          setSaving(false)
          return
        }
      }

      const { error: deleteCoursesError } =
        await supabase
          .from('courses')
          .delete()
          .eq(
            'academic_year_id',
            editingId,
          )

      if (deleteCoursesError) {
        setSupabaseStatus(
          `خطأ في تحديث الدورات: ${deleteCoursesError.message}`,
        )
        setSaving(false)
        return
      }

      const courseRows = courses.map(
        (course) => ({
          academic_year_id: editingId,
          name: course.name.trim(),
          start_date:
            course.startDate || null,
          end_date:
            course.endDate || null,
          days: course.days,
        }),
      )

      const {
        data: insertedCourses,
        error: insertCoursesError,
      } = await supabase
        .from('courses')
        .insert(courseRows)
        .select(
          'id, academic_year_id, name, start_date, end_date, days',
        )

      if (insertCoursesError) {
        setSupabaseStatus(
          `خطأ في حفظ الدورات: ${insertCoursesError.message}`,
        )
        setSaving(false)
        return
      }

      const relationRows: {
        course_id: string
        teacher_id: string
      }[] = []

      ;(insertedCourses ?? []).forEach(
        (insertedCourse, index) => {
          const selectedTeacherIds =
            courses[index]?.teacherIds ?? []

          selectedTeacherIds.forEach(
            (teacherId) => {
              relationRows.push({
                course_id:
                  insertedCourse.id,
                teacher_id: teacherId,
              })
            },
          )
        },
      )

      if (relationRows.length > 0) {
        const {
          error: relationInsertError,
        } = await supabase
          .from('course_teachers')
          .insert(relationRows)

        if (relationInsertError) {
          setSupabaseStatus(
            `خطأ في حفظ معلمي الدورات: ${relationInsertError.message}`,
          )
          setSaving(false)
          return
        }
      }

      const mappedUpdatedYear: AcademicYear = {
        id: updatedYear.id,
        name: updatedYear.name ?? '',
        startDate:
          updatedYear.start_date ?? '',
        endDate:
          updatedYear.end_date ?? '',
        annualFee: Number(
          updatedYear.annual_fee ?? 0,
        ),
        courses: (insertedCourses ?? []).map(
          (course, index) => ({
            id: course.id,
            name: course.name ?? '',
            startDate:
              course.start_date ?? '',
            endDate:
              course.end_date ?? '',
            days:
              Array.isArray(course.days) &&
              course.days.length > 0
                ? (course.days as DayOfWeek[])
                : [...defaultDays],
            teacherIds:
              courses[index]?.teacherIds ?? [],
          }),
        ),
      }

      setYears((current) =>
        current.map((year) =>
          year.id === editingId
            ? mappedUpdatedYear
            : year,
        ),
      )

      setSupabaseStatus(
        'تم تعديل السنة والدورات والمعلمين في Supabase ✅',
      )

      setSaving(false)
      resetForm()
      return
    }

    const {
      error: resetCurrentError,
    } = await supabase
      .from('academic_years')
      .update({
        is_current: false,
      })
      .eq('is_current', true)

    if (resetCurrentError) {
      setSupabaseStatus(
        `خطأ في تحديث السنة الحالية: ${resetCurrentError.message}`,
      )
      setSaving(false)
      return
    }

    const {
      data: newYear,
      error: yearError,
    } = await supabase
      .from('academic_years')
      .insert({
        name: trimmedName,
        start_date: startDate || null,
        end_date: endDate || null,
        annual_fee: parsedAnnualFee,
        is_current: true,
        is_active: true,
      })
      .select(
        'id, name, start_date, end_date, annual_fee',
      )
      .single()

    if (yearError) {
      setSupabaseStatus(
        `خطأ في إضافة السنة الدراسية: ${yearError.message}`,
      )
      setSaving(false)
      return
    }

    const courseRows = courses.map(
      (course) => ({
        academic_year_id: newYear.id,
        name: course.name.trim(),
        start_date:
          course.startDate || null,
        end_date:
          course.endDate || null,
        days: course.days,
      }),
    )

    const {
      data: insertedCourses,
      error: insertCoursesError,
    } = await supabase
      .from('courses')
      .insert(courseRows)
      .select(
        'id, academic_year_id, name, start_date, end_date, days',
      )

    if (insertCoursesError) {
      setSupabaseStatus(
        `خطأ في حفظ الدورات: ${insertCoursesError.message}`,
      )
      setSaving(false)
      return
    }

    const relationRows: {
      course_id: string
      teacher_id: string
    }[] = []

    ;(insertedCourses ?? []).forEach(
      (course, index) => {
        const selectedTeacherIds =
          courses[index]?.teacherIds ?? []

        selectedTeacherIds.forEach(
          (teacherId) => {
            relationRows.push({
              course_id: course.id,
              teacher_id: teacherId,
            })
          },
        )
      },
    )

    if (relationRows.length > 0) {
      const {
        error: relationInsertError,
      } = await supabase
        .from('course_teachers')
        .insert(relationRows)

      if (relationInsertError) {
        setSupabaseStatus(
          `خطأ في حفظ معلمي الدورات: ${relationInsertError.message}`,
        )
        setSaving(false)
        return
      }
    }

    const mappedNewYear: AcademicYear = {
      id: newYear.id,
      name: newYear.name ?? '',
      startDate:
        newYear.start_date ?? '',
      endDate:
        newYear.end_date ?? '',
      annualFee: Number(
        newYear.annual_fee ?? 0,
      ),
      courses: (insertedCourses ?? []).map(
        (course, index) => ({
          id: course.id,
          name: course.name ?? '',
          startDate:
            course.start_date ?? '',
          endDate:
            course.end_date ?? '',
          days:
            Array.isArray(course.days) &&
            course.days.length > 0
              ? (course.days as DayOfWeek[])
              : [...defaultDays],
          teacherIds:
            courses[index]?.teacherIds ?? [],
        }),
      ),
    }

    setYears((current) => [
      mappedNewYear,
      ...current,
    ])

    setSupabaseStatus(
      'تمت إضافة السنة والدورات والمعلمين في Supabase ✅',
    )

    setSaving(false)
    resetForm()
  }

  const handleDelete = async (id: string) => {
    const year = years.find(
      (item) => item.id === id,
    )

    if (!year) return

    const displayName =
      year.name || 'هذه السنة الدراسية'

    const confirmed = window.confirm(
      `هل أنت متأكد من مسح "${displayName}"؟`,
    )

    if (!confirmed) return

    setSaving(true)
    setSupabaseStatus('جاري المسح...')

    const { error } = await supabase
      .from('academic_years')
      .delete()
      .eq('id', id)

    if (error) {
      setSupabaseStatus(
        `خطأ في مسح السنة الدراسية: ${error.message}`,
      )
      setSaving(false)
      return
    }

    setYears((current) =>
      current.filter(
        (item) => item.id !== id,
      ),
    )

    setSupabaseStatus(
      'تم مسح السنة الدراسية من Supabase ✅',
    )

    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="السنة الدراسية والدورات"
        description="إدارة السنوات الدراسية والدورات التابعة لها"
      />

      {supabaseStatus && (
        <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
          {supabaseStatus}
        </div>
      )}

      {!showForm && (
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={openAddForm}
            disabled={saving}
          >
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
                  يمكنك إدخال البيانات أو تعديلها لاحقًا.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={resetForm}
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
                        setAnnualFee(event.target.value)
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
                        Number(
                          event.target.value,
                        ),
                      )
                    }
                    className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {[1, 2, 3, 4, 5].map(
                      (count) => (
                        <option
                          key={count}
                          value={count}
                        >
                          {count}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                {courses.map(
                  (course, index) => (
                    <div
                      key={course.id ?? index}
                      className="rounded-lg border bg-muted/20 p-4"
                    >
                      <h4 className="mb-4 font-medium">
                        الدورة {index + 1}
                      </h4>

                      <div className="grid gap-4 md:grid-cols-4">
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
                                event.target
                                  .value,
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
                            value={
                              course.startDate
                            }
                            onChange={(event) =>
                              updateCourse(
                                index,
                                'startDate',
                                event.target
                                  .value,
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
                            value={
                              course.endDate
                            }
                            onChange={(event) =>
                              updateCourse(
                                index,
                                'endDate',
                                event.target
                                  .value,
                              )
                            }
                            className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>

                        <div className="relative space-y-2">
                          <label className="text-sm font-medium">
                            أيام الدورة
                          </label>

                          <button
                            type="button"
                            onClick={() =>
                              setOpenDaysDropdown(
                                openDaysDropdown ===
                                  index
                                  ? null
                                  : index,
                              )
                            }
                            className="flex h-10 w-full items-center justify-between rounded-md border bg-background px-3 text-sm outline-none transition-colors hover:bg-muted/50 focus:ring-2 focus:ring-primary/30"
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
                            index && (
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
                          onClick={() =>
                            setOpenTeachersDropdown(
                              openTeachersDropdown ===
                                index
                                ? null
                                : index,
                            )
                          }
                          disabled={loadingTeachers}
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
                              : getSelectedTeachersLabel(
                                  course,
                                )}
                          </span>

                          <span className="mr-2 text-xs text-muted-foreground">
                            ▼
                          </span>
                        </button>

                        {openTeachersDropdown ===
                          index && (
                          <div className="absolute right-0 z-50 mt-1 w-full rounded-md border bg-background p-2 shadow-lg">
                            {teachers.filter(
                              (teacher) =>
                                teacher.isActive ||
                                course.teacherIds.includes(
                                  teacher.id,
                                ),
                            ).length === 0 ? (
                              <div className="p-3 text-center text-sm text-muted-foreground">
                                لا يوجد معلمون نشطون.
                                <br />
                                أضف معلمًا من قسم المعلمين أولًا.
                              </div>
                            ) : (
                              <div className="max-h-64 space-y-1 overflow-y-auto">
                                {teachers
                                  .filter(
                                    (teacher) =>
                                      teacher.isActive ||
                                      course.teacherIds.includes(
                                        teacher.id,
                                      ),
                                  )
                                  .map(
                                    (teacher) => {
                                      const selected =
                                        course.teacherIds.includes(
                                          teacher.id,
                                        )

                                      const disabledTeacher =
                                        !teacher.isActive

                                      return (
                                        <button
                                          key={
                                            teacher.id
                                          }
                                          type="button"
                                          onClick={() =>
                                            toggleCourseTeacher(
                                              index,
                                              teacher.id,
                                            )
                                          }
                                          disabled={
                                            disabledTeacher
                                          }
                                          className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-right text-sm ${
                                            disabledTeacher
                                              ? 'cursor-not-allowed opacity-60'
                                              : 'hover:bg-muted'
                                          }`}
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

                                          {disabledTeacher && (
                                            <span className="shrink-0 text-xs text-muted-foreground">
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

                      {course.teacherIds.length >
                        0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {teachers
                            .filter(
                              (teacher) =>
                                course.teacherIds.includes(
                                  teacher.id,
                                ),
                            )
                            .map((teacher) => (
                              <span
                                key={teacher.id}
                                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ${
                                  teacher.isActive
                                    ? 'bg-primary/10 text-primary'
                                    : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                <UserRound className="size-3" />
                                {teacher.name}

                                {!teacher.isActive && (
                                  <span>
                                    · معطل
                                  </span>
                                )}
                              </span>
                            ))}
                        </div>
                      )}
                    </div>
                  ),
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={saving}
              >
                إلغاء
              </Button>

              <Button
                type="button"
                onClick={handleSave}
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
      ) : (
        <Card>
          <CardContent className="p-0">
            {loadingYears ? (
              <div className="p-10 text-center">
                <CalendarDays className="mx-auto size-10 animate-pulse text-muted-foreground" />

                <h3 className="mt-4 font-semibold">
                  جاري تحميل السنوات الدراسية...
                </h3>
              </div>
            ) : years.length === 0 ? (
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
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">
                          {year.name ||
                            'بدون اسم'}
                        </h3>
                      </div>

                      {(year.startDate ||
                        year.endDate) && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {year.startDate ||
                            '—'}{' '}
                          →{' '}
                          {year.endDate ||
                            '—'}
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                        <p>
                          الرسوم السنوية:{' '}
                          <span className="font-medium">
                            {year.annualFee.toFixed(
                              3,
                            )}{' '}
                            د.ب
                          </span>
                        </p>

                        <p>
                          عدد الدورات:{' '}
                          <span className="font-medium">
                            {year.courses.length}
                          </span>
                        </p>

                        <p>
                          عدد المعلمين:{' '}
                          <span className="font-medium">
                            {
                              new Set(
                                year.courses.flatMap(
                                  (course) =>
                                    course.teacherIds,
                                ),
                              ).size
                            }
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          openEditForm(year)
                        }
                        disabled={saving}
                      >
                        <Edit3 className="size-4" />
                        تعديل
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleDelete(year.id)
                        }
                        disabled={saving}
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

