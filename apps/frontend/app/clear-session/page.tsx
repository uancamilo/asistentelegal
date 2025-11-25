'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ClearSessionPage() {
  const router = useRouter()

  useEffect(() => {
    // Limpiar todas las cookies
    if (typeof window !== 'undefined') {
      // Obtener todas las cookies
      const cookies = document.cookie.split(";")
      
      // Limpiar cada cookie
      cookies.forEach(function(cookie) {
        const eqPos = cookie.indexOf("=")
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
        
        // Eliminar la cookie en todos los paths posibles
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`
      })

      // Limpiar localStorage y sessionStorage
      localStorage.clear()
      sessionStorage.clear()

      // Redirigir al login después de 1 segundo
      setTimeout(() => {
        router.push('/login')
      }, 1000)
    }
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-6 rounded-lg shadow-md text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Limpiando sesión...
        </h2>
        <p className="text-gray-600">
          Eliminando tokens y cookies inválidos
        </p>
      </div>
    </div>
  )
}