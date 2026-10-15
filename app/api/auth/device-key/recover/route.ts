import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST() {
  return NextResponse.json(
    {
      error: 'مسار استعادة الجهاز معطّل مؤقتًا.',
      code: 'DEVICE_RECOVERY_DISABLED',
    },
    { status: 410 },
  )
}