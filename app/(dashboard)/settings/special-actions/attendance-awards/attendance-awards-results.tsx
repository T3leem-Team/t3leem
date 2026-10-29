'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Database,
  Download,
  RotateCcw,
  Save,
  SlidersHorizontal,
} from 'lucide-react'

import ExcelJS from 'exceljs'

import { supabase } from '@/lib/supabase'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type AcademicYear = {
  id: string
  name: string
  start_date: string | null
  end_date: string | null
  annual_fee?: number | null
  is_current?: boolean
  is_active?: boolean
}

type Course = {
  id: string
  academic_year_id: string
  name: string
  start_date: string | null
  end_date: string | null
  days: unknown
}

type CourseResult = {
  courseId: string
  percentage: number | null
  numerator: number
  denominator: number
  registered: boolean
}

export type StudentResult = {
  id: string
  studentNumber: string
  personalId: string
  name: string
  grade: string
  teacher: string
  courses: Record<string, CourseResult>
  courseCount: number
  annualPercentage: number | null
  eligible: boolean
}

type CourseFilterState = Record<string, string>

type Filters = {
  name: string
  personalId: string
  grade: string
  teacher: string
  annualPercentage: string
  courseCount: string
  status: string
  courses: CourseFilterState
}

type SavedCourseResult = {
  course_id: string
  course_name: string
  percentage: number | null
  numerator: number
  denominator: number
  registered: boolean
  status: string
}

type SavedAwardResult = {
  id: string
  academic_year_id: string
  student_id: string
  status: 'eligible' | 'not_eligible'
  annual_percentage: number | null
  course_count: number
  minimum_percentage: number
  require_all_courses: boolean
  from_date: string
  to_date: string
  course_results: SavedCourseResult[]
}

type Props = {
  results: StudentResult[]
  selectedCourses: Course[]
  academicYears: AcademicYear[]
  selectedYearId: string
  fromDate: string
  toDate: string
  error: string
  setError: (value: string) => void
  selectedYearName: string
  minimumPercentage: number
  requireAllCourses: boolean
  unregisteredCourse: 'exclude' | 'absence'
  presentCounts: {
    present: boolean
    late: boolean
    excused: boolean
    absent: boolean
  }
}

const columnFilterInputClass =
  'h-8 w-full rounded-md border border-input bg-background px-2 text-xs'

const columnFilterSelectClass =
  'h-8 w-full rounded-md border border-input bg-background px-2 text-xs'

const COURSE_COUNT_COLORS = [
  '#fca5a5',
  '#93c5fd',
  '#fcd34d',
  '#c4b5fd',
  '#67e8f9',
  '#f9a8d4',
  '#fdba74',
  '#a7f3d0',
  '#d8b4fe',
  '#fde68a',
  '#86efac',
  '#f0abfc',
]

const ALL_COURSES_COLOR = '#86efac'

const DEFAULT_VISIBLE_COLUMNS = [
  'sequence',
  'student',
  'grade',
  'courseCount',
  'annualPercentage',
  'status',
] as const

function formatPercentage(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return '—'
  }

  return `${Number(value.toFixed(1))}%`
}

function normalizeLevelName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/أ|إ|آ/g, 'ا')
    .replace(/ى/g, 'ي')
}

function getArabicNumber(value: string) {
  const normalized = normalizeLevelName(value)

  if (
    normalized.includes('الاول') ||
    normalized.includes('1')
  ) {
    return 1
  }

  if (
    normalized.includes('الثاني') ||
    normalized.includes('2')
  ) {
    return 2
  }

  if (
    normalized.includes('الثالث') ||
    normalized.includes('3')
  ) {
    return 3
  }

  if (
    normalized.includes('الرابع') ||
    normalized.includes('4')
  ) {
    return 4
  }

  if (
    normalized.includes('الخامس') ||
    normalized.includes('5')
  ) {
    return 5
  }

  if (
    normalized.includes('السادس') ||
    normalized.includes('6')
  ) {
    return 6
  }

  return 999
}

function getLevelStage(value: string) {
  const normalized = normalizeLevelName(value)

  if (
    normalized.includes('ابتدائي') ||
    normalized.includes('ابتدايي')
  ) {
    return 1
  }

  if (
    normalized.includes('اعدادي') ||
    normalized.includes('متوسط') ||
    normalized.includes('المتوسط')
  ) {
    return 2
  }

  if (
    normalized.includes('ثانوي') ||
    normalized.includes('الثانوي')
  ) {
    return 3
  }

  return 999
}

