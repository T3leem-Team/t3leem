
export function formatDate(value: string | null) {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return date.toLocaleDateString('ar-BH')
}

export function getSourceLabel(source: string | null) {
  switch (source) {
    case 'manual':
    case 'internal':
    case 'admin':
      return 'إضافة من قسم الطلاب'

    case 'registration':
    case 'external':
      return 'التسجيل من الرابط الخارجي'

    case 'import':
      return 'مستورد من Excel'

    default:
      return source || 'غير محدد'
  }
}

export function getPaymentStatusLabel(status: string) {
  switch (status) {
    case 'paid':
    case 'مدفوع بالكامل':
      return 'مدفوع بالكامل'

    case 'partial':
    case 'مدفوع جزئياً':
    case 'مدفوع جزئيًا':
      return 'مدفوع جزئيًا'

    case 'unpaid':
    case 'غير مدفوع':
      return 'غير مدفوع'

    case 'exempt':
    case 'معفي':
      return 'معفي'

    default:
      return status || '-'
  }
}

export function normalizePaymentStatus(status: string) {
  const label = getPaymentStatusLabel(status)

  if (
    label === 'مدفوع جزئيًا' ||
    label === 'مدفوع جزئياً'
  ) {
    return 'مدفوع جزئيًا'
  }

  return label
}

export function normalizeAttendanceStatus(
  status: string | null | undefined
) {
  const value = String(status || '').trim()

  if (!value) {
    return 'لم يسجل'
  }

  switch (value) {
    case 'present':
      return 'حاضر'

    case 'absent':
      return 'غائب'

    case 'late':
      return 'متأخر'

    case 'excused':
      return 'مستأذن'

    case 'not_recorded':
      return 'لم يسجل'

    case 'حاضر':
    case 'غائب':
    case 'متأخر':
    case 'مستأذن':
    case 'لم يسجل':
      return value

    default:
      return value
  }
}
