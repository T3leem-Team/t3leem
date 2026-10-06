'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowRight,
  Download,
  Loader2,
  Power,
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

  function startShutdown() {
    setStep('backup-choice')
  }

  function cancelShutdown() {
    setStep('idle')
    setCountdown(10)
  }

  async function downloadBackupFirst() {
    try {
      setLoadingBackup(true)

      const response = await fetch('/api/admin/backup', {
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error('تعذر إنشاء النسخة الاحتياطية.')
      }

      const blob = await response.blob()

      const url = window.URL.createObjectURL(blob)

      const link = document.createElement('a')

      link.href = url
      link.download = 'T3LEEM-Backup.xlsx'

      document.body.appendChild(link)

      link.click()

      link.remove()

      window.URL.revokeObjectURL(url)

      startCountdown()
    } catch (error) {
      console.error('Backup before shutdown error:', error)

      alert(
        'تعذر تنزيل النسخة الاحتياطية، لذلك لم يتم تعطيل النظام.',
      )
    } finally {
      setLoadingBackup(false)
    }
  }

  function startCountdown() {
    setCountdown(10)
    setStep('countdown')

    let remaining = 10

    const interval = window.setInterval(() => {
      remaining -= 1

      setCountdown(remaining)

      if (remaining <= 0) {
        window.clearInterval(interval)
        disableSystem()
      }
    }, 1000)
  }

  async function disableSystem() {
    try {
      setStep('disabling')

      const response = await fetch(
        '/api/admin/system-shutdown',
        {
          method: 'POST',
        },
      )

      if (!response.ok) {
        throw new Error('تعذر تعطيل النظام.')
      }

      window.location.href = '/404'
    } catch (error) {
      console.error('System shutdown error:', error)

      alert(
        'تعذر تعطيل النظام. لم يتم تنفيذ العملية.',
      )

      setStep('idle')
      setCountdown(10)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
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
        title="تعطيل النظام"
        description="تعطيل الوصول إلى النظام بالكامل."
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <Power className="h-5 w-5" />
            </div>

            <div>
              <CardTitle>تعطيل النظام بالكامل</CardTitle>

              <CardDescription>
                عند التعطيل سيتم منع الوصول إلى الموقع ولوحة التحكم
                وواجهات النظام.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {step === 'idle' && (
            <Button
              type="button"
              variant="destructive"
              className="w-full"
              onClick={startShutdown}
            >
              <Power className="size-4" />
              تعطيل النظام
            </Button>
          )}

          {step === 'backup-choice' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />

                  <div className="space-y-1">
                    <p className="font-semibold">
                      هل تريد تنزيل نسخة احتياطية قبل التعطيل؟
                    </p>

                    <p className="text-sm text-muted-foreground">
                      النسخة الاحتياطية اختيارية، ولن يتم حذف أي بيانات
                      من النظام.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <Button
                  type="button"
                  onClick={downloadBackupFirst}
                  disabled={loadingBackup}
                >
                  {loadingBackup ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      جاري التنزيل...
                    </>
                  ) : (
                    <>
                      <Download className="size-4" />
                      نعم، تنزيل النسخة ثم التعطيل
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="destructive"
                  onClick={startCountdown}
                  disabled={loadingBackup}
                >
                  لا، تعطيل مباشرة
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={cancelShutdown}
                  disabled={loadingBackup}
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
                  سيتم تعطيل النظام خلال
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
                إلغاء التعطيل
              </Button>
            </div>
          )}

          {step === 'disabling' && (
            <div className="rounded-xl border p-6 text-center">
              <Loader2 className="mx-auto mb-3 size-8 animate-spin" />

              <p className="font-semibold">
                جاري تعطيل النظام...
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                يرجى الانتظار.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}