
'use client';

import { useEffect, useState } from 'react';
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [canManageDeletion, setCanManageDeletion] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        const response = await fetch('/api/admin/students', {
          method: 'GET',
          cache: 'no-store',
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'تعذر تحميل إعداد حذف الطلاب.');
        }

        if (!active) return;

        setAllowStudentDeletion(result.deletionEnabled);
        setCanManageDeletion(true);
      } catch (error) {
        if (!active) return;

        setMessage(
          error instanceof Error
            ? error.message
            : 'حدث خطأ أثناء تحميل الإعداد.',
        );
        setMessageType('error');
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadSettings();

    return () => {
      active = false;
    };
  }, []);

  async function handleDeletionSettingChange() {
    if (isSaving || isLoading || !canManageDeletion) return;

    const previousValue = allowStudentDeletion;
    const nextValue = !previousValue;

    setAllowStudentDeletion(nextValue);
    setIsSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/admin/students', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deletionEnabled: nextValue,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'تعذر حفظ إعداد حذف الطلاب.');
      }

      setAllowStudentDeletion(result.deletionEnabled);
      setMessage(
        result.deletionEnabled
          ? 'تم تفعيل السماح بحذف الطلاب.'
          : 'تم تعطيل حذف الطلاب بنجاح.',
      );
      setMessageType('success');
    } catch (error) {
      setAllowStudentDeletion(previousValue);
      setMessage(
        error instanceof Error
          ? error.message
          : 'حدث خطأ أثناء حفظ الإعداد.',
      );
      setMessageType('error');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div dir="rtl" className="space-y-6 p-6">
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
            سيتم ربط تعديل التواريخ في الخطوة التالية.
          </p>
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">التحكم في حذف الطلاب</h2>
          </div>

          <p className="text-sm text-muted-foreground">
            تحديد ما إذا كان مسموحًا بحذف الطلاب من النظام.
          </p>

          <label className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium">
              السماح بحذف الطلاب
            </span>

            <button
              type="button"
              role="switch"
              aria-checked={allowStudentDeletion}
              aria-label="السماح بحذف الطلاب"
              disabled={isLoading || isSaving || !canManageDeletion}
              onClick={handleDeletionSettingChange}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                allowStudentDeletion ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  allowStudentDeletion ? 'left-0.5' : 'left-5'
                }`}
              />
            </button>
          </label>

          <p className="text-xs text-muted-foreground">
            {isLoading
              ? 'جارٍ تحميل الإعداد...'
              : isSaving
                ? 'جارٍ حفظ التغيير...'
                : !canManageDeletion
                  ? 'تعذر تحميل الإعداد أو ليست لديك صلاحية إدارته.'
                  : allowStudentDeletion
                    ? 'حذف الطلاب مفعّل.'
                    : 'حذف الطلاب معطّل.'}
          </p>

          {message && (
            <p
              role="status"
              className={`text-sm ${
                messageType === 'error'
                  ? 'text-destructive'
                  : 'text-primary'
              }`}
            >
              {message}
            </p>
          )}
        </section>
      </div>

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
