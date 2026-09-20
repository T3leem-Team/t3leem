import { NextResponse } from 'next/server'
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

async function getAdmin() {
  const supabase =
    await createSupabaseServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: NextResponse.json(
        {
          error:
            'غير مصرح. يجب تسجيل الدخول أولاً.',
        },
        { status: 401 },
      ),
    }
  }

  const { data: profile, error: profileError } =
    await supabaseAdmin
      .from('user_profiles')
      .select(
        'auth_user_id, username, full_name, role, is_active',
      )
      .eq('auth_user_id', user.id)
      .maybeSingle()

  if (profileError) {
    console.error(
      'Admin profile lookup error:',
      profileError,
    )

    return {
      error: NextResponse.json(
        {
          error:
            'تعذر التحقق من صلاحيات المستخدم.',
        },
        { status: 500 },
      ),
    }
  }

  if (
    !profile ||
    profile.role !== 'Admin' ||
    !profile.is_active
  ) {
    return {
      error: NextResponse.json(
        {
          error:
            'ليس لديك صلاحية تنفيذ هذا الإجراء.',
        },
        { status: 403 },
      ),
    }
  }

  return {
    user,
    profile,
  }
}

export async function GET() {
  try {
    const admin = await getAdmin()

    if (admin.error) {
      return admin.error
    }

    const {
      data: devices,
      error: devicesError,
    } =
      await supabaseAdmin
        .from('trusted_devices')
        .select(
          `
          id,
          auth_user_id,
          device_name,
          status,
          created_at,
          approved_at,
          rejected_at,
          revoked_at,
          last_used_at
        `,
        )
        .eq('status', 'pending')
        .order('created_at', {
          ascending: false,
        })

    if (devicesError) {
      console.error(
        'Trusted devices lookup error:',
        devicesError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر تحميل الأجهزة المعلقة.',
          details: devicesError.message,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      devices: devices ?? [],
    })
  } catch (error) {
    console.error(
      'Trusted devices GET error:',
      error,
    )

    return NextResponse.json(
      {
        error:
          'حدث خطأ أثناء تحميل الأجهزة.',
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 },
    )
  }
}

export async function POST(
  request: Request,
) {
  try {
    /*
     * 1. التحقق من أن المنفذ Admin
     */
    const admin = await getAdmin()

    if (admin.error) {
      return admin.error
    }

    const adminUser = admin.user

    /*
     * 2. قراءة الطلب
     */
    const body = await request.json()

    const deviceId =
      typeof body.deviceId === 'string'
        ? body.deviceId.trim()
        : ''

    const action =
      typeof body.action === 'string'
        ? body.action.trim().toLowerCase()
        : ''

    if (!deviceId) {
      return NextResponse.json(
        {
          error:
            'معرف الجهاز مطلوب.',
        },
        { status: 400 },
      )
    }

    if (
      action !== 'approve' &&
      action !== 'reject'
    ) {
      return NextResponse.json(
        {
          error:
            'الإجراء غير صحيح. استخدم approve أو reject.',
        },
        { status: 400 },
      )
    }

    /*
     * 3. جلب الجهاز والتأكد أنه Pending
     */
    const {
      data: device,
      error: deviceError,
    } =
      await supabaseAdmin
        .from('trusted_devices')
        .select(
          'id, auth_user_id, status, device_name',
        )
        .eq('id', deviceId)
        .maybeSingle()

    if (deviceError) {
      console.error(
        'Trusted device lookup error:',
        deviceError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر العثور على الجهاز.',
          details: deviceError.message,
        },
        { status: 500 },
      )
    }

    if (!device) {
      return NextResponse.json(
        {
          error:
            'الجهاز غير موجود.',
        },
        { status: 404 },
      )
    }

    if (device.status !== 'pending') {
      return NextResponse.json(
        {
          error:
            'هذا الجهاز تمت معالجته مسبقاً.',
          status: device.status,
        },
        { status: 409 },
      )
    }

    /*
     * 4. الموافقة
     */
    if (action === 'approve') {
      const { data: updatedDevice, error } =
        await supabaseAdmin
          .from('trusted_devices')
          .update({
            status: 'approved',
            approved_at:
              new Date().toISOString(),
            approved_by: adminUser.id,
            rejected_at: null,
            rejected_by: null,
            revoked_at: null,
            revoked_by: null,
          })
          .eq('id', device.id)
          .eq('status', 'pending')
          .select(
            'id, auth_user_id, device_name, status, approved_at, approved_by',
          )
          .maybeSingle()

      if (error) {
        console.error(
          'Trusted device approval error:',
          error,
        )

        return NextResponse.json(
          {
            error:
              'تعذرت الموافقة على الجهاز.',
            details: error.message,
          },
          { status: 500 },
        )
      }

      if (!updatedDevice) {
        return NextResponse.json(
          {
            error:
              'تعذر تحديث الجهاز. ربما تمت معالجته مسبقاً.',
          },
          { status: 409 },
        )
      }

      /*
       * تسجيل الموافقة في سجل التدقيق
       */
      const { error: auditError } =
        await supabaseAdmin
          .from('auth_audit_logs')
          .insert({
            auth_user_id:
              device.auth_user_id,
            trusted_device_id: device.id,
            event_type: 'device_approved',
            success: true,
            metadata: {
              approved_by:
                adminUser.id,
            },
          })

      if (auditError) {
        console.error(
          'Device approval audit error:',
          auditError,
        )
      }

      return NextResponse.json({
        success: true,
        action: 'approved',
        device: updatedDevice,
      })
    }

    /*
     * 5. الرفض
     */
    const { data: updatedDevice, error } =
      await supabaseAdmin
        .from('trusted_devices')
        .update({
          status: 'rejected',
          rejected_at:
            new Date().toISOString(),
          rejected_by: adminUser.id,
          approved_at: null,
          approved_by: null,
          revoked_at: null,
          revoked_by: null,
        })
        .eq('id', device.id)
        .eq('status', 'pending')
        .select(
          'id, auth_user_id, device_name, status, rejected_at, rejected_by',
        )
        .maybeSingle()

    if (error) {
      console.error(
        'Trusted device rejection error:',
        error,
      )

      return NextResponse.json(
        {
          error:
            'تعذر رفض الجهاز.',
          details: error.message,
        },
        { status: 500 },
      )
    }

    if (!updatedDevice) {
      return NextResponse.json(
        {
          error:
            'تعذر تحديث الجهاز. ربما تمت معالجته مسبقاً.',
        },
        { status: 409 },
      )
    }

    /*
     * تسجيل الرفض في سجل التدقيق
     */
    const { error: auditError } =
      await supabaseAdmin
        .from('auth_audit_logs')
        .insert({
          auth_user_id:
            device.auth_user_id,
          trusted_device_id: device.id,
          event_type: 'device_rejected',
          success: true,
          metadata: {
            rejected_by: adminUser.id,
          },
        })

    if (auditError) {
      console.error(
        'Device rejection audit error:',
        auditError,
      )
    }

    return NextResponse.json({
      success: true,
      action: 'rejected',
      device: updatedDevice,
    })
  } catch (error) {
    console.error(
      'Trusted devices POST error:',
      error,
    )

    return NextResponse.json(
      {
        error:
          'حدث خطأ أثناء معالجة الجهاز.',
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 },
    )
  }
}