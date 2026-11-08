
'use client'

import {
  DataTable,
  type DataTableColumn,
} from '@/components/shared/data-table'

type Student = {
  id: number
  name: string
  personalId: string
  grade: string
  phone: string
  status: string
}

const sampleStudents: Omit<Student, 'id' | 'personalId' | 'phone'>[] = [
  { name: 'أحمد محمد', grade: 'الأول', status: 'منتظم' },
  { name: 'علي حسن', grade: 'الثاني', status: 'متأخر' },
  { name: 'محمد عبدالله', grade: 'الثالث', status: 'منتظم' },
  { name: 'يوسف خالد', grade: 'الرابع', status: 'معفى' },
  { name: 'حسين علي', grade: 'الخامس', status: 'منتظم' },
  { name: 'سلمان أحمد', grade: 'السادس', status: 'متأخر' },
  { name: 'جعفر محمود', grade: 'الأول', status: 'منتظم' },
  { name: 'عبدالله يوسف', grade: 'الثاني', status: 'معفى' },
  { name: 'حمد إبراهيم', grade: 'الثالث', status: 'منتظم' },
  { name: 'راشد سلمان', grade: 'الرابع', status: 'متأخر' },
  { name: 'عمر جاسم', grade: 'الخامس', status: 'منتظم' },
  { name: 'ناصر فهد', grade: 'السادس', status: 'منتظم' },
  { name: 'حسن إبراهيم', grade: 'الأول', status: 'متأخر' },
  { name: 'جاسم علي', grade: 'الثاني', status: 'منتظم' },
  { name: 'فهد يوسف', grade: 'الثالث', status: 'معفى' },
]

const students: Student[] = Array.from(
  { length: 150 },
  (_, index) => {
    const id = index + 1
    const sample = sampleStudents[index % sampleStudents.length]

    return {
      id,
      name: sample.name,
      personalId: String(100000 + id),
      grade: sample.grade,
      phone: String(39000000 + id),
      status: sample.status,
    }
  },
)

const columns: DataTableColumn<Student>[] = [
  {
    id: 'name',
    header: 'اسم الطالب',
    accessor: (row) => row.name,
    filterType: 'text',
  },
  {
    id: 'personalId',
    header: 'الرقم الشخصي',
    accessor: (row) => row.personalId,
    filterType: 'text',
  },
  {
    id: 'grade',
    header: 'الصف',
    accessor: (row) => row.grade,
    filterType: 'multi-select',
  },
  {
    id: 'phone',
    header: 'رقم الهاتف',
    accessor: (row) => row.phone,
    filterType: 'text',
  },
  {
    id: 'status',
    header: 'الحالة',
    accessor: (row) => row.status,
    filterType: 'multi-select',
  },
]

export default function TablePreviewPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-gray-50 p-3 md:p-6">
      <DataTable
        columns={columns}
        data={students}
        getRowId={(student) => student.id}
        pageSize={100}
      />
    </main>
  )
}
