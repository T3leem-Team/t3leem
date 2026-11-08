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
  CalendarDays,
  MapPin,
  BookOpen,
  Banknote,
  Users,
  LockKeyhole,
  ClipboardList,
} from 'lucide-react'

import { EligibleStudentsSection } from './eligible-students-section'
import { TripResultsSection } from './trip-results-section'
import { useTripDetails } from './trip-details-hook'
import { exportTripStudents } from './trip-export'

import type { ResultStudent } from './trip-results-table'

import type {
  ResponseSource,
  ResponseStatus,
  Student,
  TripStatus,
} from './trip-types'

type ParticipantEditor = {
  student: ResultStudent
  payment: string
  response: ResponseStatus
  responseAutoChanged: boolean
  error: string
}

function formatDate(value: string | null) {
  if (!value) return 'بدون تاريخ'

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('ar-BH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

function formatDateTime(value: string | null) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

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

function getTripStatusClass(status: TripStatus) {
  switch (status) {
    case 'published':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
    case 'closed':
      return 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
    case 'draft':
      return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300'
    case 'pending_approval':
      return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300'
    case 'rejected':
      return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300'
    default:
      return 'border-border bg-muted text-muted-foreground'
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
      return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
    case 'admin':
      return 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

function formatPayment(value: number) {
  if (!value || value <= 0) return 'غير مدفوع'
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

const detailCardClass =
  'group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/30 transition-colors hover:border-blue-200 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none dark:hover:border-slate-700'

const secondaryButtonClass =
  'inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'

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

  const [responseInputs, setResponseInputs] = useState<
    Record<string, ResponseStatus>
  >({})

  const [savingStudentId, setSavingStudentId] = useState<
    string | null
  >(null)

  const [saveStatus, setSaveStatus] = useState<
    Record<string, 'saved' | 'error'>
  >({})

  const [participantEditor, setParticipantEditor] =
    useState<ParticipantEditor | null>(null)

  function clearPaymentTimer(studentId: string) {
    const existingTimer = paymentTimers.current[studentId]

    if (existingTimer) {
      clearTimeout(existingTimer)
      delete paymentTimers.current[studentId]
    }
  }

  function openParticipantEditor(student: ResultStudent) {
    if (!canEditParticipantData) return

    setParticipantEditor({
      student,
      payment:
        paymentInputs[student.id] ??
        normalizePaymentInput(student.payment_amount),
      response: responseInputs[student.id] ?? student.response,
      responseAutoChanged: false,
      error: '',
    })
  }

  function updateEditorPayment(value: string) {
    setParticipantEditor((current) => {
      if (!current) return current

      const amount = parsePaymentInput(value)
      const shouldAutoAccept =
        Number.isFinite(amount) &&
        amount > 0 &&
        current.response !== 'accepted'

      return {
        ...current,
        payment: value,
        response:
          Number.isFinite(amount) && amount > 0
            ? 'accepted'
            : current.response,
        responseAutoChanged:
          shouldAutoAccept || current.responseAutoChanged,
        error: '',
      }
    })
  }

  function updateEditorResponse(value: ResponseStatus) {
    setParticipantEditor((current) =>
      current
        ? {
            ...current,
            response: value,
            responseAutoChanged: false,
            error: '',
          }
        : current,
    )
  }

  async function saveParticipantUpdate(
    tableStudent: ResultStudent,
    draft?: {
      payment: string
      response: ResponseStatus
    },
  ) {
    if (!canEditParticipantData) return
    if (savingStudentId === tableStudent.id) return

    const student = data?.students.find(
      (item) => item.id === tableStudent.id,
    )

    if (!student) {
      setParticipantEditor((current) =>
        current?.student.id === tableStudent.id
          ? {
              ...current,
              error: 'تعذر العثور على بيانات الطالب.',
            }
          : current,
      )

      setError('تعذر العثور على بيانات الطالب.')
      return
    }

    const rawPayment =
      draft?.payment ??
      paymentInputs[student.id] ??
      normalizePaymentInput(student.payment_amount)

    const amount = parsePaymentInput(rawPayment)

    if (!Number.isFinite(amount) || amount < 0) {
      const message =
        'مبلغ الدفع يجب أن يكون رقمًا صحيحًا أو عشريًا ولا يمكن أن يكون سالبًا.'

      setSaveStatus((current) => ({
        ...current,
        [student.id]: 'error',
      }))

      setParticipantEditor((current) =>
        current?.student.id === student.id
          ? { ...current, error: message }
          : current,
      )

      setError(message)
      return
    }

    const roundedAmount = Math.round(amount * 1000) / 1000

    const responseValue =
      draft?.response ??
      responseInputs[student.id] ??
      student.response

    if (
      responseValue !== 'pending' &&
      responseValue !== 'accepted' &&
      responseValue !== 'rejected'
    ) {
      const message = 'قيمة رد الطالب غير صحيحة.'

      setSaveStatus((current) => ({
        ...current,
        [student.id]: 'error',
      }))

      setParticipantEditor((current) =>
        current?.student.id === student.id
          ? { ...current, error: message }
          : current,
      )

      setError(message)
      return
    }

    if (roundedAmount > 0 && responseValue !== 'accepted') {
      const message =
        'لا يمكن تسجيل مبلغ دفع إلا إذا كانت حالة الرد موافق.'

      setParticipantEditor((current) =>
        current?.student.id === student.id
          ? { ...current, error: message }
          : current,
      )

      setError(message)
      return
    }

    const originalAmount =
      Math.round(Number(student.payment_amount || 0) * 1000) / 1000

    if (
      roundedAmount === originalAmount &&
      responseValue === student.response
    ) {
      setSaveStatus((current) => ({
        ...current,
        [student.id]: 'saved',
      }))

      setParticipantEditor(null)
      return
    }

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
          result?.error ?? 'تعذر حفظ مبلغ الدفع ورد الطالب.',
        )
      }

      const updatedStudent = result?.student

      const savedPayment = Number(
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

      setParticipantEditor(null)
      setSuccess(`تم حفظ المبلغ والرد للطالب ${student.name}.`)
    } catch (err) {
      console.error('Save participant update error:', err)

      const message =
        err instanceof Error
          ? err.message
          : 'تعذر حفظ مبلغ الدفع ورد الطالب.'

      setPaymentStatus((current) => ({
        ...current,
        [student.id]: 'error',
      }))

      setSaveStatus((current) => ({
        ...current,
        [student.id]: 'error',
      }))

      setParticipantEditor((current) =>
        current?.student.id === student.id
          ? {
              ...current,
              error: message,
            }
          : current,
      )

      setError(message)
    } finally {
      setSavingStudentId(null)
      setPaymentSavingId(null)
    }
  }

  // الحفظ الخاص بقسم الطلاب المؤهلين - دون تغيير.
  async function savePayment(student: Student, inputValue?: string) {
    if (!canEditParticipantData) return

    const rawValue = inputValue ?? paymentInputs[student.id] ?? ''
    const normalizedValue = rawValue.trim().replace(',', '.')
    const amount = normalizedValue === '' ? 0 : Number(normalizedValue)

    if (!Number.isFinite(amount) || amount < 0) {
      setPaymentStatus((current) => ({
        ...current,
        [student.id]: 'error',
      }))

      setError(
        'مبلغ الدفع يجب أن يكون رقمًا صحيحًا أو عشريًا ولا يمكن أن يكون سالبًا.',
      )
      return
    }

    const roundedAmount = Math.round(amount * 1000) / 1000

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
        throw new Error(result?.error ?? 'تعذر حفظ مبلغ الدفع.')
      }

      setData((current) => {
        if (!current) return current

        const nextData = {
          ...current,
          students: current.students.map((item) =>
            item.id === student.id
              ? { ...item, payment_amount: roundedAmount }
              : item,
          ),
        }

        syncDetailsCache(nextData)
        return nextData
      })

      setPaymentInputs((current) => ({
        ...current,
        [student.id]:
          roundedAmount > 0 ? String(roundedAmount) : '',
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
        err instanceof Error ? err.message : 'تعذر حفظ مبلغ الدفع.',
      )
    } finally {
      setPaymentSavingId(null)
    }
  }

  // الحفظ الخاص بقسم الطلاب المؤهلين - دون تغيير.
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
        throw new Error(result?.error ?? 'تعذر حفظ رد الطالب.')
      }

      const updatedStudent = result?.student

      setData((current) => {
        if (!current) return current

        const nextData = {
          ...current,
          students: current.students.map((item) => {
            if (item.id !== student.id) return item

            return {
              ...item,
              response: updatedStudent?.response ?? responseValue,
              response_note: updatedStudent?.response_note ?? null,
              response_source:
                updatedStudent?.response_source ??
                (responseValue === 'pending' ? null : 'admin'),
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

      setSuccess(`تم تحديث رد الطالب ${student.name}.`)
    } catch (err) {
      console.error('Save trip response error:', err)

      setError(
        err instanceof Error ? err.message : 'تعذر حفظ رد الطالب.',
      )
    } finally {
      setResponseSavingId(null)
    }
  }

  async function publishTrip() {
    if (!data || data.trip.status !== 'draft') return

    if (!directPublishAllowed) {
      setError('النشر المباشر موقوف من إعدادات النظام.')
      return
    }

    if (selectedCount === 0) {
      setError('يجب حفظ طالب واحد على الأقل قبل نشر الرحلة.')
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
        throw new Error(result?.error ?? 'تعذر نشر الرحلة.')
      }

      setSuccess('تم نشر الرحلة بنجاح.')
      await loadData({ silent: true, force: true })
    } catch (err) {
      console.error('Publish trip error:', err)

      setError(
        err instanceof Error ? err.message : 'تعذر نشر الرحلة.',
      )
    } finally {
      setPublishing(false)
    }
  }

  async function closeTrip() {
    if (!data || data.trip.status !== 'published') return

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
        throw new Error(result?.error ?? 'تعذر إغلاق الرحلة.')
      }

      setSuccess(
        'تم إغلاق الرحلة بنجاح، وتم نقلها إلى الرحلات السابقة.',
      )

      await loadData({ silent: true, force: true })
    } catch (err) {
      console.error('Close trip error:', err)

      setError(
        err instanceof Error ? err.message : 'تعذر إغلاق الرحلة.',
      )
    } finally {
      setClosing(false)
    }
  }

  async function downloadExcel() {
    if (!data) return

    try {
      await exportTripStudents(data.trip.name, data.students)
      setSuccess('تم تنزيل قائمة طلاب الرحلة بصيغة Excel.')
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
        className="flex min-h-[400px] items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          جاري تحميل الرحلة...
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div dir="rtl" className="space-y-5">
        <button
          type="button"
          onClick={goBack}
          className={secondaryButtonClass}
        >
          <ArrowRight className="h-4 w-4" />
          العودة إلى الرحلات
        </button>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error || 'تعذر العثور على الرحلة.'}
        </div>
      </div>
    )
  }

  const { trip, course, levels } = data

  const participantResponseClass =
    participantEditor?.response === 'accepted'
      ? 'border-emerald-300 bg-emerald-50 text-emerald-800 focus:border-emerald-400 focus:ring-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:focus:ring-emerald-900/40'
      : participantEditor?.response === 'rejected'
        ? 'border-red-300 bg-red-50 text-red-800 focus:border-red-400 focus:ring-red-100 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300 dark:focus:ring-red-900/40'
        : 'border-slate-200 bg-white text-slate-800 focus:border-blue-400 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-blue-900/40'

  return (
    <div
      dir="rtl"
      className="min-h-full space-y-6 rounded-3xl bg-slate-50/80 p-3 sm:p-5 lg:p-6 dark:bg-slate-950/40"
    >
      {/* Header */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
        <div className="h-1.5 bg-gradient-to-l from-blue-700 via-blue-500 to-sky-300" />

        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-3">
            <button
              type="button"
              onClick={goBack}
              className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-300"
            >
              <ArrowRight className="h-4 w-4" />
              العودة إلى الرحلات
            </button>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                <MapPin className="h-6 w-6" />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="break-words text-xl font-bold tracking-tight text-slate-800 sm:text-2xl dark:text-slate-100">
                    {trip.name}
                  </h1>

                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getTripStatusClass(trip.status)}`}
                  >
                    {getStatusLabel(trip.status)}
                  </span>
                </div>

                {trip.description && (
                  <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {trip.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadExcel}
              disabled={
                data.students.filter((student) => student.selected)
                  .length === 0
              }
              className={secondaryButtonClass}
            >
              <Download className="h-4 w-4" />
              تنزيل Excel
            </button>

            {trip.status === 'published' && (
              <button
                type="button"
                onClick={closeTrip}
                disabled={closing}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-700 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/40 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white"
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
                loadData({ silent: true, force: true })
              }
              disabled={refreshing}
              className={secondaryButtonClass}
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
              />
              تحديث
            </button>
          </div>
        </div>
      </section>

      {/* Main trip information */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <span className="h-5 w-1 rounded-full bg-blue-500" />
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
            معلومات الرحلة
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className={detailCardClass}>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  المقرر
                </p>
                <p className="mt-1.5 break-words font-semibold text-slate-800 dark:text-slate-100">
                  {course?.name ?? 'غير محدد'}
                </p>
              </div>
            </div>
          </div>

          <div className={detailCardClass}>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  التاريخ
                </p>
                <p className="mt-1.5 font-semibold text-slate-800 dark:text-slate-100">
                  {formatDate(trip.trip_date)}
                </p>
              </div>
            </div>
          </div>

          <div className={detailCardClass}>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  المكان
                </p>
                <p className="mt-1.5 break-words font-semibold text-slate-800 dark:text-slate-100">
                  {trip.location || 'غير محدد'}
                </p>
              </div>
            </div>
          </div>

          <div className={detailCardClass}>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                <Banknote className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  الرسوم
                </p>
                <p className="mt-1.5 font-semibold text-slate-800 dark:text-slate-100">
                  {formatFee(trip.fee)} د.ب
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Additional details */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/30 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-800/40">
          <CalendarDays className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            تفاصيل ومواعيد الرحلة
          </h2>
        </div>

        <div className="p-5">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                وقت التجمع
              </p>
              <p className="mt-2 font-semibold text-slate-800 dark:text-slate-100">
                {formatTime(trip.meeting_time) ?? 'غير محدد'}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                وقت العودة
              </p>
              <p className="mt-2 font-semibold text-slate-800 dark:text-slate-100">
                {formatTime(trip.return_time) ?? 'غير محدد'}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                الحد الأدنى للحضور
              </p>
              <p className="mt-2 font-semibold text-slate-800 dark:text-slate-100">
                {trip.attendance_min != null
                  ? `${trip.attendance_min}%`
                  : 'بدون حد'}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                الحد الأعلى للحضور
              </p>
              <p className="mt-2 font-semibold text-slate-800 dark:text-slate-100">
                {trip.attendance_max != null
                  ? `${trip.attendance_max}%`
                  : 'بدون حد'}
              </p>
            </div>
          </div>

          {trip.note && (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50/70 p-4 text-sm leading-6 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                <BookOpen className="h-4 w-4" />
              </span>
              <div>
                <p className="mb-0.5 font-bold">ملاحظة الرحلة</p>
                <p>{trip.note}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Results */}
      {(trip.status === 'published' ||
        trip.status === 'closed') && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/30 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
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
            canEditParticipantData={canEditParticipantData}
            onOpenActions={openParticipantEditor}
            formatDateTime={formatDateTime}
            formatPayment={formatPayment}
          />
        </div>
      )}

      {/* Published / Closed notice */}
      {!canEdit && (
        <div className="flex items-start gap-3 rounded-2xl border border-blue-200/80 bg-blue-50/70 p-4 text-sm leading-6 text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
            <LockKeyhole className="h-4 w-4" />
          </span>
          <div>
            <p className="font-bold">
              {trip.status === 'published'
                ? 'الرحلة منشورة'
                : 'الرحلة مغلقة'}
            </p>
            <p className="mt-0.5">
              {trip.status === 'published'
                ? 'هذه الرحلة منشورة، لذلك لا يمكن تعديل قائمة الطلاب. يمكنك متابعة النتائج وتعديل الرد والدفع.'
                : 'هذه الرحلة مغلقة، لذلك لا يمكن تعديل قائمة الطلاب أو الرد أو الدفع. الرحلة محفوظة ضمن الرحلات السابقة.'}
            </p>
          </div>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
        >
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">
            <X className="h-4 w-4" />
          </span>
          <span className="pt-1">{error}</span>
        </div>
      )}

      {success && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
        >
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
            <Check className="h-4 w-4" />
          </span>
          <span className="pt-1">{success}</span>
        </div>
      )}

      {/* Eligible students */}
      {canEdit && data && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/30 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
          <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-4 dark:border-slate-800 dark:bg-slate-800/40">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-bold text-slate-800 dark:text-slate-100">
                الطلاب المؤهلون
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                اختيار الطلاب وإدارة بياناتهم قبل نشر الرحلة
              </p>
            </div>
          </div>

          <div className="p-3 sm:p-5">
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
          </div>
        </section>
      )}

      {/* Participant actions modal */}
      {participantEditor && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
          onClick={() => {
            if (!savingStudentId) {
              setParticipantEditor(null)
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="participant-editor-title"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                  <ClipboardList className="h-5 w-5" />
                </div>

                <h3
                  id="participant-editor-title"
                  className="text-lg font-bold text-slate-800 dark:text-slate-100"
                >
                  إجراءات الطالب
                </h3>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {participantEditor.student.name}
                </p>
              </div>

              <button
                type="button"
                disabled={
                  savingStudentId === participantEditor.student.id
                }
                onClick={() => setParticipantEditor(null)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
                aria-label="إغلاق النافذة"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="participant-response"
                  className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"
                >
                  حالة الرد
                </label>

                <select
                  id="participant-response"
                  value={participantEditor.response}
                  onChange={(event) =>
                    updateEditorResponse(
                      event.target.value as ResponseStatus,
                    )
                  }
                  disabled={
                    savingStudentId === participantEditor.student.id
                  }
                  className={`h-11 w-full rounded-xl border px-3 text-sm font-semibold outline-none transition focus:ring-2 disabled:opacity-60 ${participantResponseClass}`}
                >
                  <option
                    value="pending"
                    className="bg-white font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                  >
                    بانتظار الرد
                  </option>
                  <option
                    value="accepted"
                    className="bg-emerald-50 font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  >
                    موافق
                  </option>
                  <option
                    value="rejected"
                    className="bg-red-50 font-semibold text-red-800 dark:bg-red-950 dark:text-red-300"
                  >
                    رافض
                  </option>
                </select>

                {participantEditor.responseAutoChanged && (
                  <div className="mt-2 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      تم تغيير حالة الرد تلقائياً إلى «موافق» بسبب إدخال مبلغ دفع.
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="participant-payment"
                  className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"
                >
                  مبلغ الدفع
                </label>

                <input
                  id="participant-payment"
                  type="text"
                  inputMode="decimal"
                  value={participantEditor.payment}
                  onChange={(event) =>
                    updateEditorPayment(event.target.value)
                  }
                  disabled={
                    savingStudentId === participantEditor.student.id
                  }
                  placeholder="0.000"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-left text-sm tabular-nums text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />

                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                  المبلغ المحفوظ حالياً:{' '}
                  {formatPayment(
                    participantEditor.student.payment_amount,
                  )}
                </p>
              </div>

              {parsePaymentInput(participantEditor.payment) > 0 &&
                participantEditor.response !== 'accepted' && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                    لا يمكن تسجيل مبلغ دفع مع حالة رافض أو بانتظار الرد.
                    غيّر حالة الرد إلى موافق أو صفّر المبلغ.
                  </div>
                )}

              {participantEditor.error && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm leading-6 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
                >
                  {participantEditor.error}
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                disabled={
                  savingStudentId === participantEditor.student.id
                }
                onClick={() => setParticipantEditor(null)}
                className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={
                  savingStudentId === participantEditor.student.id ||
                  !Number.isFinite(
                    parsePaymentInput(participantEditor.payment),
                  ) ||
                  parsePaymentInput(participantEditor.payment) < 0 ||
                  (parsePaymentInput(participantEditor.payment) > 0 &&
                    participantEditor.response !== 'accepted')
                }
                onClick={() =>
                  void saveParticipantUpdate(
                    participantEditor.student,
                    {
                      payment: participantEditor.payment,
                      response: participantEditor.response,
                    },
                  )
                }
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingStudentId === participantEditor.student.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جارٍ الحفظ
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    حفظ التعديلات
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
