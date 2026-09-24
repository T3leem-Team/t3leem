'use client'

import { Map } from 'lucide-react'

export function TripsView() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Map className="size-5" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              الرحلات
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              إدارة الرحلات والطلاب المشاركين فيها
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <Map className="mx-auto mb-4 size-10 text-muted-foreground" />

        <h2 className="text-lg font-semibold">
          لا توجد رحلات مضافة
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          سيتم من هنا إنشاء وإدارة الرحلات الطلابية.
        </p>
      </div>
    </div>
  )
}
