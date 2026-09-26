'use client'

export type TripsCacheData = {
  trips: unknown[]
  academicYears: unknown[]
  courses: unknown[]
  levels: unknown[]
  tripLevels: unknown[]
}

let tripsCache: TripsCacheData | null = null

let tripsCacheLoading:
  | Promise<TripsCacheData>
  | null = null

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
        Array.isArray(result?.academicYears)
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
