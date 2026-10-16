
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
  CalendarDays,
  UserRound,
  Phone,
  HeartPulse,
  MessageSquareText,
  CreditCard,
  ClipboardList,
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

type AcademicYear = {
  id: string
  name: string
}

type RegistrationCourse = {
  id: string
  name: string
  academic_year_id: string
  start_date: string | null
  end_date: string | null
  is_closed: boolean
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
  academicYear: AcademicYear | null
  registrationCourse: RegistrationCourse | null
  levels: Level[]
  customFields: CustomField[]
  customFieldValues: Record<string, string>
  updateCustomFieldValue: (fieldId: string, value: string) => void
  paymentMethods: {
    id: PaymentMethod
    label: string
  }[]

  name: string
  setName: Dispatch<SetStateAction<string>>
  personalId: string
  setPersonalId: Dispatch<SetStateAction<string>>
  gender: string
  setGender: Dispatch<SetStateAction<string>>
  age: string
  setAge: Dispatch<SetStateAction<string>>
  phone: string
  setPhone: Dispatch<SetStateAction<string>>
  guardianRelation: string
  setGuardianRelation: Dispatch<SetStateAction<string>>
  customGuardianRelation: string
  setCustomGuardianRelation: Dispatch<SetStateAction<string>>
  whatsapp: string
  setWhatsapp: Dispatch<SetStateAction<string>>
  studentPhone: string
  setStudentPhone: Dispatch<SetStateAction<string>>
  levelId: string
  setLevelId: Dispatch<SetStateAction<string>>
  notes: string
  setNotes: Dispatch<SetStateAction<string>>
  healthNotes: string
  setHealthNotes: Dispatch<SetStateAction<string>>

  paymentMethod: PaymentMethod | null
  setPaymentMethod: Dispatch<SetStateAction<PaymentMethod | null>>
  paymentReference: string
  setPaymentReference: Dispatch<SetStateAction<string>>
  paymentProof: File | null
  setPaymentProof: Dispatch<SetStateAction<File | null>>

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
    <label className="mb-2 block text-sm font-semibold leading-6 text-foreground">
      {label}
      {required && (
        <span className="mr-1 text-red-600 dark:text-red-400">
          *
        </span>
      )}
    </label>
  )
}

function Input(
  props: InputHTMLAttributes<HTMLInputElement>,
) {
  const { className = '', ...rest } = props

  return (
    <input
      {...rest}
      className={`block min-h-12 w-full min-w-0 rounded-xl border border-input bg-background px-3.5 py-3 text-base text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground/80 hover:border-primary/40 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 sm:text-sm ${className}`}
    />
  )
}

function Textarea(
  props: TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  const { className = '', ...rest } = props

  return (
    <textarea
      {...rest}
      className={`block min-h-32 w-full min-w-0 resize-y rounded-xl border border-input bg-background px-3.5 py-3 text-base leading-7 text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground/80 hover:border-primary/40 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm ${className}`}
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
      className={`block min-h-12 w-full min-w-0 appearance-auto rounded-xl border border-input bg-background px-3.5 py-3 text-base text-foreground shadow-sm outline-none transition-colors hover:border-primary/40 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 sm:text-sm ${className}`}
    >
      {children}
    </select>
  )
}

