
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CalendarDays,
  ShieldCheck,
  Users,
} from 'lucide-react';

export default function StudentsManagementPage() {
  const router = useRouter();
  const [allowStudentDeletion, setAllowStudentDeletion] = useState(true);

  return (
    <div dir="rtl" className="space-y-6 p-6">
      {/* العنوان وزر العودة */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة الطلاب</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            إدارة تواريخ الطلاب والتحكم في صلاحية حذفهم من النظام.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push('/settings')}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
        >
          <ArrowRight className="h-4 w-4" />
          عودة
        </button>
      </div>

      {/* تعديل تواريخ الطلاب */}
      <div className="grid gap-4 md:grid-cols-2">
        <section className="space-y-3 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">تعديل تواريخ الطلاب</h2>
          </div>

          <p className="text-sm text-muted-foreground">
            تعديل تاريخ انضمام الطالب وتاريخ التحاقه بالمعلم
            وحفظ التغييرات مباشرة في قاعدة البيانات.
          </p>

          <p className="text-sm text-muted-foreground">
            سيتم تفعيل التعديل بعد ربط الصفحة بجدول الطلاب
            وأسماء الأعمدة الفعلية في Supabase.
          </p>
        </section>

        {/* التحكم في حذف الطلاب */}
        <section className="space-y-4 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">التحكم في حذف الطلاب</h2>
          </div>

          <p className="text-sm text-muted-foreground">
            تحديد ما إذا كان مسموحًا بحذف الطلاب من صفحة الطلاب.
          </p>

          <label className="flex cursor-pointer items-center justify-between gap-4">
            <span className="text-sm font-medium">
              السماح بحذف الطلاب
            </span>

            <button
              type="button"
              role="switch"
              aria-checked={allowStudentDeletion}
              aria-label="السماح بحذف الطلاب"
              onClick={() =>
                setAllowStudentDeletion((current) => !current)
              }
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                allowStudentDeletion
                  ? 'bg-primary'
                  : 'bg-muted'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  allowStudentDeletion
                    ? 'left-0.5'
                    : 'left-5'
                }`}
              />
            </button>
          </label>

          <p className="text-xs text-muted-foreground">
            {allowStudentDeletion
              ? 'الحذف مفعّل في الواجهة التجريبية.'
              : 'الحذف معطّل في الواجهة التجريبية.'}
          </p>
        </section>
      </div>

      {/* قائمة الطلاب */}
      <section className="space-y-3 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">قائمة الطلاب</h2>
        </div>

        <p className="text-sm text-muted-foreground">
          ستظهر هنا قائمة الطلاب مع إمكانية تعديل تواريخهم وحفظها.
        </p>
      </section>
    </div>
  );
}
