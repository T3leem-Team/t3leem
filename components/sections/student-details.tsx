'use client'

import { useState } from 'react'

import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'

import {
  StudentAttendanceDetails,
  type StudentAttendanceCourse,
  type StudentAttendanceRecord,
} from './student-attendance-details'

export type StudentCourseStatus = {
  courseId: string
  courseName: string
  startDate: string | null
  endDate: string | null
  status:
    | 'حاضر'
    | 'لم يحضر'
    | 'لم تقم الدورة حتى الآن'
}

export type StudentAttendanceSummary = {
  courseId: string
  courseName: string
  startDate: string | null
  endDate: string | null
  days: string[]
  teacherName?: string | null
  totalDays: number
  present: number
  absent: number
  late: number
  excused: number
  notRecorded: number
  percentage: number
}

export type StudentDetailsStudent = {
  id: string
  name: string

  personalId?: string

  /*
   * البيانات الجديدة
   */
  guardianRelation?: string | null
  studentPhone?: string | null
  enrollmentCourseName?: string | null

  grade?: string
  phone?: string
  whatsapp?: string
  status?: string
  paymentStatus?: string
  amountDue?: number
  amountPaid?: number
  feeExempt?: boolean
  notes?: string
  chronicDiseases?: string
  attendance?: string
  teacherName?: string | null
  courseStatuses?: StudentCourseStatus[]
  attendanceSummaries?: StudentAttendanceSummary[]
  attendanceRecords?: StudentAttendanceRecord[]
}

type StudentDetailsProps = {
  student: StudentDetailsStudent | null
  mode: 'overview' | 'attendance' | 'notes' | null
  onClose: () => void
}

function formatDate(value: string | null) {
  if (!value) {
    return '—'
  }

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString('ar-BH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatMoney(value: number | undefined) {
  return Number(value ?? 0).toLocaleString('ar-BH', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })
}

function getPaymentStatusClass(
  status: string | undefined,
) {
  switch (status) {
    case 'مدفوع بالكامل':
      return 'text-emerald-600 dark:text-emerald-400'

    case 'مدفوع جزئيًا':
      return 'text-amber-600 dark:text-amber-400'

    case 'غير مدفوع':
      return 'text-red-600 dark:text-red-400'

    case 'معفي':
      return 'text-blue-600 dark:text-blue-400'

    default:
      return 'text-muted-foreground'
  }
}

function getCourseStatusClass(
  status: StudentCourseStatus['status'],
) {
  switch (status) {
    case 'حاضر':
      return 'text-emerald-600 dark:text-emerald-400'

    case 'لم يحضر':
      return 'text-muted-foreground'

    case 'لم تقم الدورة حتى الآن':
      return 'text-amber-600 dark:text-amber-400'

    default:
      return 'text-muted-foreground'
  }
}

function getTodayString() {
  const today = new Date()

  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-')
}

function getCourseDisplayState(
  summary: StudentAttendanceSummary,
) {
  const today = getTodayString()

  if (
    summary.startDate &&
    today < summary.startDate
  ) {
    return 'لم تبدأ'
  }

  if (
    summary.endDate &&
    today > summary.endDate
  ) {
    return 'منتهية'
  }

  return 'حالية'
}

function SummaryCard({
  label,
  value,
  valueClassName = '',
}: {
  label: string
  value: string | number
  valueClassName?: string
}) {
  return (
    <div className="rounded-xl border bg-background p-3 text-center">
      <div className="text-xs text-muted-foreground">
        {label}
      </div>

      <div
        className={`mt-1 text-lg font-bold ${valueClassName}`}
      >
        {value}
      </div>
    </div>
  )
}

