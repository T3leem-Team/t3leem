'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Check,
  CheckSquare,
  Loader2,
  RefreshCw,
  Search,
  Users,
  X,
} from 'lucide-react'

type TripStatus =
  | 'draft'
  |  'pending_approval'
  |  'published'
  |  'rejected'
  |  'closed'

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
  attendance_min: number | null
  attendance_max: number | null
  notes_requirement: 'any' | 'required' | 'none'
  status: TripStatus
}

type Course = {
  id: string
  name: string
}

type Level = {
  id: string
  name: string
}

type Student = {
  id: string
  name: string
  personal_id: string | null
  phone: string | null
  level_id: string
  level_name: string
  attendance_percentage: number
  attendance_present: number
  attendance_absent: number
  attendance_late: number
  attendance_excused: number
  attendance_not_recorded: number
  course_notes: string[]
  eligible: boolean
  eligibility_note: string | null
  selected: boolean
  response: 'pending' | 'accepted' | 'rejected'
  response_note: string | null
}

type ApiResponse = {
  trip: Trip
  course: Course | null
  levels: Level[]
  lesson_dates: string[]
  students: Student[]
}

function formatDate(value: string | null) {
  if (!value) return 'بدون تاريخ'

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('ar-BH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

function formatTime(value: string | null) {
  if (!value) return null
  return value.slice(0, 5)
}

function formatFee(value: number) {
  return new Intl.NumberFormat('ar-BH', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value)
}

function getAttendanceClass(value: number) {
  if (value >= 90) {
    return 'text-emerald-600 dark:text-emerald-400'
  }

  if (value >= 75) {
    return 'text-amber-600 dark:text-amber-400'
  }

  return 'text-destructive'
}

function getStatusLabel(status: TripStatus) {
  switch (status) {
    case 'draft':
      return 'مسودة'
    case 'pending_approval':
      return 'بانتظار الموافقة'
    case 'published':
      return 'منشورة'
    case 'rejected':
      return 'مرفوضة'
    case 'closed':
      return 'مغلقة'
    default:
      return status
  }
}

function getResponseLabel(response: Student['response']) {
  switch (response) {
    case 'accepted':
      return 'موافق'
    case 'rejected':
      return 'رافض'
    default:
      return 'بانتظار الرد'
  }
}

export function TripDetailsView({
  tripId,
}: {
  tripId: string
}) {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState('all')
  const [showEligibleOnly, setShowEligibleOnly] = useState(true)

  const [selectedIds, setSelectedIds] = useState<string[]>([])

  async function loadData(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false

    if (silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError('')
    setSuccess('')

    try {
      const response = await fetch(
        `/api/trips/${encodeURIComponent(tripId)}/students`,
        {
          method: 'GET',
          cache: 'no-store',
        },
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result?.error ?? 'تعذر تحميل بيانات الرحلة.',
        )
      }

      const nextData = result as ApiResponse

      setData(nextData)

      setSelectedIds(
        nextData.students
          .filter((student) => student.selected)
          .map((student) => student.id),
      )
    } catch (error) {
      console.error('Load trip students error:', error)

      setError(
        error instanceof Error
          ? error.message
          : 'تعذر تحميل بيانات الرحلة.',
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (!tripId) return

    loadData()
  }, [tripId])

  const eligibleStudents = useMemo(() => {
    if (!data) return []

    return data.students.filter((student) => student.eligible)
  }, [data])

  const filteredStudents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return eligibleStudents.filter((student) => {
      const matchesSearch =
        !normalizedSearch ||
        student.name.toLowerCase().includes(normalizedSearch) ||
        (student.personal_id ?? '')
          .toLowerCase()
          .includes(normalizedSearch) ||
        (student.phone ?? '')
          .toLowerCase()
          .includes(normalizedSearch)

      const matchesLevel =
        levelFilter === 'all' ||
        student.level_id === levelFilter

      return matchesSearch && matchesLevel
    })
  }, [eligibleStudents, search, levelFilter])

  const selectedCount = selectedIds.length

  const canEdit =
    data?.trip.status !== 'closed'

  function toggleStudent(studentId: string) {
    if (!canEdit) return

    setSelectedIds((current) => {
      if (current.includes(studentId)) {
        return current.filter((id) => id !== studentId)
      }

      return [...current, studentId]
    })
  }

  function selectAllVisible() {
    if (!canEdit) return

    setSelectedIds((current) => {
      const next = new Set(current)

      filteredStudents.forEach((student) => {
        next.add(student.id)
      })

      return Array.from(next)
    })
  }

  function clearVisibleSelection() {
    if (!canEdit) return

    const visibleIds = new Set(
      filteredStudents.map((student) => student.id),
    )

    setSelectedIds((current) =>
      current.filter((id) => !visibleIds.has(id)),
    )
  }

  async function saveStudents() {
    if (!data || !canEdit) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(
        `/api/trips/${encodeURIComponent(tripId)}/students`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            student_ids: selectedIds,
          }),
        },
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result?.error ?? 'تعذر حفظ الطلاب.',
        )
      }

      setSuccess('تم حفظ الطلاب في الرحلة بنجاح.')

      await loadData({ silent: true })
    } catch (error) {
      console.error('Save trip students error:', error)

      setError(
        error instanceof Error
          ? error.message
          : 'تعذر حفظ الطلاب.',
      )
    } finally {
      setSaving(false)
    }
  }

  function goBack() {
    window.location.href = '/trips'
  }

  if (loading) {
    return (
      <div dir="rtl" className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>جاري تحميل الرحلة...</span>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div dir="rtl" className="space-y-4">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowRight className="h-4 w-4" />
          العودة إلى الرحلات
        </button>

        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center text-destructive">
          {error || 'تعذر العثور على الرحلة.'}
        </div>
      </div>
    )
  }

  const { trip, course, levels } = data

  return (
    <div dir="rtl" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowRight className="h-4 w-4" />
            العودة إلى الرحلات
          </button>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {trip.name}
              </h1>

              <span className="rounded-full border px-3 py-1 text-xs font-medium">
                {getStatusLabel(trip.status)}
              </span>
            </div>

            {trip.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {trip.description}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadData({ silent: true })}
          disabled={refreshing}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
          />
          تحديث
        </button>
      </div>

      {/* Trip information */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">
            المقرر
          </p>
          <p className="mt-1 font-semibold">
            {course?.name ?? 'غير محدد'}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">
            التاريخ
          </p>
          <p className="mt-1 font-semibold">
            {formatDate(trip.trip_date)}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">
            المكان
          </p>
          <p className="mt-1 font-semibold">
            {trip.location || 'غير محدد'}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">
            الرسوم
          </p>
          <p className="mt-1 font-semibold">
            {formatFee(trip.fee)} د.ب
          </p>
        </div>
      </div>

      {/* More details */}
      <div className="rounded-xl border bg-card p-5">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">
              وقت التجمع
            </p>
            <p className="mt-1 font-medium">
              {formatTime(trip.meeting_time) ?? 'غير محدد'}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">
              وقت العودة
            </p>
            <p className="mt-1 font-medium">
              {formatTime(trip.return_time) ?? 'غير محدد'}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">
              الحد الأدنى للحضور
            </p>
            <p className="mt-1 font-medium">
              {trip.attendance_min != null
                ? `${trip.attendance_min}%`
                : 'بدون حد'}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">
              الحد الأعلى للحضور
            </p>
            <p className="mt-1 font-medium">
              {trip.attendance_max != null
                ? `${trip.attendance_max}%`
                : 'بدون حد'}
            </p>
          </div>
        </div>

        {trip.note && (
          <div className="mt-4 rounded-lg bg-muted/50 p-3 text-sm">
            <span className="font-medium">ملاحظة الرحلة:</span>{' '}
            {trip.note}
          </div>
        )}
      </div>

      {/* Closed notice */}
      {!canEdit && (
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
          هذه الرحلة مغلقة، لذلك لا يمكن تعديل قائمة الطلاب.
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          <X className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-700 dark:text-emerald-400">
          <Check className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Students section */}
      <div className="overflow-hidden rounded-xl border bg-card">
        {/* Section header */}
        <div className="border-b p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <h2 className="text-lg font-semibold">
                  الطلاب المؤهلون
                </h2>
              </div>

              <p className="mt-1 text-sm text-muted-foreground">
                حدد الطلاب الذين تريد إضافتهم إلى الرحلة.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-lg bg-muted px-3 py-2 text-sm">
                المؤهلون:{' '}
                <strong>{eligibleStudents.length}</strong>
              </div>

              <div className="rounded-lg bg-muted px-3 py-2 text-sm">
                المحددون:{' '}
                <strong>{selectedCount}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="border-b bg-muted/20 p-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[1fr_220px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="بحث بالاسم أو الرقم الشخصي أو الهاتف..."
                className="h-10 w-full rounded-lg border bg-background px-10 text-sm outline-none transition focus:border-primary"
              />
            </div>

            <select
              value={levelFilter}
              onChange={(event) =>
                setLevelFilter(event.target.value)
              }
              className="h-10 rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-primary"
            >
              <option value="all">كل المستويات</option>

              {levels.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.name}
                </option>
              ))}
            </select>

            <label className="flex h-10 items-center gap-2 rounded-lg border bg-background px-3 text-sm">
              <input
                type="checkbox"
                checked={showEligibleOnly}
                onChange={(event) =>
                  setShowEligibleOnly(event.target.checked)
                }
                className="h-4 w-4"
              />

              عرض المؤهلين فقط
            </label>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={selectAllVisible}
              disabled={!canEdit || filteredStudents.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckSquare className="h-4 w-4" />
              تحديد الظاهر
            </button>

            <button
              type="button"
              onClick={clearVisibleSelection}
              disabled={!canEdit || filteredStudents.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              إلغاء تحديد الظاهر
            </button>
          </div>
        </div>

        {/* Students table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-right">
                <th className="w-12 px-4 py-3">
                  #
                </th>

                <th className="px-4 py-3 font-medium">
                  الطالب
                </th>

                <th className="px-4 py-3 font-medium">
                  المستوى
                </th>

                <th className="px-4 py-3 font-medium">
                  الحضور
                </th>

                <th className="px-4 py-3 font-medium">
                  ملاحظات الدورة
                </th>

                <th className="px-4 py-3 font-medium">
                  الرد
                </th>

                <th className="px-4 py-3 text-center font-medium">
                  اختيار
                </th>
              </tr>
            </thead>

            <tbody>
              {(() => {
                const studentsToShow = showEligibleOnly
                  ? filteredStudents
                  : data.students.filter((student) => {
                      const normalizedSearch =
                        search.trim().toLowerCase()

                      const matchesSearch =
                        !normalizedSearch ||
                        student.name
                          .toLowerCase()
                          .includes(normalizedSearch) ||
                        (student.personal_id ?? '')
                          .toLowerCase()
                          .includes(normalizedSearch) ||
                        (student.phone ?? '')
                          .toLowerCase()
                          .includes(normalizedSearch)

                      const matchesLevel =
                        levelFilter === 'all' ||
                        student.level_id === levelFilter

                      return matchesSearch && matchesLevel
                    })

                if (studentsToShow.length === 0) {
                  return (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-12 text-center text-muted-foreground"
                      >
                        لا يوجد طلاب مطابقون للبحث أو شروط الرحلة.
                      </td>
                    </tr>
                  )
                }

                return studentsToShow.map(
                  (student, index) => {
                    const isSelected =
                      selectedIds.includes(student.id)

                    return (
                      <tr
                        key={student.id}
                        className={`border-b last:border-0 ${
                          isSelected
                            ? 'bg-primary/5'
                            : 'hover:bg-muted/20'
                        }`}
                      >
                        <td className="px-4 py-3 text-muted-foreground">
                          {index + 1}
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-medium">
                            {student.name}
                          </div>

                          {student.personal_id && (
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {student.personal_id}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {student.level_name || 'غير محدد'}
                        </td>

                        <td className="px-4 py-3">
                          <div
                            className={`font-semibold ${getAttendanceClass(
                              student.attendance_percentage,
                            )}`}
                          >
                            {student.attendance_percentage.toFixed(
                              1,
                            )}
                            %
                          </div>

                          <div className="mt-1 text-xs text-muted-foreground">
                            حاضر {student.attendance_present}
                            {' · '}
                            غائب {student.attendance_absent}
                            {' · '}
                            متأخر {student.attendance_late}
                            {' · '}
                            مستأذن {student.attendance_excused}
                          </div>
                        </td>

                        <td className="max-w-[260px] px-4 py-3">
                          {student.course_notes.length > 0 ? (
                            <div className="space-y-1">
                              {student.course_notes
                                .slice(0, 2)
                                .map((note, noteIndex) => (
                                  <div
                                    key={`${student.id}-${noteIndex}`}
                                    className="rounded-md bg-muted/50 px-2 py-1 text-xs"
                                  >
                                    {note}
                                  </div>
                                ))}

                              {student.course_notes.length > 2 && (
                                <div className="text-xs text-muted-foreground">
                                  +
                                  {student.course_notes.length - 2}{' '}
                                  ملاحظات أخرى
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              لا توجد ملاحظات
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <span className="rounded-full bg-muted px-2.5 py-1 text-xs">
                            {getResponseLabel(
                              student.response,
                            )}
                          </span>

                          {student.response_note && (
                            <div className="mt-1 max-w-[180px] truncate text-xs text-muted-foreground">
                              {student.response_note}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3 text-center">
                          {student.eligible ? (
                            <button
                              type="button"
                              onClick={() =>
                                toggleStudent(student.id)
                              }
                              disabled={!canEdit}
                              aria-label={
                                isSelected
                                  ? 'إلغاء اختيار الطالب'
                                  : 'اختيار الطالب'
                              }
                              className={`mx-auto flex h-6 w-6 items-center justify-center rounded-md border transition ${
                                isSelected
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'bg-background hover:bg-muted'
                              } ${
                                !canEdit
                                  ? 'cursor-not-allowed opacity-50'
                                  : ''
                              }`}
                            >
                              {isSelected && (
                                <Check className="h-4 w-4" />
                              )}
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              غير مؤهل
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  },
                )
              })()}
            </tbody>
          </table>
        </div>

        {/* Bottom actions */}
        <div className="flex flex-col gap-3 border-t bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            تم تحديد{' '}
            <strong className="text-foreground">
              {selectedCount}
            </strong>{' '}
            طالب من أصل{' '}
            <strong className="text-foreground">
              {eligibleStudents.length}
            </strong>{' '}
            طالب مؤهل.
          </div>

          <button
            type="button"
            onClick={saveStudents}
            disabled={!canEdit || saving}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                حفظ الطلاب
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
