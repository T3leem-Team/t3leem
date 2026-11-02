import { NextResponse } from 'next/server'
import { validateCurrentAccess } from '@/lib/auth-guard'

import {
  updateActiveSessionActivity,
} from '@/lib/features/auth/repositories/session/session.repository'

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

    const { error: updateError } =
      await updateActiveSessionActivity(
        access.sessionId,
        access.userId,
        new Date().toISOString(),
      )

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
