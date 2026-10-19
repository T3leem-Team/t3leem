
'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

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

import * as XLSX from 'xlsx'

import { supabase } from '@/lib/supabase'

import {
  getStudentsCache,
  loadStudentsCache,
  updateStudentsCacheStudentList,
  type AcademicLevel,
  type AttendanceStatus,
  type Course,
} from '@/lib/students-cache'

import { PageHeader } from '@/components/dashboard/page-header'

import {
  Card,
  CardContent,
} from '@/components/ui/card'

import { Button } from '@/components/ui/button'

import { StudentDetails } from '@/app/(dashboard)/students/student-details'

import {
  StudentsTable,
  type StudentTableStudent,
  type StudentTableFilters,
  type StudentDynamicField,
} from '@/app/(dashboard)/students/students-table'

import { StudentForm } from '@/app/(dashboard)/students/student-form'

type Filters = StudentTableFilters

const emptyFilters: Filters = {
  name: '',
  personalId: '',
  grade: '',
  phone: '',
  whatsapp: '',
  paymentStatus: '',
  notes: '',
  attendance: '',
  guardianRelation: '',
  studentPhone: '',
  enrollmentCourse: '',
}

export function StudentsView() {
  const initialCache = getStudentsCache()

  const [
    supabaseStatus,
    setSupabaseStatus,
  ] = useState(
    initialCache?.supabaseStatus ??
      'جاري تحميل بيانات النظام...'
  )

  const [
    isLoadingStudents,
    setIsLoadingStudents,
  ] = useState(
    initialCache === null
  )

  // إعداد السماح بحذف الطلاب
  const [
    allowStudentDeletion,
    setAllowStudentDeletion,
  ] = useState(false)

  const [
    isDeletionSettingLoaded,
    setIsDeletionSettingLoaded,
  ] = useState(false)

  const [
    academicLevels,
    setAcademicLevels,
  ] = useState<AcademicLevel[]>(
    initialCache?.academicLevels ?? []
  )

  const [
    currentAcademicYearId,
    setCurrentAcademicYearId,
  ] = useState<string | null>(
    initialCache?.currentAcademicYearId ?? null
  )

  const [
    currentAcademicYearName,
    setCurrentAcademicYearName,
  ] = useState(
    initialCache?.currentAcademicYearName ?? ''
  )

  const [
    currentAnnualFee,
    setCurrentAnnualFee,
  ] = useState(
    initialCache?.currentAnnualFee ?? 0
  )

  const [courses, setCourses] = useState<Course[]>(
    initialCache?.courses ?? []
  )

  const [
    currentCourseId,
    setCurrentCourseId,
  ] = useState<string | null>(
    initialCache?.currentCourseId ?? null
  )

  const [
    currentCourseName,
    setCurrentCourseName,
  ] = useState(
    initialCache?.currentCourseName ?? ''
  )

  const [search, setSearch] = useState('')

  const [
    filters,
    setFilters,
  ] = useState<Filters>(emptyFilters)

  const [
    visibleColumns,
    setVisibleColumns,
  ] = useState<Record<string, boolean>>({
    name: true,
    personalId: true,
    grade: true,
    contact: true,
    paymentStatus: true,
    notes: true,
    attendance: true,

    studentId: false,
    guardianRelation: false,
    studentPhone: false,
    enrollmentCourseName: false,
  })

  const [
    dynamicFields,
    setDynamicFields,
  ] = useState<StudentDynamicField[]>(
    initialCache?.dynamicFields ?? []
  )

  const [
    studentList,
    setStudentList,
  ] = useState<StudentTableStudent[]>(
    initialCache?.studentList ?? []
  )

  const [
    attendanceStatuses,
    setAttendanceStatuses,
  ] = useState<AttendanceStatus[]>(
    initialCache?.attendanceStatuses ?? []
  )

  const [
    isAddStudentOpen,
    setIsAddStudentOpen,
  ] = useState(false)

  const [
    selectedStudentId,
    setSelectedStudentId,
  ] = useState('')

  const [
    editingStudentId,
    setEditingStudentId,
  ] = useState<string | null>(null)

  const [
    detailsStudent,
    setDetailsStudent,
  ] = useState<any | null>(null)

  const [
    detailsMode,
    setDetailsMode,
  ] = useState<
    'overview' | 'attendance' | 'notes' | null
  >(null)

  /*
   * ============================================================
   * تحميل إعداد السماح بحذف الطلاب
   * ============================================================
   */
  useEffect(() => {
    let cancelled = false

    async function loadDeletionSetting() {
      try {
        const response = await fetch(
          '/api/admin/students',
          {
            method: 'GET',
            cache: 'no-store',
          }
        )

        const result = await response.json()

        if (!response.ok) {
          throw new Error(
            result.error ||
              'تعذر تحميل إعداد حذف الطلاب.'
          )
        }

        if (cancelled) {
          return
        }

        setAllowStudentDeletion(
          result.deletionEnabled === true
        )
      } catch (error) {
        console.error(
          'Load student deletion setting:',
          error
        )

        if (!cancelled) {
          setAllowStudentDeletion(false)

          setSupabaseStatus(
            'تعذر التحقق من إعداد حذف الطلاب؛ تم إخفاء أزرار الحذف.'
          )
        }
      } finally {
        if (!cancelled) {
          setIsDeletionSettingLoaded(true)
        }
      }
    }

    void loadDeletionSetting()

    return () => {
      cancelled = true
    }
  }, [])

  /*
   * ============================================================
   * تحميل / تحديث كاش الطلاب
   * ============================================================
   */
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const hasCache =
        getStudentsCache() !== null

      if (!hasCache) {
        setIsLoadingStudents(true)

        setSupabaseStatus(
          'جاري تحميل قائمة الطلاب والبيانات المرتبطة...'
        )
      }

      try {
        const data = await loadStudentsCache()

        if (cancelled) {
          return
        }

        setAcademicLevels(
          data.academicLevels
        )

        setCurrentAcademicYearId(
          data.currentAcademicYearId
        )

        setCurrentAcademicYearName(
          data.currentAcademicYearName
        )

        setCurrentAnnualFee(
          data.currentAnnualFee
        )

        setCourses(data.courses)

        setCurrentCourseId(
          data.currentCourseId
        )

        setCurrentCourseName(
          data.currentCourseName
        )

        setDynamicFields(
          data.dynamicFields
        )

        setStudentList(
          data.studentList
        )

        setAttendanceStatuses(
          data.attendanceStatuses
        )

        setSupabaseStatus(
          data.supabaseStatus
        )
      } catch (error) {
        console.error(
          'StudentsView load error:',
          error
        )

        const cached = getStudentsCache()

        if (!cached) {
          setSupabaseStatus(
            error instanceof Error
              ? error.message
              : 'حدث خطأ أثناء تحميل بيانات الطلاب'
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoadingStudents(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  /*
   * ============================================================
   * الحذف الجماعي
   * ============================================================
   */
  const deleteSelectedStudents = async (
    studentIds: string[]
  ) => {
    if (
      !isDeletionSettingLoaded ||
      !allowStudentDeletion
    ) {
      setSupabaseStatus(
        'حذف الطلاب معطّل حاليًا من إعدادات النظام.'
      )
      return
    }

    const ids = Array.from(
      new Set(
        studentIds.filter(Boolean)
      )
    )

    if (ids.length === 0) {
      return
    }

    const selectedStudents = studentList.filter(
      (student) => ids.includes(student.id)
    )

    if (selectedStudents.length === 0) {
      return
    }

    const names = selectedStudents
      .map((student) => `«${student.name}»`)
      .join('، ')

    const confirmed = window.confirm(
      `⚠️ تأكيد الحذف النهائي\n\nهل أنت متأكد من حذف الطلاب التالية أسماؤهم نهائيًا؟\n\n${names}\n\nسيتم حذف بيانات الطلاب وسجلاتهم المرتبطة بهم من النظام.\n\nهذا حذف نهائي وكامل ولا يمكن التراجع عنه.`
    )

    if (!confirmed) {
      return
    }

    try {
      for (const id of ids) {
        const response = await fetch(
          '/api/admin/students',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              studentIds: [id],
            }),
          }
        )

        const result = await response
          .json()
          .catch(() => ({}))

        if (!response.ok) {
          throw new Error(
            typeof result.error === 'string'
              ? result.error
              : 'تعذر حذف الطالب.'
          )
        }
      }

      setStudentList((current) => {
        const next = current.filter(
          (student) => !ids.includes(student.id)
        )

        updateStudentsCacheStudentList(next)

        return next
      })

      if (
        selectedStudentId &&
        ids.includes(selectedStudentId)
      ) {
        setSelectedStudentId('')
      }

      setSupabaseStatus(
        `تم حذف ${selectedStudents.length} طالب نهائيًا من النظام ✅`
      )
    } catch (error) {
      console.error(
        'deleteSelectedStudents error:',
        error
      )

      setSupabaseStatus(
        error instanceof Error
          ? error.message
          : 'حدث خطأ أثناء حذف الطلاب'
      )

      throw error
    }
  }

  const updateFilter = (
    key: keyof Filters,
    value: string
  ) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }))
  }

  /*
   * ============================================================
   * فلترة وبحث الطلاب
   * ============================================================
   */
  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase()

    return studentList.filter((student) => {
      const remaining = student.feeExempt
        ? 0
        : Math.max(
            Number(student.amountDue) -
              Number(student.amountPaid),
            0
          )

      const contactText = [
        student.phone,
        student.whatsapp,
      ]
        .filter(Boolean)
        .join(' ')

      const notesText = [
        student.notes,
        student.chronicDiseases,
      ]
        .filter(Boolean)
        .join(' ')

      const dynamicText = Object.values(
        student.dynamicValues ?? {}
      ).join(' ')

      const courseStatusText = student.courseStatuses
        .map(
          (course) =>
            `${course.courseName} ${course.status}`
        )
        .join(' ')

      const searchableValues = [
        student.name,
        student.studentId,
        student.personalId,
        student.gender,
        student.age,
        student.grade,
        student.className,

        student.guardianRelation,
        student.studentPhone,
        student.enrollmentCourseName,

        contactText,
        student.status,
        student.source,
        student.paymentStatus,
        notesText,
        student.attendance,
        dynamicText,
        courseStatusText,
        remaining,
      ]

      const matchesSearch =
        !query ||
        searchableValues.some((value) =>
          String(value ?? '')
            .toLowerCase()
            .includes(query)
        )

      const matches = {
        name:
          !filters.name ||
          String(student.name ?? '')
            .toLowerCase()
            .includes(filters.name.toLowerCase()),

        personalId:
          !filters.personalId ||
          String(student.personalId ?? '')
            .includes(filters.personalId),

        grade:
          !filters.grade ||
          student.grade === filters.grade,

        phone:
          !filters.phone ||
          String(student.phone ?? '')
            .includes(filters.phone),

        whatsapp:
          !filters.whatsapp ||
          String(student.whatsapp ?? '')
            .includes(filters.whatsapp),

        paymentStatus:
          !filters.paymentStatus ||
          student.paymentStatus === filters.paymentStatus,

        notes:
          !filters.notes ||
          notesText
            .toLowerCase()
            .includes(filters.notes.toLowerCase()),

        attendance:
          !filters.attendance ||
          student.attendance === filters.attendance,

        guardianRelation:
          !filters.guardianRelation ||
          String(student.guardianRelation ?? '')
            .toLowerCase()
            .includes(
              filters.guardianRelation.toLowerCase()
            ),

        studentPhone:
          !filters.studentPhone ||
          String(student.studentPhone ?? '')
            .includes(filters.studentPhone),

        enrollmentCourse:
          !filters.enrollmentCourse ||
          String(student.enrollmentCourseName ?? '') ===
            filters.enrollmentCourse,
      }

      return (
        matchesSearch &&
        Object.values(matches).every(Boolean)
      )
    })
  }, [
    search,
    filters,
    studentList,
  ])

  const editingStudent = studentList.find(
    (student) => student.id === editingStudentId
  )

  const selectedStudent = studentList.find(
    (student) => student.id === selectedStudentId
  )

  const openAddStudent = () => {
    setEditingStudentId(null)
    setIsAddStudentOpen(true)
  }

  const openEditStudent = () => {
    if (!selectedStudentId) {
      return
    }

    setEditingStudentId(selectedStudentId)
    setIsAddStudentOpen(true)
  }

  const closeStudentDrawer = () => {
    setIsAddStudentOpen(false)
    setEditingStudentId(null)
  }

  const openNotesDetails = (
    student: StudentTableStudent
  ) => {
    setDetailsStudent(student)
    setDetailsMode('notes')
  }

  const openAttendanceDetails = (
    student: StudentTableStudent
  ) => {
    setDetailsStudent(student)
    setDetailsMode('attendance')
  }

  const closeDetails = () => {
    setDetailsStudent(null)
    setDetailsMode(null)
  }

  const toggleColumn = (key: string) => {
    setVisibleColumns((current) => {
      const visibleCount = Object.values(current).filter(
        Boolean
      ).length

      if (
        current[key] &&
        visibleCount === 1
      ) {
        return current
      }

      return {
        ...current,
        [key]: !current[key],
      }
    })
  }

  /*
   * ============================================================
   * تصدير Excel
   * ============================================================
   */
  const exportStudentsToExcel = () => {
    if (filteredStudents.length === 0) {
      setSupabaseStatus(
        'لا توجد بيانات لتصديرها إلى Excel'
      )
      return
    }

    const exportData = filteredStudents.map(
      (student, index) => {
        const remaining = student.feeExempt
          ? 0
          : Math.max(
              Number(student.amountDue) -
                Number(student.amountPaid),
              0
            )

        const row: Record<string, any> = {
          '#': index + 1,

          'معرف الطالب': student.studentId,

          'اسم الطالب': student.name,

          'الرقم الشخصي': student.personalId,

          'صلة القرابة': student.guardianRelation,

          'رقم الطالب': student.studentPhone,

          'دورة الالتحاق': student.enrollmentCourseName,

          'الجنس': student.gender,

          'العمر': student.age ?? '',

          'الصف الأكاديمي': student.grade,

          'الفصل': student.className,

          'رقم الهاتف': student.phone,

          'رقم واتساب': student.whatsapp,

          'الحالة': student.status,

          'مصدر التسجيل': student.source,

          'حالة الدفع': student.paymentStatus,

          'الرسوم السنوية': student.amountDue,

          'المدفوع': student.amountPaid,

          'المتبقي': remaining,

          'الإعفاء': student.feeExempt ? 'نعم' : 'لا',

          'الملاحظات': student.notes,

          'المعلومات الصحية': student.chronicDiseases,

          'الحضور الحالي': student.attendance,

          'تاريخ الإضافة': student.createdAt,

          'آخر تحديث': student.updatedAt,

          'السنة الدراسية': student.academicYearName,
        }

        dynamicFields.forEach((field) => {
          row[field.name] =
            student.dynamicValues?.[field.id] ?? ''
        })

        student.courseStatuses.forEach((course) => {
          row[`${course.courseName} - الحالة`] =
            course.status
        })

        return row
      }
    )

    const worksheet = XLSX.utils.json_to_sheet(exportData)

    const workbook = XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      'الطلاب'
    )

    worksheet['!cols'] = Object.keys(
      exportData[0] ?? {}
    ).map((_, index) => ({
      wch: index === 0 ? 6 : 24,
    }))

    const safeYearName = currentAcademicYearName
      .replace(/[\\/:*?"<>|]/g, '-')
      .trim()

    const fileName = safeYearName
      ? `الطلاب-${safeYearName}.xlsx`
      : 'الطلاب.xlsx'

    XLSX.writeFile(workbook, fileName)

    setSupabaseStatus(
      `تم تنزيل ${filteredStudents.length} طالب كملف Excel مع جميع بيانات الطلاب وحقول التسجيل ✅`
    )
  }

  const formattedAnnualFee = currentAnnualFee.toLocaleString(
    'ar-BH',
    {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }
  )

  return (
    <div dir="rtl" className="min-w-0 space-y-5 pb-6 sm:space-y-6">
      {/* ========================================================
          شريط حالة النظام ومعلومات الدراسة
      ======================================================== */}
      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div
          className={`flex min-w-0 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 ${
            isLoadingStudents
              ? 'bg-primary/[0.04]'
              : 'bg-muted/20'
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

                  {isLoadingStudents
                    ? 'جارٍ التحميل'
                    : 'متصل'}
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

      {/* ========================================================
          عنوان الصفحة
      ======================================================== */}
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

      {/* ========================================================
          مساحة إدارة الطلاب
      ======================================================== */}
      <Card className="min-w-0 overflow-hidden rounded-xl border shadow-sm">
        <CardContent className="min-w-0 space-y-5 p-3 sm:space-y-5 sm:p-5 lg:p-6">

          {/* البحث */}
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="students-search"
                className="text-sm font-semibold"
              >
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
                onChange={(event) =>
                  setSearch(event.target.value)
                }
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

          {/* الإحصائيات */}
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

          {/* ======================================================
              شريط الإجراءات
          ====================================================== */}
          <section className="space-y-3 rounded-xl border bg-muted/20 p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold">
                  إجراءات الطلاب
                </h2>

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
              {/* تعديل */}
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

              {/* إعفاء / إلغاء الإعفاء */}
              <Button
                type="button"
                variant="outline"
                disabled={!selectedStudentId}
                onClick={async () => {
                  if (!selectedStudentId) {
                    return
                  }

                  const selected = studentList.find(
                    (student) =>
                      student.id === selectedStudentId
                  )

                  if (!selected) {
                    return
                  }

                  const nextFeeExempt = !selected.feeExempt

                  const { error } = await supabase
                    .from('students')
                    .update({
                      fee_exempt: nextFeeExempt,
                    })
                    .eq('id', selectedStudentId)

                  if (error) {
                    setSupabaseStatus(
                      `خطأ في تحديث حالة الإعفاء: ${error.message}`
                    )
                    return
                  }

                  setStudentList((current) => {
                    const next = current.map((student) =>
                      student.id === selectedStudentId
                        ? {
                            ...student,
                            feeExempt: nextFeeExempt,
                            paymentStatus: nextFeeExempt
                              ? 'معفي'
                              : student.amountPaid >=
                                    student.amountDue &&
                                  student.amountDue > 0
                                ? 'مدفوع بالكامل'
                                : student.amountPaid > 0
                                  ? 'مدفوع جزئيًا'
                                  : 'غير مدفوع',
                          }
                        : student
                    )

                    updateStudentsCacheStudentList(next)

                    return next
                  })

                  setSupabaseStatus(
                    nextFeeExempt
                      ? 'تم إعفاء الطالب من الرسوم ✅'
                      : 'تم إلغاء إعفاء الطالب ✅'
                  )
                }}
                className="h-10 min-w-0 gap-2 px-3 text-xs sm:text-sm"
              >
                <Wallet className="size-4 shrink-0" />

                <span className="truncate">
                  {selectedStudent?.feeExempt
                    ? 'إلغاء الإعفاء'
                    : 'إعفاء'}
                </span>
              </Button>

              {/* حذف الطالب */}
              {isDeletionSettingLoaded &&
                allowStudentDeletion && (
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={!selectedStudentId}
                    onClick={async () => {
                      if (
                        !isDeletionSettingLoaded ||
                        !allowStudentDeletion ||
                        !selectedStudentId
                      ) {
                        return
                      }

                      const selected = studentList.find(
                        (student) =>
                          student.id === selectedStudentId
                      )

                      if (!selected) {
                        return
                      }

                      const confirmed = window.confirm(
                        `⚠️ تأكيد الحذف النهائي\n\nهل أنت متأكد من حذف الطالب «${selected.name}» نهائيًا؟\n\nسيتم حذف بيانات الطالب وسجلاته المرتبطة به من النظام بالكامل.\n\n⚠️ هذا حذف نهائي وكامل ولا يمكن التراجع عنه.`
                      )

                      if (!confirmed) {
                        return
                      }

                      try {
                        const response = await fetch(
                          '/api/admin/students',
                          {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              studentIds: [selectedStudentId],
                            }),
                          }
                        )

                        const result = await response
                          .json()
                          .catch(() => ({}))

                        if (!response.ok) {
                          throw new Error(
                            typeof result.error === 'string'
                              ? result.error
                              : 'تعذر حذف الطالب.'
                          )
                        }

                        setStudentList((current) => {
                          const next = current.filter(
                            (student) =>
                              student.id !== selectedStudentId
                          )

                          updateStudentsCacheStudentList(next)

                          return next
                        })

                        setSelectedStudentId('')

                        setSupabaseStatus(
                          `تم حذف الطالب «${selected.name}» نهائيًا من النظام ✅`
                        )
                      } catch (error) {
                        console.error(
                          'delete student error:',
                          error
                        )

                        setSupabaseStatus(
                          error instanceof Error
                            ? `خطأ في حذف الطالب: ${error.message}`
                            : 'حدث خطأ أثناء حذف الطالب'
                        )
                      }
                    }}
                    className="h-10 min-w-0 gap-2 px-3 text-xs sm:text-sm"
                  >
                    <X className="size-4 shrink-0" />
                    <span className="truncate">مسح الطالب</span>
                  </Button>
                )}

              {/* تصدير Excel - تصميم مستقل */}
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

          {/* ======================================================
              جدول الطلاب
          ====================================================== */}
          <section className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold sm:text-lg">
                  سجل الطلاب
                </h2>

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
                  isDeletionSettingLoaded &&
                  allowStudentDeletion
                }
                onSelectStudent={(id) => {
                  setSelectedStudentId((current) =>
                    current === id ? '' : id
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

      {/* تفاصيل الطالب */}
      <StudentDetails
        student={detailsStudent}
        mode={detailsMode}
        onClose={closeDetails}
      />

      {/* إضافة / تعديل طالب */}
      {isAddStudentOpen && (
        <StudentForm
          editingStudent={
            editingStudent
              ? {
                  ...editingStudent,
                  phone:
                    editingStudent.phone ?? undefined,
                  whatsapp:
                    editingStudent.whatsapp ?? undefined,
                  chronicDiseases:
                    editingStudent.chronicDiseases ?? undefined,
                  notes:
                    editingStudent.notes ?? undefined,
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
            courses.find(
              (course) => course.id === currentCourseId
            ) ?? null
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
