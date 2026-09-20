import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const SESSION_COOKIE = 't3leem_session_id'

export async function POST() {
  try {
    const supabase =
      await createSupabaseServerClient()

    const cookieStore = await cookies()

    const sessionId =
      cookieStore.get(SESSION_COOKIE)?.value

    // إغلاق جلسة النظام الخاصة بنا
    if (sessionId) {
      const { createClient } =
        await import('@supabase/supabase-js')

      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        },
      )

      await supabaseAdmin
        .from('active_sessions')
        .update({
          is_active: false,
          logout_at:
            new Date().toISOString(),
          last_activity_at:
            new Date().toISOString(),
        })
        .eq('id', sessionId)
        .eq('is_active', true)
    }

    // إغلاق Supabase Auth session
    await supabase.auth.signOut()

    const response = NextResponse.json({
      success: true,
    })

    // حذف Session Cookie
    response.cookies.set(
      SESSION_COOKIE,
      '',
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      },
    )

    return response
  } catch (error) {
    console.error(
      'Force logout error:',
      error,
    )

    // حتى لو حصل خطأ، نحاول حذف Cookie
    const response = NextResponse.json(
      {
        success: false,
      },
      { status: 200 },
    )

    response.cookies.set(
      SESSION_COOKIE,
      '',
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      },
    )

    return response
  }
}