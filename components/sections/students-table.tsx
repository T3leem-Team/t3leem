'use client'

import {
  Filter,
  Settings2,
} from 'lucide-react'

import { useState } from 'react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { StatusBadge } from '@/components/dashboard/status-badge'

import type {
  StudentCourseStatus,
} from './student-details'

type StudentTableFilters = {
  name: string
  personalId: string
  grade: string
  phone: string
  whatsapp: string
  paymentStatus: string
  notes: string
  attendance: string
}

type StudentDynamicField = {
  id: string
  name: string
  field_key: string
  field_type: string
  is_required: boolean
  show_in_registration: boolean
  is_active: boolean
  sort_order: number
}

type StudentTableCourse = {
  id: string
  name: string
  start_date: string | null
  end_date: string | null
  days: string[] | null
}

type StudentTableStudent = {
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
  attendance?: {
    totalDays: number
    present: number
    absent: number
    late: number
    excused: number
    notRecorded: number
    percentage: number
  }
  courseStatuses?: Record<string, StudentCourseStatus>
  dynamicValues?: Record<string, unknown>
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
  onOpenNotes: (student: StudentTableStudent) => void
  onOpenAttendance: (student: StudentTableStudent) => void
}

const standardColumns = [
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

const baseColumns = [
  { key: 'name', label: 'الاسم' },
  { key: 'personalId', label: 'رقم الهوية' },
  { key: 'grade', label: 'المرحلة / المستوى' },
  { key: 'contact', label: 'التواصل' },
  { key: 'paymentStatus', label: 'حالة السداد' },
  { key: 'notes', label: 'الملاحظات' },
  { key: 'attendance', label: 'الحضور' },
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
    case 'external':
      return 'تسجيل خارجي'
    case 'internal':
      return 'إضافة داخلية'
    case 'admin':
      return 'إضافة إداري'
    case 'registration':
      return 'التسجيل'
    default:
      return source || '-'
  }
}

