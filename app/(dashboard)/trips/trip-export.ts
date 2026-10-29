
import type {
  ResponseSource,
  ResponseStatus,
  Student,
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
  students: Student[],
) {
  const selectedStudents = students.filter(
    (student) => student.selected,
  )

  if (selectedStudents.length === 0) {
    throw new Error('لا يوجد طلاب محددون لتنزيلهم.')
  }

  const ExcelJS = await import('exceljs')

  const workbook = new ExcelJS.Workbook()

  const worksheet = workbook.addWorksheet('طلاب الرحلة', {
    views: [
      {
        rightToLeft: true,
        showGridLines: true,
      },
    ],
  })

  // تعريف الأعمدة وعرض كل عمود
  worksheet.columns = [
    { header: '#', key: 'number', width: 6 },
    { header: 'الطالب', key: 'student', width: 28 },
    { header: 'الرقم الشخصي', key: 'personalId', width: 16 },
    { header: 'المستوى', key: 'level', width: 18 },
    { header: 'الهاتف', key: 'phone', width: 16 },
    { header: 'الحضور', key: 'attendance', width: 14 },
    { header: 'حاضر', key: 'present', width: 10 },
    { header: 'غائب', key: 'absent', width: 10 },
    { header: 'متأخر', key: 'late', width: 10 },
    { header: 'مستأذن', key: 'excused', width: 10 },
    { header: 'الرد', key: 'response', width: 14 },
    { header: 'نوع الرد', key: 'responseSource', width: 14 },
    { header: 'تاريخ الرد', key: 'respondedAt', width: 22 },
    { header: 'الدفع', key: 'payment', width: 14 },
    { header: 'حالة الدفع', key: 'paymentStatus', width: 14 },
    { header: 'ملاحظة الرد', key: 'responseNote', width: 30 },
    { header: 'ملاحظات الدورة', key: 'courseNotes', width: 40 },
  ]

  // إضافة بيانات الطلاب المحددين
  selectedStudents.forEach((student, index) => {
    worksheet.addRow({
      number: index + 1,
      student: student.name,
      personalId: student.personal_id ?? '',
      level: student.level?.name ?? '',
      phone: student.phone ?? student.whatsapp ?? '',
      attendance:
        student.attendance_percentage != null
          ? `${student.attendance_percentage.toFixed(1)}%`
          : 'لا توجد بيانات',
      present: student.attendance_present,
      absent: student.attendance_absent,
      late: student.attendance_late,
      excused: student.attendance_excused,
      response: getResponseLabel(student.response),
      responseSource: getResponseSourceLabel(
        student.response_source,
      ),
      respondedAt: student.responded_at
        ? formatDateTime(student.responded_at)
        : '',
      payment:
        student.payment_amount > 0
          ? student.payment_amount
          : 0,
      paymentStatus:
        student.payment_amount > 0
          ? 'مدفوع'
          : 'غير مدفوع',
      responseNote: student.response_note ?? '',
      courseNotes: student.course_notes
        .map((note) => note.note)
        .join(' | '),
    })
  })

  // تنسيق العناوين
  const headerRow = worksheet.getRow(1)

  headerRow.font = {
    bold: true,
  }

  headerRow.alignment = {
    horizontal: 'right',
    vertical: 'middle',
    wrapText: true,
  }

  headerRow.height = 28

  // تنسيق ومحاذاة بيانات الطلاب
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.alignment = {
        horizontal: 'right',
        vertical: 'middle',
        wrapText: true,
      }
    }
  })

  // اسم ملف آمن
  const safeName =
    tripName.replace(/[\\/:*?"<>|]/g, '').trim() ||
    'الرحلة'

  // إنشاء ملف Excel وتنزيله
  const buffer = await workbook.xlsx.writeBuffer()

  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `${safeName}-طلاب.xlsx`

  document.body.appendChild(link)
  link.click()
  link.remove()

  URL.revokeObjectURL(url)
}
