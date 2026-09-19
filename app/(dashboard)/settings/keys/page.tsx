'use client'

import { useEffect, useState } from 'react'
import {
  Archive,
  ArrowRight,
  KeyRound,
  Loader2,
  Save,
  Upload,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

import { supabase } from '@/lib/supabase'

import { PageHeader } from '@/components/dashboard/page-header'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function SystemKeysPage() {
  const router = useRouter()

  const [allowAddToCurrentYear, setAllowAddToCurrentYear] = useState(false)
  const [allowAddToArchive, setAllowAddToArchive] = useState(false)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadKeys()
  }, [])

  async function loadKeys() {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('system_keys')
      .select('key_name, enabled')
      .in('key_name', [
        'allow_add_to_current_year',
        'allow_add_to_archive',
      ])

    if (error) {
      setError('تعذر تحميل مفاتيح النظام.')
      setLoading(false)
      return
    }

    for (const item of data ?? []) {
      if (item.key_name === 'allow_add_to_current_year') {
        setAllowAddToCurrentYear(item.enabled)
      }

      if (item.key_name === 'allow_add_to_archive') {
        setAllowAddToArchive(item.enabled)
      }
    }

    setLoading(false)
  }

  async function saveKeys() {
    setSaving(true)
    setMessage('')
    setError('')

    const { error } = await supabase
      .from('system_keys')
      .upsert(
        [
          {
            key_name: 'allow_add_to_current_year',
            enabled: allowAddToCurrentYear,
          },
          {
            key_name: 'allow_add_to_archive',
            enabled: allowAddToArchive,
          },
        ],
        {
          onConflict: 'key_name',
        }
      )

    if (error) {
      setError('تعذر حفظ إعدادات المفاتيح.')
      setSaving(false)
      return
    }

    setMessage('تم حفظ إعدادات المفاتيح بنجاح.')
    setSaving(false)

    setTimeout(() => {
      setMessage('')
    }, 3000)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="إدارة المفاتيح"
        description="التحكم في خيارات استيراد سجل الطلاب والعمليات المرتبطة بها."
      />

      <Button
        variant="outline"
        onClick={() => router.push('/settings')}
        className="gap-2"
      >
        <ArrowRight className="h-4 w-4" />
        العودة إلى الإدارة
      </Button>

      {loading ? (
        <Card>
          <CardContent className="flex min-h-[180px] items-center justify-center">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              جاري تحميل المفاتيح...
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* إضافة لهذه السنة */}
          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Upload className="h-5 w-5" />
                </div>

                <div>
                  <CardTitle className="text-base">
                    إضافة لهذه السنة الدراسية
                  </CardTitle>

                  <CardDescription className="mt-1 leading-6">
                    السماح باستخدام خيار إضافة السجلات المستوردة مباشرة
                    إلى الطلاب في السنة الدراسية الحالية.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
                <div>
                  <p className="font-medium">
                    السماح بالإضافة لهذه السنة الدراسية
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {allowAddToCurrentYear
                      ? 'مفعل — سيظهر خيار الإضافة لهذه السنة.'
                      : 'معطل — خيار الإضافة لهذه السنة غير متاح.'}
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={allowAddToCurrentYear}
                  onClick={() =>
                    setAllowAddToCurrentYear((current) => !current)
                  }
                  className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                    allowAddToCurrentYear
                      ? 'bg-primary'
                      : 'bg-muted-foreground/30'
                  }`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                      allowAddToCurrentYear
                        ? 'right-1'
                        : 'right-6'
                    }`}
                  />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* إضافة إلى الأرشيف */}
          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Archive className="h-5 w-5" />
                </div>

                <div>
                  <CardTitle className="text-base">
                    إضافة إلى الأرشيف
                  </CardTitle>

                  <CardDescription className="mt-1 leading-6">
                    السماح باستخدام خيار إضافة السجلات المستوردة إلى
                    الأرشيف فقط دون إضافتها إلى الطلاب الحاليين.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
                <div>
                  <p className="font-medium">
                    السماح بالإضافة إلى الأرشيف
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {allowAddToArchive
                      ? 'مفعل — سيظهر خيار الإضافة إلى الأرشيف.'
                      : 'معطل — خيار الإضافة إلى الأرشيف غير متاح.'}
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={allowAddToArchive}
                  onClick={() =>
                    setAllowAddToArchive((current) => !current)
                  }
                  className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                    allowAddToArchive
                      ? 'bg-primary'
                      : 'bg-muted-foreground/30'
                  }`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                      allowAddToArchive
                        ? 'right-1'
                        : 'right-6'
                    }`}
                  />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* حفظ */}
          <Card>
            <CardContent className="space-y-4 p-5">
              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {message && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
                  {message}
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={saveKeys}
                  disabled={saving}
                  className="gap-2"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}

                  {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* معلومات */}
          <Card className="border-dashed">
            <CardContent className="flex items-start gap-3 p-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
              </div>

              <div>
                <p className="font-medium">مفاتيح النظام</p>

                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  عند تفعيل أي مفتاح سيظهر الخيار المرتبط به في صفحة
                  استيراد السجل. يمكن تشغيل كل خيار أو إيقافه بشكل مستقل.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
