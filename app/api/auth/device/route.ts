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
          deviceStatus: 'unauthenticated',
        },
        { status: 401 },
      )
    }

    return NextResponse.json({
      authenticated: true,
      deviceStatus: 'unknown',
      userId: user.id,
    })
  } catch (error) {
    console.error(
      'Device check error:',
      error,
    )

    return NextResponse.json(
      {
        error:
          'حدث خطأ أثناء فحص الجهاز.',
      },
      { status: 500 },
    )
  }
}
