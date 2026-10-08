'use client'

import type {
  Dispatch,
  RefObject,
  SetStateAction,
} from 'react'

import type {
  AttendanceNotes,
  AttendanceRecord,
  AttendanceStatus,
  AttendanceStatusName,
  Course,
  Student,
  TeacherAttendanceStatus,
} from '@/components/sections/teacher-attendance'

import {
  attendanceStatusNames,
  formatDateForDisplay,
  getPercentageClass,
  getStatusClasses,
} from '@/components/sections/teacher-attendance'

type AttendanceSummary = {
  total: number
  recorded: number
  unrecorded: number
  allRecorded: boolean
}

type DateState =
  | 'no-course'
  | 'before-course'
  | 'after-course'
  | 'no-lesson'
  | 'cancelled'
  | 'future-lesson'
  | 'valid'

type TeacherAttendanceViewProps = {
  currentCourse: Course
  activeDate: string
  dateState: DateState
  isAttendanceAvailable: boolean
  isCheckingCancellation: boolean

  attendanceSummary: AttendanceSummary

  assignedStudents: Student[]
  displayedStudents: Student[]

  attendanceStatuses: AttendanceStatus[]
  attendanceNotes: AttendanceNotes

  attendancePercentages: Record<string, number>

  statusMessage: string

  searchTerm: string
  setSearchTerm: Dispatch<SetStateAction<string>>

  showUnrecordedOnly: boolean
  setShowUnrecordedOnly: Dispatch<SetStateAction<boolean>>

  showBulkStatusMenu: boolean
  setShowBulkStatusMenu: Dispatch<SetStateAction<boolean>>

  isBulkSaving: boolean
  savingKey: string | null
  savingNoteKey: string | null

  editingStatusKey: string | null
  setEditingStatusKey: Dispatch<SetStateAction<string | null>>

  setAttendanceNotes: Dispatch<SetStateAction<AttendanceNotes>>

  setSelectedAttendanceDate: Dispatch<SetStateAction<string | null>>

  setStatusMessage: Dispatch<SetStateAction<string>>

  saveAttendance: (
    student: Student,
    date: string,
    statusName: TeacherAttendanceStatus,
  ) => Promise<void>

  saveAllAttendance: (
    statusName: TeacherAttendanceStatus,
  ) => Promise<void>

  clearAttendance: (
    student: Student,
    date: string,
  ) => Promise<void>

  saveNote: (
    student: Student,
    date: string,
    value: string,
  ) => Promise<void>

  getRecordForStudent: (
    studentId: string,
    date: string,
  ) => AttendanceRecord | undefined

  getStudentStatus: (
    studentId: string,
    date: string,
  ) => AttendanceStatusName | null

  studentCardRefs: RefObject<
    Record<string, HTMLDivElement | null>
  >
}

