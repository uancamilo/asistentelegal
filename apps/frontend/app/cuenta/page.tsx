'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/useAuth'
import { useToast } from '@/components/ui/toast'
import { ComponentLoadingIndicator } from '@/components/ui/LoadingIndicator'
import { Building2, Users, Calendar, Shield, AlertCircle } from 'lucide-react'
import { getCompleteProfile, type CompleteProfile } from '@/lib/api/profile'
import { translateAccountStatus } from '@/lib/translations'

export default function CuentaPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { addToast } = useToast()
  const [profile, setProfile] = useState<CompleteProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
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
      fetchProfile()
    }
  }, [user])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const data = await getCompleteProfile()
      if (!data.account) {
        addToast({
          title: 'Sin cuenta',
          description: 'No tienes una cuenta asociada',
          variant: 'destructive',
        })
        router.push('/perfil')
        return
      }
      setProfile(data)
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'No se pudo cargar la información de la cuenta',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <ComponentLoadingIndicator
        message="Cargando información de la cuenta"
        size="lg"
        height="lg"
      />
    )
  }

  if (!profile || !profile.account) {
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
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Nombre de la Cuenta
              </label>
              <Input
                value={profile.account.name}
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
                  {getStatusBadge(profile.account.status)}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Tipo de Cuenta
                </label>
                <Input
                  value={profile.account.isSystemAccount ? 'Cuenta del Sistema' : 'Cuenta de Cliente'}
                  disabled
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha de Creación
              </label>
              <Input
                value={new Date(profile.account.createdAt).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
                disabled
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Última Actualización
              </label>
              <Input
                value={new Date(profile.account.updatedAt).toLocaleDateString('es-ES', {
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
              <label className="text-sm font-medium text-gray-700">
                ID de la Cuenta
              </label>
              <Input
                value={profile.account.id}
                disabled
                className="mt-1 font-mono text-xs"
              />
            </div>

            {profile.account.ownerId && (
              <div>
                <label className="text-sm font-medium text-gray-700">
                  ID del Propietario
                </label>
                <Input
                  value={profile.account.ownerId}
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
