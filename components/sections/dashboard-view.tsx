import {
  CalendarCheck,
  CreditCard,
  ClipboardCheck,
  UserCog,
  Users,
  CheckCircle2,
  XCircle,
  Clock3,
  UserCheck,
} from 'lucide-react'

import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  academicYears,
  students,
  teachers,
  enrollmentRequests,
} from '@/lib/data'

const currentAcademicYear = academicYears.find((year) => year.isCurrent)

const currentCourse =
  currentAcademicYear?.courses.find((course) => course.isActive) ??
  currentAcademicYear?.courses[0]

const pendingRegistrations = enrollmentRequests.filter(
  (request) => request.status === 'قيد المراجعة',
).length

const acceptedRegistrations = enrollmentRequests.filter(
  (request) => request.status === 'مقبول',
).length

const rejectedRegistrations = enrollmentRequests.filter(
  (request) => request.status === 'مرفوض',
).length

const totalStudents = students.length
const totalTeachers = teachers.length

/*
 * بيانات الحضور الحالية للتجربة.
 * لاحقًا سيتم ربطها مباشرة ببيانات الحضور الفعلية من Supabase.
 */
const attendanceByStudent: Record<string, string> = {
  '1': 'حاضر',
  '2': 'لم يسجل',
  '3': 'غائب',
  '4': 'لم يسجل',
}

const teacherStudentMap: Record<string, string[]> = {
  'TCH-301': ['1'],
  'TCH-302': ['2'],
  'TCH-303': ['3'],
  'TCH-304': [],
  'TCH-305': [],
  'TCH-306': ['4'],
}

function getTeacherAttendance(teacherId: string) {
  const studentIds = teacherStudentMap[teacherId] ?? []

  const statuses = studentIds.map(
    (studentId) => attendanceByStudent[studentId] ?? 'لم يسجل',
  )

  const present = statuses.filter((status) => status === 'حاضر').length
  const absent = statuses.filter((status) => status === 'غائب').length
  const late = statuses.filter((status) => status === 'متأخر').length
  const excused = statuses.filter((status) => status === 'مستأذن').length

  const recorded = statuses.filter(
    (status) => status !== 'لم يسجل',
  ).length

  const attendanceRate =
    recorded > 0 ? Math.round((present / recorded) * 1000) / 10 : 0

  return {
    total: studentIds.length,
    present,
    absent,
    late,
    excused,
    recorded,
    attendanceRate,
  }
}

const allAttendanceStatuses = Object.values(attendanceByStudent)

const totalPresent = allAttendanceStatuses.filter(
  (status) => status === 'حاضر',
).length

const totalAbsent = allAttendanceStatuses.filter(
  (status) => status === 'غائب',
).length

const totalLate = allAttendanceStatuses.filter(
  (status) => status === 'متأخر',
).length

const totalExcused = allAttendanceStatuses.filter(
  (status) => status === 'مستأذن',
).length

const totalNotRecorded = allAttendanceStatuses.filter(
  (status) => status === 'لم يسجل',
).length

const totalRecorded = allAttendanceStatuses.filter(
  (status) => status !== 'لم يسجل',
).length

const overallAttendanceRate =
  totalRecorded > 0
    ? Math.round((totalPresent / totalRecorded) * 1000) / 10
    : 0

const totalDue = students.reduce(
  (sum, student) => sum + student.amountDue,
  0,
)

const totalPaid = students.reduce(
  (sum, student) => sum + student.amountPaid,
  0,
)

const totalRemaining = Math.max(totalDue - totalPaid, 0)

const collectionRate =
  totalDue > 0 ? Math.round((totalPaid / totalDue) * 1000) / 10 : 0

