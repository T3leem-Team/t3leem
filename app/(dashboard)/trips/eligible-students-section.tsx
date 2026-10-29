
'use client'

import {
  Check,
  CheckSquare,
  Loader2,
  Search,
  Send,
  Users,
  ChevronDown,
  RotateCcw,
  Wallet,
  GraduationCap,
  CalendarCheck,
} from 'lucide-react'

import type {
  Level,
  ResponseSource,
  ResponseStatus,
  Student,
  Trip,
} from './trip-types'

type Props = {
  trip: Trip
  levels: Level[]
  eligibleStudents: Student[]
  filteredStudents: Student[]
  selectedIds: string[]
  selectedCount: number

  search: string
  onSearchChange: (value: string) => void
  levelFilter: string
  onLevelFilterChange: (value: string) => void
  showEligibleOnly: boolean
  onShowEligibleOnlyChange: (value: boolean) => void

  canEdit: boolean
  canEditParticipantData: boolean
  saving: boolean
  publishing: boolean
  settingsLoading: boolean
  directPublishAllowed: boolean

  responseSavingId: string | null
  paymentSavingId: string | null
  paymentInputs: Record<string, string>
  onPaymentInputChange: (
    studentId: string,
    value: string,
  ) => void

  onToggleStudent: (studentId: string) => void
  onSelectAllVisible: () => void
  onClearVisibleSelection: () => void
  onSaveStudents: () => void
  onSavePayment: (student: Student) => void
  onSaveResponse: (
    student: Student,
    value: ResponseStatus,
  ) => void
  onPublishTrip: () => void

  getAttendanceClass: (value: number) => string
  getResponseSourceLabel: (source: ResponseSource) => string
  getResponseSourceClass: (source: ResponseSource) => string
  formatDateTime: (value: string | null) => string
  formatPayment: (value: number) => string
}

