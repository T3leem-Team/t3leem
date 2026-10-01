import type { AnalyticsDefinition } from './types'

export const analyticsDefinitions: AnalyticsDefinition[] = [
  {
    key: 'student_tracking',

    title: 'تحليل زيارة صفحة متابعة الطلاب',

    description: 'تحليل زيارات صفحة متابعة الطلاب وعمليات فتح المتابعة الفعلية.',

    source: 'student_tracking_analytics',

    dateColumn: 'tracking_date',

    metrics: [
      {
        key: 'visits',
        label: 'الزيارات',
      },
      {
        key: 'real_tracking_opens',
        label: 'فتح المتابعة الفعلي',
      },
    ],

    periods: [
      'daily',
      'weekly',
      'monthly',
      'yearly',
    ],

    charts: [
      'line',
      'bar',
      'area',
      'donut',
    ],
  },
]

export function getAnalyticsDefinition(
  key: string,
): AnalyticsDefinition | undefined {
  return analyticsDefinitions.find(
    (definition) => definition.key === key,
  )
}
