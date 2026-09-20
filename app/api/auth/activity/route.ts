import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/require-auth'

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
    const { access, response } =
      await requireAuth()

    if (response) {
      return response
    }

    if (!access?.sessionId) {
      return NextResponse.json(
        {
          authenticated: false,
          error:
            'لا توجد جلسة نشطة.',
        },
        { status: 401 },
      )
    }

    const now =
      new Date().toISOString()

    const {
      error,
    } =
      await supabaseAdmin
        .from('active_sessions')
        .update({
          last_activity_at: now,
        })
        .eq(
          'id',
          access.sessionId,
        )
        .eq(
          'auth_user_id',
          access.userId,
        )
        .eq(
          'is_active',
          true,
        )

    if (error) {
      console.error(
        'Session activity update error:',
        error,
      )

      return NextResponse.json(
        {
          error:
            'تعذر تحديث نشاط الجلسة.',
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
        error:
          'حدث خطأ أثناء تحديث نشاط الجلسة.',
      },
      { status: 500 },
    )
  }
}
