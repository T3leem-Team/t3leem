import AttendanceAwardsCalculator from './attendance-awards-calculator'

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          الإجراءات الإدارية الخاصة
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          إدارة الإجراءات الحساسة الخاصة بالنظام.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border p-5">
          <h2 className="text-lg font-semibold">
            التكريم
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            حساب وعرض بيانات التكريم بناءً على الحضور.
          </p>

          <div className="mt-5">
            <AttendanceAwardsCalculator />
          </div>
        </div>

        <div className="rounded-xl border p-5">
          <h2 className="text-lg font-semibold">
            الأرشفة
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            تفعيل أرشفة السنة الدراسية وحفظ بياناتها للقراءة والمراجعة.
          </p>

          <button
            type="button"
            className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            تفعيل الأرشيف
          </button>
        </div>
      </div>
    </div>
  )
}