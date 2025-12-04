'use client'

import { createContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import apiClient from './api/client'
import { getCompleteProfile } from './api/profile'

import type { User, Role, LoginData, AuthContextType, CompleteProfile } from './types'

export const AuthContext = createContext<AuthContextType | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

const roleRedirects: Record<Role, string> = {
  SUPER_ADMIN: '/super-admin',
  ADMIN: '/admin',
  EDITOR: '/editor',
  ACCOUNT_OWNER: '/documentos',
  MEMBER: '/admin',
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false)
  const [completeProfile, setCompleteProfile] = useState<CompleteProfile | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(false)
  const router = useRouter()

  // Fetch complete profile (user + account) - centralized to avoid duplicate calls
  const fetchProfile = useCallback(async (): Promise<void> => {
    try {
      setIsLoadingProfile(true)
      const profile = await getCompleteProfile()
      setCompleteProfile(profile)
    } catch {
      setCompleteProfile(null)
    } finally {
      setIsLoadingProfile(false)
    }
  }, [])

  // Public method to refresh profile when needed
  const refreshProfile = useCallback(async (): Promise<void> => {
    await fetchProfile()
  }, [fetchProfile])

  const validateSession = async (): Promise<boolean> => {
    try {
      const response = await apiClient.get('/auth/validate')

      if (response.status === 200 && response.data) {
        setUser(response.data)
        return true
      }

      return false
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        setUser(null)
        setCompleteProfile(null)
      }

      return false
    }
  }

  useEffect(() => {
    const initializeAuth = async () => {
      // No mostrar loader si estamos en proceso de logout
      if (isLoggingOut) {
        return
      }

      try {
        const isValid = await validateSession()
        // Fetch complete profile only if session is valid
        if (isValid) {
          await fetchProfile()
        }
      } catch (error) {
        setUser(null)
        setCompleteProfile(null)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [isLoggingOut, fetchProfile])

  const login = (data: LoginData) => {
    const { user: newUser } = data
    setUser(newUser)
    // Fetch complete profile after login
    fetchProfile()
  }

  const logout = async () => {
    setIsLoggingOut(true)

    try {
      await apiClient.post('/auth/logout', {})
    } catch (error) {
    } finally {
      setUser(null)
      setCompleteProfile(null)
      setIsLoading(false)

      if (typeof window !== 'undefined') {
        router.push('/login')
        setIsLoggingOut(false)
      }
    }
  }

  const refreshAccessToken = async (): Promise<boolean> => {
    try {
      const response = await apiClient.post('/auth/refresh')

      if (response.status === 200) {
        return true
      }

      return false
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        // No llamar logout() aquí para evitar bucles - solo limpiar estado
        setUser(null)
        setCompleteProfile(null)
      }

      return false
    }
  }

  const getUserRole = (): Role | undefined => {
    return user?.role
  }

  const getUserStatus = (): string | undefined => {
    return user?.status.toString()
  }

  const isUserActive = (): boolean => {
    return user?.status.toString() === 'ACTIVE'
  }

  const getRedirectPath = (role: string): string => {
    if (role in roleRedirects) {
      return roleRedirects[role as Role]
    }

    return '/admin'
  }

  const validateUserAccess = (user: User | null): { valid: boolean; reason?: string } => {
    if (!user) {
      return { valid: false, reason: 'not_authenticated' }
    }

    if (user.status.toString() !== 'ACTIVE') {
      return {
        valid: false,
        reason: user.status.toString() === 'SUSPENDED' ? 'suspended' : 'invalid_status',
      }
    }

    return { valid: true }
  }

  const contextValue: AuthContextType = {
    user,
    isLoading,
    completeProfile,
    isLoadingProfile,
    login,
    logout,
    refreshAccessToken,
    refreshProfile,
    getUserRole,
    getUserStatus,
    isUserActive,
    getRedirectPath,
    validateUserAccess,
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}
