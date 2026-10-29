
'use client'

import { useEffect, useState } from 'react'
import { Search, Settings2, Loader2 } from 'lucide-react'

type ResponseStatus = 'pending' | 'accepted' | 'rejected'
type ResponseSource = 'student' | 'admin' | null

type ResultStudent = {
  id: string
  name: string
  personal_id: string | null
  phone: string | null
  whatsapp?: string | null
  level: { id: string; name: string; sort_order: number | null } | null
  response: ResponseStatus
  response_note: string | null
  response_source: ResponseSource
  responded_at: string | null
  payment_amount: number
}

type ResultColumn =
  | 'student'
  | 'level'
  | 'phone'
  | 'response'
  | 'source'
  | 'date'
  | 'payment'
  | 'note'

const RESULT_COLUMNS: {
  id: ResultColumn
  label: string
  defaultVisible: boolean
}[] = [
  { id: 'student', label: 'الطالب', defaultVisible: true },
  { id: 'level', label: 'المستوى', defaultVisible: true },
  { id: 'phone', label: 'الهاتف', defaultVisible: true },
  { id: 'response', label: 'الرد', defaultVisible: true },
  { id: 'source', label: 'نوع الرد', defaultVisible: true },
  { id: 'date', label: 'تاريخ الرد', defaultVisible: false },
  { id: 'payment', label: 'الدفع', defaultVisible: true },
  { id: 'note', label: 'الملاحظة', defaultVisible: false },
]

const STORAGE_KEY = 'trip-results-columns'

type Props = {
  tripId: string
  students: ResultStudent[]
  search: string
  onSearchChange: (value: string) => void
  responseFilter: 'all' | ResponseStatus
  onResponseFilterChange: (value: 'all' | ResponseStatus) => void
  paymentInputs: Record<string, string>
  paymentStatus: Record<string, 'saving' | 'saved' | 'error'>
  responseSavingId: string | null
  canEditParticipantData: boolean
  onPaymentChange: (student: ResultStudent, value: string) => void
  onResponseChange: (student: ResultStudent, value: ResponseStatus) => void
  formatDateTime: (value: string | null) => string
  formatPayment: (value: number) => string
}

