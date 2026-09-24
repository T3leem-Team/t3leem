'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarDays,
  ChevronLeft,
  CirclePlus,
  Clock3,
  Loader2,
  Map,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from 'lucide-react'

import { TripsForm } from './trips-form'

type TripStatus =
  | 'draft'
  | 'pending_approval'
  | 'published'
  | 'rejected'
  | 'closed'

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
  notes_requirement: 'any' | 'required' | 'none'
  status: TripStatus
  created_at: string
  updated_at: string
}

type AcademicYear = {
  id: string
  name: string
}

type Course = {
  id: string
  name: string
  academic_year_id: string
}

const statusLabels: Record<TripStatus, string> = {
  draft: 'مسودة',
  pending_approval: 'بانتظار الموافقة',
  published: 'منشورة',
  rejected: 'مرفوضة',
  closed: 'مغلقة',
}

const statusClasses: Record<TripStatus, string> = {
  draft:
    'bg-muted text-muted-foreground border-border',
  pending_approval:
    'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400',
  published:
    'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400',
  rejected:
    'bg-destructive/10 text-destructive border-destructive/20',
  closed:
    'bg-slate-500/10 text-slate-700 border-slate-500/20 dark:text-slate-400',
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

export function TripsView() {
  const router = useRouter()

  const [trips, setTrips] = useState<Trip[]>([])
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [courses, setCourses] = useState<Course[]>([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const [statusFilter, setStatusFilter] =
    useState<'all' | TripStatus>('all')

  const [formOpen, setFormOpen] = useState(false)

  // الرحلة التي نريد تعديلها
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null)

  // الرحلة التي يتم حذفها حالياً
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null)

  async function loadTrips(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false

    if (silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError('')

    try {
      const response = await fetch('/api/trips', {
        method: 'GET',
        cache: 'no-store',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ?? 'تعذر تحميل الرحلات.'
        )
      }

      setTrips(
        Array.isArray(data?.trips)
          ? data.trips
          : []
      )

      setAcademicYears(
        Array.isArray(data?.academicYears)
          ? data.academicYears
          : []
      )

      setCourses(
        Array.isArray(data?.courses)
          ? data.courses
          : []
      )
    } catch (error) {
      console.error('Load trips error:', error)

      setError(
        error instanceof Error
          ? error.message
          : 'تعذر تحميل الرحلات.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadTrips()
  }, [])

  const filteredTrips = trips.filter((trip) => {
    const normalizedSearch = search
      .trim()
      .toLowerCase()

    const matchesSearch =
      !normalizedSearch ||
      trip.name
        .toLowerCase()
        .includes(normalizedSearch) ||
      (trip.location ?? '')
        .toLowerCase()
        .includes(normalizedSearch)

    const matchesStatus =
      statusFilter === 'all' ||
      trip.status === statusFilter

    return matchesSearch && matchesStatus
  })

  function handleCreateTrip() {
    setEditingTrip(null)
    setFormOpen(true)
  }

  function handleEditTrip(trip: Trip) {
    if (trip.status === 'closed') {
      return
    }

    setEditingTrip(trip)
    setFormOpen(true)
  }

  async function handleDeleteTrip(trip: Trip) {
    if (trip.status === 'closed') {
      return
    }

    const confirmed = window.confirm(
      `هل أنت متأكد من حذف الرحلة "${trip.name}"؟\n\nسيتم حذف بيانات الرحلة والمستويات والطلاب المرتبطين بها. لا يمكن التراجع عن هذه العملية.`
    )

    if (!confirmed) {
      return
    }

    setDeletingTripId(trip.id)
    setError('')

    try {
      const response = await fetch('/api/trips', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: trip.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ?? 'تعذر حذف الرحلة.'
        )
      }

      await loadTrips({ silent: true })
    } catch (error) {
      console.error('Delete trip error:', error)

      setError(
        error instanceof Error
          ? error.message
          : 'تعذر حذف الرحلة.'
      )
    } finally {
      setDeletingTripId(null)
    }
  }

  function handleTripSaved() {
    setFormOpen(false)
    setEditingTrip(null)
    loadTrips({ silent: true })
  }

  function handleCloseForm() {
    setFormOpen(false)
    setEditingTrip(null)
  }

  const publishedCount = trips.filter(
    (trip) => trip.status === 'published'
  ).length

  const pendingCount = trips.filter(
    (trip) => trip.status === 'pending_approval'
  ).length

  const closedCount = trips.filter(
    (trip) => trip.status === 'closed'
  ).length

  return (
    <div
      dir="rtl"
      className="space-y-6"
    >
      {/* رأس الصفحة */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            الرحلات
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            إدارة الرحلات والأنشطة ومتابعة حالة نشرها.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => loadTrips({ silent: true })}
            disabled={refreshing}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border bg-background px-4 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}

            تحديث
          </button>

          <button
            type="button"
            onClick={handleCreateTrip}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            <CirclePlus className="size-4" />
            إضافة رحلة
          </button>
        </div>
      </div>

      {/* الإحصائيات */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                إجمالي الرحلات
              </p>

              <p className="mt-1 text-2xl font-bold">
                {trips.length}
              </p>
            </div>

            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Map className="size-5" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                الرحلات المنشورة
              </p>

              <p className="mt-1 text-2xl font-bold">
                {publishedCount}
              </p>
            </div>

            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <Users className="size-5" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                بانتظار الموافقة
              </p>

              <p className="mt-1 text-2xl font-bold">
                {pendingCount}
              </p>
            </div>

            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <Clock3 className="size-5" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                الرحلات المغلقة
              </p>

              <p className="mt-1 text-2xl font-bold">
                {closedCount}
              </p>
            </div>

            <div className="flex size-10 items-center justify-center rounded-lg bg-slate-500/10 text-slate-600">
              <CalendarDays className="size-5" />
            </div>
          </div>
        </div>
      </div>

      {/* الخطأ */}
      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* البحث والفلاتر */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="ابحث باسم الرحلة أو الموقع..."
              className="h-10 w-full rounded-lg border bg-background pr-10 pl-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as
                  | 'all'
                  | TripStatus
              )
            }
            className="h-10 rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">
              جميع الحالات
            </option>

            <option value="draft">
              مسودة
            </option>

            <option value="pending_approval">
              بانتظار الموافقة
            </option>

            <option value="published">
              منشورة
            </option>

            <option value="rejected">
              مرفوضة
            </option>

            <option value="closed">
              مغلقة
            </option>
          </select>
        </div>
      </div>

      {/* المحتوى */}
      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-xl border bg-card">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            جاري تحميل الرحلات...
          </div>
        </div>
      ) : filteredTrips.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border bg-card px-6 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Map className="size-6 text-muted-foreground" />
          </div>

          <h3 className="mt-4 font-semibold">
            لا توجد رحلات
          </h3>

          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            {search || statusFilter !== 'all'
              ? 'لا توجد رحلات تطابق البحث أو الفلتر المحدد.'
              : 'لم تتم إضافة أي رحلة حتى الآن.'}
          </p>

          {!search && statusFilter === 'all' && (
            <button
              type="button"
              onClick={handleCreateTrip}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              <CirclePlus className="size-4" />
              إضافة أول رحلة
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTrips.map((trip) => {
            const isClosed =
              trip.status === 'closed'

            const isDeleting =
              deletingTripId === trip.id

            return (
              <div
                key={trip.id}
                className="rounded-xl border bg-card p-5 transition hover:shadow-sm"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  {/* معلومات الرحلة */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold">
                        {trip.name}
                      </h2>

                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses[trip.status]}`}
                      >
                        {statusLabels[trip.status]}
                      </span>
                    </div>

                    {trip.description && (
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {trip.description}
                      </p>
                    )}

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarDays className="size-4 shrink-0 text-muted-foreground" />

                        <span className="text-muted-foreground">
                          التاريخ:
                        </span>

                        <span className="font-medium">
                          {formatDate(
                            trip.trip_date
                          )}
                        </span>
                      </div>

                      {trip.meeting_time && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock3 className="size-4 shrink-0 text-muted-foreground" />

                          <span className="text-muted-foreground">
                            التجمع:
                          </span>

                          <span className="font-medium">
                            {formatTime(
                              trip.meeting_time
                            )}
                          </span>
                        </div>
                      )}

                      {trip.return_time && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock3 className="size-4 shrink-0 text-muted-foreground" />

                          <span className="text-muted-foreground">
                            العودة:
                          </span>

                          <span className="font-medium">
                            {formatTime(
                              trip.return_time
                            )}
                          </span>
                        </div>
                      )}

                      {trip.location && (
                        <div className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-1">
                          <Map className="size-4 shrink-0 text-muted-foreground" />

                          <span className="text-muted-foreground">
                            الموقع:
                          </span>

                          <span className="truncate font-medium">
                            {trip.location}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">
                          الرسوم:
                        </span>

                        <span className="font-medium">
                          {formatFee(trip.fee)} د.ب
                        </span>
                      </div>

                      {trip.attendance_min !== null && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">
                            الحضور:
                          </span>

                          <span className="font-medium">
                            من{' '}
                            {trip.attendance_min}%
                            {trip.attendance_max !==
                              null &&
                              ` إلى ${trip.attendance_max}%`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* الأزرار */}
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/trips/${trip.id}`)
                      }
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border bg-background px-3 text-sm font-medium transition hover:bg-muted"
                    >
                      التفاصيل
                      <ChevronLeft className="size-4" />
                    </button>

                    {!isClosed && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            handleEditTrip(trip)
                          }
                          disabled={isDeleting}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border bg-background px-3 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Pencil className="size-4" />
                          تعديل
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteTrip(trip)
                          }
                          disabled={isDeleting}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 text-sm font-medium text-destructive transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isDeleting ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}

                          {isDeleting
                            ? 'جاري الحذف...'
                            : 'حذف'}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* تنبيه الرحلة المغلقة */}
                {isClosed && (
                  <div className="mt-4 rounded-lg border border-slate-500/20 bg-slate-500/5 px-3 py-2 text-xs text-muted-foreground">
                    هذه الرحلة مغلقة ولا يمكن تعديلها أو
                    حذفها.
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* نموذج الإضافة / التعديل */}
      {formOpen && (
        <TripsForm
          academicYears={academicYears}
          courses={courses}
          trip={editingTrip}
          onClose={handleCloseForm}
          onCreated={handleTripSaved}
        />
      )}
    </div>
  )
}