import { School, ShieldCheck, Bell, Palette } from 'lucide-react'

import { PageHeader } from '@/components/dashboard/page-header'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const roles = [
  { name: 'مدير النظام', members: '٢', desc: 'صلاحيات كاملة على جميع الأقسام' },
  { name: 'مدير المدرسة', members: '١', desc: 'إدارة الطلاب والمعلمين والتقارير' },
  { name: 'موظف تسجيل', members: '٤', desc: 'مراجعة طلبات التسجيل وإدخال البيانات' },
  { name: 'محاسب', members: '٢', desc: 'إدارة المدفوعات والفواتير' },
]

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div className="flex h-10 items-center rounded-lg border border-border bg-muted/40 px-3 text-sm">
        {value}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="الإدارة والإعدادات"
        description="ضبط إعدادات النظام والصلاحيات والمعلومات العامة"
        action={<Button>حفظ التغييرات</Button>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <School className="size-5" />
            </span>
            <div className="space-y-1">
              <CardTitle>معلومات المدرسة</CardTitle>
              <CardDescription>البيانات الأساسية للمنشأة التعليمية</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="اسم المدرسة" value="مدارس تعليم الأهلية" />
            <Field label="المدينة" value="الرياض" />
            <Field label="العام الدراسي" value="١٤٤٨ هـ / ٢٠٢٦ م" />
            <Field label="البريد الإلكتروني" value="info@t3leem.sa" />
            <Field label="رقم الترخيص" value="EDU-٢٠٢٦-٤٤٨١" />
            <Field label="عدد المراحل" value="٣ مراحل" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </span>
            <div className="space-y-1">
              <CardTitle>الأدوار والصلاحيات</CardTitle>
              <CardDescription>إدارة مستويات الوصول</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {roles.map((role) => (
              <div
                key={role.name}
                className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{role.name}</p>
                  <p className="text-xs text-muted-foreground">{role.desc}</p>
                </div>
                <Badge variant="neutral">{role.members} أعضاء</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bell className="size-5" />
            </span>
            <div className="space-y-1">
              <CardTitle>الإشعارات</CardTitle>
              <CardDescription>تفضيلات التنبيهات</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span>طلبات التسجيل الجديدة</span>
              <Badge variant="success">مفعّل</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>تنبيهات المدفوعات المتأخرة</span>
              <Badge variant="success">مفعّل</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>التقارير الأسبوعية</span>
              <Badge variant="neutral">معطّل</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Palette className="size-5" />
            </span>
            <div className="space-y-1">
              <CardTitle>مظهر النظام</CardTitle>
              <CardDescription>تخصيص الواجهة واللغة</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="اللغة" value="العربية" />
            <Field label="اتجاه الواجهة" value="من اليمين إلى اليسار (RTL)" />
            <Field label="المنطقة الزمنية" value="توقيت الرياض (GMT+3)" />
            <Field label="التقويم" value="هجري / ميلادي" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
