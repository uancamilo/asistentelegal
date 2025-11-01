'use client'

import { useEffect } from 'react'
import { useAuth } from '@/lib/useAuth'

export default function DashboardPage() {
  const { isAuthenticated, isLoading, requireAuth, logout } = useAuth()

  useEffect(() => {
    requireAuth()
  }, [isAuthenticated, isLoading])

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
        <p>Cargando...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Bienvenido al Dashboard</h1>
      <p style={{ marginTop: '1rem' }}>
        Has iniciado sesión exitosamente en AsistenciaLegal.
      </p>
      <button
        onClick={logout}
        style={{
          marginTop: '2rem',
          padding: '0.75rem 1.5rem',
          fontSize: '1rem',
          backgroundColor: '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Cerrar sesión
      </button>
    </div>
  )
}
