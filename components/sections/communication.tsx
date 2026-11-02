
'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  MessageCircle,
  Users,
  Send,
  Save,
  Pencil,
  FileText,
  X,
  CalendarDays,
} from 'lucide-react'

import {
  createCommunicationMessageTemplate,
} from '@/lib/features/communication/repositories/communication-mutations.repository'

import { PageHeader } from '@/components/dashboard/page-header'
import { Button } from '@/components/ui/button'

import { CommunicationViewGroups } from '@/app/(dashboard)/communication/communication-groups'
import { CommunicationTemplates } from '@/app/(dashboard)/communication/communication-templates'
import { CommunicationDirect } from '@/app/(dashboard)/communication/communication-direct'
import { CommunicationReminders } from '@/app/(dashboard)/communication/communication-reminders'

import type { FilterType } from '@/app/(dashboard)/communication/communication-direct'

import {
  getCommunicationCache,
  setCommunicationCache,
  isCommunicationCacheLoading,
  setCommunicationCacheLoading,
  loadCommunicationData,
} from '@/app/(dashboard)/communication/communication-data'

import type {
  Student,
  Teacher,
  Course,
  TeacherAssignment,
  AttendanceRecord,
  AttendanceStatus,
  Payment,
  AcademicYear,
  MessageTemplate,
  CommunicationCache,
} from '@/app/(dashboard)/communication/communication-data'

import {
  getWhatsAppNumber,
  replaceTemplateVariables,
} from '@/app/(dashboard)/communication/communication-helpers'

type CommunicationSection =
  | 'direct'
  | 'group'
  | 'templates'
  | 'reminders'

const MESSAGE_VARIABLES = [
  { key: '{{name}}', label: 'اسم الطالب' },
  { key: '{{phone}}', label: 'رقم الهاتف' },
  { key: '{{whatsapp}}', label: 'رقم WhatsApp' },
  { key: '{{course}}', label: 'الدورة' },
  { key: '{{teacher}}', label: 'المعلم' },
  { key: '{{attendance}}', label: 'الحضور' },
  { key: '{{paid}}', label: 'المبلغ المدفوع' },
  { key: '{{remaining}}', label: 'المبلغ المتبقي' },
  { key: '{{payment_status}}', label: 'حالة الدفع' },
  { key: '{{date}}', label: 'التاريخ' },
] as const

