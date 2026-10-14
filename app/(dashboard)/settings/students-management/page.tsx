
'use client';

import { useState } from 'react';
import { CalendarDays, ShieldCheck, Users } from 'lucide-react';

export default function StudentsManagementPage() {
  const [allowStudentDeletion, setAllowStudentDeletion] = useState(true);

  return (
    <div dir="rtl" className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">إدارة الطلاب</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          إدارة تواريخ الطلاب والتحكم في صلاحية حذفهم من النظام.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border p-5 space-y-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            <h2 className="font-semibold">تعديل تواريخ الطلاب</h2>
          </div>

          <p className="text-sm text-muted-foreground">
            تعديل تاريخ انضمام الطالب وتاريخ التحاقه بالمعلم وحفظ التغييرات
            مباشرة في قاعدة البيانات.
          </p>

          <p className="text-sm">
            سيتم تفعيل التعديل بعد ربط الصفحة بجدول الطلاب وأسماء أعمدته
            الفعلية في Supabase.
          </p>
        </section>

        <section className="rounded-xl border p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            <h2 className="font-semibold">التحكم في حذف الطلاب</h2>
          </div>

          <p className="text-sm text-muted-foreground">
            تحديد ما إذا كان مسموحًا بحذف الطلاب من صفحة الطلاب.
          </p>

          <label className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium">
              السماح بحذف الطلاب
            </span>

            <button
              type="button"
              role="switch"
              aria-checked={allowStudentDeletion}
              onClick={() =>
                setAllowStudentDeletion((current) => !current)
              }
              className={`relative h-6 w-11 rounded-full transition-colors ${
                allowStudentDeletion
                  ? 'bg-primary'
                  : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  allowStudentDeletion
                    ? 'translate-x-0.5'
                    : '-translate-x-5'
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

      <section className="rounded-xl border p-5">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h2 className="font-semibold">قائمة الطلاب</h2>
        </div>

        <p className="mt-2 text-sm text-muted-foreground">
          ستظهر هنا قائمة الطلاب مع إمكانية تعديل التواريخ وحفظها.
        </p>
      </section>
    </div>
  );
}
