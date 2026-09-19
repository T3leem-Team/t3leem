'use client'

import { useEffect, useState } from 'react'
import {
  Check,
  Loader2,
  Save,
  Settings2,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'

import { PageHeader } from '@/components/dashboard/page-header'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const CURRENT_YEAR_KEY =
  'allow_add_to_current_year'

const ARCHIVE_KEY =
  'allow_add_to_archive'

type KeysSettings = {
  allowAddToCurrentYear: boolean
  allowAddToArchive: boolean
}

export default function KeysPage() {
  const [settings, setSettings] =
    useState<KeysSettings>({
      allowAddToCurrentYear: true,
      allowAddToArchive: true,
    })

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [error, setError] =
    useState('')

  const [success, setSuccess] =
    useState('')

  const loadSettings = async () => {
    setLoading(true)
    setError('')

    try {
      const {
        data,
        error: settingsError,
      } = await supabase
        .from('system_keys')
        .select(
          'key_name, enabled',
        )
        .in('key_name', [
          CURRENT_YEAR_KEY,
          ARCHIVE_KEY,
        ])

      if (settingsError) {
        throw settingsError
      }

      const currentYear =
        data?.find(
          (item) =>
            item.key_name ===
            CURRENT_YEAR_KEY,
        )

      const archive =
        data?.find(
          (item) =>
            item.key_name ===
            ARCHIVE_KEY,
        )

      /*
       * إذا كانت المفاتيح موجودة،
       * نستخدم القيمة الموجودة في قاعدة البيانات.
       *
       * إذا لم تكن موجودة، ننشئها مفعلة.
       */
      if (!currentYear) {
        const {
          error: insertCurrentError,
        } = await supabase
          .from('system_keys')
          .insert({
            key_name:
              CURRENT_YEAR_KEY,
            enabled: true,
          })

        if (insertCurrentError) {
          throw insertCurrentError
        }
      }

      if (!archive) {
        const {
          error: insertArchiveError,
        } = await supabase
          .from('system_keys')
          .insert({
            key_name:
              ARCHIVE_KEY,
            enabled: true,
          })

        if (insertArchiveError) {
          throw insertArchiveError
        }
      }

      setSettings({
        allowAddToCurrentYear:
          currentYear?.enabled ??
          true,

        allowAddToArchive:
          archive?.enabled ??
          true,
      })
    } catch (err) {
      console.error(
        'load system keys error:',
        err,
      )

      setError(
        err instanceof Error
          ? err.message
          : 'تعذر تحميل إعدادات المفاتيح.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSettings()
  }, [])

  const updateSetting = async (
    setting:
      | 'allowAddToCurrentYear'
      | 'allowAddToArchive',
    value: boolean,
  ) => {
    setSaving(true)
    setSuccess('')
    setError('')

    const previousSettings =
      settings

    /*
     * تحديث الواجهة مباشرة.
     */
    setSettings((current) => ({
      ...current,
      [setting]: value,
    }))

    try {
      const keyName =
        setting ===
        'allowAddToCurrentYear'
          ? CURRENT_YEAR_KEY
          : ARCHIVE_KEY

      const {
        error: updateError,
      } = await supabase
        .from('system_keys')
        .update({
          enabled: value,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          'key_name',
          keyName,
        )

      if (updateError) {
        throw updateError
      }

      setSuccess(
        'تم حفظ إعدادات المفاتيح.',
      )

      window.setTimeout(() => {
        setSuccess('')
      }, 2500)
    } catch (err) {
      console.error(
        'update system key error:',
        err,
      )

      /*
       * إذا فشل الحفظ نرجع القيمة القديمة.
       */
      setSettings(
        previousSettings,
      )

      setError(
        err instanceof Error
          ? err.message
          : 'تعذر حفظ إعدادات المفاتيح.',
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
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <Check className="size-4" />

          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="size-5" />

            إعدادات الاستيراد
          </CardTitle>
        </CardHeader>

        <CardContent className="divide-y p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="ml-2 size-5 animate-spin" />

              جاري تحميل الإعدادات...
            </div>
          ) : (
            <>
              <PermissionRow
                title="إضافة لهذه السنة الدراسية"
                description="السماح بظهور خيار استيراد سجل وإضافته إلى السنة الدراسية الحالية."
                enabled={
                  settings.allowAddToCurrentYear
                }
                disabled={saving}
                onChange={(value) =>
                  void updateSetting(
                    'allowAddToCurrentYear',
                    value,
                  )
                }
              />

              <PermissionRow
                title="إضافة إلى الأرشيف"
                description="السماح بظهور خيار استيراد سجل إلى الأرشيف."
                enabled={
                  settings.allowAddToArchive
                }
                disabled={saving}
                onChange={(value) =>
                  void updateSetting(
                    'allowAddToArchive',
                    value,
                  )
                }
              />
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Save className="size-4" />

        التغييرات تحفظ مباشرة عند تشغيل أو إيقاف الخيار.
      </div>
    </div>
  )
}

function PermissionRow({
  title,
  description,
  enabled,
  disabled,
  onChange,
}: {
  title: string
  description: string
  enabled: boolean
  disabled: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium">
          {title}
        </p>

        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={disabled}
        onClick={() =>
          onChange(!enabled)
        }
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          enabled
            ? 'bg-primary'
            : 'bg-muted-foreground/30'
        }`}
      >
        <span
          className={`absolute top-1 size-5 rounded-full bg-white shadow-sm transition-all ${
            enabled
              ? 'right-1'
              : 'right-6'
          }`}
        />
      </button>
    </div>
  )
}