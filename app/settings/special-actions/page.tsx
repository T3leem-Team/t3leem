'use client'

import { useRouter } from 'next/navigation'
import {
  Archive,
  Award,
  Download,
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

export default function Page() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <PageHeader
        title="الإجراءات الإدارية الخاصة"
        description="اختر الإجراء الإداري الذي تريد تنفيذه."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {/* التكريم */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Award className="h-5 w-5" />
              </div>

              <div>
                <CardTitle>التكريم</CardTitle>

                <CardDescription>
                  حساب وعرض نتائج تكريم الطلاب بناءً على الحضور.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <Button
              type="button"
              className="w-full"
              onClick={() =>
                router.push(
                  '/settings/special-actions/attendance-awards',
                )
              }
            >
              فتح التكريم
            </Button>
          </CardContent>
        </Card>

        {/* الأرشفة */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Archive className="h-5 w-5" />
              </div>

              <div>
                <CardTitle>الأرشفة</CardTitle>

                <CardDescription>
                  أرشفة السنوات الدراسية المكتملة والاحتفاظ ببياناتها.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <Button
              type="button"
              className="w-full"
              onClick={() =>
                router.push(
                  '/settings/special-actions/archive',
                )
              }
            >
              فتح الأرشفة
            </Button>
          </CardContent>
        </Card>

        {/* النسخة الاحتياطية */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Download className="h-5 w-5" />
              </div>

              <div>
                <CardTitle>النسخة الاحتياطية</CardTitle>

                <CardDescription>
                  تنزيل نسخة Excel من بيانات السنة الدراسية الحالية،
                  مع وضع كل قسم في ورقة مستقلة.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <Button
              type="button"
              className="w-full"
              onClick={() =>
                router.push(
                  '/settings/special-actions/backup',
                )
              }
            >
              فتح النسخة الاحتياطية
            </Button>
          </CardContent>
        </Card>

        {/* تعطيل النظام */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <Power className="h-5 w-5" />
              </div>

              <div>
                <CardTitle>تعطيل النظام</CardTitle>

                <CardDescription>
                  تعطيل الوصول إلى النظام بالكامل. سيتم تأكيد العملية
                  قبل بدء الإغلاق.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <Button
              type="button"
              variant="destructive"
              className="w-full"
              onClick={() =>
                router.push(
                  '/settings/special-actions/system-shutdown',
                )
              }
            >
              فتح تعطيل النظام
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
