import { redirect } from 'next/navigation'
import { validateCurrentAccess } from '@/lib/auth-guard'
import UsersClient from './users-client'

export default async function Page() {
  const access = await validateCurrentAccess()

  if (!access.allowed) {
    redirect('/login')
  }

  return <UsersClient />
}
