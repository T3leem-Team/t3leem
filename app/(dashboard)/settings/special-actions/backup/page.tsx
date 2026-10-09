import { redirect } from 'next/navigation'
import { requirePermission } from '@/lib/auth/authorization'
import BackupClient from './backup-client'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const authorization =
    await requirePermission('backup.manage')

  if (authorization.error) {
    if (authorization.error.status === 403) {
      redirect('/?reason=forbidden')
    }

    throw new Error(
      'تعذر التحقق من صلاحية النسخة الاحتياطية حالياً.',
    )
  }

  if (!authorization.access) {
    throw new Error(
      'تعذر التحقق من صلاحية النسخة الاحتياطية حالياً.',
    )
  }

  return <BackupClient />
}
