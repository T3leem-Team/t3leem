'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  ExternalLink,
  Download,
  Save,
  Trash2,
  Users,
  UserPlus,
  Check,
  X,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'

import {
  Card,
  CardContent,
} from '@/components/ui/card'

import { Button } from '@/components/ui/button'

type GroupStudent = {
  id: string
  name: string
  phone: string
  whatsapp: string
}

type CommunicationViewGroupsProps = {
  students: GroupStudent[]
  selectedStudentIds: string[]
}

const normalizeWhatsAppNumber = (
  student: GroupStudent
) => {
  const value =
    student.whatsapp ||
    student.phone ||
    ''

  const digits =
    value.replace(/\D/g, '')

  if (digits.startsWith('973')) {
    return digits
  }

  if (digits.length === 8) {
    return `973${digits}`
  }

  return digits
}

const escapeVCardValue = (
  value: string
) => {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
}

const createVCard = (
  students: GroupStudent[]
) => {
  return (
    students
      .map((student) => {
        const number =
          normalizeWhatsAppNumber(
            student
          )

        const name =
          escapeVCardValue(
            student.name.trim()
          )

        return [
          'BEGIN:VCARD',
          'VERSION:3.0',
          'PRODID:-//T3LEEM//Contacts//AR',
          `FN;CHARSET=UTF-8:${name}`,
          `N;CHARSET=UTF-8:${name};;;;`,
          `TEL;TYPE=CELL:+${number}`,
          'END:VCARD',
        ].join('\r\n')
      })
      .join('\r\n\r\n') +
    '\r\n'
  )
}

