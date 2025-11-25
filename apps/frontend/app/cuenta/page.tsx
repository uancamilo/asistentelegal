'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/useAuth'
import { useToast } from '@/components/ui/toast'
import { ComponentLoadingIndicator } from '@/components/ui/LoadingIndicator'
import { Building2, Users, Calendar, Shield, AlertCircle } from 'lucide-react'
import { translateAccountStatus } from '@/lib/translations'

export default function CuentaPage() {
  const router = useRouter()
  const { user, completeProfile, isLoadingProfile, isLoading } = useAuth()
  const { addToast } = useToast()

  useEffect(() => {
    if (!isLoading && user) {
      // Check if user has permission to access this page
      if (!['SUPER_ADMIN', 'ADMIN', 'ACCOUNT_OWNER'].includes(user.role)) {
        addToast({
          title: 'Acceso denegado',
          description: 'No tienes permisos para acceder a esta página',
          variant: 'destructive',
        })
        router.push('/perfil')
        return
      }
    }
  }, [user, isLoading, addToast, router])

  useEffect(() => {
    // Redirect if profile loaded but no account
    if (!isLoading && !isLoadingProfile && completeProfile && !completeProfile.account) {
      addToast({
        title: 'Sin cuenta',
        description: 'No tienes una cuenta asociada',
        variant: 'destructive',
      })
      router.push('/perfil')
    }
  }, [completeProfile, isLoading, isLoadingProfile, addToast, router])

  if (isLoading || isLoadingProfile) {
    return (
      <ComponentLoadingIndicator
        message="Cargando información de la cuenta"
        size="lg"
        height="lg"
      />
    )
  }

  if (!completeProfile || !completeProfile.account) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-gray-500">No se pudo cargar la información de la cuenta</p>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: any }> = {
      PENDING: { variant: 'secondary' },
      ACTIVE: { variant: 'success' },
      INACTIVE: { variant: 'default' },
      SUSPENDED: { variant: 'destructive' },
    }
    const statusConfig = config[status] || config.PENDING
    return <Badge variant={statusConfig.variant}>{translateAccountStatus(status)}</Badge>
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Mi Cuenta</h1>
        <p className="text-muted-foreground text-sm mt-2">
          Información y configuración de tu cuenta
        </p>
      </div>

      <div className="space-y-6">
        {/* Account Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Información de la Cuenta
            </CardTitle>
            <CardDescription>
              Detalles principales de tu cuenta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="accountName" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Nombre de la Cuenta
              </label>
              <Input
                id="accountName"
                name="accountName"
                type="text"
                value={completeProfile.account.name}
                disabled
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Estado
                </label>
                <div className="mt-2">
                  {getStatusBadge(completeProfile.account.status)}
                </div>
              </div>
              <div>
                <label htmlFor="accountType" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Tipo de Cuenta
                </label>
                <Input
                  id="accountType"
                  name="accountType"
                  type="text"
                  value={completeProfile.account.isSystemAccount ? 'Cuenta del Sistema' : 'Cuenta de Cliente'}
                  disabled
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <label htmlFor="createdAt" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha de Creación
              </label>
              <Input
                id="createdAt"
                name="createdAt"
                type="text"
                value={new Date(completeProfile.account.createdAt).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
                disabled
                className="mt-1"
              />
            </div>

            <div>
              <label htmlFor="updatedAt" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Última Actualización
              </label>
              <Input
                id="updatedAt"
                name="updatedAt"
                type="text"
                value={new Date(completeProfile.account.updatedAt).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
                disabled
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Account Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Detalles de la Cuenta
            </CardTitle>
            <CardDescription>
              Información adicional y configuración
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="accountId" className="text-sm font-medium text-gray-700">
                ID de la Cuenta
              </label>
              <Input
                id="accountId"
                name="accountId"
                type="text"
                value={completeProfile.account.id}
                disabled
                className="mt-1 font-mono text-xs"
              />
            </div>

            {completeProfile.account.ownerId && (
              <div>
                <label htmlFor="ownerId" className="text-sm font-medium text-gray-700">
                  ID del Propietario
                </label>
                <Input
                  id="ownerId"
                  name="ownerId"
                  type="text"
                  value={completeProfile.account.ownerId}
                  disabled
                  className="mt-1 font-mono text-xs"
                />
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Nota:</strong> Para gestionar usuarios de esta cuenta, ve a la sección de Usuarios en el panel de administración.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button variant="outline" disabled>
            Editar Cuenta
          </Button>
          <Button variant="outline" disabled>
            Gestionar Usuarios
          </Button>
        </div>

        <div className="flex justify-end">
          <p className="text-sm text-gray-500 italic">
            Funcionalidad de edición en desarrollo
          </p>
        </div>
      </div>
    </div>
  )
}
