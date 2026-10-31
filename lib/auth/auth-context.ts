
import { cache } from 'react'
import { validateCurrentAccess } from '@/lib/auth-guard'

/**
 * Centralized authentication context for Server Components.
 *
 * React cache deduplicates calls within the applicable
 * server render/request scope. It is not a cross-request cache.
 */
export const getAuthContext = cache(async () => {
  return validateCurrentAccess()
})
