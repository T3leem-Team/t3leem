import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/shell'
import { validateCurrentAccess } from '@/lib/auth-guard'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const access = await validateCurrentAccess()

  if (!access.allowed) {
    redirect('/login?reason=session_expired')
  }

  return (
    <DashboardShell>
      {children}
    </DashboardShell>
  )
}