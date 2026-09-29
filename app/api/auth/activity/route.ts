import { NextResponse } from 'next/server'

import { validateCurrentAccess } from '@/lib/auth-guard'
import { createClient } from '@supabase/supabase-js'

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
    const access =
      await validateCurrentAccess()

    if (!access.allowed) {
      if (
        access.reason ===
        'guard_error'
      ) {
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
          reason:
            access.reason ??
            'session_inactive',
        },
        { status: 401 },
      )
    }

    const updatedAt =
      new Date().toISOString()

    const {
      error: updateError,
    } = await supabaseAdmin
      .from('active_sessions')
      .update({
        last_activity_at: updatedAt,
      })
      .eq(
        'id',
        access.sessionId,
      )
      .eq(
        'auth_user_id',
        access.userId,
      )
      .eq('is_active', true)

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