
'use client'

import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Eye,
  LineChart,
  PieChart,
  RefreshCw,
  TrendingUp,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useRouter } from 'next/navigation'

import {
  loadStudentTrackingAnalytics,
} from '@/lib/features/settings/repositories/settings.repository'

import { PageHeader } from '@/components/dashboard/page-header'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import { AnalyticsChart } from '@/components/analytics/analytics-chart'

import {
  calculateConversionRate,
  calculateTotal,
  buildAnalyticsPoints,
} from '@/lib/analytics/engine'

import {
  getAnalyticsDefinition,
} from '@/lib/analytics/definitions'

import type {
  AnalyticsChartType,
  AnalyticsPeriod,
} from '@/lib/analytics/types'

type Period = AnalyticsPeriod
type ChartType = AnalyticsChartType

type AnalyticsRow = {
  tracking_date: string
  visits: number
  real_tracking_opens: number
}

type SupabaseAnalyticsRecord = Record<
  string,
  unknown
>

const analyticsDefinition =
  getAnalyticsDefinition(
    'student_tracking',
  )

const periodOptions: {
  value: Period
  label: string
}[] = [
  {
    value: 'daily',
    label: 'اليومي',
  },
  {
    value: 'weekly',
    label: 'الأسبوعي',
  },
  {
    value: 'monthly',
    label: 'الشهري',
  },
  {
    value: 'yearly',
    label: 'السنوي',
  },
]

const chartOptions: {
  value: ChartType
  label: string
  icon: typeof LineChart
}[] = [
  {
    value: 'line',
    label: 'خطي',
    icon: LineChart,
  },
  {
    value: 'bar',
    label: 'أعمدة',
    icon: BarChart3,
  },
  {
    value: 'area',
    label: 'مساحة',
    icon: TrendingUp,
  },
  {
    value: 'donut',
    label: 'دائري',
    icon: PieChart,
  },
]

/**
 * التقويم المستخدم في التحليلات ميلادي فقط.
 */
const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function getBahrainDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bahrain',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function getDateParts(
  dateString: string,
) {
  const [
    year,
    month,
    day,
  ] = dateString
    .split('-')
    .map(Number)

  return {
    year,
    month,
    day,
  }
}

function getDateRange(
  period: Period,
) {
  const today =
    getBahrainDate()

  const {
    year,
    month,
    day,
  } = getDateParts(today)

  const current = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
    ),
  )

  let from = today
  let to = today

  if (period === 'daily') {
    from = today
    to = today
  }

  if (period === 'weekly') {
    const dayOfWeek =
      current.getUTCDay()

    const start =
      new Date(current)

    start.setUTCDate(
      current.getUTCDate() -
        dayOfWeek,
    )

    const end =
      new Date(start)

    end.setUTCDate(
      start.getUTCDate() + 6,
    )

    from = start
      .toISOString()
      .slice(0, 10)

    to = end
      .toISOString()
      .slice(0, 10)
  }

  if (period === 'monthly') {
    const start =
      new Date(
        Date.UTC(
          year,
          month - 1,
          1,
        ),
      )

    const end =
      new Date(
        Date.UTC(
          year,
          month,
          0,
        ),
      )

    from = start
      .toISOString()
      .slice(0, 10)

    to = end
      .toISOString()
      .slice(0, 10)
  }

  if (period === 'yearly') {
    const start =
      new Date(
        Date.UTC(
          year,
          0,
          1,
        ),
      )

    const end =
      new Date(
        Date.UTC(
          year,
          11,
          31,
        ),
      )

    from = start
      .toISOString()
      .slice(0, 10)

    to = end
      .toISOString()
      .slice(0, 10)
  }

  return {
    from,
    to,
    year,
  }
}

function formatDateLabel(
  dateString: string,
  period: Period,
) {
  const {
    month,
    day,
  } = getDateParts(
    dateString,
  )

  if (
    period === 'daily' ||
    period === 'monthly' ||
    period === 'weekly'
  ) {
    return `${day}/${month}`
  }

  return monthNames[
    month - 1
  ]
}

function formatNumber(
  value: number,
) {
  return new Intl.NumberFormat(
    'ar-BH',
  ).format(value)
}

function getConversionRate(
  visits: number,
  realTrackingOpens: number,
) {
  if (!visits) {
    return 0
  }

  return Math.min(
    100,
    (realTrackingOpens /
      visits) *
      100,
  )
}

