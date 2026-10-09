import SystemShutdownClient from './system-shutdown-client'
import SystemMaintenanceClient from './system-maintenance-client'

export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <div className="space-y-6">
      <SystemShutdownClient />
      <SystemMaintenanceClient />
    </div>
  )
}