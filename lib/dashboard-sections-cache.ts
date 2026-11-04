export type DashboardSection = {
  section_key: string
  href: string
  sort_order: number
}

type DashboardSectionsCache = {
  sections: DashboardSection[]
  savedAt: number
}

type LoadDashboardSectionsOptions = {
  forceRefresh?: boolean
}

export class DashboardSectionsError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'DashboardSectionsError'
    this.status = status
  }
}

const STORAGE_KEY = 't3leem_dashboard_sections'
const CACHE_TTL_MS = 30_000

let memoryCache: DashboardSectionsCache | null = null
let sectionsPromise: Promise<DashboardSection[]> | null = null
let cacheVersion = 0

function isValidSection(
  section: unknown,
): section is DashboardSection {
  if (
    typeof section !== 'object' ||
    section === null
  ) {
    return false
  }

  const item = section as Record<string, unknown>

  return (
    typeof item.section_key === 'string' &&
    typeof item.href === 'string' &&
    typeof item.sort_order === 'number' &&
    Number.isFinite(item.sort_order)
  )
}

function normalizeSections(
  value: unknown,
): DashboardSection[] {
  if (!Array.isArray(value)) return []

  return value
    .filter(isValidSection)
    .map((section) => ({
      section_key: section.section_key,
      href: section.href,
      sort_order: section.sort_order,
    }))
    .sort((a, b) => a.sort_order - b.sort_order)
}

function isFresh(
  cache: DashboardSectionsCache | null,
): cache is DashboardSectionsCache {
  return (
    cache !== null &&
    Date.now() - cache.savedAt < CACHE_TTL_MS
  )
}

export function saveDashboardSections(
  sections: DashboardSection[],
) {
  const normalized = normalizeSections(sections)

  cacheVersion++

  const cache: DashboardSectionsCache = {
    sections: normalized,
    savedAt: Date.now(),
  }

  memoryCache = cache

  if (typeof window === 'undefined') return

  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(cache),
    )
  } catch (error) {
    console.error(
      'Failed to save dashboard sections:',
      error,
    )
  }
}

export function getDashboardSections():
  | DashboardSection[]
  | null {
  if (isFresh(memoryCache)) {
    return memoryCache.sections
  }

  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)

    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)

    if (
      typeof parsed !== 'object' ||
      parsed === null
    ) {
      return null
    }

    const cache = parsed as Record<string, unknown>

    if (
      typeof cache.savedAt !== 'number' ||
      !Number.isFinite(cache.savedAt) ||
      !Array.isArray(cache.sections)
    ) {
      return null
    }

    const sections = normalizeSections(cache.sections)

    if (
      sections.length !== cache.sections.length ||
      !isFresh({
        sections,
        savedAt: cache.savedAt,
      })
    ) {
      return null
    }

    memoryCache = {
      sections,
      savedAt: cache.savedAt,
    }

    return sections
  } catch (error) {
    console.error(
      'Failed to read dashboard sections:',
      error,
    )

    return null
  }
}

export async function loadDashboardSections(
  options: LoadDashboardSectionsOptions = {},
): Promise<DashboardSection[]> {
  const { forceRefresh = false } = options

  if (!forceRefresh) {
    const cachedSections = getDashboardSections()

    if (cachedSections !== null) {
      return cachedSections
    }

    if (sectionsPromise) {
      return sectionsPromise
    }
  }

  const requestVersion = cacheVersion

  const request = (async () => {
    const response = await fetch(
      '/api/auth/dashboard-sections',
      {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      },
    )

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      throw new DashboardSectionsError(
        typeof data?.error === 'string'
          ? data.error
          : 'تعذر تحميل أقسام لوحة التحكم.',
        response.status,
      )
    }

    const sections = normalizeSections(data?.sections)

    if (requestVersion === cacheVersion) {
      saveDashboardSections(sections)
    }

    return sections
  })()

  sectionsPromise = request

  try {
    return await request
  } finally {
    if (sectionsPromise === request) {
      sectionsPromise = null
    }
  }
}

export function clearDashboardSections() {
  cacheVersion++
  memoryCache = null
  sectionsPromise = null

  if (typeof window === 'undefined') return

  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error(
      'Failed to clear dashboard sections:',
      error,
    )
  }
}
