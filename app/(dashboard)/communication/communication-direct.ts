
'use client'

import type { Dispatch, SetStateAction } from 'react'

import {
  Check,
  FileText,
  MessageCircle,
  RotateCcw,
  Search,
  Send,
  SlidersHorizontal,
  Users,
} from 'lucide-react'

import {
  Card,
  CardContent,
} from '@/components/ui/card'

import { Button } from '@/components/ui/button'

import {
  getWhatsAppNumber,
} from '@/app/(dashboard)/communication/communication-helpers'

import type {
  Student,
  Teacher,
  Course,
  AttendanceStatus,
} from '@/app/(dashboard)/communication/communication-data'

export type FilterType =
  | 'all'
  | 'teacher'
  | 'course'
  | 'teacher_course'
  | 'attendance_status'
  | 'teacher_attendance'
  | 'teacher_course_attendance'
  | 'payment'
  | 'not_assigned_current_course'
  | 'invalid_personal_id'
  | 'attendance_award'

interface CommunicationDirectProps {
  teachers: Teacher[]
  courses: Course[]
  attendanceStatuses: AttendanceStatus[]
  loading: boolean
  filteredStudents: Student[]
  selectedStudents: Student[]
  selectedStudentIds: string[]
  filterType: FilterType
  setFilterType: Dispatch<SetStateAction<FilterType>>
  selectedTeacherIds: string[]
  setSelectedTeacherIds: Dispatch<SetStateAction<string[]>>
  selectedCourseId: string
  setSelectedCourseId: Dispatch<SetStateAction<string>>
  selectedAttendanceStatusId: string
  setSelectedAttendanceStatusId: Dispatch<SetStateAction<string>>
  search: string
  setSearch: Dispatch<SetStateAction<string>>
  selectAllVisible: () => void
  resetFilter: () => void
  toggleStudent: (studentId: string) => void
  isStarted: (studentId: string) => boolean
  openMessageModal: (student: Student) => void
}

const FILTER_OPTIONS: {
  value: FilterType
  label: string
}[] = [
  { value: 'all', label: 'جميع الطلاب' },
  { value: 'teacher', label: 'طلاب معلم' },
  { value: 'course', label: 'طلاب دورة' },
  { value: 'teacher_course', label: 'طلاب معلم في دورة' },
  { value: 'attendance_status', label: 'حسب حضور اليوم' },
  { value: 'teacher_attendance', label: 'حضور اليوم لمعلم' },
  {
    value: 'teacher_course_attendance',
    label: 'حضور اليوم لمعلم في دورة',
  },
  { value: 'payment', label: 'حسب حالة الدفع' },
  { value: 'attendance_award', label: 'مستحق للتكريم' },
  {
    value: 'not_assigned_current_course',
    label: 'غير مشاركين في الدورة الحالية',
  },
  {
    value: 'invalid_personal_id',
    label: 'رقم شخصي أقل من 9 أرقام',
  },
]