export function CommunicationView() {
  const [activeSection, setActiveSection] =
    useState<CommunicationSection>('direct')

  const [students, setStudents] = useState<Student[]>(
    () => getCommunicationCache()?.students ?? []
  )

  const [teachers, setTeachers] = useState<Teacher[]>(
    () => getCommunicationCache()?.teachers ?? []
  )

  const [courses, setCourses] = useState<Course[]>(
    () => getCommunicationCache()?.courses ?? []
  )

  const [assignments, setAssignments] =
    useState<TeacherAssignment[]>(
      () => getCommunicationCache()?.assignments ?? []
    )

  const [attendance, setAttendance] =
    useState<AttendanceRecord[]>(
      () => getCommunicationCache()?.attendance ?? []
    )

  const [attendanceStatuses, setAttendanceStatuses] =
    useState<AttendanceStatus[]>(
      () => getCommunicationCache()?.attendanceStatuses ?? []
    )

  const [payments, setPayments] = useState<Payment[]>(
    () => getCommunicationCache()?.payments ?? []
  )

  const [messageTemplates, setMessageTemplates] =
    useState<MessageTemplate[]>(
      () => getCommunicationCache()?.messageTemplates ?? []
    )

  const [
    attendanceAwardEligibleStudentIds,
    setAttendanceAwardEligibleStudentIds,
  ] = useState<string[]>(
    () =>
      getCommunicationCache()
        ?.attendanceAwardEligibleStudentIds ?? []
  )

  const [academicYear, setAcademicYear] =
    useState<AcademicYear | null>(
      () => getCommunicationCache()?.academicYear ?? null
    )

  const [loading, setLoading] = useState(
    () => !getCommunicationCache()
  )

  const [search, setSearch] = useState('')

  const [selectedStudentIds, setSelectedStudentIds] =
    useState<string[]>([])

  const [filterType, setFilterType] =
    useState<FilterType>('all')

  const [selectedTeacherIds, setSelectedTeacherIds] =
    useState<string[]>([])

  const [selectedCourseId, setSelectedCourseId] =
    useState('')

  const [
    selectedAttendanceStatusId,
    setSelectedAttendanceStatusId,
  ] = useState('')

  const [openedStudentIds, setOpenedStudentIds] =
    useState<string[]>([])

  const [activeSavedMessage, setActiveSavedMessage] =
    useState<{
      templateId: string
      content: string
    } | null>(null)

  const [messageModalOpen, setMessageModalOpen] =
    useState(false)

  const [messageStudent, setMessageStudent] =
    useState<Student | null>(null)

  const [messageMode, setMessageMode] =
    useState<'choose' | 'saved' | 'new'>('choose')

  const [selectedTemplateId, setSelectedTemplateId] =
    useState('')

  const [composedMessage, setComposedMessage] =
    useState('')

  const [templateName, setTemplateName] =
    useState('')

  const [templateSaving, setTemplateSaving] =
    useState(false)

  const [templateMessage, setTemplateMessage] =
    useState('')

  /*
   * تحميل البيانات مع استخدام الذاكرة المؤقتة المشتركة.
   */
  useEffect(() => {
    let cancelled = false

    const applyCache = (cache: CommunicationCache) => {
      setAcademicYear(cache.academicYear)
      setStudents(cache.students)
      setTeachers(cache.teachers)
      setCourses(cache.courses)
      setAssignments(cache.assignments)
      setAttendance(cache.attendance)
      setAttendanceStatuses(cache.attendanceStatuses)
      setPayments(cache.payments)
      setMessageTemplates(cache.messageTemplates)

      setAttendanceAwardEligibleStudentIds(
        cache.attendanceAwardEligibleStudentIds
      )
    }

    const loadData = async () => {
      const cached = getCommunicationCache()

      if (cached) {
        applyCache(cached)
        setLoading(false)
        return
      }

      if (isCommunicationCacheLoading()) {
        let attempts = 0

        while (
          isCommunicationCacheLoading() &&
          !cancelled &&
          attempts < 300
        ) {
          await new Promise<void>((resolve) => {
            setTimeout(resolve, 100)
          })

          attempts += 1
        }

        if (cancelled) return

        const updatedCache = getCommunicationCache()

        if (updatedCache) {
          applyCache(updatedCache)
          setLoading(false)
          return
        }

        if (attempts >= 300) {
          setLoading(false)
          return
        }
      }

      setLoading(true)
      setCommunicationCacheLoading(true)

      try {
        const data = await loadCommunicationData()

        if (cancelled) return

        setCommunicationCache(data)
        applyCache(data)
      } catch (error) {
        console.error('Communication load error:', error)
      } finally {
        setCommunicationCacheLoading(false)

        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadData()

    return () => {
      cancelled = true
    }
  }, [])

  /*
   * تصفية الطلاب حسب المعلم والدورة والحضور والدفع وغيرها.
   */
  const filteredStudents = useMemo(() => {
    let result = [...students]

    if (filterType === 'teacher') {
      if (selectedTeacherIds.length === 0) {
        result = []
      } else {
        const ids = new Set(
          assignments
            .filter((item) =>
              selectedTeacherIds.includes(item.teacherId)
            )
            .map((item) => item.studentId)
        )

        result = result.filter((student) =>
          ids.has(student.id)
        )
      }
    }

    if (filterType === 'course') {
      if (!selectedCourseId) {
        result = []
      } else {
        const ids = new Set(
          assignments
            .filter(
              (item) => item.courseId === selectedCourseId
            )
            .map((item) => item.studentId)
        )

        result = result.filter((student) =>
          ids.has(student.id)
        )
      }
    }

    if (filterType === 'teacher_course') {
      if (
        selectedTeacherIds.length === 0 ||
        !selectedCourseId
      ) {
        result = []
      } else {
        const ids = new Set(
          assignments
            .filter(
              (item) =>
                selectedTeacherIds.includes(item.teacherId) &&
                item.courseId === selectedCourseId
            )
            .map((item) => item.studentId)
        )

        result = result.filter((student) =>
          ids.has(student.id)
        )
      }
    }

    if (filterType === 'not_assigned_current_course') {
      const currentCourseIds = new Set(
        courses.map((course) => course.id)
      )

      const assignedStudentIds = new Set(
        assignments
          .filter((item) =>
            currentCourseIds.has(item.courseId)
          )
          .map((item) => item.studentId)
      )

      result = result.filter(
        (student) => !assignedStudentIds.has(student.id)
      )
    }

    if (filterType === 'attendance_award') {
      const eligibleIds = new Set(
        attendanceAwardEligibleStudentIds
      )

      result = result.filter((student) =>
        eligibleIds.has(student.id)
      )
    }

    if (filterType === 'invalid_personal_id') {
      result = result.filter((student) => {
        const digits = (student.personalId ?? '')
          .replace(/\D/g, '')

        return digits.length < 9
      })
    }

    if (
      filterType === 'attendance_status' ||
      filterType === 'teacher_attendance' ||
      filterType === 'teacher_course_attendance'
    ) {
      const statusId = selectedAttendanceStatusId

      if (!statusId) {
        result = []
      } else {
        let records = attendance.filter(
          (item) => item.statusId === statusId
        )

        if (
          filterType === 'teacher_attendance' ||
          filterType === 'teacher_course_attendance'
        ) {
          if (selectedTeacherIds.length === 0) {
            result = []
          } else {
            const assignmentKeys = new Set(
              assignments
                .filter((item) => {
                  if (
                    !selectedTeacherIds.includes(item.teacherId)
                  ) {
                    return false
                  }

                  if (
                    filterType === 'teacher_course_attendance'
                  ) {
                    return (
                      Boolean(selectedCourseId) &&
                      item.courseId === selectedCourseId
                    )
                  }

                  return true
                })
                .map(
                  (item) =>
                    `${item.studentId}:${item.courseId}`
                )
            )

            records = records.filter((record) =>
              assignmentKeys.has(
                `${record.studentId}:${record.courseId}`
              )
            )
          }
        }

        const ids = new Set(
          records.map((record) => record.studentId)
        )

        result = result.filter((student) =>
          ids.has(student.id)
        )
      }
    }

    if (filterType === 'payment') {
      const totals = new Map<string, number>()

      payments.forEach((payment) => {
        totals.set(
          payment.studentId,
          (totals.get(payment.studentId) ?? 0) +
            payment.amount
        )
      })

      result = result.filter((student) => {
        const paid = totals.get(student.id) ?? 0

        if (student.feeExempt) {
          return true
        }

        return paid < (academicYear?.annualFee ?? 0)
      })
    }

    const query = search.trim().toLowerCase()

    if (query) {
      result = result.filter((student) =>
        [
          student.name,
          student.phone,
          student.whatsapp,
          student.personalId,
        ].some((value) =>
          (value ?? '').toLowerCase().includes(query)
        )
      )
    }

    return result
  }, [
    students,
    courses,
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

  const selectedStudents = useMemo(
    () =>
      students.filter((student) =>
        selectedStudentIds.includes(student.id)
      ),
    [students, selectedStudentIds]
  )

  /*
   * فتح نافذة إرسال الرسالة.
   */
  const openMessageModal = useCallback(
    (student: Student) => {
      setMessageStudent(student)
      setMessageModalOpen(true)
      setTemplateName('')
      setTemplateMessage('')

      if (activeSavedMessage) {
        setMessageMode('saved')

        setSelectedTemplateId(
          activeSavedMessage.templateId
        )

        setComposedMessage(activeSavedMessage.content)
        return
      }

      setMessageMode('choose')
      setSelectedTemplateId('')
      setComposedMessage('')
    },
    [activeSavedMessage]
  )

  const closeMessageModal = () => {
    setMessageModalOpen(false)
    setMessageStudent(null)
    setMessageMode('choose')
    setSelectedTemplateId('')
    setComposedMessage('')
    setTemplateName('')
    setTemplateMessage('')
  }

  const chooseSavedTemplate = (
    template: MessageTemplate
  ) => {
    setSelectedTemplateId(template.id)
    setComposedMessage(template.content)
    setMessageMode('saved')
    setTemplateMessage('')
  }

  const createNewMessage = () => {
    setActiveSavedMessage(null)
    setSelectedTemplateId('')
    setComposedMessage('')
    setMessageMode('new')
    setTemplateMessage('')
  }

  /*
   * حفظ قالب رسالة مشترك.
   */
  const saveMessageTemplate = async () => {
    const name = templateName.trim()
    const content = composedMessage.trim()

    if (!name) {
      setTemplateMessage('اكتب اسم الرسالة أولاً.')
      return
    }

    if (!content) {
      setTemplateMessage('اكتب نص الرسالة أولاً.')
      return
    }

    setTemplateSaving(true)
    setTemplateMessage('')

    try {
      const { data, error } =
        await createCommunicationMessageTemplate({
          name,
          content,
        })

      if (error) {
        console.error(
          'Save message template error:',
          error
        )

        setTemplateMessage(
          'تعذر حفظ الرسالة. حاول مرة أخرى.'
        )

        return
      }

      const newTemplate: MessageTemplate = {
        id: data.id,
        name: data.name,
        content: data.content,
        createdAt: data.created_at ?? '',
        updatedAt: data.updated_at ?? '',
      }

      const nextTemplates = [
        newTemplate,
        ...messageTemplates,
      ]

      setMessageTemplates(nextTemplates)

      const cache = getCommunicationCache()

      if (cache) {
        setCommunicationCache({
          ...cache,
          messageTemplates: [
            newTemplate,
            ...cache.messageTemplates,
          ],
        })
      }

      setSelectedTemplateId(newTemplate.id)
      setTemplateName('')

      setTemplateMessage(
        'تم حفظ الرسالة، وأصبحت متاحة لجميع المستخدمين.'
      )
    } catch (error) {
      console.error(
        'Save message template error:',
        error
      )

      setTemplateMessage(
        'حدث خطأ أثناء حفظ الرسالة.'
      )
    } finally {
      setTemplateSaving(false)
    }
  }

  /*
   * تجهيز الرسالة وفتح WhatsApp.
   */
  const sendCurrentMessage = () => {
    if (!messageStudent) {
      return
    }

    const number = getWhatsAppNumber(messageStudent)

    if (!number) {
      setTemplateMessage(
        'لا يوجد رقم WhatsApp لهذا الطالب.'
      )
      return
    }

    const rawMessage = composedMessage.trim()

    if (!rawMessage) {
      setTemplateMessage('اكتب الرسالة أولاً.')
      return
    }

    if (
      messageMode === 'saved' &&
      selectedTemplateId
    ) {
      setActiveSavedMessage({
        templateId: selectedTemplateId,
        content: rawMessage,
      })
    }

    if (messageMode === 'new') {
      setActiveSavedMessage(null)
    }

    const finalMessage = replaceTemplateVariables(
      rawMessage,
      messageStudent,
      {
        assignments,
        courses,
        teachers,
        attendance,
        attendanceStatuses,
        payments,
        academicYear,
      }
    )

    const url =
      `https://wa.me/${number}?text=` +
      encodeURIComponent(finalMessage)

    window.open(
      url,
      '_blank',
      'noopener,noreferrer'
    )

    setOpenedStudentIds((current) =>
      current.includes(messageStudent.id)
        ? current
        : [...current, messageStudent.id]
    )

    closeMessageModal()
  }

  /*
   * تحديد الطلاب.
   */
  const toggleStudent = (studentId: string) => {
    setSelectedStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId]
    )
  }

  const selectAllVisible = () => {
    const visibleIds = filteredStudents.map(
      (student) => student.id
    )

    setSelectedStudentIds((current) => {
      const allSelected =
        visibleIds.length > 0 &&
        visibleIds.every((id) => current.includes(id))

      if (allSelected) {
        return current.filter(
          (id) => !visibleIds.includes(id)
        )
      }

      return Array.from(
        new Set([...current, ...visibleIds])
      )
    })
  }

  const resetFilter = () => {
    setFilterType('all')
    setSelectedTeacherIds([])
    setSelectedCourseId('')
    setSelectedAttendanceStatusId('')
  }

  const isStarted = (studentId: string) =>
    openedStudentIds.includes(studentId)

  return (
    <div className="space-y-6">
      <PageHeader
        title="التواصل"
        description="التواصل مع الطلاب وأولياء الأمور عبر WhatsApp"
      />

      {/* التنقل الرئيسي */}
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

        <Button
          type="button"
          variant={
            activeSection === 'reminders'
              ? 'default'
              : 'outline'
          }
          onClick={() => setActiveSection('reminders')}
        >
          <CalendarDays className="size-4" />
          تذكير الدروس
        </Button>
      </div>

      {/* قسم التواصل المباشر */}
      {activeSection === 'direct' && (
        <CommunicationDirect
          teachers={teachers}
          courses={courses}
          attendanceStatuses={attendanceStatuses}
          loading={loading}
          filteredStudents={filteredStudents}
          selectedStudents={selectedStudents}
          selectedStudentIds={selectedStudentIds}
          setSelectedStudentIds={setSelectedStudentIds}
          filterType={filterType}
          setFilterType={setFilterType}
          selectedTeacherIds={selectedTeacherIds}
          setSelectedTeacherIds={setSelectedTeacherIds}
          selectedCourseId={selectedCourseId}
          setSelectedCourseId={setSelectedCourseId}
          selectedAttendanceStatusId={
            selectedAttendanceStatusId
          }
          setSelectedAttendanceStatusId={
            setSelectedAttendanceStatusId
          }
          search={search}
          setSearch={setSearch}
          selectAllVisible={selectAllVisible}
          resetFilter={resetFilter}
          toggleStudent={toggleStudent}
          isStarted={isStarted}
          openMessageModal={openMessageModal}
        />
      )}

      {/* التواصل الجماعي */}
      {activeSection === 'group' && (
        <CommunicationViewGroups
          students={students}
          selectedStudentIds={selectedStudentIds}
        />
      )}

      {/* الرسائل المحفوظة */}
      {activeSection === 'templates' && (
        <CommunicationTemplates
          templates={messageTemplates}
          onTemplatesChange={(nextTemplates) => {
            setMessageTemplates(nextTemplates)

            const cache = getCommunicationCache()

            if (cache) {
              setCommunicationCache({
                ...cache,
                messageTemplates: nextTemplates,
              })
            }
          }}
        />
      )}

      {/* تذكير الدروس */}
      {activeSection === 'reminders' && (
        <CommunicationReminders
          courses={courses}
          loading={loading}
        />
      )}

      {/* نافذة الرسالة */}
      {messageModalOpen && messageStudent && (
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
                onClick={closeMessageModal}
              >
                <X className="size-5" />
              </Button>
            </div>

            <div className="space-y-5 p-5">
              {/* اختيار نوع الرسالة */}
              {messageMode === 'choose' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setMessageMode('saved')}
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
                    onClick={createNewMessage}
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

              {/* الرسائل المحفوظة */}
              {messageMode === 'saved' && (
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
                        onClick={createNewMessage}
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
                          سيتم استخدام نفس الرسالة تلقائياً مع الطلاب التاليين،
                          مع تحديث المتغيرات.
                        </div>
                      </div>

                      <label className="text-sm font-medium">
                        الرسالة
                      </label>

                      <textarea
                        value={composedMessage}
                        onChange={(event) =>
                          setComposedMessage(event.target.value)
                        }
                        rows={7}
                        className="w-full resize-y rounded-md border bg-background p-3 text-sm outline-none"
                      />
                    </div>
                  ) : messageTemplates.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                      لا توجد رسائل محفوظة حالياً.
                      <br />
                      أنشئ أول رسالة واحفظها كقالب.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {messageTemplates.map((template) => {
                        const selected =
                          selectedTemplateId === template.id

                        return (
                          <div
                            key={template.id}
                            className={`rounded-lg border p-3 ${
                              selected
                                ? 'border-primary bg-primary/5'
                                : ''
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                chooseSavedTemplate(template)
                              }
                              className="min-w-0 w-full text-right"
                            >
                              <div className="font-medium">
                                {template.name}
                              </div>

                              <div className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">
                                {template.content}
                              </div>
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {!activeSavedMessage &&
                    selectedTemplateId && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          الرسالة
                        </label>

                        <textarea
                          value={composedMessage}
                          onChange={(event) =>
                            setComposedMessage(event.target.value)
                          }
                          rows={7}
                          className="w-full resize-y rounded-md border bg-background p-3 text-sm outline-none"
                        />
                      </div>
                    )}
                </>
              )}

              {/* إنشاء رسالة جديدة */}
              {messageMode === 'new' && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      الرسالة
                    </label>

                    <textarea
                      value={composedMessage}
                      onChange={(event) =>
                        setComposedMessage(event.target.value)
                      }
                      placeholder="اكتب الرسالة التي تريد إرسالها..."
                      rows={7}
                      autoFocus
                      className="w-full resize-y rounded-md border bg-background p-3 text-sm outline-none"
                    />
                  </div>

                  {/* متغيرات الرسالة */}
                  <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                    <div className="mb-2 font-medium text-foreground">
                      يمكنك استخدام المتغيرات:
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {MESSAGE_VARIABLES.map((variable) => (
                        <button
                          key={variable.key}
                          type="button"
                          onClick={() =>
                            setComposedMessage((current) =>
                              `${current}${current ? ' ' : ''}${variable.key}`
                            )
                          }
                          className="rounded border bg-background px-2.5 py-1.5 text-xs hover:bg-muted"
                        >
                          {variable.label}
                        </button>
                      ))}
                    </div>

                    <div className="mt-2 text-[11px] text-muted-foreground">
                      عند الضغط على أي متغير سيتم إدخال الرمز الخاص به داخل الرسالة تلقائياً.
                    </div>
                  </div>

                  {/* حفظ القالب */}
                  <div className="rounded-lg border p-3">
                    <div className="mb-2 text-sm font-medium">
                      حفظ هذه الرسالة كقالب للجميع
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        value={templateName}
                        onChange={(event) =>
                          setTemplateName(event.target.value)
                        }
                        placeholder="اسم الرسالة، مثلاً: تنبيه غياب"
                        className="h-10 flex-1 rounded-md border bg-background px-3 text-sm outline-none"
                      />

                      <Button
                        type="button"
                        variant="outline"
                        onClick={saveMessageTemplate}
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

              {/* رسائل الحالة */}
              {templateMessage && (
                <div className="rounded-md border bg-muted/30 p-3 text-sm">
                  {templateMessage}
                </div>
              )}

              {/* أزرار نافذة الرسالة */}
              {messageMode !== 'choose' && (
                <div className="flex flex-wrap justify-between gap-2 border-t pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      if (activeSavedMessage) {
                        setMessageMode('saved')

                        setSelectedTemplateId(
                          activeSavedMessage.templateId
                        )

                        setComposedMessage(
                          activeSavedMessage.content
                        )
                      } else {
                        setMessageMode('choose')
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
                      onClick={closeMessageModal}
                    >
                      إلغاء
                    </Button>

                    <Button
                      type="button"
                      disabled={!composedMessage.trim()}
                      onClick={sendCurrentMessage}
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
