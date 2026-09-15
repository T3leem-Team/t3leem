import { enrollmentTrend } from '@/lib/data'

export function EnrollmentChart() {
  const values = enrollmentTrend.map((p) => p.students)
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1

  return (
    <div className="flex h-56 items-stretch gap-2" role="img" aria-label="مخطط نمو أعداد الطلاب خلال العام">
      {enrollmentTrend.map((point) => {
        const height = 20 + ((point.students - min) / range) * 80
        return (
          <div
            key={point.month}
            className="flex flex-1 flex-col items-center gap-2"
          >
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full rounded-t-md bg-primary/80 transition-colors hover:bg-primary"
                style={{ height: `${height}%` }}
                title={`${point.month}: ${point.students}`}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">
              {point.month}
            </span>
          </div>
        )
      })}
    </div>
  )
}
