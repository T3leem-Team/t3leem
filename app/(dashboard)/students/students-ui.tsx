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
  updateFilter: (key: keyof Filters, value: string | string[]) => void

  visibleColumns: Record<string, boolean>
  toggleColumn: (key: string) => void

  dynamicFields: StudentDynamicField[]
  studentList: StudentTableStudent[]
  filteredStudents: StudentTableStudent[]
  totalStudents: number
  totalFilteredStudents: number
  loadMoreStudents: () => void
  hasMoreStudents: boolean
  isLoadingMoreStudents: boolean
  loadMoreFailed: boolean
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
  totalStudents,
  totalFilteredStudents,
  loadMoreStudents,
  hasMoreStudents,
  isLoadingMoreStudents,
  loadMoreFailed,
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

  const formattedTotal = totalStudents.toLocaleString('ar-BH')
  const formattedResults = totalFilteredStudents.toLocaleString('ar-BH')

  const canDelete =
    isDeletionSettingLoaded && allowStudentDeletion

  const isConnected =
    !isLoadingStudents &&
    /متصل|connected|success/i.test(supabaseStatus)

  const actionButtonClass =
    'h-9 shrink-0 gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors'

  const selectedCount = selectedStudentIds.length

  const allStudentsSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((student) =>
      selectedStudentIds.includes(student.id),
    )

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId],
    )
  }

  const toggleSelectAll = () => {
    const visibleIds = filteredStudents.map((student) => student.id)

    if (allStudentsSelected) {
      const visibleSet = new Set(visibleIds)

      setSelectedStudentIds((current) =>
        current.filter((id) => !visibleSet.has(id)),
      )
    } else {
      setSelectedStudentIds((current) =>
        Array.from(new Set([...current, ...visibleIds])),
      )
    }
  }

  const exitSelectionMode = () => {
    if (deleteSaving) return

    setSelectionMode(false)
    setSelectedStudentIds([])
    setShowDeleteConfirm(false)
    setDeleteMessage('')
  }

  const openDeleteConfirmation = () => {
    if (!canDelete || selectedCount === 0 || deleteSaving) return

    setDeleteMessage('')
    setShowDeleteConfirm(true)
  }

  const closeDeleteConfirmation = () => {
    if (deleteSaving) return

    setShowDeleteConfirm(false)
    setDeleteMessage('')
  }

  const confirmDeleteSelected = async () => {
    if (!canDelete || selectedCount === 0 || deleteSaving) return

    const ids = Array.from(
      new Set(selectedStudentIds.filter(Boolean)),
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
          : 'تعذر حذف الطلاب المحددين.',
      )
    } finally {
      setDeleteSaving(false)
    }
  }

  return (
    <div
      dir="rtl"
      className="mx-auto min-w-0 max-w-[1600px] space-y-5 pb-6"
    >
      {/* عنوان الصفحة */}
      <div className="overflow-hidden rounded-2xl border border-sky-200/70 bg-gradient-to-l from-sky-50 via-white to-white shadow-sm dark:border-slate-700 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
        <PageHeader
          title="إدارة الطلاب"
          description="إدارة سجلات الطلاب والرسوم والبيانات الدراسية"
          action={
            <Button
              type="button"
              onClick={openAddStudent}
              className="h-10 w-full gap-2 rounded-xl bg-sky-600 px-4 text-white shadow-sm transition-colors hover:bg-sky-700 sm:w-auto"
            >
              <UserPlus className="size-4" />
              إضافة طالب
            </Button>
          }
        />
      </div>

      {/* حالة اتصال قاعدة البيانات */}
      <section
        className={`flex min-w-0 items-center gap-3 rounded-2xl border px-4 py-3 shadow-sm ${
          isConnected
            ? 'border-emerald-200 bg-gradient-to-l from-emerald-50/80 via-white to-white dark:border-emerald-900 dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900'
            : 'border-slate-200 bg-gradient-to-l from-slate-50 via-white to-white dark:border-slate-700 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900'
        }`}
      >
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl border ${
            isConnected
              ? 'border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          {isLoadingStudents ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Database className="size-4" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            اتصال قاعدة البيانات
          </p>

          <p
            title={supabaseStatus}
            className={`mt-0.5 break-words text-xs ${
              isConnected
                ? 'text-emerald-700 dark:text-emerald-300'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {isLoadingStudents
              ? 'جارٍ تحميل بيانات الطلاب...'
              : supabaseStatus || 'حالة الاتصال غير محددة'}
          </p>
        </div>

        <span
          className={`size-2.5 shrink-0 rounded-full ${
            isLoadingStudents
              ? 'animate-pulse bg-amber-400'
              : isConnected
                ? 'bg-emerald-500'
                : 'bg-slate-400'
          }`}
        />
      </section>

      {/* معلومات الدراسة */}
      <section className="overflow-hidden rounded-2xl border border-indigo-200/70 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-3 border-b border-indigo-100 bg-gradient-to-l from-indigo-50/80 via-white to-white px-4 py-3 dark:border-slate-700 dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-900">
          <div className="flex size-9 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-100 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
            <CalendarDays className="size-4" />
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              معلومات الدراسة
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              السنة والدورة والرسوم الحالية
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-3 sm:p-4">
          <div className="flex min-w-0 items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 dark:border-indigo-900/70 dark:bg-indigo-950/20">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              <CalendarDays className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                السنة الدراسية
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                {currentAcademicYearName || 'غير محددة'}
              </p>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-3 rounded-xl border border-sky-100 bg-sky-50/50 p-3 dark:border-sky-900/70 dark:bg-sky-950/20">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
              <BookOpen className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                الدورة الحالية
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                {currentCourseName || 'غير محددة'}
              </p>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-3 rounded-xl border border-amber-100 bg-amber-50/50 p-3 dark:border-amber-900/70 dark:bg-amber-950/20">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              <Wallet className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                الرسوم السنوية
              </p>
              <p className="mt-1 text-sm font-bold tabular-nums text-slate-800 dark:text-slate-100">
                {formattedAnnualFee} د.ب
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* الإحصائيات */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="group flex items-center gap-3 overflow-hidden rounded-2xl border border-sky-200/80 bg-gradient-to-br from-sky-50 via-white to-white p-4 shadow-sm transition-all hover:shadow-md dark:border-sky-900 dark:from-sky-950/50 dark:via-slate-900 dark:to-slate-900">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-sky-200 bg-sky-100 text-sky-700 transition-transform group-hover:scale-105 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300">
            <Users className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-sky-800 dark:text-sky-300">
              إجمالي الطلاب
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-sky-950 dark:text-sky-100">
              {formattedTotal}
            </p>
          </div>
        </div>

        <div className="group flex items-center gap-3 overflow-hidden rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50 via-white to-white p-4 shadow-sm transition-all hover:shadow-md dark:border-violet-900 dark:from-violet-950/50 dark:via-slate-900 dark:to-slate-900">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-violet-200 bg-violet-100 text-violet-700 transition-transform group-hover:scale-105 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300">
            <Filter className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-violet-800 dark:text-violet-300">
              النتائج الحالية
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-violet-950 dark:text-violet-100">
              {formattedResults}
            </p>
          </div>
        </div>
      </section>

      {/* سجل الطلاب والبحث */}
      <Card className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3 border-b border-cyan-100 bg-gradient-to-l from-cyan-50/80 via-white to-white px-4 py-4 dark:border-slate-700 dark:from-cyan-950/30 dark:via-slate-900 dark:to-slate-900">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-cyan-200 bg-cyan-100 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950 dark:text-cyan-300">
            <Users className="size-5" />
          </div>

          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
              سجل الطلاب
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              البحث والتصفية وإدارة السجلات
            </p>
          </div>

          <div className="mr-auto rounded-full border border-cyan-200 bg-white px-3 py-1 text-xs font-semibold text-cyan-800 dark:border-cyan-800 dark:bg-slate-900 dark:text-cyan-300">
            {formattedResults} طالب
          </div>
        </div>

        <CardContent className="min-w-0 space-y-4 p-3 sm:p-4">
          {/* البحث عن طالب */}
          <section className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/40">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="students-search"
                className="text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                البحث عن طالب
              </label>

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 transition-colors hover:bg-white hover:text-slate-800 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                >
                  <X className="size-3.5" />
                  مسح البحث
                </button>
              )}
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />

              <input
                id="students-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="الاسم، الرقم الشخصي، الهاتف، الصف..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 pr-9 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-sky-700 dark:focus:ring-sky-950"
              />
            </div>
          </section>

          {/* أزرار التحكم بالجدول */}
          <section className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowColumns((current) => !current)}
                className="h-9 gap-2 rounded-lg border-indigo-200 bg-indigo-50/70 text-indigo-800 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-950/70"
              >
                <Settings2 className="size-4" />
                {showColumns ? 'إخفاء الأعمدة' : 'تخصيص الأعمدة'}
              </Button>

              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-2 dark:border-slate-700 dark:bg-slate-800/40">
                <div className="flex min-w-0 items-center gap-2 px-2">
                  <Pencil className="size-4 shrink-0 text-indigo-600 dark:text-indigo-300" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      إجراءات الطالب
                    </p>
                    <p className="max-w-[220px] truncate text-[11px] text-slate-500 dark:text-slate-400">
                      {selectedStudentId
                        ? `الطالب المحدد: ${selectedStudent?.name ?? 'طالب محدد'}`
                        : 'حدّد طالباً من السجل لتفعيل الإجراءات'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!selectedStudentId}
              onClick={openEditStudent}
              className={`${actionButtonClass} border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-indigo-950/40`}
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
              className={`${actionButtonClass} border-slate-200 bg-white hover:border-amber-200 hover:bg-amber-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-amber-950/30`}
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
                className={`${actionButtonClass} border-rose-200 bg-rose-50/60 text-rose-700 hover:border-rose-300 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950/60`}
              >
                <Trash2 className="size-4" />
                حذف الطالب
              </Button>
            )}

            <div className="hidden h-7 w-px bg-border sm:block" />

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={totalFilteredStudents === 0 || isLoadingStudents}
              onClick={exportStudentsToExcel}
              className={`${actionButtonClass} border-emerald-200 bg-emerald-50/60 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/60`}
            >
              <FileSpreadsheet className="size-4" />
              تنزيل Excel
              <Download className="size-3.5 opacity-70" />
            </Button>
          </div>
              </div>

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
                    className={`h-9 gap-2 rounded-lg ${
                      selectionMode
                        ? 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'
                        : 'border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300'
                    }`}
                  >
                    {selectionMode ? (
                      <X className="size-4" />
                    ) : (
                      <CheckCircle2 className="size-4" />
                    )}
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
                        className="h-9 gap-2 rounded-lg border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100 disabled:opacity-50 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300"
                      >
                        <Users className="size-4" />
                        {allStudentsSelected
                          ? 'إلغاء تحديد الكل'
                          : 'تحديد الكل'}
                      </Button>

                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={selectedCount === 0 || deleteSaving}
                        onClick={openDeleteConfirmation}
                        className="h-9 gap-2 rounded-lg"
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
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-200 bg-gradient-to-l from-sky-50/80 to-white px-3 py-2.5 dark:border-sky-900 dark:from-sky-950/40 dark:to-slate-900">
                <span className="flex items-center gap-2 text-sm text-sky-900 dark:text-sky-200">
                  <CheckCircle2 className="size-4 shrink-0" />
                  تم تحديد
                  <span className="font-bold tabular-nums">
                    {selectedCount}
                  </span>
                  طالب
                </span>

                <span className="text-xs text-slate-500 dark:text-slate-400">
                  تحديد الكل يشمل النتائج الظاهرة حاليًا.
                </span>
              </div>
            )}

            {/* لوحة تخصيص الأعمدة */}
            {showColumns && (
              <div className="overflow-hidden rounded-2xl border border-indigo-200/70 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100 bg-gradient-to-l from-indigo-50/80 via-white to-white p-4 dark:border-slate-700 dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-900">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-100 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                      <Settings2 className="size-5" />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        تخصيص الأعمدة
                      </h3>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        اختر الأعمدة التي تريد ظهورها في جدول الطلاب.
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowColumns(false)}
                    className="h-9 gap-2 rounded-lg"
                  >
                    <X className="size-4" />
                    إغلاق
                  </Button>
                </div>

                <div className="space-y-5 p-3 sm:p-4">
                  <div>
                    <h4 className="mb-3 text-xs font-bold text-slate-500 dark:text-slate-400">
                      الأعمدة الأساسية
                    </h4>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {baseColumns.map((column) => (
                        <label
                          key={column.key}
                          className="flex min-w-0 cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/30"
                        >
                          <input
                            type="checkbox"
                            checked={visibleColumns[column.key] !== false}
                            onChange={() => toggleColumn(column.key)}
                            className="size-4 shrink-0 accent-indigo-600"
                          />
                          <span className="truncate text-slate-700 dark:text-slate-200">
                            {column.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="mb-3 text-xs font-bold text-slate-500 dark:text-slate-400">
                      الأعمدة الإضافية
                    </h4>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {extraColumns.map((column) => (
                        <label
                          key={column.key}
                          className="flex min-w-0 cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/30"
                        >
                          <input
                            type="checkbox"
                            checked={!!visibleColumns[column.key]}
                            onChange={() => toggleColumn(column.key)}
                            className="size-4 shrink-0 accent-indigo-600"
                          />
                          <span className="truncate text-slate-700 dark:text-slate-200">
                            {column.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {(dynamicFields.some((field) => field.is_active) ||
                    courses.length > 0) && (
                    <div>
                      <h4 className="mb-3 text-xs font-bold text-slate-500 dark:text-slate-400">
                        الحقول والدورات
                      </h4>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {dynamicFields
                          .filter((field) => field.is_active)
                          .map((field) => (
                            <label
                              key={field.id}
                              className="flex min-w-0 cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/30"
                            >
                              <input
                                type="checkbox"
                                checked={
                                  !!visibleColumns[`dynamic-${field.id}`]
                                }
                                onChange={() =>
                                  toggleColumn(`dynamic-${field.id}`)
                                }
                                className="size-4 shrink-0 accent-indigo-600"
                              />
                              <span className="truncate text-slate-700 dark:text-slate-200">
                                {field.name}
                              </span>
                            </label>
                          ))}

                        {courses.map((course) => (
                          <label
                            key={course.id}
                            className="flex min-w-0 cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm transition-colors hover:border-sky-300 hover:bg-sky-50/50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-sky-800 dark:hover:bg-sky-950/30"
                          >
                            <input
                              type="checkbox"
                              checked={
                                !!visibleColumns[`course-${course.id}`]
                              }
                              onChange={() =>
                                toggleColumn(`course-${course.id}`)
                              }
                              className="size-4 shrink-0 accent-sky-600"
                            />
                            <span className="truncate text-slate-700 dark:text-slate-200">
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
          <section className="min-w-0 border-t border-slate-200 pt-4 dark:border-slate-700">
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
              allStudentsSelected={allStudentsSelected}
              onLoadMore={loadMoreStudents}
              hasMore={hasMoreStudents}
              isLoadingMore={isLoadingMoreStudents}
              loadMoreFailed={loadMoreFailed}
              isLoading={isLoadingStudents}
              onToggleStudentSelection={toggleStudentSelection}
              onToggleSelectAll={toggleSelectAll}
              onSelectStudent={(id) => {
                setSelectedStudentId(
                  selectedStudentId === id ? '' : id,
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
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
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
            className="w-full max-w-md overflow-hidden rounded-2xl border border-rose-200 bg-white shadow-2xl dark:border-rose-900 dark:bg-slate-900"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="border-b border-rose-100 bg-gradient-to-l from-rose-50 via-white to-white p-5 dark:border-rose-900/70 dark:from-rose-950/40 dark:via-slate-900 dark:to-slate-900">
              <div className="flex items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-rose-100 text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300">
                  <Trash2 className="size-5" />
                </div>

                <div>
                  <h2
                    id="students-delete-title"
                    className="text-lg font-bold text-slate-900 dark:text-slate-100"
                  >
                    تأكيد حذف الطلاب
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    يرجى مراجعة العدد قبل المتابعة.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                هل أنت متأكد من حذف الطلاب المحددين؟ لا تتابع إلا إذا كنت
                متأكدًا من رغبتك في تنفيذ العملية.
              </p>

              <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50/70 p-3 dark:border-rose-900 dark:bg-rose-950/30">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                  <Users className="size-5" />
                </div>
                <div>
                  <p className="text-xs text-rose-700 dark:text-rose-300">
                    عدد الطلاب المحددين للحذف
                  </p>
                  <p className="mt-1 text-xl font-bold tabular-nums text-rose-900 dark:text-rose-100">
                    {selectedCount} طالب
                  </p>
                </div>
              </div>

              <p className="text-xs leading-5 text-rose-700 dark:text-rose-300">
                قد تؤدي هذه العملية إلى حذف بيانات الطلاب المرتبطة بهم.
              </p>

              {deleteMessage && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
                >
                  {deleteMessage}
                </div>
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeDeleteConfirmation}
                  disabled={deleteSaving}
                  className="h-10 flex-1 rounded-xl border-slate-200 dark:border-slate-700"
                >
                  إلغاء
                </Button>

                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => void confirmDeleteSelected()}
                  disabled={deleteSaving || selectedCount === 0}
                  className="h-10 flex-1 gap-2 rounded-xl"
                >
                  {deleteSaving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  {deleteSaving ? 'جارٍ الحذف...' : 'نعم، حذف المحدد'}
                </Button>
              </div>
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
