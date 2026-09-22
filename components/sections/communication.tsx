'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  MessageCircle,
  Users,
  Search,
  Send,
  ExternalLink,
  Check,
  RotateCcw,
  SlidersHorizontal,
  Save,
  Trash2,
  Pencil,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'

import { PageHeader } from '@/components/dashboard/page-header'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type CommunicationSection =
  | 'direct'
  | 'group'

type FilterType =
  | 'all'
  | 'teacher'
  | 'course'
  | 'teacher_course'
  | 'attendance_status'
  | 'teacher_attendance'
  | 'teacher_course_attendance'
  | 'payment'
  | 'not_assigned_current_course'

type Student = {
  id: string
  name: string
  phone: string
  whatsapp: string
  personalId: string
  academicYearId: string
  enrollmentId: string | null
  feeExempt: boolean
}

type Teacher = {
  id: string
  name: string
}

type Course = {
  id: string
  name: string
  academicYearId: string
}

type TeacherAssignment = {
  teacherId: string
  courseId: string
  studentId: string
}

type AttendanceRecord = {
  studentId: string
  courseId: string | null
  enrollmentId: string | null
  attendanceDate: string
  statusId: string
}

type AttendanceStatus = {
  id: string
  name: string
}

type Payment = {
  studentId: string
  amount: number
}

type AcademicYear = {
  id: string
  annualFee: number
}

/*
 * =========================================================
 * Cache
 * =========================================================
 */

type CommunicationCache = {
  academicYear: AcademicYear | null
  students: Student[]
  teachers: Teacher[]
  courses: Course[]
  assignments: TeacherAssignment[]
  attendance: AttendanceRecord[]
  attendanceStatuses: AttendanceStatus[]
  payments: Payment[]
  groupUrl: string
  savedGroupUrl: string
}

let communicationCache:
  CommunicationCache | null = null

let communicationCacheLoading = false

const TODAY =
  new Date()
    .toISOString()
    .split('T')[0]

