
'use client'

import {
  Search,
  UserPlus,
  Pencil,
  Download,
  Trash2,
  Loader2,
  Users,
  Filter,
  CalendarDays,
  BookOpen,
  Wallet,
  Database,
  FileSpreadsheet,
  CheckCircle2,
  X,
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
  const formattedAnnualFee = currentAnnualFee.toLocaleString('ar-BH', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })

  const formattedTotal = studentList.length.toLocaleString('ar-BH')
  const formattedResults = filteredStudents.length.toLocaleString('ar-BH')

  const canDelete =
    isDeletionSettingLoaded && allowStudentDeletion

  return (
    <div
      dir="rtl"
      className="mx-auto min-w-0 max-w-[1600px] space-y-4 pb-6 sm:space-y-5"
    >
      {/* عنوان الصفحة */}
      <PageHeader
        title="إدارة الطلاب"
        description="إدارة سجلات الطلاب والرسوم والبيانات الدراسية"
        action={
          <Button
            type="button"
            onClick={openAddStudent}
            className="h-9 w-full gap-2 px-4 sm:w-auto"
          >
            <UserPlus className="size-4" />
            إضافة طالب
          </Button>
        }
      />

      {/* معلومات الدراسة في سطر واحد */}
      <section className="rounded-xl border bg-card px-3 py-3 shadow-sm sm:px-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <div className="flex min-w-0 items-center gap-2">
            <CalendarDays className="size-4 shrink-0 text-primary" />
            <span className="shrink-0 text-xs text-muted-foreground">
              السنة الدراسية:
            </span>
            <span className="truncate text-sm font-semibold">
              {currentAcademicYearName || 'غير محددة'}
            </span>
          </div>

          <div className="hidden h-5 w-px bg-border sm:block" />

          <div className="flex min-w-0 items-center gap-2">
            <BookOpen className="size-4 shrink-0 text-primary" />
            <span className="shrink-0 text-xs text-muted-foreground">
              الدورة الحالية:
            </span>
            <span className="truncate text-sm font-semibold">
              {currentCourseName || 'غير محددة'}
            </span>
          </div>

          <div className="hidden h-5 w-px bg-border sm:block" />

          <div className="flex items-center gap-2">
            <Wallet className="size-4 shrink-0 text-amber-600" />
            <span className="shrink-0 text-xs text-muted-foreground">
              الرسوم السنوية:
            </span>
            <span className="text-sm font-bold tabular-nums">
              {formattedAnnualFee} د.ب
            </span>
          </div>
        </div>
      </section>

      {/* حالة قاعدة البيانات - مستقلة عن معلومات الدراسة */}
      <section className="flex min-w-0 items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2">
        {isLoadingStudents ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
        ) : (
          <Database className="size-4 shrink-0 text-muted-foreground" />
        )}

        <span className="shrink-0 text-xs font-medium">
          اتصال قاعدة البيانات
        </span>

        <span className="text-xs text-muted-foreground">—</span>

        <p
          title={supabaseStatus}
          className="min-w-0 flex-1 break-words text-xs text-muted-foreground"
        >
          {isLoadingStudents
            ? 'جارٍ تحميل بيانات الطلاب...'
            : supabaseStatus || 'حالة الاتصال غير محددة'}
        </p>
      </section>

      {/* إحصائيات مختصرة */}
      <section className="grid grid-cols-2 gap-3">
        <div className="flex min-w-0 items-center gap-3 rounded-xl border bg-card px-3 py-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">إجمالي الطلاب</p>
            <p className="mt-1 text-xl font-bold tabular-nums">
              {formattedTotal}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-3 rounded-xl border bg-card px-3 py-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <Filter className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">النتائج الحالية</p>
            <p className="mt-1 text-xl font-bold tabular-nums">
              {formattedResults}
            </p>
          </div>
        </div>
      </section>

      {/* إجراءات الطلاب - أزرار صغيرة ومجمعة */}
      <section className="rounded-xl border bg-card p-3 shadow-sm sm:px-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold">إجراءات الطلاب</h2>

          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            {selectedStudentId ? (
              <>
                <CheckCircle2 className="size-3.5 text-primary" />
                تم تحديد طالب
              </>
            ) : (
              'حدّد طالباً لتفعيل الإجراءات'
            )}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!selectedStudentId}
            onClick={openEditStudent}
            className="h-9 gap-1.5 px-3"
          >
            <Pencil className="size-3.5" />
            تعديل
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!selectedStudentId}
            onClick={() => void toggleFeeExemption()}
            className="h-9 gap-1.5 px-3"
          >
            <Wallet className="size-3.5" />
            {selectedStudent?.feeExempt
              ? 'إلغاء الإعفاء'
              : 'إعفاء من الرسوم'}
          </Button>

          {canDelete && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={!selectedStudentId}
              onClick={() => void deleteStudent()}
              className="h-9 gap-1.5 px-3"
            >
              <Trash2 className="size-3.5" />
              حذف الطالب
            </Button>
          )}

          <div className="mx-1 hidden h-6 w-px bg-border sm:block" />

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={filteredStudents.length === 0}
            onClick={exportStudentsToExcel}
            className="h-9 gap-1.5 border-emerald-600/30 px-3 text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            <FileSpreadsheet className="size-3.5" />
            تصدير Excel
            <Download className="size-3.5 opacity-70" />
          </Button>
        </div>
      </section>

      {/* سجل الطلاب والبحث */}
      <Card className="min-w-0 overflow-hidden rounded-xl shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-3 sm:px-4">
          <div>
            <h2 className="text-base font-bold">سجل الطلاب</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              البحث والتصفية وإدارة السجلات
            </p>
          </div>

          {selectedStudentId && (
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/5 px-2 py-1 text-xs text-primary">
              <CheckCircle2 className="size-3.5" />
              طالب محدد
            </span>
          )}
        </div>

        <CardContent className="min-w-0 space-y-4 p-3 sm:p-4">
          {/* البحث */}
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="students-search"
                className="text-sm font-medium"
              >
                البحث عن طالب
              </label>

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                  مسح البحث
                </button>
              )}
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <input
                id="students-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="الاسم، الرقم الشخصي، الهاتف، الصف..."
                className="h-10 w-full rounded-lg border border-input bg-background px-3 pr-9 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>
          </section>

          {/* جدول الطلاب */}
          <section className="min-w-0 border-t pt-3">
            <StudentsTable
              students={filteredStudents}
              courses={courses}
              dynamicFields={dynamicFields}
              academicLevels={academicLevels}
              filters={filters}
              visibleColumns={visibleColumns}
              selectedStudentId={selectedStudentId}
              currentCourseName={currentCourseName}
              allowStudentDeletion={canDelete}
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
          </section>
        </CardContent>
      </Card>

      {/* تفاصيل الطالب */}
      <StudentDetails
        student={detailsStudent}
        mode={detailsMode}
        onClose={closeDetails}
      />

      {/* إضافة أو تعديل طالب */}
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
                  guardianRelation:
                    editingStudent.guardianRelation ?? '',
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

