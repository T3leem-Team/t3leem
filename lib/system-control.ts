
import {
  loadSystemSettings,
  updateSystemSettings,
} from './features/app-core/repositories/system-control.repository'

const MAINTENANCE_CACHE_TTL_MS = 3_000

let cachedMaintenanceMode: boolean | null = null
let cacheExpiresAt = 0

export async function isMaintenanceMode(): Promise<boolean> {
  const now = Date.now()

  // استخدام القيمة المحفوظة إذا كانت لا تزال صالحة
  if (
    cachedMaintenanceMode !== null &&
    now < cacheExpiresAt
  ) {
    return cachedMaintenanceMode
  }

  const { data, error } = await loadSystemSettings()

  if (error || !data) {
    console.error('System settings lookup error:', error)

    throw new Error('تعذر التحقق من حالة النظام.')
  }

  const maintenanceMode = data.system_enabled === false

  cachedMaintenanceMode = maintenanceMode
  cacheExpiresAt = Date.now() + MAINTENANCE_CACHE_TTL_MS

  return maintenanceMode
}

export async function setMaintenanceMode(
  enabled: boolean,
) {
  const { error } = await updateSystemSettings(
    enabled,
    new Date().toISOString(),
  )

  if (error) {
    console.error('System settings update error:', error)

    throw new Error('تعذر تحديث حالة النظام.')
  }

  // تحديث الذاكرة المؤقتة فور نجاح التغيير
  cachedMaintenanceMode = enabled
  cacheExpiresAt = Date.now() + MAINTENANCE_CACHE_TTL_MS
}
