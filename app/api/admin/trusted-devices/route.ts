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

export async function GET() {
  try {
    /*
     * 1. التحقق من جلسة تسجيل الدخول
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
          error:
            'غير مصرح. يجب تسجيل الدخول أولاً.',
        },
        { status: 401 },
      )
    }

    /*
     * 2. التحقق من أن المستخدم Admin
     */
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

      return NextResponse.json(
        {
          error:
            'تعذر التحقق من صلاحيات المستخدم.',
        },
        { status: 500 },
      )
    }

    if (
      !profile ||
      profile.role !== 'Admin' ||
      !profile.is_active
    ) {
      return NextResponse.json(
        {
          error:
            'ليس لديك صلاحية للوصول إلى هذه الصفحة.',
        },
        { status: 403 },
      )
    }

    /*
     * 3. جلب الأجهزة المعلقة
     */
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
      'Trusted devices admin API error:',
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
