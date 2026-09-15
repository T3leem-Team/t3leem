'use client'

import { useMemo, useState } from 'react'
import { Search, UserPlus, Filter } from 'lucide-react'

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

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase()

    return students.filter((student) => {
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
        name: !filters.name || student.name.toLowerCase().includes(filters.name.toLowerCase()),
        personalId: !filters.personalId || student.personalId.includes(filters.personalId),
        grade: !filters.grade || student.grade === filters.grade,
        phone: !filters.phone || student.phone.includes(filters.phone),
        whatsapp: !filters.whatsapp || student.whatsapp.includes(filters.whatsapp),
        paymentStatus: !filters.paymentStatus || student.paymentStatus === filters.paymentStatus,
        amountPaid: !filters.amountPaid || String(student.amountPaid).includes(filters.amountPaid),
        amountRemaining: !filters.amountRemaining || String(remaining).includes(filters.amountRemaining),
        chronicDiseases:
          !filters.chronicDiseases ||
          student.chronicDiseases.toLowerCase().includes(filters.chronicDiseases.toLowerCase()),
        notes:
          !filters.notes ||
          student.notes.toLowerCase().includes(filters.notes.toLowerCase()),
      }

      return matchesSearch && Object.values(matches).every(Boolean)
    })
  }, [search, filters])

  const textFilter = (key: keyof Filters, placeholder: string) => (
    <div className="relative mt-2">
      <Filter className="absolute right-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
      <input
        value={filters[key]}
        onChange={(e) => updateFilter(key, e.target.value)}
        placeholder={placeholder}
        className="h-8 w-full min-w-[90px] rounded border bg-background px-2 pr-7 text-xs outline-none"
      />
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="الطلاب"
        description={`إجمالي ${students.length} طالب مسجّل في النظام`}
        action={
          <Button>
            <UserPlus className="size-4" />
            إضافة طالب
          </Button>
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
    </div>
  )
}

