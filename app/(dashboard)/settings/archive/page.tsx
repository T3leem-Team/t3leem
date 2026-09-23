'use client'

import { useEffect, useState } from 'react'
import {
  Archive,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Eye,
  Loader2,
} from 'lucide-react'

import { useRouter } from 'next/navigation'

import { supabase } from '@/lib/supabase'

import { PageHeader } from '@/components/dashboard/page-header'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type AcademicYear = {
  id: string
  name: string
  start_date: string | null
  end_date: string | null
  is_current: boolean
  is_active: boolean
}

export default function Page() {
  const router = useRouter()

  const [years, setYears] = useState<AcademicYear[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadArchivedYears() {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('academic_years')
      .select(
        'id, name, start_date, end_date, is_current, is_active'
      )
      .eq('is_active', false)
      .eq('is_current', false)
      .order('start_date', { ascending: false })

    if (error) {
      setError('تعذر تحميل الأرشيف.')
      setYears([])
    } else {
      setYears(data ?? [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadArchivedYears()
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="الأرشيف"
        description="استعراض السنوات الدراسية المؤرشفة وبياناتها للقراءة والمراجعة."
      />

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/settings')}
        >
          <ArrowRight className="ml-2 h-4 w-4" />
          العودة للإدارة
        </Button>

        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          <Archive className="h-4 w-4" />
          قراءة فقط
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[240px] items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            جارٍ تحميل الأرشيف...
          </div>
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      ) : years.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-[240px] flex-col items-center justify-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Archive className="h-7 w-7 text-muted-foreground" />
            </div>

            <h2 className="mt-4 font-semibold">
              لا توجد سنوات مؤرشفة
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              عند أرشفة سنة دراسية ستظهر هنا.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {years.map((year) => (
            <Card key={year.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Archive className="h-5 w-5" />
                  </div>

                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    مؤرشفة
                  </span>
                </div>

                <CardTitle className="pt-2">
                  {year.name}
                </CardTitle>

                <CardDescription>
                  بيانات السنة متاحة للقراءة والمراجعة فقط.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm text-muted-foreground">
                  {year.start_date && (
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      <span>
                        البداية: {year.start_date}
                      </span>
                    </div>
                  )}

                  {year.end_date && (
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      <span>
                        النهاية: {year.end_date}
                      </span>
                    </div>
                  )}
                </div>

                <Button
                  type="button"
                  className="w-full"
                  onClick={() =>
                    router.push(
                      `/settings/archive/${year.id}`
                    )
                  }
                >
                  <Eye className="ml-2 h-4 w-4" />
                  فتح الأرشيف
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
