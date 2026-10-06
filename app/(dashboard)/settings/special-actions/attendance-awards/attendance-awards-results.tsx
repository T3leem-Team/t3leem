'use client'

import { useMemo, useState } from 'react'
import {
  Download,
  Filter,
  RotateCcw,
} from 'lucide-react'

import * as XLSX from 'xlsx'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

/* =========================================================
   TYPES
========================================================= */

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
}

/* =========================================================
   CONSTANTS
========================================================= */

const inputClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm'

const selectClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm'

/*
  ألوان عدد الدورات.

  الأخضر لا يدخل هنا لأنه محجوز دائمًا
  للطالب المسجل في جميع الدورات المختارة.

  إذا زاد العدد عن هذه القائمة، يتم توليد لون
  جديد تلقائيًا.
*/
const COURSE_COUNT_COLORS = [
  '#fca5a5', // 1 - أحمر فاتح
  '#93c5fd', // 2 - أزرق
  '#fcd34d', // 3 - أصفر
  '#c4b5fd', // 4 - بنفسجي
  '#67e8f9', // 5 - سماوي
  '#f9a8d4', // 6 - وردي
  '#fdba74', // 7 - برتقالي
  '#a7f3d0', // 8 - أخضر مزرق
  '#d8b4fe', // 9 - بنفسجي فاتح
  '#fde68a', // 10 - ذهبي
  '#86efac', // 11 - أخضر مختلف
  '#f0abfc', // 12 - فوشي
]

const ALL_COURSES_COLOR = '#86efac'

/* =========================================================
   HELPERS
========================================================= */

function formatPercentage(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return '—'
  }

  return `${Number(value.toFixed(1))}%`
}

/* =========================================================
   LEVEL ORDER
========================================================= */

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

/* =========================================================
   DYNAMIC ROW COLOR
========================================================= */

/*
  الأخضر دائمًا للطالب المسجل في جميع الدورات المختارة.

  أما الطالب المسجل في عدد أقل من الدورات:
  1 = لون
  2 = لون مختلف
  3 = لون مختلف
  4 = لون مختلف
  ...
  
  وإذا تجاوز العدد الألوان الموجودة في القائمة،
  يتم توليد لون جديد تلقائيًا.
*/
function getRowColor(
  student: StudentResult,
  selectedCourseCount: number,
) {
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

  /*
    توليد لون ديناميكي للأعداد الكبيرة.

    استخدام زاوية ذهبية تقريبية يساعد على إعطاء
    ألوان متباعدة بدل أن تكون متشابهة جدًا.
  */
  const hue =
    (student.courseCount * 137.508) % 360

  return `hsl(${hue.toFixed(0)} 70% 78%)`
}

/* =========================================================
   COMPONENT
========================================================= */

