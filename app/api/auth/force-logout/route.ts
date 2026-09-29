import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const SESSION_COOKIE = 't3leem_session_id'

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

export async function POST() {
  try {
    const supabase =
      await createSupabaseServerClient()

    const {
      data: { user },
      error: authError,
    } =
      await supabase.auth.getUser()

    const cookieStore = await cookies()

    const sessionId =
      cookieStore.get(SESSION_COOKIE)?.value

    /*
     * لا توجد جلسة Supabase أو T3LEEM.
     * ننظف Cookie فقط.
     */
    if (authError || !user || !sessionId) {
      const response = NextResponse.json({
        success: true,
      })

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

      return response
    }

    /*
     * إغلاق جلسة T3LEEM الخاصة بالمستخدم الحالي فقط.
     */
    const { error: sessionError } =
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
        .eq('auth_user_id', user.id)
        .eq('is_active', true)

    if (sessionError) {
      console.error(
        'Force logout session update error:',
        sessionError,
      )

      return NextResponse.json(
        {
          success: false,
          error:
            'تعذر إنهاء جلسة النظام.',
        },
        { status: 500 },
      )
    }

    /*
     * إغلاق Supabase Auth session.
     */
    const { error: signOutError } =
      await supabase.auth.signOut()

    if (signOutError) {
      console.error(
        'Force logout Supabase sign out error:',
        signOutError,
      )

      return NextResponse.json(
        {
          success: false,
          error:
            'تعذر إنهاء جلسة المصادقة.',
        },
        { status: 500 },
      )
    }

    const response = NextResponse.json({
      success: true,
    })

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

    return response
  } catch (error) {
    console.error(
      'Force logout error:',
      error,
    )

    const response = NextResponse.json(
      {
        success: false,
        error:
          'تعذر إنهاء الجلسة.',
      },
      { status: 500 },
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

    return response
  }
}