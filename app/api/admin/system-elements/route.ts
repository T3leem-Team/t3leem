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

/*
 * --------------------------------------------------
 * اسم المستخدم الذي يعتبر Admin الأساسي
 * --------------------------------------------------
 */
const PRIMARY_ADMIN_USERNAME = 'admin'

/*
 * --------------------------------------------------
 * التحقق من Admin الأساسي فقط
 * --------------------------------------------------
 */
async function requirePrimaryAdmin() {
  const { access, response } =
    await requireAuth()

  if (response) {
    return {
      error: response,
    }
  }

  if (!access?.userId) {
    return {
      error: NextResponse.json(
        {
          error:
            'غير مصرح بالوصول.',
        },
        { status: 401 },
      ),
    }
  }

  const {
    data: profile,
    error,
  } =
    await supabaseAdmin
      .from('user_profiles')
      .select(
        `
        id,
        auth_user_id,
        username,
        full_name,
        role,
        is_active
        `,
      )
      .eq(
        'auth_user_id',
        access.userId,
      )
      .maybeSingle()

  if (error) {
    console.error(
      'System elements profile lookup error:',
      error,
    )

    return {
      error: NextResponse.json(
        {
          error:
            'تعذر التحقق من المستخدم الحالي.',
        },
        { status: 500 },
      ),
    }
  }

  if (
    !profile ||
    !profile.is_active
  ) {
    return {
      error: NextResponse.json(
        {
          error:
            'حساب المستخدم غير نشط.',
        },
        { status: 403 },
      ),
    }
  }

  /*
   * مهم جدًا:
   *
   * لا يكفي أن يكون المستخدم Admin.
   * يجب أن يكون هو Admin الأساسي.
   */
  if (
    profile.role !== 'Admin' ||
    profile.username !==
      PRIMARY_ADMIN_USERNAME
  ) {
    return {
      error: NextResponse.json(
        {
          error:
            'هذا القسم متاح لمدير النظام الأساسي فقط.',
        },
        { status: 403 },
      ),
    }
  }

  return {
    profile,
    access,
  }
}

/*
 * --------------------------------------------------
 * GET
 *
 * تحميل:
 * - عناصر النظام
 * - المستخدمين
 * - الصلاحيات الحالية لكل عنصر
 * --------------------------------------------------
 */
export async function GET() {
  try {
    const { error } =
      await requirePrimaryAdmin()

    if (error) {
      return error
    }

    /*
     * --------------------------------------------------
     * تحميل عناصر النظام
     * --------------------------------------------------
     */
    const {
      data: elements,
      error: elementsError,
    } =
      await supabaseAdmin
        .from('system_elements')
        .select(
          `
          id,
          element_key,
          element_name,
          description,
          section_name,
          is_active,
          created_at,
          updated_at
          `,
        )
        .order(
          'section_name',
          {
            ascending: true,
          },
        )
        .order(
          'element_name',
          {
            ascending: true,
          },
        )

    if (elementsError) {
      console.error(
        'System elements lookup error:',
        elementsError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر تحميل عناصر النظام.',
        },
        { status: 500 },
      )
    }

    /*
     * --------------------------------------------------
     * تحميل المستخدمين
     *
     * نعرض فقط المستخدمين النشطين
     * من الأدوار التي يمكن التحكم بها.
     * --------------------------------------------------
     */
    const {
      data: users,
      error: usersError,
    } =
      await supabaseAdmin
        .from('user_profiles')
        .select(
          `
          id,
          username,
          full_name,
          role,
          department,
          is_active
          `,
        )
        .eq(
          'is_active',
          true,
        )
        .order(
          'role',
          {
            ascending: true,
          },
        )
        .order(
          'full_name',
          {
            ascending: true,
          },
        )

    if (usersError) {
      console.error(
        'System elements users lookup error:',
        usersError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر تحميل المستخدمين.',
        },
        { status: 500 },
      )
    }

    /*
     * --------------------------------------------------
     * تحميل ربط العناصر بالمستخدمين
     * --------------------------------------------------
     */
    const {
      data: assignments,
      error: assignmentsError,
    } =
      await supabaseAdmin
        .from(
          'system_element_users',
        )
        .select(
          `
          id,
          element_id,
          user_profile_id,
          created_at
          `,
        )

    if (assignmentsError) {
      console.error(
        'System elements assignments lookup error:',
        assignmentsError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر تحميل صلاحيات عناصر النظام.',
        },
        { status: 500 },
      )
    }

    /*
     * --------------------------------------------------
     * تجهيز البيانات
     * --------------------------------------------------
     */
    const elementsWithUsers =
      (elements ?? []).map(
        (element) => {
          const elementAssignments =
            (
              assignments ?? []
            ).filter(
              (item) =>
                item.element_id ===
                element.id,
            )

          const userIds =
            Array.from(
              new Set(
                elementAssignments.map(
                  (item) =>
                    item.user_profile_id,
                ),
              ),
            )

          return {
            ...element,
            userIds,
          }
        },
      )

    return NextResponse.json(
      {
        elements:
          elementsWithUsers,

        users:
          users ?? [],

        assignments:
          assignments ?? [],
      },
      {
        headers: {
          'Cache-Control':
            'no-store, no-cache, must-revalidate',
        },
      },
    )
  } catch (error) {
    console.error(
      'System elements GET error:',
      error,
    )

    return NextResponse.json(
      {
        error:
          'حدث خطأ أثناء تحميل عناصر النظام.',
      },
      { status: 500 },
    )
  }
}

