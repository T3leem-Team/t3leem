import { Badge } from '@/components/ui/badge'

type Variant = 'default' | 'neutral' | 'success' | 'warning' | 'danger'

const statusMap: Record<string, Variant> = {
  // students
  منتظم: 'success',
  متأخر: 'warning',
  موقوف: 'danger',
  // enrollment
  'قيد المراجعة': 'warning',
  مقبول: 'success',
  مرفوض: 'danger',
  // teachers
  'دوام كامل': 'success',
  'دوام جزئي': 'neutral',
  // payments
  مدفوع: 'success',
  'معلّق': 'warning',
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={statusMap[status] ?? 'neutral'}>{status}</Badge>
}
