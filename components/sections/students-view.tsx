'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Search,
  UserPlus,
  Filter,
  X,
  Pencil,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

import { PageHeader } from '@/components/dashboard/page-header'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type Filters = {
  name: string
  personalId: string
  grade: string
  phone: string
  whatsapp: string
  paymentStatus: string
  notes: string
  attendance: string
}

type AcademicLevel = {
  id: string
  name: string
  sort_order: number
}

const emptyFilters: Filters = {
  name: '',
  personalId: '',
  grade: '',
  phone: '',
  whatsapp: '',
  paymentStatus: '',
  notes: '',
  attendance: '',
}

const studentColumns = [
  { key: 'name', label: 'اسم الطالب' },
  { key: 'personalId', label: 'الرقم الشخصي' },
  { key: 'grade', label: 'الصف الأكاديمي' },
  { key: 'contact', label: 'التواصل' },
  { key: 'paymentStatus', label: 'الدفع' },
  { key: 'notes', label: 'ملاحظات' },
  { key: 'attendance', label: 'الحضور' },
] as const

export function StudentsView() {
  const router = useRouter()

  const [supabaseStatus, setSupabaseStatus] = useState(
    'جاري الاختبار...'
  )

  const [academicLevels, setAcademicLevels] = useState<
    AcademicLevel[]
  >([])

  const [currentAcademicYearId, setCurrentAcademicYearId] =
    useState<string | null>(null)

  const [currentAcademicYearName, setCurrentAcademicYearName] =
    useState('')

  const [currentAnnualFee, setCurrentAnnualFee] =
    useState(0)

  const [search, setSearch] = useState('')

  const [filters, setFilters] =
    useState<Filters>(emptyFilters)

  const [visibleColumns, setVisibleColumns] = useState<
    Record<(typeof studentColumns)[number]['key'], boolean>
  >({
    name: true,
    personalId: true,
    grade: true,
    contact: true,
    paymentStatus: true,
    notes: true,
    attendance: true,
  })

  const [studentList, setStudentList] = useState<any[]>([])

  const [isAddStudentOpen, setIsAddStudentOpen] =
    useState(false)

  const [selectedStudentId, setSelectedStudentId] =
    useState('')

  const [editingStudentId, setEditingStudentId] =
    useState<string | null>(null)

  const [notesStudent, setNotesStudent] =
    useState<any | null>(null)

  useEffect(() => {
    const loadData = async () => {
      setSupabaseStatus('جاري تحميل بيانات النظام...')

      const { data: currentYear, error: yearError } =
        await supabase
          .from('academic_years')
          .select('id, name, annual_fee')
          .eq('is_current', true)
          .eq('is_active', true)
          .maybeSingle()

      if (yearError) {
        setSupabaseStatus(
          `خطأ في تحميل السنة الدراسية: ${yearError.message}`
        )
        return
      }

      if (!currentYear) {
        setSupabaseStatus(
          'لا توجد سنة دراسية حالية مفعلة'
        )
        return
      }

      const annualFee = Number(
        currentYear.annual_fee ?? 0
      )

      setCurrentAcademicYearId(currentYear.id)
      setCurrentAcademicYearName(currentYear.name ?? '')
      setCurrentAnnualFee(annualFee)

      const { data: levels, error: levelsError } =
        await supabase
          .from('levels')
          .select('id, name, sort_order')
          .eq('is_active', true)
          .order('sort_order', {
            ascending: true,
          })

      if (levelsError) {
        setSupabaseStatus(
          `خطأ في تحميل الصفوف الأكاديمية: ${levelsError.message}`
        )
        return
      }

      setAcademicLevels(levels ?? [])

      const {
        data: enrollmentRows,
        error: enrollmentsError,
      } = await supabase
        .from('enrollments')
        .select(
          'student_id, level_id, academic_year_id, status'
        )
        .eq('academic_year_id', currentYear.id)

      if (enrollmentsError) {
        setSupabaseStatus(
          `خطأ في تحميل ربط الصفوف: ${enrollmentsError.message}`
        )
        return
      }

      const { data: studentsData, error: studentsError } =
        await supabase
          .from('students')
          .select(
            'id, student_id, name, personal_id, phone, whatsapp, notes, health_notes, status, fee_exempt'
          )
          .order('created_at', {
            ascending: false,
          })

      if (studentsError) {
        setSupabaseStatus(
          `خطأ في تحميل الطلاب: ${studentsError.message}`
        )
        return
      }

      const {
        data: paymentsData,
        error: paymentsError,
      } = await supabase
        .from('payments')
        .select(
          'student_id, academic_year_id, amount'
        )
        .eq(
          'academic_year_id',
          currentYear.id
        )

      if (paymentsError) {
        setSupabaseStatus(
          `خطأ في تحميل الدفعات: ${paymentsError.message}`
        )
        return
      }

      const levelMap = new Map(
        (levels ?? []).map((level) => [
          level.id,
          level.name,
        ])
      )

      const enrollmentMap = new Map(
        (enrollmentRows ?? []).map(
          (enrollment) => [
            enrollment.student_id,
            levelMap.get(
              enrollment.level_id
            ) ?? '',
          ]
        )
      )

      const paidMap = new Map<string, number>()

      ;(paymentsData ?? []).forEach(
        (payment) => {
          const currentPaid =
            paidMap.get(payment.student_id) ?? 0

          paidMap.set(
            payment.student_id,
            currentPaid +
              Number(payment.amount ?? 0)
          )
        }
      )

      const mappedStudents = (
        studentsData ?? []
      ).map((student) => {
        const amountPaid =
          paidMap.get(student.id) ?? 0

        const feeExempt =
          Boolean(student.fee_exempt)

        const paymentStatus =
          feeExempt
            ? ('معفي' as const)
            : amountPaid >= annualFee &&
                annualFee > 0
              ? ('مدفوع بالكامل' as const)
              : amountPaid > 0
                ? ('مدفوع جزئيًا' as const)
                : ('غير مدفوع' as const)

        return {
          id: student.id,
          name: student.name,
          personalId:
            student.personal_id ?? '',
          grade:
            enrollmentMap.get(student.id) ??
            '',
          phone: student.phone ?? '',
          whatsapp: student.whatsapp ?? '',
          paymentStatus,
          amountDue: annualFee,
          amountPaid,
          feeExempt,
          chronicDiseases:
            student.health_notes ??
            '',
          notes:
            student.notes ?? '',
          attendance: '—',
        }
      })

      setStudentList(mappedStudents)

      setSupabaseStatus(
        `متصل بـ Supabase ✅ | السنة الحالية: ${currentYear.name} | الرسوم السنوية: ${annualFee.toFixed(3)} د.ب`
      )
    }

    loadData()
  }, [])

  const updateFilter = (
    key: keyof Filters,
    value: string
  ) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase()

    return studentList.filter((student) => {
      const remaining =
        student.feeExempt
          ? 0
          : Math.max(
              student.amountDue -
                student.amountPaid,
              0
            )

      const contactText = [
        student.phone,
        student.whatsapp,
      ]
        .filter(Boolean)
        .join(' ')

      const notesText = [
        student.notes,
        student.chronicDiseases,
      ]
        .filter(Boolean)
        .join(' ')

      const matchesSearch =
        !query ||
        [
          student.name,
          student.personalId,
          student.grade,
          contactText,
          student.paymentStatus,
          notesText,
          student.attendance,
          remaining,
        ].some((value) =>
          String(value)
            .toLowerCase()
            .includes(query)
        )

      const matches = {
        name:
          !filters.name ||
          student.name
            .toLowerCase()
            .includes(
              filters.name.toLowerCase()
            ),

        personalId:
          !filters.personalId ||
          student.personalId.includes(
            filters.personalId
          ),

        grade:
          !filters.grade ||
          student.grade === filters.grade,

        phone:
          !filters.phone ||
          student.phone.includes(
            filters.phone
          ),

        whatsapp:
          !filters.whatsapp ||
          student.whatsapp.includes(
            filters.whatsapp
          ),

        paymentStatus:
          !filters.paymentStatus ||
          student.paymentStatus ===
            filters.paymentStatus,

        notes:
          !filters.notes ||
          notesText
            .toLowerCase()
            .includes(
              filters.notes.toLowerCase()
            ),

        attendance:
          !filters.attendance ||
          student.attendance ===
            filters.attendance,
      }

      return (
        matchesSearch &&
        Object.values(matches).every(
          Boolean
        )
      )
    })
  }, [search, filters, studentList])

  const editingStudent = studentList.find(
    (student) =>
      student.id === editingStudentId
  )

  const selectedStudent = studentList.find(
    (student) =>
      student.id === selectedStudentId
  )

  const openAddStudent = () => {
    setEditingStudentId(null)
    setIsAddStudentOpen(true)
  }

  const openEditStudent = () => {
    if (!selectedStudentId) return

    setEditingStudentId(selectedStudentId)
    setIsAddStudentOpen(true)
  }

  const closeStudentDrawer = () => {
    setIsAddStudentOpen(false)
    setEditingStudentId(null)
  }

  const openPaymentForStudent = (
    studentId: string
  ) => {
    router.push(
      `/payments?student=${encodeURIComponent(
        studentId
      )}&return=/students`
    )
  }

  const toggleColumn = (
    key: (typeof studentColumns)[number]['key']
  ) => {
    setVisibleColumns((current) => {
      const visibleCount =
        Object.values(current).filter(
          Boolean
        ).length

      if (
        current[key] &&
        visibleCount === 1
      ) {
        return current
      }

      return {
        ...current,
        [key]: !current[key],
      }
    })
  }

  const textFilter = (
    key: keyof Filters,
    placeholder: string
  ) => (
    <div className="relative mt-2">
      <Filter className="absolute right-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />

      <input
        value={filters[key]}
        onChange={(e) =>
          updateFilter(
            key,
            e.target.value
          )
        }
        placeholder={placeholder}
        className="h-8 w-full min-w-[90px] rounded border bg-background px-2 pr-7 text-xs outline-none"
      />
    </div>
  )

  const visibleColumnCount =
    Object.values(visibleColumns).filter(
      Boolean
    ).length + 2

  return (
    <div className="space-y-6">
      <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm">
        {supabaseStatus}
      </div>

      <PageHeader
        title="الطلاب"
        description={`إجمالي ${studentList.length} طالب مسجّل في النظام`}
        action={
          <Button onClick={openAddStudent}>
            <UserPlus className="size-4" />
            إضافة طالب
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="بحث عام في جميع بيانات الطلاب..."
              className="h-10 w-full rounded-md border bg-background px-3 pr-9 text-sm outline-none"
            />
          </div>

          <div className="flex flex-col gap-3 rounded-md border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">
                  إجمالي الطلاب:
                </span>{' '}
                <span className="font-semibold">
                  {studentList.length}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground">
                  النتائج الحالية:
                </span>{' '}
                <span className="font-semibold">
                  {filteredStudents.length}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground">
                  الرسوم السنوية:
                </span>{' '}
                <span className="font-semibold">
                  {currentAnnualFee.toLocaleString(
                    'ar-BH',
                    {
                      minimumFractionDigits: 3,
                      maximumFractionDigits: 3,
                    }
                  )}{' '}
                  د.ب
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!selectedStudentId}
                onClick={openEditStudent}
              >
                <Pencil className="size-4" />
                تعديل
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled={!selectedStudentId}
                onClick={async () => {
                  if (!selectedStudentId) return

                  const selectedStudent =
                    studentList.find(
                      (student) =>
                        student.id ===
                        selectedStudentId
                    )

                  if (!selectedStudent) return

                  const nextFeeExempt =
                    !selectedStudent.feeExempt

                  const { error } =
                    await supabase
                      .from('students')
                      .update({
                        fee_exempt:
                          nextFeeExempt,
                      })
                      .eq(
                        'id',
                        selectedStudentId
                      )

                  if (error) {
                    setSupabaseStatus(
                      `خطأ في تحديث حالة الإعفاء: ${error.message}`
                    )
                    return
                  }

                  setStudentList(
                    (current) =>
                      current.map(
                        (student) =>
                          student.id ===
                          selectedStudentId
                            ? {
                                ...student,
                                feeExempt:
                                  nextFeeExempt,
                                paymentStatus:
                                  nextFeeExempt
                                    ? 'معفي'
                                    : student.amountPaid >=
                                          student.amountDue &&
                                        student.amountDue >
                                          0
                                      ? 'مدفوع بالكامل'
                                      : student.amountPaid >
                                          0
                                        ? 'مدفوع جزئيًا'
                                        : 'غير مدفوع',
                              }
                            : student
                      )
                  )

                  setSupabaseStatus(
                    nextFeeExempt
                      ? 'تم إعفاء الطالب من الرسوم ✅'
                      : 'تم إلغاء إعفاء الطالب ✅'
                  )
                }}
              >
                {selectedStudent?.feeExempt
                  ? 'إلغاء الإعفاء'
                  : 'إعفاء'}
              </Button>

              <Button
                type="button"
                variant="destructive"
                disabled={!selectedStudentId}
                onClick={async () => {
                  const confirmed =
                    window.confirm(
                      '⚠️ هل أنت متأكد من حذف الطالب؟\n\nسيتم حذف بيانات الطالب، ولا يمكن التراجع عن هذه العملية.'
                    )

                  if (!confirmed) return

                  const { error } =
                    await supabase
                      .from('students')
                      .delete()
                      .eq(
                        'id',
                        selectedStudentId
                      )

                  if (error) {
                    setSupabaseStatus(
                      `خطأ في حذف الطالب: ${error.message}`
                    )
                    return
                  }

                  setStudentList(
                    (current) =>
                      current.filter(
                        (student) =>
                          student.id !==
                          selectedStudentId
                      )
                  )

                  setSelectedStudentId('')

                  setSupabaseStatus(
                    'تم حذف الطالب من Supabase ✅'
                  )
                }}
              >
                <X className="size-4" />
                مسح
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const menu =
                    document.getElementById(
                      'student-columns-menu'
                    )

                  menu?.classList.toggle(
                    'hidden'
                  )
                }}
              >
                تخصيص الأعمدة
              </Button>
            </div>
          </div>

          <div
            id="student-columns-menu"
            className="hidden rounded-md border bg-background p-3 shadow-sm"
          >
            <div className="mb-2 text-sm font-semibold">
              تخصيص الأعمدة
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {studentColumns.map(
                (column) => (
                  <label
                    key={column.key}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      checked={
                        visibleColumns[
                          column.key
                        ]
                      }
                      onChange={() =>
                        toggleColumn(
                          column.key
                        )
                      }
                    />

                    {column.label}
                  </label>
                )
              )}
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              يجب إبقاء عمود واحد على الأقل ظاهرًا.
            </p>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">
                    #
                  </TableHead>

                  {visibleColumns.name && (
                    <TableHead>
                      اسم الطالب
                      {textFilter(
                        'name',
                        'بحث'
                      )}
                    </TableHead>
                  )}

                  {visibleColumns.personalId && (
                    <TableHead>
                      الرقم الشخصي
                      {textFilter(
                        'personalId',
                        'بحث'
                      )}
                    </TableHead>
                  )}

                  {visibleColumns.grade && (
                    <TableHead>
                      الصف الأكاديمي

                      <select
                        value={
                          filters.grade
                        }
                        onChange={(e) =>
                          updateFilter(
                            'grade',
                            e.target.value
                          )
                        }
                        className="mt-2 h-8 w-full min-w-[120px] rounded border bg-background px-2 text-xs"
                      >
                        <option value="">
                          الكل
                        </option>

                        {academicLevels.map(
                          (level) => (
                            <option
                              key={level.id}
                              value={
                                level.name
                              }
                            >
                              {level.name}
                            </option>
                          )
                        )}
                      </select>
                    </TableHead>
                  )}

                  {visibleColumns.contact && (
                    <TableHead>
                      التواصل
                      {textFilter(
                        'phone',
                        'بحث'
                      )}
                    </TableHead>
                  )}

                  {visibleColumns.paymentStatus && (
                    <TableHead>
                      الدفع

                      <select
                        value={
                          filters.paymentStatus
                        }
                        onChange={(e) =>
                          updateFilter(
                            'paymentStatus',
                            e.target.value
                          )
                        }
                        className="mt-2 h-8 w-full min-w-[120px] rounded border bg-background px-2 text-xs"
                      >
                        <option value="">
                          الكل
                        </option>

                        <option value="مدفوع بالكامل">
                          مدفوع بالكامل
                        </option>

                        <option value="مدفوع جزئيًا">
                          مدفوع جزئيًا
                        </option>

                        <option value="غير مدفوع">
                          غير مدفوع
                        </option>

                        <option value="معفي">
                          معفي
                        </option>
                      </select>
                    </TableHead>
                  )}

                  {visibleColumns.notes && (
                    <TableHead>
                      ملاحظات
                      {textFilter(
                        'notes',
                        'بحث'
                      )}
                    </TableHead>
                  )}

                  {visibleColumns.attendance && (
                    <TableHead>
                      الحضور
                      {textFilter(
                        'attendance',
                        'بحث'
                      )}
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredStudents.map(
                  (student, index) => {
                    const remaining =
                      student.feeExempt
                        ? 0
                        : Math.max(
                            student.amountDue -
                              student.amountPaid,
                            0
                          )

                    return (
                      <TableRow
                        key={student.id}
                        onClick={() =>
                          setSelectedStudentId(
                            student.id
                          )
                        }
                        className={
                          selectedStudentId ===
                          student.id
                            ? 'cursor-pointer bg-muted'
                            : 'cursor-pointer'
                        }
                      >
                        <TableCell className="text-center text-muted-foreground">
                          {index + 1}
                        </TableCell>

                        {visibleColumns.name && (
                          <TableCell className="font-medium">
                            {student.name}
                          </TableCell>
                        )}

                        {visibleColumns.personalId && (
                          <TableCell>
                            {
                              student.personalId
                            }
                          </TableCell>
                        )}

                        {visibleColumns.grade && (
                          <TableCell>
                            {student.grade ||
                              '—'}
                          </TableCell>
                        )}

                        {visibleColumns.contact && (
                          <TableCell
                            dir="ltr"
                            className="text-right"
                          >
                            <div className="space-y-1">
                              <div>
                                {student.phone ||
                                  '—'}
                              </div>

                              <div className="text-muted-foreground">
                                {student.whatsapp
                                  ? `واتساب: ${student.whatsapp}`
                                  : 'واتساب: —'}
                              </div>
                            </div>
                          </TableCell>
                        )}

                        {visibleColumns.paymentStatus && (
                          <TableCell>
                            <button
                              type="button"
                              className="rounded-md px-2 py-1 transition hover:bg-muted"
                              onClick={(event) => {
                                event.stopPropagation()

                                if (
                                  student.paymentStatus ===
                                  'معفي'
                                ) {
                                  router.push(
                                    `/payments?student=${encodeURIComponent(
                                      student.id
                                    )}&return=/students`
                                  )
                                  return
                                }

                                if (
                                  student.paymentStatus ===
                                  'مدفوع بالكامل'
                                ) {
                                  router.push(
                                    `/payments?student=${encodeURIComponent(
                                      student.id
                                    )}&return=/students`
                                  )
                                  return
                                }

                                openPaymentForStudent(
                                  student.id
                                )
                              }}
                            >
                              {student.paymentStatus ===
                              'مدفوع بالكامل' ? (
                                <span className="inline-flex flex-col items-center gap-1">
                                  <span className="text-xs font-medium">
                                    تفاصيل
                                  </span>

                                  <StatusBadge
                                    status="مدفوع بالكامل"
                                  />
                                </span>
                              ) : student.paymentStatus ===
                                'مدفوع جزئيًا' ? (
                                <span className="inline-flex flex-col items-center gap-1">
                                  <span className="text-xs font-medium">
                                    متبقي
                                  </span>

                                  <StatusBadge
                                    status="مدفوع جزئيًا"
                                  />
                                </span>
                              ) : student.paymentStatus ===
                                'غير مدفوع' ? (
                                <span className="inline-flex flex-col items-center gap-1">
                                  <span className="text-xs font-medium">
                                    غير مدفوع
                                  </span>

                                  <StatusBadge
                                    status="غير مدفوع"
                                  />
                                </span>
                              ) : (
                                <span className="inline-flex flex-col items-center gap-1">
                                  <span className="text-xs font-medium">
                                    معفي
                                  </span>

                                  <StatusBadge
                                    status="معفي"
                                  />
                                </span>
                              )}
                            </button>
                          </TableCell>
                        )}

                        {visibleColumns.notes && (
                          <TableCell>
                            <button
                              type="button"
                              className="max-w-[220px] truncate text-right text-sm hover:underline"
                              onClick={(event) => {
                                event.stopPropagation()
                                setNotesStudent(
                                  student
                                )
                              }}
                            >
                              {student.notes ||
                              student.chronicDiseases
                                ? [
                                    student.notes,
                                    student.chronicDiseases,
                                  ]
                                    .filter(Boolean)
                                    .join(' • ')
                                : '—'}
                            </button>
                          </TableCell>
                        )}

                        {visibleColumns.attendance && (
                          <TableCell>
                            <span className="text-muted-foreground">
                              —
                            </span>
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  }
                )}

                {filteredStudents.length ===
                  0 && (
                  <TableRow>
                    <TableCell
                      colSpan={
                        visibleColumnCount
                      }
                      className="h-24 text-center text-muted-foreground"
                    >
                      لا توجد نتائج مطابقة
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {notesStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="إغلاق"
            className="absolute inset-0 bg-black/40"
            onClick={() =>
              setNotesStudent(null)
            }
          />

          <div className="relative z-10 w-full max-w-lg rounded-lg border bg-background shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold">
                  ملاحظات الطالب
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  {notesStudent.name}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setNotesStudent(null)
                }
                className="rounded-md p-2 hover:bg-muted"
                aria-label="إغلاق"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div>
                <h3 className="mb-2 text-sm font-semibold">
                  الملاحظات العامة
                </h3>

                <div className="rounded-md border bg-muted/30 p-4 text-sm">
                  {notesStudent.notes ||
                    'لا توجد ملاحظات عامة'}
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold">
                  المعلومات الصحية
                </h3>

                <div className="rounded-md border bg-muted/30 p-4 text-sm">
                  {notesStudent.chronicDiseases ||
                    'لا توجد معلومات صحية'}
                </div>
              </div>
            </div>

            <div className="border-t p-4">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() =>
                  setNotesStudent(null)
                }
              >
                إغلاق
              </Button>
            </div>
          </div>
        </div>
      )}

      {isAddStudentOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="إغلاق"
            className="absolute inset-0 bg-black/40"
            onClick={closeStudentDrawer}
          />

          <aside className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l bg-background shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold">
                  {editingStudent
                    ? 'تعديل بيانات الطالب'
                    : 'إضافة طالب'}
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  {editingStudent
                    ? 'تعديل بيانات الطالب الأساسية'
                    : 'إدخال بيانات الطالب الأساسية'}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeStudentDrawer
                }
                className="rounded-md p-2 hover:bg-muted"
                aria-label="إغلاق"
              >
                <X className="size-5" />
              </button>
            </div>

            <form
              key={
                editingStudent?.id ??
                'new'
              }
              onSubmit={async (e) => {
                e.preventDefault()

                const form = e.currentTarget
                const data = new FormData(form)

                const name = String(
                  data.get('name') || ''
                ).trim()

                const personalId =
                  String(
                    data.get(
                      'personalId'
                    ) || ''
                  ).trim()

                const grade = String(
                  data.get('grade') || ''
                )

                const phone = String(
                  data.get('phone') || ''
                ).trim()

                const whatsapp =
                  String(
                    data.get(
                      'whatsapp'
                    ) || ''
                  ).trim()

                const chronicDiseases =
                  String(
                    data.get(
                      'chronicDiseases'
                    ) || ''
                  ).trim()

                const amountPaid =
                  Number(
                    data.get(
                      'amountPaid'
                    ) || 0
                  )

                const notes = String(
                  data.get('notes') || ''
                ).trim()

                if (
                  !name ||
                  !personalId ||
                  !grade
                ) {
                  return
                }

                if (
                  !Number.isFinite(
                    amountPaid
                  ) ||
                  amountPaid < 0
                ) {
                  setSupabaseStatus(
                    'خطأ: المبلغ المدفوع غير صحيح'
                  )
                  return
                }

                if (
                  !currentAcademicYearId
                ) {
                  setSupabaseStatus(
                    'خطأ: لا توجد سنة دراسية حالية مفعلة'
                  )
                  return
                }

                const selectedLevel =
                  academicLevels.find(
                    (level) =>
                      level.name ===
                      grade
                  )

                if (!selectedLevel) {
                  setSupabaseStatus(
                    'خطأ: الصف الأكاديمي المحدد غير موجود'
                  )
                  return
                }

                if (
                  !editingStudent &&
                  amountPaid >
                    currentAnnualFee &&
                  currentAnnualFee > 0
                ) {
                  setSupabaseStatus(
                    `خطأ: المبلغ المدفوع لا يمكن أن يتجاوز الرسوم السنوية (${currentAnnualFee.toFixed(
                      3
                    )} د.ب)`
                  )
                  return
                }

                if (editingStudent) {
                  const {
                    data: updatedStudent,
                    error,
                  } = await supabase
                    .from('students')
                    .update({
                      name,
                      personal_id:
                        personalId,
                      phone,
                      whatsapp,
                      notes,
                      health_notes:
                        chronicDiseases,
                    })
                    .eq(
                      'id',
                      editingStudent.id
                    )
                    .select(
                      'id, student_id, name, personal_id, phone, whatsapp, notes, health_notes, status, fee_exempt'
                    )
                    .single()

                  if (error) {
                    setSupabaseStatus(
                      `خطأ في تعديل الطالب: ${error.message}`
                    )
                    return
                  }

                  const {
                    data:
                      existingEnrollment,
                    error:
                      enrollmentLookupError,
                  } = await supabase
                    .from('enrollments')
                    .select('id')
                    .eq(
                      'student_id',
                      editingStudent.id
                    )
                    .eq(
                      'academic_year_id',
                      currentAcademicYearId
                    )
                    .maybeSingle()

                  if (
                    enrollmentLookupError
                  ) {
                    setSupabaseStatus(
                      `خطأ في قراءة ربط الصف الأكاديمي: ${enrollmentLookupError.message}`
                    )
                    return
                  }

                  if (
                    existingEnrollment
                  ) {
                    const {
                      error:
                        enrollmentUpdateError,
                    } = await supabase
                      .from('enrollments')
                      .update({
                        level_id:
                          selectedLevel.id,
                        status: 'نشط',
                      })
                      .eq(
                        'id',
                        existingEnrollment.id
                      )

                    if (
                      enrollmentUpdateError
                    ) {
                      setSupabaseStatus(
                        `خطأ في تعديل الصف الأكاديمي: ${enrollmentUpdateError.message}`
                      )
                      return
                    }
                  } else {
                    const {
                      error:
                        enrollmentInsertError,
                    } = await supabase
                      .from('enrollments')
                      .insert({
                        student_id:
                          editingStudent.id,
                        academic_year_id:
                          currentAcademicYearId,
                        level_id:
                          selectedLevel.id,
                        class_id: null,
                        status: 'نشط',
                      })

                    if (
                      enrollmentInsertError
                    ) {
                      setSupabaseStatus(
                        `خطأ في ربط الصف الأكاديمي: ${enrollmentInsertError.message}`
                      )
                      return
                    }
                  }

                  setStudentList(
                    (current) =>
                      current.map(
                        (student) =>
                          student.id ===
                          editingStudent.id
                            ? {
                                ...student,
                                name:
                                  updatedStudent.name,
                                personalId:
                                  updatedStudent.personal_id ??
                                  '',
                                phone:
                                  updatedStudent.phone ??
                                  '',
                                whatsapp:
                                  updatedStudent.whatsapp ??
                                  '',
                                chronicDiseases:
                                  updatedStudent.health_notes ??
                                  '',
                                notes:
                                  updatedStudent.notes ??
                                  '',
                                grade,
                                feeExempt:
                                  Boolean(
                                    updatedStudent.fee_exempt
                                  ),
                              }
                            : student
                      )
                  )

                  setSupabaseStatus(
                    'تم تعديل الطالب وربط الصف الأكاديمي في Supabase ✅'
                  )
                } else {
                  const {
                  data: newStudent,
                  error,
                } = await supabase
                  .from('students')
                  .insert({
                    academic_year_id:
                      currentAcademicYearId,
                    name,
                    personal_id:
                      personalId,
                    phone,
                    whatsapp,
                    notes,
                    health_notes:
                      chronicDiseases,
                    status: 'نشط',
                    fee_exempt: false,
                  })
                    .select(
                      'id, student_id, name, personal_id, phone, whatsapp, notes, health_notes, status, fee_exempt'
                    )
                    .single()

                  if (error) {
                    setSupabaseStatus(
                      `خطأ في حفظ الطالب: ${error.message}`
                    )
                    return
                  }

                  const {
                    error:
                      enrollmentError,
                  } = await supabase
                    .from('enrollments')
                    .insert({
                      student_id:
                        newStudent.id,
                      academic_year_id:
                        currentAcademicYearId,
                      level_id:
                        selectedLevel.id,
                      class_id: null,
                      status: 'نشط',
                    })

                  if (enrollmentError) {
                    await supabase
                      .from('students')
                      .delete()
                      .eq(
                        'id',
                        newStudent.id
                      )

                    setSupabaseStatus(
                      `خطأ في ربط الصف الأكاديمي: ${enrollmentError.message}`
                    )
                    return
                  }

                  if (amountPaid > 0) {
                    const {
                      error:
                        paymentError,
                    } = await supabase
                      .from('payments')
                      .insert({
                        student_id:
                          newStudent.id,
                        academic_year_id:
                          currentAcademicYearId,
                        amount:
                          amountPaid,
                        payment_method:
                          'نقدي',
                        payment_date:
                          new Date()
                            .toISOString()
                            .slice(
                              0,
                              10
                            ),
                      })

                    if (paymentError) {
                      await supabase
                        .from('enrollments')
                        .delete()
                        .eq(
                          'student_id',
                          newStudent.id
                        )
                        .eq(
                          'academic_year_id',
                          currentAcademicYearId
                        )

                      await supabase
                        .from('students')
                        .delete()
                        .eq(
                          'id',
                          newStudent.id
                        )

                      setSupabaseStatus(
                        `خطأ في حفظ الدفعة الأولى: ${paymentError.message}`
                      )
                      return
                    }
                  }

                  const paymentStatus =
                    amountPaid >=
                      currentAnnualFee &&
                    currentAnnualFee > 0
                      ? 'مدفوع بالكامل'
                      : amountPaid > 0
                        ? 'مدفوع جزئيًا'
                        : 'غير مدفوع'

                  const mappedStudent =
                    {
                      id: newStudent.id,
                      name:
                        newStudent.name,
                      personalId:
                        newStudent.personal_id ??
                        '',
                      grade,
                      phone:
                        newStudent.phone ??
                        '',
                      whatsapp:
                        newStudent.whatsapp ??
                        '',
                      paymentStatus,
                      amountDue:
                        currentAnnualFee,
                      amountPaid,
                      feeExempt:
                        Boolean(
                          newStudent.fee_exempt
                        ),
                      chronicDiseases:
                        newStudent.health_notes ??
                        '',
                      notes:
                        newStudent.notes ??
                        '',
                      attendance: '—',
                    }

                  setStudentList(
                    (current) => [
                      mappedStudent,
                      ...current,
                    ]
                  )

                  setSupabaseStatus(
                    amountPaid > 0
                      ? 'تم حفظ الطالب والدفعة الأولى وربط الصف الأكاديمي في Supabase ✅'
                      : 'تم حفظ الطالب وربط الصف الأكاديمي في Supabase ✅'
                  )
                }

                closeStudentDrawer()
                form.reset()
              }}
            >
              <div className="space-y-6 p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-sm font-medium">
                      اسم الطالب
                    </label>

                    <input
                      name="name"
                      type="text"
                      required
                      defaultValue={
                        editingStudent?.name ??
                        ''
                      }
                      placeholder="أدخل اسم الطالب"
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      الرقم الشخصي
                    </label>

                    <input
                      name="personalId"
                      type="text"
                      required
                      defaultValue={
                        editingStudent?.personalId ??
                        ''
                      }
                      placeholder="أدخل الرقم الشخصي"
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      الصف الأكاديمي
                    </label>

                    <select
                      name="grade"
                      required
                      defaultValue={
                        editingStudent?.grade ??
                        ''
                      }
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    >
                      <option value="">
                        اختر الصف
                      </option>

                      {academicLevels.map(
                        (level) => (
                          <option
                            key={level.id}
                            value={
                              level.name
                            }
                          >
                            {level.name}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      رقم الهاتف
                    </label>

                    <input
                      name="phone"
                      type="tel"
                      defaultValue={
                        editingStudent?.phone ??
                        ''
                      }
                      placeholder="مثال: 33xxxxxx"
                      dir="ltr"
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      رقم واتساب
                    </label>

                    <input
                      name="whatsapp"
                      type="tel"
                      defaultValue={
                        editingStudent?.whatsapp ??
                        ''
                      }
                      placeholder="مثال: 33xxxxxx"
                      dir="ltr"
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
                    />
                  </div>
                </div>

                <div className="border-t pt-5">
                  <h3 className="mb-4 text-sm font-semibold">
                    المعلومات الصحية
                  </h3>

                  <label className="mb-2 block text-sm font-medium">
                    الأمراض المزمنة
                  </label>

                  <input
                    name="chronicDiseases"
                    type="text"
                    defaultValue={
                      editingStudent?.chronicDiseases ??
                      ''
                    }
                    placeholder="لا يوجد"
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
                  />
                </div>

                <div className="border-t pt-5">
                  <h3 className="mb-4 text-sm font-semibold">
                    المعلومات المالية
                  </h3>

                  <div className="rounded-md border bg-muted/30 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium">
                          الرسوم السنوية
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          حسب السنة الدراسية الحالية:{' '}
                          {
                            currentAcademicYearName
                          }
                        </p>
                      </div>

                      <div className="text-lg font-semibold">
                        {currentAnnualFee.toLocaleString(
                          'ar-BH',
                          {
                            minimumFractionDigits: 3,
                            maximumFractionDigits: 3,
                          }
                        )}{' '}
                        د.ب
                      </div>
                    </div>
                  </div>

                  {!editingStudent ? (
                    <>
                      <div className="mt-4">
                        <label className="mb-2 block text-sm font-medium">
                          الدفعة الأولى
                        </label>

                        <input
                          name="amountPaid"
                          type="number"
                          min="0"
                          max={
                            currentAnnualFee >
                            0
                              ? currentAnnualFee
                              : undefined
                          }
                          step="0.001"
                          defaultValue="0"
                          placeholder="0"
                          className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
                        />
                      </div>

                      <p className="mt-3 text-xs text-muted-foreground">
                        يمكنك تسجيل الدفعة الأولى مع
                        إضافة الطالب. سيتم حفظها كدفعة
                        فعلية، ويمكن إضافة الدفعات اللاحقة
                        من قسم المدفوعات.
                      </p>
                    </>
                  ) : (
                    <div className="mt-4 rounded-md border bg-muted/30 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium">
                            المدفوع حتى الآن
                          </p>

                          <p className="mt-1 text-xs text-muted-foreground">
                            لتسجيل دفعة جديدة استخدم حالة
                            الدفع من قائمة الطلاب.
                          </p>
                        </div>

                        <div className="text-lg font-semibold">
                          {Number(
                            editingStudent?.amountPaid ??
                              0
                          ).toLocaleString(
                            'ar-BH',
                            {
                              minimumFractionDigits: 3,
                              maximumFractionDigits: 3,
                            }
                          )}{' '}
                          د.ب
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t pt-5">
                  <label className="mb-2 block text-sm font-medium">
                    ملاحظات
                  </label>

                  <textarea
                    name="notes"
                    defaultValue={
                      editingStudent?.notes ??
                      ''
                    }
                    placeholder="أدخل أي ملاحظات إضافية..."
                    rows={4}
                    className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="sticky bottom-0 flex gap-3 border-t bg-background p-6">
                <Button
                  type="submit"
                  className="flex-1"
                >
                  {editingStudent
                    ? 'حفظ التعديلات'
                    : 'حفظ الطالب'}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={
                    closeStudentDrawer
                  }
                >
                  إلغاء
                </Button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </div>
  )
}
