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
    (total, row) =>
      total + getMetricValue(row, metricKey),
    0,
  )
}

export function calculateAverage(
  rows: AnalyticsDataRow[],
  metricKey: string,
): number {
  if (!rows.length) {
    return 0
  }

  return (
    calculateTotal(rows, metricKey) /
    rows.length
  )
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

  return Math.min(
    100,
    (numerator / denominator) * 100,
  )
}

function getDateParts(
  dateString: string,
) {
  const [year, month, day] = dateString
    .split('-')
    .map(Number)

  return {
    year,
    month,
    day,
  }
}

export function buildAnalyticsPoints(
  rows: AnalyticsDataRow[],
  period: AnalyticsPeriod,
  definition: AnalyticsDefinition,
  formatDateLabel: (
    dateString: string,
    period: AnalyticsPeriod,
  ) => string,
  monthNames: string[],
  selectedYear: number,
): AnalyticsPoint[] {
  if (period !== 'yearly') {
    return rows.map((row) => {
      const dateValue =
        row[definition.dateColumn]

      const values: Record<string, number> = {}

      for (const metric of definition.metrics) {
        values[metric.key] = getMetricValue(
          row,
          metric.key,
        )
      }

      return {
        label:
          typeof dateValue === 'string'
            ? formatDateLabel(
                dateValue,
                period,
              )
            : '',
        values,
      }
    })
  }

  const monthlyTotals = Array.from(
    { length: 12 },
    (_, index) => {
      const values: Record<
        string,
        number
      > = {}

      for (const metric of definition.metrics) {
        values[metric.key] = 0
      }

      return {
        month: index,
        values,
      }
    },
  )

  for (const row of rows) {
    const dateValue =
      row[definition.dateColumn]

    if (typeof dateValue !== 'string') {
      continue
    }

    const {
      year,
      month,
    } = getDateParts(dateValue)

    if (year !== selectedYear) {
      continue
    }

    const monthIndex = month - 1

    if (
      monthIndex < 0 ||
      monthIndex > 11
    ) {
      continue
    }

    for (const metric of definition.metrics) {
      monthlyTotals[
        monthIndex
      ].values[metric.key] +=
        getMetricValue(
          row,
          metric.key,
        )
    }
  }

  return monthlyTotals.map((item) => ({
    label:
      monthNames[item.month],
    values: item.values,
  }))
}