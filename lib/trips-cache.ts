'use client'

export type TripsCacheData = {
  trips: unknown[]
  academicYears: unknown[]
  courses: unknown[]
  levels: unknown[]
  tripLevels: unknown[]
}

export type TripDetailsCacheData = {
  trip: unknown
  course: unknown
  levels: unknown[]
  lesson_dates: string[]
  students: unknown[]
}

let tripsCache: TripsCacheData | null = null

let tripsCacheLoading:
  | Promise<TripsCacheData>
  | null = null

const tripDetailsCache =
  new Map<string, TripDetailsCacheData>()

const tripDetailsCacheLoading =
  new Map<
    string,
    Promise<TripDetailsCacheData>
  >()

export function getTripsCache() {
  return tripsCache
}

export function setTripsCache(
  data: TripsCacheData,
) {
  tripsCache = data
}

export function clearTripsCache() {
  tripsCache = null
}

export async function loadTripsCache(options?: {
  force?: boolean
}) {
  const force = options?.force ?? false

  if (!force && tripsCache) {
    return tripsCache
  }

  if (tripsCacheLoading) {
    return tripsCacheLoading
  }

  tripsCacheLoading = (async () => {
    const response = await fetch('/api/trips', {
      method: 'GET',
      cache: 'no-store',
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(
        result?.error ??
          'تعذر تحميل بيانات الرحلات.',
      )
    }

    const data: TripsCacheData = {
      trips: Array.isArray(result?.trips)
        ? result.trips
        : [],

      academicYears:
        Array.isArray(
          result?.academicYears,
        )
          ? result.academicYears
          : [],

      courses: Array.isArray(result?.courses)
        ? result.courses
        : [],

      levels: Array.isArray(result?.levels)
        ? result.levels
        : [],

      tripLevels: Array.isArray(
        result?.tripLevels,
      )
        ? result.tripLevels
        : [],
    }

    tripsCache = data

    return data
  })()

  try {
    return await tripsCacheLoading
  } finally {
    tripsCacheLoading = null
  }
}

/*
 * ================================
 * كاش تفاصيل الرحلات
 * ================================
 */

export function getTripDetailsCache(
  tripId: string,
) {
  return tripDetailsCache.get(tripId) ?? null
}

export function setTripDetailsCache(
  tripId: string,
  data: TripDetailsCacheData,
) {
  tripDetailsCache.set(tripId, data)
}

export function clearTripDetailsCache(
  tripId?: string,
) {
  if (tripId) {
    tripDetailsCache.delete(tripId)
    return
  }

  tripDetailsCache.clear()
}

export async function loadTripDetailsCache(
  tripId: string,
  options?: {
    force?: boolean
  },
) {
  const force = options?.force ?? false

  if (!force) {
    const cached =
      tripDetailsCache.get(tripId)

    if (cached) {
      return cached
    }
  }

  const existingLoading =
    tripDetailsCacheLoading.get(tripId)

  if (existingLoading) {
    return existingLoading
  }

  const loadingPromise =
    (async () => {
      const response = await fetch(
        `/api/trips/${encodeURIComponent(
          tripId,
        )}/students`,
        {
          method: 'GET',
          cache: 'no-store',
        },
      )

      const result =
        await response.json()

      if (!response.ok) {
        throw new Error(
          result?.error ??
            'تعذر تحميل بيانات الرحلة.',
        )
      }

      const data: TripDetailsCacheData = {
        trip: result?.trip ?? null,

        course: result?.course ?? null,

        levels: Array.isArray(
          result?.levels,
        )
          ? result.levels
          : [],

        lesson_dates:
          Array.isArray(
            result?.lesson_dates,
          )
            ? result.lesson_dates
            : [],

        students: Array.isArray(
          result?.students,
        )
          ? result.students
          : [],
      }

      tripDetailsCache.set(
        tripId,
        data,
      )

      return data
    })()

  tripDetailsCacheLoading.set(
    tripId,
    loadingPromise,
  )

  try {
    return await loadingPromise
  } finally {
    tripDetailsCacheLoading.delete(
      tripId,
    )
  }
}