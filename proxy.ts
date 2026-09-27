import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(
            ({ name, value, options }) => {
              request.cookies.set(name, value)

              response = NextResponse.next({
                request,
              })

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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  const isApiRoute =
    pathname.startsWith('/api/')

  const isPublicRoute =
    pathname === '/login' ||
    pathname === '/forgot-password' ||
    pathname === '/register' ||
    pathname === '/student-status' ||
    pathname === '/api/auth/login'

  /*
   * ---------------------------------------------------------
   * API
   * ---------------------------------------------------------
   *
   * لا نعمل redirect للـAPI إلى /login.
   *
   * كل API مسؤول عن التحقق من المصادقة بنفسه
   * عن طريق requireAuth() أو آلية الحماية الخاصة به.
   *
   * هذا مهم جدًا حتى لا يتحول طلب API غير مصادق
   * إلى صفحة HTML /login.
   */
  if (isApiRoute) {
    return response
  }

  /*
   * ---------------------------------------------------------
   * الصفحات العامة
   * ---------------------------------------------------------
   */
  if (isPublicRoute) {
    return response
  }

  /*
   * ---------------------------------------------------------
   * حماية صفحات النظام
   * ---------------------------------------------------------
   */
  if (!user) {
    return NextResponse.redirect(
      new URL('/login', request.url),
    )
  }

  /*
   * مهم:
   *
   * لا نعيد المستخدم من /login إلى /
   * حتى لا ندخل في redirect loop عند انتهاء
   * جلسة Supabase أو أثناء تنظيف جلسة T3LEEM.
   *
   * صفحة تسجيل الدخول تتعامل مع تسجيل الدخول
   * بشكل مستقل.
   */
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}