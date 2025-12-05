'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Rutas públicas donde Hotjar estará activo
 * Solo estas rutas tendrán tracking de heatmaps y recordings
 */
const PUBLIC_ROUTES = ['/', '/asistente', '/login', '/documentos']

/**
 * Verifica si la ruta actual es pública
 */
function isPublicRoute(pathname: string): boolean {
  // Rutas exactas
  if (PUBLIC_ROUTES.includes(pathname)) {
    return true
  }
  // Ruta dinámica /documento/[id]
  if (pathname.startsWith('/documento/')) {
    return true
  }
  return false
}

/**
 * HotjarScript - Componente que inyecta el script de Hotjar
 *
 * Condiciones para activarse:
 * - Solo en producción (NODE_ENV === 'production')
 * - Solo en rutas públicas definidas
 * - Requiere NEXT_PUBLIC_HOTJAR_ID configurado
 */
export function HotjarScript() {
  const pathname = usePathname()
  const initialized = useRef(false)

  useEffect(() => {
    const hjid = process.env.NEXT_PUBLIC_HOTJAR_ID

    // Solo ejecutar en producción
    if (process.env.NODE_ENV !== 'production') {
      return
    }

    // Verificar que tenemos el ID de Hotjar
    if (!hjid) {
      return
    }

    // Verificar que estamos en una ruta pública
    if (!isPublicRoute(pathname)) {
      return
    }

    // Evitar inicializar múltiples veces
    if (initialized.current) {
      return
    }

    // Inyectar script de Hotjar
    const script = document.createElement('script')
    script.innerHTML = `
      (function(h,o,t,j,a,r){
        h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
        h._hjSettings={hjid:${hjid},hjsv:6};
        a=o.getElementsByTagName('head')[0];
        r=o.createElement('script');r.async=1;
        r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
        a.appendChild(r);
      })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
    `
    document.head.appendChild(script)
    initialized.current = true
  }, [pathname])

  return null
}
