
'use client'

import {
  BarChart3,
  Clock3,
  UserCheck,
  Users,
  UserX,
  Wallet,
  ChevronDown,
} from 'lucide-react'

import { TripResultsTable } from './trip-results-table'
import type { ResponseStatus, Student } from './trip-types'

type TableStudent = Parameters<
  React.ComponentProps<typeof TripResultsTable>['onPaymentChange']
>[0]

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

  responseFilter: 'all' | ResponseStatus
  onResponseFilterChange: (
    value: 'all' | ResponseStatus,
  ) => void

  paymentInputs: Record<string, string>
  responseInputs: Record<string, ResponseStatus>

  paymentStatus: Record<
    string,
    'saving' | 'saved' | 'error'
  >

  responseSavingId: string | null
  canEditParticipantData: boolean

  onPaymentChange: (
    student: TableStudent,
    value: string,
  ) => void

  onResponseChange: (
    student: TableStudent,
    value: ResponseStatus,
  ) => void

  onSaveStudent: (
    student: TableStudent,
  ) => void | Promise<void>

  hasUnsavedChanges: (
    student: TableStudent,
  ) => boolean

  savingStudentId: string | null

  saveStatus: Record<
    string,
    'saved' | 'error'
  >

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
  responseInputs,
  paymentStatus,
  responseSavingId,
  canEditParticipantData,
  onPaymentChange,
  onResponseChange,
  onSaveStudent,
  hasUnsavedChanges,
  savingStudentId,
  saveStatus,
  formatDateTime,
  formatPayment,
}: TripResultsSectionProps) {
  const statCards = [
    {
      label: 'الإجمالي',
      value: tripResults.total,
      icon: Users,
      cardClass:
        'border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/40',
      iconClass:
        'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
      valueClass: 'text-slate-800 dark:text-slate-100',
    },
    {
      label: 'المقبولون',
      value: tripResults.accepted,
      icon: UserCheck,
      cardClass:
        'border-emerald-100 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/20',
      iconClass:
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
      valueClass: 'text-emerald-800 dark:text-emerald-300',
    },
    {
      label: 'المرفوضون',
      value: tripResults.rejected,
      icon: UserX,
      cardClass:
        'border-rose-100 bg-rose-50/70 dark:border-rose-900/60 dark:bg-rose-950/20',
      iconClass:
        'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
      valueClass: 'text-rose-800 dark:text-rose-300',
    },
    {
      label: 'بانتظار الرد',
      value: tripResults.pending,
      icon: Clock3,
      cardClass:
        'border-amber-100 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/20',
      iconClass:
        'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
      valueClass: 'text-amber-800 dark:text-amber-300',
    },
  ]

  return (
    <section className="space-y-5 rounded-2xl">
      {/* Section heading */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
            <BarChart3 className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              نتائج الرحلة
            </h2>

            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              ملخص الردود والمدفوعات وحالة الطلاب
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleResults}
          aria-expanded={showResults}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-800 shadow-sm transition-all hover:border-blue-300 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-900/50"
        >
          {showResults ? 'إخفاء النتائج' : 'عرض النتائج'}

          <ChevronDown
            className={`h-4 w-4 transition-transform ${
              showResults ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* Response statistics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((item) => {
          const Icon = item.icon

          return (
            <div
              key={item.label}
              className={`rounded-2xl border p-4 shadow-sm shadow-slate-200/20 transition-colors dark:shadow-none ${item.cardClass}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  {item.label}
                </span>

                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.iconClass}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
              </div>

              <p
                className={`mt-3 text-2xl font-bold tabular-nums ${item.valueClass}`}
              >
                {item.value}
              </p>
            </div>
          )
        })}
      </div>

      {/* Payments summary */}
      <div className="flex items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50/70 p-4 shadow-sm shadow-sky-100/20 dark:border-sky-900/60 dark:bg-sky-950/20 dark:shadow-none">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">
          <Wallet className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-sky-800 dark:text-sky-200">
            إجمالي المدفوعات
          </p>

          <p className="mt-1 break-words text-xl font-bold text-sky-950 dark:text-sky-100">
            {formatPayment(totalPaid)}
          </p>
        </div>
      </div>

      {/* Results table */}
      {showResults && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/30 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
          <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              قائمة نتائج الطلاب
            </p>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              يمكنك البحث والتصفية ومراجعة الردود والمبالغ
            </p>
          </div>

          <div className="p-3 sm:p-4">
            <TripResultsTable
              tripId={tripId}
              students={resultStudents}
              search={search}
              onSearchChange={onSearchChange}
              responseFilter={responseFilter}
              onResponseFilterChange={onResponseFilterChange}
              paymentInputs={paymentInputs}
              responseInputs={responseInputs}
              paymentStatus={paymentStatus}
              responseSavingId={responseSavingId}
              canEditParticipantData={canEditParticipantData}
              onPaymentChange={onPaymentChange}
              onResponseChange={onResponseChange}
              onSaveStudent={onSaveStudent}
              hasUnsavedChanges={hasUnsavedChanges}
              savingStudentId={savingStudentId}
              saveStatus={saveStatus}
              formatDateTime={formatDateTime}
              formatPayment={formatPayment}
            />
          </div>
        </div>
      )}
    </section>
  )
}
