'use client'

import {
  useMemo,
  useState,
} from 'react'

import {
  X,
  CalendarDays,
  CreditCard,
  UserRound,
  Phone,
  MessageCircle,
  GraduationCap,
  Users,
  FileText,
  HeartPulse,
} from 'lucide-react'

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

type StudentDetailsStudent = {
  id: string
  name: string

  personalId?: string
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
  mode:
    | 'overview'
    | 'attendance'
    | 'notes'
    | null
  onClose: () => void
}

function formatDate(date: string | null) {
  if (!date) {
    return ''
  }

  const parsed = new Date(
    `${date}T00:00:00`,
  )

  if (Number.isNaN(parsed.getTime())) {
    return date
  }

  return parsed.toLocaleDateString(
    'ar-BH',
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
  )
}

function formatMoney(value: number | undefined) {
  return `${Number(value ?? 0).toLocaleString(
    'ar-BH',
    {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    },
  )} د.ب`
}

function getStatusClasses(
  status: StudentCourseStatus['status'],
) {
  switch (status) {
    case 'حاضر':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'

    case 'لم يحضر':
      return 'bg-muted text-muted-foreground'

    case 'لم تقم الدورة حتى الآن':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
  }
}

function getAttendancePercentageClass(
  percentage: number,
) {
  if (percentage >= 90) {
    return 'text-emerald-600 dark:text-emerald-400'
  }

  if (percentage >= 75) {
    return 'text-amber-600 dark:text-amber-400'
  }

  return 'text-red-600 dark:text-red-400'
}

