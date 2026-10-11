'use client'

import {
  type Dispatch,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type SetStateAction,
  type TextareaHTMLAttributes,
} from 'react'

import Link from 'next/link'

import {
  AlertCircle,
  CheckCircle2,
  FileImage,
  Loader2,
  Send,
  Users,
} from 'lucide-react'

import { Button } from '@/components/ui/button'

type RegistrationSettings = {
  registration_open: boolean

  show_name: boolean
  required_name: boolean

  show_personal_id: boolean
  required_personal_id: boolean

  show_gender: boolean
  required_gender: boolean

  show_age: boolean
  required_age: boolean

  show_phone: boolean
  required_phone: boolean

  show_guardian_relation: boolean
  required_guardian_relation: boolean

  show_whatsapp: boolean
  required_whatsapp: boolean

  show_student_phone: boolean
  required_student_phone: boolean

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

  show_education_group: boolean
  education_group_link: string | null
  education_group_description: string | null
  post_registration_notes: string | null

  course_id: string | null
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

type CustomFieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'select'
  | 'boolean'
  | 'textarea'

type CustomFieldOption = {
  id: string
  custom_field_id: string
  label: string
  value: string
  sort_order: number
}

type CustomField = {
  id: string
  name: string
  field_type: CustomFieldType
  sort_order: number
  options: CustomFieldOption[]
  is_visible: boolean
  is_required: boolean
}

type Props = {
  settings: RegistrationSettings

  levels: Level[]

  customFields: CustomField[]

  customFieldValues: Record<
    string,
    string
  >

  updateCustomFieldValue: (
    fieldId: string,
    value: string,
  ) => void

  paymentMethods: {
    id: PaymentMethod
    label: string
  }[]

  name: string
  setName: Dispatch<
    SetStateAction<string>
  >

  personalId: string
  setPersonalId: Dispatch<
    SetStateAction<string>
  >

  gender: string
  setGender: Dispatch<
    SetStateAction<string>
  >

  age: string
  setAge: Dispatch<
    SetStateAction<string>
  >

  phone: string
  setPhone: Dispatch<
    SetStateAction<string>
  >

  guardianRelation: string
  setGuardianRelation: Dispatch<
    SetStateAction<string>
  >

  customGuardianRelation: string
  setCustomGuardianRelation: Dispatch<
    SetStateAction<string>
  >

  whatsapp: string
  setWhatsapp: Dispatch<
    SetStateAction<string>
  >

  studentPhone: string
  setStudentPhone: Dispatch<
    SetStateAction<string>
  >

  levelId: string
  setLevelId: Dispatch<
    SetStateAction<string>
  >

  notes: string
  setNotes: Dispatch<
    SetStateAction<string>
  >

  healthNotes: string
  setHealthNotes: Dispatch<
    SetStateAction<string>
  >

  paymentMethod: PaymentMethod | null
  setPaymentMethod: Dispatch<
    SetStateAction<PaymentMethod | null>
  >

  paymentReference: string
  setPaymentReference: Dispatch<
    SetStateAction<string>
  >

  paymentProof: File | null
  setPaymentProof: Dispatch<
    SetStateAction<File | null>
  >

  submitting: boolean
  checkingPersonalId: boolean

  errorMessage: string
  successMessage: string
  submittedPersonalId: string

  onSubmit: () => void
}

function FieldLabel({
  label,
  required,
}: {
  label: string
  required?: boolean
}) {
  return (
    <label className="mb-2 block text-sm font-medium leading-6">
      {label}

      {required && (
        <span className="mr-1 text-destructive">
          *
        </span>
      )}
    </label>
  )
}

function Input(
  props: InputHTMLAttributes<HTMLInputElement>,
) {
  const {
    className = '',
    ...rest
  } = props

  return (
    <input
      {...rest}
      className={`flex h-12 w-full rounded-xl border bg-background px-3.5 py-2.5 text-base outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm ${className}`}
    />
  )
}

function Textarea(
  props: TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  const {
    className = '',
    ...rest
  } = props

  return (
    <textarea
      {...rest}
      className={`min-h-32 w-full resize-y rounded-xl border bg-background px-3.5 py-3 text-base outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm ${className}`}
    />
  )
}

function Select({
  children,
  className = '',
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`flex h-12 w-full rounded-xl border bg-background px-3.5 py-2.5 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 sm:text-sm ${className}`}
    >
      {children}
    </select>
  )
}

