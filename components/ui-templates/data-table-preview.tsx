
'use client'

import { useMemo, useRef, useState } from 'react'
import ExcelJS from 'exceljs'
import {
  Search, SlidersHorizontal, ChevronDown,
  ChevronLeft, ChevronRight, Users, RotateCcw,
  Trash2, Pencil, FileSpreadsheet, UserPlus,
  X, Check, UserRound, ArrowUpDown
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

const initialStudents: Student[] = Array.from({ length: 87 }, (_, i) => ({
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
  { key: 'id', label: 'التسلسل' },
  { key: 'name', label: 'اسم الطالب' },
  { key: 'personalId', label: 'الرقم الشخصي' },
  { key: 'grade', label: 'الصف الدراسي' },
  { key: 'phone', label: 'رقم الهاتف' },
  { key: 'status', label: 'الحالة' },
] as const

type ColumnKey = typeof columnDefinitions[number]['key']

const defaultVisible: Record<ColumnKey, boolean> = {
  id: true,
  name: true,
  personalId: true,
  grade: true,
  phone: true,
  status: true,
}

export default function DataTablePreview() {
  const [students, setStudents] = useState(initialStudents)
  const [selectedId, setSelectedId] = useState<number | null>(null)

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
  const [visible, setVisible] = useState(defaultVisible)

  const [modal, setModal] = useState<'add' | 'edit' | 'delete' | null>(null)
  const [formName, setFormName] = useState('')
  const [formPersonalId, setFormPersonalId] = useState('')
  const [formGrade, setFormGrade] = useState(grades[0])
  const [formPhone, setFormPhone] = useState('')
  const [formStatus, setFormStatus] = useState<Student['status']>('منتظم')

  const selectedStudent = students.find(s => s.id === selectedId) ?? null

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()

    return students.filter(student => {
      const matchesGlobal =
        !q ||
        student.name.toLowerCase().includes(q) ||
        student.personalId.includes(q) ||
        student.phone.includes(q)

      return matchesGlobal &&
        student.name.toLowerCase().includes(columnFilters.name.trim().toLowerCase()) &&
        student.personalId.includes(columnFilters.personalId.trim()) &&
        (columnFilters.grade === 'الكل' || student.grade === columnFilters.grade) &&
        student.phone.includes(columnFilters.phone.trim()) &&
        (columnFilters.status === 'الكل' || student.status === columnFilters.status)
    })
  }, [students, search, columnFilters])

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

  const openAdd = () => {
    setFormName('')
    setFormPersonalId('')
    setFormGrade(grades[0])
    setFormPhone('')
    setFormStatus('منتظم')
    setModal('add')
  }

  const openEdit = () => {
    if (!selectedStudent) return
    setFormName(selectedStudent.name)
    setFormPersonalId(selectedStudent.personalId)
    setFormGrade(selectedStudent.grade)
    setFormPhone(selectedStudent.phone)
    setFormStatus(selectedStudent.status)
    setModal('edit')
  }

  const saveStudent = () => {
    if (!formName.trim() || !formPersonalId.trim()) return

    if (modal === 'add') {
      const newStudent: Student = {
        id: Math.max(0, ...students.map(s => s.id)) + 1,
        name: formName.trim(),
        personalId: formPersonalId.trim(),
        grade: formGrade,
        phone: formPhone.trim(),
        status: formStatus,
      }
      setStudents(current => [newStudent, ...current])
      setSelectedId(newStudent.id)
      setPage(1)
    } else if (modal === 'edit' && selectedId !== null) {
      setStudents(current => current.map(s =>
        s.id === selectedId
          ? {
              ...s,
              name: formName.trim(),
              personalId: formPersonalId.trim(),
              grade: formGrade,
              phone: formPhone.trim(),
              status: formStatus,
            }
          : s
      ))
    }

    setModal(null)
  }

  const deleteStudent = () => {
    if (selectedId === null) return
    setStudents(current => current.filter(s => s.id !== selectedId))
    setSelectedId(null)
    setModal(null)
  }

  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('الطلاب')

    sheet.columns = [
      { header: 'التسلسل', key: 'id', width: 12 },
      { header: 'اسم الطالب', key: 'name', width: 25 },
      { header: 'الرقم الشخصي', key: 'personalId', width: 20 },
      { header: 'الصف الدراسي', key: 'grade', width: 16 },
      { header: 'رقم الهاتف', key: 'phone', width: 18 },
      { header: 'الحالة', key: 'status', width: 16 },
    ]

    sheet.addRows(filtered.map((student, index) => ({
      ...student,
      id: index + 1,
    })))

    sheet.views = [{ rightToLeft: true }]
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F766E' },
    }

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'students-preview.xlsx'
    link.click()
    URL.revokeObjectURL(url)
  }

  const filteredColumns = columnDefinitions.filter(col =>
    col.label.includes(columnSearch.trim())
  )

  const smallInput =
    'h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100'

  return (
    <main dir="rtl" className="min-h-screen bg-[#f5f7fa] p-3 font-[var(--font-cairo)] sm:p-6">
      <div className="mx-auto max-w-[1500px] space-y-5">

        {/* Page Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <span>لوحة التحكم</span>
              <ChevronLeft size={14} />
              <span>إدارة الطلاب</span>
            </div>
            <h1 className="mt-2 text-2xl font-extrabold text-slate-950">
              سجل الطلاب
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              عرض وإدارة بيانات الطلاب
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="rounded-lg bg-teal-50 p-2.5 text-teal-700">
              <Users size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">إجمالي الطلاب</p>
              <p className="text-xl font-extrabold text-slate-950">{students.length}</p>
            </div>
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          {/* Table toolbar */}
          <div className="space-y-4 border-b border-slate-200 p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-950">قائمة الطلاب</h2>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  اختر طالباً لتنفيذ الإجراءات أو استخدم البحث والفلاتر
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setModal('delete')}
                  disabled={!selectedStudent}
                  className="flex h-10 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 size={16} />
                  مسح
                </button>

                <button
                  onClick={openEdit}
                  disabled={!selectedStudent}
                  className="flex h-10 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 text-sm font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Pencil size={16} />
                  تعديل
                </button>

                <button
                  onClick={exportExcel}
                  className="flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
                >
                  <FileSpreadsheet size={16} />
                  تنزيل Excel
                </button>

                <button
                  onClick={openAdd}
                  className="flex h-10 items-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800"
                >
                  <UserPlus size={17} />
                  إضافة طالب
                </button>
              </div>
            </div>

            {selectedStudent && (
              <div className="flex items-center justify-between rounded-lg border border-teal-100 bg-teal-50 px-3 py-2">
                <p className="text-xs font-semibold text-teal-800">
                  الطالب المحدد: {selectedStudent.name}
                </p>
                <button
                  onClick={() => setSelectedId(null)}
                  className="text-xs font-bold text-teal-700 hover:text-teal-900"
                >
                  إلغاء التحديد
                </button>
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1) }}
                  placeholder="بحث عام بالاسم أو الرقم الشخصي أو الهاتف..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pr-10 pl-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
                />
              </div>

              <button
                onClick={() => setShowColumns(!showColumns)}
                className={`flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold transition ${
                  showColumns
                    ? 'border-teal-200 bg-teal-50 text-teal-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <SlidersHorizontal size={17} />
                تخصيص الأعمدة
                <ChevronDown size={15} />
              </button>

              <button
                onClick={resetFilters}
                title="مسح البحث والفلاتر"
                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                <RotateCcw size={16} />
                إعادة ضبط
              </button>
            </div>

            {showColumns && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-extrabold text-slate-900">تخصيص الأعمدة</p>
                    <p className="mt-1 text-xs text-slate-500">اختر الأعمدة التي تريد إظهارها</p>
                  </div>
                  <span className="rounded-lg bg-teal-100 px-2.5 py-1 text-xs font-bold text-teal-800">
                    {columnDefinitions.filter(c => visible[c.key]).length} محددة
                  </span>
                </div>

                <div className="relative mb-3">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    value={columnSearch}
                    onChange={e => setColumnSearch(e.target.value)}
                    placeholder="ابحث عن عمود..."
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white pr-9 pl-3 text-sm outline-none focus:border-teal-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {filteredColumns.map(col => (
                    <label key={col.key} className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={visible[col.key]}
                        disabled={col.key === 'id'}
                        onChange={e => setVisible(v => ({
                          ...v,
                          [col.key]: e.target.checked
                        }))}
                        className="h-4 w-4 accent-teal-700"
                      />
                      {col.label}
                    </label>
                  ))}
                  {filteredColumns.length === 0 && (
                    <p className="col-span-full py-3 text-center text-xs text-slate-400">
                      لا توجد أعمدة مطابقة
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Count and page size */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs font-semibold text-slate-600 sm:px-5">
            <div>
              عدد النتائج:
              <span className="mx-1 font-extrabold text-slate-950">{filtered.length}</span>
              طالب
            </div>
            <div className="flex items-center gap-2">
              <span>عرض</span>
              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-bold text-slate-800 outline-none"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>طالب في الصفحة</span>
            </div>
          </div>

          {/* Table */}
          <div
            dir="ltr"
            className="mx-3 mb-3 overflow-auto rounded-xl border border-slate-200 sm:mx-5"
            style={{ maxHeight: 590 }}
          >
            <div dir="rtl" className="min-w-[850px]">
              <table className="w-full border-collapse text-right text-sm">
                <thead className="sticky top-0 z-10 bg-slate-100">
                  <tr className="border-b border-slate-200 text-xs font-extrabold text-slate-900">
                    {visible.id && <th className="w-20 px-4 py-4">التسلسل</th>}
                    {visible.name && <th className="min-w-52 px-4 py-4">اسم الطالب</th>}
                    {visible.personalId && <th className="min-w-36 px-4 py-4">الرقم الشخصي</th>}
                    {visible.grade && <th className="min-w-32 px-4 py-4">الصف الدراسي</th>}
                    {visible.phone && <th className="min-w-36 px-4 py-4">رقم الهاتف</th>}
                    {visible.status && <th className="min-w-32 px-4 py-4">الحالة</th>}
                  </tr>

                  <tr className="border-b border-slate-200 bg-white">
                    {visible.id && (
                      <th className="px-2 py-2">
                        <span className="text-xs text-slate-400">—</span>
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
                    <tr
                      key={student.id}
                      onClick={() => setSelectedId(student.id === selectedId ? null : student.id)}
                      className={`cursor-pointer transition ${
                        selectedId === student.id
                          ? 'bg-teal-50 ring-1 ring-inset ring-teal-200'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {visible.id && (
                        <td className="px-4 py-4 font-bold tabular-nums text-slate-500">
                          {start + index + 1}
                        </td>
                      )}
                      {visible.name && (
                        <td className="px-4 py-4 font-bold text-slate-900">
                          {student.name}
                        </td>
                      )}
                      {visible.personalId && (
                        <td className="px-4 py-4 font-semibold tabular-nums text-slate-700">
                          {student.personalId}
                        </td>
                      )}
                      {visible.grade && (
                        <td className="px-4 py-4 font-semibold text-slate-700">{student.grade}</td>
                      )}
                      {visible.phone && (
                        <td className="px-4 py-4 font-semibold tabular-nums text-slate-700">{student.phone}</td>
                      )}
                      {visible.status && (
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                            student.status === 'منتظم'
                              ? 'bg-emerald-50 text-emerald-800'
                              : student.status === 'متأخر'
                              ? 'bg-amber-50 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {student.status}
                          </span>
                        </td>
                      )}
                    </tr>
                  ))}

                  {displayed.length === 0 && (
                    <tr>
                      <td colSpan={columnDefinitions.filter(c => visible[c.key]).length} className="px-4 py-16 text-center">
                        <Search className="mx-auto mb-3 text-slate-300" size={28} />
                        <p className="font-bold text-slate-700">لا توجد نتائج</p>
                        <p className="mt-1 text-xs text-slate-500">جرّب تغيير البحث أو الفلاتر</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-xs font-semibold text-slate-600">
              عرض <span className="font-extrabold text-slate-900">{filtered.length ? start + 1 : 0}</span>
              {' '}إلى{' '}
              <span className="font-extrabold text-slate-900">{Math.min(start + pageSize, filtered.length)}</span>
              {' '}من أصل{' '}
              <span className="font-extrabold text-slate-900">{filtered.length}</span>
            </p>

            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <button
                disabled={currentPage <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight size={16} />
                السابق
              </button>
              <span className="px-2 text-sm font-extrabold text-slate-800">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                التالي
                <ChevronLeft size={16} />
              </button>
            </div>
          </div>
        </section>

        <p className="text-center text-xs font-medium text-slate-400">
          نموذج تجريبي — جميع العمليات محلية ولا تؤثر على قاعدة البيانات
        </p>
      </div>

      {/* Add / Edit / Delete dialogs */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onMouseDown={e => {
            if (e.target === e.currentTarget) setModal(null)
          }}
        >
          <div dir="rtl" className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="font-extrabold text-slate-950">
                {modal === 'add' ? 'إضافة طالب' : modal === 'edit' ? 'تعديل بيانات الطالب' : 'تأكيد حذف الطالب'}
              </h3>
              <button onClick={() => setModal(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            {modal === 'delete' ? (
              <div className="space-y-4 p-5">
                <div className="rounded-xl bg-red-50 p-4 text-center">
                  <Trash2 className="mx-auto mb-2 text-red-600" size={28} />
                  <p className="font-bold text-slate-900">هل تريد حذف هذا الطالب؟</p>
                  <p className="mt-1 text-sm text-slate-600">{selectedStudent?.name}</p>
                  <p className="mt-2 text-xs text-red-600">سيتم الحذف من بيانات المعاينة فقط.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setModal(null)} className="h-10 flex-1 rounded-xl border border-slate-200 font-bold text-slate-700">
                    إلغاء
                  </button>
                  <button onClick={deleteStudent} className="h-10 flex-1 rounded-xl bg-red-600 font-bold text-white hover:bg-red-700">
                    تأكيد الحذف
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 p-5">
                <label className="block space-y-1.5">
                  <span className="text-xs font-bold text-slate-700">اسم الطالب</span>
                  <input value={formName} onChange={e => setFormName(e.target.value)} className={smallInput} placeholder="اسم الطالب" />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs font-bold text-slate-700">الرقم الشخصي</span>
                  <input value={formPersonalId} onChange={e => setFormPersonalId(e.target.value)} className={smallInput} placeholder="الرقم الشخصي" />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs font-bold text-slate-700">الصف الدراسي</span>
                  <select value={formGrade} onChange={e => setFormGrade(e.target.value)} className={smallInput}>
                    {grades.map(g => <option key={g}>{g}</option>)}
                  </select>
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs font-bold text-slate-700">رقم الهاتف</span>
                  <input value={formPhone} onChange={e => setFormPhone(e.target.value)} className={smallInput} placeholder="رقم الهاتف" />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs font-bold text-slate-700">الحالة</span>
                  <select value={formStatus} onChange={e => setFormStatus(e.target.value as Student['status'])} className={smallInput}>
                    {statuses.map(s => <option key={s}>{s}</option>)}
                  </select>
                </label>

                <div className="flex gap-2 pt-2">
                  <button onClick={() => setModal(null)} className="h-10 flex-1 rounded-xl border border-slate-200 font-bold text-slate-700">
                    إلغاء
                  </button>
                  <button
                    onClick={saveStudent}
                    disabled={!formName.trim() || !formPersonalId.trim()}
                    className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-teal-700 font-bold text-white hover:bg-teal-800 disabled:opacity-40"
                  >
                    <Check size={16} />
                    {modal === 'add' ? 'إضافة الطالب' : 'حفظ التعديلات'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
