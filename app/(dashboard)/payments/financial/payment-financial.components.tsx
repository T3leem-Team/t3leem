
import type { ReactNode } from 'react'
import { X } from 'lucide-react'

import type { Transaction } from './payment-financial.types'

export function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string
  value: string
  icon: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {title}
        </div>

        <div className="text-muted-foreground">
          {icon}
        </div>
      </div>

      <div className="mt-3 text-xl font-bold">
        {value}
      </div>
    </div>
  )
}

export function StudentPaymentStatus({
  status,
}: {
  status: 'paid' | 'partial' | 'exempt' | 'unpaid'
}) {
  if (status === 'paid') {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
        مدفوع بالكامل
      </span>
    )
  }

  if (status === 'partial') {
    return (
      <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
        مدفوع جزئيًا
      </span>
    )
  }

  if (status === 'exempt') {
    return (
      <span className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
        معفي
      </span>
    )
  }

  return (
    <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800 dark:bg-red-950/50 dark:text-red-300">
      غير مدفوع
    </span>
  )
}

export function StatusBadge({
  status,
}: {
  status: Transaction['confirmation_status']
}) {
  if (status === 'pending') {
    return (
      <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
        بانتظار التأكيد
      </span>
    )
  }

  if (status === 'confirmed') {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
        تم التأكيد
      </span>
    )
  }

  return (
    <span className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
      غير مطلوب
    </span>
  )
}

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card text-foreground shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="font-bold">{title}</h3>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function Detail({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  return (
    <div className="rounded-xl bg-muted p-4">
      <div className="text-xs text-muted-foreground">
        {label}
      </div>

      <div className="mt-1 break-all text-sm font-medium">
        {value || '-'}
      </div>
    </div>
  )
}
