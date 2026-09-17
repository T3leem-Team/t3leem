export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border bg-background p-6 shadow-sm">
          <h1 className="text-2xl font-bold">
            التسجيل
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            يرجى تعبئة البيانات التالية لتقديم طلب التسجيل.
          </p>

          <div className="mt-8 rounded-xl border border-dashed p-8 text-center">
            <p className="font-medium">
              نموذج التسجيل
            </p>

            <p className="mt-2 text-sm text-muted-foreground">
              سيتم تجهيز حقول التسجيل وإعدادات الدفع هنا.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
