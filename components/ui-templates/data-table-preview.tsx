
'use client'

import { useMemo, useState } from 'react'
import {
  Search, SlidersHorizontal, ChevronDown,
  ChevronLeft, ChevronRight, Users, RotateCcw
} from 'lucide-react'

type Student = {
  id: number
  name: string
  personalId: string
  grade: string
  phone: string
  status: 'منتظم' | 'متأخر' | 'معفى'
}

const grades = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس']
const statuses: Student['status'][] = ['منتظم', 'متأخر', 'معفى']

const students: Student[] = Array.from({ length: 87 }, (_, i) => ({
  id: i + 1,
  name: [
    'محمد أحمد علي', 'يوسف خالد حسن', 'عبدالله محمد سالم',
    'علي إبراهيم يوسف', 'حسن عبدالله محمود', 'أحمد يوسف راشد',
    'سالم محمد جاسم', 'خالد علي أحمد', 'حمد راشد يوسف'
  ][i % 9],
  personalId: `200${String(i + 1).padStart(6, '0')}`,
  grade: grades[i % grades.length],
  phone: `3${String(1000000 + i * 137).slice(0, 6)}`,
  status: statuses[i % 3]
}))

const columnDefinitions = [
  { key: 'id', label: 'التسلسل', searchable: false, filterable: false },
  { key: 'name', label: 'اسم الطالب', searchable: true, filterable: true },
  { key: 'personalId', label: 'الرقم الشخصي', searchable: true, filterable: true },
  { key: 'grade', label: 'الصف الدراسي', searchable: false, filterable: true },
  { key: 'phone', label: 'رقم الهاتف', searchable: true, filterable: true },
  { key: 'status', label: 'الحالة', searchable: false, filterable: true },
] as const

type ColumnKey = typeof columnDefinitions[number]['key']

