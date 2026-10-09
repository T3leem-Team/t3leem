
'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  ArrowRight,
  Loader2,
  RefreshCw,
  Wrench,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

import { PageHeader } from '@/components/dashboard/page-header'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function SystemMaintenanceClient() {
  const router = useRouter()

  const [maintenance, setMaintenance] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  const loadStatus = useCallback(async () => {
    setLoading(true)

    try {
      const response = await fetch('/api/admin/system-maintenance', {
        method: 'GET',
        cache: 'no-store',
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || typeof data?.maintenance !== 'boolean') {
        throw new Error(data?.error || 'تعذر قراءة حالة الصيانة.')
      }

      setMaintenance(data.maintenance)
    } catch (error) {
      console.error('Load maintenance status error:', error)
      alert(
        error instanceof Error
          ? error.message
          : 'تعذر قراءة حالة الصيانة.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  async function changeMaintenance(enabled: boolean) {
    const message = enabled
      ? 'هل تريد تفعيل الصيانة؟ سيُمنع المستخدمون العاديون من دخول لوحة التحكم.'
      : 'هل تريد إيقاف الصيانة والسماح للمستخدمين بالدخول مجددًا؟'

    if (!window.confirm(message)) return

    try {
      setUpdating(true)

      const response = await fetch('/api/admin/system-maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          data?.error || 'تعذر تحديث حالة الصيانة.',
        )
      }

      setMaintenance(enabled)

      alert(
        enabled
          ? 'تم تفعيل وضع الصيانة.'
          : 'تم إيقاف وضع الصيانة. النظام متاح الآن.',
      )
    } catch (error) {
      console.error('Update maintenance error:', error)
      alert(
        error instanceof Error
          ? error.message
          : 'تعذر تحديث حالة الصيانة.',
      )
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-start">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="gap-2"
        >
          <ArrowRight className="h-4 w-4" />
          عودة
        </Button>
      </div>

      <PageHeader
        title="وضع الصيانة"
        description="إيقاف وصول المستخدمين مؤقتًا دون إيقاف استضافة النظام."
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <Wrench className="h-5 w-5" />
            </div>

            <div>
              <CardTitle>إدارة الصيانة</CardTitle>
              <CardDescription>
                الصيانة لا تحذف البيانات ولا توقف استضافة التطبيق.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="rounded-xl border p-4">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                جاري قراءة حالة الصيانة...
              </div>
            ) : maintenance === null ? (
              <p className="text-sm text-destructive">
                تعذر تحديد الحالة. حاول تحديثها.
              </p>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-medium">الحالة الحالية</span>

                <span
                  className={
                    maintenance
                      ? 'rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800'
                      : 'rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800'
                  }
                >
                  {maintenance
                    ? 'الصيانة مفعّلة'
                    : 'النظام يعمل بصورة طبيعية'}
                </span>
              </div>
            )}
          </div>

          {!loading && maintenance !== null && (
            <Button
              type="button"
              className="w-full"
              variant={maintenance ? 'default' : 'destructive'}
              onClick={() => void changeMaintenance(!maintenance)}
              disabled={updating}
            >
              {updating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Wrench className="size-4" />
              )}
              {maintenance
                ? 'إيقاف وضع الصيانة'
                : 'تفعيل وضع الصيانة'}
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => void loadStatus()}
            disabled={loading || updating}
          >
            <RefreshCw className="size-4" />
            تحديث الحالة
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
