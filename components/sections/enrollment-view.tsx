'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, Check, Eye, Filter, ShieldCheck, X } from 'lucide-react'

import { academicGrades, enrollmentRequests, students, type EnrollmentRequest, type Student } from '@/lib/data'
import { PageHeader } from '@/components/dashboard/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type RegistrationSettings = {
  registrationOpen: boolean
  requirePersonalId: boolean
  requireGrade: boolean
  requireNotes: boolean
  requireChronicDiseases: boolean
  personalIdStartsWith: string
  personalIdLength: string
}

type ColumnKey = 'id' | 'name' | 'grade' | 'guardian' | 'phone' | 'submittedAt' | 'status'

const initialSettings: RegistrationSettings = {
  registrationOpen: true,
  requirePersonalId: true,
  requireGrade: true,
  requireNotes: false,
  requireChronicDiseases: false,
  personalIdStartsWith: '',
  personalIdLength: '',
}

function getRequestPersonalId(request: EnrollmentRequest) {
  return (request as EnrollmentRequest & { personalId?: string }).personalId ?? ''
}

function hasSpecialInformation(request: EnrollmentRequest, settings: RegistrationSettings) {
  const hasDisease =
    settings.requireChronicDiseases &&
    request.chronicDiseases.trim() !== '' &&
    request.chronicDiseases.trim() !== 'لا يوجد'

  const hasNotes =
    settings.requireNotes &&
    request.notes.trim() !== ''

  return hasDisease || hasNotes
}

function getStatusVariant(status: EnrollmentRequest['status']) {
  if (status === 'مقبول') return 'success'
  if (status === 'مرفوض') return 'danger'
  return 'warning'
}

