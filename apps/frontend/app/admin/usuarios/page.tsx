'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/toast'
import apiClient from '@/lib/api/client'
import { Search, Edit, UserX, UserCheck } from 'lucide-react'
import type { User, Role, UserStatus } from '@/lib/types'
import { translateRole, translateUserStatus } from '@/lib/translations'
import { ComponentLoadingIndicator } from '@/components/ui/LoadingIndicator'

export default function UsersPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await apiClient.get('/users')
      setUsers(response.data.users || [])
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'No se pudieron cargar los usuarios',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (userId: string, currentStatus: UserStatus) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
    const action = newStatus === 'ACTIVE' ? 'activar' : 'suspender'

    if (!confirm(`¿Está seguro de ${action} este usuario?`)) return

    try {
      await apiClient.patch(`/users/${userId}/status`, { status: newStatus })
      addToast({
        title: 'Éxito',
        description: `Usuario ${action === 'activar' ? 'activado' : 'suspendido'} correctamente`,
        variant: 'success',
      })
      fetchUsers()
    } catch (error) {
      addToast({
        title: 'Error',
        description: `No se pudo ${action} el usuario`,
        variant: 'destructive',
      })
    }
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter

    return matchesSearch && matchesRole && matchesStatus
  })

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
      <ComponentLoadingIndicator
        message="Cargando usuarios"
        size="lg"
        height="lg"
      />
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate">Usuarios</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Gestión de usuarios del sistema</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuarios</CardTitle>
          <CardDescription>
            Total: {users.length} usuario{users.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Buscar usuarios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrar por rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                <SelectItem value="SUPER_ADMIN">Super Administrador</SelectItem>
                <SelectItem value="ADMIN">Administrador</SelectItem>
                <SelectItem value="ACCOUNT_OWNER">Propietario de Cuenta</SelectItem>
                <SelectItem value="EDITOR">Editor</SelectItem>
                <SelectItem value="MEMBER">Miembro</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="ACTIVE">Activo</SelectItem>
                <SelectItem value="SUSPENDED">Suspendido</SelectItem>
                <SelectItem value="INVITED">Invitado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha de Creación</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                        ? 'No se encontraron usuarios'
                        : 'No hay usuarios registrados'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.firstName} {user.lastName}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>{translateRole(user.role)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(user.status)}>{translateUserStatus(user.status)}</Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString('es-ES')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/admin/usuarios/${user.id}`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant={user.status === 'ACTIVE' ? 'destructive' : 'default'}
                            size="sm"
                            onClick={() => handleToggleStatus(user.id, user.status)}
                            disabled={user.role === 'SUPER_ADMIN'}
                          >
                            {user.status === 'ACTIVE' ? (
                              <UserX className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                  ? 'No se encontraron usuarios'
                  : 'No hay usuarios registrados'}
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="border rounded-lg p-4 space-y-3 bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-base leading-tight break-words">
                        {user.firstName} {user.lastName}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {user.email}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(user.createdAt).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant={getRoleBadgeVariant(user.role)}>{translateRole(user.role)}</Badge>
                    <Badge variant={getStatusBadgeVariant(user.status)}>{translateUserStatus(user.status)}</Badge>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/admin/usuarios/${user.id}`)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      variant={user.status === 'ACTIVE' ? 'destructive' : 'default'}
                      size="sm"
                      onClick={() => handleToggleStatus(user.id, user.status)}
                      disabled={user.role === 'SUPER_ADMIN'}
                      className="flex-1"
                    >
                      {user.status === 'ACTIVE' ? (
                        <>
                          <UserX className="h-4 w-4 mr-2" />
                          Suspender
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-4 w-4 mr-2" />
                          Activar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
