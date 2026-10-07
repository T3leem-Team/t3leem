'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import {
  AlertTriangle,
  ArrowRight,
  Check,
  FileArchive,
  FileSpreadsheet,
  Filter,
  Loader2,
  RefreshCw,
  Settings2,
  Trash2,
  X,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'

import { PageHeader } from '@/components/dashboard/page-header'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'

import { EnrollmentImport } from './enrollment-import'
import { EnrollmentArchive } from './enrollment-archive'
import {
  DEFAULT_COLUMNS,
  EnrollmentTables,
  type ColumnKey,
  type CustomField,
  type CustomFieldValue,
  type Filters,
  type Level,
  type RegistrationRequest,
} from './enrollment-view-two'

const CURRENT_YEAR_KEY =
  'allow_add_to_current_year'

const ARCHIVE_KEY =
  'allow_add_to_archive'

const COLUMNS_STORAGE_KEY =
  't3leem_registration_requests_columns_v1'

const emptyFilters: Filters = {
  id: '',
  name: '',
  phone: '',
  submittedAt: '',
  status: '',
}

type EnrollmentCache = {
  requests: RegistrationRequest[]
  customFields: CustomField[]
  customFieldValues: CustomFieldValue[]
  levels: Level[]
  allowCurrentYearImport: boolean
  allowArchiveImport: boolean
}

const EMPTY_ENROLLMENT_CACHE: EnrollmentCache = {
  requests: [],
  customFields: [],
  customFieldValues: [],
  levels: [],
  allowCurrentYearImport: false,
  allowArchiveImport: false,
}

let enrollmentCache: EnrollmentCache | null =
  null

function updateEnrollmentCache(
  patch: Partial<EnrollmentCache>,
) {
  enrollmentCache = {
    ...(enrollmentCache ??
      EMPTY_ENROLLMENT_CACHE),
    ...patch,
  }
}

type Course = {
  id: string
  name: string
}

function mapRequest(
  row: any,
): RegistrationRequest {
  return {
    id: row.id ?? '',
    requestNumber:
      row.request_number ?? '',
    trackingToken:
      row.tracking_token ?? '',
    name: row.name ?? '',
    personalId:
      row.personal_id ?? '',
    gender: row.gender ?? '',
    age:
      typeof row.age === 'number'
        ? row.age
        : row.age !== null &&
            row.age !== undefined &&
            row.age !== ''
          ? Number(row.age)
          : null,
    phone: row.phone ?? '',
    whatsapp: row.whatsapp ?? '',

    guardianRelation:
      row.guardian_relation ?? '',
    studentPhone:
      row.student_phone ?? '',
    courseId:
      row.course_id ?? null,

    levelId:
      row.level_id ?? null,
    classId:
      row.class_id ?? null,
    notes: row.notes ?? '',
    healthNotes:
      row.health_notes ?? '',
    status:
      row.status ?? 'pending',
    processingMode:
      row.processing_mode ??
      'review',
    studentId:
      row.student_id ?? null,
    rejectionReason:
      row.rejection_reason ?? '',
    paymentMethod:
      row.payment_method ?? '',
    paymentAmount:
      row.payment_amount !== null &&
      row.payment_amount !== undefined
        ? Number(
            row.payment_amount,
          )
        : null,
    paymentReference:
      row.payment_reference ?? '',
    paymentProofUrl:
      row.payment_proof_url ?? '',
    paymentStatus:
      row.payment_status ??
      'not_required',
    verifiedPaymentAmount:
      row.verified_payment_amount !==
        null &&
      row.verified_payment_amount !==
        undefined
        ? Number(
            row.verified_payment_amount,
          )
        : null,
    paymentRejectionReason:
      row.payment_rejection_reason ??
      '',
    createdAt:
      row.created_at ?? '',
    source:
      row.source === 'import'
        ? 'import'
        : 'external',
  }
}

function hasHealthNotes(
  request: RegistrationRequest,
) {
  return (
    request.healthNotes.trim() !== ''
  )
}

function hasNotes(
  request: RegistrationRequest,
) {
  return request.notes.trim() !== ''
}

function hasSpecialInformation(
  request: RegistrationRequest,
) {
  return (
    hasHealthNotes(request) ||
    hasNotes(request)
  )
}

function getStatusLabel(
  status: RegistrationRequest['status'],
) {
  switch (status) {
    case 'pending':
      return 'قيد المراجعة'

    case 'under_review':
      return 'تحت المراجعة'

    case 'approved':
      return 'مقبول'

    case 'rejected':
      return 'مرفوض'

    case 'cancelled':
      return 'ملغي'

    default:
      return status
  }
}

function formatDate(value: string) {
  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(
    'ar-BH',
    {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    },
  ).format(date)
}

function formatAmount(
  value: number | null,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return '—'
  }

  return value.toFixed(3)
}

function getCustomFieldDisplayValue(
  field: CustomField,
  value: string | null | undefined,
) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '—'
  }

  if (field.field_type === 'boolean') {
    return value === 'true'
      ? 'نعم'
      : value === 'false'
        ? 'لا'
        : value
  }

  return value
}

type KeyRow = {
  key_name: string
  enabled: boolean
}