/*
 * --------------------------------------------------
 * POST
 *
 * إضافة مستخدم إلى عنصر
 * --------------------------------------------------
 *
 * body:
 *
 * {
 *   elementId: "...",
 *   userProfileId: "..."
 * }
 * --------------------------------------------------
 */
export async function POST(
  request: Request,
) {
  try {
    const { error } =
      await requirePrimaryAdmin()

    if (error) {
      return error
    }

    const body =
      await request.json()

    const elementId =
      typeof body.elementId ===
      'string'
        ? body.elementId
        : ''

    const userProfileId =
      typeof body.userProfileId ===
      'string'
        ? body.userProfileId
        : ''

    if (
      !elementId ||
      !userProfileId
    ) {
      return NextResponse.json(
        {
          error:
            'معرف العنصر ومعرف المستخدم مطلوبان.',
        },
        { status: 400 },
      )
    }

    /*
     * --------------------------------------------------
     * التحقق من العنصر
     * --------------------------------------------------
     */
    const {
      data: element,
      error: elementError,
    } =
      await supabaseAdmin
        .from('system_elements')
        .select(
          'id, element_key, is_active',
        )
        .eq(
          'id',
          elementId,
        )
        .maybeSingle()

    if (elementError) {
      console.error(
        'System element lookup error:',
        elementError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر التحقق من عنصر النظام.',
        },
        { status: 500 },
      )
    }

    if (!element) {
      return NextResponse.json(
        {
          error:
            'عنصر النظام غير موجود.',
        },
        { status: 404 },
      )
    }

    if (!element.is_active) {
      return NextResponse.json(
        {
          error:
            'عنصر النظام غير نشط.',
        },
        { status: 400 },
      )
    }

    /*
     * --------------------------------------------------
     * التحقق من المستخدم
     * --------------------------------------------------
     */
    const {
      data: user,
      error: userError,
    } =
      await supabaseAdmin
        .from('user_profiles')
        .select(
          `
          id,
          username,
          full_name,
          role,
          is_active
          `,
        )
        .eq(
          'id',
          userProfileId,
        )
        .maybeSingle()

    if (userError) {
      console.error(
        'System element target user lookup error:',
        userError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر التحقق من المستخدم.',
        },
        { status: 500 },
      )
    }

    if (!user) {
      return NextResponse.json(
        {
          error:
            'المستخدم غير موجود.',
        },
        { status: 404 },
      )
    }

    if (!user.is_active) {
      return NextResponse.json(
        {
          error:
            'لا يمكن منح العنصر لمستخدم غير نشط.',
        },
        { status: 400 },
      )
    }

    /*
     * --------------------------------------------------
     * منع إعطاء التحكم لـ Admin الأساسي
     *
     * Admin الأساسي عنده التحكم أصلًا.
     * --------------------------------------------------
     */
    if (
      user.username ===
      PRIMARY_ADMIN_USERNAME
    ) {
      return NextResponse.json(
        {
          error:
            'مدير النظام الأساسي لديه صلاحية هذه العناصر تلقائيًا.',
        },
        { status: 400 },
      )
    }

    /*
     * --------------------------------------------------
     * إضافة الربط
     *
     * on conflict لا يحدث خطأ إذا كان موجودًا.
     * --------------------------------------------------
     */
    const {
      data: assignment,
      error: assignmentError,
    } =
      await supabaseAdmin
        .from(
          'system_element_users',
        )
        .upsert(
          {
            element_id:
              elementId,

            user_profile_id:
              userProfileId,
          },
          {
            onConflict:
              'element_id,user_profile_id',
          },
        )
        .select(
          `
          id,
          element_id,
          user_profile_id,
          created_at
          `,
        )
        .single()

    if (assignmentError) {
      console.error(
        'System element assignment insert error:',
        assignmentError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر حفظ صلاحية العنصر.',
        },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        success: true,
        assignment,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error(
      'System elements POST error:',
      error,
    )

    return NextResponse.json(
      {
        error:
          'حدث خطأ أثناء حفظ صلاحية العنصر.',
      },
      { status: 500 },
    )
  }
}