export function CommunicationView() {
  const [
    activeSection,
    setActiveSection,
  ] = useState<CommunicationSection>(
    'direct'
  )

  const [
    students,
    setStudents,
  ] = useState<Student[]>(
    communicationCache?.students ?? []
  )

  const [
    teachers,
    setTeachers,
  ] = useState<Teacher[]>(
    communicationCache?.teachers ?? []
  )

  const [
    courses,
    setCourses,
  ] = useState<Course[]>(
    communicationCache?.courses ?? []
  )

  const [
    assignments,
    setAssignments,
  ] = useState<
    TeacherAssignment[]
  >(
    communicationCache?.assignments ?? []
  )

  const [
    attendance,
    setAttendance,
  ] = useState<
    AttendanceRecord[]
  >(
    communicationCache?.attendance ?? []
  )

  const [
    attendanceStatuses,
    setAttendanceStatuses,
  ] = useState<
    AttendanceStatus[]
  >(
    communicationCache?.attendanceStatuses ?? []
  )

  const [
    payments,
    setPayments,
  ] = useState<Payment[]>(
    communicationCache?.payments ?? []
  )

  const [
    academicYear,
    setAcademicYear,
  ] = useState<
    AcademicYear | null
  >(
    communicationCache?.academicYear ?? null
  )

  const [
    loading,
    setLoading,
  ] = useState(
    !communicationCache
  )

  const [
    search,
    setSearch,
  ] = useState('')

  const [
    selectedStudentIds,
    setSelectedStudentIds,
  ] = useState<string[]>([])

  const [
    message,
    setMessage,
  ] = useState('')

  const [
    groupUrl,
    setGroupUrl,
  ] = useState(
    communicationCache?.groupUrl ?? ''
  )

  const [
    savedGroupUrl,
    setSavedGroupUrl,
  ] = useState(
    communicationCache?.savedGroupUrl ?? ''
  )

  const [
    groupSaving,
    setGroupSaving,
  ] = useState(false)

  const [
    groupMessage,
    setGroupMessage,
  ] = useState('')

  const [
    filterType,
    setFilterType,
  ] = useState<FilterType>(
    'all'
  )

  const [
    selectedTeacherIds,
    setSelectedTeacherIds,
  ] = useState<string[]>([])

  const [
    selectedCourseId,
    setSelectedCourseId,
  ] = useState('')

  const [
    selectedAttendanceStatusId,
    setSelectedAttendanceStatusId,
  ] = useState('')

  const [
    openedStudentIds,
    setOpenedStudentIds,
  ] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      /*
       * إذا البيانات موجودة في الكاش:
       * لا نعيد التحميل ولا نظهر loading.
       */
      if (
        communicationCache ||
        communicationCacheLoading
      ) {
        return
      }

      communicationCacheLoading = true

      try {
        const {
          data: yearData,
        } = await supabase
          .from('academic_years')
          .select(
            'id, annual_fee'
          )
          .eq(
            'is_current',
            true
          )
          .eq(
            'is_active',
            true
          )
          .maybeSingle()

        if (!yearData) {
          if (!cancelled) {
            setLoading(false)
          }

          communicationCache = {
            academicYear: null,
            students: [],
            teachers: [],
            courses: [],
            assignments: [],
            attendance: [],
            attendanceStatuses: [],
            payments: [],
            groupUrl: '',
            savedGroupUrl: '',
          }

          return
        }

        const currentAcademicYear: AcademicYear = {
          id: yearData.id,
          annualFee:
            Number(
              yearData.annual_fee
            ) || 0,
        }

        const [
          studentsResult,
          teachersResult,
          coursesResult,
          assignmentsResult,
          attendanceResult,
          statusesResult,
          paymentsResult,
          groupResult,
        ] = await Promise.all([
          supabase
            .from('students')
            .select(
              'id, name, phone, whatsapp, personal_id, academic_year_id, fee_exempt'
            )
            .eq(
              'academic_year_id',
              yearData.id
            )
            .order(
              'name',
              {
                ascending: true,
              }
            ),

          supabase
            .from('teachers')
            .select(
              'id, name'
            )
            .eq(
              'is_active',
              true
            )
            .order(
              'name',
              {
                ascending: true,
              }
            ),

          supabase
            .from('courses')
            .select(
              'id, name, academic_year_id'
            )
            .eq(
              'academic_year_id',
              yearData.id
            )
            .order(
              'name',
              {
                ascending: true,
              }
            ),

          supabase
            .from(
              'teacher_student_assignments'
            )
            .select(
              'teacher_id, course_id, student_id'
            ),

          supabase
            .from('attendance')
            .select(
              'student_id, course_id, enrollment_id, attendance_date, status_id'
            )
            .eq(
              'attendance_date',
              TODAY
            ),

          supabase
            .from(
              'attendance_statuses'
            )
            .select(
              'id, name'
            )
            .eq(
              'is_active',
              true
            )
            .order(
              'sort_order',
              {
                ascending: true,
              }
            ),

          supabase
            .from('payments')
            .select(
              'student_id, amount'
            )
            .eq(
              'academic_year_id',
              yearData.id
            ),

          supabase
            .from('communication_group')
            .select(
              'whatsapp_url'
            )
            .limit(1)
            .maybeSingle(),
        ])

        const currentCourseIds =
          new Set(
            (coursesResult.data ?? []).map(
              (course) => course.id
            )
          )

        const nextStudents: Student[] =
          (
            studentsResult.data ?? []
          ).map(
            (student) => ({
              id: student.id,
              name:
                student.name ?? '',
              phone:
                student.phone ?? '',
              whatsapp:
                student.whatsapp ?? '',
              personalId:
                student.personal_id ??
                '',
              academicYearId:
                student.academic_year_id,
              enrollmentId:
                null,
              feeExempt:
                Boolean(
                  student.fee_exempt
                ),
            })
          )

        const nextTeachers: Teacher[] =
          (
            teachersResult.data ?? []
          ).map(
            (teacher) => ({
              id: teacher.id,
              name:
                teacher.name ?? '',
            })
          )

        const nextCourses: Course[] =
          (
            coursesResult.data ?? []
          ).map(
            (course) => ({
              id: course.id,
              name:
                course.name ?? '',
              academicYearId:
                course.academic_year_id,
            })
          )

        const nextAssignments: TeacherAssignment[] =
          (
            assignmentsResult.data ?? []
          )
            .filter((item) =>
              currentCourseIds.has(
                item.course_id
              )
            )
            .map(
              (item) => ({
                teacherId:
                  item.teacher_id,
                courseId:
                  item.course_id,
                studentId:
                  item.student_id,
              })
            )

        const nextAttendance: AttendanceRecord[] =
          (
            attendanceResult.data ?? []
          ).map(
            (item) => ({
              studentId:
                item.student_id,
              courseId:
                item.course_id,
              enrollmentId:
                item.enrollment_id,
              attendanceDate:
                item.attendance_date,
              statusId:
                item.status_id,
            })
          )

        const nextAttendanceStatuses: AttendanceStatus[] =
          (
            statusesResult.data ?? []
          ).map(
            (status) => ({
              id: status.id,
              name:
                status.name ?? '',
            })
          )

        const nextPayments: Payment[] =
          (
            paymentsResult.data ?? []
          ).map(
            (payment) => ({
              studentId:
                payment.student_id,
              amount:
                Number(
                  payment.amount
                ) || 0,
            })
          )

        const nextGroupUrl =
          groupResult.data?.whatsapp_url ??
          ''

        /*
         * نحفظ كل البيانات في كاش واحد.
         */
        communicationCache = {
          academicYear:
            currentAcademicYear,
          students:
            nextStudents,
          teachers:
            nextTeachers,
          courses:
            nextCourses,
          assignments:
            nextAssignments,
          attendance:
            nextAttendance,
          attendanceStatuses:
            nextAttendanceStatuses,
          payments:
            nextPayments,
          groupUrl:
            nextGroupUrl,
          savedGroupUrl:
            nextGroupUrl,
        }

        if (cancelled) {
          return
        }

        setAcademicYear(
          currentAcademicYear
        )

        setStudents(
          nextStudents
        )

        setTeachers(
          nextTeachers
        )

        setCourses(
          nextCourses
        )

        setAssignments(
          nextAssignments
        )

        setAttendance(
          nextAttendance
        )

        setAttendanceStatuses(
          nextAttendanceStatuses
        )

        setPayments(
          nextPayments
        )

        setGroupUrl(
          nextGroupUrl
        )

        setSavedGroupUrl(
          nextGroupUrl
        )
      } catch (error) {
        console.error(
          'Communication load error:',
          error
        )
      } finally {
        communicationCacheLoading =
          false

        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [])

  const filteredStudents =
    useMemo(() => {
      let result = [...students]

      if (
        filterType ===
        'teacher'
      ) {
        if (
          selectedTeacherIds.length ===
          0
        ) {
          result = []
        } else {
          const ids =
            new Set(
              assignments
                .filter(
                  (item) =>
                    selectedTeacherIds.includes(
                      item.teacherId
                    )
                )
                .map(
                  (item) =>
                    item.studentId
                )
            )

          result =
            result.filter(
              (student) =>
                ids.has(
                  student.id
                )
            )
        }
      }

      if (
        filterType ===
        'course'
      ) {
        if (!selectedCourseId) {
          result = []
        } else {
          const ids =
            new Set(
              assignments
                .filter(
                  (item) =>
                    item.courseId ===
                    selectedCourseId
                )
                .map(
                  (item) =>
                    item.studentId
                )
            )

          result =
            result.filter(
              (student) =>
                ids.has(
                  student.id
                )
            )
        }
      }

      if (
        filterType ===
        'teacher_course'
      ) {
        if (
          selectedTeacherIds.length ===
            0 ||
          !selectedCourseId
        ) {
          result = []
        } else {
          const ids =
            new Set(
              assignments
                .filter(
                  (item) =>
                    selectedTeacherIds.includes(
                      item.teacherId
                    ) &&
                    item.courseId ===
                      selectedCourseId
                )
                .map(
                  (item) =>
                    item.studentId
                )
            )

          result =
            result.filter(
              (student) =>
                ids.has(
                  student.id
                )
            )
        }
      }

      if (
        filterType ===
        'not_assigned_current_course'
      ) {
        const assignedStudentIds =
          new Set(
            assignments.map(
              (item) =>
                item.studentId
            )
          )

        result =
          result.filter(
            (student) =>
              !assignedStudentIds.has(
                student.id
              )
          )
      }

      if (
        filterType ===
          'attendance_status' ||
        filterType ===
          'teacher_attendance' ||
        filterType ===
          'teacher_course_attendance'
      ) {
        const statusId =
          selectedAttendanceStatusId

        if (!statusId) {
          result = []
        } else {
          let records =
            attendance.filter(
              (item) =>
                item.statusId ===
                statusId
            )

          if (
            filterType ===
              'teacher_attendance' ||
            filterType ===
              'teacher_course_attendance'
          ) {
            if (
              selectedTeacherIds.length ===
              0
            ) {
              result = []
            } else {
              const assignmentKey =
                new Set(
                  assignments
                    .filter(
                      (item) => {
                        if (
                          !selectedTeacherIds.includes(
                            item.teacherId
                          )
                        ) {
                          return false
                        }

                        if (
                          filterType ===
                          'teacher_course_attendance'
                        ) {
                          return (
                            item.courseId ===
                            selectedCourseId
                          )
                        }

                        return true
                      }
                    )
                    .map(
                      (item) =>
                        `${item.studentId}:${item.courseId}`
                    )
                )

              records =
                records.filter(
                  (record) =>
                    assignmentKey.has(
                      `${record.studentId}:${record.courseId}`
                    )
                )
            }
          }

          const ids =
            new Set(
              records.map(
                (record) =>
                  record.studentId
              )
            )

          result =
            result.filter(
              (student) =>
                ids.has(
                  student.id
                )
            )
        }
      }

      if (
        filterType ===
        'payment'
      ) {
        const totals =
          new Map<
            string,
            number
          >()

        payments.forEach(
          (payment) => {
            totals.set(
              payment.studentId,
              (totals.get(
                payment.studentId
              ) ?? 0) +
                payment.amount
            )
          }
        )

        result =
          result.filter(
            (student) => {
              const paid =
                totals.get(
                  student.id
                ) ?? 0

              if (
                student.feeExempt
              ) {
                return true
              }

              return paid <
                (academicYear?.annualFee ??
                  0)
            }
          )
      }

      const query =
        search
          .trim()
          .toLowerCase()

      if (query) {
        result =
          result.filter(
            (student) =>
              [
                student.name,
                student.phone,
                student.whatsapp,
                student.personalId,
              ].some(
                (value) =>
                  value
                    .toLowerCase()
                    .includes(
                      query
                    )
              )
          )
      }

      return result
    }, [
      students,
      teachers,
      courses,
      assignments,
      attendance,
      payments,
      academicYear,
      filterType,
      selectedTeacherIds,
      selectedCourseId,
      selectedAttendanceStatusId,
      search,
    ])

  const selectedStudents =
    students.filter(
      (student) =>
        selectedStudentIds.includes(
          student.id
        )
    )

  const getWhatsAppNumber = (
    student: Student
  ) => {
    const value =
      student.whatsapp ||
      student.phone

    return value.replace(
      /[^\d]/g,
      ''
    )
  }

  const openWhatsApp = (
    student: Student
  ) => {
    const number =
      getWhatsAppNumber(student)

    if (!number) {
      return
    }

    const url =
      message.trim()
        ? `https://wa.me/${number}?text=${encodeURIComponent(
            message
          )}`
        : `https://wa.me/${number}`

    window.open(
      url,
      '_blank',
      'noopener,noreferrer'
    )

    setOpenedStudentIds(
      (current) =>
        current.includes(
          student.id
        )
          ? current
          : [
              ...current,
              student.id,
            ]
    )
  }

  const toggleStudent = (
    studentId: string
  ) => {
    setSelectedStudentIds(
      (current) =>
        current.includes(
          studentId
        )
          ? current.filter(
              (id) =>
                id !== studentId
            )
          : [
              ...current,
              studentId,
            ]
    )
  }

  const selectAllVisible =
    () => {
      const visibleIds =
        filteredStudents.map(
          (student) =>
            student.id
        )

      setSelectedStudentIds(
        (current) => {
          const allSelected =
            visibleIds.length >
              0 &&
            visibleIds.every(
              (id) =>
                current.includes(
                  id
                )
            )

          if (allSelected) {
            return current.filter(
              (id) =>
                !visibleIds.includes(
                  id
                )
            )
          }

          return Array.from(
            new Set([
              ...current,
              ...visibleIds,
            ])
          )
        }
      )
    }

  const resetFilter = () => {
    setFilterType('all')
    setSelectedTeacherIds([])
    setSelectedCourseId('')
    setSelectedAttendanceStatusId('')
  }

  const saveGroupUrl = async () => {
    const url =
      groupUrl.trim()

    if (!url) {
      setGroupMessage(
        'أدخل رابط المجموعة أولاً.'
      )
      return
    }

    if (
      !url.startsWith(
        'https://chat.whatsapp.com/'
      )
    ) {
      setGroupMessage(
        'يرجى إدخال رابط مجموعة WhatsApp صحيح.'
      )
      return
    }

    setGroupSaving(true)
    setGroupMessage('')

    const {
      error,
    } = await supabase
      .from('communication_group')
      .update({
        whatsapp_url: url,
        updated_at:
          new Date().toISOString(),
      })
      .not(
        'id',
        'is',
        null
      )

    if (error) {
      setGroupMessage(
        'تعذر حفظ الرابط.'
      )
      setGroupSaving(false)
      return
    }

    /*
     * تحديث الواجهة والكاش مباشرة
     * بدون إعادة تحميل البيانات.
     */
    setSavedGroupUrl(url)
    setGroupUrl(url)

    if (communicationCache) {
      communicationCache.groupUrl =
        url
      communicationCache.savedGroupUrl =
        url
    }

    setGroupMessage(
      'تم حفظ رابط المجموعة.'
    )
    setGroupSaving(false)
  }

  const deleteGroupUrl = async () => {
    setGroupSaving(true)
    setGroupMessage('')

    const {
      error,
    } = await supabase
      .from('communication_group')
      .update({
        whatsapp_url: null,
        updated_at:
          new Date().toISOString(),
      })
      .not(
        'id',
        'is',
        null
      )

    if (error) {
      setGroupMessage(
        'تعذر مسح الرابط.'
      )
      setGroupSaving(false)
      return
    }

    setGroupUrl('')
    setSavedGroupUrl('')

    if (communicationCache) {
      communicationCache.groupUrl =
        ''
      communicationCache.savedGroupUrl =
        ''
    }

    setGroupMessage(
      'تم مسح رابط المجموعة.'
    )
    setGroupSaving(false)
  }

  const filterNeedsTeacher =
    filterType ===
      'teacher' ||
    filterType ===
      'teacher_course' ||
    filterType ===
      'teacher_attendance' ||
    filterType ===
      'teacher_course_attendance'

  const filterNeedsCourse =
    filterType ===
      'course' ||
    filterType ===
      'teacher_course' ||
    filterType ===
      'teacher_course_attendance'

  const filterNeedsAttendanceStatus =
    filterType ===
      'attendance_status' ||
    filterType ===
      'teacher_attendance' ||
    filterType ===
      'teacher_course_attendance'

  const isStarted = (
    studentId: string
  ) =>
    openedStudentIds.includes(
      studentId
    )

  const hasSavedGroup =
    Boolean(
      savedGroupUrl.trim()
    )

  const groupChanged =
    groupUrl.trim() !==
    savedGroupUrl.trim()

  return (
    <div className="space-y-6">
      <PageHeader
        title="التواصل"
        description="التواصل مع الطلاب وأولياء الأمور عبر WhatsApp"
      />

      <div className="flex flex-wrap gap-2 border-b pb-3">
        <Button
          type="button"
          variant={
            activeSection ===
            'direct'
              ? 'default'
              : 'outline'
          }
          onClick={() =>
            setActiveSection(
              'direct'
            )
          }
        >
          <MessageCircle className="size-4" />
          تواصل مباشر
        </Button>

        <Button
          type="button"
          variant={
            activeSection ===
            'group'
              ? 'default'
              : 'outline'
          }
          onClick={() =>
            setActiveSection(
              'group'
            )
          }
        >
          <Users className="size-4" />
          تواصل كمجموعة
        </Button>
      </div>

      {activeSection ===
        'direct' && (
        <Card>
          <CardContent className="space-y-5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  تواصل مباشر
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  اختر الفئة والطلاب ثم اكتب الرسالة مرة واحدة.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <SlidersHorizontal className="size-4" />
                تخصيص المستلمين
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <select
                value={
                  filterType
                }
                onChange={(event) => {
                  setFilterType(
                    event.target
                      .value as FilterType
                  )
                  setSelectedTeacherIds([])
                  setSelectedCourseId('')
                  setSelectedAttendanceStatusId('')
                }}
                className="h-10 rounded-md border bg-background px-3 text-sm outline-none"
              >
                <option value="all">
                  جميع الطلاب
                </option>

                <option value="teacher">
                  طلاب معلم
                </option>

                <option value="course">
                  طلاب دورة
                </option>

                <option value="teacher_course">
                  طلاب معلم في دورة
                </option>

                <option value="attendance_status">
                  حسب حضور اليوم
                </option>

                <option value="teacher_attendance">
                  حضور اليوم لمعلم
                </option>

                <option value="teacher_course_attendance">
                  حضور اليوم لمعلم في دورة
                </option>

                <option value="payment">
                  حسب حالة الدفع
                </option>

                <option value="not_assigned_current_course">
                  غير مشاركين في الدورة الحالية
                </option>
              </select>

              {filterType ===
                'payment' && (
                <select
                  value="payment"
                  onChange={() => {}}
                  className="h-10 rounded-md border bg-background px-3 text-sm outline-none"
                >
                  <option value="payment">
                    مدفوع أقل من الرسوم السنوية
                  </option>
                </select>
              )}
            </div>

            {filterNeedsTeacher && (
              <div className="rounded-md border bg-background p-3">
                <div className="mb-2 text-sm font-medium">
                  اختر المعلمين
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {teachers.map(
                    (teacher) => {
                      const selected =
                        selectedTeacherIds.includes(
                          teacher.id
                        )

                      return (
                        <button
                          key={
                            teacher.id
                          }
                          type="button"
                          onClick={() => {
                            setSelectedTeacherIds(
                              (current) =>
                                current.includes(
                                  teacher.id
                                )
                                  ? current.filter(
                                      (id) =>
                                        id !==
                                        teacher.id
                                    )
                                  : [
                                      ...current,
                                      teacher.id,
                                    ]
                            )
                          }}
                          className={`rounded-md border px-3 py-2 text-right text-sm transition ${
                            selected
                              ? 'border-primary bg-primary/10 font-medium'
                              : 'hover:bg-muted'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                                selected
                                  ? 'bg-primary text-primary-foreground'
                                  : ''
                              }`}
                            >
                              {selected && (
                                <Check className="size-3" />
                              )}
                            </span>

                            {
                              teacher.name
                            }
                          </span>
                        </button>
                      )
                    }
                  )}
                </div>

                {selectedTeacherIds.length >
                  0 && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    تم اختيار{' '}
                    {
                      selectedTeacherIds.length
                    }{' '}
                    معلم
                  </div>
                )}
              </div>
            )}

            {filterNeedsCourse && (
              <select
                value={
                  selectedCourseId
                }
                onChange={(
                  event
                ) =>
                  setSelectedCourseId(
                    event.target
                      .value
                  )
                }
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
              >
                <option value="">
                  اختر الدورة
                </option>

                {courses.map(
                  (course) => (
                    <option
                      key={
                        course.id
                      }
                      value={
                        course.id
                      }
                    >
                      {
                        course.name
                      }
                    </option>
                  )
                )}
              </select>
            )}

            {filterNeedsAttendanceStatus && (
              <select
                value={
                  selectedAttendanceStatusId
                }
                onChange={(
                  event
                ) =>
                  setSelectedAttendanceStatusId(
                    event.target
                      .value
                  )
                }
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
              >
                <option value="">
                  اختر حالة الحضور اليوم
                </option>

                {attendanceStatuses.map(
                  (status) => (
                    <option
                      key={
                        status.id
                      }
                      value={
                        status.id
                      }
                    >
                      {
                        status.name
                      }
                    </option>
                  )
                )}
              </select>
            )}

            {filterType !==
              'all' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={
                  resetFilter
                }
                className="w-fit"
              >
                <RotateCcw className="size-4" />
                إعادة التصفية
              </Button>
            )}

            <div className="relative">
              <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <input
                value={search}
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target
                      .value
                  )
                }
                placeholder="بحث داخل النتائج..."
                className="h-10 w-full rounded-md border bg-background px-3 pr-9 text-sm outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/30 p-3">
              <div className="text-sm">
                <span className="text-muted-foreground">
                  النتائج:
                </span>{' '}
                <span className="font-semibold">
                  {
                    filteredStudents.length
                  }
                </span>
                {'  '}
                <span className="text-muted-foreground">
                  | المحدد:
                </span>{' '}
                <span className="font-semibold">
                  {
                    selectedStudentIds.length
                  }
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={
                    selectAllVisible
                  }
                  disabled={
                    filteredStudents.length ===
                    0
                  }
                >
                  <Check className="size-4" />
                  تحديد الظاهر
                </Button>

                {selectedStudentIds.length >
                  0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setSelectedStudentIds(
                        []
                      )
                    }
                  >
                    إلغاء التحديد
                  </Button>
                )}
              </div>
            </div>

            <div className="max-h-80 space-y-2 overflow-y-auto rounded-md border p-2">
              {loading ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  جاري تحميل البيانات...
                </div>
              ) : filteredStudents.length ===
                0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  لا توجد نتائج مطابقة
                </div>
              ) : (
                filteredStudents.map(
                  (student) => {
                    const selected =
                      selectedStudentIds.includes(
                        student.id
                      )

                    const number =
                      getWhatsAppNumber(
                        student
                      )

                    const started =
                      isStarted(
                        student.id
                      )

                    return (
                      <div
                        key={
                          student.id
                        }
                        className={`flex items-center justify-between gap-3 rounded-md border p-3 ${
                          selected
                            ? 'bg-muted'
                            : ''
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            toggleStudent(
                              student.id
                            )
                          }
                          className="flex min-w-0 flex-1 items-center gap-3 text-right"
                        >
                          <span
                            className={`flex size-5 shrink-0 items-center justify-center rounded border ${
                              selected
                                ? 'bg-primary text-primary-foreground'
                                : ''
                            }`}
                          >
                            {selected && (
                              <Check className="size-3" />
                            )}
                          </span>

                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">
                              {
                                student.name
                              }
                            </span>

                            <span className="block truncate text-xs text-muted-foreground">
                              {number ||
                                'لا يوجد رقم WhatsApp'}
                            </span>
                          </span>
                        </button>

                        {number && (
                          <Button
                            type="button"
                            size="sm"
                            variant={
                              isStarted(
                                student.id
                              )
                                ? 'outline'
                                : 'default'
                            }
                            className={
                              isStarted(
                                student.id
                              )
                                ? 'border-orange-400 text-orange-600 hover:bg-orange-50'
                                : ''
                            }
                            onClick={() =>
                              openWhatsApp(
                                student
                              )
                            }
                          >
                            {isStarted(
                              student.id
                            ) ? (
                              <>
                                <RotateCcw className="size-4" />
                                إعادة إرسال
                              </>
                            ) : (
                              <>
                                <Send className="size-4" />
                                فتح WhatsApp
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    )
                  }
                )
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                الرسالة
              </label>

              <textarea
                value={message}
                onChange={(
                  event
                ) =>
                  setMessage(
                    event.target
                      .value
                  )
                }
                placeholder="اكتب الرسالة التي تريد إرسالها..."
                rows={5}
                className="w-full resize-y rounded-md border bg-background p-3 text-sm outline-none"
              />
            </div>

            {selectedStudents.length >
              0 && (
              <div className="rounded-md border bg-muted/30 p-4">
                <div className="mb-3 text-sm font-medium">
                  الطلاب المحددون
                </div>

                <div className="space-y-2">
                  {selectedStudents.map(
                    (
                      student,
                      index
                    ) => {
                      const number =
                        getWhatsAppNumber(
                          student
                        )

                      const started =
                        isStarted(
                          student.id
                        )

                      return (
                        <div
                          key={
                            student.id
                          }
                          className="flex items-center justify-between gap-3 rounded-md border bg-background p-2.5"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {index +
                                1}
                            </span>

                            <span className="truncate text-sm">
                              {
                                student.name
                              }
                            </span>
                          </div>

                          <Button
                            type="button"
                            size="sm"
                            disabled={
                              !number
                            }
                            variant={
                              started
                                ? 'outline'
                                : 'default'
                            }
                            className={
                              started
                                ? 'border-orange-400 text-orange-600 hover:bg-orange-50'
                                : ''
                            }
                            onClick={() =>
                              openWhatsApp(
                                student
                              )
                            }
                          >
                            {started ? (
                              <>
                                <RotateCcw className="size-4" />
                                إعادة إرسال
                              </>
                            ) : (
                              <>
                                <Send className="size-4" />
                                فتح WhatsApp
                              </>
                            )}
                          </Button>
                        </div>
                      )
                    }
                  )}
                </div>
              </div>
            )}

            <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
              عند فتح WhatsApp يتحول الطالب إلى «إعادة إرسال». النظام لا يستطيع تأكيد الإرسال الفعلي بدون WhatsApp API.
            </div>
          </CardContent>
        </Card>
      )}

      {activeSection ===
        'group' && (
        <Card>
          <CardContent className="space-y-5 p-5">
            <div>
              <h2 className="text-lg font-semibold">
                تواصل كمجموعة
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                حفظ رابط مجموعة WhatsApp وفتحه مباشرة.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                رابط مجموعة WhatsApp
              </label>

              <input
                value={groupUrl}
                onChange={(
                  event
                ) => {
                  setGroupUrl(
                    event.target.value
                  )
                  setGroupMessage('')
                }}
                placeholder="https://chat.whatsapp.com/..."
                dir="ltr"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={
                  saveGroupUrl
                }
                disabled={
                  groupSaving ||
                  !groupUrl.trim() ||
                  !groupChanged
                }
              >
                <Save className="size-4" />
                {groupSaving
                  ? 'جاري الحفظ...'
                  : hasSavedGroup
                    ? 'تحديث الرابط'
                    : 'حفظ الرابط'}
              </Button>

              {hasSavedGroup && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={
                    deleteGroupUrl
                  }
                  disabled={
                    groupSaving
                  }
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                  مسح الرابط
                </Button>
              )}
            </div>

            {groupMessage && (
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                {groupMessage}
              </div>
            )}

            {hasSavedGroup && (
              <div className="rounded-md border bg-muted/30 p-4">
                <div className="mb-1 text-sm font-semibold">
                  رابط المجموعة المحفوظ
                </div>

                <div
                  className="mb-3 break-all text-xs text-muted-foreground"
                  dir="ltr"
                >
                  {
                    savedGroupUrl
                  }
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() =>
                      window.open(
                        savedGroupUrl,
                        '_blank',
                        'noopener,noreferrer'
                      )
                    }
                  >
                    <ExternalLink className="size-4" />
                    فتح مجموعة WhatsApp
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setGroupUrl(
                        savedGroupUrl
                      )
                    }
                  >
                    <Pencil className="size-4" />
                    تعديل الرابط
                  </Button>
                </div>
              </div>
            )}

            <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
              الرابط محفوظ في النظام ويمكن تعديله أو استبداله أو مسحه في أي وقت.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}