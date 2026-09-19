import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function POST(request: Request) {
  const response = NextResponse.json({
    success: true,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return (
            request.headers
              .get('cookie')
              ?.split('; ')
              .filter(Boolean)
              .map((cookie) => {
                const index =
                  cookie.indexOf('=')

                return {
                  name:
                    index === -1
                      ? cookie
                      : cookie.slice(
                          0,
                          index,
                        ),
                  value:
                    index === -1
                      ? ''
                      : cookie.slice(
                          index + 1,
                        ),
                }
              }) ?? []
          )
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

  await supabase.auth.signOut()

  return response
}

