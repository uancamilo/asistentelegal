'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import axios from 'axios'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setError('')

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api'
      const response = await axios.post(`${apiUrl}/auth/login`, {
        email: data.email,
        password: data.password,
      })

      const { access_token, refresh_token } = response.data

      login(access_token, refresh_token)
      router.push('/dashboard')
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

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
        </button>
      </form>
    </div>
  )
}
