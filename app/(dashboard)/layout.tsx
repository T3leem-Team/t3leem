import { redirect } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'

import { DashboardShell } from '@/components/dashboard/shell'
import { validateCurrentAccess } from '@/lib/auth-guard'
import { isMaintenanceMode } from '@/lib/system-control'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  noStore()

  const access = await validateCurrentAccess()

  if (!access.allowed) {
    if (access.reason === 'guard_error') {
      throw new Error(
        'تعذر التحقق من جلسة المستخدم مؤقتًا.',
      )
    }

    redirect(
      `/login?reason=${encodeURIComponent(
        access.reason ?? 'session_expired',
      )}`,
    )
  }

  let maintenanceMode: boolean

  try {
    maintenanceMode = await isMaintenanceMode()
  } catch {
    throw new Error(
      'تعذر التحقق من حالة النظام مؤقتًا.',
    )
  }

  const isPrimaryAdmin =
    access.username === 'admin' &&
    access.role === 'Admin'

  if (maintenanceMode && !isPrimaryAdmin) {
    redirect('/maintenance')
  }

  return (
    <DashboardShell>
      {children}
    </DashboardShell>
  )
}
