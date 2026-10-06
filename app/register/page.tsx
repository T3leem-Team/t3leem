'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import { AlertCircle, Loader2 } from 'lucide-react'

import { supabase } from '@/lib/supabase'

import RegistrationForm from './registration-form'

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

export default function RegisterPage() {
  const [settings, setSettings] =
    useState<RegistrationSettings | null>(null)

  const [academicYear, setAcademicYear] =
    useState<AcademicYear | null>(null)

  const [registrationCourse, setRegistrationCourse] =
    useState<RegistrationCourse | null>(null)

  const [levels, setLevels] =
    useState<Level[]>([])

  const [customFields, setCustomFields] =
    useState<CustomField[]>([])

  const [customFieldValues, setCustomFieldValues] =
    useState<Record<string, string>>({})

  const [loading, setLoading] =
    useState(true)

  const [submitting, setSubmitting] =
    useState(false)

  const [checkingPersonalId, setCheckingPersonalId] =
    useState(false)

  const [errorMessage, setErrorMessage] =
    useState('')

  const [successMessage, setSuccessMessage] =
    useState('')

  const [submittedPersonalId, setSubmittedPersonalId] =
    useState('')

  const [name, setName] =
    useState('')

  const [personalId, setPersonalId] =
    useState('')

  const [gender, setGender] =
    useState('')

  const [age, setAge] =
    useState('')

  const [phone, setPhone] =
    useState('')

  const [guardianRelation, setGuardianRelation] =
    useState('')

  const [customGuardianRelation, setCustomGuardianRelation] =
    useState('')

  const [whatsapp, setWhatsapp] =
    useState('')

  const [studentPhone, setStudentPhone] =
    useState('')

  const [levelId, setLevelId] =
    useState('')

  const [notes, setNotes] =
    useState('')

  const [healthNotes, setHealthNotes] =
    useState('')

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
      const settingsResult =
        await supabase
          .from('registration_settings')
          .select('*')
          .limit(1)
          .maybeSingle()

      if (settingsResult.error) {
        console.error(
          settingsResult.error,
        )

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

      /*
       * =====================================================
       * التسجيل مغلق
       * =====================================================
       *
       * لا نحتاج لتحميل:
       * - السنة الدراسية
       * - الدورة
       * - المستويات
       * - الحقول الإضافية
       *
       * لأن الصفحة لن تعرض نموذج التسجيل أصلًا.
       */
      if (!loadedSettings.registration_open) {
        setAcademicYear(null)
        setRegistrationCourse(null)
        setLevels([])
        setCustomFields([])
        setCustomFieldValues({})

        return
      }

      const academicYearResult =
        await supabase
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

      setAcademicYear(
        loadedAcademicYear,
      )

      if (!loadedSettings.course_id) {
        setRegistrationCourse(null)

        setErrorMessage(
          'لم يتم تحديد دورة التسجيل الحالية من لوحة التحكم. يرجى التواصل مع إدارة التعليم.',
        )

        return
      }

      const courseResult =
        await supabase
          .from('courses')
          .select(
            'id, name, academic_year_id, start_date, end_date, is_closed',
          )
          .eq(
            'id',
            loadedSettings.course_id,
          )
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

      setRegistrationCourse(
        loadedCourse,
      )

      const levelsResult =
        await supabase
          .from('levels')
          .select(
            'id, name, sort_order',
          )
          .eq(
            'is_active',
            true,
          )
          .eq(
            'registration_enabled',
            true,
          )
          .order(
            'sort_order',
            {
              ascending: true,
            },
          )

      if (levelsResult.error) {
        console.error(
          levelsResult.error,
        )

        setErrorMessage(
          `تعذر تحميل مستويات التسجيل: ${levelsResult.error.message}`,
        )

        return
      }

      setLevels(
        levelsResult.data ?? [],
      )

      const customFieldsResult =
        await supabase
          .from('custom_fields')
          .select(
            'id, name, field_type, sort_order, is_active',
          )
          .eq(
            'available_in_registration',
            true,
          )
          .eq(
            'is_active',
            true,
          )
          .order(
            'sort_order',
            {
              ascending: true,
            },
          )

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

      if (
        loadedCustomFields.length ===
        0
      ) {
        setCustomFields([])
        setCustomFieldValues({})
        return
      }

      const customFieldIds =
        loadedCustomFields.map(
          (field) => field.id,
        )

      const visibilityResult =
        await supabase
          .from(
            'custom_field_visibility',
          )
          .select(
            'custom_field_id, section, is_visible, is_required, sort_order',
          )
          .eq(
            'section',
            'registration',
          )
          .in(
            'custom_field_id',
            customFieldIds,
          )

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

      const optionsResult =
        await supabase
          .from(
            'custom_field_options',
          )
          .select(
            'id, custom_field_id, label, value, sort_order',
          )
          .in(
            'custom_field_id',
            customFieldIds,
          )
          .order(
            'sort_order',
            {
              ascending: true,
            },
          )

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
              sort_order:
                field.sort_order ?? 0,
              options:
                fieldOptions,
              is_visible:
                visibility?.is_visible ===
                true,
              is_required:
                visibility?.is_required ===
                true,
            }
          })
          .filter(
            (field) =>
              field.is_visible,
          )

      setCustomFields(
        preparedFields,
      )

      const initialValues: Record<
        string,
        string
      > = {}

      preparedFields.forEach(
        (field) => {
          initialValues[field.id] = ''
        },
      )

      setCustomFieldValues(
        initialValues,
      )
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

  const paymentMethods =
    useMemo(() => {
      if (!settings) {
        return []
      }

      const methods: {
        id: PaymentMethod
        label: string
      }[] = []

      if (
        settings.benefit_enabled
      ) {
        methods.push({
          id: 'benefitpay',
          label: 'BenefitPay',
        })
      }

      if (
        settings.bank_transfer_enabled
      ) {
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

      if (
        settings.payment_link_enabled
      ) {
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
    setCustomFieldValues(
      (current) => ({
        ...current,
        [fieldId]: value,
      }),
    )
  }

  function getCustomFieldValue(
    field: CustomField,
  ) {
    return (
      customFieldValues[field.id] ??
      ''
    )
  }

  function getGuardianRelationValue() {
    if (
      guardianRelation ===
      'أخرى'
    ) {
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
      return 'لم يتم تحديد دورة التسجيل الحالية. يرجى التواصل مع إدارة إدارة التعليم.'
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
        !Number.isFinite(
          numericAge,
        ) ||
        numericAge < 0 ||
        numericAge > 120
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
      if (
        paymentMethods.length ===
        0
      ) {
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
      file.name
        .split('.')
        .pop()
        ?.toLowerCase() ||
      'jpg'

    const filePath =
      `${requestId}.${extension}`

    const uploadResult =
      await supabase.storage
        .from(
          'registration-proofs',
        )
        .upload(
          filePath,
          file,
          {
            upsert: true,
          },
        )

    if (uploadResult.error) {
      throw new Error(
        `تعذر رفع إثبات الدفع: ${uploadResult.error.message}`,
      )
    }

    const publicUrlResult =
      supabase.storage
        .from(
          'registration-proofs',
        )
        .getPublicUrl(
          filePath,
        )

    return (
      publicUrlResult.data
        .publicUrl
    )
  }

  async function saveCustomFieldValues(
    requestId: string,
  ) {
    if (
      customFields.length ===
      0
    ) {
      return
    }

    const rows =
      customFields
        .map((field) => {
          const rawValue =
            customFieldValues[
              field.id
            ] ?? ''

          return {
            custom_field_id:
              field.id,

            record_type:
              'registration_request',

            record_id:
              requestId,

            value:
              rawValue.trim() ||
              null,
          }
        })
        .filter(
          (row) =>
            row.value !== null,
        )

    if (rows.length === 0) {
      return
    }

    const result =
      await supabase
        .from(
          'custom_field_values',
        )
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

  async function handleSubmit() {
    setErrorMessage('')
    setSuccessMessage('')

    const validationError =
      validateForm()

    if (validationError) {
      setErrorMessage(
        validationError,
      )
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
        setCheckingPersonalId(
          true,
        )

        try {
          const personalIdCheck =
            await supabase.rpc(
              'check_registration_personal_id',
              {
                p_personal_id:
                  personalId.trim(),
              },
            )

          if (
            personalIdCheck.error
          ) {
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
          setCheckingPersonalId(
            false,
          )
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
          ? getGuardianRelationValue() ||
            null
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
                ? submittedId ||
                  null
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
                ? phone.trim() ||
                  null
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
                ? notes.trim() ||
                  null
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

        if (
          proofResult.error
        ) {
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

      customFields.forEach(
        (field) => {
          emptyCustomValues[
            field.id
          ] = ''
        },
      )

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
      setCheckingPersonalId(
        false,
      )

      setSubmitting(false)
    }
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

  /*
   * =====================================================
   * التسجيل مغلق
   * =====================================================
   *
   * يتم عرض هذه الرسالة بدل نموذج التسجيل.
   */
  if (!settings.registration_open) {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10"
      >
        <div className="w-full max-w-md rounded-2xl border bg-background p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <AlertCircle className="size-8" />
          </div>

          <h1 className="text-xl font-bold">
            التسجيل مغلق حاليًا
          </h1>

          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            تم إيقاف استقبال طلبات التسجيل حاليًا.
            يرجى المحاولة لاحقًا أو التواصل مع إدارة التعليم.
          </p>
        </div>
      </main>
    )
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

  return (
    <RegistrationForm
      settings={settings}
      levels={levels}
      customFields={customFields}
      customFieldValues={
        customFieldValues
      }
      updateCustomFieldValue={
        updateCustomFieldValue
      }
      paymentMethods={
        paymentMethods
      }
      name={name}
      setName={setName}
      personalId={personalId}
      setPersonalId={setPersonalId}
      gender={gender}
      setGender={setGender}
      age={age}
      setAge={setAge}
      phone={phone}
      setPhone={setPhone}
      guardianRelation={
        guardianRelation
      }
      setGuardianRelation={
        setGuardianRelation
      }
      customGuardianRelation={
        customGuardianRelation
      }
      setCustomGuardianRelation={
        setCustomGuardianRelation
      }
      whatsapp={whatsapp}
      setWhatsapp={setWhatsapp}
      studentPhone={studentPhone}
      setStudentPhone={
        setStudentPhone
      }
      levelId={levelId}
      setLevelId={setLevelId}
      notes={notes}
      setNotes={setNotes}
      healthNotes={healthNotes}
      setHealthNotes={
        setHealthNotes
      }
      paymentMethod={
        paymentMethod
      }
      setPaymentMethod={
        setPaymentMethod
      }
      paymentReference={
        paymentReference
      }
      setPaymentReference={
        setPaymentReference
      }
      paymentProof={
        paymentProof
      }
      setPaymentProof={
        setPaymentProof
      }
      submitting={submitting}
      checkingPersonalId={
        checkingPersonalId
      }
      errorMessage={errorMessage}
      successMessage={successMessage}
      submittedPersonalId={
        submittedPersonalId
      }
      onSubmit={handleSubmit}
    />
  )
}
