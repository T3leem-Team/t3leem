'use client'

import {
  ArrowRight,
  Ban,
  CalendarClock,
  Check,
  ChevronDown,
  Clock3,
  Filter,
  Loader2,
  MonitorSmartphone,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from 'lucide-react'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { PageHeader } from '@/components/dashboard/page-header'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type TrustedDevice = {
  id: string
  auth_user_id: string
  device_name: string | null
  status: string
  created_at: string
  approved_at: string | null
  rejected_at: string | null
  revoked_at: string | null
  last_used_at: string | null
  approved_device_type: string | null
  pending_device_type: string | null
  grace_period_days: number | null
  grace_expires_at: string | null
  device_type_detected_at: string | null
  user: {
    username: string
    full_name: string | null
    role: string
  } | null
}

type DeviceAction =
  | 'approve'
  | 'reject'
  | 'revoke'
  | 'update_grace_period'

type UserGroup = {
  authUserId: string
  username: string
  fullName: string | null
  role: string
  pendingDevices: TrustedDevice[]
  approvedDevices: TrustedDevice[]
}

type DeviceFilter = 'all' | 'pending' | 'approved' | 'expired'

const DEFAULT_GRACE_DAYS = 30
const MAX_GRACE_DAYS = 3650

/**
 * ترتيب الجهاز:
 * آخر استخدام، ثم الموافقة، ثم الإنشاء.
 */
function getDeviceRecencyTimestamp(device: TrustedDevice): number {
  const value =
    device.last_used_at ||
    device.approved_at ||
    device.created_at

  const timestamp = new Date(value).getTime()

  return Number.isFinite(timestamp) ? timestamp : 0
}

/**
 * عرض أحدث جهاز معتمد من كل نوع فقط.
 * هذه الدالة لا تحذف أي سجل من قاعدة البيانات.
 */
function getLatestApprovedDevicesByType(
  devices: TrustedDevice[],
): TrustedDevice[] {
  const latestByType = new Map<string, TrustedDevice>()

  for (const device of devices) {
    if (device.status !== 'approved') continue

    const rawType =
      device.approved_device_type ||
      device.pending_device_type ||
      'unknown'

    const typeKey = rawType.trim().toLowerCase() || 'unknown'
    const current = latestByType.get(typeKey)

    if (
      !current ||
      getDeviceRecencyTimestamp(device) >
        getDeviceRecencyTimestamp(current)
    ) {
      latestByType.set(typeKey, device)
    }
  }

  return Array.from(latestByType.values()).sort(
    (a, b) =>
      getDeviceRecencyTimestamp(b) -
      getDeviceRecencyTimestamp(a),
  )
}

export default function TrustedDevicesPage() {
  const router = useRouter()

  const [devices, setDevices] = useState<TrustedDevice[]>([])
  const [approvedDevices, setApprovedDevices] = useState<
    TrustedDevice[]
  >([])

  const [graceDaysByDevice, setGraceDaysByDevice] = useState<
    Record<string, number>
  >({})

  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [userSearch, setUserSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    null,
  )
  const [deviceFilter, setDeviceFilter] = useState<DeviceFilter>('all')
  const [deviceSearch, setDeviceSearch] = useState('')

  // القائمة مغلقة عند فتح الصفحة، والسهم هو المتحكم بفتحها وإغلاقها.
  const [showUserList, setShowUserList] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const loadDevices = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/trusted-devices', {
        method: 'GET',
        cache: 'no-store',
      })

      const data = await response.json()

      if (!response.ok) {
        setError(
          typeof data.error === 'string'
            ? data.error
            : 'تعذر تحميل الأجهزة.',
        )
        return
      }

      const pending: TrustedDevice[] = Array.isArray(data.devices)
        ? data.devices
        : []

      const approved: TrustedDevice[] = Array.isArray(
        data.approvedDevices,
      )
        ? data.approvedDevices
        : []

      const sortDevicesByLatest = (items: TrustedDevice[]) =>
        [...items].sort(
          (a, b) =>
            getDeviceRecencyTimestamp(b) -
            getDeviceRecencyTimestamp(a),
        )

      setDevices(sortDevicesByLatest(pending))
      setApprovedDevices(sortDevicesByLatest(approved))

      setGraceDaysByDevice((previous) => {
        const next = { ...previous }

        for (const device of [...pending, ...approved]) {
          next[device.id] =
            previous[device.id] ??
            device.grace_period_days ??
            DEFAULT_GRACE_DAYS
        }

        return next
      })
    } catch (err) {
      console.error('Load trusted devices error:', err)
      setError('تعذر الاتصال بالخادم.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDevices()
  }, [loadDevices])

  function getGraceDays(deviceId: string) {
    return graceDaysByDevice[deviceId] ?? DEFAULT_GRACE_DAYS
  }

  function setGraceDays(deviceId: string, value: number) {
    setGraceDaysByDevice((previous) => ({
      ...previous,
      [deviceId]: value,
    }))
  }

  async function handleAction(
    deviceId: string,
    action: DeviceAction,
  ) {
    const actionLabels: Record<DeviceAction, string> = {
      approve: 'الموافقة على الجهاز',
      reject: 'رفض الجهاز',
      revoke: 'إلغاء اعتماد الجهاز',
      update_grace_period: 'تحديث مدة الثقة',
    }

    if (action === 'approve' || action === 'update_grace_period') {
      const days = getGraceDays(deviceId)

      if (
        !Number.isInteger(days) ||
        days < 1 ||
        days > MAX_GRACE_DAYS
      ) {
        setError(
          `أدخل مدة صحيحة بين يوم واحد و${MAX_GRACE_DAYS} يوم.`,
        )
        return
      }
    }

    if (action === 'reject') {
      if (
        !window.confirm(
          'هل تريد رفض هذا الجهاز؟ سيبقى سجله محفوظًا في قاعدة البيانات.',
        )
      ) {
        return
      }
    }

    if (action === 'revoke') {
      if (
        !window.confirm(
          'هل تريد إلغاء اعتماد هذا الجهاز؟ سيحتاج المستخدم إلى موافقة جديدة للدخول منه.',
        )
      ) {
        return
      }
    }

    setProcessingId(deviceId)
    setError('')
    setSuccess('')

    try {
      const body: {
        deviceId: string
        action: DeviceAction
        gracePeriodDays?: number
      } = {
        deviceId,
        action,
      }

      if (action === 'approve' || action === 'update_grace_period') {
        body.gracePeriodDays = getGraceDays(deviceId)
      }

      const response = await fetch('/api/admin/trusted-devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(
          typeof data.error === 'string'
            ? data.error
            : `تعذر تنفيذ الإجراء: ${actionLabels[action]}.`,
        )
        return
      }

      const messages: Record<DeviceAction, string> = {
        approve: `تم اعتماد الجهاز لمدة ${getGraceDays(deviceId)} يومًا.`,
        reject: 'تم رفض الجهاز.',
        revoke: 'تم إلغاء اعتماد الجهاز.',
        update_grace_period: `تم تحديث مدة الثقة إلى ${getGraceDays(deviceId)} يومًا، واحتساب تاريخ انتهاء جديد من الآن.`,
      }

      setSuccess(messages[action])

      await loadDevices()
    } catch (err) {
      console.error('Trusted device action error:', err)
      setError('تعذر الاتصال بالخادم.')
    } finally {
      setProcessingId(null)
    }
  }

  function formatDate(value: string | null) {
    if (!value) return '—'

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) return '—'

    return new Intl.DateTimeFormat('ar-BH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  }

  function getRoleName(role: string) {
    switch (role) {
      case 'Admin':
        return 'مدير النظام'
      case 'Supervisor':
        return 'مشرف'
      case 'Teacher':
        return 'معلم'
      case 'Payments Manager':
        return 'مدير المدفوعات'
      default:
        return role
    }
  }

  function getDeviceTypeName(type: string | null) {
    if (!type || type === 'unknown') return 'غير محدد'

    const types: Record<string, string> = {
      iphone: 'iPhone',
      ipad: 'iPad',
      samsung: 'Samsung',
      android: 'Android',
      windows_pc: 'كمبيوتر Windows',
      mac: 'كمبيوتر Mac',
      linux_pc: 'كمبيوتر Linux',
    }

    return types[type] || type
  }

  function isExpired(device: TrustedDevice) {
    if (!device.grace_expires_at) return true

    const expiry = new Date(device.grace_expires_at).getTime()

    return !Number.isFinite(expiry) || expiry <= Date.now()
  }

  const userGroups = useMemo<UserGroup[]>(() => {
    const map = new Map<string, UserGroup>()

    for (const device of [...devices, ...approvedDevices]) {
      const authUserId = device.auth_user_id

      if (!map.has(authUserId)) {
        map.set(authUserId, {
          authUserId,
          username: device.user?.username ?? 'unknown',
          fullName: device.user?.full_name ?? null,
          role: device.user?.role ?? '',
          pendingDevices: [],
          approvedDevices: [],
        })
      }

      const group = map.get(authUserId)!

      if (device.status === 'pending') {
        group.pendingDevices.push(device)
      } else if (device.status === 'approved') {
        group.approvedDevices.push(device)
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      const aName = (a.fullName || a.username).toLocaleLowerCase('ar')
      const bName = (b.fullName || b.username).toLocaleLowerCase('ar')

      return aName.localeCompare(bName, 'ar')
    })
  }, [devices, approvedDevices])

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLocaleLowerCase('ar')

    if (!query) return userGroups

    return userGroups.filter((user) => {
      const fullName = (user.fullName ?? '').toLocaleLowerCase('ar')
      const username = user.username.toLocaleLowerCase('ar')

      return fullName.includes(query) || username.includes(query)
    })
  }, [userGroups, userSearch])

  const selectedUser = useMemo(
    () =>
      userGroups.find((user) => user.authUserId === selectedUserId) ??
      null,
    [userGroups, selectedUserId],
  )

  useEffect(() => {
    if (
      selectedUserId &&
      !userGroups.some((user) => user.authUserId === selectedUserId)
    ) {
      setSelectedUserId(null)
    }
  }, [userGroups, selectedUserId])

  const selectedUserDevices = useMemo(() => {
    if (!selectedUser) return []

    const latestApproved = getLatestApprovedDevicesByType(
      selectedUser.approvedDevices,
    )

    return [...selectedUser.pendingDevices, ...latestApproved]
  }, [selectedUser])

  const selectedUserVisibleApprovedCount = useMemo(() => {
    if (!selectedUser) return 0

    return getLatestApprovedDevicesByType(
      selectedUser.approvedDevices,
    ).length
  }, [selectedUser])

  const filteredDevices = useMemo(() => {
    const query = deviceSearch.trim().toLocaleLowerCase('ar')

    return selectedUserDevices.filter((device) => {
      if (deviceFilter === 'pending' && device.status !== 'pending') {
        return false
      }

      if (deviceFilter === 'approved' && device.status !== 'approved') {
        return false
      }

      if (
        deviceFilter === 'expired' &&
        (device.status !== 'approved' || !isExpired(device))
      ) {
        return false
      }

      if (!query) return true

      const type = getDeviceTypeName(
        device.pending_device_type || device.approved_device_type,
      ).toLocaleLowerCase('ar')

      const name = (device.device_name ?? '').toLocaleLowerCase('ar')
      const id = device.id.toLocaleLowerCase('ar')

      return (
        type.includes(query) ||
        name.includes(query) ||
        id.includes(query)
      )
    })
  }, [selectedUserDevices, deviceFilter, deviceSearch])

  const pendingCount = devices.length
  const approvedCount = approvedDevices.length
  const expiredCount = approvedDevices.filter(isExpired).length

  function renderGraceDaysInput(device: TrustedDevice, label: string) {
    return (
      <div className="space-y-2">
        <label
          htmlFor={`grace-days-${device.id}`}
          className="block text-sm font-medium"
        >
          {label}
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <input
            id={`grace-days-${device.id}`}
            type="number"
            min={1}
            max={MAX_GRACE_DAYS}
            step={1}
            value={getGraceDays(device.id)}
            onChange={(event) => {
              const value = event.target.valueAsNumber
              setGraceDays(device.id, Number.isNaN(value) ? 0 : value)
            }}
            disabled={processingId === device.id}
            className="w-24 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-300 disabled:opacity-50"
          />

          <span className="text-sm text-muted-foreground">يوم</span>

          {[15, 30, 90].map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setGraceDays(device.id, days)}
              disabled={processingId === device.id}
              className={`rounded-md border px-2.5 py-1.5 text-xs transition ${
                getGraceDays(device.id) === days
                  ? 'border-purple-300 bg-purple-100 text-purple-800 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-200'
                  : 'hover:bg-muted'
              }`}
            >
              {days} يوم
            </button>
          ))}
        </div>
      </div>
    )
  }

  function renderDeviceCard(device: TrustedDevice) {
    const pending = device.status === 'pending'
    const expired = device.status === 'approved' && isExpired(device)

    const detectedType =
      device.pending_device_type || device.approved_device_type

    return (
      <div
        key={device.id}
        className={`rounded-xl border p-4 transition-colors ${
          pending
            ? 'border-amber-200/80 bg-amber-50/40 dark:border-amber-900 dark:bg-amber-950/10'
            : expired
              ? 'border-red-200/80 bg-red-50/30 dark:border-red-900 dark:bg-red-950/10'
              : 'border-emerald-200/70 bg-emerald-50/30 dark:border-emerald-900 dark:bg-emerald-950/10'
        }`}
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div
                className={`rounded-lg p-2 ${
                  pending
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    : expired
                      ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                }`}
              >
                <MonitorSmartphone className="h-5 w-5" />
              </div>

              <span className="font-semibold">
                {device.device_name || 'جهاز جديد'}
              </span>

              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${
                  pending
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    : expired
                      ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                }`}
              >
                {pending
                  ? 'بانتظار الموافقة'
                  : expired
                    ? 'انتهت مدة الثقة'
                    : 'معتمد'}
              </span>
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">نوع الجهاز</p>
                <p className="mt-1 font-medium">
                  {getDeviceTypeName(detectedType)}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">تاريخ التسجيل</p>
                <p className="mt-1">{formatDate(device.created_at)}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">آخر استخدام</p>
                <p className="mt-1">{formatDate(device.last_used_at)}</p>
              </div>

              {!pending && (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground">مدة الثقة</p>
                    <p className="mt-1 font-medium">
                      {device.grace_period_days ?? DEFAULT_GRACE_DAYS} يومًا
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      انتهاء الثقة
                    </p>
                    <p className="mt-1">
                      {formatDate(device.grace_expires_at)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      تاريخ الموافقة
                    </p>
                    <p className="mt-1">{formatDate(device.approved_at)}</p>
                  </div>
                </>
              )}
            </div>

            {device.device_type_detected_at && (
              <p className="text-xs text-muted-foreground">
                آخر اكتشاف لنوع الجهاز:{' '}
                {formatDate(device.device_type_detected_at)}
              </p>
            )}

            <div className="rounded-lg border border-purple-100 bg-purple-50/70 p-3 dark:border-purple-900 dark:bg-purple-950/20">
              {renderGraceDaysInput(
                device,
                pending ? 'مدة الثقة بعد الموافقة' : 'تعديل مدة الثقة',
              )}

              <p className="mt-2 text-xs text-muted-foreground">
                {pending
                  ? 'تبدأ المدة عند الموافقة على الجهاز.'
                  : 'حفظ مدة جديدة يعيد احتساب تاريخ الانتهاء ابتداءً من الآن.'}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 xl:w-40 xl:flex-col">
            {pending ? (
              <>
                <button
                  type="button"
                  onClick={() => void handleAction(device.id, 'approve')}
                  disabled={processingId === device.id}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {processingId === device.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  موافقة
                </button>

                <button
                  type="button"
                  onClick={() => void handleAction(device.id, 'reject')}
                  disabled={processingId === device.id}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:bg-transparent dark:hover:bg-red-950/30"
                >
                  <X className="h-4 w-4" />
                  رفض
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() =>
                    void handleAction(device.id, 'update_grace_period')
                  }
                  disabled={processingId === device.id}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-sm text-purple-800 transition hover:bg-purple-100 disabled:opacity-50 dark:border-purple-900 dark:bg-purple-950/30 dark:text-purple-200 dark:hover:bg-purple-950/60"
                >
                  {processingId === device.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CalendarClock className="h-4 w-4" />
                  )}
                  حفظ المدة
                </button>

                <button
                  type="button"
                  onClick={() => void handleAction(device.id, 'revoke')}
                  disabled={processingId === device.id}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:hover:bg-red-950/30"
                >
                  <Ban className="h-4 w-4" />
                  إلغاء الاعتماد
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl" className="space-y-5 p-1">
      <div className="flex justify-start">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          <ArrowRight className="h-4 w-4" />
          عودة
        </button>
      </div>

      <PageHeader
        title="الأجهزة الموثوقة"
        description="اختر المستخدم لإدارة أجهزته المعتمدة والمعلقة."
      />

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
        >
          {success}
        </div>
      )}

      {/* الملخص بالألوان */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 p-3 dark:border-indigo-900 dark:bg-indigo-950/25">
          <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
            <div className="rounded-lg bg-indigo-100 p-2 dark:bg-indigo-900/60">
              <Users className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium">المستخدمون</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-indigo-950 dark:text-indigo-100">
            {userGroups.length}
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 dark:border-amber-900 dark:bg-amber-950/25">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
            <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-900/60">
              <Clock3 className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium">أجهزة معلقة</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-950 dark:text-amber-100">
            {pendingCount}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 dark:border-emerald-900 dark:bg-emerald-950/25">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
            <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-900/60">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium">أجهزة معتمدة</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-950 dark:text-emerald-100">
            {approvedCount}
          </p>
          {expiredCount > 0 && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              منها {expiredCount} انتهت مدة ثقتها
            </p>
          )}
        </div>
      </div>

      {/* اختيار المستخدم */}
      <Card className="overflow-hidden border-indigo-200/70 dark:border-indigo-900/70">
        <CardHeader className="border-b border-indigo-100 bg-indigo-50/50 pb-3 dark:border-indigo-900/60 dark:bg-indigo-950/20">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="rounded-lg bg-indigo-100 p-2 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                <UserRound className="h-5 w-5" />
              </span>
              المستخدم
            </CardTitle>

            <button
              type="button"
              onClick={() => void loadDevices()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm transition hover:bg-indigo-50 disabled:opacity-50 dark:border-indigo-900 dark:bg-background dark:hover:bg-indigo-950/40"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
              تحديث
            </button>
          </div>

          <CardDescription>
            ابحث باسم المستخدم أو اسمه الكامل، ثم اختره لعرض أجهزته.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 pt-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500" />

            <input
              type="search"
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              placeholder="ابحث باسم المستخدم أو الاسم الكامل..."
              className="w-full rounded-lg border border-indigo-200 bg-background py-3 pr-10 pl-4 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-indigo-900 dark:focus:ring-indigo-950"
            />
          </div>

          {selectedUser && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-indigo-200 bg-indigo-50 p-3 dark:border-indigo-900 dark:bg-indigo-950/30">
              <div className="flex min-w-0 items-center gap-3">
                <div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                  <UserRound className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <p className="font-semibold">
                    {selectedUser.fullName || selectedUser.username}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    @{selectedUser.username}
                    {selectedUser.role
                      ? ` · ${getRoleName(selectedUser.role)}`
                      : ''}
                  </p>
                  <p className="mt-1 text-xs text-indigo-700 dark:text-indigo-300">
                    المستخدم المحدد حاليًا
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedUserId(null)
                  setDeviceSearch('')
                  setDeviceFilter('all')
                }}
                className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm transition hover:bg-indigo-100 dark:border-indigo-800 dark:bg-background dark:hover:bg-indigo-950"
              >
                إلغاء الاختيار
              </button>
            </div>
          )}

          {/* السهم وحده يتحكم بفتح القائمة وإغلاقها */}
          <div className="overflow-hidden rounded-lg border border-indigo-200 dark:border-indigo-900">
            <button
              type="button"
              aria-expanded={showUserList}
              onClick={() => setShowUserList((value) => !value)}
              className="flex w-full items-center justify-between bg-indigo-50/80 px-3 py-3 text-sm transition hover:bg-indigo-100/80 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/60"
            >
              <span className="flex items-center gap-2 font-medium text-indigo-900 dark:text-indigo-200">
                <Users className="h-4 w-4" />
                {loading
                  ? 'جارٍ تحميل المستخدمين...'
                  : showUserList
                    ? `${filteredUsers.length} مستخدم — اضغط لإغلاق القائمة`
                    : selectedUser
                      ? 'تغيير المستخدم'
                      : `${filteredUsers.length} مستخدم — عرض القائمة`}
              </span>

              <ChevronDown
                className={`h-5 w-5 text-indigo-700 transition-transform duration-200 dark:text-indigo-300 ${
                  showUserList ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showUserList && (
              <>
                {loading ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    جارٍ تحميل البيانات...
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <p className="p-5 text-center text-sm text-muted-foreground">
                    لا يوجد مستخدمون مطابقون للبحث.
                  </p>
                ) : (
                  <div className="max-h-72 divide-y divide-indigo-100 overflow-y-auto dark:divide-indigo-950">
                    {filteredUsers.map((user) => {
                      const selected = user.authUserId === selectedUserId
                      const userPendingCount = user.pendingDevices.length

                      const userApprovedCount =
                        getLatestApprovedDevicesByType(
                          user.approvedDevices,
                        ).length

                      return (
                        <button
                          key={user.authUserId}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => {
                            // الاختيار لا يغلق القائمة ولا يلغي نفسه.
                            // يمكن الضغط على مستخدم آخر للتبديل مباشرة.
                            setSelectedUserId(user.authUserId)
                            setDeviceFilter('all')
                            setDeviceSearch('')
                          }}
                          className={`flex w-full items-center justify-between gap-3 border-r-4 px-3 py-3 text-right transition ${
                            selected
                              ? 'border-r-indigo-600 bg-indigo-100/80 dark:border-r-indigo-400 dark:bg-indigo-950/70'
                              : 'border-r-transparent bg-background hover:bg-indigo-50/70 dark:hover:bg-indigo-950/30'
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div
                              className={`rounded-xl p-2.5 transition ${
                                selected
                                  ? 'bg-indigo-200 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
                                  : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300'
                              }`}
                            >
                              <UserRound className="h-4 w-4" />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {user.fullName || user.username}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                @{user.username}
                                {user.role
                                  ? ` · ${getRoleName(user.role)}`
                                  : ''}
                              </p>
                              {selected && (
                                <p className="mt-1 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                                  <Check className="ml-1 inline h-3.5 w-3.5" />
                                  محدد
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 text-xs">
                            {userPendingCount > 0 && (
                              <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                {userPendingCount} معلق
                              </span>
                            )}

                            <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              {userApprovedCount} معتمد
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* أجهزة المستخدم المختار */}
      {selectedUser ? (
        <div className="space-y-4">
          <Card className="border-purple-200/70 dark:border-purple-900/70">
            <CardHeader className="border-b border-purple-100 bg-purple-50/50 pb-3 dark:border-purple-900/60 dark:bg-purple-950/20">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="rounded-lg bg-purple-100 p-2 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300">
                  <MonitorSmartphone className="h-5 w-5" />
                </span>
                أجهزة {selectedUser.fullName || selectedUser.username}
              </CardTitle>

              <CardDescription>
                معلقة: {selectedUser.pendingDevices.length} · معتمدة:{' '}
                {selectedUserVisibleApprovedCount}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 pt-4">
              <button
                type="button"
                onClick={() => setShowFilters((value) => !value)}
                className="flex w-full items-center justify-between rounded-lg border border-purple-200 bg-purple-50/70 px-3 py-3 text-sm transition hover:bg-purple-100/70 dark:border-purple-900 dark:bg-purple-950/20 dark:hover:bg-purple-950/50"
              >
                <span className="flex items-center gap-2 font-medium text-purple-800 dark:text-purple-200">
                  <Filter className="h-4 w-4" />
                  فلاتر الأجهزة
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-purple-700 transition-transform dark:text-purple-300 ${
                    showFilters ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {showFilters && (
                <div className="space-y-3 rounded-lg border border-purple-200 bg-purple-50/40 p-3 dark:border-purple-900 dark:bg-purple-950/10">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium">
                        حالة الجهاز
                      </label>

                      <select
                        value={deviceFilter}
                        onChange={(event) =>
                          setDeviceFilter(
                            event.target.value as DeviceFilter,
                          )
                        }
                        className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-300 dark:focus:ring-purple-900"
                      >
                        <option value="all">كل الأجهزة</option>
                        <option value="pending">الأجهزة المعلقة</option>
                        <option value="approved">الأجهزة المعتمدة</option>
                        <option value="expired">منتهية الثقة</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium">
                        البحث داخل الأجهزة
                      </label>

                      <input
                        type="search"
                        value={deviceSearch}
                        onChange={(event) =>
                          setDeviceSearch(event.target.value)
                        }
                        placeholder="اسم الجهاز أو نوعه..."
                        className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-300 dark:focus:ring-purple-900"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setDeviceFilter('all')
                      setDeviceSearch('')
                    }}
                    className="text-xs text-purple-700 underline underline-offset-4 transition hover:text-purple-950 dark:text-purple-300 dark:hover:text-purple-100"
                  >
                    مسح الفلاتر
                  </button>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                عدد الأجهزة المطابقة: {filteredDevices.length}
              </p>
            </CardContent>
          </Card>

          {/* جميع الأجهزة المعلقة */}
          {(deviceFilter === 'all' || deviceFilter === 'pending') && (
            <Card className="overflow-hidden border-amber-200/80 dark:border-amber-900/70">
              <CardHeader className="border-b border-amber-100 bg-amber-50/70 pb-3 dark:border-amber-900/60 dark:bg-amber-950/20">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="rounded-lg bg-amber-100 p-2 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                    <Clock3 className="h-5 w-5" />
                  </span>
                  الأجهزة المعلقة
                  <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                    {
                      filteredDevices.filter(
                        (device) => device.status === 'pending',
                      ).length
                    }
                  </span>
                </CardTitle>

                <CardDescription>
                  الأجهزة التي تحتاج إلى موافقة يدوية.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 pt-4">
                {filteredDevices.filter(
                  (device) => device.status === 'pending',
                ).length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    لا توجد أجهزة معلقة مطابقة.
                  </p>
                ) : (
                  filteredDevices
                    .filter((device) => device.status === 'pending')
                    .map(renderDeviceCard)
                )}
              </CardContent>
            </Card>
          )}

          {/* أحدث جهاز معتمد من كل نوع */}
          {(deviceFilter === 'all' ||
            deviceFilter === 'approved' ||
            deviceFilter === 'expired') && (
            <Card className="overflow-hidden border-emerald-200/80 dark:border-emerald-900/70">
              <CardHeader className="border-b border-emerald-100 bg-emerald-50/70 pb-3 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="rounded-lg bg-emerald-100 p-2 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  الأجهزة المعتمدة
                  <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-xs text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200">
                    {
                      filteredDevices.filter(
                        (device) => device.status === 'approved',
                      ).length
                    }
                  </span>
                </CardTitle>

                <CardDescription>
                  يظهر أحدث جهاز من كل نوع. يمكنك تعديل مدة الثقة أو إلغاء
                  اعتماد الجهاز دون حذف سجله.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 pt-4">
                {filteredDevices.filter(
                  (device) => device.status === 'approved',
                ).length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    لا توجد أجهزة معتمدة مطابقة.
                  </p>
                ) : (
                  filteredDevices
                    .filter((device) => device.status === 'approved')
                    .map(renderDeviceCard)
                )}
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-indigo-300 bg-indigo-50/40 p-10 text-center dark:border-indigo-900 dark:bg-indigo-950/10">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
            <Users className="h-9 w-9" />
          </div>
          <p className="font-medium">اختر مستخدمًا لعرض أجهزته</p>
          <p className="mt-1 text-sm text-muted-foreground">
            افتح القائمة من السهم، ثم اضغط على المستخدم المطلوب.
          </p>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-xs leading-6 text-muted-foreground dark:border-slate-800 dark:bg-slate-900/30">
        حالة الجهاز ومدة الثقة يجب التحقق منهما في الخادم أيضًا. تغيير
        الفلاتر هنا يؤثر على العرض فقط ولا يغيّر حالة الأجهزة في قاعدة
        البيانات. حذف الأجهزة القديمة بعد 45 يومًا يبقى مسؤولية مهمة
        التنظيف المجدولة في Supabase.
      </div>
    </div>
  )
}
