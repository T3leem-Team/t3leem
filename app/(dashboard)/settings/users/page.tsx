import { PageHeader } from '@/components/dashboard/page-header'

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="المستخدمون والصلاحيات"
        description="إدارة مستخدمي النظام والأدوار والصلاحيات"
      />

      <div className="rounded-lg border bg-card p-6">
        صفحة المستخدمين والصلاحيات
      </div>
    </div>
  )
}
