import 'server-only'

import { createClient } from '@supabase/supabase-js'

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

export async function loadStudentPaymentHistory(
  studentId: string,
  academicYearId: string,
) {
  return await supabaseAdmin
    .from('payments')
    .select(`
      id,
      student_id,
      academic_year_id,
      amount,
      payment_method,
      payment_date,
      reference_number,
      notes,
      created_at
    `)
    .eq('student_id', studentId)
    .eq('academic_year_id', academicYearId)
    .order('payment_date', {
      ascending: false,
    })
    .order('created_at', {
      ascending: false,
    })
}
