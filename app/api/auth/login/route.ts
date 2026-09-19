import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

// T3LEEM authentication route

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL!

const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY!

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
          error:
            'اسم المستخدم وكلمة المرور مطلوبان.',
        },
        { status: 400 },
      )
    }

    /*
     * البحث عن المستخدم باستخدام Service Role
     */
    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from('user_profiles')
      .select(
        'auth_user_id, username, full_name, role, is_active',
      )
      .eq('username', username)
      .maybeSingle()

    if (profileError) {
      console.error(
        'Profile lookup error:',
        profileError,
      )

      return NextResponse.json(
        {
          error:
            'حدث خطأ أثناء تسجيل الدخول.',
        },
        { status: 500 },
      )
    }

    if (!profile || !profile.is_active) {
      return NextResponse.json(
        {
          error:
            'اسم المستخدم أو كلمة المرور غير صحيحة.',
        },
        { status: 401 },
      )
    }

    /*
     * الحصول على الإيميل الداخلي لحساب Supabase Auth
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
          error:
            'تعذر التحقق من حساب المستخدم.',
        },
        { status: 500 },
      )
    }

    /*
     * إنشاء Response واحد فقط.
     * هذا هو الـ Response الذي ستُحفظ عليه Cookies.
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
     * Supabase SSR client
     */
    const supabase =
      createServerClient(
        supabaseUrl,
        publishableKey,
        {
          cookies: {
            getAll() {
              const cookieHeader =
                request.headers.get(
                  'cookie',
                )

              if (!cookieHeader) {
                return []
              }

              return cookieHeader
                .split(';')
                .map((cookie) => {
                  const index =
                    cookie.indexOf('=')

                  if (index === -1) {
                    return {
                      name: cookie.trim(),
                      value: '',
                    }
                  }

                  return {
                    name: cookie
                      .slice(0, index)
                      .trim(),

                    value: cookie
                      .slice(index + 1)
                      .trim(),
                  }
                })
                .filter(
                  (cookie) =>
                    cookie.name.length > 0,
                )
            },

            setAll(cookiesToSet) {
              cookiesToSet.forEach(
                ({
                  name,
                  value,
                  options,
                }) => {
                  response.cookies.set(
                    name,
                    value,
                    {
                      ...options,
                      path:
                        options?.path ?? '/',
                    },
                  )
                },
              )
            },
          },
        },
      )

    /*
     * تسجيل الدخول الفعلي في Supabase Auth
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
      console.error(
        'Supabase sign in error:',
        signInError,
      )

      return NextResponse.json(
        {
          error:
            'اسم المستخدم أو كلمة المرور غير صحيحة.',
        },
        { status: 401 },
      )
    }

    /*
     * نتأكد أن الجلسة أصبحت موجودة
     * داخل نفس Supabase SSR client.
     */
    const {
      data: {
        user: loggedInUser,
      },
      error: getUserError,
    } =
      await supabase.auth.getUser()

    if (getUserError || !loggedInUser) {
      console.error(
        'Session verification error:',
        getUserError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر إنشاء جلسة تسجيل الدخول.',
        },
        { status: 500 },
      )
    }

    return response
  } catch (error) {
    console.error(
      'Login error:',
      error,
    )

    return NextResponse.json(
      {
        error:
          'حدث خطأ غير متوقع أثناء تسجيل الدخول.',
      },
      { status: 500 },
    )
  }
}