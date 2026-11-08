
'use client'

import { useMemo, useState, type ReactNode } from 'react'
import {
  Search,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

export type DataTableColumn<T> = {
  id: string
  header: string
  accessor: (row: T) => unknown
  render?: (value: unknown, row: T) => ReactNode
  sortable?: boolean
  filterable?: boolean
  filterType?: 'text' | 'multi-select'
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

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

export function DataTable<T>({
  columns,
  data,
  getRowId,
  pageSize = 50,
  searchable = true,
  emptyMessage = 'لا توجد بيانات',
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Record<string, string[]>>({})
  const [textFilters, setTextFilters] = useState<Record<string, string>>({})
  const [sort, setSort] = useState<{
    column: string
    direction: 'asc' | 'desc'
  } | null>(null)

  const [visibleColumns, setVisibleColumns] = useState(
    columns.map((column) => column.id)
  )
  const [selectedRow, setSelectedRow] = useState<string | number | null>(null)
  const [page, setPage] = useState(1)

  const initialPageSize = Math.min(
    100,
    Math.max(10, PAGE_SIZE_OPTIONS.includes(pageSize) ? pageSize : 50)
  )

  const [rowsPerPage, setRowsPerPage] = useState(initialPageSize)

  const safePageSize = Math.min(100, Math.max(10, rowsPerPage))

  const activeColumns = columns.filter((column) =>
    visibleColumns.includes(column.id)
  )

  const filteredData = useMemo(() => {
    let result = data.filter((row) => {
      const matchesSearch =
        !search.trim() ||
        columns.some((column) =>
          String(column.accessor(row) ?? '')
            .toLocaleLowerCase('ar')
            .includes(search.trim().toLocaleLowerCase('ar'))
        )

      const matchesColumnFilters = columns.every((column) => {
        if (column.filterable === false) return true

        const value = String(column.accessor(row) ?? '')
        const type = column.filterType ?? 'multi-select'

        if (type === 'text') {
          const query = textFilters[column.id]
            ?.trim()
            .toLocaleLowerCase('ar')

          return !query || value.toLocaleLowerCase('ar').includes(query)
        }

        const selected = filters[column.id] ?? []
        return selected.length === 0 || selected.includes(value)
      })

      return matchesSearch && matchesColumnFilters
    })

    if (sort) {
      const column = columns.find((item) => item.id === sort.column)

      if (column) {
        result = [...result].sort((a, b) => {
          const first = column.accessor(a)
          const second = column.accessor(b)

          const comparison =
            typeof first === 'number' && typeof second === 'number'
              ? first - second
              : String(first ?? '').localeCompare(
                  String(second ?? ''),
                  'ar',
                  { numeric: true }
                )

          return sort.direction === 'asc' ? comparison : -comparison
        })
      }
    }

    return result
  }, [data, columns, search, filters, textFilters, sort])

  const totalPages = Math.max(
    1,
    Math.ceil(filteredData.length / safePageSize)
  )

  const currentPage = Math.min(page, totalPages)

  const pageData = filteredData.slice(
    (currentPage - 1) * safePageSize,
    currentPage * safePageSize
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

  const toggleFilterOption = (columnId: string, value: string) => {
    setFilters((current) => {
      const selected = current[columnId] ?? []
      const next = selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value]

      return { ...current, [columnId]: next }
    })

    setPage(1)
  }

  const clearColumnFilter = (column: DataTableColumn<T>) => {
    if (column.filterType === 'text') {
      setTextFilters((current) => {
        const next = { ...current }
        delete next[column.id]
        return next
      })
    } else {
      setFilters((current) => {
        const next = { ...current }
        delete next[column.id]
        return next
      })
    }

    setPage(1)
  }

  const clearAllFilters = () => {
    setFilters({})
    setTextFilters({})
    setSearch('')
    setPage(1)
  }

  const hasActiveFilters =
    search.trim().length > 0 ||
    Object.values(filters).some((items) => items.length > 0) ||
    Object.values(textFilters).some((value) => value.trim().length > 0)

  return (
    <div dir="rtl" className="w-full space-y-3 text-sm">
      {/* البحث وتخصيص الأعمدة */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {searchable && (
          <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="بحث في الجدول..."
              className="h-9 w-full rounded-md border border-gray-200 bg-white pr-9 pl-3 text-xs outline-none transition focus:border-teal-600"
            />
          </div>
        )}

        <div className="flex items-center gap-3">
          <details className="relative">
            <summary className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-md border border-gray-200 bg-white px-3 text-xs text-gray-600 hover:bg-gray-50">
              <SlidersHorizontal size={15} />
              تخصيص الأعمدة
            </summary>

            <div className="absolute right-0 top-10 z-50 max-h-72 w-52 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
              {columns.map((column) => (
                <label
                  key={column.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-xs hover:bg-gray-50"
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
                          ? current.filter((id) => id !== column.id)
                          : [...current, column.id]
                      )
                    }
                    className="accent-teal-700"
                  />
                  {column.header}
                </label>
              ))}

              <button
                type="button"
                onClick={() =>
                  setVisibleColumns(columns.map((column) => column.id))
                }
                className="mt-1 w-full border-t border-gray-100 pt-2 text-xs text-teal-700"
              >
                إظهار جميع الأعمدة
              </button>
            </div>
          </details>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs text-gray-500 hover:text-red-600"
            >
              مسح الفلاتر
            </button>
          )}
        </div>
      </div>

    
      {/* الجدول */}
      <div
        dir="ltr"
        className="max-h-[70vh] w-full overflow-auto rounded-lg border border-gray-200 bg-white"
        style={{
          direction: 'ltr',
          scrollbarGutter: 'stable',
        }}
      >
        <div dir="rtl" style={{ direction: 'rtl' }}>
          <table
            dir="rtl"
            className="w-full min-w-max border-collapse text-right text-xs"
          >
            <thead className="text-gray-700">
              <tr className="bg-gray-50">
                <th className="sticky right-0 top-0 z-40 w-14 min-w-14 border-b border-gray-200 bg-gray-50 px-3 py-3 text-center font-semibold">
                  م
                </th>

                {activeColumns.map((column) => (
                  <th
                    key={column.id}
                    className={`sticky top-0 z-30 whitespace-nowrap border-b border-gray-200 bg-gray-50 px-3 py-3 font-semibold ${column.className ?? ''}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{column.header}</span>

                      {column.sortable !== false && (
                        <button
                          type="button"
                          onClick={() => toggleSort(column.id)}
                          className="text-gray-400 hover:text-teal-700"
                          aria-label={`ترتيب ${column.header}`}
                        >
                          {sort?.column === column.id ? (
                            sort.direction === 'asc' ? (
                              <ChevronUp size={13} />
                            ) : (
                              <ChevronDown size={13} />
                            )
                          ) : (
                            <ChevronDown size={13} />
                          )}
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>

              {/* الفلاتر داخل رأس كل عمود */}
              <tr className="bg-white">
                <th className="sticky right-0 top-[38px] z-40 border-b border-gray-200 bg-white px-2 py-2" />

                {activeColumns.map((column) => {
                  const type = column.filterType ?? 'multi-select'

                  const options =
                    column.filterOptions ??
                    Array.from(
                      new Set(
                        data.map((row) =>
                          String(column.accessor(row) ?? '')
                        )
                      )
                    )

                  const selected = filters[column.id] ?? []
                  const textValue = textFilters[column.id] ?? ''

                  return (
                    <th
                      key={column.id}
                      className={`sticky top-[38px] z-20 min-w-[145px] border-b border-gray-200 bg-white px-2 py-2 ${column.className ?? ''}`}
                    >
                      {column.filterable === false ? null : type === 'text' ? (
                        <div className="relative">
                          <input
                            value={textValue}
                            onChange={(event) => {
                              setTextFilters((current) => ({
                                ...current,
                                [column.id]: event.target.value,
                              }))
                              setPage(1)
                            }}
                            placeholder="تصفية..."
                            className={`h-8 w-full rounded border px-2 text-[11px] font-normal outline-none focus:border-teal-600 ${
                              textValue
                                ? 'border-teal-500 bg-teal-50/40'
                                : 'border-gray-200 bg-white'
                            }`}
                          />

                          {textValue && (
                            <button
                              type="button"
                              onClick={() => clearColumnFilter(column)}
                              className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-600"
                              aria-label={`مسح فلتر ${column.header}`}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ) : (
                        <details className="relative font-normal">
                          <summary
                            className={`flex h-8 cursor-pointer list-none items-center justify-between gap-2 rounded border px-2 text-[11px] ${
                              selected.length
                                ? 'border-teal-500 bg-teal-50/40 text-teal-800'
                                : 'border-gray-200 bg-white text-gray-500'
                            }`}
                          >
                            <span>
                              {selected.length
                                ? `تم اختيار ${selected.length}`
                                : 'الكل'}
                            </span>
                            <ChevronDown size={12} />
                          </summary>

                          <div className="absolute right-0 top-9 z-50 max-h-56 w-48 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 text-right shadow-xl">
                            {options.map((option) => (
                              <label
                                key={option}
                                className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-xs font-normal hover:bg-gray-50"
                              >
                                <input
                                  type="checkbox"
                                  checked={selected.includes(option)}
                                  onChange={() =>
                                    toggleFilterOption(column.id, option)
                                  }
                                  className="accent-teal-700"
                                />
                                <span>{option || 'فارغ'}</span>
                              </label>
                            ))}

                            {options.length === 0 && (
                              <p className="py-3 text-center text-xs text-gray-400">
                                لا توجد خيارات
                              </p>
                            )}

                            {selected.length > 0 && (
                              <button
                                type="button"
                                onClick={() => clearColumnFilter(column)}
                                className="mt-1 w-full border-t border-gray-100 py-2 text-xs text-red-600"
                              >
                                مسح التصفية
                              </button>
                            )}
                          </div>
                        </details>
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>

            <tbody>
              {pageData.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeColumns.length + 1}
                    className="px-4 py-12 text-center text-gray-400"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                pageData.map((row, index) => {
                  const id = getRowId(row)
                  const isSelected = selectedRow === id
                  const serial =
                    (currentPage - 1) * safePageSize + index + 1

                  return (
                    <tr
                      key={id}
                      onClick={() =>
                        setSelectedRow(isSelected ? null : id)
                      }
                      className={`cursor-pointer border-b border-gray-100 transition-colors last:border-0 ${
                        isSelected
                          ? 'bg-teal-50'
                          : 'bg-white hover:bg-gray-50'
                      }`}
                    >
                      <td
                        className={`sticky right-0 z-10 w-14 min-w-14 px-3 py-3 text-center tabular-nums ${
                          isSelected ? 'bg-teal-50' : 'bg-white'
                        }`}
                      >
                        {serial}
                      </td>

                      {activeColumns.map((column) => {
                        const value = column.accessor(row)

                        return (
                          <td
                            key={column.id}
                            className={`whitespace-nowrap px-3 py-3 text-gray-700 ${column.className ?? ''}`}
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
      </div>

      {/* معلومات النتائج والتحكم بعدد الصفوف والتنقل */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
        <div className="flex flex-wrap items-center gap-3">
          <span>
            عرض{' '}
            {filteredData.length === 0
              ? 0
              : (currentPage - 1) * safePageSize + 1}
            {' - '}
            {Math.min(currentPage * safePageSize, filteredData.length)}
            {' من '}
            {filteredData.length} سجل
          </span>

          <div className="flex items-center gap-2">
            <label htmlFor="data-table-page-size">عدد الصفوف:</label>
            <select
              id="data-table-page-size"
              value={safePageSize}
              onChange={(event) => {
                setRowsPerPage(
                  Math.min(100, Math.max(10, Number(event.target.value)))
                )
                setPage(1)
              }}
              className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-700 outline-none focus:border-teal-600"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            className="rounded border border-gray-200 p-1.5 hover:bg-gray-50 disabled:opacity-30"
            aria-label="الصفحة السابقة"
          >
            <ChevronRight size={15} />
          </button>

          <span className="min-w-16 text-center tabular-nums">
            {currentPage} / {totalPages}
          </span>

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() =>
              setPage((value) => Math.min(totalPages, value + 1))
            }
            className="rounded border border-gray-200 p-1.5 hover:bg-gray-50 disabled:opacity-30"
            aria-label="الصفحة التالية"
          >
            <ChevronLeft size={15} />
          </button>
        </div>
      </div>