function SectionHeader({
  title,
  description,
  icon: Icon,
}: {
  title: string
  description?: string
  icon?: typeof UserRound
}) {
  return (
    <div className="flex items-start gap-3">
      {Icon && (
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
          {title}
        </h2>

        {description && (
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </div>
  )
}

function FieldHint({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <p className="mt-2 text-xs leading-6 text-muted-foreground sm:text-sm">
      {children}
    </p>
  )
}

function FieldError({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <p
      role="alert"
      className="mt-2 flex items-start gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium leading-6 text-red-700 dark:bg-red-950/30 dark:text-red-300"
    >
      <AlertCircle className="mt-1 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

function FieldCard({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      {children}
    </div>
  )
}

function formatCourseDate(value: string | null) {
  if (!value) return 'غير محدد'

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return 'غير محدد'
  }

  return new Intl.DateTimeFormat('ar-BH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export default function RegistrationForm(props: Props) {
  const {
    settings,
    academicYear,
    registrationCourse,
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

  function getCustomFieldValue(field: CustomField) {
    return customFieldValues[field.id] ?? ''
  }

  function renderCustomField(field: CustomField) {
    const value = getCustomFieldValue(field)
    const required = field.is_required

    if (field.field_type === 'textarea') {
      return (
        <FieldCard key={field.id} className="md:col-span-2">
          <FieldLabel label={field.name} required={required} />
          <Textarea
            value={value}
            onChange={(event) =>
              updateCustomFieldValue(field.id, event.target.value)
            }
            required={required}
            placeholder={`أدخل ${field.name}`}
          />
        </FieldCard>
      )
    }

    if (field.field_type === 'select') {
      return (
        <FieldCard key={field.id}>
          <FieldLabel label={field.name} required={required} />
          <Select
            value={value}
            onChange={(event) =>
              updateCustomFieldValue(field.id, event.target.value)
            }
            required={required}
          >
            <option value="">اختر {field.name}</option>
            {field.options.map((option) => (
              <option key={option.id} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </FieldCard>
      )
    }

    if (field.field_type === 'boolean') {
      return (
        <div
          key={field.id}
          className="rounded-xl border border-input bg-background p-4 md:col-span-2"
        >
          <label className="flex min-h-10 cursor-pointer items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {field.name}
                {required && (
                  <span className="mr-1 text-red-600">*</span>
                )}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                اختر نعم أو لا
              </p>
            </div>

            <input
              type="checkbox"
              checked={value === 'true'}
              onChange={(event) =>
                updateCustomFieldValue(
                  field.id,
                  event.target.checked ? 'true' : 'false',
                )
              }
              className="size-5 shrink-0 cursor-pointer accent-primary"
            />
          </label>
        </div>
      )
    }

    const inputType =
      field.field_type === 'number'
        ? 'number'
        : field.field_type === 'date'
          ? 'date'
          : 'text'

    return (
      <FieldCard key={field.id}>
        <FieldLabel label={field.name} required={required} />
        <Input
          type={inputType}
          inputMode={inputType === 'number' ? 'numeric' : undefined}
          value={value}
          onChange={(event) =>
            updateCustomFieldValue(field.id, event.target.value)
          }
          required={required}
          placeholder={
            inputType === 'text' ? `أدخل ${field.name}` : undefined
          }
        />
      </FieldCard>
    )
  }

  if (!settings.registration_open) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-muted/30 px-3 py-6 sm:px-6 sm:py-10"
      >
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border bg-background p-6 text-center shadow-sm sm:p-10">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <AlertCircle className="size-7" />
            </div>

            <h1 className="mt-5 text-2xl font-bold">
              التسجيل مغلق حاليًا
            </h1>

            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              لا يمكن تقديم طلبات تسجيل جديدة في الوقت الحالي.
            </p>

            <Link
              href="/student-status"
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl border px-5 py-2.5 text-sm font-semibold transition hover:bg-muted"
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
      className="min-h-screen overflow-x-hidden bg-slate-50 px-3 py-4 dark:bg-slate-950 sm:px-6 sm:py-8 lg:py-10"
    >
      {checkingPersonalId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 px-4 backdrop-blur-[2px]">
          <div className="w-full max-w-sm rounded-2xl border bg-background p-6 text-center shadow-2xl sm:p-7">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>

            <h2 className="mt-5 text-xl font-bold">جاري التحقق</h2>

            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              جاري التحقق من الرقم الشخصي والتأكد من أن الطالب غير مسجل لهذه السنة الدراسية.
            </p>

            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-6xl">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-background shadow-sm dark:border-slate-800 sm:rounded-3xl">
          {/* رأس الصفحة */}
          <header className="border-b border-slate-200 bg-gradient-to-l from-primary/[0.07] via-background to-background px-4 py-6 sm:px-7 sm:py-8 lg:px-9 dark:border-slate-800">
            <div className="flex items-start gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:size-14">
                <ClipboardList className="size-6 sm:size-7" />
              </div>

              <div className="min-w-0">
                <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                  طلب التسجيل
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                  يرجى تعبئة البيانات التالية بدقة لإرسال طلب التسجيل.
                  الحقول التي تحمل علامة <span className="font-bold text-red-600">*</span> مطلوبة.
                </p>
              </div>
            </div>
          </header>

          <div className="space-y-7 p-4 sm:space-y-9 sm:p-7 lg:p-9">
            {/* معلومات الدورة */}
            <section className="rounded-2xl border border-primary/20 bg-primary/[0.035] p-4 sm:p-5">
              <SectionHeader
                title="معلومات الدورة الحالية"
                description="راجع معلومات السنة الدراسية والدورة قبل تعبئة الطلب."
                icon={CalendarDays}
              />

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: 'السنة الدراسية',
                    value: academicYear?.name ?? 'غير محددة',
                  },
                  {
                    label: 'الدورة الحالية',
                    value: registrationCourse?.name ?? 'غير محددة',
                  },
                  {
                    label: 'بداية الدورة',
                    value: formatCourseDate(registrationCourse?.start_date ?? null),
                  },
                  {
                    label: 'نهاية الدورة',
                    value: formatCourseDate(registrationCourse?.end_date ?? null),
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="min-w-0 rounded-xl border border-slate-200/80 bg-background p-3.5 dark:border-slate-800"
                  >
                    <p className="text-xs font-medium text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="mt-1.5 break-words text-sm font-bold leading-6 text-foreground">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* نجاح التسجيل */}
            {successMessage && (
              <div className="space-y-4">
                <section
                  role="status"
                  className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/25 sm:p-6"
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                      <CheckCircle2 className="size-6" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-bold leading-7 text-emerald-900 dark:text-emerald-200">
                        {successMessage}
                      </h2>

                      <p className="mt-2 text-sm leading-7 text-emerald-800 dark:text-emerald-300">
                        تم استلام طلب التسجيل بنجاح، وسيتم التعامل معه من قبل إدارة التعليم.
                      </p>

                      {submittedPersonalId && (
                        <div className="mt-4 rounded-xl border border-emerald-200 bg-white/80 p-4 dark:border-emerald-900/60 dark:bg-background/50">
                          <p className="text-xs font-medium text-muted-foreground">
                            الرقم الشخصي
                          </p>
                          <p
                            dir="ltr"
                            className="mt-1 break-all text-lg font-bold text-foreground"
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
                </section>

                {settings.show_education_group &&
                  settings.education_group_link && (
                    <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900/60 dark:bg-sky-950/25 sm:p-6">
                      <div className="flex items-start gap-3">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300">
                          <Users className="size-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h2 className="text-lg font-bold text-sky-900 dark:text-sky-200">
                            الانضمام إلى مجموعة التعليم
                          </h2>

                          {settings.education_group_description && (
                            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-sky-800 dark:text-sky-300">
                              {settings.education_group_description}
                            </p>
                          )}

                          <a
                            href={settings.education_group_link}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-4 inline-flex min-h-11 max-w-full items-center justify-center rounded-xl bg-sky-700 px-5 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-sky-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-500/30"
                          >
                            الانضمام إلى القروب
                          </a>
                        </div>
                      </div>
                    </section>
                  )}

                <section className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900/60 dark:bg-violet-950/25 sm:p-6">
                  <div className="flex items-start gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300">
                      <CheckCircle2 className="size-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-bold text-violet-900 dark:text-violet-200">
                        متابعة حالة الطالب
                      </h2>

                      <p className="mt-2 text-sm leading-7 text-violet-800 dark:text-violet-300">
                        يمكنك متابعة حالة طلب التسجيل والاطلاع على آخر تحديثاته من خلال صفحة متابعة الطالب.
                      </p>

                      <Link
                        href="/student-status"
                        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-violet-200 bg-background px-5 py-2.5 text-sm font-semibold text-violet-800 transition hover:bg-violet-100 dark:border-violet-800 dark:text-violet-200 dark:hover:bg-violet-950"
                      >
                        متابعة حالة الطالب
                      </Link>
                    </div>
                  </div>
                </section>

                {settings.post_registration_notes && (
                  <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40 sm:p-5">
                    <h2 className="font-bold">ملاحظات مهمة</h2>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">
                      {settings.post_registration_notes}
                    </p>
                  </section>
                )}
              </div>
            )}

            {/* رسالة الخطأ */}
            {errorMessage && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-7 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
              >
                <AlertCircle className="mt-1 size-5 shrink-0" />
                <p className="min-w-0 break-words">{errorMessage}</p>
              </div>
            )}

            {!successMessage && (
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  onSubmit()
                }}
                className="space-y-8 sm:space-y-10"
              >
                {/* بيانات الطالب */}
                <section className="space-y-5">
                  <SectionHeader
                    title="بيانات الطالب"
                    description="أدخل المعلومات الشخصية الأساسية للطالب."
                    icon={UserRound}
                  />

                  <div className="grid grid-cols-1 gap-x-5 gap-y-5 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/20 sm:grid-cols-2 sm:p-5 lg:gap-x-6 lg:gap-y-6">
                    {settings.show_name && (
                      <FieldCard className="sm:col-span-2">
                        <FieldLabel
                          label="الاسم الكامل للطالب"
                          required={settings.required_name}
                        />
                        <Input
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          placeholder="أدخل اسم الطالب الكامل"
                          autoComplete="name"
                          required={settings.required_name}
                        />
                      </FieldCard>
                    )}

                    {settings.show_personal_id && (
                      <FieldCard>
                        <FieldLabel
                          label="الرقم الشخصي"
                          required={settings.required_personal_id}
                        />
                        <Input
                          type="tel"
                          inputMode="numeric"
                          pattern="[0-9]{9}"
                          maxLength={9}
                          value={personalId}
                          onChange={(event) =>
                            setPersonalId(
                              event.target.value.replace(/\D/g, '').slice(0, 9),
                            )
                          }
                          placeholder="9 أرقام"
                          autoComplete="off"
                          dir="ltr"
                          required={settings.required_personal_id}
                        />
                        {personalId.length > 0 && personalId.length !== 9 && (
                          <FieldError>
                            الرقم الشخصي يجب أن يتكون من 9 أرقام. باقي {9 - personalId.length} أرقام.
                          </FieldError>
                        )}
                      </FieldCard>
                    )}

                    {settings.show_gender && (
                      <FieldCard>
                        <FieldLabel
                          label="الجنس"
                          required={settings.required_gender}
                        />
                        <Select
                          value={gender}
                          onChange={(event) => setGender(event.target.value)}
                          required={settings.required_gender}
                        >
                          <option value="">اختر الجنس</option>
                          <option value="ذكر">ذكر</option>
                          <option value="أنثى">أنثى</option>
                        </Select>
                      </FieldCard>
                    )}

                    {settings.show_age && (
                      <FieldCard>
                        <FieldLabel
                          label="العمر"
                          required={settings.required_age}
                        />
                        <Input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          max="120"
                          value={age}
                          onChange={(event) => setAge(event.target.value)}
                          placeholder="أدخل العمر بالسنوات"
                          required={settings.required_age}
                        />
                      </FieldCard>
                    )}

                    {settings.show_level && (
                      <FieldCard>
                        <FieldLabel
                          label="الصف / المستوى"
                          required={settings.required_level}
                        />
                        <Select
                          value={levelId}
                          onChange={(event) => setLevelId(event.target.value)}
                          required={settings.required_level}
                        >
                          <option value="">اختر الصف أو المستوى</option>
                          {levels.map((level) => (
                            <option key={level.id} value={level.id}>
                              {level.name}
                            </option>
                          ))}
                        </Select>
                      </FieldCard>
                    )}
                  </div>
                </section>

                {/* بيانات التواصل الأساسية: الرقم وصلة القرابة في قسم واحد */}
                {(settings.show_phone || settings.show_guardian_relation) && (
                  <section className="space-y-5">
                    <SectionHeader
                      title="بيانات التواصل الأساسية"
                      description="بيانات الشخص المسؤول عن الطالب وصلة القرابة به. يرجى التأكد من صحة رقم التواصل."
                      icon={Phone}
                    />

                    <div className="space-y-5 rounded-2xl border border-sky-200 bg-sky-50/50 p-4 dark:border-sky-900/60 dark:bg-sky-950/15 sm:p-5">
                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        {settings.show_phone && (
                          <FieldCard>
                            <FieldLabel
                              label="رقم واتساب الشخص المسؤول"
                              required={settings.required_phone}
                            />
                            <Input
                              type="tel"
                              inputMode="numeric"
                              pattern="[0-9]{8}"
                              maxLength={8}
                              value={phone}
                              onChange={(event) =>
                                setPhone(
                                  event.target.value.replace(/\D/g, '').slice(0, 8),
                                )
                              }
                              placeholder="أدخل رقم الهاتف المكوّن من 8 أرقام"
                              autoComplete="tel"
                              dir="ltr"
                              required={settings.required_phone}
                            />
                            {phone.length > 0 && phone.length !== 8 ? (
                              <FieldError>
                                رقم الواتساب يجب أن يتكون من 8 أرقام. باقي {8 - phone.length} أرقام.
                              </FieldError>
                            ) : (
                              <FieldHint>
                                الرقم الذي ستستخدمه الإدارة للتواصل مع الشخص المسؤول عن الطالب.
                              </FieldHint>
                            )}
                          </FieldCard>
                        )}

                        {settings.show_guardian_relation && (
                          <FieldCard>
                            <FieldLabel
                              label="صلة القرابة بالطالب"
                              required={settings.required_guardian_relation}
                            />
                            <Select
                              value={guardianRelation}
                              onChange={(event) => {
                                const value = event.target.value
                                setGuardianRelation(value)

                                if (value !== 'أخرى') {
                                  setCustomGuardianRelation('')
                                }
                              }}
                              required={settings.required_guardian_relation}
                            >
                              <option value="">اختر صلة القرابة</option>
                              <option value="الأب">الأب</option>
                              <option value="الأم">الأم</option>
                              <option value="الأخ">الأخ</option>
                              <option value="الأخت">الأخت</option>
                              <option value="الجد">الجد</option>
                              <option value="الجدة">الجدة</option>
                              <option value="أخرى">أخرى</option>
                            </Select>
                            <FieldHint>
                              حدد صلة الشخص الذي سيتولى متابعة شؤون الطالب.
                            </FieldHint>
                          </FieldCard>
                        )}
                      </div>

                      {settings.show_guardian_relation &&
                        guardianRelation === 'أخرى' && (
                          <FieldCard>
                            <FieldLabel
                              label="تحديد صلة القرابة"
                              required={settings.required_guardian_relation}
                            />
                            <Input
                              value={customGuardianRelation}
                              onChange={(event) =>
                                setCustomGuardianRelation(event.target.value)
                              }
                              placeholder="اكتب صلة القرابة"
                              required={settings.required_guardian_relation}
                            />
                          </FieldCard>
                        )}
                    </div>
                  </section>
                )}

                {/* أرقام إضافية */}
                {(settings.show_whatsapp || settings.show_student_phone) && (
                  <section className="space-y-5">
                    <SectionHeader
                      title="أرقام تواصل إضافية"
                      description="يمكنك إضافة رقم آخر للتواصل أو رقم هاتف الطالب نفسه."
                      icon={Users}
                    />

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      {settings.show_whatsapp && (
                        <FieldCard className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:p-5">
                          <FieldLabel
                            label="رقم واتساب إضافي"
                            required={settings.required_whatsapp}
                          />
                          <Input
                            type="tel"
                            inputMode="numeric"
                            pattern="[0-9]{8}"
                            maxLength={8}
                            value={whatsapp}
                            onChange={(event) =>
                              setWhatsapp(
                                event.target.value.replace(/\D/g, '').slice(0, 8),
                              )
                            }
                            placeholder="أدخل الرقم الإضافي"
                            autoComplete="tel"
                            dir="ltr"
                            required={settings.required_whatsapp}
                          />
                          {whatsapp.length > 0 && whatsapp.length !== 8 ? (
                            <FieldError>
                              رقم التواصل الإضافي يجب أن يتكون من 8 أرقام. باقي {8 - whatsapp.length} أرقام.
                            </FieldError>
                          ) : (
                            <FieldHint>
                              رقم إضافي لولي الأمر أو شخص آخر معني بمتابعة الطالب.
                            </FieldHint>
                          )}
                        </FieldCard>
                      )}

                      {settings.show_student_phone && (
                        <FieldCard className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:p-5">
                          <FieldLabel
                            label="رقم هاتف الطالب"
                            required={settings.required_student_phone}
                          />
                          <Input
                            type="tel"
                            inputMode="numeric"
                            pattern="[0-9]{8}"
                            maxLength={8}
                            value={studentPhone}
                            onChange={(event) =>
                              setStudentPhone(
                                event.target.value.replace(/\D/g, '').slice(0, 8),
                              )
                            }
                            placeholder="أدخل رقم هاتف الطالب"
                            autoComplete="tel"
                            dir="ltr"
                            required={settings.required_student_phone}
                          />
                          {studentPhone.length > 0 && studentPhone.length !== 8 ? (
                            <FieldError>
                              رقم هاتف الطالب يجب أن يتكون من 8 أرقام. باقي {8 - studentPhone.length} أرقام.
                            </FieldError>
                          ) : (
                            <FieldHint>
                              أدخل رقم الطالب نفسه إذا كان لديه هاتف خاص به.
                            </FieldHint>
                          )}
                        </FieldCard>
                      )}
                    </div>
                  </section>
                )}

                {/* الملاحظات والحالة الصحية */}
                {(settings.show_notes || settings.show_health_notes) && (
                  <section className="space-y-5">
                    <SectionHeader
                      title="الملاحظات والمعلومات الصحية"
                      description="أضف المعلومات التي تساعد الإدارة على متابعة الطالب بشكل أفضل."
                      icon={MessageSquareText}
                    />

                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                      {settings.show_notes && (
                        <FieldCard className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:p-5">
                          <FieldLabel
                            label="ملاحظات عامة"
                            required={settings.required_notes}
                          />
                          <Textarea
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            placeholder="اكتب أي ملاحظات أو معلومات إضافية..."
                            required={settings.required_notes}
                          />
                        </FieldCard>
                      )}

                      {settings.show_health_notes && (
                        <FieldCard className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 dark:border-amber-900/50 dark:bg-amber-950/10 sm:p-5">
                          <FieldLabel
                            label="الحالة الصحية"
                            required={settings.required_health_notes}
                          />
                          <Textarea
                            value={healthNotes}
                            onChange={(event) =>
                              setHealthNotes(event.target.value)
                            }
                            placeholder="اذكر الحالة الصحية أو أي ملاحظات صحية مهمة..."
                            required={settings.required_health_notes}
                          />
                          <FieldHint>
                            اذكر المعلومات الضرورية التي ينبغي للإدارة معرفتها.
                          </FieldHint>
                        </FieldCard>
                      )}
                    </div>
                  </section>
                )}

                {/* الحقول الإضافية */}
                {customFields.length > 0 && (
                  <section className="space-y-5 border-t border-slate-200 pt-7 dark:border-slate-800 sm:pt-8">
                    <SectionHeader
                      title="بيانات إضافية"
                      description="يرجى تعبئة الحقول الإضافية المطلوبة."
                      icon={ClipboardList}
                    />

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      {customFields
                        .filter((field) => field.is_visible)
                        .map((field) => renderCustomField(field))}
                    </div>
                  </section>
                )}

                {/* الدفع */}
                {settings.payment_enabled && (
                  <section className="space-y-5 border-t border-slate-200 pt-7 dark:border-slate-800 sm:pt-8">
                    <SectionHeader
                      title="بيانات الدفع"
                      description="اختر طريقة الدفع المناسبة وأرفق إثبات الدفع إذا كان مطلوبًا."
                      icon={CreditCard}
                    />

                    {settings.payment_amount > 0 && (
                      <div className="flex items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/[0.04] p-4 sm:p-5">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            مبلغ التسجيل
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            المبلغ المطلوب سداده
                          </p>
                        </div>
                        <p className="shrink-0 text-2xl font-extrabold text-primary">
                          {settings.payment_amount} <span className="text-sm">د.ب</span>
                        </p>
                      </div>
                    )}

                    {settings.show_payment_qr && settings.payment_qr_url && (
                      <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:p-5">
                        <div className="flex items-center gap-2">
                          <FileImage className="size-5 text-primary" />
                          <p className="font-semibold">QR / باركود الدفع</p>
                        </div>

                        <div className="mt-4 flex justify-center overflow-hidden rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                          <img
                            src={settings.payment_qr_url}
                            alt="QR الدفع"
                            className="max-h-64 max-w-full rounded-lg object-contain"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <FieldLabel label="طريقة الدفع" required />

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {paymentMethods.map((method) => {
                          const selected = paymentMethod === method.id

                          return (
                            <button
                              key={method.id}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => setPaymentMethod(method.id)}
                              className={`flex min-h-14 touch-manipulation items-center justify-between gap-3 rounded-xl border p-4 text-right transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 active:scale-[0.99] ${
                                selected
                                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                  : 'border-slate-200 bg-background hover:border-primary/40 hover:bg-muted/40 dark:border-slate-800'
                              }`}
                            >
                              <span className="text-sm font-semibold">
                                {method.label}
                              </span>
                              <span
                                className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                                  selected
                                    ? 'border-primary bg-primary text-white'
                                    : 'border-slate-300 dark:border-slate-600'
                                }`}
                              >
                                {selected && (
                                  <CheckCircle2 className="size-4" />
                                )}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {settings.payment_link_enabled &&
                      paymentMethod === 'payment_link' &&
                      settings.payment_link && (
                        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900/60 dark:bg-sky-950/20">
                          <p className="text-sm font-medium text-sky-900 dark:text-sky-200">
                            استخدم الرابط التالي لإتمام الدفع:
                          </p>
                          <a
                            href={settings.payment_link}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 block break-all text-sm leading-6 text-sky-700 underline underline-offset-4 dark:text-sky-300"
                          >
                            {settings.payment_link}
                          </a>
                        </div>
                      )}

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <FieldCard>
                        <FieldLabel label="رقم المرجع" />
                        <Input
                          type="tel"
                          inputMode="numeric"
                          value={paymentReference}
                          onChange={(event) =>
                            setPaymentReference(event.target.value)
                          }
                          placeholder="رقم عملية الدفع إن وجد"
                          dir="ltr"
                        />
                        <FieldHint>
                          أدخل رقم مرجع العملية إن توفر.
                        </FieldHint>
                      </FieldCard>

                      {settings.payment_proof_enabled && (
                        <FieldCard>
                          <FieldLabel
                            label="إثبات الدفع"
                            required={settings.payment_proof_required}
                          />
                          <Input
                            id="paymentProof"
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(event) =>
                              setPaymentProof(event.target.files?.[0] ?? null)
                            }
                            required={settings.payment_proof_required}
                            className="h-auto min-h-12 cursor-pointer px-2 py-2 file:ml-2 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-primary sm:px-3 file:sm:text-sm"
                          />
                          <FieldHint>
                            يمكنك إرفاق صورة أو ملف PDF لإثبات الدفع.
                          </FieldHint>
                        </FieldCard>
                      )}
                    </div>
                  </section>
                )}

                {/* إرسال الطلب */}
                <section className="border-t border-slate-200 pt-6 dark:border-slate-800 sm:pt-8">
                  <Button
                    type="submit"
                    size="lg"
                    className="h-13 min-h-13 w-full touch-manipulation rounded-xl text-base font-bold shadow-sm transition sm:h-14"
                    disabled={submitting || checkingPersonalId}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="ml-2 size-5 animate-spin" />
                        جاري إرسال الطلب...
                      </>
                    ) : (
                      <>
                        <Send className="ml-2 size-5" />
                        إرسال طلب التسجيل
                      </>
                    )}
                  </Button>

                  <p className="mt-3 text-center text-xs leading-6 text-muted-foreground sm:text-sm">
                    سيتم إرسال الطلب إلى قسم طلبات التسجيل للمراجعة.
                  </p>
                </section>
              </form>
            )}
          </div>
        </div>

        <p className="mt-4 px-2 text-center text-xs leading-6 text-muted-foreground">
          يرجى التأكد من صحة البيانات المدخلة قبل إرسال الطلب.
        </p>
      </div>
    </main>
  )
}
