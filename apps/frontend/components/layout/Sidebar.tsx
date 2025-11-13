'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/useAuth'
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  LogOut,
  X,
  File,
  Edit,
  BookOpen,
  BarChart3
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Role, User } from '@/lib/types'

// Navigation for different roles
const getNavigationForRole = (role?: Role | string) => {
  if (!role) return []

  const baseNavigation: Record<string, any[]> = {
    SUPER_ADMIN: [
      { name: 'Dashboard Admin', href: '/admin/dashboard', icon: LayoutDashboard },
      { name: 'Cuentas', href: '/admin/accounts', icon: Building2 },
      { name: 'Usuarios', href: '/admin/usuarios', icon: Users },
      { name: 'Auditoría', href: '/admin/auditoria', icon: FileText },
      { name: 'Analíticas', href: '/admin/analiticas', icon: BarChart3 },
      { name: 'Gestión Contenido', href: '/editor', icon: Edit },
      { name: 'Documentos', href: '/documentos', icon: BookOpen },
    ],
    ADMIN: [
      { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
      { name: 'Cuentas', href: '/admin/accounts', icon: Building2 },
      { name: 'Usuarios', href: '/admin/usuarios', icon: Users },
      { name: 'Documentos', href: '/documentos', icon: File },
      { name: 'Auditoría', href: '/admin/auditoria', icon: FileText },
      { name: 'Analíticas', href: '/admin/analiticas', icon: BarChart3 },
    ],
    EDITOR: [
      { name: 'Gestión de Documentos', href: '/editor', icon: Edit },
    ],
    ACCOUNT_OWNER: [
      { name: 'Documentos', href: '/documentos', icon: File },
    ],
    MEMBER: [
      { name: 'Documentos', href: '/documentos', icon: File },
    ],
  }

  return baseNavigation[role as string] || []
}

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { logout, user } = useAuth()
  const isFirstRender = useRef(true)
  const prevPathnameRef = useRef(pathname)
  const isOpenRef = useRef(isOpen)

  const navigation = getNavigationForRole(user?.role)

  useEffect(() => {
    isOpenRef.current = isOpen
  }, [isOpen])

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      prevPathnameRef.current = pathname
      return
    }

    if (pathname !== prevPathnameRef.current) {
      prevPathnameRef.current = pathname

      if (isOpenRef.current) {
        onClose()
      }
    }
  }, [pathname, onClose])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden touch-manipulation"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onClose()
          }}
          role="button"
          tabIndex={-1}
          aria-label="Cerrar menú"
        />
      )}

      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 sm:px-6 border-b border-gray-200">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">AsistenciaLegal</h1>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onClose()
            }}
            className="lg:hidden p-3 -mr-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors touch-manipulation"
            aria-label="Cerrar menú"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 sm:px-4 py-4 sm:py-6 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center px-3 sm:px-4 py-3 text-sm font-medium rounded-lg transition-colors min-h-[44px]',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon className={cn(
                  'w-5 h-5 mr-3 flex-shrink-0',
                  isActive ? 'text-blue-700' : 'text-gray-400'
                )} />
                <span className="truncate">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-3 sm:p-4 border-t border-gray-200">
          <button
            onClick={logout}
            className="flex items-center w-full px-3 sm:px-4 py-3 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors min-h-[44px]"
          >
            <LogOut className="w-5 h-5 mr-3 flex-shrink-0" />
            <span className="truncate">Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </>
  )
}
