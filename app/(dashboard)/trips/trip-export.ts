
import type {
  ResponseSource,
  ResponseStatus,
} from './trip-types'

function formatDateTime(value: string | null) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return new Intl.DateTimeFormat('ar-BH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Bahrain',
  }).format(date)
}

function getResponseLabel(response: ResponseStatus) {
  switch (response) {
    case 'accepted':
      return 'موافق'
    case 'rejected':
      return 'رافض'
    default:
      return 'بانتظار الرد'
  }
}

function getResponseSourceLabel(source: ResponseSource) {
  switch (source) {
    case 'student':
      return 'من الرابط'
    case 'admin':
      return 'يدوي'
    default:
      return '—'
  }
}

export async function exportTripStudents(
  tripName: string,
  students: Array<{
    id: string
    selected: boolean
    name: string
    personal_id: string | null
    level: { name: string } | null
    phone: string | null
    whatsapp: string | null
    attendance_percentage: number | null
    attendance_present: number
    attendance_absent: number
    attendance_late: number
    attendance_excused: number
    response: ResponseStatus
    response_source: ResponseSource
    responded_at: string | null
    payment_amount: number
    response_note: string | null
    course_notes: Array<{ note: string }>
  }>,
) {
  const selectedStudents = students.filter(
    (student) => student.selected,
  )

  if (selectedStudents.length === 0) {
    throw new Error('لا يوجد طلاب محددون لتنزيلهم.')
  }

  const XLSX = await import('xlsx')

  const rows = selectedStudents.map((student, index) => ({
    '#': index + 1,
    الطالب: student.name,
    'الرقم الشخصي': student.personal_id ?? '',
    المستوى: student.level?.name ?? '',
    الهاتف: student.phone ?? student.whatsapp ?? '',
    الحضور:
      student.attendance_percentage !== null
        ? `${student.attendance_percentage.toFixed(1)}%`
        : 'لا توجد بيانات',
    حاضر: student.attendance_present,
    غائب: student.attendance_absent,
    متأخر: student.attendance_late,
    مستأذن: student.attendance_excused,
    الرد: getResponseLabel(student.response),
    'نوع الرد': getResponseSourceLabel(
      student.response_source,
    ),
    'تاريخ الرد': student.responded_at
      ? formatDateTime(student.responded_at)
      : '',
    الدفع:
      student.payment_amount > 0
        ? student.payment_amount
        : 0,
    'حالة الدفع':
      student.payment_amount > 0
        ? 'مدفوع'
        : 'غير مدفوع',
    'ملاحظة الرد': student.response_note ?? '',
    'ملاحظات الدورة': student.course_notes
      .map((note) => note.note)
      .join(' | '),
  }))

  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()

  // اتجاه الورقة من اليمين إلى اليسار
  worksheet['!views'] = [
    {
      rightToLeft: true,
    },
  ]

  // محاذاة محتوى الخلايا إلى اليمين
  for (const cellAddress of Object.keys(worksheet)) {
    if (cellAddress.startsWith('!')) continue

    const cell = worksheet[cellAddress]

    if (cell && typeof cell === 'object') {
      cell.s = {
        ...(cell.s ?? {}),
        alignment: {
          horizontal: 'right',
          vertical: 'center',
          wrapText: true,
        },
      }
    }
  }

  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 28 },
    { wch: 16 },
    { wch: 18 },
    { wch: 16 },
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 14 },
    { wch: 14 },
    { wch: 22 },
    { wch: 14 },
    { wch: 14 },
    { wch: 30 },
    { wch: 40 },
  ]

  const safeName =
    tripName.replace(/[\\/:*?"<>|]/g, '').trim() ||
    'الرحلة'

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    'طلاب الرحلة',
  )

  XLSX.writeFile(
    workbook,
    `${safeName}-طلاب.xlsx`,
  )
}
