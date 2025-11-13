'use client'

import { useContext } from 'react'
import { AuthContext, type AuthContextType } from './AuthContext'

/**
 * 🪝 Hook personalizado para acceder al contexto de autenticación
 *
 * @throws Error si se usa fuera del AuthProvider
 * @returns Contexto de autenticación con todos los estados y funciones
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}

// 🔍 Tipo inferido del hook para uso avanzado
export type UseAuthReturn = ReturnType<typeof useAuth>