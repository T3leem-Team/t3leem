
'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  Copy,
  ExternalLink,
  Save,
  Loader2,
  MessageCircle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'

import type { Course } from './communication-data'

import {
  loadAdminLessonReminderTemplate,
  saveAdminLessonReminderTemplate,
  loadCommunicationGroup,
} from '@/lib/features/communication/repositories/communication-mutations.repository'

type CommunicationRemindersProps = {
  courses: Course[]
  loading: boolean
}

const DEFAULT_REMINDER =
  'نذكّركم بأن اليوم توجد دروس مقررة، وننتظركم على خير. حياكم الله جميعاً.'

function getBahrainToday() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bahrain',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  return `${year}-${month}-${day}`
}

function normalizeDay(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^يوم\s*/, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/[\u064B-\u065F\u0670]/g, '')
}

function getWeekdayIndex(date: string) {
  return new Date(`${date}T12:00:00+03:00`).getUTCDay()
}

function courseHasToday(course: Course, today: string) {
  const startDate = course.startDate?.slice(0, 10) ?? null
  const endDate = course.endDate?.slice(0, 10) ?? null

  if (startDate && today < startDate) {
    return false
  }

  if (endDate && today > endDate) {
    return false
  }

  if (!Array.isArray(course.days) || course.days.length === 0) {
    return false
  }

  const weekdayNames: Record<string, number> = {
    الاحد: 0,
    الأحد: 0,
    sunday: 0,

    الاثنين: 1,
    الإثنين: 1,
    monday: 1,

    الثلاثاء: 2,
    tuesday: 2,

    الاربعاء: 3,
    الأربعاء: 3,
    wednesday: 3,

    الخميس: 4,
    thursday: 4,

    الجمعة: 5,
    friday: 5,

    السبت: 6,
    saturday: 6,
  }

  const todayIndex = getWeekdayIndex(today)

  return course.days.some((day) => {
    if (typeof day !== 'string') {
      return false
    }

    const normalized = normalizeDay(day)
    const dayIndex = weekdayNames[normalized]

    return dayIndex === todayIndex
  })
}

