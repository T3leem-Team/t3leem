'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { ArrowRight } from 'lucide-react'

import { supabase } from '@/lib/supabase'
import {
  loadSettingsSystemKeys,
  updateSettingsSystemKey,
} from '@/lib/features/settings/repositories/settings.repository'

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
  const router = useRouter()

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
      // فحص جلسة المستخدم
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      console.log('SUPABASE SESSION:', session)
      console.log(
        'SUPABASE SESSION ERROR:',
        sessionError,
      )

      if (sessionError) {
        throw sessionError
      }

      if (!session) {
        throw new Error(
          'لا توجد جلسة تسجيل دخول في Supabase.',
        )
      }

      const {
        data,
        error: settingsError,
      } = await loadSettingsSystemKeys()

      if (settingsError) {
        throw settingsError
      }

      console.log(
        'SYSTEM KEYS FROM SUPABASE:',
        data,
      )

      const rows = (data ?? []) as KeyRow[]

      const currentYearRow = rows.find(
        (row) =>
          row.key_name === CURRENT_YEAR_KEY,
      )

      const archiveRow = rows.find(
        (row) =>
          row.key_name === ARCHIVE_KEY,
      )

      setSettings({
        allowAddToCurrentYear:
          currentYearRow?.enabled ?? true,

        allowAddToArchive:
          archiveRow?.enabled ?? true,
      })
    } catch (err) {
      console.error(
        'loadSettings error:',
        err,
      )

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
      // التأكد من وجود جلسة قبل UPDATE
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      console.log(
        'UPDATE SESSION:',
        session,
      )

      if (sessionError) {
        throw sessionError
      }

      if (!session) {
        throw new Error(
          'لا توجد جلسة تسجيل دخول في Supabase.',
        )
      }

      const {
        data,
        error: updateError,
      } = await updateSettingsSystemKey(
        keyName,
        value,
      )

      console.log(
        'UPDATE RESULT:',
        data,
      )

      if (updateError) {
        throw updateError
      }

      // التأكد من أن التحديث حصل فعلياً
      if (!data || data.length === 0) {
        throw new Error(
          `لم يتم تحديث المفتاح "${keyName}". تأكد من وجود المفتاح وصلاحيات UPDATE في system_keys.`,
        )
      }

      // تأكيد القيمة التي رجعت من قاعدة البيانات
      const updatedRow = data[0]

      setSettings((current) => ({
        ...current,
        ...(keyName === CURRENT_YEAR_KEY
          ? {
              allowAddToCurrentYear:
                updatedRow.enabled === true,
            }
          : {
              allowAddToArchive:
                updatedRow.enabled === true,
            }),
      }))

      setMessage(
        `تم ${
          value ? 'تفعيل' : 'تعطيل'
        } الإعداد وحفظه بنجاح.`,
      )

      window.setTimeout(() => {
        setMessage('')
      }, 2500)
    } catch (err) {
      console.error(
        'updateSetting error:',
        err,
      )

      // إرجاع القيمة السابقة
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
          disabled={
            isSaving || isLoading
          }
          onClick={() =>
            onChange(!enabled)
          }
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
      {/* العودة */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          <ArrowRight className="h-4 w-4" />
          عودة
        </button>
      </div>

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