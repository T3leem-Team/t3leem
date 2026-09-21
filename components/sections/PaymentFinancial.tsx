'use client'

import { Card, CardContent } from '@/components/ui/card'

export function PaymentFinancial() {
  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold">
          إدارة المالية
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          إدارة أموال المدرسة والاستلام والمصروفات والتسويات.
        </p>
      </CardContent>
    </Card>
  )
}
