'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Check,
  Eye,
  FileArchive,
  FileSpreadsheet,
  Filter,
  Loader2,
  RefreshCw,
  Settings2,
  X,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'

import { PageHeader } from '@/components/dashboard/page-header'
import { StatusBadge } from '@/components/dashboard/status-badge'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'

import { EnrollmentImport } from './enrollment-import'
import { EnrollmentArchive } from './enrollment-archive'

type RegistrationRequest = {
  id: string
  requestNumber: string
  trackingToken: string
  name: string
  personalId: string
  gender: string
  age: number | null
  phone: string
  whatsapp: string
  levelId: string | null
  classId: string | null
  notes: string
  healthNotes: string
  status:
    | 'pending'
    | 'under_review'
    | 'approved'
    | 'rejected'
    | 'cancelled'
  processingMode: 'review' | 'direct'
  studentId: string | null
  rejectionReason: string
  paymentMethod: string
  paymentAmount: number | null
  paymentReference: string
  paymentProofUrl: string
  paymentStatus:
    | 'not_required'
    | 'pending'
    | 'verified'
    | 'rejected'
  verifiedPaymentAmount: number | null
  paymentRejectionReason: string
  createdAt: string
  source: 'external' | 'import'
}

type Filters = {
  id: string
  name: string
  phone: string
  submittedAt: string
  status: string
}

type KeyRow = {
  key_name: string
  enabled: boolean
}

type CustomField = {
  id: string
  name: string
  field_type: string
  available_in_registration: boolean
  available_in_students: boolean
  available_in_payments: boolean
  sort_order: number
  is_active: boolean
}

type CustomFieldValue = {
  custom_field_id: string
  record_type: string
  record_id: string
  value: string | null
}

type Level = {
  id: string
  name: string
}

type ColumnKey =
  | 'name'
  | 'personal_id'
  | 'gender'
  | 'age'
  | 'phone'
  | 'whatsapp'
  | 'level'
  | 'created_at'
  | 'request_number'
  | 'status'

type ColumnDefinition = {
  key: ColumnKey
  label: string
  defaultVisible: boolean
  fixed?: boolean
}

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

const inputClass =
  'h-9 w-full min-w-[120px] rounded-md border border-input bg-background px-2 text-xs'

const selectClass =
  'h-9 w-full min-w-[130px] rounded-md border border-input bg-background px-2 text-xs'

const DEFAULT_COLUMNS: Record<ColumnKey, boolean> = {
  name: true,
  personal_id: true,
  gender: false,
  age: false,
  phone: true,
  whatsapp: true,
  level: true,
  created_at: false,
  request_number: false,
  status: true,
}

const BASE_COLUMNS: ColumnDefinition[] = [
  {
    key: 'name',
    label: 'اسم الطالب',
    defaultVisible: true,
  },
  {
    key: 'personal_id',
    label: 'الرقم الشخصي',
    defaultVisible: true,
  },
  {
    key: 'gender',
    label: 'الجنس',
    defaultVisible: false,
  },
  {
    key: 'age',
    label: 'العمر',
    defaultVisible: false,
  },
  {
    key: 'phone',
    label: 'رقم الهاتف',
    defaultVisible: true,
  },
  {
    key: 'whatsapp',
    label: 'الواتساب',
    defaultVisible: true,
  },
  {
    key: 'level',
    label: 'المستوى',
    defaultVisible: true,
  },
  {
    key: 'created_at',
    label: 'تاريخ التقديم',
    defaultVisible: false,
  },
  {
    key: 'request_number',
    label: 'رقم الطلب',
    defaultVisible: false,
  },
  {
    key: 'status',
    label: 'الحالة',
    defaultVisible: true,
  },
]

