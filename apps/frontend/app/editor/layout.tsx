import { ProtectedLayout } from '@/components/layout/ProtectedLayout'
import { Role } from '@/lib/types'

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedLayout allowedRoles={[Role.SUPER_ADMIN, Role.EDITOR]}>
      {children}
    </ProtectedLayout>
  )
}
