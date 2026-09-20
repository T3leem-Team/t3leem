'use client'

import {
  Filter,
  X,
} from 'lucide-react'

import { useRouter } from 'next/navigation'

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
  days: string[]
}

export type StudentTableStudent = {
  id: string
  studentId: string
  name: string
  personalId: string
  gender: string
  age: number | null
  grade: string
  className: string
  phone: string
  whatsapp: string
  status: string
  paymentStatus: string
  amountDue: number
  amountPaid: number
  feeExempt: boolean
  chronicDiseases: string
  notes: string
  source: string
  createdAt: string
  updatedAt: string
  academicYearId: string
  academicYearName: string
  attendance: string
  courseStatuses: StudentCourseStatus[]
  dynamicValues: Record<string, string>
}

type Props = {
  students: StudentTableStudent[]
  courses: StudentTableCourse[]
  dynamicFields: StudentDynamicField[]
  academicLevels: {
    id: string
    name: string
    sort_order: number
  }[]
  filters: StudentTableFilters
  visibleColumns: Record<string, boolean>
  selectedStudentId: string
  currentCourseName: string
  onSelectStudent: (id: string) => void
  onUpdateFilter: (
    key: keyof StudentTableFilters,
    value: string
  ) => void
  onToggleColumn: (key: string) => void
  onOpenNotes: (student: StudentTableStudent) => void
  onOpenAttendance: (
    student: StudentTableStudent
  ) => void
  onOpenColumns: () => void
}

const standardColumns = [
  {
    key: 'studentId',
    label: 'معرف الطالب',
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
    label: 'رقم واتساب',
  },
  {
    key: 'status',
    label: 'الحالة',
  },
  {
    key: 'className',
    label: 'الفصل',
  },
  {
    key: 'source',
    label: 'مصدر التسجيل',
  },
  {
    key: 'amountDue',
    label: 'الرسوم السنوية',
  },
  {
    key: 'amountPaid',
    label: 'المدفوع',
  },
  {
    key: 'remaining',
    label: 'المتبقي',
  },
  {
    key: 'feeExempt',
    label: 'الإعفاء',
  },
  {
    key: 'chronicDiseases',
    label: 'المعلومات الصحية',
  },
  {
    key: 'createdAt',
    label: 'تاريخ الإضافة',
  },
  {
    key: 'updatedAt',
    label: 'آخر تحديث',
  },
  {
    key: 'academicYearName',
    label: 'السنة الدراسية',
  },
]

const baseColumns = [
  {
    key: 'name',
    label: 'اسم الطالب',
  },
  {
    key: 'personalId',
    label: 'الرقم الشخصي',
  },
  {
    key: 'grade',
    label: 'الصف الأكاديمي',
  },
  {
    key: 'contact',
    label: 'التواصل',
  },
  {
    key: 'paymentStatus',
    label: 'الدفع',
  },
  {
    key: 'notes',
    label: 'ملاحظات',
  },
  {
    key: 'attendance',
    label: 'الحضور',
  },
]

function formatDate(value: string) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString('ar-BH')
}

