
'use client'

import {
  Search,
  UserPlus,
  Pencil,
  Download,
  X,
  Loader2,
  Users,
  Filter,
  CalendarDays,
  BookOpen,
  Wallet,
  Database,
} from 'lucide-react'

import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StudentDetails } from './student-details'
import { StudentsTable } from './students-table'
import type {
  StudentTableStudent,
  StudentTableFilters,
  StudentDynamicField,
} from './students-table'
import { StudentForm } from './student-form'
import type {
  AcademicLevel,
  AttendanceStatus,
  Course,
} from '@/lib/students-cache'

type Filters = StudentTableFilters

interface StudentsUIProps {
  supabaseStatus: string
  isLoadingStudents: boolean
  isDeletionSettingLoaded: boolean
  allowStudentDeletion: boolean

  academicLevels: AcademicLevel[]
  currentAcademicYearId: string | null
  currentAcademicYearName: string
  currentAnnualFee: number

  courses: Course[]
  currentCourseId: string | null
  currentCourseName: string

  search: string
  setSearch: (value: string) => void

  filters: Filters
  updateFilter: (key: keyof Filters, value: string) => void

  visibleColumns: Record<string, boolean>
  toggleColumn: (key: string) => void

  dynamicFields: StudentDynamicField[]
  studentList: StudentTableStudent[]
  filteredStudents: StudentTableStudent[]
  attendanceStatuses: AttendanceStatus[]

  selectedStudentId: string
  setSelectedStudentId: (id: string) => void
  selectedStudent: StudentTableStudent | undefined

  editingStudent: StudentTableStudent | undefined
  isAddStudentOpen: boolean
  openAddStudent: () => void
  openEditStudent: () => void
  closeStudentDrawer: () => void

  detailsStudent: any | null
  detailsMode: 'overview' | 'attendance' | 'notes' | null
  openNotesDetails: (student: StudentTableStudent) => void
  openAttendanceDetails: (student: StudentTableStudent) => void
  closeDetails: () => void

  exportStudentsToExcel: () => void
  toggleFeeExemption: () => Promise<void>
  deleteSelectedStudents: (studentIds: string[]) => Promise<void>
  deleteStudent: () => Promise<void>

  setSupabaseStatus: (status: string) => void
  setStudentList: React.Dispatch<
    React.SetStateAction<StudentTableStudent[]>
  >
}

