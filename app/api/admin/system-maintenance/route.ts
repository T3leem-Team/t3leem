import { NextResponse } from 'next/server'
import { validateCurrentAccess } from '@/lib/auth-guard'
import {
  isMaintenanceMode,
  setMaintenanceMode,
} from '@/lib/system-control'

export const dynamic = 'force-dynamic'

async function authorizePrimaryAdmin() {
  const access = await validateCurrentAccess()

  if (!access.allowed) {
    return {
      allowed: false,
      response: NextResponse.json(
        {
          error: 'انتهت صلاحية الوصول أو تعذر التحقق منها.',
        },
        { status: 401 },
      ),
    }
  }

  if (
    access.username !== 'admin' ||
    access.role !== 'Admin'
  ) {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: 'غير مصرح لك بتنفيذ هذا الإجراء.' },
        { status: 403 },
      ),
    }
  }

  return {
    allowed: true,
    response: null,
  }
}

export async function GET() {
  try {
    const authorization = await authorizePrimaryAdmin()

    if (!authorization.allowed) {
      return authorization.response
    }

    const maintenance = await isMaintenanceMode()

    return NextResponse.json({
      success: true,
      maintenance,
    })
  } catch (error) {
    console.error('Read maintenance status error:', error)

    return NextResponse.json(
      { error: 'تعذر قراءة حالة الصيانة.' },
      { status: 503 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const authorization = await authorizePrimaryAdmin()

    if (!authorization.allowed) {
      return authorization.response
    }

    const body = await request.json()

    if (typeof body.enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'قيمة حالة الصيانة غير صحيحة.' },
        { status: 400 },
      )
    }

    await setMaintenanceMode(body.enabled)

    return NextResponse.json({
      success: true,
      maintenance: body.enabled,
      message: body.enabled
        ? 'تم تفعيل وضع الصيانة.'
        : 'تم إيقاف وضع الصيانة.',
    })
  } catch (error) {
    console.error('Update maintenance status error:', error)

    return NextResponse.json(
      { error: 'تعذر تغيير حالة الصيانة.' },
      { status: 503 },
    )
  }
}
