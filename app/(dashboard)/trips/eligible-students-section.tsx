
'use client'

import {
  Check,
  CheckSquare,
  Loader2,
  Search,
  Send,
  Users,
} from 'lucide-react'

import type {
  Level,
  ResponseSource,
  ResponseStatus,
  Student,
  Trip,
} from './trip-types'

type PaymentStatus = 'saving' | 'saved' | 'error'

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
  paymentStatus: Record<string, PaymentStatus>

  toggleStudent: (studentId: string) => void
  selectAllVisible: () => void
  clearVisibleSelection: () => void
  saveStudents: () => void
  savePayment: (student: Student) => void
  saveResponse: (
    student: Student,
    value: ResponseStatus,
  ) => void
  publishTrip: () => void

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
  setSearch,
  levelFilter,
  setLevelFilter,
  showEligibleOnly,
  setShowEligibleOnly,
  canEdit,
  canEditParticipantData,
  saving,
  publishing,
  settingsLoading,
  directPublishAllowed,
  responseSavingId,
  paymentSavingId,
  paymentInputs,
  setPaymentInputs,
  toggleStudent,
  selectAllVisible,
  clearVisibleSelection,
  saveStudents,
  savePayment,
  saveResponse,
  publishTrip,
  getAttendanceClass,
  getResponseSourceLabel,
  getResponseSourceClass,
  formatDateTime,
  formatPayment,
}: Props) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="border-b p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <h2 className="text-lg font-semibold">
                الطلاب المؤهلون
              </h2>
            </div>

            <p className="mt-1 text-sm text-muted-foreground">
              حدد الطلاب الذين تريد إضافتهم إلى الرحلة.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-lg bg-muted px-3 py-2 text-sm">
              المؤهلون: <strong>{eligibleStudents.length}</strong>
            </div>

            <div className="rounded-lg bg-muted px-3 py-2 text-sm">
              المحددون: <strong>{selectedCount}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b bg-muted/20 p-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[1fr_220px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="بحث بالاسم أو الرقم الشخصي أو الهاتف..."
              className="h-10 w-full rounded-lg border bg-background px-10 text-sm outline-none transition focus:border-primary"
            />
          </div>

          <select
            value={levelFilter}
            onChange={(event) => setLevelFilter(event.target.value)}
            className="h-10 rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-primary"
          >
            <option value="all">كل المستويات</option>

            {levels.map((level) => (
              <option key={level.id} value={level.id}>
                {level.name}
              </option>
            ))}
          </select>

          <label className="flex h-10 items-center gap-2 rounded-lg border bg-background px-3 text-sm">
            <input
              type="checkbox"
              checked={showEligibleOnly}
              onChange={(event) =>
                setShowEligibleOnly(event.target.checked)
              }
              className="h-4 w-4"
            />
            عرض المؤهلين فقط
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={selectAllVisible}
            disabled={
              !canEdit ||
              filteredStudents.filter((student) => student.eligible).length === 0
            }
            className="inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckSquare className="h-4 w-4" />
            تحديد الظاهر
          </button>

          <button
            type="button"
            onClick={clearVisibleSelection}
            disabled={!canEdit || filteredStudents.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            إلغاء تحديد الظاهر
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1150px] text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-right">
              <th className="w-12 px-4 py-3">#</th>
              <th className="px-4 py-3 font-medium">الطالب</th>
              <th className="px-4 py-3 font-medium">المستوى</th>
              <th className="px-4 py-3 font-medium">الحضور</th>
              <th className="px-4 py-3 font-medium">ملاحظات الدورة</th>
              <th className="px-4 py-3 font-medium">الرد</th>
              <th className="px-4 py-3 font-medium">الدفع</th>
              <th className="px-4 py-3 text-center font-medium">اختيار</th>
            </tr>
          </thead>

          <tbody>
            {filteredStudents.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  لا يوجد طلاب مطابقون للبحث أو شروط الرحلة.
                </td>
              </tr>
            ) : (
              filteredStudents.map((student, index) => {
                const isSelected = selectedIds.includes(student.id)

                return (
                  <tr
                    key={student.id}
                    className={`border-b last:border-0 ${
                      isSelected ? 'bg-primary/5' : 'hover:bg-muted/20'
                    }`}
                  >
                    <td className="px-4 py-3 text-muted-foreground">
                      {index + 1}
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium">{student.name}</div>

                      {student.personal_id && (
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {student.personal_id}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {student.level?.name || 'غير محدد'}
                    </td>

                    <td className="px-4 py-3">
                      <div
                        className={`font-semibold ${
                          student.attendance_percentage === null
                            ? 'text-muted-foreground'
                            : getAttendanceClass(student.attendance_percentage)
                        }`}
                      >
                        {student.attendance_percentage === null
                          ? 'لا توجد بيانات'
                          : `${student.attendance_percentage.toFixed(1)}%`}
                      </div>

                      <div className="mt-1 text-xs text-muted-foreground">
                        حاضر {student.attendance_present}
                        {' · '}غائب {student.attendance_absent}
                        {' · '}متأخر {student.attendance_late}
                        {' · '}مستأذن {student.attendance_excused}
                      </div>
                    </td>

                    <td className="max-w-[260px] px-4 py-3">
                      {student.course_notes.length > 0 ? (
                        <div className="space-y-1">
                          {student.course_notes.slice(0, 2).map(
                            (note, noteIndex) => (
                              <div
                                key={`${student.id}-${noteIndex}`}
                                className="rounded-md bg-muted/50 px-2 py-1 text-xs"
                              >
                                {note.note}
                              </div>
                            ),
                          )}

                          {student.course_notes.length > 2 && (
                            <div className="text-xs text-muted-foreground">
                              +{student.course_notes.length - 2} ملاحظات أخرى
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          لا توجد ملاحظات
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <select
                        value={student.response}
                        disabled={
                          !canEditParticipantData ||
                          responseSavingId === student.id
                        }
                        onChange={(event) =>
                          saveResponse(
                            student,
                            event.target.value as ResponseStatus,
                          )
                        }
                        className="h-9 rounded-lg border bg-background px-2 text-xs outline-none focus:border-primary"
                      >
                        <option value="pending">بانتظار الرد</option>
                        <option value="accepted">موافق</option>
                        <option value="rejected">رافض</option>
                      </select>

                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] ${getResponseSourceClass(
                            student.response_source,
                          )}`}
                        >
                          {getResponseSourceLabel(student.response_source)}
                        </span>

                        {student.responded_at && (
                          <span className="text-[10px] text-muted-foreground">
                            {formatDateTime(student.responded_at)}
                          </span>
                        )}
                      </div>

                      {student.response_note && (
                        <div className="mt-1 max-w-[180px] truncate text-xs text-muted-foreground">
                          {student.response_note}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex min-w-[150px] items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={paymentInputs[student.id] ?? ''}
                          disabled={!canEditParticipantData}
                          onChange={(event) =>
                            setPaymentInputs((current) => ({
                              ...current,
                              [student.id]: event.target.value,
                            }))
                          }
                          placeholder="0.000"
                          className="h-9 w-24 rounded-lg border bg-background px-2 text-left text-xs outline-none focus:border-primary"
                        />

                        <button
                          type="button"
                          onClick={() => savePayment(student)}
                          disabled={
                            !canEditParticipantData ||
                            paymentSavingId === student.id
                          }
                          className="inline-flex h-9 items-center justify-center rounded-lg border px-2 text-xs font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {paymentSavingId === student.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'حفظ'
                          )}
                        </button>
                      </div>

                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatPayment(student.payment_amount)}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-center">
                      {student.eligible ? (
                        <button
                          type="button"
                          onClick={() => toggleStudent(student.id)}
                          disabled={!canEdit}
                          aria-label={
                            isSelected
                              ? 'إلغاء اختيار الطالب'
                              : 'اختيار الطالب'
                          }
                          className={`mx-auto flex h-6 w-6 items-center justify-center rounded-md border transition ${
                            isSelected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'bg-background hover:bg-muted'
                          } ${
                            !canEdit
                              ? 'cursor-not-allowed opacity-50'
                              : ''
                          }`}
                        >
                          {isSelected && <Check className="h-4 w-4" />}
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
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

      <div className="flex flex-col gap-3 border-t bg-muted/20 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            تم تحديد{' '}
            <strong className="text-foreground">{selectedCount}</strong>{' '}
            طالب من أصل{' '}
            <strong className="text-foreground">
              {eligibleStudents.length}
            </strong>{' '}
            طالب مؤهل.
          </div>

          <button
            type="button"
            onClick={saveStudents}
            disabled={!canEdit || saving}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                حفظ الطلاب
              </>
            )}
          </button>
        </div>

        {trip.status === 'draft' && (
          <div className="border-t pt-4">
            <div className="flex flex-col gap-3 rounded-xl border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  <p className="font-semibold">نشر الرحلة</p>
                </div>

                <p className="mt-1 text-sm text-muted-foreground">
                  بعد النشر ستظهر الرحلة للطلاب المحددين في صفحة حالة الطالب.
                </p>

                {!settingsLoading && !directPublishAllowed && (
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                    النشر المباشر موقوف من إعدادات النظام.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={publishTrip}
                disabled={
                  !canEdit ||
                  settingsLoading ||
                  !directPublishAllowed ||
                  publishing ||
                  selectedCount === 0
                }
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {publishing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جاري النشر...
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
    </section>
  )
}
