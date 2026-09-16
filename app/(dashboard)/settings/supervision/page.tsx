'use client'

import { useMemo, useState } from 'react'
import {
AlertCircle,
CalendarDays,
CheckCircle2,
Clock3,
FileText,
MessageSquareText,
Plus,
UserCheck,
UserX,
X,
} from 'lucide-react'

import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type SupervisionType =
| 'day_cancelled'
| 'lesson_cancelled'
| 'teacher_absent'
| 'teacher_late'
| 'note'

type SupervisionRecord = {
id: string
type: SupervisionType
date: string
teacher: string
reason: string
note: string
}

const currentCourse = {
name: 'الدورة الحالية',
startDate: '01/09/2026',
endDate: '30/11/2026',
days: ['الأحد', 'الثلاثاء', 'الخميس'],
}

const teachers = [
'أحمد محمد',
'خالد علي',
'محمد حسن',
'عبدالله أحمد',
]

const initialRecords: SupervisionRecord[] = []

const supervisionTypes: {
value: SupervisionType
label: string
}[] = [
{
value: 'day_cancelled',
label: 'إلغاء يوم دراسي',
},
{
value: 'lesson_cancelled',
label: 'إلغاء درس',
},
{
value: 'teacher_absent',
label: 'غياب معلم',
},
{
value: 'teacher_late',
label: 'تأخر معلم',
},
{
value: 'note',
label: 'ملاحظة إشرافية',
},
]

function getTypeLabel(type: SupervisionType) {
return (
supervisionTypes.find((item) => item.value === type)?.label ??
type
)
}

function getTypeIcon(type: SupervisionType) {
switch (type) {
case 'day_cancelled':
case 'lesson_cancelled':
return CalendarDays


case 'teacher_absent':
  return UserX

case 'teacher_late':
  return Clock3

case 'note':
  return MessageSquareText


}
}

