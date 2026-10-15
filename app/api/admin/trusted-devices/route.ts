import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
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

const DEFAULT_GRACE_PERIOD_DAYS = 30
const MAX_GRACE_PERIOD_DAYS = 3650

type DeviceAction =
  | 'approve'
  | 'reject'
  | 'revoke'
  | 'update_grace_period'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function getGraceExpiry(days: number) {
  const expiry = new Date()
  expiry.setDate(expiry.getDate() + days)
  return expiry.toISOString()
}

async function getAdmin() {
  const { access, response } = await requireAuth()

  if (response) {
    return { error: response }
  }

  if (!access?.userId) {
    return {
      error: jsonError('يجب تسجيل الدخول أولًا.', 401),
    }
  }

  const userId = access.userId

  const { data: profile, error: profileError } =
    await supabaseAdmin
      .from('user_profiles')
      .select('auth_user_id, username, full_name, role, is_active')
      .eq('auth_user_id', userId)
      .maybeSingle()

  if (profileError) {
    console.error('Admin profile lookup error:', profileError)

    return {
      error: NextResponse.json(
        { error: 'تعذر التحقق من صلاحيات المستخدم.' },
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
      error: jsonError(
        'ليس لديك صلاحية تنفيذ هذا الإجراء.',
        403,
      ),
    }
  }

  return { userId, profile }
}

async function attachUsers<
  T extends { auth_user_id: string },
>(devices: T[]) {
  const userIds = Array.from(
    new Set(devices.map((device) => device.auth_user_id)),
  )

  if (userIds.length === 0) {
    return devices.map((device) => ({
      ...device,
      user: null,
    }))
  }

  const { data: profiles, error } = await supabaseAdmin
    .from('user_profiles')
    .select('auth_user_id, username, full_name, role')
    .in('auth_user_id', userIds)

  if (error) {
    throw new Error(
      `تعذر تحميل بيانات أصحاب الأجهزة: ${error.message}`,
    )
  }

  const profileMap = new Map(
    (profiles ?? []).map((profile) => [
      profile.auth_user_id,
      profile,
    ]),
  )

  return devices.map((device) => {
    const owner = profileMap.get(device.auth_user_id)

    return {
      ...device,
      user: owner
        ? {
            username: owner.username,
            full_name: owner.full_name,
            role: owner.role,
          }
        : null,
    }
  })
}

async function writeAudit(
  authUserId: string,
  deviceId: string,
  eventType: string,
  adminUserId: string,
  metadata: Record<string, unknown> = {},
) {
  const { error } = await supabaseAdmin
    .from('auth_audit_logs')
    .insert({
      auth_user_id: authUserId,
      trusted_device_id: deviceId,
      event_type: eventType,
      success: true,
      metadata: {
        ...metadata,
        performed_by: adminUserId,
      },
    })

  if (error) {
    console.error(`Audit log error (${eventType}):`, error)
  }
}

/**
 * إغلاق الجلسات النشطة المرتبطة بجهاز معين.
 * يبقى سجل الجلسة والجهاز محفوظًا في قاعدة البيانات.
 */
async function closeDeviceSessions(
  authUserId: string,
  deviceId: string,
) {
  const now = new Date().toISOString()

  const { error } = await supabaseAdmin
    .from('active_sessions')
    .update({
      is_active: false,
      logout_at: now,
      last_activity_at: now,
    })
    .eq('auth_user_id', authUserId)
    .eq('trusted_device_id', deviceId)
    .eq('is_active', true)

  if (error) {
    console.error('Close device sessions error:', error)
    throw new Error('تعذر إغلاق الجلسات النشطة للجهاز.')
  }
}

/*
 * GET
 * يعيد الأجهزة المعلقة والمعتمدة في قائمتين منفصلتين.
 */
export async function GET() {
  try {
    const admin = await getAdmin()

    if (admin.error) {
      return admin.error
    }

    // مهم: لا تُضف device_token_hash إلى هذه القائمة.
    const columns = `
      id,
      auth_user_id,
      device_name,
      status,
      created_at,
      approved_at,
      approved_by,
      rejected_at,
      rejected_by,
      revoked_at,
      revoked_by,
      last_used_at,
      approved_device_type,
      pending_device_type,
      grace_period_days,
      grace_expires_at,
      device_type_detected_at
    `

    const [pendingResult, approvedResult] = await Promise.all([
      supabaseAdmin
        .from('trusted_devices')
        .select(columns)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),

      supabaseAdmin
        .from('trusted_devices')
        .select(columns)
        .eq('status', 'approved')
        .order('approved_at', { ascending: false }),
    ])

    if (pendingResult.error || approvedResult.error) {
      const dbError =
        pendingResult.error || approvedResult.error

      console.error('Trusted devices lookup error:', dbError)

      return NextResponse.json(
        { error: 'تعذر تحميل الأجهزة.' },
        { status: 500 },
      )
    }

    const pendingDevices = await attachUsers(
      pendingResult.data ?? [],
    )

    const approvedDevices = await attachUsers(
      approvedResult.data ?? [],
    )

    return NextResponse.json({
      success: true,
      devices: pendingDevices,
      approvedDevices,
    })
  } catch (error) {
    console.error('Trusted devices GET error:', error)

    return NextResponse.json(
      { error: 'حدث خطأ أثناء تحميل الأجهزة.' },
      { status: 500 },
    )
  }
}

