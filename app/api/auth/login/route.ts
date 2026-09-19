import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

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

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const username =
      typeof body.username === 'string'
        ? body.username.trim()
        : ''

    const password =
      typeof body.password === 'string'
        ? body.password
        : ''

    if (!username || !password) {
      return NextResponse.json(
        {
          error: 'اسم المستخدم وكلمة المرور مطلوبان.',
        },
        { status: 400 },
      )
    }

    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from('user_profiles')
        .select(
          'auth_user_id, username, full_name, role, is_active',
        )
        .eq('username', username)
        .maybeSingle()

    if (profileError) {
      console.error('Profile lookup error:', profileError)

      return NextResponse.json(
        {
          error: 'حدث خطأ أثناء تسجيل الدخول.',
        },
        { status: 500 },
      )
    }

    /*
     * لا نكشف إذا كان اسم المستخدم موجودًا أو غير موجود.
     */
    if (!profile || !profile.is_active) {
      return NextResponse.json(
        {
          error: 'اسم المستخدم أو كلمة المرور غير صحيحة.',
        },
        { status: 401 },
      )
    }

    /*
     * نقرأ البريد الداخلي لحساب Supabase Auth.
     * هذا لا يخرج من السيرفر للمستخدم.
     */
    const {
      data: authUser,
      error: authUserError,
    } = await supabaseAdmin.auth.admin.getUserById(
      profile.auth_user_id,
    )

    if (authUserError || !authUser.user?.email) {
      console.error(
        'Auth user lookup error:',
        authUserError,
      )

      return NextResponse.json(
        {
          error: 'تعذر التحقق من حساب المستخدم.',
        },
        { status: 500 },
      )
    }

    /*
     * تسجيل الدخول الفعلي باستخدام Supabase Auth.
     */
    const {
      data: authData,
      error: signInError,
    } = await supabaseAdmin.auth.signInWithPassword({
      email: authUser.user.email,
      password,
    })

    if (signInError || !authData.session) {
      return NextResponse.json(
        {
          error: 'اسم المستخدم أو كلمة المرور غير صحيحة.',
        },
        { status: 401 },
      )
    }

    return NextResponse.json({
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
      },
      user: {
        id: profile.auth_user_id,
        username: profile.username,
        full_name: profile.full_name,
        role: profile.role,
      },
    })
  } catch (error) {
    console.error('Login error:', error)

    return NextResponse.json(
      {
        error: 'حدث خطأ غير متوقع أثناء تسجيل الدخول.',
      },
      { status: 500 },
    )
  }
}
