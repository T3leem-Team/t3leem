
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import {
  ArrowRight,
  Check,
  ChevronDown,
  Eye,
  Layers3,
  Plus,
  Settings2,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'

import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type DisplayMode =
  | 'original'
  | 'short'
  | 'teacher'

type LevelAlias = {
  id: string
  name: string
  levels: string[]
}

type TeacherAlias = {
  id: string
  teacherName: string
  displayName: string
}

const initialLevels = [
  'الأول ابتدائي',
  'الثاني ابتدائي',
  'الثالث ابتدائي',
  'الرابع ابتدائي',
  'الخامس ابتدائي',
  'السادس ابتدائي',
  'الأول إعدادي',
  'الثاني إعدادي',
  'الثالث إعدادي',
  'الأول ثانوي',
  'الثاني ثانوي',
  'الثالث ثانوي',
]

const initialAliases: LevelAlias[] = [
  {
    id: '1',
    name: 'ابتدائي',
    levels: [
      'الأول ابتدائي',
      'الثاني ابتدائي',
      'الثالث ابتدائي',
      'الرابع ابتدائي',
      'الخامس ابتدائي',
      'السادس ابتدائي',
    ],
  },
  {
    id: '2',
    name: 'إعدادي',
    levels: [
      'الأول إعدادي',
      'الثاني إعدادي',
      'الثالث إعدادي',
    ],
  },
  {
    id: '3',
    name: 'ثانوي',
    levels: [
      'الأول ثانوي',
      'الثاني ثانوي',
      'الثالث ثانوي',
    ],
  },
]

export default function TeacherDisplaySettingsPage() {
  const router = useRouter()

  const [displayMode, setDisplayMode] =
    useState<DisplayMode>('original')

  const [aliases, setAliases] =
    useState<LevelAlias[]>(initialAliases)

  const [teacherAliases, setTeacherAliases] =
    useState<TeacherAlias[]>([])

  const [newAliasName, setNewAliasName] = useState('')
  const [selectedLevels, setSelectedLevels] =
    useState<string[]>([])

  const [selectedTeacher, setSelectedTeacher] =
    useState('')

  const [teacherDisplayName, setTeacherDisplayName] =
    useState('')

  const [statusMessage, setStatusMessage] = useState('')

  const toggleLevel = (level: string) => {
    setSelectedLevels((current) =>
      current.includes(level)
        ? current.filter((item) => item !== level)
        : [...current, level]
    )
  }

  const addAlias = () => {
    const name = newAliasName.trim()

    if (!name) {
      setStatusMessage('يرجى إدخال اسم مختصر.')
      return
    }

    if (selectedLevels.length === 0) {
      setStatusMessage('اختر مستوى واحداً على الأقل.')
      return
    }

    setAliases((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name,
        levels: selectedLevels,
      },
    ])

    setNewAliasName('')
    setSelectedLevels([])
    setStatusMessage('تمت إضافة الاسم المختصر إلى القائمة.')
  }

  const deleteAlias = (id: string) => {
    setAliases((current) =>
      current.filter((item) => item.id !== id)
    )
  }

  const addTeacherAlias = () => {
    const name = teacherDisplayName.trim()

    if (!selectedTeacher || !name) {
      setStatusMessage('اختر معلماً واكتب الاسم المطلوب.')
      return
    }

    setTeacherAliases((current) => [
      ...current.filter(
        (item) => item.teacherName !== selectedTeacher
      ),
      {
        id: crypto.randomUUID(),
        teacherName: selectedTeacher,
        displayName: name,
      },
    ])

    setSelectedTeacher('')
    setTeacherDisplayName('')
    setStatusMessage('تم تحديث الاسم المخصص للمعلم.')
  }

  const deleteTeacherAlias = (id: string) => {
    setTeacherAliases((current) =>
      current.filter((item) => item.id !== id)
    )
  }

  const handleSave = () => {
    setStatusMessage(
      'تم تجهيز الإعدادات للمعاينة. الحفظ الدائم في قاعدة البيانات سنضيفه في الخطوة التالية.'
    )
  }

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
        <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
          {statusMessage}
        </div>
      )}

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
                'عرض أسماء المستويات كما هي، مثل الأول إعدادي والثاني إعدادي.',
            },
            {
              value: 'short',
              title: 'أسماء مختصرة حسب المستوى',
              description:
                'استخدام أسماء مختصرة تقوم بإنشائها وربطها بالمستويات التي تختارها.',
            },
            {
              value: 'teacher',
              title: 'اسم مخصص لكل معلم',
              description:
                'عرض اسم تختاره بشكل مستقل لكل معلم، بدلاً من أسماء مستوياته.',
            },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() =>
                setDisplayMode(option.value as DisplayMode)
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
              لا توجد قيود على اختيار المستويات.
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
                placeholder="مثال: المرحلة المتوسطة"
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

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {initialLevels.map((level) => (
                  <label
                    key={level}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition ${
                      selectedLevels.includes(level)
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/40'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedLevels.includes(level)}
                      onChange={() => toggleLevel(level)}
                      className="size-4 accent-primary"
                    />

                    {level}
                  </label>
                ))}
              </div>
            </div>

            <Button
              type="button"
              onClick={addAlias}
              disabled={!newAliasName.trim() || selectedLevels.length === 0}
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
                        {alias.levels.map((level) => (
                          <span
                            key={level}
                            className="rounded-md bg-muted px-2.5 py-1 text-xs"
                          >
                            {level}
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
              اختر المعلم واكتب الاسم الذي تريد ظهوره في صفحة المعلمين،
              بغض النظر عن المستويات التي يدرّسها.
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
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

                  <option value="teacher-1">
                    المعلم الأول (مثال مؤقت)
                  </option>

                  <option value="teacher-2">
                    المعلم الثاني (مثال مؤقت)
                  </option>
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
              disabled={!selectedTeacher || !teacherDisplayName.trim()}
            >
              <Plus className="size-4" />
              إضافة الاسم المخصص
            </Button>

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
                        {item.teacherName}
                      </p>
                    </div>

                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => deleteTeacherAlias(item.id)}
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

      {/* معاينة */}
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
                أ. أحمد محمد
              </span>

              <span className="text-muted-foreground">—</span>

              {displayMode === 'original' && (
                <>
                  <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs text-primary">
                    الثالث إعدادي
                  </span>

                  <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs text-primary">
                    الأول ثانوي
                  </span>
                </>
              )}

              {displayMode === 'short' && (
                <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs text-primary">
                  {aliases[0]?.name ?? 'الاسم المختصر'}
                </span>
              )}

              {displayMode === 'teacher' && (
                <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs text-primary">
                  قسم المتقدمين
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* الحفظ */}
      <div className="flex flex-wrap justify-start gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          إلغاء
        </Button>

        <Button
          type="button"
          onClick={handleSave}
        >
          <Check className="size-4" />
          حفظ الإعدادات
        </Button>
      </div>
    </div>
  )
}
