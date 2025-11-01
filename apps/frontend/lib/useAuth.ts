'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    setIsAuthenticated(!!token)
    setIsLoading(false)
  }, [])

  const login = (accessToken: string, refreshToken?: string) => {
    localStorage.setItem('access_token', accessToken)
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken)
    }
    setIsAuthenticated(true)
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setIsAuthenticated(false)
    router.push('/login')
  }

  const requireAuth = () => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }

  return {
    isAuthenticated,
    isLoading,
    login,
    logout,
    requireAuth,
  }
}
