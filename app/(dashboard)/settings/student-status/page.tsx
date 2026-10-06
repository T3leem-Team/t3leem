'use client'

import { useEffect, useState } from 'react'
import {
  Award,
  Loader2,
  Save,
  ShieldCheck,
  UserRoundCheck,
  Bus,
  Download,
  Printer,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

import { supabase } from '@/lib/supabase'

type Settings = {
  id: string
  is_enabled: boolean
  show_attendance_award_result: boolean
  allow_trip_creation: boolean
  allow_direct_trip_publish: boolean
}

export default function StudentStatusSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const studentStatusUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/student-status`
      : '/student-status'

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('student_status_settings')
      .select(
        'id, is_enabled, show_attendance_award_result, allow_trip_creation, allow_direct_trip_publish',
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
        show_attendance_award_result:
          settings.show_attendance_award_result,
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

  const handleDownloadQr = () => {
    const svg = document.getElementById(
      'student-status-qr',
    )

    if (!svg) {
      setError('تعذر إنشاء QR Code.')
      return
    }

    const serializer = new XMLSerializer()
    const source = serializer.serializeToString(svg)

    const blob = new Blob([source], {
      type: 'image/svg+xml;charset=utf-8',
    })

    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = 'student-status-qr.svg'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)

    setMessage('تم تنزيل QR Code بنجاح.')
  }

  const handlePrintQr = () => {
    const svg = document.getElementById(
      'student-status-qr',
    )

    if (!svg) {
      setError('تعذر تجهيز QR Code للطباعة.')
      return
    }

    const serializer = new XMLSerializer()
    const source = serializer.serializeToString(svg)

    const printWindow = window.open(
      '',
      '_blank',
      'width=600,height=700',
    )

    if (!printWindow) {
      setError(
        'تعذر فتح نافذة الطباعة. تأكد من السماح بالنوافذ المنبثقة.',
      )
      return
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <title>QR متابعة الطلاب</title>
          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: Arial, sans-serif;
              background: white;
            }

            .page {
              text-align: center;
              padding: 40px;
            }

            h1 {
              margin: 0 0 10px;
              font-size: 28px;
            }

            p {
              margin: 0 0 25px;
              color: #555;
              font-size: 16px;
            }

            .qr {
              display: inline-flex;
              padding: 20px;
              border: 1px solid #ddd;
              border-radius: 16px;
              background: white;
            }

            .url {
              margin-top: 20px;
              font-size: 12px;
              color: #666;
              direction: ltr;
              word-break: break-all;
            }

            @media print {
              body {
                min-height: auto;
              }
            }
          </style>
        </head>

        <body>
          <div class="page">
            <h1>متابعة الطلاب</h1>

            <p>
              امسح رمز QR للوصول إلى صفحة متابعة الطالب
            </p>

            <div class="qr">
              ${source}
            </div>

            <div class="url">
              ${studentStatusUrl}
            </div>
          </div>
        </body>
      </html>
    `)

    printWindow.document.close()

    printWindow.focus()

    setTimeout(() => {
      printWindow.print()
    }, 300)
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
          icon={<Award className="size-5" />}
          title="إظهار نتيجة التكريم في صفحة متابعة الطالب"
          description="السماح للطلاب برؤية نتيجة التكريم ونسب الحضور للدورات المشاركة فيها في صفحة متابعة الطالب."
          enabled={settings.show_attendance_award_result}
          onChange={(value) =>
            updateSetting(
              'show_attendance_award_result',
              value,
            )
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

        {/* QR Code */}
        <div className="rounded-xl border bg-card p-5">
          <div className="flex flex-col gap-5">
            <div className="flex items-start gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <UserRoundCheck className="size-5" />
              </div>

              <div>
                <h2 className="font-semibold">
                  QR متابعة الطلاب
                </h2>

                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  رمز ثابت يمكن طباعته أو إرساله للطلاب للوصول إلى صفحة متابعة الطالب.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border bg-muted/20 p-6">
              <div
                id="student-status-qr-container"
                className="rounded-xl bg-white p-5 shadow-sm"
              >
                <QRCodeSVG
                  id="student-status-qr"
                  value={studentStatusUrl}
                  size={240}
                  level="H"
                  includeMargin
                />
              </div>

              <div className="text-center">
                <p className="font-semibold">
                  متابعة الطلاب
                </p>

                <p
                  dir="ltr"
                  className="mt-1 break-all text-xs text-muted-foreground"
                >
                  {studentStatusUrl}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={handleDownloadQr}
                className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2.5 text-sm font-medium transition hover:bg-muted"
              >
                <Download className="size-4" />
                تحميل QR
              </button>

              <button
                type="button"
                onClick={handlePrintQr}
                className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2.5 text-sm font-medium transition hover:bg-muted"
              >
                <Printer className="size-4" />
                طباعة QR
              </button>
            </div>
          </div>
        </div>
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

          {saving
            ? 'جاري الحفظ...'
            : 'حفظ الإعدادات'}
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
          enabled
            ? 'bg-primary'
            : 'bg-muted-foreground/30'
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
