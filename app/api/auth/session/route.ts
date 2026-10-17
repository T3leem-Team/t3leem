
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateCurrentAccess } from '@/lib/auth-guard'

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

type SessionRequestType = 'heartbeat' | 'activity'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)

    const type = body?.type as SessionRequestType | undefined

    if (type !== 'heartbeat' && type !== 'activity') {
      return NextResponse.json(
        {
          authenticated: false,
          reason: 'invalid_request',
        },
        { status: 400 },
      )
    }

    // التحقق الأمني الكامل يبقى إلزاميًا لكلا النوعين.
    const access = await validateCurrentAccess()

    if (!access.allowed) {
      if (access.reason === 'guard_error') {
        return NextResponse.json(
          {
            authenticated: false,
            reason: 'temporary_error',
          },
          { status: 503 },
        )
      }

      return NextResponse.json(
        {
          authenticated: false,
          reason: access.reason ?? 'session_inactive',
        },
        { status: 401 },
      )
    }

    // الـ heartbeat يفحص الجلسة فقط ولا يمدد مهلة الخمول.
    if (type === 'heartbeat') {
      return NextResponse.json({
        authenticated: true,
        updated: false,
      })
    }

    // تسجيل النشاط يكون فقط عند إرسال طلب activity من المتعقب.
    if (!access.sessionId || !access.userId) {
      return NextResponse.json(
        {
          authenticated: false,
          reason: 'session_inactive',
        },
        { status: 401 },
      )
    }

    const { error: updateError } = await supabaseAdmin
      .from('active_sessions')
      .update({
        last_activity_at: new Date().toISOString(),
      })
      .eq('id', access.sessionId)
      .eq('auth_user_id', access.userId)
      .eq('is_active', true)

    if (updateError) {
      console.error('Session activity update error:', updateError)

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
    console.error('Session endpoint error:', error)

    return NextResponse.json(
      {
        authenticated: false,
        reason: 'temporary_error',
      },
      { status: 503 },
    )
  }
}
