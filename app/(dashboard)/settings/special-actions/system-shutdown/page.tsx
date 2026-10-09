'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowRight,
  Download,
  Loader2,
  Power,
  RefreshCw,
  X,
} from 'lucide-react'

import { PageHeader } from '@/components/dashboard/page-header'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type Step =
  | 'idle'
  | 'backup-choice'
  | 'countdown'
  | 'disabling'

export default function Page() {
  const router = useRouter()

  const [step, setStep] = useState<Step>('idle')
  const [countdown, setCountdown] = useState(10)
  const [loadingBackup, setLoadingBackup] = useState(false)
  const [maintenance, setMaintenance] = useState<boolean | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [updating, setUpdating] = useState(false)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)

  const clearCountdown = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const loadStatus = useCallback(async () => {
    try {
      setLoadingStatus(true)

      const response = await fetch(
        '/api/admin/system-maintenance',
        { method: 'GET', cache: 'no-store' },
      )

      if (!response.ok) {
        throw new Error('تعذر قراءة حالة الصيانة.')
      }

      const data = await response.json()

      if (typeof data.maintenance !== 'boolean') {
        throw new Error('حالة الصيانة غير صحيحة.')
      }

      setMaintenance(data.maintenance)
    } catch (error) {
      console.error('Load maintenance status error:', error)
      alert('تعذر قراءة حالة الصيانة. حاول تحديث الصفحة.')
    } finally {
      setLoadingStatus(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    void loadStatus()

    return () => {
      mountedRef.current = false
      clearCountdown()
    }
  }, [loadStatus, clearCountdown])

  function cancelShutdown() {
    clearCountdown()
    setStep('idle')
    setCountdown(10)
  }

  function startShutdown() {
    setStep('backup-choice')
  }

  async function downloadBackupFirst() {
    try {
      setLoadingBackup(true)

      const response = await fetch('/api/admin/backup', {
        method: 'GET',
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error('تعذر تنزيل النسخة الاحتياطية.')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = 'T3LEEM-Backup.xlsx'

      document.body.appendChild(link)
      link.click()
      link.remove()

      window.setTimeout(() => {
        window.URL.revokeObjectURL(url)
      }, 1000)

      startCountdown()
    } catch (error) {
      console.error('Backup before maintenance error:', error)

      alert(
        'تعذر تنزيل النسخة الاحتياطية، لذلك لم يتم تفعيل الصيانة.',
      )
    } finally {
      setLoadingBackup(false)
    }
  }

  function startCountdown() {
    clearCountdown()
    setCountdown(10)
    setStep('countdown')

    let remaining = 10

    intervalRef.current = window.setInterval(() => {
      remaining -= 1
      setCountdown(remaining)

      if (remaining <= 0) {
        clearCountdown()
        void enableMaintenance()
      }
    }, 1000)
  }

  async function enableMaintenance() {
    try {
      setStep('disabling')
      setUpdating(true)

      const response = await fetch(
        '/api/admin/system-maintenance',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ enabled: true }),
        },
      )

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          data?.error || 'تعذر تفعيل وضع الصيانة.',
        )
      }

      setMaintenance(true)
      setStep('idle')

      alert('تم تفعيل وضع الصيانة بنجاح.')
    } catch (error) {
      console.error('Enable maintenance error:', error)

      alert(
        error instanceof Error
          ? error.message
          : 'تعذر تفعيل وضع الصيانة.',
      )

      setStep('idle')
      setCountdown(10)
    } finally {
      setUpdating(false)
    }
  }

  async function disableMaintenance() {
    const confirmed = window.confirm(
      'هل تريد إيقاف وضع الصيانة والسماح للمستخدمين بالدخول مجددًا؟',
    )

    if (!confirmed) return

    try {
      setUpdating(true)

      const response = await fetch(
        '/api/admin/system-maintenance',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ enabled: false }),
        },
      )

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          data?.error || 'تعذر إيقاف وضع الصيانة.',
        )
      }

      setMaintenance(false)
      alert('تم إيقاف وضع الصيانة. النظام متاح الآن.')
    } catch (error) {
      console.error('Disable maintenance error:', error)

      alert(
        error instanceof Error
          ? error.message
          : 'تعذر إيقاف وضع الصيانة.',
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
          onClick={() => router.back()}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <ArrowRight className="h-4 w-4" />
          عودة
        </Button>
      </div>

      <PageHeader
        title="إدارة وضع الصيانة"
        description="إيقاف وصول المستخدمين مؤقتًا دون إيقاف استضافة النظام."
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <Power className="h-5 w-5" />
            </div>

            <div>
              <CardTitle>حالة النظام</CardTitle>
              <CardDescription>
                لا يؤدي وضع الصيانة إلى حذف البيانات أو إيقاف Supabase.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="rounded-xl border p-4">
            {loadingStatus ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                جاري قراءة حالة النظام...
              </div>
            ) : maintenance === null ? (
              <p className="text-sm text-destructive">
                تعذر تحديد حالة النظام. حدّث الصفحة وحاول مجددًا.
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
                    ? 'وضع الصيانة مفعّل'
                    : 'النظام يعمل بصورة طبيعية'}
                </span>
              </div>
            )}
          </div>

          {!loadingStatus && maintenance === false && (
            <>
              {step === 'idle' && (
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full"
                  onClick={startShutdown}
                  disabled={updating}
                >
                  <Power className="size-4" />
                  تفعيل وضع الصيانة
                </Button>
              )}

              {step === 'backup-choice' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                    <div className="flex gap-3">
                      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />

                      <div className="space-y-1">
                        <p className="font-semibold">
                          هل تريد تنزيل نسخة احتياطية قبل الصيانة؟
                        </p>
                        <p className="text-sm text-muted-foreground">
                          يمكنك تنزيل النسخة أو المتابعة من دونها.
                          لن تُحذف أي بيانات عند تفعيل الصيانة.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    <Button
                      type="button"
                      onClick={downloadBackupFirst}
                      disabled={loadingBackup || updating}
                    >
                      {loadingBackup ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          جاري التنزيل...
                        </>
                      ) : (
                        <>
                          <Download className="size-4" />
                          تنزيل النسخة ثم المتابعة
                        </>
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="destructive"
                      onClick={startCountdown}
                      disabled={loadingBackup || updating}
                    >
                      متابعة دون نسخة
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={cancelShutdown}
                      disabled={loadingBackup || updating}
                    >
                      <X className="size-4" />
                      إلغاء
                    </Button>
                  </div>
                </div>
              )}

              {step === 'countdown' && (
                <div className="space-y-4">
                  <div className="rounded-xl border p-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      سيتم تفعيل وضع الصيانة خلال
                    </p>

                    <div className="my-3 text-6xl font-bold tabular-nums">
                      {countdown}
                    </div>

                    <p className="text-sm text-muted-foreground">
                      يمكنك إلغاء العملية قبل انتهاء العد التنازلي.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={cancelShutdown}
                  >
                    <X className="size-4" />
                    إلغاء الصيانة
                  </Button>
                </div>
              )}

              {step === 'disabling' && (
                <div className="rounded-xl border p-6 text-center">
                  <Loader2 className="mx-auto mb-3 size-8 animate-spin" />
                  <p className="font-semibold">
                    جاري تفعيل وضع الصيانة...
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    يرجى الانتظار.
                  </p>
                </div>
              )}
            </>
          )}

          {!loadingStatus && maintenance === true && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                المستخدمون العاديون سيشاهدون صفحة الصيانة، بينما يستطيع
                المسؤول الرئيسي الدخول لإدارة النظام.
              </p>

              <Button
                type="button"
                className="w-full"
                onClick={disableMaintenance}
                disabled={updating}
              >
                {updating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                إيقاف وضع الصيانة
              </Button>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => void loadStatus()}
            disabled={loadingStatus || updating}
          >
            <RefreshCw className="size-4" />
            تحديث حالة النظام
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
