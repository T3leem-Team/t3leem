
'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  Copy,
  ExternalLink,
  Save,
  Loader2,
  MessageCircle,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronLeft,
  X,
  Link as LinkIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { Course } from './communication-data'

import {
  loadAdminLessonReminderTemplate,
  loadAdminLessonReminderMessages,
  createAdminLessonReminderMessage,
  updateAdminLessonReminderMessage,
  deleteAdminLessonReminderMessage,
  loadAdminLessonReminderGroupUrl,
  saveAdminLessonReminderGroupUrl,
} from '@/lib/features/communication/repositories/communication-mutations.repository'

type CommunicationRemindersProps = {
  courses: Course[]
  loading: boolean
}

type ReminderMessage = {
  id: string
  name: string
  content: string
  created_at: string | null
  updated_at: string | null
}

const MESSAGE_PREFIX =
  '__ADMIN_DAILY_LESSON_REMINDER_MESSAGE__:'

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

  if (startDate && today < startDate) return false
  if (endDate && today > endDate) return false

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
    if (typeof day !== 'string') return false

    const normalized = normalizeDay(day)
    const dayIndex = weekdayNames[normalized]

    return dayIndex === todayIndex
  })
}

function getMessageTitle(name: string) {
  return name.startsWith(MESSAGE_PREFIX)
    ? name.slice(MESSAGE_PREFIX.length)
    : 'تذكير الدروس'
}

