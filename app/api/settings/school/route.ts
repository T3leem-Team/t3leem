import { NextResponse } from 'next/server'

import { requirePermission } from '@/lib/auth/authorization'

import {
  loadSchoolSettings,
  createSchoolSettings,
  updateSchoolSettings,
} from '@/lib/features/settings/repositories/settings-admin.repository'

export async function GET() {
  const authorization =
    await requirePermission('settings.manage')

  if (authorization.error) {
    return authorization.error
  }

  if (!authorization.access) {
    return NextResponse.json(
      {
        error: 'تعذر التحقق من الصلاحيات حالياً.',
      },
      { status: 503 },
    )
  }

  try {
    const {
      data,
      error,
    } = await loadSchoolSettings()

    if (error) {
      console.error(
        'Get school settings error:',
        error,
      )

      return NextResponse.json(
        {
          error: 'تعذر تحميل إعدادات المدرسة.',
        },
        { status: 500 },
      )
    }

    if (!data) {
      const {
        data: created,
        error: insertError,
      } = await createSchoolSettings()

      if (insertError) {
        console.error(
          'Create school settings error:',
          insertError,
        )

        return NextResponse.json(
          {
            error: 'تعذر إنشاء إعدادات المدرسة.',
          },
          { status: 500 },
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
        error: 'حدث خطأ غير متوقع.',
      },
      { status: 500 },
    )
  }
}

export async function PUT(
  request: Request,
) {
  const authorization =
    await requirePermission('settings.manage')

  if (authorization.error) {
    return authorization.error
  }

  if (!authorization.access) {
    return NextResponse.json(
      {
        error: 'تعذر التحقق من الصلاحيات حالياً.',
      },
      { status: 503 },
    )
  }

  try {
    const body = await request.json()

    const schoolName =
      typeof body.school_name === 'string'
        ? body.school_name.trim()
        : ''

    const schoolSubtitle =
      typeof body.school_subtitle === 'string'
        ? body.school_subtitle.trim()
        : ''

    if (!schoolName) {
      return NextResponse.json(
        {
          error: 'اسم المدرسة مطلوب.',
        },
        { status: 400 },
      )
    }

    if (!schoolSubtitle) {
      return NextResponse.json(
        {
          error: 'اسم النظام مطلوب.',
        },
        { status: 400 },
      )
    }

    if (schoolName.length > 100) {
      return NextResponse.json(
        {
          error: 'اسم المدرسة طويل جداً.',
        },
        { status: 400 },
      )
    }

    if (schoolSubtitle.length > 150) {
      return NextResponse.json(
        {
          error: 'اسم النظام طويل جداً.',
        },
        { status: 400 },
      )
    }

    const {
      data,
      error,
    } = await updateSchoolSettings(
      schoolName,
      schoolSubtitle,
      new Date().toISOString(),
    )

    if (error) {
      console.error(
        'Update school settings error:',
        error,
      )

      return NextResponse.json(
        {
          error: 'تعذر تحديث إعدادات المدرسة.',
        },
        { status: 500 },
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
        error: 'حدث خطأ غير متوقع.',
      },
      { status: 500 },
    )
  }
}
