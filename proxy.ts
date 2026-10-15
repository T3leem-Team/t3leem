import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  const isApiRoute = pathname.startsWith('/api/')

  const isPublicRoute =
    pathname === '/login' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname === '/register' ||
    pathname === '/student-status' ||
    pathname === '/api/auth/login'

  /*
   * لا نتحقق من جلسة Supabase في طلبات API هنا.
   * كل API مسؤول عن التحقق من المصادقة والصلاحيات بنفسه.
   */
  if (isApiRoute) {
    return NextResponse.next()
  }

  /*
   * الصفحات العامة لا تحتاج فحص جلسة هنا.
   * هذا يشمل صفحة تسجيل الدخول.
   */
  if (isPublicRoute) {
    return NextResponse.next()
  }

  /*
   * الصفحات المحمية فقط تصل إلى هذا الجزء.
   */
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
    error,
  } = await supabase.auth.getUser()

  /*
   * إذا لم توجد جلسة صالحة، نعيد المستخدم لتسجيل الدخول.
   * لا نعتمد على وجود الكوكي وحده لإثبات صحة الجلسة.
   */
  if (error || !user) {
    const loginUrl = new URL('/login', request.url)

    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
