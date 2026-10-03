'use client'

import {
  ExternalLink,
  Pencil,
  Save,
  Trash2,
  Users,
  Download,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export type GroupStudent = {
  id: string
  name: string
  phone: string
  whatsapp: string
}

type CommunicationViewGroupsProps = {
  students: GroupStudent[]
  selectedStudentIds: string[]
  groupUrl: string
  savedGroupUrl: string
  groupSaving: boolean
  groupMessage: string
  onGroupUrlChange: (value: string) => void
  onSaveGroupUrl: () => void
  onDeleteGroupUrl: () => void
  onOpenSavedGroup: () => void
}

const getWhatsAppNumber = (
  student: GroupStudent
) => {
  const value =
    student.whatsapp ||
    student.phone ||
    ''

  const digits = value.replace(
    /\D/g,
    ''
  )

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

export function CommunicationViewGroups({
  students,
  selectedStudentIds,
  groupUrl,
  savedGroupUrl,
  groupSaving,
  groupMessage,
  onGroupUrlChange,
  onSaveGroupUrl,
  onDeleteGroupUrl,
  onOpenSavedGroup,
}: CommunicationViewGroupsProps) {
  const selectedStudents =
    students.filter((student) =>
      selectedStudentIds.includes(
        student.id
      )
    )

  const studentsWithNumbers =
    selectedStudents.filter(
      (student) =>
        Boolean(
          getWhatsAppNumber(student)
        )
    )

  const createContactsFile =
    () => {
      if (
        studentsWithNumbers.length ===
        0
      ) {
        return
      }

      const cards =
        studentsWithNumbers.map(
          (student) => {
            const number =
              getWhatsAppNumber(
                student
              )

            const name =
              `${student.name}`.trim()

            return [
              'BEGIN:VCARD',
              'VERSION:3.0',
              `FN:${escapeVCardValue(name)}`,
              `N:${escapeVCardValue(name)};;;;`,
              `TEL;TYPE=CELL,VOICE:+${number}`,
              'END:VCARD',
            ].join('\r\n')
          }
        )

      const content =
        `${cards.join('\r\n')}\r\n`

      const blob =
        new Blob(
          [content],
          {
            type: 'text/vcard;charset=utf-8',
          }
        )

      const url =
        URL.createObjectURL(blob)

      const link =
        document.createElement(
          'a'
        )

      link.href = url
      link.download =
        'T3LEEM-طلاب-المجموعة.vcf'

      document.body.appendChild(
        link
      )

      link.click()
      link.remove()

      setTimeout(() => {
        URL.revokeObjectURL(url)
      }, 1000)
    }

  const openWhatsApp =
    () => {
      window.open(
        'https://wa.me/',
        '_blank',
        'noopener,noreferrer'
      )
    }

  const hasSelectedStudents =
    selectedStudents.length > 0

  const hasStudentsWithNumbers =
    studentsWithNumbers.length > 0

  const hasSavedGroup =
    Boolean(
      savedGroupUrl.trim()
    )

  const groupChanged =
    groupUrl.trim() !==
    savedGroupUrl.trim()

  return (
    <Card>
      <CardContent className="space-y-5 p-5">
        <div>
          <h2 className="text-lg font-semibold">
            تواصل كمجموعة
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            جهّز طلاب المجموعة، احفظ جهات الاتصال دفعة واحدة، ثم أكمل إنشاء المجموعة من WhatsApp.
          </p>
        </div>

        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-semibold">
                <Users className="size-5" />
                تجهيز مجموعة الطلاب
              </div>

              <p className="mt-1 text-xs text-muted-foreground">
                استخدم الطلاب المحددين من قسم التواصل المباشر.
              </p>
            </div>

            <div className="text-sm">
              المحدد:
              {' '}
              <span className="font-semibold">
                {selectedStudents.length}
              </span>
            </div>
          </div>

          {!hasSelectedStudents ? (
            <div className="mt-4 rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              حدد الطلاب أولاً من قسم «تواصل مباشر»، ثم ارجع إلى «تواصل كمجموعة».
            </div>
          ) : (
            <>
              <div className="mt-4 space-y-2">
                {selectedStudents.map(
                  (student) => {
                    const number =
                      getWhatsAppNumber(
                        student
                      )

                    return (
                      <div
                        key={
                          student.id
                        }
                        className="flex items-center justify-between gap-3 rounded-md border bg-background p-3"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {
                              student.name
                            }
                          </div>

                          <div className="text-xs text-muted-foreground">
                            {number ||
                              'لا يوجد رقم'}
                          </div>
                        </div>

                        <span
                          className={`text-xs ${
                            number
                              ? 'text-green-600'
                              : 'text-destructive'
                          }`}
                        >
                          {number
                            ? 'جاهز'
                            : 'بدون رقم'}
                        </span>
                      </div>
                    )
                  }
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={
                    createContactsFile
                  }
                  disabled={
                    !hasStudentsWithNumbers
                  }
                >
                  <Download className="size-4" />
                  حفظ الطلاب كجهات اتصال
                </Button>

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

              <div className="mt-3 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                زر «حفظ الطلاب كجهات اتصال» ينشئ ملفاً واحداً يحتوي جميع الطلاب المحددين الذين لديهم أرقام. بعد استيراده في الجوال تظهر الأسماء كجهات اتصال، ثم يمكنك إنشاء المجموعة وإضافة الطلاب من WhatsApp.
              </div>
            </>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            رابط مجموعة WhatsApp
          </label>

          <input
            value={groupUrl}
            onChange={(event) => {
              onGroupUrlChange(
                event.target.value
              )
            }}
            placeholder="https://chat.whatsapp.com/..."
            dir="ltr"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={
              onSaveGroupUrl
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
                onDeleteGroupUrl
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
                onClick={
                  onOpenSavedGroup
                }
              >
                <ExternalLink className="size-4" />
                فتح مجموعة WhatsApp
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  onGroupUrlChange(
                    savedGroupUrl
                  )
                }
              >
                <Pencil className="size-4" />
                تعديل الرابط
              </Button>
            </div>
          </div>
        )}

        <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
          رابط المجموعة محفوظ في النظام ويمكن تعديله أو استبداله أو مسحه في أي وقت.
        </div>
      </CardContent>
    </Card>
  )
}
