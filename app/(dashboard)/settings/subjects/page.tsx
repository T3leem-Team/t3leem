'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import {
  ArrowRight,
  Check,
  Edit3,
  Loader2,
  Plus,
  Trash2,
  X,
} from 'lucide-react'

import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

import { supabase } from '@/lib/supabase'

type Subject = {
  id: string
  name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function Page() {
  const router = useRouter()

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [newSubject, setNewSubject] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadSubjects = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('subjects')
      .select('id, name, is_active, created_at, updated_at')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error loading subjects:', error)
      alert(`تعذر تحميل المواد: ${error.message}`)
      setLoading(false)
      return
    }

    setSubjects(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadSubjects()
  }, [])

  const addSubject = async () => {
    const name = newSubject.trim()

    if (!name) {
      alert('اكتب اسم المادة أولاً')
      return
    }

    const exists = subjects.some(
      (subject) =>
        subject.name.trim().toLowerCase() === name.toLowerCase(),
    )

    if (exists) {
      alert('هذه المادة موجودة بالفعل')
      return
    }

    setSaving(true)

    const { data, error } = await supabase
      .from('subjects')
      .insert({
        name,
        is_active: true,
      })
      .select('id, name, is_active, created_at, updated_at')
      .single()

    if (error) {
      console.error('Error adding subject:', error)

      if (error.code === '23505') {
        alert('هذه المادة موجودة بالفعل')
      } else {
        alert(`تعذر إضافة المادة: ${error.message}`)
      }

      setSaving(false)
      return
    }

    if (data) {
      setSubjects((current) =>
        [...current, data].sort((a, b) =>
          a.name.localeCompare(b.name, 'ar'),
        ),
      )
    }

    setNewSubject('')
    setSaving(false)
  }

  const startEdit = (subject: Subject) => {
    setEditingId(subject.id)
    setEditingName(subject.name)
  }

  const saveEdit = async () => {
    if (!editingId) return

    const name = editingName.trim()

    if (!name) {
      alert('اكتب اسم المادة أولاً')
      return
    }

    const exists = subjects.some(
      (subject) =>
        subject.id !== editingId &&
        subject.name.trim().toLowerCase() === name.toLowerCase(),
    )

    if (exists) {
      alert('هذه المادة موجودة بالفعل')
      return
    }

    setSaving(true)

    const { data, error } = await supabase
      .from('subjects')
      .update({
        name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingId)
      .select('id, name, is_active, created_at, updated_at')
      .single()

    if (error) {
      console.error('Error updating subject:', error)

      if (error.code === '23505') {
        alert('هذه المادة موجودة بالفعل')
      } else {
        alert(`تعذر تعديل المادة: ${error.message}`)
      }

      setSaving(false)
      return
    }

    if (data) {
      setSubjects((current) =>
        current
          .map((subject) =>
            subject.id === editingId ? data : subject,
          )
          .sort((a, b) =>
            a.name.localeCompare(b.name, 'ar'),
          ),
      )
    }

    setEditingId(null)
    setEditingName('')
    setSaving(false)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }

  const deleteSubject = async (subject: Subject) => {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف مادة "${subject.name}"؟`,
    )

    if (!confirmed) return

    setDeletingId(subject.id)

    /*
     * أولاً نتحقق هل المادة مستخدمة في دورة.
     */
    const { count: courseSubjectsCount, error: courseSubjectsError } =
      await supabase
        .from('course_subjects')
        .select('id', {
          count: 'exact',
          head: true,
        })
        .eq('subject_id', subject.id)

    if (courseSubjectsError) {
      console.error(
        'Error checking course subjects:',
        courseSubjectsError,
      )

      alert(
        `تعذر التحقق من استخدام المادة: ${courseSubjectsError.message}`,
      )

      setDeletingId(null)
      return
    }

    /*
     * نتحقق أيضاً من تعيينات الطلاب.
     */
    const {
      count: assignmentsCount,
      error: assignmentsError,
    } = await supabase
      .from('teacher_student_assignments')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq('subject_id', subject.id)

    if (assignmentsError) {
      console.error(
        'Error checking student assignments:',
        assignmentsError,
      )

      alert(
        `تعذر التحقق من تعيينات الطلاب: ${assignmentsError.message}`,
      )

      setDeletingId(null)
      return
    }

    const isUsed =
      (courseSubjectsCount ?? 0) > 0 ||
      (assignmentsCount ?? 0) > 0

    /*
     * إذا كانت المادة مستخدمة:
     * لا نحذفها فعلياً، بل نعطلها.
     *
     * هذا يحافظ على التاريخ والروابط القديمة.
     */
    if (isUsed) {
      const { error } = await supabase
        .from('subjects')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subject.id)

      if (error) {
        console.error('Error deactivating subject:', error)
        alert(`تعذر حذف المادة: ${error.message}`)
        setDeletingId(null)
        return
      }

      setSubjects((current) =>
        current.filter((item) => item.id !== subject.id),
      )

      alert(
        'تم إخفاء المادة لأنها مستخدمة في بيانات سابقة، وتم الحفاظ على بياناتها التاريخية.',
      )

      if (editingId === subject.id) {
        cancelEdit()
      }

      setDeletingId(null)
      return
    }

    /*
     * إذا لم تكن مستخدمة نهائياً:
     * نحذفها فعلياً.
     */
    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', subject.id)

    if (error) {
      console.error('Error deleting subject:', error)
      alert(`تعذر حذف المادة: ${error.message}`)
      setDeletingId(null)
      return
    }

    setSubjects((current) =>
      current.filter((item) => item.id !== subject.id),
    )

    if (editingId === subject.id) {
      cancelEdit()
    }

    setDeletingId(null)
  }

  return (
    <div className="space-y-6">
      {/* زر العودة */}
      <div className="flex justify-start">
        <Button
          type="button"
          onClick={() => router.back()}
          className="h-10 gap-2 bg-primary px-4 text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          <ArrowRight className="size-4" />
          عودة
        </Button>
      </div>

      <PageHeader
        title="المواد الدراسية"
        description="إضافة وتعديل وحذف المواد الدراسية"
      />

      {/* إضافة مادة */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row">
          <input
            type="text"
            value={newSubject}
            onChange={(event) => setNewSubject(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()

                if (!saving) {
                  addSubject()
                }
              }
            }}
            placeholder="اسم المادة"
            disabled={saving}
            className="h-10 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
          />

          <Button
            type="button"
            onClick={addSubject}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}

            إضافة مادة
          </Button>
        </CardContent>
      </Card>

      {/* قائمة المواد */}
      <Card>
        <CardContent className="divide-y p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              جاري تحميل المواد...
            </div>
          ) : subjects.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              لا توجد مواد دراسية مضافة
            </div>
          ) : (
            subjects.map((subject) => (
              <div
                key={subject.id}
                className="flex items-center justify-between gap-4 p-4"
              >
                {editingId === subject.id ? (
                  <div className="flex flex-1 gap-2">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(event) =>
                        setEditingName(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()

                          if (!saving) {
                            saveEdit()
                          }
                        }

                        if (event.key === 'Escape') {
                          event.preventDefault()
                          cancelEdit()
                        }
                      }}
                      autoFocus
                      disabled={saving}
                      className="h-10 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
                    />

                    <Button
                      type="button"
                      size="icon"
                      onClick={saveEdit}
                      disabled={saving}
                      aria-label="حفظ"
                    >
                      {saving ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Check className="size-4" />
                      )}
                    </Button>

                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={cancelEdit}
                      disabled={saving}
                      aria-label="إلغاء"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="font-medium">
                      {subject.name}
                    </span>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(subject)}
                        disabled={deletingId === subject.id}
                      >
                        <Edit3 className="size-4" />
                        تعديل
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => deleteSubject(subject)}
                        disabled={deletingId === subject.id}
                      >
                        {deletingId === subject.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}

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
