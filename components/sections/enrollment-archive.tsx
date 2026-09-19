'use client'

import {
  Archive,
  FileSpreadsheet,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
} from '@/components/ui/card'

type Props = {
  onClose: () => void
}

export function EnrollmentArchive({
  onClose,
}: Props) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <div className="flex items-center gap-2">
              <Archive className="size-5" />

              <h2 className="text-lg font-semibold">
                استيراد إلى الأرشيف
              </h2>
            </div>

            <p className="mt-1 text-sm text-muted-foreground">
              استيراد سجلات السنوات السابقة إلى الأرشيف.
            </p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="space-y-4 p-5">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="mt-0.5 size-5 text-muted-foreground" />

                <div>
                  <h3 className="font-semibold">
                    قسم الأرشيف
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    هذا القسم مستقل عن استيراد طلبات التسجيل الحالية.
                    سنجهز له قالب Excel وقاعدة بيانات الأرشيف الخاصة به
                    عند بناء نظام الأرشيف.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            سيتم إعداد استيراد الأرشيف في صفحة الأرشيف الخاصة به،
            ولن يتم إدخال أي سجل إلى جدول الطلاب أو طلبات التسجيل الحالية من هذا الخيار.
          </div>

          <div className="flex justify-end border-t pt-4">
            <Button
              variant="outline"
              onClick={onClose}
            >
              إغلاق
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
