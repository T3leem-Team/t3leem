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

import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/dashboard/page-header'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import {
  calculateAverage,
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

type ChartPoint = {
  label: string
  visits: number
  realTrackingOpens: number
}

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

function LineChartView({
  points,
}: {
  points: ChartPoint[]
}) {
  if (!points.length) {
    return (
      <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
        لا توجد بيانات للفترة المحددة
      </div>
    )
  }

  const width = 900
  const height = 320
  const padding = 45

  const maxValue = Math.max(
    1,
    ...points.flatMap(
      (point) => [
        point.visits,
        point.realTrackingOpens,
      ],
    ),
  )

  const getX = (
    index: number,
  ) => {
    if (points.length === 1) {
      return width / 2
    }

    return (
      padding +
      (index *
        (width -
          padding * 2)) /
        (points.length - 1)
    )
  }

  const getY = (
    value: number,
  ) => {
    return (
      height -
      padding -
      (value / maxValue) *
        (height -
          padding * 2)
    )
  }

  const visitsPath =
    points
      .map(
        (
          point,
          index,
        ) => {
          const x =
            getX(index)

          const y =
            getY(
              point.visits,
            )

          return `${
            index === 0
              ? 'M'
              : 'L'
          } ${x} ${y}`
        },
      )
      .join(' ')

  const opensPath =
    points
      .map(
        (
          point,
          index,
        ) => {
          const x =
            getX(index)

          const y =
            getY(
              point.realTrackingOpens,
            )

          return `${
            index === 0
              ? 'M'
              : 'L'
          } ${x} ${y}`
        },
      )
      .join(' ')

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[320px] min-w-[700px] w-full"
      >
        {points.map(
          (_, index) => {
            const x =
              getX(index)

            return (
              <line
                key={`grid-${index}`}
                x1={x}
                x2={x}
                y1={padding}
                y2={
                  height -
                  padding
                }
                className="stroke-muted"
                strokeWidth="1"
                strokeDasharray="4 6"
              />
            )
          },
        )}

        <path
          d={visitsPath}
          fill="none"
          className="stroke-primary"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path
          d={opensPath}
          fill="none"
          className="stroke-emerald-500"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map(
          (
            point,
            index,
          ) => {
            const x =
              getX(index)

            const visitsY =
              getY(
                point.visits,
              )

            const opensY =
              getY(
                point.realTrackingOpens,
              )

            return (
              <g
                key={`${point.label}-${index}`}
              >
                <circle
                  cx={x}
                  cy={visitsY}
                  r="4"
                  className="fill-primary"
                />

                <circle
                  cx={x}
                  cy={opensY}
                  r="4"
                  className="fill-emerald-500"
                />

                <text
                  x={x}
                  y={
                    height - 15
                  }
                  textAnchor="middle"
                  className="fill-muted-foreground text-[12px]"
                >
                  {point.label}
                </text>
              </g>
            )
          },
        )}
      </svg>
    </div>
  )
}

function AreaChartView({
  points,
}: {
  points: ChartPoint[]
}) {
  if (!points.length) {
    return (
      <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
        لا توجد بيانات للفترة المحددة
      </div>
    )
  }

  const width = 900
  const height = 320
  const padding = 45

  const maxValue = Math.max(
    1,
    ...points.flatMap(
      (point) => [
        point.visits,
        point.realTrackingOpens,
      ],
    ),
  )

  const getX = (
    index: number,
  ) => {
    if (points.length === 1) {
      return width / 2
    }

    return (
      padding +
      (index *
        (width -
          padding * 2)) /
        (points.length - 1)
    )
  }

  const getY = (
    value: number,
  ) => {
    return (
      height -
      padding -
      (value / maxValue) *
        (height -
          padding * 2)
    )
  }

  const visitsLine =
    points
      .map(
        (
          point,
          index,
        ) => {
          return `${
            index === 0
              ? 'M'
              : 'L'
          } ${getX(
            index,
          )} ${getY(
            point.visits,
          )}`
        },
      )
      .join(' ')

  const visitsArea = `${visitsLine}
    L ${getX(
      points.length - 1,
    )} ${
      height - padding
    }
    L ${getX(0)} ${
      height - padding
    }
    Z`

  const opensLine =
    points
      .map(
        (
          point,
          index,
        ) => {
          return `${
            index === 0
              ? 'M'
              : 'L'
          } ${getX(
            index,
          )} ${getY(
            point.realTrackingOpens,
          )}`
        },
      )
      .join(' ')

  const opensArea = `${opensLine}
    L ${getX(
      points.length - 1,
    )} ${
      height - padding
    }
    L ${getX(0)} ${
      height - padding
    }
    Z`

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[320px] min-w-[700px] w-full"
      >
        <path
          d={visitsArea}
          className="fill-primary/10"
        />

        <path
          d={opensArea}
          className="fill-emerald-500/10"
        />

        <path
          d={visitsLine}
          fill="none"
          className="stroke-primary"
          strokeWidth="3"
        />

        <path
          d={opensLine}
          fill="none"
          className="stroke-emerald-500"
          strokeWidth="3"
        />

        {points.map(
          (
            point,
            index,
          ) => (
            <text
              key={`${point.label}-${index}`}
              x={getX(index)}
              y={
                height - 15
              }
              textAnchor="middle"
              className="fill-muted-foreground text-[12px]"
            >
              {point.label}
            </text>
          ),
        )}
      </svg>
    </div>
  )
}