/*
 * --------------------------------------------------
 * DELETE
 *
 * إزالة مستخدم من عنصر
 * --------------------------------------------------
 *
 * body:
 *
 * {
 *   elementId: "...",
 *   userProfileId: "..."
 * }
 * --------------------------------------------------
 */
export async function DELETE(
  request: Request,
) {
  try {
    const { error } =
      await requirePrimaryAdmin()

    if (error) {
      return error
    }

    const body =
      await request.json()

    const elementId =
      typeof body.elementId ===
      'string'
        ? body.elementId
        : ''

    const userProfileId =
      typeof body.userProfileId ===
      'string'
        ? body.userProfileId
        : ''

    if (
      !elementId ||
      !userProfileId
    ) {
      return NextResponse.json(
        {
          error:
            'معرف العنصر ومعرف المستخدم مطلوبان.',
        },
        { status: 400 },
      )
    }

    /*
     * --------------------------------------------------
     * منع إزالة صلاحية Admin الأساسي
     * --------------------------------------------------
     */
    const {
      data: targetUser,
      error: targetUserError,
    } =
      await supabaseAdmin
        .from('user_profiles')
        .select(
          'id, username',
        )
        .eq(
          'id',
          userProfileId,
        )
        .maybeSingle()

    if (targetUserError) {
      console.error(
        'System element delete user lookup error:',
        targetUserError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر التحقق من المستخدم.',
        },
        { status: 500 },
      )
    }

    if (
      targetUser?.username ===
      PRIMARY_ADMIN_USERNAME
    ) {
      return NextResponse.json(
        {
          error:
            'لا يمكن إزالة صلاحيات مدير النظام الأساسي.',
        },
        { status: 400 },
      )
    }

    /*
     * --------------------------------------------------
     * حذف الربط
     * --------------------------------------------------
     */
    const {
      error: deleteError,
    } =
      await supabaseAdmin
        .from(
          'system_element_users',
        )
        .delete()
        .eq(
          'element_id',
          elementId,
        )
        .eq(
          'user_profile_id',
          userProfileId,
        )

    if (deleteError) {
      console.error(
        'System element assignment delete error:',
        deleteError,
      )

      return NextResponse.json(
        {
          error:
            'تعذر إزالة صلاحية العنصر.',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error(
      'System elements DELETE error:',
      error,
    )

    return NextResponse.json(
      {
        error:
          'حدث خطأ أثناء إزالة صلاحية العنصر.',
      },
      { status: 500 },
    )
  }
}