'use client'

import {
  Search,
  UserPlus,
  Pencil,
  Download,
  Trash2,
  Loader2,
  Users,
  Filter,
  CalendarDays,
  BookOpen,
  Wallet,
  Database,
  FileSpreadsheet,
  Settings2,
  CheckCircle2,
  ChevronLeft,
  UserRound,
  SlidersHorizontal,
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
  const formattedAnnualFee = currentAnnualFee.toLocaleString('ar-BH', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })

  const formattedTotal = studentList.length.toLocaleString('ar-BH')
  const formattedResults = filteredStudents.length.toLocaleString('ar-BH')

  const canDelete =
    isDeletionSettingLoaded && allowStudentDeletion

  return (
    <div
      dir="rtl"
      className="mx-auto min-w-0 max-w-[1600px] space-y-5 pb-8 sm:space-y-6"
    >
      {/* Page heading */}
      <PageHeader
        title="إدارة الطلاب"
        description="إدارة سجلات الطلاب والرسوم والبيانات الدراسية"
        action={
          <Button
            type="button"
            onClick={openAddStudent}
            className="h-10 w-full gap-2 rounded-xl px-5 shadow-sm sm:w-auto"
          >
            <UserPlus className="size-4" />
            إضافة طالب
          </Button>
        }
      />

      {/* System and academic information */}
      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                isLoadingStudents
                  ? 'bg-primary/10 text-primary'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {isLoadingStudents ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Database className="size-5" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold">حالة النظام</h2>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
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
                className="mt-1 break-words text-xs leading-5 text-muted-foreground sm:text-sm"
              >
                {isLoadingStudents
                  ? 'جارٍ تحميل قائمة الطلاب والبيانات المرتبطة...'
                  : supabaseStatus}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 rounded-xl border bg-background px-3 py-2.5 sm:min-w-[180px]">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Wallet className="size-4" />
            </div>

            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">
                الرسوم السنوية
              </p>
              <p className="truncate text-sm font-bold tabular-nums">
                {formattedAnnualFee} د.ب
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5">
          <div className="flex min-w-0 items-center gap-3 rounded-xl border bg-background p-3.5 transition-colors hover:bg-muted/20">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <CalendarDays className="size-5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">
                السنة الدراسية
              </p>
              <p className="mt-1 truncate text-sm font-semibold">
                {currentAcademicYearName || 'غير محددة'}
              </p>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-3 rounded-xl border bg-background p-3.5 transition-colors hover:bg-muted/20">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <BookOpen className="size-5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">
                الدورة الحالية
              </p>
              <p className="mt-1 truncate text-sm font-semibold">
                {currentCourseName || 'غير محددة'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Student statistics */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card className="overflow-hidden rounded-2xl shadow-sm">
          <CardContent className="flex items-center justify-between gap-3 p-4 sm:p-5">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">
                إجمالي الطلاب
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums sm:text-3xl">
                {formattedTotal}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                جميع سجلات الطلاب
              </p>
            </div>

            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 sm:size-14">
              <Users className="size-6 sm:size-7" />
            </div>
          </CardContent>
          <div className="h-1 bg-blue-500/70" />
        </Card>

        <Card className="overflow-hidden rounded-2xl shadow-sm">
          <CardContent className="flex items-center justify-between gap-3 p-4 sm:p-5">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">
                النتائج الحالية
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums sm:text-3xl">
                {formattedResults}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                حسب البحث والفلاتر الحالية
              </p>
            </div>

            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 sm:size-14">
              <Filter className="size-6 sm:size-7" />
            </div>
          </CardContent>
          <div className="h-1 bg-teal-500/70" />
        </Card>
      </section>

      {/* Student actions */}
      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <SlidersHorizontal className="size-5" />
            </div>

            <div>
              <h2 className="text-base font-bold">إجراءات الطلاب</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                اختر طالبًا من الجدول لتفعيل الإجراءات الخاصة به
              </p>
            </div>
          </div>

          <div
            className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
              selectedStudentId
                ? 'border-primary/20 bg-primary/5 text-primary'
                : 'bg-background text-muted-foreground'
            }`}
          >
            <UserRound className="size-3.5" />
            {selectedStudentId
              ? 'تم تحديد طالب'
              : 'لم يتم تحديد طالب'}
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div>
            <p className="mb-3 text-xs font-semibold text-muted-foreground">
              إجراءات الطالب المحدد
            </p>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              <Button
                type="button"
                variant="outline"
                disabled={!selectedStudentId}
                onClick={openEditStudent}
                className="h-11 justify-center gap-2 rounded-xl px-3"
              >
                <Pencil className="size-4 shrink-0" />
                <span>تعديل الطالب</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled={!selectedStudentId}
                onClick={() => void toggleFeeExemption()}
                className="h-11 justify-center gap-2 rounded-xl px-3"
              >
                <Wallet className="size-4 shrink-0" />
                <span>
                  {selectedStudent?.feeExempt
                    ? 'إلغاء الإعفاء'
                    : 'إعفاء من الرسوم'}
                </span>
              </Button>

              {canDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={!selectedStudentId}
                  onClick={() => void deleteStudent()}
                  className="h-11 justify-center gap-2 rounded-xl px-3"
                >
                  <Trash2 className="size-4 shrink-0" />
                  <span>حذف الطالب</span>
                </Button>
              )}
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="mb-3 text-xs font-semibold text-muted-foreground">
              إدارة البيانات
            </p>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                type="button"
                onClick={exportStudentsToExcel}
                disabled={filteredStudents.length === 0}
                variant="outline"
                className="h-11 justify-center gap-2 rounded-xl border-emerald-600/30 text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                <FileSpreadsheet className="size-4" />
                <span>تصدير نتائج Excel</span>
                <Download className="mr-auto size-4 opacity-70" />
              </Button>

              <div className="flex min-w-0 items-center gap-2 rounded-xl border bg-muted/20 px-3 py-2.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Settings2 className="size-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    إعدادات الجدول
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    إظهار وإخفاء الأعمدة من الجدول
                  </p>
                </div>

                <ChevronLeft className="size-4 shrink-0 text-muted-foreground" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Student register */}
      <Card className="min-w-0 overflow-hidden rounded-2xl shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="size-5" />
            </div>

            <div>
              <h2 className="text-base font-bold sm:text-lg">
                سجل الطلاب
              </h2>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                البحث والتصفية وعرض وإدارة السجلات
              </p>
            </div>
          </div>

          <div className="flex w-fit items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2">
            <Users className="size-4 text-muted-foreground" />
            <span className="text-sm font-semibold tabular-nums">
              {formattedResults}
            </span>
            <span className="text-xs text-muted-foreground">
              نتيجة
            </span>
          </div>
        </div>

        <CardContent className="min-w-0 space-y-5 p-3 sm:p-5 lg:p-6">
          {/* Search */}
          <section className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="students-search"
                className="flex items-center gap-2 text-sm font-semibold"
              >
                <Search className="size-4 text-muted-foreground" />
                البحث عن طالب
              </label>

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <span>مسح البحث</span>
                  <span aria-hidden="true">×</span>
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
                placeholder="ابحث بالاسم، الرقم الشخصي، الهاتف، الصف أو بيانات أخرى..."
                className="h-12 w-full rounded-xl border border-input bg-background px-3 pr-10 text-sm outline-none transition-[box-shadow,border-color] placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>

            {search.trim() && (
              <p className="text-xs text-muted-foreground">
                عدد النتائج المطابقة:{' '}
                <span className="font-semibold text-foreground">
                  {formattedResults}
                </span>
              </p>
            )}
          </section>

          {/* Table */}
          <section className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
              <div>
                <h3 className="text-sm font-bold">بيانات الطلاب</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  اختر صفًا لتفعيل الإجراءات المتاحة
                </p>
              </div>

              {selectedStudentId && (
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-xs font-medium text-primary">
                  <CheckCircle2 className="size-3.5" />
                  تم تحديد طالب
                </div>
              )}
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
                allowStudentDeletion={canDelete}
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

      {/* Student details */}
      <StudentDetails
        student={detailsStudent}
        mode={detailsMode}
        onClose={closeDetails}
      />

      {/* Add / edit student */}
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
                  guardianRelation:
                    editingStudent.guardianRelation ?? '',
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
