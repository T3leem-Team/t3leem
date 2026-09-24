'use client'

import { useEffect, useState } from 'react'
import {
  Loader2,
  Save,
  ShieldCheck,
  UserRoundCheck,
  Bus,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'

type Settings = {
  id: string
  is_enabled: boolean
  allow_trip_creation: boolean
  allow_direct_trip_publish: boolean
}

export default function StudentStatusSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('student_status_settings')
      .select(
        'id, is_enabled, allow_trip_creation, allow_direct_trip_publish',
      )
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error(error)
      setError('تعذر تحميل الإعدادات.')
      setLoading(false)
      return
    }

    if (!data) {
      setError('لم يتم العثور على إعدادات حالة الطالب.')
      setLoading(false)
      return
    }

    setSettings(data)
    setLoading(false)
  }

  const updateSetting = (
    key: keyof Omit<Settings, 'id'>,
    value: boolean,
  ) => {
    setSettings((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : current,
    )

    setMessage('')
    setError('')
  }

  const handleSave = async () => {
    if (!settings) return

    setSaving(true)
    setMessage('')
    setError('')

    const { error } = await supabase
      .from('student_status_settings')
      .update({
        is_enabled: settings.is_enabled,
        allow_trip_creation: settings.allow_trip_creation,
        allow_direct_trip_publish:
          settings.allow_direct_trip_publish,
        updated_at: new Date().toISOString(),
      })
      .eq('id', settings.id)

    if (error) {
      console.error(error)
      setError('تعذر حفظ الإعدادات.')
      setSaving(false)
      return
    }

    setMessage('تم حفظ الإعدادات بنجاح.')
    setSaving(false)
  }

  if (loading) {
    return (
      <div
        dir="rtl"
        className="flex min-h-[400px] items-center justify-center"
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          جاري تحميل الإعدادات...
        </div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div dir="rtl" className="p-6">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          {error || 'تعذر تحميل الإعدادات.'}
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl" className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          إعدادات حالة الطالب والرحلات
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          التحكم في رابط حالة الطالب وإنشاء ونشر الرحلات.
        </p>
      </div>

      {/* Settings */}
      <div className="space-y-4">
        <SettingCard
          icon={<UserRoundCheck className="size-5" />}
          title="رابط حالة الطالب"
          description="السماح للطلاب بالوصول إلى صفحة حالة الطالب والاستعلام عن بياناتهم."
          enabled={settings.is_enabled}
          onChange={(value) =>
            updateSetting('is_enabled', value)
          }
        />

        <SettingCard
          icon={<Bus className="size-5" />}
          title="السماح بإنشاء الرحلات"
          description="السماح للإدارة بإنشاء رحلات جديدة داخل النظام."
          enabled={settings.allow_trip_creation}
          onChange={(value) =>
            updateSetting('allow_trip_creation', value)
          }
        />

        <SettingCard
          icon={<ShieldCheck className="size-5" />}
          title="السماح بالنشر المباشر"
          description="عند التفعيل يمكن نشر الرحلة مباشرة من صفحة تفاصيل الرحلة."
          enabled={settings.allow_direct_trip_publish}
          onChange={(value) =>
            updateSetting(
              'allow_direct_trip_publish',
              value,
            )
          }
        />
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      {/* Save */}
      <div className="flex justify-start">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}

          {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </div>
    </div>
  )
}

type SettingCardProps = {
  icon: React.ReactNode
  title: string
  description: string
  enabled: boolean
  onChange: (value: boolean) => void
}

function SettingCard({
  icon,
  title,
  description,
  enabled,
  onChange,
}: SettingCardProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-5">
      <div className="flex items-start gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          {icon}
        </div>

        <div>
          <h2 className="font-semibold">{title}</h2>

          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          enabled ? 'bg-primary' : 'bg-muted-foreground/30'
        }`}
      >
        <span
          className={`absolute top-1 size-4 rounded-full bg-white shadow-sm transition-transform ${
            enabled
              ? 'right-1'
              : 'right-6'
          }`}
        />
      </button>
    </div>
  )
}
