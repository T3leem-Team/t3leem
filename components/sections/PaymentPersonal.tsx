'use client'

import { Card, CardContent } from '@/components/ui/card'

export function PaymentPersonal() {
  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold">
          الإدارة الشخصية
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          إدارة الدورات المالية الشخصية.
        </p>
      </CardContent>
    </Card>
  )
}
