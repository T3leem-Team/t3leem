
'use client'

import { useState } from 'react'

import {
  Archive,
  ArrowRight,
  Check,
  Download,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react'

import { EligibleStudentsSection } from './eligible-students-section'
import { TripResultsSection } from './trip-results-section'
import { useTripDetails } from './trip-details-hook'
import { exportTripStudents } from './trip-export'

import type {
  ResponseSource,
  ResponseStatus,
  Student,
  TripStatus,
} from './trip-types'

type ResultStudent = {
  id: string
  name: string
  personal_id: string | null
  phone: string | null
  whatsapp?: string | null
  level: {
    id: string
    name: string
    sort_order: number | null
  } | null
  response: ResponseStatus
  response_note: string | null
  response_source: ResponseSource
  responded_at: string | null
  payment_amount: number
}

function formatDate(value: string | null) {
  if (!value) return 'بدون تاريخ'

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('ar-BH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

function formatDateTime(value: string | null) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return new Intl.DateTimeFormat('ar-BH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Bahrain',
  }).format(date)
}

function formatTime(value: string | null) {
  if (!value) return null

  return value.slice(0, 5)
}

function formatFee(value: number) {
  return new Intl.NumberFormat('ar-BH', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value)
}

function getAttendanceClass(value: number) {
  if (value >= 90) {
    return 'text-emerald-600 dark:text-emerald-400'
  }

  if (value >= 75) {
    return 'text-amber-600 dark:text-amber-400'
  }

  return 'text-destructive'
}

function getStatusLabel(status: TripStatus) {
  switch (status) {
    case 'draft':
      return 'مسودة'

    case 'pending_approval':
      return 'بانتظار الموافقة'

    case 'published':
      return 'منشورة'

    case 'rejected':
      return 'مرفوضة'

    case 'closed':
      return 'مغلقة'

    default:
      return status
  }
}

function getResponseSourceLabel(source: ResponseSource) {
  switch (source) {
    case 'student':
      return 'من الرابط'

    case 'admin':
      return 'يدوي'

    default:
      return '—'
  }
}

function getResponseSourceClass(source: ResponseSource) {
  switch (source) {
    case 'student':
      return 'bg-blue-500/10 text-blue-700 dark:text-blue-400'

    case 'admin':
      return 'bg-purple-500/10 text-purple-700 dark:text-purple-400'

    default:
      return 'bg-muted text-muted-foreground'
  }
}

function formatPayment(value: number) {
  if (!value || value <= 0) {
    return 'غير مدفوع'
  }

  return `${formatFee(value)} د.ب`
}

function normalizePaymentInput(value: string | number) {
  const normalized = String(value).trim().replace(',', '.')

  if (normalized === '') return ''

  const amount = Number(normalized)

  if (!Number.isFinite(amount)) return normalized

  return String(Math.round(amount * 1000) / 1000)
}

function parsePaymentInput(value: string) {
  const normalized = value.trim().replace(',', '.')

  if (normalized === '') return 0

  return Number(normalized)
}

export function TripDetailsView({
  tripId,
}: {
  tripId: string
}) {
  const {
    data,
    setData,
    loading,
    refreshing,
    saving,
    publishing,
    setPublishing,
    closing,
    setClosing,
    paymentSavingId,
    setPaymentSavingId,
    responseSavingId,
    setResponseSavingId,
    directPublishAllowed,
    settingsLoading,
    error,
    setError,
    success,
    setSuccess,
    search,
    setSearch,
    levelFilter,
    setLevelFilter,
    showEligibleOnly,
    setShowEligibleOnly,
    selectedIds,
    showResults,
    setShowResults,
    responseFilter,
    setResponseFilter,
    paymentInputs,
    setPaymentInputs,
    paymentStatus,
    setPaymentStatus,
    paymentTimers,
    eligibleStudents,
    tripResults,
    resultStudents,
    totalPaid,
    filteredStudents,
    selectedCount,
    canEdit,
    canEditParticipantData,
    loadData,
    syncDetailsCache,
    toggleStudent,
    selectAllVisible,
    clearVisibleSelection,
    saveStudents,
  } = useTripDetails(tripId)

  // قيم الردود المؤقتة في جدول النتائج.
  // لا يتم حفظ الرد بمجرد تغييره.
  const [responseInputs, setResponseInputs] = useState<
    Record<string, ResponseStatus>
  >({})

  // حالة الحفظ الموحد لكل طالب.
  const [savingStudentId, setSavingStudentId] = useState<
    string | null
  >(null)

  const [saveStatus, setSaveStatus] = useState<
    Record<string, 'saved' | 'error'>
  >({})

  function clearPaymentTimer(studentId: string) {
    const existingTimer = paymentTimers.current[studentId]

    if (existingTimer) {
      clearTimeout(existingTimer)
      delete paymentTimers.current[studentId]
    }
  }

  function handlePaymentChange(
    student: Student,
    value: string,
  ) {
    // في جدول النتائج: تعديل مؤقت فقط، دون حفظ تلقائي.
    setPaymentInputs((current) => ({
      ...current,
      [student.id]: value,
    }))

    clearPaymentTimer(student.id)

    setPaymentStatus((current) => {
      const next = { ...current }
      delete next[student.id]
      return next
    })

    setSaveStatus((current) => {
      const next = { ...current }
      delete next[student.id]
      return next
    })
  }

  function handleResponseChange(
    student: ResultStudent,
    value: ResponseStatus,
  ) {
    // الرد يبقى مؤقتًا إلى أن يضغط المستخدم زر الحفظ.
    setResponseInputs((current) => ({
      ...current,
      [student.id]: value,
    }))

    setSaveStatus((current) => {
      const next = { ...current }
      delete next[student.id]
      return next
    })
  }

  function hasUnsavedChanges(student: ResultStudent) {
    const currentPayment =
      paymentInputs[student.id] ??
      normalizePaymentInput(student.payment_amount)

    const currentResponse =
      responseInputs[student.id] ?? student.response

    const parsedPayment = parsePaymentInput(currentPayment)

    const paymentChanged =
      !Number.isFinite(parsedPayment) ||
      parsedPayment < 0 ||
      Math.round(parsedPayment * 1000) / 1000 !==
        Math.round(Number(student.payment_amount || 0) * 1000) / 1000

    const responseChanged =
      currentResponse !== student.response

    return paymentChanged || responseChanged
  }

  async function saveParticipantUpdate(
    tableStudent: ResultStudent,
  ) {
    if (!canEditParticipantData) return

    if (savingStudentId === tableStudent.id) return

    const student = data?.students.find(
      (item) => item.id === tableStudent.id,
    )

    if (!student) {
      setError('تعذر العثور على بيانات الطالب.')
      return
    }

    const rawPayment =
      paymentInputs[student.id] ??
      normalizePaymentInput(student.payment_amount)

    const amount = parsePaymentInput(rawPayment)

    if (
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      setSaveStatus((current) => ({
        ...current,
        [student.id]: 'error',
      }))

      setError(
        'مبلغ الدفع يجب أن يكون رقمًا صحيحًا أو عشريًا ولا يمكن أن يكون سالبًا.',
      )
      return
    }

    const roundedAmount =
      Math.round(amount * 1000) / 1000

    const responseValue =
      responseInputs[student.id] ?? student.response

    if (
      responseValue !== 'pending' &&
      responseValue !== 'accepted' &&
      responseValue !== 'rejected'
    ) {
      setSaveStatus((current) => ({
        ...current,
        [student.id]: 'error',
      }))

      setError('قيمة رد الطالب غير صحيحة.')
      return
    }

    // لا نرسل طلبًا إذا لم تتغير أي قيمة.
    if (
      roundedAmount ===
        Math.round(Number(student.payment_amount || 0) * 1000) / 1000 &&
      responseValue === student.response
    ) {
      setSaveStatus((current) => ({
        ...current,
        [student.id]: 'saved',
      }))
      return
    }

    // منع أي مؤقت قديم من تعديل المبلغ بعد الحفظ اليدوي.
    clearPaymentTimer(student.id)

    setSavingStudentId(student.id)

    setPaymentSavingId(student.id)

    setPaymentStatus((current) => ({
      ...current,
      [student.id]: 'saving',
    }))

    setSaveStatus((current) => {
      const next = { ...current }
      delete next[student.id]
      return next
    })

    setError('')
    setSuccess('')

    try {
      const response = await fetch(
        `/api/trips/${encodeURIComponent(tripId)}/students`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'participant_update',
            student_id: student.id,
            payment_amount: roundedAmount,
            response: responseValue,
          }),
        },
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result?.error ??
            'تعذر حفظ مبلغ الدفع ورد الطالب.',
        )
      }

      const updatedStudent = result?.student

      const savedPayment =
        Number(
          updatedStudent?.payment_amount ?? roundedAmount,
        )

      const savedResponse: ResponseStatus =
        updatedStudent?.response ?? responseValue

      const savedResponseNote: string | null =
        updatedStudent?.response_note ?? null

      const savedResponseSource: ResponseSource =
        updatedStudent?.response_source ??
        (savedResponse === 'pending' ? null : 'admin')

      const savedRespondedAt: string | null =
        updatedStudent?.responded_at ??
        (savedResponse === 'pending'
          ? null
          : new Date().toISOString())

      // تحديث بيانات الطالب في الواجهة والكاش.
      setData((current) => {
        if (!current) return current

        const nextData = {
          ...current,
          students: current.students.map((item) =>
            item.id === student.id
              ? {
                  ...item,
                  payment_amount: savedPayment,
                  response: savedResponse,
                  response_note: savedResponseNote,
                  response_source: savedResponseSource,
                  responded_at: savedRespondedAt,
                }
              : item,
          ),
        }

        syncDetailsCache(nextData)

        return nextData
      })

      // مزامنة قيم الحقول مع القيم المحفوظة.
      setPaymentInputs((current) => ({
        ...current,
        [student.id]:
          savedPayment > 0 ? String(savedPayment) : '',
      }))

      setResponseInputs((current) => {
        const next = { ...current }
        delete next[student.id]
        return next
      })

      setPaymentStatus((current) => ({
        ...current,
        [student.id]: 'saved',
      }))

      setSaveStatus((current) => ({
        ...current,
        [student.id]: 'saved',
      }))

      setSuccess(
        `تم حفظ المبلغ والرد للطالب ${student.name}.`,
      )
    } catch (err) {
      console.error(
        'Save participant update error:',
        err,
      )

      setPaymentStatus((current) => ({
        ...current,
        [student.id]: 'error',
      }))

      setSaveStatus((current) => ({
        ...current,
        [student.id]: 'error',
      }))

      setError(
        err instanceof Error
          ? err.message
          : 'تعذر حفظ مبلغ الدفع ورد الطالب.',
      )
    } finally {
      setSavingStudentId(null)
      setPaymentSavingId(null)
    }
  }

  // الحفظ القديم لقسم الطلاب المؤهلين يبقى كما هو.
  async function savePayment(
    student: Student,
    inputValue?: string,
  ) {
    if (!canEditParticipantData) return

    const rawValue =
      inputValue ??
      paymentInputs[student.id] ??
      ''

    const normalizedValue =
      rawValue.trim().replace(',', '.')

    const amount =
      normalizedValue === ''
        ? 0
        : Number(normalizedValue)

    if (
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      setPaymentStatus((current) => ({
        ...current,
        [student.id]: 'error',
      }))

      setError(
        'مبلغ الدفع يجب أن يكون رقمًا صحيحًا أو عشريًا ولا يمكن أن يكون سالبًا.',
      )
      return
    }

    const roundedAmount =
      Math.round(amount * 1000) / 1000

    setPaymentSavingId(student.id)

    setPaymentStatus((current) => ({
      ...current,
      [student.id]: 'saving',
    }))

    setError('')
    setSuccess('')

    try {
      const response = await fetch(
        `/api/trips/${encodeURIComponent(tripId)}/students`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'payment',
            student_id: student.id,
            payment_amount: roundedAmount,
          }),
        },
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result?.error ?? 'تعذر حفظ مبلغ الدفع.',
        )
      }

      setData((current) => {
        if (!current) return current

        const nextData = {
          ...current,
          students: current.students.map((item) =>
            item.id === student.id
              ? {
                  ...item,
                  payment_amount: roundedAmount,
                }
              : item,
          ),
        }

        syncDetailsCache(nextData)

        return nextData
      })

      setPaymentInputs((current) => ({
        ...current,
        [student.id]:
          roundedAmount > 0
            ? String(roundedAmount)
            : '',
      }))

      setPaymentStatus((current) => ({
        ...current,
        [student.id]: 'saved',
      }))
    } catch (err) {
      console.error('Save trip payment error:', err)

      setPaymentStatus((current) => ({
        ...current,
        [student.id]: 'error',
      }))

      setError(
        err instanceof Error
          ? err.message
          : 'تعذر حفظ مبلغ الدفع.',
      )
    } finally {
      setPaymentSavingId(null)
    }
  }

  // الحفظ القديم لقسم الطلاب المؤهلين يبقى كما هو.
  async function saveResponse(
    student: Student,
    responseValue: ResponseStatus,
  ) {
    if (!canEditParticipantData) return

    setResponseSavingId(student.id)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(
        `/api/trips/${encodeURIComponent(tripId)}/students`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'response',
            student_id: student.id,
            response: responseValue,
          }),
        },
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result?.error ?? 'تعذر حفظ رد الطالب.',
        )
      }

      const updatedStudent = result?.student

      setData((current) => {
        if (!current) return current

        const nextData = {
          ...current,
          students: current.students.map((item) => {
            if (item.id !== student.id) {
              return item
            }

            return {
              ...item,
              response:
                updatedStudent?.response ??
                responseValue,
              response_note:
                updatedStudent?.response_note ?? null,
              response_source:
                updatedStudent?.response_source ??
                (responseValue === 'pending'
                  ? null
                  : 'admin'),
              responded_at:
                updatedStudent?.responded_at ??
                (responseValue === 'pending'
                  ? null
                  : new Date().toISOString()),
            }
          }),
        }

        syncDetailsCache(nextData)

        return nextData
      })

      setSuccess(
        `تم تحديث رد الطالب ${student.name}.`,
      )
    } catch (err) {
      console.error('Save trip response error:', err)

      setError(
        err instanceof Error
          ? err.message
          : 'تعذر حفظ رد الطالب.',
      )
    } finally {
      setResponseSavingId(null)
    }
  }

  async function publishTrip() {
    if (!data) return

    if (data.trip.status !== 'draft') {
      return
    }

    if (!directPublishAllowed) {
      setError(
        'النشر المباشر موقوف من إعدادات النظام.',
      )
      return
    }

    if (selectedCount === 0) {
      setError(
        'يجب حفظ طالب واحد على الأقل قبل نشر الرحلة.',
      )
      return
    }

    const confirmed = window.confirm(
      'هل أنت متأكد من نشر الرحلة؟ بعد النشر ستظهر للطلاب المحددين في صفحة حالة الطالب.',
    )

    if (!confirmed) return

    setPublishing(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/trips', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: tripId,
          status: 'published',
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result?.error ?? 'تعذر نشر الرحلة.',
        )
      }

      setSuccess('تم نشر الرحلة بنجاح.')

      await loadData({
        silent: true,
        force: true,
      })
    } catch (err) {
      console.error('Publish trip error:', err)

      setError(
        err instanceof Error
          ? err.message
          : 'تعذر نشر الرحلة.',
      )
    } finally {
      setPublishing(false)
    }
  }

  async function closeTrip() {
    if (!data) return

    if (data.trip.status !== 'published') {
      return
    }

    const confirmed = window.confirm(
      'هل أنت متأكد من إغلاق الرحلة؟\n\nبعد الإغلاق ستختفي الرحلة من متابعة التسجيل لدى الطلاب، ولن يمكن تعديل قائمة الطلاب أو الردود أو الدفعات.\n\nستبقى الرحلة محفوظة ضمن الرحلات السابقة بكامل تفاصيلها.',
    )

    if (!confirmed) return

    setClosing(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/trips', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: tripId,
          status: 'closed',
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result?.error ?? 'تعذر إغلاق الرحلة.',
        )
      }

      setSuccess(
        'تم إغلاق الرحلة بنجاح، وتم نقلها إلى الرحلات السابقة.',
      )

      await loadData({
        silent: true,
        force: true,
      })
    } catch (err) {
      console.error('Close trip error:', err)

      setError(
        err instanceof Error
          ? err.message
          : 'تعذر إغلاق الرحلة.',
      )
    } finally {
      setClosing(false)
    }
  }

  async function downloadExcel() {
    if (!data) return

    try {
      await exportTripStudents(
        data.trip.name,
        data.students,
      )

      setSuccess(
        'تم تنزيل قائمة طلاب الرحلة بصيغة Excel.',
      )
    } catch (err) {
      console.error('Export trip students error:', err)

      setError(
        err instanceof Error
          ? err.message
          : 'تعذر تنزيل ملف Excel. تأكد من وجود مكتبة xlsx في المشروع.',
      )
    }
  }

  function goBack() {
    window.location.href = '/trips'
  }

  if (loading) {
    return (
      <div
        dir="rtl"
        className="flex min-h-[400px] items-center justify-center"
      >
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>جاري تحميل الرحلة...</span>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div dir="rtl" className="space-y-4">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowRight className="h-4 w-4" />
          العودة إلى الرحلات
        </button>

        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center text-destructive">
          {error || 'تعذر العثور على الرحلة.'}
        </div>
      </div>
    )
  }

  const { trip, course, levels } = data

  return (
    <div dir="rtl" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowRight className="h-4 w-4" />
            العودة إلى الرحلات
          </button>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {trip.name}
              </h1>

              <span className="rounded-full border px-3 py-1 text-xs font-medium">
                {getStatusLabel(trip.status)}
              </span>
            </div>

            {trip.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {trip.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={downloadExcel}
            disabled={
              data.students.filter(
                (student) => student.selected,
              ).length === 0
            }
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            تنزيل Excel
          </button>

          {trip.status === 'published' && (
            <button
              type="button"
              onClick={closeTrip}
              disabled={closing}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white"
            >
              {closing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري الإغلاق...
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4" />
                  إغلاق الرحلة
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              loadData({
                silent: true,
                force: true,
              })
            }
            disabled={refreshing}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing ? 'animate-spin' : ''
              }`}
            />
            تحديث
          </button>
        </div>
      </div>

      {/* Trip information */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">
            المقرر
          </p>
          <p className="mt-1 font-semibold">
            {course?.name ?? 'غير محدد'}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">
            التاريخ
          </p>
          <p className="mt-1 font-semibold">
            {formatDate(trip.trip_date)}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">
            المكان
          </p>
          <p className="mt-1 font-semibold">
            {trip.location || 'غير محدد'}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">
            الرسوم
          </p>
          <p className="mt-1 font-semibold">
            {formatFee(trip.fee)} د.ب
          </p>
        </div>
      </div>

      {/* More details */}
      <div className="rounded-xl border bg-card p-5">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">
              وقت التجمع
            </p>
            <p className="mt-1 font-medium">
              {formatTime(trip.meeting_time) ?? 'غير محدد'}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">
              وقت العودة
            </p>
            <p className="mt-1 font-medium">
              {formatTime(trip.return_time) ?? 'غير محدد'}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">
              الحد الأدنى للحضور
            </p>
            <p className="mt-1 font-medium">
              {trip.attendance_min != null
                ? `${trip.attendance_min}%`
                : 'بدون حد'}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">
              الحد الأعلى للحضور
            </p>
            <p className="mt-1 font-medium">
              {trip.attendance_max != null
                ? `${trip.attendance_max}%`
                : 'بدون حد'}
            </p>
          </div>
        </div>

        {trip.note && (
          <div className="mt-4 rounded-lg bg-muted/50 p-3 text-sm">
            <span className="font-medium">
              ملاحظة الرحلة:
            </span>{' '}
            {trip.note}
          </div>
        )}
      </div>

      {/* Results */}
      {(trip.status === 'published' ||
        trip.status === 'closed') && (
        <TripResultsSection
          tripId={tripId}
          tripResults={tripResults}
          totalPaid={totalPaid}
          showResults={showResults}
          onToggleResults={() =>
            setShowResults((current) => !current)
          }
          resultStudents={resultStudents}
          search={search}
          onSearchChange={setSearch}
          responseFilter={responseFilter}
          onResponseFilterChange={setResponseFilter}
          paymentInputs={paymentInputs}
          responseInputs={responseInputs}
          paymentStatus={paymentStatus}
          responseSavingId={responseSavingId}
          canEditParticipantData={canEditParticipantData}
          onPaymentChange={(student, value) => {
            const fullStudent = data.students.find(
              (item) => item.id === student.id,
            )

            if (fullStudent) {
              handlePaymentChange(fullStudent, value)
            }
          }}
          onResponseChange={(student, value) => {
            handleResponseChange(student, value)
          }}
          onSaveStudent={saveParticipantUpdate}
          hasUnsavedChanges={hasUnsavedChanges}
          savingStudentId={savingStudentId}
          saveStatus={saveStatus}
          formatDateTime={formatDateTime}
          formatPayment={formatPayment}
        />
      )}

      {/* Published / Closed notice */}
      {!canEdit && (
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
          {trip.status === 'published'
            ? 'هذه الرحلة منشورة، لذلك لا يمكن تعديل قائمة الطلاب. يمكنك متابعة النتائج وتعديل الرد والدفع.'
            : 'هذه الرحلة مغلقة، لذلك لا يمكن تعديل قائمة الطلاب أو الرد أو الدفع. الرحلة محفوظة ضمن الرحلات السابقة.'}
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          <X className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-700 dark:text-emerald-400">
          <Check className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Students section */}
      {canEdit && data && (
        <EligibleStudentsSection
          trip={data.trip}
          levels={levels}
          eligibleStudents={eligibleStudents}
          filteredStudents={filteredStudents}
          selectedIds={selectedIds}
          selectedCount={selectedCount}
          search={search}
          onSearchChange={setSearch}
          levelFilter={levelFilter}
          onLevelFilterChange={setLevelFilter}
          showEligibleOnly={showEligibleOnly}
          onShowEligibleOnlyChange={setShowEligibleOnly}
          canEdit={canEdit}
          canEditParticipantData={canEditParticipantData}
          responseSavingId={responseSavingId}
          paymentInputs={paymentInputs}
          onPaymentInputChange={(studentId, value) =>
            setPaymentInputs((current) => ({
              ...current,
              [studentId]: value,
            }))
          }
          paymentSavingId={paymentSavingId}
          saving={saving}
          publishing={publishing}
          settingsLoading={settingsLoading}
          directPublishAllowed={directPublishAllowed}
          onSelectAllVisible={selectAllVisible}
          onClearVisibleSelection={clearVisibleSelection}
          onToggleStudent={toggleStudent}
          onSavePayment={savePayment}
          onSaveResponse={saveResponse}
          onSaveStudents={saveStudents}
          onPublishTrip={publishTrip}
          getAttendanceClass={getAttendanceClass}
          getResponseSourceClass={getResponseSourceClass}
          getResponseSourceLabel={getResponseSourceLabel}
          formatDateTime={formatDateTime}
          formatPayment={formatPayment}
        />
      )}
    </div>
  )
}
