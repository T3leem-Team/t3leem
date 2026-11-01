
'use client'

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'

import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  MessageSquareText,
  Plus,
  Pencil,
  Settings2,
  UserX,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react'

import {
  PageHeader,
} from '@/components/dashboard/page-header'

import {
  Card,
  CardContent,
} from '@/components/ui/card'

import {
  Badge,
} from '@/components/ui/badge'

import {
  Button,
} from '@/components/ui/button'

import {
  loadAcademicYear,
  loadCourses,
  loadTeachers as fetchTeachers,
  loadRecords as fetchRecords,
  loadSupervisionSettings,
  updateSupervisionSettings,
  getCurrentUserProfile,
  deleteDayAttendance,
  createSupervisionRecord,
  updateSupervisionNote,
} from '@/lib/features/supervision/repositories/supervision.repository'

import {
  type SupervisionType,
  type AcademicYear,
  type Course,
  type Teacher,
  type SupervisionRecord,
  type SupervisionSettings,
  type SupervisionCache,
  defaultSupervisionSettings,
  getTypeLabel,
  getTypeIcon,
  getTypeBadgeVariant,
  getLocalDateString,
  formatDateTime,
  formatDate,
  getDayLabel,
} from '@/app/(dashboard)/supervision/supervision-helpers'

let supervisionCache: SupervisionCache | null = null
let supervisionLoading = false

