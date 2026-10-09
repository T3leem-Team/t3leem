
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requirePermission } from '@/lib/auth/authorization'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
)

export async function POST(request: Request) {
  const authorization =
    await requirePermission('archive.manage')

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

  if (
    typeof yearId !== 'string' ||
    !yearId.trim()
  ) {
    return NextResponse.json(
      { error: 'معرّف السنة الدراسية غير صحيح.' },
      { status: 400 },
    )
  }

  const { data: year, error: lookupError } =
    await supabaseAdmin
      .from('academic_years')
      .select('id, is_current, is_active')
      .eq('id', yearId)
      .maybeSingle()

  if (lookupError) {
    console.error(
      'Archive year lookup error:',
      lookupError,
    )

    return NextResponse.json(
      { error: 'تعذر التحقق من السنة الدراسية.' },
      { status: 500 },
    )
  }

  if (!year || !year.is_active) {
    return NextResponse.json(
      { error: 'السنة غير موجودة أو مؤرشفة مسبقاً.' },
      { status: 404 },
    )
  }

  if (year.is_current) {
    return NextResponse.json(
      { error: 'لا يمكن أرشفة السنة الدراسية الحالية.' },
      { status: 400 },
    )
  }

  const { data: archivedYear, error: updateError } =
    await supabaseAdmin
      .from('academic_years')
      .update({
        is_active: false,
        is_current: false,
      })
      .eq('id', year.id)
      .eq('is_active', true)
      .eq('is_current', false)
      .select('id')
      .maybeSingle()

  if (updateError) {
    console.error(
      'Archive year update error:',
      updateError,
    )

    return NextResponse.json(
      { error: 'تعذرت أرشفة السنة الدراسية.' },
      { status: 500 },
    )
  }

  if (!archivedYear) {
    return NextResponse.json(
      {
        error:
          'لم تتم الأرشفة. حدّث الصفحة وحاول مرة أخرى.',
      },
      { status: 409 },
    )
  }

  return NextResponse.json({
    success: true,
    message: 'تمت أرشفة السنة الدراسية بنجاح.',
  })
}
