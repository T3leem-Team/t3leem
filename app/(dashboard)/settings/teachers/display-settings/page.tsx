
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import {
  ArrowRight,
  Check,
  Eye,
  Layers3,
  Plus,
  Settings2,
  Trash2,
  UserRound,
} from 'lucide-react'

import { PageHeader } from '@/components/dashboard/page-header'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'

import {
  loadTeacherDisplaySettings,
  saveTeacherDisplaySettings,
  type TeacherDisplayMode,
  type TeacherLevelAlias,
  type TeacherCustomAlias,
} from '@/lib/features/settings/repositories/teacher-settings.repository'

import {
  loadTeacherDisplayOptions,
} from '@/lib/features/teachers/repositories/teachers.repository'

type Level = {
  id: string
  name: string
  sort_order: number
}

type Teacher = {
  id: string
  name: string
}

export default function TeacherDisplaySettingsPage() {
  const router = useRouter()

  const [displayMode, setDisplayMode] =
    useState<TeacherDisplayMode>('original')

  const [aliases, setAliases] =
    useState<TeacherLevelAlias[]>([])

  const [teacherAliases, setTeacherAliases] =
    useState<TeacherCustomAlias[]>([])

  const [levels, setLevels] = useState<Level[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])

  const [newAliasName, setNewAliasName] = useState('')
  const [selectedLevels, setSelectedLevels] =
    useState<string[]>([])

  const [selectedTeacher, setSelectedTeacher] = useState('')
  const [teacherDisplayName, setTeacherDisplayName] =
    useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusType, setStatusType] =
    useState<'success' | 'error' | 'info'>('info')

  const levelMap = useMemo(
    () => new Map(levels.map((level) => [level.id, level.name])),
    [levels],
  )

  const teacherMap = useMemo(
    () => new Map(teachers.map((teacher) => [teacher.id, teacher.name])),
    [teachers],
  )

  // تحميل الإعدادات والبيانات الفعلية
  useEffect(() => {
    let active = true

    async function loadData() {
      setLoading(true)
      setStatusMessage('')

      try {
        const [
          settingsResult,
          options,
        ] = await Promise.all([
          loadTeacherDisplaySettings(),
          loadTeacherDisplayOptions(),
        ])

        if (settingsResult.error) {
          throw new Error(settingsResult.error.message)
        }

        if (!active) return

        const settings = settingsResult.data

        setLevels(options.levels ?? [])
        setTeachers(options.teachers ?? [])

        if (settings) {
          setDisplayMode(
            settings.display_mode as TeacherDisplayMode,
          )

          setAliases(
            Array.isArray(settings.level_aliases)
              ? settings.level_aliases as unknown as TeacherLevelAlias[]
              : [],
          )

          setTeacherAliases(
            Array.isArray(settings.teacher_aliases)
              ? settings.teacher_aliases as unknown as TeacherCustomAlias[]
              : [],
          )
        }
      } catch (error) {
        if (!active) return

        setStatusType('error')
        setStatusMessage(
          error instanceof Error
            ? error.message
            : 'حدث خطأ أثناء تحميل الإعدادات.',
        )
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      active = false
    }
  }, [])

  const showStatus = (
    message: string,
    type: 'success' | 'error' | 'info' = 'info',
  ) => {
    setStatusMessage(message)
    setStatusType(type)
  }

  const toggleLevel = (levelId: string) => {
    setSelectedLevels((current) =>
      current.includes(levelId)
        ? current.filter((item) => item !== levelId)
        : [...current, levelId],
    )
  }

  // إضافة اسم مختصر
  const addAlias = () => {
    const name = newAliasName.trim()

    if (!name) {
      showStatus('يرجى إدخال اسم مختصر.', 'error')
      return
    }

    if (selectedLevels.length === 0) {
      showStatus('اختر مستوى واحداً على الأقل.', 'error')
      return
    }

    if (
      aliases.some(
        (alias) => alias.name.trim() === name,
      )
    ) {
      showStatus('هذا الاسم المختصر موجود بالفعل.', 'error')
      return
    }

    setAliases((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name,
        levels: [...selectedLevels],
      },
    ])

    setNewAliasName('')
    setSelectedLevels([])

    showStatus('تمت إضافة الاسم المختصر.', 'success')
  }

  const deleteAlias = (id: string) => {
    setAliases((current) =>
      current.filter((item) => item.id !== id),
    )
  }

  // إضافة اسم مخصص لمعلم
  const addTeacherAlias = () => {
    const name = teacherDisplayName.trim()

    if (!selectedTeacher || !name) {
      showStatus('اختر معلماً واكتب الاسم المطلوب.', 'error')
      return
    }

    setTeacherAliases((current) => [
      ...current.filter(
        (item) => item.teacherId !== selectedTeacher,
      ),
      {
        id: crypto.randomUUID(),
        teacherId: selectedTeacher,
        displayName: name,
      },
    ])

    setSelectedTeacher('')
    setTeacherDisplayName('')

    showStatus('تم تحديث الاسم المخصص للمعلم.', 'success')
  }

  const deleteTeacherAlias = (id: string) => {
    setTeacherAliases((current) =>
      current.filter((item) => item.id !== id),
    )
  }

  // حفظ الإعدادات في Supabase
  const handleSave = async () => {
    if (loading || saving) return

    setSaving(true)
    showStatus('جارٍ حفظ الإعدادات...', 'info')

    try {
      const { error } = await saveTeacherDisplaySettings({
        display_mode: displayMode,
        level_aliases: aliases,
        teacher_aliases: teacherAliases,
      })

      if (error) {
        throw new Error(error.message)
      }

      showStatus('تم حفظ إعدادات عرض المعلمين بنجاح.', 'success')
    } catch (error) {
      showStatus(
        error instanceof Error
          ? error.message
          : 'تعذر حفظ الإعدادات.',
        'error',
      )
    } finally {
      setSaving(false)
    }
  }

  const previewTeacher = teachers[0]
  const previewTeacherAlias = teacherAliases.find(
    (item) => item.teacherId === previewTeacher?.id,
  )

  return (
    <div className="space-y-6 pb-8">
      <div className="flex justify-start">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          <ArrowRight className="size-4" />
          عودة
        </button>
      </div>

      <PageHeader
        title="ضبط صفحة المعلمين"
        description="تخصيص طريقة عرض المستويات والأسماء في صفحة المعلمين."
      />

      {statusMessage && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            statusType === 'error'
              ? 'border-destructive/30 bg-destructive/5 text-destructive'
              : statusType === 'success'
                ? 'border-green-600/20 bg-green-600/5 text-green-700'
                : 'bg-muted/30'
          }`}
        >
          {statusMessage}
        </div>
      )}

      {loading ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            جارٍ تحميل إعدادات عرض المعلمين...
          </CardContent>
        </Card>
      ) : (
        <>
          {/* طريقة العرض */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Eye className="size-5 text-primary" />
                طريقة عرض المستويات
              </CardTitle>

              <p className="text-sm text-muted-foreground">
                اختر كيف تريد ظهور المستويات بجانب أسماء المعلمين.
                ترتيب المعلمين يبقى حسب التسلسل الدراسي.
              </p>
            </CardHeader>

            <CardContent className="space-y-3">
              {[
                {
                  value: 'original',
                  title: 'أسماء المستويات الأصلية',
                  description:
                    'عرض أسماء المستويات كما هي في النظام.',
                },
                {
                  value: 'short',
                  title: 'أسماء مختصرة حسب المستوى',
                  description:
                    'إنشاء أسماء مختصرة وربط كل اسم بالمستويات التي تختارها.',
                },
                {
                  value: 'teacher',
                  title: 'اسم مخصص لكل معلم',
                  description:
                    'اختيار اسم مستقل لكل معلم، بغض النظر عن مستوياته.',
                },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setDisplayMode(
                      option.value as TeacherDisplayMode,
                    )
                  }
                  className={`flex w-full items-start gap-3 rounded-xl border p-4 text-right transition ${
                    displayMode === option.value
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'hover:bg-muted/40'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border ${
                      displayMode === option.value
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted-foreground/40'
                    }`}
                  >
                    {displayMode === option.value && (
                      <Check className="size-3" />
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">
                      {option.title}
                    </span>

                    <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* الأسماء المختصرة */}
          {displayMode === 'short' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Layers3 className="size-5 text-primary" />
                  إدارة الأسماء المختصرة
                </CardTitle>

                <p className="text-sm text-muted-foreground">
                  أنشئ اسماً مختصراً واربط به أي مستويات دراسية تريدها.
                  إذا كان المعلم يدرّس أكثر من مستوى مرتبط بالاسم نفسه،
                  سيظهر الاسم مرة واحدة فقط.
                </p>
              </CardHeader>

              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    الاسم المختصر
                  </label>

                  <input
                    value={newAliasName}
                    onChange={(event) =>
                      setNewAliasName(event.target.value)
                    }
                    placeholder="مثال: المرحلة المتقدمة"
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      اختر المستويات التابعة للاسم
                    </label>

                    <span className="text-xs text-muted-foreground">
                      تم اختيار {selectedLevels.length}
                    </span>
                  </div>

                  {levels.length === 0 ? (
                    <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      لا توجد مستويات دراسية نشطة.
                    </p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {levels.map((level) => (
                        <label
                          key={level.id}
                          className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition ${
                            selectedLevels.includes(level.id)
                              ? 'border-primary bg-primary/5'
                              : 'hover:bg-muted/40'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedLevels.includes(level.id)}
                            onChange={() => toggleLevel(level.id)}
                            className="size-4 accent-primary"
                          />

                          {level.name}
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  type="button"
                  onClick={addAlias}
                  disabled={
                    !newAliasName.trim() ||
                    selectedLevels.length === 0
                  }
                >
                  <Plus className="size-4" />
                  إضافة الاسم المختصر
                </Button>

                <div className="space-y-3 border-t pt-5">
                  <h3 className="font-semibold">
                    الأسماء المختصرة الحالية
                  </h3>

                  {aliases.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      لم تتم إضافة أسماء مختصرة بعد.
                    </p>
                  ) : (
                    aliases.map((alias) => (
                      <div
                        key={alias.id}
                        className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">
                            {alias.name}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-2">
                            {alias.levels.map((levelId) => (
                              <span
                                key={levelId}
                                className="rounded-md bg-muted px-2.5 py-1 text-xs"
                              >
                                {levelMap.get(levelId) ?? 'مستوى غير موجود'}
                              </span>
                            ))}
                          </div>
                        </div>

                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={() => deleteAlias(alias.id)}
                          aria-label={`حذف ${alias.name}`}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* الاسم المخصص لكل معلم */}
          {displayMode === 'teacher' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserRound className="size-5 text-primary" />
                  الأسماء المخصصة للمعلمين
                </CardTitle>

                <p className="text-sm text-muted-foreground">
                  القائمة تعرض المعلمين النشطين المرتبطين بالمقرر الحالي
                  فقط.
                </p>
              </CardHeader>

              <CardContent className="space-y-4">
                {teachers.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    لا يوجد معلمون نشطون مرتبطون بالمقرر الحالي.
                  </p>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          اسم المعلم
                        </label>

                        <select
                          value={selectedTeacher}
                          onChange={(event) =>
                            setSelectedTeacher(event.target.value)
                          }
                          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        >
                          <option value="">
                            اختر معلماً
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
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          الاسم الذي سيظهر
                        </label>

                        <input
                          value={teacherDisplayName}
                          onChange={(event) =>
                            setTeacherDisplayName(event.target.value)
                          }
                          placeholder="مثال: قسم المتقدمين"
                          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        />
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={addTeacherAlias}
                      disabled={
                        !selectedTeacher ||
                        !teacherDisplayName.trim()
                      }
                    >
                      <Plus className="size-4" />
                      إضافة الاسم المخصص
                    </Button>
                  </>
                )}

                {teacherAliases.length > 0 && (
                  <div className="space-y-2 border-t pt-4">
                    <h3 className="font-semibold">
                      الأسماء المخصصة الحالية
                    </h3>

                    {teacherAliases.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 rounded-lg border p-3"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {item.displayName}
                          </p>

                          <p className="text-xs text-muted-foreground">
                            {teacherMap.get(item.teacherId) ??
                              'معلم غير موجود ضمن المقرر الحالي'}
                          </p>
                        </div>

                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={() =>
                            deleteTeacherAlias(item.id)
                          }
                          aria-label="حذف الاسم المخصص"
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* المعاينة */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings2 className="size-5 text-primary" />
                معاينة طريقة العرض
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="rounded-lg border bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground">
                  مثال على ما سيظهر في صفحة المعلمين
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="font-semibold">
                    {previewTeacher?.name ?? 'لا يوجد معلم'}
                  </span>

                  <span className="text-muted-foreground">—</span>

                  {displayMode === 'original' && (
                    <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs text-primary">
                      أسماء المستويات الأصلية
                    </span>
                  )}

                  {displayMode === 'short' && (
                    aliases.length > 0 ? (
                      aliases.map((alias) => (
                        <span
                          key={alias.id}
                          className="rounded-md bg-primary/10 px-2.5 py-1 text-xs text-primary"
                        >
                          {alias.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        أضف اسماً مختصراً لمعاينته.
                      </span>
                    )
                  )}

                  {displayMode === 'teacher' && (
                    <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs text-primary">
                      {previewTeacherAlias?.displayName ??
                        'لم يتم تحديد اسم مخصص لهذا المعلم'}
                    </span>
                  )}
                </div>

                <p className="mt-3 text-xs text-muted-foreground">
                  هذه معاينة للإعدادات، وسيتم تطبيق العرض الفعلي
                  على قائمة المعلمين بعد ربطها بهذه الإعدادات.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* الحفظ */}
          <div className="flex flex-wrap justify-start gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={saving}
            >
              إلغاء
            </Button>

            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
            >
              <Check className="size-4" />
              {saving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
