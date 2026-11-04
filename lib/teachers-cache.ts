'use client'

import {
  loadTeachersRepositoryData,
} from '@/lib/features/teachers/repositories/teachers.repository'

import type {
  RepositoryTeacher,
  RepositoryAssignment,
  RepositoryTeacherCourseSubject,
  RepositoryManagedCourse,
  RepositoryAcademicLevel,
  TeachersRepositoryData,
} from '@/lib/features/teachers/repositories/teachers.repository'

export type Teacher = RepositoryTeacher

export type Assignment = RepositoryAssignment

export type TeacherCourseSubject =
  RepositoryTeacherCourseSubject

export type ManagedCourse = RepositoryManagedCourse

export type AcademicLevel = RepositoryAcademicLevel

export type TeachersCache = TeachersRepositoryData

let teachersCache: TeachersCache | null = null
let teachersCacheLoading: Promise<TeachersCache> | null = null
let teachersCacheVersion = 0

export function getTeachersCache() {
  return teachersCache
}

export function setTeachersCache(data: TeachersCache) {
  teachersCacheVersion += 1
  teachersCacheLoading = null
  teachersCache = data
}

export function updateTeachersCache(
  patch: Partial<TeachersCache>,
) {
  // لا تنشئ كاشًا فارغًا إذا لم يكتمل تحميل البيانات بعد.
  if (!teachersCache) {
    return
  }

  teachersCacheVersion += 1
  teachersCacheLoading = null

  // حدّث البيانات المطلوبة مع المحافظة على بقية الكاش.
  teachersCache = {
    ...teachersCache,
    ...patch,
  }
}

export function clearTeachersCache() {
  teachersCacheVersion += 1
  teachersCacheLoading = null
  teachersCache = null
}

export async function loadTeachersCache(
  options?: {
    force?: boolean
  },
): Promise<TeachersCache> {
  const force = options?.force ?? false

  // استخدم الكاش الموجود إذا لم يُطلب تحديث إجباري.
  if (!force && teachersCache) {
    return teachersCache
  }

  // لا تبدأ طلبًا مكررًا أثناء وجود طلب تحميل.
  if (!force && teachersCacheLoading) {
    return teachersCacheLoading
  }

  const requestVersion = ++teachersCacheVersion

  const loadingPromise = (async (): Promise<TeachersCache> => {
    // تحميل البيانات من Repository.
    const data = await loadTeachersRepositoryData()

    // لا تسمح لطلب قديم بالكتابة فوق الكاش الأحدث.
    if (requestVersion === teachersCacheVersion) {
      teachersCache = data
    }

    return data
  })()

  teachersCacheLoading = loadingPromise

  try {
    return await loadingPromise
  } finally {
    // لا تمسح مرجع طلب أحدث عند انتهاء طلب أقدم.
    if (teachersCacheLoading === loadingPromise) {
      teachersCacheLoading = null
    }
  }
}
