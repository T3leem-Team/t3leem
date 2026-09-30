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
        <span className="mr-1 text-destructive">*</span>
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
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
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

export default function RegisterPage() {
  const [settings, setSettings] =
    useState<RegistrationSettings | null>(null)

  const [academicYear, setAcademicYear] =
    useState<AcademicYear | null>(null)

  const [registrationCourse, setRegistrationCourse] =
    useState<RegistrationCourse | null>(null)

  const [levels, setLevels] = useState<Level[]>([])

  const [customFields, setCustomFields] =
    useState<CustomField[]>([])

  const [customFieldValues, setCustomFieldValues] =
    useState<Record<string, string>>({})

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [checkingPersonalId, setCheckingPersonalId] =
    useState(false)

  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [submittedPersonalId, setSubmittedPersonalId] =
    useState('')

  const [name, setName] = useState('')
  const [personalId, setPersonalId] = useState('')
  const [gender, setGender] = useState('')
  const [age, setAge] = useState('')

  const [phone, setPhone] = useState('')
  const [guardianRelation, setGuardianRelation] =
    useState('')
  const [customGuardianRelation, setCustomGuardianRelation] =
    useState('')

  const [whatsapp, setWhatsapp] = useState('')
  const [studentPhone, setStudentPhone] = useState('')

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

      const loadedSettings =
        settingsResult.data as RegistrationSettings

      setSettings(loadedSettings)

      const academicYearResult = await supabase
        .from('academic_years')
        .select('id, name')
        .eq('is_current', true)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

      if (academicYearResult.error) {
        console.error(
          'academic_years error:',
          academicYearResult.error,
        )

        setErrorMessage(
          `تعذر تحميل السنة الدراسية الحالية: ${academicYearResult.error.message}`,
        )

        return
      }

      if (!academicYearResult.data) {
        setErrorMessage(
          'لا توجد سنة دراسية حالية ومفعلة.',
        )

        return
      }

      const loadedAcademicYear =
        academicYearResult.data as AcademicYear

      setAcademicYear(loadedAcademicYear)

      if (!loadedSettings.course_id) {
        setRegistrationCourse(null)

        setErrorMessage(
          'لم يتم تحديد دورة التسجيل الحالية من لوحة التحكم. يرجى التواصل مع إدارة التعليم.',
        )

        return
      }

      const courseResult = await supabase
        .from('courses')
        .select(
          'id, name, academic_year_id, start_date, end_date, is_closed',
        )
        .eq('id', loadedSettings.course_id)
        .eq(
          'academic_year_id',
          loadedAcademicYear.id,
        )
        .maybeSingle()

      if (courseResult.error) {
        console.error(
          'courses error:',
          courseResult.error,
        )

        setErrorMessage(
          `تعذر تحميل دورة التسجيل الحالية: ${courseResult.error.message}`,
        )

        return
      }

      if (!courseResult.data) {
        setErrorMessage(
          'دورة التسجيل المحددة غير موجودة أو لا تتبع السنة الدراسية الحالية.',
        )

        return
      }

      const loadedCourse =
        courseResult.data as RegistrationCourse

      if (loadedCourse.is_closed) {
        setErrorMessage(
          'دورة التسجيل الحالية مغلقة. يرجى التواصل مع إدارة التعليم.',
        )

        return
      }

      setRegistrationCourse(loadedCourse)

      const levelsResult = await supabase
        .from('levels')
        .select('id, name, sort_order')
        .eq('is_active', true)
        .eq('registration_enabled', true)
        .order('sort_order', {
          ascending: true,
        })

      if (levelsResult.error) {
        console.error(levelsResult.error)

        setErrorMessage(
          `تعذر تحميل مستويات التسجيل: ${levelsResult.error.message}`,
        )

        return
      }

      setLevels(levelsResult.data ?? [])

      const customFieldsResult = await supabase
        .from('custom_fields')
        .select(
          'id, name, field_type, sort_order, is_active',
        )
        .eq('available_in_registration', true)
        .eq('is_active', true)
        .order('sort_order', {
          ascending: true,
        })

      if (customFieldsResult.error) {
        console.error(
          'custom_fields error:',
          customFieldsResult.error,
        )

        setErrorMessage(
          `تعذر تحميل الحقول الإضافية: ${customFieldsResult.error.message}`,
        )

        return
      }

      const loadedCustomFields =
        customFieldsResult.data ?? []

      if (loadedCustomFields.length === 0) {
        setCustomFields([])
        setCustomFieldValues({})
        return
      }

      const customFieldIds =
        loadedCustomFields.map(
          (field) => field.id,
        )

      const visibilityResult = await supabase
        .from('custom_field_visibility')
        .select(
          'custom_field_id, section, is_visible, is_required, sort_order',
        )
        .eq('section', 'registration')
        .in('custom_field_id', customFieldIds)

      if (visibilityResult.error) {
        console.error(
          'custom_field_visibility error:',
          visibilityResult.error,
        )

        setErrorMessage(
          `تعذر تحميل إعدادات ظهور الحقول الإضافية: ${visibilityResult.error.message}`,
        )

        return
      }

      const optionsResult = await supabase
        .from('custom_field_options')
        .select(
          'id, custom_field_id, label, value, sort_order',
        )
        .in(
          'custom_field_id',
          customFieldIds,
        )
        .order('sort_order', {
          ascending: true,
        })

      if (optionsResult.error) {
        console.error(
          'custom_field_options error:',
          optionsResult.error,
        )

        setErrorMessage(
          `تعذر تحميل خيارات الحقول الإضافية: ${optionsResult.error.message}`,
        )

        return
      }

      const visibilityRows =
        visibilityResult.data ?? []

      const options =
        optionsResult.data ?? []

      const preparedFields: CustomField[] =
        loadedCustomFields
          .map((field) => {
            const visibility =
              visibilityRows.find(
                (row) =>
                  row.custom_field_id ===
                  field.id,
              )

            const fieldOptions =
              options.filter(
                (option) =>
                  option.custom_field_id ===
                  field.id,
              )

            return {
              id: field.id,
              name: field.name,
              field_type:
                field.field_type as CustomFieldType,
              sort_order: field.sort_order ?? 0,
              options: fieldOptions,
              is_visible:
                visibility?.is_visible === true,
              is_required:
                visibility?.is_required === true,
            }
          })
          .filter((field) => field.is_visible)

      setCustomFields(preparedFields)

      const initialValues: Record<
        string,
        string
      > = {}

      preparedFields.forEach((field) => {
        initialValues[field.id] = ''
      })

      setCustomFieldValues(initialValues)
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

  function updateCustomFieldValue(
    fieldId: string,
    value: string,
  ) {
    setCustomFieldValues((current) => ({
      ...current,
      [fieldId]: value,
    }))
  }

  function getCustomFieldValue(
    field: CustomField,
  ) {
    return customFieldValues[field.id] ?? ''
  }

  function getGuardianRelationValue() {
    if (guardianRelation === 'أخرى') {
      return customGuardianRelation.trim()
    }

    return guardianRelation.trim()
  }

  function validateCustomFields() {
    for (const field of customFields) {
      if (!field.is_required) {
        continue
      }

      const value =
        getCustomFieldValue(field)

      if (!value.trim()) {
        return `يرجى تعبئة حقل ${field.name}.`
      }
    }

    return ''
  }

  function validateForm() {
    if (!settings) {
      return 'إعدادات التسجيل غير متوفرة.'
    }

    if (!settings.registration_open) {
      return 'التسجيل مغلق حاليًا.'
    }

    if (!academicYear) {
      return 'لا توجد سنة دراسية حالية ومفعلة.'
    }

    if (!registrationCourse) {
      return 'لم يتم تحديد دورة التسجيل الحالية. يرجى التواصل مع إدارة التعليم.'
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
      settings.show_gender &&
      settings.required_gender &&
      !gender
    ) {
      return 'يرجى اختيار الجنس.'
    }

    if (
      settings.show_age &&
      settings.required_age &&
      !age.trim()
    ) {
      return 'يرجى إدخال العمر.'
    }

    if (
      settings.show_age &&
      age.trim()
    ) {
      const numericAge =
        Number(age)

      if (
        !Number.isFinite(numericAge) ||
        numericAge < 0
      ) {
        return 'يرجى إدخال عمر صحيح.'
      }
    }

    if (
      settings.show_phone &&
      settings.required_phone &&
      !phone.trim()
    ) {
      return 'يرجى إدخال رقم الاتصال الأساسي.'
    }

    if (
      settings.show_guardian_relation &&
      settings.required_guardian_relation &&
      !getGuardianRelationValue()
    ) {
      return 'يرجى اختيار صلة القرابة.'
    }

    if (
      settings.show_whatsapp &&
      settings.required_whatsapp &&
      !whatsapp.trim()
    ) {
      return 'يرجى إدخال الرقم الثاني.'
    }

    if (
      settings.show_student_phone &&
      settings.required_student_phone &&
      !studentPhone.trim()
    ) {
      return 'يرجى إدخال رقم الطالب.'
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
      return 'يرجى تعبئة حقل الحالة الصحية.'
    }

    const customFieldError =
      validateCustomFields()

    if (customFieldError) {
      return customFieldError
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

  async function uploadPaymentProof(
    file: File,
    requestId: string,
  ) {
    const extension =
      file.name.split('.').pop()?.toLowerCase() ||
      'jpg'

    const filePath =
      `${requestId}.${extension}`

    const uploadResult =
      await supabase.storage
        .from('registration-proofs')
        .upload(filePath, file, {
          upsert: true,
        })

    if (uploadResult.error) {
      throw new Error(
        `تعذر رفع إثبات الدفع: ${uploadResult.error.message}`,
      )
    }

    const publicUrlResult =
      supabase.storage
        .from('registration-proofs')
        .getPublicUrl(filePath)

    return publicUrlResult.data.publicUrl
  }

  async function saveCustomFieldValues(
    requestId: string,
  ) {
    if (customFields.length === 0) {
      return
    }

    const rows = customFields
      .map((field) => {
        const rawValue =
          customFieldValues[field.id] ?? ''

        return {
          custom_field_id: field.id,
          record_type:
            'registration_request',
          record_id: requestId,
          value:
            rawValue.trim() || null,
        }
      })
      .filter(
        (row) =>
          row.value !== null,
      )

    if (rows.length === 0) {
      return
    }

    const result = await supabase
      .from('custom_field_values')
      .upsert(rows, {
        onConflict:
          'custom_field_id,record_type,record_id',
      })

    if (result.error) {
      console.error(
        'custom_field_values error:',
        result.error,
      )

      throw new Error(
        `تم إنشاء الطلب لكن تعذر حفظ الحقول الإضافية: ${result.error.message}`,
      )
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setErrorMessage('')
    setSuccessMessage('')

    const validationError =
      validateForm()

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
      if (
        settings.show_personal_id &&
        personalId.trim()
      ) {
        setCheckingPersonalId(true)

        try {
          const personalIdCheck =
            await supabase.rpc(
              'check_registration_personal_id',
              {
                p_personal_id:
                  personalId.trim(),
              },
            )

          if (personalIdCheck.error) {
            console.error(
              'check_registration_personal_id RPC error:',
              personalIdCheck.error,
            )

            throw new Error(
              `تعذر التحقق من الرقم الشخصي: ${personalIdCheck.error.message}`,
            )
          }

          const checkResult =
            Array.isArray(
              personalIdCheck.data,
            )
              ? personalIdCheck.data[0]
              : personalIdCheck.data

          if (
            checkResult?.registered
          ) {
            const academicYearName =
              checkResult.academic_year_name

            setErrorMessage(
              academicYearName
                ? `الطالب مسجل بالفعل لهذه السنة الدراسية: ${academicYearName}`
                : 'الطالب مسجل بالفعل لهذه السنة الدراسية.',
            )

            return
          }
        } finally {
          setCheckingPersonalId(false)
        }
      }

      const submittedId =
        personalId.trim()

      setSubmittedPersonalId(
        submittedId,
      )

      const internalRequestNumber =
        submittedId ||
        `REG-${new Date().getFullYear()}-${Date.now()
          .toString()
          .slice(-8)}`

      const trackingToken =
        crypto.randomUUID()

      const guardianRelationValue =
        settings.show_guardian_relation
          ? getGuardianRelationValue() || null
          : null

      const rpcResult =
        await supabase.rpc(
          'create_registration_request',
          {
            p_request_number:
              internalRequestNumber,

            p_tracking_token:
              trackingToken,

            p_name:
              settings.show_name
                ? name.trim()
                : '',

            p_personal_id:
              settings.show_personal_id
                ? submittedId || null
                : null,

            p_gender:
              settings.show_gender
                ? gender || null
                : null,

            p_age:
              settings.show_age &&
              age.trim()
                ? Number(age)
                : null,

            p_phone:
              settings.show_phone
                ? phone.trim() || null
                : null,

            p_guardian_relation:
              guardianRelationValue,

            p_whatsapp:
              settings.show_whatsapp
                ? whatsapp.trim() ||
                  null
                : null,

            p_student_phone:
              settings.show_student_phone
                ? studentPhone.trim() ||
                  null
                : null,

            p_level_id:
              levelId || null,

            p_notes:
              settings.show_notes
                ? notes.trim() || null
                : null,

            p_health_notes:
              settings.show_health_notes
                ? healthNotes.trim() ||
                  null
                : null,

            p_payment_method:
              settings.payment_enabled
                ? paymentMethod
                : null,

            p_payment_amount:
              settings.payment_enabled
                ? settings.payment_amount
                : null,

            p_payment_reference:
              settings.payment_enabled
                ? paymentReference.trim() ||
                  null
                : null,

            p_payment_status:
              settings.payment_enabled
                ? 'pending'
                : 'not_required',
          },
        )

      if (rpcResult.error) {
        console.error(
          'create_registration_request RPC error:',
          rpcResult.error,
        )

        throw new Error(
          `تعذر إرسال طلب التسجيل: ${rpcResult.error.message}`,
        )
      }

      const createdRequest =
        Array.isArray(
          rpcResult.data,
        )
          ? rpcResult.data[0]
          : rpcResult.data

      if (
        !createdRequest ||
        !createdRequest.id
      ) {
        throw new Error(
          'تم إنشاء الطلب ولكن لم يتم استلام سجل التسجيل من النظام.',
        )
      }

      await saveCustomFieldValues(
        createdRequest.id,
      )

      if (
        settings.payment_enabled &&
        settings.payment_proof_enabled &&
        paymentProof
      ) {
        const proofUrl =
          await uploadPaymentProof(
            paymentProof,
            createdRequest.id,
          )

        const proofResult =
          await supabase.rpc(
            'set_registration_payment_proof',
            {
              p_request_id:
                createdRequest.id,

              p_payment_proof_url:
                proofUrl,
            },
          )

        if (proofResult.error) {
          console.error(
            'set_registration_payment_proof RPC error:',
            proofResult.error,
          )

          throw new Error(
            `تم إنشاء الطلب لكن تعذر حفظ إثبات الدفع: ${proofResult.error.message}`,
          )
        }
      }

      setSuccessMessage(
        'تم إرسال طلب التسجيل بنجاح.',
      )

      setName('')
      setPersonalId('')
      setGender('')
      setAge('')
      setPhone('')
      setGuardianRelation('')
      setCustomGuardianRelation('')
      setWhatsapp('')
      setStudentPhone('')
      setLevelId('')
      setNotes('')
      setHealthNotes('')
      setPaymentMethod(null)
      setPaymentReference('')
      setPaymentProof(null)

      const emptyCustomValues: Record<
        string,
        string
      > = {}

      customFields.forEach((field) => {
        emptyCustomValues[field.id] = ''
      })

      setCustomFieldValues(
        emptyCustomValues,
      )

      const fileInput =
        document.getElementById(
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
      setCheckingPersonalId(false)
      setSubmitting(false)
    }
  }

  function renderCustomField(
    field: CustomField,
  ) {
    const value =
      getCustomFieldValue(field)

    const commonRequired =
      field.is_required

    if (field.field_type === 'textarea') {
      return (
        <div
          key={field.id}
          className="md:col-span-2"
        >
          <FieldLabel
            label={field.name}
            required={commonRequired}
          />

          <Textarea
            value={value}
            onChange={(event) =>
              updateCustomFieldValue(
                field.id,
                event.target.value,
              )
            }
            required={commonRequired}
            placeholder={`أدخل ${field.name}`}
          />
        </div>
      )
    }

    if (field.field_type === 'select') {
      return (
        <div key={field.id}>
          <FieldLabel
            label={field.name}
            required={commonRequired}
          />

          <Select
            value={value}
            onChange={(event) =>
              updateCustomFieldValue(
                field.id,
                event.target.value,
              )
            }
            required={commonRequired}
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
      field.field_type === 'boolean'
    ) {
      return (
        <div
          key={field.id}
          className="rounded-xl border p-4 md:col-span-2"
        >
          <label className="flex cursor-pointer items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">
                {field.name}

                {commonRequired && (
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
              checked={value === 'true'}
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
      | 'date' = 'text'

    if (
      field.field_type === 'number'
    ) {
      inputType = 'number'
    }

    if (
      field.field_type === 'date'
    ) {
      inputType = 'date'
    }

    return (
      <div key={field.id}>
        <FieldLabel
          label={field.name}
          required={commonRequired}
        />

        <Input
          type={inputType}
          inputMode={
            inputType === 'number'
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
          required={commonRequired}
          placeholder={
            inputType === 'text'
              ? `أدخل ${field.name}`
              : undefined
          }
        />
      </div>
    )
  }

  if (loading) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-muted/30 px-3 py-5 sm:px-6 sm:py-10"
      >
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-center rounded-2xl border bg-background p-10 shadow-sm sm:p-12">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              جاري تحميل نموذج التسجيل...
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (
    errorMessage &&
    !settings
  ) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-muted/30 px-3 py-5 sm:px-6 sm:py-10"
      >
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border bg-background p-4 shadow-sm sm:p-6">
            <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
              <AlertCircle className="mt-0.5 size-5 shrink-0" />

              <div>
                <p className="font-medium">
                  تعذر تحميل التسجيل
                </p>

                <p className="mt-1 text-sm leading-6">
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

  if (
    errorMessage &&
    (!academicYear ||
      !registrationCourse)
  ) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-muted/30 px-3 py-5 sm:px-6 sm:py-10"
      >
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border bg-background p-4 shadow-sm sm:p-6">
            <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
              <AlertCircle className="mt-0.5 size-5 shrink-0" />

              <div>
                <p className="font-medium">
                  تعذر تحميل بيانات التسجيل
                </p>

                <p className="mt-1 text-sm leading-6">
                  {errorMessage}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (!settings.registration_open) {
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
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 px-4 backdrop-blur-[2px]"
          dir="rtl"
        >
          <div className="w-full max-w-sm rounded-2xl border bg-background p-6 text-center shadow-2xl sm:p-7">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>

            <h2 className="mt-5 text-xl font-bold">
              جاري التحقق
            </h2>

            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              جاري التحقق من الرقم الشخصي والتأكد من أن
              الطالب غير مسجل لهذه السنة الدراسية.
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

            {academicYear &&
              registrationCourse && (
                <div className="mt-5 rounded-2xl border bg-muted/30 p-4 sm:mt-6 sm:p-5">
                  <div className="mb-4">
                    <p className="text-sm font-bold">
                      بيانات التسجيل الحالي
                    </p>

                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      هذه البيانات محددة من إدارة التعليم ولا يمكن تعديلها من هنا.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border bg-background p-3.5 sm:p-4">
                      <p className="text-xs text-muted-foreground">
                        السنة الدراسية
                      </p>

                      <p className="mt-1.5 font-semibold">
                        {academicYear.name}
                      </p>
                    </div>

                    <div className="rounded-xl border bg-background p-3.5 sm:p-4">
                      <p className="text-xs text-muted-foreground">
                        دورة التسجيل
                      </p>

                      <p className="mt-1.5 font-semibold">
                        {registrationCourse.name}
                      </p>
                    </div>
                  </div>
                </div>
              )}

            {successMessage && (
              <div className="mt-5 rounded-2xl border bg-background p-4 shadow-sm sm:mt-6 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <CheckCircle2 className="size-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {successMessage}
                    </p>

                    {submittedPersonalId && (
                      <div className="mt-3 rounded-xl border bg-muted/30 p-3.5">
                        <p className="text-sm text-muted-foreground">
                          الرقم الشخصي
                        </p>

                        <p
                          dir="ltr"
                          className="mt-1 break-all text-lg font-bold text-foreground"
                        >
                          {submittedPersonalId}
                        </p>
                      </div>
                    )}

                    {academicYear &&
                      registrationCourse && (
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border bg-muted/20 p-3">
                            <p className="text-xs text-muted-foreground">
                              السنة الدراسية
                            </p>

                            <p className="mt-1 text-sm font-semibold">
                              {academicYear.name}
                            </p>
                          </div>

                          <div className="rounded-xl border bg-muted/20 p-3">
                            <p className="text-xs text-muted-foreground">
                              دورة التسجيل
                            </p>

                            <p className="mt-1 text-sm font-semibold">
                              {registrationCourse.name}
                            </p>
                          </div>
                        </div>
                      )}

                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      استعمل الرقم الشخصي لمتابعة الطالب بعد القبول في التعليم.
                    </p>

                    <Link
                      href="/student-status"
                      className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-medium transition hover:bg-muted"
                    >
                      متابعة حالة الطالب
                    </Link>

                    {(settings.show_education_group &&
                      settings.education_group_link) ||
                    settings.post_registration_notes ? (
                      <div className="mt-5 space-y-4 border-t pt-5">
                        {settings.show_education_group &&
                          settings.education_group_link && (
                            <div className="rounded-xl border bg-muted/20 p-4">
                              <p className="text-sm font-semibold">
                                مجموعة التعليم
                              </p>

                              {settings.education_group_description && (
                                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                                  {
                                    settings.education_group_description
                                  }
                                </p>
                              )}

                              <a
                                href={
                                  settings.education_group_link
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="mt-4 inline-flex min-h-11 max-w-full items-center justify-center break-all rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-2.5 text-sm font-medium text-green-700 transition hover:bg-green-500/15 dark:text-green-400"
                              >
                                الانضمام إلى مجموعة التعليم
                              </a>
                            </div>
                          )}

                        {settings.post_registration_notes && (
                          <div className="rounded-xl border bg-muted/20 p-4">
                            <p className="text-sm font-semibold">
                              ملاحظات عامة
                            </p>

                            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                              {
                                settings.post_registration_notes
                              }
                            </p>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

            {errorMessage && (
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm leading-6 text-destructive">
                <AlertCircle className="mt-0.5 size-5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {!successMessage && (
              <form
                onSubmit={handleSubmit}
                className="mt-7 space-y-8 sm:mt-8"
              >
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
                          pattern="[0-9]*"
                          value={personalId}
                          onChange={(event) =>
                            setPersonalId(
                              event.target.value,
                            )
                          }
                          placeholder="أدخل الرقم الشخصي"
                          autoComplete="off"
                          dir="ltr"
                          required={
                            settings.required_personal_id
                          }
                        />
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
                          inputMode="tel"
                          value={phone}
                          onChange={(event) =>
                            setPhone(
                              event.target.value,
                            )
                          }
                          placeholder="مثال: 3XXXXXXX"
                          autoComplete="tel"
                          dir="ltr"
                          required={
                            settings.required_phone
                          }
                        />
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
                          value={guardianRelation}
                          onChange={(event) => {
                            const value =
                              event.target.value

                            setGuardianRelation(
                              value,
                            )

                            if (
                              value !== 'أخرى'
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
                              onChange={(event) =>
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
                          inputMode="tel"
                          value={whatsapp}
                          onChange={(event) =>
                            setWhatsapp(
                              event.target.value,
                            )
                          }
                          placeholder="مثال: 3XXXXXXX"
                          autoComplete="tel"
                          dir="ltr"
                          required={
                            settings.required_whatsapp
                          }
                        />
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
                          inputMode="tel"
                          value={studentPhone}
                          onChange={(event) =>
                            setStudentPhone(
                              event.target.value,
                            )
                          }
                          placeholder="أدخل رقم الطالب"
                          autoComplete="tel"
                          dir="ltr"
                          required={
                            settings.required_student_phone
                          }
                        />
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
                                key={level.id}
                                value={level.id}
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
                          value={healthNotes}
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

                {customFields.length > 0 && (
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
                              key={method.id}
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
                                {method.label}
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
                          value={paymentReference}
                          onChange={(event) =>
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
                            onChange={(event) =>
                              setPaymentProof(
                                event.target.files?.[0] ??
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

                <section className="border-t pt-7">
                  <Button
                    type="submit"
                    size="lg"
                    className="h-13 w-full touch-manipulation rounded-xl text-base font-semibold sm:h-12"
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