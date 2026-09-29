import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const SESSION_COOKIE = 't3leem_session_id'
const IDLE_TIMEOUT_MINUTES = 20

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

function clearSessionCookie(response: NextResponse) {
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

async function closeSession(
  sessionId: string,
  userId: string,
) {
  const now =
    new Date().toISOString()

  const { error } =
    await supabaseAdmin
      .from('active_sessions')
      .update({
        is_active: false,
        logout_at: now,
        last_activity_at: now,
      })
      .eq('id', sessionId)
      .eq('auth_user_id', userId)
      .eq('is_active', true)

  if (error) {
    console.error(
      'Activity close session error:',
      error,
    )

    return false
  }

  return true
}

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
     * Supabase Auth غير موجودة.
     */
    if (authError || !user) {
      const response = NextResponse.json(
        {
          authenticated: false,
          reason: 'not_authenticated',
        },
        { status: 401 },
      )

      return clearSessionCookie(response)
    }

    /*
     * لا توجد جلسة T3LEEM.
     */
    if (!sessionId) {
      const response = NextResponse.json(
        {
          authenticated: false,
          reason: 'missing_session',
        },
        { status: 401 },
      )

      return clearSessionCookie(response)
    }

    /*
     * جلب جلسة T3LEEM.
     */
    const {
      data: session,
      error: sessionError,
    } =
      await supabaseAdmin
        .from('active_sessions')
        .select(`
          id,
          auth_user_id,
          is_active,
          last_activity_at,
          expires_at
        `)
        .eq('id', sessionId)
        .eq('auth_user_id', user.id)
        .maybeSingle()

    /*
     * خطأ قاعدة البيانات ليس انتهاء جلسة.
     */
    if (sessionError) {
      console.error(
        'Activity session lookup error:',
        sessionError,
      )

      return NextResponse.json(
        {
          authenticated: false,
          reason: 'temporary_error',
        },
        { status: 503 },
      )
    }

    /*
     * الجلسة غير موجودة أو مغلقة.
     */
    if (!session || !session.is_active) {
      const response = NextResponse.json(
        {
          authenticated: false,
          reason: 'session_inactive',
        },
        { status: 401 },
      )

      try {
        await supabase.auth.signOut()
      } catch (error) {
        console.error(
          'Supabase sign out error:',
          error,
        )
      }

      return clearSessionCookie(response)
    }

    const now = Date.now()

    /*
     * انتهاء مدة الجلسة القصوى.
     */
    const expiresAt =
      new Date(session.expires_at).getTime()

    if (
      Number.isNaN(expiresAt) ||
      now >= expiresAt
    ) {
      await closeSession(
        session.id,
        user.id,
      )

      try {
        await supabase.auth.signOut()
      } catch (error) {
        console.error(
          'Supabase sign out after session expiry error:',
          error,
        )
      }

      const response = NextResponse.json(
        {
          authenticated: false,
          reason: 'session_expired',
        },
        { status: 401 },
      )

      return clearSessionCookie(response)
    }

    /*
     * انتهاء الخمول.
     */
    const lastActivity =
      new Date(
        session.last_activity_at,
      ).getTime()

    const idleTimeout =
      IDLE_TIMEOUT_MINUTES *
      60 *
      1000

    if (
      Number.isNaN(lastActivity) ||
      now - lastActivity >= idleTimeout
    ) {
      await closeSession(
        session.id,
        user.id,
      )

      try {
        await supabase.auth.signOut()
      } catch (error) {
        console.error(
          'Supabase sign out after idle timeout error:',
          error,
        )
      }

      const response = NextResponse.json(
        {
          authenticated: false,
          reason: 'idle_timeout',
        },
        { status: 401 },
      )

      return clearSessionCookie(response)
    }

    /*
     * تحديث آخر نشاط.
     */
    const updatedAt =
      new Date().toISOString()

    const { error: updateError } =
      await supabaseAdmin
        .from('active_sessions')
        .update({
          last_activity_at: updatedAt,
        })
        .eq('id', session.id)
        .eq('auth_user_id', user.id)
        .eq('is_active', true)

    /*
     * فشل تحديث النشاط لا يعني أن المستخدم خرج.
     */
    if (updateError) {
      console.error(
        'Session activity update error:',
        updateError,
      )

      return NextResponse.json(
        {
          authenticated: true,
          updated: false,
          reason: 'temporary_error',
        },
        { status: 503 },
      )
    }

    return NextResponse.json({
      authenticated: true,
      updated: true,
    })
  } catch (error) {
    console.error(
      'Activity endpoint error:',
      error,
    )

    return NextResponse.json(
      {
        authenticated: false,
        reason: 'temporary_error',
      },
      { status: 503 },
    )
  }
}