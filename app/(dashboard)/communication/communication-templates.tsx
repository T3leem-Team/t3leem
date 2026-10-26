
'use client'

import { useState } from 'react'
import {
  Pencil,
  Save,
  Trash2,
  X,
  FileText,
} from 'lucide-react'

import type { MessageTemplate } from './communication-types'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type CommunicationTemplatesProps = {
  templates: MessageTemplate[]
  deletingId: string | null
  message: string
  onUpdate: (
    id: string,
    name: string,
    content: string
  ) => Promise<boolean>
  onDelete: (template: MessageTemplate) => void
}

export function CommunicationTemplates({
  templates,
  deletingId,
  message,
  onUpdate,
  onDelete,
}: CommunicationTemplatesProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [editMessage, setEditMessage] = useState('')

  const startEditing = (template: MessageTemplate) => {
    setEditingId(template.id)
    setName(template.name)
    setContent(template.content)
    setEditMessage('')
  }

  const cancelEditing = () => {
    setEditingId(null)
    setName('')
    setContent('')
    setEditMessage('')
  }

  const saveEditing = async () => {
    if (!editingId) return

    if (!name.trim()) {
      setEditMessage('اكتب اسم القالب أولاً.')
      return
    }

    if (!content.trim()) {
      setEditMessage('اكتب محتوى القالب أولاً.')
      return
    }

    setSaving(true)
    setEditMessage('')

    try {
      const success = await onUpdate(
        editingId,
        name.trim(),
        content.trim()
      )

      if (success) {
        cancelEditing()
      } else {
        setEditMessage('تعذر حفظ التعديلات.')
      }
    } catch {
      setEditMessage('حدث خطأ أثناء حفظ التعديلات.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardContent className="space-y-5 p-5">
        <div>
          <h2 className="text-lg font-semibold">
            إدارة الرسائل المحفوظة
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            عدّل أسماء القوالب ومحتواها أو احذف القوالب غير المطلوبة.
          </p>
        </div>

        {templates.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            <FileText className="mx-auto mb-2 size-7" />
            لا توجد قوالب محفوظة حالياً.
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className="rounded-lg border p-4"
              >
                {editingId === template.id ? (
                  <div className="space-y-3">
                    <label className="block space-y-1">
                      <span className="text-sm font-medium">
                        اسم القالب
                      </span>
                      <input
                        value={name}
                        onChange={(event) =>
                          setName(event.target.value)
                        }
                        className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
                      />
                    </label>

                    <label className="block space-y-1">
                      <span className="text-sm font-medium">
                        محتوى الرسالة
                      </span>
                      <textarea
                        value={content}
                        onChange={(event) =>
                          setContent(event.target.value)
                        }
                        rows={7}
                        className="w-full resize-y rounded-md border bg-background p-3 text-sm outline-none"
                      />
                    </label>

                    {editMessage && (
                      <p className="text-sm text-destructive">
                        {editMessage}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        onClick={saveEditing}
                        disabled={saving}
                      >
                        <Save className="size-4" />
                        {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={cancelEditing}
                        disabled={saving}
                      >
                        <X className="size-4" />
                        إلغاء
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium">
                        {template.name}
                      </h3>
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                        {template.content}
                      </p>
                    </div>

                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="تعديل القالب"
                        onClick={() => startEditing(template)}
                      >
                        <Pencil className="size-4" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="حذف القالب"
                        disabled={deletingId === template.id}
                        onClick={() => onDelete(template)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {message && (
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            {message}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
