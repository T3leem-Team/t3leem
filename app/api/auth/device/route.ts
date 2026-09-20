import { NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const DEVICE_COOKIE = 't3leem_device_token'

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

function hashDeviceToken(token: string) {
  return createHash('sha256')
    .update(token)
    .digest('hex')
}

export async function GET() {
  try {
    /*
     * 1. التحقق من جلسة المستخدم
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
     * 2. قراءة Cookie الخاصة بالجهاز
     */
    const cookieStore = await cookies()

    const existingToken =
      cookieStore.get(DEVICE_COOKIE)?.value

    /*
     * 3. إذا كان الجهاز موجوداً مسبقاً
     */
    if (existingToken) {
      const tokenHash =
        hashDeviceToken(existingToken)

      const { data: device, error } =
        await supabaseAdmin
          .from('trusted_devices')
          .select(
            'id, status, device_name, created_at, approved_at, last_used_at',
          )
          .eq(
            'device_token_hash',
            tokenHash,
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
            details: error.message,
          },
          { status: 500 },
        )
      }

      if (device) {
        await supabaseAdmin
          .from('trusted_devices')
          .update({
            last_used_at:
              new Date().toISOString(),
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
     * 4. جهاز جديد
     */
    const deviceToken =
      randomBytes(32).toString('hex')

    const tokenHash =
      hashDeviceToken(deviceToken)

    const {
      data: newDevice,
      error: insertError,
    } = await supabaseAdmin
      .from('trusted_devices')
      .insert({
        auth_user_id: user.id,
        device_name: 'جهاز جديد',
        device_token_hash: tokenHash,
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
          details:
            insertError?.message ?? null,
        },
        { status: 500 },
      )
    }

    /*
     * 5. تسجيل الحدث
     */
    const { error: auditError } =
      await supabaseAdmin
        .from('auth_audit_logs')
        .insert({
          auth_user_id: user.id,
          trusted_device_id: newDevice.id,
          event_type: 'device_pending',
          success: true,
          metadata: {
            source: 'device_check',
          },
        })

    if (auditError) {
      console.error(
        'Audit log error:',
        auditError,
      )
    }

    /*
     * 6. حفظ Device Token في Cookie
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
        secure:
          process.env.NODE_ENV ===
          'production',
        sameSite: 'lax',
        path: '/',
        maxAge:
          60 * 60 * 24 * 365,
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
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 },
    )
  }
}