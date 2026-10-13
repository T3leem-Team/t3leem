
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash, randomBytes, webcrypto } from 'crypto'
import { requireAuth } from '@/lib/require-auth'

export const runtime = 'nodejs'

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

    const tokenHash = hashToken(deviceToken)

    const { data: device, error: deviceError } = await supabaseAdmin
      .from('trusted_devices')
      .select('id')
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

    const body = await request.json()

    if (body?.action === 'challenge') {
      const challenge = randomBytes(32).toString('base64url')
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

      const { error } = await supabaseAdmin
        .from('device_key_challenges')
        .insert({
          auth_user_id: auth.access.userId,
          trusted_device_id: device.id,
          challenge,
          expires_at: expiresAt,
        })

      if (error) {
        console.error('Challenge creation failed:', error)
        return NextResponse.json(
          { error: 'تعذر إنشاء تحدّي التحقق.' },
          { status: 500 },
        )
      }

      return NextResponse.json({ challenge })
    }

    if (body?.action !== 'register') {
      return NextResponse.json(
        { error: 'الطلب غير صالح.' },
        { status: 400 },
      )
    }

    const { publicKey, challenge, signature } = body

    if (
      typeof publicKey !== 'string' ||
      publicKey.length > 4096 ||
      typeof challenge !== 'string' ||
      challenge.length > 256 ||
      typeof signature !== 'string' ||
      signature.length > 512
    ) {
      return NextResponse.json(
        { error: 'بيانات التحقق غير صالحة.' },
        { status: 400 },
      )
    }

    const { data: challengeRow, error: challengeError } =
      await supabaseAdmin
        .from('device_key_challenges')
        .select('id')
        .eq('auth_user_id', auth.access.userId)
        .eq('trusted_device_id', device.id)
        .eq('challenge', challenge)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle()

    if (challengeError) {
      return NextResponse.json(
        { error: 'تعذر التحقق من التحدّي.' },
        { status: 500 },
      )
    }

    if (!challengeRow) {
      return NextResponse.json(
        { error: 'التحدّي منتهي أو مستخدم.' },
        { status: 403 },
      )
    }

    let validSignature = false

    try {
      const importedKey = await webcrypto.subtle.importKey(
        'spki',
        Buffer.from(publicKey, 'base64'),
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['verify'],
      )

      validSignature = await webcrypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        importedKey,
        Buffer.from(signature, 'base64'),
        new TextEncoder().encode(challenge),
      )
    } catch {
      validSignature = false
    }

    if (!validSignature) {
      return NextResponse.json(
        { error: 'توقيع المفتاح غير صحيح.' },
        { status: 403 },
      )
    }

    const { data: consumedChallenge, error: consumeError } =
      await supabaseAdmin
        .from('device_key_challenges')
        .update({ used_at: new Date().toISOString() })
        .eq('id', challengeRow.id)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .select('id')
        .maybeSingle()

    if (consumeError) {
      return NextResponse.json(
        { error: 'تعذر إكمال التحقق.' },
        { status: 500 },
      )
    }

    if (!consumedChallenge) {
      return NextResponse.json(
        { error: 'التحدّي مستخدم أو منتهي.' },
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
