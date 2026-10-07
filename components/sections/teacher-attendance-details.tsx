'use client'

import {
  ArrowRight,
  CalendarCheck,
  Users,
  UserCheck,
} from 'lucide-react'

export type TeacherAttendanceDetail = {
  teacherId: string
  teacherName: string
  studentCount: number
  presentCount: number
  percentage: number | null
}

type AttendanceDetailsProps = {
  courseName: string
  date: string
  details: TeacherAttendanceDetail[]
  overallPercentage: number
  onClose: () => void
}

function formatDate(date: string) {
  if (!date) return ''

  const parts = date.split('-')

  if (parts.length !== 3) {
    return date
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

export function AttendanceDetails({
  courseName,
  date,
  details,
  overallPercentage,
  onClose,
}: AttendanceDetailsProps) {
  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl border bg-background shadow-xl"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <CalendarCheck className="size-5 text-primary" />
              تفاصيل الحضور اليومي
            </h2>

            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              <p>
                الدورة:{' '}
                <span className="font-medium text-foreground">
                  {courseName}
                </span>
              </p>

              {date && (
                <p>
                  التاريخ:{' '}
                  <span className="font-medium text-foreground">
                    {formatDate(date)}
                  </span>
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="العودة"
            title="العودة"
            className="rounded-lg p-2 text-primary transition-colors hover:bg-primary/10"
          >
            <ArrowRight className="size-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Overall */}
        <div className="border-b px-5 py-4">
          <div className="rounded-xl bg-muted/30 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground">
                  نسبة الحضور الكلية
                </p>

                <p className="mt-1 text-3xl font-bold">
                  {overallPercentage}%
                </p>
              </div>

              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <UserCheck className="size-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Teachers */}
        <div className="max-h-[55vh] overflow-y-auto p-5">
          {details.length === 0 ? (
            <div className="rounded-xl border border-dashed px-6 py-10 text-center">
              <Users className="mx-auto size-8 text-muted-foreground/50" />

              <p className="mt-3 text-sm font-medium text-muted-foreground">
                لا يوجد معلمون مرتبطون بهذه الدورة
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {details.map(
                (teacher) => (
                  <div
                    key={
                      teacher.teacherId
                    }
                    className="rounded-xl border p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">
                          {
                            teacher.teacherName
                          }
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          عدد الطلاب:{' '}
                          {
                            teacher.studentCount
                          }
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-left">
                          <p className="text-xs text-muted-foreground">
                            الحضور
                          </p>

                          <p className="mt-1 font-semibold">
                            {
                              teacher.presentCount
                            }{' '}
                            /{' '}
                            {
                              teacher.studentCount
                            }
                          </p>
                        </div>

                        <div className="h-10 w-px bg-border" />

                        <div className="min-w-[70px] text-left">
                          <p className="text-xs text-muted-foreground">
                            النسبة
                          </p>

                          <p className="mt-1 text-lg font-bold">
                            {teacher.percentage ===
                            null
                              ? '—'
                              : `${teacher.percentage}%`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  )
}