function BarChartView({
  points,
}: {
  points: ChartPoint[]
}) {
  if (!points.length) {
    return (
      <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
        لا توجد بيانات للفترة المحددة
      </div>
    )
  }

  const width = 900
  const height = 320
  const padding = 45

  const maxValue = Math.max(
    1,
    ...points.flatMap(
      (point) => [
        point.visits,
        point.realTrackingOpens,
      ],
    ),
  )

  const chartWidth =
    width - padding * 2

  const groupWidth =
    chartWidth /
    Math.max(
      points.length,
      1,
    )

  const barWidth =
    Math.max(
      8,
      Math.min(
        28,
        groupWidth * 0.25,
      ),
    )

  const getY = (
    value: number,
  ) => {
    return (
      height -
      padding -
      (value / maxValue) *
        (height -
          padding * 2)
    )
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[320px] min-w-[700px] w-full"
      >
        {points.map(
          (
            point,
            index,
          ) => {
            const center =
              padding +
              groupWidth *
                index +
              groupWidth / 2

            const visitsY =
              getY(
                point.visits,
              )

            const opensY =
              getY(
                point.realTrackingOpens,
              )

            const visitsHeight =
              height -
              padding -
              visitsY

            const opensHeight =
              height -
              padding -
              opensY

            return (
              <g
                key={`${point.label}-${index}`}
              >
                <rect
                  x={
                    center -
                    barWidth -
                    3
                  }
                  y={visitsY}
                  width={barWidth}
                  height={
                    visitsHeight
                  }
                  rx="5"
                  className="fill-primary"
                />

                <rect
                  x={
                    center + 3
                  }
                  y={opensY}
                  width={barWidth}
                  height={
                    opensHeight
                  }
                  rx="5"
                  className="fill-emerald-500"
                />

                <text
                  x={center}
                  y={
                    height - 15
                  }
                  textAnchor="middle"
                  className="fill-muted-foreground text-[12px]"
                >
                  {point.label}
                </text>
              </g>
            )
          },
        )}
      </svg>
    </div>
  )
}