export function CommunicationViewGroups({
  students,
  selectedStudentIds,
}: CommunicationViewGroupsProps) {
  const [
    groupName,
    setGroupName,
  ] = useState('')

  const [
    groupUrl,
    setGroupUrl,
  ] = useState('')

  const [
    savedGroupUrl,
    setSavedGroupUrl,
  ] = useState('')

  const [
    groupSaving,
    setGroupSaving,
  ] = useState(false)

  const [
    groupMessage,
    setGroupMessage,
  ] = useState('')

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    selectedGroupStudentIds,
    setSelectedGroupStudentIds,
  ] = useState<string[]>(
    selectedStudentIds
  )

  /*
   * =========================================================
   * Load saved group
   * =========================================================
   */

  useEffect(() => {
    setSelectedGroupStudentIds(
      selectedStudentIds
    )
  }, [selectedStudentIds])

  useEffect(() => {
    let cancelled = false

    async function loadGroup() {
      setLoading(true)

      const {
        data,
        error,
      } = await supabase
        .from('communication_group')
        .select('whatsapp_url')
        .limit(1)
        .maybeSingle()

      if (cancelled) {
        return
      }

      if (error) {
        console.error(
          'Communication group load error:',
          error
        )

        setGroupMessage(
          'تعذر تحميل بيانات المجموعة.'
        )
      } else {
        const url =
          data?.whatsapp_url ?? ''

        setGroupUrl(url)
        setSavedGroupUrl(url)
      }

      setLoading(false)
    }

    loadGroup()

    return () => {
      cancelled = true
    }
  }, [])

  /*
   * =========================================================
   * Selected students
   * =========================================================
   */

  const selectedStudents =
    useMemo(() => {
      return students.filter(
        (student) =>
          selectedGroupStudentIds.includes(
            student.id
          )
      )
    }, [
      students,
      selectedGroupStudentIds,
    ])

  const studentsWithNumbers =
    useMemo(() => {
      return selectedStudents.filter(
        (student) =>
          Boolean(
            normalizeWhatsAppNumber(
              student
            )
          )
      )
    }, [selectedStudents])

  const studentsWithoutNumbers =
    useMemo(() => {
      return selectedStudents.filter(
        (student) =>
          !normalizeWhatsAppNumber(
            student
          )
      )
    }, [selectedStudents])

  const hasSavedGroup =
    Boolean(
      savedGroupUrl.trim()
    )

  const groupChanged =
    groupUrl.trim() !==
    savedGroupUrl.trim()

  /*
   * =========================================================
   * Student selection
   * =========================================================
   */

  const toggleGroupStudent = (
    studentId: string
  ) => {
    setSelectedGroupStudentIds(
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

  const clearGroupStudents = () => {
    setSelectedGroupStudentIds([])
  }

  const selectAllStudents = () => {
    setSelectedGroupStudentIds(
      students.map(
        (student) => student.id
      )
    )
  }

  /*
   * =========================================================
   * Save / delete group URL
   * =========================================================
   */

  const saveGroupUrl = async () => {
    const url =
      groupUrl.trim()

    if (!url) {
      setGroupMessage(
        'أدخل رابط المجموعة أولاً.'
      )
      return
    }

    if (
      !url.startsWith(
        'https://chat.whatsapp.com/'
      )
    ) {
      setGroupMessage(
        'يرجى إدخال رابط مجموعة WhatsApp صحيح.'
      )
      return
    }

    setGroupSaving(true)
    setGroupMessage('')

    try {
      const {
        data: existing,
        error: findError,
      } = await supabase
        .from('communication_group')
        .select('id')
        .limit(1)
        .maybeSingle()

      if (findError) {
        console.error(
          'Find communication group error:',
          findError
        )

        setGroupMessage(
          'تعذر الوصول إلى بيانات المجموعة.'
        )
        return
      }

      let error = null

      if (existing?.id) {
        const result =
          await supabase
            .from(
              'communication_group'
            )
            .update({
              whatsapp_url: url,
              updated_at:
                new Date().toISOString(),
            })
            .eq(
              'id',
              existing.id
            )

        error = result.error
      } else {
        const result =
          await supabase
            .from(
              'communication_group'
            )
            .insert({
              whatsapp_url: url,
              updated_at:
                new Date().toISOString(),
            })

        error = result.error
      }

      if (error) {
        console.error(
          'Save communication group error:',
          error
        )

        setGroupMessage(
          'تعذر حفظ الرابط.'
        )
        return
      }

      setSavedGroupUrl(url)
      setGroupUrl(url)

      setGroupMessage(
        'تم حفظ رابط المجموعة.'
      )
    } finally {
      setGroupSaving(false)
    }
  }

  const deleteGroupUrl = async () => {
    setGroupSaving(true)
    setGroupMessage('')

    try {
      const {
        data: existing,
        error: findError,
      } = await supabase
        .from('communication_group')
        .select('id')
        .limit(1)
        .maybeSingle()

      if (findError) {
        console.error(
          'Find communication group error:',
          findError
        )

        setGroupMessage(
          'تعذر الوصول إلى بيانات المجموعة.'
        )
        return
      }

      if (!existing?.id) {
        setGroupUrl('')
        setSavedGroupUrl('')

        setGroupMessage(
          'لا يوجد رابط محفوظ.'
        )
        return
      }

      const {
        error,
      } = await supabase
        .from('communication_group')
        .update({
          whatsapp_url: null,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          'id',
          existing.id
        )

      if (error) {
        console.error(
          'Delete communication group URL error:',
          error
        )

        setGroupMessage(
          'تعذر مسح الرابط.'
        )
        return
      }

      setGroupUrl('')
      setSavedGroupUrl('')

      setGroupMessage(
        'تم مسح رابط المجموعة.'
      )
    } finally {
      setGroupSaving(false)
    }
  }

  /*
   * =========================================================
   * VCF
   * =========================================================
   */

  const downloadContacts = () => {
    if (
      studentsWithNumbers.length ===
      0
    ) {
      setGroupMessage(
        'اختر طلاباً لديهم أرقام WhatsApp أولاً.'
      )
      return
    }

    const vCard =
      createVCard(
        studentsWithNumbers
      )

    const blob =
      new Blob(
        [vCard],
        {
          type: 'text/vcard',
        }
      )

    const url =
      URL.createObjectURL(blob)

    const link =
      document.createElement(
        'a'
      )

    const safeName =
      groupName
        .trim()
        .replace(
          /[\\/:*?"<>|]/g,
          ''
        )

    link.href = url

    link.download =
      safeName
        ? `T3LEEM-${safeName}.vcf`
        : 'T3LEEM-طلاب-المجموعة.vcf'

    document.body.appendChild(
      link
    )

    link.click()

    document.body.removeChild(
      link
    )

    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 1000)

    setGroupMessage(
      `تم إنشاء ملف جهات الاتصال لـ ${studentsWithNumbers.length} طالب. افتح الملف في الهاتف واختر إضافة جميع جهات الاتصال.`
    )
  }

  /*
   * =========================================================
   * WhatsApp
   * =========================================================
   */

  const openWhatsApp = () => {
    window.open(
      'https://wa.me/',
      '_blank',
      'noopener,noreferrer'
    )
  }

  /*
   * =========================================================
   * Render
   * =========================================================
   */

  return (
    <Card>
      <CardContent className="space-y-6 p-5">
        <div>
          <h2 className="text-lg font-semibold">
            تواصل كمجموعة
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            اختر الطلاب، أنشئ ملف جهات اتصال واحد، ثم أنشئ المجموعة يدوياً في WhatsApp.
          </p>
        </div>

        {loading ? (
          <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
            جاري تحميل بيانات المجموعة...
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                اسم المجموعة
              </label>

              <input
                value={groupName}
                onChange={(event) => {
                  setGroupName(
                    event.target.value
                  )
                  setGroupMessage('')
                }}
                placeholder="مثلاً: الصف الأول - مجموعة الطلاب"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
              />

              <p className="text-xs text-muted-foreground">
                الاسم يستخدم لتسمية ملف جهات الاتصال فقط. إنشاء اسم مجموعة WhatsApp يتم داخل WhatsApp.
              </p>
            </div>

            <div className="rounded-lg border">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
                <div>
                  <div className="flex items-center gap-2 font-semibold">
                    <Users className="size-4" />
                    طلاب المجموعة
                  </div>

                  <div className="mt-1 text-xs text-muted-foreground">
                    المحدد:{' '}
                    {
                      selectedGroupStudentIds.length
                    }{' '}
                    | لديهم رقم:{' '}
                    {
                      studentsWithNumbers.length
                    }
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={
                      selectAllStudents
                    }
                    disabled={
                      students.length ===
                      0
                    }
                  >
                    <Check className="size-4" />
                    تحديد الكل
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={
                      clearGroupStudents
                    }
                    disabled={
                      selectedGroupStudentIds.length ===
                      0
                    }
                  >
                    <X className="size-4" />
                    إلغاء الكل
                  </Button>
                </div>
              </div>

              <div className="max-h-80 space-y-2 overflow-y-auto p-3">
                {students.length ===
                0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    لا يوجد طلاب.
                  </div>
                ) : (
                  students.map(
                    (student) => {
                      const selected =
                        selectedGroupStudentIds.includes(
                          student.id
                        )

                      const number =
                        normalizeWhatsAppNumber(
                          student
                        )

                      return (
                        <button
                          key={
                            student.id
                          }
                          type="button"
                          onClick={() =>
                            toggleGroupStudent(
                              student.id
                            )
                          }
                          className={`flex w-full items-center justify-between gap-3 rounded-md border p-3 text-right transition ${
                            selected
                              ? 'border-primary bg-primary/5'
                              : 'hover:bg-muted'
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-3">
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
                                  'لا يوجد رقم'}
                              </span>
                            </span>
                          </span>

                          {selected && (
                            <UserPlus className="size-4 shrink-0 text-primary" />
                          )}
                        </button>
                      )
                    }
                  )
                )}
              </div>
            </div>

            {studentsWithoutNumbers.length >
              0 &&
              selectedStudents.length >
                0 && (
                <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                  يوجد{' '}
                  {
                    studentsWithoutNumbers.length
                  }{' '}
                  طالب محدد بدون رقم WhatsApp، ولن تتم إضافتهم إلى ملف جهات الاتصال.
                </div>
              )}

            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="mb-3">
                <div className="font-semibold">
                  إضافة الطلاب إلى الهاتف
                </div>

                <div className="mt-1 text-xs text-muted-foreground">
                  سيتم إنشاء ملف واحد يحتوي على جميع الطلاب المحددين الذين لديهم أرقام.
                </div>
              </div>

              <Button
                type="button"
                onClick={
                  downloadContacts
                }
                disabled={
                  studentsWithNumbers.length ===
                  0
                }
              >
                <Download className="size-4" />
                إنشاء ملف جهات الاتصال
              </Button>
            </div>

            <div className="rounded-lg border border-dashed p-4">
              <div className="mb-2 font-medium">
                طريقة إنشاء المجموعة
              </div>

              <ol className="space-y-1 text-sm text-muted-foreground">
                <li>
                  1. اختر الطلاب المطلوبين.
                </li>

                <li>
                  2. اضغط «إنشاء ملف جهات الاتصال».
                </li>

                <li>
                  3. استورد ملف VCF في هاتفك، وسيتم إضافة جهات الاتصال دفعة واحدة.
                </li>

                <li>
                  4. افتح WhatsApp وأنشئ المجموعة واختر جهات الاتصال المطلوبة.
                </li>

                <li>
                  5. انسخ رابط المجموعة وضعه أدناه لحفظه في T3LEEM.
                </li>
              </ol>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={
                  openWhatsApp
                }
              >
                <ExternalLink className="size-4" />
                فتح WhatsApp
              </Button>
            </div>

            <div className="space-y-2 border-t pt-5">
              <label className="text-sm font-medium">
                رابط مجموعة WhatsApp
              </label>

              <input
                value={groupUrl}
                onChange={(event) => {
                  setGroupUrl(
                    event.target.value
                  )
                  setGroupMessage('')
                }}
                placeholder="https://chat.whatsapp.com/..."
                dir="ltr"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
              />

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={
                    saveGroupUrl
                  }
                  disabled={
                    groupSaving ||
                    !groupUrl.trim() ||
                    !groupChanged
                  }
                >
                  <Save className="size-4" />

                  {groupSaving
                    ? 'جاري الحفظ...'
                    : hasSavedGroup
                      ? 'تحديث الرابط'
                      : 'حفظ الرابط'}
                </Button>

                {hasSavedGroup && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={
                      deleteGroupUrl
                    }
                    disabled={
                      groupSaving
                    }
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                    مسح الرابط
                  </Button>
                )}
              </div>
            </div>

            {groupMessage && (
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                {groupMessage}
              </div>
            )}

            {hasSavedGroup && (
              <div className="rounded-md border bg-muted/30 p-4">
                <div className="mb-1 text-sm font-semibold">
                  رابط المجموعة المحفوظ
                </div>

                <div
                  className="mb-3 break-all text-xs text-muted-foreground"
                  dir="ltr"
                >
                  {savedGroupUrl}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() =>
                      window.open(
                        savedGroupUrl,
                        '_blank',
                        'noopener,noreferrer'
                      )
                    }
                  >
                    <ExternalLink className="size-4" />
                    فتح مجموعة WhatsApp
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setGroupUrl(
                        savedGroupUrl
                      )
                    }
                  >
                    تعديل الرابط
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
