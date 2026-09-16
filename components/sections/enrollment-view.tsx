'use client'

import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Check,
  Eye,
  Filter,
  ShieldCheck,
  Power,
  X,
} from 'lucide-react'

import { PageHeader } from '@/components/dashboard/page-header'
import { StatusBadge } from '@/components/dashboard/status-badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  students,
  enrollmentRequests,
  academicGrades,
} from '@/lib/data'
import type {
  EnrollmentRequest,
  Student,
} from '@/lib/data'

type Filters = {
  id: string
  name: string
  grade: string
  guardian: string
  phone: string
  submittedAt: string
  status: string
}

type RegistrationRules = {
  nameRequired: boolean
  gradeRequired: boolean
  personalIdRequired: boolean
  phoneRequired: boolean

  personalIdStartsWith: string
  personalIdLength: string

  notesNeedSupervisor: boolean
  chronicDiseasesNeedSupervisor: boolean
  personalIdNeedsSupervisor: boolean
  supervisorPersonalIdStartsWith: string
}

const emptyFilters: Filters = {
  id: '',
  name: '',
  grade: '',
  guardian: '',
  phone: '',
  submittedAt: '',
  status: '',
}

const inputClass =
  'h-9 w-full min-w-[120px] rounded-md border border-input bg-background px-2 text-xs'

const selectClass =
  'h-9 w-full min-w-[130px] rounded-md border border-input bg-background px-2 text-xs'

function hasChronicDisease(request: EnrollmentRequest) {
  const value = request.chronicDiseases?.trim() || ''

  return (
    value !== '' &&
    value !== 'لا يوجد' &&
    value !== 'لا توجد' &&
    value !== 'لا يوجد أمراض مزمنة'
  )
}

function hasNotes(request: EnrollmentRequest) {
  return (request.notes?.trim() || '') !== ''
}

function hasSpecialInformation(
  request: EnrollmentRequest,
  rules: RegistrationRules,
) {
  const diseaseNeedsSupervisor =
    rules.chronicDiseasesNeedSupervisor &&
    hasChronicDisease(request)

  const notesNeedsSupervisor =
    rules.notesNeedSupervisor &&
    hasNotes(request)

  const personalIdNeedsSupervisor =
    rules.personalIdNeedsSupervisor &&
    rules.supervisorPersonalIdStartsWith.trim() !== '' &&
    request.personalId.trim() !== '' &&
    request.personalId
      .trim()
      .startsWith(
        rules.supervisorPersonalIdStartsWith.trim(),
      )

  return (
    diseaseNeedsSupervisor ||
    notesNeedsSupervisor ||
    personalIdNeedsSupervisor
  )
}

function getSupervisorReasons(
  request: EnrollmentRequest,
  rules: RegistrationRules,
) {
  const reasons: string[] = []

  if (
    rules.chronicDiseasesNeedSupervisor &&
    hasChronicDisease(request)
  ) {
    reasons.push('وجود أمراض مزمنة')
  }

  if (
    rules.notesNeedSupervisor &&
    hasNotes(request)
  ) {
    reasons.push('وجود ملاحظات')
  }

  if (
    rules.personalIdNeedsSupervisor &&
    rules.supervisorPersonalIdStartsWith.trim() !== '' &&
    request.personalId.trim() !== '' &&
    request.personalId
      .trim()
      .startsWith(
        rules.supervisorPersonalIdStartsWith.trim(),
      )
  ) {
    reasons.push(
      `الرقم الشخصي يبدأ بـ ${rules.supervisorPersonalIdStartsWith.trim()}`,
    )
  }

  return reasons
}

