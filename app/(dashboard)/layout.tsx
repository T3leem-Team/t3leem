import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/shell'
import { SessionHeartbeat } from '@/components/auth/session-heartbeat'
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
    <>
      <SessionHeartbeat />

      <DashboardShell>
        {children}
      </DashboardShell>
    </>
  )
}