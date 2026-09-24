'use client'

import { useEffect, useState } from 'react'
import {
  CalendarDays,
  ChevronLeft,
  CirclePlus,
  Clock3,
  Loader2,
  Map,
  RefreshCw,
  Search,
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
  const [trips, setTrips] = useState<Trip[]>([])
  const [academicYears, setAcademicYears] = useState<
    AcademicYear[]
  >([])
  const [courses, setCourses] = useState<Course[]>([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] =
    useState<'all' | TripStatus>('all')

  const [formOpen, setFormOpen] = useState(false)

  async function loadTrips(options?: {
    silent?: boolean
  }) {
    const silent = options?.silent ?? false

    if (silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError('')

    try {
      const response = await fetch(
        '/api/trips',
        {
          method: 'GET',
          cache: 'no-store',
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ??
            'تعذر تحميل الرحلات.',
        )
      }

      setTrips(
        Array.isArray(data?.trips)
          ? data.trips
          : [],
      )

      setAcademicYears(
        Array.isArray(data?.academicYears)
          ? data.academicYears
          : [],
      )

      setCourses(
        Array.isArray(data?.courses)
          ? data.courses
          : [],
      )
    } catch (error) {
      console.error(
        'Load trips error:',
        error,
      )

      setError(
        error instanceof Error
          ? error.message
          : 'تعذر تحميل الرحلات.',
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadTrips()
  }, [])

  const filteredTrips = trips.filter(
    (trip) => {
      const normalizedSearch =
        search.trim().toLowerCase()

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

      return (
        matchesSearch &&
        matchesStatus
      )
    },
  )

  function handleTripCreated() {
    setFormOpen(false)
    loadTrips({ silent: true })
  }

  const publishedCount = trips.filter(
    (trip) =>
      trip.status === 'published',
  ).length

  const pendingCount = trips.filter(
    (trip) =>
      trip.status === 'pending_approval',
  ).length

  const closedCount = trips.filter(
    (trip) =>
      trip.status === 'closed',
  ).length

  return (
    <div className="space-y-6">
      {/* رأس الصفحة */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Map className="size-5" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              الرحلات
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              إدارة الرحلات الطلابية ومتابعة المشاركين
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            setFormOpen(true)
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
        >
          <CirclePlus className="size-4" />
          إضافة رحلة
        </button>
      </div>

      {/* الإحصائيات */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              إجمالي الرحلات
            </span>

            <Map className="size-4 text-muted-foreground" />
          </div>

          <div className="mt-2 text-2xl font-bold">
            {trips.length}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              منشورة
            </span>

            <CalendarDays className="size-4 text-muted-foreground" />
          </div>

          <div className="mt-2 text-2xl font-bold">
            {publishedCount}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              بانتظار الموافقة
            </span>

            <Clock3 className="size-4 text-muted-foreground" />
          </div>

          <div className="mt-2 text-2xl font-bold">
            {pendingCount}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              مغلقة
            </span>

            <Users className="size-4 text-muted-foreground" />
          </div>

          <div className="mt-2 text-2xl font-bold">
            {closedCount}
          </div>
        </div>
      </div>

      {/* الفلاتر */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="البحث باسم الرحلة أو الموقع..."
              className="w-full rounded-xl border border-input bg-background py-2.5 pe-10 ps-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as
                  | 'all'
                  | TripStatus,
              )
            }
            className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
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

          <button
            type="button"
            onClick={() =>
              loadTrips({
                silent: true,
              })
            }
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`size-4 ${
                refreshing
                  ? 'animate-spin'
                  : ''
              }`}
            />

            تحديث
          </button>
        </div>
      </div>

      {/* الخطأ */}
      {error && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* المحتوى */}
      {loading ? (
        <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            جاري تحميل الرحلات...
          </div>
        </div>
      ) : filteredTrips.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted">
            <Map className="size-6 text-muted-foreground" />
          </div>

          <h2 className="mt-4 text-base font-semibold">
            {trips.length === 0
              ? 'لا توجد رحلات حتى الآن'
              : 'لا توجد نتائج مطابقة'}
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {trips.length === 0
              ? 'ابدأ بإضافة أول رحلة مدرسية.'
              : 'جرّب تغيير البحث أو فلتر الحالة.'}
          </p>

          {trips.length === 0 && (
            <button
              type="button"
              onClick={() =>
                setFormOpen(true)
              }
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <CirclePlus className="size-4" />
              إضافة أول رحلة
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTrips.map((trip) => (
            <div
              key={trip.id}
              className="rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-sm"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold">
                      {trip.name}
                    </h2>

                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                        statusClasses[
                          trip.status
                        ]
                      }`}
                    >
                      {
                        statusLabels[
                          trip.status
                        ]
                      }
                    </span>
                  </div>

                  {trip.description && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {trip.description}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="size-3.5" />
                      {formatDate(
                        trip.trip_date,
                      )}
                    </span>

                    {trip.location && (
                      <span className="inline-flex items-center gap-1.5">
                        <Map className="size-3.5" />
                        {trip.location}
                      </span>
                    )}

                    {formatTime(
                      trip.meeting_time,
                    ) && (
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="size-3.5" />
                        التجمع{' '}
                        {formatTime(
                          trip.meeting_time,
                        )}
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1.5">
                      الرسوم:{' '}
                      {formatFee(
                        Number(
                          trip.fee ?? 0,
                        ),
                      )}{' '}
                      د.ب
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-input px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
                >
                  التفاصيل
                  <ChevronLeft className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* نموذج الإضافة */}
      {formOpen && (
        <TripsForm
          academicYears={academicYears}
          courses={courses}
          onClose={() =>
            setFormOpen(false)
          }
          onCreated={
            handleTripCreated
          }
        />
      )}
    </div>
  )
}