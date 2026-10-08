import { redirect } from 'next/navigation'

import { requireDashboardSection } from '@/lib/auth/authorization'

export default async function EnrollmentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { error } =
    await requireDashboardSection('enrollment')

  if (error) {
    if (error.status === 401) {
      redirect('/login')
    }

    redirect('/')
  }

  return children
}