export function CommunicationReminders({
  courses,
  loading,
}: CommunicationRemindersProps) {
  const today = useMemo(() => getBahrainToday(), [])

  const [message, setMessage] = useState(DEFAULT_REMINDER)
  const [groupUrl, setGroupUrl] = useState('')
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusError, setStatusError] = useState(false)

  const scheduledCourses = useMemo(
    () => courses.filter((course) => courseHasToday(course, today)),
    [courses, today]
  )

  const hasLessonsToday = scheduledCourses.length > 0

  useEffect(() => {
    let cancelled = false

    async function loadSettings() {
      setLoadingSettings(true)

      try {
        const [templateResult, groupResult] = await Promise.all([
          loadAdminLessonReminderTemplate(),
          loadCommunicationGroup(),
        ])

        if (cancelled) return

        if (templateResult.error) {
          console.error(
            'Load lesson reminder template error:',
            templateResult.error
          )
        } else if (templateResult.data?.content) {
          setMessage(templateResult.data.content)
        }

        if (groupResult.error) {
          console.error(
            'Load communication group error:',
            groupResult.error
          )
        } else {
          setGroupUrl(groupResult.data?.whatsapp_url ?? '')
        }
      } catch (error) {
        console.error('Load reminder settings error:', error)
      } finally {
        if (!cancelled) {
          setLoadingSettings(false)
        }
      }
    }

    void loadSettings()

    return () => {
      cancelled = true
    }
  }, [])

  const saveMessage = async () => {
    if (!message.trim()) {
      setStatusError(true)
      setStatusMessage('اكتب نص التذكير أولاً.')
      return
    }

    setSaving(true)
    setStatusMessage('')
    setStatusError(false)

    try {
      const { error } = await saveAdminLessonReminderTemplate(
        message.trim()
      )

      if (error) {
        console.error('Save reminder error:', error)
        setStatusError(true)
        setStatusMessage('تعذر حفظ التذكير. حاول مرة أخرى.')
        return
      }

      setMessage(message.trim())
      setEditing(false)
      setStatusMessage('تم حفظ رسالة التذكير بنجاح.')
    } catch (error) {
      console.error('Save reminder error:', error)
      setStatusError(true)
      setStatusMessage('حدث خطأ أثناء حفظ التذكير.')
    } finally {
      setSaving(false)
    }
  }

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message)

      setStatusError(false)
      setStatusMessage('تم نسخ رسالة التذكير.')
    } catch (error) {
      console.error('Copy reminder error:', error)
      setStatusError(true)
      setStatusMessage('تعذر النسخ. يمكنك تحديد النص ونسخه يدوياً.')
    }
  }

  const openWhatsAppGroup = async () => {
    if (!groupUrl) {
      setStatusError(true)
      setStatusMessage('رابط مجموعة WhatsApp غير محفوظ.')
      return
    }

    if (!message.trim()) {
      setStatusError(true)
      setStatusMessage('اكتب نص التذكير أولاً.')
      return
    }

    window.open(groupUrl, '_blank', 'noopener,noreferrer')

    try {
      await navigator.clipboard.writeText(message)

      setStatusError(false)
      setStatusMessage(
        'تم نسخ التذكير وفتح رابط المجموعة. الصق الرسالة داخل المجموعة وأرسلها.'
      )
    } catch (error) {
      console.error('Copy reminder error:', error)
      setStatusError(true)
      setStatusMessage(
        'تم فتح المجموعة، لكن تعذر نسخ الرسالة. انسخها يدوياً.'
      )
    }
  }

  if (loading || loadingSettings) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-xl border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          جاري تحميل بيانات التذكير...
        </div>
      </div>
    )
  }

  if (!hasLessonsToday) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center">
        <CalendarDays className="mx-auto mb-3 size-10 text-muted-foreground" />

        <h3 className="font-semibold">
          لا توجد دروس مقررة اليوم
        </h3>

        <p className="mt-2 text-sm text-muted-foreground">
          لن يظهر تذكير للمجموعة لعدم وجود مقرر يطابق يوم وتاريخ اليوم.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
              <CalendarDays className="size-6" />
            </div>

            <div>
              <h2 className="font-semibold">
                تذكير الدروس اليوم
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                توجد دروس مقررة لهذا اليوم.
              </p>
            </div>
          </div>

          <div className="rounded-full bg-green-500/10 px-3 py-1 text-sm font-medium text-green-700 dark:text-green-400">
            {scheduledCourses.length} مقرر
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">
              رسالة التذكير
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              هذه الرسالة عامة، ولا تعرض أسماء المقررات أو أوقاتها.
            </p>
          </div>

          {!editing && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setEditing(true)
                setStatusMessage('')
              }}
            >
              تعديل الرسالة
            </Button>
          )}
        </div>

        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          readOnly={!editing}
          rows={5}
          className="w-full resize-y rounded-lg border bg-background p-4 text-sm leading-7 outline-none focus-visible:ring-2 focus-visible:ring-ring read-only:bg-muted/30"
        />

        {editing && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={saveMessage}
              disabled={saving || !message.trim()}
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}

              حفظ الرسالة
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => {
                setEditing(false)
                setStatusMessage('')
              }}
            >
              إلغاء
            </Button>
          </div>
        )}

        {statusMessage && (
          <div
            className={`rounded-lg border p-3 text-sm ${
              statusError
                ? 'border-destructive/30 text-destructive'
                : 'border-green-500/30 text-green-700 dark:text-green-400'
            }`}
          >
            {statusMessage}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={copyMessage}
          disabled={editing || !message.trim()}
        >
          <Copy className="size-4" />
          نسخ التذكير
        </Button>

        <Button
          type="button"
          onClick={openWhatsAppGroup}
          disabled={editing || !groupUrl || !message.trim()}
        >
          <MessageCircle className="size-4" />
          <ExternalLink className="size-4" />
          إرسال للمجموعة
        </Button>
      </div>

      {!groupUrl && (
        <p className="text-sm text-muted-foreground">
          لم يتم العثور على رابط مجموعة WhatsApp المحفوظ.
          أضف رابط المجموعة من تبويب التواصل الجماعي.
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        عند الضغط على إرسال للمجموعة، سيتم نسخ الرسالة وفتح رابط المجموعة.
        الصق الرسالة داخل WhatsApp ثم أرسلها يدوياً.
      </p>
    </div>
  )
}
