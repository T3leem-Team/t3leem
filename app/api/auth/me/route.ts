import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase =
      await createSupabaseServerClient()

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json(
        {
          authenticated: false,
        },
        { status: 401 },
      )
    }

    return NextResponse.json({
      authenticated: true,
      userId: user.id,
    })
  } catch (error) {
    console.error(
      'Auth me error:',
      error,
    )

    return NextResponse.json(
      {
        error:
          'حدث خطأ أثناء التحقق من الجلسة.',
      },
      { status: 500 },
    )
  }
}