export function EnrollmentView() {
  const [requests, setRequests] = useState<EnrollmentRequest[]>(enrollmentRequests)
  const [settings, setSettings] = useState<RegistrationSettings>(initialSettings)
  const [selectedRequest, setSelectedRequest] = useState<EnrollmentRequest | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<Record<ColumnKey, string>>({
    id: '',
    name: '',
    grade: '',
    guardian: '',
    phone: '',
    submittedAt: '',
    status: '',
  })

  const pendingRequests = requests.filter((request) => request.status === 'قيد المراجعة')
  const specialRequests = pendingRequests.filter((request) => hasSpecialInformation(request, settings))

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      return (
        request.id.toLowerCase().includes(filters.id.toLowerCase()) &&
        request.name.toLowerCase().includes(filters.name.toLowerCase()) &&
        request.grade.toLowerCase().includes(filters.grade.toLowerCase()) &&
        request.guardian.toLowerCase().includes(filters.guardian.toLowerCase()) &&
        request.phone.toLowerCase().includes(filters.phone.toLowerCase()) &&
        request.submittedAt.toLowerCase().includes(filters.submittedAt.toLowerCase()) &&
        request.status.toLowerCase().includes(filters.status.toLowerCase())
      )
    })
  }, [requests, filters])

  function updateSetting<K extends keyof RegistrationSettings>(
    key: K,
    value: RegistrationSettings[K],
  ) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function updateFilter(key: ColumnKey, value: string) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function clearFilters() {
    setFilters({
      id: '',
      name: '',
      grade: '',
      guardian: '',
      phone: '',
      submittedAt: '',
      status: '',
    })
  }

  function canApprove(request: EnrollmentRequest) {
    if (!settings.registrationOpen) return false

    const personalId = getRequestPersonalId(request)

    if (settings.requirePersonalId && !personalId.trim()) return false
    if (settings.requireGrade && !request.grade.trim()) return false

    if (
      settings.personalIdStartsWith &&
      personalId &&
      !personalId.startsWith(settings.personalIdStartsWith)
    ) {
      return false
    }

    if (
      settings.personalIdLength &&
      personalId &&
      personalId.length !== Number(settings.personalIdLength)
    ) {
      return false
    }

    if (hasSpecialInformation(request, settings)) return false

    const duplicate = students.some(
      (student) =>
        student.name.trim() === request.name.trim() ||
        (request.phone.trim() !== '' && student.phone === request.phone),
    )

    if (duplicate) return false

    return true
  }

  function approveRequest(request: EnrollmentRequest) {
    if (!canApprove(request)) return

    const newStudent: Student = {
      id: `ST-${Date.now()}`,
      name: request.name,
      personalId: getRequestPersonalId(request),
      grade: request.grade,
      phone: request.phone,
      whatsapp: request.phone,
      paymentStatus: 'غير مدفوع',
      amountDue: 0,
      amountPaid: 0,
      chronicDiseases: request.chronicDiseases || 'لا يوجد',
      notes: request.notes || '',
    }

    students.push(newStudent)

    setRequests((current) =>
      current.map((item) =>
        item.id === request.id
          ? { ...item, status: 'مقبول' }
          : item,
      ),
    )

    setSelectedRequest(null)
  }

  function rejectRequest(request: EnrollmentRequest) {
    const confirmed = window.confirm(`هل تريد رفض طلب التسجيل الخاص بـ ${request.name}؟`)
    if (!confirmed) return

    setRequests((current) =>
      current.map((item) =>
        item.id === request.id
          ? { ...item, status: 'مرفوض' }
          : item,
      ),
    )

    setSelectedRequest(null)
  }

  return (
    <>
      <PageHeader
        title="طلبات التسجيل"
        description="مراجعة طلبات التسجيل والتحكم في بيانات التسجيل المطلوبة."
      />

      <div className="space-y-6">
        {/* Registration Settings */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>إعدادات التسجيل</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  حدد البيانات التي يجب على المتقدم إدخالها عند التسجيل.
                </p>
              </div>

              <button
                type="button"
                onClick={() => updateSetting('registrationOpen', !settings.registrationOpen)}
                className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition ${
                  settings.registrationOpen
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    settings.registrationOpen ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                />
                التسجيل {settings.registrationOpen ? 'مفتوح' : 'موقوف'}
              </button>
            </div>
          </CardHeader>

          <CardContent>
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Personal ID */}
              <div className="rounded-xl border p-4">
                <div className="flex items-center justify-between gap-3">
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.requirePersonalId}
                      onChange={(event) =>
                        updateSetting('requirePersonalId', event.target.checked)
                      }
                      className="h-4 w-4 rounded"
                    />
                    <span className="font-medium">الرقم الأكاديمي</span>
                  </label>

                  <span className="text-xs text-muted-foreground">مطلوب</span>
                </div>

                {settings.requirePersonalId && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs text-muted-foreground">
                        يبدأ بـ
                      </label>
                      <input
                        value={settings.personalIdStartsWith}
                        onChange={(event) =>
                          updateSetting('personalIdStartsWith', event.target.value)
                        }
                        placeholder="مثال: 20"
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs text-muted-foreground">
                        عدد الخانات
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={settings.personalIdLength}
                        onChange={(event) =>
                          updateSetting('personalIdLength', event.target.value)
                        }
                        placeholder="مثال: 9"
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Grade */}
              <div className="rounded-xl border p-4">
                <label className="flex cursor-pointer items-center justify-between gap-3">
                  <span className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.requireGrade}
                      onChange={(event) =>
                        updateSetting('requireGrade', event.target.checked)
                      }
                      className="h-4 w-4 rounded"
                    />
                    <span className="font-medium">الصف الأكاديمي</span>
                  </span>

                  <span className="text-xs text-muted-foreground">مطلوب</span>
                </label>

                <div className="mt-3 text-xs text-muted-foreground">
                  يتم اختيار الصف من الصفوف الأكاديمية المعتمدة.
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {academicGrades.map((grade) => (
                    <span
                      key={grade}
                      className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                    >
                      {grade}
                    </span>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="rounded-xl border p-4">
                <label className="flex cursor-pointer items-center justify-between gap-3">
                  <span className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.requireNotes}
                      onChange={(event) =>
                        updateSetting('requireNotes', event.target.checked)
                      }
                      className="h-4 w-4 rounded"
                    />
                    <span className="font-medium">الملاحظات</span>
                  </span>

                  <span className="text-xs text-muted-foreground">
                    {settings.requireNotes ? 'مطلوب' : 'اختياري'}
                  </span>
                </label>
              </div>

              {/* Chronic Diseases */}
              <div className="rounded-xl border p-4">
                <label className="flex cursor-pointer items-center justify-between gap-3">
                  <span className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.requireChronicDiseases}
                      onChange={(event) =>
                        updateSetting('requireChronicDiseases', event.target.checked)
                      }
                      className="h-4 w-4 rounded"
                    />
                    <span className="font-medium">الأمراض المزمنة</span>
                  </span>

                  <span className="text-xs text-muted-foreground">
                    {settings.requireChronicDiseases ? 'مطلوب' : 'اختياري'}
                  </span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-5">
              <div className="text-sm text-muted-foreground">طلبات قيد المراجعة</div>
              <div className="mt-2 text-2xl font-bold">{pendingRequests.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="text-sm text-muted-foreground">تحتاج مراجعة مشرف</div>
              <div className="mt-2 text-2xl font-bold">{specialRequests.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="text-sm text-muted-foreground">حالة التسجيل</div>
              <div className="mt-2 font-semibold">
                {settings.registrationOpen ? 'مفتوح لاستقبال الطلبات' : 'موقوف مؤقتًا'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Requests */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>طلبات التسجيل</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  راجع الطلبات ثم اقبلها وترحّل الطالب إلى قائمة الطلاب.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters((current) => !current)}
                >
                  <Filter className="ml-2 h-4 w-4" />
                  الفلاتر
                </Button>

                <Button variant="outline" onClick={clearFilters}>
                  مسح الفلاتر
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {showFilters && (
              <div className="mb-4 grid gap-3 rounded-xl border bg-muted/20 p-4 md:grid-cols-4 lg:grid-cols-7">
                {(
                  [
                    ['id', 'رقم الطلب'],
                    ['name', 'اسم الطالب'],
                    ['grade', 'الصف'],
                    ['guardian', 'ولي الأمر'],
                    ['phone', 'الهاتف'],
                    ['submittedAt', 'تاريخ الطلب'],
                    ['status', 'الحالة'],
                  ] as [ColumnKey, string][]
                ).map(([key, label]) => (
                  <div key={key}>
                    <label className="mb-1 block text-xs text-muted-foreground">
                      {label}
                    </label>
                    <input
                      value={filters[key]}
                      onChange={(event) => updateFilter(key, event.target.value)}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-sm">
                <thead>
                  <tr className="border-b text-right text-muted-foreground">
                    <th className="px-3 py-3 font-medium">رقم الطلب</th>
                    <th className="px-3 py-3 font-medium">اسم الطالب</th>
                    <th className="px-3 py-3 font-medium">الصف</th>
                    <th className="px-3 py-3 font-medium">ولي الأمر</th>
                    <th className="px-3 py-3 font-medium">الهاتف</th>
                    <th className="px-3 py-3 font-medium">تاريخ الطلب</th>
                    <th className="px-3 py-3 font-medium">الحالة</th>
                    <th className="px-3 py-3 font-medium">الإجراء</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRequests.map((request) => {
                    const special = hasSpecialInformation(request, settings)

                    return (
                      <tr key={request.id} className="border-b last:border-0">
                        <td className="px-3 py-4 font-medium">{request.id}</td>
                        <td className="px-3 py-4">{request.name}</td>
                        <td className="px-3 py-4">{request.grade}</td>
                        <td className="px-3 py-4">{request.guardian}</td>
                        <td className="px-3 py-4">{request.phone}</td>
                        <td className="px-3 py-4">{request.submittedAt}</td>
                        <td className="px-3 py-4">
                          <StatusBadge variant={getStatusVariant(request.status)}>
                            {request.status}
                          </StatusBadge>
                        </td>
                        <td className="px-3 py-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedRequest(request)}
                          >
                            <Eye className="ml-2 h-4 w-4" />
                            مراجعة
                          </Button>

                          {special && request.status === 'قيد المراجعة' && (
                            <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              تحتاج اعتماد
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {filteredRequests.length === 0 && (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  لا توجد طلبات مطابقة للفلاتر.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Review Drawer */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSelectedRequest(null)}
          />

          <aside className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-lg font-semibold">مراجعة طلب التسجيل</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedRequest.id}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="rounded-lg p-2 hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">اسم الطالب</div>
                  <div className="mt-1 font-medium">{selectedRequest.name}</div>
                </div>

                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">الصف</div>
                  <div className="mt-1 font-medium">{selectedRequest.grade}</div>
                </div>

                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">ولي الأمر</div>
                  <div className="mt-1 font-medium">{selectedRequest.guardian}</div>
                </div>

                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">الهاتف</div>
                  <div className="mt-1 font-medium">{selectedRequest.phone}</div>
                </div>

                <div className="rounded-lg border p-3 sm:col-span-2">
                  <div className="text-xs text-muted-foreground">الرقم الأكاديمي</div>
                  <div className="mt-1 font-medium">
                    {getRequestPersonalId(selectedRequest) || 'غير مضاف'}
                  </div>
                </div>

                <div className="rounded-lg border p-3 sm:col-span-2">
                  <div className="text-xs text-muted-foreground">الأمراض المزمنة</div>
                  <div className="mt-1 font-medium">
                    {selectedRequest.chronicDiseases || 'لا يوجد'}
                  </div>
                </div>

                <div className="rounded-lg border p-3 sm:col-span-2">
                  <div className="text-xs text-muted-foreground">الملاحظات</div>
                  <div className="mt-1 font-medium">
                    {selectedRequest.notes || 'لا توجد ملاحظات'}
                  </div>
                </div>
              </div>

              {selectedRequest.status === 'قيد المراجعة' &&
                hasSpecialInformation(selectedRequest, settings) && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                      <div>
                        <div className="font-semibold">تحتاج اعتماد المشرف</div>
                        <div className="mt-1 text-sm">
                          توجد معلومات صحية أو ملاحظات تتطلب المراجعة قبل الترحيل.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              {!settings.registrationOpen && selectedRequest.status === 'قيد المراجعة' && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
                  استقبال التسجيل موقوف حاليًا.
                </div>
              )}

              {selectedRequest.status === 'قيد المراجعة' && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    className="flex-1"
                    disabled={!canApprove(selectedRequest)}
                    onClick={() => approveRequest(selectedRequest)}
                  >
                    <Check className="ml-2 h-4 w-4" />
                    قبول وترحيل للطلاب
                  </Button>

                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => rejectRequest(selectedRequest)}
                  >
                    <X className="ml-2 h-4 w-4" />
                    رفض الطلب
                  </Button>
                </div>
              )}

              {selectedRequest.status === 'مقبول' && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                  تم قبول الطلب وترحيل الطالب إلى قائمة الطلاب.
                </div>
              )}

              {selectedRequest.status === 'مرفوض' && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
                  تم رفض طلب التسجيل.
                </div>
              )}

              {selectedRequest.status === 'قيد المراجعة' && !canApprove(selectedRequest) && (
                <p className="text-center text-xs text-muted-foreground">
                  لا يمكن الترحيل حاليًا. تحقق من إعدادات التسجيل أو البيانات المطلوبة أو
                  وجود حالة تحتاج اعتماد المشرف.
                </p>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
