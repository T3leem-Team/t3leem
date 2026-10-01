'use client'

import {
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
} from 'lucide-react'

import type {
  AnalyticsChartType,
  AnalyticsMetricDefinition,
  AnalyticsPoint,
} from '@/lib/analytics/types'

type AnalyticsChartProps = {
  type: AnalyticsChartType
  data: AnalyticsPoint[]
  metrics: AnalyticsMetricDefinition[]
  formatNumber?: (value: number) => string
}

const defaultFormatNumber = (value: number) =>
  new Intl.NumberFormat('ar-BH').format(value)

function getMaxValue(
  data: AnalyticsPoint[],
  metrics: AnalyticsMetricDefinition[],
) {
  let max = 0

  for (const point of data) {
    for (const metric of metrics) {
      max = Math.max(
        max,
        Number(point.values[metric.key] ?? 0),
      )
    }
  }

  return max
}

function getNiceMax(value: number) {
  if (value <= 0) {
    return 10
  }

  const magnitude =
    10 ** Math.floor(Math.log10(value))

  const normalized = value / magnitude

  let nice = 10

  if (normalized <= 1) {
    nice = 1
  } else if (normalized <= 2) {
    nice = 2
  } else if (normalized <= 5) {
    nice = 5
  }

  return nice * magnitude
}

function LineChartView({
  data,
  metrics,
  formatNumber,
}: AnalyticsChartProps & {
  formatNumber: (value: number) => string
}) {
  const width = 900
  const height = 360
  const paddingLeft = 55
  const paddingRight = 25
  const paddingTop = 25
  const paddingBottom = 55

  const chartWidth =
    width - paddingLeft - paddingRight

  const chartHeight =
    height - paddingTop - paddingBottom

  const maxValue = getNiceMax(
    getMaxValue(data, metrics),
  )

  const getX = (index: number) => {
    if (data.length <= 1) {
      return paddingLeft + chartWidth / 2
    }

    return (
      paddingLeft +
      (index / (data.length - 1)) *
        chartWidth
    )
  }

  const getY = (value: number) =>
    paddingTop +
    chartHeight -
    (value / maxValue) * chartHeight

  const buildPath = (
    metricKey: string,
  ) => {
    return data
      .map((point, index) => {
        const value = Number(
          point.values[metricKey] ?? 0,
        )

        const x = getX(index)
        const y = getY(value)

        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
      })
      .join(' ')
  }

  const gridLines = 5

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[720px]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[360px] w-full"
          preserveAspectRatio="none"
        >
          {Array.from(
            { length: gridLines + 1 },
            (_, index) => {
              const value =
                (maxValue / gridLines) *
                index

              const y = getY(value)

              return (
                <g key={index}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={width - paddingRight}
                    y2={y}
                    stroke="currentColor"
                    className="text-slate-100"
                    strokeWidth="1"
                  />

                  <text
                    x={paddingLeft - 10}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-slate-400 text-[11px]"
                  >
                    {formatNumber(
                      Math.round(value),
                    )}
                  </text>
                </g>
              )
            },
          )}

          {data.map((point, index) => {
            const x = getX(index)

            return (
              <text
                key={`${point.label}-${index}`}
                x={x}
                y={height - 18}
                textAnchor="middle"
                className="fill-slate-400 text-[11px]"
              >
                {point.label}
              </text>
            )
          })}

          {metrics.map(
            (metric, metricIndex) => {
              const path =
                buildPath(metric.key)

              return (
                <g key={metric.key}>
                  <path
                    d={path}
                    fill="none"
                    stroke="currentColor"
                    className={
                      metricIndex === 0
                        ? 'text-sky-500'
                        : 'text-emerald-500'
                    }
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {data.map(
                    (point, index) => {
                      const value =
                        Number(
                          point.values[
                            metric.key
                          ] ?? 0,
                        )

                      return (
                        <circle
                          key={`${metric.key}-${index}`}
                          cx={getX(index)}
                          cy={getY(value)}
                          r="4"
                          fill="currentColor"
                          className={
                            metricIndex === 0
                              ? 'text-sky-500'
                              : 'text-emerald-500'
                          }
                        />
                      )
                    },
                  )}
                </g>
              )
            },
          )}
        </svg>
      </div>
    </div>
  )
}

