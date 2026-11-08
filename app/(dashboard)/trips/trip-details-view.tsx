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
  Clock3,
  Users,
  LockKeyhole,
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

type ParticipantDialog =
  | {
      type: 'remove-payment'
      studentId: string
      studentName: string
    }
  | {
      type: 'change-response'
      studentId: string
      studentName: string
      response: ResponseStatus
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

  const [participantDialog, setParticipantDialog] =
    useState<ParticipantDialog | null>(null)

  function clearPaymentTimer(studentId: string) {
    const existingTimer = paymentTimers.current[studentId]

    if (existingTimer) {
      clearTimeout(existingTimer)
      delete paymentTimers.current[studentId]
    }
  }

  function clearParticipantSaveStatus(studentId: string) {
    clearPaymentTimer(studentId)

    setPaymentStatus((current) => {
      const next = { ...current }
      delete next[studentId]
      return next
    })

    setSaveStatus((current) => {
      const next = { ...current }
      delete next[studentId]
      return next
    })
  }

  function handlePaymentChange(student: Student, value: string) {
    const previousValue =
      paymentInputs[student.id] ??
      normalizePaymentInput(student.payment_amount)

    const previousAmount = parsePaymentInput(previousValue)
    const nextAmount = parsePaymentInput(value)

    if (
      Number.isFinite(previousAmount) &&
      previousAmount > 0 &&
      Number.isFinite(nextAmount) &&
      nextAmount === 0
    ) {
      setParticipantDialog({
        type: 'remove-payment',
        studentId: student.id,
        studentName: student.name,
      })

      return
    }

    setPaymentInputs((current) => ({
      ...current,
      [student.id]: value,
    }))

    clearParticipantSaveStatus(student.id)

    if (Number.isFinite(nextAmount) && nextAmount > 0) {
      setResponseInputs((current) => ({
        ...current,
        [student.id]: 'accepted',
      }))
    }
  }

  function handleResponseChange(
    student: ResultStudent,
    value: ResponseStatus,
  ) {
    const currentPayment =
      paymentInputs[student.id] ??
      normalizePaymentInput(student.payment_amount)

    const currentAmount = parsePaymentInput(currentPayment)

    if (
      Number.isFinite(currentAmount) &&
      currentAmount > 0 &&
      value !== 'accepted'
    ) {
      setParticipantDialog({
        type: 'change-response',
        studentId: student.id,
        studentName: student.name,
        response: value,
      })

      return
    }

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

  function confirmRemovePayment(responseValue: ResponseStatus) {
    if (!participantDialog) return

    const studentId = participantDialog.studentId

    setPaymentInputs((current) => ({
      ...current,
      [studentId]: '',
    }))

    setResponseInputs((current) => ({
      ...current,
      [studentId]: responseValue,
    }))

    clearParticipantSaveStatus(studentId)
    setParticipantDialog(null)
  }

  function confirmResponseChange() {
    if (
      !participantDialog ||
      participantDialog.type !== 'change-response'
    ) {
      return
    }

    const { studentId, response } = participantDialog

    setPaymentInputs((current) => ({
      ...current,
      [studentId]: '',
    }))

    setResponseInputs((current) => ({
      ...current,
      [studentId]: response,
    }))

    clearParticipantSaveStatus(studentId)
    setParticipantDialog(null)
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

    return (
      paymentChanged ||
      currentResponse !== student.response
    )
  }

  async function saveParticipantUpdate(tableStudent: ResultStudent) {
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

    if (!Number.isFinite(amount) || amount < 0) {
      setSaveStatus((current) => ({
        ...current,
        [student.id]: 'error',
      }))

      setError(
        'مبلغ الدفع يجب أن يكون رقمًا صحيحًا أو عشريًا ولا يمكن أن يكون سالبًا.',
      )
      return
    }

    const roundedAmount = Math.round(amount * 1000) / 1000

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

    if (roundedAmount > 0 && responseValue !== 'accepted') {
      setSaveStatus((current) => ({
        ...current,
        [student.id]: 'error',
      }))

      setError(
        'لا يمكن تسجيل مبلغ دفع إلا إذا كانت حالة الرد موافق.',
      )
      return
    }

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
        [student.id]: savedPayment > 0 ? String(savedPayment) : '',
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

      setSuccess(`تم حفظ المبلغ والرد للطالب ${student.name}.`)
    } catch (err) {
      console.error('Save participant update error:', err)

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

  // يبقى الحفظ السابق لقسم الطلاب المؤهلين كما هو.
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
        [student.id]: roundedAmount > 0 ? String(roundedAmount) : '',
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

  // يبقى الحفظ السابق لقسم الطلاب المؤهلين كما هو.
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
          <Clock3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
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

      {/* Participant payment / response confirmation */}
      {participantDialog && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onClick={() => setParticipantDialog(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="participant-dialog-title"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            {participantDialog.type === 'remove-payment' ? (
              <>
                <div className="mb-4 flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                    <Banknote className="h-5 w-5" />
                  </span>

                  <div className="min-w-0">
                    <h3
                      id="participant-dialog-title"
                      className="font-bold text-slate-800 dark:text-slate-100"
                    >
                      تغيير حالة الرد
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      تم تصفير مبلغ الدفع للطالب{' '}
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {participantDialog.studentName}
                      </span>
                      . اختر حالة الرد الجديدة.
                    </p>
                  </div>
                </div>

                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={() => confirmRemovePayment('accepted')}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/60"
                  >
                    <Check className="h-4 w-4" />
                    موافق
                  </button>

                  <button
                    type="button"
                    onClick={() => confirmRemovePayment('rejected')}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/60"
                  >
                    <X className="h-4 w-4" />
                    رافض
                  </button>

                  <button
                    type="button"
                    onClick={() => confirmRemovePayment('pending')}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <Clock3 className="h-4 w-4" />
                    بانتظار الرد
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setParticipantDialog(null)}
                  className="mt-4 h-10 w-full rounded-xl px-4 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  إلغاء
                </button>
              </>
            ) : (
              <>
                <div className="mb-4 flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                    <Banknote className="h-5 w-5" />
                  </span>

                  <div className="min-w-0">
                    <h3
                      id="participant-dialog-title"
                      className="font-bold text-slate-800 dark:text-slate-100"
                    >
                      تأكيد تغيير حالة الرد
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      الطالب{' '}
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {participantDialog.studentName}
                      </span>{' '}
                      لديه مبلغ دفع مسجل. لتغيير حالة الرد إلى{' '}
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {participantDialog.response === 'rejected'
                          ? 'رافض'
                          : 'بانتظار الرد'}
                      </span>
                      ، يجب تصفير مبلغ الدفع أولاً.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-sm leading-6 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
                  عند التأكيد سيتم تصفير المبلغ وتغيير حالة الرد. لن يتم حفظ التعديل في قاعدة البيانات إلا عند الضغط على زر الحفظ في الجدول.
                </div>

                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setParticipantDialog(null)}
                    className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    إلغاء
                  </button>

                  <button
                    type="button"
                    onClick={confirmResponseChange}
                    className="h-10 flex-1 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                  >
                    تأكيد التغيير
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
