'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarCheck,
  ClipboardCheck,
  Clock3,
  RefreshCw,
  UserCheck,
  UserX,
  Users,
  BookOpen,
} from 'lucide-react'

import { getDashboardSections } from '@/lib/dashboard-sections-cache'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'

import { DashboardAttendanceExport } from '@/app/(dashboard)/dashboard/dashboard-attendance-export'
import { DashboardViewPanels } from '@/app/(dashboard)/dashboard/dashboard-view-panels'
import {
  DashboardStudentSearch,
  type StudentSearchResult,
} from '@/app/(dashboard)/dashboard/dashboardStudentSearch'

import {
  formatDate,
  getLessonDateStatus,
  normalizeId,
} from '@/app/(dashboard)/dashboard/dashboard-data'
import { useDashboardData } from '@/app/(dashboard)/dashboard/dashboard-data'
import { useDashboardStats } from '@/app/(dashboard)/dashboard/dashboard-stats'

export function DashboardView() {
  const router = useRouter()

  const [checkingAccess, setCheckingAccess] = useState(true)
  const [attendanceDetailsOpen, setAttendanceDetailsOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] =
    useState<StudentSearchResult | null>(null)

  const {
    loading,
    refreshing,
    academicYear,
    courses,
    enrollments,
    assignments,
    courseTeachers,
    teachers,
    attendanceStatuses,
    attendanceRecords,
    students,
    selectedCourseId,
    setSelectedCourseId,
    selectedDate,
    setSelectedDate,
    pendingRegistrationCount,
    loadData,
  } = useDashboardData()

  const selectedCourse = useMemo(
    () =>
      courses.find(
        (course) =>
          normalizeId(course.id) === normalizeId(selectedCourseId),
      ) ?? null,
    [courses, selectedCourseId],
  )

  const lessonDateStatus = useMemo(
    () => getLessonDateStatus(selectedCourse, selectedDate),
    [selectedCourse, selectedDate],
  )

  useEffect(() => {
    const sections = getDashboardSections()

    if (!sections) {
      router.replace('/login')
      return
    }

    const hasDashboard = sections.some(
      (section) => section.section_key === 'dashboard',
    )

    if (hasDashboard) {
      setCheckingAccess(false)
      return
    }

    const firstAllowedSection = sections.find(
      (section) =>
        typeof section.href === 'string' &&
        section.href.trim(),
    )

    if (firstAllowedSection?.href) {
      router.replace(firstAllowedSection.href)
      return
    }

    router.replace('/login')
  }, [router])

  const {
    statusMap,
    stats,
    attendancePercentage,
    teacherAttendanceDetails,
    attendanceItems,
  } = useDashboardStats({
    attendanceStatuses,
    assignments,
    courseTeachers,
    teachers,
    enrollments,
    attendanceRecords,
    selectedCourseId,
    selectedDate,
    lessonDateStatus,
  })

  if (checkingAccess || loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50/70 px-5 py-4 text-sm text-sky-800 shadow-sm">
          <RefreshCw className="size-4 animate-spin" />
          جاري تحميل لوحة المعلومات...
        </div>
      </div>
    )
  }

  return (
    <>
      <div dir="rtl" className="space-y-6">
        {/* عنوان الصفحة */}
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-gradient-to-l from-slate-50 via-white to-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-indigo-200 bg-indigo-100 text-indigo-700">
                <BookOpen className="size-5" />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  لوحة المعلومات
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  نظرة سريعة على الطلاب والدورات والحضور
                </p>
              </div>
            </div>

            {academicYear && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-800">
                <CalendarCheck className="size-4 shrink-0" />
                <span>السنة الدراسية:</span>
                <span className="font-semibold">
                  {academicYear.name}
                </span>
              </div>
            )}
          </div>

          <Button
            type="button"
            onClick={() => void loadData(true)}
            disabled={refreshing}
            className="h-11 w-full gap-2 rounded-xl border border-sky-200 bg-sky-50 px-5 text-sky-800 shadow-sm transition-all hover:border-sky-300 hover:bg-sky-100 sm:w-auto"
          >
            <RefreshCw
              className={
                refreshing
                  ? 'size-4 animate-spin'
                  : 'size-4'
              }
            />
            {refreshing ? 'جاري التحديث...' : 'تحديث البيانات'}
          </Button>
        </div>

        {/* البحث عن الطلاب */}
        <div className="rounded-2xl border border-cyan-100 bg-gradient-to-l from-cyan-50/50 via-white to-white p-1 shadow-sm">
          <DashboardStudentSearch
            students={students}
            enrollments={enrollments}
            assignments={assignments}
            courses={courses}
            teachers={teachers}
            attendanceRecords={attendanceRecords}
            attendanceStatusMap={statusMap}
            selectedCourseId={selectedCourseId}
            selectedDate={selectedDate}
            lessonDateStatus={lessonDateStatus}
            onSelectStudent={setSelectedStudent}
          />
        </div>

        {/* فلاتر الدورة والتاريخ */}
        <Card className="overflow-hidden rounded-2xl border-indigo-200/70 bg-white shadow-sm">
          <CardHeader className="border-b border-indigo-100 bg-gradient-to-l from-indigo-50/80 via-white to-white pb-4">
            <CardTitle className="flex items-center gap-3 text-base text-slate-800">
              <span className="flex size-10 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-100 text-indigo-700">
                <CalendarCheck className="size-5" />
              </span>

              <span>إعدادات عرض البيانات</span>
            </CardTitle>

            <p className="text-xs leading-5 text-slate-500">
              اختر الدورة والتاريخ لعرض الإحصائيات والحضور المناسبين.
            </p>
          </CardHeader>

          <CardContent className="p-4 sm:p-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                    <BookOpen className="size-4" />
                  </span>
                  الدورة
                </label>

                <select
                  value={selectedCourseId}
                  onChange={(event) => {
                    setSelectedCourseId(event.target.value)
                  }}
                  className="h-11 w-full rounded-xl border border-sky-200 bg-sky-50/50 px-3 text-sm text-slate-800 outline-none transition-colors hover:border-sky-300 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
                >
                  {courses.length === 0 && (
                    <option value="">
                      لا توجد دورات
                    </option>
                  )}

                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                    <CalendarCheck className="size-4" />
                  </span>
                  التاريخ
                </label>

                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => {
                    setSelectedDate(event.target.value)
                  }}
                  className="h-11 w-full rounded-xl border border-violet-200 bg-violet-50/50 px-3 text-sm text-slate-800 outline-none transition-colors hover:border-violet-300 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* بطاقات الإحصائيات الرئيسية */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {/* الطلاب المسجلون */}
          <Card className="group overflow-hidden rounded-2xl border border-sky-200/80 bg-gradient-to-br from-sky-50 via-white to-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-sky-800">
                    المسجلون لهذه السنة
                  </p>

                  <p className="mt-3 text-3xl font-bold tabular-nums text-sky-950 sm:text-4xl">
                    {stats.studentsCount}
                  </p>

                  <p className="mt-2 text-xs text-sky-700/80">
                    إجمالي الطلاب النشطين
                  </p>
                </div>

                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-sky-200 bg-sky-100 text-sky-700 shadow-sm transition-transform duration-200 group-hover:scale-105 sm:size-14">
                  <Users className="size-6 sm:size-7" />
                </div>
              </div>

              <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-sky-100">
                <div className="h-full w-full rounded-full bg-sky-400" />
              </div>
            </CardContent>
          </Card>

          {/* الطلاب المنضمون للدورة */}
          <Card className="group overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-emerald-800">
                    المنضمون لهذه الدورة
                  </p>

                  <p className="mt-3 text-3xl font-bold tabular-nums text-emerald-950 sm:text-4xl">
                    {stats.assignedCount}
                  </p>

                  <p className="mt-2 text-xs text-emerald-700/80">
                    الطلاب الموزعون على الدورة
                  </p>
                </div>

                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-100 text-emerald-700 shadow-sm transition-transform duration-200 group-hover:scale-105 sm:size-14">
                  <UserCheck className="size-6 sm:size-7" />
                </div>
              </div>

              <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-emerald-100">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all duration-300"
                  style={{
                    width: `${
                      stats.studentsCount > 0
                        ? Math.min(
                            100,
                            (stats.assignedCount /
                              stats.studentsCount) *
                              100,
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* الطلاب غير المنضمين */}
          <Card className="group overflow-hidden rounded-2xl border border-rose-200/80 bg-gradient-to-br from-rose-50 via-white to-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:col-span-2 xl:col-span-1">
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-rose-800">
                    غير منضمين لهذه الدورة
                  </p>

                  <p className="mt-3 text-3xl font-bold tabular-nums text-rose-950 sm:text-4xl">
                    {stats.unassignedCount}
                  </p>

                  <p className="mt-2 text-xs text-rose-700/80">
                    الطلاب غير الموزعين على الدورة
                  </p>
                </div>

                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-rose-200 bg-rose-100 text-rose-700 shadow-sm transition-transform duration-200 group-hover:scale-105 sm:size-14">
                  <UserX className="size-6 sm:size-7" />
                </div>
              </div>

              <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-rose-100">
                <div
                  className="h-full rounded-full bg-rose-400 transition-all duration-300"
                  style={{
                    width: `${
                      stats.studentsCount > 0
                        ? Math.min(
                            100,
                            (stats.unassignedCount /
                              stats.studentsCount) *
                              100,
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ملخص الحضور */}
        <Card className="overflow-hidden rounded-2xl border border-violet-200/70 bg-white shadow-sm">
          <CardHeader className="border-b border-violet-100 bg-gradient-to-l from-violet-50/80 via-white to-white p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-3 text-base text-slate-800 sm:text-lg">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-violet-200 bg-violet-100 text-violet-700">
                  <CalendarCheck className="size-5" />
                </span>

                <span>ملخص الحضور</span>
              </CardTitle>

              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
                <Button
                  type="button"
                  onClick={() => setAttendanceDetailsOpen(true)}
                  disabled={
                    !selectedCourseId ||
                    !selectedDate ||
                    lessonDateStatus !== 'lesson'
                  }
                  className="h-10 w-full gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 text-violet-800 shadow-sm transition-colors hover:bg-violet-100 disabled:opacity-50 sm:w-auto"
                >
                  <Users className="size-4" />
                  تفاصيل الحضور
                </Button>

                <DashboardAttendanceExport
                  course={selectedCourse}
                  academicYear={academicYear}
                  assignments={assignments}
                  teachers={teachers}
                  students={students}
                  attendanceRecords={attendanceRecords}
                  attendanceStatuses={attendanceStatuses}
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 p-4 sm:p-5">
            {/* نسبة الحضور */}
            <div className="rounded-2xl border border-violet-200/70 bg-gradient-to-l from-violet-50/60 via-white to-white p-4 sm:p-5">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  {lessonDateStatus === 'lesson' ? (
                    <>
                      <p className="text-sm font-semibold text-violet-800">
                        نسبة الحضور
                      </p>

                      <p
                        className={`mt-2 text-4xl font-bold tabular-nums sm:text-5xl ${
                          attendancePercentage >= 60
                            ? 'text-emerald-600'
                            : 'text-amber-600'
                        }`}
                      >
                        {attendancePercentage}%
                      </p>

                      <p className="mt-2 text-sm text-slate-600">
                        {stats.presentCount} حاضر من أصل{' '}
                        {stats.assignedCount} موزعين في الدورة
                      </p>

                      {stats.recordedCount > 0 &&
                        stats.recordedCount < stats.assignedCount && (
                          <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
                            <Clock3 className="size-3.5 shrink-0" />
                            تم تسجيل الحضور لـ {stats.recordedCount} من أصل{' '}
                            {stats.assignedCount}
                          </p>
                        )}
                    </>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                        <CalendarCheck className="size-5" />
                      </span>

                      <p className="text-sm font-medium leading-6 text-slate-600">
                        {lessonDateStatus === 'not-started'
                          ? 'لم تبدأ الدورة بعد'
                          : lessonDateStatus === 'ended'
                            ? 'انتهت الدورة'
                            : lessonDateStatus === 'no-lesson'
                              ? 'لا يوجد درس هذا اليوم'
                              : 'اختر دورة لعرض ملخص الحضور'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-white/80 p-3 text-sm text-slate-600 sm:min-w-[220px]">
                  {selectedCourse && (
                    <div className="flex items-start gap-2">
                      <BookOpen className="mt-0.5 size-4 shrink-0 text-indigo-500" />

                      <p className="min-w-0">
                        <span className="text-xs text-slate-500">
                          الدورة
                        </span>
                        <span className="mt-0.5 block break-words font-semibold text-slate-800">
                          {selectedCourse.name}
                        </span>
                      </p>
                    </div>
                  )}

                  {selectedDate && (
                    <div className="flex items-start gap-2 border-t border-slate-100 pt-2">
                      <CalendarCheck className="mt-0.5 size-4 shrink-0 text-violet-500" />

                      <p>
                        <span className="text-xs text-slate-500">
                          التاريخ
                        </span>
                        <span className="mt-0.5 block font-semibold text-slate-800">
                          {formatDate(selectedDate)}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {lessonDateStatus === 'lesson' && (
                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                    <span className="font-medium text-slate-600">
                      نسبة الحضور المسجلة
                    </span>
                    <span
                      className={`font-bold tabular-nums ${
                        attendancePercentage >= 60
                          ? 'text-emerald-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {attendancePercentage}%
                    </span>
                  </div>

                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        attendancePercentage >= 60
                          ? 'bg-emerald-400'
                          : 'bg-amber-400'
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, attendancePercentage),
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* الدورة لم تبدأ */}
            {lessonDateStatus === 'not-started' && (
              <div className="rounded-2xl border border-sky-200 bg-sky-50/60 px-5 py-8 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-sky-200 bg-sky-100 text-sky-700">
                  <CalendarCheck className="size-6" />
                </div>

                <p className="mt-3 text-sm font-semibold text-sky-900">
                  لم تبدأ الدورة بعد
                </p>

                {selectedCourse?.startDate && (
                  <p className="mt-2 text-xs text-sky-700">
                    تبدأ الدورة في {formatDate(selectedCourse.startDate)}
                  </p>
                )}
              </div>
            )}

            {/* الدورة انتهت */}
            {lessonDateStatus === 'ended' && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-8 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500">
                  <CalendarCheck className="size-6" />
                </div>

                <p className="mt-3 text-sm font-semibold text-slate-800">
                  انتهت الدورة
                </p>

                {selectedCourse?.endDate && (
                  <p className="mt-2 text-xs text-slate-500">
                    انتهت الدورة في {formatDate(selectedCourse.endDate)}
                  </p>
                )}
              </div>
            )}

            {/* لا يوجد درس */}
            {lessonDateStatus === 'no-lesson' && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 px-5 py-8 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-amber-200 bg-amber-100 text-amber-700">
                  <CalendarCheck className="size-6" />
                </div>

                <p className="mt-3 text-sm font-semibold text-amber-900">
                  لا يوجد درس هذا اليوم
                </p>

                <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-amber-800/80">
                  هذا التاريخ داخل فترة الدورة، لكنه ليس من أيام الدراسة المحددة للدورة.
                </p>
              </div>
            )}

            {/* لا توجد دورة */}
            {lessonDateStatus === 'no-course' && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-5 py-8 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <CalendarCheck className="size-6" />
                </div>

                <p className="mt-3 text-sm font-semibold text-slate-700">
                  لا توجد دورة محددة
                </p>
              </div>
            )}

            {/* بطاقات حالات الحضور */}
            {lessonDateStatus === 'lesson' &&
              attendanceItems.length > 0 && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {attendanceItems.map((item) => {
                    const Icon = item.icon

                    return (
                      <div
                        key={item.label}
                        className={`group rounded-2xl border p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${item.color}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium opacity-80">
                              {item.label}
                            </p>

                            <p className="mt-2 text-3xl font-bold tabular-nums">
                              {item.count}
                            </p>
                          </div>

                          <div
                            className={`flex size-11 shrink-0 items-center justify-center rounded-xl shadow-sm transition-transform duration-200 group-hover:scale-105 ${item.iconColor}`}
                          >
                            <Icon className="size-5" />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

            {/* لا توجد سجلات حضور */}
            {lessonDateStatus === 'lesson' &&
              attendanceItems.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-5 py-8 text-center">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                    <ClipboardCheck className="size-6" />
                  </div>

                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    لا توجد سجلات حضور لهذا اليوم
                  </p>

                  {stats.assignedCount > 0 && (
                    <p className="mt-2 text-xs text-slate-500">
                      عدد الطلاب الموزعين: {stats.assignedCount}
                    </p>
                  )}
                </div>
              )}
          </CardContent>
        </Card>

        {/* بقية لوحات المعلومات */}
        <DashboardViewPanels
          selectedCourse={selectedCourse}
          academicYear={academicYear}
          pendingRegistrationCount={pendingRegistrationCount}
          assignments={assignments}
          courses={courses}
          teachers={teachers}
          students={students}
          attendanceRecords={attendanceRecords}
          attendanceStatuses={attendanceStatuses}
          selectedCourseId={selectedCourseId}
          selectedDate={selectedDate}
          lessonDateStatus={lessonDateStatus}
          teacherAttendanceDetails={teacherAttendanceDetails}
          attendancePercentage={attendancePercentage}
          attendanceDetailsOpen={attendanceDetailsOpen}
          setAttendanceDetailsOpen={setAttendanceDetailsOpen}
          selectedStudent={selectedStudent}
          setSelectedStudent={setSelectedStudent}
          router={router}
        />
      </div>
    </>
  )
}
