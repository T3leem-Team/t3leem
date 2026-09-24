'use client'

import { useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'

type AcademicYear = {
  id: string
  name: string
}

type Course = {
  id: string
  name: string
  academic_year_id: string
}

type TripsFormProps = {
  academicYears: AcademicYear[]
  courses: Course[]
  onClose: () => void
  onCreated: () => void
}

export function TripsForm({
  academicYears,
  courses,
  onClose,
  onCreated,
}: TripsFormProps) {
  const currentYear = academicYears[0] ?? null

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [tripDate, setTripDate] = useState('')
  const [meetingTime, setMeetingTime] = useState('')
  const [returnTime, setReturnTime] = useState('')
  const [fee, setFee] = useState('0')
  const [note, setNote] = useState('')
  const [academicYearId, setAcademicYearId] = useState(
    currentYear?.id ?? '',
  )
  const [courseId, setCourseId] = useState('')
  const [attendanceMin, setAttendanceMin] = useState('')
  const [attendanceMax, setAttendanceMax] = useState('')
  const [notesRequirement, setNotesRequirement] = useState<
    'any' | 'required' | 'none'
  >('any')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const availableCourses = courses.filter(
    (course) =>
      course.academic_year_id === academicYearId,
  )

  useEffect(() => {
    if (
      courseId &&
      !availableCourses.some(
        (course) => course.id === courseId,
      )
    ) {
      setCourseId('')
    }
  }, [academicYearId, courseId, courses])

  async function handleSubmit(
    event: React.FormEvent,
  ) {
    event.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('اسم الرحلة مطلوب.')
      return
    }

    if (!academicYearId) {
      setError('السنة الدراسية مطلوبة.')
      return
    }

    if (!courseId) {
      setError('الدورة مطلوبة.')
      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/trips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          location: location.trim() || null,
          trip_date: tripDate || null,
          meeting_time: meetingTime || null,
          return_time: returnTime || null,
          fee: Number(fee || 0),
          note: note.trim() || null,
          academic_year_id: academicYearId,
          course_id: courseId,
          attendance_min:
            attendanceMin === ''
              ? null
              : Number(attendanceMin),
          attendance_max:
            attendanceMax === ''
              ? null
              : Number(attendanceMax),
          notes_requirement: notesRequirement,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ?? 'تعذر إنشاء الرحلة.',
        )
      }

      onCreated()
    } catch (error) {
      console.error('Create trip error:', error)

      setError(
        error instanceof Error
          ? error.message
          : 'تعذر إنشاء الرحلة.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !saving
        ) {
          onClose()
        }
      }}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-bold">
              إضافة رحلة
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              أدخل بيانات الرحلة الأساسية.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted disabled:opacity-50"
            aria-label="إغلاق"
          >
            <X className="size-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="max-h-[calc(90vh-80px)] overflow-y-auto"
        >
          <div className="space-y-5 p-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                اسم الرحلة *
              </label>

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: رحلة إلى متحف البحرين"
                disabled={saving}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  السنة الدراسية *
                </label>

                <select
                  value={academicYearId}
                  onChange={(e) =>
                    setAcademicYearId(e.target.value)
                  }
                  disabled={saving}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">اختر السنة</option>

                  {academicYears.map((year) => (
                    <option
                      key={year.id}
                      value={year.id}
                    >
                      {year.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  الدورة *
                </label>

                <select
                  value={courseId}
                  onChange={(e) =>
                    setCourseId(e.target.value)
                  }
                  disabled={
                    saving || !academicYearId
                  }
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">
                    اختر الدورة
                  </option>

                  {availableCourses.map((course) => (
                    <option
                      key={course.id}
                      value={course.id}
                    >
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                الموقع
              </label>

              <input
                type="text"
                value={location}
                onChange={(e) =>
                  setLocation(e.target.value)
                }
                placeholder="مثال: متحف البحرين الوطني"
                disabled={saving}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  تاريخ الرحلة
                </label>

                <input
                  type="date"
                  value={tripDate}
                  onChange={(e) =>
                    setTripDate(e.target.value)
                  }
                  disabled={saving}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  وقت التجمع
                </label>

                <input
                  type="time"
                  value={meetingTime}
                  onChange={(e) =>
                    setMeetingTime(e.target.value)
                  }
                  disabled={saving}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  وقت العودة
                </label>

                <input
                  type="time"
                  value={returnTime}
                  onChange={(e) =>
                    setReturnTime(e.target.value)
                  }
                  disabled={saving}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                رسوم الرحلة
              </label>

              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={fee}
                  onChange={(e) =>
                    setFee(e.target.value)
                  }
                  disabled={saving}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 pe-14 ps-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />

                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  د.ب
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-muted/20 p-4">
              <h3 className="text-sm font-semibold">
                شرط الحضور
              </h3>

              <p className="mt-1 text-xs text-muted-foreground">
                اختياري. اترك الحقول فارغة إذا لم
                ترغب بتحديد نسبة حضور.
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    الحد الأدنى %
                  </label>

                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={attendanceMin}
                    onChange={(e) =>
                      setAttendanceMin(
                        e.target.value,
                      )
                    }
                    disabled={saving}
                    placeholder="مثال: 80"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    الحد الأعلى %
                  </label>

                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={attendanceMax}
                    onChange={(e) =>
                      setAttendanceMax(
                        e.target.value,
                      )
                    }
                    disabled={saving}
                    placeholder="مثال: 100"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                شرط الملاحظات لهذه الدورة
              </label>

              <select
                value={notesRequirement}
                onChange={(e) =>
                  setNotesRequirement(
                    e.target.value as
                      | 'any'
                      | 'required'
                      | 'none',
                  )
                }
                disabled={saving}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="any">
                  لا يهم وجود ملاحظة
                </option>
                <option value="required">
                  يجب أن تكون هناك ملاحظة
                </option>
                <option value="none">
                  يجب ألا توجد ملاحظة
                </option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                وصف الرحلة
              </label>

              <textarea
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
                rows={3}
                placeholder="وصف مختصر للرحلة..."
                disabled={saving}
                className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                ملاحظة داخلية
              </label>

              <textarea
                value={note}
                onChange={(e) =>
                  setNote(e.target.value)
                }
                rows={2}
                placeholder="ملاحظة تظهر للإدارة..."
                disabled={saving}
                className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/20 px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {saving && (
                <Loader2 className="size-4 animate-spin" />
              )}

              {saving
                ? 'جاري الحفظ...'
                : 'حفظ الرحلة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
