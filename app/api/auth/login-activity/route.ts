
import { NextResponse } from 'next/server'

import { requirePermission } from '@/lib/auth/authorization'

import {
  loadLoginActivityForDay,
  loadProfilesByAuthUserIds,
} from '@/lib/features/users/repositories/users-admin.repository'

export async function GET() {
  try {
    const authorization =
      await requirePermission('users.view')

    if (authorization.error) {
      return authorization.error
    }

    if (!authorization.access) {
      return NextResponse.json(
        {
          error:
            'تعذر التحقق من الصلاحيات حالياً.',
        },
        { status: 503 },
      )
    }

    const now = new Date()

    const bahrainDate =
      new Intl.DateTimeFormat(
        'en-CA',
        {
          timeZone: 'Asia/Bahrain',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        },
      ).format(now)

    const startOfDay = new Date(
      `${bahrainDate}T00:00:00+03:00`,
    )

    const endOfDay = new Date(
      `${bahrainDate}T23:59:59.999+03:00`,
    )

    const {
      data: logs,
      error: logsError,
    } = await loadLoginActivityForDay(
      startOfDay.toISOString(),
      endOfDay.toISOString(),
    )

    if (logsError) {
      console.error(
        'Login activity logs error:',
        logsError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر تحميل نشاط تسجيل الدخول.',
        },
        { status: 500 },
      )
    }

    if (!logs || logs.length === 0) {
      return NextResponse.json(
        {
          items: [],
        },
        {
          headers: {
            'Cache-Control':
              'no-store, max-age=0',
          },
        },
      )
    }

    const userIds = [
      ...new Set(
        logs.map(
          (log) => log.auth_user_id,
        ),
      ),
    ]

    const {
      data: profiles,
      error: profilesError,
    } = await loadProfilesByAuthUserIds(userIds)

    if (profilesError) {
      console.error(
        'Login activity profiles error:',
        profilesError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر تحميل بيانات المستخدمين.',
        },
        { status: 500 },
      )
    }

    const profileMap =
      new Map<
        string,
        {
          username: string
          full_name: string
        }
      >()

    ;(profiles ?? []).forEach(
      (profile) => {
        profileMap.set(
          profile.auth_user_id,
          {
            username: profile.username,
            full_name: profile.full_name,
          },
        )
      },
    )

    const items = logs.map(
      (log) => {
        const profile =
          profileMap.get(log.auth_user_id)

        return {
          id: log.id,
          userName:
            profile?.full_name ||
            profile?.username ||
            'مستخدم',
          username:
            profile?.username ||
            '',
          createdAt:
            log.created_at,
        }
      },
    )

    return NextResponse.json(
      {
        items,
      },
      {
        headers: {
          'Cache-Control':
            'no-store, max-age=0',
        },
      },
    )
  } catch (error) {
    console.error(
      'Login activity endpoint error:',
      error,
    )

    return NextResponse.json(
      {
        error:
          'تعذر تحميل نشاط تسجيل الدخول.',
      },
      { status: 503 },
    )
  }
}
