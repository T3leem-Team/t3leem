'use client'

import {
Filter,
Settings2,
} from ‘lucide-react’

import { useState } from ‘react’

import {
Table,
TableBody,
TableCell,
TableHead,
TableHeader,
TableRow,
} from ‘@/components/ui/table’

import { StatusBadge } from ‘@/components/dashboard/status-badge’

import type {
StudentCourseStatus,
} from ‘./student-details’

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
}

const standardColumns = [
{
key: ‘studentId’,
label: ‘معرف الطالب’,
},
{
key: ‘gender’,
label: ‘الجنس’,
},
{
key: ‘age’,
label: ‘العمر’,
},
{
key: ‘phone’,
label: ‘رقم الهاتف’,
},
{
key: ‘whatsapp’,
label: ‘رقم واتساب’,
},
{
key: ‘status’,
label: ‘الحالة’,
},
{
key: ‘className’,
label: ‘الفصل’,
},
{
key: ‘source’,
label: ‘مصدر التسجيل’,
},
{
key: ‘amountDue’,
label: ‘الرسوم السنوية’,
},
{
key: ‘amountPaid’,
label: ‘المدفوع’,
},
{
key: ‘remaining’,
label: ‘المتبقي’,
},
{
key: ‘feeExempt’,
label: ‘الإعفاء’,
},
{
key: ‘chronicDiseases’,
label: ‘المعلومات الصحية’,
},
{
key: ‘createdAt’,
label: ‘تاريخ الإضافة’,
},
{
key: ‘updatedAt’,
label: ‘آخر تحديث’,
},
{
key: ‘academicYearName’,
label: ‘السنة الدراسية’,
},
]

const baseColumns = [
{
key: ‘name’,
label: ‘اسم الطالب’,
},
{
key: ‘personalId’,
label: ‘الرقم الشخصي’,
},
{
key: ‘grade’,
label: ‘الصف الأكاديمي’,
},
{
key: ‘contact’,
label: ‘التواصل’,
},
{
key: ‘paymentStatus’,
label: ‘الدفع’,
},
{
key: ‘notes’,
label: ‘ملاحظات’,
},
{
key: ‘attendance’,
label: ‘الحضور’,
},
]

function formatDate(value: string) {
if (!value) return ‘—’

const date = new Date(value)

if (Number.isNaN(date.getTime())) {
return value
}

return date.toLocaleDateString(‘ar-BH’)
}