function getSourceLabel(value: string) {
  if (!value) return '—'

  const map: Record<string, string> = {
    external: 'التسجيل الخارجي',
    internal: 'التسجيل الداخلي',
    admin: 'إضافة من الإدارة',
    registration: 'التسجيل',
    unknown: 'غير محدد',
  }

  return map[value] ?? value
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
  const router = useRouter()

  const textFilter = (
    key: keyof StudentTableFilters,
    placeholder = 'بحث'
  ) => (
    <div className="relative mt-2">
      <Filter className="absolute right-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />

      <input
        value={filters[key]}
        onChange={(event) =>
          onUpdateFilter(
            key,
            event.target.value
          )
        }
        placeholder={placeholder}
        className="h-8 w-full min-w-[90px] rounded border bg-background px-2 pr-7 text-xs outline-none"
        onClick={(event) =>
          event.stopPropagation()
        }
      />
    </div>
  )

  const visibleColumnCount =
    1 +
    Object.values(visibleColumns).filter(
      Boolean
    ).length

  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-muted/30 p-3">
        <div className="mb-2 text-sm font-semibold">
          تخصيص الأعمدة
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {baseColumns.map((column) => (
            <label
              key={column.key}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
            >
              <input
                type="checkbox"
                checked={Boolean(
                  visibleColumns[column.key]
                )}
                onChange={() =>
                  onToggleColumn(column.key)
                }
              />

              {column.label}
            </label>
          ))}

          <div className="col-span-full mt-2 border-t pt-3">
            <div className="mb-2 text-xs font-semibold text-muted-foreground">
              بيانات الطالب
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {standardColumns.map(
                (column) => (
                  <label
                    key={column.key}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(
                        visibleColumns[
                          column.key
                        ]
                      )}
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
          </div>

          {dynamicFields.length > 0 && (
            <div className="col-span-full mt-2 border-t pt-3">
              <div className="mb-2 text-xs font-semibold text-muted-foreground">
                حقول التسجيل الإضافية
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {dynamicFields.map(
                  (field) => {
                    const key = `dynamic-${field.id}`

                    return (
                      <label
                        key={field.id}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(
                            visibleColumns[
                              key
                            ]
                          )}
                          onChange={() =>
                            onToggleColumn(
                              key
                            )
                          }
                        />

                        {field.name}
                      </label>
                    )
                  }
                )}
              </div>
            </div>
          )}

          {courses.length > 0 && (
            <div className="col-span-full mt-2 border-t pt-3">
              <div className="mb-2 text-xs font-semibold text-muted-foreground">
                دورات السنة الحالية
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {courses.map((course) => {
                  const key = `course-${course.id}`

                  return (
                    <label
                      key={course.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(
                          visibleColumns[key]
                        )}
                        onChange={() =>
                          onToggleColumn(key)
                        }
                      />

                      {course.name}
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          الحقول الإضافية مأخوذة مباشرة من حقول التسجيل
          الموجودة في Supabase. أي حقل جديد تضيفه من إعدادات
          التسجيل سيظهر هنا تلقائيًا.
        </p>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">
                #
              </TableHead>

              {visibleColumns.name && (
                <TableHead>
                  اسم الطالب
                  {textFilter('name')}
                </TableHead>
              )}

              {visibleColumns.studentId && (
                <TableHead>
                  معرف الطالب
                </TableHead>
              )}

              {visibleColumns.personalId && (
                <TableHead>
                  الرقم الشخصي
                  {textFilter(
                    'personalId'
                  )}
                </TableHead>
              )}

              {visibleColumns.gender && (
                <TableHead>الجنس</TableHead>
              )}

              {visibleColumns.age && (
                <TableHead>العمر</TableHead>
              )}

              {visibleColumns.grade && (
                <TableHead>
                  الصف الأكاديمي

                  <select
                    value={filters.grade}
                    onChange={(event) =>
                      onUpdateFilter(
                        'grade',
                        event.target.value
                      )
                    }
                    onClick={(event) =>
                      event.stopPropagation()
                    }
                    className="mt-2 h-8 w-full min-w-[120px] rounded border bg-background px-2 text-xs"
                  >
                    <option value="">
                      الكل
                    </option>

                    {academicLevels.map(
                      (level) => (
                        <option
                          key={level.id}
                          value={level.name}
                        >
                          {level.name}
                        </option>
                      )
                    )}
                  </select>
                </TableHead>
              )}

              {visibleColumns.className && (
                <TableHead>الفصل</TableHead>
              )}

              {visibleColumns.contact && (
                <TableHead>
                  التواصل
                  {textFilter(
                    'phone'
                  )}
                </TableHead>
              )}

              {visibleColumns.phone && (
                <TableHead>
                  رقم الهاتف
                </TableHead>
              )}

              {visibleColumns.whatsapp && (
                <TableHead>
                  رقم واتساب
                </TableHead>
              )}

              {visibleColumns.status && (
                <TableHead>الحالة</TableHead>
              )}

              {visibleColumns.source && (
                <TableHead>
                  مصدر التسجيل
                </TableHead>
              )}

              {visibleColumns.paymentStatus && (
                <TableHead>
                  الدفع

                  <select
                    value={
                      filters.paymentStatus
                    }
                    onChange={(event) =>
                      onUpdateFilter(
                        'paymentStatus',
                        event.target.value
                      )
                    }
                    onClick={(event) =>
                      event.stopPropagation()
                    }
                    className="mt-2 h-8 w-full min-w-[120px] rounded border bg-background px-2 text-xs"
                  >
                    <option value="">
                      الكل
                    </option>
                    <option value="مدفوع بالكامل">
                      مدفوع بالكامل
                    </option>
                    <option value="مدفوع جزئيًا">
                      مدفوع جزئيًا
                    </option>
                    <option value="غير مدفوع">
                      غير مدفوع
                    </option>
                    <option value="معفي">
                      معفي
                    </option>
                  </select>
                </TableHead>
              )}

              {visibleColumns.amountDue && (
                <TableHead>
                  الرسوم السنوية
                </TableHead>
              )}

              {visibleColumns.amountPaid && (
                <TableHead>
                  المدفوع
                </TableHead>
              )}

              {visibleColumns.remaining && (
                <TableHead>
                  المتبقي
                </TableHead>
              )}

              {visibleColumns.feeExempt && (
                <TableHead>
                  الإعفاء
                </TableHead>
              )}

              {visibleColumns.notes && (
                <TableHead>
                  ملاحظات
                  {textFilter(
                    'notes'
                  )}
                </TableHead>
              )}

              {visibleColumns.chronicDiseases && (
                <TableHead>
                  المعلومات الصحية
                </TableHead>
              )}

              {visibleColumns.attendance && (
                <TableHead>
                  <div>الحضور</div>

                  {currentCourseName && (
                    <div className="mt-1 text-[11px] font-normal text-muted-foreground">
                      {currentCourseName}
                    </div>
                  )}

                  {textFilter(
                    'attendance'
                  )}
                </TableHead>
              )}

              {visibleColumns.createdAt && (
                <TableHead>
                  تاريخ الإضافة
                </TableHead>
              )}

              {visibleColumns.updatedAt && (
                <TableHead>
                  آخر تحديث
                </TableHead>
              )}

              {visibleColumns.academicYearName && (
                <TableHead>
                  السنة الدراسية
                </TableHead>
              )}

              {dynamicFields.map(
                (field) => {
                  const key = `dynamic-${field.id}`

                  if (
                    !visibleColumns[key]
                  ) {
                    return null
                  }

                  return (
                    <TableHead
                      key={field.id}
                    >
                      {field.name}
                    </TableHead>
                  )
                }
              )}

              {courses.map((course) => {
                const key = `course-${course.id}`

                if (
                  !visibleColumns[key]
                ) {
                  return null
                }

                return (
                  <TableHead
                    key={course.id}
                  >
                    {course.name}
                  </TableHead>
                )
              })}
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

                return (
                  <TableRow
                    key={student.id}
                    onClick={() =>
                      onSelectStudent(
                        student.id
                      )
                    }
                    className={
                      selectedStudentId ===
                      student.id
                        ? 'cursor-pointer bg-primary/10'
                        : 'cursor-pointer'
                    }
                  >
                    <TableCell className="text-center text-muted-foreground">
                      {index + 1}
                    </TableCell>

                    {visibleColumns.name && (
                      <TableCell className="font-medium">
                        {student.name}
                      </TableCell>
                    )}

                    {visibleColumns.studentId && (
                      <TableCell>
                        {student.studentId ||
                          '—'}
                      </TableCell>
                    )}

                    {visibleColumns.personalId && (
                      <TableCell>
                        {student.personalId ||
                          '—'}
                      </TableCell>
                    )}

                    {visibleColumns.gender && (
                      <TableCell>
                        {student.gender ||
                          '—'}
                      </TableCell>
                    )}

                    {visibleColumns.age && (
                      <TableCell>
                        {student.age ??
                          '—'}
                      </TableCell>
                    )}

                    {visibleColumns.grade && (
                      <TableCell>
                        {student.grade ||
                          '—'}
                      </TableCell>
                    )}

                    {visibleColumns.className && (
                      <TableCell>
                        {student.className ||
                          '—'}
                      </TableCell>
                    )}

                    {visibleColumns.contact && (
                      <TableCell
                        dir="ltr"
                        className="text-right"
                      >
                        <div className="space-y-1">
                          <div>
                            {student.phone ||
                              '—'}
                          </div>

                          <div className="text-muted-foreground">
                            {student.whatsapp
                              ? `واتساب: ${student.whatsapp}`
                              : 'واتساب: —'}
                          </div>
                        </div>
                      </TableCell>
                    )}

                    {visibleColumns.phone && (
                      <TableCell dir="ltr">
                        {student.phone ||
                          '—'}
                      </TableCell>
                    )}

                    {visibleColumns.whatsapp && (
                      <TableCell dir="ltr">
                        {student.whatsapp ||
                          '—'}
                      </TableCell>
                    )}

                    {visibleColumns.status && (
                      <TableCell>
                        {student.status ||
                          '—'}
                      </TableCell>
                    )}

                    {visibleColumns.source && (
                      <TableCell>
                        {getSourceLabel(
                          student.source
                        )}
                      </TableCell>
                    )}

                    {visibleColumns.paymentStatus && (
                      <TableCell>
                        <button
                          type="button"
                          className="rounded-md px-2 py-1 transition hover:bg-muted"
                          onClick={(event) => {
                            event.stopPropagation()

                            router.push(
                              `/payments?student=${encodeURIComponent(
                                student.id
                              )}&return=/students`
                            )
                          }}
                        >
                          {student.paymentStatus ===
                          'مدفوع بالكامل' ? (
                            <span className="inline-flex flex-col items-center gap-1">
                              <span className="text-xs font-medium">
                                تفاصيل
                              </span>
                              <StatusBadge status="مدفوع بالكامل" />
                            </span>
                          ) : student.paymentStatus ===
                            'مدفوع جزئيًا' ? (
                            <span className="inline-flex flex-col items-center gap-1">
                              <span className="text-xs font-medium">
                                متبقي
                              </span>
                              <StatusBadge status="مدفوع جزئيًا" />
                            </span>
                          ) : student.paymentStatus ===
                            'غير مدفوع' ? (
                            <span className="inline-flex flex-col items-center gap-1">
                              <span className="text-xs font-medium">
                                غير مدفوع
                              </span>
                              <StatusBadge status="غير مدفوع" />
                            </span>
                          ) : (
                            <span className="inline-flex flex-col items-center gap-1">
                              <span className="text-xs font-medium">
                                معفي
                              </span>
                              <StatusBadge status="معفي" />
                            </span>
                          )}
                        </button>
                      </TableCell>
                    )}

                    {visibleColumns.amountDue && (
                      <TableCell>
                        {student.amountDue.toFixed(
                          3
                        )}
                      </TableCell>
                    )}

                    {visibleColumns.amountPaid && (
                      <TableCell>
                        {student.amountPaid.toFixed(
                          3
                        )}
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

                    {visibleColumns.notes && (
                      <TableCell>
                        <button
                          type="button"
                          className="max-w-[220px] truncate text-right text-sm hover:underline"
                          onClick={(event) => {
                            event.stopPropagation()

                            onOpenNotes(
                              student
                            )
                          }}
                        >
                          {student.notes ||
                          student.chronicDiseases
                            ? [
                                student.notes,
                                student.chronicDiseases,
                              ]
                                .filter(
                                  Boolean
                                )
                                .join(
                                  ' • '
                                )
                            : '—'}
                        </button>
                      </TableCell>
                    )}

                    {visibleColumns.chronicDiseases && (
                      <TableCell>
                        {student.chronicDiseases ||
                          '—'}
                      </TableCell>
                    )}

                    {visibleColumns.attendance && (
                      <TableCell>
                        <button
                          type="button"
                          className="rounded-md px-2 py-1 transition hover:bg-muted"
                          onClick={(event) => {
                            event.stopPropagation()

                            onOpenAttendance(
                              student
                            )
                          }}
                        >
                          {student.attendance ===
                          'حاضر' ? (
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">
                              حاضر
                            </span>
                          ) : student.attendance ===
                            'لم تقم الدورة حتى الآن' ? (
                            <span className="text-amber-600 dark:text-amber-400">
                              لم تقم الدورة حتى الآن
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              غير حاضر
                            </span>
                          )}
                        </button>
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
                          '—'}
                      </TableCell>
                    )}

                    {dynamicFields.map(
                      (field) => {
                        const key = `dynamic-${field.id}`

                        if (
                          !visibleColumns[
                            key
                          ]
                        ) {
                          return null
                        }

                        return (
                          <TableCell
                            key={field.id}
                          >
                            {student
                              .dynamicValues?.[
                              field.id
                            ] ||
                              '—'}
                          </TableCell>
                        )
                      }
                    )}

                    {courses.map(
                      (course) => {
                        const key = `course-${course.id}`

                        if (
                          !visibleColumns[
                            key
                          ]
                        ) {
                          return null
                        }

                        const courseStatus =
                          student.courseStatuses.find(
                            (
                              item
                            ) =>
                              item.courseId ===
                              course.id
                          )

                        return (
                          <TableCell
                            key={course.id}
                          >
                            {courseStatus?.status ===
                            'حاضر' ? (
                              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                حاضر
                              </span>
                            ) : courseStatus?.status ===
                              'لم تقم الدورة حتى الآن' ? (
                              <span className="text-amber-600 dark:text-amber-400">
                                لم تقم
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                لم يحضر
                              </span>
                            )}
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
                  colSpan={
                    visibleColumnCount
                  }
                  className="h-24 text-center text-muted-foreground"
                >
                  لا توجد نتائج مطابقة
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
