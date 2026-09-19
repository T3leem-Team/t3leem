'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  ArrowRight,
  CreditCard,
  FileImage,
  Link2,
  Loader2,
  Save,
  Settings2,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'

import { PageHeader } from '@/components/dashboard/page-header'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type SettingRowProps = {
  title: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}

function SettingRow({
  title,
  description,
  checked,
  onChange,
  disabled = false,
}: SettingRowProps) {
  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-xl border p-4 ${
        disabled ? 'opacity-60' : ''
      }`}
    >
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
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed ${
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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

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

  const [settingsId, setSettingsId] = useState<string | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    const { data, error } = await supabase
      .from('registration_settings')
      .select('*')
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error loading registration settings:', error)

      setErrorMessage(
        `تعذر تحميل إعدادات التسجيل من قاعدة البيانات: ${error.message}`,
      )

      setLoading(false)
      return
    }

    if (!data) {
      setErrorMessage(
        'لم يتم العثور على إعدادات التسجيل في قاعدة البيانات.',
      )

      setLoading(false)
      return
    }

    setSettingsId(data.id)

    setRegistrationOpen(data.registration_open ?? true)

    setShowName(data.show_name ?? true)
    setRequiredName(data.required_name ?? true)

    setShowPersonalId(data.show_personal_id ?? true)
    setRequiredPersonalId(data.required_personal_id ?? true)

    setShowPhone(data.show_phone ?? true)
    setRequiredPhone(data.required_phone ?? true)

    setShowWhatsapp(data.show_whatsapp ?? false)
    setRequiredWhatsapp(data.required_whatsapp ?? false)

    setShowLevel(data.show_level ?? true)
    setRequiredLevel(data.required_level ?? true)

    setShowNotes(data.show_notes ?? false)
    setRequiredNotes(data.required_notes ?? false)

    setShowHealthNotes(data.show_health_notes ?? false)
    setRequiredHealthNotes(data.required_health_notes ?? false)

    setPaymentEnabled(data.payment_enabled ?? false)

    setBenefitEnabled(data.benefit_enabled ?? false)
    setBankTransferEnabled(data.bank_transfer_enabled ?? false)
    setCashEnabled(data.cash_enabled ?? false)
    setPaymentLinkEnabled(data.payment_link_enabled ?? false)

    setPaymentProofEnabled(data.payment_proof_enabled ?? false)
    setPaymentProofRequired(data.payment_proof_required ?? false)

    setPaymentAmount(
      data.payment_amount !== null &&
        data.payment_amount !== undefined
        ? String(data.payment_amount)
        : '',
    )

    setPaymentLink(data.payment_link ?? '')

    setShowPaymentQr(data.show_payment_qr ?? false)

    setSuccessMessage(
      'تم ربط إعدادات التسجيل بقاعدة البيانات بنجاح.',
    )

    setLoading(false)
  }

  async function saveSettings() {
    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    const payload = {
      registration_open: registrationOpen,

      show_name: showName,
      required_name: requiredName,

      show_personal_id: showPersonalId,
      required_personal_id: requiredPersonalId,

      show_phone: showPhone,
      required_phone: requiredPhone,

      show_whatsapp: showWhatsapp,
      required_whatsapp: requiredWhatsapp,

      show_level: showLevel,
      required_level: requiredLevel,

      show_notes: showNotes,
      required_notes: requiredNotes,

      show_health_notes: showHealthNotes,
      required_health_notes: requiredHealthNotes,

      payment_enabled: paymentEnabled,

      benefit_enabled: benefitEnabled,
      bank_transfer_enabled: bankTransferEnabled,
      cash_enabled: cashEnabled,
      payment_link_enabled: paymentLinkEnabled,

      payment_proof_enabled: paymentProofEnabled,
      payment_proof_required:
        paymentProofEnabled && paymentProofRequired,

      payment_amount:
        paymentAmount.trim() === ''
          ? 0
          : Number(paymentAmount),

      payment_link:
        paymentLink.trim() === ''
          ? null
          : paymentLink.trim(),

      show_payment_qr: showPaymentQr,
    }

    if (
      Number.isNaN(payload.payment_amount) ||
      payload.payment_amount < 0
    ) {
      setErrorMessage('يرجى إدخال مبلغ دفع صحيح.')
      setSaving(false)
      return
    }

    let error

    if (settingsId) {
      const result = await supabase
        .from('registration_settings')
        .update(payload)
        .eq('id', settingsId)

      error = result.error
    } else {
      const result = await supabase
        .from('registration_settings')
        .insert(payload)
        .select('id')
        .single()

      error = result.error

      if (!error && result.data) {
        setSettingsId(result.data.id)
      }
    }

    if (error) {
      console.error('Error saving registration settings:', error)

      setErrorMessage(
        `تعذر حفظ إعدادات التسجيل: ${error.message}`,
      )

      setSaving(false)
      return
    }

    setSuccessMessage(
      'تم حفظ إعدادات التسجيل وربطها بقاعدة البيانات بنجاح.',
    )

    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="إعدادات التسجيل"
        description="التحكم في صفحة التسجيل العامة والبيانات وطرق الدفع"
      />

      {/* حالة الربط */}
      {loading ? (
        <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-4 text-sm">
          <Loader2 className="size-4 animate-spin" />
          جاري تحميل إعدادات التسجيل من قاعدة البيانات...
        </div>
      ) : successMessage ? (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-700 dark:text-green-400">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-green-500" />
            <strong>{successMessage}</strong>
          </div>
        </div>
      ) : null}

      {errorMessage && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <div>
        <Link href="/settings">
          <Button variant="outline">
            <ArrowRight className="ml-2 size-4" />
            العودة للإعدادات
          </Button>
        </Link>
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
            disabled={loading}
          />

          <div className="mt-4">
            {registrationOpen ? (
              <Badge variant="success">التسجيل مفتوح</Badge>
            ) : (
              <Badge variant="danger">التسجيل مغلق</Badge>
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
            disabled={loading}
          />

          {showName && (
            <SettingRow
              title="الاسم إجباري"
              description="لا يمكن إرسال الطلب بدون الاسم."
              checked={requiredName}
              onChange={setRequiredName}
              disabled={loading}
            />
          )}

          <SettingRow
            title="الرقم الشخصي"
            description="إظهار الرقم الشخصي في نموذج التسجيل."
            checked={showPersonalId}
            onChange={setShowPersonalId}
            disabled={loading}
          />

          {showPersonalId && (
            <SettingRow
              title="الرقم الشخصي إجباري"
              description="لا يمكن إرسال الطلب بدون الرقم الشخصي."
              checked={requiredPersonalId}
              onChange={setRequiredPersonalId}
              disabled={loading}
            />
          )}

          <SettingRow
            title="رقم الاتصال"
            description="إظهار رقم الاتصال في نموذج التسجيل."
            checked={showPhone}
            onChange={setShowPhone}
            disabled={loading}
          />

          {showPhone && (
            <SettingRow
              title="رقم الاتصال إجباري"
              description="لا يمكن إرسال الطلب بدون رقم الاتصال."
              checked={requiredPhone}
              onChange={setRequiredPhone}
              disabled={loading}
            />
          )}

          <SettingRow
            title="الواتساب"
            description="إظهار رقم الواتساب في نموذج التسجيل."
            checked={showWhatsapp}
            onChange={setShowWhatsapp}
            disabled={loading}
          />

          {showWhatsapp && (
            <SettingRow
              title="الواتساب إجباري"
              description="إجبار الطالب على إدخال رقم الواتساب."
              checked={requiredWhatsapp}
              onChange={setRequiredWhatsapp}
              disabled={loading}
            />
          )}

          <SettingRow
            title="الصف / المستوى"
            description="إظهار اختيار الصف أو المستوى في نموذج التسجيل."
            checked={showLevel}
            onChange={setShowLevel}
            disabled={loading}
          />

          {showLevel && (
            <SettingRow
              title="الصف / المستوى إجباري"
              description="يجب على الطالب اختيار المستوى."
              checked={requiredLevel}
              onChange={setRequiredLevel}
              disabled={loading}
            />
          )}

          <SettingRow
            title="الملاحظات"
            description="السماح للطالب بإضافة ملاحظات."
            checked={showNotes}
            onChange={setShowNotes}
            disabled={loading}
          />

          {showNotes && (
            <SettingRow
              title="الملاحظات إجبارية"
              description="إجبار الطالب على كتابة الملاحظات."
              checked={requiredNotes}
              onChange={setRequiredNotes}
              disabled={loading}
            />
          )}

          <SettingRow
            title="الأمراض المزمنة"
            description="إظهار حقل الأمراض المزمنة."
            checked={showHealthNotes}
            onChange={setShowHealthNotes}
            disabled={loading}
          />

          {showHealthNotes && (
            <SettingRow
              title="الأمراض المزمنة إجبارية"
              description="إجبار الطالب على تعبئة هذا الحقل."
              checked={requiredHealthNotes}
              onChange={setRequiredHealthNotes}
              disabled={loading}
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
            disabled={loading}
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
                  disabled={loading}
                />
              </div>

              <div className="space-y-3">
                <p className="font-medium">طرق الدفع المتاحة</p>

                <SettingRow
                  title="BenefitPay"
                  description="السماح للطالب باستخدام BenefitPay."
                  checked={benefitEnabled}
                  onChange={setBenefitEnabled}
                  disabled={loading}
                />

                <SettingRow
                  title="تحويل بنكي"
                  description="السماح للطالب بالدفع عن طريق التحويل البنكي."
                  checked={bankTransferEnabled}
                  onChange={setBankTransferEnabled}
                  disabled={loading}
                />

                <SettingRow
                  title="دفع نقدي"
                  description="السماح باختيار الدفع النقدي."
                  checked={cashEnabled}
                  onChange={setCashEnabled}
                  disabled={loading}
                />

                <SettingRow
                  title="رابط دفع إلكتروني"
                  description="إظهار رابط دفع خارجي للطالب."
                  checked={paymentLinkEnabled}
                  onChange={setPaymentLinkEnabled}
                  disabled={loading}
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
                    disabled={loading}
                  />
                </div>
              )}

              <SettingRow
                title="إظهار QR / باركود الدفع"
                description="إظهار صورة QR أو باركود الدفع في صفحة التسجيل."
                checked={showPaymentQr}
                onChange={setShowPaymentQr}
                disabled={loading}
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
                  disabled={loading}
                />

                {paymentProofEnabled && (
                  <SettingRow
                    title="إثبات الدفع إجباري"
                    description="لا يمكن إرسال طلب التسجيل بدون إثبات الدفع."
                    checked={paymentProofRequired}
                    onChange={setPaymentProofRequired}
                    disabled={loading}
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
        <Button
          size="lg"
          onClick={saveSettings}
          disabled={loading || saving}
        >
          {saving ? (
            <>
              <Loader2 className="ml-2 size-4 animate-spin" />
              جاري الحفظ...
            </>
          ) : (
            <>
              <Save className="ml-2 size-4" />
              حفظ إعدادات التسجيل
            </>
          )}
        </Button>
      </div>
    </div>
  )
}