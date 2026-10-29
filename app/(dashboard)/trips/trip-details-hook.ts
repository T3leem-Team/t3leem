
'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { supabase } from '@/lib/supabase'
import {
  loadTripDetailsCache,
  setTripDetailsCache,
} from '@/lib/trips-cache'

import type {
  ApiResponse,
  Student,
} from './trip-types'

export function useTripDetails(tripId: string) {
  const [data, setData] =
    useState<ApiResponse | null>(null)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [closing, setClosing] = useState(false)

  const [paymentSavingId, setPaymentSavingId] =
    useState<string | null>(null)

  const [responseSavingId, setResponseSavingId] =
    useState<string | null>(null)

  const [directPublishAllowed, setDirectPublishAllowed] =
    useState(false)

  const [settingsLoading, setSettingsLoading] =
    useState(true)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState('all')
  const [showEligibleOnly, setShowEligibleOnly] =
    useState(true)

  const [selectedIds, setSelectedIds] =
    useState<string[]>([])

  const [showResults, setShowResults] = useState(false)

  const [responseFilter, setResponseFilter] =
    useState<
      'all' | 'accepted' | 'rejected' | 'pending'
    >('all')

  const [paymentInputs, setPaymentInputs] =
    useState<Record<string, string>>({})

  const [paymentStatus, setPaymentStatus] =
    useState<
      Record<string, 'saving' | 'saved' | 'error'>
    >({})

  const paymentTimers = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({})

  const canEdit =
    data?.trip.status !== 'closed' &&
    data?.trip.status !== 'published'

  const canEditParticipantData =
    data?.trip.status !== 'closed'

  const selectedCount = selectedIds.length

  const syncDetailsCache = useCallback(
    (nextData: ApiResponse) => {
      setTripDetailsCache(tripId, {
        trip: nextData.trip,
        course: nextData.course,
        levels: nextData.levels,
        lesson_dates: nextData.lesson_dates,
        students: nextData.students,
      })
    },
    [tripId],
  )

  const loadData = useCallback(
    async (options?: {
      silent?: boolean
      force?: boolean
    }) => {
      const silent = options?.silent ?? false
      const force = options?.force ?? false

      if (silent) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setError('')
      setSuccess('')

      try {
        const result = await loadTripDetailsCache(
          tripId,
          { force },
        )

        const nextData =
          result as unknown as ApiResponse

        setData(nextData)

        setSelectedIds(
          nextData.students
            .filter((student) => student.selected)
            .map((student) => student.id),
        )

        const nextPaymentInputs: Record<string, string> = {}

        nextData.students.forEach((student) => {
          nextPaymentInputs[student.id] =
            student.payment_amount > 0
              ? String(student.payment_amount)
              : ''
        })

        setPaymentInputs(nextPaymentInputs)
      } catch (err) {
        console.error('Load trip students error:', err)

        setError(
          err instanceof Error
            ? err.message
            : 'تعذر تحميل بيانات الرحلة.',
        )
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [tripId],
  )

  const loadPublishSetting = useCallback(async () => {
    setSettingsLoading(true)

    try {
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
    } finally {
      setSettingsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!tripId) return

    void loadData()
    void loadPublishSetting()
  }, [tripId, loadData, loadPublishSetting])

  useEffect(() => {
    return () => {
      Object.values(paymentTimers.current).forEach(
        (timer) => clearTimeout(timer),
      )
    }
  }, [])

  const eligibleStudents = useMemo(() => {
    if (!data) return []

    return data.students.filter(
      (student) => student.eligible,
    )
  }, [data])

  const filteredStudents = useMemo(() => {
    if (!data || !Array.isArray(data.students)) {
      return []
    }

    const normalizedSearch = search.trim().toLowerCase()

    return data.students.filter((student) => {
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
        typeof student.personal_id === 'string'
          ? student.personal_id
          : ''

      const phone =
        typeof student.phone === 'string'
          ? student.phone
          : ''

      const matchesSearch =
        !normalizedSearch ||
        name.toLowerCase().includes(normalizedSearch) ||
        personalId.toLowerCase().includes(normalizedSearch) ||
        phone.toLowerCase().includes(normalizedSearch)

      const matchesLevel =
        levelFilter === 'all' ||
        student.level?.id === levelFilter

      return matchesSearch && matchesLevel
    })
  }, [data, search, levelFilter, showEligibleOnly])

  const tripResults = useMemo(() => {
    const students =
      data?.students.filter((student) => student.selected) ?? []

    return {
      total: students.length,
      accepted: students.filter(
        (student) => student.response === 'accepted',
      ).length,
      rejected: students.filter(
        (student) => student.response === 'rejected',
      ).length,
      pending: students.filter(
        (student) => student.response === 'pending',
      ).length,
    }
  }, [data])

  const resultStudents = useMemo(
    () =>
      data?.students.filter(
        (student) => student.selected,
      ) ?? [],
    [data],
  )

  const totalPaid = useMemo(
    () =>
      data?.students
        .filter((student) => student.selected)
        .reduce(
          (sum, student) =>
            sum + Number(student.payment_amount ?? 0),
          0,
        ) ?? 0,
    [data],
  )

  function toggleStudent(studentId: string) {
    if (!canEdit) return

    setSelectedIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId],
    )
  }

  function selectAllVisible() {
    if (!canEdit) return

    setSelectedIds((current) => {
      const next = new Set(current)

      filteredStudents.forEach((student) => {
        if (student.eligible) {
          next.add(student.id)
        }
      })

      return Array.from(next)
    })
  }

  function clearVisibleSelection() {
    if (!canEdit) return

    const visibleIds = new Set(
      filteredStudents.map((student) => student.id),
    )

    setSelectedIds((current) =>
      current.filter((id) => !visibleIds.has(id)),
    )
  }

  async function saveStudents() {
    if (!data || !canEdit) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(
        `/api/trips/${encodeURIComponent(tripId)}/students`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            student_ids: selectedIds,
          }),
        },
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.error ?? 'تعذر حفظ الطلاب.')
      }

      setSuccess('تم حفظ الطلاب في الرحلة بنجاح.')

      await loadData({
        silent: true,
        force: true,
      })
    } catch (err) {
      console.error('Save trip students error:', err)

      setError(
        err instanceof Error
          ? err.message
          : 'تعذر حفظ الطلاب.',
      )
    } finally {
      setSaving(false)
    }
  }

  return {
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
    setSelectedIds,
    selectedCount,
    showResults,
    setShowResults,
    responseFilter,
    setResponseFilter,
    paymentInputs,
    setPaymentInputs,
    paymentStatus,
    setPaymentStatus,
    paymentTimers,
    canEdit,
    canEditParticipantData,
    eligibleStudents,
    filteredStudents,
    tripResults,
    resultStudents,
    totalPaid,
    loadData,
    loadPublishSetting,
    syncDetailsCache,
    toggleStudent,
    selectAllVisible,
    clearVisibleSelection,
    saveStudents,
  }
}
