import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL!

const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY!

const SESSION_COOKIE = 't3leem_session_id'

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

function getCookie(
  request: Request,
  cookieName: string,
) {
  const cookieHeader =
    request.headers.get('cookie')

  if (!cookieHeader) {
    return null
  }

  const cookies = cookieHeader
    .split(';')
    .map((cookie) => {
      const index = cookie.indexOf('=')

      if (index === -1) {
        return {
          name: cookie.trim(),
          value: '',
        }
      }

      return {
        name: cookie.slice(0, index).trim(),
        value: cookie.slice(index + 1).trim(),
      }
    })

  return (
    cookies.find(
      (cookie) => cookie.name === cookieName,
    )?.value ?? null
  )
}

function getIpAddress(request: Request) {
  const forwardedFor =
    request.headers.get('x-forwarded-for')

  if (forwardedFor) {
    return forwardedFor
      .split(',')[0]
      .trim()
  }

  return (
    request.headers.get('x-real-ip') ?? null
  )
}

export async function POST(
  request: Request,
) {
  try {
    const sessionId = getCookie(
      request,
      SESSION_COOKIE,
    )

    const ipAddress = getIpAddress(request)

    const userAgent =
      request.headers.get('user-agent') ?? null

    /*
     * --------------------------------------------------
     * إنشاء Response من البداية
     * --------------------------------------------------
     */
    const response = NextResponse.json({
      success: true,
    })

    /*
     * --------------------------------------------------
     * Supabase SSR Client
     * --------------------------------------------------
     */
    const supabase =
      createServerClient(
        supabaseUrl,
        publishableKey,
        {
          cookies: {
            getAll() {
              const cookieHeader =
                request.headers.get('cookie')

              if (!cookieHeader) {
                return []
              }

              return cookieHeader
                .split(';')
                .filter(Boolean)
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
                      httpOnly:
                        options?.httpOnly ??
                        true,
                      secure:
                        options?.secure ??
                        process.env.NODE_ENV ===
                          'production',
                      sameSite:
                        options?.sameSite ??
                        'lax',
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
     * --------------------------------------------------
     * التحقق من المستخدم الحالي
     *
     * هذا الجزء أمني ولا يتم حذفه.
     * --------------------------------------------------
     */
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      console.error(
        'Logout user lookup error:',
        userError,
      )
    }

    /*
     * --------------------------------------------------
     * إغلاق active session
     *
     * نتحقق من ملكية الجلسة قبل تحديثها.
     * --------------------------------------------------
     */
    if (sessionId && user) {
      const {
        data: activeSession,
        error: sessionLookupError,
      } = await supabaseAdmin
        .from('active_sessions')
        .select(
          `
          id,
          auth_user_id,
          trusted_device_id,
          is_active
          `,
        )
        .eq('id', sessionId)
        .maybeSingle()

      if (sessionLookupError) {
        console.error(
          'Active session lookup error:',
          sessionLookupError,
        )
      }

      /*
       * لا يمكن للمستخدم إغلاق جلسة مستخدم آخر.
       */
      if (
        activeSession &&
        activeSession.is_active &&
        activeSession.auth_user_id === user.id
      ) {
        const now =
          new Date().toISOString()

        /*
         * --------------------------------------------------
         * إغلاق الجلسة
         *
         * هذه العملية أساسية، لذلك ننتظرها.
         * --------------------------------------------------
         */
        const {
          error: sessionUpdateError,
        } = await supabaseAdmin
          .from('active_sessions')
          .update({
            is_active: false,
            logout_at: now,
            last_activity_at: now,
          })
          .eq('id', activeSession.id)
          .eq('auth_user_id', user.id)
          .eq('is_active', true)

        if (sessionUpdateError) {
          console.error(
            'Active session update error:',
            sessionUpdateError,
          )
        }

        /*
         * --------------------------------------------------
         * Audit Log
         *
         * لا نسمح بتعطيل تسجيل الخروج بسبب فشل الـ audit.
         * --------------------------------------------------
         */
        void supabaseAdmin
          .from('auth_audit_logs')
          .insert({
            auth_user_id:
              activeSession.auth_user_id,
            trusted_device_id:
              activeSession.trusted_device_id,
            event_type: 'logout',
            success: true,
            ip_address: ipAddress,
            user_agent: userAgent,
            metadata: {
              active_session_id:
                activeSession.id,
            },
          })
          .then(({ error }) => {
            if (error) {
              console.error(
                'Logout audit error:',
                error,
              )
            }
          })
      }
    }

    /*
     * --------------------------------------------------
     * Supabase Auth Logout
     *
     * مهم أمنيًا ولا يتم حذفه.
     * --------------------------------------------------
     */
    const {
      error: signOutError,
    } = await supabase.auth.signOut()

    if (signOutError) {
      console.error(
        'Supabase sign out error:',
        signOutError,
      )
    }

    /*
     * --------------------------------------------------
     * حذف Session Cookie فقط
     *
     * Device Cookie يبقى كما هو.
     * --------------------------------------------------
     */
    response.cookies.set(
      SESSION_COOKIE,
      '',
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      },
    )

    return response
  } catch (error) {
    console.error(
      'Logout error:',
      error,
    )

    /*
     * حتى في حالة الخطأ:
     * Session Cookie يتم حذفه.
     */
    const response =
      NextResponse.json(
        {
          error:
            'حدث خطأ أثناء تسجيل الخروج.',
        },
        { status: 500 },
      )

    response.cookies.set(
      SESSION_COOKIE,
      '',
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      },
    )

    return response
  }
}