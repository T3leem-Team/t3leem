import { redirect } from 'next/navigation'

import { requireDashboardSection } from '@/lib/auth/authorization'

export default async function DashboardSectionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { error } =
    await requireDashboardSection('dashboard')

  if (error) {
    if (error.status === 401) {
      redirect('/login')
    }

    redirect('/')
  }

  return children
}
