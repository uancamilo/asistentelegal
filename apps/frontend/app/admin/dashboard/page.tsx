'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ComponentLoadingIndicator } from '@/components/ui/LoadingIndicator'
import apiClient from '@/lib/api/client'
import { Building2, Users, FileText } from 'lucide-react'
import type { AuditLog } from '@/lib/types'

interface DashboardStats {
  totalAccounts: number
  totalUsers: number
  totalAuditLogs: number
  recentActivity: AuditLog[]
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [accountsRes, usersRes, auditLogsRes] = await Promise.all([
          apiClient.get('/accounts'),
          apiClient.get('/users'),
          apiClient.get('/audit-logs?limit=10'),
        ])

        setStats({
          totalAccounts: accountsRes.data.total || 0,
          totalUsers: usersRes.data.total || 0,
          totalAuditLogs: auditLogsRes.data.total || 0,
          recentActivity: auditLogsRes.data.logs || [],
        })
      } catch (error) {
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <ComponentLoadingIndicator 
        message="Cargando dashboard"
        size="lg"
        className="h-64"
      />
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Dashboard</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Vista general del sistema</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cuentas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalAccounts || 0}</div>
            <p className="text-xs text-muted-foreground">Cuentas registradas en el sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">Usuarios activos en la plataforma</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Logs de Auditoría</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalAuditLogs || 0}</div>
            <p className="text-xs text-muted-foreground">Eventos registrados recientemente</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Actividad Reciente</CardTitle>
          <CardDescription>Últimos eventos del sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.recentActivity && stats.recentActivity.length > 0 ? (
            <div className="space-y-4">
              {stats.recentActivity.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={log.success ? 'default' : 'destructive'}>
                        {log.action}
                      </Badge>
                      <span className="text-xs sm:text-sm text-muted-foreground">{log.resource}</span>
                    </div>
                    <p className="text-xs sm:text-sm">
                      Usuario: <span className="font-medium truncate">{log.userId}</span>
                    </p>
                    {log.details && (
                      <p className="text-xs text-muted-foreground truncate">
                        {Object.keys(log.details).join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('es-ES')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay actividad reciente
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
