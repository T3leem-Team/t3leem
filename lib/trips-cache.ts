
'use client'

import {
  loadTripsRepositoryData,
  loadTripDetailsRepositoryData,
} from '@/lib/features/trips/repositories/trips.repository'

import type {
  TripsRepositoryData,
  TripDetailsRepositoryData,
} from '@/lib/features/trips/repositories/trips.repository'

export type TripsCacheData = TripsRepositoryData

export type TripDetailsCacheData =
  TripDetailsRepositoryData

let tripsCache: TripsCacheData | null = null

let tripsCacheLoading:
  | Promise<TripsCacheData>
  | null = null

let tripsCacheVersion = 0

const tripDetailsCache =
  new Map<string, TripDetailsCacheData>()

const tripDetailsCacheLoading =
  new Map<
    string,
    Promise<TripDetailsCacheData>
  >()

const tripDetailsCacheVersions =
  new Map<string, number>()

/*
 * ================================
 * كاش الرحلات
 * ================================
 */

export function getTripsCache() {
  return tripsCache
}

export function setTripsCache(
  data: TripsCacheData,
) {
  tripsCacheVersion += 1
  tripsCacheLoading = null
  tripsCache = data
}

export function clearTripsCache() {
  tripsCacheVersion += 1
  tripsCacheLoading = null
  tripsCache = null
}

export async function loadTripsCache(
  options?: {
    force?: boolean
  },
): Promise<TripsCacheData> {
  const force = options?.force ?? false

  if (!force && tripsCache) {
    return tripsCache
  }

  if (!force && tripsCacheLoading) {
    return tripsCacheLoading
  }

  const requestVersion = ++tripsCacheVersion

  const loadingPromise = (async (): Promise<TripsCacheData> => {
    const data = await loadTripsRepositoryData()

    // لا تحفظ نتيجة طلب قديم إذا بدأ تحميل أحدث
    // أو تم مسح الكاش أثناء التحميل.
    if (requestVersion === tripsCacheVersion) {
      tripsCache = data
    }

    return data
  })()

  tripsCacheLoading = loadingPromise

  try {
    return await loadingPromise
  } finally {
    // لا تمسح مرجع تحميل أحدث عند انتهاء طلب أقدم.
    if (tripsCacheLoading === loadingPromise) {
      tripsCacheLoading = null
    }
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
  const version =
    tripDetailsCacheVersions.get(tripId) ?? 0

  tripDetailsCacheVersions.set(
    tripId,
    version + 1,
  )

  tripDetailsCacheLoading.delete(tripId)
  tripDetailsCache.set(tripId, data)
}

export function clearTripDetailsCache(
  tripId?: string,
) {
  if (tripId) {
    const version =
      tripDetailsCacheVersions.get(tripId) ?? 0

    tripDetailsCacheVersions.set(
      tripId,
      version + 1,
    )

    tripDetailsCache.delete(tripId)
    tripDetailsCacheLoading.delete(tripId)

    return
  }

  // إبطال جميع الطلبات السابقة حتى لا تعيد
  // تخزين بيانات التفاصيل بعد مسح الكاش.
  const tripIds = new Set([
    ...tripDetailsCache.keys(),
    ...tripDetailsCacheLoading.keys(),
    ...tripDetailsCacheVersions.keys(),
  ])

  for (const id of tripIds) {
    const version =
      tripDetailsCacheVersions.get(id) ?? 0

    tripDetailsCacheVersions.set(
      id,
      version + 1,
    )
  }

  tripDetailsCache.clear()
  tripDetailsCacheLoading.clear()
}

export async function loadTripDetailsCache(
  tripId: string,
  options?: {
    force?: boolean
  },
): Promise<TripDetailsCacheData> {
  const force = options?.force ?? false

  if (!force) {
    const cached =
      tripDetailsCache.get(tripId)

    if (cached) {
      return cached
    }

    const existingLoading =
      tripDetailsCacheLoading.get(tripId)

    if (existingLoading) {
      return existingLoading
    }
  }

  const requestVersion =
    (tripDetailsCacheVersions.get(tripId) ?? 0) + 1

  tripDetailsCacheVersions.set(
    tripId,
    requestVersion,
  )

  const loadingPromise =
    (async (): Promise<TripDetailsCacheData> => {
      const data =
        await loadTripDetailsRepositoryData(tripId)

      // لا تحفظ إلا نتيجة أحدث طلب صالح لهذه الرحلة.
      if (
        tripDetailsCacheVersions.get(tripId) ===
        requestVersion
      ) {
        tripDetailsCache.set(tripId, data)
      }

      return data
    })()

  tripDetailsCacheLoading.set(
    tripId,
    loadingPromise,
  )

  try {
    return await loadingPromise
  } finally {
    // لا تمسح مرجع طلب أحدث بدأ لنفس الرحلة.
    if (
      tripDetailsCacheLoading.get(tripId) ===
      loadingPromise
    ) {
      tripDetailsCacheLoading.delete(tripId)
    }
  }
}
