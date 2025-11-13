'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { useAuth } from '@/lib/useAuth'
import { Loader2 } from 'lucide-react'
import { Role } from '@/lib/types'

interface ProtectedLayoutProps {
  children: React.ReactNode
  allowedRoles: Role[]
}

export function ProtectedLayout({ children, allowedRoles }: ProtectedLayoutProps) {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev)
  }, [])

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false)
  }, [])

  useEffect(() => {
    // Wait for auth to initialize
    if (isLoading) return

    // If no user, redirect to login
    if (!user) {
      router.push('/login')
      return
    }

    // Check if user has required role
    if (!allowedRoles.includes(user.role as Role)) {
      // Redirect to appropriate dashboard based on role
      const redirectPaths: Record<Role, string> = {
        [Role.SUPER_ADMIN]: '/admin/dashboard',
        [Role.ADMIN]: '/admin/dashboard',
        [Role.EDITOR]: '/editor',
        [Role.ACCOUNT_OWNER]: '/documentos',
        [Role.MEMBER]: '/documentos',
      }
      router.push(redirectPaths[user.role as Role] || '/login')
      return
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      router.push('/login')
      return
    }
  }, [user, isLoading, router, allowedRoles])

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-muted-foreground">Verificando autenticación...</p>
        </div>
      </div>
    )
  }

  // Don't render layout until user is verified
  if (!user || !allowedRoles.includes(user.role as Role) || user.status !== 'ACTIVE') {
    return null
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Hidden on mobile, shown on desktop */}
      <Sidebar isOpen={sidebarOpen} onClose={handleCloseSidebar} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header onMenuClick={handleToggleSidebar} isSidebarOpen={sidebarOpen} />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
