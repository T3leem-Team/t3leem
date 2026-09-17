'use client'

import {
  type FormEvent,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  useEffect,
  useMemo,
  useState,
} from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  CheckCircle2,
  FileImage,
  Loader2,
  Send,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

type RegistrationSettings = {
  registration_open: boolean

  show_name: boolean
  required_name: boolean

  show_personal_id: boolean
  required_personal_id: boolean

  show_phone: boolean
  required_phone: boolean

  show_whatsapp: boolean
  required_whatsapp: boolean

  show_level: boolean
  required_level: boolean

  show_notes: boolean
  required_notes: boolean

  show_health_notes: boolean
  required_health_notes: boolean

  payment_enabled: boolean

  benefit_enabled: boolean
  bank_transfer_enabled: boolean
  cash_enabled: boolean
  payment_link_enabled: boolean

  payment_proof_enabled: boolean
  payment_proof_required: boolean

  payment_amount: number
  payment_link: string | null

  show_payment_qr: boolean
  payment_qr_url: string | null
}

type Level = {
  id: string
  name: string
  sort_order: number | null
}

type PaymentMethod =
  | 'benefitpay'
  | 'bank_transfer'
  | 'cash'
  | 'payment_link'

function FieldLabel({
  label,
  required,
}: {
  label: string
  required?: boolean
}) {
  return (
    <label className="mb-2 block text-sm font-medium">
      {label}
      {required && (
        <span className="mr-1 text-destructive">*</span>
      )}
    </label>
  )
}

function Input(
  props: InputHTMLAttributes<HTMLInputElement>,
) {
  return (
    <input
      {...props}
      className="flex h-11 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
    />
  )
}

function Textarea(
  props: TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return (
    <textarea
      {...props}
      className="min-h-28 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
    />
  )
}