export function TeacherAttendanceView({
  currentCourse,
  activeDate,
  dateState,
  isAttendanceAvailable,
  isCheckingCancellation,
  attendanceSummary,
  assignedStudents,
  displayedStudents,
  attendanceStatuses,
  attendanceNotes,
  attendancePercentages,
  statusMessage,
  searchTerm,
  setSearchTerm,
  showUnrecordedOnly,
  setShowUnrecordedOnly,
  showBulkStatusMenu,
  setShowBulkStatusMenu,
  isBulkSaving,
  savingKey,
  savingNoteKey,
  editingStatusKey,
  setEditingStatusKey,
  setAttendanceNotes,
  setSelectedAttendanceDate,
  setStatusMessage,
  saveAttendance,
  saveAllAttendance,
  clearAttendance,
  saveNote,
  getRecordForStudent,
  getStudentStatus,
  studentCardRefs,
}: TeacherAttendanceViewProps) {
  return (
    <div
      dir="rtl"
      className="flex min-h-0 w-full flex-col"
    >
      {/* الرأس */}
      <div className="shrink-0 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-bold">
            الحضور والغياب
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            {currentCourse.name}
          </p>
        </div>

        <input
          type="date"
          value={activeDate}
          onChange={(event) => {
            const nextDate = event.target.value

            setSelectedAttendanceDate(
              nextDate || null,
            )

            setEditingStatusKey(null)
            setShowUnrecordedOnly(false)
            setShowBulkStatusMenu(false)
            setStatusMessage('')
          }}
          className="h-10 w-full shrink-0 rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-auto"
        />
      </div>

      {/* رسائل حالة التاريخ */}
      {isCheckingCancellation && (
        <div className="mt-4 shrink-0 rounded-xl border border-dashed bg-muted/30 p-8 text-center">
          <h3 className="text-lg font-semibold">
            جارٍ التحقق من حالة اليوم
          </h3>

          <p className="mt-2 text-sm text-muted-foreground">
            يتم التحقق مما إذا كان اليوم أو الحصة ملغاة.
          </p>
        </div>
      )}

      {dateState === 'before-course' && (
        <div className="mt-4 shrink-0 rounded-xl border border-dashed bg-muted/30 p-8 text-center">
          <h3 className="text-lg font-semibold">
            الدورة لم تبدأ بعد
          </h3>

          <p className="mt-2 text-sm text-muted-foreground">
            التاريخ المحدد:{' '}
            {formatDateForDisplay(activeDate)}
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            تبدأ الدورة في{' '}
            {formatDateForDisplay(
              currentCourse.startDate,
            )}
          </p>
        </div>
      )}

      {dateState === 'after-course' && (
        <div className="mt-4 shrink-0 rounded-xl border border-dashed bg-muted/30 p-8 text-center">
          <h3 className="text-lg font-semibold">
            انتهت الدورة
          </h3>

          <p className="mt-2 text-sm text-muted-foreground">
            التاريخ المحدد:{' '}
            {formatDateForDisplay(activeDate)}
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            انتهت الدورة في{' '}
            {formatDateForDisplay(
              currentCourse.endDate,
            )}
          </p>
        </div>
      )}

      {dateState === 'no-lesson' && (
        <div className="mt-4 shrink-0 rounded-xl border border-dashed bg-muted/30 p-8 text-center">
          <h3 className="text-lg font-semibold">
            لا يوجد درس في هذا اليوم
          </h3>

          <p className="mt-2 text-sm text-muted-foreground">
            التاريخ المحدد:{' '}
            {formatDateForDisplay(activeDate)}
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            هذا اليوم ليس من أيام الدراسة المحددة للدورة.
          </p>
        </div>
      )}

      {dateState === 'cancelled' && (
        <div className="mt-4 shrink-0 rounded-xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/50 dark:bg-red-950/20">
          <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">
            اليوم أو الحصة ملغاة
          </h3>

          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            التاريخ المحدد:{' '}
            {formatDateForDisplay(activeDate)}
          </p>

          <p className="mt-1 text-xs text-red-600/80 dark:text-red-400/80">
            تم إلغاء هذا اليوم أو الحصة من الإشراف، لذلك لا يمكن تسجيل أو تعديل الحضور فيه.
          </p>
        </div>
      )}

      {dateState === 'future-lesson' && (
        <div className="mt-4 shrink-0 rounded-xl border border-dashed bg-muted/30 p-8 text-center">
          <h3 className="text-lg font-semibold">
            الدرس لم يبدأ بعد
          </h3>

          <p className="mt-2 text-sm text-muted-foreground">
            التاريخ المحدد:{' '}
            {formatDateForDisplay(activeDate)}
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            يمكنك الرجوع إلى الأيام السابقة لمشاهدة أرشيف الحضور.
          </p>
        </div>
      )}

      {isAttendanceAvailable && (
        <div className="min-h-0 w-full pt-4">
          <div className="flex min-h-0 w-full flex-col">
            {/* كل ما فوق قائمة الطلاب ثابت */}
            <div className="shrink-0 space-y-4">
              {/* حالة التسجيل */}
              <div
                className={`rounded-xl border px-4 py-3 ${
                  attendanceSummary.allRecorded
                    ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-900/50 dark:bg-green-950/20 dark:text-green-300'
                    : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300'
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 text-lg">
                      {attendanceSummary.allRecorded
                        ? '✓'
                        : '!'}
                    </span>

                    <div className="min-w-0">
                      <div className="text-sm font-semibold">
                        {attendanceSummary.allRecorded
                          ? `تم تسجيل حالة جميع الطلاب (${attendanceSummary.recorded}/${attendanceSummary.total})`
                          : `لم يكتمل التسجيل — باقي ${attendanceSummary.unrecorded} من ${attendanceSummary.total}`}
                      </div>

                      {!attendanceSummary.allRecorded && (
                        <div className="mt-0.5 text-xs opacity-80">
                          المسجل:{' '}
                          {attendanceSummary.recorded} من{' '}
                          {attendanceSummary.total}
                        </div>
                      )}
                    </div>
                  </div>

                  {!attendanceSummary.allRecorded && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowUnrecordedOnly(true)
                        setShowBulkStatusMenu(false)
                      }}
                      className="w-full shrink-0 rounded-lg border border-red-300 bg-background px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40 sm:w-auto"
                    >
                      إكمال غير المسجلين
                    </button>
                  )}
                </div>
              </div>

              {/* البحث والتحكم */}
              <div className="rounded-xl border bg-card p-3">
                <div className="flex flex-col gap-3">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(event) =>
                      setSearchTerm(event.target.value)
                    }
                    placeholder="بحث عن طالب..."
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-2">
                      <div className="relative">
                        <button
                          type="button"
                          disabled={
                            isBulkSaving ||
                            assignedStudents.length === 0
                          }
                          onClick={() =>
                            setShowBulkStatusMenu(
                              (current) => !current,
                            )
                          }
                          className="h-10 rounded-lg border bg-background px-4 text-sm font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isBulkSaving
                            ? 'جارٍ تسجيل الكل...'
                            : 'تحديد الكل'}
                        </button>

                        {showBulkStatusMenu && (
                          <div className="absolute right-0 top-12 z-20 min-w-[180px] rounded-xl border bg-background p-2 shadow-lg">
                            <div className="px-2 pb-2 text-xs font-medium text-muted-foreground">
                              اختر الحالة للجميع
                            </div>

                            <div className="space-y-1">
                              {attendanceStatusNames.map(
                                (statusName) => {
                                  const styles =
                                    getStatusClasses(
                                      statusName,
                                    )

                                  return (
                                    <button
                                      key={statusName}
                                      type="button"
                                      disabled={isBulkSaving}
                                      onClick={() =>
                                        void saveAllAttendance(
                                          statusName,
                                        )
                                      }
                                      className={`w-full rounded-lg border px-3 py-2 text-sm font-medium transition ${styles.normal}`}
                                    >
                                      {statusName}
                                    </button>
                                  )
                                },
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {!attendanceSummary.allRecorded &&
                        !showUnrecordedOnly && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowUnrecordedOnly(true)
                              setShowBulkStatusMenu(false)
                            }}
                            className="h-10 rounded-lg border border-red-300 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-800 dark:bg-red-950/20 dark:text-red-300"
                          >
                            إكمال غير المسجلين (
                            {attendanceSummary.unrecorded})
                          </button>
                        )}

                      {showUnrecordedOnly && (
                        <button
                          type="button"
                          onClick={() =>
                            setShowUnrecordedOnly(false)
                          }
                          className="h-10 rounded-lg border bg-background px-4 py-2 text-sm font-semibold transition hover:bg-muted"
                        >
                          عرض جميع الطلاب
                        </button>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {showUnrecordedOnly
                        ? `عرض غير المسجلين فقط: ${displayedStudents.length}`
                        : `إجمالي الطلاب: ${assignedStudents.length}`}
                    </div>
                  </div>
                </div>
              </div>

              {/* رسالة الحالة */}
              {statusMessage && (
                <div
                  className={`rounded-lg border px-4 py-3 text-sm ${
                    statusMessage.startsWith('✓')
                      ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-900/50 dark:bg-green-950/20 dark:text-green-300'
                      : statusMessage.includes('تعذر') ||
                          statusMessage.includes('ملغي') ||
                          statusMessage.includes('لا يمكن')
                        ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300'
                        : 'border-border bg-muted/40'
                  }`}
                >
                  {statusMessage}
                </div>
              )}
            </div>

            {/* قائمة الطلبة — بدون Scroll داخلي */}
            <div className="min-w-0 space-y-4 py-4 pl-1 pr-1">
              {displayedStudents.length === 0 ? (
                <div
                  className={`rounded-xl border border-dashed p-10 text-center text-sm ${
                    showUnrecordedOnly
                      ? 'border-green-300 bg-green-50 text-green-700 dark:border-green-900/50 dark:bg-green-950/20 dark:text-green-300'
                      : 'text-muted-foreground'
                  }`}
                >
                  {showUnrecordedOnly
                    ? '✓ تم تسجيل حالة جميع الطلاب.'
                    : 'لا يوجد طلبة.'}
                </div>
              ) : (
                displayedStudents.map((student) => {
                  const key = `${activeDate}:${student.id}`

                  const record =
                    getRecordForStudent(
                      student.id,
                      activeDate,
                    )

                  const status =
                    getStudentStatus(
                      student.id,
                      activeDate,
                    )

                  const note =
                    attendanceNotes[key] ??
                    record?.note ??
                    ''

                  const percentage =
                    attendancePercentages[student.id] ?? 0

                  const saving =
                    savingKey === key ||
                    isBulkSaving

                  const savingNote =
                    savingNoteKey === key

                  const editing =
                    editingStatusKey === key

                  if (status === 'غير منضم') {
                    const selectedStyles =
                      getStatusClasses(status)

                    return (
                      <div
                        key={student.id}
                        ref={(element) => {
                          studentCardRefs.current[
                            student.id
                          ] = element
                        }}
                        className={`rounded-xl border bg-card px-4 py-4 transition-all ${
                          saving ? 'opacity-70' : ''
                        }`}
                      >
                        <div className="space-y-4">
                          <div className="flex w-full flex-col gap-3 xl:flex-row xl:items-center">
                            <div className="min-w-0 xl:flex-1">
                              <div className="font-semibold">
                                {student.name}
                              </div>

                              {student.levelName && (
                                <div className="mt-0.5 text-xs text-muted-foreground">
                                  {student.levelName}
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              disabled
                              className={`h-10 shrink-0 cursor-not-allowed rounded-lg border px-5 text-sm font-medium opacity-90 ${selectedStyles.selected}`}
                            >
                              غير منضم
                            </button>

                            <div className="flex h-10 shrink-0 items-center justify-center rounded-lg bg-muted/50 px-5">
                              <span className="text-sm font-bold text-muted-foreground">
                                —
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className="mb-2 block text-xs font-medium text-muted-foreground">
                              ملاحظات المعلم
                            </label>

                            <textarea
                              value={note}
                              onChange={(event) =>
                                setAttendanceNotes(
                                  (current) => ({
                                    ...current,
                                    [key]:
                                      event.target.value,
                                  }),
                                )
                              }
                              onBlur={(event) =>
                                void saveNote(
                                  student,
                                  activeDate,
                                  event.target.value,
                                )
                              }
                              placeholder="اكتب ملاحظة أو تعليق عن الطالب..."
                              rows={3}
                              className="w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                            />

                            <div className="mt-1 flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                اضغط خارج الخانة لحفظ الملاحظة
                              </span>

                              {savingNote && (
                                <span className="text-xs text-muted-foreground">
                                  جارٍ الحفظ...
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  }

                  if (!status || editing) {
                    return (
                      <div
                        key={student.id}
                        ref={(element) => {
                          studentCardRefs.current[
                            student.id
                          ] = element
                        }}
                        className={`rounded-xl border bg-card p-4 transition-all ${
                          saving ? 'opacity-70' : ''
                        }`}
                      >
                        <div className="space-y-4">
                          <div>
                            <div className="font-semibold">
                              {student.name}
                            </div>

                            {student.levelName && (
                              <div className="mt-0.5 text-xs text-muted-foreground">
                                {student.levelName}
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="mb-2 text-xs font-medium text-muted-foreground">
                              حالة الحضور
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              {attendanceStatusNames.map(
                                (statusName) => {
                                  const styles =
                                    getStatusClasses(
                                      statusName,
                                    )

                                  const isSelected =
                                    status ===
                                    statusName

                                  return (
                                    <button
                                      key={statusName}
                                      type="button"
                                      disabled={saving}
                                      onClick={() => {
                                        if (
                                          isSelected &&
                                          status
                                        ) {
                                          void clearAttendance(
                                            student,
                                            activeDate,
                                          )
                                          return
                                        }

                                        void saveAttendance(
                                          student,
                                          activeDate,
                                          statusName,
                                        )
                                      }}
                                      className={`min-h-12 rounded-xl border px-3 py-3 text-sm font-semibold transition active:scale-[0.98] ${
                                        isSelected
                                          ? styles.selected
                                          : styles.normal
                                      } ${
                                        saving
                                          ? 'cursor-not-allowed opacity-50'
                                          : ''
                                      }`}
                                    >
                                      {statusName}
                                    </button>
                                  )
                                },
                              )}
                            </div>
                          </div>

                          <div>
                            <label className="mb-2 block text-xs font-medium text-muted-foreground">
                              ملاحظات المعلم
                            </label>

                            <textarea
                              value={note}
                              onChange={(event) =>
                                setAttendanceNotes(
                                  (current) => ({
                                    ...current,
                                    [key]:
                                      event.target.value,
                                  }),
                                )
                              }
                              placeholder="اكتب ملاحظة عن الطالب..."
                              rows={3}
                              className="w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                            />

                            <p className="mt-1 text-xs text-muted-foreground">
                              سيتم حفظ الملاحظة عند اختيار حالة الحضور.
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  }

                  const selectedStyles =
                    getStatusClasses(status)

                  return (
                    <div
                      key={student.id}
                      ref={(element) => {
                        studentCardRefs.current[
                          student.id
                        ] = element
                      }}
                      className={`rounded-xl border bg-card px-4 py-4 transition-all ${
                        saving ? 'opacity-70' : ''
                      }`}
                    >
                      <div className="space-y-4">
                        <div className="flex w-full flex-col gap-3 xl:flex-row xl:items-center">
                          <div className="min-w-0 xl:flex-1">
                            <div className="font-semibold">
                              {student.name}
                            </div>

                            {student.levelName && (
                              <div className="mt-0.5 text-xs text-muted-foreground">
                                {student.levelName}
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            disabled={
                              saving ||
                              status === 'غير منضم'
                            }
                            onClick={() => {
                              if (
                                status === 'غير منضم'
                              ) {
                                return
                              }

                              setEditingStatusKey(key)
                            }}
                            className={`h-10 shrink-0 rounded-lg border px-5 text-sm font-medium transition ${selectedStyles.selected} ${
                              saving ||
                              status === 'غير منضم'
                                ? 'cursor-not-allowed opacity-50'
                                : 'cursor-pointer'
                            }`}
                          >
                            {status}
                          </button>

                          <div className="flex h-10 shrink-0 items-center justify-center rounded-lg bg-muted/50 px-5">
                            <span
                              className={`text-sm font-bold ${getPercentageClass(
                                percentage,
                              )}`}
                            >
                              {status === 'غير منضم'
                                ? '—'
                                : `${percentage}%`}
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="mb-2 block text-xs font-medium text-muted-foreground">
                            ملاحظات المعلم
                          </label>

                          <textarea
                            value={note}
                            onChange={(event) =>
                              setAttendanceNotes(
                                (current) => ({
                                  ...current,
                                  [key]:
                                    event.target.value,
                                }),
                              )
                            }
                            onBlur={(event) =>
                              void saveNote(
                                student,
                                activeDate,
                                event.target.value,
                              )
                            }
                            placeholder="اكتب ملاحظة أو تعليق عن الطالب..."
                            rows={3}
                            className="w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                          />

                          <div className="mt-1 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              اضغط خارج الخانة لحفظ الملاحظة
                            </span>

                            {savingNote && (
                              <span className="text-xs text-muted-foreground">
                                جارٍ الحفظ...
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      <p className="shrink-0 pt-2 text-xs text-muted-foreground">
        فترة الدورة:{' '}
        {formatDateForDisplay(
          currentCourse.startDate,
        )}{' '}
        —{' '}
        {formatDateForDisplay(
          currentCourse.endDate,
        )}
      </p>
    </div>
  )
}
