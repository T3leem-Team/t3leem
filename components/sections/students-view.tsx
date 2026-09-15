'use client'

import { useMemo, useState } from 'react'
import { Search, UserPlus, SlidersHorizontal } from 'lucide-react'

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
import { students } from '@/lib/data'

export function StudentsView() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('الكل')

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase()

    return students.filter((student) => {
      const matchesSearch =
        !query ||
        Object.values(student).some((value) =>
          String(value).toLowerCase().includes(query)
        )

      const matchesFilter =
        filter === 'الكل' ||
        student.grade === filter ||
        student.paymentStatus === filter

      return matchesSearch && matchesFilter
    })
  }, [search, filter])

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
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث في جميع بيانات الطلاب..."
                className="h-10 w-full rounded-md border bg-background px-3 pr-9 text-sm outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-muted-foreground" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="h-10 rounded-md border bg-background px-3 text-sm"
              >
                <option>الكل</option>
                <option>مدفوع بالكامل</option>
                <option>مدفوع جزئيًا</option>
                <option>غير مدفوع</option>
                <option>معفي</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>اسم الطالب</TableHead>
                  <TableHead>الرقم الشخصي</TableHead>
                  <TableHead>الصف الأكاديمي</TableHead>
                  <TableHead>رقم الهاتف</TableHead>
                  <TableHead>رقم واتساب</TableHead>
                  <TableHead>الدفع</TableHead>
                  <TableHead>المبلغ المدفوع</TableHead>
                  <TableHead>المبلغ المتبقي</TableHead>
                  <TableHead>الأمراض المزمنة</TableHead>
                  <TableHead>ملاحظات</TableHead>
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
                      <TableCell className="font-medium">
                        {student.name}
                      </TableCell>

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
