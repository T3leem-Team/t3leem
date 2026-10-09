
import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/authorization'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: Request) {
  const authorization = await requirePermission('archive.manage')

  if (authorization.error) {
    return authorization.error
  }

  if (!authorization.access) {
    return NextResponse.json(
      { error: 'تعذر التحقق من الصلاحيات حالياً.' },
      { status: 503 },
    )
  }

  let body: { yearId?: unknown }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'بيانات الطلب غير صحيحة.' },
      { status: 400 },
    )
  }

  const yearId = body.yearId

  if (typeof yearId !== 'string' || !yearId.trim()) {
    return NextResponse.json(
      { error: 'معرّف السنة الدراسية غير صحيح.' },
      { status: 400 },
    )
  }

  const { data: year, error: yearError } = await supabaseAdmin
    .from('academic_years')
    .select('id, name, is_current, is_active')
    .eq('id', yearId)
    .maybeSingle()

  if (yearError) {
    console.error('Archive year lookup failed:', yearError)

    return NextResponse.json(
      { error: 'تعذر التحقق من السنة الدراسية.' },
      { status: 500 },
    )
  }

  if (!year || !year.is_active) {
    return NextResponse.json(
      { error: 'السنة الدراسية غير موجودة أو مؤرشفة مسبقاً.' },
      { status: 404 },
    )
  }

  if (year.is_current) {
    return NextResponse.json(
      { error: 'لا يمكن أرشفة السنة الدراسية الحالية.' },
      { status: 400 },
    )
  }

  const { data: archivedYear, error: archiveError } = await supabaseAdmin
    .from('academic_years')
    .update({ is_active: false, is_current: false })
    .eq('id', year.id)
    .eq('is_active', true)
    .eq('is_current', false)
    .select('id')
    .maybeSingle()

  if (archiveError) {
    console.error('Archive year update failed:', archiveError)

    return NextResponse.json(
      { error: 'تعذرت أرشفة السنة الدراسية.' },
      { status: 500 },
    )
  }

  if (!archivedYear) {
    return NextResponse.json(
      { error: 'لم تتم الأرشفة. حدّث الصفحة وحاول مرة أخرى.' },
      { status: 409 },
    )
  }

  return NextResponse.json({
    success: true,
    message: 'تمت أرشفة السنة الدراسية بنجاح.',
  })
}
