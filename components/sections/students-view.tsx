'use client'

import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'

export type StudentCourseStatus = {
  courseId: string
  courseName: string
  startDate: string | null
  endDate: string | null
  status: 'حاضر' | 'لم يحضر' | 'لم تقم الدورة حتى الآن'
}

type StudentDetailsStudent = {
  id: string
  name: string
  notes?: string
  chronicDiseases?: string
  attendance?: string
  courseStatuses?: StudentCourseStatus[]
}

type StudentDetailsProps = {
  student: StudentDetailsStudent | null
  mode: 'attendance' | 'notes' | null
  onClose: () => void
}

function formatDate(date: string | null) {
  if (!date) return ''

  const parsed = new Date(`${date}T00:00:00`)

  if (Number.isNaN(parsed.getTime())) {
    return date
  }

  return parsed.toLocaleDateString('ar-BH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function AttendanceStatus({
  status,
}: {
  status: StudentCourseStatus['status']
}) {
  if (status === 'حاضر') {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
        حاضر
      </span>
    )
  }

  if (status === 'لم يحضر') {
    return (
      <span className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
        لم يحضر
      </span>
    )
  }

  return (
    <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
      لم تقم الدورة حتى الآن
    </span>
  )
}

export function StudentDetails({
  student,
  mode,
  onClose,
}: StudentDetailsProps) {
  if (!student || !mode) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="إغلاق"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-lg rounded-xl border bg-background shadow-xl">
        {mode === 'attendance' ? (
          <>
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold">
                  حضور الطالب في الدورات
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

            <div className="max-h-[65vh] overflow-y-auto p-6">
              {!student.courseStatuses ||
              student.courseStatuses.length === 0 ? (
                <div className="rounded-md border bg-muted/30 p-5 text-center text-sm text-muted-foreground">
                  لا توجد دورات مسجلة في السنة الدراسية الحالية.
                </div>
              ) : (
                <div className="space-y-3">
                  {student.courseStatuses.map((course) => (
                    <div
                      key={course.courseId}
                      className="rounded-lg border bg-muted/20 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium">
                            {course.courseName}
                          </p>

                          {(course.startDate ||
                            course.endDate) && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {course.startDate
                                ? formatDate(course.startDate)
                                : '—'}
                              {' — '}
                              {course.endDate
                                ? formatDate(course.endDate)
                                : '—'}
                            </p>
                          )}
                        </div>

                        <AttendanceStatus
                          status={course.status}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
          </>
        ) : (
          <>
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold">
                  ملاحظات الطالب
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

            <div className="space-y-5 p-6">
              <div>
                <h3 className="mb-2 text-sm font-semibold">
                  الملاحظات العامة
                </h3>

                <div className="rounded-md border bg-muted/30 p-4 text-sm whitespace-pre-wrap">
                  {student.notes ||
                    'لا توجد ملاحظات عامة'}
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold">
                  المعلومات الصحية
                </h3>

                <div className="rounded-md border bg-muted/30 p-4 text-sm whitespace-pre-wrap">
                  {student.chronicDiseases ||
                    'لا توجد معلومات صحية'}
                </div>
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
          </>
        )}
      </div>
    </div>
  )
}