function getTypeBadgeVariant(type: SupervisionType) {
switch (type) {
case 'teacher_absent':
return 'destructive' as const

```
case 'day_cancelled':
case 'lesson_cancelled':
  return 'warning' as const

default:
  return 'neutral' as const


}
}

export default function SupervisionPage() {
const [records, setRecords] =
useState<SupervisionRecord[]>(initialRecords)

const [isFormOpen, setIsFormOpen] = useState(false)

const [selectedType, setSelectedType] =
useState<SupervisionType>('day_cancelled')

const [selectedTeacher, setSelectedTeacher] = useState('')

const [selectedDate, setSelectedDate] = useState(
new Date().toISOString().slice(0, 10),
)

const [reason, setReason] = useState('')
const [note, setNote] = useState('')

const today = new Date().toISOString().slice(0, 10)

const todayRecords = useMemo(
() => records.filter((record) => record.date === today),
[records, today],
)

const openForm = (type: SupervisionType) => {
setSelectedType(type)
setSelectedTeacher('')
setSelectedDate(today)
setReason('')
setNote('')
setIsFormOpen(true)
}

const closeForm = () => {
setIsFormOpen(false)
}

const saveRecord = (event: React.FormEvent<HTMLFormElement>) => {
event.preventDefault()


if (!reason.trim()) return

if (
  (selectedType === 'teacher_absent' ||
    selectedType === 'teacher_late') &&
  !selectedTeacher
) {
  return
}

const newRecord: SupervisionRecord = {
  id: 'supervision-' + Date.now(),
  type: selectedType,
  date: selectedDate,
  teacher:
    selectedType === 'day_cancelled'
      ? 'جميع المعلمين'
      : selectedTeacher,
  reason: reason.trim(),
  note: note.trim(),
}

setRecords((current) => [newRecord, ...current])
closeForm()


}

return ( <div className="space-y-6">
<PageHeader
title="إشراف الدوام والدروس"
description="متابعة أيام الدراسة والمعلمين وتسجيل الحالات والملاحظات الإشرافية"
action={
<Button onClick={() => openForm('note')}> <Plus className="size-4" />
إضافة سجل إشرافي </Button>
}
/>


  {/* الدورة الحالية */}
  <Card>
    <CardContent className="p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CalendarDays className="size-5" />
          </span>

          <div>
            <p className="text-sm text-muted-foreground">
              الدورة الجارية
            </p>

            <h2 className="mt-1 text-lg font-semibold">
              {currentCourse.name}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {currentCourse.startDate} → {currentCourse.endDate}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {currentCourse.days.map((day) => (
            <Badge key={day} variant="neutral">
              {day}
            </Badge>
          ))}
        </div>
      </div>
    </CardContent>
  </Card>

  {/* حالة اليوم */}
  <div>
    <div className="mb-4">
      <h2 className="text-lg font-semibold">
        إجراءات الإشراف
      </h2>

      <p className="text-sm text-muted-foreground">
        تسجيل الحالات المتعلقة بالدوام والدروس والمعلمين
      </p>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <ActionCard
        icon={CalendarDays}
        title="إلغاء يوم دراسي"
        description="إلغاء يوم كامل من الدراسة مع ذكر السبب"
        onClick={() => openForm('day_cancelled')}
      />

      <ActionCard
        icon={CalendarDays}
        title="إلغاء درس"
        description="إلغاء درس محدد لمعلم أو مجموعة"
        onClick={() => openForm('lesson_cancelled')}
      />

      <ActionCard
        icon={UserX}
        title="غياب معلم"
        description="تسجيل غياب معلم في يوم الدراسة"
        onClick={() => openForm('teacher_absent')}
      />

      <ActionCard
        icon={Clock3}
        title="تأخر معلم"
        description="تسجيل حالة تأخر المعلم"
        onClick={() => openForm('teacher_late')}
      />

      <ActionCard
        icon={MessageSquareText}
        title="ملاحظة إشرافية"
        description="إضافة ملاحظة أو متابعة إدارية"
        onClick={() => openForm('note')}
      />
    </div>
  </div>

  {/* ملخص اليوم */}
  <div>
    <div className="mb-4">
      <h2 className="text-lg font-semibold">
        ملخص اليوم
      </h2>

      <p className="text-sm text-muted-foreground">
        السجلات الإشرافية المسجلة لهذا اليوم
      </p>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryCard
        icon={CalendarDays}
        label="إلغاء الدروس"
        value={
          todayRecords.filter(
            (record) =>
              record.type === 'day_cancelled' ||
              record.type === 'lesson_cancelled',
          ).length
        }
      />

      <SummaryCard
        icon={UserX}
        label="غياب المعلمين"
        value={
          todayRecords.filter(
            (record) => record.type === 'teacher_absent',
          ).length
        }
      />

      <SummaryCard
        icon={Clock3}
        label="تأخر المعلمين"
        value={
          todayRecords.filter(
            (record) => record.type === 'teacher_late',
          ).length
        }
      />

      <SummaryCard
        icon={MessageSquareText}
        label="الملاحظات"
        value={
          todayRecords.filter(
            (record) => record.type === 'note',
          ).length
        }
      />
    </div>
  </div>

  {/* سجل الإشراف */}
  <Card>
    <CardContent className="p-0">
      <div className="border-b p-5">
        <h2 className="font-semibold">
          سجل الإشراف
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          جميع الحالات والملاحظات المسجلة من المشرفين
        </p>
      </div>

      {records.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-muted">
            <FileText className="size-5 text-muted-foreground" />
          </span>

          <p className="mt-4 font-medium">
            لا توجد سجلات إشرافية
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            ستظهر هنا حالات الإلغاء وغياب المعلمين
            والملاحظات بعد تسجيلها.
          </p>
        </div>
      ) : (
        <div className="divide-y">
          {records.map((record) => {
            const Icon = getTypeIcon(record.type)

            return (
              <div
                key={record.id}
                className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between"
              >
                <div className="flex gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icon className="size-5 text-muted-foreground" />
                  </span>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">
                        {getTypeLabel(record.type)}
                      </p>

                      <Badge
                        variant={getTypeBadgeVariant(
                          record.type,
                        )}
                      >
                        {record.date}
                      </Badge>
                    </div>

                    <p className="mt-1 text-sm">
                      {record.teacher}
                    </p>

                    <p className="mt-2 text-sm text-muted-foreground">
                      {record.reason}
                    </p>

                    {record.note && (
                      <p className="mt-2 rounded-md bg-muted/50 p-2 text-sm text-muted-foreground">
                        {record.note}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </CardContent>
  </Card>

  {/* نافذة إضافة سجل */}
  {isFormOpen && (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="إغلاق"
        className="absolute inset-0 bg-black/40"
        onClick={closeForm}
      />

      <aside className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l bg-background shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">
              {getTypeLabel(selectedType)}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              تسجيل حالة إشرافية للدورة الحالية
            </p>
          </div>

          <button
            type="button"
            onClick={closeForm}
            className="rounded-md p-2 hover:bg-muted"
            aria-label="إغلاق"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={saveRecord}>
          <div className="space-y-5 p-6">
            <div>
              <label className="mb-2 block text-sm font-medium">
                التاريخ
              </label>

              <input
                type="date"
                value={selectedDate}
                onChange={(event) =>
                  setSelectedDate(event.target.value)
                }
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
                required
              />
            </div>

            {selectedType !== 'day_cancelled' && (
              <div>
                <label className="mb-2 block text-sm font-medium">
                  المعلم
                </label>

                <select
                  value={selectedTeacher}
                  onChange={(event) =>
                    setSelectedTeacher(event.target.value)
                  }
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  required
                >
                  <option value="">
                    اختر المعلم
                  </option>

                  {teachers.map((teacher) => (
                    <option key={teacher} value={teacher}>
                      {teacher}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium">
                السبب
              </label>

              <input
                type="text"
                value={reason}
                onChange={(event) =>
                  setReason(event.target.value)
                }
                placeholder={
                  selectedType === 'day_cancelled'
                    ? 'مثال: عطلة رسمية'
                    : selectedType === 'teacher_absent'
                      ? 'مثال: إجازة مرضية'
                      : selectedType === 'teacher_late'
                        ? 'مثال: تأخر بسبب ظرف طارئ'
                        : 'اكتب سبب الحالة'
                }
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                ملاحظات إضافية
              </label>

              <textarea
                value={note}
                onChange={(event) =>
                  setNote(event.target.value)
                }
                placeholder="أضف أي تفاصيل أو ملاحظات إضافية..."
                rows={5}
                className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none"
              />
            </div>

            {(selectedType === 'day_cancelled' ||
              selectedType === 'lesson_cancelled') && (
              <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-600" />

                <p className="text-sm leading-6 text-muted-foreground">
                  عند تسجيل الإلغاء، لن يدخل هذا اليوم أو
                  الدرس ضمن الأيام الفعلية المستخدمة لحساب
                  نسبة الحضور.
                </p>
              </div>
            )}
          </div>

          <div className="sticky bottom-0 flex gap-3 border-t bg-background p-6">
            <Button type="submit" className="flex-1">
              <CheckCircle2 className="size-4" />
              حفظ السجل
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={closeForm}
            >
              إلغاء
            </Button>
          </div>
        </form>
      </aside>
    </div>
  )}
</div>


)
}

function ActionCard({
icon: Icon,
title,
description,
onClick,
}: {
icon: typeof CalendarDays
title: string
description: string
onClick: () => void
}) {
return ( <button
   type="button"
   onClick={onClick}
   className="text-right"
 > <Card className="h-full transition-colors hover:border-primary/40"> <CardContent className="p-5"> <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"> <Icon className="size-5" /> </span>


      <h3 className="mt-4 font-semibold">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </CardContent>
  </Card>
</button>


)
}

function SummaryCard({
icon: Icon,
label,
value,
}: {
icon: typeof CalendarDays
label: string
value: number
}) {
return ( <Card> <CardContent className="flex items-center gap-3 p-5"> <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted"> <Icon className="size-5 text-muted-foreground" /> </span>

    <div>
      <p className="text-sm text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold tabular-nums">
        {value}
      </p>
    </div>
  </CardContent>
</Card>


)
}
