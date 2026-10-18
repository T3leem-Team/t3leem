

export const ALLOWED_ROLES = [
  'Admin',
  'Supervisor',
  'Teacher',
  'Payments Manager',
] as const

export type AllowedRole = (typeof ALLOWED_ROLES)[number]

export function isAllowedRole(
  value: unknown,
): value is AllowedRole {
  return (
    typeof value === 'string' &&
    ALLOWED_ROLES.includes(value as AllowedRole)
  )
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function readString(
  value: unknown,
): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()

  return normalized.length > 0 ? normalized : null
}

export function readStringArray(
  value: unknown,
): string[] | null {
  if (!Array.isArray(value)) {
    return null
  }

  if (!value.every((item) => typeof item === 'string')) {
    return null
  }

  return value.map((item) => item.trim())
}

export function uniqueStrings(
  values: string[],
): string[] {
  return [...new Set(values)]
}
