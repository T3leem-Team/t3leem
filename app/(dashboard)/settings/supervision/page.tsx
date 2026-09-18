'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  MessageSquareText,
  Plus,
  UserX,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { supabase } from '@/lib/supabase'

import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type SupervisionType =
  | 'day_cancelled'
  | 'lesson_cancelled'
  | 'teacher_absent'
  | 'teacher_late'
  | 'note'

type AcademicYear = {
  id: string
  name: string
  start_date: string | null
  end_date: string | null
}

type Course = {
  id: string
  academic_year_id: string
  name: string
  start_date: string | null
  end_date: string | null
  days: string[]
}

type Teacher = {
  id: string
  name: string
}

type SupervisionRecord = {
  id: string
  type: SupervisionType
  date: string
  course: string
  teacher: string
  reason: string
  note: string
  createdBy: string
  createdAt: string
}

const supervisionTypes: {
  value: SupervisionType
  label: string
}[] = [
  {
    value: 'day_cancelled',
    label: 'إلغاء يوم دراسي',
  },
  {
    value: 'lesson_cancelled',
    label: 'إلغاء درس',
  },
  {
    value: 'teacher_absent',
    label: 'غياب معلم',
  },
  {
    value: 'teacher_late',
    label: 'تأخر معلم',
  },
  {
    value: 'note',
    label: 'ملاحظة إشرافية',
  },
]

function getTypeLabel(type: SupervisionType) {
  return (
    supervisionTypes.find((item) => item.value === type)?.label ??
    type
  )
}

function getTypeIcon(type: SupervisionType): LucideIcon {
  switch (type) {
    case 'day_cancelled':
    case 'lesson_cancelled':
      return CalendarDays

    case 'teacher_absent':
      return UserX

    case 'teacher_late':
      return Clock3

    case 'note':
      return MessageSquareText
  }
}

function getTypeBadgeVariant(type: SupervisionType) {
  switch (type) {
    case 'teacher_absent':
      return 'destructive' as const

    case 'day_cancelled':
    case 'lesson_cancelled':
      return 'warning' as const

    default:
      return 'neutral' as const
  }
}

function getLocalDateString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatDateTime(value: string) {
  try {
    return new Intl.DateTimeFormat('ar-BH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return value
  }
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('ar-BH', {
      dateStyle: 'medium',
    }).format(new Date(`${value}T00:00:00`))
  } catch {
    return value
  }
}