export default function DataTablePreview() {
  const [search, setSearch] = useState('')
  const [columnFilters, setColumnFilters] = useState({
    name: '',
    personalId: '',
    grade: 'الكل',
    phone: '',
    status: 'الكل',
  })
  const [pageSize, setPageSize] = useState(50)
  const [page, setPage] = useState(1)
  const [showColumns, setShowColumns] = useState(false)
  const [columnSearch, setColumnSearch] = useState('')
  const [visible, setVisible] = useState<Record<ColumnKey, boolean>>({
    id: true,
    name: true,
    personalId: true,
    grade: true,
    phone: true,
    status: true,
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()

    return students.filter(student => {
      const matchesGlobal =
        !q ||
        student.name.toLowerCase().includes(q) ||
        student.personalId.includes(q) ||
        student.phone.includes(q)

      const matchesName = student.name
        .toLowerCase()
        .includes(columnFilters.name.trim().toLowerCase())

      const matchesPersonalId = student.personalId
        .includes(columnFilters.personalId.trim())

      const matchesGrade =
        columnFilters.grade === 'الكل' ||
        student.grade === columnFilters.grade

      const matchesPhone = student.phone
        .includes(columnFilters.phone.trim())

      const matchesStatus =
        columnFilters.status === 'الكل' ||
        student.status === columnFilters.status

      return matchesGlobal &&
        matchesName &&
        matchesPersonalId &&
        matchesGrade &&
        matchesPhone &&
        matchesStatus
    })
  }, [search, columnFilters])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * pageSize
  const displayed = filtered.slice(start, start + pageSize)

  const updateFilter = (key: keyof typeof columnFilters, value: string) => {
    setColumnFilters(current => ({ ...current, [key]: value }))
    setPage(1)
  }

  const resetFilters = () => {
    setSearch('')
    setColumnFilters({
      name: '',
      personalId: '',
      grade: 'الكل',
      phone: '',
      status: 'الكل',
    })
    setPage(1)
  }

  const visibleColumns = columnDefinitions.filter(col => visible[col.key])
  const filteredColumns = columnDefinitions.filter(col =>
    col.label.includes(columnSearch.trim())
  )

  const smallInput =
    'h-8 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-xs font-normal text-slate-600 outline-none focus:border-teal-500'

  return (
    <main dir="rtl" className="min-h-screen bg-[#f5f7fa] p-3 sm:p-6">
      <div className="mx-auto max-w-[1500px] space-y-5">

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>لوحة التحكم</span>
              <ChevronLeft size={14} />
              <span>إدارة الطلاب</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">
              سجل الطلاب
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              معاينة قالب جدول الطلاب
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className="rounded-lg bg-teal-50 p-2 text-teal-700">
              <Users size={19} />
            </div>
            <div>
              <p className="text-xs text-slate-500">إجمالي الطلاب</p>
              <p className="text-lg font-bold text-slate-900">87</p>
            </div>
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          {/* Toolbar */}
          <div className="border-b border-slate-100 p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-bold text-slate-900">قائمة الطلاب</h2>
                <p className="mt-1 text-xs text-slate-500">
                  ابحث عن الطلاب أو استخدم فلتر كل عمود
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[190px] flex-1 sm:flex-none">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1) }}
                    placeholder="بحث عام: الاسم، الرقم، الهاتف..."
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pr-9 pl-3 text-sm outline-none transition focus:border-teal-500 focus:bg-white sm:w-72"
                  />
                </div>

                <button
                  onClick={() => setShowColumns(!showColumns)}
                  className={`flex h-10 items-center gap-2 rounded-xl border px-3 text-sm transition ${
                    showColumns
                      ? 'border-teal-200 bg-teal-50 text-teal-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <SlidersHorizontal size={16} />
                  تخصيص الأعمدة
                  <ChevronDown size={14} />
                </button>

                <button
                  onClick={resetFilters}
                  title="إعادة ضبط البحث والفلاتر"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            </div>

            {showColumns && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-800">الأعمدة الظاهرة</p>
                    <p className="mt-1 text-xs text-slate-500">
                      اختر الأعمدة التي تريد عرضها في الجدول
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-teal-700">
                    {visibleColumns.length} من {columnDefinitions.length}
                  </span>
                </div>

                <div className="relative mb-3">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    value={columnSearch}
                    onChange={e => setColumnSearch(e.target.value)}
                    placeholder="ابحث عن اسم العمود..."
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white pr-9 pl-3 text-sm outline-none focus:border-teal-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {filteredColumns.map(col => (
                    <label key={col.key} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={visible[col.key]}
                        disabled={col.key === 'id'}
                        onChange={e => setVisible(v => ({
                          ...v,
                          [col.key]: e.target.checked
                        }))}
                        className="accent-teal-600"
                      />
                      {col.label}
                    </label>
                  ))}
                  {filteredColumns.length === 0 && (
                    <p className="col-span-full py-3 text-center text-xs text-slate-400">
                      لا يوجد عمود بهذا الاسم
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Results summary */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs text-slate-500 sm:px-5">
            <div>
              النتائج:
              <span className="mx-1 font-bold text-slate-800">{filtered.length}</span>
              طالب
            </div>
            <div className="flex items-center gap-2">
              <span>عدد السجلات:</span>
              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-semibold text-slate-700 outline-none"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>في الصفحة</span>
            </div>
          </div>

          {/* Scroll area: vertical scrollbar on the right */}
          <div
            dir="ltr"
            className="mx-3 mb-3 overflow-auto rounded-xl border border-slate-200 sm:mx-5"
            style={{ maxHeight: 590 }}
          >
            <div dir="rtl" className="min-w-[850px]">
              <table className="w-full border-collapse text-right text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50">
                  <tr className="border-b border-slate-200 text-xs font-bold text-slate-600">
                    {visible.id && <th className="w-20 px-4 py-3">التسلسل</th>}
                    {visible.name && <th className="min-w-52 px-4 py-3">اسم الطالب</th>}
                    {visible.personalId && <th className="min-w-36 px-4 py-3">الرقم الشخصي</th>}
                    {visible.grade && <th className="min-w-32 px-4 py-3">الصف الدراسي</th>}
                    {visible.phone && <th className="min-w-36 px-4 py-3">رقم الهاتف</th>}
                    {visible.status && <th className="min-w-32 px-4 py-3">الحالة</th>}
                  </tr>

                  {/* Individual column filters */}
                  <tr className="border-b border-slate-200 bg-white">
                    {visible.id && (
                      <th className="px-2 py-2">
                        <span className="text-[10px] font-normal text-slate-400">—</span>
                      </th>
                    )}
                    {visible.name && (
                      <th className="px-2 py-2">
                        <input
                          value={columnFilters.name}
                          onChange={e => updateFilter('name', e.target.value)}
                          placeholder="بحث بالاسم"
                          className={smallInput}
                        />
                      </th>
                    )}
                    {visible.personalId && (
                      <th className="px-2 py-2">
                        <input
                          value={columnFilters.personalId}
                          onChange={e => updateFilter('personalId', e.target.value)}
                          placeholder="بحث بالرقم"
                          className={smallInput}
                        />
                      </th>
                    )}
                    {visible.grade && (
                      <th className="px-2 py-2">
                        <select
                          value={columnFilters.grade}
                          onChange={e => updateFilter('grade', e.target.value)}
                          className={smallInput}
                        >
                          <option value="الكل">كل الصفوف</option>
                          {grades.map(g => <option key={g}>{g}</option>)}
                        </select>
                      </th>
                    )}
                    {visible.phone && (
                      <th className="px-2 py-2">
                        <input
                          value={columnFilters.phone}
                          onChange={e => updateFilter('phone', e.target.value)}
                          placeholder="بحث بالهاتف"
                          className={smallInput}
                        />
                      </th>
                    )}
                    {visible.status && (
                      <th className="px-2 py-2">
                        <select
                          value={columnFilters.status}
                          onChange={e => updateFilter('status', e.target.value)}
                          className={smallInput}
                        >
                          <option value="الكل">كل الحالات</option>
                          {statuses.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {displayed.map((student, index) => (
                    <tr key={student.id} className="transition hover:bg-teal-50/40">
                      {visible.id && (
                        <td className="px-4 py-4 font-semibold tabular-nums text-slate-400">
                          {start + index + 1}
                        </td>
                      )}
                      {visible.name && (
                        <td className="px-4 py-4 font-semibold text-slate-800">
                          {student.name}
                        </td>
                      )}
                      {visible.personalId && (
                        <td className="px-4 py-4 tabular-nums text-slate-600">
                          {student.personalId}
                        </td>
                      )}
                      {visible.grade && (
                        <td className="px-4 py-4 text-slate-600">{student.grade}</td>
                      )}
                      {visible.phone && (
                        <td className="px-4 py-4 tabular-nums text-slate-600">{student.phone}</td>
                      )}
                      {visible.status && (
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            student.status === 'منتظم'
                              ? 'bg-emerald-50 text-emerald-700'
                              : student.status === 'متأخر'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {student.status}
                          </span>
                        </td>
                      )}
                    </tr>
                  ))}

                  {displayed.length === 0 && (
                    <tr>
                      <td colSpan={visibleColumns.length} className="px-4 py-16 text-center">
                        <Search className="mx-auto mb-3 text-slate-300" size={28} />
                        <p className="font-semibold text-slate-600">لا توجد نتائج</p>
                        <p className="mt-1 text-xs text-slate-400">
                          جرّب تغيير البحث أو الفلاتر
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-xs text-slate-500">
              عرض <span className="font-bold text-slate-800">{filtered.length ? start + 1 : 0}</span>
              {' '}إلى{' '}
              <span className="font-bold text-slate-800">{Math.min(start + pageSize, filtered.length)}</span>
              {' '}من أصل{' '}
              <span className="font-bold text-slate-800">{filtered.length}</span>
            </p>

            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <button
                disabled={currentPage <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight size={16} />
                السابق
              </button>
              <span className="px-2 text-sm font-semibold text-slate-700">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                التالي
                <ChevronLeft size={16} />
              </button>
            </div>
          </div>
        </section>

        <p className="text-center text-xs text-slate-400">
          نموذج معاينة تجريبي — البيانات غير مرتبطة بقاعدة البيانات
        </p>
      </div>
    </main>
  )
}
