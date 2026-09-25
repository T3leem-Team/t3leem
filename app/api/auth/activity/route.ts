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

    if (authError || !user) {
      return NextResponse.json(
        {
          authenticated: false,
        },
        { status: 401 },
      )
    }

    const cookieStore = await cookies()

    const sessionId =
      cookieStore.get(SESSION_COOKIE)?.value

    if (!sessionId) {
      return NextResponse.json(
        {
          authenticated: false,
        },
        { status: 401 },
      )
    }

    const {
      data: session,
      error: sessionError,
    } = await supabaseAdmin
      .from('active_sessions')
      .select(`
        id,
        auth_user_id,
        is_active,
        last_activity_at
      `)
      .eq('id', sessionId)
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (sessionError || !session) {
      return NextResponse.json(
        {
          authenticated: false,
        },
        { status: 401 },
      )
    }

    /*
     * التحقق من آخر نشاط حقيقي
     */
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
     * إذا مرّت 20 دقيقة بدون نشاط
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
        .eq('is_active', true)

      return NextResponse.json(
        {
          authenticated: false,
          reason: 'idle_timeout',
        },
        { status: 401 },
      )
    }

    /*
     * يوجد نشاط حقيقي
     * لذلك نحدث آخر نشاط
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