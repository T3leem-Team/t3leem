'use client'

import {
  Check,
  Clock3,
  Loader2,
  MonitorSmartphone,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react'

import { useEffect, useState } from 'react'

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
}

export default function TrustedDevicesPage() {
  const [devices, setDevices] = useState<
    TrustedDevice[]
  >([])

  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] =
    useState<string | null>(null)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadDevices() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        '/api/admin/trusted-devices',
        {
          method: 'GET',
          cache: 'no-store',
        },
      )

      const data = await response.json()

      if (!response.ok) {
        setError(
          typeof data.error === 'string'
            ? data.error
            : 'تعذر تحميل الأجهزة.',
        )
        return
      }

      setDevices(
        Array.isArray(data.devices)
          ? data.devices
          : [],
      )
    } catch (error) {
      console.error(
        'Load trusted devices error:',
        error,
      )

      setError(
        'تعذر الاتصال بالخادم.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDevices()
  }, [])

  async function handleAction(
    deviceId: string,
    action: 'approve' | 'reject',
  ) {
    setProcessingId(deviceId)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(
        '/api/admin/trusted-devices',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            deviceId,
            action,
          }),
        },
      )

      const data = await response.json()

      if (!response.ok) {
        setError(
          typeof data.error === 'string'
            ? data.error
            : 'تعذر تنفيذ الإجراء.',
        )
        return
      }

      if (action === 'approve') {
        setSuccess(
          'تمت الموافقة على الجهاز بنجاح.',
        )
      } else {
        setSuccess(
          'تم رفض الجهاز بنجاح.',
        )
      }

      /*
       * الجهاز لم يعد Pending،
       * لذلك نعيد تحميل القائمة.
       */
      await loadDevices()
    } catch (error) {
      console.error(
        'Trusted device action error:',
        error,
      )

      setError(
        'تعذر الاتصال بالخادم.',
      )
    } finally {
      setProcessingId(null)
    }
  }

  function formatDate(
    value: string,
  ) {
    return new Intl.DateTimeFormat(
      'ar-BH',
      {
        dateStyle: 'medium',
        timeStyle: 'short',
      },
    ).format(new Date(value))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="الأجهزة الموثوقة"
        description="مراجعة الأجهزة الجديدة والموافقة عليها أو رفضها قبل السماح لها بالدخول إلى النظام."
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={loadDevices}
          disabled={loading}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            className={`size-4 ${
              loading ? 'animate-spin' : ''
            }`}
          />

          تحديث
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary"
        >
          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>
              <CardTitle>
                طلبات الأجهزة
              </CardTitle>

              <CardDescription>
                الأجهزة التي تنتظر موافقة الإدارة.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex min-h-40 items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                جارٍ تحميل الأجهزة...
              </div>
            </div>
          ) : devices.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <ShieldCheck className="size-6 text-muted-foreground" />
              </div>

              <p className="mt-4 font-medium">
                لا توجد أجهزة معلقة
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                لا توجد حالياً أجهزة تنتظر موافقة الإدارة.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {devices.map((device) => {
                const processing =
                  processingId === device.id

                return (
                  <div
                    key={device.id}
                    className="rounded-xl border border-border p-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted">
                          <MonitorSmartphone className="size-5 text-muted-foreground" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold">
                              {device.device_name ||
                                'جهاز غير معروف'}
                            </h3>

                            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                              <Clock3 className="size-3" />
                              بانتظار الموافقة
                            </span>
                          </div>

                          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                            <p>
                              معرف المستخدم:
                              <span className="mr-1 font-mono text-xs">
                                {device.auth_user_id}
                              </span>
                            </p>

                            <p>
                              تاريخ الطلب:
                              <span className="mr-1">
                                {formatDate(
                                  device.created_at,
                                )}
                              </span>
                            </p>

                            {device.last_used_at && (
                              <p>
                                آخر استخدام:
                                <span className="mr-1">
                                  {formatDate(
                                    device.last_used_at,
                                  )}
                                </span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex w-full gap-2 lg:w-auto">
                        <button
                          type="button"
                          onClick={() =>
                            handleAction(
                              device.id,
                              'reject',
                            )
                          }
                          disabled={processing}
                          className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-destructive/30 px-4 text-sm font-medium text-destructive transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50 lg:flex-none"
                        >
                          {processing ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <X className="size-4" />
                          )}

                          رفض
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleAction(
                              device.id,
                              'approve',
                            )
                          }
                          disabled={processing}
                          className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 lg:flex-none"
                        >
                          {processing ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Check className="size-4" />
                          )}

                          موافقة
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
    </div>
  )
}
