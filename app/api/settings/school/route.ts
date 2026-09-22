import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL!

const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY!

async function getAuthenticatedUser() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {
          // لا نحتاج تعديل الكوكيز هنا
        },
      },
    },
  )

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
}

function getAdminClient() {
  return createClient(
    supabaseUrl,
    supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}

export async function GET() {
  try {
    const user =
      await getAuthenticatedUser()

    if (!user) {
      return NextResponse.json(
        {
          error:
            'غير مصرح بالوصول',
        },
        {
          status: 401,
        },
      )
    }

    const supabase =
      getAdminClient()

    const { data, error } =
      await supabase
        .from('school_settings')
        .select(
          'id, school_name, school_subtitle, updated_at',
        )
        .eq('id', 1)
        .maybeSingle()

    if (error) {
      console.error(
        'Get school settings error:',
        error,
      )

      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        },
        {
          status: 500,
        },
      )
    }

    if (!data) {
      const {
        data: created,
        error: insertError,
      } = await supabase
        .from('school_settings')
        .insert({
          id: 1,
          school_name: 'تعليم',
          school_subtitle:
            'نظام إدارة المدارس',
        })
        .select(
          'id, school_name, school_subtitle, updated_at',
        )
        .single()

      if (insertError) {
        console.error(
          'Create school settings error:',
          insertError,
        )

        return NextResponse.json(
          {
            error:
              insertError.message,
            code:
              insertError.code,
            details:
              insertError.details,
            hint:
              insertError.hint,
          },
          {
            status: 500,
          },
        )
      }

      return NextResponse.json({
        settings: created,
      })
    }

    return NextResponse.json({
      settings: data,
    })
  } catch (error) {
    console.error(
      'School settings GET error:',
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'حدث خطأ غير متوقع',
      },
      {
        status: 500,
      },
    )
  }
}

export async function PUT(
  request: Request,
) {
  try {
    const user =
      await getAuthenticatedUser()

    if (!user) {
      return NextResponse.json(
        {
          error:
            'غير مصرح بالوصول',
        },
        {
          status: 401,
        },
      )
    }

    const body =
      await request.json()

    const schoolName =
      typeof body.school_name ===
      'string'
        ? body.school_name.trim()
        : ''

    const schoolSubtitle =
      typeof body.school_subtitle ===
      'string'
        ? body.school_subtitle.trim()
        : ''

    if (!schoolName) {
      return NextResponse.json(
        {
          error:
            'اسم المدرسة مطلوب.',
        },
        {
          status: 400,
        },
      )
    }

    if (!schoolSubtitle) {
      return NextResponse.json(
        {
          error:
            'اسم النظام مطلوب.',
        },
        {
          status: 400,
        },
      )
    }

    if (schoolName.length > 100) {
      return NextResponse.json(
        {
          error:
            'اسم المدرسة طويل جداً.',
        },
        {
          status: 400,
        },
      )
    }

    if (
      schoolSubtitle.length >
      150
    ) {
      return NextResponse.json(
        {
          error:
            'اسم النظام طويل جداً.',
        },
        {
          status: 400,
        },
      )
    }

    const supabase =
      getAdminClient()

    const { data, error } =
      await supabase
        .from('school_settings')
        .update({
          school_name:
            schoolName,
          school_subtitle:
            schoolSubtitle,
          updated_at:
            new Date().toISOString(),
        })
        .eq('id', 1)
        .select(
          'id, school_name, school_subtitle, updated_at',
        )
        .single()

    if (error) {
      console.error(
        'Update school settings error:',
        error,
      )

      return NextResponse.json(
        {
          error:
            error.message,
          code:
            error.code,
          details:
            error.details,
          hint:
            error.hint,
        },
        {
          status: 500,
        },
      )
    }

    return NextResponse.json({
      success: true,
      settings: data,
    })
  } catch (error) {
    console.error(
      'School settings PUT error:',
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'حدث خطأ غير متوقع',
      },
      {
        status: 500,
      },
    )
  }
}