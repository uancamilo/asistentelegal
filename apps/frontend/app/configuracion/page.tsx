'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, Bell, Lock, Eye, Moon, Globe } from 'lucide-react'

export default function ConfiguracionPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-600 mt-2">
          Gestiona las preferencias de tu cuenta
        </p>
      </div>

      <div className="space-y-6">
        {/* Notifications Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificaciones
            </CardTitle>
            <CardDescription>
              Configura cómo quieres recibir notificaciones
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Notificaciones por email</p>
                <p className="text-sm text-gray-500">Recibe actualizaciones importantes por correo</p>
              </div>
              <Button variant="outline" size="sm" disabled>
                Activar
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Notificaciones del sistema</p>
                <p className="text-sm text-gray-500">Recibe notificaciones en el navegador</p>
              </div>
              <Button variant="outline" size="sm" disabled>
                Activar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Seguridad
            </CardTitle>
            <CardDescription>
              Opciones de seguridad y privacidad
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Cambiar contraseña</p>
                <p className="text-sm text-gray-500">Actualiza tu contraseña periódicamente</p>
              </div>
              <Button variant="outline" size="sm" disabled>
                Cambiar
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Autenticación de dos factores</p>
                <p className="text-sm text-gray-500">Agrega una capa extra de seguridad</p>
              </div>
              <Button variant="outline" size="sm" disabled>
                Configurar
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Sesiones activas</p>
                <p className="text-sm text-gray-500">Gestiona tus sesiones en otros dispositivos</p>
              </div>
              <Button variant="outline" size="sm" disabled>
                Ver sesiones
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Apariencia
            </CardTitle>
            <CardDescription>
              Personaliza la apariencia de la aplicación
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Modo oscuro</p>
                <p className="text-sm text-gray-500">Usa un tema oscuro para reducir la fatiga visual</p>
              </div>
              <Button variant="outline" size="sm" disabled>
                <Moon className="h-4 w-4 mr-2" />
                Desactivado
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Idioma</p>
                <p className="text-sm text-gray-500">Selecciona tu idioma preferido</p>
              </div>
              <Button variant="outline" size="sm" disabled>
                <Globe className="h-4 w-4 mr-2" />
                Español
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Zona de Peligro</CardTitle>
            <CardDescription>
              Acciones irreversibles con tu cuenta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Eliminar cuenta</p>
                <p className="text-sm text-gray-500">Elimina permanentemente tu cuenta y todos tus datos</p>
              </div>
              <Button variant="destructive" size="sm" disabled>
                Eliminar
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <p className="text-sm text-gray-500 italic">
            Funcionalidad en desarrollo
          </p>
        </div>
      </div>
    </div>
  )
}
