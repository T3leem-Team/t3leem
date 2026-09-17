import { Suspense } from 'react'
import PaymentsView from '@/components/sections/payments-view'

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PaymentsView />
    </Suspense>
  )
}