function mapRequest(row: any): RegistrationRequest {
  return {
    id: row.id ?? '',
    requestNumber: row.request_number ?? '',
    trackingToken: row.tracking_token ?? '',
    name: row.name ?? '',
    personalId: row.personal_id ?? '',
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
    levelId: row.level_id ?? null,
    classId: row.class_id ?? null,
    notes: row.notes ?? '',
    healthNotes: row.health_notes ?? '',
    status:
      row.status ?? 'pending',
    processingMode:
      row.processing_mode ?? 'review',
    studentId:
      row.student_id ?? null,
    rejectionReason:
      row.rejection_reason ?? '',
    paymentMethod:
      row.payment_method ?? '',
    paymentAmount:
      row.payment_amount !== null &&
      row.payment_amount !== undefined
        ? Number(row.payment_amount)
        : null,
    paymentReference:
      row.payment_reference ?? '',
    paymentProofUrl:
      row.payment_proof_url ?? '',
    paymentStatus:
      row.payment_status ??
      'not_required',
    verifiedPaymentAmount:
      row.verified_payment_amount !== null &&
      row.verified_payment_amount !== undefined
        ? Number(row.verified_payment_amount)
        : null,
    paymentRejectionReason:
      row.payment_rejection_reason ?? '',
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
  return request.healthNotes.trim() !== ''
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

export function EnrollmentView() {
  const [requests, setRequests] =
    useState<RegistrationRequest[]>([])

  const [selectedRequest, setSelectedRequest] =
    useState<RegistrationRequest | null>(null)

  const [showReview, setShowReview] =
    useState(false)

  const [showImport, setShowImport] =
    useState(false)

  const [showArchive, setShowArchive] =
    useState(false)

  const [showColumnSettings, setShowColumnSettings] =
    useState(false)

  const [filters, setFilters] =
    useState<Filters>(emptyFilters)

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [statusMessage, setStatusMessage] =
    useState('')

  const [permissionsLoading, setPermissionsLoading] =
    useState(true)

  const [allowCurrentYearImport, setAllowCurrentYearImport] =
    useState(false)

  const [allowArchiveImport, setAllowArchiveImport] =
    useState(false)

  const [customFields, setCustomFields] =
    useState<CustomField[]>([])

  const [customFieldValues, setCustomFieldValues] =
    useState<CustomFieldValue[]>([])

  const [levels, setLevels] =
    useState<Level[]>([])

  const [visibleColumns, setVisibleColumns] =
    useState<Record<ColumnKey, boolean>>(
      DEFAULT_COLUMNS,
    )

  /*
   * تحميل تخصيص الأعمدة من المتصفح.
   *
   * القيم الافتراضية:
   * الاسم، الرقم الشخصي، الهاتف، الواتساب،
   * المستوى، الحالة.
   *
   * الجنس والعمر والتاريخ ورقم الطلب مخفية.
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

  /*
   * حفظ تخصيص الأعمدة.
   */
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
        'Could not save column settings:',
        error,
      )
    }
  }, [visibleColumns])

  const loadImportPermissions = async () => {
    setPermissionsLoading(true)

    const {
      data,
      error,
    } = await supabase
      .from('system_keys')
      .select('key_name, enabled')
      .in('key_name', [
        CURRENT_YEAR_KEY,
        ARCHIVE_KEY,
      ])

    if (error) {
      console.error(
        'Could not load import permissions:',
        error,
      )

      setAllowCurrentYearImport(false)
      setAllowArchiveImport(false)
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

    setAllowCurrentYearImport(
      currentYearRow?.enabled === true,
    )

    setAllowArchiveImport(
      archiveRow?.enabled === true,
    )

    setPermissionsLoading(false)
  }

  const loadCustomFields = async () => {
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

      setCustomFields([])

      return
    }

    setCustomFields(
      (data ?? []) as CustomField[],
    )
  }

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

      setLevels([])

      return
    }

    setLevels(
      (data ?? []) as Level[],
    )
  }

  const loadCustomFieldValues = async (
    requestIds: string[],
  ) => {
    if (requestIds.length === 0) {
      setCustomFieldValues([])
      return
    }

    const {
      data,
      error,
    } = await supabase
      .from('custom_field_values')
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

      setCustomFieldValues([])

      return
    }

    setCustomFieldValues(
      (data ?? []) as CustomFieldValue[],
    )
  }

  const loadRequests = async () => {
    setLoading(true)

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
        source
      `)
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

      setRequests([])
      setCustomFieldValues([])
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

    await loadCustomFieldValues(
      mappedRequests.map(
        (request) =>
          request.id,
      ),
    )

    setLoading(false)
  }

  useEffect(() => {
    const loadPage = async () => {
      await Promise.all([
        loadRequests(),
        loadImportPermissions(),
        loadCustomFields(),
        loadLevels(),
      ])
    }

    loadPage()
  }, [])

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

          setStatusMessage(
            `تعذر ترحيل الطلب: ${error.message}`,
          )

          return
        }

        const studentId =
          data?.student_id ??
          null

        const alreadyProcessed =
          data?.already_processed ===
          true

        if (studentId) {
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
        }

        const {
          error:
            deleteError,
        } = await supabase
          .from(
            'registration_requests',
          )
          .delete()
          .eq(
            'id',
            request.id,
          )

        if (deleteError) {
          console.error(
            'Could not delete approved request:',
            deleteError,
          )

          setStatusMessage(
            'تم إنشاء الطالب بنجاح، لكن تعذر حذف طلب التسجيل من قائمة الطلبات. سيتم إعادة المحاولة لاحقاً.',
          )

          await loadRequests()

          return
        }

        setShowReview(false)
        setSelectedRequest(
          null,
        )

        setStatusMessage(
          alreadyProcessed
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
        (current) =>
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

  const hasFilters =
    Object.values(
      filters,
    ).some(Boolean)

  /*
   * الأعمدة الأساسية.
   *
   * # ليس عمودًا قابلًا للإخفاء.
   * وهو مجرد تسلسل للصفوف.
   */
  const allBaseColumns =
    useMemo(
      () => BASE_COLUMNS,
      [],
    )

  /*
   * أي Custom Field جديد متاح في التسجيل
   * يظهر تلقائيًا في التخصيص.
   *
   * لكنه لا يظهر افتراضيًا في الجدول.
   */
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

  const isCustomColumnVisible = (
    fieldId: string,
  ) => {
    const key =
      `custom:${fieldId}`

    return Boolean(
      (
        visibleColumns as Record<
          string,
          boolean
        >
      )[key],
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

    setVisibleColumns(
      next as Record<
        ColumnKey,
        boolean
      >,
    )
  }

  /*
   * عدد الأعمدة الظاهرة فعليًا.
   *
   * # + الأعمدة الأساسية + الحقول المخصصة
   * + الإجراء.
   */
  const visibleBaseColumnCount =
    allBaseColumns.filter(
      (column) =>
        visibleColumns[
          column.key
        ],
    ).length

  const visibleCustomColumnCount =
    customFields.filter(
      (field) =>
        isCustomColumnVisible(
          field.id,
        ),
    ).length

  const renderCell = (
    request: RegistrationRequest,
    column: ColumnKey,
  ) => {
    switch (column) {
      case 'name':
        return (
          <span className="font-medium">
            {request.name ||
              '—'}
          </span>
        )

      case 'personal_id':
        return (
          <span className="tabular-nums">
            {request.personalId ||
              '—'}
          </span>
        )

      case 'gender':
        return (
          <span>
            {request.gender ||
              '—'}
          </span>
        )

      case 'age':
        return (
          <span>
            {request.age ??
              '—'}
          </span>
        )

      case 'phone':
        return (
          <span className="tabular-nums">
            {request.phone ||
              '—'}
          </span>
        )

      case 'whatsapp':
        return (
          <span className="tabular-nums">
            {request.whatsapp ||
              '—'}
          </span>
        )

      case 'level':
        return (
          <span>
            {getLevelName(
              request.levelId,
            )}
          </span>
        )

      case 'created_at':
        return (
          <span>
            {formatDate(
              request.createdAt,
            )}
          </span>
        )

      case 'request_number':
        return (
          <span className="tabular-nums">
            {request.requestNumber ||
              request.id ||
              '—'}
          </span>
        )

      case 'status':
        return (
          <StatusBadge
            status={getStatusLabel(
              request.status,
            )}
          />
        )

      default:
        return null
    }
  }

  const renderTable = (
    tableRequests: RegistrationRequest[],
  ) => {
    const visibleColumns =
      allBaseColumns.filter(
        (column) =>
          visibleColumns[
            column.key
          ],
      )

    const visibleCustomFields =
      customFields.filter(
        (field) =>
          isCustomColumnVisible(
            field.id,
          ),
      )

    const totalColumns =
      1 +
      visibleColumns.length +
      visibleCustomFields.length +
      1

    if (loading) {
      return (
        <tr>
          <td
            colSpan={totalColumns}
            className="px-4 py-12 text-center"
          >
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              جاري تحميل طلبات التسجيل...
            </div>
          </td>
        </tr>
      )
    }

    if (
      tableRequests.length ===
      0
    ) {
      return (
        <tr>
          <td
            colSpan={totalColumns}
            className="px-4 py-12 text-center text-muted-foreground"
          >
            لا توجد طلبات في هذا القسم.
          </td>
        </tr>
      )
    }

    return tableRequests.map(
      (request, index) => {
        const hasHealth =
          hasHealthNotes(
            request,
          )

        const hasRequestNotes =
          hasNotes(request)

        const special =
          hasSpecialInformation(
            request,
          )

        return (
          <tr
            key={request.id}
            className={`border-b last:border-0 transition-colors ${
              special
                ? 'bg-amber-50/70 hover:bg-amber-100/70'
                : 'hover:bg-muted/30'
            }`}
          >
            {/* التسلسل */}
            <td className="px-4 py-4 text-center text-muted-foreground tabular-nums">
              {index + 1}
            </td>

            {visibleColumns.map(
              (column) => (
                <td
                  key={
                    column.key
                  }
                  className={`px-4 py-4 ${
                    column.key ===
                    'created_at'
                      ? 'text-muted-foreground'
                      : ''
                  }`}
                >
                  {renderCell(
                    request,
                    column.key,
                  )}

                  {column.key ===
                    'request_number' &&
                    special && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {hasHealth && (
                          <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">
                            🩺 معلومات صحية
                          </span>
                        )}

                        {hasRequestNotes && (
                          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                            📝 ملاحظات
                          </span>
                        )}
                      </div>
                    )}

                  {column.key ===
                    'name' &&
                    special && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {hasHealth && (
                          <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">
                            🩺 معلومات صحية
                          </span>
                        )}

                        {hasRequestNotes && (
                          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                            📝 ملاحظات
                          </span>
                        )}
                      </div>
                    )}
                </td>
              ),
            )}

            {visibleCustomFields.map(
              (field) => (
                <td
                  key={
                    field.id
                  }
                  className="px-4 py-4"
                >
                  {getCustomFieldDisplayValue(
                    field,
                    getCustomFieldValue(
                      request.id,
                      field.id,
                    ),
                  )}
                </td>
              ),
            )}

            <td className="px-4 py-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  openReview(
                    request,
                  )
                }
                className="gap-2"
              >
                <Eye className="size-4" />
                مراجعة
              </Button>
            </td>
          </tr>
        )
      },
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="طلبات التسجيل"
        description={`${pendingCount} طلب بانتظار المراجعة من إجمالي ${requests.length} طلب`}
      />

      {statusMessage && (
        <div
          className={`rounded-lg border p-4 text-sm ${
            statusMessage.includes(
              'خطأ',
            ) ||
            statusMessage.includes(
              'تعذر',
            )
              ? 'border-red-200 bg-red-50 text-red-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          {statusMessage}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-lg border bg-background px-3 py-2 text-sm">
            <span className="text-muted-foreground">
              بانتظار المراجعة:
            </span>{' '}
            <span className="font-semibold">
              {pendingCount}
            </span>
          </div>

          {specialCount >
            0 && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <AlertTriangle className="size-4" />

              <span>
                {specialCount}{' '}
                طلب فيه ملاحظات أو معلومات صحية
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {!permissionsLoading &&
            allowCurrentYearImport && (
              <Button
                variant="outline"
                onClick={() =>
                  setShowImport(true)
                }
                className="gap-2"
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
                className="gap-2"
              >
                <FileArchive className="size-4" />
                استيراد للأرشيف
              </Button>
            )}

          <Button
            variant="outline"
            onClick={() =>
              setShowColumnSettings(
                true,
              )
            }
            className="gap-2"
          >
            <Settings2 className="size-4" />
            تخصيص الأعمدة
          </Button>

          <Button
            variant="outline"
            onClick={async () => {
              await Promise.all([
                loadRequests(),
                loadImportPermissions(),
                loadCustomFields(),
                loadLevels(),
              ])
            }}
            disabled={
              loading ||
              permissionsLoading
            }
            className="gap-2"
          >
            <RefreshCw
              className={`size-4 ${
                loading ||
                permissionsLoading
                  ? 'animate-spin'
                  : ''
              }`}
            />
            تحديث الطلبات
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  {/* التسلسل */}
                  <th className="w-16 px-4 py-3 text-center font-medium">
                    #
                  </th>

                  {allBaseColumns
                    .filter(
                      (column) =>
                        visibleColumns[
                          column.key
                        ],
                    )
                    .map(
                      (column) => (
                        <th
                          key={
                            column.key
                          }
                          className="px-4 py-3 text-right font-medium"
                        >
                          <div className="space-y-2">
                            <div>
                              {
                                column.label
                              }
                            </div>

                            {column.key ===
                              'name' && (
                              <input
                                value={
                                  filters.name
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateFilter(
                                    'name',
                                    event
                                      .target
                                      .value,
                                  )
                                }
                                placeholder="بحث"
                                className={
                                  inputClass
                                }
                              />
                            )}

                            {column.key ===
                              'phone' && (
                              <input
                                value={
                                  filters.phone
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateFilter(
                                    'phone',
                                    event
                                      .target
                                      .value,
                                  )
                                }
                                placeholder="بحث"
                                className={
                                  inputClass
                                }
                              />
                            )}

                            {column.key ===
                              'request_number' && (
                              <input
                                value={
                                  filters.id
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateFilter(
                                    'id',
                                    event
                                      .target
                                      .value,
                                  )
                                }
                                placeholder="بحث"
                                className={
                                  inputClass
                                }
                              />
                            )}

                            {column.key ===
                              'created_at' && (
                              <input
                                value={
                                  filters.submittedAt
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateFilter(
                                    'submittedAt',
                                    event
                                      .target
                                      .value,
                                  )
                                }
                                placeholder="بحث"
                                className={
                                  inputClass
                                }
                              />
                            )}

                            {column.key ===
                              'status' && (
                              <select
                                value={
                                  filters.status
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateFilter(
                                    'status',
                                    event
                                      .target
                                      .value,
                                  )
                                }
                                className={
                                  selectClass
                                }
                              >
                                <option value="">
                                  جميع الحالات
                                </option>

                                <option value="pending">
                                  قيد المراجعة
                                </option>

                                <option value="under_review">
                                  تحت المراجعة
                                </option>

                                <option value="approved">
                                  مقبول
                                </option>

                                <option value="rejected">
                                  مرفوض
                                </option>

                                <option value="cancelled">
                                  ملغي
                                </option>
                              </select>
                            )}
                          </div>
                        </th>
                      ),
                    )}

                  {customFields
                    .filter(
                      (field) =>
                        isCustomColumnVisible(
                          field.id,
                        ),
                    )
                    .map(
                      (field) => (
                        <th
                          key={
                            field.id
                          }
                          className="px-4 py-3 text-right font-medium"
                        >
                          {field.name}
                        </th>
                      ),
                    )}

                  <th className="px-4 py-3 text-right font-medium">
                    الإجراء
                  </th>
                </tr>
              </thead>

              <tbody>
                {renderTable(
                  externalRequests,
                )}
              </tbody>
            </table>
          </div>

          {importedRequests.length >
            0 && (
            <div className="border-t">
              <div className="flex items-center gap-2 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">
                <FileSpreadsheet className="size-4" />

                الطلبات المستوردة من Excel

                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs">
                  {
                    importedRequests.length
                  }
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="w-16 px-4 py-3 text-center font-medium">
                        #
                      </th>

                      {allBaseColumns
                        .filter(
                          (column) =>
                            visibleColumns[
                              column.key
                            ],
                        )
                        .map(
                          (column) => (
                            <th
                              key={
                                column.key
                              }
                              className="px-4 py-3 text-right font-medium"
                            >
                              {
                                column.label
                              }
                            </th>
                          ),
                        )}

                      {customFields
                        .filter(
                          (field) =>
                            isCustomColumnVisible(
                              field.id,
                            ),
                        )
                        .map(
                          (field) => (
                            <th
                              key={
                                field.id
                              }
                              className="px-4 py-3 text-right font-medium"
                            >
                              {
                                field.name
                              }
                            </th>
                          ),
                        )}

                      <th className="px-4 py-3 text-right font-medium">
                        الإجراء
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {renderTable(
                      importedRequests,
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {hasFilters && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="size-4" />

                عرض{' '}
                {
                  filteredRequests.length
                }{' '}
                من{' '}
                {
                  requests.length
                }{' '}
                طلب
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={
                  clearFilters
                }
              >
                مسح الفلاتر
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

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

      {showArchive && (
        <EnrollmentArchive
          onClose={() =>
            setShowArchive(
              false,
            )
          }
        />
      )}

      {/* تخصيص الأعمدة */}
      {showColumnSettings && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-xl border bg-background shadow-xl">
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
                  setShowColumnSettings(
                    false,
                  )
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

                {allBaseColumns.map(
                  (column) => (
                    <label
                      key={
                        column.key
                      }
                      className="flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-muted/40"
                    >
                      <span className="text-sm">
                        {
                          column.label
                        }
                      </span>

                      <input
                        type="checkbox"
                        checked={
                          Boolean(
                            visibleColumns[
                              column.key
                            ],
                          )
                        }
                        onChange={() =>
                          toggleBaseColumn(
                            column.key,
                          )
                        }
                        className="size-4"
                      />
                    </label>
                  ),
                )}

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
                        key={
                          field.id
                        }
                        className="flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-muted/40"
                      >
                        <div>
                          <div className="text-sm font-medium">
                            {
                              field.name
                            }
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
                          onChange={(
                            event,
                          ) =>
                            setCustomColumnVisible(
                              field.id,
                              event
                                .target
                                .checked,
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

            <div className="flex items-center justify-between border-t p-4">
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
                  setShowColumnSettings(
                    false,
                  )
                }
              >
                تم
              </Button>
            </div>
          </div>
        </div>
      )}

      {showReview &&
        selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border bg-background shadow-xl">
              <div className="flex items-center justify-between border-b p-5">
                <div>
                  <h2 className="text-lg font-semibold">
                    مراجعة طلب التسجيل
                  </h2>

                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      {
                        selectedRequest.requestNumber ||
                        selectedRequest.id
                      }
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
                  onClick={
                    closeReview
                  }
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
                      {
                        selectedRequest.name ||
                        'غير مضاف'
                      }
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      الرقم الشخصي
                    </p>

                    <p className="mt-1 font-medium tabular-nums">
                      {
                        selectedRequest.personalId ||
                        'غير مضاف'
                      }
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      العمر
                    </p>

                    <p className="mt-1 font-medium">
                      {
                        selectedRequest.age ??
                        'غير مضاف'
                      }
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      الجنس
                    </p>

                    <p className="mt-1 font-medium">
                      {
                        selectedRequest.gender ||
                        'غير مضاف'
                      }
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      رقم الهاتف
                    </p>

                    <p className="mt-1 font-medium tabular-nums">
                      {
                        selectedRequest.phone ||
                        'غير مضاف'
                      }
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      الواتساب
                    </p>

                    <p className="mt-1 font-medium tabular-nums">
                      {
                        selectedRequest.whatsapp ||
                        'غير مضاف'
                      }
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
                      تاريخ التقديم
                    </p>

                    <p className="mt-1 font-medium">
                      {formatDate(
                        selectedRequest.createdAt,
                      )}
                    </p>
                  </div>
                </div>

                {/* الحقول الإضافية */}
                {customFields.length >
                  0 && (
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
                              key={
                                field.id
                              }
                            >
                              <p className="text-xs text-muted-foreground">
                                {
                                  field.name
                                }
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
                    {
                      selectedRequest.healthNotes ||
                      'لا توجد معلومات صحية'
                    }
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
                    {
                      selectedRequest.notes ||
                      'لا توجد ملاحظات'
                    }
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
                          {
                            selectedRequest.paymentReference ||
                            '—'
                          }
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

                <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                  <Button
                    variant="ghost"
                    onClick={
                      closeReview
                    }
                    disabled={saving}
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
                          saving
                        }
                        className="gap-2"
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
                          saving
                        }
                        className="gap-2"
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