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

export type AcademicYear = {
  id: string
  name: string
  start_date: string | null
  end_date: string | null
  annual_fee?: number | null
  is_current?: boolean
  is_active?: boolean
}

export type Course = {
  id: string
  academic_year_id: string
  name: string
  start_date: string | null
  end_date: string | null
  days: unknown
}

export type Student = {
  id: string
  student_id: string | null
  name: string
  personal_id: string | null
  phone?: string | null
  whatsapp?: string | null
}

export type Enrollment = {
  id: string
  student_id: string
  academic_year_id: string
  level_id: string | null
  class_id: string | null
  status: string | null
}

export type Level = {
  id: string
  name: string
}

export type Teacher = {
  id: string
  name: string
}

export type TeacherAssignment = {
  id: string
  course_id: string
  teacher_id: string
  student_id: string
}

export type AttendanceStatus = {
  id: string
  name: string
  is_active: boolean
  sort_order: number
}

export type AttendanceRow = {
  id: string
  student_id: string
  enrollment_id: string | null
  attendance_date: string
  status_id: string
  note: string | null
  course_id: string
}

export type CourseResult = {
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

  /*
   * عدد الدورات المسجل فيها الطالب
   * لا يدخل في احتساب النسبة.
   */
  courseCount: number

  annualPercentage: number | null
  eligible: boolean
}

type CourseFilterState = Record<
  string,
  string
>

type Filters = {
  name: string
  grade: string
  teacher: string
  courseCount: string
  annualPercentage: string
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
  onError: (message: string) => void
}

/* =========================================================
   HELPERS
========================================================= */

const inputClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm'

const selectClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm'

function normalizeText(value: string) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/أ|إ|آ/g, 'ا')
}

function getArabicNumberOrder(value: string) {
  const text = normalizeText(value)

  if (
    text.includes('الاول') ||
    text.includes('اول') ||
    text === '1' ||
    text.startsWith('1 ')
  ) {
    return 1
  }

  if (
    text.includes('الثاني') ||
    text.includes('ثاني') ||
    text === '2' ||
    text.startsWith('2 ')
  ) {
    return 2
  }

  if (
    text.includes('الثالث') ||
    text.includes('ثالث') ||
    text === '3' ||
    text.startsWith('3 ')
  ) {
    return 3
  }

  if (
    text.includes('الرابع') ||
    text.includes('رابع') ||
    text === '4' ||
    text.startsWith('4 ')
  ) {
    return 4
  }

  if (
    text.includes('الخامس') ||
    text.includes('خامس') ||
    text === '5' ||
    text.startsWith('5 ')
  ) {
    return 5
  }

  if (
    text.includes('السادس') ||
    text.includes('سادس') ||
    text === '6' ||
    text.startsWith('6 ')
  ) {
    return 6
  }

  return 99
}

function getLevelCategoryOrder(value: string) {
  const text = normalizeText(value)

  if (
    text.includes('ابتدائي') ||
    text.includes('ابتداي')
  ) {
    return 1
  }

  if (
    text.includes('اعدادي') ||
    text.includes('متوسط')
  ) {
    return 2
  }

  if (text.includes('ثانوي')) {
    return 3
  }

  return 99
}

function compareLevels(
  a: string,
  b: string,
) {
  if (a === b) {
    return 0
  }

  const categoryA =
    getLevelCategoryOrder(a)

  const categoryB =
    getLevelCategoryOrder(b)

  if (categoryA !== categoryB) {
    return categoryA - categoryB
  }

  const numberA =
    getArabicNumberOrder(a)

  const numberB =
    getArabicNumberOrder(b)

  if (numberA !== numberB) {
    return numberA - numberB
  }

  return a.localeCompare(b, 'ar')
}

function formatPercentage(
  value: number | null,
) {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return '—'
  }

  return `${Number(
    value.toFixed(1),
  )}%`
}

