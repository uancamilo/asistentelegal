'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import apiClient from '@/lib/api/client'
import { ArrowLeft, Loader2 } from 'lucide-react'
import type { User, Role, UserStatus } from '@/lib/types'
import { translateRole, translateUserStatus } from '@/lib/translations'

export default function EditUserPage() {
  const router = useRouter()
  const params = useParams()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'MEMBER' as Role,
    status: 'ACTIVE' as UserStatus,
    accountId: '',
  })

  useEffect(() => {
    fetchUser()
  }, [params.id])

  const fetchUser = async () => {
    try {
      const response = await apiClient.get(`/users/${params.id}`)
      const userData = response.data
      setUser(userData)
      setFormData({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        role: userData.role,
        status: userData.status,
        accountId: userData.accountId || '',
      })
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'No se pudo cargar el usuario',
        variant: 'destructive',
      })
      router.push('/admin/usuarios')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { accountId, ...payload } = formData
      await apiClient.patch(`/users/${params.id}`, payload)
      addToast({
        title: 'Éxito',
        description: 'Usuario actualizado correctamente',
        variant: 'success',
      })
      router.push('/admin/usuarios')
    } catch (error: any) {
      addToast({
        title: 'Error',
        description: error.response?.data?.message || 'No se pudo actualizar el usuario',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const getRoleBadgeVariant = (role: Role): 'default' | 'secondary' | 'destructive' => {
    if (role === 'SUPER_ADMIN') return 'destructive'
    if (role === 'ADMIN') return 'default'
    return 'secondary'
  }

  const getStatusBadgeVariant = (
    status: UserStatus
  ): 'default' | 'secondary' | 'destructive' => {
    if (status === 'ACTIVE') return 'default'
    if (status === 'SUSPENDED') return 'destructive'
    return 'secondary'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">Editar Usuario</h1>
          <Badge variant={getRoleBadgeVariant(user.role)}>{translateRole(user.role)}</Badge>
          <Badge variant={getStatusBadgeVariant(user.status)}>{translateUserStatus(user.status)}</Badge>
        </div>
        <p className="text-muted-foreground">ID: {user.id}</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Información del Usuario</CardTitle>
          <CardDescription>Actualice los datos del usuario</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nombre *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Nombre"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Apellido *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Apellido"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="usuario@ejemplo.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Rol *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value as Role })}
                disabled={user.role === 'SUPER_ADMIN'}
                name="role"
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUPER_ADMIN">Super Administrador</SelectItem>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                  <SelectItem value="ACCOUNT_OWNER">Propietario de Cuenta</SelectItem>
                  <SelectItem value="EDITOR">Editor</SelectItem>
                  <SelectItem value="MEMBER">Miembro</SelectItem>
                </SelectContent>
              </Select>
              {user.role === 'SUPER_ADMIN' && (
                <p className="text-xs text-muted-foreground">
                  El rol Super Administrador no puede ser modificado
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Estado *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as UserStatus })}
                name="status"
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Activo</SelectItem>
                  <SelectItem value="SUSPENDED">Suspendido</SelectItem>
                  <SelectItem value="INVITED">Invitado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountId">ID de Cuenta</Label>
              <Input
                id="accountId"
                value={formData.accountId || 'Sin cuenta asignada'}
                disabled
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">
                El ID de cuenta no puede ser modificado desde este formulario
              </p>
            </div>

            <div className="space-y-2">
              <Label>Fechas</Label>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Creado:</span>{' '}
                  {new Date(user.createdAt).toLocaleString('es-ES')}
                </div>
                <div>
                  <span className="text-muted-foreground">Actualizado:</span>{' '}
                  {new Date(user.updatedAt).toLocaleString('es-ES')}
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
