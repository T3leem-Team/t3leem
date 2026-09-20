import { NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase-server'

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

function hashDeviceToken(token: string) {
  return createHash('sha256')
    .update(token)
    .digest('hex')
}

export async function GET() {
  try {
    /*
     * التأكد من وجود جلسة تسجيل دخول
     */
    const supabase =
      await createSupabaseServerClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        {
          authenticated: false,
          deviceStatus: 'unauthenticated',
        },
        { status: 401 },
      )
    }

    /*
     * قراءة Device Token من Cookie
     */
    const cookieHeader =
      (await import('next/headers')).cookies()

    const existingCookie =
      cookieHeader.get(DEVICE_COOKIE)?.value

    /*
     * إذا كان الجهاز مسجلاً مسبقاً
     */
    if (existingCookie) {
      const deviceTokenHash =
        hashDeviceToken(existingCookie)

      const { data: device, error } =
        await supabaseAdmin
          .from('trusted_devices')
          .select(
            'id, status, device_name, created_at, approved_at, last_used_at',
          )
          .eq(
            'device_token_hash',
            deviceTokenHash,
          )
          .eq('auth_user_id', user.id)
          .maybeSingle()

      if (error) {
        console.error(
          'Trusted device lookup error:',
          error,
        )

        return NextResponse.json(
          {
            error:
              'تعذر فحص الجهاز.',
          },
          { status: 500 },
        )
      }

      if (device) {
        /*
         * تحديث آخر استخدام للجهاز
         */
        await supabaseAdmin
          .from('trusted_devices')
          .update({
            last_used_at: new Date().toISOString(),
          })
          .eq('id', device.id)

        return NextResponse.json({
          authenticated: true,
          deviceStatus: device.status,
          deviceId: device.id,
          userId: user.id,
        })
      }
    }

    /*
     * جهاز جديد:
     * إنشاء Token عشوائي قوي
     */
    const deviceToken =
      randomBytes(32).toString('hex')

    const deviceTokenHash =
      hashDeviceToken(deviceToken)

    /*
     * تسجيل الجهاز كـ Pending
     */
    const { data: newDevice, error: insertError } =
      await supabaseAdmin
        .from('trusted_devices')
        .insert({
          auth_user_id: user.id,
          device_name: 'جهاز جديد',
          device_token_hash: deviceTokenHash,
          status: 'pending',
        })
        .select(
          'id, status, device_name, created_at',
        )
        .single()

    if (insertError || !newDevice) {
      console.error(
        'Trusted device insert error:',
        insertError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر تسجيل الجهاز الجديد.',
        },
        { status: 500 },
      )
    }

    /*
     * تسجيل الحدث في سجل المصادقة
     */
    await supabaseAdmin
      .from('auth_audit_logs')
      .insert({
        auth_user_id: user.id,
        trusted_device_id: newDevice.id,
        event_type: 'device_pending',
        success: true,
        user_agent: null,
        metadata: {
          source: 'device_check',
        },
      })

    /*
     * إنشاء Response ووضع Cookie آمن
     */
    const response = NextResponse.json({
      authenticated: true,
      deviceStatus: 'pending',
      deviceId: newDevice.id,
      userId: user.id,
    })

    response.cookies.set(
      DEVICE_COOKIE,
      deviceToken,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      },
    )

    return response
  } catch (error) {
    console.error(
      'Device check error:',
      error,
    )

    return NextResponse.json(
      {
        error:
          'حدث خطأ أثناء فحص الجهاز.',
      },
      { status: 500 },
    )
  }
}