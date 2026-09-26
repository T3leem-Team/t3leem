'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  ChevronDown,
  Loader2,
  X,
} from 'lucide-react'

import { loadTripsCache } from '@/lib/trips-cache'

type AcademicYear = {
  id: string
  name: string
  is_current?: boolean
  is_active?: boolean
}

type Course = {
  id: string
  name: string
  academic_year_id: string
  start_date?: string | null
  end_date?: string | null
  days?: string[] | null
}

type Level = {
  id: string
  name: string
  sort_order?: number | null
  is_active?: boolean
  registration_enabled?: boolean
}

type Trip = {
  id: string
  name: string
  description: string | null
  location: string | null
  trip_date: string | null
  meeting_time: string | null
  return_time: string | null
  fee: number
  note: string | null
  academic_year_id: string
  course_id: string
  attendance_min: number | null
  attendance_max: number | null
  notes_requirement:
    | 'any'
    | 'required'
    | 'none'
  status:
    | 'draft'
    | 'pending_approval'
    | 'published'
    | 'rejected'
    | 'closed'
}

type TripsFormProps = {
  academicYears: AcademicYear[]
  courses: Course[]
  trip?: Trip | null
  onClose: () => void
  onCreated: () => void
}

export function TripsForm({
  academicYears,
  courses,
  trip = null,
  onClose,
  onCreated,
}: TripsFormProps) {
  const isEdit = Boolean(trip)

  const currentYear =
    academicYears.find(
      (year) => year.is_current,
    ) ??
    academicYears[0] ??
    null

  const [name, setName] = useState(
    trip?.name ?? '',
  )

  const [description, setDescription] =
    useState(trip?.description ?? '')

  const [location, setLocation] =
    useState(trip?.location ?? '')

  const [tripDate, setTripDate] =
    useState(trip?.trip_date ?? '')

  const [meetingTime, setMeetingTime] =
    useState(
      trip?.meeting_time
        ? trip.meeting_time.slice(0, 5)
        : '',
    )

  const [returnTime, setReturnTime] =
    useState(
      trip?.return_time
        ? trip.return_time.slice(0, 5)
        : '',
    )

  const [fee, setFee] = useState(
    trip?.fee != null
      ? String(trip.fee)
      : '0',
  )

  const [note, setNote] = useState(
    trip?.note ?? '',
  )

  const [academicYearId, setAcademicYearId] =
    useState(
      trip?.academic_year_id ??
        currentYear?.id ??
        '',
    )

  const [courseId, setCourseId] = useState(
    trip?.course_id ?? '',
  )

  const [
    selectedLevelIds,
    setSelectedLevelIds,
  ] = useState<string[]>([])

  const [levels, setLevels] = useState<
    Level[]
  >([])

  const [
    attendanceMin,
    setAttendanceMin,
  ] = useState(
    trip?.attendance_min != null
      ? String(trip.attendance_min)
      : '',
  )

  const [
    attendanceMax,
    setAttendanceMax,
  ] = useState(
    trip?.attendance_max != null
      ? String(trip.attendance_max)
      : '',
  )

  const [
    notesRequirement,
    setNotesRequirement,
  ] = useState<
    'any' | 'required' | 'none'
  >(
    trip?.notes_requirement ?? 'any',
  )

  const [loading, setLoading] =
    useState(false)

  const [loadingData, setLoadingData] =
    useState(true)

  const [error, setError] = useState('')

  /*
   * تحميل المستويات + مستويات الرحلة
   * في حالة التعديل.
   *
   * يتم استخدام نفس الكاش المشترك
   * الخاص بقسم الرحلات بدل طلب /api/trips
   * مرة أخرى.
   */
  useEffect(() => {
    let cancelled = false

    async function loadData() {
      setLoadingData(true)

      try {
        const data = await loadTripsCache()

        if (cancelled) return

        const loadedLevels =
          Array.isArray(data?.levels)
            ? data.levels
            : []

        setLevels(
          loadedLevels as Level[],
        )

        if (trip?.id) {
          const tripLevels =
            Array.isArray(
              data?.tripLevels,
            )
              ? data.tripLevels
              : []

          const currentTripLevelIds =
            tripLevels
              .filter(
                (item: {
                  trip_id: string
                  level_id: string
                }) =>
                  item.trip_id ===
                  trip.id,
              )
              .map(
                (item: {
                  trip_id: string
                  level_id: string
                }) => item.level_id,
              )

          setSelectedLevelIds(
            currentTripLevelIds,
          )
        }
      } catch (error) {
        console.error(
          'Load trip form data error:',
          error,
        )

        if (!cancelled) {
          setError(
            error instanceof Error
              ? error.message
              : 'تعذر تحميل بيانات الرحلة.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoadingData(false)
        }
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [trip?.id])

  /*
   * الدورات التابعة للسنة المختارة فقط.
   */
  const filteredCourses =
    useMemo(() => {
      if (!academicYearId) {
        return []
      }

      return courses.filter(
        (course) =>
          course.academic_year_id ===
          academicYearId,
      )
    }, [
      courses,
      academicYearId,
    ])

  /*
   * إذا تغيرت السنة، نتأكد أن الدورة
   * المختارة تابعة لها.
   */
  useEffect(() => {
    if (!courseId) return

    const exists =
      filteredCourses.some(
        (course) =>
          course.id === courseId,
      )

    if (!exists) {
      setCourseId('')
    }
  }, [
    academicYearId,
    filteredCourses,
    courseId,
  ])

  function toggleLevel(
    levelId: string,
  ) {
    setSelectedLevelIds((current) =>
      current.includes(levelId)
        ? current.filter(
            (id) => id !== levelId,
          )
        : [...current, levelId],
    )
  }

  function selectAllLevels() {
    setSelectedLevelIds(
      levels.map((level) => level.id),
    )
  }

  function clearAllLevels() {
    setSelectedLevelIds([])
  }

  async function handleSubmit(
    event: React.FormEvent,
  ) {
    event.preventDefault()

    setError('')

    const cleanName = name.trim()

    if (!cleanName) {
      setError('اسم الرحلة مطلوب.')
      return
    }

    if (!academicYearId) {
      setError(
        'اختر السنة الدراسية.',
      )
      return
    }

    if (!courseId) {
      setError('اختر الدورة.')
      return
    }

    if (selectedLevelIds.length === 0) {
      setError(
        'اختر مستوى واحدًا على الأقل.',
      )
      return
    }

    const numericFee =
      fee.trim() === ''
        ? 0
        : Number(fee)

    if (
      !Number.isFinite(numericFee) ||
      numericFee < 0
    ) {
      setError(
        'رسوم الرحلة غير صحيحة.',
      )
      return
    }

    const numericMin =
      attendanceMin.trim() === ''
        ? null
        : Number(attendanceMin)

    const numericMax =
      attendanceMax.trim() === ''
        ? null
        : Number(attendanceMax)

    if (
      numericMin !== null &&
      (!Number.isFinite(
        numericMin,
      ) ||
        numericMin < 0 ||
        numericMin > 100)
    ) {
      setError(
        'الحد الأدنى للحضور يجب أن يكون بين 0 و100.',
      )
      return
    }

    if (
      numericMax !== null &&
      (!Number.isFinite(
        numericMax,
      ) ||
        numericMax < 0 ||
        numericMax > 100)
    ) {
      setError(
        'الحد الأعلى للحضور يجب أن يكون بين 0 و100.',
      )
      return
    }

    if (
      numericMin !== null &&
      numericMax !== null &&
      numericMin > numericMax
    ) {
      setError(
        'الحد الأدنى للحضور لا يمكن أن يكون أكبر من الحد الأعلى.',
      )
      return
    }

    setLoading(true)

    try {
      const payload = {
        ...(isEdit
          ? { id: trip?.id }
          : {}),
        name: cleanName,
        description:
          description.trim() || null,
        location:
          location.trim() || null,
        trip_date:
          tripDate || null,
        meeting_time:
          meetingTime || null,
        return_time:
          returnTime || null,
        fee: numericFee,
        note:
          note.trim() || null,
        academic_year_id:
          academicYearId,
        course_id: courseId,
        attendance_min:
          numericMin,
        attendance_max:
          numericMax,
        notes_requirement:
          notesRequirement,
        level_ids:
          selectedLevelIds,
      }

      const response = await fetch(
        '/api/trips',
        {
          method: isEdit
            ? 'PATCH'
            : 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify(payload),
        },
      )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ??
            (isEdit
              ? 'تعذر تعديل الرحلة.'
              : 'تعذر إنشاء الرحلة.'),
        )
      }

      onCreated()
    } catch (error) {
      console.error(
        'Save trip error:',
        error,
      )

      setError(
        error instanceof Error
          ? error.message
          : isEdit
            ? 'تعذر تعديل الرحلة.'
            : 'تعذر إنشاء الرحلة.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-2xl"
        dir="rtl"
      >
        {/* الرأس */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-bold">
              {isEdit
                ? 'تعديل الرحلة'
                : 'إضافة رحلة'}
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              {isEdit
                ? 'تعديل بيانات الرحلة والمستويات المشاركة'
                : 'إدخال بيانات الرحلة وتحديد المستويات المشاركة'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            aria-label="إغلاق"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* المحتوى */}
        <form
          onSubmit={handleSubmit}
          className="overflow-y-auto"
        >
          <div className="space-y-6 p-5">
            {error && (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {loadingData ? (
              <div className="flex min-h-[260px] items-center justify-center">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  جاري تحميل بيانات الرحلة...
                </div>
              </div>
            ) : (
              <>
                {/* البيانات الأساسية */}
                <section className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold">
                      بيانات الرحلة
                    </h3>

                    <p className="mt-1 text-xs text-muted-foreground">
                      البيانات الأساسية للرحلة.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-1.5 block text-sm font-medium">
                        اسم الرحلة
                      </label>

                      <input
                        type="text"
                        value={name}
                        onChange={(event) =>
                          setName(
                            event.target.value,
                          )
                        }
                        placeholder="مثال: رحلة ترفيهية"
                        className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        السنة الدراسية
                      </label>

                      <div className="relative">
                        <select
                          value={
                            academicYearId
                          }
                          onChange={(
                            event,
                          ) =>
                            setAcademicYearId(
                              event.target
                                .value,
                            )
                          }
                          className="w-full appearance-none rounded-xl border border-input bg-background px-3 py-2.5 pe-10 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="">
                            اختر السنة
                          </option>

                          {academicYears.map(
                            (year) => (
                              <option
                                key={
                                  year.id
                                }
                                value={
                                  year.id
                                }
                              >
                                {year.name}
                                {year.is_current
                                  ? ' — الحالية'
                                  : ''}
                              </option>
                            ),
                          )}
                        </select>

                        <ChevronDown className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        الدورة
                      </label>

                      <div className="relative">
                        <select
                          value={courseId}
                          onChange={(
                            event,
                          ) =>
                            setCourseId(
                              event.target
                                .value,
                            )
                          }
                          disabled={
                            !academicYearId
                          }
                          className="w-full appearance-none rounded-xl border border-input bg-background px-3 py-2.5 pe-10 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-muted"
                        >
                          <option value="">
                            {!academicYearId
                              ? 'اختر السنة أولاً'
                              : 'اختر الدورة'}
                          </option>

                          {filteredCourses.map(
                            (course) => (
                              <option
                                key={
                                  course.id
                                }
                                value={
                                  course.id
                                }
                              >
                                {course.name}
                              </option>
                            ),
                          )}
                        </select>

                        <ChevronDown className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        تاريخ الرحلة
                      </label>

                      <input
                        type="date"
                        value={tripDate}
                        onChange={(event) =>
                          setTripDate(
                            event.target.value,
                          )
                        }
                        className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        الموقع
                      </label>

                      <input
                        type="text"
                        value={location}
                        onChange={(event) =>
                          setLocation(
                            event.target.value,
                          )
                        }
                        placeholder="مثال: منتزه..."
                        className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        وقت التجمع
                      </label>

                      <input
                        type="time"
                        value={meetingTime}
                        onChange={(event) =>
                          setMeetingTime(
                            event.target.value,
                          )
                        }
                        className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        وقت العودة
                      </label>

                      <input
                        type="time"
                        value={returnTime}
                        onChange={(event) =>
                          setReturnTime(
                            event.target.value,
                          )
                        }
                        className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        رسوم الرحلة
                      </label>

                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={fee}
                          onChange={(event) =>
                            setFee(
                              event.target
                                .value,
                            )
                          }
                          className="w-full rounded-xl border border-input bg-background px-3 py-2.5 pe-14 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />

                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          د.ب
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      الوصف
                    </label>

                    <textarea
                      value={description}
                      onChange={(event) =>
                        setDescription(
                          event.target.value,
                        )
                      }
                      rows={3}
                      placeholder="وصف مختصر للرحلة..."
                      className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      ملاحظة الرحلة
                    </label>

                    <textarea
                      value={note}
                      onChange={(event) =>
                        setNote(
                          event.target.value,
                        )
                      }
                      rows={2}
                      placeholder="أي ملاحظات إضافية..."
                      className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </section>

                {/* المستويات */}
                <section className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">
                        المستويات المشاركة
                      </h3>

                      <p className="mt-1 text-xs text-muted-foreground">
                        اختر المستويات التي يسمح لطلبتها بالمشاركة.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={
                          selectAllLevels
                        }
                        disabled={
                          levels.length ===
                          0
                        }
                        className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
                      >
                        تحديد الكل
                      </button>

                      <button
                        type="button"
                        onClick={
                          clearAllLevels
                        }
                        disabled={
                          selectedLevelIds.length ===
                          0
                        }
                        className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
                      >
                        إلغاء الكل
                      </button>
                    </div>
                  </div>

                  {levels.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                      لا توجد مستويات مفعلة.
                    </div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {levels.map(
                        (level) => {
                          const selected =
                            selectedLevelIds.includes(
                              level.id,
                            )

                          return (
                            <button
                              key={
                                level.id
                              }
                              type="button"
                              onClick={() =>
                                toggleLevel(
                                  level.id,
                                )
                              }
                              className={`flex items-center justify-between rounded-xl border px-3 py-3 text-right transition-colors ${
                                selected
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border bg-background hover:bg-muted'
                              }`}
                            >
                              <span className="text-sm font-medium">
                                {level.name}
                              </span>

                              <span
                                className={`flex size-5 items-center justify-center rounded-md border ${
                                  selected
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-input'
                                }`}
                              >
                                {selected && (
                                  <Check className="size-3.5" />
                                )}
                              </span>
                            </button>
                          )
                        },
                      )}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    تم اختيار{' '}
                    <span className="font-semibold text-foreground">
                      {
                        selectedLevelIds.length
                      }
                    </span>{' '}
                    مستوى.
                  </p>
                </section>

                {/* الحضور */}
                <section className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold">
                      شروط الحضور
                    </h3>

                    <p className="mt-1 text-xs text-muted-foreground">
                      تستخدم هذه النسب لاحقًا لتحديد الطلبة المؤهلين للرحلة.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        الحد الأدنى للحضور
                      </label>

                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={
                            attendanceMin
                          }
                          onChange={(
                            event,
                          ) =>
                            setAttendanceMin(
                              event.target
                                .value,
                            )
                          }
                          placeholder="مثال: 80"
                          className="w-full rounded-xl border border-input bg-background px-3 py-2.5 pe-10 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />

                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          %
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        الحد الأعلى للحضور
                      </label>

                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={
                            attendanceMax
                          }
                          onChange={(
                            event,
                          ) =>
                            setAttendanceMax(
                              event.target
                                .value,
                            )
                          }
                          placeholder="مثال: 100"
                          className="w-full rounded-xl border border-input bg-background px-3 py-2.5 pe-10 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />

                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          %
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* الملاحظات */}
                <section className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold">
                      شرط الملاحظات
                    </h3>

                    <p className="mt-1 text-xs text-muted-foreground">
                      تحديد كيفية التعامل مع ملاحظات الطلبة عند حساب المؤهلين.
                    </p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() =>
                        setNotesRequirement(
                          'any',
                        )
                      }
                      className={`rounded-xl border px-4 py-3 text-right transition-colors ${
                        notesRequirement ===
                        'any'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted'
                      }`}
                    >
                      <div className="text-sm font-semibold">
                        الكل
                      </div>

                      <div className="mt-1 text-xs text-muted-foreground">
                        لا يوجد شرط للملاحظات
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setNotesRequirement(
                          'required',
                        )
                      }
                      className={`rounded-xl border px-4 py-3 text-right transition-colors ${
                        notesRequirement ===
                        'required'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted'
                      }`}
                    >
                      <div className="text-sm font-semibold">
                        لديه ملاحظة
                      </div>

                      <div className="mt-1 text-xs text-muted-foreground">
                        يشترط وجود ملاحظة
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setNotesRequirement(
                          'none',
                        )
                      }
                      className={`rounded-xl border px-4 py-3 text-right transition-colors ${
                        notesRequirement ===
                        'none'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted'
                      }`}
                    >
                      <div className="text-sm font-semibold">
                        بدون ملاحظة
                      </div>

                      <div className="mt-1 text-xs text-muted-foreground">
                        يشترط عدم وجود ملاحظة
                      </div>
                    </button>
                  </div>
                </section>
              </>
            )}
          </div>

          {/* الأزرار */}
          <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-border bg-background/95 px-5 py-4 backdrop-blur">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-input px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={
                loading ||
                loadingData
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && (
                <Loader2 className="size-4 animate-spin" />
              )}

              {isEdit
                ? 'حفظ التعديلات'
                : 'إنشاء الرحلة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}