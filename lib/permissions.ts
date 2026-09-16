export type Permission = {
  key: string
  label: string
}

export const permissions: Permission[] = [
  {
    key: 'students',
    label: 'الطلاب',
  },
  {
    key: 'enrollment',
    label: 'طلبات التسجيل',
  },
  {
    key: 'teachers',
    label: 'المعلمون',
  },
  {
    key: 'payments',
    label: 'المدفوعات',
  },
  {
    key: 'academic',
    label: 'السنة الدراسية والدورات',
  },
  {
    key: 'archive',
    label: 'الأرشيف',
  },
  {
    key: 'sensitive',
    label: 'الإجراءات الحساسة',
  },
]