function SectionHeader({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div>
      <h2 className="text-lg font-bold tracking-tight">
        {title}
      </h2>

      {description && (
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  )
}

export default function RegistrationForm(
  props: Props,
) {
  const {
    settings,
    levels,
    customFields,
    customFieldValues,
    updateCustomFieldValue,
    paymentMethods,

    name,
    setName,

    personalId,
    setPersonalId,

    gender,
    setGender,

    age,
    setAge,

    phone,
    setPhone,

    guardianRelation,
    setGuardianRelation,

    customGuardianRelation,
    setCustomGuardianRelation,

    whatsapp,
    setWhatsapp,

    studentPhone,
    setStudentPhone,

    levelId,
    setLevelId,

    notes,
    setNotes,

    healthNotes,
    setHealthNotes,

    paymentMethod,
    setPaymentMethod,

    paymentReference,
    setPaymentReference,

    paymentProof,
    setPaymentProof,

    submitting,
    checkingPersonalId,

    errorMessage,
    successMessage,
    submittedPersonalId,

    onSubmit,
  } = props

  function getCustomFieldValue(
    field: CustomField,
  ) {
    return (
      customFieldValues[field.id] ??
      ''
    )
  }

  function renderCustomField(
    field: CustomField,
  ) {
    const value =
      getCustomFieldValue(field)

    const required =
      field.is_required

    if (
      field.field_type ===
      'textarea'
    ) {
      return (
        <div
          key={field.id}
          className="md:col-span-2"
        >
          <FieldLabel
            label={field.name}
            required={required}
          />

          <Textarea
            value={value}
            onChange={(event) =>
              updateCustomFieldValue(
                field.id,
                event.target.value,
              )
            }
            required={required}
            placeholder={`أدخل ${field.name}`}
          />
        </div>
      )
    }

    if (
      field.field_type ===
      'select'
    ) {
      return (
        <div key={field.id}>
          <FieldLabel
            label={field.name}
            required={required}
          />

          <Select
            value={value}
            onChange={(event) =>
              updateCustomFieldValue(
                field.id,
                event.target.value,
              )
            }
            required={required}
          >
            <option value="">
              اختر {field.name}
            </option>

            {field.options.map(
              (option) => (
                <option
                  key={option.id}
                  value={option.value}
                >
                  {option.label}
                </option>
              ),
            )}
          </Select>
        </div>
      )
    }

    if (
      field.field_type ===
      'boolean'
    ) {
      return (
        <div
          key={field.id}
          className="rounded-xl border bg-background p-4 md:col-span-2"
        >
          <label className="flex cursor-pointer items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">
                {field.name}

                {required && (
                  <span className="mr-1 text-destructive">
                    *
                  </span>
                )}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                اختر نعم أو لا
              </p>
            </div>

            <input
              type="checkbox"
              checked={
                value === 'true'
              }
              onChange={(event) =>
                updateCustomFieldValue(
                  field.id,
                  event.target.checked
                    ? 'true'
                    : 'false',
                )
              }
              className="size-5 accent-primary"
            />
          </label>
        </div>
      )
    }

    let inputType:
      | 'text'
      | 'number'
      | 'date' =
      'text'

    if (
      field.field_type ===
      'number'
    ) {
      inputType = 'number'
    }

    if (
      field.field_type ===
      'date'
    ) {
      inputType = 'date'
    }

    return (
      <div key={field.id}>
        <FieldLabel
          label={field.name}
          required={required}
        />

        <Input
          type={inputType}
          inputMode={
            inputType ===
            'number'
              ? 'numeric'
              : undefined
          }
          value={value}
          onChange={(event) =>
            updateCustomFieldValue(
              field.id,
              event.target.value,
            )
          }
          required={required}
          placeholder={
            inputType ===
            'text'
              ? `أدخل ${field.name}`
              : undefined
          }
        />
      </div>
    )
  }

  if (
    !settings.registration_open
  ) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-muted/30 px-3 py-5 sm:px-6 sm:py-10"
      >
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border bg-background p-6 text-center shadow-sm sm:p-10">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-muted">
              <AlertCircle className="size-7 text-muted-foreground" />
            </div>

            <h1 className="mt-5 text-2xl font-bold">
              التسجيل مغلق حاليًا
            </h1>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              لا يمكن تقديم طلبات تسجيل جديدة في الوقت الحالي.
            </p>

            <Link
              href="/student-status"
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl border px-5 py-2.5 text-sm font-medium transition hover:bg-muted"
            >
              متابعة حالة الطالب
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-muted/30 px-3 py-5 sm:px-6 sm:py-8 lg:py-10"
    >
      {checkingPersonalId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 px-4 backdrop-blur-[2px]">
          <div className="w-full max-w-sm rounded-2xl border bg-background p-6 text-center shadow-2xl sm:p-7">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>

            <h2 className="mt-5 text-xl font-bold">
              جاري التحقق
            </h2>

            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              جاري التحقق من الرقم الشخصي والتأكد من أن الطالب غير مسجل لهذه السنة الدراسية.
            </p>

            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-5xl">
        <div className="overflow-hidden rounded-2xl border bg-background shadow-sm sm:rounded-3xl">
          <div className="p-4 sm:p-6 lg:p-8">

            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                طلب التسجيل
              </h1>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                يرجى تعبئة البيانات التالية لتقديم طلب التسجيل.
              </p>
            </div>

            {successMessage && (
              <div className="mt-6 space-y-4">

                {/* نجاح التسجيل */}
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/20 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                      <CheckCircle2 className="size-6" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-bold text-emerald-900 dark:text-emerald-200">
                        {successMessage}
                      </h2>

                      <p className="mt-2 text-sm leading-7 text-emerald-800/80 dark:text-emerald-300/80">
                        تم استلام طلب التسجيل بنجاح وسيتم التعامل معه من قبل إدارة التعليم.
                      </p>

                      {submittedPersonalId && (
                        <div className="mt-4 rounded-xl border border-emerald-200/80 bg-white/70 p-4 dark:border-emerald-900/50 dark:bg-background/40">
                          <p className="text-xs text-muted-foreground">
                            الرقم الشخصي
                          </p>

                          <p
                            dir="ltr"
                            className="mt-1 break-all text-lg font-bold"
                          >
                            {submittedPersonalId}
                          </p>

                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            احتفظ بهذا الرقم لمتابعة حالة الطالب.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* القروب - مباشرة تحت النجاح */}
                {settings.show_education_group &&
                  settings.education_group_link && (
                    <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-5 shadow-sm dark:border-sky-900/50 dark:bg-sky-950/20 sm:p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">
                          <Users className="size-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h2 className="text-lg font-bold text-sky-900 dark:text-sky-200">
                            الانضمام إلى مجموعة التعليم
                          </h2>

                          {settings.education_group_description && (
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-sky-800/80 dark:text-sky-300/80">
                              {settings.education_group_description}
                            </p>
                          )}

                          <a
                            href={
                              settings.education_group_link
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="mt-4 inline-flex min-h-11 max-w-full items-center justify-center break-all rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 active:scale-[0.99]"
                          >
                            الانضمام إلى القروب
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                {/* متابعة الطالب */}
                <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-5 shadow-sm dark:border-violet-900/50 dark:bg-violet-950/20 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
                      <CheckCircle2 className="size-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-bold text-violet-900 dark:text-violet-200">
                        متابعة حالة الطالب
                      </h2>

                      <p className="mt-2 text-sm leading-7 text-violet-800/80 dark:text-violet-300/80">
                        يمكنك متابعة حالة طلب التسجيل والاطلاع على آخر تحديثاته من خلال صفحة متابعة الطالب.
                      </p>

                      <Link
                        href="/student-status"
                        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-violet-200 bg-white/70 px-5 py-2.5 text-sm font-semibold text-violet-800 transition hover:bg-white dark:border-violet-800 dark:bg-background/40 dark:text-violet-200 dark:hover:bg-background/70"
                      >
                        متابعة حالة الطالب
                      </Link>
                    </div>
                  </div>
                </div>

                {/* الملاحظات العامة */}
                {settings.post_registration_notes && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/30 sm:p-6">
                    <h2 className="text-base font-bold">
                      ملاحظات مهمة
                    </h2>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                      {settings.post_registration_notes}
                    </p>
                  </div>
                )}

              </div>
            )}

            {errorMessage && (
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm leading-6 text-destructive">
                <AlertCircle className="mt-0.5 size-5 shrink-0" />

                <span>
                  {errorMessage}
                </span>
              </div>
            )}

            {!successMessage && (
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  onSubmit()
                }}
                className="mt-7 space-y-8 sm:mt-8"
              >

                {/* بيانات الطالب                 {/* بيانات الطالب                 {/* بيانات الطالب */}
                <section className="space-y-5">
                  <SectionHeader
                    title="بيانات الطالب"
                    description="يرجى إدخال البيانات الأساسية للطالب."
                  />

                  <div className="grid gap-5 md:grid-cols-2">

                    {settings.show_name && (
                      <div className="md:col-span-2">
                        <FieldLabel
                          label="الاسم"
                          required={
                            settings.required_name
                          }
                        />

                        <Input
                          value={name}
                          onChange={(event) =>
                            setName(
                              event.target.value,
                            )
                          }
                          placeholder="أدخل اسم الطالب"
                          autoComplete="name"
                          required={
                            settings.required_name
                          }
                        />
                      </div>
                    )}

                    {settings.show_personal_id && (
                      <div>
                        <FieldLabel
                          label="الرقم الشخصي"
                          required={
                            settings.required_personal_id
                          }
                        />

                        <Input
                          type="tel"
                          inputMode="numeric"
                          pattern="[0-9]{9}"
                          maxLength={9}
                          value={personalId}
                          onChange={(event) =>
                            setPersonalId(
                              event.target.value
                                .replace(/\D/g, '')
                                .slice(0, 9),
                            )
                          }
                          placeholder="أدخل الرقم الشخصي"
                          autoComplete="off"
                          dir="ltr"
                          required={
                            settings.required_personal_id
                          }
                        />

                        {personalId.length > 0 &&
                          personalId.length !== 9 && (
                            <p
                              className="mt-1.5 text-sm font-medium text-red-600"
                              role="alert"
                            >
                              الرقم الشخصي يجب أن يتكون من 9 أرقام.
                              {` باقي ${9 - personalId.length} أرقام.`}
                            </p>
                          )}
                      </div>
                    )}

                    {settings.show_gender && (
                      <div>
                        <FieldLabel
                          label="الجنس"
                          required={
                            settings.required_gender
                          }
                        />

                        <Select
                          value={gender}
                          onChange={(event) =>
                            setGender(
                              event.target.value,
                            )
                          }
                          required={
                            settings.required_gender
                          }
                        >
                          <option value="">
                            اختر الجنس
                          </option>

                          <option value="ذكر">
                            ذكر
                          </option>

                          <option value="أنثى">
                            أنثى
                          </option>
                        </Select>
                      </div>
                    )}

                    {settings.show_age && (
                      <div>
                        <FieldLabel
                          label="العمر"
                          required={
                            settings.required_age
                          }
                        />

                        <Input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          max="120"
                          value={age}
                          onChange={(event) =>
                            setAge(
                              event.target.value,
                            )
                          }
                          placeholder="أدخل العمر"
                          required={
                            settings.required_age
                          }
                        />
                      </div>
                    )}

                    {settings.show_phone && (
                      <div>
                        <FieldLabel
                          label="رقم الاتصال الأساسي - الواتساب"
                          required={
                            settings.required_phone
                          }
                        />

                        <Input
                          type="tel"
                          inputMode="numeric"
                          pattern="[0-9]{8}"
                          maxLength={8}
                          value={phone}
                          onChange={(event) =>
                            setPhone(
                              event.target.value
                                .replace(/\D/g, '')
                                .slice(0, 8),
                            )
                          }
                          placeholder="مثال: 3XXXXXXX"
                          autoComplete="tel"
                          dir="ltr"
                          required={
                            settings.required_phone
                          }
                        />

                        {phone.length > 0 &&
                          phone.length !== 8 && (
                            <p
                              className="mt-1.5 text-sm font-medium text-red-600"
                              role="alert"
                            >
                              رقم الاتصال الأساسي يجب أن يتكون من 8 أرقام.
                              {` باقي ${8 - phone.length} أرقام.`}
                            </p>
                          )}
                      </div>
                    )}

                    {settings.show_guardian_relation && (
                      <div>
                        <FieldLabel
                          label="صلة القرابة"
                          required={
                            settings.required_guardian_relation
                          }
                        />

                        <Select
                          value={
                            guardianRelation
                          }
                          onChange={(event) => {
                            const value =
                              event.target.value

                            setGuardianRelation(
                              value,
                            )

                            if (
                              value !==
                              'أخرى'
                            ) {
                              setCustomGuardianRelation(
                                '',
                              )
                            }
                          }}
                          required={
                            settings.required_guardian_relation &&
                            guardianRelation !==
                              'أخرى'
                          }
                        >
                          <option value="">
                            اختر صلة القرابة
                          </option>

                          <option value="الأب">
                            الأب
                          </option>

                          <option value="الأم">
                            الأم
                          </option>

                          <option value="الأخ">
                            الأخ
                          </option>

                          <option value="الأخت">
                            الأخت
                          </option>

                          <option value="الجد">
                            الجد
                          </option>

                          <option value="الجدة">
                            الجدة
                          </option>

                          <option value="أخرى">
                            أخرى
                          </option>
                        </Select>

                        {guardianRelation ===
                          'أخرى' && (
                          <div className="mt-3">
                            <Input
                              value={
                                customGuardianRelation
                              }
                              onChange={(
                                event,
                              ) =>
                                setCustomGuardianRelation(
                                  event.target.value,
                                )
                              }
                              placeholder="اكتب صلة القرابة"
                              required={
                                settings.required_guardian_relation
                              }
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {settings.show_whatsapp && (
                      <div>
                        <FieldLabel
                          label="رقم التواصل الثاني"
                          required={
                            settings.required_whatsapp
                          }
                        />

                        <Input
                          type="tel"
                          inputMode="numeric"
                          pattern="[0-9]{8}"
                          maxLength={8}
                          value={whatsapp}
                          onChange={(event) =>
                            setWhatsapp(
                              event.target.value
                                .replace(/\D/g, '')
                                .slice(0, 8),
                            )
                          }
                          placeholder="مثال: 3XXXXXXX"
                          autoComplete="tel"
                          dir="ltr"
                          required={
                            settings.required_whatsapp
                          }
                        />

                        {whatsapp.length > 0 &&
                          whatsapp.length !== 8 && (
                            <p
                              className="mt-1.5 text-sm font-medium text-red-600"
                              role="alert"
                            >
                              رقم التواصل الثاني يجب أن يتكون من 8 أرقام.
                              {` باقي ${8 - whatsapp.length} أرقام.`}
                            </p>
                          )}
                      </div>
                    )}

                    {settings.show_student_phone && (
                      <div>
                        <FieldLabel
                          label="رقم الطالب"
                          required={
                            settings.required_student_phone
                          }
                        />

                        <Input
                          type="tel"
                          inputMode="numeric"
                          pattern="[0-9]{8}"
                          maxLength={8}
                          value={studentPhone}
                          onChange={(event) =>
                            setStudentPhone(
                              event.target.value
                                .replace(/\D/g, '')
                                .slice(0, 8),
                            )
                          }
                          placeholder="أدخل رقم الطالب"
                          autoComplete="tel"
                          dir="ltr"
                          required={
                            settings.required_student_phone
                          }
                        />

                        {studentPhone.length > 0 &&
                          studentPhone.length !== 8 && (
                            <p
                              className="mt-1.5 text-sm font-medium text-red-600"
                              role="alert"
                            >
                              رقم الطالب يجب أن يتكون من 8 أرقام.
                              {` باقي ${8 - studentPhone.length} أرقام.`}
                            </p>
                          )}
                      </div>
                      )}

                    {settings.show_level && (
                      <div>
                        <FieldLabel
                          label="الصف / المستوى"
                          required={
                            settings.required_level
                          }
                        />

                        <Select
                          value={levelId}
                          onChange={(event) =>
                            setLevelId(
                              event.target.value,
                            )
                          }
                          required={
                            settings.required_level
                          }
                        >
                          <option value="">
                            اختر المستوى
                          </option>

                          {levels.map(
                            (level) => (
                              <option
                                key={
                                  level.id
                                }
                                value={
                                  level.id
                                }
                              >
                                {level.name}
                              </option>
                            ),
                          )}
                        </Select>
                      </div>
                    )}

                    {settings.show_notes && (
                      <div className="md:col-span-2">
                        <FieldLabel
                          label="الملاحظات"
                          required={
                            settings.required_notes
                          }
                        />

                        <Textarea
                          value={notes}
                          onChange={(event) =>
                            setNotes(
                              event.target.value,
                            )
                          }
                          placeholder="أضف أي ملاحظات..."
                          required={
                            settings.required_notes
                          }
                        />
                      </div>
                    )}

                    {settings.show_health_notes && (
                      <div className="md:col-span-2">
                        <FieldLabel
                          label="الحالة الصحية"
                          required={
                            settings.required_health_notes
                          }
                        />

                        <Textarea
                          value={
                            healthNotes
                          }
                          onChange={(event) =>
                            setHealthNotes(
                              event.target.value,
                            )
                          }
                          placeholder="اذكر الحالة الصحية أو أي ملاحظات صحية..."
                          required={
                            settings.required_health_notes
                          }
                        />
                      </div>
                    )}

                  </div>
                </section>

                {/* الحقول الإضافية */}
                {customFields.length >
                  0 && (
                  <section className="space-y-5 border-t pt-7">
                    <SectionHeader
                      title="بيانات إضافية"
                      description="يرجى تعبئة البيانات الإضافية المطلوبة."
                    />

                    <div className="grid gap-5 md:grid-cols-2">
                      {customFields.map(
                        (field) =>
                          renderCustomField(
                            field,
                          ),
                      )}
                    </div>
                  </section>
                )}

                {/* الدفع */}
                {settings.payment_enabled && (
                  <section className="space-y-5 border-t pt-7">
                    <SectionHeader title="الدفع" />

                    {settings.payment_amount >
                      0 && (
                      <div className="rounded-xl border bg-muted/30 p-4">
                        <p className="text-sm text-muted-foreground">
                          مبلغ التسجيل
                        </p>

                        <p className="mt-1 text-xl font-bold">
                          {
                            settings.payment_amount
                          }{' '}
                          د.ب
                        </p>
                      </div>
                    )}

                    {settings.show_payment_qr &&
                      settings.payment_qr_url && (
                        <div className="rounded-xl border p-4">
                          <div className="flex items-center gap-2">
                            <FileImage className="size-5 text-primary" />

                            <p className="font-medium">
                              QR / باركود الدفع
                            </p>
                          </div>

                          <div className="mt-4 flex justify-center overflow-hidden rounded-xl">
                            <img
                              src={
                                settings.payment_qr_url
                              }
                              alt="QR الدفع"
                              className="max-h-64 max-w-full rounded-lg border object-contain"
                            />
                          </div>
                        </div>
                      )}

                    <div>
                      <FieldLabel
                        label="طريقة الدفع"
                        required
                      />

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {paymentMethods.map(
                          (method) => (
                            <button
                              key={
                                method.id
                              }
                              type="button"
                              onClick={() =>
                                setPaymentMethod(
                                  method.id,
                                )
                              }
                              className={`min-h-14 touch-manipulation rounded-xl border p-3.5 text-right transition active:scale-[0.99] ${
                                paymentMethod ===
                                method.id
                                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                  : 'hover:bg-muted/50'
                              }`}
                            >
                              <p className="font-medium">
                                {
                                  method.label
                                }
                              </p>
                            </button>
                          ),
                        )}
                      </div>
                    </div>

                    {settings.payment_link_enabled &&
                      paymentMethod ===
                        'payment_link' &&
                      settings.payment_link && (
                        <div className="rounded-xl border bg-muted/30 p-4">
                          <p className="text-sm leading-6 text-muted-foreground">
                            استخدم الرابط التالي لإتمام الدفع:
                          </p>

                          <a
                            href={
                              settings.payment_link
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 block break-all text-sm font-medium leading-6 text-primary underline"
                          >
                            {
                              settings.payment_link
                            }
                          </a>
                        </div>
                      )}

                    <div className="grid gap-5 md:grid-cols-2">
                      <div>
                        <FieldLabel label="رقم المرجع" />

                        <Input
                          type="tel"
                          inputMode="numeric"
                          value={
                            paymentReference
                          }
                          onChange={(
                            event,
                          ) =>
                            setPaymentReference(
                              event.target.value,
                            )
                          }
                          placeholder="رقم عملية الدفع إن وجد"
                          dir="ltr"
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
                            onChange={(
                              event,
                            ) =>
                              setPaymentProof(
                                event.target
                                  .files?.[0] ??
                                  null,
                              )
                            }
                            required={
                              settings.payment_proof_required
                            }
                            className="h-auto min-h-12 cursor-pointer py-3 file:mr-0 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium"
                          />

                          <p className="mt-2 text-xs leading-5 text-muted-foreground">
                            يمكنك إرفاق صورة أو ملف PDF لإثبات الدفع.
                          </p>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* زر الإرسال */}
                <section className="border-t pt-7">
                  <Button
                    type="submit"
                    size="lg"
                    className="h-13 w-full touch-manipulation rounded-xl text-base font-semibold sm:h-12"
                    disabled={
                      submitting
                    }
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

                  <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">
                    سيتم إرسال الطلب إلى قسم طلبات التسجيل للمراجعة.
                  </p>
                </section>

              </form>
            )}

          </div>
        </div>
      </div>
    </main>
  )
}
