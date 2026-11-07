import { DataTable, type DataTableColumn } from '@/components/shared/data-table'

type Student = {
  id: number
  name: string
  personalId: string
  grade: string
  phone: string
  status: string
}

const columns: DataTableColumn<Student>[] = [
  {
    id: 'name',
    header: 'اسم الطالب',
    accessor: (student) => student.name,
  },
  {
    id: 'personalId',
    header: 'الرقم الشخصي',
    accessor: (student) => student.personalId,
  },
  {
    id: 'grade',
    header: 'الصف',
    accessor: (student) => student.grade,
  },
  {
    id: 'phone',
    header: 'رقم الهاتف',
    accessor: (student) => student.phone,
  },
  {
    id: 'status',
    header: 'الحالة',
    accessor: (student) => student.status,
  },
]

export function StudentsTable({ students }: { students: Student[] }) {
  return (
    <DataTable
      columns={columns}
      data={students}
      getRowId={(student) => student.id}
      pageSize={10}
    />
  )
}
