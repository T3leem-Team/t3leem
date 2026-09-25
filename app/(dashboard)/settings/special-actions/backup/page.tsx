'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'

import { PageHeader } from '@/components/dashboard/page-header'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function Page() {
  const [loading, setLoading] = useState(false)

  async function handleBackup() {
    try {
      setLoading(true)

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
    } catch (error) {
      console.error('Backup download error:', error)

      alert(
        'تعذر إنشاء النسخة الاحتياطية. حاول مرة أخرى.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="النسخة الاحتياطية"
        description="تنزيل نسخة من بيانات السنة الدراسية الحالية."
      />

      <Card>
        <CardHeader>
          <CardTitle>نسخة بيانات السنة الحالية</CardTitle>

          <CardDescription>
            سيتم إنشاء ملف Excel يحتوي على بيانات السنة الدراسية
            الحالية فقط، مع وضع كل قسم في ورقة مستقلة.
            وتشمل النسخة الدورات التي انتهت داخل السنة الحالية.
          </CardDescription>
        </CardHeader>

        <CardContent>
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