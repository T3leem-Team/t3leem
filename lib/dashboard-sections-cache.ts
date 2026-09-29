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

    const parsed = JSON.parse(raw)

    if (!Array.isArray(parsed)) {
      return null
    }

    return parsed
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