export function TripResultsTable({
  tripId,
  students,
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
}: Props) {
  const [showColumnSettings, setShowColumnSettings] = useState(false)
  const [columnsLoaded, setColumnsLoaded] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<ResultColumn[]>(
    RESULT_COLUMNS
      .filter((column) => column.defaultVisible)
      .map((column) => column.id),
  )

  useEffect(() => {
    setColumnsLoaded(false)

    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}:${tripId}`)

      if (saved) {
        const parsed: unknown = JSON.parse(saved)

        if (Array.isArray(parsed)) {
          const valid = parsed.filter(
            (column): column is ResultColumn =>
              RESULT_COLUMNS.some((item) => item.id === column),
          )

          setVisibleColumns([
            'student',
            ...new Set(valid.filter((column) => column !== 'student')),
          ])
        } else {
          setVisibleColumns(
            RESULT_COLUMNS.filter((column) => column.defaultVisible)
              .map((column) => column.id),
          )
        }
      } else {
        setVisibleColumns(
          RESULT_COLUMNS.filter((column) => column.defaultVisible)
            .map((column) => column.id),
        )
      }
    } catch (error) {
      console.error('Load result column settings error:', error)
    } finally {
      setColumnsLoaded(true)
    }
  }, [tripId])

  useEffect(() => {
    if (!columnsLoaded) return

    try {
      localStorage.setItem(
        `${STORAGE_KEY}:${tripId}`,
        JSON.stringify(visibleColumns),
      )
    } catch (error) {
      console.error('Save result column settings error:', error)
    }
  }, [tripId, visibleColumns, columnsLoaded])

  function toggleColumn(column: ResultColumn) {
    if (column === 'student') return

    setVisibleColumns((current) =>
      current.includes(column)
        ? current.filter((item) => item !== column)
        : [...current, column],
    )
  }

  const filteredStudents = students
    .filter((student) =>
      responseFilter === 'all'
        ? true
        : student.response === responseFilter,
    )
    .filter((student) => {
      const query = search.trim().toLowerCase()
      if (!query) return true

      return [
        student.name,
        student.personal_id ?? '',
        student.phone ?? '',
        student.whatsapp ?? '',
      ].some((value) => value.toLowerCase().includes(query))
    })

  function sourceLabel(source: ResponseSource) {
    if (source === 'student') return 'من الرابط'
    if (source === 'admin') return 'يدوي'
    return '—'
  }

  function sourceClass(source: ResponseSource) {
    if (source === 'student') {
      return 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
    }

    if (source === 'admin') {
      return 'bg-purple-500/10 text-purple-700 dark:text-purple-400'
    }

    return 'bg-muted text-muted-foreground'
  }

  return (
    <div className="border-t">
      <div className="border-b bg-muted/20 p-4">
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowColumnSettings((current) => !current)}
            aria-expanded={showColumnSettings}
            className="inline-flex h-10 items-center gap-2 rounded-lg border bg-background px-3 text-sm font-medium transition hover:bg-muted"
          >
            <Settings2 className="h-4 w-4" />
            تخصيص الأعمدة
          </button>

          {showColumnSettings && (
            <div className="mt-3 rounded-lg border bg-background p-4">
              <p className="mb-1 text-sm font-semibold">
                اختر الأعمدة التي تريد إظهارها
              </p>

              <p className="mb-3 text-xs text-muted-foreground">
                اختياراتك محفوظة لكل رحلة، وعمود الطالب ثابت.
              </p>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {RESULT_COLUMNS.map((column) => (
                  <label
                    key={column.id}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns.includes(column.id)}
                      disabled={column.id === 'student'}
                      onChange={() => toggleColumn(column.id)}
                      className="h-4 w-4"
                    />
                    {column.label}
                  </label>
                ))}
              </div>

              <button
                type="button"
                onClick={() =>
                  setVisibleColumns(
                    RESULT_COLUMNS
                      .filter((column) => column.defaultVisible)
                      .map((column) => column.id),
                  )
                }
                className="mt-4 rounded-lg border px-3 py-2 text-xs font-medium hover:bg-muted"
              >
                استعادة الأعمدة الافتراضية
              </button>
            </div>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="بحث باسم الطالب أو الرقم الشخصي أو الهاتف..."
              className="h-10 w-full rounded-lg border bg-background px-10 text-sm outline-none transition focus:border-primary"
            />
          </div>

          <select
            value={responseFilter}
            onChange={(event) =>
              onResponseFilterChange(event.target.value as 'all' | ResponseStatus)
            }
            className="h-10 rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-primary"
          >
            <option value="all">جميع الردود</option>
            <option value="accepted">الموافقون فقط</option>
            <option value="rejected">الرافضون فقط</option>
            <option value="pending">الذين لم يردوا</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-right">
              <th className="w-12 px-4 py-3">#</th>

              {visibleColumns.includes('student') && (
                <th className="px-4 py-3 font-medium">الطالب</th>
              )}
              {visibleColumns.includes('level') && (
                <th className="px-4 py-3 font-medium">المستوى</th>
              )}
              {visibleColumns.includes('phone') && (
                <th className="px-4 py-3 font-medium">الهاتف</th>
              )}
              {visibleColumns.includes('response') && (
                <th className="px-4 py-3 font-medium">الرد</th>
              )}
              {visibleColumns.includes('source') && (
                <th className="px-4 py-3 font-medium">نوع الرد</th>
              )}
              {visibleColumns.includes('date') && (
                <th className="px-4 py-3 font-medium">تاريخ الرد</th>
              )}
              {visibleColumns.includes('payment') && (
                <th className="px-4 py-3 font-medium">الدفع</th>
              )}
              {visibleColumns.includes('note') && (
                <th className="px-4 py-3 font-medium">الملاحظة</th>
              )}
            </tr>
          </thead>

          <tbody>
            {filteredStudents.length === 0 ? (
              <tr>
                <td
                  colSpan={1 + visibleColumns.length}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  لا توجد نتائج مطابقة.
                </td>
              </tr>
            ) : (
              filteredStudents.map((student, index) => (
                <tr
                  key={student.id}
                  className="border-b last:border-0 hover:bg-muted/20"
                >
                  <td className="px-4 py-3 text-muted-foreground">
                    {index + 1}
                  </td>

                  {visibleColumns.includes('student') && (
                    <td className="px-4 py-3">
                      <div className="font-medium">{student.name}</div>
                      {student.personal_id && (
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {student.personal_id}
                        </div>
                      )}
                    </td>
                  )}

                  {visibleColumns.includes('level') && (
                    <td className="px-4 py-3">
                      {student.level?.name || 'غير محدد'}
                    </td>
                  )}

                  {visibleColumns.includes('phone') && (
                    <td className="px-4 py-3">
                      {student.phone || student.whatsapp || 'غير متوفر'}
                    </td>
                  )}

                  {visibleColumns.includes('response') && (
                    <td className="px-4 py-3">
                      <select
                        value={student.response}
                        disabled={
                          !canEditParticipantData ||
                          responseSavingId === student.id
                        }
                        onChange={(event) =>
                          onResponseChange(
                            student,
                            event.target.value as ResponseStatus,
                          )
                        }
                        className={`h-9 rounded-lg border bg-background px-2 text-xs outline-none ${
                          student.response === 'accepted'
                            ? 'border-emerald-500/30'
                            : student.response === 'rejected'
                              ? 'border-red-500/30'
                              : ''
                        }`}
                      >
                        <option value="pending">بانتظار الرد</option>
                        <option value="accepted">موافق</option>
                        <option value="rejected">رافض</option>
                      </select>
                    </td>
                  )}

                  {visibleColumns.includes('source') && (
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs ${sourceClass(student.response_source)}`}>
                        {sourceLabel(student.response_source)}
                      </span>
                    </td>
                  )}

                  {visibleColumns.includes('date') && (
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {formatDateTime(student.responded_at)}
                    </td>
                  )}

                  {visibleColumns.includes('payment') && (
                    <td className="px-4 py-3">
                      <div className="min-w-[120px]">
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={paymentInputs[student.id] ?? ''}
                          disabled={!canEditParticipantData}
                          onChange={(event) =>
                            onPaymentChange(student, event.target.value)
                          }
                          placeholder="0.000"
                          className="h-9 w-28 rounded-lg border bg-background px-2 text-left text-xs outline-none focus:border-primary"
                        />

                        <div className="mt-1 text-xs">
                          {paymentStatus[student.id] === 'saving' && (
                            <span className="text-muted-foreground">
                              جاري الحفظ...
                            </span>
                          )}
                          {paymentStatus[student.id] === 'saved' && (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              تم الحفظ ✓
                            </span>
                          )}
                          {paymentStatus[student.id] === 'error' && (
                            <span className="text-destructive">
                              تعذّر الحفظ
                            </span>
                          )}
                        </div>

                        <div className="mt-1 text-xs text-muted-foreground">
                          {formatPayment(student.payment_amount)}
                        </div>
                      </div>
                    </td>
                  )}

                  {visibleColumns.includes('note') && (
                    <td className="max-w-[280px] px-4 py-3">
                      {student.response_note ? (
                        <span className="text-sm text-muted-foreground">
                          {student.response_note}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          لا توجد ملاحظة
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
