
'use client'

import { DataTable, type DataTableColumn } from '@/components/shared/data-table'

type Student = {
  id: number
  name: string
  personalId: string
  grade: string
  phone: string
  status: string
}

const students: Student[] = [
  { id: 1, name: 'أحمد محمد', personalId: '100001', grade: 'الأول', phone: '39000001', status: 'منتظم' },
  { id: 2, name: 'علي حسن', personalId: '100002', grade: 'الثاني', phone: '39000002', status: 'متأخر' },
  { id: 3, name: 'محمد عبدالله', personalId: '100003', grade: 'الثالث', phone: '39000003', status: 'منتظم' },
  { id: 4, name: 'يوسف خالد', personalId: '100004', grade: 'الرابع', phone: '39000004', status: 'معفى' },
  { id: 5, name: 'حسين علي', personalId: '100005', grade: 'الخامس', phone: '39000005', status: 'منتظم' },
  { id: 6, name: 'سلمان أحمد', personalId: '100006', grade: 'السادس', phone: '39000006', status: 'متأخر' },
  { id: 7, name: 'جعفر محمود', personalId: '100007', grade: 'الأول', phone: '39000007', status: 'منتظم' },
  { id: 8, name: 'عبدالله يوسف', personalId: '100008', grade: 'الثاني', phone: '39000008', status: 'معفى' },
  { id: 9, name: 'حمد إبراهيم', personalId: '100009', grade: 'الثالث', phone: '39000009', status: 'منتظم' },
  { id: 10, name: 'راشد سلمان', personalId: '100010', grade: 'الرابع', phone: '39000010', status: 'متأخر' },
  { id: 11, name: 'عمر جاسم', personalId: '100011', grade: 'الخامس', phone: '39000011', status: 'منتظم' },
  { id: 12, name: 'ناصر فهد', personalId: '100012', grade: 'السادس', phone: '39000012', status: 'منتظم' },
]

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
        pageSize={5}
      />
    </main>
  )
}
