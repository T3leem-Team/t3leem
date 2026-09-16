'use client'

import { useMemo, useState } from 'react'
import {
  Award,
  Calculator,
  Download,
  Filter,
  RotateCcw,
  Settings2,
} from 'lucide-react'

import { PageHeader } from '@/components/dashboard/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type StudentResult = {
  id: string
  name: string
  grade: string
  teacher: string
  course1: number | null
  course2: number | null
  course3: number | null
  annualPercentage: number
  eligible: boolean
}

const demoStudents: StudentResult[] = [
  {
    id: '1',
    name: 'أحمد محمد',
    grade: 'السادس',
    teacher: 'خالد علي',
    course1: 95,
    course2: 93,
    course3: 96,
    annualPercentage: 94.7,
    eligible: true,
  },
  {
    id: '2',
    name: 'محمد علي',
    grade: 'السادس',
    teacher: 'أحمد حسن',
    course1: 91,
    course2: null,
    course3: 94,
    annualPercentage: 92.5,
    eligible: true,
  },
  {
    id: '3',
    name: 'خالد حسن',
    grade: 'الخامس',
    teacher: 'محمد حسن',
    course1: 88,
    course2: 91,
    course3: 89,
    annualPercentage: 89.3,
    eligible: false,
  },
  {
    id: '4',
    name: 'عبدالله أحمد',
    grade: 'السابع',
    teacher: 'خالد علي',
    course1: 98,
    course2: 97,
    course3: 99,
    annualPercentage: 98.0,
    eligible: true,
  },
]

