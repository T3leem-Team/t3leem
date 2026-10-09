'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  ArrowRight,
  Download,
  Loader2,
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

export default function BackupClient() {
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null)

  async function handleBackup() {
    try {
      setLoading(true)
      setErrorMessage(null)

      const response = await fetch(
        '/api/admin/backup',
        {
          method: 'GET',
          cache: 'no-store',
        },
      )

      /*
       * إذا فشل الـ API، نحاول قراءة
       * رسالة الخطأ الحقيقية.
       */
      if (!response.ok) {
        let message =
          `فشل إنشاء النسخة الاحتياطية. HTTP ${response.status}`

        try {
          const data =
            await response.json()

          if (
            data &&
            typeof data.error === 'string'
          ) {
            message = data.error
          }
        } catch {
          try {
            const text =
              await response.text()

            if (text) {
              message = text
            }
          } catch {
            // نستخدم الرسالة الافتراضية.
          }
        }

        throw new Error(message)
      }

      /*
       * التأكد أن الرد فعلاً Excel.
       */
      const contentType =
        response.headers.get(
          'content-type',
        ) || ''

      if (
        !contentType.includes(
          'spreadsheetml',
        ) &&
        !contentType.includes(
          'application/vnd.ms-excel',
        )
      ) {
        const text =
          await response.text()

        throw new Error(
          text ||
            `الـ API رجع نوع ملف غير متوقع: ${contentType}`,
        )
      }

      const blob =
        await response.blob()

      /*
       * إنشاء رابط التنزيل.
       */
      const url =
        window.URL.createObjectURL(blob)

      const link =
        document.createElement('a')

      link.href = url
      link.download =
        'T3LEEM-Backup.xlsx'

      document.body.appendChild(link)

      link.click()

      link.remove()

      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error(
        'Backup download error:',
        error,
      )

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'حدث خطأ غير معروف.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
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
        title="النسخة الاحتياطية"
        description="تنزيل نسخة من بيانات السنة الدراسية الحالية."
      />

      <Card>
        <CardHeader>
          <CardTitle>
            نسخة بيانات السنة الحالية
          </CardTitle>

          <CardDescription>
            سيتم إنشاء ملف Excel يحتوي
            على بيانات السنة الدراسية
            الحالية، مع وضع كل قسم في
            ورقة مستقلة.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {errorMessage && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <div className="flex gap-3">
                <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />

                <div className="min-w-0">
                  <p className="font-semibold text-destructive">
                    تعذر إنشاء النسخة الاحتياطية
                  </p>

                  <p className="mt-1 break-words text-sm text-muted-foreground">
                    {errorMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          <Button
            type="button"
            onClick={handleBackup}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                جاري تجهيز النسخة...
              </>
            ) : (
              <>
                <Download className="size-4" />
                تنزيل النسخة الاحتياطية
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