export default function StudentTrackingAnalyticsPage() {
  const router =
    useRouter()

  const [period, setPeriod] =
    useState<Period>(
      'weekly',
    )

  const [
    chartType,
    setChartType,
  ] = useState<ChartType>(
    'line',
  )

  const [rows, setRows] =
    useState<AnalyticsRow[]>([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState<string | null>(null)

  const [
    lastUpdated,
    setLastUpdated,
  ] = useState<Date | null>(null)

  const range = useMemo(
    () =>
      getDateRange(
        period,
      ),
    [period],
  )

  const loadAnalytics =
    useCallback(
      async () => {
        setLoading(true)
        setError(null)

        if (!analyticsDefinition) {
          setRows([])
          setError(
            'تعريف التحليل غير موجود.',
          )
          setLastUpdated(
            new Date(),
          )
          setLoading(false)
          return
        }

        const {
          data,
          error: supabaseError,
        } = await loadStudentTrackingAnalytics(
          range.from,
          range.to,
        )

        if (supabaseError) {
          console.error(
            'Student tracking analytics error:',
            supabaseError,
          )

          setRows([])

          setError(
            'تعذر تحميل بيانات التحليلات.',
          )
        } else {
          const records =
            (data ??
              []) as unknown as SupabaseAnalyticsRecord[]

          setRows(
            records.map(
              (row): AnalyticsRow => ({
                tracking_date: String(
                  row[
                    analyticsDefinition.dateColumn
                  ] ?? '',
                ),

                visits: Number(
                  row['visits'] ?? 0,
                ),

                real_tracking_opens: Number(
                  row['real_tracking_opens'] ??
                    0,
                ),
              }),
            ),
          )
        }

        setLastUpdated(
          new Date(),
        )

        setLoading(false)
      },
      [
        range.from,
        range.to,
      ],
    )

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  const chartPoints =
    useMemo(() => {
      if (!analyticsDefinition) {
        return []
      }

      return buildAnalyticsPoints(
        rows,
        period,
        analyticsDefinition,
        formatDateLabel,
        monthNames,
        range.year,
      )
    }, [
      rows,
      period,
      range.year,
    ])

  const totals =
    useMemo(() => {
      return {
        visits:
          calculateTotal(
            rows,
            'visits',
          ),

        realTrackingOpens:
          calculateTotal(
            rows,
            'real_tracking_opens',
          ),
      }
    }, [rows])

  const conversionRate =
    useMemo(
      () =>
        calculateConversionRate(
          rows,
          'real_tracking_opens',
          'visits',
        ),
      [rows],
    )

  /**
   * المتوسط يعتمد على نقاط الرسم نفسها.
   * مهم خصوصاً في التحليل السنوي،
   * لأن السنة تحتوي على 12 شهراً حتى لو بعض الأشهر صفر.
   */
  const averageVisits =
    useMemo(() => {
      if (!chartPoints.length) {
        return 0
      }

      const total =
        chartPoints.reduce(
          (sum, point) =>
            sum +
            Number(
              point.values.visits ??
                0,
            ),
          0,
        )

      return (
        total /
        chartPoints.length
      )
    }, [chartPoints])

  const periodLabel =
    useMemo(() => {
      if (period === 'daily') {
        return 'اليوم'
      }

      if (
        period === 'weekly'
      ) {
        return 'هذا الأسبوع'
      }

      if (
        period === 'monthly'
      ) {
        return 'هذا الشهر'
      }

      return `عام ${range.year}`
    }, [
      period,
      range.year,
    ])

  return (
    <div
      dir="rtl"
      className="space-y-6"
    >
      <PageHeader
        title="تحليل زيارة صفحة متابعة الطلاب"
        description="تحليل زيارات صفحة متابعة الطلاب وعمليات فتح التتبع الفعلي."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={() =>
            router.push(
              '/settings/analytics',
            )
          }
        >
          <ArrowRight className="ml-2 h-4 w-4" />
          العودة للتحليلات
        </Button>

        <Button
          variant="outline"
          onClick={loadAnalytics}
          disabled={loading}
        >
          <RefreshCw
            className={`ml-2 h-4 w-4 ${
              loading
                ? 'animate-spin'
                : ''
            }`}
          />

          تحديث البيانات
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>
                الفترة الزمنية
              </CardTitle>

              <CardDescription>
                اختر الفترة التي تريد تحليلها.
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              {periodOptions.map(
                (option) => (
                  <Button
                    key={option.value}
                    variant={
                      period === option.value
                        ? 'default'
                        : 'outline'
                    }
                    onClick={() =>
                      setPeriod(
                        option.value,
                      )
                    }
                  >
                    <CalendarDays className="ml-2 h-4 w-4" />

                    {option.label}
                  </Button>
                ),
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {error && (
        <Card>
          <CardContent className="pt-6">
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Eye className="h-5 w-5 text-primary" />
              </div>

              <span className="text-sm text-muted-foreground">
                إجمالي الزيارات
              </span>
            </div>

            <p className="text-3xl font-bold">
              {loading
                ? '—'
                : formatNumber(
                    totals.visits,
                  )}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              {periodLabel}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>

              <span className="text-sm text-muted-foreground">
                فتح التتبع الفعلي
              </span>
            </div>

            <p className="text-3xl font-bold">
              {loading
                ? '—'
                : formatNumber(
                    totals.realTrackingOpens,
                  )}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              إدخال صحيح والوصول لبيانات التتبع
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                <BarChart3 className="h-5 w-5 text-amber-500" />
              </div>

              <span className="text-sm text-muted-foreground">
                نسبة التحول
              </span>
            </div>

            <p className="text-3xl font-bold">
              {loading
                ? '—'
                : `${conversionRate.toFixed(1)}%`}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              من الزيارة إلى فتح التتبع الفعلي
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10">
                <LineChart className="h-5 w-5 text-sky-500" />
              </div>

              <span className="text-sm text-muted-foreground">
                متوسط الزيارات
              </span>
            </div>

            <p className="text-3xl font-bold">
              {loading
                ? '—'
                : averageVisits.toFixed(1)}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              متوسط نقاط الفترة المحددة
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>
                الرسم البياني
              </CardTitle>

              <CardDescription>
                {period === 'yearly'
                  ? `تجميع البيانات اليومية حسب أشهر عام ${range.year}`
                  : `عرض بيانات ${periodLabel}`}
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              {chartOptions.map(
                (option) => {
                  const Icon =
                    option.icon

                  return (
                    <Button
                      key={option.value}
                      variant={
                        chartType === option.value
                          ? 'default'
                          : 'outline'
                      }
                      onClick={() =>
                        setChartType(
                          option.value,
                        )
                      }
                    >
                      <Icon className="ml-2 h-4 w-4" />

                      {option.label}
                    </Button>
                  )
                },
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
              جاري تحميل البيانات...
            </div>
          ) : (
            <AnalyticsChart
              type={chartType}
              data={chartPoints}
              metrics={
                analyticsDefinition?.metrics ??
                []
              }
              formatNumber={formatNumber}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            التفاصيل
          </CardTitle>

          <CardDescription>
            البيانات المستخدمة في التحليل للفترة المحددة.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              جاري تحميل البيانات...
            </div>
          ) : chartPoints.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              لا توجد بيانات للفترة المحددة.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-right font-medium">
                      الفترة
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      الزيارات
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      فتح التتبع الفعلي
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      نسبة التحول
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {chartPoints.map(
                    (point, index) => {
                      const visits =
                        Number(
                          point.values.visits ??
                            0,
                        )

                      const realTrackingOpens =
                        Number(
                          point.values.real_tracking_opens ??
                            0,
                        )

                      return (
                        <tr
                          key={`${point.label}-${index}`}
                          className="border-b last:border-0"
                        >
                          <td className="px-4 py-3 font-medium">
                            {point.label}
                          </td>

                          <td className="px-4 py-3">
                            {formatNumber(
                              visits,
                            )}
                          </td>

                          <td className="px-4 py-3">
                            {formatNumber(
                              realTrackingOpens,
                            )}
                          </td>

                          <td className="px-4 py-3">
                            {getConversionRate(
                              visits,
                              realTrackingOpens,
                            ).toFixed(1)}
                            %
                          </td>
                        </tr>
                      )
                    },
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {lastUpdated && (
        <div className="text-center text-xs text-muted-foreground">
          آخر تحديث:{' '}
          {lastUpdated.toLocaleTimeString(
            'ar-BH',
            {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            },
          )}
        </div>
      )}
    </div>
  )
}
