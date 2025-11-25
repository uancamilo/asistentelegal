'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/useAuth'
import DocumentList from '@/components/documents/DocumentList'
import { ComponentLoadingIndicator } from '@/components/ui/LoadingIndicator'

export default function EditorPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [isInitialLoading, setIsInitialLoading] = useState(true)

  useEffect(() => {
    if (!authLoading) {
      // Simular tiempo mínimo para mostrar el loader
      const timer = setTimeout(() => {
        setIsInitialLoading(false)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [authLoading])

  if (authLoading || isInitialLoading) {
    return (
      <ComponentLoadingIndicator 
        message="Cargando gestión de documentos" 
        size="lg"
        height="lg"
      />
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Gestión de Documentos</h1>
        <p className="text-muted-foreground text-sm mt-2">
          Administra documentos legales del sistema
        </p>
      </div>

      <DocumentList
        showActions={true}
        basePath="/editor"
        canCreate={true}
        canEdit={true}
        canPublish={true}
        canArchive={true}
        autoLoad={true}
      />
    </div>
  )
}