export default function SupervisionPage() {
  const today = getLocalDateString()

  const [academicYear, setAcademicYear] =
    useState<AcademicYear | null>(null)

  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState('')

  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [records, setRecords] = useState<SupervisionRecord[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [error, setError] = useState('')

  const [isFormOpen, setIsFormOpen] = useState(false)

  const [selectedType, setSelectedType] =
    useState<SupervisionType>('day_cancelled')

  const [selectedTeacher, setSelectedTeacher] = useState('')
  const [selectedDate, setSelectedDate] = useState(today)
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')

  const selectedCourse = useMemo(
    () =>
      courses.find(
        (course) => course.id === selectedCourseId,
      ) ?? null,
    [courses, selectedCourseId],
  )

  const todayRecords = useMemo(
    () =>
      records.filter(
        (record) => record.date === today,
      ),
    [records, today],
  )

  const loadInitialData = async () => {
    setIsLoading(true)
    setError('')

    try {
      const { data: year, error: yearError } =
        await supabase
          .from('academic_years')
          .select(
            'id, name, start_date, end_date',
          )
          .eq('is_current', true)
          .eq('is_active', true)
          .maybeSingle()

      if (yearError) {
        throw yearError
      }

      if (!year) {
        setAcademicYear(null)
        setCourses([])
        setSelectedCourseId('')
        setRecords([])
        return
      }

      setAcademicYear(year)

      const { data: courseRows, error: coursesError } =
        await supabase
          .from('courses')
          .select(
            'id, academic_year_id, name, start_date, end_date, days',
          )
          .eq('academic_year_id', year.id)
          .order('start_date', {
            ascending: true,
            nullsFirst: false,
          })
          .order('name', {
            ascending: true,
          })

      if (coursesError) {
        throw coursesError
      }

      const loadedCourses =
        (courseRows ?? []) as Course[]

      setCourses(loadedCourses)

      const currentCourse =
        loadedCourses.find((course) => {
          if (!course.start_date || !course.end_date) {
            return false
          }

          return (
            today >= course.start_date &&
            today <= course.end_date
          )
        }) ?? loadedCourses[0]

      setSelectedCourseId(
        currentCourse?.id ?? '',
      )
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : 'تعذر تحميل بيانات الإشراف.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  const loadTeachers = async (courseId: string) => {
    if (!courseId) {
      setTeachers([])
      return
    }

    setIsLoadingTeachers(true)

    try {
      const { data, error: teachersError } =
        await supabase
          .from('course_teachers')
          .select(
            `
              teacher_id,
              teachers (
                id,
                name
              )
            `,
          )
          .eq('course_id', courseId)

      if (teachersError) {
        throw teachersError
      }

      const loadedTeachers: Teacher[] = []

      for (const row of data ?? []) {
        const teacher = Array.isArray(row.teachers)
          ? row.teachers[0]
          : row.teachers

        if (teacher) {
          loadedTeachers.push({
            id: teacher.id,
            name: teacher.name,
          })
        }
      }

      loadedTeachers.sort((a, b) =>
        a.name.localeCompare(
          b.name,
          'ar',
        ),
      )

      setTeachers(loadedTeachers)

      if (
        selectedTeacher &&
        !loadedTeachers.some(
          (teacher) =>
            teacher.id === selectedTeacher,
        )
      ) {
        setSelectedTeacher('')
      }
    } catch (err) {
      console.error(err)

      setTeachers([])

      setError(
        err instanceof Error
          ? err.message
          : 'تعذر تحميل معلمي الدورة.',
      )
    } finally {
      setIsLoadingTeachers(false)
    }
  }

  const loadRecords = async (
    courseId: string,
  ) => {
    if (!courseId) {
      setRecords([])
      return
    }

    try {
      const { data, error: recordsError } =
        await supabase
          .from('supervision_records')
          .select(
            `
              id,
              type,
              record_date,
              reason,
              note,
              created_at,
              course:courses (
                name
              ),
              teacher:teachers (
                name
              ),
              created_by_profile:user_profiles (
                full_name
              )
            `,
          )
          .eq('course_id', courseId)
          .order('record_date', {
            ascending: false,
          })
          .order('created_at', {
            ascending: false,
          })

      if (recordsError) {
        throw recordsError
      }

      const mappedRecords: SupervisionRecord[] =
        (data ?? []).map((row: any) => {
          const course = Array.isArray(row.course)
            ? row.course[0]
            : row.course

          const teacher = Array.isArray(row.teacher)
            ? row.teacher[0]
            : row.teacher

          const createdByProfile =
            Array.isArray(
              row.created_by_profile,
            )
              ? row.created_by_profile[0]
              : row.created_by_profile

          return {
            id: row.id,
            type: row.type as SupervisionType,
            date: row.record_date,
            course:
              course?.name ??
              selectedCourse?.name ??
              '',
            teacher:
              teacher?.name ??
              (row.type === 'day_cancelled'
                ? 'جميع المعلمين'
                : 'غير محدد'),
            reason: row.reason ?? '',
            note: row.note ?? '',
            createdBy:
              createdByProfile?.full_name ??
              'غير معروف',
            createdAt: row.created_at,
          }
        })

      setRecords(mappedRecords)
    } catch (err) {
      console.error(err)

      setRecords([])

      setError(
        err instanceof Error
          ? err.message
          : 'تعذر تحميل سجل الإشراف.',
      )
    }
  }

  useEffect(() => {
    void loadInitialData()
  }, [])

  useEffect(() => {
    if (!selectedCourseId) {
      setTeachers([])
      setRecords([])
      return
    }

    void loadTeachers(selectedCourseId)
    void loadRecords(selectedCourseId)
  }, [selectedCourseId])

  const openForm = (
    type: SupervisionType,
  ) => {
    setSelectedType(type)
    setSelectedTeacher('')
    setSelectedDate(today)
    setReason('')
    setNote('')
    setError('')
    setIsFormOpen(true)
  }

  const closeForm = () => {
    if (isSaving) {
      return
    }

    setIsFormOpen(false)
  }

  const saveRecord = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    if (!selectedCourseId) {
      setError('يجب اختيار دورة أولًا.')
      return
    }

    if (!reason.trim()) {
      setError('اكتب سبب الحالة.')
      return
    }

    if (
      selectedType !== 'day_cancelled' &&
      !selectedTeacher
    ) {
      setError('اختر المعلم.')
      return
    }

    if (!academicYear?.id) {
      setError('لم يتم تحديد السنة الدراسية.')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      let createdBy: string | null = null

      const {
        data: authData,
      } = await supabase.auth.getUser()

      const authUserId =
        authData.user?.id

      if (authUserId) {
        const { data: profile } =
          await supabase
            .from('user_profiles')
            .select('id')
            .eq(
              'auth_user_id',
              authUserId,
            )
            .maybeSingle()

        createdBy =
          profile?.id ?? null
      }

      const { error: insertError } =
        await supabase
          .from('supervision_records')
          .insert({
            academic_year_id:
              academicYear.id,
            course_id:
              selectedCourseId,
            teacher_id:
              selectedType ===
              'day_cancelled'
                ? null
                : selectedTeacher,
            type: selectedType,
            record_date:
              selectedDate,
            reason:
              reason.trim(),
            note:
              note.trim() || null,
            created_by:
              createdBy,
          })

      if (insertError) {
        throw insertError
      }

      await loadRecords(selectedCourseId)

      setIsFormOpen(false)
      setSelectedTeacher('')
      setReason('')
      setNote('')
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : 'تعذر حفظ السجل.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="إشراف الدوام والدروس"
        description="متابعة أيام الدراسة والمعلمين وتسجيل الحالات والملاحظات الإشرافية"
        action={
          <Button
            onClick={() =>
              openForm('note')
            }
            disabled={
              isLoading ||
              !selectedCourseId
            }
          >
            <Plus className="size-4" />
            إضافة سجل إشرافي
          </Button>
        }
      />

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />

          <div>
            <p className="font-medium text-destructive">
              تعذر تنفيذ العملية
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* السنة والدورة الحالية */}
      <Card>
        <CardContent className="p-5">
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-5 w-40 animate-pulse rounded bg-muted" />
              <div className="h-10 w-full animate-pulse rounded bg-muted" />
            </div>
          ) : (
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CalendarDays className="size-5" />
                </span>

                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">
                    السنة الدراسية
                  </p>

                  <h2 className="mt-1 text-lg font-semibold">
                    {academicYear?.name ??
                      'لا توجد سنة دراسية حالية'}
                  </h2>

                  {academicYear?.start_date &&
                    academicYear?.end_date && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatDate(
                          academicYear.start_date,
                        )}{' '}
                        →{' '}
                        {formatDate(
                          academicYear.end_date,
                        )}
                      </p>
                    )}
                </div>
              </div>

              <div className="w-full lg:max-w-sm">
                <label className="mb-2 block text-sm font-medium">
                  الدورة
                </label>

                {courses.length === 0 ? (
                  <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                    لا توجد دورات مرتبطة بالسنة الحالية.
                  </div>
                ) : (
                  <select
                    value={selectedCourseId}
                    onChange={(event) =>
                      setSelectedCourseId(
                        event.target.value,
                      )
                    }
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
                  >
                    {courses.map((course) => (
                      <option
                        key={course.id}
                        value={course.id}
                      >
                        {course.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}

          {selectedCourse && (
            <div className="mt-5 flex flex-col gap-4 border-t pt-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  الدورة المختارة
                </p>

                <h3 className="mt-1 font-semibold">
                  {selectedCourse.name}
                </h3>

                {selectedCourse.start_date &&
                  selectedCourse.end_date && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDate(
                        selectedCourse.start_date,
                      )}{' '}
                      →{' '}
                      {formatDate(
                        selectedCourse.end_date,
                      )}
                    </p>
                  )}
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedCourse.days?.length >
                0 ? (
                  selectedCourse.days.map(
                    (day, index) => (
                      <Badge
                        key={`${day}-${index}`}
                        variant="neutral"
                      >
                        {day}
                      </Badge>
                    ),
                  )
                ) : (
                  <Badge variant="neutral">
                    أيام الدورة غير محددة
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* إجراءات الإشراف */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">
            إجراءات الإشراف
          </h2>

          <p className="text-sm text-muted-foreground">
            تسجيل الحالات المتعلقة بالدوام والدروس والمعلمين
            للدورة المختارة
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <ActionCard
            icon={CalendarDays}
            title="إلغاء يوم دراسي"
            description="إلغاء يوم كامل من الدراسة مع ذكر السبب"
            onClick={() =>
              openForm('day_cancelled')
            }
          />

          <ActionCard
            icon={CalendarDays}
            title="إلغاء درس"
            description="إلغاء درس معلم محدد مع استمرار بقية المعلمين"
            onClick={() =>
              openForm('lesson_cancelled')
            }
          />

          <ActionCard
            icon={UserX}
            title="غياب معلم"
            description="تسجيل غياب معلم في يوم الدراسة"
            onClick={() =>
              openForm('teacher_absent')
            }
          />

          <ActionCard
            icon={Clock3}
            title="تأخر معلم"
            description="تسجيل حالة تأخر المعلم"
            onClick={() =>
              openForm('teacher_late')
            }
          />

          <ActionCard
            icon={MessageSquareText}
            title="ملاحظة إشرافية"
            description="إضافة ملاحظة أو متابعة إدارية"
            onClick={() =>
              openForm('note')
            }
          />
        </div>
      </div>

      {/* ملخص اليوم */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">
            ملخص اليوم
          </h2>

          <p className="text-sm text-muted-foreground">
            السجلات الإشرافية المسجلة لهذا اليوم في الدورة
            المختارة
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            icon={CalendarDays}
            label="إلغاء الدروس"
            value={todayRecords.filter(
              (record) =>
                record.type ===
                  'day_cancelled' ||
                record.type ===
                  'lesson_cancelled',
            ).length}
          />

          <SummaryCard
            icon={UserX}
            label="غياب المعلمين"
            value={todayRecords.filter(
              (record) =>
                record.type ===
                'teacher_absent',
            ).length}
          />

          <SummaryCard
            icon={Clock3}
            label="تأخر المعلمين"
            value={todayRecords.filter(
              (record) =>
                record.type ===
                'teacher_late',
            ).length}
          />

          <SummaryCard
            icon={MessageSquareText}
            label="الملاحظات"
            value={todayRecords.filter(
              (record) =>
                record.type === 'note',
            ).length}
          />
        </div>
      </div>

      {/* سجل الإشراف */}
      <Card>
        <CardContent className="p-0">
          <div className="border-b p-5">
            <h2 className="font-semibold">
              سجل الإشراف
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              جميع الحالات والملاحظات المسجلة للدورة المختارة
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-4 p-5">
              {Array.from({
                length: 3,
              }).map((_, index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-lg bg-muted"
                />
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-muted">
                <FileText className="size-5 text-muted-foreground" />
              </span>

              <p className="mt-4 font-medium">
                لا توجد سجلات إشرافية
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                ستظهر هنا حالات الإلغاء وغياب المعلمين
                والملاحظات بعد تسجيلها.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {records.map((record) => {
                const Icon =
                  getTypeIcon(
                    record.type,
                  )

                return (
                  <div
                    key={record.id}
                    className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between"
                  >
                    <div className="flex gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Icon className="size-5 text-muted-foreground" />
                      </span>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">
                            {getTypeLabel(
                              record.type,
                            )}
                          </p>

                          <Badge
                            variant={getTypeBadgeVariant(
                              record.type,
                            )}
                          >
                            {formatDate(
                              record.date,
                            )}
                          </Badge>
                        </div>

                        <p className="mt-1 text-sm">
                          {record.teacher}
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {record.course}
                        </p>

                        <p className="mt-2 text-sm text-muted-foreground">
                          {record.reason}
                        </p>

                        {record.note && (
                          <p className="mt-2 rounded-md bg-muted/50 p-2 text-sm text-muted-foreground">
                            {record.note}
                          </p>
                        )}

                        <p className="mt-2 text-xs text-muted-foreground">
                          بواسطة: {record.createdBy}
                          {' • '}
                          {formatDateTime(
                            record.createdAt,
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* نافذة إضافة سجل */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="إغلاق"
            className="absolute inset-0 bg-black/40"
            onClick={closeForm}
          />

          <aside className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l bg-background shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold">
                  {getTypeLabel(
                    selectedType,
                  )}
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedCourse
                    ? `الدورة: ${selectedCourse.name}`
                    : 'تسجيل حالة إشرافية'}
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="rounded-md p-2 hover:bg-muted"
                aria-label="إغلاق"
              >
                <X className="size-5" />
              </button>
            </div>

            <form
              onSubmit={saveRecord}
            >
              <div className="space-y-5 p-6">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    الدورة
                  </label>

                  <select
                    value={selectedCourseId}
                    onChange={(event) =>
                      setSelectedCourseId(
                        event.target.value,
                      )
                    }
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
                    required
                  >
                    <option value="">
                      اختر الدورة
                    </option>

                    {courses.map(
                      (course) => (
                        <option
                          key={course.id}
                          value={course.id}
                        >
                          {course.name}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    التاريخ
                  </label>

                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(event) =>
                      setSelectedDate(
                        event.target.value,
                      )
                    }
                    min={
                      selectedCourse?.start_date ??
                      academicYear?.start_date ??
                      undefined
                    }
                    max={
                      selectedCourse?.end_date ??
                      academicYear?.end_date ??
                      undefined
                    }
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
                    required
                  />
                </div>

                {selectedType !==
                  'day_cancelled' && (
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      المعلم
                    </label>

                    <select
                      value={
                        selectedTeacher
                      }
                      onChange={(
                        event,
                      ) =>
                        setSelectedTeacher(
                          event.target
                            .value,
                        )
                      }
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                      required
                      disabled={
                        isLoadingTeachers ||
                        teachers.length ===
                          0
                      }
                    >
                      <option value="">
                        {isLoadingTeachers
                          ? 'جاري تحميل المعلمين...'
                          : teachers.length ===
                              0
                            ? 'لا يوجد معلمون مرتبطون بالدورة'
                            : 'اختر المعلم'}
                      </option>

                      {teachers.map(
                        (teacher) => (
                          <option
                            key={
                              teacher.id
                            }
                            value={
                              teacher.id
                            }
                          >
                            {
                              teacher.name
                            }
                          </option>
                        ),
                      )}
                    </select>

                    {selectedType ===
                      'lesson_cancelled' && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        سيتم إلغاء درس هذا المعلم
                        فقط في هذا التاريخ، ولن
                        يتأثر بقية المعلمين.
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    السبب
                  </label>

                  <input
                    type="text"
                    value={reason}
                    onChange={(event) =>
                      setReason(
                        event.target.value,
                      )
                    }
                    placeholder={
                      selectedType ===
                      'day_cancelled'
                        ? 'مثال: عطلة رسمية'
                        : selectedType ===
                            'teacher_absent'
                          ? 'مثال: إجازة مرضية'
                          : selectedType ===
                              'teacher_late'
                            ? 'مثال: تأخر بسبب ظرف طارئ'
                            : selectedType ===
                                'lesson_cancelled'
                              ? 'مثال: سفر المعلم'
                              : 'اكتب سبب الحالة'
                    }
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    ملاحظات إضافية
                  </label>

                  <textarea
                    value={note}
                    onChange={(event) =>
                      setNote(
                        event.target.value,
                      )
                    }
                    placeholder="أضف أي تفاصيل أو ملاحظات إضافية..."
                    rows={5}
                    className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none"
                  />
                </div>

                {(selectedType ===
                  'day_cancelled' ||
                  selectedType ===
                    'lesson_cancelled') && (
                  <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                    <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-600" />

                    <p className="text-sm leading-6 text-muted-foreground">
                      {selectedType ===
                      'day_cancelled'
                        ? 'عند تسجيل إلغاء اليوم، لن يدخل هذا اليوم ضمن الأيام الفعلية المستخدمة لحساب نسبة الحضور للدورة.'
                        : 'عند تسجيل إلغاء الدرس، سيتم استثناء درس هذا المعلم فقط من حساب الحضور في هذا اليوم، بينما تستمر بقية الدروس بشكل طبيعي.'}
                    </p>
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 flex gap-3 border-t bg-background p-6">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={
                    isSaving ||
                    !selectedCourseId
                  }
                >
                  <CheckCircle2 className="size-4" />

                  {isSaving
                    ? 'جاري الحفظ...'
                    : 'حفظ السجل'}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={closeForm}
                  disabled={isSaving}
                >
                  إلغاء
                </Button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </div>
  )
}

function ActionCard({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: LucideIcon
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-right"
    >
      <Card className="h-full transition-colors hover:border-primary/40">
        <CardContent className="p-5">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-5" />
          </span>

          <h3 className="mt-4 font-semibold">
            {title}
          </h3>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </CardContent>
      </Card>
    </button>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: number
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-5 text-muted-foreground" />
        </span>

        <div>
          <p className="text-sm text-muted-foreground">
            {label}
          </p>

          <p className="mt-1 text-xl font-bold tabular-nums">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}