export function EnrollmentView() {
  const [requests, setRequests] =
    useState<EnrollmentRequest[]>(
      enrollmentRequests,
    )

  const [selectedRequest, setSelectedRequest] =
    useState<EnrollmentRequest | null>(null)

  const [showReview, setShowReview] =
    useState(false)

  const [filters, setFilters] =
    useState<Filters>(emptyFilters)

  const [registrationOpen, setRegistrationOpen] =
    useState(true)

  const [rules, setRules] =
    useState<RegistrationRules>({
      nameRequired: true,
      gradeRequired: true,
      personalIdRequired: true,
      phoneRequired: true,

      personalIdStartsWith: '',
      personalIdLength: '',

      notesNeedSupervisor: true,
      chronicDiseasesNeedSupervisor: true,
      personalIdNeedsSupervisor: true,
      supervisorPersonalIdStartsWith: '',
    })

  const updateFilter = (
    key: keyof Filters,
    value: string,
  ) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const clearFilters = () => {
    setFilters(emptyFilters)
  }

  const updateRule = (
    key: keyof RegistrationRules,
  ) => {
    setRules((current) => ({
      ...current,
      [key]: !current[key],
    }))
  }

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const matchesId =
        !filters.id ||
        request.id
          .toLowerCase()
          .includes(
            filters.id.toLowerCase(),
          )

      const matchesName =
        !filters.name ||
        request.name
          .toLowerCase()
          .includes(
            filters.name.toLowerCase(),
          )

      const matchesGrade =
        !filters.grade ||
        request.grade === filters.grade

      const matchesGuardian =
        !filters.guardian ||
        request.guardian
          .toLowerCase()
          .includes(
            filters.guardian.toLowerCase(),
          )

      const matchesPhone =
        !filters.phone ||
        request.phone.includes(
          filters.phone,
        )

      const matchesDate =
        !filters.submittedAt ||
        request.submittedAt.includes(
          filters.submittedAt,
        )

      const matchesStatus =
        !filters.status ||
        request.status === filters.status

      return (
        matchesId &&
        matchesName &&
        matchesGrade &&
        matchesGuardian &&
        matchesPhone &&
        matchesDate &&
        matchesStatus
      )
    })
  }, [requests, filters])

  const pendingCount =
    requests.filter(
      (request) =>
        request.status === 'قيد المراجعة',
    ).length

  const supervisorCount =
    requests.filter(
      (request) =>
        request.status === 'قيد المراجعة' &&
        hasSpecialInformation(
          request,
          rules,
        ),
    ).length

  const openReview = (
    request: EnrollmentRequest,
  ) => {
    setSelectedRequest(request)
    setShowReview(true)
  }

  const closeReview = () => {
    setShowReview(false)
    setSelectedRequest(null)
  }

  const approveRequest = (
    request: EnrollmentRequest,
  ) => {
    if (!registrationOpen) {
      alert('التسجيل موقوف حاليًا.')
      return
    }

    if (
      rules.nameRequired &&
      !request.name.trim()
    ) {
      alert('اسم الطالب مطلوب.')
      return
    }

    if (
      rules.gradeRequired &&
      !request.grade.trim()
    ) {
      alert('الصف مطلوب.')
      return
    }

    if (
      rules.personalIdRequired &&
      !request.personalId.trim()
    ) {
      alert('الرقم الشخصي مطلوب.')
      return
    }

    if (
      rules.phoneRequired &&
      !request.phone.trim()
    ) {
      alert('رقم الهاتف مطلوب.')
      return
    }

    if (
      rules.personalIdStartsWith.trim() &&
      !request.personalId
        .trim()
        .startsWith(
          rules.personalIdStartsWith.trim(),
        )
    ) {
      alert(
        `الرقم الشخصي يجب أن يبدأ بـ ${rules.personalIdStartsWith.trim()}.`,
      )
      return
    }

    if (
      rules.personalIdLength.trim() &&
      request.personalId.trim().length !==
        Number(
          rules.personalIdLength,
        )
    ) {
      alert(
        `الرقم الشخصي يجب أن يتكون من ${rules.personalIdLength} خانات.`,
      )
      return
    }

    if (
      hasSpecialInformation(
        request,
        rules,
      )
    ) {
      const reasons =
        getSupervisorReasons(
          request,
          rules,
        )

      alert(
        `لا يمكن ترحيل هذا الطالب مباشرة.\n\nالحالة تحتاج اعتماد المشرف بسبب:\n• ${reasons.join(
          '\n• ',
        )}`,
      )

      return
    }

    const requestPersonalId =
      request.personalId.trim()

    const requestPhone =
      request.phone.trim()

    const requestName =
      request.name.trim()

    const alreadyExists =
      students.some(
        (student) =>
          (
            requestPersonalId !== '' &&
            student.personalId ===
              requestPersonalId
          ) ||
          (
            requestPhone !== '' &&
            student.phone ===
              requestPhone
          ) ||
          (
            student.name.trim() ===
            requestName
          ),
      )

    if (alreadyExists) {
      alert(
        'هذا الطالب موجود بالفعل في قائمة الطلاب.',
      )
      return
    }

    const newStudent: Student = {
      id: `STU-${Date.now()}`,
      name: request.name,
      personalId: request.personalId,
      grade: request.grade,
      phone: request.phone,
      whatsapp: request.phone,
      paymentStatus: 'غير مدفوع',
      amountDue: 0,
      amountPaid: 0,
      chronicDiseases:
        request.chronicDiseases ||
        'لا يوجد',
      notes: request.notes || '',
    }

    students.push(newStudent)

    setRequests((current) =>
      current.map((item) =>
        item.id === request.id
          ? {
              ...item,
              status: 'مقبول',
            }
          : item,
      ),
    )

    closeReview()
  }

  const rejectRequest = (
    request: EnrollmentRequest,
  ) => {
    const confirmed =
      window.confirm(
        `هل أنت متأكد من رفض طلب تسجيل ${request.name}؟`,
      )

    if (!confirmed) return

    setRequests((current) =>
      current.map((item) =>
        item.id === request.id
          ? {
              ...item,
              status: 'مرفوض',
            }
          : item,
      ),
    )

    closeReview()
  }

  const hasFilters =
    Object.values(filters).some(Boolean)

  return (
    <div className="space-y-6">
      <PageHeader
        title="طلبات التسجيل"
        description={`${pendingCount} طلب بانتظار المراجعة من إجمالي ${requests.length} طلب`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            إعدادات التسجيل
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div
            className={`flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between ${
              registrationOpen
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-red-200 bg-red-50'
            }`}
          >
            <div className="flex items-start gap-3">
              <Power
                className={`mt-0.5 size-5 ${
                  registrationOpen
                    ? 'text-emerald-600'
                    : 'text-red-600'
                }`}
              />

              <div>
                <p className="font-medium">
                  استقبال طلبات التسجيل
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  {registrationOpen
                    ? 'التسجيل مفتوح ويمكن استقبال طلبات جديدة.'
                    : 'التسجيل موقوف حاليًا ولا يتم استقبال طلبات جديدة.'}
                </p>
              </div>
            </div>

            <Button
              variant={
                registrationOpen
                  ? 'destructive'
                  : 'default'
              }
              onClick={() =>
                setRegistrationOpen(
                  (current) => !current,
                )
              }
              className="gap-2"
            >
              <Power className="size-4" />

              {registrationOpen
                ? 'إيقاف التسجيل'
                : 'فتح التسجيل'}
            </Button>
          </div>

          <div>
            <div className="mb-3">
              <p className="font-medium">
                بيانات التسجيل
              </p>

              <p className="text-sm text-muted-foreground">
                حدد البيانات التي يجب إدخالها عند التسجيل.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4">
                <input
                  type="checkbox"
                  checked={
                    rules.nameRequired
                  }
                  onChange={() =>
                    updateRule(
                      'nameRequired',
                    )
                  }
                  className="mt-1 size-4"
                />

                <span>
                  <span className="block font-medium">
                    اسم الطالب
                  </span>

                  <span className="mt-1 block text-sm text-muted-foreground">
                    {rules.nameRequired
                      ? 'الاسم مطلوب عند التسجيل.'
                      : 'الاسم غير مطلوب.'}
                  </span>
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4">
                <input
                  type="checkbox"
                  checked={
                    rules.gradeRequired
                  }
                  onChange={() =>
                    updateRule(
                      'gradeRequired',
                    )
                  }
                  className="mt-1 size-4"
                />

                <span>
                  <span className="block font-medium">
                    الصف
                  </span>

                  <span className="mt-1 block text-sm text-muted-foreground">
                    {rules.gradeRequired
                      ? 'الصف مطلوب عند التسجيل.'
                      : 'الصف غير مطلوب.'}
                  </span>
                </span>
              </label>

              <div className="rounded-lg border p-4">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={
                      rules.personalIdRequired
                    }
                    onChange={() =>
                      updateRule(
                        'personalIdRequired',
                      )
                    }
                    className="size-4"
                  />

                  <span className="font-medium">
                    الرقم الشخصي
                  </span>
                </label>

                {rules.personalIdRequired && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs text-muted-foreground">
                        يبدأ بـ
                      </label>

                      <input
                        value={
                          rules.personalIdStartsWith
                        }
                        onChange={(event) =>
                          setRules(
                            (current) => ({
                              ...current,
                              personalIdStartsWith:
                                event.target.value,
                            }),
                          )
                        }
                        placeholder="مثال: 20"
                        className={
                          inputClass
                        }
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs text-muted-foreground">
                        عدد الخانات
                      </label>

                      <input
                        type="number"
                        min="1"
                        value={
                          rules.personalIdLength
                        }
                        onChange={(event) =>
                          setRules(
                            (current) => ({
                              ...current,
                              personalIdLength:
                                event.target.value,
                            }),
                          )
                        }
                        placeholder="مثال: 9"
                        className={
                          inputClass
                        }
                      />
                    </div>
                  </div>
                )}
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4">
                <input
                  type="checkbox"
                  checked={
                    rules.phoneRequired
                  }
                  onChange={() =>
                    updateRule(
                      'phoneRequired',
                    )
                  }
                  className="mt-1 size-4"
                />

                <span>
                  <span className="block font-medium">
                    رقم الهاتف
                  </span>

                  <span className="mt-1 block text-sm text-muted-foreground">
                    {rules.phoneRequired
                      ? 'رقم الهاتف مطلوب عند التسجيل.'
                      : 'رقم الهاتف غير مطلوب.'}
                  </span>
                </span>
              </label>
            </div>
          </div>

          <div>
            <div className="mb-3">
              <p className="font-medium">
                اعتماد المشرف
              </p>

              <p className="text-sm text-muted-foreground">
                حدد الحالات التي تمنع الترحيل المباشر.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4">
                <input
                  type="checkbox"
                  checked={
                    rules.notesNeedSupervisor
                  }
                  onChange={() =>
                    updateRule(
                      'notesNeedSupervisor',
                    )
                  }
                  className="mt-1 size-4"
                />

                <span>
                  <span className="block font-medium">
                    وجود ملاحظات
                  </span>

                  <span className="mt-1 block text-sm text-muted-foreground">
                    أي طلب يحتوي على ملاحظات يحتاج اعتماد المشرف.
                  </span>
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4">
                <input
                  type="checkbox"
                  checked={
                    rules.chronicDiseasesNeedSupervisor
                  }
                  onChange={() =>
                    updateRule(
                      'chronicDiseasesNeedSupervisor',
                    )
                  }
                  className="mt-1 size-4"
                />

                <span>
                  <span className="block font-medium">
                    وجود أمراض مزمنة
                  </span>

                  <span className="mt-1 block text-sm text-muted-foreground">
                    أي طالب لديه مرض مزمن يحتاج اعتماد المشرف.
                  </span>
                </span>
              </label>

              <div className="rounded-lg border p-4 md:col-span-2">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={
                      rules.personalIdNeedsSupervisor
                    }
                    onChange={() =>
                      updateRule(
                        'personalIdNeedsSupervisor',
                      )
                    }
                    className="size-4"
                  />

                  <span className="font-medium">
                    الرقم الشخصي يبدأ بـ
                  </span>
                </label>

                {rules.personalIdNeedsSupervisor && (
                  <div className="mt-4 max-w-sm">
                    <label className="mb-1.5 block text-xs text-muted-foreground">
                      أدخل بداية الرقم الشخصي التي تتطلب اعتماد المشرف
                    </label>

                    <input
                      value={
                        rules.supervisorPersonalIdStartsWith
                      }
                      onChange={(event) =>
                        setRules(
                          (current) => ({
                            ...current,
                            supervisorPersonalIdStartsWith:
                              event.target.value,
                          }),
                        )
                      }
                      placeholder="مثال: 12"
                      className={
                        inputClass
                      }
                    />

                    <p className="mt-2 text-xs text-muted-foreground">
                      مثال: إذا أدخلت 12، فإن أي رقم شخصي يبدأ بـ 12 لن يتم ترحيله مباشرة.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {!registrationOpen && (
            <div className="flex items-center gap-3 rounded-lg border border-red-300 bg-red-50 p-4 text-red-900">
              <AlertTriangle className="size-5 shrink-0" />

              <div>
                <p className="font-medium">
                  التسجيل موقوف
                </p>

                <p className="text-sm">
                  لن يتم قبول أو ترحيل طلبات جديدة حتى يتم فتح التسجيل مرة أخرى.
                </p>
              </div>
            </div>
          )}

          {supervisorCount > 0 && (
            <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
              <AlertTriangle className="size-5 shrink-0" />

              <div>
                <p className="font-medium">
                  {supervisorCount} طلب يحتاج اعتماد المشرف
                </p>

                <p className="text-sm">
                  توجد بيانات في هذه الطلبات تمنع الترحيل المباشر حسب القواعد الحالية.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-3 text-right font-medium">
                    <div className="space-y-2">
                      <div>رقم الطلب</div>

                      <input
                        value={filters.id}
                        onChange={(event) =>
                          updateFilter(
                            'id',
                            event.target.value,
                          )
                        }
                        placeholder="بحث"
                        className={inputClass}
                      />
                    </div>
                  </th>

                  <th className="px-4 py-3 text-right font-medium">
                    <div className="space-y-2">
                      <div>اسم الطالب</div>

                      <input
                        value={filters.name}
                        onChange={(event) =>
                          updateFilter(
                            'name',
                            event.target.value,
                          )
                        }
                        placeholder="بحث"
                        className={inputClass}
                      />
                    </div>
                  </th>

                  <th className="px-4 py-3 text-right font-medium">
                    <div className="space-y-2">
                      <div>الصف المطلوب</div>

                      <select
                        value={filters.grade}
                        onChange={(event) =>
                          updateFilter(
                            'grade',
                            event.target.value,
                          )
                        }
                        className={selectClass}
                      >
                        <option value="">
                          جميع الصفوف
                        </option>

                        {academicGrades.map(
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
                    </div>
                  </th>

                  <th className="px-4 py-3 text-right font-medium">
                    <div className="space-y-2">
                      <div>ولي الأمر</div>

                      <input
                        value={filters.guardian}
                        onChange={(event) =>
                          updateFilter(
                            'guardian',
                            event.target.value,
                          )
                        }
                        placeholder="بحث"
                        className={inputClass}
                      />
                    </div>
                  </th>

                  <th className="px-4 py-3 text-right font-medium">
                    <div className="space-y-2">
                      <div>رقم الجوال</div>

                      <input
                        value={filters.phone}
                        onChange={(event) =>
                          updateFilter(
                            'phone',
                            event.target.value,
                          )
                        }
                        placeholder="بحث"
                        className={inputClass}
                      />
                    </div>
                  </th>

                  <th className="px-4 py-3 text-right font-medium">
                    <div className="space-y-2">
                      <div>تاريخ التقديم</div>

                      <input
                        value={
                          filters.submittedAt
                        }
                        onChange={(event) =>
                          updateFilter(
                            'submittedAt',
                            event.target.value,
                          )
                        }
                        placeholder="بحث"
                        className={inputClass}
                      />
                    </div>
                  </th>

                  <th className="px-4 py-3 text-right font-medium">
                    <div className="space-y-2">
                      <div>الحالة</div>

                      <select
                        value={filters.status}
                        onChange={(event) =>
                          updateFilter(
                            'status',
                            event.target.value,
                          )
                        }
                        className={selectClass}
                      >
                        <option value="">
                          جميع الحالات
                        </option>

                        <option value="قيد المراجعة">
                          قيد المراجعة
                        </option>

                        <option value="مقبول">
                          مقبول
                        </option>

                        <option value="مرفوض">
                          مرفوض
                        </option>
                      </select>
                    </div>
                  </th>

                  <th className="px-4 py-3 text-right font-medium">
                    الإجراء
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-12 text-center text-muted-foreground"
                    >
                      لا توجد طلبات مطابقة للفلاتر.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map(
                    (request) => {
                      const needsSupervisor =
                        hasSpecialInformation(
                          request,
                          rules,
                        )

                      const supervisorReasons =
                        getSupervisorReasons(
                          request,
                          rules,
                        )

                      return (
                        <tr
                          key={request.id}
                          className="border-b last:border-0"
                        >
                          <td className="px-4 py-4 font-medium tabular-nums">
                            {request.id}
                          </td>

                          <td className="px-4 py-4 font-medium">
                            <div>
                              {request.name}
                            </div>

                            {needsSupervisor && (
                              <div className="mt-1 flex items-center gap-1 text-xs text-amber-700">
                                <AlertTriangle className="size-3.5" />

                                يحتاج اعتماد المشرف

                                {supervisorReasons.length >
                                  0 && (
                                  <span>
                                    (
                                    {supervisorReasons.join(
                                      '، ',
                                    )}
                                    )
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-4 text-muted-foreground">
                            {request.grade}
                          </td>

                          <td className="px-4 py-4 text-muted-foreground">
                            {request.guardian}
                          </td>

                          <td className="px-4 py-4 tabular-nums text-muted-foreground">
                            {request.phone}
                          </td>

                          <td className="px-4 py-4 text-muted-foreground">
                            {request.submittedAt}
                          </td>

                          <td className="px-4 py-4">
                            <StatusBadge
                              status={
                                request.status
                              }
                            />
                          </td>

                          <td className="px-4 py-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                openReview(
                                  request,
                                )
                              }
                              className="gap-2"
                            >
                              <Eye className="size-4" />
                              مراجعة
                            </Button>
                          </td>
                        </tr>
                      )
                    },
                  )
                )}
              </tbody>
            </table>
          </div>

          {hasFilters && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="size-4" />

                عرض {filteredRequests.length} من{' '}
                {requests.length} طلب
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
              >
                مسح الفلاتر
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {showReview && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl border bg-background shadow-xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-lg font-semibold">
                  مراجعة طلب التسجيل
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedRequest.id}
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={closeReview}
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="space-y-5 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">
                    اسم الطالب
                  </p>

                  <p className="mt-1 font-medium">
                    {selectedRequest.name}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    الرقم الشخصي
                  </p>

                  <p className="mt-1 font-medium tabular-nums">
                    {selectedRequest.personalId ||
                      'غير مضاف'}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    الصف المطلوب
                  </p>

                  <p className="mt-1 font-medium">
                    {selectedRequest.grade}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    ولي الأمر
                  </p>

                  <p className="mt-1 font-medium">
                    {selectedRequest.guardian}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    رقم الجوال
                  </p>

                  <p className="mt-1 font-medium tabular-nums">
                    {selectedRequest.phone}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium">
                  الأمراض المزمنة
                </p>

                <p className="mt-2 text-sm text-muted-foreground">
                  {selectedRequest.chronicDiseases ||
                    'لا يوجد'}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium">
                  الملاحظات
                </p>

                <p className="mt-2 text-sm text-muted-foreground">
                  {selectedRequest.notes ||
                    'لا توجد ملاحظات'}
                </p>
              </div>

              {hasSpecialInformation(
                selectedRequest,
                rules,
              ) &&
                selectedRequest.status ===
                  'قيد المراجعة' && (
                  <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
                    <AlertTriangle className="mt-0.5 size-5 shrink-0" />

                    <div>
                      <p className="font-medium">
                        هذا الطلب يحتاج اعتماد المشرف
                      </p>

                      <ul className="mt-2 list-disc space-y-1 pr-5 text-sm">
                        {getSupervisorReasons(
                          selectedRequest,
                          rules,
                        ).map(
                          (reason) => (
                            <li key={reason}>
                              {reason}
                            </li>
                          ),
                        )}
                      </ul>

                      <p className="mt-2 text-sm">
                        لا يتم ترحيل الطالب إلى قائمة الطلاب قبل اعتماد الحالة.
                      </p>
                    </div>
                  </div>
                )}

              <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                <Button
                  variant="ghost"
                  onClick={closeReview}
                >
                  إغلاق
                </Button>

                {selectedRequest.status ===
                  'قيد المراجعة' && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() =>
                        rejectRequest(
                          selectedRequest,
                        )
                      }
                      className="gap-2"
                    >
                      <X className="size-4" />
                      رفض الطلب
                    </Button>

                    <Button
                      onClick={() =>
                        approveRequest(
                          selectedRequest,
                        )
                      }
                      disabled={
                        !registrationOpen ||
                        hasSpecialInformation(
                          selectedRequest,
                          rules,
                        )
                      }
                      className="gap-2"
                    >
                      <Check className="size-4" />
                      قبول وترحيل للطلاب
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
