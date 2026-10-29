


'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  Archive,
  ArrowRight,
  Check,
  CheckSquare,
  Download,
  Loader2,
  RefreshCw,
  Search,
  Send,
  Users,
  X,
  BarChart3,
  UserCheck,
  UserX,
  Clock3,
  Wallet,
  Settings2,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { EligibleStudentsSection } from './eligible-students-section'
import { TripResultsSection } from "./trip-results-section"

import type {
  ApiResponse,
  Course,
  CourseNote,
  Level,
  ResponseSource,
  ResponseStatus,
  Student,
  Trip,
  TripStatus,
} from './trip-types'

import {
  loadTripDetailsCache,
  setTripDetailsCache,
} from '@/lib/trips-cache'

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

function getResponseLabel(response: ResponseStatus) {
  switch (response) {
    case 'accepted':
      return 'موافق'

    case 'rejected':
      return 'رافض'

    default:
      return 'بانتظار الرد'
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


export function TripDetailsView({
  tripId,
}: {
  tripId: string
}) {
  const [data, setData] =
    useState<ApiResponse | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [refreshing, setRefreshing] =
    useState(false)

  const [saving, setSaving] =
    useState(false)

  const [publishing, setPublishing] =
    useState(false)

  const [closing, setClosing] =
    useState(false)

  const [paymentSavingId, setPaymentSavingId] =
    useState<string | null>(null)

  const [responseSavingId, setResponseSavingId] =
    useState<string | null>(null)

  const [
    directPublishAllowed,
    setDirectPublishAllowed,
  ] = useState(false)

  const [settingsLoading, setSettingsLoading] =
    useState(true)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] =
    useState('all')

  const [showEligibleOnly, setShowEligibleOnly] =
    useState(true)

  const [selectedIds, setSelectedIds] =
    useState<string[]>([])

  const [showResults, setShowResults] =
    useState(false)

  const [responseFilter, setResponseFilter] =
    useState<
      'all' | 'accepted' | 'rejected' | 'pending'
    >('all')

  const [paymentInputs, setPaymentInputs] =
    useState<Record<string, string>>({})

  const paymentTimers = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({})

  const [paymentStatus, setPaymentStatus] =
    useState<
      Record<string, 'saving' | 'saved' | 'error'>
    >({})

  async function loadPublishSetting() {
    setSettingsLoading(true)

    const {
      data: settings,
      error: settingsError,
    } = await supabase
      .from('student_status_settings')
      .select('allow_direct_trip_publish')
      .limit(1)
      .maybeSingle()

    if (settingsError) {
      console.error(
        'Load trip publish setting error:',
        settingsError,
      )

      setDirectPublishAllowed(false)
    } else {
      setDirectPublishAllowed(
        settings?.allow_direct_trip_publish === true,
      )
    }

    setSettingsLoading(false)
  }

  async function loadData(options?: {
    silent?: boolean
    force?: boolean
  }) {
    const silent =
      options?.silent ?? false

    const force =
      options?.force ?? false

    if (silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError('')
    setSuccess('')

    try {
      const result =
        await loadTripDetailsCache(
          tripId,
          {
            force,
          },
        )

      const nextData =
        result as unknown as ApiResponse

      setData(nextData)

      setSelectedIds(
        nextData.students
          .filter(
            (student) => student.selected,
          )
          .map(
            (student) => student.id,
          ),
      )

      const nextPaymentInputs: Record<
        string,
        string
      > = {}

      nextData.students.forEach(
        (student) => {
          nextPaymentInputs[student.id] =
            student.payment_amount > 0
              ? String(
                  student.payment_amount,
                )
              : ''
        },
      )

      setPaymentInputs(
        nextPaymentInputs,
      )
    } catch (error) {
      console.error(
        'Load trip students error:',
        error,
      )

      setError(
        error instanceof Error
          ? error.message
          : 'تعذر تحميل بيانات الرحلة.',
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (!tripId) return

    loadData()
    loadPublishSetting()
  }, [tripId])

  const eligibleStudents = useMemo(() => {
    if (!data) return []

    return data.students.filter(
      (student) => student.eligible,
    )
  }, [data])

  const tripResults = useMemo(() => {
    if (!data) {
      return {
        total: 0,
        accepted: 0,
        rejected: 0,
        pending: 0,
      }
    }

    const students =
      data.students.filter(
        (student) => student.selected,
      )

    return {
      total: students.length,

      accepted: students.filter(
        (student) =>
          student.response ===
          'accepted',
      ).length,

      rejected: students.filter(
        (student) =>
          student.response ===
          'rejected',
      ).length,

      pending: students.filter(
        (student) =>
          student.response ===
          'pending',
      ).length,
    }
  }, [data])

 
const resultStudents = useMemo(() => {
  if (!data) return []

  return data.students.filter(
    (student) => student.selected
  )
}, [data])

  const totalPaid = useMemo(() => {
    if (!data) return 0

    return data.students
      .filter((student) => student.selected)
      .reduce(
        (sum, student) =>
          sum + Number(student.payment_amount ?? 0),
        0,
      )
  }, [data])
  
  const filteredStudents = useMemo(() => {
    if (
      !data ||
      !Array.isArray(data.students)
    ) {
      return []
    }

    const normalizedSearch =
      search.trim().toLowerCase()

    return data.students.filter(
      (student) => {
        if (
          showEligibleOnly &&
          student.eligible !== true
        ) {
          return false
        }

        const name =
          typeof student.name === 'string'
            ? student.name
            : ''

        const personalId =
          typeof student.personal_id ===
          'string'
            ? student.personal_id
            : ''

        const phone =
          typeof student.phone === 'string'
            ? student.phone
            : ''

        const matchesSearch =
          !normalizedSearch ||
          name
            .toLowerCase()
            .includes(normalizedSearch) ||
          personalId
            .toLowerCase()
            .includes(
              normalizedSearch,
            ) ||
          phone
            .toLowerCase()
            .includes(
              normalizedSearch,
            )

        const matchesLevel =
          levelFilter === 'all' ||
          student.level?.id ===
            levelFilter

        return (
          matchesSearch &&
          matchesLevel
        )
      },
    )
  }, [
    data,
    search,
    levelFilter,
    showEligibleOnly,
  ])

  const selectedCount =
    selectedIds.length

  const canEdit =
    data?.trip.status !== 'closed' &&
    data?.trip.status !== 'published'

  const canEditParticipantData =
    data?.trip.status !== 'closed'

  function syncDetailsCache(
    nextData: ApiResponse,
  ) {
    setTripDetailsCache(tripId, {
      trip: nextData.trip,
      course: nextData.course,
      levels: nextData.levels,
      lesson_dates:
        nextData.lesson_dates,
      students: nextData.students,
    })
  }

  function toggleStudent(
    studentId: string,
  ) {
    if (!canEdit) return

    setSelectedIds((current) => {
      if (current.includes(studentId)) {
        return current.filter(
          (id) => id !== studentId,
        )
      }

      return [...current, studentId]
    })
  }

  function selectAllVisible() {
    if (!canEdit) return

    setSelectedIds((current) => {
      const next = new Set(current)

      filteredStudents.forEach(
        (student) => {
          if (student.eligible) {
            next.add(student.id)
          }
        },
      )

      return Array.from(next)
    })
  }

  function clearVisibleSelection() {
    if (!canEdit) return

    const visibleIds = new Set(
      filteredStudents.map(
        (student) => student.id,
      ),
    )

    setSelectedIds((current) =>
      current.filter(
        (id) => !visibleIds.has(id),
      ),
    )
  }

  async function saveStudents() {
    if (!data || !canEdit) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(
        `/api/trips/${encodeURIComponent(
          tripId,
        )}/students`,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            student_ids: selectedIds,
          }),
        },
      )

      const result =
        await response.json()

      if (!response.ok) {
        throw new Error(
          result?.error ??
            'تعذر حفظ الطلاب.',
        )
      }

      setSuccess(
        'تم حفظ الطلاب في الرحلة بنجاح.',
      )

      await loadData({
        silent: true,
        force: true,
      })
    } catch (error) {
      console.error(
        'Save trip students error:',
        error,
      )

      setError(
        error instanceof Error
          ? error.message
          : 'تعذر حفظ الطلاب.',
      )
    } finally {
      setSaving(false)
    }
  }

 

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
      `/api/trips/${encodeURIComponent(
        tripId,
      )}/students`,
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
  } catch (error) {
    console.error(
      'Save trip payment error:',
      error,
    )

    setPaymentStatus((current) => ({
      ...current,
      [student.id]: 'error',
    }))

    setError(
      error instanceof Error
        ? error.message
        : 'تعذر حفظ مبلغ الدفع.',
    )
  } finally {
    setPaymentSavingId(null)
  }
}

  
function handlePaymentChange(
  student: Student,
  value: string,
) {
  setPaymentInputs((current) => ({
    ...current,
    [student.id]: value,
  }))

  setPaymentStatus((current) => {
    const next = { ...current }
    delete next[student.id]
    return next
  })

  const existingTimer =
    paymentTimers.current[student.id]

  if (existingTimer) {
    clearTimeout(existingTimer)
  }

  paymentTimers.current[student.id] =
    setTimeout(() => {
      void savePayment(student, value)
      delete paymentTimers.current[student.id]
    }, 800)
}


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
        `/api/trips/${encodeURIComponent(
          tripId,
        )}/students`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            action: 'response',
            student_id: student.id,
            response:
              responseValue,
          }),
        },
      )

      const result =
        await response.json()

      if (!response.ok) {
        throw new Error(
          result?.error ??
            'تعذر حفظ رد الطالب.',
        )
      }

      const updatedStudent =
        result?.student

      setData((current) => {
        if (!current) return current

        const nextData = {
          ...current,
          students:
            current.students.map(
              (item) => {
                if (
                  item.id !==
                  student.id
                ) {
                  return item
                }

                return {
                  ...item,
                  response:
                    updatedStudent?.response ??
                    responseValue,
                  response_note:
                    updatedStudent?.response_note ??
                    null,
                  response_source:
                    updatedStudent?.response_source ??
                    (responseValue ===
                    'pending'
                      ? null
                      : 'admin'),
                  responded_at:
                    updatedStudent?.responded_at ??
                    (responseValue ===
                    'pending'
                      ? null
                      : new Date().toISOString()),
                }
              },
            ),
        }

        syncDetailsCache(
          nextData,
        )

        return nextData
      })

      setSuccess(
        `تم تحديث رد الطالب ${student.name}.`,
      )
    } catch (error) {
      console.error(
        'Save trip response error:',
        error,
      )

      setError(
        error instanceof Error
          ? error.message
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

    const confirmed =
      window.confirm(
        'هل أنت متأكد من نشر الرحلة؟ بعد النشر ستظهر للطلاب المحددين في صفحة حالة الطالب.',
      )

    if (!confirmed) return

    setPublishing(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(
        '/api/trips',
        {
          method: 'PATCH',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            id: tripId,
            status: 'published',
          }),
        },
      )

      const result =
        await response.json()

      if (!response.ok) {
        throw new Error(
          result?.error ??
            'تعذر نشر الرحلة.',
        )
      }

      setSuccess(
        'تم نشر الرحلة بنجاح.',
      )

      await loadData({
        silent: true,
        force: true,
      })
    } catch (error) {
      console.error(
        'Publish trip error:',
        error,
      )

      setError(
        error instanceof Error
          ? error.message
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

    const confirmed =
      window.confirm(
        'هل أنت متأكد من إغلاق الرحلة؟\n\nبعد الإغلاق ستختفي الرحلة من متابعة التسجيل لدى الطلاب، ولن يمكن تعديل قائمة الطلاب أو الردود أو الدفعات.\n\nستبقى الرحلة محفوظة ضمن الرحلات السابقة بكامل تفاصيلها.',
      )

    if (!confirmed) return

    setClosing(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(
        '/api/trips',
        {
          method: 'PATCH',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            id: tripId,
            status: 'closed',
          }),
        },
      )

      const result =
        await response.json()

      if (!response.ok) {
        throw new Error(
          result?.error ??
            'تعذر إغلاق الرحلة.',
        )
      }

      setSuccess(
        'تم إغلاق الرحلة بنجاح، وتم نقلها إلى الرحلات السابقة.',
      )

      await loadData({
        silent: true,
        force: true,
      })
    } catch (error) {
      console.error(
        'Close trip error:',
        error,
      )

      setError(
        error instanceof Error
          ? error.message
          : 'تعذر إغلاق الرحلة.',
      )
    } finally {
      setClosing(false)
    }
  }

  async function downloadExcel() {
    if (!data) return

    try {
      const XLSX =
        await import('xlsx')

      const students =
        data.students.filter(
          (student) =>
            student.selected,
        )

      if (students.length === 0) {
        setError(
          'لا يوجد طلاب محددون لتنزيلهم.',
        )
        return
      }

      const rows = students.map(
        (student, index) => ({
          '#': index + 1,
          الطالب: student.name,
          'الرقم الشخصي':
            student.personal_id ??
            '',
          المستوى:
            student.level?.name ??
            '',
          الهاتف:
            student.phone ??
            student.whatsapp ??
            '',
          الحضور:
            student.attendance_percentage !==
            null
              ? `${student.attendance_percentage.toFixed(
                  1,
                )}%`
              : 'لا توجد بيانات',
          حاضر:
            student.attendance_present,
          غائب:
            student.attendance_absent,
          متأخر:
            student.attendance_late,
          مستأذن:
            student.attendance_excused,
          الرد:
            getResponseLabel(
              student.response,
            ),
          'نوع الرد':
            getResponseSourceLabel(
              student.response_source,
            ),
          'تاريخ الرد':
            student.responded_at
              ? formatDateTime(
                  student.responded_at,
                )
              : '',
          الدفع:
            student.payment_amount >
            0
              ? student.payment_amount
              : 0,
          'حالة الدفع':
            student.payment_amount >
            0
              ? 'مدفوع'
              : 'غير مدفوع',
          'ملاحظة الرد':
            student.response_note ??
            '',
          'ملاحظات الدورة':
            student.course_notes
              .map(
                (note) =>
                  note.note,
              )
              .join(' | '),
        }),
      )

      const worksheet =
        XLSX.utils.json_to_sheet(
          rows,
        )

      const workbook =
        XLSX.utils.book_new()

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        'طلاب الرحلة',
      )

      worksheet['!cols'] = [
        { wch: 6 },
        { wch: 28 },
        { wch: 16 },
        { wch: 18 },
        { wch: 16 },
        { wch: 14 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 14 },
        { wch: 14 },
        { wch: 22 },
        { wch: 14 },
        { wch: 14 },
        { wch: 30 },
        { wch: 40 },
      ]

      const safeName =
        data.trip.name
          .replace(
            /[\\/:*?"<>|]/g,
            '',
          )
          .trim() ||
        'الرحلة'

      XLSX.writeFile(
        workbook,
        `${safeName}-طلاب.xlsx`,
      )

      setSuccess(
        'تم تنزيل قائمة طلاب الرحلة بصيغة Excel.',
      )
    } catch (error) {
      console.error(
        'Export trip students error:',
        error,
      )

      setError(
        'تعذر تنزيل ملف Excel. تأكد من وجود مكتبة xlsx في المشروع.',
      )
    }
  }

  function goBack() {
    window.location.href =
      '/trips'
  }

  if (loading) {
    return (
      <div
        dir="rtl"
        className="flex min-h-[400px] items-center justify-center"
      >
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />

          <span>
            جاري تحميل الرحلة...
          </span>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div
        dir="rtl"
        className="space-y-4"
      >
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowRight className="h-4 w-4" />

          العودة إلى الرحلات
        </button>

        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center text-destructive">
          {error ||
            'تعذر العثور على الرحلة.'}
        </div>
      </div>
    )
  }

  const {
    trip,
    course,
    levels,
  } = data

  return (
    <div
      dir="rtl"
      className="space-y-6"
    >
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
                {getStatusLabel(
                  trip.status,
                )}
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
                (student) =>
                  student.selected,
              ).length === 0
            }
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />

            تنزيل Excel
          </button>

          {trip.status ===
            'published' && (
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
                refreshing
                  ? 'animate-spin'
                  : ''
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
            {course?.name ??
              'غير محدد'}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">
            التاريخ
          </p>

          <p className="mt-1 font-semibold">
            {formatDate(
              trip.trip_date,
            )}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">
            المكان
          </p>

          <p className="mt-1 font-semibold">
            {trip.location ||
              'غير محدد'}
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
              {formatTime(
                trip.meeting_time,
              ) ?? 'غير محدد'}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">
              وقت العودة
            </p>

            <p className="mt-1 font-medium">
              {formatTime(
                trip.return_time,
              ) ?? 'غير محدد'}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">
              الحد الأدنى للحضور
            </p>

            <p className="mt-1 font-medium">
              {trip.attendance_min !=
              null
                ? `${trip.attendance_min}%`
                : 'بدون حد'}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">
              الحد الأعلى للحضور
            </p>

            <p className="mt-1 font-medium">
              {trip.attendance_max !=
              null
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
            const fullStudent = data.students.find(
              (item) => item.id === student.id,
            )

            if (fullStudent) {
              void saveResponse(fullStudent, value)
            }
          }}
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
          levels={data.levels}
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