function AreaChartView({
  data,
  metrics,
  formatNumber,
}: AnalyticsChartProps & {
  formatNumber: (value: number) => string
}) {
  const width = 900
  const height = 360
  const paddingLeft = 55
  const paddingRight = 25
  const paddingTop = 25
  const paddingBottom = 55

  const chartWidth =
    width - paddingLeft - paddingRight

  const chartHeight =
    height - paddingTop - paddingBottom

  const maxValue = getNiceMax(
    getMaxValue(data, metrics),
  )

  const getX = (index: number) => {
    if (data.length <= 1) {
      return paddingLeft + chartWidth / 2
    }

    return (
      paddingLeft +
      (index / (data.length - 1)) *
        chartWidth
    )
  }

  const getY = (value: number) =>
    paddingTop +
    chartHeight -
    (value / maxValue) * chartHeight

  const buildAreaPath = (
    metricKey: string,
  ) => {
    if (!data.length) {
      return ''
    }

    const firstX = getX(0)
    const lastX = getX(data.length - 1)

    const points = data
      .map((point, index) => {
        const value = Number(
          point.values[metricKey] ?? 0,
        )

        return `${getX(index)} ${getY(value)}`
      })
      .join(' L ')

    return `M ${firstX} ${
      paddingTop + chartHeight
    } L ${points} L ${lastX} ${
      paddingTop + chartHeight
    } Z`
  }

  const buildLinePath = (
    metricKey: string,
  ) => {
    return data
      .map((point, index) => {
        const value = Number(
          point.values[metricKey] ?? 0,
        )

        return `${index === 0 ? 'M' : 'L'} ${getX(
          index,
        )} ${getY(value)}`
      })
      .join(' ')
  }

  const gridLines = 5

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[720px]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[360px] w-full"
          preserveAspectRatio="none"
        >
          {Array.from(
            { length: gridLines + 1 },
            (_, index) => {
              const value =
                (maxValue / gridLines) *
                index

              const y = getY(value)

              return (
                <g key={index}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={width - paddingRight}
                    y2={y}
                    stroke="currentColor"
                    className="text-slate-100"
                  />

                  <text
                    x={paddingLeft - 10}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-slate-400 text-[11px]"
                  >
                    {formatNumber(
                      Math.round(value),
                    )}
                  </text>
                </g>
              )
            },
          )}

          {data.map((point, index) => (
            <text
              key={`${point.label}-${index}`}
              x={getX(index)}
              y={height - 18}
              textAnchor="middle"
              className="fill-slate-400 text-[11px]"
            >
              {point.label}
            </text>
          ))}

          {metrics.map(
            (metric, metricIndex) => (
              <g key={metric.key}>
                <path
                  d={buildAreaPath(
                    metric.key,
                  )}
                  fill="currentColor"
                  className={
                    metricIndex === 0
                      ? 'text-sky-100'
                      : 'text-emerald-100'
                  }
                  opacity="0.7"
                />

                <path
                  d={buildLinePath(
                    metric.key,
                  )}
                  fill="none"
                  stroke="currentColor"
                  className={
                    metricIndex === 0
                      ? 'text-sky-500'
                      : 'text-emerald-500'
                  }
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            ),
          )}
        </svg>
      </div>
    </div>
  )
}

