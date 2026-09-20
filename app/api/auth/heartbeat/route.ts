import { NextResponse } from 'next/server'
import { validateCurrentAccess } from '@/lib/auth-guard'

export async function POST() {
  const access = await validateCurrentAccess()

  if (!access.allowed) {
    return NextResponse.json(
      {
        authenticated: false,
        error: 'تم إيقاف الوصول إلى النظام.',
        reason: access.reason,
      },
      { status: 401 },
    )
  }

  return NextResponse.json({
    authenticated: true,
  })
}