function getPaymentStatusLabel(status: string) {
  switch (status) {
    case 'paid':
    case 'مدفوع بالكامل':
      return 'مدفوع بالكامل'

    case 'partial':
    case 'مدفوع جزئياً':
      return 'مدفوع جزئياً'

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
}: Props) {
  const [showColumnCustomization, setShowColumnCustomization] =
    useState(false)

  const [paymentStudent, setPaymentStudent] =
    useState<StudentTableStudent | null>(null)

  const [showAddPayment, setShowAddPayment] = useState(false)

  const [paymentAmount, setPaymentAmount] = useState('')

  const [paymentMethod, setPaymentMethod] =
    useState<'نقدي' | 'تحويل' | 'بطاقة'>('نقدي')

  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split('T')[0]
  )

  const [paymentReference, setPaymentReference] = useState('')

  const [paymentNotes, setPaymentNotes] = useState('')

  const [paymentSaving, setPaymentSaving] = useState(false)

  const [paymentMessage, setPaymentMessage] = useState('')

  const textFilter = (
    key: keyof StudentTableFilters,
    placeholder: string
  ) => (
    <div className="flex items-center gap-1">
      <Filter className="h-3 w-3 shrink-0 opacity-50" />

      <input
        value={filters[key]}
        onChange={(event) =>
          onUpdateFilter(key, event.target.value)
        }
        placeholder={placeholder}
        className="h-7 w-full min-w-0 rounded border bg-background px-2 text-xs outline-none focus:ring-1"
      />
    </div>
  )

  const visibleColumnCount =
    1 +
    Object.values(visibleColumns).filter(Boolean).length

  const openPayment = (student: StudentTableStudent) => {
    setPaymentStudent(student)
    setShowAddPayment(false)
    setPaymentAmount(
      Math.max(
        0,
        student.amountDue - student.amountPaid
      ).toFixed(3)
    )
    setPaymentMethod('نقدي')
    setPaymentDate(
      new Date().toISOString().split('T')[0]
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
      setPaymentMessage('أدخل مبلغاً صحيحاً')
      return
    }

    const remaining = Math.max(
      0,
      paymentStudent.amountDue -
        paymentStudent.amountPaid
    )

    if (amount > remaining + 0.000001) {
      setPaymentMessage(
        `المبلغ أكبر من المتبقي (${remaining.toFixed(3)})`
      )
      return
    }

    setPaymentSaving(true)
    setPaymentMessage('')

    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: paymentStudent.id,
          amount,
          method: paymentMethod,
          paymentDate,
          referenceNumber: paymentReference,
          notes: paymentNotes,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error || 'تعذر تسجيل الدفعة'
        )
      }

      const newPaid =
        paymentStudent.amountPaid + amount

      const newRemaining = Math.max(
        0,
        paymentStudent.amountDue - newPaid
      )

      const newStatus =
        paymentStudent.feeExempt
          ? 'معفي'
          : newPaid >= paymentStudent.amountDue
            ? 'مدفوع بالكامل'
            : newPaid > 0
              ? 'مدفوع جزئياً'
              : 'غير مدفوع'

      setPaymentStudent({
        ...paymentStudent,
        amountPaid: newPaid,
        paymentStatus: newStatus,
      })

      setPaymentMessage('تم تسجيل الدفعة بنجاح')

      setTimeout(() => {
        setShowAddPayment(false)
        setPaymentMessage('')
      }, 700)
    } catch (error) {
      setPaymentMessage(
        error instanceof Error
          ? error.message
          : 'حدث خطأ أثناء تسجيل الدفعة'
      )
    } finally {
      setPaymentSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          الطلاب ({students.length})
        </div>

        <button
          type="button"
          onClick={() =>
            setShowColumnCustomization(
              (value) => !value
            )
          }
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs hover:bg-muted"
        >
          <Settings2 className="h-4 w-4" />
          تخصيص الأعمدة
        </button>
      </div>

      {showColumnCustomization && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="mb-3 text-sm font-semibold">
            الأعمدة
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground">
                الأعمدة الأساسية
              </div>

              {baseColumns.map((column) => (
                <label
                  key={column.key}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={
                      visibleColumns[column.key] !== false
                    }
                    onChange={() =>
                      onToggleColumn(column.key)
                    }
                  />

                  <span>{column.label}</span>
                </label>
              ))}
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground">
                الأعمدة الإضافية
              </div>

              {standardColumns.map((column) => (
                <label
                  key={column.key}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={
                      !!visibleColumns[column.key]
                    }
                    onChange={() =>
                      onToggleColumn(column.key)
                    }
                  />

                  <span>{column.label}</span>
                </label>
              ))}
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground">
                الحقول المخصصة
              </div>

              {dynamicFields
                .filter((field) => field.is_active)
                .map((field) => (
                  <label
                    key={field.id}
                    className="flex cursor-pointer items-center gap-2 text-sm"
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

                    <span>{field.name}</span>
                  </label>
                ))}

              {courses.length > 0 && (
                <>
                  <div className="mt-4 text-xs font-semibold text-muted-foreground">
                    الدورات
                  </div>

                  {courses.map((course) => (
                    <label
                      key={course.id}
                      className="flex cursor-pointer items-center gap-2 text-sm"
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

                      <span>{course.name}</span>
                    </label>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {visibleColumns.name !== false && (
                <TableHead className="min-w-[220px]">
                  {textFilter('name', 'الاسم')}
                </TableHead>
              )}

              {visibleColumns.personalId !== false && (
                <TableHead className="min-w-[150px]">
                  {textFilter(
                    'personalId',
                    'رقم الهوية'
                  )}
                </TableHead>
              )}

              {visibleColumns.grade !== false && (
                <TableHead className="min-w-[150px]">
                  {textFilter(
                    'grade',
                    'المرحلة / المستوى'
                  )}
                </TableHead>
              )}

              {visibleColumns.contact !== false && (
                <TableHead className="min-w-[180px]">
                  {textFilter(
                    'phone',
                    'الهاتف / واتساب'
                  )}
                </TableHead>
              )}

              {visibleColumns.paymentStatus !== false && (
                <TableHead className="min-w-[150px]">
                  {textFilter(
                    'paymentStatus',
                    'حالة السداد'
                  )}
                </TableHead>
              )}

              {visibleColumns.notes !== false && (
                <TableHead className="min-w-[130px]">
                  {textFilter('notes', 'الملاحظات')}
                </TableHead>
              )}

              {visibleColumns.attendance !== false && (
                <TableHead className="min-w-[130px]">
                  {textFilter(
                    'attendance',
                    'الحضور'
                  )}
                </TableHead>
              )}

              {standardColumns
                .filter(
                  (column) =>
                    visibleColumns[column.key]
                )
                .map((column) => (
                  <TableHead key={column.key}>
                    {column.label}
                  </TableHead>
                ))}

              {dynamicFields
                .filter(
                  (field) =>
                    field.is_active &&
                    visibleColumns[
                      `dynamic-${field.id}`
                    ]
                )
                .map((field) => (
                  <TableHead key={`dynamic-${field.id}`}>
                    {field.name}
                  </TableHead>
                ))}

              {courses
                .filter(
                  (course) =>
                    visibleColumns[
                      `course-${course.id}`
                    ]
                )
                .map((course) => (
                  <TableHead
                    key={`course-${course.id}`}
                  >
                    {course.name}
                  </TableHead>
                ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {students.map((student) => {
              const remaining = Math.max(
                0,
                student.amountDue -
                  student.amountPaid
              )

              const attendance =
                student.attendance

              return (
                <TableRow
                  key={student.id}
                  data-state={
                    selectedStudentId === student.id
                      ? 'selected'
                      : undefined
                  }
                  className="cursor-pointer"
                  onClick={() =>
                    onSelectStudent(student.id)
                  }
                >
                  {visibleColumns.name !== false && (
                    <TableCell className="font-medium">
                      {student.name}
                    </TableCell>
                  )}

                  {visibleColumns.personalId !==
                    false && (
                    <TableCell>
                      {student.personalId || '-'}
                    </TableCell>
                  )}

                  {visibleColumns.grade !== false && (
                    <TableCell>
                      {student.grade || '-'}
                    </TableCell>
                  )}

                  {visibleColumns.contact !==
                    false && (
                    <TableCell>
                      <div className="space-y-1 text-xs">
                        <div>
                          {student.phone || '-'}
                        </div>

                        {student.whatsapp && (
                          <div className="text-muted-foreground">
                            {student.whatsapp}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  )}

                  {visibleColumns.paymentStatus !==
                    false && (
                    <TableCell>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          openPayment(student)
                        }}
                        className="rounded-md"
                      >
                        <StatusBadge
                          status={
                            getPaymentStatusLabel(
                              student.paymentStatus
                            )
                          }
                        />
                      </button>
                    </TableCell>
                  )}

                  {visibleColumns.notes !== false && (
                    <TableCell>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          onOpenNotes(student)
                        }}
                        className="max-w-[180px] truncate rounded px-2 py-1 text-xs hover:bg-muted"
                      >
                        {student.notes || 'لا توجد'}
                      </button>
                    </TableCell>
                  )}

                  {visibleColumns.attendance !==
                    false && (
                    <TableCell>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          onOpenAttendance(student)
                        }}
                        className="rounded-md px-2 py-1 text-xs hover:bg-muted"
                      >
                        {attendance ? (
                          <div className="space-y-1 text-right">
                            <div>
                              {attendance.percentage.toFixed(
                                0
                              )}
                              %
                            </div>

                            <div className="text-[10px] text-muted-foreground">
                              {attendance.present}{' '}
                              حاضر /{' '}
                              {attendance.absent}{' '}
                              غائب
                            </div>
                          </div>
                        ) : currentCourseName ? (
                          'لم تقم الدورة حتى الآن'
                        ) : (
                          'غير حاضر'
                        )}
                      </button>
                    </TableCell>
                  )}

                  {visibleColumns.studentId && (
                    <TableCell>
                      {student.studentId || '-'}
                    </TableCell>
                  )}

                  {visibleColumns.gender && (
                    <TableCell>
                      {student.gender || '-'}
                    </TableCell>
                  )}

                  {visibleColumns.age && (
                    <TableCell>
                      {student.age ?? '-'}
                    </TableCell>
                  )}

                  {visibleColumns.phone && (
                    <TableCell>
                      {student.phone || '-'}
                    </TableCell>
                  )}

                  {visibleColumns.whatsapp && (
                    <TableCell>
                      {student.whatsapp || '-'}
                    </TableCell>
                  )}

                  {visibleColumns.status && (
                    <TableCell>
                      <StatusBadge
                        status={student.status || '-'}
                      />
                    </TableCell>
                  )}

                  {visibleColumns.className && (
                    <TableCell>
                      {student.className || '-'}
                    </TableCell>
                  )}

                  {visibleColumns.source && (
                    <TableCell>
                      {getSourceLabel(student.source)}
                    </TableCell>
                  )}

                  {visibleColumns.amountDue && (
                    <TableCell>
                      {student.amountDue.toFixed(3)}
                    </TableCell>
                  )}

                  {visibleColumns.amountPaid && (
                    <TableCell>
                      {student.amountPaid.toFixed(3)}
                    </TableCell>
                  )}

                  {visibleColumns.remaining && (
                    <TableCell>
                      {remaining.toFixed(3)}
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
                      {student.chronicDiseases || '-'}
                    </TableCell>
                  )}

                  {visibleColumns.createdAt && (
                    <TableCell>
                      {formatDate(student.createdAt)}
                    </TableCell>
                  )}

                  {visibleColumns.updatedAt && (
                    <TableCell>
                      {formatDate(student.updatedAt)}
                    </TableCell>
                  )}

                  {visibleColumns.academicYearName && (
                    <TableCell>
                      {student.academicYearName || '-'}
                    </TableCell>
                  )}

                  {dynamicFields
                    .filter(
                      (field) =>
                        field.is_active &&
                        visibleColumns[
                          `dynamic-${field.id}`
                        ]
                    )
                    .map((field) => {
                      const value =
                        student.dynamicValues?.[
                          field.field_key
                        ]

                      return (
                        <TableCell
                          key={`dynamic-${field.id}`}
                        >
                          {value === null ||
                          value === undefined ||
                          value === ''
                            ? '-'
                            : String(value)}
                        </TableCell>
                      )
                    })}

                  {courses
                    .filter(
                      (course) =>
                        visibleColumns[
                          `course-${course.id}`
                        ]
                    )
                    .map((course) => {
                      const status =
                        student.courseStatuses?.[
                          course.id
                        ]

                      return (
                        <TableCell
                          key={`course-${course.id}`}
                        >
                          {status || 'لم يسجل'}
                        </TableCell>
                      )
                    })}
                </TableRow>
              )
            })}

            {students.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={visibleColumnCount}
                  className="h-32 text-center text-muted-foreground"
                >
                  لا توجد بيانات
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {paymentStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closePayment()
            }
          }}
        >
          <div className="w-full max-w-lg rounded-xl bg-background p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  تفاصيل السداد
                </h2>

                <p className="text-sm text-muted-foreground">
                  {paymentStudent.name}
                </p>
              </div>

              <button
                type="button"
                onClick={closePayment}
                className="rounded-md px-2 py-1 text-sm hover:bg-muted"
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
                  {paymentStudent.amountDue.toFixed(
                    3
                  )}
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">
                  المدفوع
                </div>

                <div className="mt-1 font-semibold">
                  {paymentStudent.amountPaid.toFixed(
                    3
                  )}
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">
                  المتبقي
                </div>

                <div className="mt-1 font-semibold">
                  {Math.max(
                    0,
                    paymentStudent.amountDue -
                      paymentStudent.amountPaid
                  ).toFixed(3)}
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">
                  الحالة
                </div>

                <div className="mt-1">
                  <StatusBadge
                    status={getPaymentStatusLabel(
                      paymentStudent.paymentStatus
                    )}
                  />
                </div>
              </div>
            </div>

            {paymentStudent.feeExempt ? (
              <div className="mt-4 rounded-lg border p-3 text-sm">
                الطالب معفي من الرسوم.
              </div>
            ) : (
              <div className="mt-5">
                {!showAddPayment ? (
                  <button
                    type="button"
                    onClick={() =>
                      setShowAddPayment(true)
                    }
                    disabled={
                      paymentStudent.amountPaid >=
                      paymentStudent.amountDue
                    }
                    className="w-full rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    إضافة دفعة
                  </button>
                ) : (
                  <div className="space-y-3 rounded-lg border p-4">
                    <div className="text-sm font-semibold">
                      إضافة دفعة جديدة
                    </div>

                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">
                        المبلغ
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={paymentAmount}
                        onChange={(event) =>
                          setPaymentAmount(
                            event.target.value
                          )
                        }
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">
                        طريقة الدفع
                      </label>

                      <select
                        value={paymentMethod}
                        onChange={(event) =>
                          setPaymentMethod(
                            event.target
                              .value as
                              | 'نقدي'
                              | 'تحويل'
                              | 'بطاقة'
                          )
                        }
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
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
                      <label className="mb-1 block text-xs text-muted-foreground">
                        التاريخ
                      </label>

                      <input
                        type="date"
                        value={paymentDate}
                        onChange={(event) =>
                          setPaymentDate(
                            event.target.value
                          )
                        }
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">
                        رقم المرجع
                      </label>

                      <input
                        value={paymentReference}
                        onChange={(event) =>
                          setPaymentReference(
                            event.target.value
                          )
                        }
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">
                        ملاحظات
                      </label>

                      <textarea
                        value={paymentNotes}
                        onChange={(event) =>
                          setPaymentNotes(
                            event.target.value
                          )
                        }
                        rows={3}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      />
                    </div>

                    {paymentMessage && (
                      <div className="rounded-md border p-2 text-sm">
                        {paymentMessage}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={savePayment}
                        disabled={paymentSaving}
                        className="flex-1 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
                      >
                        {paymentSaving
                          ? 'جاري الحفظ...'
                          : 'حفظ الدفعة'}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setShowAddPayment(false)
                        }
                        disabled={paymentSaving}
                        className="rounded-md border px-4 py-2 text-sm"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}