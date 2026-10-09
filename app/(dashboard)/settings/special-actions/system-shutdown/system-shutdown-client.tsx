
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowRight,
  Download,
  ExternalLink,
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
  const [openingVercel, setOpeningVercel] = useState(false)

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

  function openVercel() {
    const confirmed = window.confirm(
      'سيتم فتح لوحة Vercel لإيقاف المشروع يدويًا. هل تريد المتابعة؟',
    )

    if (!confirmed) return

    setOpeningVercel(true)

    try {
      window.open(
        'https://vercel.com/dashboard',
        '_blank',
        'noopener,noreferrer',
      )
    } finally {
      setOpeningVercel(false)
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
                يتم الإيقاف الكامل من لوحة تحكم Vercel، وليس من وضع الصيانة.
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
                  إيقاف مشروع Vercel يؤثر على إمكانية الوصول إلى التطبيق.
                  لا يعني ذلك حذف قاعدة بيانات Supabase أو إيقافها.
                  يُفضّل التأكد من وجود نسخة احتياطية قبل المتابعة.
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
              disabled={loadingBackup || openingVercel}
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
              onClick={openVercel}
              disabled={loadingBackup || openingVercel}
            >
              {openingVercel ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ExternalLink className="size-4" />
              )}

              الانتقال إلى Vercel للإيقاف الكامل
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            بعد فتح Vercel، اختر مشروع T3LEEM واستخدم خيار Pause Project
            إذا كان متاحًا. هذا الزر يفتح لوحة Vercel فقط؛ ولا يوقف المشروع
            تلقائيًا.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