export function EnrollmentView() {
  const router = useRouter()

  const [requests, setRequests] =
    useState<RegistrationRequest[]>(
      enrollmentCache?.requests ?? [],
    )

  const [
    selectedRequest,
    setSelectedRequest,
  ] =
    useState<RegistrationRequest | null>(
      null,
    )

  const [
    selectedRequestIds,
    setSelectedRequestIds,
  ] = useState<string[]>([])

  const [
    bulkApproving,
    setBulkApproving,
  ] = useState(false)

  const [showReview, setShowReview] =
    useState(false)

  const [showImport, setShowImport] =
    useState(false)

  const [showArchive, setShowArchive] =
    useState(false)

  const [
    showColumnSettings,
    setShowColumnSettings,
  ] = useState(false)

  const [filters, setFilters] =
    useState<Filters>(emptyFilters)

  const [loading, setLoading] =
    useState(
      enrollmentCache === null,
    )

  const [saving, setSaving] =
    useState(false)

  const [statusMessage, setStatusMessage] =
    useState('')

  const [
    permissionsLoading,
    setPermissionsLoading,
  ] = useState(
    enrollmentCache === null,
  )

  const [
    allowCurrentYearImport,
    setAllowCurrentYearImport,
  ] = useState(
    enrollmentCache
      ?.allowCurrentYearImport ??
      false,
  )

  const [
    allowArchiveImport,
    setAllowArchiveImport,
  ] = useState(
    enrollmentCache
      ?.allowArchiveImport ??
      false,
  )

  const [customFields, setCustomFields] =
    useState<CustomField[]>(
      enrollmentCache?.customFields ??
        [],
    )

  const [
    customFieldValues,
    setCustomFieldValues,
  ] =
    useState<CustomFieldValue[]>(
      enrollmentCache?.customFieldValues ??
        [],
    )

  const [levels, setLevels] =
    useState<Level[]>(
      enrollmentCache?.levels ?? [],
    )

  const [courses, setCourses] =
    useState<Course[]>([])

  const [visibleColumns, setVisibleColumns] =
    useState<Record<string, boolean>>(
      DEFAULT_COLUMNS,
    )

  /*
   * =========================================================
   * Column settings
   * =========================================================
   */

  useEffect(() => {
    try {
      const saved =
        window.localStorage.getItem(
          COLUMNS_STORAGE_KEY,
        )

      if (!saved) {
        setVisibleColumns(
          DEFAULT_COLUMNS,
        )
        return
      }

      const parsed =
        JSON.parse(saved)

      if (
        parsed &&
        typeof parsed === 'object'
      ) {
        setVisibleColumns({
          ...DEFAULT_COLUMNS,
          ...parsed,
        })
      }
    } catch (error) {
      console.warn(
        'Could not load saved column settings:',
        error,
      )

      setVisibleColumns(
        DEFAULT_COLUMNS,
      )
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(
        COLUMNS_STORAGE_KEY,
        JSON.stringify(
          visibleColumns,
        ),
      )
    } catch (error) {
      console.warn(
        'Could not save saved column settings:',
        error,
      )
    }
  }, [visibleColumns])

  /*
   * =========================================================
   * Import permissions
   * =========================================================
   */

  const loadImportPermissions =
    async (
      options?: {
        silent?: boolean
      },
    ) => {
      const silent =
        options?.silent === true

      if (!silent) {
        setPermissionsLoading(
          true,
        )
      }

      const {
        data,
        error,
      } = await supabase
        .from('system_keys')
        .select(
          'key_name, enabled',
        )
        .in('key_name', [
          CURRENT_YEAR_KEY,
          ARCHIVE_KEY,
        ])

      if (error) {
        console.error(
          'Could not load import permissions:',
          error,
        )

        if (
          enrollmentCache === null
        ) {
          setAllowCurrentYearImport(
            false,
          )

          setAllowArchiveImport(
            false,
          )
        }

        setPermissionsLoading(false)

        return
      }

      const rows =
        (data ?? []) as KeyRow[]

      const currentYearRow =
        rows.find(
          (row) =>
            row.key_name ===
            CURRENT_YEAR_KEY,
        )

      const archiveRow =
        rows.find(
          (row) =>
            row.key_name ===
            ARCHIVE_KEY,
        )

      const nextAllowCurrentYearImport =
        currentYearRow?.enabled ===
        true

      const nextAllowArchiveImport =
        archiveRow?.enabled ===
        true

      setAllowCurrentYearImport(
        nextAllowCurrentYearImport,
      )

      setAllowArchiveImport(
        nextAllowArchiveImport,
      )

      updateEnrollmentCache({
        allowCurrentYearImport:
          nextAllowCurrentYearImport,
        allowArchiveImport:
          nextAllowArchiveImport,
      })

      setPermissionsLoading(false)
    }

  /*
   * =========================================================
   * Custom fields
   * =========================================================
   */

  const loadCustomFields =
    async () => {
      const {
        data,
        error,
      } = await supabase
        .from('custom_fields')
        .select(`
          id,
          name,
          field_type,
          available_in_registration,
          available_in_students,
          available_in_payments,
          sort_order,
          is_active
        `)
        .eq(
          'available_in_registration',
          true,
        )
        .eq(
          'is_active',
          true,
        )
        .order(
          'sort_order',
          {
            ascending: true,
          },
        )
        .order(
          'created_at',
          {
            ascending: true,
          },
        )

      if (error) {
        console.error(
          'Could not load custom fields:',
          error,
        )

        if (
          enrollmentCache === null
        ) {
          setCustomFields([])
        }

        return
      }

      const nextCustomFields =
        (data ?? []) as CustomField[]

      setCustomFields(
        nextCustomFields,
      )

      updateEnrollmentCache({
        customFields:
          nextCustomFields,
      })
    }

  /*
   * =========================================================
   * Levels
   * =========================================================
   */

  const loadLevels = async () => {
    const {
      data,
      error,
    } = await supabase
      .from('levels')
      .select('id, name')
      .order(
        'name',
        {
          ascending: true,
        },
      )

    if (error) {
      console.warn(
        'Could not load levels:',
        error,
      )

      if (
        enrollmentCache === null
      ) {
        setLevels([])
      }

      return
    }

    const nextLevels =
      (data ?? []) as Level[]

    setLevels(nextLevels)

    updateEnrollmentCache({
      levels: nextLevels,
    })
  }

  /*
   * =========================================================
   * Courses
   * =========================================================
   */

  const loadCourses = async () => {
    const {
      data,
      error,
    } = await supabase
      .from('courses')
      .select('id, name')
      .order('name', {
        ascending: true,
      })

    if (error) {
      console.warn(
        'Could not load courses:',
        error,
      )

      setCourses([])

      return
    }

    setCourses(
      (data ?? []) as Course[],
    )
  }

  /*
   * =========================================================
   * Custom field values
   * =========================================================
   */

  const loadCustomFieldValues =
    async (
      requestIds: string[],
    ) => {
      if (
        requestIds.length === 0
      ) {
        setCustomFieldValues([])

        updateEnrollmentCache({
          customFieldValues: [],
        })

        return
      }

      const {
        data,
        error,
      } = await supabase
        .from(
          'custom_field_values',
        )
        .select(`
          custom_field_id,
          record_type,
          record_id,
          value
        `)
        .eq(
          'record_type',
          'registration_request',
        )
        .in(
          'record_id',
          requestIds,
        )

      if (error) {
        console.warn(
          'Could not load custom field values:',
          error,
        )

        if (
          enrollmentCache === null
        ) {
          setCustomFieldValues([])
        }

        return
      }

      const nextValues =
        (data ?? []) as CustomFieldValue[]

      setCustomFieldValues(
        nextValues,
      )

      updateEnrollmentCache({
        customFieldValues:
          nextValues,
      })
    }

  /*
   * =========================================================
   * Registration requests
   * =========================================================
   */

  const loadRequests = async (
    options?: {
      silent?: boolean
    },
  ) => {
    const hasCache =
      enrollmentCache !== null

    if (!hasCache) {
      setLoading(true)
    }

    const {
      data: academicYear,
      error: academicYearError,
    } = await supabase
      .from('academic_years')
      .select('id, name')
      .eq('is_current', true)
      .eq('is_active', true)
      .maybeSingle()

    if (academicYearError) {
      console.error(
        'Could not load current academic year:',
        academicYearError,
      )

      setStatusMessage(
        `خطأ في تحميل السنة الأكاديمية الحالية: ${academicYearError.message}`,
      )

      if (!hasCache) {
        setRequests([])
        setCustomFieldValues([])
      }

      setLoading(false)

      return
    }

    if (!academicYear) {
      setStatusMessage(
        'لا توجد سنة أكاديمية حالية مفعلة.',
      )

      if (!hasCache) {
        setRequests([])
        setCustomFieldValues([])
      }

      setLoading(false)

      return
    }

    const {
      data,
      error,
    } = await supabase
      .from(
        'registration_requests',
      )
      .select(`
        id,
        request_number,
        tracking_token,
        name,
        personal_id,
        gender,
        age,
        phone,
        whatsapp,
        guardian_relation,
        student_phone,
        course_id,
        level_id,
        class_id,
        notes,
        health_notes,
        status,
        processing_mode,
        student_id,
        rejection_reason,
        payment_method,
        payment_amount,
        payment_reference,
        payment_proof_url,
        payment_status,
        verified_payment_amount,
        payment_rejection_reason,
        created_at,
        source,
        academic_year_id
      `)
      .eq(
        'academic_year_id',
        academicYear.id,
      )
      .order(
        'created_at',
        {
          ascending: false,
        },
      )

    if (error) {
      setStatusMessage(
        `خطأ في تحميل طلبات التسجيل: ${error.message}`,
      )

      if (!hasCache) {
        setRequests([])
        setCustomFieldValues([])
      }

      setLoading(false)

      return
    }

    const mappedRequests =
      (data ?? []).map(
        mapRequest,
      )

    setRequests(
      mappedRequests,
    )

    updateEnrollmentCache({
      requests:
        mappedRequests,
    })

    await loadCustomFieldValues(
      mappedRequests.map(
        (request) =>
          request.id,
      ),
    )

    setLoading(false)
  }

  /*
   * =========================================================
   * Initial page load
   * =========================================================
   */

  useEffect(() => {
    const loadPage = async () => {
      await Promise.all([
        loadRequests({
          silent:
            enrollmentCache !== null,
        }),
        loadImportPermissions({
          silent:
            enrollmentCache !== null,
        }),
        loadCustomFields(),
        loadLevels(),
        loadCourses(),
      ])
    }

    void loadPage()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /*
   * =========================================================
   * Filters
   * =========================================================
   */

  const updateFilter = (
    key: keyof Filters,
    value: string,
  ) => {
    setFilters(
      (current) => ({
        ...current,
        [key]: value,
      }),
    )
  }

  const clearFilters = () => {
    setFilters(
      emptyFilters,
    )
  }

  const filteredRequests =
    useMemo(() => {
      return requests.filter(
        (request) => {
          const matchesId =
            !filters.id ||
            request.requestNumber
              .toLowerCase()
              .includes(
                filters.id.toLowerCase(),
              ) ||
            request.id
              .toLowerCase()
              .includes(
                filters.id.toLowerCase(),
              )

          const matchesName =
            !filters.name ||
            request.name
              .toLowerCase()
              .includes(
                filters.name.toLowerCase(),
              )

          const matchesPhone =
            !filters.phone ||
            request.phone.includes(
              filters.phone,
            )

          const matchesDate =
            !filters.submittedAt ||
            formatDate(
              request.createdAt,
            ).includes(
              filters.submittedAt,
            )

          const matchesStatus =
            !filters.status ||
            request.status ===
              filters.status

          return (
            matchesId &&
            matchesName &&
            matchesPhone &&
            matchesDate &&
            matchesStatus
          )
        },
      )
    }, [
      requests,
      filters,
    ])

  const externalRequests =
    filteredRequests.filter(
      (request) =>
        request.source ===
        'external',
    )

  const importedRequests =
    filteredRequests.filter(
      (request) =>
        request.source ===
        'import',
    )

  const pendingCount =
    requests.filter(
      (request) =>
        request.status ===
          'pending' ||
        request.status ===
          'under_review',
    ).length

  const specialCount =
    requests.filter(
      (request) =>
        request.status !==
          'rejected' &&
        request.status !==
          'cancelled' &&
        hasSpecialInformation(
          request,
        ),
    ).length

  /*
   * =========================================================
   * Selection
   * =========================================================
   */

  const selectableRequests =
    filteredRequests.filter(
      (request) =>
        request.status ===
          'pending' ||
        request.status ===
          'under_review',
    )

  const toggleRequestSelection = (
    requestId: string,
  ) => {
    setSelectedRequestIds(
      (current) =>
        current.includes(requestId)
          ? current.filter(
              (id) =>
                id !== requestId,
            )
          : [
              ...current,
              requestId,
            ],
    )
  }

  const selectAllRequests = (
    selectedRequests: RegistrationRequest[],
  ) => {
    const ids =
      selectedRequests
        .filter(
          (request) =>
            request.status ===
              'pending' ||
            request.status ===
              'under_review',
        )
        .map(
          (request) =>
            request.id,
        )

    setSelectedRequestIds(ids)
  }

  const clearSelectedRequests = () => {
    setSelectedRequestIds([])
  }

  /*
   * =========================================================
   * Review
   * =========================================================
   */

  const openReview = (
    request: RegistrationRequest,
  ) => {
    setSelectedRequest(
      request,
    )

    setShowReview(true)
  }

  const closeReview = () => {
    if (saving) return

    setShowReview(false)
    setSelectedRequest(null)
  }

  /*
   * =========================================================
   * Approval helper
   * =========================================================
   */

  const approveRequestInternal =
    async (
      request: RegistrationRequest,
    ): Promise<{
      success: boolean
      alreadyProcessed: boolean
      errorMessage?: string
    }> => {
      if (
        request.status !==
          'pending' &&
        request.status !==
          'under_review'
      ) {
        return {
          success: false,
          alreadyProcessed: false,
          errorMessage:
            'الطلب لم يعد قابلاً للقبول.',
        }
      }

      if (!request.levelId) {
        return {
          success: false,
          alreadyProcessed: false,
          errorMessage:
            'المستوى الدراسي غير محدد.',
        }
      }

      try {
        const {
          data,
          error,
        } = await supabase.rpc(
          'approve_registration_request',
          {
            p_request_id:
              request.id,
          },
        )

        if (error) {
          console.error(
            'approve_registration_request error:',
            error,
          )

          return {
            success: false,
            alreadyProcessed: false,
            errorMessage:
              error.message,
          }
        }

        console.log(
          'approve_registration_request result:',
          data,
        )

        const studentId =
          data?.student_id ??
          null

        const alreadyProcessed =
          data?.already_processed ===
          true

        if (!studentId) {
          return {
            success: false,
            alreadyProcessed,
            errorMessage:
              'تم تنفيذ عملية الموافقة، لكن لم يتم إرجاع رقم الطالب.',
          }
        }

        const {
          error:
            studentUpdateError,
        } = await supabase
          .from('students')
          .update({
            source:
              'registration',
          })
          .eq(
            'id',
            studentId,
          )

        if (
          studentUpdateError
        ) {
          console.warn(
            'Could not update student source:',
            studentUpdateError,
          )
        }

        const {
          data: deletedRows,
          error: deleteError,
        } = await supabase
          .from(
            'registration_requests',
          )
          .delete()
          .eq(
            'id',
            request.id,
          )
          .select('id')

        if (deleteError) {
          console.error(
            'Could not delete approved request:',
            deleteError,
          )

          return {
            success: false,
            alreadyProcessed,
            errorMessage:
              `تم إنشاء الطالب، لكن تعذر حذف طلب التسجيل: ${deleteError.message}`,
          }
        }

        if (
          !deletedRows ||
          deletedRows.length === 0
        ) {
          console.error(
            'Registration request was NOT deleted:',
            {
              requestId:
                request.id,
              requestNumber:
                request.requestNumber,
              studentId,
              deletedRows,
              alreadyProcessed,
            },
          )

          return {
            success: false,
            alreadyProcessed,
            errorMessage:
              'تم إنشاء الطالب، لكن سجل طلب التسجيل لم يُحذف. تحقق من صلاحية DELETE أو RLS.',
          }
        }

        console.log(
          'Registration request deleted successfully:',
          {
            requestId:
              request.id,
            requestNumber:
              request.requestNumber,
            studentId,
            deletedRows,
          },
        )

        return {
          success: true,
          alreadyProcessed,
        }
      } catch (error) {
        console.error(
          'Unexpected approval error:',
          error,
        )

        return {
          success: false,
          alreadyProcessed: false,
          errorMessage:
            error instanceof Error
              ? error.message
              : 'خطأ غير معروف',
        }
      }
    }

  /*
   * =========================================================
   * Approve single request
   * =========================================================
   */

  const approveRequest =
    async (
      request: RegistrationRequest,
    ) => {
      if (
        request.status !==
          'pending' &&
        request.status !==
          'under_review'
      ) {
        return
      }

      if (!request.levelId) {
        setStatusMessage(
          'تعذر قبول الطلب: المستوى الدراسي غير محدد.',
        )

        return
      }

      const confirmed =
        window.confirm(
          `هل أنت متأكد من قبول طلب ${
            request.requestNumber ||
            request.name
          }؟\n\nسيتم إنشاء الطالب ونقله إلى قسم الطلاب.`,
        )

      if (!confirmed) return

      setSaving(true)

      setStatusMessage(
        'جاري قبول الطلب وترحيله إلى الطلاب...',
      )

      try {
        const result =
          await approveRequestInternal(
            request,
          )

        if (!result.success) {
          setStatusMessage(
            `تعذر ترحيل الطلب: ${
              result.errorMessage ??
              'خطأ غير معروف'
            }`,
          )

          return
        }

        setRequests(
          (current) => {
            const next =
              current.filter(
                (item) =>
                  item.id !==
                  request.id,
              )

            updateEnrollmentCache({
              requests: next,
            })

            return next
          },
        )

        setSelectedRequestIds(
          (current) =>
            current.filter(
              (id) =>
                id !== request.id,
            ),
        )

        setShowReview(false)
        setSelectedRequest(
          null,
        )

        setStatusMessage(
          result.alreadyProcessed
            ? 'الطلب كان مرحّل مسبقاً إلى الطلاب وتم تنظيف طلب التسجيل بنجاح ✅'
            : 'تم قبول الطلب وإنشاء الطالب ونقله إلى قسم الطلاب بنجاح ✅',
        )

        await loadRequests()
      } catch (error) {
        console.error(
          'Unexpected approval error:',
          error,
        )

        setStatusMessage(
          `حدث خطأ غير متوقع أثناء الترحيل: ${
            error instanceof Error
              ? error.message
              : 'خطأ غير معروف'
          }`,
        )
      } finally {
        setSaving(false)
      }
    }

  /*
   * =========================================================
   * Bulk approval
   * =========================================================
   */

  const approveSelectedRequests =
    async () => {
      const selectedRequests =
        requests.filter(
          (request) =>
            selectedRequestIds.includes(
              request.id,
            ) &&
            (request.status ===
              'pending' ||
              request.status ===
                'under_review'),
        )

      if (
        selectedRequests.length ===
        0
      ) {
        setStatusMessage(
          'لم يتم تحديد أي طلب قابل للقبول.',
        )

        return
      }

      const requestsWithoutLevel =
        selectedRequests.filter(
          (request) =>
            !request.levelId,
        )

      if (
        requestsWithoutLevel.length >
        0
      ) {
        setStatusMessage(
          `لا يمكن تنفيذ القبول الجماعي. يوجد ${requestsWithoutLevel.length} طلب بدون مستوى دراسي محدد.`,
        )

        return
      }

      const confirmed =
        window.confirm(
          `هل أنت متأكد من قبول ${selectedRequests.length} طلب؟\n\nسيتم إنشاء الطلاب وترحيلهم إلى قسم الطلاب.`,
        )

      if (!confirmed) {
        return
      }

      setBulkApproving(true)
      setSaving(true)

      setStatusMessage(
        `جاري قبول ${selectedRequests.length} طلب...`,
      )

      let successCount = 0
      let failedCount = 0
      let alreadyProcessedCount =
        0

      const failedRequests: string[] =
        []

      try {
        for (
          const request of selectedRequests
        ) {
          const result =
            await approveRequestInternal(
              request,
            )

          if (result.success) {
            successCount += 1

            if (
              result.alreadyProcessed
            ) {
              alreadyProcessedCount +=
                1
            }
          } else {
            failedCount += 1

            failedRequests.push(
              request.requestNumber ||
                request.name ||
                request.id,
            )
          }
        }

        setSelectedRequestIds([])

        await loadRequests()

        if (failedCount === 0) {
          if (
            alreadyProcessedCount >
            0
          ) {
            setStatusMessage(
              `تم قبول ${successCount} طلب بنجاح، منها ${alreadyProcessedCount} طلب كانت مرحّلة مسبقاً ✅`,
            )
          } else {
            setStatusMessage(
              `تم قبول وترحيل ${successCount} طلب بنجاح إلى قسم الطلاب ✅`,
            )
          }
        } else {
          setStatusMessage(
            `تم قبول ${successCount} طلب، وتعذر قبول ${failedCount} طلب. الطلبات التي تعذر قبولها بقيت في القائمة للمراجعة.`,
          )

          console.warn(
            'Bulk approval failed requests:',
            failedRequests,
          )
        }
      } catch (error) {
        console.error(
          'Unexpected bulk approval error:',
          error,
        )

        await loadRequests()

        setStatusMessage(
          `حدث خطأ أثناء القبول الجماعي. تم قبول ${successCount} طلب قبل حدوث الخطأ.`,
        )
      } finally {
        setBulkApproving(false)
        setSaving(false)
      }
    }

  /*
   * =========================================================
   * Approve all
   * =========================================================
   */

  const approveAllRequests =
    async () => {
      const allPendingRequests =
        requests.filter(
          (request) =>
            request.status ===
              'pending' ||
            request.status ===
              'under_review',
        )

      if (
        allPendingRequests.length ===
        0
      ) {
        setStatusMessage(
          'لا توجد طلبات قابلة للقبول.',
        )

        return
      }

      const requestsWithoutLevel =
        allPendingRequests.filter(
          (request) =>
            !request.levelId,
        )

      if (
        requestsWithoutLevel.length >
        0
      ) {
        setStatusMessage(
          `لا يمكن تنفيذ قبول الكل. يوجد ${requestsWithoutLevel.length} طلب بدون مستوى دراسي محدد.`,
        )

        return
      }

      const confirmed =
        window.confirm(
          `هل أنت متأكد من قبول جميع الطلبات القابلة للقبول؟\n\nعدد الطلبات: ${allPendingRequests.length}\n\nسيتم إنشاء الطلاب وترحيلهم إلى قسم الطلاب.`,
        )

      if (!confirmed) {
        return
      }

      setBulkApproving(true)
      setSaving(true)

      setStatusMessage(
        `جاري قبول جميع الطلبات (${allPendingRequests.length})...`,
      )

      let successCount = 0
      let failedCount = 0
      let alreadyProcessedCount =
        0

      const failedRequests: string[] =
        []

      try {
        for (
          const request of allPendingRequests
        ) {
          const result =
            await approveRequestInternal(
              request,
            )

          if (result.success) {
            successCount += 1

            if (
              result.alreadyProcessed
            ) {
              alreadyProcessedCount +=
                1
            }
          } else {
            failedCount += 1

            failedRequests.push(
              request.requestNumber ||
                request.name ||
                request.id,
            )
          }
        }

        setSelectedRequestIds([])

        await loadRequests()

        if (failedCount === 0) {
          if (
            alreadyProcessedCount >
            0
          ) {
            setStatusMessage(
              `تم قبول جميع الطلبات (${successCount}) بنجاح، منها ${alreadyProcessedCount} طلب كانت مرحّلة مسبقاً ✅`,
            )
          } else {
            setStatusMessage(
              `تم قبول وترحيل جميع الطلبات (${successCount}) بنجاح إلى قسم الطلاب ✅`,
            )
          }
        } else {
          setStatusMessage(
            `تم قبول ${successCount} طلب، وتعذر قبول ${failedCount} طلب. الطلبات التي تعذر قبولها بقيت في القائمة للمراجعة.`,
          )

          console.warn(
            'Approve all failed requests:',
            failedRequests,
          )
        }
      } catch (error) {
        console.error(
          'Unexpected approve all error:',
          error,
        )

        await loadRequests()

        setStatusMessage(
          `حدث خطأ أثناء قبول الكل. تم قبول ${successCount} طلب قبل حدوث الخطأ.`,
        )
      } finally {
        setBulkApproving(false)
        setSaving(false)
      }
    }

  /*
   * =========================================================
   * Reject
   * =========================================================
   */

  const rejectRequest =
    async (
      request: RegistrationRequest,
    ) => {
      if (
        request.status !==
          'pending' &&
        request.status !==
          'under_review'
      ) {
        return
      }

      const confirmed =
        window.confirm(
          `هل أنت متأكد من رفض طلب ${
            request.requestNumber ||
            request.name
          }؟`,
        )

      if (!confirmed) return

      setSaving(true)

      setStatusMessage(
        'جاري رفض الطلب...',
      )

      const {
        error,
      } = await supabase
        .from(
          'registration_requests',
        )
        .update({
          status:
            'rejected',
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          'id',
          request.id,
        )

      if (error) {
        setStatusMessage(
          `تعذر رفض الطلب: ${error.message}`,
        )

        setSaving(false)

        return
      }

      setRequests(
        (current) => {
          const next =
            current.map(
              (item) =>
                item.id ===
                request.id
                  ? {
                      ...item,
                      status:
                        'rejected',
                    }
                  : item,
            )

          updateEnrollmentCache({
            requests: next,
          })

          return next
        },
      )

      setSelectedRequestIds(
        (current) =>
          current.filter(
            (id) =>
              id !== request.id,
          ),
      )

      setSelectedRequest(
        (current) =>
          current?.id ===
          request.id
            ? {
                ...current,
                status:
                  'rejected',
              }
            : current,
      )

      setStatusMessage(
        'تم رفض الطلب.',
      )

      setSaving(false)
    }

  /*
   * =========================================================
   * Clear all registration requests
   * =========================================================
   */

  const clearAllRegistrationRequests =
    async () => {
      if (
        saving ||
        bulkApproving
      ) {
        return
      }

      if (requests.length === 0) {
        setStatusMessage(
          'لا توجد طلبات تسجيل لمسحها.',
        )

        return
      }

      const firstConfirmed =
        window.confirm(
          `⚠️ تنبيه مهم\n\nأنت على وشك مسح جميع طلبات التسجيل الموجودة في السنة الأكاديمية الحالية.\n\nعدد الطلبات: ${requests.length}\n\nسيتم حذف طلبات التسجيل فقط، ولن يتم حذف الطلاب أو التسجيلات أو المدفوعات.\n\nهل تريد المتابعة؟`,
        )

      if (!firstConfirmed) {
        return
      }

      const secondConfirmed =
        window.confirm(
          `⚠️ تأكيد نهائي\n\nسيتم حذف ${requests.length} طلب تسجيل نهائيًا ولا يمكن التراجع عن هذه العملية.\n\nاضغط "موافق" للمتابعة.`,
        )

      if (!secondConfirmed) {
        return
      }

      setSaving(true)

      setStatusMessage(
        'جاري مسح طلبات التسجيل...',
      )

      try {
        const {
          data: academicYear,
          error:
            academicYearError,
        } = await supabase
          .from('academic_years')
          .select('id')
          .eq('is_current', true)
          .eq('is_active', true)
          .maybeSingle()

        if (academicYearError) {
          throw new Error(
            `تعذر تحديد السنة الأكاديمية الحالية: ${academicYearError.message}`,
          )
        }

        if (!academicYear) {
          throw new Error(
            'لا توجد سنة أكاديمية حالية مفعلة.',
          )
        }

        const {
          data: requestRows,
          error:
            requestRowsError,
        } = await supabase
          .from(
            'registration_requests',
          )
          .select('id')
          .eq(
            'academic_year_id',
            academicYear.id,
          )

        if (requestRowsError) {
          throw new Error(
            `تعذر تحميل طلبات التسجيل: ${requestRowsError.message}`,
          )
        }

        const requestIds =
          (requestRows ?? []).map(
            (row) => row.id,
          )

        if (
          requestIds.length ===
          0
        ) {
          setRequests([])
          setSelectedRequestIds([])
          setCustomFieldValues([])
          setSelectedRequest(null)
          setShowReview(false)

          updateEnrollmentCache({
            requests: [],
            customFieldValues: [],
          })

          setStatusMessage(
            'لا توجد طلبات تسجيل لمسحها.',
          )

          return
        }

        /*
         * Delete custom field values first.
         * These belong specifically to registration requests.
         */
        const {
          error:
            customValuesError,
        } = await supabase
          .from(
            'custom_field_values',
          )
          .delete()
          .eq(
            'record_type',
            'registration_request',
          )
          .in(
            'record_id',
            requestIds,
          )

        if (customValuesError) {
          throw new Error(
            `تعذر مسح القيم الإضافية للطلبات: ${customValuesError.message}`,
          )
        }

        /*
         * Delete requests belonging to the current academic year only.
         */
        const {
          error: deleteError,
        } = await supabase
          .from(
            'registration_requests',
          )
          .delete()
          .eq(
            'academic_year_id',
            academicYear.id,
          )

        if (deleteError) {
          throw new Error(
            `تعذر مسح طلبات التسجيل: ${deleteError.message}`,
          )
        }

        /*
         * Clear local state
         */
        setRequests([])
        setSelectedRequestIds([])
        setCustomFieldValues([])
        setSelectedRequest(null)
        setShowReview(false)

        updateEnrollmentCache({
          requests: [],
          customFieldValues: [],
        })

        setStatusMessage(
          `تم مسح ${requestIds.length} طلب تسجيل بنجاح ✅`,
        )
      } catch (error) {
        console.error(
          'Clear registration requests error:',
          error,
        )

        setStatusMessage(
          error instanceof Error
            ? error.message
            : 'حدث خطأ أثناء مسح طلبات التسجيل.',
        )
      } finally {
        setSaving(false)
      }
    }

  /*
   * =========================================================
   * Columns
   * =========================================================
   */

  const hasFilters =
    Object.values(
      filters,
    ).some(Boolean)

  const customColumnKeys =
    useMemo(() => {
      return customFields.map(
        (field) =>
          `custom:${field.id}`,
      )
    }, [customFields])

  const getCustomFieldValue = (
    requestId: string,
    fieldId: string,
  ) => {
    const row =
      customFieldValues.find(
        (item) =>
          item.record_id ===
            requestId &&
          item.custom_field_id ===
            fieldId,
      )

    return row?.value ?? ''
  }

  const getLevelName = (
    levelId: string | null,
  ) => {
    if (!levelId) {
      return '—'
    }

    return (
      levels.find(
        (level) =>
          level.id === levelId,
      )?.name ??
      levelId
    )
  }

  const getCourseName = (
    courseId: string | null,
  ) => {
    if (!courseId) {
      return '—'
    }

    return (
      courses.find(
        (course) =>
          course.id === courseId,
      )?.name ??
      '—'
    )
  }

  const isCustomColumnVisible = (
    fieldId: string,
  ) => {
    const key =
      `custom:${fieldId}`

    return Boolean(
      visibleColumns[key],
    )
  }

  const setCustomColumnVisible = (
    fieldId: string,
    value: boolean,
  ) => {
    const key =
      `custom:${fieldId}`

    setVisibleColumns(
      (current) => ({
        ...current,
        [key]: value,
      }),
    )
  }

  const toggleBaseColumn = (
    key: ColumnKey,
  ) => {
    setVisibleColumns(
      (current) => ({
        ...current,
        [key]: !current[key],
      }),
    )
  }

  const resetColumnSettings = () => {
    const next: Record<
      string,
      boolean
    > = {
      ...DEFAULT_COLUMNS,
    }

    customColumnKeys.forEach(
      (key) => {
        next[key] = false
      },
    )

    setVisibleColumns(next)
  }

  return (
    <div
      className="space-y-6"
      dir="rtl"
    >
   

      <PageHeader
        title="طلبات التسجيل"
        description={`${pendingCount} طلب بانتظار المراجعة من إجمالي ${requests.length} طلب`}
      />

      {/* الإحصائيات والأزرار */}
      <div
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        dir="ltr"
      >
        {/* الإحصائيات - أقصى اليسار */}
        <div
          className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto"
          dir="rtl"
        >
          <div className="rounded-lg border bg-background px-3 py-2 text-sm">
            <span className="text-muted-foreground">
              بانتظار المراجعة:
            </span>{' '}
            <span className="font-semibold">
              {pendingCount}
            </span>
          </div>

          {specialCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <AlertTriangle className="size-4 shrink-0" />

              <span>
                {specialCount}{' '}
                طلب فيه ملاحظات أو معلومات صحية
              </span>
            </div>
          )}
        </div>

        {/* الأزرار - أقصى اليمين */}
        <div
          className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto"
          dir="rtl"
        >
          {!permissionsLoading &&
            allowCurrentYearImport && (
              <Button
                variant="outline"
                onClick={() =>
                  setShowImport(true)
                }
                className="shrink-0 whitespace-nowrap gap-2"
              >
                <FileSpreadsheet className="size-4" />
                استيراد سجل
              </Button>
            )}

          {!permissionsLoading &&
            allowArchiveImport && (
              <Button
                variant="outline"
                onClick={() =>
                  setShowArchive(true)
                }
                className="shrink-0 whitespace-nowrap gap-2"
              >
                <FileArchive className="size-4" />
                استيراد للأرشيف
              </Button>
            )}

          <Button
            variant="outline"
            onClick={() =>
              setShowColumnSettings(true)
            }
            className="shrink-0 whitespace-nowrap gap-2"
          >
            <Settings2 className="size-4" />
            تخصيص الأعمدة
          </Button>

          <Button
            variant="outline"
            onClick={
              clearAllRegistrationRequests
            }
            disabled={
              loading ||
              saving ||
              bulkApproving ||
              requests.length === 0
            }
            className="shrink-0 whitespace-nowrap gap-2 border-red-300 bg-red-50 text-red-700 hover:border-red-400 hover:bg-red-100 hover:text-red-800"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            مسح الطلبات
          </Button>

          <Button
            variant="outline"
            onClick={async () => {
              await Promise.all([
                loadRequests(),
                loadImportPermissions(),
                loadCustomFields(),
                loadLevels(),
                loadCourses(),
              ])
            }}
            disabled={
              loading ||
              permissionsLoading ||
              bulkApproving ||
              saving
            }
            className="shrink-0 whitespace-nowrap gap-2"
          >
            <RefreshCw
              className={`size-4 ${
                loading ||
                permissionsLoading ||
                bulkApproving ||
                saving
                  ? 'animate-spin'
                  : ''
              }`}
            />
            تحديث الطلبات
          </Button>
        </div>
      </div>

      {/* جدول طلبات التسجيل */}
      <Card>
        <CardContent className="p-0">
          <EnrollmentTables
            externalRequests={
              externalRequests
            }
            importedRequests={
              importedRequests
            }
            loading={loading}
            visibleColumns={
              visibleColumns
            }
            customFields={
              customFields
            }
            customFieldValues={
              customFieldValues
            }
            levels={levels}
            filters={filters}
            updateFilter={
              updateFilter
            }
            openReview={
              openReview
            }
            getLevelName={
              getLevelName
            }
            getCourseName={
              getCourseName
            }
            getCustomFieldValue={
              getCustomFieldValue
            }
            getCustomFieldDisplayValue={
              getCustomFieldDisplayValue
            }
            getStatusLabel={
              getStatusLabel
            }
            formatDate={
              formatDate
            }
            hasHealthNotes={
              hasHealthNotes
            }
            hasNotes={
              hasNotes
            }
            hasSpecialInformation={
              hasSpecialInformation
            }
            selectedRequestIds={
              selectedRequestIds
            }
            toggleRequestSelection={
              toggleRequestSelection
            }
            selectAllRequests={
              selectAllRequests
            }
            clearSelectedRequests={
              clearSelectedRequests
            }
            approveSelectedRequests={
              approveSelectedRequests
            }
            approveAllRequests={
              approveAllRequests
            }
            bulkApproving={
              bulkApproving
            }
          />

          {hasFilters && (
            <div
              className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              dir="rtl"
            >
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="size-4 shrink-0" />

                عرض{' '}
                {filteredRequests.length}{' '}
                من{' '}
                {requests.length}{' '}
                طلب
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={
                  clearFilters
                }
                className="shrink-0 whitespace-nowrap"
              >
                مسح الفلاتر
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* استيراد السجل */}
      {showImport && (
        <EnrollmentImport
          onClose={() => {
            setShowImport(false)
          }}
          onImported={async () => {
            setShowImport(false)

            await loadRequests()
          }}
        />
      )}

      {/* استيراد الأرشيف */}
      {showArchive && (
        <EnrollmentArchive
          onClose={() =>
            setShowArchive(false)
          }
        />
      )}

      {/* تخصيص الأعمدة */}
      {showColumnSettings && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-xl border bg-background shadow-xl"
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-lg font-semibold">
                  تخصيص أعمدة طلبات التسجيل
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  اختر الأعمدة التي تريد ظهورها في الجدول.
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  setShowColumnSettings(false)
                }
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-5">
              <div className="space-y-2">
                <div className="mb-3 text-sm font-semibold">
                  الحقول الأساسية
                </div>

                {Object.keys(
                  DEFAULT_COLUMNS,
                ).map((key) => {
                  const column =
                    {
                      name: 'اسم الطالب',
                      personal_id:
                        'الرقم الشخصي',
                      gender: 'الجنس',
                      age: 'العمر',
                      phone: 'رقم الهاتف',
                      whatsapp:
                        'الواتساب',
                      guardian_relation:
                        'صلة القرابة',
                      student_phone:
                        'رقم الطالب',
                      course:
                        'دورة الالتحاق',
                      level: 'المستوى',
                      created_at:
                        'تاريخ التقديم',
                      request_number:
                        'رقم الطلب',
                      status: 'الحالة',
                    }[key] ?? key

                  return (
                    <label
                      key={key}
                      className="flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-muted/40"
                    >
                      <span className="text-sm">
                        {column}
                      </span>

                      <input
                        type="checkbox"
                        checked={Boolean(
                          visibleColumns[key],
                        )}
                        onChange={() =>
                          toggleBaseColumn(
                            key as ColumnKey,
                          )
                        }
                        className="size-4"
                      />
                    </label>
                  )
                })}

                <div className="mb-3 mt-6 text-sm font-semibold">
                  الحقول الإضافية
                </div>

                {customFields.length ===
                0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                    لا توجد حقول إضافية مضافة للتسجيل حاليًا.
                  </div>
                ) : (
                  customFields.map(
                    (field) => (
                      <label
                        key={field.id}
                        className="flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-muted/40"
                      >
                        <div>
                          <div className="text-sm font-medium">
                            {field.name}
                          </div>

                          <div className="mt-1 text-xs text-muted-foreground">
                            {field.field_type ===
                            'text'
                              ? 'نص'
                              : field.field_type ===
                                  'number'
                                ? 'رقم'
                                : field.field_type ===
                                    'date'
                                  ? 'تاريخ'
                                  : field.field_type ===
                                      'select'
                                    ? 'اختيار'
                                    : field.field_type ===
                                        'boolean'
                                      ? 'نعم / لا'
                                      : field.field_type ===
                                          'textarea'
                                        ? 'نص طويل'
                                        : field.field_type}
                          </div>
                        </div>

                        <input
                          type="checkbox"
                          checked={isCustomColumnVisible(
                            field.id,
                          )}
                          onChange={(event) =>
                            setCustomColumnVisible(
                              field.id,
                              event.target.checked,
                            )
                          }
                          className="size-4"
                        />
                      </label>
                    ),
                  )
                )}
              </div>
            </div>

            <div
              className="flex items-center justify-between border-t p-4"
              dir="rtl"
            >
              <Button
                variant="ghost"
                onClick={
                  resetColumnSettings
                }
              >
                استعادة الافتراضي
              </Button>

              <Button
                onClick={() =>
                  setShowColumnSettings(false)
                }
              >
                تم
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* مراجعة الطلب */}
      {showReview &&
        selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div
              className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border bg-background shadow-xl"
              dir="rtl"
            >
              <div className="flex items-center justify-between border-b p-5">
                <div>
                  <h2 className="text-lg font-semibold">
                    مراجعة طلب التسجيل
                  </h2>

                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      {selectedRequest.requestNumber ||
                        selectedRequest.id}
                    </p>

                    {selectedRequest.source ===
                      'import' && (
                      <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                        مستورد من Excel
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeReview}
                  disabled={saving}
                >
                  <X className="size-4" />
                </Button>
              </div>

              <div className="space-y-5 p-5">
                {hasSpecialInformation(
                  selectedRequest,
                ) && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 size-5 shrink-0" />

                      <div>
                        <p className="font-semibold">
                          تنبيه: توجد معلومات تحتاج الانتباه
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2">
                          {hasHealthNotes(
                            selectedRequest,
                          ) && (
                            <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
                              🩺 يحتوي على معلومات صحية
                            </span>
                          )}

                          {hasNotes(
                            selectedRequest,
                          ) && (
                            <span className="rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                              📝 يحتوي على ملاحظات
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      اسم الطالب
                    </p>
                    <p className="mt-1 font-medium">
                      {selectedRequest.name ||
                        'غير مضاف'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      الرقم الشخصي
                    </p>
                    <p className="mt-1 font-medium tabular-nums">
                      {selectedRequest.personalId ||
                        'غير مضاف'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      صلة القرابة
                    </p>
                    <p className="mt-1 font-medium">
                      {selectedRequest.guardianRelation ||
                        'غير مضاف'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      رقم الطالب
                    </p>
                    <p className="mt-1 font-medium tabular-nums">
                      {selectedRequest.studentPhone ||
                        'غير مضاف'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      العمر
                    </p>
                    <p className="mt-1 font-medium">
                      {selectedRequest.age ??
                        'غير مضاف'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      الجنس
                    </p>
                    <p className="mt-1 font-medium">
                      {selectedRequest.gender ||
                        'غير مضاف'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      رقم الهاتف
                    </p>
                    <p className="mt-1 font-medium tabular-nums">
                      {selectedRequest.phone ||
                        'غير مضاف'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      الواتساب
                    </p>
                    <p className="mt-1 font-medium tabular-nums">
                      {selectedRequest.whatsapp ||
                        'غير مضاف'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      المستوى
                    </p>
                    <p className="mt-1 font-medium">
                      {getLevelName(
                        selectedRequest.levelId,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      دورة الالتحاق
                    </p>
                    <p className="mt-1 font-medium">
                      {getCourseName(
                        selectedRequest.courseId,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      تاريخ التقديم
                    </p>
                    <p className="mt-1 font-medium">
                      {formatDate(
                        selectedRequest.createdAt,
                      )}
                    </p>
                  </div>
                </div>

                {customFields.length > 0 && (
                  <div className="rounded-lg border p-4">
                    <p className="text-sm font-medium">
                      الحقول الإضافية
                    </p>

                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      {customFields.map(
                        (field) => {
                          const value =
                            getCustomFieldValue(
                              selectedRequest.id,
                              field.id,
                            )

                          return (
                            <div
                              key={field.id}
                            >
                              <p className="text-xs text-muted-foreground">
                                {field.name}
                              </p>

                              <p className="mt-1 whitespace-pre-wrap font-medium">
                                {getCustomFieldDisplayValue(
                                  field,
                                  value,
                                )}
                              </p>
                            </div>
                          )
                        },
                      )}
                    </div>
                  </div>
                )}

                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium">
                    المعلومات الصحية
                  </p>

                  <p
                    className={`mt-2 whitespace-pre-wrap text-sm ${
                      hasHealthNotes(
                        selectedRequest,
                      )
                        ? 'font-medium text-rose-700'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {selectedRequest.healthNotes ||
                      'لا توجد معلومات صحية'}
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium">
                    الملاحظات
                  </p>

                  <p
                    className={`mt-2 whitespace-pre-wrap text-sm ${
                      hasNotes(
                        selectedRequest,
                      )
                        ? 'font-medium text-amber-800'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {selectedRequest.notes ||
                      'لا توجد ملاحظات'}
                  </p>
                </div>

                {selectedRequest.paymentMethod && (
                  <div className="rounded-lg border p-4">
                    <p className="text-sm font-medium">
                      بيانات الدفع
                    </p>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          طريقة الدفع
                        </p>
                        <p className="mt-1 font-medium">
                          {
                            selectedRequest.paymentMethod
                          }
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          المبلغ المدخل
                        </p>
                        <p className="mt-1 font-medium tabular-nums">
                          {formatAmount(
                            selectedRequest.paymentAmount,
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          المرجع
                        </p>
                        <p className="mt-1 font-medium">
                          {selectedRequest.paymentReference ||
                            '—'}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          حالة الدفع
                        </p>
                        <p className="mt-1 font-medium">
                          {selectedRequest.paymentStatus ===
                          'verified'
                            ? 'تم التحقق'
                            : selectedRequest.paymentStatus ===
                                'rejected'
                              ? 'مرفوض'
                              : selectedRequest.paymentStatus ===
                                  'pending'
                                ? 'بانتظار التحقق'
                                : 'غير مطلوب'}
                        </p>
                      </div>
                    </div>

                    {selectedRequest.paymentProofUrl && (
                      <a
                        href={
                          selectedRequest.paymentProofUrl
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 inline-flex text-sm font-medium text-primary underline"
                      >
                        عرض إثبات الدفع
                      </a>
                    )}
                  </div>
                )}

                {selectedRequest.rejectionReason && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-900">
                    <p className="text-sm font-medium">
                      سبب الرفض
                    </p>

                    <p className="mt-2 text-sm">
                      {
                        selectedRequest.rejectionReason
                      }
                    </p>
                  </div>
                )}

                {/* أزرار المراجعة */}
                <div
                  className="flex flex-wrap items-center justify-start gap-2 border-t pt-4"
                  dir="rtl"
                >
                  <Button
                    variant="ghost"
                    onClick={closeReview}
                    disabled={saving}
                    className="shrink-0 whitespace-nowrap"
                  >
                    إغلاق
                  </Button>

                  {(selectedRequest.status ===
                    'pending' ||
                    selectedRequest.status ===
                      'under_review') && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() =>
                          rejectRequest(
                            selectedRequest,
                          )
                        }
                        disabled={
                          saving ||
                          bulkApproving
                        }
                        className="shrink-0 whitespace-nowrap gap-2 border-red-300 text-red-700 hover:border-red-400 hover:bg-red-50 hover:text-red-800"
                      >
                        {saving ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <X className="size-4" />
                        )}
                        رفض الطلب
                      </Button>

                      <Button
                        onClick={() =>
                          approveRequest(
                            selectedRequest,
                          )
                        }
                        disabled={
                          saving ||
                          bulkApproving
                        }
                        className="shrink-0 whitespace-nowrap gap-2"
                      >
                        {saving ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Check className="size-4" />
                        )}
                        قبول وترحيل للطلاب
                      </Button>
                    </>
                  )}

                  {selectedRequest.status ===
                    'approved' && (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
                      <Check className="size-4" />
                      تم قبول الطلب وترحيله للطلاب
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}
