import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { requirePermission } from '@/lib/require-permission'

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

export async function GET() {
  try {
    const auth =
      await requirePermission('users.view')

    if (auth.response) {
      return auth.response
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
    } = await supabaseAdmin
      .from('auth_audit_logs')
      .select(
        `
        id,
        auth_user_id,
        event_type,
        success,
        created_at
        `,
      )
      .eq(
        'event_type',
        'login_success',
      )
      .eq(
        'success',
        true,
      )
      .gte(
        'created_at',
        startOfDay.toISOString(),
      )
      .lte(
        'created_at',
        endOfDay.toISOString(),
      )
      .order(
        'created_at',
        {
          ascending: false,
        },
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
          (log) =>
            log.auth_user_id,
        ),
      ),
    ]

    const {
      data: profiles,
      error: profilesError,
    } =
      await supabaseAdmin
        .from('user_profiles')
        .select(
          `
          auth_user_id,
          username,
          full_name
          `,
        )
        .in(
          'auth_user_id',
          userIds,
        )

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
            username:
              profile.username,
            full_name:
              profile.full_name,
          },
        )
      },
    )

    const items = logs.map(
      (log) => {
        const profile =
          profileMap.get(
            log.auth_user_id,
          )

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
