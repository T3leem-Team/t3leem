export type AnalyticsPeriod =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'

export type AnalyticsChartType =
  | 'line'
  | 'bar'
  | 'area'
  | 'donut'

export type AnalyticsMetricDefinition = {
  key: string
  label: string
}

export type AnalyticsDefinition = {
  key: string
  title: string
  description?: string

  source: string

  dateColumn: string

  metrics: AnalyticsMetricDefinition[]

  periods: AnalyticsPeriod[]

  charts: AnalyticsChartType[]
}

export type AnalyticsDataRow = Record<
  string,
  string | number | null | undefined
>

export type AnalyticsPoint = {
  label: string
  values: Record<string, number>
}

export type AnalyticsPeriodRange = {
  from: string
  to: string
}
