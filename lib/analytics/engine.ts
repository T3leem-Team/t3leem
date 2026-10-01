import type {
  AnalyticsDataRow,
  AnalyticsDefinition,
  AnalyticsPeriod,
  AnalyticsPoint,
} from './types'

export function getMetricValue(
  row: AnalyticsDataRow,
  metricKey: string,
): number {
  const value = row[metricKey]

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

export function calculateTotal(
  rows: AnalyticsDataRow[],
  metricKey: string,
): number {
  return rows.reduce(
    (total, row) => total + getMetricValue(row, metricKey),
    0,
  )
}

export function calculateAverage(
  rows: AnalyticsDataRow[],
  metricKey: string,
): number {
  if (rows.length === 0) {
    return 0
  }

  return calculateTotal(rows, metricKey) / rows.length
}

export function calculateConversionRate(
  rows: AnalyticsDataRow[],
  numeratorMetric: string,
  denominatorMetric: string,
): number {
  const numerator = calculateTotal(
    rows,
    numeratorMetric,
  )

  const denominator = calculateTotal(
    rows,
    denominatorMetric,
  )

  if (denominator <= 0) {
    return 0
  }

  return (numerator / denominator) * 100
}

export function aggregateByMonth(
  rows: AnalyticsDataRow[],
  dateColumn: string,
  definition: AnalyticsDefinition,
): AnalyticsPoint[] {
  const months = Array.from(
    { length: 12 },
    (_, index) => index,
  )

  return months.map((month) => {
    const monthRows = rows.filter((row) => {
      const value = row[dateColumn]

      if (typeof value !== 'string') {
        return false
      }

      const date = new Date(`${value}T00:00:00`)

      return date.getMonth() === month
    })

    const values: Record<string, number> = {}

    for (const metric of definition.metrics) {
      values[metric.key] = calculateTotal(
        monthRows,
        metric.key,
      )
    }

    return {
      label: String(month + 1),
      values,
    }
  })
}

export function buildAnalyticsPoints(
  rows: AnalyticsDataRow[],
  period: AnalyticsPeriod,
  definition: AnalyticsDefinition,
): AnalyticsPoint[] {
  if (period !== 'yearly') {
    return rows.map((row) => {
      const values: Record<string, number> = {}

      for (const metric of definition.metrics) {
        values[metric.key] = getMetricValue(
          row,
          metric.key,
        )
      }

      const dateValue = row[definition.dateColumn]

      return {
        label:
          typeof dateValue === 'string'
            ? dateValue
            : '',
        values,
      }
    })
  }

  return aggregateByMonth(
    rows,
    definition.dateColumn,
    definition,
  )
}
