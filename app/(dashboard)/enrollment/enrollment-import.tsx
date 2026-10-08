'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  AlertCircle,
  Check,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from 'lucide-react'
import * as XLSX from 'xlsx'

import { supabase } from '@/lib/supabase'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
} from '@/components/ui/card'

type Props = {
  onClose: () => void
  onImported: () => void | Promise<void>
}

type Level = {
  id: string
  name: string
}

type ImportRow = {
  name: string
  personalId: string
  gender: string
  age: number | null
  phone: string
  whatsapp: string
  level: string
  notes: string
  healthNotes: string
  paymentMethod: string
  paymentAmount: number | null
  paymentReference: string
}

const COLUMNS = [
  'الاسم',
  'الرقم الشخصي',
  'الجنس',
  'العمر',
  'رقم الجوال',
  'الواتساب',
  'المستوى',
  'الملاحظات',
  'المعلومات الصحية',
  'طريقة الدفع',
  'المبلغ',
  'مرجع الدفع',
]

const GENDER_OPTIONS = [
  'ذكر',
  'أنثى',
]

const PAYMENT_OPTIONS = [
  'نقدي',
  'تحويل',
  'بطاقة',
  'لا يوجد',
]

const normalize = (value: unknown) =>
  String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')

function downloadBlob(
  workbook: XLSX.WorkBook,
  filename: string,
) {
  XLSX.writeFile(workbook, filename)
}

