import { TrendingUp, TrendingDown } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { Stat } from '@/lib/data'

export function StatCard({ stat }: { stat: Stat }) {
  const up = stat.trend === 'up'
  return (
    <Card className="p-5">
      <p className="text-sm text-muted-foreground">{stat.label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums">
        {stat.value}
      </p>
      <div className="mt-3 flex items-center gap-2 text-xs">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium',
            up
              ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400'
              : 'bg-destructive/12 text-destructive',
          )}
        >
          {up ? (
            <TrendingUp className="size-3" />
          ) : (
            <TrendingDown className="size-3" />
          )}
          {stat.change}
        </span>
        <span className="text-muted-foreground">{stat.hint}</span>
      </div>
    </Card>
  )
}