export default function AttendanceAwardsResults({
  results,
  selectedCourses,
  academicYears,
  selectedYearId,
  fromDate,
  toDate,
  setError,
  selectedYearName,
}: Props) {
  /* -------------------------------------------------------
     Filters
  ------------------------------------------------------- */

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

  /* =========================================================
     FILTER HELPERS
  ========================================================= */

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

  const resetFilters = () => {
    setFilters({
      name: '',
      personalId: '',
      grade: '',
      teacher: '',
      annualPercentage: '',
      courseCount: '',
      status: '',
      courses: {},
    })
  }

  /* =========================================================
     FILTERED RESULTS
  ========================================================= */

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

  /* =========================================================
     SORTED RESULTS
  ========================================================= */

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

  /* =========================================================
     FILTER OPTIONS
  ========================================================= */

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

  const hasFilters =
    Boolean(filters.name) ||
    Boolean(filters.personalId) ||
    Boolean(filters.grade) ||
    Boolean(filters.teacher) ||
    Boolean(filters.annualPercentage) ||
    Boolean(filters.courseCount) ||
    Boolean(filters.status) ||
    Object.values(filters.courses).some(Boolean)

  /* =========================================================
     COURSE COUNT OPTIONS
  ========================================================= */

  const courseCountOptions = useMemo(() => {
    const count = selectedCourses.length

    return Array.from(
      { length: count + 1 },
      (_, index) => index,
    )
  }, [selectedCourses.length])

  /* =========================================================
     EXPORT
  ========================================================= */

  const exportToExcel = () => {
    if (sortedResults.length === 0) {
      setError(
        'لا توجد نتائج لتصديرها إلى Excel.',
      )
      return
    }

    try {
      const exportRows =
        sortedResults.map((student) => {
          const row: Record<
            string,
            string | number
          > = {
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
              courseResult?.percentage !==
                null &&
              courseResult?.percentage !==
                undefined
                ? Number(
                    courseResult.percentage.toFixed(
                      1,
                    ),
                  )
                : ''

            row[
              `${course.name} - الحالة`
            ] =
              courseResult?.registered
                ? 'مسجل'
                : 'غير مسجل'
          }

          row['النسبة الإجمالية'] =
            student.annualPercentage !==
            null
              ? Number(
                  student.annualPercentage.toFixed(
                    1,
                  ),
                )
              : ''

          row['الحالة'] = student.eligible
            ? 'مستحق'
            : 'غير مستحق'

          return row
        })

      const worksheet =
        XLSX.utils.json_to_sheet(
          exportRows,
        )

      worksheet['!sheetViews'] = [
        {
          rightToLeft: true,
        },
      ]

      worksheet['!cols'] = [
        { wch: 28 },
        { wch: 16 },
        { wch: 18 },
        { wch: 18 },
        { wch: 24 },
        { wch: 16 },
        ...selectedCourses.flatMap(() => [
          { wch: 16 },
          { wch: 18 },
        ]),
        { wch: 18 },
        { wch: 16 },
      ]

      const workbook =
        XLSX.utils.book_new()

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        'نتائج الحضور',
      )

      const yearName =
        academicYears
          .find(
            (year) =>
              year.id === selectedYearId,
          )
          ?.name
          ?.replace(
            /[\\/:*?"<>|]/g,
            '-',
          )
          .trim() || 'السنة'

      const safeFromDate =
        fromDate || 'بدون-تاريخ'

      const safeToDate =
        toDate || 'بدون-تاريخ'

      const fileName =
        `نتائج-الحضور-${yearName}-${safeFromDate}-${safeToDate}.xlsx`

      XLSX.writeFile(
        workbook,
        fileName,
      )

      setError('')
    } catch (exportError) {
      const message =
        exportError instanceof Error
          ? exportError.message
          : 'حدث خطأ أثناء إنشاء ملف Excel.'

      setError(
        `تعذر تصدير ملف Excel: ${message}`,
      )
    }
  }

  /* =========================================================
     RENDER
  ========================================================= */

  return (
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

            <Button
              variant="outline"
              onClick={exportToExcel}
              className="gap-2"
            >
              <Download className="size-4" />
              تصدير Excel
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* =====================================================
            FILTERS
        ===================================================== */}

        <div className="flex items-center gap-2 text-sm font-medium">
          <Filter className="size-4 text-primary" />
          فلترة النتائج
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <input
            placeholder="فلتر اسم الطالب / رقم الطالب"
            value={filters.name}
            onChange={(event) =>
              updateFilter(
                'name',
                event.target.value,
              )
            }
            className={inputClass}
          />

          <input
            placeholder="فلتر الرقم الشخصي"
            value={filters.personalId}
            onChange={(event) =>
              updateFilter(
                'personalId',
                event.target.value,
              )
            }
            className={inputClass}
          />

          <select
            className={selectClass}
            value={filters.grade}
            onChange={(event) =>
              updateFilter(
                'grade',
                event.target.value,
              )
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

          <select
            className={selectClass}
            value={filters.teacher}
            onChange={(event) =>
              updateFilter(
                'teacher',
                event.target.value,
              )
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

          <input
            placeholder="فلتر النسبة الإجمالية"
            value={filters.annualPercentage}
            onChange={(event) =>
              updateFilter(
                'annualPercentage',
                event.target.value,
              )
            }
            className={inputClass}
          />

          <select
            className={selectClass}
            value={filters.courseCount}
            onChange={(event) =>
              updateFilter(
                'courseCount',
                event.target.value,
              )
            }
          >
            <option value="">
              جميع أعداد الدورات
            </option>

            {courseCountOptions.map(
              (count) => (
                <option
                  key={count}
                  value={count}
                >
                  {count === 0
                    ? '0 دورات'
                    : count === 1
                      ? 'دورة واحدة'
                      : count === 2
                        ? 'دورتان'
                        : `${count} دورات`}
                </option>
              ),
            )}
          </select>

          {selectedCourses.map(
            (course) => (
              <input
                key={course.id}
                placeholder={`فلتر ${course.name}`}
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
                className={inputClass}
              />
            ),
          )}

          <select
            className={selectClass}
            value={filters.status}
            onChange={(event) =>
              updateFilter(
                'status',
                event.target.value,
              )
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

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="gap-2"
          >
            <RotateCcw className="size-4" />
            مسح الفلاتر
          </Button>
        )}

        {/* =====================================================
            COLOR LEGEND
        ===================================================== */}

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
            مسجل في جميع الدورات
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
                          eligible: false,
                        },
                        selectedCourses.length,
                      ),
                  }}
                />

                {count === 1
                  ? 'دورة واحدة'
                  : count === 2
                    ? 'دورتان'
                    : `${count} دورات`}
              </span>
            ))}
        </div>

        {/* =====================================================
            TABLE
        ===================================================== */}

        <div className="overflow-x-auto rounded-lg border">
          <table
            className={[
              'w-full text-sm',
              'min-w-[1250px]',
            ].join(' ')}
          >
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-right font-medium">
                  الطالب
                </th>

                <th className="px-4 py-3 text-right font-medium">
                  الرقم الشخصي
                </th>

                <th className="px-4 py-3 text-right font-medium">
                  الصف
                </th>

                <th className="px-4 py-3 text-right font-medium">
                  المعلم
                </th>

                <th className="px-4 py-3 text-right font-medium">
                  عدد الدورات
                </th>

                {selectedCourses.map(
                  (course) => (
                    <th
                      key={course.id}
                      className="px-4 py-3 text-right font-medium"
                    >
                      {course.name}
                    </th>
                  ),
                )}

                <th className="px-4 py-3 text-right font-medium">
                  النسبة الإجمالية
                </th>

                <th className="px-4 py-3 text-right font-medium">
                  الحالة
                </th>
              </tr>
            </thead>

            <tbody>
              {sortedResults.length ===
              0 ? (
                <tr>
                  <td
                    colSpan={
                      selectedCourses.length +
                      7
                    }
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    لا توجد نتائج مطابقة للفلاتر.
                  </td>
                </tr>
              ) : (
                sortedResults.map(
                  (student) => {
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
                        {/* الطالب */}

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

                        {/* الرقم الشخصي */}

                        <td className="px-4 py-3">
                          {student.personalId ||
                            '—'}
                        </td>

                        {/* الصف */}

                        <td className="px-4 py-3">
                          {student.grade}
                        </td>

                        {/* المعلم */}

                        <td className="px-4 py-3">
                          {student.teacher}
                        </td>

                        {/* عدد الدورات */}

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

                        {/* الدورات */}

                        {selectedCourses.map(
                          (course) => {
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
                                </div>
                              </td>
                            )
                          },
                        )}

                        {/* الإجمالي */}

                        <td className="px-4 py-3 font-semibold">
                          {formatPercentage(
                            student.annualPercentage,
                          )}
                        </td>

                        {/* الحالة */}

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
  )
}
