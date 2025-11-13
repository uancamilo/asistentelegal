'use client'

import { useEffect, useState, Fragment } from 'react'
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
import { Search, Filter, ChevronDown, ChevronUp } from 'lucide-react'
import type { AuditLog, AuditAction, AuditResource } from '@/lib/types'

export default function AuditLogsPage() {
  const { addToast } = useToast()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [resourceFilter, setResourceFilter] = useState<string>('all')
  const [successFilter, setSuccessFilter] = useState<string>('all')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  useEffect(() => {
    fetchAuditLogs()
  }, [])

  const fetchAuditLogs = async () => {
    try {
      const response = await apiClient.get('/audit-logs')
      setLogs(response.data.logs || [])
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'No se pudieron cargar los logs de auditoría',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesAction = actionFilter === 'all' || log.action === actionFilter
    const matchesResource = resourceFilter === 'all' || log.resource === resourceFilter
    const matchesSuccess =
      successFilter === 'all' ||
      (successFilter === 'success' && log.success) ||
      (successFilter === 'failure' && !log.success)

    return matchesSearch && matchesAction && matchesResource && matchesSuccess
  })

  const toggleRow = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Cargando logs de auditoría...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Auditoría</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Registro de eventos del sistema</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Logs de Auditoría</CardTitle>
          <CardDescription>
            Total: {logs.length} evento{logs.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm sm:text-base font-medium">Filtros</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="relative sm:col-span-2 lg:col-span-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Acción" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las acciones</SelectItem>
                  <SelectItem value="CREATE">CREATE</SelectItem>
                  <SelectItem value="UPDATE">UPDATE</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                  <SelectItem value="LOGIN">LOGIN</SelectItem>
                  <SelectItem value="LOGOUT">LOGOUT</SelectItem>
                </SelectContent>
              </Select>

              <Select value={resourceFilter} onValueChange={setResourceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Recurso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los recursos</SelectItem>
                  <SelectItem value="USER">USER</SelectItem>
                  <SelectItem value="ACCOUNT">ACCOUNT</SelectItem>
                  <SelectItem value="SESSION">SESSION</SelectItem>
                </SelectContent>
              </Select>

              <Select value={successFilter} onValueChange={setSuccessFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="success">Exitosos</SelectItem>
                  <SelectItem value="failure">Fallidos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(searchTerm ||
              actionFilter !== 'all' ||
              resourceFilter !== 'all' ||
              successFilter !== 'all') && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('')
                    setActionFilter('all')
                    setResourceFilter('all')
                    setSuccessFilter('all')
                  }}
                >
                  Limpiar filtros
                </Button>
                <span className="text-sm text-muted-foreground">
                  Mostrando {filteredLogs.length} de {logs.length} eventos
                </span>
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Recurso</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      {searchTerm ||
                      actionFilter !== 'all' ||
                      resourceFilter !== 'all' ||
                      successFilter !== 'all'
                        ? 'No se encontraron eventos'
                        : 'No hay eventos registrados'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <Fragment key={log.id}>
                      <TableRow className="cursor-pointer hover:bg-muted/50">
                        <TableCell onClick={() => toggleRow(log.id)}>
                          <Button variant="ghost" size="sm">
                            {expandedRow === log.id ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{log.action}</Badge>
                        </TableCell>
                        <TableCell>{log.resource}</TableCell>
                        <TableCell className="font-medium">{log.userId}</TableCell>
                        <TableCell>
                          <Badge variant={log.success ? 'default' : 'destructive'}>
                            {log.success ? 'Exitoso' : 'Fallido'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{log.ipAddress || '-'}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(log.createdAt).toLocaleString('es-ES')}
                        </TableCell>
                      </TableRow>
                      {expandedRow === log.id && (
                        <TableRow>
                          <TableCell colSpan={7} className="bg-muted/20">
                            <div className="p-4 space-y-2">
                              <div>
                                <span className="text-xs font-semibold">ID:</span>
                                <p className="text-sm font-mono">{log.id}</p>
                              </div>
                              {log.resourceId && (
                                <div>
                                  <span className="text-xs font-semibold">Resource ID:</span>
                                  <p className="text-sm font-mono">{log.resourceId}</p>
                                </div>
                              )}
                              {log.details && (
                                <div>
                                  <span className="text-xs font-semibold">Detalles:</span>
                                  <pre className="mt-1 p-2 bg-background rounded text-xs overflow-auto">
                                    {JSON.stringify(log.details, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.errorMessage && (
                                <div>
                                  <span className="text-xs font-semibold text-destructive">
                                    Error:
                                  </span>
                                  <p className="text-sm text-destructive">{log.errorMessage}</p>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {searchTerm ||
                actionFilter !== 'all' ||
                resourceFilter !== 'all' ||
                successFilter !== 'all'
                  ? 'No se encontraron eventos'
                  : 'No hay eventos registrados'}
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="border rounded-lg p-4 space-y-3 bg-card"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{log.action}</Badge>
                        <Badge variant={log.success ? 'default' : 'destructive'}>
                          {log.success ? 'Exitoso' : 'Fallido'}
                        </Badge>
                      </div>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Recurso:</span>{' '}
                        <span className="font-medium">{log.resource}</span>
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Usuario:</span>{' '}
                        <span className="font-medium truncate">{log.userId}</span>
                      </p>
                      {log.ipAddress && (
                        <p className="text-xs font-mono text-muted-foreground">
                          IP: {log.ipAddress}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString('es-ES')}
                      </p>
                    </div>
                  </div>

                  {/* Expandable details */}
                  <div className="pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => toggleRow(log.id)}
                    >
                      {expandedRow === log.id ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-2" />
                          Ocultar detalles
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-2" />
                          Ver detalles
                        </>
                      )}
                    </Button>
                  </div>

                  {expandedRow === log.id && (
                    <div className="pt-3 border-t space-y-3 text-sm">
                      <div>
                        <span className="text-xs font-semibold">ID:</span>
                        <p className="text-xs font-mono break-all">{log.id}</p>
                      </div>
                      {log.resourceId && (
                        <div>
                          <span className="text-xs font-semibold">Resource ID:</span>
                          <p className="text-xs font-mono break-all">{log.resourceId}</p>
                        </div>
                      )}
                      {log.details && (
                        <div>
                          <span className="text-xs font-semibold">Detalles:</span>
                          <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.errorMessage && (
                        <div>
                          <span className="text-xs font-semibold text-destructive">Error:</span>
                          <p className="text-xs text-destructive">{log.errorMessage}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