export default function Page() {
  const [fromDate, setFromDate] = useState('2026-09-01')
  const [toDate, setToDate] = useState('2026-11-30')

  const [unregisteredCourse, setUnregisteredCourse] =
    useState<'exclude' | 'absence'>('exclude')

  const [presentCounts, setPresentCounts] = useState({
    present: true,
    late: true,
    excused: true,
    absent: false,
  })

  const [cancelledCounts, setCancelledCounts] =
    useState<'exclude' | 'include'>('exclude')

  const [minimumPercentage, setMinimumPercentage] =
    useState('90')

  const [requireAllCourses, setRequireAllCourses] =
    useState(false)

  const [results, setResults] = useState<StudentResult[]>([])
  const [hasCalculated, setHasCalculated] = useState(false)

  const [filters, setFilters] = useState({
    name: '',
    grade: '',
    teacher: '',
    course1: '',
    course2: '',
    course3: '',
    annualPercentage: '',
    status: '',
  })

  const updateFilter = (
    key: keyof typeof filters,
    value: string,
  ) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const resetFilters = () => {
    setFilters({
      name: '',
      grade: '',
      teacher: '',
      course1: '',
      course2: '',
      course3: '',
      annualPercentage: '',
      status: '',
    })
  }

  const calculateResults = () => {
    /*
     * حالياً نستخدم بيانات تجريبية.
     *
     * لاحقاً هنا يتم:
     * 1. جلب جلسات الحضور من الأرشيف حسب الفترة.
     * 2. تطبيق سياسة الاحتساب.
     * 3. حساب نسبة كل دورة.
     * 4. حساب النسبة الإجمالية بشكل موزون.
     * 5. تطبيق شروط التكريم.
     */

    const minimum = Number(minimumPercentage) || 0

    const calculated = demoStudents.map((student) => ({
      ...student,
      eligible:
        student.annualPercentage >= minimum &&
        (!requireAllCourses ||
          (student.course1 !== null &&
            student.course2 !== null &&
            student.course3 !== null)),
    }))

    setResults(calculated)
    setHasCalculated(true)
  }

  const filteredResults = useMemo(() => {
    return results.filter((student) => {
      const matchesName =
        !filters.name ||
        student.name
          .toLowerCase()
          .includes(filters.name.toLowerCase())

      const matchesGrade =
        !filters.grade || student.grade === filters.grade

      const matchesTeacher =
        !filters.teacher || student.teacher === filters.teacher

      const matchesCourse1 =
        !filters.course1 ||
        String(student.course1 ?? '')
          .includes(filters.course1)

      const matchesCourse2 =
        !filters.course2 ||
        String(student.course2 ?? '')
          .includes(filters.course2)

      const matchesCourse3 =
        !filters.course3 ||
        String(student.course3 ?? '')
          .includes(filters.course3)

      const matchesAnnual =
        !filters.annualPercentage ||
        String(student.annualPercentage)
          .includes(filters.annualPercentage)

      const matchesStatus =
        !filters.status ||
        (filters.status === 'eligible'
          ? student.eligible
          : !student.eligible)

      return (
        matchesName &&
        matchesGrade &&
        matchesTeacher &&
        matchesCourse1 &&
        matchesCourse2 &&
        matchesCourse3 &&
        matchesAnnual &&
        matchesStatus
      )
    })
  }, [results, filters])

  const hasFilters = Object.values(filters).some(Boolean)

  const exportToExcel = () => {
    /*
     * لاحقاً نربطه بمكتبة xlsx الموجودة في المشروع.
     * حالياً يتم تجهيز البيانات المفلترة فقط.
     */

    const rows = filteredResults.map((student) => ({
      الطالب: student.name,
      الصف: student.grade,
      المعلم: student.teacher,
      'الدورة الأولى':
        student.course1 === null ? '' : `${student.course1}%`,
      'الدورة الثانية':
        student.course2 === null ? '' : `${student.course2}%`,
      'الدورة الثالثة':
        student.course3 === null ? '' : `${student.course3}%`,
      'النسبة الإجمالية': `${student.annualPercentage}%`,
      الحالة: student.eligible ? 'مستحق' : 'غير مستحق',
    }))

    console.log('Excel export:', rows)

    alert('تم تجهيز بيانات Excel التجريبية. سيتم ربط التصدير الفعلي لاحقاً.')
  }

  const grades = Array.from(
    new Set(results.map((student) => student.grade)),
  )

  const teachers = Array.from(
    new Set(results.map((student) => student.teacher)),
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="احتساب نسب الحضور والتكريم"
        description="تحديد فترة الاحتساب وسياسة النسب وشروط التكريم ثم تجهيز قائمة الطلاب المستحقين."
      />

      {/* الفترة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="size-5 text-primary" />
            تحديد فترة الاحتساب
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>السنة الدراسية</Label>

              <Select defaultValue="2026-2027">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="2026-2027">
                    2026 / 2027
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="from-date">من تاريخ</Label>

              <Input
                id="from-date"
                type="date"
                value={fromDate}
                onChange={(event) =>
                  setFromDate(event.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="to-date">إلى تاريخ</Label>

              <Input
                id="to-date"
                type="date"
                value={toDate}
                onChange={(event) =>
                  setToDate(event.target.value)
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* سياسة الاحتساب */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="size-5 text-primary" />
            سياسة احتساب النسبة
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>
              الطالب غير المسجل في دورة
            </Label>

            <Select
              value={unregisteredCourse}
              onValueChange={(value) =>
                setUnregisteredCourse(
                  value as 'exclude' | 'absence',
                )
              }
            >
              <SelectTrigger className="max-w-md">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="exclude">
                  استبعاد الدورة من الحساب
                </SelectItem>

                <SelectItem value="absence">
                  احتسابها كغياب
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>حالات الحضور المحتسبة</Label>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['present', 'حاضر'],
                ['late', 'متأخر'],
                ['excused', 'مستأذن'],
                ['absent', 'غائب'],
              ].map(([key, label]) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border p-3"
                >
                  <input
                    type="checkbox"
                    checked={
                      presentCounts[
                        key as keyof typeof presentCounts
                      ]
                    }
                    onChange={(event) =>
                      setPresentCounts((current) => ({
                        ...current,
                        [key]: event.target.checked,
                      }))
                    }
                    className="size-4"
                  />

                  <span className="text-sm">
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>الدروس أو الأيام الملغاة</Label>

            <Select
              value={cancelledCounts}
              onValueChange={(value) =>
                setCancelledCounts(
                  value as 'exclude' | 'include',
                )
              }
            >
              <SelectTrigger className="max-w-md">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="exclude">
                  تستبعد من الحساب
                </SelectItem>

                <SelectItem value="include">
                  تدخل في الحساب
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* شروط التكريم */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="size-5 text-primary" />
            شروط التكريم
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="minimum-percentage">
                الحد الأدنى لنسبة الحضور
              </Label>

              <div className="relative max-w-md">
                <Input
                  id="minimum-percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={minimumPercentage}
                  onChange={(event) =>
                    setMinimumPercentage(event.target.value)
                  }
                  className="pl-10"
                />

                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  %
                </span>
              </div>
            </div>

            <div className="flex items-end">
              <label className="flex w-full max-w-md cursor-pointer items-center gap-3 rounded-lg border p-3">
                <input
                  type="checkbox"
                  checked={requireAllCourses}
                  onChange={(event) =>
                    setRequireAllCourses(
                      event.target.checked,
                    )
                  }
                  className="size-4"
                />

                <span className="text-sm">
                  يشترط تسجيل الطالب في جميع الدورات
                </span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* احتساب */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">
              جاهز لاحتساب النتائج
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              سيتم تطبيق الفترة والسياسات والشروط المحددة
              أعلاه.
            </p>
          </div>

          <Button
            onClick={calculateResults}
            className="gap-2"
          >
            <Calculator className="size-4" />
            احتساب النتائج
          </Button>
        </CardContent>
      </Card>

      {/* النتائج */}
      {hasCalculated && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>
                  الطلاب ونتائج التكريم
                </CardTitle>

                <p className="mt-1 text-sm text-muted-foreground">
                  النتائج المحتسبة حسب السياسة المحددة.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="success">
                  مستحقون:{' '}
                  {
                    filteredResults.filter(
                      (student) => student.eligible,
                    ).length
                  }
                </Badge>

                <Badge variant="neutral">
                  إجمالي النتائج:{' '}
                  {filteredResults.length}
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

          <CardContent className="space-y-4">
            {/* فلاتر الأعمدة */}
            <div className="flex items-center gap-2 text-sm font-medium">
              <Filter className="size-4 text-primary" />
              فلترة النتائج
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <Input
                placeholder="فلتر الطالب"
                value={filters.name}
                onChange={(event) =>
                  updateFilter('name', event.target.value)
                }
              />

              <Select
                value={filters.grade || 'all'}
                onValueChange={(value) =>
                  updateFilter(
                    'grade',
                    value === 'all' ? '' : value,
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="فلتر الصف" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">
                    جميع الصفوف
                  </SelectItem>

                  {grades.map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.teacher || 'all'}
                onValueChange={(value) =>
                  updateFilter(
                    'teacher',
                    value === 'all' ? '' : value,
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="فلتر المعلم" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">
                    جميع المعلمين
                  </SelectItem>

                  {teachers.map((teacher) => (
                    <SelectItem
                      key={teacher}
                      value={teacher}
                    >
                      {teacher}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                placeholder="فلتر الدورة الأولى"
                value={filters.course1}
                onChange={(event) =>
                  updateFilter(
                    'course1',
                    event.target.value,
                  )
                }
              />

              <Input
                placeholder="فلتر الدورة الثانية"
                value={filters.course2}
                onChange={(event) =>
                  updateFilter(
                    'course2',
                    event.target.value,
                  )
                }
              />

              <Input
                placeholder="فلتر الدورة الثالثة"
                value={filters.course3}
                onChange={(event) =>
                  updateFilter(
                    'course3',
                    event.target.value,
                  )
                }
              />

              <Input
                placeholder="فلتر النسبة الإجمالية"
                value={filters.annualPercentage}
                onChange={(event) =>
                  updateFilter(
                    'annualPercentage',
                    event.target.value,
                  )
                }
              />

              <Select
                value={filters.status || 'all'}
                onValueChange={(value) =>
                  updateFilter(
                    'status',
                    value === 'all' ? '' : value,
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="فلتر الحالة" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">
                    جميع الحالات
                  </SelectItem>

                  <SelectItem value="eligible">
                    مستحق
                  </SelectItem>

                  <SelectItem value="not-eligible">
                    غير مستحق
                  </SelectItem>
                </SelectContent>
              </Select>
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

            {/* الجدول */}
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[1000px] text-sm">
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
                      الدورة الأولى
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      الدورة الثانية
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      الدورة الثالثة
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      النسبة الإجمالية
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      الحالة
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredResults.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-10 text-center text-muted-foreground"
                      >
                        لا توجد نتائج مطابقة للفلاتر.
                      </td>
                    </tr>
                  ) : (
                    filteredResults.map((student) => (
                      <tr
                        key={student.id}
                        className="border-b last:border-0"
                      >
                        <td className="px-4 py-3 font-medium">
                          {student.name}
                        </td>

                        <td className="px-4 py-3">
                          {student.grade}
                        </td>

                        <td className="px-4 py-3">
                          {student.teacher}
                        </td>

                        <td className="px-4 py-3">
                          {student.course1 === null
                            ? '—'
                            : `${student.course1}%`}
                        </td>

                        <td className="px-4 py-3">
                          {student.course2 === null
                            ? '—'
                            : `${student.course2}%`}
                        </td>

                        <td className="px-4 py-3">
                          {student.course3 === null
                            ? '—'
                            : `${student.course3}%`}
                        </td>

                        <td className="px-4 py-3 font-semibold">
                          {student.annualPercentage}%
                        </td>

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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