export default function RegisterPage() {
  const [settings, setSettings] =
    useState<RegistrationSettings | null>(null)

  const [levels, setLevels] = useState<Level[]>([])

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [requestNumber, setRequestNumber] = useState('')

  const [name, setName] = useState('')
  const [personalId, setPersonalId] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [levelId, setLevelId] = useState('')
  const [notes, setNotes] = useState('')
  const [healthNotes, setHealthNotes] = useState('')

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod | null>(null)

  const [paymentReference, setPaymentReference] =
    useState('')

  const [paymentProof, setPaymentProof] =
    useState<File | null>(null)

  useEffect(() => {
    void loadRegistrationData()
  }, [])

  async function loadRegistrationData() {
    setLoading(true)
    setErrorMessage('')

    try {
      const settingsResult = await supabase
        .from('registration_settings')
        .select('*')
        .limit(1)
        .maybeSingle()

      if (settingsResult.error) {
        console.error(settingsResult.error)

        setErrorMessage(
          `تعذر تحميل إعدادات التسجيل: ${settingsResult.error.message}`,
        )

        return
      }

      if (!settingsResult.data) {
        setErrorMessage(
          'لم يتم العثور على إعدادات التسجيل.',
        )

        return
      }

      setSettings(
        settingsResult.data as RegistrationSettings,
      )

      const levelsResult = await supabase
        .from('levels')
        .select('id, name, sort_order')
        .eq('is_active', true)
        .order('sort_order', {
          ascending: true,
        })

      if (levelsResult.error) {
        console.error(levelsResult.error)

        setErrorMessage(
          `تعذر تحميل المستويات: ${levelsResult.error.message}`,
        )

        return
      }

      setLevels(levelsResult.data ?? [])
    } catch (error) {
      console.error(error)

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'حدث خطأ أثناء تحميل صفحة التسجيل.',
      )
    } finally {
      setLoading(false)
    }
  }

  const paymentMethods = useMemo(() => {
    if (!settings) {
      return []
    }

    const methods: {
      id: PaymentMethod
      label: string
    }[] = []

    if (settings.benefit_enabled) {
      methods.push({
        id: 'benefitpay',
        label: 'BenefitPay',
      })
    }

    if (settings.bank_transfer_enabled) {
      methods.push({
        id: 'bank_transfer',
        label: 'تحويل بنكي',
      })
    }

    if (settings.cash_enabled) {
      methods.push({
        id: 'cash',
        label: 'دفع نقدي',
      })
    }

    if (settings.payment_link_enabled) {
      methods.push({
        id: 'payment_link',
        label: 'رابط دفع إلكتروني',
      })
    }

    return methods
  }, [settings])

  async function uploadPaymentProof(
    file: File,
    requestId: string,
  ) {
    const extension =
      file.name.split('.').pop()?.toLowerCase() || 'jpg'

    const filePath = `${requestId}.${extension}`

    const uploadResult = await supabase.storage
      .from('registration-proofs')
      .upload(filePath, file, {
        upsert: true,
      })

    if (uploadResult.error) {
      throw new Error(
        `تعذر رفع إثبات الدفع: ${uploadResult.error.message}`,
      )
    }

    const publicUrlResult = supabase.storage
      .from('registration-proofs')
      .getPublicUrl(filePath)

    return publicUrlResult.data.publicUrl
  }

  function validateForm() {
    if (!settings) {
      return 'إعدادات التسجيل غير متوفرة.'
    }

    if (!settings.registration_open) {
      return 'التسجيل مغلق حاليًا.'
    }

    if (
      settings.show_name &&
      settings.required_name &&
      !name.trim()
    ) {
      return 'يرجى إدخال الاسم.'
    }

    if (
      settings.show_personal_id &&
      settings.required_personal_id &&
      !personalId.trim()
    ) {
      return 'يرجى إدخال الرقم الشخصي.'
    }

    if (
      settings.show_phone &&
      settings.required_phone &&
      !phone.trim()
    ) {
      return 'يرجى إدخال رقم الاتصال.'
    }

    if (
      settings.show_whatsapp &&
      settings.required_whatsapp &&
      !whatsapp.trim()
    ) {
      return 'يرجى إدخال رقم الواتساب.'
    }

    if (
      settings.show_level &&
      settings.required_level &&
      !levelId
    ) {
      return 'يرجى اختيار الصف / المستوى.'
    }

    if (
      settings.show_notes &&
      settings.required_notes &&
      !notes.trim()
    ) {
      return 'يرجى إدخال الملاحظات.'
    }

    if (
      settings.show_health_notes &&
      settings.required_health_notes &&
      !healthNotes.trim()
    ) {
      return 'يرجى تعبئة حقل الأمراض المزمنة.'
    }

    if (settings.payment_enabled) {
      if (paymentMethods.length === 0) {
        return 'لا توجد طريقة دفع متاحة حاليًا.'
      }

      if (!paymentMethod) {
        return 'يرجى اختيار طريقة الدفع.'
      }

      if (
        settings.payment_proof_enabled &&
        settings.payment_proof_required &&
        !paymentProof
      ) {
        return 'يرجى إرفاق إثبات الدفع.'
      }
    }

    return ''
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setErrorMessage('')
    setSuccessMessage('')
    setRequestNumber('')

    const validationError = validateForm()

    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    if (!settings) {
      setErrorMessage(
        'إعدادات التسجيل غير متوفرة.',
      )
      return
    }

    setSubmitting(true)

    try {
      const generatedRequestNumber =
        `REG-${new Date().getFullYear()}-${Date.now()
          .toString()
          .slice(-8)}`

      const trackingToken = crypto.randomUUID()

      const insertResult = await supabase
        .from('registration_requests')
        .insert({
          request_number: generatedRequestNumber,
          tracking_token: trackingToken,

          name: settings.show_name
            ? name.trim()
            : '',

          personal_id: settings.show_personal_id
            ? personalId.trim() || null
            : null,

          phone: settings.show_phone
            ? phone.trim() || null
            : null,

          whatsapp: settings.show_whatsapp
            ? whatsapp.trim() || null
            : null,

          level_id: settings.show_level
            ? levelId || null
            : null,

          notes: settings.show_notes
            ? notes.trim() || null
            : null,

          health_notes: settings.show_health_notes
            ? healthNotes.trim() || null
            : null,

          status: 'pending',

          processing_mode: 'review',

          payment_method: settings.payment_enabled
            ? paymentMethod
            : null,

          payment_amount: settings.payment_enabled
            ? settings.payment_amount
            : null,

          payment_reference: settings.payment_enabled
            ? paymentReference.trim() || null
            : null,

          payment_status: settings.payment_enabled
            ? 'pending'
            : 'not_required',
        })
        .select('id, request_number')
        .single()

      if (insertResult.error) {
        throw new Error(
          `تعذر إرسال طلب التسجيل: ${insertResult.error.message}`,
        )
      }

      if (
        settings.payment_enabled &&
        settings.payment_proof_enabled &&
        paymentProof
      ) {
        const proofUrl = await uploadPaymentProof(
          paymentProof,
          insertResult.data.id,
        )

        const updateResult = await supabase
          .from('registration_requests')
          .update({
            payment_proof_url: proofUrl,
          })
          .eq('id', insertResult.data.id)

        if (updateResult.error) {
          throw new Error(
            `تم إنشاء الطلب لكن تعذر حفظ إثبات الدفع: ${updateResult.error.message}`,
          )
        }
      }

      setRequestNumber(
        insertResult.data.request_number,
      )

      setSuccessMessage(
        'تم إرسال طلب التسجيل بنجاح.',
      )

      setName('')
      setPersonalId('')
      setPhone('')
      setWhatsapp('')
      setLevelId('')
      setNotes('')
      setHealthNotes('')
      setPaymentMethod(null)
      setPaymentReference('')
      setPaymentProof(null)

      const fileInput = document.getElementById(
        'paymentProof',
      ) as HTMLInputElement | null

      if (fileInput) {
        fileInput.value = ''
      }
    } catch (error) {
      console.error(error)

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'حدث خطأ أثناء إرسال طلب التسجيل.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-muted/30 px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-center rounded-2xl border bg-background p-12 shadow-sm">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              جاري تحميل نموذج التسجيل...
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (errorMessage && !settings) {
    return (
      <main className="min-h-screen bg-muted/30 px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl border bg-background p-6 shadow-sm">
            <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
              <AlertCircle className="mt-0.5 size-5 shrink-0" />

              <div>
                <p className="font-medium">
                  تعذر تحميل التسجيل
                </p>

                <p className="mt-1 text-sm">
                  {errorMessage}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (!settings) {
    return null
  }

  if (!settings.registration_open) {
    return (
      <main className="min-h-screen bg-muted/30 px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl border bg-background p-8 text-center shadow-sm">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-muted">
              <AlertCircle className="size-7 text-muted-foreground" />
            </div>

            <h1 className="mt-5 text-2xl font-bold">
              التسجيل مغلق حاليًا
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              لا يمكن تقديم طلبات تسجيل جديدة في الوقت الحالي.
            </p>

            <Link
              href="/student-status"
              className="mt-6 inline-flex rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-muted"
            >
              متابعة طلب سابق
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border bg-background p-6 shadow-sm sm:p-8">
          <div>
            <h1 className="text-2xl font-bold">
              طلب التسجيل
            </h1>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              يرجى تعبئة البيانات التالية لتقديم طلب التسجيل.
            </p>
          </div>

          {successMessage && (
            <div className="mt-6 rounded-xl border border-green-500/30 bg-green-500/10 p-5">
              <div className="flex items-start gap-3 text-green-700 dark:text-green-400">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0" />

                <div>
                  <p className="font-semibold">
                    {successMessage}
                  </p>

                  {requestNumber && (
                    <p className="mt-2 text-sm">
                      رقم طلبك:
                      <strong className="mr-1">
                        {requestNumber}
                      </strong>
                    </p>
                  )}

                  <p className="mt-2 text-sm">
                    احتفظ برقم الطلب لمتابعة حالة التسجيل.
                  </p>

                  <Link
                    href="/student-status"
                    className="mt-4 inline-flex rounded-lg border border-green-500/30 px-4 py-2 text-sm font-medium transition hover:bg-green-500/10"
                  >
                    متابعة حالة الطلب
                  </Link>
                </div>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!successMessage && (
            <form
              onSubmit={handleSubmit}
              className="mt-8 space-y-6"
            >
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold">
                    بيانات الطالب
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    الحقول الظاهرة هنا يتم التحكم فيها من إعدادات التسجيل.
                  </p>
                </div>

                {settings.show_name && (
                  <div>
                    <FieldLabel
                      label="الاسم"
                      required={settings.required_name}
                    />

                    <Input
                      value={name}
                      onChange={(event) =>
                        setName(event.target.value)
                      }
                      placeholder="أدخل اسم الطالب"
                      required={settings.required_name}
                    />
                  </div>
                )}

                {settings.show_personal_id && (
                  <div>
                    <FieldLabel
                      label="الرقم الشخصي"
                      required={settings.required_personal_id}
                    />

                    <Input
                      value={personalId}
                      onChange={(event) =>
                        setPersonalId(event.target.value)
                      }
                      placeholder="أدخل الرقم الشخصي"
                      required={settings.required_personal_id}
                    />
                  </div>
                )}

                {settings.show_phone && (
                  <div>
                    <FieldLabel
                      label="رقم الاتصال"
                      required={settings.required_phone}
                    />

                    <Input
                      type="tel"
                      value={phone}
                      onChange={(event) =>
                        setPhone(event.target.value)
                      }
                      placeholder="أدخل رقم الاتصال"
                      required={settings.required_phone}
                    />
                  </div>
                )}

                {settings.show_whatsapp && (
                  <div>
                    <FieldLabel
                      label="رقم الواتساب"
                      required={settings.required_whatsapp}
                    />

                    <Input
                      type="tel"
                      value={whatsapp}
                      onChange={(event) =>
                        setWhatsapp(event.target.value)
                      }
                      placeholder="أدخل رقم الواتساب"
                      required={settings.required_whatsapp}
                    />
                  </div>
                )}

                {settings.show_level && (
                  <div>
                    <FieldLabel
                      label="الصف / المستوى"
                      required={settings.required_level}
                    />

                    <select
                      value={levelId}
                      onChange={(event) =>
                        setLevelId(event.target.value)
                      }
                      required={settings.required_level}
                      className="flex h-11 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">
                        اختر المستوى
                      </option>

                      {levels.map((level) => (
                        <option
                          key={level.id}
                          value={level.id}
                        >
                          {level.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {settings.show_notes && (
                  <div>
                    <FieldLabel
                      label="الملاحظات"
                      required={settings.required_notes}
                    />

                    <Textarea
                      value={notes}
                      onChange={(event) =>
                        setNotes(event.target.value)
                      }
                      placeholder="أضف أي ملاحظات..."
                      required={settings.required_notes}
                    />
                  </div>
                )}

                {settings.show_health_notes && (
                  <div>
                    <FieldLabel
                      label="الأمراض المزمنة"
                      required={
                        settings.required_health_notes
                      }
                    />

                    <Textarea
                      value={healthNotes}
                      onChange={(event) =>
                        setHealthNotes(event.target.value)
                      }
                      placeholder="اذكر أي أمراض مزمنة أو ملاحظات صحية..."
                      required={
                        settings.required_health_notes
                      }
                    />
                  </div>
                )}
              </div>

              {settings.payment_enabled && (
                <div className="space-y-5 border-t pt-6">
                  <div>
                    <h2 className="text-lg font-semibold">
                      الدفع
                    </h2>

                    {settings.payment_amount > 0 && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        مبلغ التسجيل:{' '}
                        <strong>
                          {settings.payment_amount} د.ب
                        </strong>
                      </p>
                    )}
                  </div>

                  {settings.show_payment_qr &&
                    settings.payment_qr_url && (
                      <div className="rounded-xl border p-4">
                        <div className="flex items-center gap-2">
                          <FileImage className="size-5 text-primary" />

                          <p className="font-medium">
                            QR / باركود الدفع
                          </p>
                        </div>

                        <div className="mt-4 flex justify-center">
                          <img
                            src={settings.payment_qr_url}
                            alt="QR الدفع"
                            className="max-h-64 rounded-lg border object-contain"
                          />
                        </div>
                      </div>
                    )}

                  <div>
                    <FieldLabel
                      label="طريقة الدفع"
                      required
                    />

                    <div className="grid gap-3 sm:grid-cols-2">
                      {paymentMethods.map((method) => (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() =>
                            setPaymentMethod(method.id)
                          }
                          className={`rounded-xl border p-4 text-right transition ${
                            paymentMethod === method.id
                              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                              : 'hover:bg-muted/50'
                          }`}
                        >
                          <p className="font-medium">
                            {method.label}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {settings.payment_link_enabled &&
                    paymentMethod === 'payment_link' &&
                    settings.payment_link && (
                      <div className="rounded-xl border bg-muted/30 p-4">
                        <p className="text-sm text-muted-foreground">
                          استخدم الرابط التالي لإتمام الدفع:
                        </p>

                        <a
                          href={settings.payment_link}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 block break-all text-sm font-medium text-primary underline"
                        >
                          {settings.payment_link}
                        </a>
                      </div>
                    )}

                  <div>
                    <FieldLabel label="رقم المرجع" />

                    <Input
                      value={paymentReference}
                      onChange={(event) =>
                        setPaymentReference(
                          event.target.value,
                        )
                      }
                      placeholder="رقم عملية الدفع إن وجد"
                    />
                  </div>

                  {settings.payment_proof_enabled && (
                    <div>
                      <FieldLabel
                        label="إثبات الدفع"
                        required={
                          settings.payment_proof_required
                        }
                      />

                      <Input
                        id="paymentProof"
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(event) =>
                          setPaymentProof(
                            event.target.files?.[0] ?? null,
                          )
                        }
                        required={
                          settings.payment_proof_required
                        }
                      />

                      <p className="mt-2 text-xs text-muted-foreground">
                        يمكنك إرفاق صورة أو ملف PDF لإثبات الدفع.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="border-t pt-6">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="ml-2 size-4 animate-spin" />
                      جاري إرسال الطلب...
                    </>
                  ) : (
                    <>
                      <Send className="ml-2 size-4" />
                      إرسال طلب التسجيل
                    </>
                  )}
                </Button>

                <p className="mt-3 text-center text-xs text-muted-foreground">
                  سيتم إرسال الطلب إلى قسم طلبات التسجيل للمراجعة.
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}