'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/useAuth'
import { ComponentLoadingIndicator } from '@/components/ui/LoadingIndicator'
import { UserCircle, Mail, User, Calendar, Shield } from 'lucide-react'
import { translateRole, translateUserStatus, translateAccountStatus } from '@/lib/translations'

export default function PerfilPage() {
  const { completeProfile, isLoadingProfile, isLoading } = useAuth()

  if (isLoading || isLoadingProfile) {
    return (
      <ComponentLoadingIndicator
        message="Cargando perfil"
        size="lg"
        height="lg"
      />
    )
  }

  if (!completeProfile) {
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
                <label htmlFor="firstName" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Nombre
                </label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  value={completeProfile.user.firstName}
                  disabled
                  className="mt-1"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Apellido
                </label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  value={completeProfile.user.lastName}
                  disabled
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Correo Electrónico
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={completeProfile.user.email}
                disabled
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="role" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Rol
                </label>
                <Input
                  id="role"
                  name="role"
                  type="text"
                  value={translateRole(completeProfile.user.role)}
                  disabled
                  className="mt-1"
                />
              </div>
              <div>
                <label htmlFor="status" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Estado
                </label>
                <Input
                  id="status"
                  name="status"
                  type="text"
                  value={translateUserStatus(completeProfile.user.status)}
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
                value={new Date(completeProfile.user.createdAt).toLocaleDateString('es-ES', {
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
        {completeProfile.account && (
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
                <label htmlFor="accountName" className="text-sm font-medium text-gray-700">
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
              <div>
                <label htmlFor="accountStatus" className="text-sm font-medium text-gray-700">
                  Estado de la Cuenta
                </label>
                <Input
                  id="accountStatus"
                  name="accountStatus"
                  type="text"
                  value={translateAccountStatus(completeProfile.account.status)}
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
