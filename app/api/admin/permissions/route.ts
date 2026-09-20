import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/require-auth'

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

async function requireAdmin() {
  const { access, response } =
    await requireAuth()

  if (response) {
    return {
      error: response,
    }
  }

  const { data: profile, error } =
    await supabaseAdmin
      .from('user_profiles')
      .select(
        'id, auth_user_id, role, is_active',
      )
      .eq(
        'auth_user_id',
        access!.userId,
      )
      .maybeSingle()

  if (error) {
    console.error(
      'Admin permission profile lookup error:',
      error,
    )

    return {
      error: NextResponse.json(
        {
          error:
            'تعذر التحقق من صلاحيات المستخدم.',
        },
        { status: 500 },
      ),
    }
  }

  if (
    !profile ||
    profile.role !== 'Admin' ||
    !profile.is_active
  ) {
    return {
      error: NextResponse.json(
        {
          error:
            'ليس لديك صلاحية إدارة المستخدمين والصلاحيات.',
        },
        { status: 403 },
      ),
    }
  }

  return {
    profile,
  }
}

/*
 * GET
 * تحميل جميع الصلاحيات
 */
export async function GET() {
  try {
    const { error } =
      await requireAdmin()

    if (error) {
      return error
    }

    const {
      data: permissions,
      error: permissionsError,
    } =
      await supabaseAdmin
        .from('permissions')
        .select(
          `
          id,
          permission_key,
          permission_name,
          description,
          created_at
          `,
        )
        .order(
          'permission_name',
          {
            ascending: true,
          },
        )

    if (permissionsError) {
      console.error(
        'Permissions lookup error:',
        permissionsError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر تحميل الصلاحيات.',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      permissions:
        permissions ?? [],
    })
  } catch (error) {
    console.error(
      'Permissions GET error:',
      error,
    )

    return NextResponse.json(
      {
        error:
          'حدث خطأ أثناء تحميل الصلاحيات.',
      },
      { status: 500 },
    )
  }
}