function getSourceLabel(value: string) {
if (!value) return ‘—’

const map: Record<string, string> = {
external: ‘التسجيل الخارجي’,
internal: ‘التسجيل الداخلي’,
admin: ‘إضافة من الإدارة’,
registration: ‘التسجيل’,
unknown: ‘غير محدد’,
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
const [showColumnCustomization, setShowColumnCustomization] =
useState(false)

const [paymentStudent, setPaymentStudent] =
useState<StudentTableStudent | null>(null)

const [showAddPayment, setShowAddPayment] =
useState(false)

const [paymentAmount, setPaymentAmount] =
useState(’’)

const [paymentMethod, setPaymentMethod] =
useState(‘نقدي’)

const [paymentDate, setPaymentDate] =
useState(() =>
new Date().toISOString().slice(0, 10)
)

const [paymentReference, setPaymentReference] =
useState(’’)

const [paymentNotes, setPaymentNotes] =
useState(’’)

const [paymentSaving, setPaymentSaving] =
useState(false)

const [paymentMessage, setPaymentMessage] =
useState(’’)

const textFilter = (
key: keyof StudentTableFilters,
placeholder = ‘بحث’
) => (
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
Object.values(visibleColumns).filter(Boolean).length

return (
{/* تخصيص الأعمدة */}
<button
type=“button”
onClick={() =>
setShowColumnCustomization(
(current) => !current
)
}
className=“inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium transition hover:bg-muted”
>
تخصيص الأعمدة
  {showColumnCustomization && (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="mb-3 text-sm font-semibold">
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
            {standardColumns.map((column) => (
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
          </div>
        </div>
        {dynamicFields.length > 0 && (
          <div className="col-span-full mt-2 border-t pt-3">
            <div className="mb-2 text-xs font-semibold text-muted-foreground">
              حقول التسجيل الإضافية
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {dynamicFields.map((field) => {
                const key = `dynamic-${field.id}`
                return (
                  <label
                    key={field.id}
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
                    {field.name}
                  </label>
                )
              })}
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
  )}
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
              {textFilter('personalId')}
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
                {academicLevels.map((level) => (
                  <option
                    key={level.id}
                    value={level.name}
                  >
                    {level.name}
                  </option>
                ))}
              </select>
            </TableHead>
          )}
          {visibleColumns.className && (
            <TableHead>الفصل</TableHead>
          )}
          {visibleColumns.contact && (
            <TableHead>
              التواصل
              {textFilter('phone')}
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
                value={filters.paymentStatus}
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
              {textFilter('notes')}
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
              {textFilter('attendance')}
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
          {dynamicFields.map((field) => {
            const key = `dynamic-${field.id}`
            if (!visibleColumns[key]) {
              return null
            }
            return (
              <TableHead key={field.id}>
                {field.name}
              </TableHead>
            )
          })}
          {courses.map((course) => {
            const key = `course-${course.id}`
            if (!visibleColumns[key]) {
              return null
            }
            return (
              <TableHead key={course.id}>
                {course.name}
              </TableHead>
            )
          })}
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
          return (
            <TableRow
              key={student.id}
              onClick={() =>
                onSelectStudent(student.id)
              }
              className={
                selectedStudentId === student.id
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
                  {student.studentId || '—'}
                </TableCell>
              )}
              {visibleColumns.personalId && (
                <TableCell>
                  {student.personalId || '—'}
                </TableCell>
              )}
              {visibleColumns.gender && (
                <TableCell>
                  {student.gender || '—'}
                </TableCell>
              )}
              {visibleColumns.age && (
                <TableCell>
                  {student.age ?? '—'}
                </TableCell>
              )}
              {visibleColumns.grade && (
                <TableCell>
                  {student.grade || '—'}
                </TableCell>
              )}
              {visibleColumns.className && (
                <TableCell>
                  {student.className || '—'}
                </TableCell>
              )}
              {visibleColumns.contact && (
                <TableCell
                  dir="ltr"
                  className="text-right"
                >
                  <div className="space-y-1">
                    <div>
                      {student.phone || '—'}
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
                  {student.phone || '—'}
                </TableCell>
              )}
              {visibleColumns.whatsapp && (
                <TableCell dir="ltr">
                  {student.whatsapp || '—'}
                </TableCell>
              )}
              {visibleColumns.status && (
                <TableCell>
                  {student.status || '—'}
                </TableCell>
              )}
              {visibleColumns.source && (
                <TableCell>
                  {getSourceLabel(student.source)}
                </TableCell>
              )}
              {visibleColumns.paymentStatus && (
                <TableCell>
                  <button
                    type="button"
                    className="rounded-md px-2 py-1 transition hover:bg-muted"
                    onClick={(event) => {
                      event.stopPropagation()
                      setPaymentStudent(student)
                      setShowAddPayment(false)
                      setPaymentMessage('')
                      const remainingAmount =
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
                      setPaymentAmount(
                        remainingAmount > 0
                          ? remainingAmount.toFixed(3)
                          : '0'
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
              {visibleColumns.notes && (
                <TableCell>
                  <button
                    type="button"
                    className="max-w-[220px] truncate text-right text-sm hover:underline"
                    onClick={(event) => {
                      event.stopPropagation()
                      onOpenNotes(student)
                    }}
                  >
                    {student.notes ||
                    student.chronicDiseases
                      ? [
                          student.notes,
                          student.chronicDiseases,
                        ]
                          .filter(Boolean)
                          .join(' • ')
                      : '—'}
                  </button>
                </TableCell>
              )}
              {visibleColumns.chronicDiseases && (
                <TableCell>
                  {student.chronicDiseases || '—'}
                </TableCell>
              )}
              {visibleColumns.attendance && (
                <TableCell>
                  <button
                    type="button"
                    className="rounded-md px-2 py-1 transition hover:bg-muted"
                    onClick={(event) => {
                      event.stopPropagation()
                      onOpenAttendance(student)
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
                  {student.academicYearName || '—'}
                </TableCell>
              )}
              {dynamicFields.map((field) => {
                const key = `dynamic-${field.id}`
                if (!visibleColumns[key]) {
                  return null
                }
                return (
                  <TableCell key={field.id}>
                    {student.dynamicValues?.[
                      field.id
                    ] || '—'}
                  </TableCell>
                )
              })}
              {courses.map((course) => {
                const key = `course-${course.id}`
                if (!visibleColumns[key]) {
                  return null
                }
                const courseStatus =
                  student.courseStatuses.find(
                    (item) =>
                      item.courseId === course.id
                  )
                return (
                  <TableCell key={course.id}>
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
              })}
            </TableRow>
          )
        })}
        {students.length === 0 && (
          <TableRow>
            <TableCell
              colSpan={visibleColumnCount}
              className="h-24 text-center text-muted-foreground"
            >
              لا توجد نتائج مطابقة
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  </div>
  {/* تفاصيل الدفع */}
  {paymentStudent && (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => {
        if (!paymentSaving) {
          setPaymentStudent(null)
          setShowAddPayment(false)
        }
      }}
    >
      <div
        className="w-full max-w-lg rounded-xl border bg-background p-5 shadow-xl"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              تفاصيل الدفع
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {paymentStudent.name}
            </p>
          </div>
          <button
            type="button"
            disabled={paymentSaving}
            onClick={() => {
              setPaymentStudent(null)
              setShowAddPayment(false)
            }}
            className="rounded-md px-3 py-1 text-sm hover:bg-muted"
          >
            إغلاق
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">
              الرسوم السنوية
            </div>
            <div className="mt-1 font-semibold">
              {Number(
                paymentStudent.amountDue
              ).toFixed(3)}
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">
              المدفوع
            </div>
            <div className="mt-1 font-semibold">
              {Number(
                paymentStudent.amountPaid
              ).toFixed(3)}
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
              ).toFixed(3)}
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">
              الحالة
            </div>
            <div className="mt-2">
              <StatusBadge
                status={
                  paymentStudent.paymentStatus
                }
              />
            </div>
          </div>
        </div>
        {!paymentStudent.feeExempt &&
          Number(paymentStudent.amountDue) >
            Number(paymentStudent.amountPaid) && (
            <div className="mt-5">
              {!showAddPayment ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowAddPayment(true)
                    setPaymentMessage('')
                    const remainingAmount =
                      Math.max(
                        Number(
                          paymentStudent.amountDue
                        ) -
                          Number(
                            paymentStudent.amountPaid
                          ),
                        0
                      )
                    setPaymentAmount(
                      remainingAmount.toFixed(3)
                    )
                  }}
                  className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  إضافة دفعة
                </button>
              ) : (
                <div className="space-y-4 rounded-lg border p-4">
                  <div className="text-sm font-semibold">
                    إضافة دفعة
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">
                      المبلغ
                    </label>
                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={paymentAmount}
                      onChange={(event) =>
                        setPaymentAmount(
                          event.target.value
                        )
                      }
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">
                      طريقة الدفع
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(event) =>
                        setPaymentMethod(
                          event.target.value
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
                    <label className="mb-1 block text-sm">
                      تاريخ الدفع
                    </label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(event) =>
                        setPaymentDate(
                          event.target.value
                        )
                      }
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">
                      رقم المرجع
                    </label>
                    <input
                      value={paymentReference}
                      onChange={(event) =>
                        setPaymentReference(
                          event.target.value
                        )
                      }
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">
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
                    <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                      {paymentMessage}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={paymentSaving}
                      onClick={async () => {
                        const amount =
                          Number(
                            paymentAmount
                          )
                        const remaining =
                          Math.max(
                            Number(
                              paymentStudent.amountDue
                            ) -
                              Number(
                                paymentStudent.amountPaid
                              ),
                            0
                          )
                        if (
                          !Number.isFinite(
                            amount
                          ) ||
                          amount <= 0
                        ) {
                          setPaymentMessage(
                            'أدخل مبلغًا صحيحًا.'
                          )
                          return
                        }
                        if (
                          amount > remaining
                        ) {
                          setPaymentMessage(
                            `المبلغ أكبر من المتبقي (${remaining.toFixed(3)}).`
                          )
                          return
                        }
                        setPaymentSaving(true)
                        setPaymentMessage('')
                        try {
                          const response =
                            await fetch(
                              '/api/payments',
                              {
                                method: 'POST',
                                headers: {
                                  'Content-Type':
                                    'application/json',
                                },
                                body: JSON.stringify({
                                  student_id:
                                    paymentStudent.id,
                                  academic_year_id:
                                    paymentStudent.academicYearId,
                                  amount,
                                  payment_method:
                                    paymentMethod,
                                  payment_date:
                                    paymentDate,
                                  reference_number:
                                    paymentReference ||
                                    null,
                                  notes:
                                    paymentNotes ||
                                    null,
                                }),
                              }
                            )
                          const data =
                            await response.json()
                          if (!response.ok) {
                            throw new Error(
                              data.error ||
                                'تعذر حفظ الدفعة.'
                            )
                          }
                          const newAmountPaid =
                            Number(
                              paymentStudent.amountPaid
                            ) + amount
                          const newPaymentStatus =
                            newAmountPaid >=
                            Number(
                              paymentStudent.amountDue
                            )
                              ? 'مدفوع بالكامل'
                              : 'مدفوع جزئيًا'
                          setPaymentStudent({
                            ...paymentStudent,
                            amountPaid:
                              newAmountPaid,
                            paymentStatus:
                              newPaymentStatus,
                          })
                          setPaymentMessage(
                            'تمت إضافة الدفعة بنجاح.'
                          )
                          setPaymentAmount('')
                          setPaymentReference('')
                          setPaymentNotes('')
                          setTimeout(() => {
                            setShowAddPayment(false)
                            setPaymentMessage('')
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
                      }}
                      className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {paymentSaving
                        ? 'جاري الحفظ...'
                        : 'حفظ الدفعة'}
                    </button>
                    <button
                      type="button"
                      disabled={paymentSaving}
                      onClick={() =>
                        setShowAddPayment(false)
                      }
                      className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        {paymentStudent.feeExempt && (
          <div className="mt-5 rounded-md border p-3 text-center text-sm text-muted-foreground">
            الطالب معفي من الرسوم ولا يمكن إضافة دفعة.
          </div>
        )}
        {!paymentStudent.feeExempt &&
          Number(paymentStudent.amountDue) <=
            Number(paymentStudent.amountPaid) && (
            <div className="mt-5 rounded-md border p-3 text-center text-sm text-muted-foreground">
              تم سداد الرسوم بالكامل.
            </div>
          )}
      </div>
    </div>
  )}
</div>

)
}