function compareGrades(a: string, b: string) {
  if (a === '—' && b !== '—') {
    return 1
  }

  if (a !== '—' && b === '—') {
    return -1
  }

  const stageA = getLevelStage(a)
  const stageB = getLevelStage(b)

  if (stageA !== stageB) {
    return stageA - stageB
  }

  const numberA = getArabicNumber(a)
  const numberB = getArabicNumber(b)

  if (numberA !== numberB) {
    return numberA - numberB
  }

  return a.localeCompare(b, 'ar')
}

function getRowColor(
  student: StudentResult,
  selectedCourseCount: number,
) {
  // التلوين للمستحقين فقط
  if (!student.eligible) {
    return undefined
  }

  if (
    selectedCourseCount > 0 &&
    student.courseCount === selectedCourseCount
  ) {
    return ALL_COURSES_COLOR
  }

  if (student.courseCount <= 0) {
    return undefined
  }

  const predefinedColor =
    COURSE_COUNT_COLORS[
      student.courseCount - 1
    ]

  if (predefinedColor) {
    return predefinedColor
  }

  const hue =
    (student.courseCount * 137.508) % 360

  return `hsl(${hue.toFixed(0)} 70% 78%)`
}

function safeFilePart(value: string) {
  return (
    value
      .replace(/[\\/:*?"<>|]/g, '-')
      .trim() || 'السنة'
  )
}

export default function AttendanceAwardsResults({
  results,
  selectedCourses,
  academicYears,
  selectedYearId,
  fromDate,
  toDate,
  setError,
  selectedYearName,
  minimumPercentage,
  requireAllCourses,
}: Props) {
  const router = useRouter()

  const [filters, setFilters] = useState<Filters>({
    name: '',
    personalId: '',
    grade: '',
    teacher: '',
    annualPercentage: '',
    courseCount: '',
    status: '',
    courses: {},
  })

  const [saving, setSaving] = useState(false)
  const [exportingSaved, setExportingSaved] =
    useState(false)

  const [visibleColumns, setVisibleColumns] =
    useState<string[]>([
      ...DEFAULT_VISIBLE_COLUMNS,
    ])

  const [customizeColumnsOpen, setCustomizeColumnsOpen] =
    useState(false)

  const updateFilter = (
    key:
      | 'name'
      | 'personalId'
      | 'grade'
      | 'teacher'
      | 'annualPercentage'
      | 'courseCount'
      | 'status',
    value: string,
  ) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const updateCourseFilter = (
    courseId: string,
    value: string,
  ) => {
    setFilters((current) => ({
      ...current,
      courses: {
        ...current.courses,
        [courseId]: value,
      },
    }))
  }

  const toggleColumn = (columnKey: string) => {
    setVisibleColumns((current) =>
      current.includes(columnKey)
        ? current.filter(
            (key) => key !== columnKey,
          )
        : [...current, columnKey],
    )
  }

  const resetColumns = () => {
    setVisibleColumns([
      ...DEFAULT_VISIBLE_COLUMNS,
    ])
  }

  const isColumnVisible = (columnKey: string) =>
    visibleColumns.includes(columnKey)

  const filteredResults = useMemo(() => {
    return results.filter((student) => {
      const searchName =
        filters.name.trim().toLowerCase()

      const searchPersonalId =
        filters.personalId.trim().toLowerCase()

      const matchesName =
        !searchName ||
        student.name
          .toLowerCase()
          .includes(searchName) ||
        student.studentNumber
          .toLowerCase()
          .includes(searchName)

      const matchesPersonalId =
        !searchPersonalId ||
        student.personalId
          .toLowerCase()
          .includes(searchPersonalId)

      const matchesGrade =
        !filters.grade ||
        student.grade === filters.grade

      const matchesTeacher =
        !filters.teacher ||
        student.teacher === filters.teacher

      const matchesAnnual =
        !filters.annualPercentage ||
        String(
          student.annualPercentage ?? '',
        ).includes(
          filters.annualPercentage,
        )

      const matchesCourseCount =
        !filters.courseCount ||
        student.courseCount ===
          Number(filters.courseCount)

      const matchesStatus =
        !filters.status ||
        (filters.status === 'eligible'
          ? student.eligible
          : !student.eligible)

      const matchesCourses =
        selectedCourses.every((course) => {
          const filterValue =
            filters.courses[course.id] ?? ''

          if (!filterValue) {
            return true
          }

          const percentage =
            student.courses[course.id]?.percentage

          return String(
            percentage ?? '',
          ).includes(filterValue)
        })

      return (
        matchesName &&
        matchesPersonalId &&
        matchesGrade &&
        matchesTeacher &&
        matchesAnnual &&
        matchesCourseCount &&
        matchesStatus &&
        matchesCourses
      )
    })
  }, [
    results,
    filters,
    selectedCourses,
  ])

  const sortedResults = useMemo(() => {
    return [...filteredResults].sort(
      (a, b) => {
        const gradeOrder =
          compareGrades(
            a.grade,
            b.grade,
          )

        if (gradeOrder !== 0) {
          return gradeOrder
        }

        return a.name.localeCompare(
          b.name,
          'ar',
        )
      },
    )
  }, [filteredResults])

  const grades = useMemo(() => {
    return Array.from(
      new Set(
        results
          .map((student) => student.grade)
          .filter(
            (grade) =>
              grade && grade !== '—',
          ),
      ),
    ).sort(compareGrades)
  }, [results])

  const teachers = useMemo(() => {
    return Array.from(
      new Set(
        results
          .flatMap((student) =>
            student.teacher
              .split('،')
              .map((teacher) =>
                teacher.trim(),
              ),
          )
          .filter(
            (teacher) =>
              teacher &&
              teacher !== '—',
          ),
      ),
    ).sort((a, b) =>
      a.localeCompare(b, 'ar'),
    )
  }, [results])

  const courseCountOptions = useMemo(() => {
    const count = selectedCourses.length

    return Array.from(
      { length: count + 1 },
      (_, index) => index,
    )
  }, [selectedCourses.length])

 const downloadExcel = async (
  rows: Record<string, string | number>[],
  fileName: string,
) => {
  if (rows.length === 0) return

  const workbook = new ExcelJS.Workbook()

  workbook.creator = 'T3leem'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet(
    'نتائج الحضور',
    {
      views: [
        {
          rightToLeft: true,
          showGridLines: true,
        },
      ],
    },
  )

  const headers = Object.keys(rows[0])

  worksheet.columns = headers.map((header) => ({
    header,
    key: header,
    width: Math.max(
      14,
      Math.min(header.length + 8, 30),
    ),
  }))

  worksheet.addRows(rows)

  // تنسيق صف العناوين
  const headerRow = worksheet.getRow(1)
  headerRow.height = 30

  headerRow.eachCell((cell) => {
    cell.font = {
      bold: true,
      size: 12,
      color: { argb: 'FFFFFFFF' },
    }

    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF166534' },
    }

    cell.alignment = {
      horizontal: 'right',
      vertical: 'middle',
      wrapText: true,
    }
  })

  // تنسيق بيانات الطلاب
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.eachCell((cell) => {
        cell.alignment = {
          horizontal: 'right',
          vertical: 'middle',
          wrapText: true,
        }
      })
    }
  })

  // ضمان اتجاه الورقة من اليمين إلى اليسار
  worksheet.views = [
    {
      rightToLeft: true,
      showGridLines: true,
    },
  ]

  const buffer = await workbook.xlsx.writeBuffer()

  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = fileName

  document.body.appendChild(link)
  link.click()
  link.remove()
  
  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 1000)

  const exportCurrentToExcel = async () => {
  if (sortedResults.length === 0) {
    setError(
      'لا توجد نتائج مطابقة للفلاتر لتصديرها إلى Excel.',
    )
    return
  }

  try {
    const exportRows = sortedResults.map(
      (student, index) => {
        const row: Record<
          string,
          string | number
        > = {
          التسلسل: index + 1,
          الطالب: student.name,
          'رقم الطالب':
            student.studentNumber || '',
          'الرقم الشخصي':
            student.personalId || '',
          الصف: student.grade || '',
          المعلم: student.teacher || '',
          'عدد الدورات':
            student.courseCount,
        }

        for (const course of selectedCourses) {
          const courseResult =
            student.courses[course.id]

          row[course.name] =
            courseResult?.percentage !== null &&
            courseResult?.percentage !== undefined
              ? Number(
                  courseResult.percentage.toFixed(1),
                )
              : ''

          row[`${course.name} - الحالة`] =
            courseResult?.registered
              ? courseResult.denominator > 0
                ? 'لديه حضور'
                : 'غير حاضر'
              : 'غير مسجل'
        }

        row['النسبة الإجمالية'] =
          student.annualPercentage !== null
            ? Number(
                student.annualPercentage.toFixed(1),
              )
            : ''

        row['الحالة'] = student.eligible
          ? 'مستحق'
          : 'غير مستحق'

        return row
      },
    )

    const yearName =
      academicYears.find(
        (year) => year.id === selectedYearId,
      )?.name || selectedYearName

    const fileName =
      `نتائج-الحضور-فلترة-${safeFilePart(yearName)}-${fromDate || 'بدون-تاريخ'}-${toDate || 'بدون-تاريخ'}.xlsx`

    await downloadExcel(exportRows, fileName)

    setError('')
  } catch (exportError) {
    const message =
      exportError instanceof Error
        ? exportError.message
        : 'حدث خطأ أثناء إنشاء ملف Excel.'

    setError(`تعذر تصدير ملف Excel: ${message}`)
  }
}
  
  const saveFinalResult = async () => {
    if (!selectedYearId) {
      setError('لا توجد سنة دراسية محددة.')
      return
    }

    if (results.length === 0) {
      setError('لا توجد نتائج لحفظها.')
      return
    }

    if (selectedCourses.length === 0) {
      setError(
        'لا توجد دورات محددة لحفظ النتيجة.',
      )
      return
    }

    const confirmed = window.confirm(
      `سيتم استبدال نتيجة التكريم المحفوظة حاليًا للسنة "${selectedYearName}" بالكامل بالنتيجة الحالية.\n\nسيتم حفظ ${results.length} طالبًا، سواء كان مستحقًا أو غير مستحق.\n\nهل تريد المتابعة؟`,
    )

    if (!confirmed) {
      return
    }

    setSaving(true)
    setError('')

    try {
      const {
        error: deleteError,
      } = await supabase
        .from('attendance_award_results')
        .delete()
        .eq(
          'academic_year_id',
          selectedYearId,
        )

      if (deleteError) {
        throw new Error(
          `تعذر حذف النتيجة السابقة: ${deleteError.message}`,
        )
      }

      const rows = results.map((student) => {
        const courseResults =
          selectedCourses.map((course) => {
            const result =
              student.courses[course.id]

            let status = 'غير مسجل'

            if (result?.registered) {
              status =
                result.denominator > 0
                  ? 'لديه حضور'
                  : 'غير حاضر'
            }

            return {
              course_id: course.id,
              course_name: course.name,
              percentage:
                result?.percentage ?? null,
              numerator:
                result?.numerator ?? 0,
              denominator:
                result?.denominator ?? 0,
              registered:
                result?.registered ?? false,
              status,
            }
          })

        return {
          academic_year_id:
            selectedYearId,
          student_id:
            student.id,
          status: student.eligible
            ? 'eligible'
            : 'not_eligible',
          annual_percentage:
            student.annualPercentage,
          course_count:
            student.courseCount,
          minimum_percentage:
            minimumPercentage,
          require_all_courses:
            requireAllCourses,
          from_date: fromDate,
          to_date: toDate,
          course_results:
            courseResults,
        }
      })

      const {
        error: insertError,
      } = await supabase
        .from('attendance_award_results')
        .insert(rows)

      if (insertError) {
        throw new Error(
          `تعذر حفظ النتيجة الجديدة: ${insertError.message}`,
        )
      }

      setError(
        `تم حفظ النتيجة السنوية بنجاح لـ ${rows.length} طالب.`,
      )
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : 'حدث خطأ غير متوقع أثناء حفظ النتيجة.'

      setError(
        `تعذر حفظ النتيجة: ${message}`,
      )
    } finally {
      setSaving(false)
    }
  }

  const exportSavedToExcel = async () => {
    if (!selectedYearId) {
      setError('لا توجد سنة دراسية محددة.')
      return
    }

    setExportingSaved(true)
    setError('')

    try {
      const {
        data,
        error: queryError,
      } = await supabase
        .from('attendance_award_results')
        .select(
          'id, academic_year_id, student_id, status, annual_percentage, course_count, minimum_percentage, require_all_courses, from_date, to_date, course_results',
        )
        .eq(
          'academic_year_id',
          selectedYearId,
        )

      if (queryError) {
        throw new Error(
          `تعذر تحميل النتيجة المحفوظة: ${queryError.message}`,
        )
      }

      const savedResults =
        (data ?? []) as SavedAwardResult[]

      if (savedResults.length === 0) {
        setError(
          'لا توجد نتيجة محفوظة لهذه السنة الدراسية.',
        )
        return
      }

      const studentIds = Array.from(
        new Set(
          savedResults.map(
            (item) => item.student_id,
          ),
        ),
      )

      const {
        data: studentData,
        error: studentError,
      } = await supabase
        .from('students')
        .select(
          'id, student_id, name, personal_id',
        )
        .in('id', studentIds)

      if (studentError) {
        throw new Error(
          `تعذر تحميل بيانات الطلاب: ${studentError.message}`,
        )
      }

      const studentMap = new Map<
        string,
        {
          student_id: string | null
          name: string
          personal_id: string | null
        }
      >(
        (studentData ?? []).map(
          (student) => [
            student.id,
            student,
          ],
        ),
      )

      const exportRows: Record<
        string,
        string | number
      >[] = []

      for (const saved of savedResults) {
        const student =
          studentMap.get(
            saved.student_id,
          )

        const courseResults =
          Array.isArray(
            saved.course_results,
          )
            ? saved.course_results
            : []

        const row: Record<
          string,
          string | number
        > = {
          الطالب:
            student?.name ?? '—',
          'رقم الطالب':
            student?.student_id ?? '',
          'الرقم الشخصي':
            student?.personal_id ?? '',
          'عدد الدورات':
            saved.course_count,
        }

        for (const courseResult of courseResults) {
          const courseName =
            courseResult.course_name ||
            courseResult.course_id

          row[courseName] =
            courseResult.percentage !==
              null &&
            courseResult.percentage !==
              undefined
              ? Number(
                  courseResult.percentage.toFixed(
                    1,
                  ),
                )
              : ''

          row[
            `${courseName} - الحالة`
          ] =
            courseResult.status ||
            (courseResult.registered
              ? 'لديه حضور'
              : 'غير مسجل')
        }

        row['النسبة الإجمالية'] =
          saved.annual_percentage !==
          null
            ? Number(
                saved.annual_percentage.toFixed(
                  1,
                ),
              )
            : ''

        row['الحالة'] =
          saved.status === 'eligible'
            ? 'مستحق'
            : 'غير مستحق'

        row['الحد الأدنى'] =
          saved.minimum_percentage

        row['من تاريخ'] =
          saved.from_date

        row['إلى تاريخ'] =
          saved.to_date

        exportRows.push(row)
      }

      exportRows.sort((a, b) =>
        String(a['الطالب']).localeCompare(
          String(b['الطالب']),
          'ar',
        ),
      )

      const yearName =
        academicYears
          .find(
            (year) =>
              year.id === selectedYearId,
          )
          ?.name || selectedYearName

      const fileName =
        `نتائج-الحضور-المحفوظة-${safeFilePart(
          yearName,
        )}.xlsx`

      await downloadExcel(
        exportRows,
        fileName,
      )

      setError('')
    } catch (exportError) {
      const message =
        exportError instanceof Error
          ? exportError.message
          : 'حدث خطأ أثناء تصدير النتيجة المحفوظة.'

      setError(
        `تعذر تصدير النتيجة المحفوظة: ${message}`,
      )
    } finally {
      setExportingSaved(false)
    }
  }

  const columnOptions = [
    {
      key: 'sequence',
      label: 'التسلسل',
    },
    {
      key: 'student',
      label: 'الطالب',
    },
    {
      key: 'personalId',
      label: 'الرقم الشخصي',
    },
    {
      key: 'grade',
      label: 'الصف',
    },
    {
      key: 'teacher',
      label: 'المعلم',
    },
    {
      key: 'courseCount',
      label: 'عدد الدورات',
    },
    ...selectedCourses.map(
      (course) => ({
        key: `course:${course.id}`,
        label: course.name,
      }),
    ),
    {
      key: 'annualPercentage',
      label: 'النسبة الإجمالية',
    },
    {
      key: 'status',
      label: 'الحالة',
    },
  ]

  return (
    <div className="space-y-4">
      {/* العودة أعلى الصفحة جهة اليمين */}
      <div
        className="flex w-full justify-end"
        dir="ltr"
      >
        <Button
          onClick={() => router.back()}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
          dir="rtl"
        >
          <ArrowRight className="size-4" />
          عودة
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>
                الطلاب ونتائج التكريم
              </CardTitle>

              <p className="mt-1 text-sm text-muted-foreground">
                {selectedYearName} — من {fromDate} إلى{' '}
                {toDate}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="success">
                مستحقون:{' '}
                {
                  sortedResults.filter(
                    (student) =>
                      student.eligible,
                  ).length
                }
              </Badge>

              <Badge variant="neutral">
                إجمالي النتائج:{' '}
                {sortedResults.length}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-3 sm:flex-row sm:flex-wrap">
            <Button
              onClick={saveFinalResult}
              disabled={
                saving ||
                results.length === 0
              }
              className="gap-2"
            >
              <Save className="size-4" />

              {saving
                ? 'جاري حفظ النتيجة...'
                : 'حفظ النتيجة النهائية'}
            </Button>

            <Button
              variant="outline"
              onClick={exportCurrentToExcel}
              disabled={
                sortedResults.length === 0
              }
              className="gap-2 border-green-700 bg-green-700 text-white hover:bg-green-800 hover:text-white"
            >
              <Download className="size-4" />
              Excel — الفلترة الحالية
            </Button>

            <Button
              variant="outline"
              onClick={exportSavedToExcel}
              disabled={exportingSaved}
              className="gap-2 border-green-300 bg-green-100 text-green-800 hover:bg-green-200 hover:text-green-900"
            >
              <Database className="size-4" />

              {exportingSaved
                ? 'جاري تحميل المحفوظ...'
                : 'Excel — النتيجة المحفوظة'}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            زر الحفظ يحفظ جميع النتائج المحسوبة، ولا يتأثر بفلاتر
            الشاشة. أما Excel — الفلترة الحالية فيصدر الصفوف
            الظاهرة حاليًا فقط.
          </p>

          <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/20 p-3 text-xs">
            <span className="font-medium">
              دليل الألوان:
            </span>

            <span className="flex items-center gap-2">
              <span
                className="size-4 rounded border"
                style={{
                  backgroundColor:
                    ALL_COURSES_COLOR,
                }}
              />
              مستحق ومسجل في جميع الدورات
            </span>

            {selectedCourses.length > 1 &&
              Array.from(
                new Set(
                  results
                    .map(
                      (student) =>
                        student.courseCount,
                    )
                    .filter(
                      (count) =>
                        count > 0 &&
                        count <
                          selectedCourses.length,
                    )
                    .sort(
                      (a, b) => a - b,
                    ),
                ),
              ).map((count) => (
                <span
                  key={count}
                  className="flex items-center gap-2"
                >
                  <span
                    className="size-4 rounded border"
                    style={{
                      backgroundColor:
                        getRowColor(
                          {
                            id: '',
                            studentNumber: '',
                            personalId: '',
                            name: '',
                            grade: '',
                            teacher: '',
                            courses: {},
                            courseCount: count,
                            annualPercentage:
                              null,
                            eligible: true,
                          },
                          selectedCourses.length,
                        ),
                    }}
                  />

                  مستحق —
                  {count === 1
                    ? 'دورة واحدة'
                    : count === 2
                      ? 'دورتان'
                      : `${count} دورات`}
                </span>
              ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <CardTitle className="text-base">
                  جدول الطلبة
                </CardTitle>

                <Badge
                  variant="success"
                  className="border-emerald-600 bg-emerald-600 px-3 py-1 text-sm font-bold text-white hover:bg-emerald-600"
                >
                  {sortedResults.length} طالب
                </Badge>
              </div>

              <p className="mt-1 text-xs text-muted-foreground">
                يعرض أول مجموعة من الطلبة، ويمكن تمرير الجدول
                للأسفل لعرض بقية النتائج.
              </p>
            </div>

            <div className="relative">
              <Button
                variant="outline"
                onClick={() =>
                  setCustomizeColumnsOpen(
                    (current) => !current,
                  )
                }
                className="gap-2"
              >
                <SlidersHorizontal className="size-4" />
                تخصيص الأعمدة
              </Button>

              {customizeColumnsOpen && (
                <div className="absolute left-0 top-full z-50 mt-2 w-[280px] rounded-lg border bg-background p-3 shadow-lg">
                  <div className="mb-3 flex items-center justify-between gap-2 border-b pb-3">
                    <span className="text-sm font-semibold">
                      تخصيص الأعمدة
                    </span>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetColumns}
                      className="h-8 gap-1 text-xs"
                    >
                      <RotateCcw className="size-3.5" />
                      افتراضي
                    </Button>
                  </div>

                  <div className="max-h-[360px] space-y-1 overflow-y-auto">
                    {columnOptions.map(
                      (column) => {
                        const checked =
                          isColumnVisible(
                            column.key,
                          )

                        return (
                          <label
                            key={column.key}
                            className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted/50"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                toggleColumn(
                                  column.key,
                                )
                              }
                              className="size-4 accent-primary"
                            />

                            <span className="flex-1">
                              {column.label}
                            </span>
                          </label>
                        )
                      },
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* dir=ltr يضع شريط التمرير العمودي جهة اليمين،
              والجدول نفسه يبقى RTL */}
          <div
            className="max-h-[600px] overflow-auto rounded-lg border"
            dir="ltr"
          >
            <table
              dir="rtl"
              className={[
                'w-full text-sm',
                'min-w-[900px]',
              ].join(' ')}
            >
              <thead>
                <tr>
                  {isColumnVisible(
                    'sequence',
                  ) && (
                    <th className="sticky top-0 z-30 w-16 border-b bg-muted px-2 py-2 text-center font-medium align-top">
                      <div className="flex min-h-[64px] flex-col items-center justify-between gap-2">
                        <span className="whitespace-nowrap">
                          التسلسل
                        </span>

                        <span className="text-[10px] text-muted-foreground">
                          —
                        </span>
                      </div>
                    </th>
                  )}

                  {isColumnVisible(
                    'student',
                  ) && (
                    <th className="sticky top-0 z-30 border-b bg-muted px-2 py-2 text-right font-medium align-top">
                      <div className="flex min-w-[230px] flex-col gap-2">
                        <span>
                          الطالب
                        </span>

                        <input
                          value={filters.name}
                          onChange={(event) =>
                            updateFilter(
                              'name',
                              event.target.value,
                            )
                          }
                          placeholder="بحث..."
                          className={
                            columnFilterInputClass
                          }
                        />
                      </div>
                    </th>
                  )}

                  {isColumnVisible(
                    'personalId',
                  ) && (
                    <th className="sticky top-0 z-30 border-b bg-muted px-2 py-2 text-right font-medium align-top">
                      <div className="flex min-w-[170px] flex-col gap-2">
                        <span>
                          الرقم الشخصي
                        </span>

                        <input
                          value={
                            filters.personalId
                          }
                          onChange={(event) =>
                            updateFilter(
                              'personalId',
                              event.target.value,
                            )
                          }
                          placeholder="بحث..."
                          className={
                            columnFilterInputClass
                          }
                        />
                      </div>
                    </th>
                  )}

                  {isColumnVisible(
                    'grade',
                  ) && (
                    <th className="sticky top-0 z-30 border-b bg-muted px-2 py-2 text-right font-medium align-top">
                      <div className="flex min-w-[160px] flex-col gap-2">
                        <span>
                          الصف
                        </span>

                        <select
                          value={filters.grade}
                          onChange={(event) =>
                            updateFilter(
                              'grade',
                              event.target.value,
                            )
                          }
                          className={
                            columnFilterSelectClass
                          }
                        >
                          <option value="">
                            جميع الصفوف
                          </option>

                          {grades.map(
                            (grade) => (
                              <option
                                key={grade}
                                value={grade}
                              >
                                {grade}
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                    </th>
                  )}

                  {isColumnVisible(
                    'teacher',
                  ) && (
                    <th className="sticky top-0 z-30 border-b bg-muted px-2 py-2 text-right font-medium align-top">
                      <div className="flex min-w-[180px] flex-col gap-2">
                        <span>
                          المعلم
                        </span>

                        <select
                          value={
                            filters.teacher
                          }
                          onChange={(event) =>
                            updateFilter(
                              'teacher',
                              event.target.value,
                            )
                          }
                          className={
                            columnFilterSelectClass
                          }
                        >
                          <option value="">
                            جميع المعلمين
                          </option>

                          {teachers.map(
                            (teacher) => (
                              <option
                                key={teacher}
                                value={teacher}
                              >
                                {teacher}
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                    </th>
                  )}

                  {isColumnVisible(
                    'courseCount',
                  ) && (
                    <th className="sticky top-0 z-30 border-b bg-muted px-2 py-2 text-right font-medium align-top">
                      <div className="flex min-w-[170px] flex-col gap-2">
                        <span>
                          عدد الدورات
                        </span>

                        <select
                          value={
                            filters.courseCount
                          }
                          onChange={(event) =>
                            updateFilter(
                              'courseCount',
                              event.target.value,
                            )
                          }
                          className={
                            columnFilterSelectClass
                          }
                        >
                          <option value="">
                            الكل
                          </option>

                          {courseCountOptions.map(
                            (count) => (
                              <option
                                key={count}
                                value={count}
                              >
                                {count}
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                    </th>
                  )}

                  {selectedCourses.map(
                    (course) => {
                      const columnKey =
                        `course:${course.id}`

                      if (
                        !isColumnVisible(
                          columnKey,
                        )
                      ) {
                        return null
                      }

                      return (
                        <th
                          key={course.id}
                          className="sticky top-0 z-30 border-b bg-muted px-2 py-2 text-right font-medium align-top"
                        >
                          <div className="flex min-w-[160px] flex-col gap-2">
                            <span>
                              {course.name}
                            </span>

                            <input
                              value={
                                filters.courses[
                                  course.id
                                ] ?? ''
                              }
                              onChange={(event) =>
                                updateCourseFilter(
                                  course.id,
                                  event.target.value,
                                )
                              }
                              placeholder="%"
                              className={
                                columnFilterInputClass
                              }
                            />
                          </div>
                        </th>
                      )
                    },
                  )}

                  {isColumnVisible(
                    'annualPercentage',
                  ) && (
                    <th className="sticky top-0 z-30 border-b bg-muted px-2 py-2 text-right font-medium align-top">
                      <div className="flex min-w-[175px] flex-col gap-2">
                        <span>
                          النسبة الإجمالية
                        </span>

                        <input
                          value={
                            filters.annualPercentage
                          }
                          onChange={(event) =>
                            updateFilter(
                              'annualPercentage',
                              event.target.value,
                            )
                          }
                          placeholder="%"
                          className={
                            columnFilterInputClass
                          }
                        />
                      </div>
                    </th>
                  )}

                  {isColumnVisible(
                    'status',
                  ) && (
                    <th className="sticky top-0 z-30 border-b bg-muted px-2 py-2 text-right font-medium align-top">
                      <div className="flex min-w-[170px] flex-col gap-2">
                        <span>
                          الحالة
                        </span>

                        <select
                          value={
                            filters.status
                          }
                          onChange={(event) =>
                            updateFilter(
                              'status',
                              event.target.value,
                            )
                          }
                          className={
                            columnFilterSelectClass
                          }
                        >
                          <option value="">
                            جميع الحالات
                          </option>

                          <option value="eligible">
                            مستحق
                          </option>

                          <option value="not-eligible">
                            غير مستحق
                          </option>
                        </select>
                      </div>
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {sortedResults.length ===
                0 ? (
                  <tr>
                    <td
                      colSpan={
                        Math.max(
                          visibleColumns.length,
                          1,
                        ) +
                        selectedCourses.filter(
                          (course) =>
                            isColumnVisible(
                              `course:${course.id}`,
                            ),
                        ).length
                      }
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      لا توجد نتائج مطابقة للفلاتر.
                    </td>
                  </tr>
                ) : (
                  sortedResults.map(
                    (student, index) => {
                      const rowColor =
                        getRowColor(
                          student,
                          selectedCourses.length,
                        )

                      return (
                        <tr
                          key={student.id}
                          className="border-b last:border-0 transition-colors"
                          style={
                            rowColor
                              ? {
                                  backgroundColor:
                                    rowColor,
                                }
                              : undefined
                          }
                        >
                          {isColumnVisible(
                            'sequence',
                          ) && (
                            <td className="px-4 py-3 text-center font-bold">
                              {index + 1}
                            </td>
                          )}

                          {isColumnVisible(
                            'student',
                          ) && (
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium">
                                  {student.name}
                                </p>

                                {student.studentNumber && (
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    رقم الطالب:{' '}
                                    {
                                      student.studentNumber
                                    }
                                  </p>
                                )}
                              </div>
                            </td>
                          )}

                          {isColumnVisible(
                            'personalId',
                          ) && (
                            <td className="px-4 py-3">
                              {student.personalId ||
                                '—'}
                            </td>
                          )}

                          {isColumnVisible(
                            'grade',
                          ) && (
                            <td className="px-4 py-3">
                              {student.grade}
                            </td>
                          )}

                          {isColumnVisible(
                            'teacher',
                          ) && (
                            <td className="px-4 py-3">
                              {student.teacher}
                            </td>
                          )}

                          {isColumnVisible(
                            'courseCount',
                          ) && (
                            <td className="px-4 py-3">
                              <span className="font-semibold">
                                {
                                  student.courseCount
                                }
                              </span>

                              <span className="mr-1 text-xs text-muted-foreground">
                                /{' '}
                                {
                                  selectedCourses.length
                                }
                              </span>
                            </td>
                          )}

                          {selectedCourses.map(
                            (course) => {
                              const columnKey =
                                `course:${course.id}`

                              if (
                                !isColumnVisible(
                                  columnKey,
                                )
                              ) {
                                return null
                              }

                              const result =
                                student
                                  .courses[
                                  course.id
                                ]

                              return (
                                <td
                                  key={course.id}
                                  className="px-4 py-3"
                                >
                                  <div className="flex flex-col gap-1">
                                    <span>
                                      {formatPercentage(
                                        result?.percentage ??
                                          null,
                                      )}
                                    </span>

                                    {!result?.registered && (
                                      <span className="text-xs text-muted-foreground">
                                        غير مسجل
                                      </span>
                                    )}

                                    {result?.registered &&
                                      result.denominator ===
                                        0 && (
                                        <span className="text-xs text-muted-foreground">
                                          غير حاضر
                                        </span>
                                      )}
                                  </div>
                                </td>
                              )
                            },
                          )}

                          {isColumnVisible(
                            'annualPercentage',
                          ) && (
                            <td className="px-4 py-3 font-semibold">
                              {formatPercentage(
                                student.annualPercentage,
                              )}
                            </td>
                          )}

                          {isColumnVisible(
                            'status',
                          ) && (
                            <td className="px-4 py-3">
                              <Badge
                                variant={
                                  student.eligible
                                    ? 'success'
                                    : 'neutral'
                                }
                              >
                                {student.eligible
                                  ? 'مستحق'
                                  : 'غير مستحق'}
                              </Badge>
                            </td>
                          )}
                        </tr>
                      )
                    },
                  )
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
