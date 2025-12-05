'use client'

import { AuthProvider } from '../lib/AuthContext'
import { HotjarScript } from '../components/HotjarScript'

interface ClientLayoutProps {
  children: React.ReactNode
}

/**
 * 🎯 Client Layout - Maneja estado client-side con AuthProvider
 *
 * Separado del RootLayout para evitar conflictos con metadata
 * que debe permanecer server-side en Next.js 15+
 */
export function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <AuthProvider>
      <HotjarScript />
      {children}
    </AuthProvider>
  )
}