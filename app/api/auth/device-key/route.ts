
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

const DEVICE_COOKIE = 't3leem_device_token'
const MAX_PUBLIC_KEY_LENGTH = 4096

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth()

    if (!auth.access) {
      return auth.response
    }

    const deviceToken = request.cookies.get(DEVICE_COOKIE)?.value

    if (!deviceToken) {
      return jsonError('كوكي الجهاز غير موجودة.', 401)
    }

    const { data: device, error: deviceError } =
      await supabaseAdmin
        .from('trusted_devices')
        .select('id')
        .eq('auth_user_id', auth.access.userId)
        .eq('device_token_hash', hashToken(deviceToken))
        .eq('status', 'approved')
        .maybeSingle()

    if (deviceError) {
      console.error('Trusted device lookup failed:', deviceError)
      return jsonError('تعذر التحقق من الجهاز.', 500)
    }

    if (!device) {
      return jsonError('الجهاز غير معتمد أو غير معروف.', 403)
    }

    const body = await request.json().catch(() => null)

    if (!body || typeof body !== 'object') {
      return jsonError('بيانات الطلب غير صالحة.', 400)
    }

    if (body.action === 'challenge') {
      const challenge = randomBytes(32).toString('base64url')
      const expiresAt = new Date(
        Date.now() + 5 * 60 * 1000,
      ).toISOString()

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
        return jsonError('تعذر إنشاء تحدّي التحقق.', 500)
      }

      return NextResponse.json({ challenge })
    }

    if (body.action !== 'register') {
      return jsonError('الطلب غير صالح.', 400)
    }

    const { publicKey, challenge, signature } = body

    if (
      typeof publicKey !== 'string' ||
      publicKey.length === 0 ||
      publicKey.length > MAX_PUBLIC_KEY_LENGTH ||
      typeof challenge !== 'string' ||
      challenge.length === 0 ||
      challenge.length > 256 ||
      typeof signature !== 'string' ||
      signature.length === 0 ||
      signature.length > 512
    ) {
      return jsonError('بيانات التحقق غير صالحة.', 400)
    }

    // لا تسمح بتغيير مفتاح مسجل مسبقًا لهذا الجهاز.
    const { data: existingKey, error: existingKeyError } =
      await supabaseAdmin
        .from('trusted_device_keys')
        .select('public_key')
        .eq('trusted_device_id', device.id)
        .maybeSingle()

    if (existingKeyError) {
      console.error('Existing device key lookup failed:', existingKeyError)
      return jsonError('تعذر فحص مفتاح الجهاز.', 500)
    }

    if (existingKey) {
      if (
        existingKey.public_key === publicKey
      ) {
        return NextResponse.json({
          success: true,
          alreadyRegistered: true,
        })
      }

      return jsonError(
        'يوجد مفتاح مسجل لهذا الجهاز ولا يمكن استبداله تلقائيًا.',
        409,
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
      console.error('Challenge lookup failed:', challengeError)
      return jsonError('تعذر التحقق من التحدّي.', 500)
    }

    if (!challengeRow) {
      return jsonError('التحدّي منتهي أو مستخدم.', 403)
    }

    let validSignature = false

    try {
      const importedKey = await webcrypto.subtle.importKey(
        'spki',
        Buffer.from(publicKey, 'base64'),
        {
          name: 'ECDSA',
          namedCurve: 'P-256',
        },
        false,
        ['verify'],
      )

      validSignature = await webcrypto.subtle.verify(
        {
          name: 'ECDSA',
          hash: 'SHA-256',
        },
        importedKey,
        Buffer.from(signature, 'base64'),
        new TextEncoder().encode(challenge),
      )
    } catch {
      validSignature = false
    }

    if (!validSignature) {
      return jsonError('توقيع المفتاح غير صحيح.', 403)
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
      console.error('Challenge consumption failed:', consumeError)
      return jsonError('تعذر إكمال التحقق.', 500)
    }

    if (!consumedChallenge) {
      return jsonError('التحدّي مستخدم أو منتهي.', 403)
    }

    const { error: insertError } = await supabaseAdmin
      .from('trusted_device_keys')
      .insert({
        trusted_device_id: device.id,
        auth_user_id: auth.access.userId,
        public_key: publicKey,
      })

    if (insertError) {
      console.error('Device key registration failed:', insertError)
      return jsonError('تعذر تسجيل مفتاح الجهاز.', 500)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Device key API error:', error)
    return jsonError('حدث خطأ غير متوقع.', 500)
  }
}
