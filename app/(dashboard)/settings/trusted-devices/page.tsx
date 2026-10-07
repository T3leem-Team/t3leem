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
} from 'lucide-react'

import { useEffect, useState } from 'react'
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
  user: {
    username: string
    full_name: string | null
    role: string
  } | null
}

export default function TrustedDevicesPage() {
  const router = useRouter()

  const [devices, setDevices] = useState<TrustedDevice[]>([])
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
      setError('تعذر الاتصال بالخادم.')
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
            'Content-Type': 'application/json',
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

      setSuccess(
        action === 'approve'
          ? 'تمت الموافقة على الجهاز بنجاح.'
          : 'تم رفض الجهاز بنجاح.',
      )

      await loadDevices()
    } catch (error) {
      console.error(
        'Trusted device action error:',
        error,
      )
      setError('تعذر الاتصال بالخادم.')
    } finally {
      setProcessingId(null)
    }
  }

  function formatDate(value: string) {
    return new Intl.DateTimeFormat('ar-BH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
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

  return (
    <div className="space-y-6">
      {/* العودة */}
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
        description="مراجعة الأجهزة الجديدة والموافقة عليها أو رفضها قبل السماح لها بالدخول إلى النظام."
      />

      <div className="flex justify-start">
        <button
          type="button"
          onClick={loadDevices}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              loading ? 'animate-spin' : ''
            }`}
          />
          تحديث
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            طلبات الأجهزة
          </CardTitle>

          <CardDescription>
            الأجهزة التي تنتظر موافقة مدير النظام.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : devices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Check className="mb-3 h-10 w-10 text-muted-foreground" />

              <p className="font-medium">
                لا توجد طلبات أجهزة معلقة
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                جميع الأجهزة تمت معالجتها.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="rounded-xl border p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-3">
                      {/* صاحب الطلب */}
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-muted p-2">
                          <UserRound className="h-5 w-5" />
                        </div>

                        <div>
                          <p className="text-sm text-muted-foreground">
                            صاحب الطلب
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
                              {getRoleName(
                                device.user.role,
                              )}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* بيانات الجهاز */}
                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <MonitorSmartphone className="h-4 w-4" />

                          <span>
                            {device.device_name ||
                              'جهاز جديد'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Clock3 className="h-4 w-4" />

                          <span>
                            {formatDate(
                              device.created_at,
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* الأزرار */}
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleAction(
                            device.id,
                            'reject',
                          )
                        }
                        disabled={
                          processingId ===
                          device.id
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {processingId ===
                        device.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
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
                        disabled={
                          processingId ===
                          device.id
                        }
                        className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {processingId ===
                        device.id ? (
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
    </div>
  )
}
