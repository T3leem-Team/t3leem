'use client'

import { useRouter } from 'next/navigation'
import { Archive, Award } from 'lucide-react'

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
                  '/settings/special-actions/attendance-awards'
                )
              }
            >
              فتح التكريم
            </Button>
          </CardContent>
        </Card>

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
                  '/settings/special-actions/archive'
                )
              }
            >
              فتح الأرشفة
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}