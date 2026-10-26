
'use client'

import { useRef, useState } from 'react'
import { FileText, Pencil, Save, Trash2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type MessageTemplate = {
  id: string
  name: string
  content: string
  createdAt: string
  updatedAt: string
}

type CommunicationTemplatesProps = {
  templates: MessageTemplate[]
  onTemplatesChange: (templates: MessageTemplate[]) => void
}

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
]

export function CommunicationTemplates({
  templates,
  onTemplatesChange,
}: CommunicationTemplatesProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const cursorPositionRef = useRef<number | null>(null)

  function startEditing(template: MessageTemplate) {
    setEditingId(template.id)
    setName(template.name)
    setContent(template.content)
    setMessage('')
    cursorPositionRef.current = null
  }

  function cancelEditing() {
    setEditingId(null)
    setName('')
    setContent('')
    setMessage('')
    cursorPositionRef.current = null
  }

  function insertVariable(variable: string) {
    const textarea = contentRef.current

    if (!textarea) {
      setContent((current) => current + variable)
      return
    }

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const nextContent =
      content.substring(0, start) + variable + content.substring(end)
    const nextCursorPosition = start + variable.length

    setContent(nextContent)
    cursorPositionRef.current = nextCursorPosition

    requestAnimationFrame(() => {
      const currentTextarea = contentRef.current

      if (currentTextarea) {
        currentTextarea.focus()
        currentTextarea.setSelectionRange(
          nextCursorPosition,
          nextCursorPosition
        )
      }
    })
  }

  async function saveTemplate() {
    if (!editingId) return

    if (!name.trim() || !content.trim()) {
      setMessage('يرجى إدخال اسم الرسالة ومحتواها.')
      return
    }

    setSaving(true)
    setMessage('')

    try {
      const { data, error } = await supabase
        .from('communication_message_templates')
        .update({
          name: name.trim(),
          content: content.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingId)
        .select('id, name, content, created_at, updated_at')
        .single()

      if (error) throw error

      const updatedTemplate: MessageTemplate = {
        id: data.id,
        name: data.name,
        content: data.content,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      }

      onTemplatesChange(
        templates.map((template) =>
          template.id === editingId ? updatedTemplate : template
        )
      )

      cancelEditing()
      setMessage('تم حفظ التعديلات بنجاح.')
    } catch (error) {
      console.error('Failed to update message template:', error)
      setMessage('تعذر حفظ التعديلات. حاول مرة أخرى.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteTemplate(template: MessageTemplate) {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف الرسالة "${template.name}"؟`
    )

    if (!confirmed) return

    setDeletingId(template.id)
    setMessage('')

    try {
      const { error } = await supabase
        .from('communication_message_templates')
        .delete()
        .eq('id', template.id)

      if (error) throw error

      onTemplatesChange(
        templates.filter((item) => item.id !== template.id)
      )

      if (editingId === template.id) {
        cancelEditing()
      }

      setMessage('تم حذف الرسالة بنجاح.')
    } catch (error) {
      console.error('Failed to delete message template:', error)
      setMessage('تعذر حذف الرسالة. حاول مرة أخرى.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Card>
      <CardContent className="space-y-5 p-5">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <FileText className="size-5" />
            الرسائل المحفوظة
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            إدارة قوالب الرسائل وتعديلها لاستخدامها في التواصل المباشر.
          </p>
        </div>

        {message && (
          <p className="rounded-md border p-3 text-sm" role="status">
            {message}
          </p>
        )}

        {templates.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <FileText className="mx-auto mb-3 size-8 text-muted-foreground" />
            <p className="font-medium">ما فيه رسائل محفوظة حالياً</p>
            <p className="mt-1 text-sm text-muted-foreground">
              تقدر تحفظ رسالة جديدة من نافذة التواصل المباشر.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className="rounded-lg border p-4"
              >
                {editingId === template.id ? (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">
                        اسم الرسالة
                      </label>

                      <input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        placeholder="اسم الرسالة"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        محتوى الرسالة
                      </label>

                      <textarea
                        ref={contentRef}
                        value={content}
                        onChange={(event) => setContent(event.target.value)}
                        onSelect={(event) => {
                          cursorPositionRef.current =
                            event.currentTarget.selectionStart
                        }}
                        rows={7}
                        className="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm"
                        placeholder="اكتب محتوى الرسالة..."
                      />

                      <div className="space-y-2 rounded-md border p-3">
                        <p className="text-sm font-medium">
                          أضف متغيرًا إلى الرسالة
                        </p>

                        <p className="text-xs text-muted-foreground">
                          اضغط على المتغير لإضافته عند موضع المؤشر في النص.
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {MESSAGE_VARIABLES.map((variable) => (
                            <Button
                              key={variable.key}
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={saving}
                              onMouseDown={(event) => {
                                event.preventDefault()
                              }}
                              onClick={() => insertVariable(variable.key)}
                              title={variable.key}
                            >
                              {variable.label}
                            </Button>
                          ))}
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        مثال: هلا {'{{name}}'}، نذكرك بموعد دورة{' '}
                        {'{{course}}'}.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        onClick={saveTemplate}
                        disabled={saving || deletingId !== null}
                      >
                        <Save className="me-2 size-4" />
                        {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={cancelEditing}
                        disabled={saving}
                      >
                        <X className="me-2 size-4" />
                        إلغاء
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold">{template.name}</h3>

                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label="تعديل الرسالة"
                          onClick={() => startEditing(template)}
                          disabled={
                            deletingId !== null || editingId !== null
                          }
                        >
                          <Pencil className="size-4" />
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label="حذف الرسالة"
                          onClick={() => deleteTemplate(template)}
                          disabled={
                            deletingId !== null || editingId !== null
                          }
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    <p className="mt-3 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                      {template.content}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
