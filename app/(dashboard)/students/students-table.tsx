'use client'

import {
  Filter,
} from 'lucide-react'

import {
  useMemo,
  useState,
} from 'react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { StatusBadge } from '@/components/dashboard/status-badge'

import type { AcademicLevel } from '@/lib/students-cache'
import type { StudentCourseStatus } from './student-details'

import {
  formatDate,
  getSourceLabel,
  getPaymentStatusLabel,
  normalizePaymentStatus,
  normalizeAttendanceStatus,
} from './students-table-utils'

import {
  StudentPaymentDialog,
  type PaymentStudent,
} from './student-payment-dialog'

import {
  baseColumns,
  getVisibleExtraColumns,
} from './students-table-columns'

export type StudentTableFilters = {
  name: string
  personalId: string
  grade: string
  phone: string
  whatsapp: string
  paymentStatus: string
  notes: string
  attendance: string
  guardianRelation: string
  studentPhone: string
  enrollmentCourse: string
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
  guardianRelation: string | null
  studentPhone: string | null
  enrollmentCourseId: string | null
  enrollmentCourseName: string | null
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
  allowStudentDeletion: boolean
  students: StudentTableStudent[]
  courses: StudentTableCourse[]
  dynamicFields: StudentDynamicField[]
  academicLevels: AcademicLevel[]
  filters: StudentTableFilters
  visibleColumns: Record<string, boolean>
  selectedStudentId: string | null
  currentCourseName?: string | null

  selectionMode: boolean
  selectedStudentIds: string[]

  onToggleStudentSelection: (
    studentId: string
  ) => void

  onSelectStudent: (
    studentId: string
  ) => void

  onUpdateFilter: (
    key: keyof StudentTableFilters,
    value: string
  ) => void

  onOpenNotes: (
    student: StudentTableStudent
  ) => void

  onOpenAttendance: (
    student: StudentTableStudent
  ) => void
}

