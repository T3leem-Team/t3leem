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

export async function POST() {
  try {
    const supabase =
      await createSupabaseServerClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    const cookieStore = await cookies()

    const sessionId =
      cookieStore.get(SESSION_COOKIE)?.value

    /*
     * إذا لم تعد جلسة Supabase موجودة،
     * ننظف Cookie الخاصة بجلسة T3LEEM أيضًا.
     */
    if (authError || !user) {
      const response = NextResponse.json(
        {
          authenticated: false,
        },
        { status: 401 },
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

    if (!sessionId) {
      const response = NextResponse.json(
        {
          authenticated: false,
        },
        { status: 401 },
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
          last_activity_at
        `)
        .eq('id', sessionId)
        .eq('auth_user_id', user.id)
        .maybeSingle()

    /*
     * الجلسة غير موجودة أو تم إغلاقها مسبقًا.
     */
    if (
      sessionError ||
      !session ||
      !session.is_active
    ) {
      const response = NextResponse.json(
        {
          authenticated: false,
          reason: 'session_inactive',
        },
        { status: 401 },
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

      try {
        await supabase.auth.signOut()
      } catch (error) {
        console.error(
          'Supabase sign out error:',
          error,
        )
      }

      return response
    }

    const now = Date.now()

    const lastActivity =
      new Date(
        session.last_activity_at,
      ).getTime()

    const idleTimeout =
      IDLE_TIMEOUT_MINUTES *
      60 *
      1000

    /*
     * انتهاء مهلة الخمول: 20 دقيقة.
     */
    if (
      Number.isNaN(lastActivity) ||
      now - lastActivity >= idleTimeout
    ) {
      const closedAt =
        new Date().toISOString()

      await supabaseAdmin
        .from('active_sessions')
        .update({
          is_active: false,
          logout_at: closedAt,
          last_activity_at: closedAt,
        })
        .eq('id', session.id)
        .eq('auth_user_id', user.id)
        .eq('is_active', true)

      /*
       * إنهاء جلسة Supabase.
       */
      try {
        await supabase.auth.signOut()
      } catch (error) {
        console.error(
          'Supabase sign out after idle timeout error:',
          error,
        )
      }

      /*
       * تنظيف Cookie الخاصة بالجلسة.
       * Device Token يبقى كما هو حتى لا نطلب
       * اعتماد الجهاز مرة أخرى.
       */
      const response = NextResponse.json(
        {
          authenticated: false,
          reason: 'idle_timeout',
        },
        { status: 401 },
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

    /*
     * الجلسة ما زالت فعالة،
     * لذلك نحدّث وقت آخر نشاط.
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

    if (updateError) {
      console.error(
        'Session activity update error:',
        updateError,
      )

      return NextResponse.json(
        {
          authenticated: false,
        },
        { status: 500 },
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
      },
      { status: 500 },
    )
  }
}