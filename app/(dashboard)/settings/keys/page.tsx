'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2, Save, Settings2 } from 'lucide-react'

import { supabase } from '@/lib/supabase'

import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function KeysPage() {
  const [allowAddToCurrentYear, setAllowAddToCurrentYear] = useState(false)
  const [allowAddToArchive, setAllowAddToArchive] = useState(false)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    loadKeys()
  }, [])

  const loadKeys = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('system_keys')
        .select('key_name, enabled')
        .in('key_name', [
          'allow_add_to_current_year',
          'allow_add_to_archive',
        ])

      if (error) {
        throw error
      }

      for (const row of data ?? []) {
        if (row.key_name === 'allow_add_to_current_year') {
          setAllowAddToCurrentYear(Boolean(row.enabled))
        }

        if (row.key_name === 'allow_add_to_archive') {
          setAllowAddToArchive(Boolean(row.enabled))
        }
      }
    } catch (error: any) {
      console.error('load system keys error:', error)

      setError(
        `تعذر تحميل إعدادات المفاتيح: ${
          error?.message || 'حدث خطأ غير معروف'
        }`
      )
    } finally {
      setLoading(false)
    }
  }

  const saveKeys = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const updates = [
        {
          key_name: 'allow_add_to_current_year',
          enabled: allowAddToCurrentYear,
        },
        {
          key_name: 'allow_add_to_archive',
          enabled: allowAddToArchive,
        },
      ]

      for (const item of updates) {
        const { error } = await supabase
          .from('system_keys')
          .update({
            enabled: item.enabled,
            updated_at: new Date().toISOString(),
          })
          .eq('key_name', item.key_name)

        if (error) {
          throw error
        }
      }

      setSuccess(true)

      setTimeout(() => {
        setSuccess(false)
      }, 3000)
    } catch (error: any) {
      console.error('save system keys error:', error)

      setError(
        `تعذر حفظ إعدادات المفاتيح: ${
          error?.message || 'حدث خطأ غير معروف'
        }`
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="إدارة المفاتيح"
        description="التحكم في الخيارات المتاحة داخل نظام التسجيل والاستيراد."
      />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <Check className="size-4" />
          تم حفظ الإعدادات بنجاح
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="size-5" />
            إعدادات الاستيراد
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="ml-2 size-5 animate-spin" />
              جاري تحميل الإعدادات...
            </div>
          ) : (
            <>
              {/* إضافة للسنة الحالية */}
              <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
                <div className="space-y-1">
                  <div className="font-medium">
                    إضافة لهذه السنة الدراسية
                  </div>

                  <div className="text-sm text-muted-foreground">
                    السماح بظهور خيار استيراد سجل وإضافته إلى السنة
                    الدراسية الحالية.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setAllowAddToCurrentYear(
                      !allowAddToCurrentYear
                    )
                  }
                  className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                    allowAddToCurrentYear
                      ? 'bg-primary'
                      : 'bg-muted'
                  }`}
                  aria-label="إضافة لهذه السنة الدراسية"
                >
                  <span
                    className={`absolute top-1 size-5 rounded-full bg-white shadow-sm transition-transform ${
                      allowAddToCurrentYear
                        ? 'translate-x-1'
                        : 'translate-x-6'
                    }`}
                  />
                </button>
              </div>

              {/* إضافة للأرشيف */}
              <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
                <div className="space-y-1">
                  <div className="font-medium">
                    إضافة إلى الأرشيف
                  </div>

                  <div className="text-sm text-muted-foreground">
                    السماح بظهور خيار استيراد سجل إلى الأرشيف.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setAllowAddToArchive(!allowAddToArchive)
                  }
                  className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                    allowAddToArchive
                      ? 'bg-primary'
                      : 'bg-muted'
                  }`}
                  aria-label="إضافة إلى الأرشيف"
                >
                  <span
                    className={`absolute top-1 size-5 rounded-full bg-white shadow-sm transition-transform ${
                      allowAddToArchive
                        ? 'translate-x-1'
                        : 'translate-x-6'
                    }`}
                  />
                </button>
              </div>

              {/* حفظ */}
              <div className="flex justify-end pt-2">
                <Button
                  onClick={saveKeys}
                  disabled={saving}
                  className="gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <Save className="size-4" />
                      حفظ الإعدادات
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}