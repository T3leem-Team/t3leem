import { supabase } from '@/lib/supabase'

export default async function SupabaseTestPage() {
  const { data, error } = await supabase
    .from('academic_years')
    .select('id, name')
    .limit(5)

  return (
    <div className="p-8" dir="rtl">
      <h1 className="mb-4 text-2xl font-bold">اختبار Supabase</h1>

      {error ? (
        <pre className="text-red-600">{error.message}</pre>
      ) : (
        <pre>{JSON.stringify(data, null, 2)}</pre>
      )}
    </div>
  )
}
