'use client'

import type { ReactNode } from 'react'

import {
  Eye,
  Loader2,
} from 'lucide-react'

import { StatusBadge } from '@/components/dashboard/status-badge'
import { Button } from '@/components/ui/button'

export type RegistrationRequest = {
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
  processingMode:
    | 'review'
    | 'direct'
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
  source:
    | 'external'
    | 'import'
}

export type Filters = {
  id: string
  name: string
  phone: string
  submittedAt: string
  status: string
}

export type CustomField = {
  id: string
  name: string
  field_type: string
  available_in_registration: boolean
  available_in_students: boolean
  available_in_payments: boolean
  sort_order: number
  is_active: boolean
}

export type CustomFieldValue = {
  custom_field_id: string
  record_type: string
  record_id: string
  value: string | null
}

export type Level = {
  id: string
  name: string
}

export type ColumnKey =
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

export const DEFAULT_COLUMNS: Record<
  ColumnKey,
  boolean
> = {
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

const BASE_COLUMNS: {
  key: ColumnKey
  label: string
}[] = [
  {
    key: 'name',
    label: 'اسم الطالب',
  },
  {
    key: 'personal_id',
    label: 'الرقم الشخصي',
  },
  {
    key: 'gender',
    label: 'الجنس',
  },
  {
    key: 'age',
    label: 'العمر',
  },
  {
    key: 'phone',
    label: 'رقم الهاتف',
  },
  {
    key: 'whatsapp',
    label: 'الواتساب',
  },
  {
    key: 'level',
    label: 'المستوى',
  },
  {
    key: 'created_at',
    label: 'تاريخ التقديم',
  },
  {
    key: 'request_number',
    label: 'رقم الطلب',
  },
  {
    key: 'status',
    label: 'الحالة',
  },
]

const inputClass =
  'h-9 w-full min-w-[120px] rounded-md border border-input bg-background px-2 text-xs'

const selectClass =
  'h-9 w-full min-w-[130px] rounded-md border border-input bg-background px-2 text-xs'

type EnrollmentTablesProps = {
  externalRequests: RegistrationRequest[]
  importedRequests: RegistrationRequest[]
  loading: boolean
  visibleColumns: Record<string, boolean>
  customFields: CustomField[]
  customFieldValues: CustomFieldValue[]
  levels: Level[]
  filters: Filters
  updateFilter: (
    key: keyof Filters,
    value: string,
  ) => void
  openReview: (
    request: RegistrationRequest,
  ) => void
  getLevelName: (
    levelId: string | null,
  ) => string
  getCustomFieldValue: (
    requestId: string,
    fieldId: string,
  ) => string
  getCustomFieldDisplayValue: (
    field: CustomField,
    value: string | null | undefined,
  ) => string
  getStatusLabel: (
    status: RegistrationRequest['status'],
  ) => string
  formatDate: (
    value: string,
  ) => string
  hasHealthNotes: (
    request: RegistrationRequest,
  ) => boolean
  hasNotes: (
    request: RegistrationRequest,
  ) => boolean
  hasSpecialInformation: (
    request: RegistrationRequest,
  ) => boolean
}

function renderCell(
  request: RegistrationRequest,
  column: ColumnKey,
  getLevelName: (
    levelId: string | null,
  ) => string,
  getStatusLabel: (
    status: RegistrationRequest['status'],
  ) => string,
  formatDate: (
    value: string,
  ) => string,
): ReactNode {
  switch (column) {
    case 'name':
      return (
        <span className="font-medium">
          {request.name || '—'}
        </span>
      )

    case 'personal_id':
      return (
        <span className="tabular-nums">
          {request.personalId || '—'}
        </span>
      )

    case 'gender':
      return (
        <span>
          {request.gender || '—'}
        </span>
      )

    case 'age':
      return (
        <span>
          {request.age ?? '—'}
        </span>
      )

    case 'phone':
      return (
        <span className="tabular-nums">
          {request.phone || '—'}
        </span>
      )

    case 'whatsapp':
      return (
        <span className="tabular-nums">
          {request.whatsapp || '—'}
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
        <span className="text-muted-foreground">
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

type RequestTableProps = {
  requests: RegistrationRequest[]
  loading: boolean
  visibleColumns: Record<string, boolean>
  customFields: CustomField[]
  filters: Filters
  updateFilter: (
    key: keyof Filters,
    value: string,
  ) => void
  openReview: (
    request: RegistrationRequest,
  ) => void
  getLevelName: (
    levelId: string | null,
  ) => string
  getCustomFieldValue: (
    requestId: string,
    fieldId: string,
  ) => string
  getCustomFieldDisplayValue: (
    field: CustomField,
    value: string | null | undefined,
  ) => string
  getStatusLabel: (
    status: RegistrationRequest['status'],
  ) => string
  formatDate: (
    value: string,
  ) => string
  hasHealthNotes: (
    request: RegistrationRequest,
  ) => boolean
  hasNotes: (
    request: RegistrationRequest,
  ) => boolean
  hasSpecialInformation: (
    request: RegistrationRequest,
  ) => boolean
  showFilters: boolean
}

function RequestTable({
  requests,
  loading,
  visibleColumns,
  customFields,
  filters,
  updateFilter,
  openReview,
  getLevelName,
  getCustomFieldValue,
  getCustomFieldDisplayValue,
  getStatusLabel,
  formatDate,
  hasHealthNotes,
  hasNotes,
  hasSpecialInformation,
  showFilters,
}: RequestTableProps) {
  /*
   * مهم:
   * لا نستخدم اسم visibleColumns هنا للنتيجة المفلترة.
   *
   * كان الخطأ السابق بسبب:
   *
   * const visibleColumns =
   *   allBaseColumns.filter(
   *     (column) =>
   *       visibleColumns[column.key],
   *   )
   *
   * وهذا يقرأ المتغير أثناء إنشائه.
   *
   * لذلك استخدمنا اسم:
   * displayedBaseColumns
   */
  const displayedBaseColumns =
    BASE_COLUMNS.filter(
      (column) =>
        visibleColumns[
          column.key
        ] === true,
    )

  const displayedCustomFields =
    customFields.filter(
      (field) =>
        visibleColumns[
          `custom:${field.id}`
        ] === true,
    )

  const totalColumns =
    1 +
    displayedBaseColumns.length +
    displayedCustomFields.length +
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

  if (requests.length === 0) {
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

  return (
    <>
      {requests.map(
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

              {displayedBaseColumns.map(
                (column) => (
                  <td
                    key={
                      column.key
                    }
                    className="px-4 py-4"
                  >
                    {renderCell(
                      request,
                      column.key,
                      getLevelName,
                      getStatusLabel,
                      formatDate,
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

              {displayedCustomFields.map(
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
      )}
    </>
  )
}

function TableHeader({
  visibleColumns,
  customFields,
  filters,
  updateFilter,
  showFilters,
}: {
  visibleColumns: Record<string, boolean>
  customFields: CustomField[]
  filters: Filters
  updateFilter: (
    key: keyof Filters,
    value: string,
  ) => void
  showFilters: boolean
}) {
  const displayedBaseColumns =
    BASE_COLUMNS.filter(
      (column) =>
        visibleColumns[
          column.key
        ] === true,
    )

  const displayedCustomFields =
    customFields.filter(
      (field) =>
        visibleColumns[
          `custom:${field.id}`
        ] === true,
    )

  return (
    <tr className="border-b bg-muted/40">
      <th className="w-16 px-4 py-3 text-center font-medium">
        #
      </th>

      {displayedBaseColumns.map(
        (column) => (
          <th
            key={column.key}
            className="px-4 py-3 text-right font-medium"
          >
            <div className="space-y-2">
              <div>
                {column.label}
              </div>

              {showFilters &&
                column.key ===
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
                        event.target
                          .value,
                      )
                    }
                    placeholder="بحث"
                    className={
                      inputClass
                    }
                  />
                )}

              {showFilters &&
                column.key ===
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
                        event.target
                          .value,
                      )
                    }
                    placeholder="بحث"
                    className={
                      inputClass
                    }
                  />
                )}

              {showFilters &&
                column.key ===
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
                        event.target
                          .value,
                      )
                    }
                    placeholder="بحث"
                    className={
                      inputClass
                    }
                  />
                )}

              {showFilters &&
                column.key ===
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
                        event.target
                          .value,
                      )
                    }
                    placeholder="بحث"
                    className={
                      inputClass
                    }
                  />
                )}

              {showFilters &&
                column.key ===
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
                        event.target
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

      {displayedCustomFields.map(
        (field) => (
          <th
            key={field.id}
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
  )
}

export function EnrollmentTables({
  externalRequests,
  importedRequests,
  loading,
  visibleColumns,
  customFields,
  filters,
  updateFilter,
  openReview,
  getLevelName,
  getCustomFieldValue,
  getCustomFieldDisplayValue,
  getStatusLabel,
  formatDate,
  hasHealthNotes,
  hasNotes,
  hasSpecialInformation,
}: EnrollmentTablesProps) {
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1050px] text-sm">
          <thead>
            <TableHeader
              visibleColumns={
                visibleColumns
              }
              customFields={
                customFields
              }
              filters={filters}
              updateFilter={
                updateFilter
              }
              showFilters={true}
            />
          </thead>

          <tbody>
            <RequestTable
              requests={
                externalRequests
              }
              loading={loading}
              visibleColumns={
                visibleColumns
              }
              customFields={
                customFields
              }
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
              showFilters={true}
            />
          </tbody>
        </table>
      </div>

      {importedRequests.length >
        0 && (
        <div className="border-t">
          <div className="flex items-center gap-2 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">
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
                <TableHeader
                  visibleColumns={
                    visibleColumns
                  }
                  customFields={
                    customFields
                  }
                  filters={
                    filters
                  }
                  updateFilter={
                    updateFilter
                  }
                  showFilters={
                    false
                  }
                />
              </thead>

              <tbody>
                <RequestTable
                  requests={
                    importedRequests
                  }
                  loading={false}
                  visibleColumns={
                    visibleColumns
                  }
                  customFields={
                    customFields
                  }
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
                  showFilters={
                    false
                  }
                />
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
