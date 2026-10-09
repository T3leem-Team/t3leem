
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Archive,
  ArrowRight,
  CheckCircle2,
  Loader2,
  ShieldAlert,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type AcademicYear = {
  id: string
  name: string
  start_date: string | null
  end_date: string | null
  is_current: boolean
  is_active: boolean
}

export default function ArchiveManager() {
  const router = useRouter()

  const [years, setYears] = useState<AcademicYear[]>([])
  const [selectedYearId, setSelectedYearId] = useState('')
  const [loading, setLoading] = useState(true)
  const [archiving, setArchiving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadYears() {
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase
        .from('academic_years')
        .select(
          'id, name, start_date, end_date, is_current, is_active'
        )
        .eq('is_active', true)
        .order('start_date', { ascending: false })

      if (error) {
        setError('تعذر تحميل السنوات الدراسية.')
        setYears([])
      } else {
        setYears(data ?? [])
      }
    } catch {
      setError('تعذر تحميل السنوات الدراسية.')
      setYears([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadYears()
  }, [])

  async function handleArchive() {
    setError('')
    setSuccess('')

    if (!selectedYearId) {
      setError('اختر السنة الدراسية أولاً.')
      return
    }

    const selectedYear = years.find(
      (year) => year.id === selectedYearId
    )

    if (!selectedYear) {
      setError('السنة الدراسية غير موجودة.')
      return
    }

    if (selectedYear.is_current) {
      setError(
        'لا يمكن أرشفة السنة الدراسية الحالية.'
      )
      return
    }

    const confirmed = window.confirm(
      `هل أنت متأكد من أرشفة السنة الدراسية "${selectedYear.name}"؟\n\nالأرشفة لا تحذف البيانات، وستصبح السنة مخصصة للقراءة والمراجعة.`
    )

    if (!confirmed) {
      return
    }

    setArchiving(true)

    try {
      const response = await fetch('/api/admin/archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          yearId: selectedYear.id,
        }),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        setError(
          result?.error ||
            'تعذر تنفيذ الأرشفة. حاول مرة أخرى.'
        )
        return
      }

      setSuccess(
        result?.message ||
          `تمت أرشفة السنة الدراسية "${selectedYear.name}" بنجاح.`
      )

      setSelectedYearId('')

      await loadYears()
    } catch {
      setError(
        'تعذر الاتصال بالخادم لتنفيذ الأرشفة.'
      )
    } finally {
      setArchiving(false)
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

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Archive className="h-5 w-5" />
            </div>

            <div>
              <CardTitle>الأرشفة</CardTitle>

              <CardDescription>
                أرشفة سنة دراسية مكتملة وحفظ بياناتها للمراجعة.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />

              <p className="text-sm leading-6 text-muted-foreground">
                الأرشفة لا تحذف بيانات السنة الدراسية.
                بعد الأرشفة تصبح السنة مخصصة للقراءة
                والمراجعة من قسم الأرشيف.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              السنة الدراسية
            </label>

            <select
              value={selectedYearId}
              onChange={(event) => {
                setSelectedYearId(event.target.value)
                setError('')
                setSuccess('')
              }}
              disabled={loading || archiving}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">
                اختر السنة الدراسية
              </option>

              {years.map((year) => (
                <option
                  key={year.id}
                  value={year.id}
                >
                  {year.name}
                  {year.is_current ? ' — الحالية' : ''}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 p-3 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {success}
            </div>
          )}

          <Button
            type="button"
            onClick={handleArchive}
            disabled={
              loading ||
              archiving ||
              !selectedYearId
            }
          >
            {archiving ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                جارٍ تنفيذ الأرشفة...
              </>
            ) : (
              <>
                <Archive className="ml-2 h-4 w-4" />
                تفعيل الأرشيف
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
