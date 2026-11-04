
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { validateCurrentAccess } from '@/lib/auth-guard'

const SESSION_COOKIE = 't3leem_session_id'

export async function requireAuth() {
  const startedAt = performance.now()

  const markTiming = (
    step: string,
    stepStartedAt: number,
  ) => {
    console.info(
      `[REQUIRE AUTH TIMING] ${step}: ${
        Math.round(performance.now() - stepStartedAt)
      }ms (total: ${
        Math.round(performance.now() - startedAt)
      }ms)`,
    )
  }

  // 1. التحقق من صلاحية الوصول والجلسة
  const accessStartedAt = performance.now()
  const access = await validateCurrentAccess()

  markTiming('validateCurrentAccess', accessStartedAt)

  if (!access.allowed) {
    if (access.reason === 'guard_error') {
      return {
        access: null,
        response: NextResponse.json(
          {
            authenticated: false,
            error: 'تعذر التحقق من الجلسة حالياً.',
            reason: 'guard_error',
          },
          { status: 503 },
        ),
      }
    }

    try {
      const supabase = await createSupabaseServerClient()
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Auth cleanup error:', error)
    }

    const response = NextResponse.json(
      {
        authenticated: false,
        error: 'انتهت صلاحية الوصول إلى النظام.',
        reason: access.reason,
      },
      { status: 401 },
    )

    response.cookies.set(SESSION_COOKIE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })

    return {
      access: null,
      response,
    }
  }

  markTiming('complete', startedAt)

  return {
    access,
    response: null,
  }
}
