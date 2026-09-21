import { NextResponse } from ‘next/server’

import { requireAuth } from ‘@/lib/require-auth’
import { createSupabaseServerClient } from ‘@/lib/supabase-server’

export async function GET() {
const { access, response } = await requireAuth()

if (response) {
return response
}

if (!access) {
return NextResponse.json(
{
error: ‘غير مصرح بالوصول’,
},
{ status: 401 },
)
}

const supabase = await createSupabaseServerClient()

const { data: profile, error: profileError } = await supabase
.from(‘user_profiles’)
.select(‘id, role, is_active’)
.eq(‘auth_user_id’, access.userId)
.maybeSingle()

if (profileError) {
console.error(‘dashboard-sections profile error:’, profileError)

return NextResponse.json(
  {
    error: 'تعذر تحميل بيانات المستخدم',
  },
  { status: 500 },
)

}

if (!profile || !profile.is_active) {
return NextResponse.json(
{
error: ‘الحساب غير نشط’,
},
{ status: 403 },
)
}

const { data, error } = await supabase
.from(‘user_dashboard_sections’)
.select(section_id, dashboard_sections ( id, section_key, section_name, description, icon, href, sort_order, is_active ))
.eq(‘user_profile_id’, profile.id)

if (error) {
console.error(‘dashboard-sections query error:’, error)

return NextResponse.json(
  {
    error: 'تعذر تحميل صلاحيات أقسام النظام',
  },
  { status: 500 },
)

}

const sections = (data ?? [])
.map((item) => {
const section = Array.isArray(item.dashboard_sections)
? item.dashboard_sections[0]
: item.dashboard_sections

  if (!section || !section.is_active) {
    return null
  }
  return section
})
.filter(Boolean)
.sort((a, b) => a.sort_order - b.sort_order)

return NextResponse.json(
{
sections,
},
{
status: 200,
headers: {
‘Cache-Control’: ‘no-store’,
},
},
)
}
