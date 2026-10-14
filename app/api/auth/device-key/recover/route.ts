import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  createHash,
  randomBytes,
  webcrypto,
} from 'crypto'

export const runtime = 'nodejs'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL!

const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY!

const DEVICE_COOKIE = 't3leem_device_token'
const DEVICE_COOKIE_MAX_DAYS = 365

const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey,
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

async function verifyCredentials(
  username: string,
  password: string,
) {
  const { data: profile, error: profileError } =
    await supabaseAdmin
      .from('user_profiles')
      .select('auth_user_id, is_active')
      .eq('username', username)
      .maybeSingle()

  if (profileError || !profile || !profile.is_active) {
    return false
  }

  const { data: authData, error: authUserError } =
    await supabaseAdmin.auth.admin.getUserById(
      profile.auth_user_id,
    )

  const email = authData.user?.email

  if (authUserError || !email) {
    return false
  }

  const passwordClient = createClient(
    supabaseUrl,
    publishableKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )

  const { data, error } =
    await passwordClient.auth.signInWithPassword({
      email,
      password,
    })

  return Boolean(
    !error &&
    data.user &&
    data.session &&
    data.user.id === profile.auth_user_id,
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const action = body?.action
    const username =
      typeof body?.username === 'string'
        ? body.username.trim()
        : ''
    const password =
      typeof body?.password === 'string'
        ? body.password
        : ''
    const publicKey = body?.publicKey

    if (
      !username ||
      !password ||
      username.length > 256 ||
      password.length > 1024
    ) {
      return NextResponse.json(
        { error: 'بيانات تسجيل الدخول غير صالحة.' },
        { status: 400 },
      )
    }

    if (
      typeof publicKey !== 'string' ||
      publicKey.length > 4096
    ) {
      return NextResponse.json(
        { error: 'مفتاح الجهاز غير صالح.' },
        { status: 400 },
      )
    }

    if (
      action !== 'challenge' &&
      action !== 'recover'
    ) {
      return NextResponse.json(
        { error: 'الطلب غير صالح.' },
        { status: 400 },
      )
    }

    if (!(await verifyCredentials(username, password))) {
      return NextResponse.json(
        { error: 'تعذر التحقق من بيانات تسجيل الدخول.' },
        { status: 401 },
      )
    }

    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from('user_profiles')
        .select('auth_user_id')
        .eq('username', username)
        .eq('is_active', true)
        .maybeSingle()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'تعذر التحقق من المستخدم.' },
        { status: 401 },
      )
    }

    const userId = profile.auth_user_id

    /*
     * 1. بدء استرجاع الجهاز.
     */
    if (action === 'challenge') {
      const currentToken =
        request.cookies.get(DEVICE_COOKIE)?.value

      if (currentToken) {
        const { data: currentDevice, error } =
          await supabaseAdmin
            .from('trusted_devices')
            .select('id, status')
            .eq('auth_user_id', userId)
            .eq(
              'device_token_hash',
              hashToken(currentToken),
            )
            .maybeSingle()

        if (error) {
          return NextResponse.json(
            { error: 'تعذر فحص الجهاز الحالي.' },
            { status: 500 },
          )
        }

        if (currentDevice?.status === 'approved') {
          return NextResponse.json({
            status: 'already_trusted',
          })
        }

        /*
         * الجهاز المرفوض أو المسحوب الاعتماد
         * لا يُسمح له باسترجاع هويته.
         */
        if (
          currentDevice?.status === 'rejected' ||
          currentDevice?.status === 'revoked'
        ) {
          return NextResponse.json({
            status: 'blocked',
          })
        }

        /*
         * إذا كانت الكوكي تخص جهازًا pending،
         * نكمل البحث عن المفتاح القديم المعتمد.
         * لا نغيّر حالة الجهاز المعلّق ولا نعتمده.
         */
      }

      /*
       * 2. البحث عن المفتاح المسجل لهذا المستخدم.
       */
      const { data: keyRecord, error: keyError } =
        await supabaseAdmin
          .from('trusted_device_keys')
          .select('trusted_device_id')
          .eq('auth_user_id', userId)
          .eq('public_key', publicKey)
          .maybeSingle()

      if (keyError) {
        return NextResponse.json(
          { error: 'تعذر البحث عن مفتاح الجهاز.' },
          { status: 500 },
        )
      }

      if (!keyRecord) {
        return NextResponse.json({
          status: 'not_registered',
        })
      }

      /*
       * 3. التأكد أن المفتاح مربوط بجهاز معتمد.
       */
      const { data: device, error: deviceError } =
        await supabaseAdmin
          .from('trusted_devices')
          .select('id')
          .eq('id', keyRecord.trusted_device_id)
          .eq('auth_user_id', userId)
          .eq('status', 'approved')
          .maybeSingle()

      if (deviceError) {
        return NextResponse.json(
          { error: 'تعذر التحقق من اعتماد الجهاز.' },
          { status: 500 },
        )
      }

      if (!device) {
        return NextResponse.json({
          status: 'not_registered',
        })
      }

      /*
       * 4. إنشاء تحدٍّ مؤقت لإثبات امتلاك المفتاح.
       */
      const challenge = randomBytes(32).toString('base64url')

      const expiresAt = new Date(
        Date.now() + 5 * 60 * 1000,
      ).toISOString()

      const { error: insertError } =
        await supabaseAdmin
          .from('device_key_challenges')
          .insert({
            auth_user_id: userId,
            trusted_device_id: device.id,
            challenge,
            expires_at: expiresAt,
          })

      if (insertError) {
        console.error(
          'Recovery challenge creation failed:',
          insertError,
        )

        return NextResponse.json(
          { error: 'تعذر إنشاء تحدّي الاسترجاع.' },
          { status: 500 },
        )
      }

      return NextResponse.json({
        status: 'challenge',
        challenge,
      })
    }

    /*
     * 5. التحقق من توقيع المفتاح في طلب الاسترجاع.
     */
    const challenge =
      typeof body?.challenge === 'string'
        ? body.challenge
        : ''

    const signature =
      typeof body?.signature === 'string'
        ? body.signature
        : ''

    if (
      !challenge ||
      challenge.length > 256 ||
      !signature ||
      signature.length > 512
    ) {
      return NextResponse.json(
        { error: 'بيانات إثبات المفتاح غير صالحة.' },
        { status: 400 },
      )
    }

    const { data: challengeRow, error: challengeError } =
      await supabaseAdmin
        .from('device_key_challenges')
        .select('id, trusted_device_id')
        .eq('auth_user_id', userId)
        .eq('challenge', challenge)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle()

    if (challengeError) {
      return NextResponse.json(
        { error: 'تعذر التحقق من تحدّي الاسترجاع.' },
        { status: 500 },
      )
    }

    if (!challengeRow) {
      return NextResponse.json(
        { error: 'التحدّي منتهي أو مستخدم.' },
        { status: 403 },
      )
    }

    /*
     * 6. التأكد من تطابق المفتاح مع الجهاز صاحب التحدّي.
     */
    const { data: keyRecord, error: keyError } =
      await supabaseAdmin
        .from('trusted_device_keys')
        .select('trusted_device_id')
        .eq('auth_user_id', userId)
        .eq(
          'trusted_device_id',
          challengeRow.trusted_device_id,
        )
        .eq('public_key', publicKey)
        .maybeSingle()

    if (keyError || !keyRecord) {
      return NextResponse.json(
        { error: 'مفتاح الجهاز غير معروف.' },
        { status: 403 },
      )
    }

    /*
     * 7. التأكد من أن الجهاز لا يزال معتمدًا.
     */
    const { data: device, error: deviceError } =
      await supabaseAdmin
        .from('trusted_devices')
        .select('id')
        .eq('id', challengeRow.trusted_device_id)
        .eq('auth_user_id', userId)
        .eq('status', 'approved')
        .maybeSingle()

    if (deviceError) {
      return NextResponse.json(
        { error: 'تعذر التحقق من اعتماد الجهاز.' },
        { status: 500 },
      )
    }

    if (!device) {
      return NextResponse.json(
        { error: 'هذا الجهاز غير معتمد للاسترجاع.' },
        { status: 403 },
      )
    }

    /*
     * 8. التحقق من توقيع التحدّي باستخدام المفتاح العام.
     */
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
      return NextResponse.json(
        { error: 'توقيع المفتاح غير صحيح.' },
        { status: 403 },
      )
    }

    /*
     * 9. استهلاك التحدّي مرة واحدة فقط.
     */
    const { data: consumed, error: consumeError } =
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

    if (!consumed) {
      return NextResponse.json(
        { error: 'التحدّي مستخدم أو منتهي.' },
        { status: 403 },
      )
    }

    /*
     * 10. إصدار كوكي جديدة للجهاز القديم المعتمد.
     * لا ننشئ جهازًا معتمدًا جديدًا.
     */
    const deviceToken = randomBytes(32).toString('hex')
    const tokenHash = hashToken(deviceToken)

    const { data: updatedDevice, error: updateError } =
      await supabaseAdmin
        .from('trusted_devices')
        .update({
          device_token_hash: tokenHash,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', device.id)
        .eq('auth_user_id', userId)
        .eq('status', 'approved')
        .select('id')
        .maybeSingle()

    if (updateError || !updatedDevice) {
      console.error(
        'Device recovery update failed:',
        updateError,
      )

      return NextResponse.json(
        { error: 'تعذر استرجاع الجهاز.' },
        { status: 500 },
      )
    }

    const response = NextResponse.json({
      status: 'recovered',
    })

    response.cookies.set(DEVICE_COOKIE, deviceToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: DEVICE_COOKIE_MAX_DAYS * 24 * 60 * 60,
    })

    return response
  } catch (error) {
    console.error('Device recovery API error:', error)

    return NextResponse.json(
      { error: 'حدث خطأ غير متوقع أثناء استرجاع الجهاز.' },
      { status: 500 },
    )
  }
}
