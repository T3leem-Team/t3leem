import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const XLSX = await import('xlsx')

    const workbook = XLSX.utils.book_new()

    const sheet = XLSX.utils.aoa_to_sheet([
      ['اختبار'],
      ['T3LEEM'],
      ['Excel يعمل من السيرفر'],
    ])

    XLSX.utils.book_append_sheet(
      workbook,
      sheet,
      'Test',
    )

    const buffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'buffer',
    })

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition':
          'attachment; filename="T3LEEM-Test.xlsx"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error(
      'XLSX SERVER TEST ERROR:',
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : String(error),
        stack:
          error instanceof Error
            ? error.stack
            : undefined,
      },
      {
        status: 500,
      },
    )
  }
}