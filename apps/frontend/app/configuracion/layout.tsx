import { ProtectedLayout } from '@/components/layout/ProtectedLayout'
import { Role } from '@/lib/types'

export default function ConfiguracionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedLayout allowedRoles={[Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNT_OWNER, Role.EDITOR, Role.MEMBER]}>
      {children}
    </ProtectedLayout>
  )
}
