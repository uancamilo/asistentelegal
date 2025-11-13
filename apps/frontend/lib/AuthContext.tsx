'use client'

import { createContext, useState, useEffect, ReactNode } from 'react'
import axios from 'axios'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR' | 'ACCOUNT_OWNER' | 'MEMBER'
  status: 'ACTIVE' | 'SUSPENDED' | string
}

export interface LoginData {
  user: User
}

export interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (data: LoginData) => void
  logout: () => Promise<void>
  refreshAccessToken: () => Promise<boolean>
  getUserRole: () => User['role'] | undefined
  getUserStatus: () => string | undefined
  isUserActive: () => boolean
  getRedirectPath: (role: string) => string
  validateUserAccess: (user: User | null) => { valid: boolean; reason?: string }
}

export const AuthContext = createContext<AuthContextType | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

const roleRedirects: Record<User['role'], string> = {
  SUPER_ADMIN: '/super-admin',
  ADMIN: '/admin',
  EDITOR: '/editor',
  ACCOUNT_OWNER: '/documentos',
  MEMBER: '/admin',
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const validateSession = async (): Promise<boolean> => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api'
      const response = await axios.get(`${apiUrl}/auth/validate`, {
        withCredentials: true,
      })

      if (response.status === 200 && response.data) {
        setUser(response.data)
        return true
      }

      return false
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        setUser(null)
      }

      return false
    }
  }

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await validateSession()
      } catch (error) {
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [])

  const login = (data: LoginData) => {
    const { user: newUser } = data
    setUser(newUser)
  }

  const logout = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api'
      await axios.post(`${apiUrl}/auth/logout`, {}, {
        withCredentials: true,
      })
    } catch (error) {
    } finally {
      setUser(null)

      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
  }

  const refreshAccessToken = async (): Promise<boolean> => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api'
      const response = await axios.post(`${apiUrl}/auth/refresh`, {}, {
        withCredentials: true,
      })

      if (response.status === 200) {
        return true
      }

      return false
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        await logout()
      }

      return false
    }
  }

  const getUserRole = (): User['role'] | undefined => {
    return user?.role
  }

  const getUserStatus = (): string | undefined => {
    return user?.status
  }

  const isUserActive = (): boolean => {
    return user?.status === 'ACTIVE'
  }

  const getRedirectPath = (role: string): string => {
    if (role in roleRedirects) {
      return roleRedirects[role as User['role']]
    }

    return '/admin'
  }

  const validateUserAccess = (user: User | null): { valid: boolean; reason?: string } => {
    if (!user) {
      return { valid: false, reason: 'not_authenticated' }
    }

    if (user.status !== 'ACTIVE') {
      return {
        valid: false,
        reason: user.status === 'SUSPENDED' ? 'suspended' : 'invalid_status',
      }
    }

    return { valid: true }
  }

  const contextValue: AuthContextType = {
    user,
    isLoading,
    login,
    logout,
    refreshAccessToken,
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
