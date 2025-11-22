'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/lib/useAuth'
import apiClient from '@/lib/api/client'
import {
  ArrowLeft,
  Mail,
  Users,
  AlertCircle,
  User,
  Shield,
  UserPlus,
  Trash2,
  ToggleLeft,
  ToggleRight
} from 'lucide-react'
import { ComponentLoadingIndicator, ButtonLoadingIndicator } from '@/components/ui/LoadingIndicator'
import type { Account } from '@/lib/types'
import { translateRole, translateUserStatus } from '@/lib/translations'

interface ExtendedAccount extends Omit<Account, 'creator' | 'owner'> {
  creator?: {
    firstName: string
    lastName: string
    email: string
  }
  owner?: {
    firstName: string
    lastName: string
    email: string
  }
}

export default function EditAccountPage() {
  const router = useRouter()
  const params = useParams()
  const { addToast } = useToast()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const [account, setAccount] = useState<ExtendedAccount | null>(null)
  const [accountName, setAccountName] = useState('')

  const [invitationData, setInvitationData] = useState({
    email: '',
    maxUsers: 5
  })

  const [formErrors, setFormErrors] = useState({
    email: '',
    maxUsers: ''
  })

  // Estados para gestión de usuarios/empleados
  const [users, setUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [creatingUser, setCreatingUser] = useState(false)
  const [showUserForm, setShowUserForm] = useState(false)
  const [newUserData, setNewUserData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'MEMBER'
  })

  useEffect(() => {
    fetchAccount()
  }, [params.id])

  useEffect(() => {
    if (account && user?.role === 'SUPER_ADMIN') {
      fetchAccountUsers()
    }
  }, [account, user])

  const fetchAccount = async () => {
    try {
      const response = await apiClient.get(`/accounts/${params.id}`)
      const accountData = response.data

      if (!accountData || !accountData.id) {
        throw new Error('Datos de cuenta inválidos')
      }

      setAccount(accountData)
      setAccountName(accountData.name || '')
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'No se pudo cargar la cuenta',
        variant: 'destructive',
      })
      router.push('/admin/accounts')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      await apiClient.patch(`/accounts/${params.id}`, { name: accountName })
      addToast({
        title: 'Éxito',
        description: 'Cuenta actualizada correctamente',
        variant: 'success',
      })
      await fetchAccount()
    } catch (error: any) {
      addToast({
        title: 'Error',
        description: error.response?.data?.message || 'No se pudo actualizar la cuenta',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async () => {
    if (!confirm('¿Está seguro de que desea desactivar esta cuenta? Los usuarios no podrán acceder hasta que se reactive.')) {
      return
    }

    setDeactivating(true)
    try {
      await apiClient.patch(`/accounts/${params.id}`, { status: 'INACTIVE' })
      addToast({
        title: 'Éxito',
        description: 'Cuenta desactivada correctamente',
        variant: 'success',
      })
      await fetchAccount()
    } catch (error: any) {
      addToast({
        title: 'Error',
        description: error.response?.data?.message || 'No se pudo desactivar la cuenta',
        variant: 'destructive',
      })
    } finally {
      setDeactivating(false)
    }
  }

  // Validar email
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email.trim()) {
      setFormErrors(prev => ({ ...prev, email: 'El email es requerido' }))
      return false
    }
    if (!emailRegex.test(email)) {
      setFormErrors(prev => ({ ...prev, email: 'Formato de email inválido' }))
      return false
    }
    setFormErrors(prev => ({ ...prev, email: '' }))
    return true
  }

  // Validar maxUsers
  const validateMaxUsers = (value: number): boolean => {
    if (!value || value < 1) {
      setFormErrors(prev => ({ ...prev, maxUsers: 'Debe ser al menos 1 usuario' }))
      return false
    }
    if (!Number.isInteger(value)) {
      setFormErrors(prev => ({ ...prev, maxUsers: 'Debe ser un número entero' }))
      return false
    }
    setFormErrors(prev => ({ ...prev, maxUsers: '' }))
    return true
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value
    setInvitationData(prev => ({ ...prev, email }))
    if (email) validateEmail(email)
  }

  const handleMaxUsersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0
    setInvitationData(prev => ({ ...prev, maxUsers: value }))
    if (value) validateMaxUsers(value)
  }

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault()

    const isEmailValid = validateEmail(invitationData.email)
    const isMaxUsersValid = validateMaxUsers(invitationData.maxUsers)

    if (!isEmailValid || !isMaxUsersValid) {
      return
    }

    setInviting(true)

    try {
      const payload = {
        email: invitationData.email.trim().toLowerCase(),
        maxUsers: invitationData.maxUsers
      }

      await apiClient.post(`/accounts/${params.id}/invite-owner`, payload)

      addToast({
        title: 'Invitación enviada',
        description: `Se ha enviado una invitación a ${invitationData.email}`,
        variant: 'success',
      })

      await fetchAccount()

      setInvitationData({ email: '', maxUsers: 5 })

    } catch (err: any) {
      const errorMessage = err.response?.data?.message

      if (errorMessage?.includes('already has an owner')) {
        addToast({
          title: 'Error',
          description: 'Esta cuenta ya tiene un propietario asignado',
          variant: 'destructive',
        })
      } else if (errorMessage?.includes('pending invitation')) {
        addToast({
          title: 'Error',
          description: 'Ya existe una invitación pendiente para esta cuenta',
          variant: 'destructive',
        })
      } else if (errorMessage?.includes('already exists')) {
        addToast({
          title: 'Error',
          description: 'Este email ya está registrado en el sistema',
          variant: 'destructive',
        })
      } else {
        addToast({
          title: 'Error',
          description: errorMessage || 'No se pudo enviar la invitación',
          variant: 'destructive',
        })
      }
    } finally {
      setInviting(false)
    }
  }

  // Función para obtener usuarios de la cuenta
  const fetchAccountUsers = async () => {
    if (!params.id) return

    setLoadingUsers(true)
    try {
      const response = await apiClient.get(`/accounts/${params.id}/users`)
      setUsers(response.data.users || [])
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'No se pudieron cargar los usuarios',
        variant: 'destructive',
      })
    } finally {
      setLoadingUsers(false)
    }
  }

  // Función para crear nuevo empleado con invitación
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingUser(true)

    try {
      // Enviar invitación en lugar de crear usuario directamente
      await apiClient.post(`/accounts/${params.id}/invite-user`, {
        email: newUserData.email,
        firstName: newUserData.firstName,
        lastName: newUserData.lastName,
        role: newUserData.role,
      })

      addToast({
        title: 'Invitación enviada',
        description: `Se ha enviado una invitación a ${newUserData.email}`,
        variant: 'success',
      })

      setNewUserData({
        email: '',
        firstName: '',
        lastName: '',
        role: 'MEMBER'
      })
      setShowUserForm(false)
      await fetchAccountUsers()
    } catch (error: any) {
      addToast({
        title: 'Error',
        description: error.response?.data?.message || 'No se pudo enviar la invitación',
        variant: 'destructive',
      })
    } finally {
      setCreatingUser(false)
    }
  }

  // Función para cambiar estado de usuario
  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'

    try {
      await apiClient.patch(`/users/${userId}/status`, { status: newStatus })
      addToast({
        title: 'Éxito',
        description: `Usuario ${newStatus === 'ACTIVE' ? 'activado' : 'desactivado'} correctamente`,
        variant: 'success',
      })
      await fetchAccountUsers()
    } catch (error: any) {
      addToast({
        title: 'Error',
        description: error.response?.data?.message || 'No se pudo cambiar el estado',
        variant: 'destructive',
      })
    }
  }

  // Función para eliminar usuario
  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`¿Está seguro de eliminar al usuario ${userName}?`)) return

    try {
      await apiClient.delete(`/users/${userId}`)
      addToast({
        title: 'Éxito',
        description: 'Usuario eliminado correctamente',
        variant: 'success',
      })
      await fetchAccountUsers()
    } catch (error: any) {
      addToast({
        title: 'Error',
        description: error.response?.data?.message || 'No se pudo eliminar el usuario',
        variant: 'destructive',
      })
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'default'
      case 'PENDING':
        return 'secondary'
      case 'SUSPENDED':
        return 'destructive'
      case 'INACTIVE':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'Activa'
      case 'PENDING':
        return 'Pendiente'
      case 'SUSPENDED':
        return 'Suspendida'
      case 'INACTIVE':
        return 'Inactiva'
      default:
        return status
    }
  }

  if (loading) {
    return (
      <ComponentLoadingIndicator 
        message="Cargando cuenta"
        size="lg"
        className="h-64"
      />
    )
  }

  if (!account) {
    return null
  }

  const canDeactivate = user?.role === 'SUPER_ADMIN' && account.status === 'ACTIVE' && !account.isSystemAccount
  const showInvitationSection = account.status === 'PENDING' && !account.ownerId && !account.isSystemAccount

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" onClick={() => router.push('/admin/accounts')} className="mb-3 sm:mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Editar Cuenta</h1>
          {account.isSystemAccount && <Badge variant="default">Sistema</Badge>}
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">Actualiza los datos de la cuenta</p>
      </div>

      {/* Sección 1: Información de la Cuenta */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Información de la Cuenta</CardTitle>
          <CardDescription>Datos generales y estado de la cuenta</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveChanges} className="space-y-6">
            {/* Nombre de la Cuenta */}
            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la Cuenta *</Label>
              <Input
                id="name"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Ej: Empresa ABC S.A."
                required
                disabled={(account.isSystemAccount && user?.role !== 'SUPER_ADMIN') || saving}
              />
              <p className="text-xs text-muted-foreground">
                {account.isSystemAccount && user?.role === 'SUPER_ADMIN' ? (
                  <span className="text-amber-600">
                    ⚠️ Está editando una cuenta del sistema.
                  </span>
                ) : !account.isSystemAccount ? (
                  'El nombre se guardará automáticamente en MAYÚSCULAS.'
                ) : null}
              </p>
            </div>

            {/* Información de Solo Lectura */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-sm font-medium">Detalles</h3>

              {/* Estado */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Estado:</span>
                </div>
                <Badge variant={getStatusBadgeVariant(account.status)}>
                  {getStatusText(account.status)}
                </Badge>
              </div>

              {/* Propietario */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Propietario:</span>
                </div>
                {account.owner ? (
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {account.owner.firstName} {account.owner.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">{account.owner.email}</p>
                  </div>
                ) : account.ownerId ? (
                  <span className="text-sm">Asignado</span>
                ) : (
                  <span className="text-sm text-muted-foreground">Sin asignar</span>
                )}
              </div>

              {/* Creado por */}
              {account.creator && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Creado por:</span>
                  <div className="text-right">
                    <p className="text-sm">
                      {account.creator.firstName} {account.creator.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">{account.creator.email}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Botones de Acción */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 border-t">
              <Button
                type="submit"
                disabled={saving || (account.isSystemAccount && user?.role !== 'SUPER_ADMIN')}
                title={account.isSystemAccount && user?.role !== 'SUPER_ADMIN'
                  ? 'Solo SUPER_ADMIN puede modificar cuentas del sistema'
                  : undefined}
                className="w-full sm:w-auto"
              >
                {saving ? (
                  <ButtonLoadingIndicator message="Guardando" size="sm" />
                ) : (
                  'Guardar Cambios'
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push('/admin/accounts')} className="w-full sm:w-auto">
                Cancelar
              </Button>
            </div>

            {/* Botón Desactivar (Solo SUPER_ADMIN en cuentas ACTIVE) */}
            {canDeactivate && (
              <div className="pt-4 border-t">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeactivate}
                  disabled={deactivating}
                >
                  {deactivating ? (
                    <ButtonLoadingIndicator message="Desactivando" size="sm" />
                  ) : (
                    'Desactivar Cuenta'
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Los usuarios no podrán acceder a una cuenta desactivada
                </p>
              </div>
            )}

            {account.isSystemAccount && user?.role !== 'SUPER_ADMIN' && (
              <p className="text-sm text-muted-foreground">
                Las cuentas del sistema solo pueden ser modificadas por SUPER_ADMIN
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Sección 2: Invitar Propietario (Solo para cuentas PENDING sin propietario) */}
      {showInvitationSection && (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Invitar Propietario</CardTitle>
            <CardDescription>
              Esta cuenta necesita un propietario para poder ser activada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 rounded-lg bg-muted/50 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  Al enviar la invitación, el propietario recibirá un correo electrónico con un enlace
                  válido por 7 días para activar su cuenta. Una vez activada, la cuenta cambiará a estado ACTIVE.
                </p>
              </div>
            </div>

            <form onSubmit={handleSendInvitation} className="space-y-6">
              {/* Email del Propietario */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email del Propietario *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={invitationData.email}
                  onChange={handleEmailChange}
                  placeholder="propietario@empresa.com"
                  disabled={inviting}
                  className={formErrors.email ? 'border-destructive' : ''}
                />
                {formErrors.email && (
                  <p className="text-xs text-destructive">{formErrors.email}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  El propietario recibirá un correo electrónico con un enlace para activar su cuenta
                </p>
              </div>

              {/* Límite de Usuarios */}
              <div className="space-y-2">
                <Label htmlFor="maxUsers" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Límite de Usuarios *
                </Label>
                <Input
                  id="maxUsers"
                  type="number"
                  min={1}
                  value={invitationData.maxUsers}
                  onChange={handleMaxUsersChange}
                  placeholder="Ej: 10"
                  disabled={inviting}
                  className={formErrors.maxUsers ? 'border-destructive' : ''}
                />
                {formErrors.maxUsers && (
                  <p className="text-xs text-destructive">{formErrors.maxUsers}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Número máximo de usuarios que podrán acceder a esta cuenta
                </p>
              </div>

              {/* Botón Enviar Invitación */}
              <div className="flex pt-4">
                <Button
                  type="submit"
                  disabled={inviting || !!formErrors.email || !!formErrors.maxUsers}
                  className="w-full sm:w-auto"
                >
                  {inviting ? (
                    <ButtonLoadingIndicator message="Enviando invitación" size="sm" />
                  ) : (
                    'Enviar Invitación'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Sección 3: Lista de Usuarios/Empleados (Solo SUPER_ADMIN) */}
      {user?.role === 'SUPER_ADMIN' && (
        <Card className="max-w-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Empleados</CardTitle>
                <CardDescription>
                  Gestiona los empleados de esta cuenta
                </CardDescription>
              </div>
              {!showUserForm && (
                <Button onClick={() => setShowUserForm(true)} size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Agregar Empleado
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Formulario para crear nuevo empleado */}
            {showUserForm && (
              <form onSubmit={handleCreateUser} className="space-y-4 mb-6 p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium">Nuevo Empleado</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowUserForm(false)}
                    disabled={creatingUser}
                  >
                    Cancelar
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Nombre *</Label>
                    <Input
                      id="firstName"
                      value={newUserData.firstName}
                      onChange={(e) => setNewUserData({...newUserData, firstName: e.target.value})}
                      required
                      disabled={creatingUser}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Apellido *</Label>
                    <Input
                      id="lastName"
                      value={newUserData.lastName}
                      onChange={(e) => setNewUserData({...newUserData, lastName: e.target.value})}
                      required
                      disabled={creatingUser}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="userEmail">Email *</Label>
                  <Input
                    id="userEmail"
                    type="email"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                    required
                    disabled={creatingUser}
                  />
                  <p className="text-xs text-muted-foreground">
                    Se enviará una invitación para que el usuario configure su contraseña
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Rol *</Label>
                  <select
                    id="role"
                    value={newUserData.role}
                    onChange={(e) => setNewUserData({...newUserData, role: e.target.value})}
                    className="flex h-10 min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={creatingUser}
                  >
                    <option value="MEMBER">Miembro</option>
                    <option value="EDITOR">Editor</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>

                <Button type="submit" disabled={creatingUser} className="w-full">
                  {creatingUser ? (
                    <ButtonLoadingIndicator message="Enviando invitación" size="sm" />
                  ) : (
                    'Enviar Invitación'
                  )}
                </Button>
              </form>
            )}

            {/* Lista de usuarios */}
            {loadingUsers ? (
              <ComponentLoadingIndicator message="Cargando usuarios" size="md" />
            ) : users.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No hay empleados en esta cuenta
              </p>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">
                            {u.firstName} {u.lastName}
                          </TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{translateRole(u.role)}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={u.status === 'ACTIVE' ? 'default' : 'secondary'}
                            >
                              {translateUserStatus(u.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {u.role !== 'SUPER_ADMIN' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleToggleUserStatus(u.id, u.status)}
                                  title={u.status === 'ACTIVE' ? 'Desactivar usuario' : 'Activar usuario'}
                                >
                                  {u.status === 'ACTIVE' ? (
                                    <ToggleRight className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <ToggleLeft className="h-4 w-4 text-gray-400" />
                                  )}
                                </Button>
                              )}
                              {u.role !== 'SUPER_ADMIN' && u.role !== 'ACCOUNT_OWNER' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteUser(u.id, `${u.firstName} ${u.lastName}`)}
                                  title="Eliminar usuario"
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {users.map((u) => (
                    <div
                      key={u.id}
                      className="border rounded-lg p-4 space-y-3 bg-card"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-base leading-tight break-words">
                            {u.firstName} {u.lastName}
                          </h3>
                          <p className="text-sm text-muted-foreground truncate mt-1">
                            {u.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{translateRole(u.role)}</Badge>
                        <Badge variant={u.status === 'ACTIVE' ? 'default' : 'secondary'}>
                          {translateUserStatus(u.status)}
                        </Badge>
                      </div>

                      <div className="flex gap-2 pt-2">
                        {u.role !== 'SUPER_ADMIN' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleUserStatus(u.id, u.status)}
                            className="flex-1"
                            title={u.status === 'ACTIVE' ? 'Desactivar usuario' : 'Activar usuario'}
                          >
                            {u.status === 'ACTIVE' ? (
                              <>
                                <ToggleRight className="h-4 w-4 text-green-600 mr-2" />
                                Desactivar
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="h-4 w-4 text-gray-400 mr-2" />
                                Activar
                              </>
                            )}
                          </Button>
                        )}
                        {u.role !== 'SUPER_ADMIN' && u.role !== 'ACCOUNT_OWNER' && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteUser(u.id, `${u.firstName} ${u.lastName}`)}
                            className="flex-1"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
