'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import ExcelJS from 'exceljs'

import {
  updateStudentFeeExemption,
} from '@/lib/features/students/repositories/students-mutations.repository'

import {
  getStudentsCache,
  loadStudentsCache,
  loadStudentsCachePage,
  loadStudentAttendanceDetails,
  updateStudentsCacheStudentList,
  type AcademicLevel,
  type AttendanceStatus,
  type Course,
} from '@/lib/students-cache'

import type {
  StudentTableStudent,
  StudentTableFilters,
  StudentDynamicField,
} from '@/app/(dashboard)/students/students-table'

import { StudentsUI } from '@/app/(dashboard)/students/students-ui'

type Filters = StudentTableFilters

const emptyFilters: Filters = {
  name: '',
  personalId: '',
  grade: [],
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

  // حالة الاتصال والتحميل
  const [supabaseStatus, setSupabaseStatus] = useState(
    initialCache?.supabaseStatus ??
      'جاري تحميل بيانات النظام...'
  )

  const [isLoadingStudents, setIsLoadingStudents] = useState(
    initialCache === null
  )

  // إعداد السماح بحذف الطلاب
  const [allowStudentDeletion, setAllowStudentDeletion] =
    useState(false)

  const [isDeletionSettingLoaded, setIsDeletionSettingLoaded] =
    useState(false)

  // البيانات الدراسية
  const [academicLevels, setAcademicLevels] = useState<
    AcademicLevel[]
  >(initialCache?.academicLevels ?? [])

  const [currentAcademicYearId, setCurrentAcademicYearId] =
    useState<string | null>(
      initialCache?.currentAcademicYearId ?? null
    )

  const [currentAcademicYearName, setCurrentAcademicYearName] =
    useState(initialCache?.currentAcademicYearName ?? '')

  const [currentAnnualFee, setCurrentAnnualFee] = useState(
    initialCache?.currentAnnualFee ?? 0
  )

  const [courses, setCourses] = useState<Course[]>(
    initialCache?.courses ?? []
  )

  const [currentCourseId, setCurrentCourseId] = useState<
    string | null
  >(initialCache?.currentCourseId ?? null)

  const [currentCourseName, setCurrentCourseName] = useState(
    initialCache?.currentCourseName ?? ''
  )

  // البحث والفلترة
  const [search, setSearch] = useState('')

  const [filters, setFilters] = useState<Filters>(emptyFilters)

  // الأعمدة الظاهرة في الجدول
  const [visibleColumns, setVisibleColumns] = useState<
    Record<string, boolean>
  >({
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
    currentTeacherName: false,
  })

  // بيانات الطلاب والحقول الإضافية
  const [dynamicFields, setDynamicFields] = useState<
    StudentDynamicField[]
  >(initialCache?.dynamicFields ?? [])

  const [studentList, setStudentList] = useState<
    StudentTableStudent[]
  >(initialCache?.studentList.slice(0, 50) ?? [])

  const [totalStudents, setTotalStudents] = useState(
    initialCache?.totalStudents ?? 0
  )

  const [totalFilteredStudents, setTotalFilteredStudents] = useState(
    initialCache?.totalStudents ?? 0
  )

  const [isLoadingMoreStudents, setIsLoadingMoreStudents] =
    useState(false)

  const [loadMoreFailed, setLoadMoreFailed] = useState(false)

  const [hasLoadedInitialStudents, setHasLoadedInitialStudents] =
    useState(false)

  const [queryRefreshVersion, setQueryRefreshVersion] = useState(0)

  const loadMoreLock = useRef(false)
  const activeQueryKey = useRef('')
  const lastQueryKey = useRef('')

  // يمنع نتيجة طلب حضور قديم من استبدال تفاصيل طالب أحدث.
  const attendanceRequestVersion = useRef(0)

  const [attendanceStatuses, setAttendanceStatuses] = useState<
    AttendanceStatus[]
  >(initialCache?.attendanceStatuses ?? [])

  // حالة نموذج إضافة وتعديل الطالب
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false)

  const [selectedStudentId, setSelectedStudentId] = useState('')

  const [editingStudentId, setEditingStudentId] = useState<
    string | null
  >(null)

  // تفاصيل الطالب
  const [detailsStudent, setDetailsStudent] =
    useState<StudentTableStudent | null>(null)

  const [detailsMode, setDetailsMode] = useState<
    'overview' | 'attendance' | 'notes' | null
  >(null)

  /*
   * تحميل إعداد السماح بحذف الطلاب
   */
  useEffect(() => {
    let cancelled = false

    async function loadDeletionSetting() {
      try {
        const response = await fetch('/api/admin/students', {
          method: 'GET',
          cache: 'no-store',
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(
            result.error ||
              'تعذر تحميل إعداد حذف الطلاب.'
          )
        }

        if (cancelled) return

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
   * تحميل وتحديث كاش الطلاب
   */
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const hasCache = getStudentsCache() !== null

      if (!hasCache) {
        setIsLoadingStudents(true)

        setSupabaseStatus(
          'جاري تحميل قائمة الطلاب والبيانات المرتبطة...'
        )
      }

      try {
        const data = await loadStudentsCache()

        if (cancelled) return

        setAcademicLevels(data.academicLevels)
        setCurrentAcademicYearId(
          data.currentAcademicYearId
        )
        setCurrentAcademicYearName(
          data.currentAcademicYearName
        )
        setCurrentAnnualFee(data.currentAnnualFee)
        setCourses(data.courses)
        setCurrentCourseId(data.currentCourseId)
        setCurrentCourseName(data.currentCourseName)
        setDynamicFields(data.dynamicFields)
        setStudentList(data.studentList.slice(0, 50))
        setTotalStudents(data.totalStudents)
        setTotalFilteredStudents(data.totalStudents)
        setAttendanceStatuses(data.attendanceStatuses)
        setSupabaseStatus(data.supabaseStatus)

        const initialKey = JSON.stringify({
          search: '',
          filters: emptyFilters,
          refresh: 0,
        })

        activeQueryKey.current = initialKey
        lastQueryKey.current = initialKey

        setHasLoadedInitialStudents(true)
      } catch (error) {
        console.error('StudentsView load error:', error)

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

  const queryKey = JSON.stringify({
    search: search.trim(),
    filters,
    refresh: queryRefreshVersion,
  })

  // إعادة جلب أول 50 نتيجة من قاعدة البيانات عند تغيير البحث أو الفلاتر.
  useEffect(() => {
    if (
      !hasLoadedInitialStudents ||
      queryKey === lastQueryKey.current
    ) {
      return
    }

    activeQueryKey.current = queryKey
    lastQueryKey.current = queryKey

    setIsLoadingStudents(true)
    setIsLoadingMoreStudents(false)
    setLoadMoreFailed(false)

    loadMoreLock.current = false

    setStudentList([])
    setTotalFilteredStudents(0)
    setSelectedStudentId('')

    let cancelled = false

    const timeout = window.setTimeout(async () => {
      try {
        const result = await loadStudentsCachePage({
          offset: 0,
          search,
          filters,
        })

        if (
          cancelled ||
          activeQueryKey.current !== queryKey
        ) {
          return
        }

        setStudentList(result.students)
        setTotalFilteredStudents(result.totalStudents)

        if (
          !search.trim() &&
          JSON.stringify(filters) ===
            JSON.stringify(emptyFilters)
        ) {
          updateStudentsCacheStudentList(
            result.students,
            totalStudents
          )
        }

        setSupabaseStatus(
          'تم تحديث نتائج البحث والتصفية ✅'
        )
      } catch (error) {
        console.error(
          'Students search/filter error:',
          error
        )

        if (!cancelled) {
          setSupabaseStatus(
            error instanceof Error
              ? `تعذر تحميل نتائج البحث: ${error.message}`
              : 'تعذر تحميل نتائج البحث.'
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoadingStudents(false)
        }
      }
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [
    queryKey,
    hasLoadedInitialStudents,
    search,
    filters,
    totalStudents,
  ])

  /*
   * تحميل دفعة إضافية من الطلاب
   */
  const loadMoreStudents = async () => {
    if (
      loadMoreLock.current ||
      isLoadingStudents ||
      studentList.length >= totalFilteredStudents
    ) {
      return
    }

    const requestKey = activeQueryKey.current
    const requestOffset = studentList.length

    loadMoreLock.current = true

    setLoadMoreFailed(false)
    setIsLoadingMoreStudents(true)

    try {
      const result = await loadStudentsCachePage({
        offset: requestOffset,
        search,
        filters,
      })

      if (activeQueryKey.current !== requestKey) return

      if (result.students.length === 0) {
        setTotalFilteredStudents(requestOffset)
        return
      }

      setStudentList((current) => {
        const existingIds = new Set(
          current.map((student) => student.id)
        )

        const next = [
          ...current,
          ...result.students.filter(
            (student) => !existingIds.has(student.id)
          ),
        ]

        if (
          !search.trim() &&
          JSON.stringify(filters) ===
            JSON.stringify(emptyFilters)
        ) {
          updateStudentsCacheStudentList(
            next,
            totalStudents
          )
        }

        return next
      })

      setTotalFilteredStudents(result.totalStudents)
    } catch (error) {
      console.error('Load more students error:', error)

      setLoadMoreFailed(true)

      setSupabaseStatus(
        error instanceof Error
          ? `تعذر تحميل بقية الطلاب: ${error.message}`
          : 'تعذر تحميل بقية الطلاب.'
      )
    } finally {
      loadMoreLock.current = false
      setIsLoadingMoreStudents(false)
    }
  }

  /*
   * تحديث الفلاتر
   */
  const updateFilter = (
    key: keyof Filters,
    value: string | string[]
  ) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }))
  }

  /*
   * فلترة وبحث الطلاب
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
          String(student.personalId ?? '').includes(
            filters.personalId
          ),

        grade:
          filters.grade.length === 0 ||
          filters.grade.includes(
            String(student.grade ?? '')
          ),

        phone:
          !filters.phone ||
          String(student.phone ?? '').includes(
            filters.phone
          ),

        whatsapp:
          !filters.whatsapp ||
          String(student.whatsapp ?? '').includes(
            filters.whatsapp
          ),

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
          String(student.studentPhone ?? '').includes(
            filters.studentPhone
          ),

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
  }, [search, filters, studentList])

  /*
   * الطالب المحدد والطالب قيد التعديل
   */
  const editingStudent = studentList.find(
    (student) => student.id === editingStudentId
  )

  const selectedStudent = studentList.find(
    (student) => student.id === selectedStudentId
  )

  /*
   * فتح وإغلاق نموذج الطالب
   */
  const openAddStudent = () => {
    setEditingStudentId(null)
    setIsAddStudentOpen(true)
  }

  const openEditStudent = () => {
    if (!selectedStudentId) return

    setEditingStudentId(selectedStudentId)
    setIsAddStudentOpen(true)
  }

  const closeStudentDrawer = () => {
    setIsAddStudentOpen(false)
    setEditingStudentId(null)
  }

  /*
   * تفاصيل الملاحظات
   * لا يتم تحميل سجلات الحضور هنا.
   */
  const openNotesDetails = (
    student: StudentTableStudent
  ) => {
    attendanceRequestVersion.current++

    setDetailsStudent(student)
    setDetailsMode('notes')
  }

  /*
   * تفاصيل الحضور
   * تحميل سجلات الطالب عند فتح التفاصيل فقط.
   */
  const openAttendanceDetails = async (
    student: StudentTableStudent
  ) => {
    const requestVersion =
      ++attendanceRequestVersion.current

    setDetailsStudent(null)
    setDetailsMode('attendance')

    try {
      const attendanceData =
        await loadStudentAttendanceDetails(student.id)

      // تجاهل النتيجة إذا تم فتح طالب آخر أو إغلاق التفاصيل.
      if (
        attendanceRequestVersion.current !==
        requestVersion
      ) {
        return
      }

      setDetailsStudent({
        ...student,
        attendanceSummaries:
          attendanceData.attendanceSummaries,
        attendanceRecords:
          attendanceData.attendanceRecords,
      })
    } catch (error) {
      console.error(
        'Load student attendance details error:',
        error
      )

      if (
        attendanceRequestVersion.current !==
        requestVersion
      ) {
        return
      }

      setDetailsStudent({
        ...student,
        attendanceSummaries: [],
        attendanceRecords: [],
      })

      setSupabaseStatus(
        error instanceof Error
          ? `تعذر تحميل تفاصيل الحضور: ${error.message}`
          : 'تعذر تحميل تفاصيل الحضور.'
      )
    }
  }

  const closeDetails = () => {
    // إلغاء صلاحية أي طلب حضور ما زال قيد التنفيذ.
    attendanceRequestVersion.current++

    setDetailsStudent(null)
    setDetailsMode(null)
  }

  /*
   * إظهار وإخفاء أعمدة الجدول
   */
  const toggleColumn = (key: string) => {
    setVisibleColumns((current) => {
      const visibleCount = Object.values(current).filter(
        Boolean
      ).length

      if (current[key] && visibleCount === 1) {
        return current
      }

      return {
        ...current,
        [key]: !current[key],
      }
    })
  }

  /*
   * إعفاء الطالب من الرسوم أو إلغاء الإعفاء
   */
  const toggleFeeExemption = async () => {
    if (!selectedStudentId) return

    const selected = studentList.find(
      (student) => student.id === selectedStudentId
    )

    if (!selected) return

    const nextFeeExempt = !selected.feeExempt

    const { error } = await updateStudentFeeExemption(
      selectedStudentId,
      nextFeeExempt
    )

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
                : student.amountPaid >= student.amountDue &&
                    student.amountDue > 0
                  ? 'مدفوع بالكامل'
                  : student.amountPaid > 0
                    ? 'مدفوع جزئيًا'
                    : 'غير مدفوع',
            }
          : student
      )

      if (
        !search.trim() &&
        JSON.stringify(filters) ===
          JSON.stringify(emptyFilters)
      ) {
        updateStudentsCacheStudentList(
          next,
          totalStudents
        )
      }

      return next
    })

    setQueryRefreshVersion((current) => current + 1)

    setSupabaseStatus(
      nextFeeExempt
        ? 'تم إعفاء الطالب من الرسوم ✅'
        : 'تم إلغاء إعفاء الطالب ✅'
    )
  }

  /*
   * حذف طالب واحد
   */
  const deleteStudent = async () => {
    if (
      !isDeletionSettingLoaded ||
      !allowStudentDeletion ||
      !selectedStudentId
    ) {
      setSupabaseStatus(
        'حذف الطلاب معطّل حاليًا من إعدادات النظام.'
      )
      return
    }

    const selected = studentList.find(
      (student) => student.id === selectedStudentId
    )

    if (!selected) return

    const confirmed = window.confirm(
      `⚠️ تأكيد الحذف النهائي\n\nهل أنت متأكد من حذف الطالب «${selected.name}» نهائيًا؟\n\nسيتم حذف بيانات الطالب وسجلاته المرتبطة به من النظام بالكامل.\n\n⚠️ هذا حذف نهائي وكامل ولا يمكن التراجع عنه.`
    )

    if (!confirmed) return

    try {
      const response = await fetch('/api/admin/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentIds: [selectedStudentId],
        }),
      })

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
          (student) => student.id !== selectedStudentId
        )

        if (
          !search.trim() &&
          JSON.stringify(filters) ===
            JSON.stringify(emptyFilters)
        ) {
          updateStudentsCacheStudentList(
            next,
            Math.max(0, totalStudents - 1),
            [selectedStudentId]
          )
        }

        return next
      })

      setSelectedStudentId('')

      setTotalStudents((current) =>
        Math.max(0, current - 1)
      )

      setTotalFilteredStudents((current) =>
        Math.max(0, current - 1)
      )

      setSupabaseStatus(
        `تم حذف الطالب «${selected.name}» نهائيًا من النظام ✅`
      )
    } catch (error) {
      console.error('delete student error:', error)

      setSupabaseStatus(
        error instanceof Error
          ? `خطأ في حذف الطالب: ${error.message}`
          : 'حدث خطأ أثناء حذف الطالب'
      )
    }
  }

  /*
   * الحذف الجماعي
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
      new Set(studentIds.filter(Boolean))
    )

    if (ids.length === 0) return

    const selectedStudents = studentList.filter(
      (student) => ids.includes(student.id)
    )

    if (selectedStudents.length === 0) return

    const names = selectedStudents
      .map((student) => `«${student.name}»`)
      .join('، ')

    const confirmed = window.confirm(
      `⚠️ تأكيد الحذف النهائي\n\nهل أنت متأكد من حذف الطلاب التالية أسماؤهم نهائيًا؟\n\n${names}\n\nسيتم حذف بيانات الطلاب وسجلاتهم المرتبطة بهم من النظام.\n\nهذا حذف نهائي وكامل ولا يمكن التراجع عنه.`
    )

    if (!confirmed) return

    try {
      for (const id of ids) {
        const response = await fetch('/api/admin/students', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            studentIds: [id],
          }),
        })

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

        if (
          !search.trim() &&
          JSON.stringify(filters) ===
            JSON.stringify(emptyFilters)
        ) {
          updateStudentsCacheStudentList(
            next,
            Math.max(
              0,
              totalStudents - selectedStudents.length
            ),
            ids
          )
        }

        return next
      })

      if (ids.includes(selectedStudentId)) {
        setSelectedStudentId('')
      }

      setTotalStudents((current) =>
        Math.max(
          0,
          current - selectedStudents.length
        )
      )

      setTotalFilteredStudents((current) =>
        Math.max(
          0,
          current - selectedStudents.length
        )
      )

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

  /*
   * تصدير بيانات الطلاب إلى Excel
   */
  const exportStudentsToExcel = async () => {
    setSupabaseStatus(
      'جاري تجهيز جميع نتائج التصدير...'
    )

    const exportStudents: StudentTableStudent[] = []

    let exportOffset = 0
    let exportTotal = 0

    try {
      while (true) {
        const page = await loadStudentsCachePage({
          offset: exportOffset,
          limit: 500,
          search,
          filters,
        })

        exportTotal = page.totalStudents

        exportStudents.push(...page.students)

        exportOffset += page.students.length

        if (
          page.students.length === 0 ||
          exportOffset >= exportTotal
        ) {
          break
        }
      }
    } catch (error) {
      console.error(
        'Export students load error:',
        error
      )

      setSupabaseStatus(
        error instanceof Error
          ? `تعذر تجهيز ملف Excel: ${error.message}`
          : 'تعذر تجهيز ملف Excel.'
      )

      return
    }

    if (exportStudents.length === 0) {
      setSupabaseStatus(
        'لا توجد بيانات لتصديرها إلى Excel'
      )
      return
    }

    const exportData = exportStudents.map(
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

    const workbook = new ExcelJS.Workbook()

    workbook.creator = 'T3leem'
    workbook.created = new Date()

    const worksheet = workbook.addWorksheet('الطلاب', {
      views: [
        {
          rightToLeft: true,
          showGridLines: true,
        },
      ],
    })

    const headers = Object.keys(exportData[0] ?? {})

    worksheet.columns = headers.map(
      (header, index) => ({
        header,
        key: header,
        width: index === 0 ? 6 : 24,
      })
    )

    worksheet.addRows(exportData)

    const headerRow = worksheet.getRow(1)

    headerRow.font = {
      bold: true,
    }

    headerRow.alignment = {
      horizontal: 'right',
      vertical: 'middle',
      wrapText: true,
    }

    headerRow.height = 28

    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.alignment = {
          horizontal: 'right',
          vertical: 'middle',
          wrapText: true,
        }
      })
    })

    const safeYearName = currentAcademicYearName
      .replace(/[\\/:*?"<>|]/g, '-')
      .trim()

    const fileName = safeYearName
      ? `الطلاب-${safeYearName}.xlsx`
      : 'الطلاب.xlsx'

    const buffer = await workbook.xlsx.writeBuffer()

    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')

    link.href = url
    link.download = fileName

    document.body.appendChild(link)

    link.click()

    link.remove()

    URL.revokeObjectURL(url)

    setSupabaseStatus(
      `تم تنزيل ${exportStudents.length} طالب كملف Excel مع جميع بيانات الطلاب وحقول التسجيل ✅`
    )
  }

  /*
   * تحديث قائمة الطلاب من نموذج الإضافة والتعديل
   */
  const setStudentListFromForm: React.Dispatch<
    React.SetStateAction<StudentTableStudent[]>
  > = (value) => {
    setStudentList((current) => {
      const next =
        typeof value === 'function'
          ? value(current)
          : value

      const currentIds = new Set(
        current.map((student) => student.id)
      )

      const nextIds = new Set(
        next.map((student) => student.id)
      )

      const addedCount = next.filter(
        (student) => !currentIds.has(student.id)
      ).length

      const removedCount = current.filter(
        (student) => !nextIds.has(student.id)
      ).length

      if (addedCount || removedCount) {
        setTotalStudents((total) =>
          Math.max(
            0,
            total + addedCount - removedCount
          )
        )
      }

      return next
    })

    setQueryRefreshVersion((current) => current + 1)
  }

  /*
   * عرض الواجهة المنفصلة
   */
  return (
    <StudentsUI
      supabaseStatus={supabaseStatus}
      isLoadingStudents={isLoadingStudents}
      isDeletionSettingLoaded={isDeletionSettingLoaded}
      allowStudentDeletion={allowStudentDeletion}
      academicLevels={academicLevels}
      currentAcademicYearId={currentAcademicYearId}
      currentAcademicYearName={currentAcademicYearName}
      currentAnnualFee={currentAnnualFee}
      courses={courses}
      currentCourseId={currentCourseId}
      currentCourseName={currentCourseName}
      search={search}
      setSearch={setSearch}
      filters={filters}
      updateFilter={updateFilter}
      visibleColumns={visibleColumns}
      toggleColumn={toggleColumn}
      dynamicFields={dynamicFields}
      studentList={studentList}
      filteredStudents={filteredStudents}
      totalStudents={totalStudents}
      totalFilteredStudents={totalFilteredStudents}
      loadMoreStudents={loadMoreStudents}
      hasMoreStudents={
        studentList.length < totalFilteredStudents &&
        !loadMoreFailed
      }
      isLoadingMoreStudents={isLoadingMoreStudents}
      loadMoreFailed={loadMoreFailed}
      attendanceStatuses={attendanceStatuses}
      selectedStudentId={selectedStudentId}
      setSelectedStudentId={setSelectedStudentId}
      selectedStudent={selectedStudent}
      editingStudent={editingStudent}
      isAddStudentOpen={isAddStudentOpen}
      openAddStudent={openAddStudent}
      openEditStudent={openEditStudent}
      closeStudentDrawer={closeStudentDrawer}
      detailsStudent={detailsStudent}
      detailsMode={detailsMode}
      openNotesDetails={openNotesDetails}
      openAttendanceDetails={openAttendanceDetails}
      closeDetails={closeDetails}
      exportStudentsToExcel={exportStudentsToExcel}
      toggleFeeExemption={toggleFeeExemption}
      deleteSelectedStudents={deleteSelectedStudents}
      deleteStudent={deleteStudent}
      setSupabaseStatus={setSupabaseStatus}
      setStudentList={setStudentListFromForm}
    />
  )
}
