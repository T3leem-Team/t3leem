import AttendanceAwardsCalculator from './attendance-awards-calculator'
import ArchiveManager from './archive-manager'

export default function Page() {
  return (
    <div className="space-y-6">
      <AttendanceAwardsCalculator />

      <ArchiveManager />
    </div>
  )
}
