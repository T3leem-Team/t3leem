'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Check,
  ChevronDown,
  CreditCard,
  FileImage,
  Link2,
  Loader2,
  Plus,
  Save,
  Settings2,
  Trash2,
  UserRound,
  UsersRound,
  X,
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
      className={`flex items-center justify-between gap-4 rounded-xl border p-4 transition ${
        disabled ? 'opacity-60' : 'hover:bg-muted/20'
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

type FieldControlProps = {
  title: string
  description: string
  visible: boolean
  required: boolean
  onVisibleChange: (value: boolean) => void
  onRequiredChange: (value: boolean) => void
  disabled?: boolean
}

function FieldControl({
  title,
  description,
  visible,
  required,
  onVisibleChange,
  onRequiredChange,
  disabled = false,
}: FieldControlProps) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold">{title}</p>
            <Badge variant="secondary">أساسي</Badge>
          </div>

          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>

        <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-[360px]">
          <ToggleButton
            label="عرض الحقل"
            checked={visible}
            disabled={disabled}
            onChange={onVisibleChange}
          />

          <ToggleButton
            label="إلزامي"
            checked={required}
            disabled={disabled || !visible}
            onChange={onRequiredChange}
          />
        </div>
      </div>
    </div>
  )
}

function ToggleButton({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string
  checked: boolean
  disabled?: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${
        disabled
          ? 'cursor-not-allowed opacity-50'
          : 'hover:bg-muted/50'
      }`}
    >
      <span>{label}</span>

      <span
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-muted-foreground/30'
        }`}
      >
        <span
          className={`absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'right-0.5' : 'right-4.5'
          }`}
        />
      </span>
    </button>
  )
}

type CustomField = {
  id: string
  name: string
  field_type: string
  available_in_registration: boolean
  available_in_students: boolean
  available_in_payments: boolean
  sort_order: number
  is_active: boolean
  visibility?: {
    registration: {
      is_visible: boolean
      is_required: boolean
      sort_order: number
    }
    students: {
      is_visible: boolean
      is_required: boolean
      sort_order: number
    }
    payments: {
      is_visible: boolean
      is_required: boolean
      sort_order: number
    }
  }
}

type RegistrationLevel = {
  id: string
  name: string
  is_active: boolean
  registration_enabled: boolean
  sort_order: number | null
}

type RegistrationCourse = {
  id: string
  name: string
  academic_year_id: string
  start_date: string | null
  end_date: string | null
  is_closed: boolean
}

type FieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'select'
  | 'boolean'
  | 'textarea'

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'نص',
  number: 'رقم',
  date: 'تاريخ',
  select: 'قائمة خيارات',
  boolean: 'نعم / لا',
  textarea: 'نص طويل',
}

const SECTIONS = [
  {
    key: 'registration' as const,
    label: 'طلبات التسجيل',
  },
  {
    key: 'students' as const,
    label: 'سجل الطلبة',
  },
  {
    key: 'payments' as const,
    label: 'المدفوعات',
  },
]

export default function RegistrationSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingField, setSavingField] = useState(false)

  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const [registrationOpen, setRegistrationOpen] = useState(true)

  // ============================================================
  // السنة الحالية + دورة التسجيل الحالية
  // ============================================================

  const [currentAcademicYearId, setCurrentAcademicYearId] =
    useState<string | null>(null)

  const [currentAcademicYearName, setCurrentAcademicYearName] =
    useState('')

  const [registrationCourseId, setRegistrationCourseId] =
    useState<string | null>(null)

  const [registrationCourses, setRegistrationCourses] =
    useState<RegistrationCourse[]>([])

  const [registrationCoursesLoading, setRegistrationCoursesLoading] =
    useState(false)

  const [showName, setShowName] = useState(true)
  const [requiredName, setRequiredName] = useState(true)

  const [showPersonalId, setShowPersonalId] = useState(true)
  const [requiredPersonalId, setRequiredPersonalId] = useState(true)

  const [showGender, setShowGender] = useState(true)
  const [requiredGender, setRequiredGender] = useState(true)

  const [showAge, setShowAge] = useState(true)
  const [requiredAge, setRequiredAge] = useState(true)

  const [showPhone, setShowPhone] = useState(true)
  const [requiredPhone, setRequiredPhone] = useState(true)

  const [showGuardianRelation, setShowGuardianRelation] =
    useState(true)

  const [requiredGuardianRelation, setRequiredGuardianRelation] =
    useState(false)

  const [showWhatsapp, setShowWhatsapp] = useState(true)
  const [requiredWhatsapp, setRequiredWhatsapp] = useState(false)

  const [showStudentPhone, setShowStudentPhone] =
    useState(true)

  const [requiredStudentPhone, setRequiredStudentPhone] =
    useState(false)

  const [showLevel, setShowLevel] = useState(true)
  const [requiredLevel, setRequiredLevel] = useState(true)

  const [showNotes, setShowNotes] = useState(false)
  const [requiredNotes, setRequiredNotes] = useState(false)

  const [showHealthNotes, setShowHealthNotes] = useState(false)
  const [requiredHealthNotes, setRequiredHealthNotes] = useState(false)

  // ============================================================
  // دعوة مجموعة التعليم بعد التسجيل
  // ============================================================

  const [showEducationGroup, setShowEducationGroup] =
    useState(false)

  const [educationGroupLink, setEducationGroupLink] =
    useState('')

  const [educationGroupDescription, setEducationGroupDescription] =
    useState('')

  const [postRegistrationNotes, setPostRegistrationNotes] =
    useState('')

  // ============================================================
  // الدفع
  // ============================================================

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

  const [registrationLevels, setRegistrationLevels] = useState<
    RegistrationLevel[]
  >([])

  const [registrationLevelsLoading, setRegistrationLevelsLoading] =
    useState(false)

  const [savingRegistrationLevel, setSavingRegistrationLevel] =
    useState(false)

  const [editingRegistrationLevelId, setEditingRegistrationLevelId] =
    useState<string | null>(null)

  const [editingRegistrationLevelName, setEditingRegistrationLevelName] =
    useState('')

  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [customFieldsLoading, setCustomFieldsLoading] = useState(false)

  const [showAddField, setShowAddField] = useState(false)
  const [newFieldName, setNewFieldName] = useState('')
  const [newFieldType, setNewFieldType] =
    useState<FieldType>('text')

  const [newFieldSections, setNewFieldSections] = useState({
    registration: false,
    students: false,
    payments: false,
  })

  const [newFieldOptions, setNewFieldOptions] = useState<string[]>([
    '',
  ])

  const activeCustomFields = useMemo(
    () => customFields.filter((field) => field.is_active),
    [customFields],
  )

  useEffect(() => {
    loadSettings()
    loadRegistrationCourses()
    loadCustomFields()
    loadRegistrationLevels()
  }, [])

  // ============================================================
  // تحميل السنة الحالية والدورات المفتوحة
  // ============================================================

  async function loadRegistrationCourses() {
    setRegistrationCoursesLoading(true)

    const { data: currentYear, error: yearError } =
      await supabase
        .from('academic_years')
        .select('id, name')
        .eq('is_current', true)
        .eq('is_active', true)
        .maybeSingle()

    if (yearError) {
      console.error(
        'Error loading current academic year:',
        yearError,
      )

      setErrorMessage(
        `تعذر تحميل السنة الدراسية الحالية: ${yearError.message}`,
      )

      setRegistrationCoursesLoading(false)
      return
    }

    if (!currentYear) {
      setCurrentAcademicYearId(null)
      setCurrentAcademicYearName('')
      setRegistrationCourses([])

      setErrorMessage(
        'لا توجد سنة دراسية حالية مفعلة. يرجى تحديد السنة الحالية أولاً.',
      )

      setRegistrationCoursesLoading(false)
      return
    }

    setCurrentAcademicYearId(currentYear.id)
    setCurrentAcademicYearName(currentYear.name)

    const { data: courses, error: coursesError } =
      await supabase
        .from('courses')
        .select(
          `
          id,
          name,
          academic_year_id,
          start_date,
          end_date,
          is_closed
        `,
        )
        .eq('academic_year_id', currentYear.id)
        .eq('is_closed', false)
        .order('start_date', { ascending: true })

    if (coursesError) {
      console.error(
        'Error loading registration courses:',
        coursesError,
      )

      setRegistrationCourses([])

      setErrorMessage(
        `تعذر تحميل دورات التسجيل: ${coursesError.message}`,
      )

      setRegistrationCoursesLoading(false)
      return
    }

    setRegistrationCourses(
      (courses ?? []) as RegistrationCourse[],
    )

    setRegistrationCoursesLoading(false)
  }

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
      console.error(
        'Error loading registration settings:',
        error,
      )

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

    // ==========================================================
    // دورة التسجيل المحددة من لوحة التحكم
    // ==========================================================

    setRegistrationCourseId(
      data.course_id ?? null,
    )

    setRegistrationOpen(data.registration_open ?? true)

    setShowName(data.show_name ?? true)
    setRequiredName(data.required_name ?? true)

    setShowPersonalId(data.show_personal_id ?? true)
    setRequiredPersonalId(data.required_personal_id ?? true)

    setShowGender(data.show_gender ?? true)
    setRequiredGender(data.required_gender ?? true)

    setShowAge(data.show_age ?? true)
    setRequiredAge(data.required_age ?? true)

    setShowPhone(data.show_phone ?? true)
    setRequiredPhone(data.required_phone ?? true)

    setShowGuardianRelation(
      data.show_guardian_relation ?? true,
    )

    setRequiredGuardianRelation(
      data.required_guardian_relation ?? false,
    )

    setShowWhatsapp(data.show_whatsapp ?? false)
    setRequiredWhatsapp(data.required_whatsapp ?? false)

    setShowStudentPhone(data.show_student_phone ?? true)

    setRequiredStudentPhone(
      data.required_student_phone ?? false,
    )

    setShowLevel(data.show_level ?? true)
    setRequiredLevel(data.required_level ?? true)

    setShowNotes(data.show_notes ?? false)
    setRequiredNotes(data.required_notes ?? false)

    setShowHealthNotes(data.show_health_notes ?? false)
    setRequiredHealthNotes(data.required_health_notes ?? false)

    // ==========================================================
    // دعوة مجموعة التعليم
    // ==========================================================

    setShowEducationGroup(
      data.show_education_group ?? false,
    )

    setEducationGroupLink(
      data.education_group_link ?? '',
    )

    setEducationGroupDescription(
      data.education_group_description ?? '',
    )

    setPostRegistrationNotes(
      data.post_registration_notes ?? '',
    )

    // ==========================================================
    // الدفع
    // ==========================================================

    setPaymentEnabled(data.payment_enabled ?? false)

    setBenefitEnabled(data.benefit_enabled ?? false)

    setBankTransferEnabled(
      data.bank_transfer_enabled ?? false,
    )

    setCashEnabled(data.cash_enabled ?? false)

    setPaymentLinkEnabled(
      data.payment_link_enabled ?? false,
    )

    setPaymentProofEnabled(
      data.payment_proof_enabled ?? false,
    )

    setPaymentProofRequired(
      data.payment_proof_required ?? false,
    )

    setPaymentAmount(
      data.payment_amount !== null &&
        data.payment_amount !== undefined
        ? String(data.payment_amount)
        : '',
    )

    setPaymentLink(data.payment_link ?? '')
    setShowPaymentQr(data.show_payment_qr ?? false)

    setLoading(false)
  }

  // ============================================================
  // المستويات
  // الترتيب هنا يأتي مباشرة من Supabase بواسطة sort_order.
  // لا يوجد أي ترتيب محلي حسب الاسم أو غيره.
  // ============================================================

  async function loadRegistrationLevels() {
    setRegistrationLevelsLoading(true)

    const { data, error } = await supabase
      .from('levels')
      .select(
        'id, name, is_active, registration_enabled, sort_order',
      )
      .eq('is_active', true)
      .order('sort_order', {
        ascending: true,
        nullsFirst: false,
      })

    if (error) {
      console.error(
        'Error loading registration levels:',
        error,
      )

      setErrorMessage(
        `تعذر تحميل المستويات: ${error.message}`,
      )

      setRegistrationLevelsLoading(false)
      return
    }

    // مهم:
    // لا نستخدم filter أو sort هنا.
    // Supabase هو المسؤول عن تحديد ترتيب النتائج.
    setRegistrationLevels(
      (data ?? []) as RegistrationLevel[],
    )

    setRegistrationLevelsLoading(false)
  }

  function startEditingRegistrationLevel(
    level: RegistrationLevel,
  ) {
    setEditingRegistrationLevelId(level.id)
    setEditingRegistrationLevelName(level.name)
    setErrorMessage('')
    setSuccessMessage('')
  }

  function cancelEditingRegistrationLevel() {
    setEditingRegistrationLevelId(null)
    setEditingRegistrationLevelName('')
  }

  async function saveRegistrationLevelName(
    level: RegistrationLevel,
  ) {
    const name = editingRegistrationLevelName.trim()

    if (!name) {
      setErrorMessage('اسم المستوى لا يمكن أن يكون فارغاً.')
      return
    }

    const exists = registrationLevels.some(
      (item) =>
        item.id !== level.id &&
        item.name.trim().toLowerCase() ===
          name.toLowerCase(),
    )

    if (exists) {
      setErrorMessage('هذا الاسم مستخدم لمستوى آخر.')
      return
    }

    setSavingRegistrationLevel(true)
    setErrorMessage('')
    setSuccessMessage('')

    const { error } = await supabase
      .from('levels')
      .update({
        name,
      })
      .eq('id', level.id)

    if (error) {
      console.error(
        'Error updating level name:',
        error,
      )

      setErrorMessage(
        `تعذر تعديل اسم المستوى: ${error.message}`,
      )

      setSavingRegistrationLevel(false)
      return
    }

    setRegistrationLevels((current) =>
      current.map((item) =>
        item.id === level.id
          ? {
              ...item,
              name,
            }
          : item,
      ),
    )

    cancelEditingRegistrationLevel()

    setSuccessMessage(
      'تم تعديل اسم المستوى بنجاح.',
    )

    setSavingRegistrationLevel(false)
  }

  async function toggleRegistrationLevel(
    level: RegistrationLevel,
  ) {
    setSavingRegistrationLevel(true)
    setErrorMessage('')
    setSuccessMessage('')

    const nextValue = !level.registration_enabled

    const { error } = await supabase
      .from('levels')
      .update({
        registration_enabled: nextValue,
      })
      .eq('id', level.id)

    if (error) {
      console.error(
        'Error updating registration level:',
        error,
      )

      setErrorMessage(
        `تعذر تحديث المستوى: ${error.message}`,
      )

      setSavingRegistrationLevel(false)
      return
    }

    setRegistrationLevels((current) =>
      current.map((item) =>
        item.id === level.id
          ? {
              ...item,
              registration_enabled: nextValue,
            }
          : item,
      ),
    )

    setSuccessMessage(
      nextValue
        ? `تم إظهار "${level.name}" في التسجيل الخارجي.`
        : `تم إخفاء "${level.name}" من التسجيل الخارجي.`,
    )

    setSavingRegistrationLevel(false)
  }

  async function loadCustomFields() {
    setCustomFieldsLoading(true)

    const { data, error } = await supabase
      .from('custom_fields')
      .select(`
        id,
        name,
        field_type,
        available_in_registration,
        available_in_students,
        available_in_payments,
        sort_order,
        is_active
      `)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error loading custom fields:', error)

      setErrorMessage(
        `تعذر تحميل الحقول الإضافية: ${error.message}`,
      )

      setCustomFieldsLoading(false)
      return
    }

    if (!data || data.length === 0) {
      setCustomFields([])
      setCustomFieldsLoading(false)
      return
    }

    const fieldIds = data.map((field) => field.id)

    const { data: visibilityData, error: visibilityError } =
      await supabase
        .from('custom_field_visibility')
        .select(
          `
          custom_field_id,
          section,
          is_visible,
          is_required,
          sort_order
        `,
        )
        .in('custom_field_id', fieldIds)

    if (visibilityError) {
      console.error(
        'Error loading custom field visibility:',
        visibilityError,
      )

      setErrorMessage(
        `تم تحميل الحقول ولكن تعذر تحميل إعدادات ظهورها: ${visibilityError.message}`,
      )
    }

    const fields: CustomField[] = data.map((field) => {
      const visibility = {
        registration: {
          is_visible: false,
          is_required: false,
          sort_order: field.sort_order,
        },
        students: {
          is_visible: false,
          is_required: false,
          sort_order: field.sort_order,
        },
        payments: {
          is_visible: false,
          is_required: false,
          sort_order: field.sort_order,
        },
      }

      for (const row of visibilityData ?? []) {
        if (row.custom_field_id !== field.id) continue

        if (
          row.section === 'registration' ||
          row.section === 'students' ||
          row.section === 'payments'
        ) {
          visibility[row.section] = {
            is_visible: row.is_visible ?? false,
            is_required: row.is_required ?? false,
            sort_order:
              row.sort_order ?? field.sort_order,
          }
        }
      }

      return {
        ...field,
        visibility,
      }
    })

    setCustomFields(fields)
    setCustomFieldsLoading(false)
  }

  async function saveSettings() {
    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    const cleanEducationGroupLink =
      educationGroupLink.trim()

    const cleanEducationGroupDescription =
      educationGroupDescription.trim()

    const cleanPostRegistrationNotes =
      postRegistrationNotes.trim()

    // ==========================================================
    // التحقق من دورة التسجيل
    // ==========================================================

    if (registrationOpen && !currentAcademicYearId) {
      setErrorMessage(
        'لا توجد سنة دراسية حالية مفعلة. لا يمكن فتح التسجيل بدون سنة حالية.',
      )

      setSaving(false)
      return
    }

    if (registrationOpen && !registrationCourseId) {
      setErrorMessage(
        'اختر دورة التسجيل الحالية أولاً.',
      )

      setSaving(false)
      return
    }

    if (
      registrationCourseId &&
      !registrationCourses.some(
        (course) => course.id === registrationCourseId,
      )
    ) {
      setErrorMessage(
        'الدورة المحددة غير متاحة ضمن الدورات المفتوحة للسنة الحالية. اختر دورة أخرى.',
      )

      setSaving(false)
      return
    }

    if (
      showEducationGroup &&
      !cleanEducationGroupLink
    ) {
      setErrorMessage(
        'عند تفعيل دعوة مجموعة التعليم يجب إضافة رابط المجموعة.',
      )

      setSaving(false)
      return
    }

    if (
      showEducationGroup &&
      cleanEducationGroupLink
    ) {
      try {
        const url = new URL(cleanEducationGroupLink)

        if (
          url.protocol !== 'http:' &&
          url.protocol !== 'https:'
        ) {
          throw new Error('Invalid protocol')
        }
      } catch {
        setErrorMessage(
          'رابط مجموعة التعليم غير صحيح. يرجى إدخال رابط كامل يبدأ بـ https://',
        )

        setSaving(false)
        return
      }
    }

    const payload = {
      course_id: registrationCourseId,

      registration_open: registrationOpen,

      show_name: showName,
      required_name: showName && requiredName,

      show_personal_id: showPersonalId,
      required_personal_id:
        showPersonalId && requiredPersonalId,

      show_gender: showGender,
      required_gender: showGender && requiredGender,

      show_age: showAge,
      required_age: showAge && requiredAge,

      show_phone: showPhone,
      required_phone: showPhone && requiredPhone,

      show_guardian_relation: showGuardianRelation,
      required_guardian_relation:
        showGuardianRelation && requiredGuardianRelation,

      show_whatsapp: showWhatsapp,
      required_whatsapp:
        showWhatsapp && requiredWhatsapp,

      show_student_phone: showStudentPhone,
      required_student_phone:
        showStudentPhone && requiredStudentPhone,

      show_level: showLevel,
      required_level: showLevel && requiredLevel,

      show_notes: showNotes,
      required_notes: showNotes && requiredNotes,

      show_health_notes: showHealthNotes,
      required_health_notes:
        showHealthNotes && requiredHealthNotes,

      show_education_group: showEducationGroup,

      education_group_link:
        cleanEducationGroupLink === ''
          ? null
          : cleanEducationGroupLink,

      education_group_description:
        cleanEducationGroupDescription === ''
          ? null
          : cleanEducationGroupDescription,

      post_registration_notes:
        cleanPostRegistrationNotes === ''
          ? null
          : cleanPostRegistrationNotes,

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
      console.error(
        'Error saving registration settings:',
        error,
      )

      setErrorMessage(
        `تعذر حفظ إعدادات التسجيل: ${error.message}`,
      )

      setSaving(false)
      return
    }

    setSuccessMessage(
      'تم حفظ إعدادات التسجيل بنجاح.',
    )

    setSaving(false)
  }

  function resetNewFieldForm() {
    setNewFieldName('')
    setNewFieldType('text')

    setNewFieldSections({
      registration: false,
      students: false,
      payments: false,
    })

    setNewFieldOptions([''])
  }

  function toggleNewFieldSection(
    section: keyof typeof newFieldSections,
  ) {
    setNewFieldSections((current) => ({
      ...current,
      [section]: !current[section],
    }))
  }

  function addOption() {
    setNewFieldOptions((current) => [...current, ''])
  }

  function removeOption(index: number) {
    setNewFieldOptions((current) =>
      current.filter((_, optionIndex) => optionIndex !== index),
    )
  }

  function updateOption(index: number, value: string) {
    setNewFieldOptions((current) =>
      current.map((option, optionIndex) =>
        optionIndex === index ? value : option,
      ),
    )
  }

  async function addCustomField() {
    const name = newFieldName.trim()

    if (!name) {
      setErrorMessage('اكتب اسم الحقل أولاً.')
      return
    }

    const selectedSections = Object.entries(
      newFieldSections,
    ).filter(([, selected]) => selected)

    if (selectedSections.length === 0) {
      setErrorMessage(
        'اختر مكاناً واحداً على الأقل لاستخدام الحقل.',
      )
      return
    }

    if (
      newFieldType === 'select' &&
      newFieldOptions.filter((option) => option.trim()).length === 0
    ) {
      setErrorMessage(
        'أضف خياراً واحداً على الأقل للقائمة.',
      )
      return
    }

    setSavingField(true)
    setErrorMessage('')
    setSuccessMessage('')

    const maxSortOrder =
      customFields.length > 0
        ? Math.max(
            ...customFields.map(
              (field) => field.sort_order ?? 0,
            ),
          )
        : 0

    const { data: field, error: fieldError } =
      await supabase
        .from('custom_fields')
        .insert({
          name,
          field_type: newFieldType,
          available_in_registration:
            newFieldSections.registration,
          available_in_students:
            newFieldSections.students,
          available_in_payments:
            newFieldSections.payments,
          sort_order: maxSortOrder + 1,
          is_active: true,
        })
        .select(
          `
          id,
          name,
          field_type,
          available_in_registration,
          available_in_students,
          available_in_payments,
          sort_order,
          is_active
        `,
        )
        .single()

    if (fieldError || !field) {
      console.error(
        'Error creating custom field:',
        fieldError,
      )

      setErrorMessage(
        `تعذر إضافة الحقل: ${
          fieldError?.message ?? 'خطأ غير معروف'
        }`,
      )

      setSavingField(false)
      return
    }

    if (newFieldType === 'select') {
      const options = newFieldOptions
        .map((option) => option.trim())
        .filter(Boolean)

      if (options.length > 0) {
        const { error: optionsError } = await supabase
          .from('custom_field_options')
          .insert(
            options.map((option, index) => ({
              custom_field_id: field.id,
              label: option,
              value: option,
              sort_order: index,
            })),
          )

        if (optionsError) {
          console.error(
            'Error creating custom field options:',
            optionsError,
          )

          await supabase
            .from('custom_fields')
            .delete()
            .eq('id', field.id)

          setErrorMessage(
            `تعذر حفظ خيارات الحقل: ${optionsError.message}`,
          )

          setSavingField(false)
          return
        }
      }
    }

    const visibilityRows = selectedSections.map(
      ([section], index) => ({
        custom_field_id: field.id,
        section,
        is_visible: false,
        is_required: false,
        sort_order: maxSortOrder + 1 + index,
      }),
    )

    const { error: visibilityError } = await supabase
      .from('custom_field_visibility')
      .insert(visibilityRows)

    if (visibilityError) {
      console.error(
        'Error creating custom field visibility:',
        visibilityError,
      )

      await supabase
        .from('custom_fields')
        .delete()
        .eq('id', field.id)

      setErrorMessage(
        `تعذر حفظ أماكن ظهور الحقل: ${visibilityError.message}`,
      )

      setSavingField(false)
      return
    }

    resetNewFieldForm()
    setShowAddField(false)

    setSuccessMessage(
      'تمت إضافة الحقل بنجاح.',
    )

    await loadCustomFields()

    setSavingField(false)
  }

  async function deleteCustomField(fieldId: string) {
    const confirmed = window.confirm(
      'هل أنت متأكد من حذف هذا الحقل؟ سيتم حذف إعداداته وقيمه المرتبطة به.',
    )

    if (!confirmed) return

    setErrorMessage('')
    setSuccessMessage('')

    const { error } = await supabase
      .from('custom_fields')
      .delete()
      .eq('id', fieldId)

    if (error) {
      console.error('Error deleting custom field:', error)

      setErrorMessage(
        `تعذر حذف الحقل: ${error.message}`,
      )

      return
    }

    setSuccessMessage('تم حذف الحقل بنجاح.')
    await loadCustomFields()
  }

  async function updateCustomFieldVisibility(
    field: CustomField,
    section: 'registration' | 'students' | 'payments',
    changes: {
      is_visible?: boolean
      is_required?: boolean
    },
  ) {
    const current =
      field.visibility?.[section] ?? {
        is_visible: false,
        is_required: false,
        sort_order: field.sort_order,
      }

    const nextVisible =
      changes.is_visible ?? current.is_visible

    const nextRequired =
      nextVisible
        ? changes.is_required ?? current.is_required
        : false

    const { error } = await supabase
      .from('custom_field_visibility')
      .upsert(
        {
          custom_field_id: field.id,
          section,
          is_visible: nextVisible,
          is_required: nextRequired,
          sort_order: current.sort_order,
        },
        {
          onConflict: 'custom_field_id,section',
        },
      )

    if (error) {
      console.error(
        'Error updating custom field visibility:',
        error,
      )

      setErrorMessage(
        `تعذر حفظ تخصيص الحقل: ${error.message}`,
      )

      return
    }

    setCustomFields((currentFields) =>
      currentFields.map((currentField) => {
        if (currentField.id !== field.id) {
          return currentField
        }

        return {
          ...currentField,
          visibility: {
            ...currentField.visibility!,
            [section]: {
              ...currentField.visibility![section],
              is_visible: nextVisible,
              is_required: nextRequired,
            },
          },
        }
      }),
    )
  }

  function sectionIsAvailable(
    field: CustomField,
    section:
      | 'registration'
      | 'students'
      | 'payments',
  ) {
    if (section === 'registration') {
      return field.available_in_registration
    }

    if (section === 'students') {
      return field.available_in_students
    }

    return field.available_in_payments
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="إعدادات التسجيل"
        description="التحكم في التسجيل العام وحقول التسجيل وطرق الدفع والحقول الإضافية"
      />

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
        <div className="flex items-start justify-between gap-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <span>{errorMessage}</span>

          <button
            type="button"
            onClick={() => setErrorMessage('')}
            className="shrink-0"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <div>
        <Button
          onClick={() => window.history.back()}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <ArrowRight className="ml-2 size-4" />
          العودة
        </Button>
      </div>

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

          <div className="mt-5 border-t pt-5">
            <div>
              <p className="font-semibold">
                دورة التسجيل الحالية
              </p>

              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                السنة الدراسية تؤخذ تلقائياً من السنة الحالية في النظام،
                أما الدورة فيحددها المسؤول من الدورات المفتوحة التابعة
                للسنة الحالية.
              </p>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground">
                  السنة الدراسية الحالية
                </p>

                <p className="mt-1 font-semibold">
                  {registrationCoursesLoading
                    ? 'جاري التحميل...'
                    : currentAcademicYearName || 'لا توجد سنة حالية'}
                </p>

                {!currentAcademicYearId &&
                  !registrationCoursesLoading && (
                    <p className="mt-2 text-xs text-destructive">
                      يجب تحديد سنة دراسية حالية من إعدادات السنوات الدراسية.
                    </p>
                  )}
              </div>

              <div>
                <label
                  htmlFor="registrationCourse"
                  className="text-sm font-medium"
                >
                  الدورة المستخدمة في التسجيل الخارجي
                </label>

                <div className="relative mt-2">
                  <select
                    id="registrationCourse"
                    value={registrationCourseId ?? ''}
                    onChange={(event) =>
                      setRegistrationCourseId(
                        event.target.value || null,
                      )
                    }
                    disabled={
                      loading ||
                      saving ||
                      registrationCoursesLoading ||
                      registrationCourses.length === 0
                    }
                    className="flex h-11 w-full appearance-none rounded-xl border bg-background px-3 py-2 pl-10 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">
                      اختر الدورة
                    </option>

                    {registrationCourses.map((course) => (
                      <option
                        key={course.id}
                        value={course.id}
                      >
                        {course.name}
                      </option>
                    ))}
                  </select>

                  <ChevronDown className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" />
                </div>

                {registrationCourses.length === 0 &&
                  !registrationCoursesLoading && (
                    <p className="mt-2 text-sm text-destructive">
                      لا توجد دورة مفتوحة في السنة الدراسية الحالية.
                    </p>
                  )}

                {registrationCourseId &&
                  registrationCourses.some(
                    (course) =>
                      course.id === registrationCourseId,
                  ) && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      هذه هي الدورة التي سيتم ربط طلبات التسجيل الجديدة بها.
                    </p>
                  )}
              </div>
            </div>

            {registrationCourses.length > 0 && (
              <div className="mt-4 rounded-xl border bg-muted/20 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Check className="size-4" />
                  </div>

                  <div>
                    <p className="font-medium">
                      طريقة الربط
                    </p>

                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      عند إرسال طلب جديد، النظام سيحفظ السنة الدراسية الحالية
                      والدورة المحددة هنا داخل الطلب نفسه. إذا غيرت الدورة
                      لاحقاً، الطلبات القديمة لن تتغير.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {registrationOpen && (
            <div className="mt-5 border-t pt-5">
              <div>
                <p className="font-semibold">
                  المستويات
                </p>

                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  تحكم في أسماء المستويات وظهورها في التسجيل الخارجي.
                  هذه المستويات هي نفسها الموجودة في النظام ولن يتم
                  إنشاء مستويات جديدة.
                </p>
              </div>

              <div className="mt-4 space-y-2">
                {registrationLevelsLoading ? (
                  <div className="flex items-center gap-2 rounded-xl border p-5 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    جاري تحميل المستويات...
                  </div>
                ) : registrationLevels.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-5 text-center">
                    <p className="font-medium">
                      لا توجد مستويات نشطة
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      لا يوجد أي مستوى نشط في جدول المستويات.
                    </p>
                  </div>
                ) : (
                  registrationLevels.map((level) => (
                    <div
                      key={level.id}
                      className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        {editingRegistrationLevelId === level.id ? (
                          <input
                            type="text"
                            value={editingRegistrationLevelName}
                            onChange={(event) =>
                              setEditingRegistrationLevelName(
                                event.target.value,
                              )
                            }
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault()
                                saveRegistrationLevelName(level)
                              }

                              if (event.key === 'Escape') {
                                event.preventDefault()
                                cancelEditingRegistrationLevel()
                              }
                            }}
                            autoFocus
                            disabled={savingRegistrationLevel}
                            className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              startEditingRegistrationLevel(level)
                            }
                            disabled={savingRegistrationLevel}
                            className="w-full text-right font-medium hover:text-primary disabled:cursor-not-allowed"
                          >
                            {level.name}
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {editingRegistrationLevelId === level.id ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() =>
                                saveRegistrationLevelName(level)
                              }
                              disabled={savingRegistrationLevel}
                            >
                              {savingRegistrationLevel ? (
                                <Loader2 className="ml-2 size-4 animate-spin" />
                              ) : (
                                <Save className="ml-2 size-4" />
                              )}
                              حفظ
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={
                                cancelEditingRegistrationLevel
                              }
                              disabled={savingRegistrationLevel}
                            >
                              إلغاء
                            </Button>
                          </>
                        ) : (
                          <button
                            type="button"
                            role="switch"
                            aria-checked={
                              level.registration_enabled
                            }
                            disabled={savingRegistrationLevel}
                            onClick={() =>
                              toggleRegistrationLevel(level)
                            }
                            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                              level.registration_enabled
                                ? 'bg-primary'
                                : 'bg-muted-foreground/30'
                            }`}
                          >
                            <span
                              className={`absolute top-1 size-4 rounded-full bg-white shadow-sm transition-transform ${
                                level.registration_enabled
                                  ? 'right-1'
                                  : 'right-6'
                              }`}
                            />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ==========================================================
          دعوة مجموعة التعليم بعد التسجيل
          ========================================================== */}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersRound className="size-5" />
            مجموعة التعليم بعد التسجيل
          </CardTitle>

          <p className="text-sm leading-6 text-muted-foreground">
            التحكم في المعلومات التي تظهر للطالب بعد نجاح إرسال طلب التسجيل.
            هذه المعلومات لا تظهر داخل نموذج التسجيل.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <SettingRow
            title="تفعيل دعوة مجموعة التعليم"
            description="عند التفعيل، تظهر مجموعة التعليم ورابطها في صفحة نجاح التسجيل."
            checked={showEducationGroup}
            onChange={setShowEducationGroup}
            disabled={loading}
          />

          {showEducationGroup && (
            <div className="space-y-5 rounded-2xl border bg-muted/20 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <Link2 className="size-4 text-primary" />

                  <label
                    htmlFor="educationGroupLink"
                    className="text-sm font-semibold"
                  >
                    رابط مجموعة التعليم
                  </label>
                </div>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  رابط المجموعة الذي سيظهر للطالب بعد نجاح التسجيل.
                </p>

                <input
                  id="educationGroupLink"
                  type="url"
                  value={educationGroupLink}
                  onChange={(event) =>
                    setEducationGroupLink(event.target.value)
                  }
                  placeholder="https://chat.whatsapp.com/..."
                  disabled={loading || saving}
                  className="mt-3 flex h-11 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label
                  htmlFor="educationGroupDescription"
                  className="text-sm font-semibold"
                >
                  النص المصاحب لرابط المجموعة
                </label>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  هذا النص يظهر قبل رابط مجموعة التعليم، ويمكنك تغييره
                  حسب التعليمات التي تريد إيصالها للطالب.
                </p>

                <textarea
                  id="educationGroupDescription"
                  value={educationGroupDescription}
                  onChange={(event) =>
                    setEducationGroupDescription(
                      event.target.value,
                    )
                  }
                  placeholder="مثال: يمكنكم الانضمام إلى مجموعة التعليم من خلال الرابط التالي:"
                  disabled={loading || saving}
                  rows={3}
                  className="mt-3 flex w-full resize-y rounded-xl border bg-background px-3 py-3 text-sm leading-7 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label
                  htmlFor="postRegistrationNotes"
                  className="text-sm font-semibold"
                >
                  ملاحظات عامة بعد التسجيل
                </label>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  ملاحظات مستقلة تظهر بعد قسم مجموعة التعليم، ويمكن تركها فارغة.
                </p>

                <textarea
                  id="postRegistrationNotes"
                  value={postRegistrationNotes}
                  onChange={(event) =>
                    setPostRegistrationNotes(event.target.value)
                  }
                  placeholder="مثال: يرجى الانضمام إلى مجتمع التعليم في الواتساب حتى تصلكم جميع إعلانات التعليم."
                  disabled={loading || saving}
                  rows={4}
                  className="mt-3 flex w-full resize-y rounded-xl border bg-background px-3 py-3 text-sm leading-7 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="rounded-xl border bg-background p-4">
                <p className="text-sm font-semibold">
                  معاينة ما بعد التسجيل
                </p>

                <div className="mt-4 space-y-4">
                  <div className="rounded-xl border p-4">
                    <p className="font-semibold">
                      مجموعة التعليم
                    </p>

                    {educationGroupDescription.trim() && (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                        {educationGroupDescription}
                      </p>
                    )}

                    {educationGroupLink.trim() && (
                      <div className="mt-3 inline-flex rounded-lg border px-4 py-2 text-sm font-medium text-primary">
                        الانضمام إلى مجموعة التعليم
                      </div>
                    )}
                  </div>

                  {postRegistrationNotes.trim() && (
                    <div className="rounded-xl border p-4">
                      <p className="font-semibold">
                        ملاحظات عامة
                      </p>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                        {postRegistrationNotes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {!showEducationGroup && (
            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              دعوة مجموعة التعليم متوقفة حالياً، ولن تظهر للمستخدم بعد نجاح التسجيل.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRound className="size-5" />
            الحقول الأساسية
          </CardTitle>

          <p className="text-sm leading-6 text-muted-foreground">
            هذه الحقول جزء أساسي من نظام T3LEEM ويمكن التحكم في ظهورها
            وإلزاميتها.
          </p>
        </CardHeader>

        <CardContent className="space-y-3">
          <FieldControl
            title="الاسم"
            description="اسم الطالب."
            visible={showName}
            required={requiredName}
            onVisibleChange={(value) => {
              setShowName(value)
              if (!value) setRequiredName(false)
            }}
            onRequiredChange={setRequiredName}
            disabled={loading}
          />

          <FieldControl
            title="الرقم الشخصي"
            description="الرقم الشخصي للطالب."
            visible={showPersonalId}
            required={requiredPersonalId}
            onVisibleChange={(value) => {
              setShowPersonalId(value)
              if (!value) setRequiredPersonalId(false)
            }}
            onRequiredChange={setRequiredPersonalId}
            disabled={loading}
          />

          <FieldControl
            title="الجنس"
            description="اختيار جنس الطالب."
            visible={showGender}
            required={requiredGender}
            onVisibleChange={(value) => {
              setShowGender(value)
              if (!value) setRequiredGender(false)
            }}
            onRequiredChange={setRequiredGender}
            disabled={loading}
          />

          <FieldControl
            title="العمر"
            description="عمر الطالب."
            visible={showAge}
            required={requiredAge}
            onVisibleChange={(value) => {
              setShowAge(value)
              if (!value) setRequiredAge(false)
            }}
            onRequiredChange={setRequiredAge}
            disabled={loading}
          />

          <FieldControl
            title="رقم الاتصال الأساسي"
            description="رقم الهاتف الأساسي لجهة التواصل."
            visible={showPhone}
            required={requiredPhone}
            onVisibleChange={(value) => {
              setShowPhone(value)
              if (!value) setRequiredPhone(false)
            }}
            onRequiredChange={setRequiredPhone}
            disabled={loading}
          />

          <FieldControl
            title="صلة القرابة"
            description="صلة قرابة صاحب رقم الاتصال الأساسي بالطالب."
            visible={showGuardianRelation}
            required={requiredGuardianRelation}
            onVisibleChange={(value) => {
              setShowGuardianRelation(value)
              if (!value) setRequiredGuardianRelation(false)
            }}
            onRequiredChange={setRequiredGuardianRelation}
            disabled={loading}
          />

          <FieldControl
            title="الواتساب"
            description="رقم الواتساب للتواصل."
            visible={showWhatsapp}
            required={requiredWhatsapp}
            onVisibleChange={(value) => {
              setShowWhatsapp(value)
              if (!value) setRequiredWhatsapp(false)
            }}
            onRequiredChange={setRequiredWhatsapp}
            disabled={loading}
          />

          <FieldControl
            title="رقم الطالب"
            description="رقم الهاتف الخاص بالطالب نفسه."
            visible={showStudentPhone}
            required={requiredStudentPhone}
            onVisibleChange={(value) => {
              setShowStudentPhone(value)
              if (!value) setRequiredStudentPhone(false)
            }}
            onRequiredChange={setRequiredStudentPhone}
            disabled={loading}
          />

          <FieldControl
            title="الصف / المستوى"
            description="المستوى الدراسي الذي يريد الطالب التسجيل فيه."
            visible={showLevel}
            required={requiredLevel}
            onVisibleChange={(value) => {
              setShowLevel(value)
              if (!value) setRequiredLevel(false)
            }}
            onRequiredChange={setRequiredLevel}
            disabled={loading}
          />

          <FieldControl
            title="الملاحظات"
            description="ملاحظات إضافية من مقدم الطلب."
            visible={showNotes}
            required={requiredNotes}
            onVisibleChange={(value) => {
              setShowNotes(value)
              if (!value) setRequiredNotes(false)
            }}
            onRequiredChange={setRequiredNotes}
            disabled={loading}
          />

          <FieldControl
            title="الحالة الصحية"
            description="الحالة الصحية والمعلومات الصحية التي يضيفها مقدم الطلب."
            visible={showHealthNotes}
            required={requiredHealthNotes}
            onVisibleChange={(value) => {
              setShowHealthNotes(value)
              if (!value) setRequiredHealthNotes(false)
            }}
            onRequiredChange={setRequiredHealthNotes}
            disabled={loading}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>الحقول الإضافية</CardTitle>

              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                أضف أي معلومة جديدة بدون الحاجة إلى تعديل قاعدة البيانات.
              </p>
            </div>

            <Button
              type="button"
              onClick={() => {
                setShowAddField((current) => !current)
                setErrorMessage('')
              }}
            >
              <Plus className="ml-2 size-4" />
              إضافة حقل
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {showAddField && (
            <div className="rounded-2xl border-2 border-dashed p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">
                    إضافة حقل جديد
                  </h3>

                  <p className="mt-1 text-sm text-muted-foreground">
                    الحقل سيكون متاحاً في الأقسام التي تختارها.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowAddField(false)
                    resetNewFieldForm()
                  }}
                  className="rounded-lg p-2 hover:bg-muted"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">
                    اسم الحقل
                  </label>

                  <input
                    type="text"
                    value={newFieldName}
                    onChange={(event) =>
                      setNewFieldName(event.target.value)
                    }
                    placeholder="مثال: اسم ولي الأمر"
                    className="mt-2 flex h-11 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    disabled={savingField}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">
                    نوع الحقل
                  </label>

                  <div className="relative mt-2">
                    <select
                      value={newFieldType}
                      onChange={(event) =>
                        setNewFieldType(
                          event.target.value as FieldType,
                        )
                      }
                      className="flex h-11 w-full appearance-none rounded-xl border bg-background px-3 py-2 pl-10 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      disabled={savingField}
                    >
                      {Object.entries(FIELD_TYPE_LABELS).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ),
                      )}
                    </select>

                    <ChevronDown className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" />
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <p className="text-sm font-medium">
                  أين تريد استخدام الحقل؟
                </p>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {SECTIONS.map((section) => {
                    const selected =
                      newFieldSections[section.key]

                    return (
                      <button
                        key={section.key}
                        type="button"
                        disabled={savingField}
                        onClick={() =>
                          toggleNewFieldSection(section.key)
                        }
                        className={`flex items-center justify-between rounded-xl border p-4 text-right transition ${
                          selected
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted/40'
                        }`}
                      >
                        <span>
                          <span className="block font-medium">
                            {section.label}
                          </span>

                          <span className="mt-1 block text-xs text-muted-foreground">
                            متاح للتخصيص
                          </span>
                        </span>

                        <span
                          className={`flex size-6 items-center justify-center rounded-md border ${
                            selected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-muted-foreground/30'
                          }`}
                        >
                          {selected && (
                            <Check className="size-4" />
                          )}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {newFieldType === 'select' && (
                <div className="mt-5 rounded-xl border bg-muted/20 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        خيارات القائمة
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addOption}
                      disabled={savingField}
                    >
                      <Plus className="ml-1 size-4" />
                      إضافة خيار
                    </Button>
                  </div>

                  <div className="mt-4 space-y-2">
                    {newFieldOptions.map(
                      (option, index) => (
                        <div
                          key={index}
                          className="flex gap-2"
                        >
                          <input
                            type="text"
                            value={option}
                            onChange={(event) =>
                              updateOption(
                                index,
                                event.target.value,
                              )
                            }
                            placeholder={`الخيار ${index + 1}`}
                            className="flex h-10 min-w-0 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                            disabled={savingField}
                          />

                          {newFieldOptions.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                removeOption(index)
                              }
                              disabled={savingField}
                              className="rounded-lg border p-2 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          )}
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddField(false)
                    resetNewFieldForm()
                  }}
                  disabled={savingField}
                >
                  إلغاء
                </Button>

                <Button
                  type="button"
                  onClick={addCustomField}
                  disabled={savingField}
                >
                  {savingField ? (
                    <>
                      <Loader2 className="ml-2 size-4 animate-spin" />
                      جاري الإضافة...
                    </>
                  ) : (
                    <>
                      <Plus className="ml-2 size-4" />
                      إضافة الحقل
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {customFieldsLoading ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border p-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              جاري تحميل الحقول الإضافية...
            </div>
          ) : activeCustomFields.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
                <Plus className="size-5 text-muted-foreground" />
              </div>

              <p className="mt-3 font-medium">
                لا توجد حقول إضافية
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeCustomFields.map((field, index) => (
                <div
                  key={field.id}
                  className="rounded-2xl border p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-xs font-semibold">
                          {index + 1}
                        </span>

                        <h3 className="font-semibold">
                          {field.name}
                        </h3>

                        <Badge variant="outline">
                          {
                            FIELD_TYPE_LABELS[
                              field.field_type as FieldType
                            ]
                          }
                        </Badge>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() =>
                        deleteCustomField(field.id)
                      }
                    >
                      <Trash2 className="ml-2 size-4" />
                      حذف الحقل
                    </Button>
                  </div>

                  <div className="mt-5 grid gap-3 lg:grid-cols-3">
                    {SECTIONS.map((section) => {
                      const available =
                        sectionIsAvailable(
                          field,
                          section.key,
                        )

                      const visibility =
                        field.visibility?.[section.key] ?? {
                          is_visible: false,
                          is_required: false,
                          sort_order: field.sort_order,
                        }

                      return (
                        <div
                          key={section.key}
                          className={`rounded-xl border p-4 ${
                            available
                              ? 'bg-background'
                              : 'bg-muted/30 opacity-50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="font-medium">
                                {section.label}
                              </p>
                            </div>
                          </div>

                          {available && (
                            <div className="mt-4 space-y-2">
                              <ToggleButton
                                label="عرض الحقل"
                                checked={
                                  visibility.is_visible
                                }
                                onChange={async (value) => {
                                  await updateCustomFieldVisibility(
                                    field,
                                    section.key,
                                    {
                                      is_visible: value,
                                    },
                                  )
                                }}
                              />

                              <ToggleButton
                                label="إلزامي"
                                checked={
                                  visibility.is_required
                                }
                                disabled={
                                  !visibility.is_visible
                                }
                                onChange={async (value) => {
                                  await updateCustomFieldVisibility(
                                    field,
                                    section.key,
                                    {
                                      is_required: value,
                                    },
                                  )
                                }}
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
                  value={paymentAmount}
                  onChange={(event) =>
                    setPaymentAmount(event.target.value)
                  }
                  className="mt-2 flex h-10 w-full max-w-sm rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  disabled={loading}
                />
              </div>

              <div className="space-y-3">
                <p className="font-medium">
                  طرق الدفع المتاحة
                </p>

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
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ملخص الإعدادات</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-xl bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                التسجيل
              </p>

              <p className="mt-1 font-semibold">
                {registrationOpen ? 'مفتوح' : 'مغلق'}
              </p>
            </div>

            <div className="rounded-xl bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                السنة الدراسية
              </p>

              <p className="mt-1 font-semibold">
                {currentAcademicYearName || 'غير محددة'}
              </p>
            </div>

            <div className="rounded-xl bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                دورة التسجيل
              </p>

              <p className="mt-1 font-semibold">
                {registrationCourses.find(
                  (course) =>
                    course.id === registrationCourseId,
                )?.name ?? 'غير محددة'}
              </p>
            </div>

            <div className="rounded-xl bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                الدفع
              </p>

              <p className="mt-1 font-semibold">
                {paymentEnabled ? 'مفعل' : 'غير مفعل'}
              </p>
            </div>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                مجموعة التعليم
              </p>

              <p className="mt-1 font-semibold">
                {showEducationGroup
                  ? educationGroupLink.trim()
                    ? 'مفعلة'
                    : 'مفعلة بدون رابط'
                  : 'غير مفعلة'}
              </p>
            </div>

            <div className="rounded-xl bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                الحقول الإضافية
              </p>

              <p className="mt-1 font-semibold">
                {activeCustomFields.length}
              </p>
            </div>
          </div>

          {paymentEnabled && (
            <div className="mt-4 rounded-xl bg-muted/50 p-4 text-sm leading-7">
              {paymentAmount && (
                <p>
                  مبلغ التسجيل:{' '}
                  <strong>{paymentAmount}</strong>
                </p>
              )}

              <p>
                إثبات الدفع:{' '}
                <strong>
                  {!paymentProofEnabled
                    ? 'غير متاح'
                    : paymentProofRequired
                      ? 'إجباري'
                      : 'اختياري'}
                </strong>
              </p>
            </div>
          )}

          {showEducationGroup && (
            <div className="mt-4 rounded-xl bg-muted/50 p-4 text-sm leading-7">
              <p>
                دعوة مجموعة التعليم:{' '}
                <strong>
                  {educationGroupLink.trim()
                    ? 'مفعلة'
                    : 'بدون رابط'}
                </strong>
              </p>

              {educationGroupDescription.trim() && (
                <p className="mt-1">
                  يوجد نص مصاحب لرابط المجموعة.
                </p>
              )}

              {postRegistrationNotes.trim() && (
                <p className="mt-1">
                  توجد ملاحظات ستظهر بعد نجاح التسجيل.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end pb-6">
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