export function EligibleStudentsSection({
  trip,
  levels,
  eligibleStudents,
  filteredStudents,
  selectedIds,
  selectedCount,
  search,
  onSearchChange,
  levelFilter,
  onLevelFilterChange,
  showEligibleOnly,
  onShowEligibleOnlyChange,
  canEdit,
  canEditParticipantData,
  saving,
  publishing,
  settingsLoading,
  directPublishAllowed,
  responseSavingId,
  paymentSavingId,
  paymentInputs,
  onPaymentInputChange,
  onToggleStudent,
  onSelectAllVisible,
  onClearVisibleSelection,
  onSaveStudents,
  onSavePayment,
  onSaveResponse,
  onPublishTrip,
  getAttendanceClass,
  getResponseSourceLabel,
  getResponseSourceClass,
  formatDateTime,
  formatPayment,
}: Props) {
  const visibleEligibleCount = filteredStudents.filter(
    (student) => student.eligible,
  ).length

  const allVisibleSelected =
    visibleEligibleCount > 0 &&
    filteredStudents
      .filter((student) => student.eligible)
      .every((student) => selectedIds.includes(student.id))

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/30 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
      {/* Section heading */}
      <div className="border-b border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-800/30">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
              <Users className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                الطلاب المؤهلون
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                حدد الطلاب الذين تريد إضافتهم إلى الرحلة.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:min-w-[300px]">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <GraduationCap className="h-4 w-4" />
              </div>

              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  الطلاب المؤهلون
                </p>
                <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-800 dark:text-slate-100">
                  {eligibleStudents.length}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-3 dark:border-blue-900/60 dark:bg-blue-950/30">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                <CheckSquare className="h-4 w-4" />
              </div>

              <div>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  الطلاب المحددون
                </p>
                <p className="mt-0.5 text-lg font-bold tabular-nums text-blue-900 dark:text-blue-100">
                  {selectedCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and filters */}
      <div className="border-b border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={search}
              onChange={(event) =>
                onSearchChange(event.target.value)
              }
              placeholder="بحث بالاسم أو الرقم الشخصي أو الهاتف..."
              aria-label="البحث عن طالب"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pr-10 pl-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-800 dark:focus:ring-blue-950"
            />
          </div>

          <div className="relative">
            <select
              value={levelFilter}
              onChange={(event) =>
                onLevelFilterChange(event.target.value)
              }
              aria-label="تصفية حسب المستوى"
              className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pl-9 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-blue-800 dark:focus:ring-blue-950"
            >
              <option value="all">كل المستويات</option>

              {levels.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.name}
                </option>
              ))}
            </select>

            <ChevronDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>

          <label className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/70 px-3 text-sm text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:bg-slate-800">
            <input
              type="checkbox"
              checked={showEligibleOnly}
              onChange={(event) =>
                onShowEligibleOnlyChange(event.target.checked)
              }
              className="h-4 w-4 rounded border-slate-300 accent-blue-600 focus:ring-blue-500"
            />
            عرض المؤهلين فقط
          </label>
        </div>

        {/* Selection controls */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onSelectAllVisible}
            disabled={!canEdit || visibleEligibleCount === 0}
            className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-50 ${
              allVisibleSelected
                ? 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <CheckSquare className="h-4 w-4" />
            تحديد الظاهر
          </button>

          <button
            type="button"
            onClick={onClearVisibleSelection}
            disabled={!canEdit || filteredStudents.length === 0}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/30 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RotateCcw className="h-4 w-4" />
            إلغاء تحديد الظاهر
          </button>

          <span className="mr-auto text-xs text-slate-500 dark:text-slate-400">
            النتائج المعروضة: {filteredStudents.length}
          </span>
        </div>
      </div>

      {/* Students table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1150px] border-collapse text-right text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-300">
              <th className="w-14 px-4 py-3.5 text-center text-xs font-semibold">
                #
              </th>

              <th className="px-4 py-3.5 text-xs font-semibold">
                الطالب
              </th>

              <th className="px-4 py-3.5 text-xs font-semibold">
                المستوى
              </th>

              <th className="px-4 py-3.5 text-xs font-semibold">
                الحضور
              </th>

              <th className="px-4 py-3.5 text-xs font-semibold">
                ملاحظات الدورة
              </th>

              <th className="px-4 py-3.5 text-xs font-semibold">
                الرد
              </th>

              <th className="px-4 py-3.5 text-xs font-semibold">
                الدفع
              </th>

              <th className="w-20 px-4 py-3.5 text-center text-xs font-semibold">
                اختيار
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center">
                  <div className="mx-auto flex max-w-xs flex-col items-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                      <Search className="h-5 w-5" />
                    </div>

                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      لا يوجد طلاب مطابقون
                    </p>

                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      جرّب تغيير البحث أو المستوى أو شروط العرض.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredStudents.map((student, index) => {
                const isSelected = selectedIds.includes(student.id)
                const isResponseSaving =
                  responseSavingId === student.id
                const isPaymentSaving =
                  paymentSavingId === student.id

                return (
                  <tr
                    key={student.id}
                    className={`transition-colors ${
                      isSelected
                        ? 'bg-blue-50/60 hover:bg-blue-50 dark:bg-blue-950/20 dark:hover:bg-blue-950/30'
                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-slate-100 px-1.5 text-xs font-medium tabular-nums text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {index + 1}
                      </span>
                    </td>

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

                    <td className="px-4 py-4">
                      <span className="inline-flex rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {student.level?.name || 'غير محدد'}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <div
                        className={`font-semibold tabular-nums ${
                          student.attendance_percentage === null
                            ? 'text-slate-400 dark:text-slate-500'
                            : getAttendanceClass(
                                student.attendance_percentage,
                              )
                        }`}
                      >
                        {student.attendance_percentage === null
                          ? 'لا توجد بيانات'
                          : `${student.attendance_percentage.toFixed(1)}%`}
                      </div>

                      <div className="mt-1.5 whitespace-nowrap text-xs leading-5 text-slate-500 dark:text-slate-400">
                        حاضر {student.attendance_present}
                        {' · '}غائب {student.attendance_absent}
                        {' · '}متأخر {student.attendance_late}
                        {' · '}مستأذن {student.attendance_excused}
                      </div>
                    </td>

                    <td className="max-w-[260px] px-4 py-4">
                      {student.course_notes.length > 0 ? (
                        <div className="space-y-1.5">
                          {student.course_notes.slice(0, 2).map(
                            (note, noteIndex) => (
                              <div
                                key={`${student.id}-${noteIndex}`}
                                className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2 text-xs leading-5 text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300"
                              >
                                {note.note}
                              </div>
                            ),
                          )}

                          {student.course_notes.length > 2 && (
                            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              +{student.course_notes.length - 2} ملاحظات أخرى
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          لا توجد ملاحظات
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <select
                        value={student.response}
                        disabled={
                          !canEditParticipantData || isResponseSaving
                        }
                        onChange={(event) =>
                          onSaveResponse(
                            student,
                            event.target.value as ResponseStatus,
                          )
                        }
                        aria-label={`رد ${student.name}`}
                        className={`h-9 max-w-[150px] rounded-lg border px-2.5 text-xs font-medium outline-none transition focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-blue-950 ${
                          student.response === 'accepted'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : student.response === 'rejected'
                              ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-300'
                              : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        <option value="pending">بانتظار الرد</option>
                        <option value="accepted">موافق</option>
                        <option value="rejected">رافض</option>
                      </select>

                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${getResponseSourceClass(
                            student.response_source,
                          )}`}
                        >
                          {getResponseSourceLabel(student.response_source)}
                        </span>

                        {isResponseSaving && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600 dark:text-blue-400" />
                        )}
                      </div>

                      {student.responded_at && (
                        <div className="mt-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                          {formatDateTime(student.responded_at)}
                        </div>
                      )}

                      {student.response_note && (
                        <div className="mt-1.5 max-w-[180px] truncate text-xs text-slate-500 dark:text-slate-400">
                          {student.response_note}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex min-w-[150px] items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={paymentInputs[student.id] ?? ''}
                          disabled={!canEditParticipantData || isPaymentSaving}
                          onChange={(event) =>
                            onPaymentInputChange(
                              student.id,
                              event.target.value,
                            )
                          }
                          placeholder="0.000"
                          aria-label={`مبلغ الدفع للطالب ${student.name}`}
                          className="payment-input-no-arrows h-9 w-24 rounded-lg border border-slate-200 bg-white px-2.5 text-left text-sm tabular-nums text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-800 dark:focus:ring-blue-950 dark:disabled:bg-slate-800"
                        />

                        <button
                          type="button"
                          onClick={() => onSavePayment(student)}
                          disabled={
                            !canEditParticipantData || isPaymentSaving
                          }
                          aria-label={`حفظ مبلغ ${student.name}`}
                          className="inline-flex h-9 min-w-10 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-900 dark:hover:bg-blue-950/40 dark:hover:text-blue-200"
                        >
                          {isPaymentSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Wallet className="h-3.5 w-3.5" />
                              حفظ
                            </>
                          )}
                        </button>
                      </div>

                      <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                        المحفوظ:{' '}
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {formatPayment(student.payment_amount)}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-center">
                      {student.eligible ? (
                        <button
                          type="button"
                          onClick={() => onToggleStudent(student.id)}
                          disabled={!canEdit}
                          aria-label={
                            isSelected
                              ? 'إلغاء اختيار الطالب'
                              : 'اختيار الطالب'
                          }
                          aria-pressed={isSelected}
                          className={`mx-auto flex h-7 w-7 items-center justify-center rounded-lg border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-50 ${
                            isSelected
                              ? 'border-blue-600 bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                              : 'border-slate-300 bg-white text-transparent hover:border-blue-300 hover:bg-blue-50 dark:border-slate-600 dark:bg-slate-900 dark:hover:border-blue-800 dark:hover:bg-blue-950/30'
                          }`}
                        >
                          {isSelected && <Check className="h-4 w-4" />}
                        </button>
                      ) : (
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                          غير مؤهل
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Selection summary and save */}
      <div className="border-t border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/30">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
              <CalendarCheck className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                ملخص التحديد
              </p>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                تم تحديد{' '}
                <strong className="text-blue-700 dark:text-blue-300">
                  {selectedCount}
                </strong>{' '}
                طالب من أصل{' '}
                <strong className="text-slate-700 dark:text-slate-200">
                  {eligibleStudents.length}
                </strong>{' '}
                طالب مؤهل.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onSaveStudents}
            disabled={!canEdit || saving}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جارٍ الحفظ...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                حفظ الطلاب
              </>
            )}
          </button>
        </div>

        {/* Publish trip */}
        {trip.status === 'draft' && (
          <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
            <div className="flex flex-col gap-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                  <Send className="h-4 w-4" />
                </div>

                <div>
                  <p className="font-semibold text-emerald-950 dark:text-emerald-100">
                    نشر الرحلة
                  </p>

                  <p className="mt-1 text-sm leading-6 text-emerald-800/80 dark:text-emerald-200/80">
                    بعد النشر ستظهر الرحلة للطلاب المحددين في صفحة حالة الطالب.
                  </p>

                  {!settingsLoading && !directPublishAllowed && (
                    <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-400">
                      النشر المباشر موقوف من إعدادات النظام.
                    </p>
                  )}

                  {!settingsLoading && directPublishAllowed && selectedCount === 0 && (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      حدد طالبًا واحدًا على الأقل لتتمكن من نشر الرحلة.
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={onPublishTrip}
                disabled={
                  !canEdit ||
                  settingsLoading ||
                  !directPublishAllowed ||
                  publishing ||
                  selectedCount === 0
                }
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {publishing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جارٍ النشر...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    نشر الرحلة
                  </>
                )}
              </button>
            </div>
          </div>
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
    </section>
  )
}