export function StudentsUI({
  supabaseStatus,
  isLoadingStudents,
  isDeletionSettingLoaded,
  allowStudentDeletion,
  academicLevels,
  currentAcademicYearId,
  currentAcademicYearName,
  currentAnnualFee,
  courses,
  currentCourseId,
  currentCourseName,
  search,
  setSearch,
  filters,
  updateFilter,
  visibleColumns,
  toggleColumn,
  dynamicFields,
  studentList,
  filteredStudents,
  attendanceStatuses,
  selectedStudentId,
  setSelectedStudentId,
  selectedStudent,
  editingStudent,
  isAddStudentOpen,
  openAddStudent,
  openEditStudent,
  closeStudentDrawer,
  detailsStudent,
  detailsMode,
  openNotesDetails,
  openAttendanceDetails,
  closeDetails,
  exportStudentsToExcel,
  toggleFeeExemption,
  deleteStudent,
  deleteSelectedStudents,
  setSupabaseStatus,
  setStudentList,
}: StudentsUIProps) {
  const formattedAnnualFee = currentAnnualFee.toLocaleString(
    'ar-BH',
    {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }
  )

  return (
    <div dir="rtl" className="min-w-0 space-y-5 pb-6 sm:space-y-6">
      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div
          className={`flex min-w-0 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 ${
            isLoadingStudents ? 'bg-primary/[0.04]' : 'bg-muted/20'
          }`}
        >
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg ${
                isLoadingStudents
                  ? 'bg-primary/10 text-primary'
                  : 'bg-emerald-500/10 text-emerald-600'
              }`}
            >
              {isLoadingStudents ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Database className="size-4" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">
                  حالة النظام
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    isLoadingStudents
                      ? 'bg-primary/10 text-primary'
                      : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${
                      isLoadingStudents
                        ? 'animate-pulse bg-primary'
                        : 'bg-emerald-500'
                    }`}
                  />

                  {isLoadingStudents ? 'جارٍ التحميل' : 'متصل'}
                </span>
              </div>

              <p
                title={supabaseStatus}
                className="break-words text-xs leading-5 text-muted-foreground sm:text-sm"
              >
                {isLoadingStudents
                  ? 'جاري تحميل قائمة الطلاب والبيانات المرتبطة...'
                  : supabaseStatus}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 border-t pt-3 sm:min-w-[280px] sm:grid-cols-2 sm:border-r sm:border-t-0 sm:pr-4 sm:pt-0">
            <div className="flex min-w-0 items-center gap-2 rounded-lg border bg-background px-3 py-2">
              <CalendarDays className="size-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">
                  السنة الدراسية
                </p>
                <p className="truncate text-xs font-semibold sm:text-sm">
                  {currentAcademicYearName || 'غير محددة'}
                </p>
              </div>
            </div>

            <div className="flex min-w-0 items-center gap-2 rounded-lg border bg-background px-3 py-2">
              <BookOpen className="size-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">
                  الدورة الحالية
                </p>
                <p className="truncate text-xs font-semibold sm:text-sm">
                  {currentCourseName || 'غير محددة'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t px-4 py-2.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground sm:text-sm">
            <Wallet className="size-4 shrink-0" />
            <span>الرسوم السنوية</span>
          </div>

          <span className="shrink-0 rounded-md bg-muted px-3 py-1 text-sm font-bold tabular-nums">
            {formattedAnnualFee} د.ب
          </span>
        </div>
      </section>

      <PageHeader
        title="إدارة الطلاب"
        description="عرض وإدارة سجلات الطلاب"
        action={
          <Button
            type="button"
            onClick={openAddStudent}
            className="h-10 w-full gap-2 whitespace-nowrap shadow-sm sm:w-auto"
          >
            <UserPlus className="size-4" />
            إضافة طالب
          </Button>
        }
      />

      <Card className="min-w-0 overflow-hidden rounded-xl border shadow-sm">
        <CardContent className="min-w-0 space-y-5 p-3 sm:p-5 lg:p-6">
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="students-search" className="text-sm font-semibold">
                البحث عن طالب
              </label>

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  مسح البحث
                </button>
              )}
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="students-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ابحث بالاسم، الرقم الشخصي، الهاتف، الصف أو أي بيانات أخرى..."
                className="h-11 w-full rounded-lg border border-input bg-background px-3 pr-10 text-sm outline-none transition-[box-shadow,border-color] placeholder:text-muted-foreground/80 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 sm:h-12"
              />
            </div>

            {search.trim() && (
              <p className="text-xs text-muted-foreground">
                عدد النتائج المطابقة:{' '}
                <span className="font-semibold text-foreground">
                  {filteredStudents.length}
                </span>
              </p>
            )}
          </section>

          <section className="grid grid-cols-2 gap-3">
            <div className="relative min-w-0 overflow-hidden rounded-xl border bg-card p-3.5 sm:p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs leading-5 text-muted-foreground sm:text-sm">
                    إجمالي الطلاب
                  </p>
                  <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums sm:text-3xl">
                    {studentList.length.toLocaleString('ar-BH')}
                  </p>
                </div>
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:size-10">
                  <Users className="size-4 sm:size-5" />
                </div>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-0.5 bg-primary/40" />
            </div>

            <div className="relative min-w-0 overflow-hidden rounded-xl border bg-card p-3.5 sm:p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs leading-5 text-muted-foreground sm:text-sm">
                    النتائج الحالية
                  </p>
                  <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums sm:text-3xl">
                    {filteredStudents.length.toLocaleString('ar-BH')}
                  </p>
                </div>
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 sm:size-10">
                  <Filter className="size-4 sm:size-5" />
                </div>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-0.5 bg-sky-500/40" />
            </div>
          </section>

          <section className="space-y-3 rounded-xl border bg-muted/20 p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold">إجراءات الطلاب</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  اختر طالبًا من الجدول لتنفيذ الإجراءات المتاحة
                </p>
              </div>

              {selectedStudentId && (
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs font-medium">
                  <span className="size-1.5 rounded-full bg-primary" />
                  تم تحديد طالب
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
              <Button
                type="button"
                variant="outline"
                disabled={!selectedStudentId}
                onClick={openEditStudent}
                className="h-10 min-w-0 gap-2 px-3 text-xs sm:text-sm"
              >
                <Pencil className="size-4 shrink-0" />
                <span className="truncate">تعديل</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled={!selectedStudentId}
                onClick={() => void toggleFeeExemption()}
                className="h-10 min-w-0 gap-2 px-3 text-xs sm:text-sm"
              >
                <Wallet className="size-4 shrink-0" />
                <span className="truncate">
                  {selectedStudent?.feeExempt
                    ? 'إلغاء الإعفاء'
                    : 'إعفاء'}
                </span>
              </Button>

              {isDeletionSettingLoaded && allowStudentDeletion && (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={!selectedStudentId}
                  onClick={() => void deleteStudent()}
                  className="h-10 min-w-0 gap-2 px-3 text-xs sm:text-sm"
                >
                  <X className="size-4 shrink-0" />
                  <span className="truncate">مسح الطالب</span>
                </Button>
              )}

              <Button
                type="button"
                onClick={exportStudentsToExcel}
                disabled={filteredStudents.length === 0}
                className="h-10 min-w-0 gap-2 border border-emerald-600/20 bg-emerald-600 px-3 text-xs text-white shadow-sm hover:bg-emerald-700 disabled:bg-emerald-600/50 disabled:text-white sm:mr-auto sm:text-sm"
              >
                <Download className="size-4 shrink-0" />
                <span className="truncate">تنزيل Excel</span>
              </Button>
            </div>
          </section>

          <section className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold sm:text-lg">سجل الطلاب</h2>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                  عرض بيانات الطلاب وإدارة السجلات
                </p>
              </div>

              <span className="rounded-md border bg-background px-2.5 py-1 text-xs font-medium tabular-nums">
                {filteredStudents.length.toLocaleString('ar-BH')} نتيجة
              </span>
            </div>

            <div className="min-w-0 max-w-full">
              <StudentsTable
                students={filteredStudents}
                courses={courses}
                dynamicFields={dynamicFields}
                academicLevels={academicLevels}
                filters={filters}
                visibleColumns={visibleColumns}
                selectedStudentId={selectedStudentId}
                currentCourseName={currentCourseName}
                allowStudentDeletion={
                  isDeletionSettingLoaded && allowStudentDeletion
                }
                onSelectStudent={(id) => {
                  setSelectedStudentId(
                    selectedStudentId === id ? '' : id
                  )
                }}
                onUpdateFilter={updateFilter}
                onToggleColumn={toggleColumn}
                onOpenNotes={openNotesDetails}
                onOpenAttendance={openAttendanceDetails}
                onOpenColumns={() => {}}
                onDeleteSelected={deleteSelectedStudents}
              />
            </div>
          </section>
        </CardContent>
      </Card>

      <StudentDetails
        student={detailsStudent}
        mode={detailsMode}
        onClose={closeDetails}
      />

      {isAddStudentOpen && (
        <StudentForm
          editingStudent={
            editingStudent
              ? {
                  ...editingStudent,
                  phone: editingStudent.phone ?? undefined,
                  whatsapp: editingStudent.whatsapp ?? undefined,
                  chronicDiseases:
                    editingStudent.chronicDiseases ?? undefined,
                  notes: editingStudent.notes ?? undefined,
                  guardianRelation: editingStudent.guardianRelation ?? '',
                }
              : null
          }
          academicLevels={academicLevels}
          currentAcademicYearId={currentAcademicYearId}
          currentAcademicYearName={currentAcademicYearName}
          currentAnnualFee={currentAnnualFee}
          currentCourse={
            courses.find((course) => course.id === currentCourseId) ?? null
          }
          courses={courses}
          attendanceStatuses={attendanceStatuses}
          closeStudentDrawer={closeStudentDrawer}
          setSupabaseStatus={setSupabaseStatus}
          setStudentList={setStudentList as any}
        />
      )}
    </div>
  )
}
