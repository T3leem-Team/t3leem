
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
  const cookieHeader = request.headers.get('cookie')

  if (!cookieHeader) {
    return null
  }

  const cookie = cookieHeader
    .split(';')
    .map((item) => {
      const index = item.indexOf('=')

      return {
        name:
          index === -1
            ? item.trim()
            : item.slice(0, index).trim(),
        value:
          index === -1
            ? ''
            : item.slice(index + 1).trim(),
      }
    })
    .find((item) => item.name === cookieName)

  return cookie?.value ?? null
}

function getIpAddress(request: Request) {
  const forwardedFor =
    request.headers.get('x-forwarded-for')

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  return request.headers.get('x-real-ip') ?? null
}

function clearSessionCookie(
  response: NextResponse,
) {
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })

  return response
}

export async function POST(request: Request) {
  const response = NextResponse.json({
    success: true,
  })

  try {
    const sessionId = getCookie(
      request,
      SESSION_COOKIE,
    )

    const ipAddress = getIpAddress(request)

    const userAgent =
      request.headers.get('user-agent') ?? null

    /*
     * إنهاء جلسة النظام باستخدام معرّف الجلسة
     * الموجود في الكوكي، دون طلب getUser إضافي.
     */
    if (sessionId) {
      const {
        data: activeSession,
        error: lookupError,
      } = await supabaseAdmin
        .from('active_sessions')
        .select(`
          id,
          auth_user_id,
          trusted_device_id,
          is_active
        `)
        .eq('id', sessionId)
        .maybeSingle()

      if (lookupError) {
        console.error(
          'Active session lookup error:',
          lookupError,
        )
      } else if (
        activeSession &&
        activeSession.is_active
      ) {
        const now = new Date().toISOString()

        const {
          data: closedSession,
          error: updateError,
        } = await supabaseAdmin
          .from('active_sessions')
          .update({
            is_active: false,
            logout_at: now,
            last_activity_at: now,
          })
          .eq('id', activeSession.id)
          .eq('auth_user_id', activeSession.auth_user_id)
          .eq('is_active', true)
          .select('id')
          .maybeSingle()

        if (updateError) {
          console.error(
            'Active session update error:',
            updateError,
          )
        } else if (closedSession) {
          /*
           * الاحتفاظ بسجل التدقيق بعد نجاح إغلاق الجلسة.
           */
          const { error: auditError } =
            await supabaseAdmin
              .from('auth_audit_logs')
              .insert({
                auth_user_id: activeSession.auth_user_id,
                trusted_device_id:
                  activeSession.trusted_device_id,
                event_type: 'logout',
                success: true,
                ip_address: ipAddress,
                user_agent: userAgent,
                metadata: {
                  active_session_id: activeSession.id,
                },
              })

          if (auditError) {
            console.error(
              'Logout audit error:',
              auditError,
            )
          }
        }
      }
    }

    /*
     * إنهاء جلسة Supabase Auth.
     * نبقي هذا الاستدعاء في هذه المرحلة.
     */
    const supabase = createServerClient(
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
              .map((item) => {
                const index = item.indexOf('=')

                return {
                  name:
                    index === -1
                      ? item.trim()
                      : item.slice(0, index).trim(),
                  value:
                    index === -1
                      ? ''
                      : item.slice(index + 1).trim(),
                }
              })
          },

          setAll(cookiesToSet) {
            cookiesToSet.forEach(
              ({ name, value, options }) => {
                response.cookies.set(name, value, {
                  ...options,
                  path: options?.path ?? '/',
                })
              },
            )
          },
        },
      },
    )

    const { error: signOutError } =
      await supabase.auth.signOut()

    if (signOutError) {
      console.error(
        'Supabase sign out error:',
        signOutError,
      )
    }

    /*
     * حذف كوكي جلسة النظام فقط.
     * كوكي الجهاز الموثوق يبقى كما هو.
     */
    return clearSessionCookie(response)
  } catch (error) {
    console.error('Logout error:', error)

    return clearSessionCookie(
      NextResponse.json(
        {
          error: 'حدث خطأ أثناء تسجيل الخروج.',
        },
        { status: 500 },
      ),
    )
  }
}
