import { redirect } from 'next/navigation'
import { requirePermission } from '@/lib/auth/authorization'
import UsersClient from './users-client'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const authorization =
    await requirePermission('users.view')

  if (authorization.error) {
    if (authorization.error.status === 403) {
      redirect('/?reason=forbidden')
    }

    throw new Error(
      'تعذر التحقق من صلاحية عرض المستخدمين حالياً.',
    )
  }

  if (!authorization.access) {
    throw new Error(
      'تعذر التحقق من صلاحية عرض المستخدمين حالياً.',
    )
  }

  return <UsersClient />
}
