'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Plus, Search, Edit, Trash2 } from 'lucide-react'
import type { Account } from '@/lib/types'
import { translateAccountStatus } from '@/lib/translations'

export default function AccountsPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      const response = await apiClient.get('/accounts')
      setAccounts(response.data.accounts || [])
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'No se pudieron cargar las cuentas',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar esta cuenta?')) return

    try {
      await apiClient.delete(`/accounts/${id}`)
      addToast({
        title: 'Éxito',
        description: 'Cuenta eliminada correctamente',
        variant: 'success',
      })
      fetchAccounts()
    } catch (error: any) {
      let errorMessage = 'No se pudo eliminar la cuenta'

      if (error.response?.status === 403) {
        errorMessage = 'No tienes permisos para eliminar cuentas. Solo SUPER_ADMIN puede realizar esta acción.'
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      }

      addToast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    }
  }

  const canDeleteAccount = (account: Account): boolean => {
    if (user?.role !== 'SUPER_ADMIN') return false
    if (account.isSystemAccount) return false
    return true
  }

  const filteredAccounts = accounts.filter((account) =>
    account.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Cargando cuentas...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate">Cuentas</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Gestión de cuentas del sistema</p>
        </div>
        <Button onClick={() => router.push('/admin/accounts/new')} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Cuenta
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Cuentas</CardTitle>
          <CardDescription>
            Total: {accounts.length} cuenta{accounts.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Buscar cuentas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      {searchTerm ? 'No se encontraron cuentas' : 'No hay cuentas registradas'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">{account.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            account.status === 'ACTIVE' ? 'default' :
                            account.status === 'PENDING' ? 'secondary' :
                            account.status === 'SUSPENDED' ? 'destructive' :
                            'outline'
                          }
                        >
                          {translateAccountStatus(account.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={account.isSystemAccount ? 'default' : 'secondary'}>
                          {account.isSystemAccount ? 'Sistema' : 'Cliente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {(!account.isSystemAccount || user?.role === 'SUPER_ADMIN') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/admin/accounts/${account.id}`)}
                              title="Editar cuenta"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(account.id)}
                            disabled={!canDeleteAccount(account)}
                            title={
                              user?.role !== 'SUPER_ADMIN'
                                ? 'Solo SUPER_ADMIN puede eliminar cuentas'
                                : account.isSystemAccount
                                ? 'No se pueden eliminar cuentas del sistema'
                                : 'Eliminar cuenta'
                            }
                          >
                            <Trash2 className="h-4 w-4" />
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
            {filteredAccounts.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {searchTerm ? 'No se encontraron cuentas' : 'No hay cuentas registradas'}
              </div>
            ) : (
              filteredAccounts.map((account) => (
                <div
                  key={account.id}
                  className="border rounded-lg p-4 space-y-3 bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-base leading-tight flex-1 min-w-0 break-words">
                      {account.name}
                    </h3>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={
                        account.status === 'ACTIVE' ? 'default' :
                        account.status === 'PENDING' ? 'secondary' :
                        account.status === 'SUSPENDED' ? 'destructive' :
                        'outline'
                      }
                    >
                      {translateAccountStatus(account.status)}
                    </Badge>
                    <Badge variant={account.isSystemAccount ? 'default' : 'secondary'}>
                      {account.isSystemAccount ? 'Sistema' : 'Cliente'}
                    </Badge>
                  </div>

                  <div className="flex gap-2 pt-2">
                    {(!account.isSystemAccount || user?.role === 'SUPER_ADMIN') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/admin/accounts/${account.id}`)}
                        className="flex-1"
                        title="Editar cuenta"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(account.id)}
                      disabled={!canDeleteAccount(account)}
                      className="flex-1"
                      title={
                        user?.role !== 'SUPER_ADMIN'
                          ? 'Solo SUPER_ADMIN puede eliminar cuentas'
                          : account.isSystemAccount
                          ? 'No se pueden eliminar cuentas del sistema'
                          : 'Eliminar cuenta'
                      }
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
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
