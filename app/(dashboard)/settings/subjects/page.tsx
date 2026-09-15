'use client'

import { useState } from 'react'
import { Edit3, Plus, X, Check } from 'lucide-react'

import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const initialSubjects = [
  'اللغة العربية',
  'الرياضيات',
  'العلوم',
  'اللغة الإنجليزية',
  'الدراسات الاجتماعية',
  'التربية البدنية',
]

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState(initialSubjects)
  const [newSubject, setNewSubject] = useState('')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')

  const addSubject = () => {
    const name = newSubject.trim()

    if (!name) return

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="المواد الدراسية"
        description="إضافة وتعديل المواد الدراسية"
      />

      {/* إضافة مادة */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row">
          <Input
            value={newSubject}
            onChange={(event) => setNewSubject(event.target.value)}
            placeholder="اسم المادة"
          />

          <Button onClick={addSubject}>
            <Plus className="size-4" />
            إضافة مادة
          </Button>
        </CardContent>
      </Card>

      {/* قائمة المواد */}
      <Card>
        <CardContent className="divide-y p-0">
          {subjects.map((subject, index) => (
            <div
              key={`${subject}-${index}`}
              className="flex items-center justify-between gap-4 p-4"
            >
              {editingIndex === index ? (
                <div className="flex flex-1 gap-2">
                  <Input
                    value={editingName}
                    onChange={(event) =>
                      setEditingName(event.target.value)
                    }
                    autoFocus
                  />

                  <Button
                    size="icon"
                    onClick={saveEdit}
                    aria-label="حفظ"
                  >
                    <Check className="size-4" />
                  </Button>

                  <Button
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

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEdit(index)}
                  >
                    <Edit3 className="size-4" />
                    تعديل
                  </Button>
                </>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
