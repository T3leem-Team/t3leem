import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { validateCurrentAccess } from '@/lib/auth-guard'

const SESSION_COOKIE = 't3leem_session_id'

export async function requireAuth() {
  const access = await validateCurrentAccess()

  if (access.allowed) {
    return {
      access,
      response: null,
    }
  }

  /*
   * أخطاء النظام المؤقتة لا تعني أن الجلسة انتهت.
   */
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

  /*
   * حالات انتهاء/فقدان الصلاحية الفعلية:
   * - ننهي Supabase Auth
   * - نمسح جلسة T3LEEM
   * - نبقي Device Token
   */
  try {
    const supabase =
      await createSupabaseServerClient()

    await supabase.auth.signOut()
  } catch (error) {
    console.error(
      'Auth cleanup error:',
      error,
    )
  }

  const response = NextResponse.json(
    {
      authenticated: false,
      error: 'انتهت صلاحية الوصول إلى النظام.',
      reason: access.reason,
    },
    { status: 401 },
  )

  response.cookies.set(
    SESSION_COOKIE,
    '',
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    },
  )

  return {
    access: null,
    response,
  }
}