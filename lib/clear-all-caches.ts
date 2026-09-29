import { clearStudentsCache } from '@/lib/students-cache'
import { clearTeachersCache } from '@/lib/teachers-cache'
import { clearPaymentsCache } from '@/lib/payments-cache'
import {
  clearTripsCache,
  clearTripDetailsCache,
} from '@/lib/trips-cache'
import { clearDashboardSections } from '@/lib/dashboard-sections-cache'

export function clearAllCaches() {
  clearStudentsCache()
  clearTeachersCache()
  clearPaymentsCache()
  clearTripsCache()
  clearTripDetailsCache()
  clearDashboardSections()

  if (typeof window !== 'undefined') {
    try {
      sessionStorage.clear()
    } catch {
      // تجاهل أخطاء sessionStorage
    }
  }
}
