
'use client'

import { useEffect, useState } from 'react'
import {
  Search,
  Settings2,
  Save,
  Loader2,
  Check,
  AlertCircle,
  ChevronDown,
  Users,
  RotateCcw,
} from 'lucide-react'

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
  responseInputs: Record<string, ResponseStatus>
  paymentStatus: Record<string, 'saving' | 'saved' | 'error'>
  responseSavingId: string | null
  canEditParticipantData: boolean
  onPaymentChange: (student: ResultStudent, value: string) => void
  onResponseChange: (student: ResultStudent, value: ResponseStatus) => void
  onSaveStudent: (student: ResultStudent) => void | Promise<void>
  hasUnsavedChanges: (student: ResultStudent) => boolean
  savingStudentId: string | null
  saveStatus: Record<string, 'saved' | 'error'>
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
            RESULT_COLUMNS
              .filter((column) => column.defaultVisible)
              .map((column) => column.id),
          )
        }
      } else {
        setVisibleColumns(
          RESULT_COLUMNS
            .filter((column) => column.defaultVisible)
            .map((column) => column.id),
        )
      }
    } catch (error) {
      console.error('Load result column settings error:', error)

      setVisibleColumns(
        RESULT_COLUMNS
          .filter((column) => column.defaultVisible)
          .map((column) => column.id),
      )
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

  function resetColumns() {
    setVisibleColumns(
      RESULT_COLUMNS
        .filter((column) => column.defaultVisible)
        .map((column) => column.id),
    )
  }

  function getResponse(student: ResultStudent): ResponseStatus {
    return responseInputs[student.id] ?? student.response
  }

  const filteredStudents = students
    .filter((student) => {
      const currentResponse = getResponse(student)

      return responseFilter === 'all'
        ? true
        : currentResponse === responseFilter
    })
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
      return 'border border-sky-100 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300'
    }

    if (source === 'admin') {
      return 'border border-violet-100 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300'
    }

    return 'border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
  }

  function responseClass(response: ResponseStatus) {
    if (response === 'accepted') {
      return 'border-emerald-200 bg-emerald-50 text-emerald-800 focus:border-emerald-400 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300'
    }

    if (response === 'rejected') {
      return 'border-rose-200 bg-rose-50 text-rose-800 focus:border-rose-400 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-300'
    }

    return 'border-slate-200 bg-slate-50 text-slate-700 focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
  }

  const columnCount = visibleColumns.length + 2

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      {/* Search and filters */}
      <div className="border-b border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/30">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <Users className="h-4 w-4" />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                قائمة الطلاب
              </h3>

              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {filteredStudents.length} من أصل {students.length} طالب
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowColumnSettings((current) => !current)}
            aria-expanded={showColumnSettings}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Settings2 className="h-4 w-4" />
            تخصيص الأعمدة
            <ChevronDown
              className={`h-4 w-4 transition-transform ${
                showColumnSettings ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>

        {showColumnSettings && (
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  تخصيص أعمدة الجدول
                </p>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  اختياراتك محفوظة لكل رحلة، وعمود الطالب ثابت.
                </p>
              </div>

              <button
                type="button"
                onClick={resetColumns}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                استعادة الافتراضي
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {RESULT_COLUMNS.map((column) => (
                <label
                  key={column.id}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition ${
                    visibleColumns.includes(column.id)
                      ? 'border-blue-100 bg-blue-50/70 text-slate-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-slate-200'
                      : 'border-slate-100 bg-slate-50/50 text-slate-500 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-400'
                  } ${
                    column.id === 'student'
                      ? 'cursor-not-allowed opacity-80'
                      : 'hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={visibleColumns.includes(column.id)}
                    disabled={column.id === 'student'}
                    onChange={() => toggleColumn(column.id)}
                    className="h-4 w-4 rounded border-slate-300 accent-blue-600 focus:ring-blue-500"
                  />

                  <span>{column.label}</span>

                  {column.id === 'student' && (
                    <span className="mr-auto text-[10px] text-slate-400">
                      ثابت
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="بحث باسم الطالب أو الرقم الشخصي أو الهاتف..."
              aria-label="البحث في الطلاب"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pr-10 pl-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-800 dark:focus:ring-blue-950"
            />
          </div>

          <div className="relative">
            <select
              value={responseFilter}
              onChange={(event) =>
                onResponseFilterChange(
                  event.target.value as 'all' | ResponseStatus,
                )
              }
              aria-label="تصفية الطلاب حسب الرد"
              className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pl-9 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-blue-800 dark:focus:ring-blue-950"
            >
              <option value="all">جميع الردود</option>
              <option value="accepted">الموافقون فقط</option>
              <option value="rejected">الرافضون فقط</option>
              <option value="pending">الذين لم يردوا</option>
            </select>

            <ChevronDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Students table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] border-collapse text-right text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-300">
              <th className="w-14 px-4 py-3.5 text-center text-xs font-semibold">
                #
              </th>

              {visibleColumns.includes('student') && (
                <th className="px-4 py-3.5 text-xs font-semibold">الطالب</th>
              )}

              {visibleColumns.includes('level') && (
                <th className="px-4 py-3.5 text-xs font-semibold">المستوى</th>
              )}

              {visibleColumns.includes('phone') && (
                <th className="px-4 py-3.5 text-xs font-semibold">الهاتف</th>
              )}

              {visibleColumns.includes('response') && (
                <th className="px-4 py-3.5 text-xs font-semibold">الرد</th>
              )}

              {visibleColumns.includes('source') && (
                <th className="px-4 py-3.5 text-xs font-semibold">نوع الرد</th>
              )}

              {visibleColumns.includes('date') && (
                <th className="px-4 py-3.5 text-xs font-semibold">تاريخ الرد</th>
              )}

              {visibleColumns.includes('payment') && (
                <th className="px-4 py-3.5 text-xs font-semibold">الدفع</th>
              )}

              {visibleColumns.includes('note') && (
                <th className="px-4 py-3.5 text-xs font-semibold">الملاحظة</th>
              )}

              <th className="px-4 py-3.5 text-xs font-semibold">الإجراءات</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredStudents.length === 0 ? (
              <tr>
                <td
                  colSpan={columnCount}
                  className="px-4 py-16 text-center"
                >
                  <div className="mx-auto flex max-w-xs flex-col items-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                      <Search className="h-5 w-5" />
                    </div>

                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      لا توجد نتائج مطابقة
                    </p>

                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      جرّب تغيير كلمات البحث أو حالة الرد.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredStudents.map((student, index) => {
                const currentResponse = getResponse(student)
                const dirty = hasUnsavedChanges(student)

                const isSaving =
                  savingStudentId === student.id ||
                  paymentStatus[student.id] === 'saving'

                const status = saveStatus[student.id]

                return (
                  <tr
                    key={student.id}
                    className="group transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/30"
                  >
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-slate-100 px-1.5 text-xs font-medium tabular-nums text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {index + 1}
                      </span>
                    </td>

                    {visibleColumns.includes('student') && (
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-100">
                          {student.name}
                        </div>

                        {student.personal_id && (
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            الرقم الشخصي: {student.personal_id}
                          </div>
                        )}
                      </td>
                    )}

                    {visibleColumns.includes('level') && (
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {student.level?.name || 'غير محدد'}
                        </span>
                      </td>
                    )}

                    {visibleColumns.includes('phone') && (
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                        {student.phone || student.whatsapp || 'غير متوفر'}
                      </td>
                    )}

                    {visibleColumns.includes('response') && (
                      <td className="px-4 py-4">
                        <select
                          value={currentResponse}
                          disabled={
                            !canEditParticipantData ||
                            isSaving ||
                            responseSavingId === student.id
                          }
                          onChange={(event) =>
                            onResponseChange(
                              student,
                              event.target.value as ResponseStatus,
                            )
                          }
                          aria-label={`رد ${student.name}`}
                          className={`h-9 max-w-[150px] rounded-lg border px-2.5 text-xs font-medium outline-none transition focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-blue-950 ${responseClass(currentResponse)}`}
                        >
                          <option value="pending">بانتظار الرد</option>
                          <option value="accepted">موافق</option>
                          <option value="rejected">رافض</option>
                        </select>
                      </td>
                    )}

                    {visibleColumns.includes('source') && (
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${sourceClass(student.response_source)}`}
                        >
                          {sourceLabel(student.response_source)}
                        </span>
                      </td>
                    )}

                    {visibleColumns.includes('date') && (
                      <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500 dark:text-slate-400">
                        {formatDateTime(student.responded_at)}
                      </td>
                    )}

                    {visibleColumns.includes('payment') && (
                      <td className="px-4 py-4">
                        <div className="min-w-[120px]">
                          <input
                            type="number"
                            min="0"
                            step="0.001"
                            value={paymentInputs[student.id] ?? ''}
                            disabled={!canEditParticipantData || isSaving}
                            onChange={(event) =>
                              onPaymentChange(student, event.target.value)
                            }
                            placeholder="0.000"
                            aria-label={`مبلغ الدفع للطالب ${student.name}`}
                            className="payment-input-no-arrows h-9 w-28 rounded-lg border border-slate-200 bg-white px-2.5 text-left text-sm tabular-nums text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-800 dark:focus:ring-blue-950 dark:disabled:bg-slate-800"
                          />

                          <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                            المحفوظ:{' '}
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {formatPayment(student.payment_amount)}
                            </span>
                          </div>
                        </div>
                      </td>
                    )}

                    {visibleColumns.includes('note') && (
                      <td className="max-w-[280px] px-4 py-4">
                        {student.response_note ? (
                          <span className="whitespace-pre-wrap break-words text-sm text-slate-600 dark:text-slate-300">
                            {student.response_note}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            لا توجد ملاحظة
                          </span>
                        )}
                      </td>
                    )}

                    <td className="px-4 py-4">
                      <div className="flex min-w-[145px] flex-col items-start gap-2">
                        <button
                          type="button"
                          disabled={
                            !canEditParticipantData || !dirty || isSaving
                          }
                          onClick={() => void onSaveStudent(student)}
                          className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${
                            isSaving
                              ? 'bg-amber-500 text-white focus-visible:ring-amber-400'
                              : status === 'error'
                                ? 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-400'
                                : status === 'saved' && !dirty
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-400'
                                  : dirty
                                    ? 'bg-amber-500 text-white hover:bg-amber-600 focus-visible:ring-amber-400'
                                    : 'border border-slate-200 bg-slate-100 text-slate-500 shadow-none focus-visible:ring-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              جارٍ الحفظ
                            </>
                          ) : status === 'saved' && !dirty ? (
                            <>
                              <Check className="h-4 w-4" />
                              تم الحفظ
                            </>
                          ) : status === 'error' ? (
                            <>
                              <AlertCircle className="h-4 w-4" />
                              إعادة المحاولة
                            </>
                          ) : dirty ? (
                            <>
                              <Save className="h-4 w-4" />
                              حفظ التعديلات
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4" />
                              لا توجد تعديلات
                            </>
                          )}
                        </button>

                        {dirty && !isSaving && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            تعديلات غير محفوظة
                          </span>
                        )}

                        {!dirty && status === 'saved' && !isSaving && (
                          <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                            تم حفظ بيانات الطالب
                          </span>
                        )}

                        {status === 'error' && !isSaving && (
                          <span className="text-[11px] text-rose-600 dark:text-rose-400">
                            تعذّر الحفظ
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/30">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          عدد النتائج: {filteredStudents.length}
        </span>

        {filteredStudents.length !== students.length && (
          <button
            type="button"
            onClick={() => {
              onSearchChange('')
              onResponseFilterChange('all')
            }}
            className="text-xs font-medium text-blue-700 transition hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
          >
            مسح البحث والتصفية
          </button>
        )}
      </div>

      <style jsx>{`
        .payment-input-no-arrows::-webkit-outer-spin-button,
        .payment-input-no-arrows::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .payment-input-no-arrows {
          -moz-appearance: textfield;
          appearance: textfield;
        }
      `}</style>
    </div>
  )
}
