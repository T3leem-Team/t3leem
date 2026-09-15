'use client'

import { useMemo, useState } from 'react'
import { Search, UserPlus, Filter, X } from 'lucide-react'

import { PageHeader } from '@/components/dashboard/page-header'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
Table,
TableBody,
TableCell,
TableHead,
TableHeader,
TableRow,
} from '@/components/ui/table'
import { students, academicGrades } from '@/lib/data'

type Filters = {
name: string
personalId: string
grade: string
phone: string
whatsapp: string
paymentStatus: string
amountPaid: string
amountRemaining: string
chronicDiseases: string
notes: string
}

const emptyFilters: Filters = {
name: '',
personalId: '',
grade: '',
phone: '',
whatsapp: '',
paymentStatus: '',
amountPaid: '',
amountRemaining: '',
chronicDiseases: '',
notes: '',
}

export function StudentsView() {
const [search, setSearch] = useState('')
const [filters, setFilters] = useState<Filters>(emptyFilters)
const [isAddStudentOpen, setIsAddStudentOpen] = useState(false)
const [studentList, setStudentList] = useState(students)
  

const updateFilter = (key: keyof Filters, value: string) => {
setFilters((current) => ({ ...current, [key]: value }))
}

const filteredStudents = useMemo(() => {
const query = search.trim().toLowerCase()


return studentList.filter((student) => {
  const remaining =
    student.paymentStatus === 'معفي'
      ? 0
      : Math.max(student.amountDue - student.amountPaid, 0)

  const matchesSearch =
    !query ||
    Object.values(student).some((value) =>
      String(value).toLowerCase().includes(query)
    ) ||
    String(remaining).includes(query)

  const matches = {
    name:
      !filters.name ||
      student.name.toLowerCase().includes(filters.name.toLowerCase()),
    personalId:
      !filters.personalId ||
      student.personalId.includes(filters.personalId),
    grade: !filters.grade || student.grade === filters.grade,
    phone: !filters.phone || student.phone.includes(filters.phone),
    whatsapp:
      !filters.whatsapp || student.whatsapp.includes(filters.whatsapp),
    paymentStatus:
      !filters.paymentStatus ||
      student.paymentStatus === filters.paymentStatus,
    amountPaid:
      !filters.amountPaid ||
      String(student.amountPaid).includes(filters.amountPaid),
    amountRemaining:
      !filters.amountRemaining ||
      String(remaining).includes(filters.amountRemaining),
    chronicDiseases:
      !filters.chronicDiseases ||
      student.chronicDiseases
        .toLowerCase()
        .includes(filters.chronicDiseases.toLowerCase()),
    notes:
      !filters.notes ||
      student.notes
        .toLowerCase()
        .includes(filters.notes.toLowerCase()),
  }

  return matchesSearch && Object.values(matches).every(Boolean)
})


}, [search, filters, studentList])

const textFilter = (key: keyof Filters, placeholder: string) => ( <div className="relative mt-2"> <Filter className="absolute right-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
<input
value={filters[key]}
onChange={(e) => updateFilter(key, e.target.value)}
placeholder={placeholder}
className="h-8 w-full min-w-[90px] rounded border bg-background px-2 pr-7 text-xs outline-none"
/> </div>
)

return ( <div className="space-y-6">
<PageHeader
title="الطلاب"
description={`إجمالي ${students.length} طالب مسجّل في النظام`}
action={
<Button onClick={() => setIsAddStudentOpen(true)}> <UserPlus className="size-4" />
إضافة طالب </Button>
}
/>


  <Card>
    <CardContent className="space-y-4 p-4">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث عام في جميع بيانات الطلاب..."
          className="h-10 w-full rounded-md border bg-background px-3 pr-9 text-sm outline-none"
        />
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                اسم الطالب
                {textFilter('name', 'بحث')}
              </TableHead>

              <TableHead>
                الرقم الشخصي
                {textFilter('personalId', 'بحث')}
              </TableHead>

              <TableHead>
                الصف الأكاديمي
                <select
                  value={filters.grade}
                  onChange={(e) => updateFilter('grade', e.target.value)}
                  className="mt-2 h-8 w-full min-w-[120px] rounded border bg-background px-2 text-xs"
                >
                  <option value="">الكل</option>
                  {academicGrades.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </TableHead>

              <TableHead>
                رقم الهاتف
                {textFilter('phone', 'بحث')}
              </TableHead>

              <TableHead>
                رقم واتساب
                {textFilter('whatsapp', 'بحث')}
              </TableHead>

              <TableHead>
                الدفع
                <select
                  value={filters.paymentStatus}
                  onChange={(e) =>
                    updateFilter('paymentStatus', e.target.value)
                  }
                  className="mt-2 h-8 w-full min-w-[120px] rounded border bg-background px-2 text-xs"
                >
                  <option value="">الكل</option>
                  <option value="مدفوع بالكامل">مدفوع بالكامل</option>
                  <option value="مدفوع جزئيًا">مدفوع جزئيًا</option>
                  <option value="غير مدفوع">غير مدفوع</option>
                  <option value="معفي">معفي</option>
                </select>
              </TableHead>

              <TableHead>
                المبلغ المدفوع
                {textFilter('amountPaid', 'رقم')}
              </TableHead>

              <TableHead>
                المبلغ المتبقي
                {textFilter('amountRemaining', 'رقم')}
              </TableHead>

              <TableHead>
                الأمراض المزمنة
                {textFilter('chronicDiseases', 'بحث')}
              </TableHead>

              <TableHead>
                ملاحظات
                {textFilter('notes', 'بحث')}
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredStudents.map((student) => {
              const remaining =
                student.paymentStatus === 'معفي'
                  ? 0
                  : Math.max(student.amountDue - student.amountPaid, 0)

              return (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>{student.personalId}</TableCell>
                  <TableCell>{student.grade}</TableCell>
                  <TableCell dir="ltr">{student.phone}</TableCell>
                  <TableCell dir="ltr">{student.whatsapp}</TableCell>
                  <TableCell>
                    <StatusBadge status={student.paymentStatus} />
                  </TableCell>
                  <TableCell>
                    {student.amountPaid.toLocaleString('ar-BH')} د.ب
                  </TableCell>
                  <TableCell>
                    {student.paymentStatus === 'معفي'
                      ? '—'
                      : `${remaining.toLocaleString('ar-BH')} د.ب`}
                  </TableCell>
                  <TableCell>{student.chronicDiseases}</TableCell>
                  <TableCell>{student.notes || '—'}</TableCell>
                </TableRow>
              )
            })}

            {filteredStudents.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="h-24 text-center text-muted-foreground"
                >
                  لا توجد نتائج مطابقة
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </CardContent>
  </Card>

  {isAddStudentOpen && (
  <div className="fixed inset-0 z-50">
    <button
      type="button"
      aria-label="إغلاق"
      className="absolute inset-0 bg-black/40"
      onClick={() => setIsAddStudentOpen(false)}
    />

    <aside className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l bg-background shadow-xl">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold">إضافة طالب</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            إدخال بيانات الطالب الأساسية
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddStudentOpen(false)}
          className="rounded-md p-2 hover:bg-muted"
          aria-label="إغلاق"
        >
          <X className="size-5" />
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()

          const form = e.currentTarget
          const data = new FormData(form)

          const name = String(data.get('name') || '').trim()
          const personalId = String(data.get('personalId') || '').trim()
          const grade = String(data.get('grade') || '')
          const phone = String(data.get('phone') || '').trim()
          const whatsapp = String(data.get('whatsapp') || '').trim()
          const chronicDiseases =
            String(data.get('chronicDiseases') || '').trim() || 'لا يوجد'
          const amountDue = Number(data.get('amountDue') || 0)
          const amountPaid = Number(data.get('amountPaid') || 0)
          const notes = String(data.get('notes') || '').trim()

          if (!name || !personalId || !grade) {
            return
          }

          const paymentStatus =
            amountDue === 0 && amountPaid === 0
              ? 'معفي'
              : amountPaid >= amountDue
                ? 'مدفوع بالكامل'
                : amountPaid > 0
                  ? 'مدفوع جزئيًا'
                  : 'غير مدفوع'

          const newStudent = {
            id: `new-${Date.now()}`,
            name,
            personalId,
            grade,
            phone,
            whatsapp,
            paymentStatus,
            amountDue,
            amountPaid,
            chronicDiseases,
            notes,
          }

          setStudentList((current) => [...current, newStudent])
          setIsAddStudentOpen(false)
          form.reset()
        }}
      >
        <div className="space-y-6 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium">
                اسم الطالب
              </label>
              <input
                name="name"
                type="text"
                required
                placeholder="أدخل اسم الطالب"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                الرقم الشخصي
              </label>
              <input
                name="personalId"
                type="text"
                required
                placeholder="أدخل الرقم الشخصي"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                الصف الأكاديمي
              </label>
              <select
                name="grade"
                required
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">اختر الصف</option>
                {academicGrades.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                رقم الهاتف
              </label>
              <input
                name="phone"
                type="tel"
                placeholder="مثال: 33xxxxxx"
                dir="ltr"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                رقم واتساب
              </label>
              <input
                name="whatsapp"
                type="tel"
                placeholder="مثال: 33xxxxxx"
                dir="ltr"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
              />
            </div>
          </div>

          <div className="border-t pt-5">
            <h3 className="mb-4 text-sm font-semibold">المعلومات الصحية</h3>

            <label className="mb-2 block text-sm font-medium">
              الأمراض المزمنة
            </label>
            <input
              name="chronicDiseases"
              type="text"
              placeholder="لا يوجد"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
            />
          </div>

          <div className="border-t pt-5">
            <h3 className="mb-4 text-sm font-semibold">المعلومات المالية</h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  المبلغ المطلوب
                </label>
                <input
                  name="amountDue"
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder="0"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  المبلغ المدفوع
                </label>
                <input
                  name="amountPaid"
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder="0"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
                />
              </div>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              حالة الدفع والمبلغ المتبقي يتم حسابهما تلقائيًا.
            </p>
          </div>

          <div className="border-t pt-5">
            <label className="mb-2 block text-sm font-medium">
              ملاحظات
            </label>
            <textarea
              name="notes"
              placeholder="أدخل أي ملاحظات إضافية..."
              rows={4}
              className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none"
            />
          </div>
        </div>

        <div className="sticky bottom-0 flex gap-3 border-t bg-background p-6">
          <Button type="submit" className="flex-1">
            حفظ الطالب
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => setIsAddStudentOpen(false)}
          >
            إلغاء
          </Button>
        </div>
      </form>
    </aside>
  </div>
)}
}
