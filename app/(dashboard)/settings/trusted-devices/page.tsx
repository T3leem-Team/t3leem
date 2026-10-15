'use client'

import {
  ArrowRight,
  Check,
  Clock3,
  Loader2,
  MonitorSmartphone,
  RefreshCw,
  ShieldCheck,
  UserRound,
  X,
  Ban,
  CalendarClock,
  Hourglass,
} from 'lucide-react'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { PageHeader } from '@/components/dashboard/page-header'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type TrustedDevice = {
  id: string
  auth_user_id: string
  device_name: string | null
  status: string
  created_at: string
  approved_at: string | null
  rejected_at: string | null
  revoked_at: string | null
  last_used_at: string | null
  approved_device_type: string | null
  pending_device_type: string | null
  grace_period_days: number | null
  grace_expires_at: string | null
  device_type_detected_at: string | null
  user: {
    username: string
    full_name: string | null
    role: string
  } | null
}

type DeviceAction =
  | 'approve'
  | 'reject'
  | 'revoke'
  | 'update_grace_period'

const DEFAULT_GRACE_DAYS = 30
const MAX_GRACE_DAYS = 3650

export default function TrustedDevicesPage() {
  const router = useRouter()

  const [devices, setDevices] = useState<TrustedDevice[]>([])
  const [approvedDevices, setApprovedDevices] =
    useState<TrustedDevice[]>([])
  const [graceDaysByDevice, setGraceDaysByDevice] =
    useState<Record<string, number>>({})

  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadDevices = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/trusted-devices', {
        method: 'GET',
        cache: 'no-store',
      })

      const data = await response.json()

      if (!response.ok) {
        setError(
          typeof data.error === 'string'
            ? data.error
            : 'تعذر تحميل الأجهزة.',
        )
        return
      }

      const pending: TrustedDevice[] = Array.isArray(data.devices)
        ? data.devices
        : []

      const approved: TrustedDevice[] = Array.isArray(
        data.approvedDevices,
      )
        ? data.approvedDevices
        : []

      setDevices(pending)
      setApprovedDevices(approved)

      setGraceDaysByDevice((previous) => {
        const next = { ...previous }

        for (const device of [...pending, ...approved]) {
          if (next[device.id] === undefined) {
            next[device.id] =
              device.grace_period_days || DEFAULT_GRACE_DAYS
          }
        }

        return next
      })
    } catch (err) {
      console.error('Load trusted devices error:', err)
      setError('تعذر الاتصال بالخادم.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDevices()
  }, [loadDevices])

  function getGraceDays(deviceId: string) {
    return graceDaysByDevice[deviceId] ?? DEFAULT_GRACE_DAYS
  }

  function setGraceDays(deviceId: string, value: number) {
    setGraceDaysByDevice((previous) => ({
      ...previous,
      [deviceId]: value,
    }))
  }

  async function handleAction(
    deviceId: string,
    action: DeviceAction,
  ) {
    const actionLabels: Record<DeviceAction, string> = {
      approve: 'الموافقة على الجهاز',
      reject: 'رفض الجهاز',
      revoke: 'إلغاء اعتماد الجهاز',
      update_grace_period: 'تحديث مدة الثقة',
    }

    if (
      action === 'approve' ||
      action === 'update_grace_period'
    ) {
      const days = getGraceDays(deviceId)

      if (
        !Number.isInteger(days) ||
        days < 1 ||
        days > MAX_GRACE_DAYS
      ) {
        setError(
          `أدخل مدة صحيحة بين يوم واحد و${MAX_GRACE_DAYS} يوم.`,
        )
        return
      }
    }

    if (action === 'reject') {
      const confirmed = window.confirm(
        'هل تريد رفض هذا الجهاز؟ سيبقى سجله محفوظًا في قاعدة البيانات.',
      )

      if (!confirmed) return
    }

    if (action === 'revoke') {
      const confirmed = window.confirm(
        'هل تريد إلغاء اعتماد هذا الجهاز؟ سيحتاج المستخدم إلى موافقة جديدة للدخول منه.',
      )

      if (!confirmed) return
    }

    setProcessingId(deviceId)
    setError('')
    setSuccess('')

    try {
      const body: {
        deviceId: string
        action: DeviceAction
        gracePeriodDays?: number
      } = {
        deviceId,
        action,
      }

      if (
        action === 'approve' ||
        action === 'update_grace_period'
      ) {
        body.gracePeriodDays = getGraceDays(deviceId)
      }

      const response = await fetch('/api/admin/trusted-devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(
          typeof data.error === 'string'
            ? data.error
            : `تعذر تنفيذ الإجراء: ${actionLabels[action]}.`,
        )
        return
      }

      const messages: Record<DeviceAction, string> = {
        approve: `تم اعتماد الجهاز لمدة ${getGraceDays(deviceId)} يومًا.`,
        reject: 'تم رفض الجهاز.',
        revoke: 'تم إلغاء اعتماد الجهاز.',
        update_grace_period: `تم تحديث مدة الثقة إلى ${getGraceDays(deviceId)} يومًا، واحتساب تاريخ انتهاء جديد من الآن.`,
      }

      setSuccess(messages[action])

      await loadDevices()
    } catch (err) {
      console.error('Trusted device action error:', err)
      setError('تعذر الاتصال بالخادم.')
    } finally {
      setProcessingId(null)
    }
  }

  function formatDate(value: string | null) {
    if (!value) return '—'

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) return '—'

    return new Intl.DateTimeFormat('ar-BH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  }

  function getRoleName(role: string) {
    switch (role) {
      case 'Admin':
        return 'مدير النظام'
      case 'Supervisor':
        return 'مشرف'
      case 'Teacher':
        return 'معلم'
      case 'Payments Manager':
        return 'مدير المدفوعات'
      default:
        return role
    }
  }

  function getDeviceTypeName(type: string | null) {
    if (!type || type === 'unknown') {
      return 'غير محدد'
    }

    const types: Record<string, string> = {
      iphone: 'iPhone',
      ipad: 'iPad',
      samsung: 'Samsung',
      android: 'Android',
      windows_pc: 'كمبيوتر Windows',
      mac: 'كمبيوتر Mac',
      linux_pc: 'كمبيوتر Linux',
    }

    return types[type] || type
  }

  function isExpired(device: TrustedDevice) {
    if (!device.grace_expires_at) return false

    const expiry = new Date(device.grace_expires_at).getTime()

    return (
      !Number.isNaN(expiry) &&
      expiry <= Date.now()
    )
  }

  function renderUser(device: TrustedDevice) {
    return (
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-muted p-2">
          <UserRound className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            صاحب الجهاز
          </p>

          <p className="font-semibold">
            {device.user?.full_name ||
              device.user?.username ||
              'مستخدم غير معروف'}
          </p>

          {device.user?.username && (
            <p className="text-sm text-muted-foreground">
              @{device.user.username}
            </p>
          )}

          {device.user?.role && (
            <p className="mt-1 text-xs text-muted-foreground">
              {getRoleName(device.user.role)}
            </p>
          )}
        </div>
      </div>
    )
  }

  function renderGraceDaysInput(
    device: TrustedDevice,
    label: string,
  ) {
    return (
      <div className="w-full max-w-xs space-y-2">
        <label
          htmlFor={`grace-days-${device.id}`}
          className="block text-sm font-medium"
        >
          {label}
        </label>

        <div className="flex items-center gap-2">
          <input
            id={`grace-days-${device.id}`}
            type="number"
            min={1}
            max={MAX_GRACE_DAYS}
            step={1}
            value={getGraceDays(device.id)}
            onChange={(event) => {
              const value = event.target.valueAsNumber

              setGraceDays(
                device.id,
                Number.isNaN(value) ? 0 : value,
              )
            }}
            disabled={processingId === device.id}
            className="w-28 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />

          <span className="text-sm text-muted-foreground">
            يوم
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {[15, 30, 90].map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setGraceDays(device.id, days)}
              disabled={processingId === device.id}
              className={`rounded-md border px-2.5 py-1 text-xs transition ${
                getGraceDays(device.id) === days
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'hover:bg-muted'
              }`}
            >
              {days} يوم
            </button>
          ))}
        </div>
      </div>
    )
  }

  function renderDeviceInfo(device: TrustedDevice) {
    const detectedType =
      device.pending_device_type ||
      device.approved_device_type

    return (
      <div className="space-y-3">
        {renderUser(device)}

        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <MonitorSmartphone className="h-4 w-4 shrink-0" />
            <span>{device.device_name || 'جهاز جديد'}</span>
          </div>

          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>
              نوع الجهاز: {getDeviceTypeName(detectedType)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 shrink-0" />
            <span>
              تاريخ التسجيل: {formatDate(device.created_at)}
            </span>
          </div>

          {device.device_type_detected_at && (
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 shrink-0" />
              <span>
                آخر اكتشاف للنوع:{' '}
                {formatDate(device.device_type_detected_at)}
              </span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl" className="space-y-6 p-1">
      <div className="flex justify-start">
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
        title="الأجهزة الموثوقة"
        description="إدارة طلبات الأجهزة وتحديد مدة الثقة لكل جهاز ومراجعة الأجهزة المعتمدة."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          معلقة: {devices.length} · معتمدة: {approvedDevices.length}
        </p>

        <button
          type="button"
          onClick={() => void loadDevices()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
          />
          تحديث
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
        >
          {success}
        </div>
      )}

      {/* الأجهزة المعلقة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            طلبات الأجهزة المعلقة
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              {devices.length}
            </span>
          </CardTitle>

          <CardDescription>
            الأجهزة التي تحتاج إلى مراجعة وموافقة يدوية قبل السماح بالدخول.
            اختر مدة الثقة قبل الموافقة.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="mr-2 text-sm text-muted-foreground">
                جارٍ تحميل الأجهزة...
              </span>
            </div>
          ) : devices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Check className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-medium">
                لا توجد طلبات أجهزة معلقة
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                ستظهر هنا الأجهزة الجديدة أو الأجهزة التي تحتاج إلى موافقة مجددًا.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="rounded-xl border p-4"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      {renderDeviceInfo(device)}

                      <div className="mt-4 rounded-lg bg-muted/50 p-3">
                        {renderGraceDaysInput(
                          device,
                          'مدة الثقة بعد الموافقة',
                        )}

                        <p className="mt-2 text-xs text-muted-foreground">
                          تبدأ المدة من وقت الموافقة على الجهاز.
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          void handleAction(device.id, 'reject')
                        }
                        disabled={processingId === device.id}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {processingId === device.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                        رفض
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void handleAction(device.id, 'approve')
                        }
                        disabled={processingId === device.id}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {processingId === device.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        موافقة
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* الأجهزة المعتمدة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="h-5 w-5" />
            الأجهزة المعتمدة
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
              {approvedDevices.length}
            </span>
          </CardTitle>

          <CardDescription>
            الأجهزة التي تمت الموافقة عليها. يمكنك تعديل مدة الثقة أو إلغاء اعتماد الجهاز دون حذف سجله.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="mr-2 text-sm text-muted-foreground">
                جارٍ تحميل الأجهزة...
              </span>
            </div>
          ) : approvedDevices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <MonitorSmartphone className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-medium">
                لا توجد أجهزة معتمدة حاليًا
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                ستظهر الأجهزة هنا بعد الموافقة عليها.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {approvedDevices.map((device) => {
                const expired = isExpired(device)

                return (
                  <div
                    key={device.id}
                    className="rounded-xl border p-4"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        {renderDeviceInfo(device)}

                        <div className="mt-4 flex flex-wrap gap-3">
                          <div className="rounded-lg border px-3 py-2 text-sm">
                            <p className="text-xs text-muted-foreground">
                              مدة الثقة
                            </p>
                            <p className="mt-1 font-semibold">
                              {device.grace_period_days ??
                                DEFAULT_GRACE_DAYS}{' '}
                              يومًا
                            </p>
                          </div>

                          <div
                            className={`rounded-lg border px-3 py-2 text-sm ${
                              expired
                                ? 'border-red-200 bg-red-50 text-red-700'
                                : 'bg-muted/30'
                            }`}
                          >
                            <p className="text-xs opacity-80">
                              انتهاء الثقة
                            </p>
                            <p className="mt-1 font-semibold">
                              {formatDate(device.grace_expires_at)}
                            </p>
                            {expired && (
                              <p className="mt-1 text-xs font-medium">
                                انتهت المدة؛ تحقق من حالة الجهاز على الخادم.
                              </p>
                            )}
                          </div>

                          <div className="rounded-lg border px-3 py-2 text-sm">
                            <p className="text-xs text-muted-foreground">
                              آخر استخدام
                            </p>
                            <p className="mt-1 font-semibold">
                              {formatDate(device.last_used_at)}
                            </p>
                          </div>

                          <div className="rounded-lg border px-3 py-2 text-sm">
                            <p className="text-xs text-muted-foreground">
                              تاريخ الموافقة
                            </p>
                            <p className="mt-1 font-semibold">
                              {formatDate(device.approved_at)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 rounded-lg bg-muted/50 p-3">
                          {renderGraceDaysInput(
                            device,
                            'تغيير مدة الثقة وتجديدها',
                          )}

                          <p className="mt-2 text-xs text-muted-foreground">
                            عند حفظ المدة الجديدة، يُحتسب تاريخ انتهاء جديد ابتداءً من الآن.
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            void handleAction(
                              device.id,
                              'update_grace_period',
                            )
                          }
                          disabled={processingId === device.id}
                          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {processingId === device.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CalendarClock className="h-4 w-4" />
                          )}
                          حفظ المدة
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void handleAction(device.id, 'revoke')
                          }
                          disabled={processingId === device.id}
                          className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {processingId === device.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Ban className="h-4 w-4" />
                          )}
                          إلغاء الاعتماد
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        <div className="flex items-start gap-2">
          <Hourglass className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            ملاحظة: ظهور الجهاز في القسم المعتمد لا يعني أن انتهاء المدة
            أو اختلاف نوع الجهاز سيُعالَج تلقائيًا من الواجهة وحدها.
            يجب أن يتحقق مسار تسجيل الدخول وحارس الجلسة في الخادم من
            انتهاء المدة ونوع الجهاز، ويعيد الجهاز إلى حالة انتظار
            الموافقة عند الحاجة.
          </p>
        </div>
      </div>
    </div>
  )
}
