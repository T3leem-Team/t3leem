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

  const initialCache =
    getStudentsCache()

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
    initialCache?.currentAcademicYearId ??
      null
  )

  const [
    currentAcademicYearName,
    setCurrentAcademicYearName,
  ] = useState(
    initialCache?.currentAcademicYearName ??
      ''
  )

  const [
    currentAnnualFee,
    setCurrentAnnualFee,
  ] = useState(
    initialCache?.currentAnnualFee ?? 0
  )

  const [courses, setCourses] =
    useState<Course[]>(
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

  const [search, setSearch] =
    useState('')

  const [
    filters,
    setFilters,
  ] = useState<Filters>(
    emptyFilters
  )

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
        const data =
          await loadStudentsCache()

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

        setCourses(
          data.courses
        )

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

        const cached =
          getStudentsCache()

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
    const ids = Array.from(
      new Set(
        studentIds.filter(Boolean)
      )
    )

    if (ids.length === 0) {
      return
    }

    const selectedStudents =
      studentList.filter(
        (student) =>
          ids.includes(student.id)
      )

    if (
      selectedStudents.length === 0
    ) {
      return
    }

    const names =
      selectedStudents
        .map(
          (student) =>
            `«${student.name}»`
        )
        .join('، ')

    const confirmed =
      window.confirm(
        `⚠️ تأكيد الحذف النهائي\n\nهل أنت متأكد من حذف الطلاب التالية أسماؤهم نهائيًا؟\n\n${names}\n\nسيتم حذف بيانات الطلاب وسجلاتهم المرتبطة بهم من النظام.\n\nهذا حذف نهائي وكامل ولا يمكن التراجع عنه.`
      )

    if (!confirmed) {
      return
    }

    try {
      for (const id of ids) {
        const {
          error,
        } = await supabase.rpc(
          'delete_student_completely',
          {
            p_student_id: id,
          }
        )

        if (error) {
          throw new Error(
            `خطأ في حذف الطالب: ${error.message}`
          )
        }
      }

      setStudentList(
        (current) => {
          const next =
            current.filter(
              (student) =>
                !ids.includes(
                  student.id
                )
            )

          updateStudentsCacheStudentList(
            next
          )

          return next
        }
      )

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
    setFilters(
      (current) => ({
        ...current,
        [key]: value,
      })
    )
  }

  /*
   * ============================================================
   * فلترة وبحث الطلاب
   * ============================================================
   */
  const filteredStudents =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase()

      return studentList.filter(
        (student) => {
          const remaining =
            student.feeExempt
              ? 0
              : Math.max(
                  Number(
                    student.amountDue
                  ) -
                    Number(
                      student.amountPaid
                    ),
                  0
                )

          const contactText =
            [
              student.phone,
              student.whatsapp,
            ]
              .filter(Boolean)
              .join(' ')

          const notesText =
            [
              student.notes,
              student.chronicDiseases,
            ]
              .filter(Boolean)
              .join(' ')

          const dynamicText =
            Object.values(
              student.dynamicValues ?? {}
            ).join(' ')

          const courseStatusText =
            student.courseStatuses
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
            searchableValues.some(
              (value) =>
                String(
                  value ?? ''
                )
                  .toLowerCase()
                  .includes(query)
            )

          const matches = {
            name:
              !filters.name ||
              String(
                student.name ?? ''
              )
                .toLowerCase()
                .includes(
                  filters.name.toLowerCase()
                ),

            personalId:
              !filters.personalId ||
              String(
                student.personalId ?? ''
              ).includes(
                filters.personalId
              ),

            grade:
              !filters.grade ||
              student.grade ===
                filters.grade,

            phone:
              !filters.phone ||
              String(
                student.phone ?? ''
              ).includes(
                filters.phone
              ),

            whatsapp:
              !filters.whatsapp ||
              String(
                student.whatsapp ?? ''
              ).includes(
                filters.whatsapp
              ),

            paymentStatus:
              !filters.paymentStatus ||
              student.paymentStatus ===
                filters.paymentStatus,

            notes:
              !filters.notes ||
              notesText
                .toLowerCase()
                .includes(
                  filters.notes.toLowerCase()
                ),

            attendance:
              !filters.attendance ||
              student.attendance ===
                filters.attendance,

            guardianRelation:
              !filters.guardianRelation ||
              String(
                student.guardianRelation ?? ''
              )
                .toLowerCase()
                .includes(
                  filters.guardianRelation.toLowerCase()
                ),

            studentPhone:
              !filters.studentPhone ||
              String(
                student.studentPhone ?? ''
              ).includes(
                filters.studentPhone
              ),

            enrollmentCourse:
              !filters.enrollmentCourse ||
              String(
                student.enrollmentCourseName ??
                  ''
              ) ===
                filters.enrollmentCourse,
          }

          return (
            matchesSearch &&
            Object.values(
              matches
            ).every(Boolean)
          )
        }
      )
    }, [
      search,
      filters,
      studentList,
    ])

  const editingStudent =
    studentList.find(
      (student) =>
        student.id ===
        editingStudentId
    )

  const selectedStudent =
    studentList.find(
      (student) =>
        student.id ===
        selectedStudentId
    )

  const openAddStudent = () => {
    setEditingStudentId(null)
    setIsAddStudentOpen(true)
  }

  const openEditStudent = () => {
    if (!selectedStudentId) {
      return
    }

    setEditingStudentId(
      selectedStudentId
    )

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
    setDetailsMode(
      'attendance'
    )
  }

  const closeDetails = () => {
    setDetailsStudent(null)
    setDetailsMode(null)
  }

  const toggleColumn = (
    key: string
  ) => {
    setVisibleColumns(
      (current) => {
        const visibleCount =
          Object.values(
            current
          ).filter(Boolean)
            .length

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
      }
    )
  }

  /*
   * ============================================================
   * تصدير Excel
   * ============================================================
   */
  const exportStudentsToExcel =
    () => {
      if (
        filteredStudents.length ===
        0
      ) {
        setSupabaseStatus(
          'لا توجد بيانات لتصديرها إلى Excel'
        )
        return
      }

      const exportData =
        filteredStudents.map(
          (
            student,
            index
          ) => {
            const remaining =
              student.feeExempt
                ? 0
                : Math.max(
                    Number(
                      student.amountDue
                    ) -
                      Number(
                        student.amountPaid
                      ),
                    0
                  )

            const row: Record<
              string,
              any
            > = {
              '#':
                index + 1,

              'معرف الطالب':
                student.studentId,

              'اسم الطالب':
                student.name,

              'الرقم الشخصي':
                student.personalId,

              'صلة القرابة':
                student.guardianRelation,

              'رقم الطالب':
                student.studentPhone,

              'دورة الالتحاق':
                student.enrollmentCourseName,

              'الجنس':
                student.gender,

              'العمر':
                student.age ?? '',

              'الصف الأكاديمي':
                student.grade,

              'الفصل':
                student.className,

              'رقم الهاتف':
                student.phone,

              'رقم واتساب':
                student.whatsapp,

              'الحالة':
                student.status,

              'مصدر التسجيل':
                student.source,

              'حالة الدفع':
                student.paymentStatus,

              'الرسوم السنوية':
                student.amountDue,

              'المدفوع':
                student.amountPaid,

              'المتبقي':
                remaining,

              'الإعفاء':
                student.feeExempt
                  ? 'نعم'
                  : 'لا',

              'الملاحظات':
                student.notes,

              'المعلومات الصحية':
                student.chronicDiseases,

              'الحضور الحالي':
                student.attendance,

              'تاريخ الإضافة':
                student.createdAt,

              'آخر تحديث':
                student.updatedAt,

              'السنة الدراسية':
                student.academicYearName,
            }

            dynamicFields.forEach(
              (field) => {
                row[field.name] =
                  student
                    .dynamicValues?.[
                    field.id
                  ] ?? ''
              }
            )

            student.courseStatuses.forEach(
              (course) => {
                row[
                  `${course.courseName} - الحالة`
                ] =
                  course.status
              }
            )

            return row
          }
        )

      const worksheet =
        XLSX.utils.json_to_sheet(
          exportData
        )

      const workbook =
        XLSX.utils.book_new()

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        'الطلاب'
      )

      worksheet['!cols'] =
        Object.keys(
          exportData[0] ?? {}
        ).map(
          (_, index) => ({
            wch:
              index === 0
                ? 6
                : 24,
          })
        )

      const safeYearName =
        currentAcademicYearName
          .replace(
            /[\\/:*?"<>|]/g,
            '-'
          )
          .trim()

      const fileName =
        safeYearName
          ? `الطلاب-${safeYearName}.xlsx`
          : 'الطلاب.xlsx'

      XLSX.writeFile(
        workbook,
        fileName
      )

      setSupabaseStatus(
        `تم تنزيل ${filteredStudents.length} طالب كملف Excel مع جميع بيانات الطلاب وحقول التسجيل ✅`
      )
    }

  return (
    <div className="space-y-6">

      <div
        className={`flex items-center gap-3 rounded-md border px-4 py-3 text-sm transition-all ${
          isLoadingStudents
            ? 'border-primary/30 bg-primary/5'
            : 'bg-muted/30'
        }`}
      >
        {isLoadingStudents && (
          <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
        )}

        <span>
          {isLoadingStudents
            ? 'جاري تحميل قائمة الطلاب والبيانات المرتبطة...'
            : supabaseStatus}
        </span>
      </div>

      <PageHeader
        title="الطلاب"
        description={`إجمالي ${studentList.length} طالب مسجّل في النظام`}
        action={
          <Button
            onClick={
              openAddStudent
            }
          >
            <UserPlus className="size-4" />
            إضافة طالب
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-4 p-4">

          {/* البحث العام */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="بحث عام في جميع بيانات الطلاب..."
              className="h-10 w-full rounded-md border bg-background px-3 pr-9 text-sm outline-none"
            />
          </div>

          {/* =====================================================
              الإحصائيات + أزرار الصفحة
              ===================================================== */}
          <div className="rounded-md border bg-muted/30 p-3">

            {/* الإحصائيات */}
            <div
              dir="rtl"
              className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b pb-3 text-sm"
            >
              <div>
                <span className="text-muted-foreground">
                  إجمالي الطلاب:
                </span>{' '}
                <span className="font-semibold">
                  {studentList.length}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground">
                  النتائج الحالية:
                </span>{' '}
                <span className="font-semibold">
                  {
                    filteredStudents.length
                  }
                </span>
              </div>

              <div>
                <span className="text-muted-foreground">
                  الرسوم السنوية:
                </span>{' '}
                <span className="font-semibold">
                  {currentAnnualFee.toLocaleString(
                    'ar-BH',
                    {
                      minimumFractionDigits: 3,
                      maximumFractionDigits: 3,
                    }
                  )}{' '}
                  د.ب
                </span>
              </div>

              {currentCourseName && (
                <div>
                  <span className="text-muted-foreground">
                    الدورة الحالية:
                  </span>{' '}
                  <span className="font-semibold">
                    {
                      currentCourseName
                    }
                  </span>
                </div>
              )}
            </div>

            {/* أزرار الصفحة */}
            <div
              dir="rtl"
              className="flex flex-wrap items-center gap-2 pt-3"
            >
              {/* إضافة طالب */}
              <Button
                type="button"
                onClick={
                  openAddStudent
                }
                className="shrink-0 whitespace-nowrap"
              >
                <UserPlus className="size-4" />
                إضافة طالب
              </Button>

              {/* تعديل */}
              <Button
                type="button"
                variant="outline"
                disabled={
                  !selectedStudentId
                }
                onClick={
                  openEditStudent
                }
                className="shrink-0 whitespace-nowrap"
              >
                <Pencil className="size-4" />
                تعديل
              </Button>

              {/* إعفاء */}
              <Button
                type="button"
                variant="outline"
                disabled={
                  !selectedStudentId
                }
                onClick={async () => {
                  if (
                    !selectedStudentId
                  ) {
                    return
                  }

                  const selected =
                    studentList.find(
                      (student) =>
                        student.id ===
                        selectedStudentId
                    )

                  if (!selected) {
                    return
                  }

                  const nextFeeExempt =
                    !selected.feeExempt

                  const {
                    error,
                  } =
                    await supabase
                      .from(
                        'students'
                      )
                      .update({
                        fee_exempt:
                          nextFeeExempt,
                      })
                      .eq(
                        'id',
                        selectedStudentId
                      )

                  if (error) {
                    setSupabaseStatus(
                      `خطأ في تحديث حالة الإعفاء: ${error.message}`
                    )
                    return
                  }

                  setStudentList(
                    (current) => {
                      const next =
                        current.map(
                          (
                            student
                          ) =>
                            student.id ===
                            selectedStudentId
                              ? {
                                  ...student,
                                  feeExempt:
                                    nextFeeExempt,
                                  paymentStatus:
                                    nextFeeExempt
                                      ? 'معفي'
                                      : student.amountPaid >=
                                            student.amountDue &&
                                          student.amountDue >
                                            0
                                        ? 'مدفوع بالكامل'
                                        : student.amountPaid >
                                            0
                                          ? 'مدفوع جزئيًا'
                                          : 'غير مدفوع',
                                }
                              : student
                        )

                      updateStudentsCacheStudentList(
                        next
                      )

                      return next
                    }
                  )

                  setSupabaseStatus(
                    nextFeeExempt
                      ? 'تم إعفاء الطالب من الرسوم ✅'
                      : 'تم إلغاء إعفاء الطالب ✅'
                  )
                }}
                className="shrink-0 whitespace-nowrap"
              >
                {selectedStudent?.feeExempt
                  ? 'إلغاء الإعفاء'
                  : 'إعفاء'}
              </Button>

              {/* مسح */}
              <Button
                type="button"
                variant="destructive"
                disabled={
                  !selectedStudentId
                }
                onClick={async () => {
                  if (
                    !selectedStudentId
                  ) {
                    return
                  }

                  const selected =
                    studentList.find(
                      (student) =>
                        student.id ===
                        selectedStudentId
                    )

                  if (!selected) {
                    return
                  }

                  const confirmed =
                    window.confirm(
                      `⚠️ تأكيد الحذف النهائي\n\nهل أنت متأكد من حذف الطالب «${selected.name}» نهائيًا؟\n\nسيتم حذف بيانات الطالب وسجلاته المرتبطة به من النظام بالكامل.\n\n⚠️ هذا حذف نهائي وكامل ولا يمكن التراجع عنه.`
                    )

                  if (!confirmed) {
                    return
                  }

                  try {
                    const {
                      error,
                    } =
                      await supabase.rpc(
                        'delete_student_completely',
                        {
                          p_student_id:
                            selectedStudentId,
                        }
                      )

                    if (error) {
                      throw new Error(
                        error.message
                      )
                    }

                    setStudentList(
                      (current) => {
                        const next =
                          current.filter(
                            (
                              student
                            ) =>
                              student.id !==
                              selectedStudentId
                          )

                        updateStudentsCacheStudentList(
                          next
                        )

                        return next
                      }
                    )

                    setSelectedStudentId(
                      ''
                    )

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
                className="shrink-0 whitespace-nowrap"
              >
                <X className="size-4" />
                مسح
              </Button>

              {/* فاصل */}
              <div className="hidden flex-1 sm:block" />

              {/* تنزيل Excel */}
              <Button
                type="button"
                onClick={
                  exportStudentsToExcel
                }
                disabled={
                  filteredStudents.length ===
                  0
                }
                className="shrink-0 whitespace-nowrap bg-green-600 text-white hover:bg-green-700 disabled:bg-green-600/50 disabled:text-white"
              >
                <Download className="size-4" />
                تنزيل Excel
              </Button>
            </div>
          </div>

          <StudentsTable
            students={
              filteredStudents
            }
            courses={
              courses
            }
            dynamicFields={
              dynamicFields
            }
            academicLevels={
              academicLevels
            }
            filters={
              filters
            }
            visibleColumns={
              visibleColumns
            }
            selectedStudentId={
              selectedStudentId
            }
            currentCourseName={
              currentCourseName
            }
            onSelectStudent={(
              id
            ) => {
              setSelectedStudentId(
                (current) =>
                  current === id
                    ? ''
                    : id
              )
            }}
            onUpdateFilter={
              updateFilter
            }
            onToggleColumn={
              toggleColumn
            }
            onOpenNotes={
              openNotesDetails
            }
            onOpenAttendance={
              openAttendanceDetails
            }
            onOpenColumns={() => {}}
            onDeleteSelected={
              deleteSelectedStudents
            }
          />
        </CardContent>
      </Card>

      <StudentDetails
        student={
          detailsStudent
        }
        mode={
          detailsMode
        }
        onClose={
          closeDetails
        }
      />

      {isAddStudentOpen && (
        <StudentForm
          editingStudent={
            editingStudent
              ? {
                  ...editingStudent,
                  guardianRelation:
                    editingStudent.guardianRelation ?? '',
                }
              : null
          }
          academicLevels={
            academicLevels
          }
          currentAcademicYearId={
            currentAcademicYearId
          }
          currentAcademicYearName={
            currentAcademicYearName
          }
          currentAnnualFee={
            currentAnnualFee
          }
          currentCourse={
            courses.find(
              (course) =>
                course.id ===
                currentCourseId
            ) ?? null
          }
          courses={
            courses
          }
          attendanceStatuses={
            attendanceStatuses
          }
          closeStudentDrawer={
            closeStudentDrawer
          }
          setSupabaseStatus={
            setSupabaseStatus
          }
          setStudentList={
            setStudentList as any
          }
        />
      )}
    </div>
  )
}