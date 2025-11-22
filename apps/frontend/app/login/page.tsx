'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import axios from 'axios'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { LoadingIndicator, ButtonLoadingIndicator } from '@/components/ui/LoadingIndicator'

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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api'
      const response = await axios.post(`${apiUrl}/auth/login`, {
        email: data.email,
        password: data.password,
      }, {
        withCredentials: true, // Incluir cookies en la petición
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
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Credenciales inválidas')
      } else if (err.response?.status === 400) {
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
      <div style={{
        maxWidth: '400px',
        margin: '4rem auto',
        padding: '2rem',
        fontFamily: 'system-ui',
        textAlign: 'center'
      }}>
        <LoadingIndicator message="Verificando autenticación" size="md" />
      </div>
    )
  }

  return (
    <div style={{
      maxWidth: '400px',
      margin: '4rem auto',
      padding: '2rem',
      fontFamily: 'system-ui',
      border: '1px solid #ddd',
      borderRadius: '8px'
    }}>
      <h1 style={{ marginBottom: '2rem' }}>Login</h1>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} suppressHydrationWarning={true}>
        <div>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Email
          </label>
          <input
            id="email"
            type="email"
            {...register('email')}
            style={{
              width: '100%',
              padding: '0.5rem',
              fontSize: '1rem',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
            suppressHydrationWarning={true}
          />
          {errors.email && (
            <p style={{ color: 'red', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            {...register('password')}
            style={{
              width: '100%',
              padding: '0.5rem',
              fontSize: '1rem',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
            suppressHydrationWarning={true}
          />
          {errors.password && (
            <p style={{ color: 'red', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {errors.password.message}
            </p>
          )}
        </div>

        {error && (
          <div style={{
            padding: '0.75rem',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '4px',
            color: '#c00'
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          style={{
            padding: '0.75rem',
            fontSize: '1rem',
            backgroundColor: isLoading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {isLoading ? (
            <ButtonLoadingIndicator message="Iniciando sesión" size="sm" />
          ) : (
            'Iniciar sesión'
          )}
        </button>
      </form>
    </div>
  )
}
