'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import apiClient from '@/lib/api/client'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { ComponentLoadingIndicator, ButtonLoadingIndicator } from '@/components/ui/LoadingIndicator'
import { useAuth } from '@/lib/useAuth'

export default function NewAccountPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const { user, isLoading: isAuthLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')

  // Validar permisos al montar el componente
  useEffect(() => {
    if (!isAuthLoading && user) {
      // Verificar que el usuario tenga permisos de SUPER_ADMIN o ADMIN
      const allowedRoles = ['SUPER_ADMIN', 'ADMIN']
      if (!allowedRoles.includes(user.role)) {
        addToast({
          title: 'Acceso denegado',
          description: 'No tienes permisos para crear cuentas',
          variant: 'destructive',
        })
        router.push('/admin')
      }
    }
  }, [user, isAuthLoading, router, addToast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setLoading(true)

    try {
      // Solo enviar el nombre de la cuenta
      // El backend asignará automáticamente createdBy desde el usuario autenticado
      const payload = {
        name: name.trim(),
      }

      await apiClient.post('/accounts', payload)
      addToast({
        title: 'Éxito',
        description: 'Cuenta creada correctamente. El propietario se asignará posteriormente.',
        variant: 'success',
      })
      router.push('/admin/accounts')
    } catch (error: any) {
      addToast({
        title: 'Error',
        description: error.response?.data?.message || 'No se pudo crear la cuenta',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Mostrar loading mientras se verifica la autenticación
  if (isAuthLoading) {
    return (
      <ComponentLoadingIndicator 
        message="Verificando permisos"
        size="lg"
        className="h-96"
      />
    )
  }

  // Verificar que el usuario esté autenticado
  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-destructive mb-4">
              <AlertCircle className="h-5 w-5" />
              <p className="font-semibold">No autenticado</p>
            </div>
            <p className="text-muted-foreground mb-4">
              Debes iniciar sesión para acceder a esta página.
            </p>
            <Button onClick={() => router.push('/login')}>
              Ir al Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Verificar permisos (SUPER_ADMIN o ADMIN)
  const allowedRoles = ['SUPER_ADMIN', 'ADMIN']
  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-destructive mb-4">
              <AlertCircle className="h-5 w-5" />
              <p className="font-semibold">Acceso denegado</p>
            </div>
            <p className="text-muted-foreground mb-4">
              No tienes permisos para crear cuentas. Solo los usuarios con rol SUPER_ADMIN o ADMIN pueden acceder a esta función.
            </p>
            <Button onClick={() => router.push('/admin')}>
              Volver al Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <Button variant="ghost" onClick={() => router.back()} className="mb-3 sm:mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Nueva Cuenta</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">Crear una nueva cuenta en el sistema</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Nueva Cuenta</CardTitle>
          <CardDescription>
            Complete los datos para crear una nueva cuenta. El propietario se asignará posteriormente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mostrar información del usuario que está creando la cuenta */}
          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <p className="text-sm text-muted-foreground mb-1">Cuenta creada por:</p>
            <p className="font-medium">{user.firstName} {user.lastName}</p>
            <p className="text-sm text-muted-foreground">{user.email} ({user.role})</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la Cuenta *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Empresa ABC S.A."
                required
                minLength={3}
                maxLength={100}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Ingrese un nombre único para identificar esta cuenta (3-100 caracteres). El nombre se guardará automáticamente en MAYÚSCULAS.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
              <Button type="submit" disabled={loading || !name.trim()} className="w-full sm:w-auto">
                {loading ? 'Creando...' : 'Crear Cuenta'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading} className="w-full sm:w-auto">
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
