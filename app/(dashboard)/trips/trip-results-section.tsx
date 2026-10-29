"use client"

import {
  BarChart3,
  Clock3,
  UserCheck,
  Users,
  UserX,
  Wallet,
} from "lucide-react"

import { TripResultsTable } from "./trip-results-table"
import type { ResponseStatus, Student } from "./trip-types"

type TripResultsSectionProps = {
  tripId: string

  tripResults: {
    total: number
    accepted: number
    rejected: number
    pending: number
  }

  totalPaid: number
  showResults: boolean
  onToggleResults: () => void

  resultStudents: Student[]
  search: string
  onSearchChange: (value: string) => void

  responseFilter: "all" | ResponseStatus
  onResponseFilterChange: (
    value: "all" | ResponseStatus,
  ) => void

  paymentInputs: Record<string, string>
  paymentStatus: Record<
    string,
    "saving" | "saved" | "error"
  >

  responseSavingId: string | null
  canEditParticipantData: boolean

  onPaymentChange: (
    student: Student,
    value: string,
  ) => void

  onResponseChange: (
    student: Student,
    value: ResponseStatus,
  ) => void

  formatDateTime: (value: string | null) => string
  formatPayment: (value: number) => string
}

export function TripResultsSection({
  tripId,
  tripResults,
  totalPaid,
  showResults,
  onToggleResults,
  resultStudents,
  search,
  onSearchChange,
  responseFilter,
  onResponseFilterChange,
  paymentInputs,
  paymentStatus,
  responseSavingId,
  canEditParticipantData,
  onPaymentChange,
  onResponseChange,
  formatDateTime,
  formatPayment,
}: TripResultsSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />

          <h2 className="text-lg font-semibold">
            نتائج الرحلة
          </h2>
        </div>

        <button
          type="button"
          onClick={onToggleResults}
          className="rounded-lg border px-4 py-2 text-sm transition hover:bg-muted"
        >
          {showResults ? "إخفاء النتائج" : "عرض النتائج"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="rounded-xl border p-4">
          <div className="mb-2 flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="text-sm">الإجمالي</span>
          </div>

          <p className="text-2xl font-bold">
            {tripResults.total}
          </p>
        </div>

        <div className="rounded-xl border p-4">
          <div className="mb-2 flex items-center gap-2 text-green-600">
            <UserCheck className="h-4 w-4" />
            <span className="text-sm">المقبولون</span>
          </div>

          <p className="text-2xl font-bold">
            {tripResults.accepted}
          </p>
        </div>

        <div className="rounded-xl border p-4">
          <div className="mb-2 flex items-center gap-2 text-red-600">
            <UserX className="h-4 w-4" />
            <span className="text-sm">المرفوضون</span>
          </div>

          <p className="text-2xl font-bold">
            {tripResults.rejected}
          </p>
        </div>

        <div className="rounded-xl border p-4">
          <div className="mb-2 flex items-center gap-2 text-muted-foreground">
            <Clock3 className="h-4 w-4" />
            <span className="text-sm">بانتظار الرد</span>
          </div>

          <p className="text-2xl font-bold">
            {tripResults.pending}
          </p>
        </div>

        <div className="rounded-xl border p-4">
          <div className="mb-2 flex items-center gap-2 text-muted-foreground">
            <Wallet className="h-4 w-4" />
            <span className="text-sm">إجمالي المدفوعات</span>
          </div>

          <p className="text-2xl font-bold">
            {formatPayment(totalPaid)}
          </p>
        </div>
      </div>

      {showResults && (
        <TripResultsTable
          tripId={tripId}
          students={resultStudents}
          search={search}
          onSearchChange={onSearchChange}
          responseFilter={responseFilter}
          onResponseFilterChange={onResponseFilterChange}
          paymentInputs={paymentInputs}
          paymentStatus={paymentStatus}
          responseSavingId={responseSavingId}
          canEditParticipantData={canEditParticipantData}
          onPaymentChange={onPaymentChange}
          onResponseChange={onResponseChange}
          formatDateTime={formatDateTime}
          formatPayment={formatPayment}
        />
      )}
    </section>
  )
}
