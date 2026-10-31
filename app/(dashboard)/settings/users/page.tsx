
import { redirect } from 'next/navigation'
import { getAuthContext } from '@/lib/auth/auth-context'
import UsersClient from './users-client'

export default async function Page() {
  const access = await getAuthContext()

  if (!access.allowed) {
    redirect('/login')
  }

  return <UsersClient />
}