export function StudentDetails({
  student,
  mode,
  onClose,
}: StudentDetailsProps) {
  const [
    selectedAttendanceCourse,
    setSelectedAttendanceCourse,
  ] = useState<StudentAttendanceSummary | null>(null)

  if (!student || !mode) {
    return null
  }

  /*
   * نعرض فقط الدورات الحالية والمنتهية.
   * الدورات التي لم تبدأ بعد لا تظهر هنا.
   */
  const attendanceCourses = (
    student.attendanceSummaries ?? []
  ).filter((course) => {
    const today = getTodayString()

    if (
      course.startDate &&
      today < course.startDate
    ) {
      return false
    }

    return true
  })

  if (selectedAttendanceCourse) {
    const course: StudentAttendanceCourse = {
      id: selectedAttendanceCourse.courseId,
      name: selectedAttendanceCourse.courseName,
      startDate: selectedAttendanceCourse.startDate,
      endDate: selectedAttendanceCourse.endDate,
      days: selectedAttendanceCourse.days,
    }

    return (
      <StudentAttendanceDetails
        studentId={student.id}
        studentName={student.name}
        course={course}
        records={student.attendanceRecords ?? []}
        onClose={() =>
          setSelectedAttendanceCourse(null)
        }
      />
    )
  }

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="إغلاق"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">
              تفاصيل الطالب
            </h2>

            <p className="mt-1 truncate text-sm text-muted-foreground">
              {student.name}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 hover:bg-muted"
            aria-label="إغلاق"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Basic information */}
            <section className="rounded-xl border">
              <div className="border-b px-4 py-3">
                <h3 className="font-semibold">
                  بيانات الطالب
                </h3>
              </div>

              <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                <InfoCard
                  label="اسم الطالب"
                  value={student.name}
                />

                <InfoCard
                  label="الرقم الشخصي"
                  value={
                    student.personalId || '—'
                  }
                />

                <InfoCard
                  label="رقم الطالب"
                  value={
                    student.studentPhone || '—'
                  }
                />

                <InfoCard
                  label="صلة القرابة"
                  value={
                    student.guardianRelation ||
                    '—'
                  }
                />

                <InfoCard
                  label="دورة الالتحاق"
                  value={
                    student.enrollmentCourseName ||
                    '—'
                  }
                />

                <InfoCard
                  label="الصف"
                  value={student.grade || '—'}
                />

                <InfoCard
                  label="الهاتف"
                  value={student.phone || '—'}
                />

                <InfoCard
                  label="واتساب"
                  value={student.whatsapp || '—'}
                />

                <InfoCard
                  label="الحالة"
                  value={student.status || '—'}
                />
              </div>
            </section>

            {/* Payment */}
            <section className="rounded-xl border">
              <div className="border-b px-4 py-3">
                <h3 className="font-semibold">
                  المدفوعات
                </h3>
              </div>

              <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
                <InfoCard
                  label="حالة الدفع"
                  value={
                    student.paymentStatus || '—'
                  }
                  valueClassName={getPaymentStatusClass(
                    student.paymentStatus,
                  )}
                />

                <InfoCard
                  label="الرسوم السنوية"
                  value={`${formatMoney(
                    student.amountDue,
                  )} د.ب`}
                />

                <InfoCard
                  label="المدفوع"
                  value={`${formatMoney(
                    student.amountPaid,
                  )} د.ب`}
                />

                <InfoCard
                  label="المتبقي"
                  value={
                    student.feeExempt
                      ? '0.000 د.ب'
                      : `${formatMoney(
                          Math.max(
                            Number(
                              student.amountDue ?? 0,
                            ) -
                              Number(
                                student.amountPaid ?? 0,
                              ),
                            0,
                          ),
                        )} د.ب`
                  }
                />
              </div>
            </section>

            {/* Attendance */}
            <section className="rounded-xl border">
              <div className="border-b px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">
                      حضور الطالب
                    </h3>

                    <p className="mt-1 text-xs text-muted-foreground">
                      اختر دورة من السنة الدراسية الحالية لعرض نسبة الحضور.
                    </p>
                  </div>

                  <span className="rounded-full bg-muted px-3 py-1 text-xs">
                    {attendanceCourses.length} دورة
                  </span>
                </div>
              </div>

              <div className="p-4">
                {attendanceCourses.length === 0 ? (
                  <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      لا توجد دورات حالية أو منتهية لهذا العام.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {attendanceCourses.map(
                      (course) => {
                        const state =
                          getCourseDisplayState(
                            course,
                          )

                        return (
                          <div
                            key={course.courseId}
                            className="rounded-xl border bg-card p-4"
                          >
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="font-semibold">
                                    {course.courseName}
                                  </h4>

                                  <span className="rounded-full bg-muted px-2.5 py-1 text-[11px]">
                                    {state}
                                  </span>
                                </div>

                                <div className="mt-2 text-xs text-muted-foreground">
                                  {formatDate(
                                    course.startDate,
                                  )}{' '}
                                  —{' '}
                                  {formatDate(
                                    course.endDate,
                                  )}
                                </div>

                                {course.teacherName && (
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    المعلم:{' '}
                                    <span className="text-foreground">
                                      {course.teacherName}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[430px]">
                                <SummaryCard
                                  label="نسبة الحضور"
                                  value={`${course.percentage}%`}
                                  valueClassName="text-primary"
                                />

                                <SummaryCard
                                  label="حاضر"
                                  value={
                                    course.present
                                  }
                                  valueClassName="text-emerald-600 dark:text-emerald-400"
                                />

                                <SummaryCard
                                  label="غائب"
                                  value={
                                    course.absent
                                  }
                                  valueClassName="text-red-600 dark:text-red-400"
                                />

                                <SummaryCard
                                  label="متأخر"
                                  value={
                                    course.late
                                  }
                                  valueClassName="text-amber-600 dark:text-amber-400"
                                />

                                <SummaryCard
                                  label="مستأذن"
                                  value={
                                    course.excused
                                  }
                                  valueClassName="text-blue-600 dark:text-blue-400"
                                />

                                <SummaryCard
                                  label="لم يسجل"
                                  value={
                                    course.notRecorded
                                  }
                                />
                              </div>
                            </div>

                            <div className="mt-4 flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="text-xs text-muted-foreground">
                                أيام الدراسة المحتسبة:{' '}
                                <span className="font-medium text-foreground">
                                  {course.totalDays}
                                </span>
                              </div>

                              <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                  setSelectedAttendanceCourse(
                                    course,
                                  )
                                }
                              >
                                عرض تفاصيل الحضور
                              </Button>
                            </div>
                          </div>
                        )
                      },
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Notes */}
            <section className="rounded-xl border">
              <div className="border-b px-4 py-3">
                <h3 className="font-semibold">
                  الملاحظات
                </h3>
              </div>

              <div className="p-4">
                <div className="rounded-xl bg-muted/30 p-4 text-sm whitespace-pre-wrap">
                  {student.notes ||
                    'لا توجد ملاحظات'}
                </div>
              </div>
            </section>

            {/* Health */}
            <section className="rounded-xl border">
              <div className="border-b px-4 py-3">
                <h3 className="font-semibold">
                  المعلومات الصحية
                </h3>
              </div>

              <div className="p-4">
                <div className="rounded-xl bg-muted/30 p-4 text-sm whitespace-pre-wrap">
                  {student.chronicDiseases ||
                    'لا توجد معلومات صحية مسجلة'}
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="border-t p-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onClose}
          >
            إغلاق
          </Button>
        </div>
      </div>
    </div>
  )
}

function InfoCard({
  label,
  value,
  valueClassName = '',
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="rounded-xl border bg-background p-3">
      <div className="text-xs text-muted-foreground">
        {label}
      </div>

      <div
        className={`mt-1 break-words text-sm font-medium ${valueClassName}`}
      >
        {value}
      </div>
    </div>
  )
}