function getCourseCountLabel(
  count: number,
) {
  if (count === 0) {
    return 'لا توجد دورات'
  }

  if (count === 1) {
    return 'دورة واحدة'
  }

  if (count === 2) {
    return 'دورتان'
  }

  return `${count} دورات`
}

/* =========================================================
   ROW COLOR
========================================================= */

function getRowClass(
  student: StudentResult,
  selectedCourseCount: number,
) {
  /*
   * الأولوية:
   * 1. جميع الدورات المختارة
   * 2. دورتان
   * 3. دورة واحدة
   */

  if (
    selectedCourseCount > 0 &&
    student.courseCount ===
      selectedCourseCount
  ) {
    return [
      'bg-emerald-50/70',
      'dark:bg-emerald-950/20',
    ].join(' ')
  }

  if (student.courseCount === 2) {
    return [
      'bg-blue-50/70',
      'dark:bg-blue-950/20',
    ].join(' ')
  }

  if (student.courseCount === 1) {
    return [
      'bg-amber-50/70',
      'dark:bg-amber-950/20',
    ].join(' ')
  }

  return ''
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
  onError,
}: Props) {
  /* -------------------------------------------------------
     Filters
  ------------------------------------------------------- */

  const [filters, setFilters] =
    useState<Filters>({
      name: '',
      grade: '',
      teacher: '',
      courseCount: '',
      annualPercentage: '',
      status: '',
      courses: {},
    })

  /* =========================================================
     FILTER HELPERS
  ========================================================= */

  const updateFilter = (
    key:
      | 'name'
      | 'grade'
      | 'teacher'
      | 'courseCount'
      | 'annualPercentage'
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
      grade: '',
      teacher: '',
      courseCount: '',
      annualPercentage: '',
      status: '',
      courses: {},
    })
  }

  /* =========================================================
     FILTER OPTIONS
  ========================================================= */

  const grades = useMemo(() => {
    return Array.from(
      new Set(
        results
          .map(
            (student) =>
              student.grade,
          )
          .filter(
            (grade) =>
              grade && grade !== '—',
          ),
      ),
    ).sort(compareLevels)
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

  /* =========================================================
     FILTERED RESULTS
  ========================================================= */

  const filteredResults =
    useMemo(() => {
      return results.filter(
        (student) => {
          const searchName =
            filters.name
              .trim()
              .toLowerCase()

          const matchesName =
            !searchName ||
            student.name
              .toLowerCase()
              .includes(searchName) ||
            student.studentNumber
              .toLowerCase()
              .includes(searchName) ||
            student.personalId
              .toLowerCase()
              .includes(searchName)

          const matchesGrade =
            !filters.grade ||
            student.grade ===
              filters.grade

          const matchesTeacher =
            !filters.teacher ||
            student.teacher ===
              filters.teacher

          const matchesCourseCount =
            !filters.courseCount ||
            student.courseCount ===
              Number(
                filters.courseCount,
              )

          const matchesAnnual =
            !filters.annualPercentage ||
            String(
              student.annualPercentage ??
                '',
            ).includes(
              filters.annualPercentage,
            )

          const matchesStatus =
            !filters.status ||
            (filters.status ===
            'eligible'
              ? student.eligible
              : !student.eligible)

          const matchesCourses =
            selectedCourses.every(
              (course) => {
                const filterValue =
                  filters.courses[
                    course.id
                  ] ?? ''

                if (!filterValue) {
                  return true
                }

                const percentage =
                  student.courses[
                    course.id
                  ]?.percentage

                return String(
                  percentage ?? '',
                ).includes(
                  filterValue,
                )
              },
            )

          return (
            matchesName &&
            matchesGrade &&
            matchesTeacher &&
            matchesCourseCount &&
            matchesAnnual &&
            matchesStatus &&
            matchesCourses
          )
        },
      )
    }, [
      results,
      filters,
      selectedCourses,
    ])

  /* =========================================================
     HAS FILTERS
  ========================================================= */

  const hasFilters =
    Boolean(filters.name) ||
    Boolean(filters.grade) ||
    Boolean(filters.teacher) ||
    Boolean(filters.courseCount) ||
    Boolean(filters.annualPercentage) ||
    Boolean(filters.status) ||
    Object.values(
      filters.courses,
    ).some(Boolean)

  /* =========================================================
     EXPORT TO EXCEL
  ========================================================= */

  const exportToExcel = () => {
    if (
      filteredResults.length === 0
    ) {
      onError(
        'لا توجد نتائج لتصديرها إلى Excel.',
      )
      return
    }

    try {
      const exportRows =
        filteredResults.map(
          (student) => {
            const row: Record<
              string,
              string | number
            > = {
              الطالب: student.name,
              'رقم الطالب':
                student.studentNumber ||
                '',
              الهوية:
                student.personalId ||
                '',
              الصف:
                student.grade || '',
              المعلم:
                student.teacher || '',

              'عدد الدورات':
                student.courseCount,
            }

            for (const course of selectedCourses) {
              const courseResult =
                student.courses[
                  course.id
                ]

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

            row['الحالة'] =
              student.eligible
                ? 'مستحق'
                : 'غير مستحق'

            return row
          },
        )

      const worksheet =
        XLSX.utils.json_to_sheet(
          exportRows,
        )

      /* -----------------------------------------------------
         Excel RTL
      ----------------------------------------------------- */

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
        ...selectedCourses.flatMap(
          () => [
            { wch: 16 },
            { wch: 18 },
          ],
        ),
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
              year.id ===
              selectedYearId,
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

      onError('')
    } catch (exportError) {
      const message =
        exportError instanceof Error
          ? exportError.message
          : 'حدث خطأ أثناء إنشاء ملف Excel.'

      onError(
        `تعذر تصدير ملف Excel: ${message}`,
      )
    }
  }

  /* =========================================================
     SELECTED YEAR
  ========================================================= */

  const selectedYear =
    academicYears.find(
      (year) =>
        year.id === selectedYearId,
    )

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
              {selectedYear?.name ??
                'السنة الدراسية'}{' '}
              — من {fromDate} إلى{' '}
              {toDate}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="success">
              مستحقون:{' '}
              {
                filteredResults.filter(
                  (student) =>
                    student.eligible,
                ).length
              }
            </Badge>

            <Badge variant="neutral">
              إجمالي النتائج:{' '}
              {filteredResults.length}
            </Badge>

            <Button
              variant="outline"
              onClick={
                exportToExcel
              }
              className="gap-2"
            >
              <Download className="size-4" />
              تصدير Excel
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ===================================================
            FILTER HEADER
        =================================================== */}

        <div className="flex items-center gap-2 text-sm font-medium">
          <Filter className="size-4 text-primary" />
          فلترة النتائج
        </div>

        {/* ===================================================
            FILTERS
        =================================================== */}

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <input
            placeholder="فلتر الطالب / الرقم / الهوية"
            value={filters.name}
            onChange={(event) =>
              updateFilter(
                'name',
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

            {grades.map((grade) => (
              <option
                key={grade}
                value={grade}
              >
                {grade}
              </option>
            ))}
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

          {/* =================================================
              COURSE COUNT FILTER
          ================================================= */}

          <select
            className={selectClass}
            value={
              filters.courseCount
            }
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

            {Array.from(
              {
                length:
                  selectedCourses.length +
                  1,
              },
              (_, index) => (
                <option
                  key={index}
                  value={index}
                >
                  {getCourseCountLabel(
                    index,
                  )}
                </option>
              ),
            )}
          </select>

          <input
            placeholder="فلتر النسبة الإجمالية"
            value={
              filters.annualPercentage
            }
            onChange={(event) =>
              updateFilter(
                'annualPercentage',
                event.target.value,
              )
            }
            className={inputClass}
          />

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
                    event.target
                      .value,
                  )
                }
                className={
                  inputClass
                }
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

        {/* ===================================================
            LEGEND
        =================================================== */}

        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/20 p-3 text-xs">
          <span className="font-medium">
            ألوان عدد الدورات:
          </span>

          <span className="flex items-center gap-2">
            <span className="size-3 rounded-sm border bg-emerald-50 dark:bg-emerald-950/20" />
            جميع الدورات المختارة
          </span>

          <span className="flex items-center gap-2">
            <span className="size-3 rounded-sm border bg-blue-50 dark:bg-blue-950/20" />
            دورتان
          </span>

          <span className="flex items-center gap-2">
            <span className="size-3 rounded-sm border bg-amber-50 dark:bg-amber-950/20" />
            دورة واحدة
          </span>
        </div>

        {/* ===================================================
            RESET FILTERS
        =================================================== */}

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={
              resetFilters
            }
            className="gap-2"
          >
            <RotateCcw className="size-4" />
            مسح الفلاتر
          </Button>
        )}

        {/* ===================================================
            TABLE
        =================================================== */}

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
                      key={
                        course.id
                      }
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
              {filteredResults.length ===
              0 ? (
                <tr>
                  <td
                    colSpan={
                      selectedCourses.length +
                      6
                    }
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    لا توجد نتائج مطابقة للفلاتر.
                  </td>
                </tr>
              ) : (
                filteredResults.map(
                  (student) => (
                    <tr
                      key={
                        student.id
                      }
                      className={[
                        'border-b last:border-0',
                        getRowClass(
                          student,
                          selectedCourses.length,
                        ),
                      ].join(' ')}
                    >
                      {/* =====================================
                          STUDENT
                      ====================================== */}

                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">
                            {
                              student.name
                            }
                          </p>

                          {student.studentNumber && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              رقم الطالب:{' '}
                              {
                                student.studentNumber
                              }
                            </p>
                          )}

                          {student.personalId && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              الهوية:{' '}
                              {
                                student.personalId
                              }
                            </p>
                          )}
                        </div>
                      </td>

                      {/* =====================================
                          GRADE
                      ====================================== */}

                      <td className="px-4 py-3">
                        {
                          student.grade
                        }
                      </td>

                      {/* =====================================
                          TEACHER
                      ====================================== */}

                      <td className="px-4 py-3">
                        {
                          student.teacher
                        }
                      </td>

                      {/* =====================================
                          COURSE COUNT
                      ====================================== */}

                      <td className="px-4 py-3">
                        <span className="font-semibold">
                          {
                            student.courseCount
                          }
                        </span>

                        <span className="mr-1 text-xs text-muted-foreground">
                          من{' '}
                          {
                            selectedCourses.length
                          }
                        </span>
                      </td>

                      {/* =====================================
                          COURSES
                      ====================================== */}

                      {selectedCourses.map(
                        (course) => {
                          const result =
                            student
                              .courses[
                              course.id
                            ]

                          return (
                            <td
                              key={
                                course.id
                              }
                              className="px-4 py-3"
                            >
                              <div className="flex flex-col gap-1">
                                <span>
                                  {formatPercentage(
                                    result
                                      ?.percentage ??
                                      null,
                                  )}
                                </span>

                                {!result
                                  ?.registered && (
                                  <span className="text-xs text-muted-foreground">
                                    غير مسجل
                                  </span>
                                )}
                              </div>
                            </td>
                          )
                        },
                      )}

                      {/* =====================================
                          TOTAL
                      ====================================== */}

                      <td className="px-4 py-3 font-semibold">
                        {formatPercentage(
                          student.annualPercentage,
                        )}
                      </td>

                      {/* =====================================
                          STATUS
                      ====================================== */}

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
                  ),
                )
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
