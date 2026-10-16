
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { validateCurrentAccess } from '@/lib/auth-guard'
import { isMaintenanceMode } from '@/lib/system-control'

const SESSION_COOKIE = 't3leem_session_id'

export async function requireAuth() {
  const startedAt = performance.now()

  const markTiming = (
    step: string,
    stepStartedAt: number,
  ) => {
    console.info(
      `[REQUIRE AUTH TIMING] ${step}: ${
        Math.round(performance.now() - stepStartedAt)
      }ms (total: ${
        Math.round(performance.now() - startedAt)
      }ms)`,
    )
  }

  // 1. التحقق من صلاحية الوصول والجلسة
  const accessStartedAt = performance.now()
  const access = await validateCurrentAccess()

  markTiming('validateCurrentAccess', accessStartedAt)

  if (!access.allowed) {
    if (access.reason === 'guard_error') {
      return {
        access: null,
        response: NextResponse.json(
          {
            authenticated: false,
            error: 'تعذر التحقق من الجلسة حالياً.',
            reason: 'guard_error',
          },
          { status: 503 },
        ),
      }
    }

    try {
      const supabase = await createSupabaseServerClient()
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Auth cleanup error:', error)
    }

    const response = NextResponse.json(
      {
        authenticated: false,
        error: 'انتهت صلاحية الوصول إلى النظام.',
        reason: access.reason,
      },
      { status: 401 },
    )

    response.cookies.set(SESSION_COOKIE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })

    return {
      access: null,
      response,
    }
  }

  // 2. فحص الصيانة المركزي
  try {
    const maintenanceStartedAt = performance.now()
    const maintenanceMode = await isMaintenanceMode()

    markTiming('isMaintenanceMode', maintenanceStartedAt)

    // المدير الأساسي مستثنى من وضع الصيانة
    const isPrimaryAdmin =
      access.username === 'admin' &&
      access.role === 'Admin'

    if (maintenanceMode && !isPrimaryAdmin) {
      return {
        access: null,
        response: NextResponse.json(
          {
            authenticated: false,
            maintenance: true,
            error: 'النظام تحت الصيانة حاليًا.',
          },
          { status: 503 },
        ),
      }
    }
  } catch (error) {
    console.error('Maintenance check error:', error)

    return {
      access: null,
      response: NextResponse.json(
        {
          authenticated: false,
          error: 'تعذر التحقق من حالة النظام حالياً.',
        },
        { status: 503 },
      ),
    }
  }

  markTiming('complete', startedAt)

  return {
    access,
    response: null,
  }
}
