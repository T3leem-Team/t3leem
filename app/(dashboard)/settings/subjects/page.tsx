'use client'

import { useState } from 'react'
import { Check, Edit3, Plus, Trash2, X } from 'lucide-react'

import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const initialSubjects = [
  'اللغة العربية',
  'الرياضيات',
  'العلوم',
  'اللغة الإنجليزية',
  'الدراسات الاجتماعية',
  'التربية البدنية',
]

export default function Page() {
  const [subjects, setSubjects] = useState(initialSubjects)
  const [newSubject, setNewSubject] = useState('')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')

  const addSubject = () => {
    const name = newSubject.trim()

    if (!name) return

    // منع تكرار المادة
    const exists = subjects.some(
      (subject) => subject.trim().toLowerCase() === name.toLowerCase(),
    )

    if (exists) {
      alert('هذه المادة موجودة بالفعل')
      return
    }

    setSubjects((current) => [...current, name])
    setNewSubject('')
  }

  const startEdit = (index: number) => {
    setEditingIndex(index)
    setEditingName(subjects[index])
  }

  const saveEdit = () => {
    if (editingIndex === null) return

    const name = editingName.trim()

    if (!name) return

    const exists = subjects.some(
      (subject, index) =>
        index !== editingIndex &&
        subject.trim().toLowerCase() === name.toLowerCase(),
    )

    if (exists) {
      alert('هذه المادة موجودة بالفعل')
      return
    }

    setSubjects((current) =>
      current.map((subject, index) =>
        index === editingIndex ? name : subject,
      ),
    )

    setEditingIndex(null)
    setEditingName('')
  }

  const cancelEdit = () => {
    setEditingIndex(null)
    setEditingName('')
  }

  const deleteSubject = (index: number) => {
    const subject = subjects[index]

    const confirmed = window.confirm(
      `هل أنت متأكد من حذف مادة "${subject}"؟`,
    )

    if (!confirmed) return

    setSubjects((current) =>
      current.filter((_, currentIndex) => currentIndex !== index),
    )

    if (editingIndex === index) {
      cancelEdit()
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="المواد الدراسية"
        description="إضافة وتعديل وحذف المواد الدراسية"
      />

      {/* إضافة مادة */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row">
          <input
            value={newSubject}
            onChange={(event) => setNewSubject(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                addSubject()
              }
            }}
            placeholder="اسم المادة"
            className="h-10 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />

          <Button type="button" onClick={addSubject}>
            <Plus className="size-4" />
            إضافة مادة
          </Button>
        </CardContent>
      </Card>

      {/* قائمة المواد */}
      <Card>
        <CardContent className="divide-y p-0">
          {subjects.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              لا توجد مواد دراسية مضافة
            </div>
          ) : (
            subjects.map((subject, index) => (
              <div
                key={`${subject}-${index}`}
                className="flex items-center justify-between gap-4 p-4"
              >
                {editingIndex === index ? (
                  <div className="flex flex-1 gap-2">
                    <input
                      value={editingName}
                      onChange={(event) =>
                        setEditingName(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          saveEdit()
                        }

                        if (event.key === 'Escape') {
                          cancelEdit()
                        }
                      }}
                      autoFocus
                      className="h-10 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />

                    <Button
                      type="button"
                      size="icon"
                      onClick={saveEdit}
                      aria-label="حفظ"
                    >
                      <Check className="size-4" />
                    </Button>

                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={cancelEdit}
                      aria-label="إلغاء"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="font-medium">{subject}</span>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(index)}
                      >
                        <Edit3 className="size-4" />
                        تعديل
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => deleteSubject(index)}
                        aria-label={`حذف ${subject}`}
                      >
                        <Trash2 className="size-4" />
                        حذف
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

