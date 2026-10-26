
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
  Check,
  RotateCcw,
  SlidersHorizontal,
  Save,
  Pencil,
  FileText,
  X,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'

import { PageHeader } from '@/components/dashboard/page-header'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'

import { CommunicationViewGroups } from '@/app/(dashboard)/communication/communication-groups'
import { CommunicationTemplates } from '@/app/(dashboard)/communication/communication-templates'

import {
  getCommunicationCache,
  isCommunicationCacheLoading,
  setCommunicationCache,
  setCommunicationCacheLoading,
  loadCommunicationData,
} from './communication-data'

import {
  getWhatsAppNumber,
  replaceTemplateVariables,
} from './communication-helpers'


type CommunicationSection =
  | 'direct'
  | 'group'
  | 'templates'

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
  | 'invalid_personal_id'
  | 'attendance_award'


/*
 * =========================================================
 * Message variables
 * =========================================================
 */

const MESSAGE_VARIABLES = [
  {
    key: '{{name}}',
    label: 'اسم الطالب',
  },
  {
    key: '{{phone}}',
    label: 'رقم الهاتف',
  },
  {
    key: '{{whatsapp}}',
    label: 'رقم WhatsApp',
  },
  {
    key: '{{course}}',
    label: 'الدورة',
  },
  {
    key: '{{teacher}}',
    label: 'المعلم',
  },
  {
    key: '{{attendance}}',
    label: 'الحضور',
  },
  {
    key: '{{paid}}',
    label: 'المبلغ المدفوع',
  },
  {
    key: '{{remaining}}',
    label: 'المبلغ المتبقي',
  },
  {
    key: '{{payment_status}}',
    label: 'حالة الدفع',
  },
  {
    key: '{{date}}',
    label: 'التاريخ',
  },
]


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
  ] = useState<TeacherAssignment[]>(
    communicationCache?.assignments ?? []
  )

  const [
    attendance,
    setAttendance,
  ] = useState<AttendanceRecord[]>(
    communicationCache?.attendance ?? []
  )

  const [
    attendanceStatuses,
    setAttendanceStatuses,
  ] = useState<AttendanceStatus[]>(
    communicationCache?.attendanceStatuses ?? []
  )

  const [
    payments,
    setPayments,
  ] = useState<Payment[]>(
    communicationCache?.payments ?? []
  )

  const [
    messageTemplates,
    setMessageTemplates,
  ] = useState<MessageTemplate[]>(
    communicationCache?.messageTemplates ?? []
  )

  const [
    attendanceAwardEligibleStudentIds,
    setAttendanceAwardEligibleStudentIds,
  ] = useState<string[]>(
    communicationCache?.attendanceAwardEligibleStudentIds ?? []
  )

  const [
    academicYear,
    setAcademicYear,
  ] = useState<AcademicYear | null>(
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
    filterType,
    setFilterType,
  ] = useState<FilterType>('all')

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

  /*
   * =========================================================
   * Active saved message flow
   * =========================================================
   */

  const [
    activeSavedMessage,
    setActiveSavedMessage,
  ] = useState<{
    templateId: string
    content: string
  } | null>(null)

  /*
   * =========================================================
   * Message modal
   * =========================================================
   */

  const [
    messageModalOpen,
    setMessageModalOpen,
  ] = useState(false)

  const [
    messageStudent,
    setMessageStudent,
  ] = useState<Student | null>(null)

  const [
    messageMode,
    setMessageMode,
  ] = useState<
    'choose' | 'saved' | 'new'
  >('choose')

  const [
    selectedTemplateId,
    setSelectedTemplateId,
  ] = useState('')

  const [
    composedMessage,
    setComposedMessage,
  ] = useState('')

  const [
    templateName,
    setTemplateName,
  ] = useState('')

  const [
    templateSaving,
    setTemplateSaving,
  ] = useState(false)

  const [
    templateMessage,
    setTemplateMessage,
  ] = useState('')

  /*
   * =========================================================
   * Load data
   * =========================================================
   */

  useEffect(() => {
    let cancelled = false

    async function loadData() {
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
          .select('id, annual_fee')
          .eq('is_current', true)
          .eq('is_active', true)
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
            messageTemplates: [],
            attendanceAwardEligibleStudentIds: [],
          }

          return
        }

        const currentAcademicYear: AcademicYear = {
          id: yearData.id,
          annualFee:
            Number(yearData.annual_fee) || 0,
        }

        const [
          studentsResult,
          teachersResult,
          coursesResult,
          assignmentsResult,
          attendanceResult,
          statusesResult,
          paymentsResult,
          templatesResult,
          attendanceAwardResult,
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
            .order('name', {
              ascending: true,
            }),

          supabase
            .from('teachers')
            .select('id, name')
            .eq('is_active', true)
            .order('name', {
              ascending: true,
            }),

          supabase
            .from('courses')
            .select(
              'id, name, academic_year_id'
            )
            .eq(
              'academic_year_id',
              yearData.id
            )
            .order('name', {
              ascending: true,
            }),

          supabase
            .from('teacher_student_assignments')
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
            .from('attendance_statuses')
            .select('id, name')
            .eq('is_active', true)
            .order('sort_order', {
              ascending: true,
            }),

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
            .from(
              'communication_message_templates'
            )
            .select(
              'id, name, content, created_at, updated_at'
            )
            .order('created_at', {
              ascending: false,
            }),

          supabase
            .from('attendance_award_results')
            .select('student_id')
            .eq(
              'academic_year_id',
              yearData.id
            )
            .eq(
              'status',
              'eligible'
            ),
        ])

        if (templatesResult.error) {
          console.error(
            'Message templates load error:',
            templatesResult.error
          )
        }

        if (attendanceAwardResult.error) {
          console.error(
            'Attendance award results load error:',
            attendanceAwardResult.error
          )
        }

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
              name: student.name ?? '',
              phone: student.phone ?? '',
              whatsapp:
                student.whatsapp ?? '',
              personalId:
                student.personal_id ?? '',
              academicYearId:
                student.academic_year_id,
              enrollmentId: null,
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
              name: teacher.name ?? '',
            })
          )

        const nextCourses: Course[] =
          (
            coursesResult.data ?? []
          ).map(
            (course) => ({
              id: course.id,
              name: course.name ?? '',
              academicYearId:
                course.academic_year_id,
            })
          )

        const nextAssignments:
          TeacherAssignment[] =
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

        const nextAttendance:
          AttendanceRecord[] =
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

        const nextAttendanceStatuses:
          AttendanceStatus[] =
          (
            statusesResult.data ?? []
          ).map(
            (status) => ({
              id: status.id,
              name: status.name ?? '',
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

        const nextMessageTemplates:
          MessageTemplate[] =
          (
            templatesResult.data ?? []
          ).map(
            (template) => ({
              id: template.id,
              name: template.name ?? '',
              content:
                template.content ?? '',
              createdAt:
                template.created_at ?? '',
              updatedAt:
                template.updated_at ?? '',
            })
          )

        const nextAttendanceAwardEligibleStudentIds =
          Array.from(
            new Set(
              (
                attendanceAwardResult.data ??
                []
              )
                .map(
                  (item) =>
                    item.student_id
                )
                .filter(
                  (
                    id
                  ): id is string =>
                    Boolean(id)
                )
            )
          )

        communicationCache = {
          academicYear:
            currentAcademicYear,
          students: nextStudents,
          teachers: nextTeachers,
          courses: nextCourses,
          assignments:
            nextAssignments,
          attendance:
            nextAttendance,
          attendanceStatuses:
            nextAttendanceStatuses,
          payments: nextPayments,
          messageTemplates:
            nextMessageTemplates,
          attendanceAwardEligibleStudentIds:
            nextAttendanceAwardEligibleStudentIds,
        }

        if (cancelled) {
          return
        }

        setAcademicYear(
          currentAcademicYear
        )

        setStudents(nextStudents)
        setTeachers(nextTeachers)
        setCourses(nextCourses)
        setAssignments(
          nextAssignments
        )
        setAttendance(
          nextAttendance
        )
        setAttendanceStatuses(
          nextAttendanceStatuses
        )
        setPayments(nextPayments)
        setMessageTemplates(
          nextMessageTemplates
        )
        setAttendanceAwardEligibleStudentIds(
          nextAttendanceAwardEligibleStudentIds
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

  /*
   * =========================================================
   * Filtering
   * =========================================================
   */

  const filteredStudents =
    useMemo(() => {
      let result = [...students]

      if (
        filterType === 'teacher'
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
                ids.has(student.id)
            )
        }
      }

      if (
        filterType === 'course'
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
                ids.has(student.id)
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
                ids.has(student.id)
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

      /*
       * =====================================================
       * مستحق للتكريم
       * =====================================================
       *
       * يعتمد فقط على النتائج المحفوظة
       * في attendance_award_results
       * للسنة الدراسية الحالية وحالة eligible.
       */

      if (
        filterType ===
        'attendance_award'
      ) {
        const eligibleIds =
          new Set(
            attendanceAwardEligibleStudentIds
          )

        result =
          result.filter(
            (student) =>
              eligibleIds.has(
                student.id
              )
          )
      }

      /*
       * =====================================================
       * رقم شخصي أقل من 9 أرقام
       * =====================================================
       *
       * نحذف أي مسافات أو رموز من الرقم أولاً،
       * ثم نحسب عدد الأرقام فقط.
       *
       * مثال:
       * 12345678      => يظهر
       * 1234567       => يظهر
       * 123456789     => لا يظهر
       * 1234-5678     => يعتبر 8 أرقام ويظهر
       * فارغ           => يظهر لأنه غير صحيح أيضاً
       */

      if (
        filterType ===
        'invalid_personal_id'
      ) {
        result =
          result.filter(
            (student) => {
              const digits =
                (student.personalId ?? '')
                  .replace(/\D/g, '')

              return (
                digits.length < 9
              )
            }
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
                ids.has(student.id)
            )
        }
      }

      if (
        filterType === 'payment'
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

              return (
                paid <
                (academicYear?.annualFee ??
                  0)
              )
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
                    .includes(query)
              )
          )
      }

      return result
    }, [
      students,
      assignments,
      attendance,
      payments,
      academicYear,
      attendanceAwardEligibleStudentIds,
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

  /*
   * =========================================================
   * WhatsApp helpers
   * =========================================================
   */

  const getWhatsAppNumber = (
    student: Student
  ) => {
    const value =
      student.whatsapp ||
      student.phone ||
      ''

    const digits =
      value.replace(/\D/g, '')

    if (
      digits.startsWith('973')
    ) {
      return digits
    }

    if (
      digits.length === 8
    ) {
      return `973${digits}`
    }

    return digits
  }

  const getStudentCourses =
    (studentId: string) => {
      const courseIds =
        Array.from(
          new Set(
            assignments
              .filter(
                (item) =>
                  item.studentId ===
                  studentId
              )
              .map(
                (item) =>
                  item.courseId
              )
          )
        )

      return courseIds
        .map(
          (courseId) =>
            courses.find(
              (course) =>
                course.id ===
                courseId
            )?.name
        )
        .filter(
          (
            value
          ): value is string =>
            Boolean(value)
        )
    }

  const getStudentTeachers =
    (studentId: string) => {
      const teacherIds =
        Array.from(
          new Set(
            assignments
              .filter(
                (item) =>
                  item.studentId ===
                  studentId
              )
              .map(
                (item) =>
                  item.teacherId
              )
          )
        )

      return teacherIds
        .map(
          (teacherId) =>
            teachers.find(
              (teacher) =>
                teacher.id ===
                teacherId
            )?.name
        )
        .filter(
          (
            value
          ): value is string =>
            Boolean(value)
        )
    }

  const getStudentAttendance =
    (studentId: string) => {
      const records =
        attendance.filter(
          (record) =>
            record.studentId ===
            studentId
        )

      return Array.from(
        new Set(
          records.map(
            (record) =>
              attendanceStatuses.find(
                (status) =>
                  status.id ===
                  record.statusId
              )?.name
          )
        )
      ).filter(
        (
          value
        ): value is string =>
          Boolean(value)
      )
    }

  const getStudentPaid =
    (studentId: string) => {
      return payments
        .filter(
          (payment) =>
            payment.studentId ===
            studentId
        )
        .reduce(
          (total, payment) =>
            total +
            payment.amount,
          0
        )
    }

  const replaceTemplateVariables =
    (
      template: string,
      student: Student
    ) => {
      const studentCourses =
        getStudentCourses(
          student.id
        )

      const studentTeachers =
        getStudentTeachers(
          student.id
        )

      const studentAttendance =
        getStudentAttendance(
          student.id
        )

      const paid =
        getStudentPaid(
          student.id
        )

      const annualFee =
        academicYear?.annualFee ??
        0

      const remaining =
        student.feeExempt
          ? 0
          : Math.max(
              annualFee - paid,
              0
            )

      const attendanceText =
        studentAttendance.length >
        0
          ? studentAttendance.join(
              '، '
            )
          : 'لم يسجل'

      const values: Record<
        string,
        string
      > = {
        name:
          student.name || '',
        phone:
          student.phone ||
          student.whatsapp ||
          '',
        whatsapp:
          student.whatsapp ||
          student.phone ||
          '',
        course:
          studentCourses.join(
            '، '
          ),
        teacher:
          studentTeachers.join(
            '، '
          ),
        attendance:
          attendanceText,
        paid:
          paid.toFixed(3),
        remaining:
          remaining.toFixed(3),
        payment_status:
          student.feeExempt
            ? 'معفي'
            : paid >= annualFee &&
                annualFee > 0
              ? 'مدفوع بالكامل'
              : paid > 0
                ? 'مدفوع جزئياً'
                : 'غير مدفوع',
        date:
          new Intl.DateTimeFormat(
            'ar-BH',
            {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }
          ).format(
            new Date()
          ),
      }

      return template.replace(
        /\{\{\s*([a-zA-Z_]+)\s*\}\}/g,
        (
          _match,
          key: string
        ) =>
          values[key] ??
          `{{${key}}}`
      )
    }

  /*
   * =========================================================
   * Message modal
   * =========================================================
   */

  const openMessageModal = (
    student: Student
  ) => {
    setMessageStudent(student)
    setMessageModalOpen(true)
    setTemplateName('')
    setTemplateMessage('')

    if (activeSavedMessage) {
      setMessageMode('saved')

      setSelectedTemplateId(
        activeSavedMessage.templateId
      )

      setComposedMessage(
        activeSavedMessage.content
      )

      return
    }

    setMessageMode('choose')
    setSelectedTemplateId('')
    setComposedMessage('')
  }

  const closeMessageModal =
    () => {
      setMessageModalOpen(false)
      setMessageStudent(null)
      setMessageMode('choose')
      setSelectedTemplateId('')
      setComposedMessage('')
      setTemplateName('')
      setTemplateMessage('')
    }

  const chooseSavedTemplate =
    (
      template: MessageTemplate
    ) => {
      setSelectedTemplateId(
        template.id
      )

      setComposedMessage(
        template.content
      )

      setMessageMode('saved')
      setTemplateMessage('')
    }

  const createNewMessage =
    () => {
      setActiveSavedMessage(null)

      setSelectedTemplateId('')
      setComposedMessage('')
      setMessageMode('new')
      setTemplateMessage('')
    }

  const saveMessageTemplate =
    async () => {
      const name =
        templateName.trim()

      const content =
        composedMessage.trim()

      if (!name) {
        setTemplateMessage(
          'اكتب اسم الرسالة أولاً.'
        )
        return
      }

      if (!content) {
        setTemplateMessage(
          'اكتب نص الرسالة أولاً.'
        )
        return
      }

      setTemplateSaving(true)
      setTemplateMessage('')

      const {
        data,
        error,
      } = await supabase
        .from(
          'communication_message_templates'
        )
        .insert({
          name,
          content,
        })
        .select(
          'id, name, content, created_at, updated_at'
        )
        .single()

      if (error) {
        console.error(
          'Save message template error:',
          error
        )

        setTemplateMessage(
          'تعذر حفظ الرسالة. حاول مرة أخرى.'
        )

        setTemplateSaving(false)
        return
      }

      const newTemplate:
        MessageTemplate = {
        id: data.id,
        name: data.name,
        content: data.content,
        createdAt:
          data.created_at,
        updatedAt:
          data.updated_at,
      }

      setMessageTemplates(
        (current) => [
          newTemplate,
          ...current,
        ]
      )

      if (communicationCache) {
        communicationCache.messageTemplates =
          [
            newTemplate,
            ...communicationCache.messageTemplates,
          ]
      }

      setSelectedTemplateId(
        newTemplate.id
      )

      setTemplateName('')

      setTemplateMessage(
        'تم حفظ الرسالة، وأصبحت متاحة لجميع المستخدمين.'
      )

      setTemplateSaving(false)
    }

 
  const sendCurrentMessage =
    () => {
      if (!messageStudent) {
        return
      }

      const number =
        getWhatsAppNumber(
          messageStudent
        )

      if (!number) {
        setTemplateMessage(
          'لا يوجد رقم WhatsApp لهذا الطالب.'
        )
        return
      }

      const rawMessage =
        composedMessage.trim()

      if (!rawMessage) {
        setTemplateMessage(
          'اكتب الرسالة أولاً.'
        )
        return
      }

      if (
        messageMode === 'saved' &&
        selectedTemplateId
      ) {
        setActiveSavedMessage({
          templateId:
            selectedTemplateId,
          content:
            rawMessage,
        })
      }

      if (
        messageMode === 'new'
      ) {
        setActiveSavedMessage(null)
      }

      const finalMessage =
        replaceTemplateVariables(
          rawMessage,
          messageStudent
        )

      const url =
        `https://wa.me/${number}?text=${encodeURIComponent(
          finalMessage
        )}`

      window.open(
        url,
        '_blank',
        'noopener,noreferrer'
      )

      setOpenedStudentIds(
        (current) =>
          current.includes(
            messageStudent.id
          )
            ? current
            : [
                ...current,
                messageStudent.id,
              ]
      )

      closeMessageModal()
    }

  /*
   * =========================================================
   * Students
   * =========================================================
   */

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
                id !==
                studentId
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

  /*
   * =========================================================
   * Filter helpers
   * =========================================================
   */

  const filterNeedsTeacher =
    filterType === 'teacher' ||
    filterType ===
      'teacher_course' ||
    filterType ===
      'teacher_attendance' ||
    filterType ===
      'teacher_course_attendance'

  const filterNeedsCourse =
    filterType === 'course' ||
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
            activeSection === 'direct'
              ? 'default'
              : 'outline'
          }
          onClick={() => setActiveSection('direct')}
        >
          <MessageCircle className="size-4" />
          تواصل مباشر
        </Button>
      
        <Button
          type="button"
          variant={
            activeSection === 'group'
              ? 'default'
              : 'outline'
          }
          onClick={() => setActiveSection('group')}
        >
          <Users className="size-4" />
          تواصل كمجموعة
        </Button>
      
        <Button
          type="button"
          variant={
            activeSection === 'templates'
              ? 'default'
              : 'outline'
          }
          onClick={() => setActiveSection('templates')}
        >
          <FileText className="size-4" />
          الرسائل المحفوظة
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
                  اختر الفئة والطلاب ثم اختر الرسالة عند الإرسال.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <SlidersHorizontal className="size-4" />
                تخصيص المستلمين
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <select
                value={filterType}
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

                <option value="attendance_award">
                  مستحق للتكريم
                </option>

                <option value="not_assigned_current_course">
                  غير مشاركين في الدورة الحالية
                </option>

                <option value="invalid_personal_id">
                  رقم شخصي أقل من 9 أرقام
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

              {filterType ===
                'invalid_personal_id' && (
                <div className="flex items-center rounded-md border border-red-200 bg-red-50 px-3 text-sm text-red-700">
                  تنبيه: هؤلاء الطلاب لديهم رقم شخصي غير صحيح ويحتاج إلى تصحيح.
                </div>
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

                            {teacher.name}
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
                value={selectedCourseId}
                onChange={(event) =>
                  setSelectedCourseId(
                    event.target.value
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
                      {course.name}
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
                onChange={(event) =>
                  setSelectedAttendanceStatusId(
                    event.target.value
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
                      {status.name}
                    </option>
                  )
                )}
              </select>
            )}

            {filterType !== 'all' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetFilter}
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
                onChange={(event) =>
                  setSearch(
                    event.target.value
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
                </span>{'  '}
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
                              {student.name}
                            </span>

                            <span className="block truncate text-xs text-muted-foreground">
                              الرقم الشخصي:{' '}
                              {student.personalId ||
                                'غير موجود'}
                              {' • '}
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
                              openMessageModal(
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
                                إرسال
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
                              {index + 1}
                            </span>

                            <span className="truncate text-sm">
                              {student.name}
                            </span>
                          </div>

                          <Button
                            type="button"
                            size="sm"
                            disabled={!number}
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
                              openMessageModal(
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
                                إرسال
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
              عند الضغط على «إرسال» تختار الرسالة المحفوظة أو تنشئ رسالة جديدة. إذا بدأت برسالة محفوظة فسيتم استخدامها تلقائياً للطلاب التاليين مع تحديث المتغيرات حسب كل طالب.
            </div>
          </CardContent>
        </Card>
      )}

      {activeSection === 'group' && (
        <CommunicationViewGroups
          students={students}
          selectedStudentIds={selectedStudentIds}
        />
      )}
      
      {activeSection === 'templates' && (
        <CommunicationTemplates
          templates={messageTemplates}
          onTemplatesChange={(nextTemplates) => {
            setMessageTemplates(nextTemplates)
      
            if (communicationCache) {
              communicationCache.messageTemplates =
                nextTemplates
            }
          }}
        />
      )}

      {messageModalOpen &&
        messageStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border bg-background shadow-xl">
              <div className="flex items-center justify-between border-b p-4">
                <div>
                  <h2 className="text-lg font-semibold">
                    إرسال رسالة WhatsApp
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    إلى: {messageStudent.name}
                  </p>

                  {activeSavedMessage && (
                    <p className="mt-1 text-xs text-primary">
                      يتم استخدام الرسالة المحفوظة السابقة تلقائياً
                    </p>
                  )}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={
                    closeMessageModal
                  }
                >
                  <X className="size-5" />
                </Button>
              </div>

              <div className="space-y-5 p-5">
                {messageMode ===
                  'choose' && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() =>
                        setMessageMode(
                          'saved'
                        )
                      }
                      className="rounded-xl border p-5 text-right transition hover:bg-muted"
                    >
                      <FileText className="mb-3 size-7" />

                      <div className="font-semibold">
                        رسالة محفوظة
                      </div>

                      <div className="mt-1 text-sm text-muted-foreground">
                        اختر قالباً محفوظاً ومشتركاً بين المستخدمين.
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={
                        createNewMessage
                      }
                      className="rounded-xl border p-5 text-right transition hover:bg-muted"
                    >
                      <Pencil className="mb-3 size-7" />

                      <div className="font-semibold">
                        إنشاء رسالة جديدة
                      </div>

                      <div className="mt-1 text-sm text-muted-foreground">
                        اكتب رسالة جديدة ثم أرسلها مباشرة.
                      </div>
                    </button>
                  </div>
                )}

                {messageMode ===
                  'saved' && (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">
                          الرسائل المحفوظة
                        </div>

                        <div className="mt-1 text-xs text-muted-foreground">
                          القوالب متاحة لجميع المستخدمين.
                        </div>
                      </div>

                      {!activeSavedMessage && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={
                            createNewMessage
                          }
                        >
                          <Pencil className="size-4" />
                          رسالة جديدة
                        </Button>
                      )}
                    </div>

                    {activeSavedMessage ? (
                      <div className="space-y-2">
                        <div className="rounded-md border bg-primary/5 p-3">
                          <div className="text-sm font-medium">
                            الرسالة المحفوظة المستخدمة
                          </div>

                          <div className="mt-1 text-xs text-muted-foreground">
                            سيتم استخدام نفس الرسالة تلقائياً مع الطلاب التاليين، مع تحديث المتغيرات.
                          </div>
                        </div>

                        <label className="text-sm font-medium">
                          الرسالة
                        </label>

                        <textarea
                          value={
                            composedMessage
                          }
                          onChange={(event) =>
                            setComposedMessage(
                              event.target
                                .value
                            )
                          }
                          rows={7}
                          className="w-full resize-y rounded-md border bg-background p-3 text-sm outline-none"
                        />
                      </div>
                    ) : messageTemplates.length ===
                      0 ? (
                      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                        لا توجد رسائل محفوظة حالياً.
                        <br />
                        أنشئ أول رسالة واحفظها كقالب.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {messageTemplates.map(
                          (template) => {
                            const selected =
                              selectedTemplateId ===
                              template.id

                            return (
                              <div
                                key={
                                  template.id
                                }
                                className={`rounded-lg border p-3 ${
                                  selected
                                    ? 'border-primary bg-primary/5'
                                    : ''
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      chooseSavedTemplate(
                                        template
                                      )
                                    }
                                    className="min-w-0 flex-1 text-right"
                                  >
                                    <div className="font-medium">
                                      {
                                        template.name
                                      }
                                    </div>

                                    <div className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">
                                      {
                                        template.content
                                      }
                                    </div>
                                  </button>
                                </div>
                              </div>
                            )
                          }
                        )}
                      </div>
                    )}

                    {!activeSavedMessage &&
                      selectedTemplateId && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            الرسالة
                          </label>

                          <textarea
                            value={
                              composedMessage
                            }
                            onChange={(event) =>
                              setComposedMessage(
                                event.target
                                  .value
                              )
                            }
                            rows={7}
                            className="w-full resize-y rounded-md border bg-background p-3 text-sm outline-none"
                          />
                        </div>
                      )}
                  </>
                )}

                {messageMode ===
                  'new' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        الرسالة
                      </label>

                      <textarea
                        value={
                          composedMessage
                        }
                        onChange={(event) =>
                          setComposedMessage(
                            event.target.value
                          )
                        }
                        placeholder="اكتب الرسالة التي تريد إرسالها..."
                        rows={7}
                        autoFocus
                        className="w-full resize-y rounded-md border bg-background p-3 text-sm outline-none"
                      />
                    </div>

                    <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                      <div className="mb-2 font-medium text-foreground">
                        يمكنك استخدام المتغيرات:
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {MESSAGE_VARIABLES.map(
                          (variable) => (
                            <button
                              key={
                                variable.key
                              }
                              type="button"
                              onClick={() =>
                                setComposedMessage(
                                  (current) =>
                                    `${current}${current ? ' ' : ''}${variable.key}`
                                )
                              }
                              className="rounded border bg-background px-2.5 py-1.5 text-xs hover:bg-muted"
                            >
                              {variable.label}
                            </button>
                          )
                        )}
                      </div>

                      <div className="mt-2 text-[11px] text-muted-foreground">
                        عند الضغط على أي متغير سيتم إدخال الرمز الخاص به داخل الرسالة تلقائياً.
                      </div>
                    </div>

                    <div className="rounded-lg border p-3">
                      <div className="mb-2 text-sm font-medium">
                        حفظ هذه الرسالة كقالب للجميع
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                          value={
                            templateName
                          }
                          onChange={(event) =>
                            setTemplateName(
                              event.target
                                .value
                            )
                          }
                          placeholder="اسم الرسالة، مثلاً: تنبيه غياب"
                          className="h-10 flex-1 rounded-md border bg-background px-3 text-sm outline-none"
                        />

                        <Button
                          type="button"
                          variant="outline"
                          onClick={
                            saveMessageTemplate
                          }
                          disabled={
                            templateSaving ||
                            !templateName.trim() ||
                            !composedMessage.trim()
                          }
                        >
                          <Save className="size-4" />

                          {templateSaving
                            ? 'جاري الحفظ...'
                            : 'حفظ كقالب'}
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {templateMessage && (
                  <div className="rounded-md border bg-muted/30 p-3 text-sm">
                    {templateMessage}
                  </div>
                )}

                {messageMode !==
                  'choose' && (
                  <div className="flex flex-wrap justify-between gap-2 border-t pt-4">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        if (
                          activeSavedMessage
                        ) {
                          setMessageMode(
                            'saved'
                          )

                          setSelectedTemplateId(
                            activeSavedMessage.templateId
                          )

                          setComposedMessage(
                            activeSavedMessage.content
                          )
                        } else {
                          setMessageMode(
                            'choose'
                          )

                          setSelectedTemplateId('')
                          setComposedMessage('')
                        }

                        setTemplateMessage('')
                      }}
                    >
                      رجوع
                    </Button>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={
                          closeMessageModal
                        }
                      >
                        إلغاء
                      </Button>

                      <Button
                        type="button"
                        disabled={
                          !composedMessage.trim()
                        }
                        onClick={
                          sendCurrentMessage
                        }
                      >
                        <Send className="size-4" />
                        فتح WhatsApp
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
    </div>
  )
}
