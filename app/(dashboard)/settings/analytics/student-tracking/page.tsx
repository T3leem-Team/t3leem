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

import { useCallback, useEffect, useMemo, useState } from 'react'
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

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly'
type ChartType = 'line' | 'bar' | 'area' | 'donut'

type AnalyticsRow = {
  tracking_date: string
  visits: number | null
  real_tracking_opens: number | null
}

type ChartPoint = {
  label: string
  fullLabel: string
  visits: number
  realTrackingOpens: number
}

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

function getTodayString() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bahrain',
  }).format(new Date())
}

function parseDate(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number)

  return new Date(
    Date.UTC(
      year,
      month - 1,
      day,
    ),
  )
}

function formatDateForDisplay(
  dateString: string,
  options: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat('ar-BH', {
    timeZone: 'Asia/Bahrain',
    ...options,
  }).format(parseDate(dateString))
}

function addDays(dateString: string, amount: number) {
  const date = parseDate(dateString)

  date.setUTCDate(date.getUTCDate() + amount)

  return date.toISOString().slice(0, 10)
}

function startOfWeek(dateString: string) {
  const date = parseDate(dateString)

  const day = date.getUTCDay()

  const difference = day === 0 ? -6 : 1 - day

  date.setUTCDate(date.getUTCDate() + difference)

  return date.toISOString().slice(0, 10)
}

function startOfMonth(dateString: string) {
  const date = parseDate(dateString)

  date.setUTCDate(1)

  return date.toISOString().slice(0, 10)
}

function startOfYear(dateString: string) {
  const date = parseDate(dateString)

  date.setUTCMonth(0, 1)

  return date.toISOString().slice(0, 10)
}

function endOfMonth(dateString: string) {
  const date = parseDate(dateString)

  date.setUTCMonth(date.getUTCMonth() + 1, 0)

  return date.toISOString().slice(0, 10)
}

function endOfYear(dateString: string) {
  const date = parseDate(dateString)

  date.setUTCMonth(11, 31)

  return date.toISOString().slice(0, 10)
}

function getDateRange(period: Period, today: string) {
  if (period === 'daily') {
    return {
      from: today,
      to: today,
    }
  }

  if (period === 'weekly') {
    const from = startOfWeek(today)

    return {
      from,
      to: addDays(from, 6),
    }
  }

  if (period === 'monthly') {
    return {
      from: startOfMonth(today),
      to: endOfMonth(today),
    }
  }

  return {
    from: startOfYear(today),
    to: endOfYear(today),
  }
}

