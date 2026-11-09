
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import {
  ArrowRight,
  Check,
  Edit3,
  Plus,
  Power,
  Search,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'

import {
  loadSettingsTeachers,
  insertSettingsTeacher,
  updateSettingsTeacher,
  updateSettingsTeacherStatus,
  deleteSettingsTeacher,
} from '@/lib/features/settings/repositories/teacher-settings.repository'

import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type Teacher = {
  id: string
  name: string
  personalId: string
  phone: string
  age: number | null
  status: 'دوام كامل' | 'دوام جزئي'
  isActive: boolean
}

type TeacherForm = {
  id: string
  name: string
  personalId: string
  phone: string
  age: string
  status: 'دوام كامل' | 'دوام جزئي'
}

const emptyForm: TeacherForm = {
  id: '',
  name: '',
  personalId: '',
  phone: '',
  age: '',
  status: 'دوام كامل',
}

const sortTeachers = (items: Teacher[]) =>
  [...items].sort((a, b) =>
    a.name.localeCompare(b.name, 'ar')
  )

export default function Page() {
  const router = useRouter()

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

    const { data, error } = await loadSettingsTeachers()

    if (error) {
      setStatusMessage(
        `خطأ في تحميل المعلمين: ${error.message}`
      )
      setLoading(false)
      return
    }

    const mappedTeachers: Teacher[] = (data ?? []).map(
      (teacher) => ({
        id: teacher.id,
        name: teacher.name ?? '',
        personalId: teacher.personal_id ?? '',
        phone: teacher.phone ?? '',
        age:
          typeof teacher.age === 'number'
            ? teacher.age
            : null,
        status:
          teacher.status === 'دوام جزئي'
            ? 'دوام جزئي'
            : 'دوام كامل',
        isActive: Boolean(teacher.is_active),
      })
    )

    setTeachers(sortTeachers(mappedTeachers))
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
      personalId: teacher.personalId,
      phone: teacher.phone,
      age:
        teacher.age !== null
          ? String(teacher.age)
          : '',
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
    const personalId = form.personalId.trim()
    const phone = form.phone.trim()
    const ageText = form.age.trim()

    if (!id) {
      setStatusMessage('يرجى إدخال رقم المعلم')
      return
    }

    if (!name) {
      setStatusMessage('يرجى إدخال اسم المعلم')
      return
    }

    let age: number | null = null

    if (ageText) {
      const parsedAge = Number(ageText)

      if (
        !Number.isInteger(parsedAge) ||
        parsedAge < 18 ||
        parsedAge > 100
      ) {
        setStatusMessage(
          'يرجى إدخال عمر صحيح بين 18 و100'
        )
        return
      }

      age = parsedAge
    }

    setSaving(true)
    setStatusMessage('جاري الحفظ...')

    if (editingTeacher) {
      const { data, error } = await updateSettingsTeacher(
        editingTeacher.id,
        {
          name,
          personal_id: personalId || null,
          phone: phone || null,
          age,
          status: form.status,
          updated_at: new Date().toISOString(),
        }
      )

      if (error) {
        setStatusMessage(
          `خطأ في تعديل المعلم: ${error.message}`
        )
        setSaving(false)
        return
      }

      const updatedTeacher: Teacher = {
        id: data.id,
        name: data.name ?? '',
        personalId: data.personal_id ?? '',
        phone: data.phone ?? '',
        age:
          typeof data.age === 'number'
            ? data.age
            : null,
        status:
          data.status === 'دوام جزئي'
            ? 'دوام جزئي'
            : 'دوام كامل',
        isActive: Boolean(data.is_active),
      }

      setTeachers((current) =>
        sortTeachers(
          current.map((teacher) =>
            teacher.id === editingTeacher.id
              ? updatedTeacher
              : teacher
          )
        )
      )

      setStatusMessage('تم تعديل بيانات المعلم ✅')
    } else {
      const { data, error } = await insertSettingsTeacher({
        id,
        name,
        personal_id: personalId || null,
        phone: phone || null,
        age,
        status: form.status,
        is_active: true,
      })

      if (error) {
        setStatusMessage(
          `خطأ في إضافة المعلم: ${error.message}`
        )
        setSaving(false)
        return
      }

      const newTeacher: Teacher = {
        id: data.id,
        name: data.name ?? '',
        personalId: data.personal_id ?? '',
        phone: data.phone ?? '',
        age:
          typeof data.age === 'number'
            ? data.age
            : null,
        status:
          data.status === 'دوام جزئي'
            ? 'دوام جزئي'
            : 'دوام كامل',
        isActive: Boolean(data.is_active),
      }

      setTeachers((current) =>
        sortTeachers([...current, newTeacher])
      )

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

    const { error } = await updateSettingsTeacherStatus(
      teacher.id,
      nextValue
    )

    if (error) {
      setStatusMessage(
        `خطأ في تحديث حالة المعلم: ${error.message}`
      )
      setSaving(false)
      return
    }

    const updatedTeacher = {
      ...teacher,
      isActive: nextValue,
    }

    setTeachers((current) =>
      sortTeachers(
        current.map((item) =>
          item.id === teacher.id
            ? updatedTeacher
            : item
        )
      )
    )

    setSelectedTeacher((current) =>
      current?.id === teacher.id
        ? updatedTeacher
        : current
    )

    setStatusMessage(
      nextValue
        ? 'تم تفعيل المعلم ✅'
        : 'تم تعطيل المعلم ✅'
    )

    setSaving(false)
  }

  const handleDelete = async (teacher: Teacher) => {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف المعلم "${teacher.name}"؟`
    )

    if (!confirmed) return

    setSaving(true)
    setStatusMessage('جاري حذف المعلم...')

    const { error } = await deleteSettingsTeacher(
      teacher.id
    )

    if (error) {
      setStatusMessage(
        `تعذر حذف المعلم: ${error.message}`
      )
      setSaving(false)
      return
    }

    setTeachers((current) =>
      current.filter(
        (item) => item.id !== teacher.id
      )
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
      teacher.personalId
        .toLowerCase()
        .includes(query) ||
      teacher.phone
        .toLowerCase()
        .includes(query)
    )
  })

  return (
    <div className="space-y-6">
      {/* العودة */}
      <div className="flex justify-start">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          <ArrowRight className="h-4 w-4" />
          عودة
        </button>
      </div>

      <PageHeader
        title="إدارة المعلمين"
        description="إدارة بيانات المعلمين وحالاتهم وإعدادات عرضهم."
      />

      {statusMessage && (
        <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
          {statusMessage}
        </div>
      )}

      {/* البحث وأزرار التحكم */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="البحث عن معلم..."
            className="h-10 w-full rounded-md border bg-background pr-9 pl-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              router.push('/settings/teachers/display-settings')
            }
          >
            <Edit3 className="size-4" />
            ضبط صفحة المعلمين
          </Button>

          <Button
            type="button"
            onClick={openAddForm}
            disabled={saving}
          >
            <Plus className="size-4" />
            إضافة معلم
          </Button>
        </div>
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
            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                <div className="grid grid-cols-[70px_1.5fr_1fr_1fr_90px_130px_100px] border-b bg-muted/30 px-5 py-3 text-sm font-medium">
                  <div>السريال</div>
                  <div>اسم المعلم</div>
                  <div>الرقم الشخصي</div>
                  <div>رقم التواصل</div>
                  <div>العمر</div>
                  <div>نوع الدوام</div>
                  <div>الحالة</div>
                </div>

                <div className="divide-y">
                  {filteredTeachers.map(
                    (teacher, index) => (
                      <button
                        key={teacher.id}
                        type="button"
                        onClick={() =>
                          setSelectedTeacher(teacher)
                        }
                        className="grid w-full grid-cols-[70px_1.5fr_1fr_1fr_90px_130px_100px] items-center px-5 py-4 text-right text-sm transition-colors hover:bg-muted/30"
                      >
                        <div className="font-medium text-muted-foreground">
                          {index + 1}
                        </div>

                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <UserRound className="size-4" />
                          </span>

                          <div className="min-w-0">
                            <p className="truncate font-semibold">
                              {teacher.name}
                            </p>

                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {teacher.id}
                            </p>
                          </div>
                        </div>

                        <div>
                          {teacher.personalId || '—'}
                        </div>

                        <div>
                          {teacher.phone || '—'}
                        </div>

                        <div>
                          {teacher.age ?? '—'}
                        </div>

                        <div>{teacher.status}</div>

                        <div>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs ${
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
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
                onClick={() =>
                  setSelectedTeacher(null)
                }
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
                      اسم المعلم
                    </p>
                    <p className="mt-1 font-medium">
                      {selectedTeacher.name}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      الرقم الشخصي
                    </p>
                    <p className="mt-1 font-medium">
                      {selectedTeacher.personalId || '—'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      رقم التواصل
                    </p>
                    <p className="mt-1 font-medium">
                      {selectedTeacher.phone || '—'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      العمر
                    </p>
                    <p className="mt-1 font-medium">
                      {selectedTeacher.age ?? '—'}
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
                  الرقم الشخصي
                </label>

                <input
                  type="text"
                  value={form.personalId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      personalId: event.target.value,
                    }))
                  }
                  placeholder="الرقم الشخصي"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  رقم التواصل
                </label>

                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  placeholder="رقم الهاتف"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  العمر
                </label>

                <input
                  type="number"
                  min="18"
                  max="100"
                  value={form.age}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      age: event.target.value,
                    }))
                  }
                  placeholder="العمر"
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
                        event.target.value ===
                        'دوام جزئي'
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

              <div className="flex justify-start gap-2 pt-2">
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