export function StudentsTable({
  allowStudentDeletion,
  students,
  courses,
  dynamicFields,
  academicLevels,
  filters,
  visibleColumns,
  selectedStudentId,
  currentCourseName,
  selectionMode,
  selectedStudentIds,
  onToggleStudentSelection,
  onSelectStudent,
  onUpdateFilter,
  onOpenNotes,
  onOpenAttendance,
}: Props) {
  const [
    paymentStudent,
    setPaymentStudent,
  ] = useState<PaymentStudent | null>(null)

  const gradeOptions = useMemo(() => {
    const existingValues = new Set<string>()

    students.forEach((student) => {
      const value = String(
        student.grade || ''
      ).trim()

      if (value) {
        existingValues.add(value)
      }
    })

    const ordered = academicLevels
      .filter((level) =>
        existingValues.has(level.name)
      )
      .sort(
        (a, b) =>
          Number(a.sort_order ?? 0) -
          Number(b.sort_order ?? 0)
      )
      .map((level) => level.name)

    const remaining = Array.from(
      existingValues
    ).filter(
      (value) => !ordered.includes(value)
    )

    return [
      ...ordered,
      ...remaining,
    ]
  }, [
    students,
    academicLevels,
  ])

  const paymentStatusOptions = useMemo(() => {
    const values = new Set<string>()

    students.forEach((student) => {
      const value = normalizePaymentStatus(
        student.paymentStatus
      )

      if (value && value !== '-') {
        values.add(value)
      }
    })

    return Array.from(values)
  }, [students])

  const attendanceOptions = useMemo(() => {
    const values = new Set<string>()

    students.forEach((student) => {
      const value = normalizeAttendanceStatus(
        student.attendance
      )

      if (value) {
        values.add(value)
      }
    })

    return Array.from(values)
  }, [students])

  const enrollmentCourseOptions = useMemo(() => {
    const values = new Set<string>()

    students.forEach((student) => {
      const value = String(
        student.enrollmentCourseName || ''
      ).trim()

      if (value) {
        values.add(value)
      }
    })

    const ordered = courses
      .filter((course) =>
        values.has(course.name)
      )
      .map((course) => course.name)

    const remaining = Array.from(
      values
    ).filter(
      (value) => !ordered.includes(value)
    )

    return [
      ...ordered,
      ...remaining,
    ]
  }, [
    students,
    courses,
  ])

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

  const visibleDynamicFields =
    dynamicFields.filter(
      (field) =>
        field.is_active &&
        visibleColumns[
          `dynamic-${field.id}`
        ]
    )

  const visibleCourses = courses.filter(
    (course) =>
      visibleColumns[
        `course-${course.id}`
      ]
  )

  const visibleExtraColumns =
    getVisibleExtraColumns(visibleColumns)

  const totalColumns =
    1 +
    (allowStudentDeletion && selectionMode
      ? 1
      : 0) +
    baseColumns.filter(
      (column) =>
        visibleColumns[column.key] !== false
    ).length +
    visibleExtraColumns.length +
    visibleDynamicFields.length +
    visibleCourses.length

  const allStudentsSelected =
    students.length > 0 &&
    students.every((student) =>
      selectedStudentIds.includes(student.id)
    )

  return (
    <>
      <div
        dir="ltr"
        className="relative max-h-[590px] overflow-auto rounded-lg border [&>div]:overflow-visible"
      >
        <Table
          dir="rtl"
          className="min-w-[1450px]"
        >
          <TableHeader className="sticky top-0 z-20 bg-background">
            <TableRow>
              <TableHead className="w-[55px] text-center">
                #
              </TableHead>

              {allowStudentDeletion &&
                selectionMode && (
                  <TableHead className="w-[55px] text-center">
                    <input
                      type="checkbox"
                      checked={allStudentsSelected}
                      onChange={() => {
                        if (allStudentsSelected) {
                          students.forEach((student) => {
                            if (
                              selectedStudentIds.includes(
                                student.id
                              )
                            ) {
                              onToggleStudentSelection(
                                student.id
                              )
                            }
                          })
                        } else {
                          students.forEach((student) => {
                            if (
                              !selectedStudentIds.includes(
                                student.id
                              )
                            ) {
                              onToggleStudentSelection(
                                student.id
                              )
                            }
                          })
                        }
                      }}
                      aria-label="تحديد الكل"
                    />
                  </TableHead>
                )}

              {visibleColumns.name !== false && (
                <TableHead className="min-w-[220px]">
                  {filterInput('name', 'الاسم')}
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
                    'كل المستويات',
                    gradeOptions
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
                    'كل حالات السداد',
                    paymentStatusOptions
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
                    'كل حالات الحضور',
                    attendanceOptions
                  )}
                </TableHead>
              )}

              {visibleColumns.enrollmentCourseName && (
                <TableHead className="min-w-[190px]">
                  {filterSelect(
                    'enrollmentCourse',
                    'كل دورات الالتحاق',
                    enrollmentCourseOptions
                  )}
                </TableHead>
              )}

              {visibleExtraColumns.map((column) => {
                if (
                  column.key ===
                  'enrollmentCourseName'
                ) {
                  return null
                }

                return (
                  <TableHead key={column.key}>
                    {column.label}
                  </TableHead>
                )
              })}

              {visibleDynamicFields.map((field) => (
                <TableHead
                  key={`dynamic-${field.id}`}
                >
                  {field.name}
                </TableHead>
              ))}

              {visibleCourses.map((course) => (
                <TableHead
                  key={`course-${course.id}`}
                >
                  {course.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {students.map((student, index) => {
              const remaining = student.feeExempt
                ? 0
                : Math.max(
                    Number(student.amountDue) -
                      Number(student.amountPaid),
                    0
                  )

              const isSelected =
                selectedStudentIds.includes(
                  student.id
                )

              const isCurrentStudent =
                selectedStudentId === student.id

              return (
                <TableRow
                  key={student.id}
                  data-state={
                    isCurrentStudent
                      ? 'selected'
                      : undefined
                  }
                  className={`h-[48px] cursor-pointer transition-colors ${
                    isCurrentStudent
                      ? '!bg-primary/15 hover:!bg-primary/20'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => {
                    if (selectionMode) {
                      onToggleStudentSelection(
                        student.id
                      )
                      return
                    }

                    onSelectStudent(student.id)
                  }}
                >
                  <TableCell className="text-center text-muted-foreground">
                    {index + 1}
                  </TableCell>

                  {allowStudentDeletion &&
                    selectionMode && (
                      <TableCell className="text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() =>
                            onToggleStudentSelection(
                              student.id
                            )
                          }
                          onClick={(event) =>
                            event.stopPropagation()
                          }
                          aria-label={`تحديد ${student.name}`}
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
                      {student.personalId || '-'}
                    </TableCell>
                  )}

                  {visibleColumns.grade !== false && (
                    <TableCell>
                      {student.grade || '-'}
                    </TableCell>
                  )}

                  {visibleColumns.contact !== false && (
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

                  {visibleColumns.paymentStatus !== false && (
                    <TableCell>
                      <button
                        type="button"
                        className="rounded-md px-2 py-1 hover:bg-muted"
                        onClick={(event) => {
                          event.stopPropagation()
                          setPaymentStudent(student)
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
                        onClick={(event) => {
                          event.stopPropagation()
                          onOpenNotes(student)
                        }}
                      >
                        {student.notes || 'لا توجد'}
                      </button>
                    </TableCell>
                  )}

                  {visibleColumns.attendance !== false && (
                    <TableCell>
                      <button
                        type="button"
                        className="rounded-md px-2 py-1 text-xs hover:bg-muted"
                        onClick={(event) => {
                          event.stopPropagation()
                          onOpenAttendance(student)
                        }}
                      >
                        {normalizeAttendanceStatus(
                          student.attendance
                        )}
                      </button>
                    </TableCell>
                  )}

                  {visibleColumns.enrollmentCourseName && (
                    <TableCell>
                      {student.enrollmentCourseName ||
                        '-'}
                    </TableCell>
                  )}

                  {visibleColumns.studentId && (
                    <TableCell>
                      {student.studentId || '-'}
                    </TableCell>
                  )}

                  {visibleColumns.guardianRelation && (
                    <TableCell>
                      {student.guardianRelation || '-'}
                    </TableCell>
                  )}

                  {visibleColumns.studentPhone && (
                    <TableCell>
                      {student.studentPhone || '-'}
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
                      {remaining.toFixed(3)}
                    </TableCell>
                  )}

                  {visibleColumns.feeExempt && (
                    <TableCell>
                      {student.feeExempt ? 'نعم' : 'لا'}
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

                  {visibleDynamicFields.map((field) => (
                    <TableCell
                      key={`dynamic-${field.id}`}
                    >
                      {student.dynamicValues?.[
                        field.field_key
                      ] ||
                        student.dynamicValues?.[
                          field.id
                        ] ||
                        '-'}
                    </TableCell>
                  ))}

                  {visibleCourses.map((course) => {
                    const status =
                      student.courseStatuses?.find(
                        (item) =>
                          item.courseId === course.id
                      )

                    return (
                      <TableCell
                        key={`course-${course.id}`}
                      >
                        {status?.status || 'لم يسجل'}
                      </TableCell>
                    )
                  })}
                </TableRow>
              )
            })}

            {students.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={Math.max(totalColumns, 1)}
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
        <StudentPaymentDialog
          student={paymentStudent}
          onClose={() => setPaymentStudent(null)}
          onPaymentSaved={(
            studentId,
            amount,
            paymentStatus
          ) => {
            setPaymentStudent((current) =>
              current && current.id === studentId
                ? {
                    ...current,
                    amountPaid: amount,
                    paymentStatus,
                  }
                : current
            )
          }}
        />
      )}
    </>
  )
}
