'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { Role } from '@/lib/types'
import { Settings, User as UserIcon, Menu, Building2, ChevronDown, LogOut, UserCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { translateRole } from '@/lib/translations'

interface HeaderProps {
  onMenuClick?: () => void
  isSidebarOpen?: boolean
}

export function Header({ onMenuClick, isSidebarOpen }: HeaderProps) {
  const router = useRouter()
  const { user, logout, completeProfile } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getRoleBadge = (role: Role | string) => {
    const badges: Record<string, string> = {
      [Role.SUPER_ADMIN]: 'bg-purple-100 text-purple-800',
      [Role.ADMIN]: 'bg-blue-100 text-blue-800',
      [Role.ACCOUNT_OWNER]: 'bg-green-100 text-green-800',
      [Role.EDITOR]: 'bg-yellow-100 text-yellow-800',
      [Role.MEMBER]: 'bg-gray-100 text-gray-800',
    }
    return badges[role as string] || badges[Role.MEMBER]
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      ACTIVE: 'bg-green-100 text-green-800',
      INACTIVE: 'bg-gray-100 text-gray-800',
      SUSPENDED: 'bg-red-100 text-red-800',
    }
    return badges[status] || 'bg-gray-100 text-gray-800'
  }

  const handleLogout = async () => {
    setDropdownOpen(false)
    await logout()
  }

  const navigateTo = (path: string) => {
    setDropdownOpen(false)
    router.push(path)
  }

  return (
    <header className="h-14 sm:h-16 bg-white border-b border-gray-200 flex items-center justify-between px-2 sm:px-4 lg:px-6 relative">
      {/* Left Side - Menu Button (Mobile) & Title */}
      <div className="flex items-center gap-1 sm:gap-3 lg:gap-4 flex-1 min-w-0 relative">
        {!isSidebarOpen && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (onMenuClick) {
                onMenuClick()
              }
            }}
            className="lg:hidden p-2 sm:p-3 rounded-lg hover:bg-gray-100 active:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors touch-manipulation flex-shrink-0 relative z-[9999]"
            style={{
              minWidth: '44px',
              minHeight: '44px',
              WebkitTapHighlightColor: 'rgba(0,0,0,0.1)'
            }}
            aria-label="Abrir menú"
          >
            <Menu className="w-6 h-6 pointer-events-none" />
          </button>
        )}

        <div className="flex-1 min-w-0 overflow-hidden">
          <h2 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 truncate">
            <span className="sm:hidden">Admin</span>
            <span className="hidden sm:inline">Panel de Administración</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 truncate hidden sm:block">
            {user && `Bienvenido, ${user.firstName} ${user.lastName}`}
          </p>
        </div>
      </div>

      {/* Right Side - User Info & Actions */}
      <div className="flex items-center gap-1 sm:gap-2 lg:gap-4 flex-shrink-0">
        {/* User Menu Dropdown */}
        {user && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1 sm:gap-2 lg:gap-3 pl-1 sm:pl-2 lg:pl-4 border-l border-gray-200 hover:bg-gray-50 rounded-lg transition-colors px-2 py-1"
            >
              {/* User info - Hidden on mobile, shown on tablet+ */}
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-gray-900 truncate max-w-[120px] lg:max-w-none">
                  {user.firstName} {user.lastName}
                </p>

                <div className="flex items-center justify-end gap-1 mt-1 flex-wrap">
                  {/* Role Badge */}
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${getRoleBadge(user.role)}`}>
                    {translateRole(user.role)}
                  </span>
                </div>
              </div>

              {/* User Avatar - Always visible, smaller on tiny screens */}
              <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
              </div>

              {/* Dropdown Arrow */}
              <ChevronDown className={cn(
                "w-4 h-4 text-gray-400 transition-transform hidden md:block",
                dropdownOpen && "rotate-180"
              )} />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                {/* User Info in dropdown (mobile) */}
                <div className="md:hidden px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded mt-2 ${getRoleBadge(user.role)}`}>
                    {translateRole(user.role)}
                  </span>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <button
                    onClick={() => navigateTo('/perfil')}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <UserCircle className="w-4 h-4 text-gray-400" />
                    <span>Mi Perfil</span>
                  </button>

                  {/* Show Account option only for roles with access */}
                  {['SUPER_ADMIN', 'ADMIN', 'ACCOUNT_OWNER'].includes(user.role) && completeProfile?.account && (
                    <button
                      onClick={() => navigateTo('/cuenta')}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <div className="flex flex-col items-start">
                        <span>Mi Cuenta</span>
                        <span className="text-xs text-gray-500">{completeProfile.account.name}</span>
                      </div>
                    </button>
                  )}

                  <button
                    onClick={() => navigateTo('/configuracion')}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-gray-400" />
                    <span>Configuración</span>
                  </button>
                </div>

                {/* Logout */}
                <div className="border-t border-gray-100 mt-1 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
