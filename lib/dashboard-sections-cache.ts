
export type DashboardSection = {
  section_key: string
  href: string
  sort_order: number
}

const STORAGE_KEY = 't3leem_dashboard_sections'

export function saveDashboardSections(
  sections: DashboardSection[],
) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(sections),
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
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw =
      sessionStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return null
    }

    const parsed: unknown = JSON.parse(raw)

    if (!Array.isArray(parsed)) {
      return null
    }

    const isValid = parsed.every(
      (section: unknown) => {
        if (
          typeof section !== 'object' ||
          section === null
        ) {
          return false
        }

        const item = section as Record<
          string,
          unknown
        >

        return (
          typeof item.section_key === 'string' &&
          typeof item.href === 'string' &&
          typeof item.sort_order === 'number' &&
          Number.isFinite(item.sort_order)
        )
      },
    )

    if (!isValid) {
      return null
    }

    return parsed as DashboardSection[]
  } catch (error) {
    console.error(
      'Failed to read dashboard sections:',
      error,
    )

    return null
  }
}

export function clearDashboardSections() {
  if (typeof window === 'undefined') {
    return
  }

  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error(
      'Failed to clear dashboard sections:',
      error,
    )
  }
}
