import { createClient } from '@supabase/supabase-js'
import { timingSafeEqual } from 'node:crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ADMIN_ID = 'ea99d0b6-ef2c-4131-8c1b-7d1b5a089b83'

function page(message = '') {
  return new Response(
    `<!doctype html>
    <html lang="ar" dir="rtl">
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>استعادة الأدمن</title>
      <body style="font-family:Arial;max-width:440px;margin:50px auto;padding:20px">
        <h2>تغيير كلمة مرور الأدمن</h2>
        ${message ? `<p>${message}</p>` : ''}
        <form method="POST">
          <label>السر المؤقت</label>
          <input name="secret" type="password" required
            autocomplete="off" style="display:block;width:95%;padding:10px;margin:8px 0 18px">
          <label>كلمة المرور الجديدة</label>
          <input name="password" type="password" required
            minlength="12" autocomplete="new-password"
            style="display:block;width:95%;padding:10px;margin:8px 0 18px">
          <button type="submit" style="padding:12px 20px">تغيير كلمة المرور</button>
        </form>
      </body>
    </html>`,
    {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    }
  )
}

export async function GET() {
  return page()
}

export async function POST(request: Request) {
  try {
    const form = await request.formData()
    const secret = String(form.get('secret') ?? '')
    const password = String(form.get('password') ?? '')
    const expected = process.env.ADMIN_RECOVERY_SECRET ?? ''

    if (!expected || secret.length !== expected.length ||
        !timingSafeEqual(Buffer.from(secret), Buffer.from(expected))) {
      return page('السر غير صحيح. لم يتم تغيير أي شيء.')
    }

    if (password.length < 12 || password.length > 128) {
      return page('كلمة المرور يجب أن تكون بين 12 و128 حرفًا.')
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceKey) {
      return page('إعدادات الخادم غير مكتملة. لم يتم تغيير كلمة المرور.')
    }

    const supabaseAdmin = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      ADMIN_ID,
      { password }
    )

    if (error) {
      return page('لم ينجح تغيير كلمة المرور. لم نتمكن من إكمال العملية.')
    }

    return page(
      'تم تغيير كلمة المرور بنجاح. سجّل الدخول إلى T3LEEM بكلمة المرور الجديدة.'
    )
  } catch {
    return page('حدث خطأ أثناء تنفيذ العملية. لم نتمكن من تأكيد نجاحها.')
  }
}
