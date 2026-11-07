
'use client'

import { useMemo, useState, type ReactNode } from 'react'
import {
  Search,
  SlidersHorizontal,
  Filter,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'

export type DataTableColumn<T> = {
  id: string
  header: string
  accessor: (row: T) => unknown
  render?: (value: unknown, row: T) => ReactNode
  sortable?: boolean
  filterable?: boolean
  hideable?: boolean
  filterOptions?: string[]
  className?: string
}

type DataTableProps<T> = {
  columns: DataTableColumn<T>[]
  data: T[]
  getRowId: (row: T) => string | number
  pageSize?: number
  searchable?: boolean
  selectable?: boolean
  emptyMessage?: string
}

export function DataTable<T>({
  columns,
  data,
  getRowId,
  pageSize = 10,
  searchable = true,
  selectable = true,
  emptyMessage = 'لا توجد بيانات',
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Record<string, string[]>>({})
  const [draftFilters, setDraftFilters] = useState<Record<string, string[]>>({})
  const [sort, setSort] = useState<{
    column: string
    direction: 'asc' | 'desc'
  } | null>(null)

  const [visibleColumns, setVisibleColumns] = useState(
    columns.map((column) => column.id)
  )
  const [selectedRows, setSelectedRows] = useState<(string | number)[]>([])
  const [page, setPage] = useState(1)
  const [openFilter, setOpenFilter] = useState<string | null>(null)
  const [filterSearch, setFilterSearch] = useState('')

  const activeColumns = columns.filter((column) =>
    visibleColumns.includes(column.id)
  )

  const filteredData = useMemo(() => {
    let result = data.filter((row) => {
      const matchesSearch =
        !search.trim() ||
        columns.some((column) =>
          String(column.accessor(row) ?? '')
            .toLowerCase()
            .includes(search.trim().toLowerCase())
        )

      const matchesFilters = columns.every((column) => {
        const selected = filters[column.id]
        if (!selected?.length) return true

        return selected.includes(
          String(column.accessor(row) ?? '')
        )
      })

      return matchesSearch && matchesFilters
    })

    if (sort) {
      const column = columns.find(
        (item) => item.id === sort.column
      )

      if (column) {
        result = [...result].sort((a, b) => {
          const first = column.accessor(a)
          const second = column.accessor(b)

          const comparison =
            typeof first === 'number' &&
            typeof second === 'number'
              ? first - second
              : String(first ?? '').localeCompare(
                  String(second ?? ''),
                  'ar',
                  { numeric: true }
                )

          return sort.direction === 'asc'
            ? comparison
            : -comparison
        })
      }
    }

    return result
  }, [data, columns, search, filters, sort])

  const totalPages = Math.max(
    1,
    Math.ceil(filteredData.length / Math.max(1, pageSize))
  )

  const currentPage = Math.min(page, totalPages)

  const pageData = filteredData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const toggleSort = (id: string) => {
    setSort((current) => {
      if (current?.column !== id) {
        return { column: id, direction: 'asc' }
      }

      if (current.direction === 'asc') {
        return { column: id, direction: 'desc' }
      }

      return null
    })

    setPage(1)
  }

  // تغيير الاختيارات المؤقتة داخل نافذة الفلتر
  const toggleDraftFilter = (
    columnId: string,
    value: string
  ) => {
    setDraftFilters((current) => {
      const selected = current[columnId] ?? []

      const next = selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value]

      return {
        ...current,
        [columnId]: next,
      }
    })
  }

  // فتح الفلتر مع تحميل الاختيارات المطبقة سابقاً
  const openColumnFilter = (columnId: string) => {
    setDraftFilters((current) => ({
      ...current,
      [columnId]: [...(filters[columnId] ?? [])],
    }))

    setFilterSearch('')
    setOpenFilter(columnId)
  }

  // تطبيق اختيارات الفلتر
  const applyColumnFilter = (columnId: string) => {
    setFilters((current) => {
      const selected = draftFilters[columnId] ?? []

      if (selected.length === 0) {
        const next = { ...current }
        delete next[columnId]
        return next
      }

      return {
        ...current,
        [columnId]: selected,
      }
    })

    setPage(1)
    setOpenFilter(null)
  }

  // مسح فلتر العمود
  const clearColumnFilter = (columnId: string) => {
    setFilters((current) => {
      const next = { ...current }
      delete next[columnId]
      return next
    })

    setDraftFilters((current) => ({
      ...current,
      [columnId]: [],
    }))

    setPage(1)
    setOpenFilter(null)
  }

  const toggleRow = (id: string | number) => {
    setSelectedRows((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    )
  }

  const pageIds = pageData.map(getRowId)

  const allSelected =
    pageIds.length > 0 &&
    pageIds.every((id) => selectedRows.includes(id))

  const toggleAll = () => {
    setSelectedRows((current) =>
      allSelected
        ? current.filter((id) => !pageIds.includes(id))
        : Array.from(new Set([...current, ...pageIds]))
    )
  }

  const hasActiveFilters = Object.values(filters).some(
    (items) => items.length > 0
  )

  return (
    <div dir="rtl" className="w-full space-y-3">

      {/* البحث وتخصيص الأعمدة */}
      <div className="flex flex-wrap items-center justify-between gap-3">

        {searchable && (
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="بحث في الجدول..."
              className="h-10 w-full rounded-lg border border-gray-200 bg-white pr-9 pl-3 text-sm outline-none focus:border-teal-600"
            />
          </div>
        )}

        {/* تخصيص الأعمدة */}
        <details className="relative">
          <summary className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-600">
            <SlidersHorizontal size={16} />
            الأعمدة
          </summary>

          <div className="absolute left-0 top-11 z-40 max-h-72 w-52 overflow-y-auto rounded-xl border bg-white p-3 shadow-xl">
            {columns.map((column) => (
              <label
                key={column.id}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={visibleColumns.includes(column.id)}
                  disabled={
                    column.hideable === false ||
                    (visibleColumns.length === 1 &&
                      visibleColumns.includes(column.id))
                  }
                  onChange={() =>
                    setVisibleColumns((current) =>
                      current.includes(column.id)
                        ? current.filter(
                            (id) => id !== column.id
                          )
                        : [...current, column.id]
                    )
                  }
                  className="accent-teal-600"
                />

                {column.header}
              </label>
            ))}

            <button
              type="button"
              onClick={() =>
                setVisibleColumns(
                  columns.map((column) => column.id)
                )
              }
              className="mt-2 w-full border-t pt-2 text-xs text-teal-700"
            >
              إظهار جميع الأعمدة
            </button>
          </div>
        </details>

        {/* مسح جميع الفلاتر */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setFilters({})
              setDraftFilters({})
              setPage(1)
            }}
            className="text-xs text-teal-700 hover:text-teal-900"
          >
            مسح جميع الفلاتر
          </button>
        )}
      </div>

      {/* الجدول */}
      <div
        dir="ltr"
        className="w-full overflow-auto rounded-xl border border-gray-200 bg-white"
      >
        <table
          dir="rtl"
          className="w-full min-w-max border-collapse text-right text-sm"
        >
          <thead className="sticky top-0 z-20 bg-gray-50">
            <tr className="border-b border-gray-200">

              {selectable && (
                <th className="sticky right-0 z-30 bg-gray-50 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="تحديد جميع صفوف الصفحة"
                    className="accent-teal-600"
                  />
                </th>
              )}

              {activeColumns.map((column) => {
                const selected = filters[column.id] ?? []

                const options =
                  column.filterOptions ??
                  Array.from(
                    new Set(
                      data.map((row) =>
                        String(column.accessor(row) ?? '')
                      )
                    )
                  )

                const draftSelected =
                  draftFilters[column.id] ?? []

                return (
                  <th
                    key={column.id}
                    className={`relative whitespace-nowrap bg-gray-50 px-4 py-3 font-semibold text-gray-700 ${column.className ?? ''}`}
                  >
                    <div className="flex items-center gap-2">

                      {/* الترتيب */}
                      {column.sortable !== false ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(column.id)}
                          className="flex items-center gap-1.5 hover:text-teal-700"
                        >
                          {column.header}

                          {sort?.column === column.id ? (
                            sort.direction === 'asc' ? (
                              <ChevronUp size={14} />
                            ) : (
                              <ChevronDown size={14} />
                            )
                          ) : (
                            <ChevronDown
                              size={13}
                              className="text-gray-300"
                            />
                          )}
                        </button>
                      ) : (
                        column.header
                      )}

                      {/* الفلترة متعددة الخيارات */}
                      {column.filterable !== false && (
                        <div className="relative">

                          <button
                            type="button"
                            onClick={() => {
                              if (openFilter === column.id) {
                                setOpenFilter(null)
                              } else {
                                openColumnFilter(column.id)
                              }
                            }}
                            className={`rounded p-1 hover:bg-gray-200 ${
                              selected.length
                                ? 'text-teal-700'
                                : 'text-gray-400'
                            }`}
                            aria-label={`فلترة ${column.header}`}
                          >
                            <Filter size={14} />

                            {selected.length > 0 && (
                              <span className="mr-1 text-[10px]">
                                {selected.length}
                              </span>
                            )}
                          </button>

                          {openFilter === column.id && (
                            <>
                              <div
                                className="fixed inset-0 z-30"
                                onClick={() => setOpenFilter(null)}
                              />

                              <div className="absolute right-0 top-8 z-40 w-64 rounded-xl border border-gray-200 bg-white p-3 text-right font-normal shadow-xl">

                                <div className="mb-3 flex items-center justify-between">
                                  <span className="text-xs font-semibold">
                                    فلترة: {column.header}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() => setOpenFilter(null)}
                                    aria-label="إغلاق الفلتر"
                                  >
                                    <X size={15} />
                                  </button>
                                </div>

                                {/* البحث في الخيارات */}
                                <input
                                  value={filterSearch}
                                  onChange={(e) =>
                                    setFilterSearch(e.target.value)
                                  }
                                  placeholder="ابحث في الخيارات..."
                                  className="mb-2 h-9 w-full rounded-md border px-2 text-xs outline-none focus:border-teal-600"
                                />

                                {/* الخيارات */}
                                <div className="max-h-48 space-y-1 overflow-y-auto">

                                  {options
                                    .filter((value) =>
                                      value
                                        .toLowerCase()
                                        .includes(
                                          filterSearch.toLowerCase()
                                        )
                                    )
                                    .map((value) => (
                                      <label
                                        key={value}
                                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-xs hover:bg-gray-50"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={draftSelected.includes(value)}
                                          onChange={() =>
                                            toggleDraftFilter(
                                              column.id,
                                              value
                                            )
                                          }
                                          className="accent-teal-600"
                                        />

                                        <span>
                                          {value || 'فارغ'}
                                        </span>
                                      </label>
                                    ))}

                                  {options.filter((value) =>
                                    value
                                      .toLowerCase()
                                      .includes(
                                        filterSearch.toLowerCase()
                                      )
                                  ).length === 0 && (
                                    <p className="py-4 text-center text-xs text-gray-400">
                                      لا توجد خيارات
                                    </p>
                                  )}
                                </div>

                                {/* أزرار عامة للفلتر */}
                                <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">

                                  <button
                                    type="button"
                                    onClick={() =>
                                      clearColumnFilter(column.id)
                                    }
                                    className="text-xs text-gray-500 hover:text-red-600"
                                  >
                                    مسح
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      applyColumnFilter(column.id)
                                    }
                                    className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-medium text-white hover:bg-teal-800"
                                  >
                                    تطبيق
                                  </button>
                                </div>

                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td
                  colSpan={
                    activeColumns.length + (selectable ? 1 : 0)
                  }
                  className="px-4 py-12 text-center text-gray-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pageData.map((row) => {
                const id = getRowId(row)
                const isSelected = selectedRows.includes(id)

                return (
                  <tr
                    key={id}
                    className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 ${
                      isSelected ? 'bg-teal-50' : ''
                    }`}
                  >
                    {selectable && (
                      <td
                        className={`sticky right-0 z-10 px-3 py-3 ${
                          isSelected
                            ? 'bg-teal-50'
                            : 'bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(id)}
                          aria-label="تحديد الصف"
                          className="accent-teal-600"
                        />
                      </td>
                    )}

                    {activeColumns.map((column) => {
                      const value = column.accessor(row)

                      return (
                        <td
                          key={column.id}
                          className={`whitespace-nowrap px-4 py-3 text-gray-700 ${column.className ?? ''}`}
                        >
                          {column.render
                            ? column.render(value, row)
                            : String(value ?? '—')}
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ترقيم الصفحات */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">

        <span>
          عرض{' '}
          {filteredData.length === 0
            ? 0
            : (currentPage - 1) * pageSize + 1}
          {' - '}
          {Math.min(
            currentPage * pageSize,
            filteredData.length
          )}
          {' من '}
          {filteredData.length} سجل

          {selectable && selectedRows.length > 0 && (
            <span className="mr-2 text-teal-700">
              · تم تحديد {selectedRows.length}
            </span>
          )}
        </span>

        <div className="flex items-center gap-2">

          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() =>
              setPage((value) => Math.max(1, value - 1))
            }
            className="rounded-md border p-1.5 disabled:opacity-30"
            aria-label="الصفحة السابقة"
          >
            <ChevronRight size={16} />
          </button>

          <span className="min-w-16 text-center tabular-nums">
            {currentPage} / {totalPages}
          </span>

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() =>
              setPage((value) =>
                Math.min(totalPages, value + 1)
              )
            }
            className="rounded-md border p-1.5 disabled:opacity-30"
            aria-label="الصفحة التالية"
          >
            <ChevronLeft size={16} />
          </button>

        </div>
      </div>
    </div>
  )
}