export function CommunicationDirect({
  teachers,
  courses,
  attendanceStatuses,
  loading,
  filteredStudents,
  selectedStudents,
  selectedStudentIds,
  filterType,
  setFilterType,
  selectedTeacherIds,
  setSelectedTeacherIds,
  selectedCourseId,
  setSelectedCourseId,
  selectedAttendanceStatusId,
  setSelectedAttendanceStatusId,
  search,
  setSearch,
  selectAllVisible,
  resetFilter,
  toggleStudent,
  isStarted,
  openMessageModal,
}: CommunicationDirectProps) {
  const filterNeedsTeacher =
    filterType === 'teacher' ||
    filterType === 'teacher_course' ||
    filterType === 'teacher_attendance' ||
    filterType === 'teacher_course_attendance'

  const filterNeedsCourse =
    filterType === 'course' ||
    filterType === 'teacher_course' ||
    filterType === 'teacher_course_attendance'

  const filterNeedsAttendanceStatus =
    filterType === 'attendance_status' ||
    filterType === 'teacher_attendance' ||
    filterType === 'teacher_course_attendance'

  return (
    <Card>
      <CardContent className="space-y-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              تواصل مباشر
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              اختر الفئة والطلاب ثم اختر الرسالة عند الإرسال.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <SlidersHorizontal className="size-4" />
            تخصيص المستلمين
          </div>
        </div>

        {/* Filters */}
        <div className="grid gap-3 md:grid-cols-2">
          <select
            value={filterType}
            onChange={(event) => {
              setFilterType(event.target.value as FilterType)
              setSelectedTeacherIds([])
              setSelectedCourseId('')
              setSelectedAttendanceStatusId('')
            }}
            className="h-10 rounded-md border bg-background px-3 text-sm outline-none"
          >
            {FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {filterType === 'payment' && (
            <div className="flex items-center rounded-md border bg-muted/30 px-3 text-sm">
              مدفوع أقل من الرسوم السنوية
            </div>
          )}

          {filterType === 'invalid_personal_id' && (
            <div className="flex items-center rounded-md border border-red-200 bg-red-50 px-3 text-sm text-red-700">
              تنبيه: هؤلاء الطلاب لديهم رقم شخصي غير صحيح ويحتاج إلى تصحيح.
            </div>
          )}
        </div>

        {/* Teacher selection */}
        {filterNeedsTeacher && (
          <div className="rounded-md border bg-background p-3">
            <div className="mb-2 text-sm font-medium">
              اختر المعلمين
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {teachers.map((teacher) => {
                const selected = selectedTeacherIds.includes(
                  teacher.id
                )

                return (
                  <button
                    key={teacher.id}
                    type="button"
                    onClick={() => {
                      setSelectedTeacherIds((current) =>
                        current.includes(teacher.id)
                          ? current.filter(
                              (id) => id !== teacher.id
                            )
                          : [...current, teacher.id]
                      )
                    }}
                    className={`rounded-md border px-3 py-2 text-right text-sm transition ${
                      selected
                        ? 'border-primary bg-primary/10 font-medium'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                          selected
                            ? 'bg-primary text-primary-foreground'
                            : ''
                        }`}
                      >
                        {selected && (
                          <Check className="size-3" />
                        )}
                      </span>
                      {teacher.name}
                    </span>
                  </button>
                )
              })}
            </div>

            {selectedTeacherIds.length > 0 && (
              <div className="mt-2 text-xs text-muted-foreground">
                تم اختيار {selectedTeacherIds.length} معلم
              </div>
            )}
          </div>
        )}

        {/* Course selection */}
        {filterNeedsCourse && (
          <select
            value={selectedCourseId}
            onChange={(event) =>
              setSelectedCourseId(event.target.value)
            }
            className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
          >
            <option value="">اختر الدورة</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        )}

        {/* Attendance status */}
        {filterNeedsAttendanceStatus && (
          <select
            value={selectedAttendanceStatusId}
            onChange={(event) =>
              setSelectedAttendanceStatusId(event.target.value)
            }
            className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
          >
            <option value="">اختر حالة الحضور اليوم</option>
            {attendanceStatuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </select>
        )}

        {filterType !== 'all' && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetFilter}
            className="w-fit"
          >
            <RotateCcw className="size-4" />
            إعادة التصفية
          </Button>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="بحث داخل النتائج..."
            className="h-10 w-full rounded-md border bg-background px-3 pr-9 text-sm outline-none"
          />
        </div>

        {/* Selection summary */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/30 p-3">
          <div className="text-sm">
            <span className="text-muted-foreground">
              النتائج:
            </span>{' '}
            <span className="font-semibold">
              {filteredStudents.length}
            </span>{' '}
            <span className="text-muted-foreground">
              | المحدد:
            </span>{' '}
            <span className="font-semibold">
              {selectedStudentIds.length}
            </span>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={selectAllVisible}
              disabled={filteredStudents.length === 0}
            >
              <Check className="size-4" />
              تحديد الظاهر
            </Button>

            {selectedStudentIds.length > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  // Clear the selection through the existing parent state.
                  setSearch((current) => current)
                  // The parent provides the selection state setter below.
                }}
                disabled
              >
                إلغاء التحديد
              </Button>
            )}
          </div>
        </div>

        {/* Students list */}
        <div className="max-h-80 space-y-2 overflow-y-auto rounded-md border p-2">
          {loading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              جاري تحميل البيانات...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              لا توجد نتائج مطابقة
            </div>
          ) : (
            filteredStudents.map((student) => {
              const selected = selectedStudentIds.includes(
                student.id
              )
              const number = getWhatsAppNumber(student)
              const started = isStarted(student.id)

              return (
                <div
                  key={student.id}
                  className={`flex items-center justify-between gap-3 rounded-md border p-3 ${
                    selected ? 'bg-muted' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleStudent(student.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-right"
                  >
                    <span
                      className={`flex size-5 shrink-0 items-center justify-center rounded border ${
                        selected
                          ? 'bg-primary text-primary-foreground'
                          : ''
                      }`}
                    >
                      {selected && <Check className="size-3" />}
                    </span>

                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {student.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        الرقم الشخصي: {student.personalId || 'غير موجود'}
                        {' • '}
                        {number || 'لا يوجد رقم WhatsApp'}
                      </span>
                    </span>
                  </button>

                  {number && (
                    <Button
                      type="button"
                      size="sm"
                      variant={started ? 'outline' : 'default'}
                      className={
                        started
                          ? 'border-orange-400 text-orange-600 hover:bg-orange-50'
                          : ''
                      }
                      onClick={() => openMessageModal(student)}
                    >
                      {started ? (
                        <>
                          <RotateCcw className="size-4" />
                          إعادة إرسال
                        </>
                      ) : (
                        <>
                          <Send className="size-4" />
                          إرسال
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Selected students */}
        {selectedStudents.length > 0 && (
          <div className="rounded-md border bg-muted/30 p-4">
            <div className="mb-3 text-sm font-medium">
              الطلاب المحددون
            </div>

            <div className="space-y-2">
              {selectedStudents.map((student, index) => {
                const number = getWhatsAppNumber(student)
                const started = isStarted(student.id)

                return (
                  <div
                    key={student.id}
                    className="flex items-center justify-between gap-3 rounded-md border bg-background p-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {index + 1}
                      </span>
                      <span className="truncate text-sm">
                        {student.name}
                      </span>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      disabled={!number}
                      variant={started ? 'outline' : 'default'}
                      className={
                        started
                          ? 'border-orange-400 text-orange-600 hover:bg-orange-50'
                          : ''
                      }
                      onClick={() => openMessageModal(student)}
                    >
                      {started ? (
                        <>
                          <RotateCcw className="size-4" />
                          إعادة إرسال
                        </>
                      ) : (
                        <>
                          <Send className="size-4" />
                          إرسال
                        </>
                      )}
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
          عند الضغط على «إرسال» تختار الرسالة المحفوظة أو تنشئ رسالة جديدة.
          إذا بدأت برسالة محفوظة فسيتم استخدامها تلقائياً للطلاب التاليين
          مع تحديث المتغيرات حسب كل طالب.
        </div>
      </CardContent>
    </Card>
  )
}