export function CommunicationReminders({
  courses,
  loading,
}: CommunicationRemindersProps) {
  const today = useMemo(() => getBahrainToday(), [])

  const [messages, setMessages] = useState<ReminderMessage[]>([])
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null,
  )

  const [groupUrl, setGroupUrl] = useState('')
  const [groupUrlInput, setGroupUrlInput] = useState('')

  const [messageTitle, setMessageTitle] = useState('')
  const [messageContent, setMessageContent] = useState('')

  const [loadingSettings, setLoadingSettings] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingGroupUrl, setSavingGroupUrl] = useState(false)

  const [editing, setEditing] = useState(false)
  const [creating, setCreating] = useState(false)

  const [statusMessage, setStatusMessage] = useState('')
  const [statusError, setStatusError] = useState(false)

  const scheduledCourses = useMemo(
    () => courses.filter((course) => courseHasToday(course, today)),
    [courses, today],
  )

  const hasLessonsToday = scheduledCourses.length > 0

  const selectedMessage = messages.find(
    (message) => message.id === selectedMessageId,
  ) ?? null

  const setStatus = (message: string, isError = false) => {
    setStatusMessage(message)
    setStatusError(isError)
  }

  useEffect(() => {
    let cancelled = false

    async function loadSettings() {
      setLoadingSettings(true)

      try {
        const [
          messagesResult,
          legacyResult,
          groupResult,
        ] = await Promise.all([
          loadAdminLessonReminderMessages(),
          loadAdminLessonReminderTemplate(),
          loadAdminLessonReminderGroupUrl(),
        ])

        if (cancelled) return

        if (messagesResult.error) {
          console.error(
            'Load reminder messages error:',
            messagesResult.error,
          )
          setStatus('تعذر تحميل الرسائل المحفوظة.', true)
        } else {
          const loadedMessages: ReminderMessage[] =
            (messagesResult.data ?? []).map((item) => ({
              id: item.id,
              name: item.name,
              content: item.content,
              created_at: item.created_at,
              updated_at: item.updated_at,
            }))

          // Keep the previous single reminder available if no new messages exist.
          if (
            loadedMessages.length === 0 &&
            !legacyResult.error &&
            legacyResult.data
          ) {
            loadedMessages.push({
              id: legacyResult.data.id,
              name: legacyResult.data.name,
              content: legacyResult.data.content,
              created_at: legacyResult.data.created_at,
              updated_at: legacyResult.data.updated_at,
            })
          }

          setMessages(loadedMessages)
        }

        if (legacyResult.error) {
          console.error(
            'Load legacy reminder error:',
            legacyResult.error,
          )
        }

        if (groupResult.error) {
          console.error(
            'Load reminder group URL error:',
            groupResult.error,
          )
        } else {
          const savedUrl = groupResult.data?.content ?? ''
          setGroupUrl(savedUrl)
          setGroupUrlInput(savedUrl)
        }
      } catch (error) {
        console.error('Load reminder settings error:', error)
        if (!cancelled) {
          setStatus('حدث خطأ أثناء تحميل إعدادات التذكير.', true)
        }
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

  const openMessage = (message: ReminderMessage) => {
    setSelectedMessageId(message.id)
    setMessageTitle(getMessageTitle(message.name))
    setMessageContent(message.content)
    setEditing(false)
    setCreating(false)
    setStatus('')
  }

  const startNewMessage = () => {
    setSelectedMessageId(null)
    setMessageTitle('')
    setMessageContent(DEFAULT_REMINDER)
    setEditing(true)
    setCreating(true)
    setStatus('')
  }

  const cancelMessageEditor = () => {
    setEditing(false)
    setCreating(false)
    setMessageTitle('')
    setMessageContent('')
    setSelectedMessageId(null)
    setStatus('')
  }

  const saveMessage = async () => {
    const title = messageTitle.trim()
    const content = messageContent.trim()

    if (!title) {
      setStatus('اكتب عنوان الرسالة أولاً.', true)
      return
    }

    if (!content) {
      setStatus('اكتب محتوى الرسالة أولاً.', true)
      return
    }

    setSaving(true)
    setStatus('')

    try {
      if (creating) {
        const { data, error } =
          await createAdminLessonReminderMessage({
            title,
            content,
          })

        if (error) {
          console.error('Create reminder message error:', error)
          setStatus('تعذر إنشاء الرسالة. حاول مرة أخرى.', true)
          return
        }

        if (!data) {
          setStatus('لم يتم استلام بيانات الرسالة الجديدة.', true)
          return
        }

        const newMessage: ReminderMessage = {
          id: data.id,
          name: data.name,
          content: data.content,
          created_at: data.created_at,
          updated_at: data.updated_at,
        }

        setMessages((previous) => [newMessage, ...previous])
        setSelectedMessageId(newMessage.id)
        setMessageTitle(title)
        setMessageContent(content)
        setCreating(false)
        setEditing(false)
        setStatus('تم إنشاء الرسالة وحفظها بنجاح.')
      } else {
        if (!selectedMessageId) {
          setStatus('اختر رسالة لتعديلها.', true)
          return
        }

        const { data, error } =
          await updateAdminLessonReminderMessage(
            selectedMessageId,
            {
              title,
              content,
            },
          )

        if (error) {
          console.error('Update reminder message error:', error)
          setStatus('تعذر تحديث الرسالة. حاول مرة أخرى.', true)
          return
        }

        if (!data) {
          setStatus('لم يتم استلام بيانات الرسالة المحدّثة.', true)
          return
        }

        const updatedMessage: ReminderMessage = {
          id: data.id,
          name: data.name,
          content: data.content,
          created_at: data.created_at,
          updated_at: data.updated_at,
        }

        setMessages((previous) =>
          previous.map((message) =>
            message.id === updatedMessage.id
              ? updatedMessage
              : message,
          ),
        )

        setMessageTitle(title)
        setMessageContent(content)
        setEditing(false)
        setStatus('تم تحديث الرسالة بنجاح.')
      }
    } catch (error) {
      console.error('Save reminder message error:', error)
      setStatus('حدث خطأ أثناء حفظ الرسالة.', true)
    } finally {
      setSaving(false)
    }
  }

  const removeMessage = async () => {
    if (!selectedMessageId || !selectedMessage) return

    const confirmed = window.confirm(
      `هل أنت متأكد من حذف رسالة "${getMessageTitle(selectedMessage.name)}"؟`,
    )

    if (!confirmed) return

    setSaving(true)
    setStatus('')

    try {
      const { error } = await deleteAdminLessonReminderMessage(
        selectedMessageId,
      )

      if (error) {
        console.error('Delete reminder message error:', error)
        setStatus('تعذر حذف الرسالة.', true)
        return
      }

      setMessages((previous) =>
        previous.filter((message) => message.id !== selectedMessageId),
      )

      setSelectedMessageId(null)
      setMessageTitle('')
      setMessageContent('')
      setEditing(false)
      setCreating(false)

      setStatus('تم حذف الرسالة بنجاح.')
    } catch (error) {
      console.error('Delete reminder message error:', error)
      setStatus('حدث خطأ أثناء حذف الرسالة.', true)
    } finally {
      setSaving(false)
    }
  }

  const saveGroupUrl = async () => {
    const url = groupUrlInput.trim()

    if (!url) {
      setStatus('أدخل رابط مجموعة WhatsApp أولاً.', true)
      return
    }

    try {
      const parsedUrl = new URL(url)

      if (
        parsedUrl.protocol !== 'https:' ||
        !parsedUrl.hostname
      ) {
        setStatus('أدخل رابط WhatsApp صحيحاً يبدأ بـ https.', true)
        return
      }
    } catch {
      setStatus('صيغة رابط المجموعة غير صحيحة.', true)
      return
    }

    setSavingGroupUrl(true)
    setStatus('')

    try {
      const { data, error } =
        await saveAdminLessonReminderGroupUrl(url)

      if (error) {
        console.error('Save reminder group URL error:', error)
        setStatus('تعذر حفظ رابط المجموعة.', true)
        return
      }

      if (!data) {
        setStatus('لم يتم تأكيد حفظ رابط المجموعة.', true)
        return
      }

      setGroupUrl(data.content ?? url)
      setGroupUrlInput(data.content ?? url)
      setStatus('تم حفظ رابط مجموعة التذكير بنجاح.')
    } catch (error) {
      console.error('Save reminder group URL error:', error)
      setStatus('حدث خطأ أثناء حفظ رابط المجموعة.', true)
    } finally {
      setSavingGroupUrl(false)
    }
  }

  const copyMessage = async () => {
    if (!selectedMessage || !selectedMessage.content.trim()) {
      setStatus('اختر رسالة أولاً.', true)
      return
    }

    try {
      await navigator.clipboard.writeText(selectedMessage.content)

      setStatus('تم نسخ الرسالة بنجاح.')
    } catch (error) {
      console.error('Copy reminder error:', error)
      setStatus('تعذر النسخ. يمكنك تحديد النص ونسخه يدوياً.', true)
    }
  }

  const openWhatsAppGroup = async () => {
    if (!groupUrl) {
      setStatus('احفظ رابط مجموعة WhatsApp أولاً.', true)
      return
    }

    if (!selectedMessage || !selectedMessage.content.trim()) {
      setStatus('اختر رسالة التذكير أولاً.', true)
      return
    }

    // Open the group directly from the saved group invitation URL.
    const whatsappWindow = window.open(
      groupUrl,
      '_blank',
      'noopener,noreferrer',
    )

    try {
      await navigator.clipboard.writeText(selectedMessage.content)

      setStatus(
        whatsappWindow
          ? 'تم نسخ الرسالة وفتح المجموعة. الصق الرسالة داخل WhatsApp ثم أرسلها يدوياً.'
          : 'تم نسخ الرسالة، لكن المتصفح منع فتح المجموعة. افتح رابط المجموعة المحفوظ يدوياً.',
        !whatsappWindow,
      )
    } catch (error) {
      console.error('Copy reminder error:', error)

      setStatus(
        whatsappWindow
          ? 'تم فتح المجموعة، لكن تعذر نسخ الرسالة. انسخها يدوياً.'
          : 'تعذر النسخ وفتح المجموعة. حاول مرة أخرى.',
        true,
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
                تذكير الدروس
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                إدارة رسائل التذكير ورابط مجموعة WhatsApp.
              </p>
            </div>
          </div>

          {hasLessonsToday ? (
            <div className="rounded-full bg-green-500/10 px-3 py-1 text-sm font-medium text-green-700 dark:text-green-400">
              {scheduledCourses.length} مقرر اليوم
            </div>
          ) : (
            <div className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
              لا توجد دروس اليوم
            </div>
          )}
        </div>
      </div>

      {/* Independent WhatsApp group URL */}
      <div className="space-y-4 rounded-xl border bg-card p-5">
        <div className="flex items-center gap-2">
          <LinkIcon className="size-5 text-primary" />

          <div>
            <h3 className="font-semibold">
              رابط مجموعة التذكير
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              هذا الرابط مستقل عن رابط التواصل الجماعي.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="url"
            dir="ltr"
            value={groupUrlInput}
            onChange={(event) => setGroupUrlInput(event.target.value)}
            placeholder="https://chat.whatsapp.com/..."
            className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />

          <Button
            type="button"
            onClick={saveGroupUrl}
            disabled={
              savingGroupUrl ||
              !groupUrlInput.trim() ||
              groupUrlInput.trim() === groupUrl
            }
          >
            {savingGroupUrl ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            حفظ الرابط
          </Button>
        </div>

        {groupUrl && (
          <p className="text-xs text-muted-foreground" dir="ltr">
            {groupUrl}
          </p>
        )}
      </div>

      {!hasLessonsToday ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <CalendarDays className="mx-auto mb-3 size-10 text-muted-foreground" />

          <h3 className="font-semibold">
            لا توجد دروس مقررة اليوم
          </h3>

          <p className="mt-2 text-sm text-muted-foreground">
            لن تظهر رسائل التذكير أو خيارات الإرسال حتى يوجد مقرر يطابق يوم وتاريخ اليوم.
          </p>
        </div>
      ) : (
        <>
          {/* Saved message titles */}
          <div className="space-y-4 rounded-xl border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">
                  الرسائل المحفوظة
                </h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  اضغط على عنوان الرسالة لفتحها.
                </p>
              </div>

              <Button
                type="button"
                onClick={startNewMessage}
                disabled={editing || saving}
              >
                <Plus className="size-4" />
                رسالة جديدة
              </Button>
            </div>

            {messages.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                لا توجد رسائل محفوظة. أنشئ رسالة جديدة للبدء.
              </div>
            ) : (
              <div className="divide-y rounded-lg border">
                {messages.map((message) => {
                  const isSelected =
                    selectedMessageId === message.id

                  return (
                    <button
                      key={message.id}
                      type="button"
                      onClick={() => openMessage(message)}
                      className={`flex w-full items-center justify-between gap-3 p-4 text-right transition-colors hover:bg-muted/50 ${
                        isSelected ? 'bg-primary/5' : ''
                      }`}
                    >
                      <span className="min-w-0 truncate text-sm font-medium">
                        {getMessageTitle(message.name)}
                      </span>

                      {isSelected ? (
                        <ChevronDown className="size-4 shrink-0 text-primary" />
                      ) : (
                        <ChevronLeft className="size-4 shrink-0 text-muted-foreground" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Selected message / editor */}
          {(selectedMessage || creating) && (
            <div className="space-y-4 rounded-xl border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">
                    {creating
                      ? 'إنشاء رسالة جديدة'
                      : editing
                        ? 'تعديل الرسالة'
                        : messageTitle}
                  </h3>

                  <p className="mt-1 text-sm text-muted-foreground">
                    رسالة عامة للمجموعة، دون أسماء المقررات أو أوقاتها.
                  </p>
                </div>

                {!editing && selectedMessage && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditing(true)
                        setStatus('')
                      }}
                    >
                      <Pencil className="size-4" />
                      تعديل
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={removeMessage}
                      disabled={saving}
                    >
                      <Trash2 className="size-4" />
                      حذف
                    </Button>
                  </div>
                )}
              </div>

              {editing ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      عنوان الرسالة
                    </label>

                    <input
                      type="text"
                      value={messageTitle}
                      onChange={(event) =>
                        setMessageTitle(event.target.value)
                      }
                      placeholder="مثال: تذكير دروس اليوم"
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      نص الرسالة
                    </label>

                    <textarea
                      value={messageContent}
                      onChange={(event) =>
                        setMessageContent(event.target.value)
                      }
                      rows={5}
                      placeholder="اكتب نص التذكير هنا..."
                      className="w-full resize-y rounded-lg border bg-background p-4 text-sm leading-7 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={saveMessage}
                      disabled={
                        saving ||
                        !messageTitle.trim() ||
                        !messageContent.trim()
                      }
                    >
                      {saving ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Save className="size-4" />
                      )}

                      {creating ? 'إنشاء وحفظ' : 'حفظ التعديلات'}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      disabled={saving}
                      onClick={cancelMessageEditor}
                    >
                      <X className="size-4" />
                      إلغاء
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <p className="whitespace-pre-wrap text-sm leading-8">
                      {selectedMessage?.content}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={copyMessage}
                    >
                      <Copy className="size-4" />
                      نسخ الرسالة
                    </Button>

                    <Button
                      type="button"
                      onClick={openWhatsAppGroup}
                      disabled={!groupUrl}
                    >
                      <MessageCircle className="size-4" />
                      <ExternalLink className="size-4" />
                      إرسال للمجموعة
                    </Button>
                  </div>

                  {!groupUrl && (
                    <p className="text-sm text-muted-foreground">
                      احفظ رابط مجموعة WhatsApp أعلاه لتفعيل الإرسال.
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </>
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

      {hasLessonsToday && (
        <p className="text-xs text-muted-foreground">
          عند الضغط على إرسال للمجموعة، يتم نسخ الرسالة وفتح رابط المجموعة.
          الصق الرسالة داخل WhatsApp ثم أرسلها يدوياً.
        </p>
      )}
    </div>
  )
}
