
import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/authorization'
import { loadBackupData } from '@/lib/features/system/repositories/backup-admin.repository'
import { buildBackupWorkbook } from './backup-excel'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/* =========================================================
   GET
   ========================================================= */

export async function GET() {
  try {
    const authorization =
      await requirePermission('backup.manage')

    if (authorization.error) {
      return authorization.error
    }

    if (!authorization.access) {
      return NextResponse.json(
        {
          error:
            'تعذر التحقق من صلاحيات النسخة الاحتياطية حالياً.',
        },
        { status: 503 },
      )
    }

    // تحميل بيانات النسخة الاحتياطية من Repository
    const data = await loadBackupData()

    // إنشاء ملف Excel باستخدام ExcelJS
    const workbook = buildBackupWorkbook(data)

    // تحويل Workbook إلى Buffer
    const excelBuffer = await workbook.xlsx.writeBuffer()
    const buffer = new Uint8Array(excelBuffer)

    // اسم الملف
    const filename =
      `T3LEEM-Backup-${String(
        data.academicYear.name || 'Current-Year',
      ).replace(/[\\/:*?"<>|]/g, '-')}.xlsx`

    // إرجاع الملف للتنزيل
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

        'Content-Disposition':
          `attachment; filename="${filename}"`,

        'Cache-Control':
          'no-store, no-cache, must-revalidate',
      },
    })
  } catch (error) {
    console.error(
      'BACKUP API ERROR:',
      error,
    )

    return NextResponse.json(
      {
        error:
          'تعذر إنشاء النسخة الاحتياطية حالياً.',
      },
      {
        status: 500,
      },
    )
  }
}
