import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

import {
  loadActiveSessionForLogout,
  closeActiveSessionForLogout,
  insertLogoutAuditLog,
} from '@/lib/features/auth/repositories/logout.repository'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL!

const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

const SESSION_COOKIE = 't3leem_session_id'

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
     * الموجود في الكوكي.
     */
    if (sessionId) {
      const {
        data: activeSession,
        error: lookupError,
      } = await loadActiveSessionForLogout(sessionId)

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
        } = await closeActiveSessionForLogout(
          activeSession.id,
          activeSession.auth_user_id,
          now,
        )

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
            await insertLogoutAuditLog(
              activeSession.auth_user_id,
              activeSession.trusted_device_id,
              ipAddress,
              userAgent,
              activeSession.id,
            )

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
     * يبقى هذا الاستدعاء داخل API.
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
