import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

// T3LEEM authentication route

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

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

    /*
     * نبحث عن حساب المستخدم باستخدام الاسم.
     * البحث يتم على السيرفر باستخدام Service Role.
     */
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

    if (!profile || !profile.is_active) {
      return NextResponse.json(
        {
          error: 'اسم المستخدم أو كلمة المرور غير صحيحة.',
        },
        { status: 401 },
      )
    }

    /*
     * نقرأ الإيميل الداخلي المرتبط بحساب Supabase Auth.
     * الإيميل لا يتم إرساله للمتصفح.
     */
    const {
      data: authUser,
      error: authUserError,
    } =
      await supabaseAdmin.auth.admin.getUserById(
        profile.auth_user_id,
      )

    if (
      authUserError ||
      !authUser.user?.email
    ) {
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
     * ننشئ Response من البداية حتى نتمكن
     * من حفظ جلسة Supabase داخل Cookies.
     */
    const response = NextResponse.json({
      user: {
        id: profile.auth_user_id,
        username: profile.username,
        full_name: profile.full_name,
        role: profile.role,
      },
    })

    /*
     * هذا العميل يستخدم المفتاح العام لتسجيل الدخول الفعلي.
     * Service Role لا يتم استخدامه لإنشاء جلسة المتصفح.
     */
    const supabase = createServerClient(
      supabaseUrl,
      publishableKey,
      {
        cookies: {
          getAll() {
            return request.headers
              .get('cookie')
              ?.split('; ')
              .filter(Boolean)
              .map((cookie) => {
                const index = cookie.indexOf('=')

                return {
                  name:
                    index === -1
                      ? cookie
                      : cookie.slice(0, index),
                  value:
                    index === -1
                      ? ''
                      : cookie.slice(index + 1),
                }
              }) ?? []
          },

          setAll(cookiesToSet) {
            cookiesToSet.forEach(
              ({ name, value, options }) => {
                response.cookies.set(
                  name,
                  value,
                  options,
                )
              },
            )
          },
        },
      },
    )

    /*
     * تسجيل الدخول الحقيقي في Supabase Auth.
     */
    const {
      data: authData,
      error: signInError,
    } =
      await supabase.auth.signInWithPassword({
        email: authUser.user.email,
        password,
      })

    if (
      signInError ||
      !authData.session
    ) {
      return NextResponse.json(
        {
          error:
            'اسم المستخدم أو كلمة المرور غير صحيحة.',
        },
        { status: 401 },
      )
    }

    return response
  } catch (error) {
    console.error('Login error:', error)

    return NextResponse.json(
      {
        error:
          'حدث خطأ غير متوقع أثناء تسجيل الدخول.',
      },
      { status: 500 },
    )
  }
}

