'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  MessageCircle,
  Users,
  Search,
  Send,
  ExternalLink,
  Check,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'

import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type CommunicationSection =
  | 'direct'
  | 'group'

type Student = {
  id: string
  name: string
  phone: string
  whatsapp: string
  personalId: string
}

export function CommunicationView() {
  const [
    activeSection,
    setActiveSection,
  ] = useState<CommunicationSection>(
    'direct'
  )

  const [
    students,
    setStudents,
  ] = useState<Student[]>([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    search,
    setSearch,
  ] = useState('')

  const [
    selectedStudentIds,
    setSelectedStudentIds,
  ] = useState<string[]>([])

  const [
    message,
    setMessage,
  ] = useState('')

  const [
    groupName,
    setGroupName,
  ] = useState('')

  const [
    groupUrl,
    setGroupUrl,
  ] = useState('')

  useEffect(() => {
    async function loadStudents() {
      setLoading(true)

      const {
        data,
        error,
      } = await supabase
        .from('students')
        .select(
          'id, name, phone, whatsapp, personal_id'
        )
        .order(
          'name',
          {
            ascending: true,
          }
        )

      if (!error) {
        setStudents(
          (data ?? []).map(
            (student) => ({
              id: student.id,
              name: student.name ?? '',
              phone: student.phone ?? '',
              whatsapp:
                student.whatsapp ?? '',
              personalId:
                student.personal_id ?? '',
            })
          )
        )
      }

      setLoading(false)
    }

    loadStudents()
  }, [])

  const filteredStudents =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase()

      if (!query) {
        return students
      }

      return students.filter(
        (student) =>
          [
            student.name,
            student.phone,
            student.whatsapp,
            student.personalId,
          ].some(
            (value) =>
              value
                .toLowerCase()
                .includes(query)
          )
      )
    }, [
      students,
      search,
    ])

  const toggleStudent = (
    studentId: string
  ) => {
    setSelectedStudentIds(
      (current) =>
        current.includes(studentId)
          ? current.filter(
              (id) =>
                id !== studentId
            )
          : [
              ...current,
              studentId,
            ]
    )
  }

  const selectAllVisible = () => {
    const visibleIds =
      filteredStudents.map(
        (student) =>
          student.id
      )

    setSelectedStudentIds(
      (current) => {
        const allSelected =
          visibleIds.length > 0 &&
          visibleIds.every(
            (id) =>
              current.includes(id)
          )

        if (allSelected) {
          return current.filter(
            (id) =>
              !visibleIds.includes(id)
          )
        }

        return Array.from(
          new Set([
            ...current,
            ...visibleIds,
          ])
        )
      }
    )
  }

  const selectedStudents =
    students.filter(
      (student) =>
        selectedStudentIds.includes(
          student.id
        )
    )

  const getWhatsAppNumber = (
    student: Student
  ) => {
    const value =
      student.whatsapp ||
      student.phone

    return value.replace(
      /[^\d]/g,
      ''
    )
  }

  const openWhatsApp = (
    student: Student
  ) => {
    const number =
      getWhatsAppNumber(student)

    if (!number) {
      return
    }

    const url =
      message.trim()
        ? `https://wa.me/${number}?text=${encodeURIComponent(
            message
          )}`
        : `https://wa.me/${number}`

    window.open(
      url,
      '_blank',
      'noopener,noreferrer'
    )
  }

  const openSelectedWhatsApp =
    () => {
      const firstStudent =
        selectedStudents.find(
          (student) =>
            Boolean(
              getWhatsAppNumber(
                student
              )
            )
        )

      if (!firstStudent) {
        return
      }

      openWhatsApp(
        firstStudent
      )
    }

  return (
    <div className="space-y-6">
      <PageHeader
        title="التواصل"
        description="التواصل مع الطلاب وأولياء الأمور عبر WhatsApp"
      />

      <div className="flex flex-wrap gap-2 border-b pb-3">
        <Button
          type="button"
          variant={
            activeSection ===
            'direct'
              ? 'default'
              : 'outline'
          }
          onClick={() =>
            setActiveSection(
              'direct'
            )
          }
        >
          <MessageCircle className="size-4" />
          تواصل مباشر
        </Button>

        <Button
          type="button"
          variant={
            activeSection ===
            'group'
              ? 'default'
              : 'outline'
          }
          onClick={() =>
            setActiveSection(
              'group'
            )
          }
        >
          <Users className="size-4" />
          تواصل كمجموعة
        </Button>
      </div>

      {activeSection ===
        'direct' && (
        <Card>
          <CardContent className="space-y-5 p-5">
            <div>
              <h2 className="text-lg font-semibold">
                تواصل مباشر
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                اختر طالبًا أو عدة طلاب واكتب الرسالة، ثم افتح WhatsApp لكل طالب.
              </p>
            </div>

            <div className="relative">
              <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <input
                value={search}
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="البحث باسم الطالب أو رقم الهاتف..."
                className="h-10 w-full rounded-md border bg-background px-3 pr-9 text-sm outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/30 p-3">
              <div className="text-sm">
                <span className="text-muted-foreground">
                  المحدد:
                </span>{' '}
                <span className="font-semibold">
                  {
                    selectedStudentIds.length
                  }
                </span>{' '}
                طالب
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={
                    selectAllVisible
                  }
                  disabled={
                    filteredStudents.length ===
                    0
                  }
                >
                  <Check className="size-4" />
                  تحديد الظاهر
                </Button>

                {selectedStudentIds.length >
                  0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setSelectedStudentIds(
                        []
                      )
                    }
                  >
                    إلغاء التحديد
                  </Button>
                )}
              </div>
            </div>

            <div className="max-h-80 space-y-2 overflow-y-auto rounded-md border p-2">
              {loading ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  جاري تحميل الطلاب...
                </div>
              ) : filteredStudents.length ===
                0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  لا توجد نتائج
                </div>
              ) : (
                filteredStudents.map(
                  (student) => {
                    const selected =
                      selectedStudentIds.includes(
                        student.id
                      )

                    const number =
                      getWhatsAppNumber(
                        student
                      )

                    return (
                      <div
                        key={
                          student.id
                        }
                        className={`flex items-center justify-between gap-3 rounded-md border p-3 ${
                          selected
                            ? 'bg-muted'
                            : ''
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            toggleStudent(
                              student.id
                            )
                          }
                          className="flex min-w-0 flex-1 items-center gap-3 text-right"
                        >
                          <span
                            className={`flex size-5 shrink-0 items-center justify-center rounded border ${
                              selected
                                ? 'bg-primary text-primary-foreground'
                                : ''
                            }`}
                          >
                            {selected && (
                              <Check className="size-3" />
                            )}
                          </span>

                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">
                              {
                                student.name
                              }
                            </span>

                            <span className="block truncate text-xs text-muted-foreground">
                              {number ||
                                'لا يوجد رقم WhatsApp'}
                            </span>
                          </span>
                        </button>

                        {number && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              openWhatsApp(
                                student
                              )
                            }
                          >
                            <ExternalLink className="size-4" />
                            فتح
                          </Button>
                        )}
                      </div>
                    )
                  }
                )
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                الرسالة
              </label>

              <textarea
                value={message}
                onChange={(
                  event
                ) =>
                  setMessage(
                    event.target.value
                  )
                }
                placeholder="اكتب الرسالة التي تريد إرسالها..."
                rows={5}
                className="w-full resize-y rounded-md border bg-background p-3 text-sm outline-none"
              />
            </div>

            <div className="rounded-md border bg-muted/30 p-4">
              <div className="mb-3 text-sm font-medium">
                الطلاب المحددون
              </div>

              {selectedStudents.length ===
              0 ? (
                <p className="text-sm text-muted-foreground">
                  لم يتم تحديد أي طالب
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedStudents.map(
                    (
                      student,
                      index
                    ) => {
                      const number =
                        getWhatsAppNumber(
                          student
                        )

                      return (
                        <div
                          key={
                            student.id
                          }
                          className="flex items-center justify-between gap-3 rounded-md border bg-background p-2.5"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {index +
                                1}
                            </span>

                            <span className="truncate text-sm">
                              {
                                student.name
                              }
                            </span>
                          </div>

                          <Button
                            type="button"
                            size="sm"
                            disabled={
                              !number
                            }
                            onClick={() =>
                              openWhatsApp(
                                student
                              )
                            }
                          >
                            <Send className="size-4" />
                            فتح WhatsApp
                          </Button>
                        </div>
                      )
                    }
                  )}
                </div>
              )}
            </div>

            <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
              WhatsApp يفتح الرسالة جاهزة فقط. الإرسال النهائي يتم من WhatsApp نفسه.
            </div>

            <Button
              type="button"
              disabled={
                selectedStudents.length ===
                  0 ||
                !message.trim() ||
                !selectedStudents.some(
                  (student) =>
                    Boolean(
                      getWhatsAppNumber(
                        student
                      )
                    )
                )
              }
              onClick={
                openSelectedWhatsApp
              }
            >
              <MessageCircle className="size-4" />
              فتح أول محادثة
            </Button>
          </CardContent>
        </Card>
      )}

      {activeSection ===
        'group' && (
        <Card>
          <CardContent className="space-y-5 p-5">
            <div>
              <h2 className="text-lg font-semibold">
                تواصل كمجموعة
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                أضف بيانات مجموعة WhatsApp ورابط الدعوة لفتح المجموعة مباشرة.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                اسم المجموعة
              </label>

              <input
                value={groupName}
                onChange={(
                  event
                ) =>
                  setGroupName(
                    event.target.value
                  )
                }
                placeholder="مثال: أولياء أمور الصف الأول"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                رابط مجموعة WhatsApp
              </label>

              <input
                value={groupUrl}
                onChange={(
                  event
                ) =>
                  setGroupUrl(
                    event.target.value
                  )
                }
                placeholder="https://chat.whatsapp.com/..."
                dir="ltr"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
              />
            </div>

            {groupUrl.trim() && (
              <div className="rounded-md border bg-muted/30 p-4">
                <div className="mb-1 text-sm font-semibold">
                  {groupName.trim() ||
                    'مجموعة WhatsApp'}
                </div>

                <div
                  className="mb-3 break-all text-xs text-muted-foreground"
                  dir="ltr"
                >
                  {
                    groupUrl
                  }
                </div>

                <Button
                  type="button"
                  onClick={() =>
                    window.open(
                      groupUrl.trim(),
                      '_blank',
                      'noopener,noreferrer'
                    )
                  }
                >
                  <ExternalLink className="size-4" />
                  فتح مجموعة WhatsApp
                </Button>
              </div>
            )}

            <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
              رابط المجموعة يفتح مجموعة WhatsApp الموجودة مسبقًا. لا يتم إنشاء المجموعة أو إرسال الرسائل من النظام تلقائيًا.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
