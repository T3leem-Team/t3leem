export const baseColumns = [
  { key: 'name', label: 'الاسم' },
  { key: 'personalId', label: 'رقم الهوية' },
  { key: 'grade', label: 'المرحلة / المستوى' },
  { key: 'contact', label: 'التواصل' },
  { key: 'paymentStatus', label: 'حالة السداد' },
  { key: 'notes', label: 'الملاحظات' },
  { key: 'attendance', label: 'الحضور' },
] as const

export const extraColumns = [
  { key: 'studentId', label: 'معرف الطالب' },
  { key: 'guardianRelation', label: 'صلة القرابة' },
  { key: 'studentPhone', label: 'رقم الطالب' },
  { key: 'enrollmentCourseName', label: 'دورة الالتحاق' },
  { key: 'gender', label: 'الجنس' },
  { key: 'age', label: 'العمر' },
  { key: 'phone', label: 'الهاتف' },
  { key: 'whatsapp', label: 'واتساب' },
  { key: 'status', label: 'الحالة' },
  { key: 'className', label: 'الفصل' },
  { key: 'source', label: 'المصدر' },
  { key: 'amountDue', label: 'المستحق' },
  { key: 'amountPaid', label: 'المدفوع' },
  { key: 'remaining', label: 'المتبقي' },
  { key: 'feeExempt', label: 'الإعفاء' },
  { key: 'chronicDiseases', label: 'الحالات الصحية' },
  { key: 'createdAt', label: 'تاريخ الإضافة' },
  { key: 'updatedAt', label: 'آخر تحديث' },
  { key: 'academicYearName', label: 'العام الدراسي' },
] as const

export function getVisibleExtraColumns(
  visibleColumns: Record<string, boolean>
) {
  return extraColumns.filter(
    (column) => visibleColumns[column.key]
  )
}
