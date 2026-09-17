'use client'

import { useState } from 'react'
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Search,
  UserRound,
} from 'lucide-react'

export default function StudentStatusPage() {
  const [searchValue, setSearchValue] = useState('')
  const [searched, setSearched] = useState(false)

  const handleSearch = () => {
    if (!searchValue.trim()) return
    setSearched(true)
  }

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <UserRound className="size-7" />
          </div>

          <h1 className="text-2xl font-bold">
            متابعة طلب الطالب
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            أدخل الرقم الشخصي أو رقم الطلب لمعرفة حالة التسجيل
          </p>
        </div>

        {/* Search */}
        <div className="rounded-2xl border bg-background p-5 shadow-sm">
          <label className="mb-2 block text-sm font-medium">
            الرقم الشخصي أو رقم الطلب
          </label>

          <div className="flex gap-2">
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch()
                }
              }}
              placeholder="مثال: 123456789"
              className="h-11 min-w-0 flex-1 rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-primary"
            />

            <button
              type="button"
              onClick={handleSearch}
              className="flex h-11 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              <Search className="size-4" />
              متابعة
            </button>
          </div>
        </div>

        {/* Result */}
        {searched && (
          <div className="mt-5 overflow-hidden rounded-2xl border bg-background shadow-sm">
            <div className="border-b px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">
                    رقم الطلب
                  </p>

                  <p className="mt-1 font-semibold">
                    REG-2026-00125
                  </p>
                </div>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1.5 text-xs font-medium text-yellow-800">
                  <Clock3 className="size-3.5" />
                  قيد المراجعة
                </span>
              </div>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <InfoItem
                label="اسم الطالب"
                value="أحمد محمد علي"
              />

              <InfoItem
                label="الرقم الشخصي"
                value="123456789"
              />

              <InfoItem
                label="المستوى"
                value="الصف السادس"
              />

              <InfoItem
                label="تاريخ تقديم الطلب"
                value="17 سبتمبر 2026"
              />
            </div>

            {/* Timeline */}
            <div className="border-t px-5 py-5">
              <h2 className="mb-5 font-semibold">
                حالة الطلب
              </h2>

              <div className="space-y-5">
                <StatusStep
                  title="تم تقديم الطلب"
                  description="تم استلام طلب التسجيل بنجاح"
                  done
                />

                <StatusStep
                  title="قيد المراجعة"
                  description="الطلب حاليًا لدى الإدارة للمراجعة"
                  active
                />

                <StatusStep
                  title="قرار التسجيل"
                  description="سيظهر القرار بعد انتهاء المراجعة"
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <CalendarDays className="size-3.5" />
          <span>نظام التسجيل الإلكتروني</span>
        </div>
      </div>
    </main>
  )
}

function InfoItem({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-xs text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 font-medium">
        {value}
      </p>
    </div>
  )
}

function StatusStep({
  title,
  description,
  done = false,
  active = false,
}: {
  title: string
  description: string
  done?: boolean
  active?: boolean
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5">
        {done ? (
          <CheckCircle2 className="size-5 text-green-600" />
        ) : active ? (
          <Clock3 className="size-5 text-yellow-600" />
        ) : (
          <div className="mt-1 size-4 rounded-full border-2 border-muted-foreground/30" />
        )}
      </div>

      <div>
        <p className="text-sm font-medium">
          {title}
        </p>

        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  )
}
