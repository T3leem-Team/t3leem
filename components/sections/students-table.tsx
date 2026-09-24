'use client'

import { Filter, Settings2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { StatusBadge } from '@/components/dashboard/status-badge'

import type { StudentCourseStatus } from './student-details'

export type StudentTableFilters = {
  name: string
  personalId: string
  grade: string
  phone: string
  whatsapp: string
  paymentStatus: string
  notes: string
  attendance: string
}

export type StudentDynamicField = {
  id: string
  name: string
  field_key: string
  field_type: string
  is_required: boolean
  show_in_registration: boolean
  is_active: boolean
  sort_order: number
}

export type StudentTableCourse = {
  id: string
  name: string
  start_date: string | null
  end_date: string | null
  days: string[] | null
}

export type StudentTableStudent = {
  id: string
  studentId: string
  name: string
  personalId: string
  gender: string | null
  age: number | null
  grade: string
  className: string | null
  phone: string | null
  whatsapp: string | null
  status: string
  paymentStatus: string
  amountDue: number
  amountPaid: number
  feeExempt: boolean
  chronicDiseases: string | null
  notes: string | null
  source: string | null
  createdAt: string | null
  updatedAt: string | null
  academicYearId: string | null
  academicYearName: string | null
  attendance?: string
  courseStatuses: StudentCourseStatus[]
  dynamicValues?: Record<string, string>

  attendanceSummaries?: unknown[]
  attendanceRecords?: unknown[]
}

type Props = {
  students: StudentTableStudent[]
  courses: StudentTableCourse[]
  dynamicFields: StudentDynamicField[]
  academicLevels: string[]
  filters: StudentTableFilters
  visibleColumns: Record<string, boolean>
  selectedStudentId: string | null
  currentCourseName?: string | null

  onSelectStudent: (studentId: string) => void

  onUpdateFilter: (
    key: keyof StudentTableFilters,
    value: string
  ) => void

  onToggleColumn: (key: string) => void

  onOpenNotes: (
    student: StudentTableStudent
  ) => void

  onOpenAttendance: (
    student: StudentTableStudent
  ) => void

  onOpenColumns?: () => void

  onSelectionChange?: (studentIds: string[]) => void
}

const baseColumns = [
  { key: 'name', label: 'الاسم' },
  { key: 'personalId', label: 'رقم الهوية' },
  { key: 'grade', label: 'المرحلة / المستوى' },
  { key: 'contact', label: 'التواصل' },
  { key: 'paymentStatus', label: 'حالة السداد' },
  { key: 'notes', label: 'الملاحظات' },
  { key: 'attendance', label: 'الحضور' },
]

const extraColumns = [
  { key: 'studentId', label: 'رقم الطالب' },
  { key: 'gender', label: 'الجنس' },
  { key: 'age', label: 'العمر' },
  { key: 'phone', label: 'الهاتف' },
  { key: 'whatsapp', label: 'واتساب' },
  { key: 'status', label: 'الحالة' },
  { key: 'className', label: 'الفصل' },
  { key: 'source', label: 'المصدر' },
  { key: 'amountDue', label: 'المستحق' },
  { key: 'amountPaid', label: 'المدفوع' },
  { key: 'remaining', label: 'المتبقي' },
  { key: 'feeExempt', label: 'الإعفاء' },
  { key: 'chronicDiseases', label: 'الحالات الصحية' },
  { key: 'createdAt', label: 'تاريخ الإضافة' },
  { key: 'updatedAt', label: 'آخر تحديث' },
  { key: 'academicYearName', label: 'العام الدراسي' },
]

const PAYMENT_STATUS_OPTIONS = [
  'مدفوع بالكامل',
  'مدفوع جزئيًا',
  'غير مدفوع',
  'معفي',
]

const ATTENDANCE_OPTIONS = [
  'حاضر',
  'غائب',
  'متأخر',
  'مستأذن',
  'لم يسجل',
]

function formatDate(value: string | null) {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return date.toLocaleDateString('ar-BH')
}

function getSourceLabel(source: string | null) {
  switch (source) {
    case 'manual':
      return 'إضافة من قسم الطلاب'

    case 'registration':
      return 'التسجيل من الرابط الخارجي'

    case 'import':
      return 'مستورد من Excel'

    case 'external':
      return 'التسجيل من الرابط الخارجي'

    case 'internal':
      return 'إضافة من قسم الطلاب'

    case 'admin':
      return 'إضافة من قسم الطلاب'

    default:
      return source || 'غير محدد'
  }
}

function getPaymentStatusLabel(status: string) {
  switch (status) {
    case 'paid':
    case 'مدفوع بالكامل':
      return 'مدفوع بالكامل'

    case 'partial':
    case 'مدفوع جزئياً':
    case 'مدفوع جزئيًا':
      return 'مدفوع جزئيًا'

    case 'unpaid':
    case 'غير مدفوع':
      return 'غير مدفوع'

    case 'exempt':
    case 'معفي':
      return 'معفي'

    default:
      return status || '-'
  }
}

export function StudentsTable({
  students,
  courses,
  dynamicFields,
  academicLevels,
  filters,
  visibleColumns,
  selectedStudentId,
  currentCourseName,
  onSelectStudent,
  onUpdateFilter,
  onToggleColumn,
  onOpenNotes,
  onOpenAttendance,
  onSelectionChange,
}: Props) {
  const [showColumns, setShowColumns] = useState(false)

  const [selectionMode, setSelectionMode] = useState(false)

  const [selectedStudentIds, setSelectedStudentIds] =
    useState<string[]>([])

  const [paymentStudent, setPaymentStudent] =
    useState<StudentTableStudent | null>(null)

  const [showAddPayment, setShowAddPayment] =
    useState(false)

  const [paymentAmount, setPaymentAmount] =
    useState('')

  const [paymentMethod, setPaymentMethod] =
    useState<'نقدي' | 'تحويل' | 'بطاقة'>('نقدي')

  const [paymentDate, setPaymentDate] =
    useState(
      new Date().toISOString().slice(0, 10)
    )

  const [paymentReference, setPaymentReference] =
    useState('')

  const [paymentNotes, setPaymentNotes] =
    useState('')

  const [paymentSaving, setPaymentSaving] =
    useState(false)

  const [paymentMessage, setPaymentMessage] =
    useState('')

  const availableAcademicLevels = useMemo(() => {
    const values = new Set<string>()

    academicLevels.forEach((level) => {
      if (level?.trim()) {
        values.add(level.trim())
      }
    })

    students.forEach((student) => {
      if (student.grade?.trim()) {
        values.add(student.grade.trim())
      }
    })

    return Array.from(values)
  }, [academicLevels, students])

  const visibleStudentIds = students.map(
    (student) => student.id
  )

  const allVisibleSelected =
    students.length > 0 &&
    students.every((student) =>
      selectedStudentIds.includes(student.id)
    )

  const someVisibleSelected =
    students.some((student) =>
      selectedStudentIds.includes(student.id)
    )

  const updateSelection = (ids: string[]) => {
    setSelectedStudentIds(ids)
    onSelectionChange?.(ids)
  }

  const toggleSelectionMode = () => {
    setSelectionMode((current) => {
      const next = !current

      if (!next) {
        updateSelection([])
      }

      return next
    })
  }

  const toggleStudentSelection = (
    studentId: string
  ) => {
    const exists =
      selectedStudentIds.includes(studentId)

    const next = exists
      ? selectedStudentIds.filter(
          (id) => id !== studentId
        )
      : [...selectedStudentIds, studentId]

    updateSelection(next)
  }

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      const visibleSet = new Set(
        visibleStudentIds
      )

      updateSelection(
        selectedStudentIds.filter(
          (id) => !visibleSet.has(id)
        )
      )

      return
    }

    const merged = Array.from(
      new Set([
        ...selectedStudentIds,
        ...visibleStudentIds,
      ])
    )

    updateSelection(merged)
  }

  const openPayment = (
    student: StudentTableStudent
  ) => {
    setPaymentStudent(student)

    setShowAddPayment(false)

    setPaymentAmount('')

    setPaymentMethod('نقدي')

    setPaymentDate(
      new Date().toISOString().slice(0, 10)
    )

    setPaymentReference('')

    setPaymentNotes('')

    setPaymentMessage('')
  }

  const closePayment = () => {
    if (paymentSaving) return

    setPaymentStudent(null)

    setShowAddPayment(false)

    setPaymentMessage('')
  }

  const savePayment = async () => {
    if (!paymentStudent) return

    const amount = Number(paymentAmount)

    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentMessage(
        'أدخل مبلغاً صحيحاً.'
      )
      return
    }

    if (!paymentStudent.academicYearId) {
      setPaymentMessage(
        'لا توجد سنة دراسية مرتبطة بالطالب.'
      )
      return
    }

    const remaining = Math.max(
      Number(paymentStudent.amountDue) -
        Number(paymentStudent.amountPaid),
      0
    )

    if (amount > remaining + 0.000001) {
      setPaymentMessage(
        `المبلغ أكبر من المتبقي. المتبقي: ${remaining.toFixed(3)} د.ب`
      )
      return
    }

    setPaymentSaving(true)
    setPaymentMessage('')

    try {
      const response = await fetch(
        '/api/payments',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            student_id: paymentStudent.id,
            academic_year_id:
              paymentStudent.academicYearId,
            amount,
            payment_method: paymentMethod,
            payment_date: paymentDate,
            reference_number:
              paymentReference || null,
            notes: paymentNotes || null,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ||
            'تعذر حفظ الدفعة.'
        )
      }

      const newPaid =
        Number(paymentStudent.amountPaid) +
        amount

      const newRemaining = Math.max(
        Number(paymentStudent.amountDue) -
          newPaid,
        0
      )

      const newStatus =
        paymentStudent.feeExempt
          ? 'معفي'
          : newRemaining <= 0
            ? 'مدفوع بالكامل'
            : newPaid > 0
              ? 'مدفوع جزئيًا'
              : 'غير مدفوع'

      setPaymentStudent({
        ...paymentStudent,
        amountPaid: newPaid,
        paymentStatus: newStatus,
      })

      setPaymentAmount('')

      setPaymentReference('')

      setPaymentNotes('')

      setPaymentMessage(
        'تم تسجيل الدفعة بنجاح ✅'
      )

      setTimeout(() => {
        setShowAddPayment(false)
      }, 700)
    } catch (error) {
      setPaymentMessage(
        error instanceof Error
          ? error.message
          : 'تعذر حفظ الدفعة.'
      )
    } finally {
      setPaymentSaving(false)
    }
  }

  const filterInput = (
    key: keyof StudentTableFilters,
    placeholder: string
  ) => {
    return (
      <div className="flex items-center gap-1">
        <Filter className="h-3 w-3 shrink-0 text-muted-foreground" />

        <input
          value={filters[key]}
          onChange={(event) =>
            onUpdateFilter(
              key,
              event.target.value
            )
          }
          placeholder={placeholder}
          className="h-7 w-full min-w-0 rounded-md border bg-background px-2 text-xs outline-none focus:ring-1"
          onClick={(event) =>
            event.stopPropagation()
          }
        />
      </div>
    )
  }

  const filterSelect = (
    key: keyof StudentTableFilters,
    placeholder: string,
    options: string[]
  ) => {
    return (
      <div className="flex items-center gap-1">
        <Filter className="h-3 w-3 shrink-0 text-muted-foreground" />

        <select
          value={filters[key]}
          onChange={(event) =>
            onUpdateFilter(
              key,
              event.target.value
            )
          }
          onClick={(event) =>
            event.stopPropagation()
          }
          className="h-7 w-full min-w-0 rounded-md border bg-background px-2 text-xs outline-none focus:ring-1"
        >
          <option value="">
            {placeholder}
          </option>

          {options.map((option) => (
            <option
              key={option}
              value={option}
            >
              {option}
            </option>
          ))}
        </select>
      </div>
    )
  }

  const visibleExtraColumns =
    extraColumns.filter(
      (column) =>
        visibleColumns[column.key]
    )

  const visibleDynamicFields =
    dynamicFields.filter(
      (field) =>
        field.is_active &&
        visibleColumns[
          `dynamic-${field.id}`
        ]
    )

  const visibleCourses =
    courses.filter(
      (course) =>
        visibleColumns[
          `course-${course.id}`
        ]
    )

  const totalColumns =
    1 +
    (selectionMode ? 1 : 0) +
    baseColumns.filter(
      (column) =>
        visibleColumns[column.key] !== false
    ).length +
    visibleExtraColumns.length +
    visibleDynamicFields.length +
    visibleCourses.length

  return (
    <>
      <div className="space-y-3">
        {/* شريط التحكم العلوي */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-medium">
              الطلاب ({students.length})
            </div>

            <button
              type="button"
              onClick={toggleSelectionMode}
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs hover:bg-muted ${
                selectionMode
                  ? 'bg-muted'
                  : ''
              }`}
            >
              <input
                type="checkbox"
                checked={selectionMode}
                onChange={() => {}}
                tabIndex={-1}
                className="pointer-events-none h-3.5 w-3.5"
              />

              تحديد
            </button>

            {selectionMode && (
              <button
                type="button"
                onClick={toggleSelectAll}
                disabled={students.length === 0}
                className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  ref={(element) => {
                    if (element) {
                      element.indeterminate =
                        !allVisibleSelected &&
                        someVisibleSelected
                    }
                  }}
                  onChange={() =>
                    toggleSelectAll()
                  }
                  onClick={(event) =>
                    event.stopPropagation()
                  }
                  className="h-3.5 w-3.5"
                />

                {allVisibleSelected
                  ? 'إلغاء تحديد الكل'
                  : 'تحديد الكل'}
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                setShowColumns(
                  (current) => !current
                )
              }
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs hover:bg-muted ${
                showColumns
                  ? 'bg-muted'
                  : ''
              }`}
            >
              <Settings2 className="h-4 w-4" />

              تخصيص الأعمدة
            </button>
          </div>

          {selectionMode && (
            <div className="text-xs text-muted-foreground">
              تم تحديد {selectedStudentIds.length} طالب
            </div>
          )}
        </div>

        {showColumns && (
          <div className="rounded-lg border bg-muted/20 p-4">
            <div className="mb-3 text-sm font-semibold">
              تخصيص الأعمدة
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground">
                  الأعمدة الأساسية
                </div>

                {baseColumns.map(
                  (column) => (
                    <label
                      key={column.key}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={
                          visibleColumns[
                            column.key
                          ] !== false
                        }
                        onChange={() =>
                          onToggleColumn(
                            column.key
                          )
                        }
                      />

                      {column.label}
                    </label>
                  )
                )}
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground">
                  أعمدة إضافية
                </div>

                {extraColumns.map(
                  (column) => (
                    <label
                      key={column.key}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={
                          !!visibleColumns[
                            column.key
                          ]
                        }
                        onChange={() =>
                          onToggleColumn(
                            column.key
                          )
                        }
                      />

                      {column.label}
                    </label>
                  )
                )}
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground">
                  الحقول والدورات
                </div>

                {dynamicFields
                  .filter(
                    (field) =>
                      field.is_active
                  )
                  .map(
                    (field) => (
                      <label
                        key={field.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={
                            !!visibleColumns[
                              `dynamic-${field.id}`
                            ]
                          }
                          onChange={() =>
                            onToggleColumn(
                              `dynamic-${field.id}`
                            )
                          }
                        />

                        {field.name}
                      </label>
                    )
                  )}

                {courses.map(
                  (course) => (
                    <label
                      key={course.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={
                          !!visibleColumns[
                            `course-${course.id}`
                          ]
                        }
                        onChange={() =>
                          onToggleColumn(
                            `course-${course.id}`
                          )
                        }
                      />

                      {course.name}
                    </label>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                {/* الرقم التسلسلي */}
                <TableHead className="w-[60px] text-center">
                  #
                </TableHead>

                {/* checkbox يظهر فقط في وضع التحديد */}
                {selectionMode && (
                  <TableHead className="w-[55px] text-center">
                    <input
                      type="checkbox"
                      checked={
                        allVisibleSelected
                      }
                      ref={(element) => {
                        if (element) {
                          element.indeterminate =
                            !allVisibleSelected &&
                            someVisibleSelected
                        }
                      }}
                      onChange={
                        toggleSelectAll
                      }
                      aria-label="تحديد الكل"
                      className="h-4 w-4"
                    />
                  </TableHead>
                )}

                {visibleColumns.name !== false && (
                  <TableHead className="min-w-[220px]">
                    {filterInput(
                      'name',
                      'الاسم'
                    )}
                  </TableHead>
                )}

                {visibleColumns.personalId !== false && (
                  <TableHead className="min-w-[150px]">
                    {filterInput(
                      'personalId',
                      'رقم الهوية'
                    )}
                  </TableHead>
                )}

                {visibleColumns.grade !== false && (
                  <TableHead className="min-w-[170px]">
                    {filterSelect(
                      'grade',
                      'المرحلة / المستوى',
                      availableAcademicLevels
                    )}
                  </TableHead>
                )}

                {visibleColumns.contact !== false && (
                  <TableHead className="min-w-[180px]">
                    {filterInput(
                      'phone',
                      'الهاتف / واتساب'
                    )}
                  </TableHead>
                )}

                {visibleColumns.paymentStatus !== false && (
                  <TableHead className="min-w-[170px]">
                    {filterSelect(
                      'paymentStatus',
                      'حالة السداد',
                      PAYMENT_STATUS_OPTIONS
                    )}
                  </TableHead>
                )}

                {visibleColumns.notes !== false && (
                  <TableHead className="min-w-[130px]">
                    {filterInput(
                      'notes',
                      'الملاحظات'
                    )}
                  </TableHead>
                )}

                {visibleColumns.attendance !== false && (
                  <TableHead className="min-w-[150px]">
                    {filterSelect(
                      'attendance',
                      'الحضور',
                      ATTENDANCE_OPTIONS
                    )}
                  </TableHead>
                )}

                {visibleExtraColumns.map(
                  (column) => (
                    <TableHead
                      key={column.key}
                    >
                      {column.label}
                    </TableHead>
                  )
                )}

                {visibleDynamicFields.map(
                  (field) => (
                    <TableHead
                      key={`dynamic-${field.id}`}
                    >
                      {field.name}
                    </TableHead>
                  )
                )}

                {visibleCourses.map(
                  (course) => (
                    <TableHead
                      key={`course-${course.id}`}
                    >
                      {course.name}
                    </TableHead>
                  )
                )}
              </TableRow>
            </TableHeader>

            <TableBody>
              {students.map(
                (student, index) => {
                  const remaining =
                    student.feeExempt
                      ? 0
                      : Math.max(
                          Number(
                            student.amountDue
                          ) -
                            Number(
                              student.amountPaid
                            ),
                          0
                        )

                  const isSelected =
                    selectedStudentIds.includes(
                      student.id
                    )

                  return (
                    <TableRow
                      key={student.id}
                      data-state={
                        selectedStudentId ===
                        student.id ||
                        isSelected
                          ? 'selected'
                          : undefined
                      }
                      className="cursor-pointer"
                      onClick={() => {
                        if (selectionMode) {
                          toggleStudentSelection(
                            student.id
                          )
                          return
                        }

                        onSelectStudent(
                          student.id
                        )
                      }}
                    >
                      {/* الرقم التسلسلي */}
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {index + 1}
                      </TableCell>

                      {/* checkbox */}
                      {selectionMode && (
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            checked={
                              isSelected
                            }
                            onChange={() =>
                              toggleStudentSelection(
                                student.id
                              )
                            }
                            onClick={(event) =>
                              event.stopPropagation()
                            }
                            aria-label={`تحديد ${student.name}`}
                            className="h-4 w-4"
                          />
                        </TableCell>
                      )}

                      {visibleColumns.name !== false && (
                        <TableCell className="font-medium">
                          {student.name}
                        </TableCell>
                      )}

                      {visibleColumns.personalId !== false && (
                        <TableCell>
                          {student.personalId ||
                            '-'}
                        </TableCell>
                      )}

                      {visibleColumns.grade !== false && (
                        <TableCell>
                          {student.grade ||
                            '-'}
                        </TableCell>
                      )}

                      {visibleColumns.contact !== false && (
                        <TableCell>
                          <div className="space-y-1 text-xs">
                            <div>
                              {student.phone ||
                                '-'}
                            </div>

                            {student.whatsapp && (
                              <div className="text-muted-foreground">
                                {student.whatsapp}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      )}

                      {visibleColumns.paymentStatus !== false && (
                        <TableCell>
                          <button
                            type="button"
                            className="rounded-md px-2 py-1 hover:bg-muted"
                            onClick={(
                              event
                            ) => {
                              event.stopPropagation()
                              openPayment(
                                student
                              )
                            }}
                          >
                            <StatusBadge
                              status={getPaymentStatusLabel(
                                student.paymentStatus
                              )}
                            />
                          </button>
                        </TableCell>
                      )}

                      {visibleColumns.notes !== false && (
                        <TableCell>
                          <button
                            type="button"
                            className="max-w-[180px] truncate rounded-md px-2 py-1 text-xs hover:bg-muted"
                            onClick={(
                              event
                            ) => {
                              event.stopPropagation()
                              onOpenNotes(
                                student
                              )
                            }}
                          >
                            {student.notes ||
                              'لا توجد'}
                          </button>
                        </TableCell>
                      )}

                      {visibleColumns.attendance !== false && (
                        <TableCell>
                          <button
                            type="button"
                            className="rounded-md px-2 py-1 text-xs hover:bg-muted"
                            onClick={(
                              event
                            ) => {
                              event.stopPropagation()
                              onOpenAttendance(
                                student
                              )
                            }}
                          >
                            {student.attendance ||
                              'لم يسجل'}
                          </button>
                        </TableCell>
                      )}

                      {visibleColumns.studentId && (
                        <TableCell>
                          {student.studentId ||
                            '-'}
                        </TableCell>
                      )}

                      {visibleColumns.gender && (
                        <TableCell>
                          {student.gender ||
                            '-'}
                        </TableCell>
                      )}

                      {visibleColumns.age && (
                        <TableCell>
                          {student.age ??
                            '-'}
                        </TableCell>
                      )}

                      {visibleColumns.phone && (
                        <TableCell>
                          {student.phone ||
                            '-'}
                        </TableCell>
                      )}

                      {visibleColumns.whatsapp && (
                        <TableCell>
                          {student.whatsapp ||
                            '-'}
                        </TableCell>
                      )}

                      {visibleColumns.status && (
                        <TableCell>
                          <StatusBadge
                            status={
                              student.status ||
                              '-'
                            }
                          />
                        </TableCell>
                      )}

                      {visibleColumns.className && (
                        <TableCell>
                          {student.className ||
                            '-'}
                        </TableCell>
                      )}

                      {visibleColumns.source && (
                        <TableCell>
                          {getSourceLabel(
                            student.source
                          )}
                        </TableCell>
                      )}

                      {visibleColumns.amountDue && (
                        <TableCell>
                          {Number(
                            student.amountDue
                          ).toFixed(3)}
                        </TableCell>
                      )}

                      {visibleColumns.amountPaid && (
                        <TableCell>
                          {Number(
                            student.amountPaid
                          ).toFixed(3)}
                        </TableCell>
                      )}

                      {visibleColumns.remaining && (
                        <TableCell>
                          {remaining.toFixed(
                            3
                          )}
                        </TableCell>
                      )}

                      {visibleColumns.feeExempt && (
                        <TableCell>
                          {student.feeExempt
                            ? 'نعم'
                            : 'لا'}
                        </TableCell>
                      )}

                      {visibleColumns.chronicDiseases && (
                        <TableCell>
                          {student.chronicDiseases ||
                            '-'}
                        </TableCell>
                      )}

                      {visibleColumns.createdAt && (
                        <TableCell>
                          {formatDate(
                            student.createdAt
                          )}
                        </TableCell>
                      )}

                      {visibleColumns.updatedAt && (
                        <TableCell>
                          {formatDate(
                            student.updatedAt
                          )}
                        </TableCell>
                      )}

                      {visibleColumns.academicYearName && (
                        <TableCell>
                          {student.academicYearName ||
                            '-'}
                        </TableCell>
                      )}

                      {visibleDynamicFields.map(
                        (field) => (
                          <TableCell
                            key={`dynamic-${field.id}`}
                          >
                            {student
                              .dynamicValues?.[
                              field.field_key
                            ] ||
                              student
                                .dynamicValues?.[
                                field.id
                              ] ||
                              '-'}
                          </TableCell>
                        )
                      )}

                      {visibleCourses.map(
                        (course) => {
                          const status =
                            student.courseStatuses?.find(
                              (item) =>
                                item.courseId ===
                                course.id
                            )

                          return (
                            <TableCell
                              key={`course-${course.id}`}
                            >
                              {status?.status ||
                                'لم يسجل'}
                            </TableCell>
                          )
                        }
                      )}
                    </TableRow>
                  )
                }
              )}

              {students.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={Math.max(
                      totalColumns,
                      1
                    )}
                    className="h-32 text-center text-muted-foreground"
                  >
                    لا توجد بيانات
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* نافذة تفاصيل الدفع */}
      {paymentStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closePayment()
            }
          }}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-background p-5 shadow-xl"
            dir="rtl"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  تفاصيل السداد
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  {paymentStudent.name}
                </p>
              </div>

              <button
                type="button"
                onClick={closePayment}
                disabled={paymentSaving}
                className="rounded-md px-3 py-1.5 text-sm hover:bg-muted"
              >
                إغلاق
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">
                  المستحق
                </div>

                <div className="mt-1 font-semibold">
                  {Number(
                    paymentStudent.amountDue
                  ).toFixed(3)}{' '}
                  د.ب
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">
                  المدفوع
                </div>

                <div className="mt-1 font-semibold">
                  {Number(
                    paymentStudent.amountPaid
                  ).toFixed(3)}{' '}
                  د.ب
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">
                  المتبقي
                </div>

                <div className="mt-1 font-semibold">
                  {Math.max(
                    Number(
                      paymentStudent.amountDue
                    ) -
                      Number(
                        paymentStudent.amountPaid
                      ),
                    0
                  ).toFixed(3)}{' '}
                  د.ب
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">
                  الحالة
                </div>

                <div className="mt-2">
                  <StatusBadge
                    status={getPaymentStatusLabel(
                      paymentStudent.paymentStatus
                    )}
                  />
                </div>
              </div>
            </div>

            {!paymentStudent.feeExempt &&
              Number(
                paymentStudent.amountPaid
              ) <
                Number(
                  paymentStudent.amountDue
                ) && (
                <div className="mt-5">
                  {!showAddPayment ? (
                    <button
                      type="button"
                      onClick={() =>
                        setShowAddPayment(
                          true
                        )
                      }
                      className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
                    >
                      إضافة دفعة
                    </button>
                  ) : (
                    <div className="space-y-4 rounded-lg border p-4">
                      <div className="text-sm font-semibold">
                        إضافة دفعة
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs text-muted-foreground">
                          المبلغ
                        </label>

                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={
                            paymentAmount
                          }
                          onChange={(
                            event
                          ) =>
                            setPaymentAmount(
                              event.target.value
                            )
                          }
                          className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-1"
                          placeholder="0.000"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs text-muted-foreground">
                          طريقة الدفع
                        </label>

                        <select
                          value={
                            paymentMethod
                          }
                          onChange={(
                            event
                          ) =>
                            setPaymentMethod(
                              event.target
                                .value as
                                | 'نقدي'
                                | 'تحويل'
                                | 'بطاقة'
                            )
                          }
                          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        >
                          <option value="نقدي">
                            نقدي
                          </option>

                          <option value="تحويل">
                            تحويل
                          </option>

                          <option value="بطاقة">
                            بطاقة
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs text-muted-foreground">
                          تاريخ الدفع
                        </label>

                        <input
                          type="date"
                          value={
                            paymentDate
                          }
                          onChange={(
                            event
                          ) =>
                            setPaymentDate(
                              event.target
                                .value
                            )
                          }
                          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs text-muted-foreground">
                          رقم المرجع
                        </label>

                        <input
                          value={
                            paymentReference
                          }
                          onChange={(
                            event
                          ) =>
                            setPaymentReference(
                              event.target
                                .value
                            )
                          }
                          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                          placeholder="اختياري"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs text-muted-foreground">
                          ملاحظات
                        </label>

                        <textarea
                          value={
                            paymentNotes
                          }
                          onChange={(
                            event
                          ) =>
                            setPaymentNotes(
                              event.target
                                .value
                            )
                          }
                          rows={3}
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                          placeholder="اختياري"
                        />
                      </div>

                      {paymentMessage && (
                        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                          {paymentMessage}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={
                            savePayment
                          }
                          disabled={
                            paymentSaving
                          }
                          className="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
                        >
                          {paymentSaving
                            ? 'جاري الحفظ...'
                            : 'حفظ الدفعة'}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setShowAddPayment(
                              false
                            )
                          }
                          disabled={
                            paymentSaving
                          }
                          className="rounded-md border px-4 py-2.5 text-sm hover:bg-muted"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

            {paymentStudent.feeExempt && (
              <div className="mt-5 rounded-lg border p-3 text-sm">
                الطالب معفي من الرسوم ولا يمكن إضافة دفعة له.
              </div>
            )}

            {!paymentStudent.feeExempt &&
              Number(
                paymentStudent.amountPaid
              ) >=
                Number(
                  paymentStudent.amountDue
                ) && (
                <div className="mt-5 rounded-lg border p-3 text-sm">
                  تم سداد الرسوم بالكامل.
                </div>
              )}
          </div>
        </div>
      )}
    </>
  )
}