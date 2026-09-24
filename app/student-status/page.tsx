'use client'

import { useState } from 'react'
import {
  AlertCircle,
  CalendarDays,
  Clock3,
  Eye,
  Search,
  UserRound,
  X,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'

type Student = {
  id: string
  student_id: string | null
  name: string
  personal_id: string | null
  phone: string | null
  whatsapp: string | null
  status: string | null
  notes: string | null
  health_notes: string | null
}

type AcademicYear = {
  id: string
  name: string
  is_active: boolean
  is_current: boolean
}

type Enrollment = {
  id: string
  academic_year_id: string
  level_id: string | null
  status: string | null
}

type Level = {
  id: string
  name: string
}

type Course = {
  id: string
  academic_year_id: string
  name: string
  start_date: string | null
  end_date: string | null
  days: string[] | null
}

type AttendanceStatus = {
  id: string
  name: string
  sort_order: number
}

type AttendanceRecord = {
  id: string
  student_id: string
  course_id: string
  attendance_date: string
  status_id: string
  note: string | null
}

type CourseSummary = {
  course: Course
  totalDays: number
  present: number
  absent: number
  late: number
  excused: number
  notRecorded: number
  percentage: number
  records: Array<{
    date: string
    status: string
    note: string
  }>
}

function getTodayString() {
  const today = new Date()

  const year = today.getFullYear()
  const month = String(
    today.getMonth() + 1,
  ).padStart(2, '0')
  const day = String(
    today.getDate(),
  ).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function normalizeArabicDay(day: string) {
  return day
    .trim()
    .replace(/^ال/, '')
    .replace('أ', 'ا')
    .replace('إ', 'ا')
    .replace('آ', 'ا')
    .replace('ى', 'ي')
    .toLowerCase()
}

function getDayOfWeek(dateString: string) {
  const date = new Date(
    `${dateString}T00:00:00`,
  )

  const day = date.getDay()

  const days = [
    'الاحد',
    'الاثنين',
    'الثلاثاء',
    'الاربعاء',
    'الخميس',
    'الجمعة',
    'السبت',
  ]

  return days[day]
}

function isCourseStudyDay(
  dateString: string,
  course: Course,
) {
  if (
    !course.days ||
    course.days.length === 0
  ) {
    return true
  }

  const currentDay =
    normalizeArabicDay(
      getDayOfWeek(dateString),
    )

  return course.days.some(
    (day) => {
      const normalized =
        normalizeArabicDay(day)

      return (
        normalized === currentDay ||
        normalized ===
          normalizeArabicDay(
            getEnglishDayName(
              getDayOfWeek(dateString),
            ),
          )
      )
    },
  )
}

function getEnglishDayName(
  arabicDay: string,
) {
  const map: Record<
    string,
    string
  > = {
    الاحد: 'sunday',
    الاثنين: 'monday',
    الثلاثاء: 'tuesday',
    الاربعاء: 'wednesday',
    الخميس: 'thursday',
    الجمعة: 'friday',
    السبت: 'saturday',
  }

  return map[
    normalizeArabicDay(arabicDay)
  ] ?? arabicDay
}

function formatDate(date: string) {
  return new Date(
    `${date}T00:00:00`,
  ).toLocaleDateString('ar-BH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function calculateCourseSummary(
  studentId: string,
  course: Course,
  attendanceRecords: AttendanceRecord[],
  attendanceStatuses: AttendanceStatus[],
): CourseSummary {
  const today =
    getTodayString()

  let totalDays = 0
  let present = 0
  let absent = 0
  let late = 0
  let excused = 0
  let notRecorded = 0

  const records: CourseSummary['records'] =
    []

  if (
    course.start_date &&
    course.end_date
  ) {
    const start = new Date(
      `${course.start_date}T00:00:00`,
    )

    const end = new Date(
      `${course.end_date}T00:00:00`,
    )

    const current =
      new Date(start)

    while (current <= end) {
      const dateString = [
        current.getFullYear(),
        String(
          current.getMonth() + 1,
        ).padStart(2, '0'),
        String(
          current.getDate(),
        ).padStart(2, '0'),
      ].join('-')

      if (
        dateString <= today &&
        isCourseStudyDay(
          dateString,
          course,
        )
      ) {
        totalDays += 1

        const record =
          attendanceRecords.find(
            (item) =>
              item.student_id ===
                studentId &&
              item.course_id ===
                course.id &&
              item.attendance_date ===
                dateString,
          )

        if (!record) {
          notRecorded += 1

          records.push({
            date: dateString,
            status: 'لم يسجل',
            note: '',
          })
        } else {
          const status =
            attendanceStatuses.find(
              (item) =>
                item.id ===
                record.status_id,
            )

          const statusName =
            status?.name ?? ''

          if (
            statusName === 'حاضر'
          ) {
            present += 1
          } else if (
            statusName === 'غائب'
          ) {
            absent += 1
          } else if (
            statusName === 'متأخر'
          ) {
            late += 1
          } else if (
            statusName === 'مستأذن'
          ) {
            excused += 1
          }

          records.push({
            date: dateString,
            status:
              statusName ||
              'غير معروف',
            note:
              record.note ?? '',
          })
        }
      }

      current.setDate(
        current.getDate() + 1,
      )
    }
  }

  /*
   * لم يسجل لا يدخل في نسبة الحضور.
   *
   * حاضر + متأخر + مستأذن
   * = حضور
   *
   * غائب
   * = يؤثر على النسبة
   */
  const denominator =
    present +
    late +
    excused +
    absent

  const percentage =
    denominator > 0
      ? Math.round(
          ((present +
            late +
            excused) /
            denominator) *
            100,
        )
      : 0

  return {
    course,
    totalDays,
    present,
    absent,
    late,
    excused,
    notRecorded,
    percentage,
    records: records.sort(
      (a, b) =>
        b.date.localeCompare(
          a.date,
        ),
    ),
  }
}

export default function StudentStatusPage() {
  const [searchValue, setSearchValue] =
    useState('')

  const [loading, setLoading] =
    useState(false)

  const [searched, setSearched] =
    useState(false)

  const [error, setError] =
    useState('')

  const [student, setStudent] =
    useState<Student | null>(null)

  const [level, setLevel] =
    useState<Level | null>(null)

  const [
    currentCourses,
    setCurrentCourses,
  ] = useState<CourseSummary[]>([])

  const [
    previousCourses,
    setPreviousCourses,
  ] = useState<CourseSummary[]>([])

  const [
    selectedCourse,
    setSelectedCourse,
  ] =
    useState<CourseSummary | null>(
      null,
    )

  const handleSearch = async () => {
    const personalId =
      searchValue.trim()

    if (!personalId) {
      setError(
        'أدخل الرقم الشخصي أولاً.',
      )
      setSearched(true)
      return
    }

    setLoading(true)
    setSearched(false)
    setError('')
    setStudent(null)
    setLevel(null)
    setCurrentCourses([])
    setPreviousCourses([])
    setSelectedCourse(null)

    try {
      /*
       * =====================================================
       * 1. الطالب الحقيقي من students
       * =====================================================
       */

      const {
        data: studentData,
        error: studentError,
      } = await supabase
        .from('students')
        .select(
          `
            id,
            student_id,
            name,
            personal_id,
            phone,
            whatsapp,
            status,
            notes,
            health_notes
          `,
        )
        .eq(
          'personal_id',
          personalId,
        )
        .limit(1)
        .maybeSingle()

      if (studentError) {
        throw studentError
      }

      if (!studentData) {
        setError(
          'لم يتم العثور على طالب بهذا الرقم الشخصي.',
        )
        setSearched(true)
        return
      }

      console.log(
        'SEARCHED PERSONAL ID:',
        personalId,
      )

      console.log(
        'SUPABASE STUDENT RESULT:',
        studentData,
      )

      const realStudent =
        studentData as Student

      setStudent(realStudent)

      /*
       * =====================================================
       * 2. السنة الحالية الحقيقية
       * =====================================================
       */

      const {
        data: currentYearData,
        error: yearError,
      } =
        await supabase
          .from('academic_years')
          .select(
            `
              id,
              name,
              is_active,
              is_current
            `,
          )
          .eq(
            'is_current',
            true,
          )
          .eq(
            'is_active',
            true,
          )
          .limit(1)
          .maybeSingle()

      if (yearError) {
        throw yearError
      }

      const currentYear =
        currentYearData as AcademicYear | null

      /*
       * =====================================================
       * 3. تسجيلات الطالب الحقيقية
       * =====================================================
       */

      const {
        data: enrollmentData,
        error: enrollmentError,
      } = await supabase
        .from('enrollments')
        .select(
          `
            id,
            academic_year_id,
            level_id,
            status
          `,
        )
        .eq(
          'student_id',
          realStudent.id,
        )

      if (enrollmentError) {
        throw enrollmentError
      }

      const enrollments =
        (enrollmentData ??
          []) as Enrollment[]

      /*
       * =====================================================
       * 4. مستوى الطالب الحالي
       * =====================================================
       */

      const currentEnrollment =
        currentYear
          ? enrollments.find(
              (item) =>
                item.academic_year_id ===
                currentYear.id,
            )
          : null

      if (
        currentEnrollment?.level_id
      ) {
        const {
          data: levelData,
          error: levelError,
        } = await supabase
          .from('levels')
          .select(
            'id, name',
          )
          .eq(
            'id',
            currentEnrollment.level_id,
          )
          .limit(1)
          .maybeSingle()

        if (levelError) {
          throw levelError
        }

        setLevel(
          (levelData ??
            null) as Level | null,
        )
      }

      /*
       * =====================================================
       * 5. حالات الحضور الحقيقية
       * =====================================================
       */

      const {
        data: statusData,
        error: statusError,
      } = await supabase
        .from(
          'attendance_statuses',
        )
        .select(
          `
            id,
            name,
            sort_order
          `,
        )
        .eq(
          'is_active',
          true,
        )
        .order(
          'sort_order',
          {
            ascending: true,
          },
        )

      if (statusError) {
        throw statusError
      }

      const attendanceStatuses =
        (statusData ??
          []) as AttendanceStatus[]

      /*
       * =====================================================
       * 6. توزيع الطالب الحقيقي على الدورات
       * =====================================================
       *
       * هذه هي العلاقة الفعلية:
       *
       * teacher_student_assignments
       * student_id -> course_id
       */

      const {
        data: assignmentData,
        error: assignmentError,
      } = await supabase
        .from(
          'teacher_student_assignments',
        )
        .select(
          `
            course_id
          `,
        )
        .eq(
          'student_id',
          realStudent.id,
        )

      if (assignmentError) {
        throw assignmentError
      }

      const studentCourseIds =
        Array.from(
          new Set(
            (assignmentData ?? [])
              .map(
                (item) =>
                  item.course_id,
              )
              .filter(
                Boolean,
              ),
          ),
        )

      /*
       * لا توجد دورات مرتبطة فعليًا
       */

      if (
        studentCourseIds.length ===
        0
      ) {
        setCurrentCourses([])
        setPreviousCourses([])
        setSearched(true)
        return
      }

      /*
       * =====================================================
       * 7. الدورات الحقيقية فقط
       * =====================================================
       */

      const {
        data: courseData,
        error: courseError,
      } = await supabase
        .from('courses')
        .select(
          `
            id,
            academic_year_id,
            name,
            start_date,
            end_date,
            days
          `,
        )
        .in(
          'id',
          studentCourseIds,
        )
        .order(
          'start_date',
          {
            ascending: false,
          },
        )

      if (courseError) {
        throw courseError
      }

      const studentCourses =
        (courseData ??
          []) as Course[]

      /*
       * =====================================================
       * 8. حضور الطالب الحقيقي
       * =====================================================
       *
       * رابط متابعة الطالب يعمل بدون تسجيل دخول،
       * لذلك لا نقرأ attendance مباشرة بسبب RLS.
       *
       * نستخدم RPC مخصصة للرقم الشخصي وترجع
       * سجلات حضور هذا الطالب فقط.
       */

      const {
        data: attendanceResult,
        error: attendanceError,
      } = await supabase.rpc(
        'get_student_status_by_personal_id',
        {
          p_personal_id: personalId,
        },
      )

      if (attendanceError) {
        throw attendanceError
      }

      const attendanceRecords =
        Array.isArray(
          attendanceResult?.attendance,
        )
          ? (attendanceResult.attendance as AttendanceRecord[])
          : []

      const today =
        getTodayString()

      /*
       * =====================================================
       * 9. الدورات الحالية
       * =====================================================
       */

      const currentCourseList =
        studentCourses.filter(
          (course) => {
            if (
              !currentYear ||
              course.academic_year_id !==
                currentYear.id
            ) {
              return false
            }

            if (
              !course.start_date ||
              !course.end_date
            ) {
              return false
            }

            return (
              course.start_date <=
                today &&
              course.end_date >=
                today
            )
          },
        )

      const currentSummaries =
        currentCourseList.map(
          (course) =>
            calculateCourseSummary(
              realStudent.id,
              course,
              attendanceRecords,
              attendanceStatuses,
            ),
        )

      setCurrentCourses(
        currentSummaries,
      )

      /*
       * =====================================================
       * 10. الدورات السابقة
       * =====================================================
       */

      const previousCourseList =
        studentCourses.filter(
          (course) => {
            if (
              !course.end_date
            ) {
              return false
            }

            return (
              course.end_date <
              today
            )
          },
        )

      const previousSummaries =
        previousCourseList.map(
          (course) =>
            calculateCourseSummary(
              realStudent.id,
              course,
              attendanceRecords,
              attendanceStatuses,
            ),
        )

      setPreviousCourses(
        previousSummaries,
      )

      setSearched(true)
    } catch (err) {
      console.error(
        'Student status error:',
        err,
      )

      setError(
        err instanceof Error
          ? err.message
          : 'حدث خطأ أثناء البحث عن الطالب.',
      )

      setSearched(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <UserRound className="size-7" />
          </div>

          <h1 className="text-2xl font-bold">
            متابعة الطالب
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            أدخل الرقم الشخصي للطالب
            لعرض بياناته الحقيقية
            ومتابعة الحضور
          </p>
        </div>

        <div className="rounded-2xl border bg-background p-5 shadow-sm">
          <label className="mb-2 block text-sm font-medium">
            الرقم الشخصي (CPR)
          </label>

          <div className="flex gap-2">
            <input
              type="text"
              value={searchValue}
              onChange={(e) =>
                setSearchValue(
                  e.target.value,
                )
              }
              onKeyDown={(e) => {
                if (
                  e.key === 'Enter'
                ) {
                  void handleSearch()
                }
              }}
              placeholder="أدخل الرقم الشخصي"
              dir="ltr"
              className="h-11 min-w-0 flex-1 rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-primary"
            />

            <button
              type="button"
              onClick={() =>
                void handleSearch()
              }
              disabled={loading}
              className="flex h-11 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <Clock3 className="size-4 animate-spin" />
              ) : (
                <Search className="size-4" />
              )}

              متابعة
            </button>
          </div>
        </div>

        {searched && error && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 size-5 shrink-0" />

              <div>
                <p className="font-semibold">
                  تعذر العثور على البيانات
                </p>

                <p className="mt-1 text-sm">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {searched &&
          !error &&
          student && (
            <div className="mt-5 space-y-5">
              <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
                <div className="border-b px-5 py-4">
                  <h2 className="font-semibold">
                    بيانات الطالب
                  </h2>
                </div>

                <div className="grid gap-4 p-5 sm:grid-cols-2">
                  <InfoItem
                    label="اسم الطالب"
                    value={
                      student.name ||
                      '—'
                    }
                  />

                  <InfoItem
                    label="الرقم الشخصي"
                    value={
                      student.personal_id ??
                      '—'
                    }
                  />

                  <InfoItem
                    label="المستوى"
                    value={
                      level?.name ??
                      '—'
                    }
                  />

                  <InfoItem
                    label="رقم الطالب"
                    value={
                      student.student_id ??
                      '—'
                    }
                  />

                  <InfoItem
                    label="رقم الهاتف"
                    value={
                      student.phone ??
                      '—'
                    }
                  />

                  <InfoItem
                    label="الواتساب"
                    value={
                      student.whatsapp ??
                      '—'
                    }
                  />
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
                <div className="border-b px-5 py-4">
                  <h2 className="font-semibold">
                    الدورة الحالية
                  </h2>

                  <p className="mt-1 text-xs text-muted-foreground">
                    ملخص حضور الطالب من
                    سجلات الحضور الفعلية
                  </p>
                </div>

                {currentCourses.length ===
                0 ? (
                  <div className="p-5 text-sm text-muted-foreground">
                    لا توجد دورة حالية
                    مرتبطة بهذا الطالب
                    حاليًا.
                  </div>
                ) : (
                  <div className="space-y-5 p-5">
                    {currentCourses.map(
                      (summary) => (
                        <CurrentCourseCard
                          key={
                            summary.course
                              .id
                          }
                          summary={
                            summary
                          }
                          onDetails={() =>
                            setSelectedCourse(
                              summary,
                            )
                          }
                        />
                      ),
                    )}
                  </div>
                )}
              </div>

              {previousCourses.length >
                0 && (
                <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
                  <div className="border-b px-5 py-4">
                    <h2 className="font-semibold">
                      الدورات السابقة
                    </h2>

                    <p className="mt-1 text-xs text-muted-foreground">
                      نسبة الحضور في
                      الدورات السابقة
                    </p>
                  </div>

                  <div className="divide-y">
                    {previousCourses.map(
                      (summary) => (
                        <div
                          key={
                            summary.course
                              .id
                          }
                          className="flex flex-wrap items-center justify-between gap-4 p-5"
                        >
                          <div>
                            <p className="font-medium">
                              {
                                summary
                                  .course
                                  .name
                              }
                            </p>

                            <p className="mt-1 text-xs text-muted-foreground">
                              {summary
                                .course
                                .start_date
                                ? formatDate(
                                    summary
                                      .course
                                      .start_date,
                                  )
                                : '—'}
                              {' — '}
                              {summary
                                .course
                                .end_date
                                ? formatDate(
                                    summary
                                      .course
                                      .end_date,
                                  )
                                : '—'}
                            </p>
                          </div>

                          <div className="rounded-full bg-primary/10 px-4 py-2 text-sm font-bold">
                            {
                              summary.percentage
                            }
                            %
                            حضور
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <CalendarDays className="size-3.5" />

          <span>
            نظام متابعة الطلاب
          </span>
        </div>
      </div>

      {selectedCourse && (
        <AttendanceDetailsModal
          summary={selectedCourse}
          onClose={() =>
            setSelectedCourse(null)
          }
        />
      )}
    </main>
  )
}

function CurrentCourseCard({
  summary,
  onDetails,
}: {
  summary: CourseSummary
  onDetails: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-muted/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-semibold">
              {summary.course.name}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              {summary.course.start_date
                ? formatDate(
                    summary.course.start_date,
                  )
                : '—'}
              {' — '}
              {summary.course.end_date
                ? formatDate(
                    summary.course.end_date,
                  )
                : '—'}
            </p>
          </div>

          <div className="rounded-full bg-primary/10 px-4 py-2 text-sm font-bold">
            {summary.percentage}%
            حضور
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <AttendanceBox
          label="حاضر"
          value={summary.present}
        />

        <AttendanceBox
          label="غائب"
          value={summary.absent}
        />

        <AttendanceBox
          label="متأخر"
          value={summary.late}
        />

        <AttendanceBox
          label="مستأذن"
          value={summary.excused}
        />

        <AttendanceBox
          label="لم يسجل"
          value={summary.notRecorded}
        />
      </div>

      <button
        type="button"
        onClick={onDetails}
        className="flex w-full items-center justify-center gap-2 rounded-xl border bg-background px-4 py-3 text-sm font-medium transition hover:bg-muted"
      >
        <Eye className="size-4" />

        عرض تفاصيل الحضور
      </button>
    </div>
  )
}

function AttendanceDetailsModal({
  summary,
  onClose,
}: {
  summary: CourseSummary
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl border bg-background shadow-xl"
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="font-semibold">
              تفاصيل الحضور
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {summary.course.name}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-lg transition hover:bg-muted"
            aria-label="إغلاق"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="border-b bg-muted/20 p-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <AttendanceBox
              label="حاضر"
              value={summary.present}
            />

            <AttendanceBox
              label="غائب"
              value={summary.absent}
            />

            <AttendanceBox
              label="متأخر"
              value={summary.late}
            />

            <AttendanceBox
              label="مستأذن"
              value={summary.excused}
            />

            <AttendanceBox
              label="لم يسجل"
              value={summary.notRecorded}
            />
          </div>
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-5">
          {summary.records.length ===
          0 ? (
            <div className="rounded-xl border p-4 text-sm text-muted-foreground">
              لا توجد أيام حضور
              مسجلة.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-4 py-3 text-right">
                        التاريخ
                      </th>

                      <th className="px-4 py-3 text-right">
                        الحالة
                      </th>

                      <th className="px-4 py-3 text-right">
                        ملاحظة المعلم
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {summary.records.map(
                      (
                        record,
                        index,
                      ) => (
                        <tr
                          key={`${record.date}-${index}`}
                          className="border-b last:border-b-0"
                        >
                          <td className="px-4 py-3">
                            {formatDate(
                              record.date,
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <StatusBadge
                              status={
                                record.status
                              }
                            />
                          </td>

                          <td className="px-4 py-3 text-muted-foreground">
                            {record.note ||
                              '—'}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AttendanceBox({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="rounded-xl border bg-background p-3 text-center">
      <p className="text-xs text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold">
        {value}
      </p>
    </div>
  )
}

function StatusBadge({
  status,
}: {
  status: string
}) {
  const className =
    status === 'حاضر'
      ? 'bg-green-100 text-green-800'
      : status === 'غائب'
        ? 'bg-red-100 text-red-800'
        : status === 'متأخر'
          ? 'bg-yellow-100 text-yellow-800'
          : status === 'مستأذن'
            ? 'bg-blue-100 text-blue-800'
            : 'bg-muted text-muted-foreground'

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
    >
      {status}
    </span>
  )
}

function InfoItem({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-xs text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 font-medium">
        {value}
      </p>
    </div>
  )
}