export function StudentDetails({
  student,
  mode,
  onClose,
}: StudentDetailsProps) {
  const [
    selectedAttendanceCourse,
    setSelectedAttendanceCourse,
  ] = useState<StudentAttendanceSummary | null>(
    null,
  )

  if (!student || !mode) {
    return null
  }

  /*
   * إذا اختار المستخدم تفاصيل حضور دورة،
   * نفتح المستوى الثاني.
   */
  if (selectedAttendanceCourse) {
    const course: StudentAttendanceCourse = {
      id: selectedAttendanceCourse.courseId,
      name: selectedAttendanceCourse.courseName,
      startDate:
        selectedAttendanceCourse.startDate,
      endDate:
        selectedAttendanceCourse.endDate,
      days:
        selectedAttendanceCourse.days ?? [],
    }

    return (
      <StudentAttendanceDetails
        studentId={student.id}
        studentName={student.name}
        course={course}
        records={
          student.attendanceRecords ?? []
        }
        onClose={() =>
          setSelectedAttendanceCourse(
            null,
          )
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
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">
              تفاصيل الطالب
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
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
          {/* البيانات الأساسية */}
          <section className="space-y-3">
            <SectionTitle
              icon={
                <UserRound className="size-4" />
              }
              title="البيانات الأساسية"
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <InfoCard
                icon={
                  <UserRound className="size-4" />
                }
                label="اسم الطالب"
                value={student.name}
              />

              <InfoCard
                icon={
                  <CreditCard className="size-4" />
                }
                label="الرقم الشخصي"
                value={
                  student.personalId || '—'
                }
              />

              <InfoCard
                icon={
                  <GraduationCap className="size-4" />
                }
                label="الصف الأكاديمي"
                value={
                  student.grade || '—'
                }
              />

              <InfoCard
                icon={
                  <Phone className="size-4" />
                }
                label="رقم الهاتف"
                value={
                  student.phone || '—'
                }
              />

              <InfoCard
                icon={
                  <MessageCircle className="size-4" />
                }
                label="رقم واتساب"
                value={
                  student.whatsapp || '—'
                }
              />

              <InfoCard
                icon={
                  <UserRound className="size-4" />
                }
                label="حالة الطالب"
                value={
                  student.status || 'نشط'
                }
              />
            </div>
          </section>

          {/* الدفع */}
          <section className="mt-7 space-y-3">
            <SectionTitle
              icon={
                <CreditCard className="size-4" />
              }
              title="المدفوعات للسنة الحالية"
            />

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <InfoCard
                label="حالة الدفع"
                value={
                  student.paymentStatus ||
                  'غير مدفوع'
                }
              />

              <InfoCard
                label="الرسوم السنوية"
                value={formatMoney(
                  student.amountDue,
                )}
              />

              <InfoCard
                label="المدفوع"
                value={formatMoney(
                  student.amountPaid,
                )}
              />

              <InfoCard
                label="المتبقي"
                value={formatMoney(
                  Math.max(
                    0,
                    Number(
                      student.amountDue ?? 0,
                    ) -
                      Number(
                        student.amountPaid ?? 0,
                      ),
                  ),
                )}
              />
            </div>

            {student.feeExempt && (
              <div className="rounded-xl border bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                الطالب معفي من الرسوم.
              </div>
            )}
          </section>

          {/* الدورات والحضور */}
          <section className="mt-7 space-y-3">
            <SectionTitle
              icon={
                <CalendarDays className="size-4" />
              }
              title="الدورات والحضور"
            />

            {student.attendanceSummaries &&
            student.attendanceSummaries
              .length > 0 ? (
              <div className="space-y-3">
                {student.attendanceSummaries.map(
                  (course) => (
                    <div
                      key={course.courseId}
                      className="rounded-xl border bg-muted/20 p-4"
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h3 className="font-semibold">
                              {course.courseName}
                            </h3>

                            {(course.startDate ||
                              course.endDate) && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {course.startDate
                                  ? formatDate(
                                      course.startDate,
                                    )
                                  : '—'}
                                {' — '}
                                {course.endDate
                                  ? formatDate(
                                      course.endDate,
                                    )
                                  : '—'}
                              </p>
                            )}

                            {course.teacherName && (
                              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                                <Users className="size-4" />
                                <span>
                                  المعلم:{' '}
                                  <span className="font-medium text-foreground">
                                    {
                                      course.teacherName
                                    }
                                  </span>
                                </span>
                              </div>
                            )}
                          </div>

                          <div
                            className={`text-xl font-bold ${getAttendancePercentageClass(
                              course.percentage,
                            )}`}
                          >
                            {course.percentage}%
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                          <MiniStat
                            label="أيام الدراسة"
                            value={
                              course.totalDays
                            }
                          />

                          <MiniStat
                            label="حاضر"
                            value={
                              course.present
                            }
                          />

                          <MiniStat
                            label="غائب"
                            value={
                              course.absent
                            }
                          />

                          <MiniStat
                            label="متأخر"
                            value={
                              course.late
                            }
                          />

                          <MiniStat
                            label="لم يسجل"
                            value={
                              course.notRecorded
                            }
                          />
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() =>
                            setSelectedAttendanceCourse(
                              course,
                            )
                          }
                        >
                          <CalendarDays className="ml-2 size-4" />
                          تفاصيل الحضور
                        </Button>
                      </div>
                    </div>
                  ),
                )}
              </div>
            ) : student.courseStatuses &&
              student.courseStatuses.length > 0 ? (
              <div className="space-y-3">
                {student.courseStatuses.map(
                  (course) => (
                    <div
                      key={course.courseId}
                      className="rounded-xl border bg-muted/20 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">
                            {course.courseName}
                          </p>

                          {(course.startDate ||
                            course.endDate) && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {course.startDate
                                ? formatDate(
                                    course.startDate,
                                  )
                                : '—'}
                                {' — '}
                              {course.endDate
                                ? formatDate(
                                    course.endDate,
                                  )
                                : '—'}
                            </p>
                          )}
                        </div>

                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusClasses(
                            course.status,
                          )}`}
                        >
                          {course.status}
                        </span>
                      </div>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                لا توجد دورات مسجلة في السنة الحالية.
              </div>
            )}
          </section>

          {/* المعلم */}
          {student.teacherName && (
            <section className="mt-7 space-y-3">
              <SectionTitle
                icon={
                  <Users className="size-4" />
                }
                title="المعلم"
              />

              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="text-sm text-muted-foreground">
                  المعلم المخصص للطالب
                </p>

                <p className="mt-1 font-semibold">
                  {student.teacherName}
                </p>
              </div>
            </section>
          )}

          {/* الملاحظات */}
          <section className="mt-7 space-y-3">
            <SectionTitle
              icon={
                <FileText className="size-4" />
              }
              title="الملاحظات"
            />

            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="whitespace-pre-wrap text-sm">
                {student.notes ||
                  'لا توجد ملاحظات عامة.'}
              </p>
            </div>
          </section>

          {/* المعلومات الصحية */}
          <section className="mt-7 space-y-3">
            <SectionTitle
              icon={
                <HeartPulse className="size-4" />
              }
              title="المعلومات الصحية"
            />

            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="whitespace-pre-wrap text-sm">
                {student.chronicDiseases ||
                  'لا توجد معلومات صحية.'}
              </p>
            </div>
          </section>
        </div>

        {/* Footer */}
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

function SectionTitle({
  icon,
  title,
}: {
  icon: React.ReactNode
  title: string
}) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold">
      <span className="text-primary">
        {icon}
      </span>

      <span>{title}</span>
    </div>
  )
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>

      <p className="mt-1 break-words text-sm font-medium">
        {value}
      </p>
    </div>
  )
}

function MiniStat({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="rounded-lg border bg-background p-2 text-center">
      <div className="text-[11px] text-muted-foreground">
        {label}
      </div>

      <div className="mt-1 text-sm font-bold">
        {value}
      </div>
    </div>
  )
}