import { NextResponse } from 'next/server'
import { checkSupabaseConnection } from '@/lib/features/system/repositories/system-health-admin.repository'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      return NextResponse.json(
        { ok: false, error: 'CRON_SECRET is not configured' },
        { status: 500 }
      )
    }

    const authorization = request.headers.get('authorization')

    if (authorization !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data, error } = await checkSupabaseConnection()

    if (error) {
      if (
        error.message ===
        'Supabase server environment variables are missing'
      ) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Supabase server environment variables are missing',
          },
          { status: 500 }
        )
      }

      console.error('Supabase health check failed:', error)

      return NextResponse.json(
        {
          ok: false,
          error: 'Supabase health check failed',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      connected: true,
      recordFound: Boolean(data),
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Supabase health check error:', error)

    return NextResponse.json(
      {
        ok: false,
        error: 'Internal server error',
      },
      { status: 500 }
    )
  }
}
