
import { validateCurrentAccess } from '@/lib/auth-guard'
import {
  loadDashboardSectionByKey,
  loadUserDashboardSectionPermission,
} from '@/lib/features/app-core/repositories/dashboard-section-guard.repository'

export type DashboardSectionAccess = {
  allowed: boolean
  reason?: string
  userId?: string
  profileId?: string
}

export async function validateDashboardSection(
  sectionKey: string,
): Promise<DashboardSectionAccess> {
  const access = await validateCurrentAccess()

  if (!access.allowed || !access.userId || !access.profileId) {
    return {
      allowed: false,
      reason: access.reason ?? 'not_authenticated',
    }
  }

  const { data: section, error: sectionError } =
    await loadDashboardSectionByKey(sectionKey)

  if (
    sectionError ||
    !section ||
    !section.is_active
  ) {
    return {
      allowed: false,
      reason: 'section_not_found',
    }
  }

  const { data: permission, error: permissionError } =
    await loadUserDashboardSectionPermission(
      access.profileId,
      section.id,
    )

  if (permissionError) {
    console.error(
      'Dashboard section permission error:',
      permissionError,
    )

    return {
      allowed: false,
      reason: 'permission_check_failed',
    }
  }

  if (!permission) {
    return {
      allowed: false,
      reason: 'section_not_allowed',
    }
  }

  return {
    allowed: true,
    userId: access.userId,
    profileId: access.profileId,
  }
}
