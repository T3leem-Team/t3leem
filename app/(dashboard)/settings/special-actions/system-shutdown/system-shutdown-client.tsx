
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowRight,
  Download,
  Loader2,
  Power,
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

export default function SystemShutdownClient() {
  const router = useRouter()

  const [loadingBackup, setLoadingBackup] = useState(false)
  const [shuttingDown, setShuttingDown] = useState(false)

  async function downloadBackup() {
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

      alert('بدأ تنزيل النسخة الاحتياطية.')
    } catch (error) {
      console.error('Backup download error:', error)

      alert(
        error instanceof Error
          ? error.message
          : 'تعذر تنزيل النسخة الاحتياطية.',
      )
    } finally {
      setLoadingBackup(false)
    }
  }

  async function shutdownProject() {
    const confirmed = window.confirm(
      'تحذير: سيتم إيقاف مشروع T3LEEM الإنتاجي على Vercel. بعد الإيقاف قد لا تتمكن من استخدام التطبيق حتى تستأنف المشروع من لوحة Vercel. هل أنت متأكد من المتابعة؟',
    )

    if (!confirmed) return

    const finalConfirmation = window.prompt(
      'للتأكيد النهائي، اكتب بالضبط: إيقاف T3LEEM',
    )

    if (finalConfirmation !== 'إيقاف T3LEEM') {
      alert('تم إلغاء الإيقاف؛ لم يتم إرسال الطلب.')
      return
    }

    try {
      setShuttingDown(true)

      const response = await fetch(
        '/api/admin/system-shutdown',
        {
          method: 'POST',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            confirm: 'إيقاف T3LEEM',
          }),
        },
      )

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          result?.error || 'تعذر إرسال طلب الإيقاف إلى Vercel.',
        )
      }

      alert(
        'تم قبول طلب الإيقاف من Vercel. قد يصبح التطبيق غير متاح بعد تنفيذ الإيقاف.',
      )
    } catch (error) {
      console.error('System shutdown request error:', error)

      alert(
        error instanceof Error
          ? error.message
          : 'حدث خطأ أثناء طلب إيقاف المشروع.',
      )
    } finally {
      setShuttingDown(false)
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
          disabled={shuttingDown}
        >
          <ArrowRight className="h-4 w-4" />
          عودة
        </Button>
      </div>

      <PageHeader
        title="الإيقاف الكامل للنظام"
        description="إدارة إيقاف مشروع T3LEEM بشكل منفصل عن وضع الصيانة."
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <Power className="h-5 w-5" />
            </div>

            <div>
              <CardTitle>إيقاف مشروع T3LEEM</CardTitle>
              <CardDescription>
                يرسل طلب إيقاف المشروع الإنتاجي إلى Vercel عبر API مخصص.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />

              <div className="space-y-1">
                <p className="font-semibold">
                  انتبه قبل الإيقاف
                </p>

                <p className="text-sm text-muted-foreground">
                  سيؤدي الإيقاف إلى جعل نسخة الإنتاج غير متاحة مؤقتًا.
                  قاعدة بيانات Supabase منفصلة عن إيقاف المشروع.
                  تأكد من قدرتك على استئناف المشروع من لوحة Vercel.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={downloadBackup}
              disabled={loadingBackup || shuttingDown}
            >
              {loadingBackup ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}

              {loadingBackup
                ? 'جاري تنزيل النسخة...'
                : 'تنزيل نسخة احتياطية'}
            </Button>

            <Button
              type="button"
              variant="destructive"
              className="w-full"
              onClick={shutdownProject}
              disabled={loadingBackup || shuttingDown}
            >
              {shuttingDown ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Power className="size-4" />
              )}

              {shuttingDown
                ? 'جاري إرسال طلب الإيقاف...'
                : 'إيقاف مشروع T3LEEM بالكامل'}
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            لاستعادة الخدمة بعد الإيقاف، افتح لوحة Vercel واستأنف المشروع
            من Settings ثم General ثم Pause Project ثم Resume Project.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
