import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { ok: false, error: 'Supabase server environment variables are missing' },
        { status: 500 }
      )
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const { data, error } = await supabase
      .from('system_health_check')
      .select('id')
      .eq('id', 1)
      .maybeSingle()

    if (error) {
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
