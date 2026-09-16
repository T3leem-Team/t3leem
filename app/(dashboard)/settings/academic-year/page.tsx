'use client'

import { useState } from 'react'
import { BookOpen, CalendarDays } from 'lucide-react'

import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent } from '@/components/ui/card'

export default function Page() {
  const [activeTab, setActiveTab] = useState<'years' | 'courses'>('years')

  return (
    <div className="space-y-6">
      <PageHeader
        title="السنة الدراسية والدورات"
        description="إدارة السنوات الدراسية والدورات"
      />

      {/* الخيارات الرئيسية */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card
          className={`cursor-pointer transition-colors ${
            activeTab === 'years'
              ? 'border-primary bg-primary/5'
              : 'hover:border-primary/50'
          }`}
          onClick={() => setActiveTab('years')}
        >
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarDays className="size-6" />
            </div>

            <div>
              <h2 className="font-semibold">السنة الدراسية</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                إدارة السنوات الدراسية
              </p>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${
            activeTab === 'courses'
              ? 'border-primary bg-primary/5'
              : 'hover:border-primary/50'
          }`}
          onClick={() => setActiveTab('courses')}
        >
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BookOpen className="size-6" />
            </div>

            <div>
              <h2 className="font-semibold">الدورات</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                إدارة دورات السنة الدراسية
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* المحتوى */}
      <Card>
        <CardContent className="p-6">
          {activeTab === 'years' ? (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">
                السنوات الدراسية
              </h2>

              <p className="text-sm text-muted-foreground">
                هنا ستكون إدارة السنوات الدراسية.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">
                الدورات
              </h2>

              <p className="text-sm text-muted-foreground">
                هنا ستكون إدارة الدورات المرتبطة بالسنة الدراسية.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

