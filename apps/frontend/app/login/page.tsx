'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import apiClient from '@/lib/api/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { ModalLoadingIndicator, ButtonLoadingIndicator } from '@/components/ui/LoadingIndicator'
import { cn } from '@/lib/utils'
import type { ApiError } from '@/lib/types'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
})

type LoginFormData = z.infer<typeof loginSchema>

// 🔐 Retorna mensaje amigable según el estado del usuario
const getStatusErrorMessage = (status: string): string => {
  if (status === 'SUSPENDED') {
    return 'Tu cuenta ha sido suspendida. Contacta al administrador para más información.'
  }
  return 'Estado de cuenta no válido. Contacta al administrador.'
}

// 🗺️ Retorna ruta de redirección según el rol
const getRedirectPathByRole = (role: string): string => {
  switch (role) {
    case 'SUPER_ADMIN':
    case 'ADMIN':
      return '/admin/dashboard'
    case 'EDITOR':
      return '/editor'
    case 'ACCOUNT_OWNER':
      return '/documentos'
    case 'MEMBER':
      return '/admin/dashboard'
    default:
      return '/admin/dashboard'
  }
}

export default function LoginPage() {
  const router = useRouter()
  const { login, user, isLoading: isAuthLoading } = useAuth()
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  // Si el usuario ya está autenticado, redirigir según su rol
  useEffect(() => {
    if (!isAuthLoading && user) {
      const redirectPath = getRedirectPathByRole(user.role)
      router.replace(redirectPath)
    }
  }, [user, isAuthLoading, router])

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setError('')

    try {
      const response = await apiClient.post('/auth/login', {
        email: data.email,
        password: data.password,
      })

      const { user } = response.data // Tokens ahora están en HttpOnly cookies

      // 1. VALIDAR STATUS - SOLO ACTIVE PUEDE ACCEDER
      if (user.status !== 'ACTIVE') {
        setError(getStatusErrorMessage(user.status))
        return
      }

      // 2. PROCEDER CON LOGIN SOLO SI USUARIO ESTÁ ACTIVO
      login({ user }) // Solo pasar el usuario, tokens están en cookies

      // 3. REDIRECCIÓN CONDICIONAL POR ROL
      const redirectPath = getRedirectPathByRole(user.role)
      router.push(redirectPath)
    } catch (err) {
      const error = err as ApiError;
      if (error.response?.status === 401) {
        setError('Credenciales inválidas')
      } else if (error.response?.status === 400) {
        setError('Datos de login inválidos')
      } else {
        setError('Error al conectar con el servidor')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Mostrar loading mientras se valida la sesión o si ya está autenticado
  if (isAuthLoading || user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ModalLoadingIndicator 
          message="Verificando autenticación" 
          size="md"
          className="max-w-md mx-4" 
        />
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto mt-16 p-6 border border-border rounded-lg bg-background">
      <h1 className="text-2xl font-bold mb-6 text-foreground">Iniciar Sesión</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col space-y-4" suppressHydrationWarning={true}>
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-foreground">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            {...register('email')}
            className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            suppressHydrationWarning={true}
          />
          {errors.email && (
            <p className="text-destructive text-sm mt-1">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-foreground">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            {...register('password')}
            className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            suppressHydrationWarning={true}
          />
          {errors.password && (
            <p className="text-destructive text-sm mt-1">
              {errors.password.message}
            </p>
          )}
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className={cn(
            "w-full px-4 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            isLoading 
              ? "bg-muted text-muted-foreground cursor-not-allowed" 
              : "bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
          )}
        >
          {isLoading ? (
            <ButtonLoadingIndicator message="Iniciando sesión" size="sm" />
          ) : (
            'Iniciar Sesión'
          )}
        </button>
      </form>
    </div>
  )
}