function BarChartView({
  data,
  metrics,
  formatNumber,
}: AnalyticsChartProps & {
  formatNumber: (value: number) => string
}) {
  const width = 900
  const height = 360
  const paddingLeft = 55
  const paddingRight = 25
  const paddingTop = 25
  const paddingBottom = 55

  const chartWidth =
    width - paddingLeft - paddingRight

  const chartHeight =
    height - paddingTop - paddingBottom

  const maxValue = getNiceMax(
    getMaxValue(data, metrics),
  )

  const groupWidth =
    data.length > 0
      ? chartWidth / data.length
      : chartWidth

  const barGap = 5

  const availableBarWidth =
    groupWidth - 20

  const barWidth =
    metrics.length > 0
      ? Math.max(
          8,
          (availableBarWidth -
            (metrics.length - 1) *
              barGap) /
            metrics.length,
        )
      : availableBarWidth

  const getY = (value: number) =>
    paddingTop +
    chartHeight -
    (value / maxValue) * chartHeight

  const gridLines = 5

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[720px]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[360px] w-full"
          preserveAspectRatio="none"
        >
          {Array.from(
            { length: gridLines + 1 },
            (_, index) => {
              const value =
                (maxValue / gridLines) *
                index

              const y = getY(value)

              return (
                <g key={index}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={width - paddingRight}
                    y2={y}
                    stroke="currentColor"
                    className="text-slate-100"
                  />

                  <text
                    x={paddingLeft - 10}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-slate-400 text-[11px]"
                  >
                    {formatNumber(
                      Math.round(value),
                    )}
                  </text>
                </g>
              )
            },
          )}

          {data.map((point, index) => {
            const groupX =
              paddingLeft +
              index * groupWidth

            return (
              <g
                key={`${point.label}-${index}`}
              >
                {metrics.map(
                  (
                    metric,
                    metricIndex,
                  ) => {
                    const value =
                      Number(
                        point.values[
                          metric.key
                        ] ?? 0,
                      )

                    const x =
                      groupX +
                      (groupWidth -
                        (metrics.length *
                          barWidth +
                          (metrics.length -
                            1) *
                            barGap)) /
                        2 +
                      metricIndex *
                        (barWidth +
                          barGap)

                    const y = getY(value)
                    const barHeight =
                      paddingTop +
                      chartHeight -
                      y

                    return (
                      <rect
                        key={metric.key}
                        x={x}
                        y={y}
                        width={barWidth}
                        height={Math.max(
                          0,
                          barHeight,
                        )}
                        rx="4"
                        fill="currentColor"
                        className={
                          metricIndex ===
                          0
                            ? 'text-sky-500'
                            : 'text-emerald-500'
                        }
                      />
                    )
                  },
                )}

                <text
                  x={
                    groupX +
                    groupWidth / 2
                  }
                  y={height - 18}
                  textAnchor="middle"
                  className="fill-slate-400 text-[11px]"
                >
                  {point.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

function DonutChartView({
  data,
  metrics,
  formatNumber,
}: AnalyticsChartProps & {
  formatNumber: (value: number) => string
}) {
  const totals = metrics.map(
    (metric) => ({
      ...metric,
      value: data.reduce(
        (sum, point) =>
          sum +
          Number(
            point.values[
              metric.key
            ] ?? 0,
          ),
        0,
      ),
    }),
  )

  const total = totals.reduce(
    (sum, item) => sum + item.value,
    0,
  )

  const radius = 85
  const circumference =
    2 * Math.PI * radius

  let accumulated = 0

  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center gap-8 md:flex-row">
      <div className="relative h-64 w-64 shrink-0">
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
            strokeWidth="26"
            className="text-slate-100"
          />

          {total > 0 &&
            totals.map(
              (
                item,
                index,
              ) => {
                const length =
                  (item.value /
                    total) *
                  circumference

                const dashOffset =
                  -accumulated

                accumulated += length

                return (
                  <circle
                    key={item.key}
                    cx="110"
                    cy="110"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="26"
                    strokeDasharray={`${length} ${
                      circumference -
                      length
                    }`}
                    strokeDashoffset={
                      dashOffset
                    }
                    className={
                      index === 0
                        ? 'text-sky-500'
                        : 'text-emerald-500'
                    }
                  />
                )
              },
            )}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-slate-800">
            {formatNumber(total)}
          </span>

          <span className="mt-1 text-sm text-slate-400">
            الإجمالي
          </span>
        </div>
      </div>

      <div className="w-full max-w-xs space-y-4">
        {totals.map(
          (
            item,
            index,
          ) => {
            const percentage =
              total > 0
                ? (item.value /
                    total) *
                  100
                : 0

            return (
              <div
                key={item.key}
                className="rounded-xl border border-slate-100 bg-slate-50/70 p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        index === 0
                          ? 'h-3 w-3 rounded-full bg-sky-500'
                          : 'h-3 w-3 rounded-full bg-emerald-500'
                      }
                    />

                    <span className="text-sm font-medium text-slate-700">
                      {item.label}
                    </span>
                  </div>

                  <span className="text-sm font-bold text-slate-800">
                    {formatNumber(
                      item.value,
                    )}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    النسبة
                  </span>

                  <span>
                    {percentage.toFixed(
                      1,
                    )}
                    %
                  </span>
                </div>
              </div>
            )
          },
        )}
      </div>
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
      <BarChart3 className="mb-3 h-10 w-10 text-slate-300" />

      <p className="text-sm font-medium text-slate-500">
        لا توجد بيانات لعرضها
      </p>
    </div>
  )
}

export function AnalyticsChart({
  type,
  data,
  metrics,
  formatNumber = defaultFormatNumber,
}: AnalyticsChartProps) {
  if (!data.length) {
    return <EmptyChart />
  }

  if (!metrics.length) {
    return <EmptyChart />
  }

  return (
    <div className="w-full">
      <div className="mb-5 flex flex-wrap items-center justify-center gap-5">
        {metrics.map(
          (metric, index) => (
            <div
              key={metric.key}
              className="flex items-center gap-2"
            >
              <span
                className={
                  index === 0
                    ? 'h-2.5 w-2.5 rounded-full bg-sky-500'
                    : 'h-2.5 w-2.5 rounded-full bg-emerald-500'
                }
              />

              <span className="text-sm text-slate-500">
                {metric.label}
              </span>
            </div>
          ),
        )}
      </div>

      {type === 'line' && (
        <LineChartView
          type={type}
          data={data}
          metrics={metrics}
          formatNumber={formatNumber}
        />
      )}

      {type === 'area' && (
        <AreaChartView
          type={type}
          data={data}
          metrics={metrics}
          formatNumber={formatNumber}
        />
      )}

      {type === 'bar' && (
        <BarChartView
          type={type}
          data={data}
          metrics={metrics}
          formatNumber={formatNumber}
        />
      )}

      {type === 'donut' && (
        <DonutChartView
          type={type}
          data={data}
          metrics={metrics}
          formatNumber={formatNumber}
        />
      )}
    </div>
  )
}

export function AnalyticsChartIcon({
  type,
  className = 'h-4 w-4',
}: {
  type: AnalyticsChartType
  className?: string
}) {
  if (type === 'line') {
    return <LineChart className={className} />
  }

  if (type === 'bar') {
    return <BarChart3 className={className} />
  }

  if (type === 'area') {
    return <TrendingUp className={className} />
  }

  return <PieChart className={className} />
}
