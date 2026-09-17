'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  ArrowRight,
  CreditCard,
  FileImage,
  Link2,
  Save,
  Settings2,
} from 'lucide-react'

import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type SettingRowProps = {
  title: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}

function SettingRow({
  title,
  description,
  checked,
  onChange,
}: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
      <div className="min-w-0">
        <p className="font-medium">{title}</p>

        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-muted-foreground/30'
        }`}
      >
        <span
          className={`absolute top-1 size-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'right-1' : 'right-6'
          }`}
        />
      </button>
    </div>
  )
}

export default function RegistrationSettingsPage() {
  const [registrationOpen, setRegistrationOpen] = useState(true)

  const [showName, setShowName] = useState(true)
  const [requiredName, setRequiredName] = useState(true)

  const [showPersonalId, setShowPersonalId] = useState(true)
  const [requiredPersonalId, setRequiredPersonalId] = useState(true)

  const [showPhone, setShowPhone] = useState(true)
  const [requiredPhone, setRequiredPhone] = useState(true)

  const [showWhatsapp, setShowWhatsapp] = useState(true)
  const [requiredWhatsapp, setRequiredWhatsapp] = useState(false)

  const [showLevel, setShowLevel] = useState(true)
  const [requiredLevel, setRequiredLevel] = useState(true)

  const [showNotes, setShowNotes] = useState(false)
  const [requiredNotes, setRequiredNotes] = useState(false)

  const [showHealthNotes, setShowHealthNotes] = useState(false)
  const [requiredHealthNotes, setRequiredHealthNotes] = useState(false)

  const [paymentEnabled, setPaymentEnabled] = useState(false)

  const [benefitEnabled, setBenefitEnabled] = useState(true)
  const [bankTransferEnabled, setBankTransferEnabled] = useState(true)
  const [cashEnabled, setCashEnabled] = useState(false)
  const [paymentLinkEnabled, setPaymentLinkEnabled] = useState(false)

  const [paymentProofEnabled, setPaymentProofEnabled] = useState(true)
  const [paymentProofRequired, setPaymentProofRequired] = useState(false)

  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentLink, setPaymentLink] = useState('')

  const [showPaymentQr, setShowPaymentQr] = useState(false)

  return (
    <div className="space-y-6">
      <PageHeader
        title="إعدادات التسجيل"
        description="التحكم في صفحة التسجيل العامة والبيانات وطرق الدفع"
      />

      <div>
        <Button variant="outline" asChild>
          <Link href="/settings">
            <ArrowRight className="ml-2 size-4" />
            العودة للإعدادات
          </Link>
        </Button>
      </div>

      {/* التسجيل العام */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="size-5" />
            التسجيل العام
          </CardTitle>
        </CardHeader>

        <CardContent>
          <SettingRow
            title="فتح التسجيل"
            description="السماح للطلاب بالدخول إلى رابط التسجيل العام وإرسال طلبات جديدة."
            checked={registrationOpen}
            onChange={setRegistrationOpen}
          />

          <div className="mt-4">
            {registrationOpen ? (
              <Badge variant="success">التسجيل مفتوح</Badge>
            ) : (
              <Badge variant="destructive">التسجيل مغلق</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* بيانات الطالب */}
      <Card>
        <CardHeader>
          <CardTitle>بيانات الطالب</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <SettingRow
            title="الاسم"
            description="إظهار اسم الطالب في نموذج التسجيل."
            checked={showName}
            onChange={setShowName}
          />

          {showName && (
            <SettingRow
              title="الاسم إجباري"
              description="لا يمكن إرسال الطلب بدون الاسم."
              checked={requiredName}
              onChange={setRequiredName}
            />
          )}

          <SettingRow
            title="الرقم الشخصي"
            description="إظهار الرقم الشخصي في نموذج التسجيل."
            checked={showPersonalId}
            onChange={setShowPersonalId}
          />

          {showPersonalId && (
            <SettingRow
              title="الرقم الشخصي إجباري"
              description="لا يمكن إرسال الطلب بدون الرقم الشخصي."
              checked={requiredPersonalId}
              onChange={setRequiredPersonalId}
            />
          )}

          <SettingRow
            title="رقم الاتصال"
            description="إظهار رقم الاتصال في نموذج التسجيل."
            checked={showPhone}
            onChange={setShowPhone}
          />

          {showPhone && (
            <SettingRow
              title="رقم الاتصال إجباري"
              description="لا يمكن إرسال الطلب بدون رقم الاتصال."
              checked={requiredPhone}
              onChange={setRequiredPhone}
            />
          )}

          <SettingRow
            title="الواتساب"
            description="إظهار رقم الواتساب في نموذج التسجيل."
            checked={showWhatsapp}
            onChange={setShowWhatsapp}
          />

          {showWhatsapp && (
            <SettingRow
              title="الواتساب إجباري"
              description="إجبار الطالب على إدخال رقم الواتساب."
              checked={requiredWhatsapp}
              onChange={setRequiredWhatsapp}
            />
          )}

          <SettingRow
            title="الصف / المستوى"
            description="إظهار اختيار الصف أو المستوى في نموذج التسجيل."
            checked={showLevel}
            onChange={setShowLevel}
          />

          {showLevel && (
            <SettingRow
              title="الصف / المستوى إجباري"
              description="يجب على الطالب اختيار المستوى."
              checked={requiredLevel}
              onChange={setRequiredLevel}
            />
          )}

          <SettingRow
            title="الملاحظات"
            description="السماح للطالب بإضافة ملاحظات."
            checked={showNotes}
            onChange={setShowNotes}
          />

          {showNotes && (
            <SettingRow
              title="الملاحظات إجبارية"
              description="إجبار الطالب على كتابة الملاحظات."
              checked={requiredNotes}
              onChange={setRequiredNotes}
            />
          )}

          <SettingRow
            title="الأمراض المزمنة"
            description="إظهار حقل الأمراض المزمنة."
            checked={showHealthNotes}
            onChange={setShowHealthNotes}
          />

          {showHealthNotes && (
            <SettingRow
              title="الأمراض المزمنة إجبارية"
              description="إجبار الطالب على تعبئة هذا الحقل."
              checked={requiredHealthNotes}
              onChange={setRequiredHealthNotes}
            />
          )}
        </CardContent>
      </Card>

      {/* الدفع */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="size-5" />
            إعدادات الدفع
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <SettingRow
            title="تفعيل الدفع"
            description="إظهار قسم الدفع في صفحة التسجيل العامة."
            checked={paymentEnabled}
            onChange={setPaymentEnabled}
          />

          {paymentEnabled && (
            <>
              <div className="rounded-xl border p-4">
                <label
                  htmlFor="paymentAmount"
                  className="text-sm font-medium"
                >
                  مبلغ التسجيل
                </label>

                <input
                  id="paymentAmount"
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder="مثال: 50"
                  value={paymentAmount}
                  onChange={(event) =>
                    setPaymentAmount(event.target.value)
                  }
                  className="mt-2 flex h-10 w-full max-w-sm rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-3">
                <p className="font-medium">طرق الدفع المتاحة</p>

                <SettingRow
                  title="BenefitPay"
                  description="السماح للطالب باستخدام BenefitPay."
                  checked={benefitEnabled}
                  onChange={setBenefitEnabled}
                />

                <SettingRow
                  title="تحويل بنكي"
                  description="السماح للطالب بالدفع عن طريق التحويل البنكي."
                  checked={bankTransferEnabled}
                  onChange={setBankTransferEnabled}
                />

                <SettingRow
                  title="دفع نقدي"
                  description="السماح باختيار الدفع النقدي."
                  checked={cashEnabled}
                  onChange={setCashEnabled}
                />

                <SettingRow
                  title="رابط دفع إلكتروني"
                  description="إظهار رابط دفع خارجي للطالب."
                  checked={paymentLinkEnabled}
                  onChange={setPaymentLinkEnabled}
                />
              </div>

              {paymentLinkEnabled && (
                <div className="rounded-xl border p-4">
                  <div className="flex items-center gap-2">
                    <Link2 className="size-4" />

                    <label
                      htmlFor="paymentLink"
                      className="text-sm font-medium"
                    >
                      رابط الدفع
                    </label>
                  </div>

                  <input
                    id="paymentLink"
                    type="url"
                    placeholder="https://..."
                    value={paymentLink}
                    onChange={(event) =>
                      setPaymentLink(event.target.value)
                    }
                    className="mt-2 flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              )}

              <SettingRow
                title="إظهار QR / باركود الدفع"
                description="إظهار صورة QR أو باركود الدفع في صفحة التسجيل."
                checked={showPaymentQr}
                onChange={setShowPaymentQr}
              />

              {showPaymentQr && (
                <div className="rounded-xl border border-dashed p-5">
                  <div className="flex items-center gap-3">
                    <FileImage className="size-5 text-primary" />

                    <div>
                      <p className="font-medium">
                        صورة QR / باركود الدفع
                      </p>

                      <p className="mt-1 text-sm text-muted-foreground">
                        سنضيف رفع الصورة وربطها بـ Supabase Storage.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <SettingRow
                  title="إرفاق إثبات الدفع"
                  description="السماح للطالب برفع صورة إثبات الدفع."
                  checked={paymentProofEnabled}
                  onChange={setPaymentProofEnabled}
                />

                {paymentProofEnabled && (
                  <SettingRow
                    title="إثبات الدفع إجباري"
                    description="لا يمكن إرسال طلب التسجيل بدون إثبات الدفع."
                    checked={paymentProofRequired}
                    onChange={setPaymentProofRequired}
                  />
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ملخص */}
      <Card>
        <CardHeader>
          <CardTitle>ملخص الإعدادات</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="rounded-xl bg-muted/50 p-4 text-sm leading-7">
            <p>
              التسجيل:{' '}
              <strong>
                {registrationOpen ? 'مفتوح' : 'مغلق'}
              </strong>
            </p>

            <p>
              الدفع:{' '}
              <strong>
                {paymentEnabled ? 'مفعل' : 'غير مفعل'}
              </strong>
            </p>

            {paymentEnabled && paymentAmount && (
              <p>
                المبلغ:{' '}
                <strong>{paymentAmount}</strong>
              </p>
            )}

            <p>
              إثبات الدفع:{' '}
              <strong>
                {!paymentEnabled
                  ? 'غير متاح'
                  : !paymentProofEnabled
                    ? 'غير متاح'
                    : paymentProofRequired
                      ? 'إجباري'
                      : 'اختياري'}
              </strong>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* حفظ */}
      <div className="flex justify-end">
        <Button size="lg">
          <Save className="ml-2 size-4" />
          حفظ إعدادات التسجيل
        </Button>
      </div>
    </div>
  )
}