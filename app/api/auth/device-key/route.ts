import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
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

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth()

    if (!auth.access) {
      return auth.response
    }

    const deviceToken = request.cookies.get('t3leem_device_token')?.value

    if (!deviceToken) {
      return NextResponse.json(
        { error: 'كوكي الجهاز غير موجودة.' },
        { status: 401 },
      )
    }

    const body = await request.json()
    const publicKey = body?.publicKey

    if (typeof publicKey !== 'string' || publicKey.length > 4096) {
      return NextResponse.json(
        { error: 'المفتاح العام غير صالح.' },
        { status: 400 },
      )
    }

    const tokenHash = hashToken(deviceToken)

    const { data: device, error: deviceError } = await supabaseAdmin
      .from('trusted_devices')
      .select('id, status')
      .eq('auth_user_id', auth.access.userId)
      .eq('device_token_hash', tokenHash)
      .eq('status', 'approved')
      .maybeSingle()

    if (deviceError) {
      return NextResponse.json(
        { error: 'تعذر التحقق من الجهاز.' },
        { status: 500 },
      )
    }

    if (!device) {
      return NextResponse.json(
        { error: 'الجهاز غير معتمد أو غير معروف.' },
        { status: 403 },
      )
    }

    const { error: insertError } = await supabaseAdmin
      .from('trusted_device_keys')
      .upsert(
        {
          trusted_device_id: device.id,
          auth_user_id: auth.access.userId,
          public_key: publicKey,
        },
        {
          onConflict: 'trusted_device_id',
          ignoreDuplicates: true,
        },
      )

    if (insertError) {
      console.error('Device key registration failed:', insertError)

      return NextResponse.json(
        { error: 'تعذر تسجيل مفتاح الجهاز.' },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Device key API error:', error)

    return NextResponse.json(
      { error: 'حدث خطأ غير متوقع.' },
      { status: 500 },
    )
  }
}