const today = new Intl.DateTimeFormat('ar-BH', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(new Date())

function formatCurrency(value: number) {
  return `${value.toLocaleString('ar-BH')} د.ب`
}

export function DashboardView() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="مرحباً بك في تعليم"
        description={today}
      />

      {/* ملخص الحضور اليوم */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>ملخص الحضور اليوم</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {today}
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2">
              <CalendarCheck className="size-5 text-primary" />

              <div>
                <p className="text-xs text-muted-foreground">
                  نسبة الحضور
                </p>
                <p className="text-xl font-bold text-primary">
                  {overallAttendanceRate}%
                </p>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="rounded-xl border p-4">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="size-4" />
                <span className="text-sm">حاضر</span>
              </div>

              <p className="mt-2 text-2xl font-bold tabular-nums">
                {totalPresent}
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="size-4" />
                <span className="text-sm">غائب</span>
              </div>

              <p className="mt-2 text-2xl font-bold tabular-nums">
                {totalAbsent}
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <div className="flex items-center gap-2 text-amber-600">
                <Clock3 className="size-4" />
                <span className="text-sm">متأخر</span>
              </div>

              <p className="mt-2 text-2xl font-bold tabular-nums">
                {totalLate}
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <div className="flex items-center gap-2 text-blue-600">
                <UserCheck className="size-4" />
                <span className="text-sm">مستأذن</span>
              </div>

              <p className="mt-2 text-2xl font-bold tabular-nums">
                {totalExcused}
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="size-4" />
                <span className="text-sm">لم يسجل</span>
              </div>

              <p className="mt-2 text-2xl font-bold tabular-nums">
                {totalNotRecorded}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* حضور المعلمين */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">حضور المعلمين</h2>
          <p className="text-sm text-muted-foreground">
            ملخص حضور الطلاب المسندين لكل معلم اليوم
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teachers.map((teacher) => {
            const attendance = getTeacherAttendance(teacher.id)

            return (
              <Card key={teacher.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold">{teacher.name}</h3>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {teacher.subject}
                      </p>
                    </div>

                    <div className="shrink-0 rounded-xl bg-primary/10 px-3 py-2 text-center">
                      <p className="text-xl font-bold text-primary">
                        {attendance.attendanceRate}%
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        الحضور
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{
                        width: `${attendance.attendanceRate}%`,
                      }}
                    />
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/20">
                      <p className="text-xs text-muted-foreground">
                        حاضر
                      </p>
                      <p className="mt-1 font-bold text-emerald-600">
                        {attendance.present}
                      </p>
                    </div>

                    <div className="rounded-lg bg-red-50 p-3 dark:bg-red-950/20">
                      <p className="text-xs text-muted-foreground">
                        غائب
                      </p>
                      <p className="mt-1 font-bold text-red-600">
                        {attendance.absent}
                      </p>
                    </div>

                    <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-950/20">
                      <p className="text-xs text-muted-foreground">
                        متأخر
                      </p>
                      <p className="mt-1 font-bold text-amber-600">
                        {attendance.late}
                      </p>
                    </div>

                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">
                        إجمالي الطلاب
                      </p>
                      <p className="mt-1 font-bold">
                        {attendance.total}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* ملخص المدفوعات */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CreditCard className="size-5" />
            </div>

            <div>
              <CardTitle>ملخص المدفوعات</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                ملخص التحصيل المالي الحالي
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">
                إجمالي المستحق
              </p>

              <p className="mt-2 text-xl font-bold">
                {formatCurrency(totalDue)}
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">
                إجمالي المدفوع
              </p>

              <p className="mt-2 text-xl font-bold text-emerald-600">
                {formatCurrency(totalPaid)}
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">
                المتبقي
              </p>

              <p className="mt-2 text-xl font-bold text-amber-600">
                {formatCurrency(totalRemaining)}
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">
                نسبة التحصيل
              </p>

              <p className="mt-2 text-xl font-bold text-primary">
                {collectionRate}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* طلبات التسجيل */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ClipboardCheck className="size-5" />
            </div>

            <div>
              <CardTitle>طلبات التسجيل</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                ملخص حالة طلبات التسجيل
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">
                قيد المراجعة
              </p>

              <p className="mt-2 text-2xl font-bold text-amber-600">
                {pendingRegistrations}
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">
                مقبول
              </p>

              <p className="mt-2 text-2xl font-bold text-emerald-600">
                {acceptedRegistrations}
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">
                مرفوض
              </p>

              <p className="mt-2 text-2xl font-bold text-red-600">
                {rejectedRegistrations}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* معلومات الدورة الحالية */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/20 px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <UserCog className="size-4 text-primary" />

          <span className="text-muted-foreground">
            السنة الدراسية:
          </span>

          <span className="font-medium">
            {currentAcademicYear?.name ?? 'غير محددة'}
          </span>

          <span className="text-muted-foreground">•</span>

          <span className="font-medium">
            {currentCourse?.name ?? 'لا توجد دورة نشطة'}
          </span>
        </div>

        <span className="text-xs text-muted-foreground">
          إجمالي الطلاب: {totalStudents} · المعلمين: {totalTeachers}
        </span>
      </div>
    </div>
  )
}
