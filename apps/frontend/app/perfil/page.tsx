'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/useAuth'
import { useToast } from '@/components/ui/toast'
import { ComponentLoadingIndicator } from '@/components/ui/LoadingIndicator'
import { UserCircle, Mail, User, Calendar, Shield } from 'lucide-react'
import { getCompleteProfile, type CompleteProfile } from '@/lib/api/profile'
import { translateRole, translateUserStatus, translateAccountStatus } from '@/lib/translations'

export default function PerfilPage() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [profile, setProfile] = useState<CompleteProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchProfile()
    }
  }, [user])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const data = await getCompleteProfile()
      setProfile(data)
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'No se pudo cargar el perfil',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <ComponentLoadingIndicator
        message="Cargando perfil"
        size="lg"
        height="lg"
      />
    )
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-gray-500">No se pudo cargar el perfil</p>
      </div>
    )
  }


  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Mi Perfil</h1>
        <p className="text-muted-foreground text-sm mt-2">
          Información personal y datos de usuario
        </p>
      </div>

      <div className="space-y-6">
        {/* Personal Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5" />
              Información Personal
            </CardTitle>
            <CardDescription>
              Tus datos personales y de contacto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Nombre
                </label>
                <Input
                  value={profile.user.firstName}
                  disabled
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Apellido
                </label>
                <Input
                  value={profile.user.lastName}
                  disabled
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Correo Electrónico
              </label>
              <Input
                value={profile.user.email}
                disabled
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Rol
                </label>
                <Input
                  value={translateRole(profile.user.role)}
                  disabled
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Estado
                </label>
                <Input
                  value={translateUserStatus(profile.user.status)}
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
                value={new Date(profile.user.createdAt).toLocaleDateString('es-ES', {
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

        {/* Account Information Card (if user has account) */}
        {profile.account && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="h-5 w-5" />
                Información de la Cuenta
              </CardTitle>
              <CardDescription>
                Cuenta a la que perteneces
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Nombre de la Cuenta
                </label>
                <Input
                  value={profile.account.name}
                  disabled
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Estado de la Cuenta
                </label>
                <Input
                  value={translateAccountStatus(profile.account.status)}
                  disabled
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button variant="outline" disabled>
            Editar Perfil
          </Button>
          <Button variant="outline" disabled>
            Cambiar Contraseña
          </Button>
        </div>
      </div>
    </div>
  )
}
