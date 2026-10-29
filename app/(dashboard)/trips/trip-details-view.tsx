


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
import { TripResultsTable } from './trip-results-table'

import {
  loadTripDetailsCache,
  setTripDetailsCache,
} from '@/lib/trips-cache'

type TripStatus =
  | 'draft'
  | 'pending_approval'
  | 'published'
  | 'rejected'
  | 'closed'

type Trip = {
  id: string
  name: string
  description: string | null
  location: string | null
  trip_date: string | null
  meeting_time: string | null
  return_time: string | null
  fee: number
  note: string | null
  attendance_min: number | null
  attendance_max: number | null
  notes_requirement: 'any' | 'required' | 'none'
  status: TripStatus
}

type Course = {
  id: string
  name: string
}

type Level = {
  id: string
  name: string
}

type CourseNote = {
  note: string
  source: string
}

type ResponseStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'

type ResponseSource =
  | 'student'
  | 'admin'
  | null

type Student = {
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

  enrollment_id: string
  enrollment_status?: string | null

  attendance_percentage: number | null
  attendance_present: number
  attendance_absent: number
  attendance_late: number
  attendance_excused: number
  attendance_not_recorded: number

  course_notes: CourseNote[]

  eligible: boolean
  eligibility_note: string | null

  selected: boolean

  response: ResponseStatus
  response_note: string | null
  response_source: ResponseSource
  responded_at: string | null

  payment_amount: number
}

type ApiResponse = {
  trip: Trip
  course: Course | null
  levels: Level[]
  lesson_dates: string[]
  students: Student[]
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

  
  const [showColumnSettings, setShowColumnSettings] =
    useState(false)

  const [visibleResultColumns, setVisibleResultColumns] =
    useState<ResultColumn[]>(
      () =>
        RESULT_COLUMNS
          .filter((column) => column.defaultVisible)
          .map((column) => column.id)
    )

  const [columnsLoaded, setColumnsLoaded] =
    useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(
        `${RESULT_COLUMNS_STORAGE_KEY}:${tripId}`
      )

      if (saved) {
        const parsed: unknown = JSON.parse(saved)

        if (Array.isArray(parsed)) {
          const validColumns = parsed.filter(
            (column): column is ResultColumn =>
              RESULT_COLUMNS.some(
                (item) => item.id === column
              )
          )

          setVisibleResultColumns([
            'student',
            ...new Set(
              validColumns.filter(
                (column) => column !== 'student'
              )
            ),
          ])
        }
      }
    } catch (error) {
      console.error(
        'Load result column settings error:',
        error
      )
    } finally {
      setColumnsLoaded(true)
    }
  }, [tripId])

  useEffect(() => {
    if (!columnsLoaded) return

    try {
      localStorage.setItem(
        `${RESULT_COLUMNS_STORAGE_KEY}:${tripId}`,
        JSON.stringify(visibleResultColumns)
      )
    } catch (error) {
      console.error(
        'Save result column settings error:',
        error
      )
    }
  }, [tripId, visibleResultColumns, columnsLoaded])

  function toggleResultColumn(column: ResultColumn) {
    if (column === 'student') return

    setVisibleResultColumns((current) =>
      current.includes(column)
        ? current.filter((item) => item !== column)
        : [...current, column]
    )
  }


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

    const normalizedSearch =
      search.trim().toLowerCase()

    return data.students
      .filter(
        (student) => student.selected,
      )
      .filter((student) => {
        if (responseFilter === 'all') {
          return true
        }

        return (
          student.response ===
          responseFilter
        )
      })
      .filter((student) => {
        if (!normalizedSearch) {
          return true
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

        return (
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
        )
      })
  }, [
    data,
    search,
    responseFilter,
  ])
  
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
      {trip.status === 'published' ||
      trip.status === 'closed' ? (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="flex flex-col gap-4 border-b p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />

                <h2 className="text-lg font-semibold">
                  نتائج الرحلة
                </h2>
              </div>

              <p className="mt-1 text-sm text-muted-foreground">
                نتائج ردود الطلاب على الرحلة.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowResults(
                  (current) => !current,
                )
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border bg-background px-4 text-sm font-medium transition hover:bg-muted"
            >
              <BarChart3 className="h-4 w-4" />

              {showResults
                ? 'إخفاء النتائج'
                : 'عرض النتائج'}
            </button>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
            {/* Total students */}
            <div className="rounded-xl border bg-muted/20 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">
                  إجمالي الطلاب
                </span>

                <Users className="h-5 w-5 shrink-0 text-muted-foreground" />
              </div>

              <p className="mt-2 text-2xl font-bold">
                {tripResults.total}
              </p>
            </div>

            {/* Accepted */}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-emerald-700 dark:text-emerald-400">
                  موافق
                </span>

                <UserCheck className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              </div>

              <p className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                {tripResults.accepted}
              </p>
            </div>

            {/* Rejected */}
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-red-700 dark:text-red-400">
                  رافض
                </span>

                <UserX className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
              </div>

              <p className="mt-2 text-2xl font-bold text-red-700 dark:text-red-400">
                {tripResults.rejected}
              </p>
            </div>

            {/* Pending */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-amber-700 dark:text-amber-400">
                  بانتظار الرد
                </span>

                <Clock3 className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              </div>

              <p className="mt-2 text-2xl font-bold text-amber-700 dark:text-amber-400">
                {tripResults.pending}
              </p>
            </div>

            {/* Total paid */}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-emerald-700 dark:text-emerald-400">
                  إجمالي المبالغ المدفوعة
                </span>

                <Wallet className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              </div>

              <p className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                {formatFee(totalPaid)}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                دينار بحريني
              </p>
            </div>
          </div> 
         
          {showResults && (
            <div className="border-t">
              {/* جدول النتائج */}
              <TripResultsTable
                tripId={tripId}
                students={data.students.filter((student) => student.selected)}
                search={search}
                onSearchChange={setSearch}
                responseFilter={responseFilter}
                onResponseFilterChange={setResponseFilter}
                paymentInputs={paymentInputs}
                paymentStatus={paymentStatus}
                responseSavingId={responseSavingId}
                canEditParticipantData={canEditParticipantData}
                onPaymentChange={handlePaymentChange}
                onResponseChange={saveResponse}
                formatDateTime={formatDateTime}
                formatPayment={formatPayment}
              />
          
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
              {canEdit && (
                <div className="overflow-hidden rounded-xl border bg-card">
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
                                        )
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
                                        event.target.value as ResponseStatus
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
                                        student.response_source
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
                                      disabled={paymentSavingId === student.id}
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
                                        !canEdit ? 'cursor-not-allowed opacity-50' : ''
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
          
                    {/* Publish */}
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
                </div>
              )}
            </div>
          )}
