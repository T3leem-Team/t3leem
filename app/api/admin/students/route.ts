
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requirePermission } from '@/lib/auth/authorization';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

const DELETE_SETTING_PERMISSION = 'students.delete_setting.manage';

async function authorizeStudentDeletionSettings() {
  const result = await requirePermission(DELETE_SETTING_PERMISSION);

  if (result.error || !result.access) {
    return {
      allowed: false as const,
      response:
        result.error ??
        NextResponse.json(
          { error: 'ليس لديك صلاحية لإدارة إعداد حذف الطلاب.' },
          { status: 403 },
        ),
    };
  }

  return { allowed: true as const };
}

export async function GET() {
  const authorization = await authorizeStudentDeletionSettings();

  if (!authorization.allowed) {
    return authorization.response;
  }

  const { data, error } = await supabaseAdmin
    .from('student_deletion_settings')
    .select('deletion_enabled, updated_at')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    console.error('Read student deletion settings:', error);
    return NextResponse.json(
      { error: 'تعذر قراءة إعداد حذف الطلاب.' },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: 'إعداد حذف الطلاب غير موجود.' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    deletionEnabled: data.deletion_enabled,
    updatedAt: data.updated_at,
  });
}

export async function PATCH(request: Request) {
  const authorization = await authorizeStudentDeletionSettings();

  if (!authorization.allowed) {
    return authorization.response;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'البيانات المرسلة غير صالحة.' },
      { status: 400 },
    );
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !('deletionEnabled' in body) ||
    typeof body.deletionEnabled !== 'boolean'
  ) {
    return NextResponse.json(
      { error: 'يجب تحديد قيمة صحيحة للسماح بحذف الطلاب.' },
      { status: 400 },
    );
  }

  const { data, error } = await supabaseAdmin
    .from('student_deletion_settings')
    .update({
      deletion_enabled: body.deletionEnabled,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)
    .select('deletion_enabled, updated_at')
    .maybeSingle();

  if (error) {
    console.error('Update student deletion settings:', error);
    return NextResponse.json(
      { error: 'تعذر حفظ إعداد حذف الطلاب.' },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: 'إعداد حذف الطلاب غير موجود.' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    deletionEnabled: data.deletion_enabled,
    updatedAt: data.updated_at,
  });
}
