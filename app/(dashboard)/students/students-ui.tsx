'use client'

import { useState } from 'react'

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
  Settings2,
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

import {
  baseColumns,
  extraColumns,
} from './students-table-columns'

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
  // حالات التحكم بالواجهة
  const [showColumns, setShowColumns] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedStudentIds, setSelectedStudentIds] =
    useState<string[]>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteSaving, setDeleteSaving] = useState(false)
  const [deleteMessage, setDeleteMessage] = useState('')

  const formattedAnnualFee = currentAnnualFee.toLocaleString('ar-BH', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })

  const formattedTotal = studentList.length.toLocaleString('ar-BH')
  const formattedResults = filteredStudents.length.toLocaleString('ar-BH')

  const canDelete =
    isDeletionSettingLoaded && allowStudentDeletion

  const isConnected =
    !isLoadingStudents &&
    /متصل|connected|success/i.test(supabaseStatus)

  const actionButtonClass =
    'h-9 shrink-0 gap-2 whitespace-nowrap px-3 text-sm font-medium'

  const selectedCount = selectedStudentIds.length

  const allStudentsSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((student) =>
      selectedStudentIds.includes(student.id)
    )

  // تحديد طالب أو إلغاء تحديده
  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId]
    )
  }

  // تحديد كل الطلاب الظاهرين حاليًا أو إلغاء تحديدهم
  const toggleSelectAll = () => {
    const visibleIds = filteredStudents.map(
      (student) => student.id
    )

    if (allStudentsSelected) {
      const visibleSet = new Set(visibleIds)

      setSelectedStudentIds((current) =>
        current.filter((id) => !visibleSet.has(id))
      )
    } else {
      setSelectedStudentIds((current) =>
        Array.from(new Set([...current, ...visibleIds]))
      )
    }
  }

  // إيقاف وضع التحديد
  const exitSelectionMode = () => {
    if (deleteSaving) return

    setSelectionMode(false)
    setSelectedStudentIds([])
    setShowDeleteConfirm(false)
    setDeleteMessage('')
  }

  // فتح نافذة تأكيد الحذف
  const openDeleteConfirmation = () => {
    if (
      !canDelete ||
      selectedStudentIds.length === 0 ||
      deleteSaving
    ) {
      return
    }

    setDeleteMessage('')
    setShowDeleteConfirm(true)
  }

  // إغلاق نافذة تأكيد الحذف
  const closeDeleteConfirmation = () => {
    if (deleteSaving) return

    setShowDeleteConfirm(false)
    setDeleteMessage('')
  }

  // تنفيذ الحذف باستخدام الدالة الموجودة في StudentsView
  const confirmDeleteSelected = async () => {
    if (
      !canDelete ||
      selectedStudentIds.length === 0 ||
      deleteSaving
    ) {
      return
    }

    const ids = Array.from(
      new Set(selectedStudentIds.filter(Boolean))
    )

    if (ids.length === 0) return

    setDeleteSaving(true)
    setDeleteMessage('')

    try {
      await deleteSelectedStudents(ids)

      setSelectedStudentIds([])
      setSelectionMode(false)
      setShowDeleteConfirm(false)
      setDeleteMessage('')
    } catch (error) {
      setDeleteMessage(
        error instanceof Error
          ? error.message
          : 'تعذر حذف الطلاب المحددين.'
      )
    } finally {
      setDeleteSaving(false)
    }
  }

  return (
    <div
      dir="rtl"
      className="mx-auto min-w-0 max-w-[1600px] space-y-4 pb-6 sm:space-y-5"
    >
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

      {/* حالة اتصال قاعدة البيانات */}
      <section className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
        {isLoadingStudents ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
        ) : (
          <Database
            className={`size-4 shrink-0 ${
              isConnected
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-muted-foreground'
            }`}
          />
        )}

        <span className="shrink-0 text-xs font-semibold sm:text-sm">
          اتصال قاعدة البيانات
        </span>

        <span className="text-muted-foreground">—</span>

        <p
          title={supabaseStatus}
          className={`min-w-0 flex-1 break-words text-xs sm:text-sm ${
            isConnected
              ? 'font-medium text-emerald-700 dark:text-emerald-400'
              : 'text-muted-foreground'
          }`}
        >
          {isLoadingStudents
            ? 'جارٍ تحميل بيانات الطلاب...'
            : supabaseStatus || 'حالة الاتصال غير محددة'}
        </p>
      </section>

      {/* معلومات الدراسة */}
      <section className="rounded-xl border border-border bg-card px-3 py-3 shadow-sm sm:px-4">
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
            <Wallet className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="shrink-0 text-xs text-muted-foreground">
              الرسوم السنوية:
            </span>
            <span className="text-sm font-bold tabular-nums">
              {formattedAnnualFee} د.ب
            </span>
          </div>
        </div>
      </section>

      {/* الإحصائيات */}
      <section className="grid grid-cols-2 gap-3">
        <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 shadow-sm">
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

        <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 shadow-sm">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
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

      {/* إجراءات الطالب */}
      <Card className="min-w-0 overflow-hidden rounded-xl border-border shadow-sm">
        <div className="space-y-3 p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Pencil className="size-4" />
              </div>

              <div>
                <h2 className="text-sm font-bold sm:text-base">
                  إجراءات الطالب
                </h2>

                <p className="mt-0.5 text-xs text-muted-foreground">
                  {selectedStudentId
                    ? `الطالب المحدد: ${selectedStudent?.name ?? 'طالب محدد'}`
                    : 'حدّد طالباً من السجل لتفعيل الإجراءات'}
                </p>
              </div>
            </div>

            {selectedStudentId && (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary">
                <CheckCircle2 className="size-3.5" />
                طالب محدد
              </span>
            )}
          </div>

          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <div className="flex w-max min-w-full items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!selectedStudentId}
                onClick={openEditStudent}
                className={`${actionButtonClass} border-border bg-background hover:bg-muted`}
              >
                <Pencil className="size-4" />
                تعديل
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!selectedStudentId}
                onClick={() => void toggleFeeExemption()}
                className={`${actionButtonClass} border-border bg-background hover:bg-muted`}
              >
                <Wallet className="size-4" />
                {selectedStudent?.feeExempt
                  ? 'إلغاء الإعفاء'
                  : 'إعفاء من الرسوم'}
              </Button>

              {canDelete && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!selectedStudentId}
                  onClick={() => void deleteStudent()}
                  className={`${actionButtonClass} border-destructive/30 bg-background text-destructive hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive`}
                >
                  <Trash2 className="size-4" />
                  حذف الطالب
                </Button>
              )}

              <div className="mx-1 h-6 w-px shrink-0 bg-border" />

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={filteredStudents.length === 0}
                onClick={exportStudentsToExcel}
                className={`${actionButtonClass} border-emerald-600/30 bg-emerald-600/5 text-emerald-700 hover:border-emerald-600/50 hover:bg-emerald-600/10 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300`}
              >
                <FileSpreadsheet className="size-4" />
                تنزيل Excel
                <Download className="size-3.5 opacity-70" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* سجل الطلاب والبحث */}
      <Card className="min-w-0 overflow-hidden rounded-xl border-border shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-muted/20 px-3 py-3 sm:px-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users className="size-4" />
          </div>

          <div className="min-w-0">
            <h2 className="text-base font-bold">سجل الطلاب</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              البحث والتصفية وإدارة السجلات
            </p>
          </div>

          <div className="mr-auto rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {formattedResults} طالب
          </div>
        </div>

        <CardContent className="min-w-0 space-y-4 p-3 sm:p-4">
          {/* البحث عن طالب */}
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
                  className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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

          {/* أزرار التحكم بالجدول: موجودة في هذا الملف */}
          <section className="space-y-3 border-t border-border pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowColumns((current) => !current)}
                className="gap-2"
              >
                <Settings2 className="size-4" />
                {showColumns ? 'إخفاء الأعمدة' : 'تخصيص الأعمدة'}
              </Button>

              {canDelete && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectionMode) {
                        exitSelectionMode()
                      } else {
                        setSelectionMode(true)
                        setSelectedStudentIds([])
                      }
                    }}
                  >
                    {selectionMode ? 'إلغاء التحديد' : 'تحديد'}
                  </Button>

                  {selectionMode && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={filteredStudents.length === 0}
                        onClick={toggleSelectAll}
                      >
                        {allStudentsSelected
                          ? 'إلغاء تحديد الكل'
                          : 'تحديد الكل'}
                      </Button>

                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={
                          selectedCount === 0 || deleteSaving
                        }
                        onClick={openDeleteConfirmation}
                        className="gap-2"
                      >
                        <Trash2 className="size-4" />
                        مسح المحدد ({selectedCount})
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>

            {selectionMode && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                <span className="text-muted-foreground">
                  تم تحديد{' '}
                  <span className="font-semibold text-foreground">
                    {selectedCount}
                  </span>{' '}
                  طالب
                </span>

                <span className="text-xs text-muted-foreground">
                  التحديد يشمل الصفوف الظاهرة عند استخدام «تحديد الكل».
                </span>
              </div>
            )}

            {/* لوحة تخصيص الأعمدة */}
            {showColumns && (
              <div className="rounded-xl border border-primary/20 bg-primary/[0.035] p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Settings2 className="size-4" />
                      </div>
                      تخصيص الأعمدة
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground">
                      اختر الأعمدة التي تريد ظهورها في جدول الطلاب.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowColumns(false)}
                  >
                    إغلاق
                  </Button>
                </div>

                <div className="space-y-5">
                  <div>
                    <h3 className="mb-2 text-xs font-semibold text-muted-foreground">
                      الأعمدة الأساسية
                    </h3>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                      {baseColumns.map((column) => (
                        <label
                          key={column.key}
                          className="flex min-w-0 cursor-pointer items-center gap-2 rounded-lg border bg-background px-3 py-2.5 text-sm transition-colors hover:border-primary/30 hover:bg-primary/5"
                        >
                          <input
                            type="checkbox"
                            checked={
                              visibleColumns[column.key] !== false
                            }
                            onChange={() => toggleColumn(column.key)}
                            className="size-4 shrink-0"
                          />

                          <span className="truncate">
                            {column.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 text-xs font-semibold text-muted-foreground">
                      الأعمدة الإضافية
                    </h3>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                      {extraColumns.map((column) => (
                        <label
                          key={column.key}
                          className="flex min-w-0 cursor-pointer items-center gap-2 rounded-lg border bg-background px-3 py-2.5 text-sm transition-colors hover:border-primary/30 hover:bg-primary/5"
                        >
                          <input
                            type="checkbox"
                            checked={!!visibleColumns[column.key]}
                            onChange={() => toggleColumn(column.key)}
                            className="size-4 shrink-0"
                          />

                          <span className="truncate">
                            {column.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {(dynamicFields.some((field) => field.is_active) ||
                    courses.length > 0) && (
                    <div>
                      <h3 className="mb-2 text-xs font-semibold text-muted-foreground">
                        الحقول والدورات
                      </h3>

                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {dynamicFields
                          .filter((field) => field.is_active)
                          .map((field) => (
                            <label
                              key={field.id}
                              className="flex min-w-0 cursor-pointer items-center gap-2 rounded-lg border bg-background px-3 py-2.5 text-sm transition-colors hover:border-primary/30 hover:bg-primary/5"
                            >
                              <input
                                type="checkbox"
                                checked={
                                  !!visibleColumns[
                                    `dynamic-${field.id}`
                                  ]
                                }
                                onChange={() =>
                                  toggleColumn(`dynamic-${field.id}`)
                                }
                                className="size-4 shrink-0"
                              />

                              <span className="truncate">
                                {field.name}
                              </span>
                            </label>
                          ))}

                        {courses.map((course) => (
                          <label
                            key={course.id}
                            className="flex min-w-0 cursor-pointer items-center gap-2 rounded-lg border bg-background px-3 py-2.5 text-sm transition-colors hover:border-primary/30 hover:bg-primary/5"
                          >
                            <input
                              type="checkbox"
                              checked={
                                !!visibleColumns[
                                  `course-${course.id}`
                                ]
                              }
                              onChange={() =>
                                toggleColumn(`course-${course.id}`)
                              }
                              className="size-4 shrink-0"
                            />

                            <span className="truncate">
                              {course.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* جدول الطلاب */}
          <section className="min-w-0 border-t border-border pt-3">
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
              selectionMode={selectionMode}
              selectedStudentIds={selectedStudentIds}
              onToggleStudentSelection={toggleStudentSelection}
              onSelectStudent={(id) => {
                setSelectedStudentId(
                  selectedStudentId === id ? '' : id
                )
              }}
              onUpdateFilter={updateFilter}
              onOpenNotes={openNotesDetails}
              onOpenAttendance={openAttendanceDetails}
            />
          </section>
        </CardContent>
      </Card>

      {/* نافذة تأكيد الحذف الجماعي */}
      {canDelete && showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDeleteConfirmation()
            }
          }}
        >
          <div
            dir="rtl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="students-delete-title"
            className="w-full max-w-md rounded-xl bg-background p-5 shadow-xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mb-5">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10">
                  <Trash2 className="size-5 text-destructive" />
                </div>

                <h2
                  id="students-delete-title"
                  className="text-lg font-semibold"
                >
                  تأكيد المسح
                </h2>
              </div>

              <p className="text-sm text-muted-foreground">
                هل أنت متأكد من مسح الطلاب المحددين؟
              </p>

              <div className="mt-3 rounded-lg border bg-muted/30 p-3 text-sm">
                سيتم مسح{' '}
                <span className="font-semibold">
                  {selectedCount}
                </span>{' '}
                طالب محدد.
              </div>

              <p className="mt-3 text-xs text-destructive">
                قد تؤدي هذه العملية إلى حذف بيانات الطلاب المرتبطة بهم.
              </p>
            </div>

            {deleteMessage && (
              <div
                role="alert"
                className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                {deleteMessage}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="destructive"
                onClick={() => void confirmDeleteSelected()}
                disabled={deleteSaving || selectedCount === 0}
                className="flex-1"
              >
                {deleteSaving && (
                  <Loader2 className="ml-2 size-4 animate-spin" />
                )}
                {deleteSaving
                  ? 'جارٍ المسح...'
                  : 'نعم، مسح المحدد'}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={closeDeleteConfirmation}
                disabled={deleteSaving}
              >
                إلغاء
              </Button>
            </div>
          </div>
        </div>
      )}

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