/*
 * POST
 * approve | reject | revoke | update_grace_period
 */
export async function POST(request: Request) {
  try {
    const admin = await getAdmin()

    if (admin.error) {
      return admin.error
    }

    const adminUserId = admin.userId
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
      return jsonError('معرف الجهاز مطلوب.')
    }

    const supportedActions: DeviceAction[] = [
      'approve',
      'reject',
      'revoke',
      'update_grace_period',
    ]

    if (!supportedActions.includes(action as DeviceAction)) {
      return jsonError('الإجراء المطلوب غير صحيح.')
    }

    const typedAction = action as DeviceAction

    let gracePeriodDays: number | null = null

    if (
      typedAction === 'approve' ||
      typedAction === 'update_grace_period'
    ) {
      const rawDays = body.gracePeriodDays

      gracePeriodDays =
        rawDays === undefined && typedAction === 'approve'
          ? DEFAULT_GRACE_PERIOD_DAYS
          : rawDays

      if (
        typeof gracePeriodDays !== 'number' ||
        !Number.isInteger(gracePeriodDays) ||
        gracePeriodDays < 1 ||
        gracePeriodDays > MAX_GRACE_PERIOD_DAYS
      ) {
        return jsonError(
          `مدة الثقة يجب أن تكون عددًا صحيحًا من 1 إلى ${MAX_GRACE_PERIOD_DAYS} يومًا.`,
        )
      }
    }

    const { data: device, error: deviceError } =
      await supabaseAdmin
        .from('trusted_devices')
        .select(`
          id,
          auth_user_id,
          status,
          device_name,
          approved_device_type,
          pending_device_type,
          grace_period_days,
          grace_expires_at
        `)
        .eq('id', deviceId)
        .maybeSingle()

    if (deviceError) {
      console.error('Trusted device lookup error:', deviceError)

      return NextResponse.json(
        { error: 'تعذر التحقق من الجهاز.' },
        { status: 500 },
      )
    }

    if (!device) {
      return jsonError('الجهاز غير موجود.', 404)
    }

    /*
     * الموافقة على جهاز معلق.
     */
    if (typedAction === 'approve') {
      if (device.status !== 'pending') {
        return NextResponse.json(
          {
            error: 'هذا الجهاز ليس ضمن الطلبات المعلقة.',
            status: device.status,
          },
          { status: 409 },
        )
      }

      const approvedDeviceType =
        device.pending_device_type || 'unknown'

      const approvedAt = new Date().toISOString()
      const graceExpiresAt = getGraceExpiry(gracePeriodDays!)

      const { data: updatedDevice, error } =
        await supabaseAdmin
          .from('trusted_devices')
          .update({
            status: 'approved',
            approved_at: approvedAt,
            approved_by: adminUserId,
            approved_device_type: approvedDeviceType,
            pending_device_type: null,
            grace_period_days: gracePeriodDays,
            grace_expires_at: graceExpiresAt,
            rejected_at: null,
            rejected_by: null,
            revoked_at: null,
            revoked_by: null,
          })
          .eq('id', device.id)
          .eq('status', 'pending')
          .select(`
            id,
            auth_user_id,
            device_name,
            status,
            approved_at,
            approved_by,
            approved_device_type,
            grace_period_days,
            grace_expires_at
          `)
          .maybeSingle()

      if (error) {
        console.error('Trusted device approval error:', error)

        return NextResponse.json(
          { error: 'تعذرت الموافقة على الجهاز.' },
          { status: 500 },
        )
      }

      if (!updatedDevice) {
        return jsonError(
          'تغيرت حالة الجهاز؛ حدّث الصفحة وحاول مجددًا.',
          409,
        )
      }

      await writeAudit(
        device.auth_user_id,
        device.id,
        'device_approved',
        adminUserId,
        {
          grace_period_days: gracePeriodDays,
          grace_expires_at: graceExpiresAt,
          approved_device_type: approvedDeviceType,
        },
      )

      return NextResponse.json({
        success: true,
        action: 'approved',
        device: updatedDevice,
      })
    }

    /*
     * رفض جهاز معلق.
     */
    if (typedAction === 'reject') {
      if (device.status !== 'pending') {
        return NextResponse.json(
          {
            error: 'هذا الجهاز ليس ضمن الطلبات المعلقة.',
            status: device.status,
          },
          { status: 409 },
        )
      }

      const { data: updatedDevice, error } =
        await supabaseAdmin
          .from('trusted_devices')
          .update({
            status: 'rejected',
            rejected_at: new Date().toISOString(),
            rejected_by: adminUserId,
            approved_at: null,
            approved_by: null,
            pending_device_type: null,
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
        console.error('Trusted device rejection error:', error)

        return NextResponse.json(
          { error: 'تعذر رفض الجهاز.' },
          { status: 500 },
        )
      }

      if (!updatedDevice) {
        return jsonError(
          'تغيرت حالة الجهاز؛ حدّث الصفحة وحاول مجددًا.',
          409,
        )
      }

      await writeAudit(
        device.auth_user_id,
        device.id,
        'device_rejected',
        adminUserId,
      )

      return NextResponse.json({
        success: true,
        action: 'rejected',
        device: updatedDevice,
      })
    }

    /*
     * إلغاء اعتماد جهاز مع إغلاق جلساته النشطة.
     * لا يتم حذف سجل الجهاز من قاعدة البيانات.
     */
    if (typedAction === 'revoke') {
      if (device.status !== 'approved') {
        return NextResponse.json(
          {
            error: 'يمكن إلغاء اعتماد الأجهزة المعتمدة فقط.',
            status: device.status,
          },
          { status: 409 },
        )
      }

      const { data: updatedDevice, error } =
        await supabaseAdmin
          .from('trusted_devices')
          .update({
            status: 'revoked',
            revoked_at: new Date().toISOString(),
            revoked_by: adminUserId,
          })
          .eq('id', device.id)
          .eq('status', 'approved')
          .select(
            'id, auth_user_id, device_name, status, revoked_at, revoked_by',
          )
          .maybeSingle()

      if (error) {
        console.error('Trusted device revoke error:', error)

        return NextResponse.json(
          { error: 'تعذر إلغاء اعتماد الجهاز.' },
          { status: 500 },
        )
      }

      if (!updatedDevice) {
        return jsonError(
          'تغيرت حالة الجهاز؛ حدّث الصفحة وحاول مجددًا.',
          409,
        )
      }

      // إغلاق الجلسات المرتبطة بهذا الجهاز.
      await closeDeviceSessions(
        device.auth_user_id,
        device.id,
      )

      await writeAudit(
        device.auth_user_id,
        device.id,
        'device_revoked',
        adminUserId,
      )

      return NextResponse.json({
        success: true,
        action: 'revoked',
        device: updatedDevice,
      })
    }

    /*
     * تعديل مدة الثقة لجهاز معتمد.
     * يبدأ احتساب المدة الجديدة من وقت تنفيذ العملية.
     */
    if (typedAction === 'update_grace_period') {
      if (device.status !== 'approved') {
        return NextResponse.json(
          {
            error: 'يمكن تعديل مدة الأجهزة المعتمدة فقط.',
            status: device.status,
          },
          { status: 409 },
        )
      }

      const graceExpiresAt = getGraceExpiry(gracePeriodDays!)

      const { data: updatedDevice, error } =
        await supabaseAdmin
          .from('trusted_devices')
          .update({
            grace_period_days: gracePeriodDays,
            grace_expires_at: graceExpiresAt,
          })
          .eq('id', device.id)
          .eq('status', 'approved')
          .select(`
            id,
            auth_user_id,
            device_name,
            status,
            approved_device_type,
            grace_period_days,
            grace_expires_at
          `)
          .maybeSingle()

      if (error) {
        console.error('Grace period update error:', error)

        return NextResponse.json(
          { error: 'تعذر تعديل مدة الثقة.' },
          { status: 500 },
        )
      }

      if (!updatedDevice) {
        return jsonError(
          'تغيرت حالة الجهاز؛ حدّث الصفحة وحاول مجددًا.',
          409,
        )
      }

      await writeAudit(
        device.auth_user_id,
        device.id,
        'device_grace_period_updated',
        adminUserId,
        {
          previous_grace_period_days: device.grace_period_days,
          previous_grace_expires_at: device.grace_expires_at,
          grace_period_days: gracePeriodDays,
          grace_expires_at: graceExpiresAt,
        },
      )

      return NextResponse.json({
        success: true,
        action: 'grace_period_updated',
        device: updatedDevice,
      })
    }

    return jsonError('الإجراء غير مدعوم.')
  } catch (error) {
    console.error('Trusted devices POST error:', error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'حدث خطأ أثناء معالجة الجهاز.',
      },
      { status: 500 },
    )
  }
}
