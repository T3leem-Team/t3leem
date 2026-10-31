
export type TripsRepositoryData = {
  trips: unknown[]
  academicYears: unknown[]
  courses: unknown[]
  levels: unknown[]
  tripLevels: unknown[]
}

export type TripDetailsRepositoryData = {
  trip: unknown
  course: unknown
  levels: unknown[]
  lesson_dates: string[]
  students: unknown[]
}

/*
 * ================================
 * تحميل بيانات الرحلات
 * ================================
 */

export async function loadTripsRepositoryData(): Promise<TripsRepositoryData> {
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

  return {
    trips: Array.isArray(result?.trips)
      ? result.trips
      : [],

    academicYears: Array.isArray(
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
}

/*
 * ================================
 * تحميل تفاصيل رحلة واحدة
 * ================================
 */

export async function loadTripDetailsRepositoryData(
  tripId: string,
): Promise<TripDetailsRepositoryData> {
  const response = await fetch(
    `/api/trips/${encodeURIComponent(
      tripId,
    )}/students`,
    {
      method: 'GET',
      cache: 'no-store',
    },
  )

  const result = await response.json()

  if (!response.ok) {
    throw new Error(
      result?.error ??
        'تعذر تحميل بيانات الرحلة.',
    )
  }

  return {
    trip: result?.trip ?? null,

    course: result?.course ?? null,

    levels: Array.isArray(
      result?.levels,
    )
      ? result.levels
      : [],

    lesson_dates: Array.isArray(
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
}