function DonutChartView({
  totalVisits,
  totalRealTrackingOpens,
}: {
  totalVisits: number
  totalRealTrackingOpens: number
}) {
  const safeVisits =
    Math.max(
      0,
      totalVisits,
    )

  const safeOpens =
    Math.min(
      safeVisits,
      Math.max(
        0,
        totalRealTrackingOpens,
      ),
    )

  const percentage =
    safeVisits
      ? (safeOpens /
          safeVisits) *
        100
      : 0

  const radius = 78

  const circumference =
    2 * Math.PI * radius

  const dash =
    (percentage / 100) *
    circumference

  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-6 md:flex-row">
      <div className="relative h-[210px] w-[210px]">
        <svg
          viewBox="0 0 210 210"
          className="h-full w-full -rotate-90"
        >
          <circle
            cx="105"
            cy="105"
            r={radius}
            fill="none"
            className="stroke-muted"
            strokeWidth="24"
          />

          <circle
            cx="105"
            cy="105"
            r={radius}
            fill="none"
            className="stroke-primary"
            strokeWidth="24"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold">
            {percentage.toFixed(
              1,
            )}
            %
          </span>

          <span className="text-xs text-muted-foreground">
            نسبة التحول
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-primary" />

            <span className="text-sm">
              فتح التتبع الفعلي
            </span>
          </div>

          <p className="text-2xl font-bold">
            {formatNumber(
              safeOpens,
            )}
          </p>
        </div>

        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-muted-foreground/40" />

            <span className="text-sm">
              الزيارات الأخرى
            </span>
          </div>

          <p className="text-2xl font-bold">
            {formatNumber(
              Math.max(
                0,
                safeVisits -
                  safeOpens,
              ),
            )}
          </p>
        </div>
      </div>
    </div>
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
    useState<
      AnalyticsRow[]
    >([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState<
      string | null
    >(null)

  const [
    lastUpdated,
    setLastUpdated,
  ] =
    useState<Date | null>(
      null,
    )

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
          error:
            supabaseError,
        } =
          await supabase
            .from(
              analyticsDefinition.source,
            )
            .select(
              `${analyticsDefinition.dateColumn}, ${analyticsDefinition.metrics
                .map(
                  (metric) =>
                    metric.key,
                )
                .join(', ')}`,
            )
            .gte(
              analyticsDefinition.dateColumn,
              range.from,
            )
            .lte(
              analyticsDefinition.dateColumn,
              range.to,
            )
            .order(
              analyticsDefinition.dateColumn,
              {
                ascending: true,
              },
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
          setRows(
            (
              data || []
            ).map(
              (row) => ({
                tracking_date:
                  String(
                    row[
                      analyticsDefinition.dateColumn
                    ] ?? '',
                  ),

                visits: Number(
                  row.visits ??
                    0,
                ),

                real_tracking_opens:
                  Number(
                    row.real_tracking_opens ??
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

      const points =
        buildAnalyticsPoints(
          rows,
          period,
          analyticsDefinition,
          formatDateLabel,
          monthNames,
          range.year,
        )

      return points.map(
        (point) => ({
          label:
            point.label,

          visits:
            point.values[
              'visits'
            ] ?? 0,

          realTrackingOpens:
            point.values[
              'real_tracking_opens'
            ] ?? 0,
        }),
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

  const averageVisits =
    useMemo(
      () =>
        calculateAverage(
          rows,
          'visits',
        ),
      [rows],
    )

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
          onClick={
            loadAnalytics
          }
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
                    key={
                      option.value
                    }
                    variant={
                      period ===
                      option.value
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
                : `${conversionRate.toFixed(
                    1,
                  )}%`}
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
                : averageVisits.toFixed(
                    1,
                  )}
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
                {period ===
                'yearly'
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
                      key={
                        option.value
                      }
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
          <div className="mb-5 flex flex-wrap items-center gap-5 text-sm">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-primary" />

              <span>
                الزيارات
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-emerald-500" />

              <span>
                فتح التتبع الفعلي
              </span>
            </div>
          </div>

          {loading ? (
            <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
              جاري تحميل البيانات...
            </div>
          ) : chartType ===
            'line' ? (
            <LineChartView
              points={
                chartPoints
              }
            />
          ) : chartType ===
            'area' ? (
            <AreaChartView
              points={
                chartPoints
              }
            />
          ) : chartType ===
            'bar' ? (
            <BarChartView
              points={
                chartPoints
              }
            />
          ) : (
            <DonutChartView
              totalVisits={
                totals.visits
              }
              totalRealTrackingOpens={
                totals.realTrackingOpens
              }
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
          ) : chartPoints.length ===
            0 ? (
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
                    (
                      point,
                      index,
                    ) => (
                      <tr
                        key={`${point.label}-${index}`}
                        className="border-b last:border-0"
                      >
                        <td className="px-4 py-3 font-medium">
                          {point.label}
                        </td>

                        <td className="px-4 py-3">
                          {formatNumber(
                            point.visits,
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {formatNumber(
                            point.realTrackingOpens,
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {getConversionRate(
                            point.visits,
                            point.realTrackingOpens,
                          ).toFixed(
                            1,
                          )}
                          %
                        </td>
                      </tr>
                    ),
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