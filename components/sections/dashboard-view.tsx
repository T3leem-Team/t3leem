'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarCheck,
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
  getLocalDateString,
  normalizeId,
  useDashboardData,
} from '@/app/(dashboard)/dashboard/dashboard-data'
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
    studentAttendanceRecords,
    loadStudentAttendanceHistory,
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

  const handleSelectStudent = (result: StudentSearchResult) => {
    setSelectedStudent(result)

    if (!selectedCourse?.id || !selectedCourse.startDate) {
      return
    }

    const today = getLocalDateString()
    const courseEnd = selectedCourse.endDate?.slice(0, 10)
    const toDate =
      courseEnd && courseEnd < today ? courseEnd : today

    void loadStudentAttendanceHistory(
      result.student.id,
      selectedCourse.id,
      selectedCourse.startDate.slice(0, 10),
      toDate,
    )
  }

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
        typeof section.href === 'string' && section.href.trim(),
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
      <div className="flex min-h-[400px] items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <RefreshCw className="size-4 animate-spin" />
          جاري تحميل لوحة المعلومات...
        </div>
      </div>
    )
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen space-y-4 bg-background text-foreground sm:space-y-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            لوحة المعلومات
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            نظرة سريعة على الطلاب والدورات والحضور
          </p>

          {academicYear && (
            <p className="mt-1 text-xs text-muted-foreground">
              السنة الدراسية:{' '}
              <span className="font-medium text-foreground">
                {academicYear.name}
              </span>
            </p>
          )}
        </div>

        <Button
          type="button"
          onClick={() => void loadData(true)}
          disabled={refreshing}
          variant="outline"
          className="h-10 w-full gap-2 border-border bg-background text-foreground shadow-sm hover:bg-accent sm:w-auto sm:min-w-[120px]"
        >
          <RefreshCw
            className={refreshing ? 'size-4 animate-spin' : 'size-4'}
          />
          تحديث
        </Button>
      </div>

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
        onSelectStudent={handleSelectStudent}
      />

      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <BookOpen className="size-4 text-sky-600 dark:text-sky-400" />
                الدورة
              </label>

              <select
                value={selectedCourseId}
                onChange={(event) => setSelectedCourseId(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
              >
                {courses.length === 0 && (
                  <option value="">لا توجد دورات</option>
                )}

                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <CalendarCheck className="size-4 text-sky-600 dark:text-sky-400" />
                التاريخ
              </label>

              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  المسجلون لهذه السنة
                </p>
                <p className="mt-2 text-3xl font-bold text-foreground">
                  {stats.studentsCount}
                </p>
              </div>

              <div className="flex size-11 items-center justify-center rounded-xl border border-border bg-muted text-foreground">
                <Users className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  المنضمون لهذه الدورة
                </p>
                <p className="mt-2 text-3xl font-bold text-foreground">
                  {stats.assignedCount}
                </p>
              </div>

              <div className="flex size-11 items-center justify-center rounded-xl border border-border bg-muted text-foreground">
                <UserCheck className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  غير منضمين لهذه الدورة
                </p>
                <p className="mt-2 text-3xl font-bold text-foreground">
                  {stats.unassignedCount}
                </p>
              </div>

              <div className="flex size-11 items-center justify-center rounded-xl border border-border bg-muted text-foreground">
                <UserX className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <div className="flex flex-col items-stretch gap-3">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <CalendarCheck className="size-5 text-violet-600 dark:text-violet-400" />
              ملخص الحضور
            </CardTitle>

            <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-start [&>*]:sm:ml-0">
              <Button
                type="button"
                onClick={() => setAttendanceDetailsOpen(true)}
                disabled={
                  !selectedCourseId ||
                  !selectedDate ||
                  lessonDateStatus !== 'lesson'
                }
                variant="outline"
                className="h-10 w-full min-w-0 gap-2 rounded-lg border-border bg-background px-3 text-sm text-foreground shadow-sm hover:bg-accent sm:w-auto sm:min-w-[150px] sm:px-4"
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

        <CardContent>
          <div className="rounded-xl border border-border bg-background p-4">
            <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
              <div>
                {lessonDateStatus === 'lesson' ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      نسبة الحضور
                    </p>

                    <p
                      className={`mt-1 text-3xl font-bold ${
                        attendancePercentage >= 60
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {attendancePercentage}%
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {stats.presentCount} حاضر من أصل {stats.assignedCount}{' '}
                      موزعين في الدورة
                    </p>

                    {stats.recordedCount > 0 &&
                      stats.recordedCount < stats.assignedCount && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          تم تسجيل الحضور لـ {stats.recordedCount} من أصل{' '}
                          {stats.assignedCount}
                        </p>
                      )}
                  </>
                ) : (
                  <p className="text-sm font-medium text-muted-foreground">
                    {lessonDateStatus === 'not-started'
                      ? 'لم تبدأ الدورة بعد'
                      : lessonDateStatus === 'ended'
                        ? 'انتهت الدورة'
                        : lessonDateStatus === 'no-lesson'
                          ? 'لا يوجد درس هذا اليوم'
                          : 'اختر دورة لعرض ملخص الحضور'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {lessonDateStatus === 'not-started' && (
            <div className="mt-4 rounded-xl border border-dashed border-border px-6 py-8 text-center">
              <CalendarCheck className="mx-auto size-7 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">
                لم تبدأ الدورة بعد
              </p>

              {selectedCourse?.startDate && (
                <p className="mt-1 text-xs text-muted-foreground">
                  تبدأ الدورة في {formatDate(selectedCourse.startDate)}
                </p>
              )}
            </div>
          )}

          {lessonDateStatus === 'ended' && (
            <div className="mt-4 rounded-xl border border-dashed border-border px-6 py-8 text-center">
              <CalendarCheck className="mx-auto size-7 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">
                انتهت الدورة
              </p>

              {selectedCourse?.endDate && (
                <p className="mt-1 text-xs text-muted-foreground">
                  انتهت الدورة في {formatDate(selectedCourse.endDate)}
                </p>
              )}
            </div>
          )}

          {lessonDateStatus === 'no-lesson' && (
            <div className="mt-4 rounded-xl border border-dashed border-border px-6 py-8 text-center">
              <CalendarCheck className="mx-auto size-7 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">
                لا يوجد درس هذا اليوم
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                هذا التاريخ داخل فترة الدورة، لكنه ليس من أيام الدراسة المحددة
                للدورة.
              </p>
            </div>
          )}

          {lessonDateStatus === 'no-course' && (
            <div className="mt-4 rounded-xl border border-dashed border-border px-6 py-8 text-center">
              <CalendarCheck className="mx-auto size-7 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">
                لا توجد دورة محددة
              </p>
            </div>
          )}

          {lessonDateStatus === 'lesson' && attendanceItems.length > 0 && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {attendanceItems.map((item) => {
                const Icon = item.icon

                return (
                  <div
                    key={item.label}
                    className={`rounded-xl border border-border bg-card p-4 ${item.color}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex size-10 items-center justify-center rounded-lg ${item.iconColor}`}
                      >
                        <Icon className="size-5" />
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          {item.label}
                        </p>
                        <p className="mt-1 text-2xl font-bold text-foreground">
                          {item.count}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {lessonDateStatus === 'lesson' && attendanceItems.length === 0 && (
            <div className="mt-4 rounded-xl border border-dashed border-border px-6 py-8 text-center">
              <CalendarCheck className="mx-auto size-7 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">
                لا توجد سجلات حضور لهذا اليوم
              </p>

              {stats.assignedCount > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  عدد الطلاب الموزعين: {stats.assignedCount}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <DashboardViewPanels
        selectedCourse={selectedCourse}
        academicYear={academicYear}
        pendingRegistrationCount={pendingRegistrationCount}
        assignments={assignments}
        courses={courses}
        teachers={teachers}
        students={students}
        attendanceRecords={attendanceRecords}
        studentAttendanceRecords={studentAttendanceRecords}
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
  )
}