export function SupervisionView() {
  const today = getLocalDateString()

  const [academicYear, setAcademicYear] =
    useState<AcademicYear | null>(
      supervisionCache?.academicYear ?? null,
    )

  const [courses, setCourses] =
    useState<Course[]>(
      supervisionCache?.courses ?? [],
    )

  const [selectedCourseId, setSelectedCourseId] =
    useState(
      supervisionCache?.selectedCourseId ?? '',
    )

  const [teachers, setTeachers] =
    useState<Teacher[]>(
      supervisionCache?.teachers ?? [],
    )

  const [records, setRecords] =
    useState<SupervisionRecord[]>(
      supervisionCache?.records ?? [],
    )

  const [isLoading, setIsLoading] =
    useState(!supervisionCache)

  const [isLoadingTeachers, setIsLoadingTeachers] =
    useState(false)

  const [isSaving, setIsSaving] =
    useState(false)

  const [isSavingSettings, setIsSavingSettings] =
    useState(false)

  const [error, setError] =
    useState('')

  const [settingsMessage, setSettingsMessage] =
    useState('')

  const [isFormOpen, setIsFormOpen] =
    useState(false)

  const [editingRecordId, setEditingRecordId] =
    useState<string | null>(null)

  const [selectedType, setSelectedType] =
    useState<SupervisionType>('day_cancelled')

  const [selectedTeacher, setSelectedTeacher] =
    useState('')

  const [noteScope, setNoteScope] =
    useState<'general' | 'teacher'>('general')

  const [selectedDate, setSelectedDate] =
    useState(today)

  const [reason, setReason] =
    useState('')

  const [note, setNote] =
    useState('')

  const [
    supervisionSettings,
    setSupervisionSettings,
  ] = useState<SupervisionSettings>(
    supervisionCache?.supervisionSettings ??
      defaultSupervisionSettings,
  )

  const selectedCourse = useMemo(
    () =>
      courses.find(
        (course) => course.id === selectedCourseId,
      ) ?? null,
    [courses, selectedCourseId],
  )

  // ==========================================
  // Cache
  // ==========================================

  const updateCache = (
    overrides: Partial<SupervisionCache> = {},
  ) => {
    supervisionCache = {
      academicYear:
        overrides.academicYear ?? academicYear,

      courses:
        overrides.courses ?? courses,

      selectedCourseId:
        overrides.selectedCourseId ?? selectedCourseId,

      teachers:
        overrides.teachers ?? teachers,

      records:
        overrides.records ?? records,

      supervisionSettings:
        overrides.supervisionSettings ?? supervisionSettings,
    }
  }

  // ==========================================
  // Settings
  // ==========================================

  const loadSettings = async () => {
    try {
      const nextSettings =
        await loadSupervisionSettings()

      setSupervisionSettings(nextSettings)

      updateCache({
        supervisionSettings: nextSettings,
      })

      return nextSettings
    } catch (err) {
      console.error(
        'Load supervision settings error:',
        err,
      )

      setError(
        err instanceof Error
          ? err.message
          : 'تعذر تحميل صلاحيات المعلمين.',
      )

      return supervisionSettings
    }
  }

  const updateSetting = async (
    setting:
      | 'allowTeacherTransfer'
      | 'allowTeacherRemove',
    value: boolean,
  ) => {
    setIsSavingSettings(true)
    setSettingsMessage('')
    setError('')

    const previousSettings = supervisionSettings

    const nextSettings: SupervisionSettings = {
      ...supervisionSettings,
      [setting]: value,
    }

    setSupervisionSettings(nextSettings)

    try {
      const savedSettings =
        await updateSupervisionSettings({
          [setting]: value,
        })

      setSupervisionSettings(savedSettings)

      updateCache({
        supervisionSettings: savedSettings,
      })

      setSettingsMessage(
        'تم حفظ صلاحية المعلمين.',
      )

      window.setTimeout(() => {
        setSettingsMessage('')
      }, 2500)
    } catch (err) {
      console.error(
        'Update supervision settings error:',
        err,
      )

      setSupervisionSettings(previousSettings)

      updateCache({
        supervisionSettings: previousSettings,
      })

      setError(
        err instanceof Error
          ? err.message
          : 'تعذر حفظ صلاحية المعلمين.',
      )
    } finally {
      setIsSavingSettings(false)
    }
  }

  // ==========================================
  // Initial Data
  // ==========================================

  const loadInitialData = async (
    showLoading = true,
  ) => {
    if (showLoading) {
      setIsLoading(true)
    }

    setError('')

    try {
      const settingsPromise = loadSettings()

      const year = await loadAcademicYear()

      await settingsPromise

      if (!year) {
        setAcademicYear(null)
        setCourses([])
        setSelectedCourseId('')
        setTeachers([])
        setRecords([])

        updateCache({
          academicYear: null,
          courses: [],
          selectedCourseId: '',
          teachers: [],
          records: [],
        })

        return
      }

      const loadedCourses =
        await loadCourses(year.id)

      const currentCourse =
        loadedCourses.find((course) => {
          if (!course.start_date || !course.end_date) {
            return false
          }

          return (
            today >= course.start_date &&
            today <= course.end_date
          )
        }) ?? loadedCourses[0]

      const currentSelectedCourseId =
        loadedCourses.some(
          (course) => course.id === selectedCourseId,
        )
          ? selectedCourseId
          : currentCourse?.id ?? ''

      setAcademicYear(year)
      setCourses(loadedCourses)
      setSelectedCourseId(currentSelectedCourseId)

      updateCache({
        academicYear: year,
        courses: loadedCourses,
        selectedCourseId: currentSelectedCourseId,
      })
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : 'تعذر تحميل بيانات الإشراف.',
      )
    } finally {
      if (showLoading) {
        setIsLoading(false)
      }
    }
  }

  // ==========================================
  // Teachers
  // ==========================================

  const loadTeachers = async (courseId: string) => {
    if (!courseId) {
      setTeachers([])

      updateCache({
        teachers: [],
      })

      return
    }

    setIsLoadingTeachers(true)

    try {
      const loadedTeachers =
        await fetchTeachers(courseId)

      setTeachers(loadedTeachers)

      updateCache({
        teachers: loadedTeachers,
        selectedCourseId: courseId,
      })

      if (
        selectedTeacher &&
        !loadedTeachers.some(
          (teacher) => teacher.id === selectedTeacher,
        )
      ) {
        setSelectedTeacher('')
      }
    } catch (err) {
      console.error(err)

      setTeachers([])

      updateCache({
        teachers: [],
      })

      setError(
        err instanceof Error
          ? err.message
          : 'تعذر تحميل معلمي الدورة.',
      )
    } finally {
      setIsLoadingTeachers(false)
    }
  }

  // ==========================================
  // Supervision Records
  // ==========================================

  const loadRecords = async (courseId: string) => {
    if (!courseId) {
      setRecords([])

      updateCache({
        records: [],
      })

      return
    }

    try {
      const data = await fetchRecords(courseId)

      /*
       * Repository يرجع بيانات السجلات من Supabase.
       * نحولها هنا إلى الشكل الذي تستخدمه الواجهة.
       */
      const mappedRecords: SupervisionRecord[] =
        data.map((row) => {
          const course = Array.isArray(row.course)
            ? row.course[0]
            : row.course

          const teacher = Array.isArray(row.teacher)
            ? row.teacher[0]
            : row.teacher

          const createdByProfile =
            Array.isArray(row.created_by_profile)
              ? row.created_by_profile[0]
              : row.created_by_profile

          return {
            id: row.id,
            teacherId: row.teacher_id ?? null,
            type: row.type as SupervisionType,
            date: row.record_date,
            course:
              course?.name ??
              selectedCourse?.name ??
              '',
            teacher:
              teacher?.name ??
              (row.type === 'day_cancelled'
                ? 'جميع المعلمين'
                : row.type === 'note'
                  ? 'ملاحظة عامة'
                  : 'غير محدد'),
            reason: row.reason ?? '',
            note: row.note ?? '',
            createdBy:
              createdByProfile?.full_name ??
              'غير معروف',
            createdAt: row.created_at,
          }
        })

      setRecords(mappedRecords)

      updateCache({
        records: mappedRecords,
        selectedCourseId: courseId,
      })
    } catch (err) {
      console.error(err)

      setRecords([])

      updateCache({
        records: [],
      })

      setError(
        err instanceof Error
          ? err.message
          : 'تعذر تحميل سجل الإشراف.',
      )
    }
  }

  // ==========================================
  // Effects
  // ==========================================

  useEffect(() => {
    if (supervisionCache) {
      setAcademicYear(supervisionCache.academicYear)
      setCourses(supervisionCache.courses)
      setSelectedCourseId(supervisionCache.selectedCourseId)
      setTeachers(supervisionCache.teachers)
      setRecords(supervisionCache.records)
      setSupervisionSettings(
        supervisionCache.supervisionSettings,
      )

      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (supervisionLoading) {
      return
    }

    supervisionLoading = true

    void loadInitialData(!supervisionCache).finally(() => {
      supervisionLoading = false
    })
  }, [])

  useEffect(() => {
    if (!selectedCourseId) {
      setTeachers([])
      setRecords([])

      updateCache({
        selectedCourseId: '',
        teachers: [],
        records: [],
      })

      return
    }

    updateCache({
      selectedCourseId,
    })

    void loadTeachers(selectedCourseId)
    void loadRecords(selectedCourseId)
  }, [selectedCourseId])

  // ==========================================
  // Form
  // ==========================================

  const openForm = (type: SupervisionType) => {
    setEditingRecordId(null)
    setSelectedType(type)
    setSelectedTeacher('')
    setNoteScope('general')
    setSelectedDate(today)
    setReason('')
    setNote('')
    setError('')
    setIsFormOpen(true)
  }

  const openEditNote = (record: SupervisionRecord) => {
    setEditingRecordId(record.id)
    setSelectedType('note')
    setSelectedTeacher(record.teacherId ?? '')
    setNoteScope(record.teacherId ? 'teacher' : 'general')
    setSelectedDate(record.date)
    setReason(record.reason ?? '')
    setNote(record.note ?? '')
    setError('')
    setIsFormOpen(true)
  }

  const closeForm = () => {
    if (isSaving) {
      return
    }

    setIsFormOpen(false)
    setEditingRecordId(null)
  }

  // ==========================================
  // Save Record
  // ==========================================

  const saveRecord = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    if (!selectedCourseId) {
      setError('يجب اختيار دورة أولًا.')
      return
    }

    if (!reason.trim()) {
      setError('اكتب سبب الحالة.')
      return
    }

    const requiresTeacher =
      selectedType !== 'day_cancelled' &&
      (selectedType !== 'note' || noteScope === 'teacher')

    if (requiresTeacher && !selectedTeacher) {
      setError('اختر المعلم أولًا.')
      return
    }

    if (!academicYear?.id) {
      setError('لم يتم تحديد السنة الدراسية.')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      const createdBy =
        await getCurrentUserProfile()

      /*
       * إلغاء يوم دراسي:
       * نحذف سجلات الحضور الخاصة بنفس الدورة
       * ونفس التاريخ فقط.
       *
       * لا نحذف الحضور عند إلغاء درس معلم محدد.
       */
      if (selectedType === 'day_cancelled') {
        try {
          await deleteDayAttendance(
            selectedCourseId,
            selectedDate,
          )
        } catch (err) {
          throw new Error(
            `تعذر حذف سجلات الحضور لليوم الملغي: ${
              err instanceof Error
                ? err.message
                : 'خطأ غير معروف'
            }`,
          )
        }
      }

      if (editingRecordId) {
        // تعديل الملاحظة الحالية دون إنشاء سجل جديد.
        await updateSupervisionNote(
          editingRecordId,
          selectedCourseId,
          {
            teacher_id:
              noteScope === 'general'
                ? null
                : selectedTeacher || null,
            record_date: selectedDate,
            reason: reason.trim(),
            note: note.trim() || null,
          },
        )
      } else {
        await createSupervisionRecord({
          academic_year_id: academicYear.id,
          course_id: selectedCourseId,
          teacher_id:
            selectedType === 'day_cancelled' ||
            (selectedType === 'note' && noteScope === 'general')
              ? null
              : selectedTeacher || null,
          type: selectedType,
          record_date: selectedDate,
          reason: reason.trim(),
          note: note.trim() || null,
          created_by: createdBy,
        })
      }

      await loadRecords(selectedCourseId)

      setIsFormOpen(false)
      setEditingRecordId(null)
      setSelectedTeacher('')
      setNoteScope('general')
      setReason('')
      setNote('')
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : 'تعذر حفظ السجل.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="space-y-6">
      <PageHeader
        title="إشراف الدوام والدروس"
        description="إدارة حالات الدوام والدروس وصلاحيات المعلمين"
        action={
          <Button
            onClick={() => openForm('note')}
            disabled={isLoading || !selectedCourseId}
          >
            <Plus className="size-4" />
            إضافة سجل إشرافي
          </Button>
        }
      />

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />

          <div>
            <p className="font-medium text-destructive">
              تعذر تنفيذ العملية
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* السنة والدورة */}
      <Card>
        <CardContent className="p-5">
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-5 w-40 animate-pulse rounded bg-muted" />
              <div className="h-10 w-full animate-pulse rounded bg-muted" />
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CalendarDays className="size-5" />
                </span>

                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">
                    السنة الدراسية
                  </p>

                  <h2 className="mt-1 text-lg font-semibold">
                    {academicYear?.name ?? 'لا توجد سنة دراسية حالية'}
                  </h2>

                  {academicYear?.start_date &&
                    academicYear?.end_date && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatDate(academicYear.start_date)} →{' '}
                        {formatDate(academicYear.end_date)}
                      </p>
                    )}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  الدورة
                </label>

                {courses.length === 0 ? (
                  <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                    لا توجد دورات مرتبطة بالسنة الحالية.
                  </div>
                ) : (
                  <select
                    value={selectedCourseId}
                    onChange={(event) =>
                      setSelectedCourseId(event.target.value)
                    }
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
                  >
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}

          {selectedCourse && (
            <div className="mt-5 border-t pt-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    الدورة المختارة
                  </p>

                  <h3 className="mt-1 font-semibold">
                    {selectedCourse.name}
                  </h3>

                  {selectedCourse.start_date &&
                    selectedCourse.end_date && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatDate(selectedCourse.start_date)} →{' '}
                        {formatDate(selectedCourse.end_date)}
                      </p>
                    )}
                </div>

                <div className="min-w-0 text-right" dir="rtl">
                  <p className="mb-2 text-sm font-medium">
                    أيام الدراسة
                  </p>

                  {selectedCourse.days?.length > 0 ? (
                    <div className="flex flex-wrap justify-start gap-2">
                      {selectedCourse.days.map((day, index) => (
                        <Badge
                          key={`${day}-${index}`}
                          variant="neutral"
                        >
                          {getDayLabel(day)}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <Badge variant="neutral">
                      أيام الدورة غير محددة
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* صلاحيات المعلمين */}
      <section>
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <Settings2 className="size-5 text-primary" />

            <h2 className="text-lg font-semibold">
              صلاحيات المعلمين
            </h2>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            تحكم بما يستطيع المعلم تنفيذه على الطلاب المسجلين لديه.
          </p>
        </div>

        <Card>
          <CardContent className="divide-y p-0">
            <PermissionRow
              icon={UsersRound}
              title="السماح بنقل الطلاب"
              description="السماح للمعلم بنقل الطالب من معلم إلى معلم آخر."
              enabled={supervisionSettings.allowTeacherTransfer}
              disabled={isSavingSettings}
              onChange={(value) =>
                void updateSetting('allowTeacherTransfer', value)
              }
            />

            <PermissionRow
              icon={UserX}
              title="السماح بمسح الطلاب"
              description="السماح للمعلم بإزالة الطالب من قائمته وإعادته إلى قائمة الطلاب القابلة للاختيار."
              enabled={supervisionSettings.allowTeacherRemove}
              disabled={isSavingSettings}
              onChange={(value) =>
                void updateSetting('allowTeacherRemove', value)
              }
            />
          </CardContent>
        </Card>

        {settingsMessage && (
          <p className="mt-2 text-sm text-emerald-600">
            {settingsMessage}
          </p>
        )}
      </section>

      {/* إجراءات الإشراف */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">
            إجراءات الإشراف
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            تسجيل الحالات المتعلقة بالدوام والدروس والمعلمين للدورة المختارة.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ActionCard
            icon={CalendarDays}
            title="إلغاء يوم دراسي"
            description="إلغاء يوم كامل من الدراسة مع ذكر السبب."
            onClick={() => openForm('day_cancelled')}
          />

          <ActionCard
            icon={CalendarDays}
            title="إلغاء درس"
            description="إلغاء درس معلم محدد مع استمرار بقية المعلمين."
            onClick={() => openForm('lesson_cancelled')}
          />

          <ActionCard
            icon={UserX}
            title="غياب معلم"
            description="تسجيل غياب معلم في يوم الدراسة."
            onClick={() => openForm('teacher_absent')}
          />

          <ActionCard
            icon={Clock3}
            title="تأخر معلم"
            description="تسجيل حالة تأخر المعلم."
            onClick={() => openForm('teacher_late')}
          />

          <ActionCard
            icon={MessageSquareText}
            title="ملاحظة إشرافية"
            description="إضافة ملاحظة أو متابعة إدارية."
            onClick={() => openForm('note')}
          />
        </div>
      </section>

      {/* سجل الإشراف */}
      <section>
        <Card>
          <CardContent className="p-0">
            <div className="border-b p-5">
              <h2 className="font-semibold">
                سجل الإشراف
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                جميع الحالات والملاحظات المسجلة للدورة المختارة.
              </p>
            </div>

            {isLoading ? (
              <div className="space-y-4 p-5">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-24 animate-pulse rounded-lg bg-muted"
                  />
                ))}
              </div>
            ) : records.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <FileText className="size-5 text-muted-foreground" />
                </span>

                <p className="mt-4 font-medium">
                  لا توجد سجلات إشرافية
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  ستظهر هنا حالات الإلغاء وغياب المعلمين والملاحظات بعد تسجيلها.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {records.map((record) => {
                  const Icon = getTypeIcon(record.type)

                  return (
                    <div
                      key={record.id}
                      className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between"
                    >
                      <div className="flex gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <Icon className="size-5 text-muted-foreground" />
                        </span>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">
                              {getTypeLabel(record.type)}
                            </p>

                            <Badge
                              variant={getTypeBadgeVariant(record.type)}
                            >
                              {formatDate(record.date)}
                            </Badge>
                          </div>

                          <p className="mt-1 text-sm">
                            {record.teacher}
                          </p>

                          <p className="mt-1 text-xs text-muted-foreground">
                            {record.course}
                          </p>

                          <p className="mt-2 text-sm text-muted-foreground">
                            {record.reason}
                          </p>

                          {record.note && (
                            <p className="mt-2 rounded-md bg-muted/50 p-2 text-sm text-muted-foreground">
                              {record.note}
                            </p>
                          )}

                          <p className="mt-2 text-xs text-muted-foreground">
                            بواسطة: {record.createdBy}
                            {' • '}
                            {formatDateTime(record.createdAt)}
                          </p>
                        </div>
                      </div>

                      {record.type === 'note' && (
                        <Button
                          type="button"
                          variant="outline"
                          className="shrink-0"
                          onClick={() => openEditNote(record)}
                          disabled={isSaving}
                        >
                          <Pencil className="size-4" />
                          تعديل الملاحظة
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* نموذج إضافة أو تعديل سجل */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="إغلاق"
            className="absolute inset-0 bg-black/40"
            onClick={closeForm}
          />

          <aside className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l bg-background shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold">
                  {editingRecordId
                    ? 'تعديل الملاحظة'
                    : getTypeLabel(selectedType)}
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedCourse
                    ? `الدورة: ${selectedCourse.name}`
                    : 'تسجيل حالة إشرافية'}
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="rounded-md p-2 hover:bg-muted"
                aria-label="إغلاق"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={saveRecord}>
              <div className="space-y-5 p-6">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    الدورة
                  </label>

                  <select
                    value={selectedCourseId}
                    onChange={(event) =>
                      setSelectedCourseId(event.target.value)
                    }
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
                    required
                  >
                    <option value="">
                      اختر الدورة
                    </option>

                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    التاريخ
                  </label>

                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(event) =>
                      setSelectedDate(event.target.value)
                    }
                    min={
                      selectedCourse?.start_date ??
                      academicYear?.start_date ??
                      undefined
                    }
                    max={
                      selectedCourse?.end_date ??
                      academicYear?.end_date ??
                      undefined
                    }
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
                    required
                  />
                </div>

                {selectedType === 'note' && (
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      نوع الملاحظة
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setNoteScope('general')
                          setSelectedTeacher('')
                          setError('')
                        }}
                        className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                          noteScope === 'general'
                            ? 'border-primary bg-primary/10 font-medium text-primary'
                            : 'hover:bg-muted'
                        }`}
                        aria-pressed={noteScope === 'general'}
                      >
                        ملاحظة عامة
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setNoteScope('teacher')
                          setError('')
                        }}
                        className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                          noteScope === 'teacher'
                            ? 'border-primary bg-primary/10 font-medium text-primary'
                            : 'hover:bg-muted'
                        }`}
                        aria-pressed={noteScope === 'teacher'}
                      >
                        ملاحظة على معلم
                      </button>
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground">
                      {noteScope === 'general'
                        ? 'يمكنك حفظ الملاحظة دون اختيار معلم.'
                        : 'اختر المعلم الذي تتعلق به الملاحظة.'}
                    </p>
                  </div>
                )}

                {selectedType !== 'day_cancelled' &&
                  (selectedType !== 'note' || noteScope === 'teacher') && (
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        المعلم
                      </label>

                      <select
                        value={selectedTeacher}
                        onChange={(event) =>
                          setSelectedTeacher(event.target.value)
                        }
                        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        required={
                          selectedType !== 'note' ||
                          noteScope === 'teacher'
                        }
                        disabled={
                          isLoadingTeachers ||
                          teachers.length === 0
                        }
                      >
                        <option value="">
                          {isLoadingTeachers
                            ? 'جاري تحميل المعلمين...'
                            : teachers.length === 0
                              ? 'لا يوجد معلمون مرتبطون بالدورة'
                              : 'اختر المعلم'}
                        </option>

                        {teachers.map((teacher) => (
                          <option
                            key={teacher.id}
                            value={teacher.id}
                          >
                            {teacher.name}
                          </option>
                        ))}
                      </select>

                      {selectedType === 'lesson_cancelled' && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          سيتم حفظ إلغاء درس هذا المعلم فقط في هذا التاريخ، ولن يتم حذف حضور بقية المعلمين.
                        </p>
                      )}
                    </div>
                  )}

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    السبب
                  </label>

                  <input
                    type="text"
                    value={reason}
                    onChange={(event) =>
                      setReason(event.target.value)
                    }
                    placeholder={
                      selectedType === 'day_cancelled'
                        ? 'مثال: عطلة رسمية'
                        : selectedType === 'teacher_absent'
                          ? 'مثال: إجازة مرضية'
                          : selectedType === 'teacher_late'
                            ? 'مثال: تأخر بسبب ظرف طارئ'
                            : selectedType === 'lesson_cancelled'
                              ? 'مثال: سفر المعلم'
                              : 'اكتب سبب الحالة'
                    }
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    ملاحظات إضافية
                  </label>

                  <textarea
                    value={note}
                    onChange={(event) =>
                      setNote(event.target.value)
                    }
                    placeholder="أضف أي تفاصيل أو ملاحظات إضافية..."
                    rows={5}
                    className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none"
                  />
                </div>

                {(selectedType === 'day_cancelled' ||
                  selectedType === 'lesson_cancelled') && (
                  <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                    <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-600" />

                    <p className="text-sm leading-6 text-muted-foreground">
                      {selectedType === 'day_cancelled'
                        ? 'عند تسجيل إلغاء اليوم، سيتم حذف سجلات الحضور المسجلة لهذا اليوم في هذه الدورة، ولن يدخل اليوم ضمن الأيام الفعلية المستخدمة لحساب نسبة الحضور.'
                        : 'عند تسجيل إلغاء الدرس، سيتم تسجيل إلغاء المعلم المحدد فقط، ولن يتم حذف حضور بقية المعلمين.'}
                    </p>
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 flex gap-3 border-t bg-background p-6">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSaving || !selectedCourseId}
                >
                  <CheckCircle2 className="size-4" />

                  {isSaving
                    ? 'جاري الحفظ...'
                    : editingRecordId
                      ? 'حفظ التعديلات'
                      : 'حفظ السجل'}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={closeForm}
                  disabled={isSaving}
                >
                  إلغاء
                </Button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </div>
  )
}

// ==========================================
// Action Card
// ==========================================

function ActionCard({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: LucideIcon
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-right"
    >
      <Card className="h-full transition-colors hover:border-primary/40">
        <CardContent className="p-5">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-5" />
          </span>

          <h3 className="mt-4 font-semibold">
            {title}
          </h3>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </CardContent>
      </Card>
    </button>
  )
}

// ==========================================
// Permission Row
// ==========================================

function PermissionRow({
  icon: Icon,
  title,
  description,
  enabled,
  disabled,
  onChange,
}: {
  icon: LucideIcon
  title: string
  description: string
  enabled: boolean
  disabled: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>

        <div>
          <p className="font-medium">
            {title}
          </p>

          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={disabled}
        onClick={() => onChange(!enabled)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          enabled
            ? 'bg-primary'
            : 'bg-muted-foreground/30'
        }`}
      >
        <span
          className={`absolute top-1 size-5 rounded-full bg-white shadow-sm transition-all ${
            enabled ? 'right-1' : 'right-6'
          }`}
        />
      </button>
    </div>
  )
}
