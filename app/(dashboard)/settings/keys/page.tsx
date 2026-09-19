'use client'

import { useEffect, useState } from 'react'

import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/dashboard/page-header'

const CURRENT_YEAR_KEY = 'allow_add_to_current_year'
const ARCHIVE_KEY = 'allow_add_to_archive'

type KeyRow = {
  key_name: string
  enabled: boolean
}

type KeysState = {
  allowAddToCurrentYear: boolean
  allowAddToArchive: boolean
}

function getSupabaseError(error: unknown) {
  if (!error) {
    return 'خطأ غير معروف'
  }

  if (typeof error === 'object') {
    const e = error as {
      message?: string
      details?: string
      hint?: string
      code?: string
    }

    return [
      e.message,
      e.details,
      e.hint,
      e.code ? `Code: ${e.code}` : '',
    ]
      .filter(Boolean)
      .join(' — ')
  }

  return String(error)
}

export default function KeysPage() {
  const [settings, setSettings] = useState<KeysState>({
    allowAddToCurrentYear: true,
    allowAddToArchive: true,
  })

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setIsLoading(true)
    setError('')
    setMessage('')

    try {
      const { data, error: settingsError } =
        await supabase
          .from('system_keys')
          .select('key_name, enabled')
          .in('key_name', [
            CURRENT_YEAR_KEY,
            ARCHIVE_KEY,
          ])

      if (settingsError) {
        throw settingsError
      }

      const rows = (data ?? []) as KeyRow[]

      const currentYearRow = rows.find(
        (row) =>
          row.key_name === CURRENT_YEAR_KEY,
      )

      const archiveRow = rows.find(
        (row) =>
          row.key_name === ARCHIVE_KEY,
      )

      /*
       * نقرأ القيمة كما هي من قاعدة البيانات.
       *
       * لا نستخدم ?? true هنا، لأن المفتاح إذا لم يكن
       * موجودًا فهذا لا يعني أن الصلاحية مفعلة.
       */
      setSettings({
        allowAddToCurrentYear:
          currentYearRow?.enabled === true,

        allowAddToArchive:
          archiveRow?.enabled === true,
      })
    } catch (err) {
      setError(
        `تعذر تحميل إعدادات المفاتيح: ${getSupabaseError(err)}`,
      )
    } finally {
      setIsLoading(false)
    }
  }

  const updateSetting = async (
    keyName:
      | typeof CURRENT_YEAR_KEY
      | typeof ARCHIVE_KEY,
    value: boolean,
  ) => {
    if (isSaving) return

    setIsSaving(true)
    setError('')
    setMessage('')

    const previousSettings = settings

    // تحديث فوري للواجهة
    setSettings((current) => ({
      ...current,
      ...(keyName === CURRENT_YEAR_KEY
        ? {
            allowAddToCurrentYear: value,
          }
        : {
            allowAddToArchive: value,
          }),
    }))

    try {
      /*
       * select() مهم جدًا هنا.
       *
       * نريد التأكد أن Supabase أعاد الصف الذي تم تحديثه.
       * إذا رجعت data فارغة فهذا يعني أن UPDATE لم يعدّل
       * أي صف، وغالبًا السبب RLS أو أن المفتاح غير موجود.
       */
      const { data, error: updateError } =
        await supabase
          .from('system_keys')
          .update({
            enabled: value,
            updated_at: new Date().toISOString(),
          })
          .eq('key_name', keyName)
          .select('key_name, enabled')

      if (updateError) {
        throw updateError
      }

      if (!data || data.length === 0) {
        throw new Error(
          `لم يتم تحديث المفتاح "${keyName}". تأكد من وجود المفتاح وصلاحيات UPDATE في system_keys.`,
        )
      }

      const updatedRow = data[0] as KeyRow

      /*
       * نتأكد أن القيمة التي رجعت من قاعدة البيانات
       * هي نفس القيمة المطلوبة.
       */
      if (updatedRow.enabled !== value) {
        throw new Error(
          `تم تحديث المفتاح "${keyName}" ولكن القيمة المحفوظة غير مطابقة للقيمة المطلوبة.`,
        )
      }

      /*
       * إعادة تحميل الإعدادات من قاعدة البيانات بعد الحفظ.
       * هذا يمنع بقاء الواجهة على قيمة مختلفة عن DB.
       */
      await loadSettings()

      setMessage('تم حفظ الإعداد بنجاح.')

      window.setTimeout(() => {
        setMessage('')
      }, 2500)
    } catch (err) {
      // إرجاع القيمة القديمة في حال فشل الحفظ
      setSettings(previousSettings)

      setError(
        `تعذر حفظ إعداد المفاتيح: ${getSupabaseError(err)}`,
      )
    } finally {
      setIsSaving(false)
    }
  }

  const PermissionRow = ({
    title,
    description,
    enabled,
    onChange,
  }: {
    title: string
    description: string
    enabled: boolean
    onChange: (value: boolean) => void
  }) => {
    return (
      <div className="flex items-center justify-between gap-4 rounded-xl border bg-white p-4">
        <div className="min-w-0">
          <div className="font-medium text-gray-900">
            {title}
          </div>

          <div className="mt-1 text-sm text-gray-500">
            {description}
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={isSaving || isLoading}
          onClick={() => onChange(!enabled)}
          className={[
            'relative h-7 w-12 shrink-0 rounded-full transition',
            enabled
              ? 'bg-emerald-600'
              : 'bg-gray-300',
            isSaving || isLoading
              ? 'cursor-not-allowed opacity-60'
              : 'cursor-pointer',
          ].join(' ')}
        >
          <span
            className={[
              'absolute top-1 h-5 w-5 rounded-full bg-white shadow transition',
              enabled
                ? 'right-1'
                : 'right-6',
            ].join(' ')}
          />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="إعدادات المفاتيح"
        description="التحكم في صلاحيات الاستيراد داخل الطلبات."
      />

      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-2xl border bg-gray-50 p-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            صلاحيات الاستيراد
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            هذه الإعدادات تحدد الأزرار التي تظهر في
            صفحة الطلبات.
          </p>
        </div>

        {isLoading ? (
          <div className="rounded-xl border bg-white p-5 text-sm text-gray-500">
            جاري تحميل الإعدادات...
          </div>
        ) : (
          <div className="space-y-3">
            <PermissionRow
              title="السماح بالإضافة إلى السنة الحالية"
              description="إظهار زر استيراد السجل وإتاحة إضافة السجلات إلى السنة الدراسية الحالية."
              enabled={
                settings.allowAddToCurrentYear
              }
              onChange={(value) =>
                updateSetting(
                  CURRENT_YEAR_KEY,
                  value,
                )
              }
            />

            <PermissionRow
              title="السماح بالإضافة إلى الأرشيف"
              description="إظهار زر الاستيراد إلى الأرشيف في صفحة الطلبات."
              enabled={
                settings.allowAddToArchive
              }
              onChange={(value) =>
                updateSetting(
                  ARCHIVE_KEY,
                  value,
                )
              }
            />
          </div>
        )}
      </div>
    </div>
  )
}