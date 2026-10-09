
import { NextResponse } from 'next/server'
import { validateCurrentAccess } from '@/lib/auth-guard'

export const dynamic = 'force-dynamic'

const CONFIRMATION_TEXT = 'إيقاف T3LEEM'

export async function POST(request: Request) {
  try {
    const access = await validateCurrentAccess()

    if (!access.allowed) {
      return NextResponse.json(
        { error: 'انتهت صلاحية الوصول أو تعذر التحقق منها.' },
        { status: access.reason === 'guard_error' ? 503 : 401 },
      )
    }

    if (
      access.username !== 'admin' ||
      access.role !== 'Admin'
    ) {
      return NextResponse.json(
        { error: 'غير مصرح لك بتنفيذ الإيقاف الكامل.' },
        { status: 403 },
      )
    }

    const origin = request.headers.get('origin')
    const host = request.headers.get('host')

    if (!origin || !host) {
      return NextResponse.json(
        { error: 'تعذر التحقق من مصدر الطلب.' },
        { status: 403 },
      )
    }

    let originHost: string

    try {
      originHost = new URL(origin).host
    } catch {
      return NextResponse.json(
        { error: 'مصدر الطلب غير صالح.' },
        { status: 403 },
      )
    }

    if (originHost !== host) {
      return NextResponse.json(
        { error: 'مصدر الطلب غير مسموح.' },
        { status: 403 },
      )
    }

    const body = await request.json().catch(() => null)

    if (body?.confirm !== CONFIRMATION_TEXT) {
      return NextResponse.json(
        { error: 'تأكيد الإيقاف غير صحيح.' },
        { status: 400 },
      )
    }

    const token = process.env.VERCEL_ACCESS_TOKEN
    const projectId = process.env.VERCEL_PROJECT_ID
    const teamId = process.env.VERCEL_TEAM_ID

    if (!token || !projectId || !teamId) {
      return NextResponse.json(
        { error: 'إعدادات الإيقاف غير مكتملة.' },
        { status: 503 },
      )
    }

    // الاختبار الآمن: لا يرسل أي طلب إلى Vercel.
    if (body?.dryRun === true) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        message: 'نجح فحص الصلاحيات والتأكيد والإعدادات. لم يتم إيقاف المشروع.',
      })
    }

    const url = new URL(
      `https://api.vercel.com/v1/projects/${encodeURIComponent(projectId)}/pause`,
    )

    url.searchParams.set('teamId', teamId)
    url.searchParams.set('slug', 't3leem')

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      const details = await response.text()
      console.error(
        'Vercel pause request failed:',
        response.status,
        details,
      )

      return NextResponse.json(
        { error: 'رفضت Vercel طلب إيقاف المشروع أو تعذر تنفيذه.' },
        { status: 502 },
      )
    }

    return NextResponse.json({
      success: true,
      message: 'قبلت Vercel طلب إيقاف المشروع.',
    })
  } catch (error) {
    console.error('System shutdown error:', error)

    return NextResponse.json(
      { error: 'حدث خطأ أثناء طلب إيقاف المشروع.' },
      { status: 500 },
    )
  }
}