export function EnrollmentImport({
  onClose,
  onImported,
}: Props) {
  const [levels, setLevels] =
    useState<Level[]>([])

  const [loadingLevels, setLoadingLevels] =
    useState(true)

  const [fileName, setFileName] =
    useState('')

  const [rows, setRows] =
    useState<ImportRow[]>([])

  const [errors, setErrors] =
    useState<string[]>([])

  const [saving, setSaving] =
    useState(false)

  const [message, setMessage] =
    useState('')

  useEffect(() => {
    const loadLevels = async () => {
      setLoadingLevels(true)

      const { data, error } =
        await supabase
          .from('levels')
          .select('id, name')
          .order('name')

      if (error) {
        setErrors([
          `تعذر تحميل المستويات: ${error.message}`,
        ])
        setLoadingLevels(false)
        return
      }

      setLevels(
        (data ?? []).map((item) => ({
          id: item.id,
          name: item.name,
        })),
      )

      setLoadingLevels(false)
    }

    loadLevels()
  }, [])

  const levelNames = useMemo(
    () => levels.map((level) => level.name),
    [levels],
  )

  const downloadTemplate = () => {
    const exampleLevel =
      levels[0]?.name ?? 'اكتب المستوى هنا'

    const data = [
      COLUMNS,
      [
        'مثال: محمد أحمد',
        '123456789',
        'ذكر',
        10,
        '3XXXXXXXX',
        '3XXXXXXXX',
        exampleLevel,
        '',
        '',
        'لا يوجد',
        '',
        '',
      ],
    ]

    const instructions = [
      ['تعليمات استيراد سجل التسجيل'],
      [''],
      ['مهم', 'يجب عدم تغيير أسماء الأعمدة أو ترتيبها.'],
      [''],
      ['الجنس', GENDER_OPTIONS.join(' / ')],
      ['المستويات', levelNames.join(' / ') || 'لا توجد مستويات'],
      ['طريقة الدفع', PAYMENT_OPTIONS.join(' / ')],
      [''],
      ['ملاحظات'],
      [
        'الاسم',
        'حقل مطلوب.',
      ],
      [
        'الرقم الشخصي',
        'يفضل إدخاله بدون مسافات.',
      ],
      [
        'الجنس',
        'استخدم أحد الخيارات الموجودة في ورقة التعليمات.',
      ],
      [
        'المستوى',
        'يجب أن يطابق اسم مستوى موجود في النظام.',
      ],
      [
        'العمر',
        'رقم فقط، ويمكن تركه فارغاً.',
      ],
      [
        'الملاحظات والمعلومات الصحية',
        'اختيارية.',
      ],
      [
        'الدفع',
        'اختياري. الطلب سيظل طلب تسجيل ويمكن مراجعته قبل القبول.',
      ],
    ]

    const workbook =
      XLSX.utils.book_new()

    const dataSheet =
      XLSX.utils.aoa_to_sheet(data)

    const instructionsSheet =
      XLSX.utils.aoa_to_sheet(
        instructions,
      )

    XLSX.utils.book_append_sheet(
      workbook,
      dataSheet,
      'طلبات التسجيل',
    )

    XLSX.utils.book_append_sheet(
      workbook,
      instructionsSheet,
      'التعليمات والخيارات',
    )

    dataSheet['!cols'] = COLUMNS.map(
      () => ({
        wch: 22,
      }),
    )

    instructionsSheet['!cols'] = [
      { wch: 24 },
      { wch: 70 },
    ]

    downloadBlob(
      workbook,
      'قالب_استيراد_طلبات_التسجيل.xlsx',
    )
  }

  const parseExcel = async (
    file: File,
  ) => {
    setErrors([])
    setMessage('')
    setRows([])

    const buffer =
      await file.arrayBuffer()

    const workbook =
      XLSX.read(buffer, {
        type: 'array',
      })

    const firstSheetName =
      workbook.SheetNames[0]

    if (!firstSheetName) {
      setErrors([
        'ملف Excel لا يحتوي على أي ورقة.',
      ])
      return
    }

    const sheet =
      workbook.Sheets[firstSheetName]

    const matrix =
      XLSX.utils.sheet_to_json<
        unknown[]
      >(sheet, {
        header: 1,
        defval: '',
        raw: false,
      })

    if (matrix.length === 0) {
      setErrors([
        'ملف Excel فارغ.',
      ])
      return
    }

    const header =
      (matrix[0] ?? []).map(normalize)

    const expected =
      COLUMNS.map(normalize)

    const sameHeader =
      header.length === expected.length &&
      header.every(
        (value, index) =>
          value === expected[index],
      )

    if (!sameHeader) {
      setErrors([
        'ترتيب أو أسماء أعمدة ملف Excel غير مطابقة للقالب.',
        `المطلوب: ${COLUMNS.join(' | ')}`,
        `الموجود: ${header.join(' | ')}`,
        'نزّل القالب الرسمي واستخدمه كما هو.',
      ])
      return
    }

    const parsed: ImportRow[] = []
    const rowErrors: string[] = []

    for (
      let index = 1;
      index < matrix.length;
      index++
    ) {
      const raw = matrix[index] ?? []

      const isEmpty =
        raw.every(
          (value) =>
            normalize(value) === '',
        )

      if (isEmpty) continue

      const name =
        normalize(raw[0])

      const personalId =
        normalize(raw[1])

      const gender =
        normalize(raw[2])

      const ageValue =
        normalize(raw[3])

      const phone =
        normalize(raw[4])

      const whatsapp =
        normalize(raw[5])

      const level =
        normalize(raw[6])

      const notes =
        normalize(raw[7])

      const healthNotes =
        normalize(raw[8])

      const paymentMethod =
        normalize(raw[9])

      const amountValue =
        normalize(raw[10])

      const paymentReference =
        normalize(raw[11])

      const rowNumber = index + 1

      if (!name) {
        rowErrors.push(
          `الصف ${rowNumber}: الاسم مطلوب.`,
        )
      }

      if (!gender) {
        rowErrors.push(
          `الصف ${rowNumber}: الجنس مطلوب.`,
        )
      } else if (
        !GENDER_OPTIONS.includes(gender)
      ) {
        rowErrors.push(
          `الصف ${rowNumber}: الجنس "${gender}" غير صحيح.`,
        )
      }

      if (!level) {
        rowErrors.push(
          `الصف ${rowNumber}: المستوى مطلوب.`,
        )
      } else if (
        !levelNames.includes(level)
      ) {
        rowErrors.push(
          `الصف ${rowNumber}: المستوى "${level}" غير موجود في النظام.`,
        )
      }

      let age: number | null = null

      if (ageValue) {
        const parsedAge =
          Number(ageValue)

        if (
          !Number.isFinite(parsedAge) ||
          parsedAge < 0
        ) {
          rowErrors.push(
            `الصف ${rowNumber}: العمر غير صحيح.`,
          )
        } else {
          age = parsedAge
        }
      }

      let paymentAmount:
        | number
        | null = null

      if (amountValue) {
        const parsedAmount =
          Number(amountValue)

        if (
          !Number.isFinite(
            parsedAmount,
          ) ||
          parsedAmount < 0
        ) {
          rowErrors.push(
            `الصف ${rowNumber}: مبلغ الدفع غير صحيح.`,
          )
        } else {
          paymentAmount =
            parsedAmount
        }
      }

      if (
        paymentMethod &&
        !PAYMENT_OPTIONS.includes(
          paymentMethod,
        )
      ) {
        rowErrors.push(
          `الصف ${rowNumber}: طريقة الدفع "${paymentMethod}" غير صحيحة.`,
        )
      }

      parsed.push({
        name,
        personalId,
        gender,
        age,
        phone,
        whatsapp,
        level,
        notes,
        healthNotes,
        paymentMethod,
        paymentAmount,
        paymentReference,
      })
    }

    if (parsed.length === 0) {
      rowErrors.push(
        'لم يتم العثور على أي سجلات قابلة للاستيراد.',
      )
    }

    setRows(parsed)
    setErrors(rowErrors)
  }

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      event.target.files?.[0]

    if (!file) return

    setFileName(file.name)

    try {
      await parseExcel(file)
    } catch (error) {
      console.error(error)

      setRows([])
      setErrors([
        'تعذر قراءة ملف Excel. تأكد أنه ملف xlsx صالح.',
      ])
    }

    event.target.value = ''
  }

  const importRows = async () => {
    if (saving) return

    if (rows.length === 0) {
      setMessage(
        'لا توجد سجلات جاهزة للاستيراد.',
      )
      return
    }

    if (errors.length > 0) {
      setMessage(
        'صحح أخطاء الملف أولاً قبل الاستيراد.',
      )
      return
    }

    const confirmed =
      window.confirm(
        `سيتم إضافة ${rows.length} طلب تسجيل جديد.\n\nسيتم وضعها في قسم "الطلبات المستوردة" للمراجعة قبل إنشاء الطلاب.\n\nهل تريد المتابعة؟`,
      )

    if (!confirmed) return

    setSaving(true)
    setMessage('')
    setErrors([])

    try {
      const {
        data: academicYear,
        error: academicYearError,
      } = await supabase
        .from('academic_years')
        .select('id, name')
        .eq('is_current', true)
        .eq('is_active', true)
        .maybeSingle()

      if (academicYearError) {
        throw new Error(
          `تعذر تحميل السنة الدراسية الحالية: ${academicYearError.message}`,
        )
      }

      if (!academicYear) {
        throw new Error(
          'لا توجد سنة دراسية حالية ونشطة. افتح إعدادات السنوات الدراسية وحدد السنة الحالية أولاً.',
        )
      }

      const levelMap =
        new Map(
          levels.map((level) => [
            level.name,
            level.id,
          ]),
        )

      const missingLevels = Array.from(
        new Set(
          rows
            .filter(
              (row) =>
                !levelMap.has(row.level),
            )
            .map((row) => row.level),
        ),
      )

      if (missingLevels.length > 0) {
        throw new Error(
          `المستويات التالية غير موجودة في النظام: ${missingLevels.join(
            '، ',
          )}`,
        )
      }

      const timestamp =
        Date.now()

      const payload =
        rows.map((row, index) => {
          const levelId =
            levelMap.get(row.level)

          return {
            request_number:
              `IMP-${timestamp}-${String(
                index + 1,
              ).padStart(3, '0')}`,

            tracking_token:
              crypto.randomUUID(),

            name: row.name,

            personal_id:
              row.personalId || null,

            gender:
              row.gender || null,

            age: row.age,

            phone:
              row.phone || null,

            whatsapp:
              row.whatsapp || null,

            level_id:
              levelId,

            class_id: null,

            notes:
              row.notes || null,

            health_notes:
              row.healthNotes || null,

            status: 'pending',

            processing_mode: 'review',

            payment_method:
              row.paymentMethod &&
              row.paymentMethod !==
                'لا يوجد'
                ? row.paymentMethod
                : null,

            payment_amount:
              row.paymentAmount,

            payment_reference:
              row.paymentReference ||
              null,

            payment_status:
              row.paymentAmount !==
                null &&
              row.paymentAmount >
                0
                ? 'pending'
                : 'not_required',

            source: 'import',

            academic_year_id:
              academicYear.id,
          }
        })

      setMessage(
        `جاري استيراد ${payload.length} طلب...`,
      )

      await new Promise<void>(
        (resolve) => {
          setTimeout(resolve, 50)
        },
      )

      const {
        data,
        error,
      } = await supabase
        .from('registration_requests')
        .insert(payload)
        .select('id')

      if (error) {
        throw error
      }

      if (
        !data ||
        data.length !== payload.length
      ) {
        throw new Error(
          `تم إرسال الطلب لكن لم يتم تأكيد إضافة جميع السجلات. المتوقع: ${payload.length}، المضاف: ${
            data?.length ?? 0
          }`,
        )
      }

      setMessage(
        `تم استيراد ${payload.length} طلب بنجاح ✅`,
      )

      setRows([])
      setFileName('')

      await onImported()
    } catch (error) {
      console.error(
        'Import error:',
        error,
      )

      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === 'object' &&
              error !== null &&
              'message' in error
            ? String(
                (
                  error as {
                    message?: unknown
                  }
                ).message ?? '',
              )
            : 'خطأ غير معروف'

      setErrors([
        `تعذر استيراد السجلات: ${errorMessage}`,
      ])

      setMessage('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-xl border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="size-5" />

              <h2 className="text-lg font-semibold">
                استيراد سجل لهذه السنة الدراسية
              </h2>
            </div>

            <p className="mt-1 text-sm text-muted-foreground">
              السجلات المستوردة ستصبح طلبات تسجيل وتحتاج إلى مراجعة قبل قبولها.
            </p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={saving}
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="space-y-5 p-5">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div>
                <h3 className="font-semibold">
                  1. نزّل قالب Excel
                </h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  استخدم القالب الرسمي ولا تغير أسماء الأعمدة أو ترتيبها.
                </p>
              </div>

              <Button
                variant="outline"
                onClick={
                  downloadTemplate
                }
                disabled={loadingLevels || saving}
                className="gap-2"
              >
                {loadingLevels ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}

                تحميل قالب Excel
              </Button>

              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <p className="font-medium">
                  الأعمدة المطلوبة بالترتيب:
                </p>

                <p className="mt-2 text-muted-foreground">
                  {COLUMNS.join(' ← ')}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-5">
              <div>
                <h3 className="font-semibold">
                  2. ارفع الملف
                </h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  سيتم فحص الأعمدة والخيارات قبل إضافة أي سجل.
                </p>
              </div>

              <label
                className={`flex items-center justify-center rounded-lg border-2 border-dashed p-8 transition ${
                  saving
                    ? 'cursor-not-allowed opacity-50'
                    : 'cursor-pointer hover:bg-muted/30'
                }`}
              >
                <div className="text-center">
                  {saving ? (
                    <Loader2 className="mx-auto size-8 animate-spin text-muted-foreground" />
                  ) : (
                    <Upload className="mx-auto size-8 text-muted-foreground" />
                  )}

                  <p className="mt-2 font-medium">
                    {saving
                      ? 'جاري الاستيراد...'
                      : 'اختر ملف Excel'}
                  </p>

                  {!saving && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      XLSX
                    </p>
                  )}

                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={
                      handleFileChange
                    }
                    disabled={saving}
                    className="hidden"
                  />
                </div>
              </label>

              {fileName && (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                  الملف المختار:{' '}
                  <span className="font-medium">
                    {fileName}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {errors.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-900">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 size-5 shrink-0" />

                <div className="min-w-0">
                  <p className="font-semibold">
                    توجد مشاكل في الملف
                  </p>

                  <ul className="mt-2 max-h-48 list-disc space-y-1 overflow-y-auto pr-5 text-sm">
                    {errors.map(
                      (
                        error,
                        index,
                      ) => (
                        <li
                          key={`${error}-${index}`}
                        >
                          {error}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {message && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              {saving && (
                <Loader2 className="ml-2 inline size-4 animate-spin" />
              )}

              {message}
            </div>
          )}

          {rows.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <div className="flex items-center justify-between border-b p-4">
                  <div>
                    <h3 className="font-semibold">
                      معاينة السجلات
                    </h3>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {rows.length} سجل جاهز
                    </p>
                  </div>

                  {errors.length === 0 && (
                    <div className="flex items-center gap-2 text-sm text-emerald-700">
                      <Check className="size-4" />
                      الملف سليم
                    </div>
                  )}
                </div>

                <div className="max-h-[360px] overflow-auto">
                  <table className="w-full min-w-[1100px] text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="px-3 py-3 text-right">
                          الاسم
                        </th>
                        <th className="px-3 py-3 text-right">
                          الرقم الشخصي
                        </th>
                        <th className="px-3 py-3 text-right">
                          الجنس
                        </th>
                        <th className="px-3 py-3 text-right">
                          العمر
                        </th>
                        <th className="px-3 py-3 text-right">
                          الجوال
                        </th>
                        <th className="px-3 py-3 text-right">
                          الواتساب
                        </th>
                        <th className="px-3 py-3 text-right">
                          المستوى
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {rows.map(
                        (
                          row,
                          index,
                        ) => (
                          <tr
                            key={index}
                            className="border-b"
                          >
                            <td className="px-3 py-3 font-medium">
                              {row.name}
                            </td>

                            <td className="px-3 py-3">
                              {row.personalId ||
                                '—'}
                            </td>

                            <td className="px-3 py-3">
                              {row.gender}
                            </td>

                            <td className="px-3 py-3">
                              {row.age ??
                                '—'}
                            </td>

                            <td className="px-3 py-3">
                              {row.phone ||
                                '—'}
                            </td>

                            <td className="px-3 py-3">
                              {row.whatsapp ||
                                '—'}
                            </td>

                            <td className="px-3 py-3">
                              {row.level}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={saving}
            >
              إلغاء
            </Button>

            <Button
              onClick={importRows}
              disabled={
                saving ||
                rows.length === 0 ||
                errors.length > 0
              }
              className="gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  جاري الاستيراد...
                </>
              ) : (
                <>
                  <Upload className="size-4" />
                  استيراد {rows.length || ''} طلب
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
