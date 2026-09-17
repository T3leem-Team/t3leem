'use client'

import { useEffect, useState } from 'react'
import {
Check,
Edit3,
Plus,
Power,
Search,
Trash2,
UserRound,
X,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'

import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type Teacher = {
id: string
name: string
subject: string
status: 'دوام كامل' | 'دوام جزئي'
isActive: boolean
}

type TeacherForm = {
id: string
name: string
subject: string
status: 'دوام كامل' | 'دوام جزئي'
}

const emptyForm: TeacherForm = {
id: '',
name: '',
subject: '',
status: 'دوام كامل',
}

export default function Page() {
const [teachers, setTeachers] = useState<Teacher[]>([])
const [loading, setLoading] = useState(true)
const [saving, setSaving] = useState(false)
const [statusMessage, setStatusMessage] = useState('')

const [search, setSearch] = useState('')

const [selectedTeacher, setSelectedTeacher] =
useState<Teacher | null>(null)

const [showForm, setShowForm] = useState(false)
const [editingTeacher, setEditingTeacher] =
useState<Teacher | null>(null)

const [form, setForm] = useState<TeacherForm>(emptyForm)

const loadTeachers = async () => {
setLoading(true)


const { data, error } = await supabase
  .from('teachers')
  .select('id, name, subject, status, is_active')
  .order('name', { ascending: true })

if (error) {
  setStatusMessage(
    `خطأ في تحميل المعلمين: ${error.message}`,
  )
  setLoading(false)
  return
}

setTeachers(
  (data ?? []).map((teacher) => ({
    id: teacher.id,
    name: teacher.name ?? '',
    subject: teacher.subject ?? '',
    status:
      teacher.status === 'دوام جزئي'
        ? 'دوام جزئي'
        : 'دوام كامل',
    isActive: Boolean(teacher.is_active),
  })),
)

setLoading(false)


}

useEffect(() => {
loadTeachers()
}, [])

const openAddForm = () => {
setEditingTeacher(null)
setForm(emptyForm)
setSelectedTeacher(null)
setStatusMessage('')
setShowForm(true)
}

const openEditForm = (teacher: Teacher) => {
setEditingTeacher(teacher)
setForm({
id: teacher.id,
name: teacher.name,
subject: teacher.subject,
status: teacher.status,
})
setSelectedTeacher(null)
setStatusMessage('')
setShowForm(true)
}

const closeForm = () => {
if (saving) return


setShowForm(false)
setEditingTeacher(null)
setForm(emptyForm)


}

const handleSave = async () => {
const id = form.id.trim()
const name = form.name.trim()
const subject = form.subject.trim()


if (!id) {
  setStatusMessage('يرجى إدخال رقم المعلم')
  return
}

if (!name) {
  setStatusMessage('يرجى إدخال اسم المعلم')
  return
}

setSaving(true)
setStatusMessage('جاري الحفظ...')

if (editingTeacher) {
  const { data, error } = await supabase
    .from('teachers')
    .update({
      id,
      name,
      subject: subject || null,
      status: form.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', editingTeacher.id)
    .select('id, name, subject, status, is_active')
    .single()

  if (error) {
    setStatusMessage(
      `خطأ في تعديل المعلم: ${error.message}`,
    )
    setSaving(false)
    return
  }

  setTeachers((current) =>
    current.map((teacher) =>
      teacher.id === editingTeacher.id
        ? {
            id: data.id,
            name: data.name ?? '',
            subject: data.subject ?? '',
            status:
              data.status === 'دوام جزئي'
                ? 'دوام جزئي'
                : 'دوام كامل',
            isActive: Boolean(data.is_active),
          }
        : teacher,
    ),
  )

  setStatusMessage('تم تعديل بيانات المعلم ✅')
} else {
  const { data, error } = await supabase
    .from('teachers')
    .insert({
      id,
      name,
      subject: subject || null,
      status: form.status,
      is_active: true,
    })
    .select('id, name, subject, status, is_active')
    .single()

  if (error) {
    setStatusMessage(
      `خطأ في إضافة المعلم: ${error.message}`,
    )
    setSaving(false)
    return
  }

  setTeachers((current) => [
    ...current,
    {
      id: data.id,
      name: data.name ?? '',
      subject: data.subject ?? '',
      status:
        data.status === 'دوام جزئي'
          ? 'دوام جزئي'
          : 'دوام كامل',
      isActive: Boolean(data.is_active),
    },
  ])
  
  setStatusMessage('تمت إضافة المعلم ✅')
}

setSaving(false)
setShowForm(false)
setEditingTeacher(null)
setForm(emptyForm)


}

const handleToggleActive = async (teacher: Teacher) => {
const nextValue = !teacher.isActive


setSaving(true)
setStatusMessage('جاري تحديث حالة المعلم...')

const { error } = await supabase
  .from('teachers')
  .update({
    is_active: nextValue,
    updated_at: new Date().toISOString(),
  })
  .eq('id', teacher.id)

if (error) {
  setStatusMessage(
    `خطأ في تحديث حالة المعلم: ${error.message}`,
  )
  setSaving(false)
  return
}

setTeachers((current) =>
  current.map((item) =>
    item.id === teacher.id
      ? {
          ...item,
          isActive: nextValue,
        }
      : item,
  ),
)

setSelectedTeacher((current) =>
  current?.id === teacher.id
    ? {
        ...current,
        isActive: nextValue,
      }
    : current,
)

setStatusMessage(
  nextValue
    ? 'تم تفعيل المعلم ✅'
    : 'تم تعطيل المعلم ✅',
)

setSaving(false)


}

const handleDelete = async (teacher: Teacher) => {
const confirmed = window.confirm(
`هل أنت متأكد من حذف المعلم "${teacher.name}"؟`,
)


if (!confirmed) return

setSaving(true)
setStatusMessage('جاري حذف المعلم...')

const { error } = await supabase
  .from('teachers')
  .delete()
  .eq('id', teacher.id)

if (error) {
  setStatusMessage(
    `تعذر حذف المعلم: ${error.message}`,
  )
  setSaving(false)
  return
}

setTeachers((current) =>
  current.filter((item) => item.id !== teacher.id),
)

setSelectedTeacher(null)
setStatusMessage('تم حذف المعلم ✅')
setSaving(false)


}

const filteredTeachers = teachers.filter((teacher) => {
const query = search.trim().toLowerCase()


if (!query) return true

return (
  teacher.name.toLowerCase().includes(query) ||
  teacher.id.toLowerCase().includes(query) ||
  teacher.subject.toLowerCase().includes(query)
)


})

return ( <div className="space-y-6"> <PageHeader
     title="المعلمون"
     description="إدارة بيانات المعلمين وحالاتهم"
   />


  {statusMessage && (
    <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
      {statusMessage}
    </div>
  )}

  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div className="relative w-full sm:max-w-sm">
      <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

      <input
        type="text"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="البحث عن معلم..."
        className="h-10 w-full rounded-md border bg-background pr-9 pl-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
      />
    </div>

    <Button
      type="button"
      onClick={openAddForm}
      disabled={saving}
    >
      <Plus className="size-4" />
      إضافة معلم
    </Button>
  </div>

  <Card>
    <CardContent className="p-0">
      {loading ? (
        <div className="p-10 text-center">
          <UserRound className="mx-auto size-10 animate-pulse text-muted-foreground" />

          <h3 className="mt-4 font-semibold">
            جاري تحميل المعلمين...
          </h3>
        </div>
      ) : filteredTeachers.length === 0 ? (
        <div className="p-10 text-center">
          <UserRound className="mx-auto size-10 text-muted-foreground" />

          <h3 className="mt-4 font-semibold">
            {teachers.length === 0
              ? 'لا يوجد معلمون'
              : 'لا توجد نتائج'}
          </h3>

          {teachers.length === 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              اضغط على "إضافة معلم" لإضافة أول معلم.
            </p>
          )}
        </div>
      ) : (
        <div className="divide-y">
          {filteredTeachers.map((teacher) => (
            <button
              key={teacher.id}
              type="button"
              onClick={() => setSelectedTeacher(teacher)}
              className="flex w-full flex-col gap-3 p-5 text-right transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UserRound className="size-5" />
                </span>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">
                      {teacher.name}
                    </h3>

                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        teacher.isActive
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {teacher.isActive
                        ? 'نشط'
                        : 'معطل'}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {teacher.id}
                    {teacher.subject
                      ? ` • ${teacher.subject}`
                      : ''}
                  </p>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                {teacher.status}
              </div>
            </button>
          ))}
        </div>
      )}
    </CardContent>
  </Card>

  {/* تفاصيل المعلم */}
  {selectedTeacher && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="text-lg font-semibold">
              تفاصيل المعلم
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {selectedTeacher.name}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setSelectedTeacher(null)}
            disabled={saving}
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-lg border p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">
                  رقم المعلم
                </p>
                <p className="mt-1 font-medium">
                  {selectedTeacher.id}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  الاسم
                </p>
                <p className="mt-1 font-medium">
                  {selectedTeacher.name}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  المادة
                </p>
                <p className="mt-1 font-medium">
                  {selectedTeacher.subject || '—'}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  نوع الدوام
                </p>
                <p className="mt-1 font-medium">
                  {selectedTeacher.status}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  الحالة
                </p>
                <p className="mt-1 font-medium">
                  {selectedTeacher.isActive
                    ? 'نشط'
                    : 'معطل'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                openEditForm(selectedTeacher)
              }
              disabled={saving}
            >
              <Edit3 className="size-4" />
              تعديل
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                handleToggleActive(selectedTeacher)
              }
              disabled={saving}
            >
              <Power className="size-4" />
              {selectedTeacher.isActive
                ? 'تعطيل'
                : 'تفعيل'}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                handleDelete(selectedTeacher)
              }
              disabled={saving}
            >
              <Trash2 className="size-4" />
              حذف
            </Button>
          </div>
        </div>
      </div>
    </div>
  )}

  {/* إضافة / تعديل المعلم */}
  {showForm && (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="text-lg font-semibold">
              {editingTeacher
                ? 'تعديل المعلم'
                : 'إضافة معلم'}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              أدخل البيانات الأساسية للمعلم.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={closeForm}
            disabled={saving}
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="space-y-4 p-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              رقم المعلم
            </label>

            <input
              type="text"
              value={form.id}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  id: event.target.value,
                }))
              }
              placeholder="مثال: TCH-301"
              disabled={Boolean(editingTeacher)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none disabled:bg-muted focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              اسم المعلم
            </label>

            <input
              type="text"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="مثال: أ. هند عبدالله الرشيد"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              المادة
            </label>

            <input
              type="text"
              value={form.subject}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  subject: event.target.value,
                }))
              }
              placeholder="مثال: اللغة العربية"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              نوع الدوام
            </label>

            <select
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status:
                    event.target.value === 'دوام جزئي'
                      ? 'دوام جزئي'
                      : 'دوام كامل',
                }))
              }
              className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="دوام كامل">
                دوام كامل
              </option>
              <option value="دوام جزئي">
                دوام جزئي
              </option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeForm}
              disabled={saving}
            >
              إلغاء
            </Button>

            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                'جاري الحفظ...'
              ) : (
                <>
                  <Check className="size-4" />
                  {editingTeacher
                    ? 'حفظ التعديلات'
                    : 'إضافة المعلم'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )}
</div>


)
}
