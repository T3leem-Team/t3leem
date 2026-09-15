import { UserPlus } from 'lucide-react'

import { PageHeader } from '@/components/dashboard/page-header'
import { StatusBadge } from '@/components/dashboard/status-badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { teachers } from '@/lib/data'

export default function TeachersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="المعلمون"
        description={`${teachers.length} معلماً ومعلمة ضمن هيئة التدريس`}
        action={
          <Button>
            <UserPlus className="size-4" />
            إضافة معلم
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {teachers.map((teacher) => {
          const initials = teacher.name
            .replace(/^أ\.?\s*/, '')
            .split(' ')
            .slice(0, 2)
            .map((w) => w[0])
            .join(' ')
          return (
            <Card key={teacher.id}>
              <CardHeader className="flex-row items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {initials}
                </span>
                <div className="min-w-0 space-y-1">
                  <CardTitle className="truncate text-sm">
                    {teacher.name}
                  </CardTitle>
                  <CardDescription>{teacher.subject}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">عدد الفصول</span>
                  <span className="font-medium tabular-nums">
                    {teacher.classes}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">عدد الطلاب</span>
                  <span className="font-medium tabular-nums">
                    {teacher.students}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <StatusBadge status={teacher.status} />
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {teacher.id}
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