function buildChartPoints(
  rows: AnalyticsRow[],
  period: Period,
  today: string,
): ChartPoint[] {
  const rowMap = new Map<string, AnalyticsRow>()

  rows.forEach((row) => {
    rowMap.set(row.tracking_date, row)
  })

  if (period === 'daily') {
    const row = rowMap.get(today)

    return [
      {
        label: 'اليوم',
        fullLabel: formatDateForDisplay(today, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        visits: Number(row?.visits ?? 0),
        realTrackingOpens: Number(
          row?.real_tracking_opens ?? 0,
        ),
      },
    ]
  }

  if (period === 'weekly') {
    const from = startOfWeek(today)

    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(from, index)
      const row = rowMap.get(date)

      return {
        label: formatDateForDisplay(date, {
          weekday: 'short',
        }),
        fullLabel: formatDateForDisplay(date, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        visits: Number(row?.visits ?? 0),
        realTrackingOpens: Number(
          row?.real_tracking_opens ?? 0,
        ),
      }
    })
  }

  if (period === 'monthly') {
    const from = startOfMonth(today)
    const to = endOfMonth(today)

    const fromDate = parseDate(from)
    const toDate = parseDate(to)

    const days =
      Math.floor(
        (toDate.getTime() - fromDate.getTime()) /
          (24 * 60 * 60 * 1000),
      ) + 1

    return Array.from({ length: days }, (_, index) => {
      const date = addDays(from, index)
      const row = rowMap.get(date)

      return {
        label: formatDateForDisplay(date, {
          day: 'numeric',
        }),
        fullLabel: formatDateForDisplay(date, {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        visits: Number(row?.visits ?? 0),
        realTrackingOpens: Number(
          row?.real_tracking_opens ?? 0,
        ),
      }
    })
  }

  const year = parseDate(today).getUTCFullYear()

  return Array.from({ length: 12 }, (_, index) => {
    const month = String(index + 1).padStart(2, '0')
    const date = `${year}-${month}-01`

    const row = rowMap.get(date)

    return {
      label: formatDateForDisplay(date, {
        month: 'short',
      }),
      fullLabel: formatDateForDisplay(date, {
        month: 'long',
        year: 'numeric',
      }),
      visits: Number(row?.visits ?? 0),
      realTrackingOpens: Number(
        row?.real_tracking_opens ?? 0,
      ),
    }
  })
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('ar-BH').format(value)
}

function getMaxValue(points: ChartPoint[]) {
  const max = Math.max(
    0,
    ...points.map((point) =>
      Math.max(
        point.visits,
        point.realTrackingOpens,
      ),
    ),
  )

  return max || 1
}

function LineChartView({
  points,
}: {
  points: ChartPoint[]
}) {
  const width = 900
  const height = 340
  const paddingLeft = 55
  const paddingRight = 25
  const paddingTop = 25
  const paddingBottom = 55

  const chartWidth =
    width - paddingLeft - paddingRight

  const chartHeight =
    height - paddingTop - paddingBottom

  const maxValue = getMaxValue(points)

  const getX = (index: number) => {
    if (points.length === 1) {
      return width / 2
    }

    return (
      paddingLeft +
      (index / (points.length - 1)) *
        chartWidth
    )
  }

  const getY = (value: number) =>
    paddingTop +
    chartHeight -
    (value / maxValue) * chartHeight

  const visitsPoints = points
    .map(
      (point, index) =>
        `${getX(index)},${getY(point.visits)}`,
    )
    .join(' ')

  const trackingPoints = points
    .map(
      (point, index) =>
        `${getX(index)},${getY(
          point.realTrackingOpens,
        )}`,
    )
    .join(' ')

  const gridLines = [0, 0.25, 0.5, 0.75, 1]

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="min-w-[650px] w-full"
      >
        {gridLines.map((ratio) => {
          const y =
            paddingTop +
            chartHeight -
            ratio * chartHeight

          const value = Math.round(
            ratio * maxValue,
          )

          return (
            <g key={ratio}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                stroke="currentColor"
                className="text-border"
                strokeWidth="1"
              />

              <text
                x={paddingLeft - 10}
                y={y + 4}
                textAnchor="end"
                className="fill-muted-foreground text-[12px]"
              >
                {formatNumber(value)}
              </text>
            </g>
          )
        })}

        <polyline
          points={visitsPoints}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary"
        />

        <polyline
          points={trackingPoints}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="7 6"
          className="text-emerald-500"
        />

        {points.map((point, index) => {
          const x = getX(index)

          return (
            <g key={point.fullLabel}>
              <circle
                cx={x}
                cy={getY(point.visits)}
                r="4"
                className="fill-primary"
              />

              <circle
                cx={x}
                cy={getY(
                  point.realTrackingOpens,
                )}
                r="4"
                className="fill-emerald-500"
              />

              <text
                x={x}
                y={height - 20}
                textAnchor="middle"
                className="fill-muted-foreground text-[11px]"
              >
                {point.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function AreaChartView({
  points,
}: {
  points: ChartPoint[]
}) {
  const width = 900
  const height = 340
  const paddingLeft = 55
  const paddingRight = 25
  const paddingTop = 25
  const paddingBottom = 55

  const chartWidth =
    width - paddingLeft - paddingRight

  const chartHeight =
    height - paddingTop - paddingBottom

  const maxValue = getMaxValue(points)

  const getX = (index: number) => {
    if (points.length === 1) {
      return width / 2
    }

    return (
      paddingLeft +
      (index / (points.length - 1)) *
        chartWidth
    )
  }

  const getY = (value: number) =>
    paddingTop +
    chartHeight -
    (value / maxValue) * chartHeight

  const visitsLine = points
    .map(
      (point, index) =>
        `${getX(index)},${getY(point.visits)}`,
    )
    .join(' ')

  const trackingLine = points
    .map(
      (point, index) =>
        `${getX(index)},${getY(
          point.realTrackingOpens,
        )}`,
    )
    .join(' ')

  const visitsArea = [
    `${getX(0)},${paddingTop + chartHeight}`,
    visitsLine,
    `${getX(points.length - 1)},${
      paddingTop + chartHeight
    }`,
  ].join(' ')

  const trackingArea = [
    `${getX(0)},${paddingTop + chartHeight}`,
    trackingLine,
    `${getX(points.length - 1)},${
      paddingTop + chartHeight
    }`,
  ].join(' ')

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="min-w-[650px] w-full"
      >
        <polygon
          points={visitsArea}
          className="fill-primary/10"
        />

        <polygon
          points={trackingArea}
          className="fill-emerald-500/10"
        />

        <polyline
          points={visitsLine}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary"
        />

        <polyline
          points={trackingLine}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-emerald-500"
        />

        {points.map((point, index) => (
          <g key={point.fullLabel}>
            <circle
              cx={getX(index)}
              cy={getY(point.visits)}
              r="4"
              className="fill-primary"
            />

            <circle
              cx={getX(index)}
              cy={getY(
                point.realTrackingOpens,
              )}
              r="4"
              className="fill-emerald-500"
            />

            <text
              x={getX(index)}
              y={height - 20}
              textAnchor="middle"
              className="fill-muted-foreground text-[11px]"
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

function BarChartView({
  points,
}: {
  points: ChartPoint[]
}) {
  const width = 900
  const height = 340
  const paddingLeft = 55
  const paddingRight = 25
  const paddingTop = 25
  const paddingBottom = 55

  const chartWidth =
    width - paddingLeft - paddingRight

  const chartHeight =
    height - paddingTop - paddingBottom

  const maxValue = getMaxValue(points)

  const groupWidth =
    chartWidth / Math.max(points.length, 1)

  const barWidth = Math.max(
    4,
    Math.min(18, groupWidth * 0.26),
  )

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="min-w-[650px] w-full"
      >
        {[0, 0.25, 0.5, 0.75, 1].map(
          (ratio) => {
            const y =
              paddingTop +
              chartHeight -
              ratio * chartHeight

            return (
              <line
                key={ratio}
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                stroke="currentColor"
                className="text-border"
              />
            )
          },
        )}

        {points.map((point, index) => {
          const center =
            paddingLeft +
            groupWidth * index +
            groupWidth / 2

          const visitsHeight =
            (point.visits / maxValue) *
            chartHeight

          const trackingHeight =
            (point.realTrackingOpens /
              maxValue) *
            chartHeight

          return (
            <g key={point.fullLabel}>
              <rect
                x={center - barWidth - 2}
                y={
                  paddingTop +
                  chartHeight -
                  visitsHeight
                }
                width={barWidth}
                height={visitsHeight}
                rx="4"
                className="fill-primary"
              />

              <rect
                x={center + 2}
                y={
                  paddingTop +
                  chartHeight -
                  trackingHeight
                }
                width={barWidth}
                height={trackingHeight}
                rx="4"
                className="fill-emerald-500"
              />

              <text
                x={center}
                y={height - 20}
                textAnchor="middle"
                className="fill-muted-foreground text-[11px]"
              >
                {point.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function DonutChartView({
  visits,
  realTrackingOpens,
}: {
  visits: number
  realTrackingOpens: number
}) {
  const converted = Math.min(
    realTrackingOpens,
    visits,
  )

  const notConverted = Math.max(
    visits - converted,
    0,
  )

  const total = converted + notConverted

  const percentage =
    visits > 0
      ? (converted / visits) * 100
      : 0

  const radius = 82
  const circumference =
    2 * Math.PI * radius

  const convertedLength =
    total > 0
      ? (converted / total) * circumference
      : 0

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-4 md:flex-row">
      <div className="relative h-64 w-64">
        <svg
          viewBox="0 0 220 220"
          className="h-full w-full -rotate-90"
        >
          <circle
            cx="110"
            cy="110"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="28"
            className="text-muted"
          />

          {total > 0 && (
            <circle
              cx="110"
              cy="110"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="28"
              strokeDasharray={`${convertedLength} ${circumference}`}
              strokeLinecap="round"
              className="text-primary"
            />
          )}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold">
            {percentage.toFixed(1)}%
          </span>

          <span className="text-sm text-muted-foreground">
            نسبة التحول
          </span>
        </div>
      </div>

      <div className="w-full max-w-xs space-y-4">
        <div className="flex items-center justify-between rounded-xl border p-4">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-primary" />
            <span className="text-sm">
              فتح التتبع الفعلي
            </span>
          </div>

          <span className="font-semibold">
            {formatNumber(converted)}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-xl border p-4">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-muted-foreground/30" />
            <span className="text-sm">
              زيارات لم تتحول
            </span>
          </div>

          <span className="font-semibold">
            {formatNumber(notConverted)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function StudentTrackingAnalyticsPage() {
  const router = useRouter()

  const [period, setPeriod] =
    useState<Period>('weekly')

  const [chartType, setChartType] =
    useState<ChartType>('line')

  const [rows, setRows] = useState<AnalyticsRow[]>([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null)

  const today = useMemo(
    () => getTodayString(),
    [],
  )

  const loadAnalytics = useCallback(
    async () => {
      try {
        setLoading(true)
        setError('')

        const range = getDateRange(
          period,
          today,
        )

        const {
          data,
          error: supabaseError,
        } = await supabase
          .from('student_tracking_analytics')
          .select(
            'tracking_date, visits, real_tracking_opens',
          )
          .gte(
            'tracking_date',
            range.from,
          )
          .lte(
            'tracking_date',
            range.to,
          )
          .order('tracking_date', {
            ascending: true,
          })

        if (supabaseError) {
          throw supabaseError
        }

        setRows(
          (data ?? []) as AnalyticsRow[],
        )

        setLastUpdated(new Date())
      } catch (err) {
        console.error(
          'Student tracking analytics error:',
          err,
        )

        setError(
          'تعذر تحميل بيانات التحليلات. حاول مرة أخرى.',
        )
      } finally {
        setLoading(false)
      }
    },
    [period, today],
  )

  useEffect(() => {
    void loadAnalytics()
  }, [loadAnalytics])

  const chartPoints = useMemo(
    () =>
      buildChartPoints(
        rows,
        period,
        today,
      ),
    [rows, period, today],
  )

  const totals = useMemo(() => {
    const visits = chartPoints.reduce(
      (sum, point) =>
        sum + point.visits,
      0,
    )

    const realTrackingOpens =
      chartPoints.reduce(
        (sum, point) =>
          sum + point.realTrackingOpens,
        0,
      )

    const conversionRate =
      visits > 0
        ? (realTrackingOpens / visits) *
          100
        : 0

    const averageVisits =
      chartPoints.length > 0
        ? visits / chartPoints.length
        : 0

    return {
      visits,
      realTrackingOpens,
      conversionRate,
      averageVisits,
    }
  }, [chartPoints])

  return (
    <div className="space-y-6">
      <PageHeader
        title="تحليل زيارة صفحة متابعة الطلاب"
        description="تحليل زيارات صفحة متابعة الطلاب والوصول الفعلي إلى واجهة التتبع."
      />

      {/* العودة والتحكم */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="outline"
          onClick={() =>
            router.push('/settings/analytics')
          }
          className="gap-2"
        >
          <ArrowRight className="h-4 w-4" />
          العودة إلى التحليلات
        </Button>

        <Button
          variant="outline"
          onClick={() =>
            void loadAnalytics()
          }
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              loading ? 'animate-spin' : ''
            }`}
          />
          تحديث البيانات
        </Button>
      </div>

      {/* اختيار الفترة */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarDays className="h-5 w-5" />
            </div>

            <div>
              <CardTitle className="text-base">
                الفترة الزمنية
              </CardTitle>

              <CardDescription>
                اختر الفترة التي تريد تحليلها.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
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
                  className="w-full"
                >
                  {option.label}
                </Button>
              ),
            )}
          </div>
        </CardContent>
      </Card>

      {/* البطاقات */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  إجمالي الزيارات
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {loading
                    ? '...'
                    : formatNumber(
                        totals.visits,
                      )}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Eye className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  فتح التتبع الفعلي
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {loading
                    ? '...'
                    : formatNumber(
                        totals.realTrackingOpens,
                      )}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  نسبة التحول
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {loading
                    ? '...'
                    : `${totals.conversionRate.toFixed(
                        1,
                      )}%`}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-foreground">
                <PieChart className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  متوسط الزيارات
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {loading
                    ? '...'
                    : totals.averageVisits.toFixed(
                        1,
                      )}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-foreground">
                <BarChart3 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* اختيار شكل الشارت */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            شكل الرسم البياني
          </CardTitle>

          <CardDescription>
            اختر الشكل المناسب لعرض البيانات.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {chartOptions.map(
              (option) => {
                const Icon = option.icon

                return (
                  <Button
                    key={option.value}
                    variant={
                      chartType ===
                      option.value
                        ? 'default'
                        : 'outline'
                    }
                    onClick={() =>
                      setChartType(
                        option.value,
                      )
                    }
                    className="gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    {option.label}
                  </Button>
                )
              },
            )}
          </div>
        </CardContent>
      </Card>

      {/* الشارت */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>
                زيارات صفحة متابعة الطلاب
              </CardTitle>

              <CardDescription>
                مقارنة الزيارات بعمليات فتح التتبع
                الفعلية.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-primary" />
                الزيارات
              </div>

              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500" />
                فتح التتبع الفعلي
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex h-[340px] items-center justify-center">
              <div className="flex items-center gap-3 text-muted-foreground">
                <RefreshCw className="h-5 w-5 animate-spin" />
                جاري تحميل البيانات...
              </div>
            </div>
          ) : error ? (
            <div className="flex h-[340px] items-center justify-center">
              <div className="text-center">
                <p className="font-medium text-destructive">
                  {error}
                </p>

                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() =>
                    void loadAnalytics()
                  }
                >
                  إعادة المحاولة
                </Button>
              </div>
            </div>
          ) : chartType === 'line' ? (
            <LineChartView
              points={chartPoints}
            />
          ) : chartType === 'area' ? (
            <AreaChartView
              points={chartPoints}
            />
          ) : chartType === 'bar' ? (
            <BarChartView
              points={chartPoints}
            />
          ) : (
            <DonutChartView
              visits={totals.visits}
              realTrackingOpens={
                totals.realTrackingOpens
              }
            />
          )}
        </CardContent>
      </Card>

      {/* جدول التفاصيل */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            تفاصيل الفترة
          </CardTitle>

          <CardDescription>
            الأرقام المسجلة لكل يوم أو شهر حسب الفترة
            المختارة.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {chartPoints.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              لا توجد بيانات لهذه الفترة.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b text-right">
                    <th className="px-4 py-3 font-medium text-muted-foreground">
                      الفترة
                    </th>

                    <th className="px-4 py-3 font-medium text-muted-foreground">
                      الزيارات
                    </th>

                    <th className="px-4 py-3 font-medium text-muted-foreground">
                      فتح التتبع الفعلي
                    </th>

                    <th className="px-4 py-3 font-medium text-muted-foreground">
                      نسبة التحول
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {chartPoints.map(
                    (point) => {
                      const conversion =
                        point.visits > 0
                          ? (point.realTrackingOpens /
                              point.visits) *
                            100
                          : 0

                      return (
                        <tr
                          key={point.fullLabel}
                          className="border-b last:border-0"
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium">
                              {point.label}
                            </div>

                            <div className="text-xs text-muted-foreground">
                              {
                                point.fullLabel
                              }
                            </div>
                          </td>

                          <td className="px-4 py-3 font-semibold">
                            {formatNumber(
                              point.visits,
                            )}
                          </td>

                          <td className="px-4 py-3 font-semibold">
                            {formatNumber(
                              point.realTrackingOpens,
                            )}
                          </td>

                          <td className="px-4 py-3">
                            {conversion.toFixed(
                              1,
                            )}
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
        <p className="text-center text-xs text-muted-foreground">
          آخر تحديث:{' '}
          {lastUpdated.toLocaleTimeString(
            'ar-BH',
          )}
        </p>
      )}
    </div>
  )
}
