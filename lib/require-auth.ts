import { NextResponse } from 'next/server'
import { validateCurrentAccess } from '@/lib/auth-guard'

export async function requireAuth() {
  const access = await validateCurrentAccess()

  if (!access.allowed) {
    return {
      access: null,
      response: NextResponse.json(
        {
          authenticated: false,
          error: 'انتهت صلاحية الوصول إلى النظام.',
          reason: access.reason,
        },
        { status: 401 },
      ),
    }
  }

  return {
    access,
    response: null,
  }
}
